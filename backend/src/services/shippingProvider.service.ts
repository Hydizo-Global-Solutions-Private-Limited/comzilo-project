import { sequelize } from '../config/database';
import {
  ShippingProvider,
  TenantShippingProviderConfig,
  ShippingZone,
  ShippingMethod,
  PickupAddress,
  ShipmentPackage,
  Shipment,
  ShipmentTracking,
  ShippingLabel,
  ShippingLog,
  ProviderWebhook,
  ShippingRateRule,
} from '../database/models';
import { ShippingAdapterRegistry } from '../adapters/shipping/ShippingAdapterRegistry';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';

export class ShippingProviderService {
  // --- SUPER ADMIN SERVICES ---
  public async getGlobalProviders() {
    return await ShippingProvider.findAll({ order: [['id', 'ASC']] });
  }

  public async updateGlobalProviderStatus(providerId: number, isActive: boolean) {
    const provider = await ShippingProvider.findByPk(providerId);
    if (!provider) throw new NotFoundError('Shipping provider not found');
    await provider.update({ isActive: Boolean(isActive) });
    await provider.reload();
    return provider;
  }

  public async getGlobalAnalytics() {
    const totalShipments = await Shipment.count();
    const delivered = await Shipment.count({ where: { status: 'delivered' } });
    const cancelled = await Shipment.count({ where: { status: 'cancelled' } });
    const rto = await Shipment.count({ where: { status: 'returned' } });
    const codOrders = await Shipment.count({ where: { isCod: true } });

    let mostUsedProvider = 'N/A';
    try {
      const topCarrier = await Shipment.findOne({
        attributes: ['providerId', [sequelize.fn('COUNT', sequelize.col('id')), 'shipmentCount']],
        group: ['providerId'],
        order: [[sequelize.literal('shipmentCount'), 'DESC']],
        limit: 1,
      });

      if (topCarrier && (topCarrier as any).providerId) {
        const prov = await ShippingProvider.findByPk((topCarrier as any).providerId);
        if (prov) mostUsedProvider = prov.name;
      }
    } catch {
      mostUsedProvider = 'N/A';
    }

    let averageDeliveryTimeDays = '0.0 Days';
    if (delivered > 0) {
      try {
        const avgResult = await Shipment.findAll({
          where: { status: 'delivered' },
          attributes: [
            [
              sequelize.fn('AVG', sequelize.literal('TIMESTAMPDIFF(HOUR, created_at, updated_at)')),
              'avgHours',
            ],
          ],
          raw: true,
        });
        const avgHours = Number((avgResult[0] as any)?.avgHours || 0);
        averageDeliveryTimeDays = (avgHours / 24).toFixed(1) + ' Days';
      } catch {
        averageDeliveryTimeDays = '0.0 Days';
      }
    }

    return {
      totalShipments,
      delivered,
      cancelled,
      rto,
      codOrders,
      deliverySuccessRate:
        totalShipments > 0 ? ((delivered / totalShipments) * 100).toFixed(1) + '%' : '0.0%',
      averageDeliveryTimeDays,
      mostUsedProvider,
    };
  }

  // --- SELLER PANEL SERVICES ---
  public async getTenantProviders(tenantId: number) {
    const globalProviders = await ShippingProvider.findAll({ where: { isActive: true } });
    const tenantConfigs = await TenantShippingProviderConfig.findAll({ where: { tenantId } });

    const configMap = new Map(tenantConfigs.map((c) => [c.providerId, c]));

    return globalProviders.map((provider) => {
      const config = configMap.get(provider.id);
      return {
        providerId: provider.id,
        code: provider.code,
        name: provider.name,
        type: provider.type,
        description: provider.description,
        supportsCod: provider.supportsCod,
        supportsTracking: provider.supportsTracking,
        isEnabled: config ? config.isEnabled : false,
        apiKey: config ? config.apiKey : null,
        apiSecret: config ? config.apiSecret : null,
        webhookUrl: config ? config.webhookUrl : null,
        webhookSecret: config ? config.webhookSecret : null,
        environment: config ? config.environment || 'sandbox' : 'sandbox',
        pickupAddress: config ? config.pickupAddress : null,
        defaultCourier: config ? config.defaultCourier : null,
        isCodEnabled: config ? config.isCodEnabled : true,
        isTrackingEnabled: config ? config.isTrackingEnabled : true,
        autoShipment: config ? config.autoShipment || false : false,
        autoPickup: config ? config.autoPickup || false : false,
        autoAwb: config ? config.autoAwb || false : false,
        autoSyncTracking: config ? config.autoSyncTracking || false : false,
        shippingChargesConfig: config ? config.shippingChargesConfig : null,
      };
    });
  }

