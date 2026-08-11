import {
  IShippingProviderAdapter,
  ShippingRatesParams,
  ShippingRatesResult,
  CreateShipmentParams,
  ShipmentResult,
  TrackingResult,
} from '../IShippingProviderAdapter';

export abstract class BaseShippingAdapter implements IShippingProviderAdapter {
  abstract providerCode: string;
  abstract providerName: string;

  async authenticate(config: {
    apiKey?: string;
    apiSecret?: string;
    environment?: string;
  }): Promise<boolean> {
    if (!config.apiKey && !config.apiSecret) {
      return false;
    }
    return true;
  }

  async getRates(params: ShippingRatesParams, _config: any): Promise<ShippingRatesResult[]> {
    const baseRate = Math.max(50, Math.round(params.weightKg * 45));
    return [
      {
        courierName: `${this.providerName} Express`,
        rate: baseRate + 20,
        estimatedDays: '1-2 Days',
        isCodSupported: true,
      },
      {
        courierName: `${this.providerName} Standard`,
        rate: baseRate,
        estimatedDays: '3-5 Days',
        isCodSupported: true,
      },
    ];
  }

  async createShipment(params: CreateShipmentParams, _config: any): Promise<ShipmentResult> {
    const timestamp = Date.now();
    const awbNumber = `AWB-${this.providerCode.toUpperCase()}-${timestamp}`;
    const labelUrl = `https://cdn.comzilo.com/labels/${awbNumber}.pdf`;

    return {
      success: true,
      awbNumber,
      courierName: params.courierName || `${this.providerName} Express`,
      shipmentId: `SHP-${timestamp}`,
      status: 'created',
      labelUrl,
    };
  }

  async cancelShipment(_awbNumber: string, _config: any): Promise<boolean> {
    return true;
  }

  async generateAWB(orderNumber: string, _config: any): Promise<string> {
    return `AWB-${this.providerCode.toUpperCase()}-${orderNumber}-${Date.now().toString().slice(-4)}`;
  }

  async generateLabel(
    awbNumber: string,
    _config: any
  ): Promise<{ labelUrl: string; barcode: string; qrCode: string }> {
    return {
      labelUrl: `https://cdn.comzilo.com/labels/${awbNumber}.pdf`,
      barcode: `*${awbNumber}*`,
      qrCode: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23000"/></svg>`,
    };
  }

  async trackShipment(awbNumber: string, _config: any): Promise<TrackingResult> {
    const now = new Date().toISOString();
    return {
      awbNumber,
      status: 'in_transit',
      location: 'Central Logistics Hub',
      activity: 'Shipment processed and out for transit',
      updatedAt: now,
      history: [
        {
          status: 'created',
          location: 'Merchant Warehouse',
          activity: 'Shipment created and package labeled',
          timestamp: now,
        },
        {
          status: 'in_transit',
          location: 'Central Logistics Hub',
          activity: 'Shipment processed and out for transit',
          timestamp: now,
        },
      ],
    };
  }

  async createPickup(
    awbNumber: string,
    pickupDate: string,
    _config: any
  ): Promise<{ success: boolean; pickupToken: string }> {
    return {
      success: true,
      pickupToken: `PICKUP-${awbNumber}-${pickupDate}`,
    };
  }

  async webhookHandler(
    payload: any
  ): Promise<{ eventType: string; awbNumber: string; status: string; raw: any }> {
    return {
      eventType: payload?.event || 'tracking_update',
      awbNumber: payload?.awb || payload?.awbNumber || 'AWB-UNKNOWN',
      status: payload?.status || 'in_transit',
      raw: payload,
    };
  }
}
