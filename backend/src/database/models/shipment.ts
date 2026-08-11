import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database';

export class Shipment extends Model {
  public id!: number;
  public tenantId!: number;
  public orderId?: number;
  public orderNumber!: string;
  public providerCode!: string;
  public awbNumber?: string;
  public courierName?: string;
  public status!:
    | 'created'
    | 'pickup_assigned'
    | 'picked_up'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'returned'
    | 'failed_delivery'
    | 'lost'
    | 'damaged';
  public isCod!: boolean;
  public codAmount!: number;
  public shippingCost!: number;
  public destinationAddress?: any;
  public pickupAddress?: any;
  public packageInfo?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Shipment.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    tenantId: { type: DataTypes.BIGINT.UNSIGNED, field: 'tenant_id', allowNull: false },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, field: 'order_id', allowNull: true },
    orderNumber: { type: DataTypes.STRING(50), field: 'order_number', allowNull: false },
    providerCode: { type: DataTypes.STRING(50), field: 'provider_code', allowNull: false },
    awbNumber: { type: DataTypes.STRING(100), field: 'awb_number', allowNull: true },
    courierName: { type: DataTypes.STRING(100), field: 'courier_name', allowNull: true },
    status: {
      type: DataTypes.ENUM(
        'created',
        'pickup_assigned',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
        'failed_delivery',
        'lost',
        'damaged'
      ),
      allowNull: false,
      defaultValue: 'created',
    },
    isCod: { type: DataTypes.BOOLEAN, field: 'is_cod', allowNull: false, defaultValue: false },
    codAmount: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'cod_amount',
      allowNull: false,
      defaultValue: 0.0,
    },
    shippingCost: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'shipping_cost',
      allowNull: false,
      defaultValue: 0.0,
    },
    destinationAddress: { type: DataTypes.JSON, field: 'destination_address', allowNull: true },
    pickupAddress: { type: DataTypes.JSON, field: 'pickup_address', allowNull: true },
    packageInfo: { type: DataTypes.JSON, field: 'package_info', allowNull: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false },
  },
  { sequelize, tableName: 'shipments', timestamps: true, underscored: true }
);

export class ShipmentTracking extends Model {
  public id!: number;
  public shipmentId!: number;
  public status!: string;
  public location?: string;
  public activity!: string;
  public timestamp!: Date;
  public rawPayload?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ShipmentTracking.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    shipmentId: { type: DataTypes.BIGINT.UNSIGNED, field: 'shipment_id', allowNull: false },
    status: { type: DataTypes.STRING(50), allowNull: false },
    location: { type: DataTypes.STRING(150), allowNull: true },
    activity: { type: DataTypes.STRING(255), allowNull: false },
    timestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    rawPayload: { type: DataTypes.JSON, field: 'raw_payload', allowNull: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false },
  },
  { sequelize, tableName: 'shipment_tracking', timestamps: true, underscored: true }
);

export class ShippingLabel extends Model {
  public id!: number;
  public shipmentId!: number;
  public labelUrl?: string;
  public barcode?: string;
  public qrCode?: string;
  public manifestUrl?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ShippingLabel.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    shipmentId: { type: DataTypes.BIGINT.UNSIGNED, field: 'shipment_id', allowNull: false },
    labelUrl: { type: DataTypes.TEXT, field: 'label_url', allowNull: true },
    barcode: { type: DataTypes.STRING(100), allowNull: true },
    qrCode: { type: DataTypes.TEXT, field: 'qr_code', allowNull: true },
    manifestUrl: { type: DataTypes.TEXT, field: 'manifest_url', allowNull: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false },
  },
  { sequelize, tableName: 'shipping_labels', timestamps: true, underscored: true }
);

export class ShippingLog extends Model {
  public id!: number;
  public tenantId!: number;
  public providerCode!: string;
  public action!: string;
  public status!: 'success' | 'failed' | 'pending';
  public requestData?: any;
  public responseData?: any;
  public errorMessage?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ShippingLog.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    tenantId: { type: DataTypes.BIGINT.UNSIGNED, field: 'tenant_id', allowNull: false },
    providerCode: { type: DataTypes.STRING(50), field: 'provider_code', allowNull: false },
    action: { type: DataTypes.STRING(50), allowNull: false },
    status: {
      type: DataTypes.ENUM('success', 'failed', 'pending'),
      allowNull: false,
      defaultValue: 'success',
    },
    requestData: { type: DataTypes.JSON, field: 'request_data', allowNull: true },
    responseData: { type: DataTypes.JSON, field: 'response_data', allowNull: true },
    errorMessage: { type: DataTypes.TEXT, field: 'error_message', allowNull: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false },
  },
  { sequelize, tableName: 'shipping_logs', timestamps: true, underscored: true }
);

export class ProviderWebhook extends Model {
  public id!: number;
  public providerCode!: string;
  public eventType!: string;
  public payload!: any;
  public status!: 'processed' | 'failed' | 'retrying';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProviderWebhook.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    providerCode: { type: DataTypes.STRING(50), field: 'provider_code', allowNull: false },
    eventType: { type: DataTypes.STRING(100), field: 'event_type', allowNull: false },
    payload: { type: DataTypes.JSON, allowNull: false },
    status: {
      type: DataTypes.ENUM('processed', 'failed', 'retrying'),
      allowNull: false,
      defaultValue: 'processed',
    },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false },
  },
  { sequelize, tableName: 'provider_webhooks', timestamps: true, underscored: true }
);

export class ShippingRateRule extends Model {
  public id!: number;
  public tenantId!: number;
  public name!: string;
  public type!:
    | 'flat'
    | 'weight_based'
    | 'distance_based'
    | 'order_value_based'
    | 'free'
    | 'courier_api'
    | 'custom_formula';
  public minValue!: number;
  public maxValue?: number;
  public rate!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ShippingRateRule.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    tenantId: { type: DataTypes.BIGINT.UNSIGNED, field: 'tenant_id', allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: {
      type: DataTypes.ENUM(
        'flat',
        'weight_based',
        'distance_based',
        'order_value_based',
        'free',
        'courier_api',
        'custom_formula'
      ),
      allowNull: false,
      defaultValue: 'flat',
    },
    minValue: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'min_value',
      allowNull: false,
      defaultValue: 0.0,
    },
    maxValue: { type: DataTypes.DECIMAL(10, 2), field: 'max_value', allowNull: true },
    rate: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.0 },
    isActive: { type: DataTypes.BOOLEAN, field: 'is_active', allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false },
  },
  { sequelize, tableName: 'shipping_rate_rules', timestamps: true, underscored: true }
);