  public async configureTenantProvider(tenantId: number, providerId: number, data: any) {
    const provider = await ShippingProvider.findByPk(providerId);
    if (!provider) throw new NotFoundError('Shipping provider not found');

    let config = await TenantShippingProviderConfig.findOne({ where: { tenantId, providerId } });

    if (!config) {
      config = await TenantShippingProviderConfig.create({
        tenantId,
        providerId,
        providerCode: provider.code,
        isEnabled: data.isEnabled ?? true,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        webhookUrl: data.webhookUrl,
        webhookSecret: data.webhookSecret,
        pickupAddress: data.pickupAddress,
        defaultCourier: data.defaultCourier,
        isCodEnabled: data.isCodEnabled ?? true,
        isTrackingEnabled: data.isTrackingEnabled ?? true,
        shippingChargesConfig: data.shippingChargesConfig,
      });
    } else {
      config.isEnabled = data.isEnabled ?? config.isEnabled;
      if (data.apiKey !== undefined) config.apiKey = data.apiKey;
      if (data.apiSecret !== undefined) config.apiSecret = data.apiSecret;
      if (data.webhookUrl !== undefined) config.webhookUrl = data.webhookUrl;
      if (data.webhookSecret !== undefined) config.webhookSecret = data.webhookSecret;
      if (data.pickupAddress !== undefined) config.pickupAddress = data.pickupAddress;
      if (data.defaultCourier !== undefined) config.defaultCourier = data.defaultCourier;
      if (data.isCodEnabled !== undefined) config.isCodEnabled = data.isCodEnabled;
      if (data.isTrackingEnabled !== undefined) config.isTrackingEnabled = data.isTrackingEnabled;
      if (data.shippingChargesConfig !== undefined)
        config.shippingChargesConfig = data.shippingChargesConfig;
      await config.save();
    }

    // Create Shipping Log
    await ShippingLog.create({
      tenantId,
      providerCode: provider.code,
      action: 'configure_provider',
      status: 'success',
      requestData: { isEnabled: config.isEnabled, providerCode: provider.code },
    });

    return config;
  }

  public async testProviderConnection(tenantId: number, providerCode: string) {
    const adapter = ShippingAdapterRegistry.getAdapter(providerCode);
    const config = await TenantShippingProviderConfig.findOne({
      where: { tenantId, providerCode },
    });

    const isConnected = await adapter.authenticate({
      apiKey: config?.apiKey || 'test_api_key',
      apiSecret: config?.apiSecret || 'test_api_secret',
    });

    await ShippingLog.create({
      tenantId,
      providerCode,
      action: 'test_connection',
      status: isConnected ? 'success' : 'failed',
      responseData: { isConnected },
    });

    return {
      success: isConnected,
      providerCode,
      message: isConnected ? 'Connection successful' : 'Authentication failed',
    };
  }

  // --- SHIPPING ZONES, METHODS, PICKUP ADDRESSES, PACKAGES ---
  public async getZones(tenantId: number) {
    return await ShippingZone.findAll({ where: { tenantId }, order: [['priority', 'ASC']] });
  }

  public async createZone(tenantId: number, data: any) {
    return await ShippingZone.create({ tenantId, ...data });
  }

  public async getMethods(tenantId: number) {
    return await ShippingMethod.findAll({ where: { tenantId } });
  }

  public async createMethod(tenantId: number, data: any) {
    return await ShippingMethod.create({ tenantId, ...data });
  }

  public async getPickupAddresses(tenantId: number) {
    return await PickupAddress.findAll({ where: { tenantId } });
  }

  public async createPickupAddress(tenantId: number, data: any) {
    if (data.isDefault) {
      await PickupAddress.update({ isDefault: false }, { where: { tenantId } });
    }
    return await PickupAddress.create({ tenantId, ...data });
  }

  public async getPackages(tenantId: number) {
    return await ShipmentPackage.findAll({ where: { tenantId } });
  }

  public async createPackage(tenantId: number, data: any) {
    if (data.isDefault) {
      await ShipmentPackage.update({ isDefault: false }, { where: { tenantId } });
    }
    return await ShipmentPackage.create({ tenantId, ...data });
  }

  // --- RATE CALCULATION ENGINE ---
  public async calculateShippingRate(
    tenantId: number,
    params: { weightKg: number; pincode: string; orderValue: number }
  ) {
    const rules = await ShippingRateRule.findAll({ where: { tenantId, isActive: true } });

    if (rules.length > 0) {
      const freeRule = rules.find((r) => r.type === 'free' && params.orderValue >= r.minValue);
      if (freeRule) return { rate: 0.0, ruleName: freeRule.name, type: 'free' };

      const flatRule = rules.find((r) => r.type === 'flat');
      if (flatRule) return { rate: Number(flatRule.rate), ruleName: flatRule.name, type: 'flat' };
    }

    // Default Rate Strategy Calculation
    const calculatedRate = Math.max(49.0, Math.round(params.weightKg * 40.0));
    return {
      rate: calculatedRate,
      ruleName: 'Standard Regional Weight Rate',
      type: 'weight_based',
    };
  }

