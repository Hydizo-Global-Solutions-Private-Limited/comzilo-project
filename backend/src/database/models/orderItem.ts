import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export interface OrderItemAttributes {
  id: number;
  uuid: string;
  tenantId: number;
  storeId: number;
  orderId: number;
  productId: number;
  productVariantId: number | null;
  variantId?: number | null;
  variantSku?: string | null;
  variantAttributes?: any;
  warehouseId?: number | null;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  subtotal: number;
  total: number;
  customization?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OrderItemCreationAttributes = Optional<
  OrderItemAttributes,
  | 'id'
  | 'uuid'
  | 'productVariantId'
  | 'variantId'
  | 'variantSku'
  | 'variantAttributes'
  | 'warehouseId'
  | 'discount'
  | 'tax'
  | 'subtotal'
  | 'total'
  | 'customization'
>;

export class OrderItem
  extends Model<OrderItemAttributes, OrderItemCreationAttributes>
  implements OrderItemAttributes
{
  declare id: number;
  declare uuid: string;
  declare tenantId: number;
  declare storeId: number;
  declare orderId: number;
  declare productId: number;
  declare productVariantId: number | null;
  declare variantId: number | null;
  declare variantSku: string | null;
  declare variantAttributes: any;
  declare warehouseId: number | null;
  declare sku: string;
  declare productName: string;
  declare quantity: number;
  declare unitPrice: number;
  declare discount: number;
  declare tax: number;
  declare subtotal: number;
  declare total: number;
  declare customization: any;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

OrderItem.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true,
    },
    tenantId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'tenant_id',
    },
    storeId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'store_id',
    },
    orderId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'order_id',
    },
    productId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'product_id',
    },
    productVariantId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'product_variant_id',
    },
    variantId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'variant_id',
    },
    variantSku: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'variant_sku',
    },
    variantAttributes: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'variant_attributes',
    },
    warehouseId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'warehouse_id',
    },
    sku: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    productName: {
      type: DataTypes.STRING(510),
      allowNull: false,
      field: 'product_name',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: false,
      defaultValue: 0.0,
      field: 'unit_price',
    },
    discount: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: false,
      defaultValue: 0.0,
    },
    tax: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: false,
      defaultValue: 0.0,
    },
    subtotal: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: false,
      defaultValue: 0.0,
    },
    total: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: false,
      defaultValue: 0.0,
    },
    customization: {
      type: DataTypes.VIRTUAL,
      get(this: OrderItem) {
        return this.getDataValue('customization');
      },
      set(this: OrderItem, val: any) {
        this.setDataValue('customization', val);
      },
    },
  },
  {
    sequelize,
    modelName: 'OrderItem',
    tableName: 'order_items',
    timestamps: true,
    underscored: true,
  }
);