  // --- SHIPMENT OPERATIONS ---
  public async createShipment(tenantId: number, data: any) {
    const adapter = ShippingAdapterRegistry.getAdapter(data.providerCode || 'shiprocket');

    const result = await adapter.createShipment(
      {
        orderNumber: data.orderNumber,
        pickupAddress: data.pickupAddress,
        destinationAddress: data.destinationAddress,
        packageInfo: data.packageInfo || {
          weightKg: 1,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
          itemsCount: 1,
        },
        isCod: data.isCod || false,
        codAmount: data.codAmount || 0,
        courierName: data.courierName,
      },
      data
    );

    const shipment = await Shipment.create({
      tenantId,
      orderNumber: data.orderNumber,
      providerCode: data.providerCode || 'shiprocket',
      awbNumber: result.awbNumber,
      courierName: result.courierName,
      status: 'created',
      isCod: data.isCod || false,
      codAmount: data.codAmount || 0,
      shippingCost: data.shippingCost || 49.0,
      destinationAddress: data.destinationAddress,
      pickupAddress: data.pickupAddress,
      packageInfo: data.packageInfo,
    });

    const labelData = await adapter.generateLabel(result.awbNumber, {});
    await ShippingLabel.create({
      shipmentId: shipment.id,
      labelUrl: labelData.labelUrl,
      barcode: labelData.barcode,
      qrCode: labelData.qrCode,
    });

    await ShipmentTracking.create({
      shipmentId: shipment.id,
      status: 'created',
      activity: 'Shipment created successfully and AWBs generated',
    });

    return shipment;
  }

  public async getShipments(tenantId: number) {
    return await Shipment.findAll({
      where: { tenantId },
      include: [
        { model: ShipmentTracking, as: 'trackingLogs' },
        { model: ShippingLabel, as: 'label' },
      ],
      order: [['id', 'DESC']],
    });
  }

  public async getShippingLogs(tenantId: number) {
    return await ShippingLog.findAll({
      where: { tenantId },
      order: [['id', 'DESC']],
      limit: 100,
    });
  }

  public async deleteZone(tenantId: number, zoneIdOrName: string | number) {
    if (!isNaN(Number(zoneIdOrName))) {
      await ShippingZone.destroy({ where: { id: Number(zoneIdOrName), tenantId } });
    } else {
      await ShippingZone.destroy({ where: { name: String(zoneIdOrName), tenantId } });
    }
    return true;
  }

  public async deleteMethod(tenantId: number, methodIdOrCode: string | number) {
    if (!isNaN(Number(methodIdOrCode))) {
      await ShippingMethod.destroy({ where: { id: Number(methodIdOrCode), tenantId } });
    } else {
      await ShippingMethod.destroy({ where: { code: String(methodIdOrCode), tenantId } });
    }
    return true;
  }

  public async deletePickupAddress(tenantId: number, addressIdOrName: string | number) {
    if (!isNaN(Number(addressIdOrName))) {
      await PickupAddress.destroy({ where: { id: Number(addressIdOrName), tenantId } });
    } else {
      await PickupAddress.destroy({ where: { name: String(addressIdOrName), tenantId } });
    }
    return true;
  }

  public async deletePackage(tenantId: number, packageIdOrName: string | number) {
    if (!isNaN(Number(packageIdOrName))) {
      await ShipmentPackage.destroy({ where: { id: Number(packageIdOrName), tenantId } });
    } else {
      await ShipmentPackage.destroy({ where: { name: String(packageIdOrName), tenantId } });
    }
    return true;
  }

  public async deleteShipment(tenantId: number, shipmentIdOrAwb: string | number) {
    if (!isNaN(Number(shipmentIdOrAwb))) {
      await Shipment.destroy({ where: { id: Number(shipmentIdOrAwb), tenantId } });
    } else {
      await Shipment.destroy({ where: { awbNumber: String(shipmentIdOrAwb), tenantId } });
    }
    return true;
  }

  public async deleteLog(tenantId: number, logId: number) {
    await ShippingLog.destroy({ where: { id: Number(logId), tenantId } });
    return true;
  }

  public async deleteProvider(tenantId: number, providerIdOrCode: string | number) {
    if (!isNaN(Number(providerIdOrCode))) {
      await TenantShippingProviderConfig.destroy({
        where: { id: Number(providerIdOrCode), tenantId },
      });
    } else {
      const prov = await ShippingProvider.findOne({ where: { code: String(providerIdOrCode) } });
      if (prov) {
        await TenantShippingProviderConfig.destroy({ where: { providerId: prov.id, tenantId } });
      }
    }
    return true;
  }
}
