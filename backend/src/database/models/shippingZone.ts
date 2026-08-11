import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database';

export class ShippingZone extends Model {
  public id!: number;
  public tenantId!: number;
  public name!: string;
  public country!: string;
  public state?: string;
  public city?: string;
  public pincode?: string;
  public priority!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ShippingZone.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    tenantId: { type: DataTypes.BIGINT.UNSIGNED, field: 'tenant_id', allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    country: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'India' },
    state: { type: DataTypes.STRING(100), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    pincode: { type: DataTypes.STRING(20), allowNull: true },
    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    isActive: { type: DataTypes.BOOLEAN, field: 'is_active', allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false },
  },
  { sequelize, tableName: 'shipping_zones', timestamps: true, underscored: true }
);

export class ShippingMethod extends Model {
  public id!: number;
  public tenantId!: number;
  public code!:
    | 'standard'
    | 'express'
    | 'same_day'
    | 'next_day'
    | 'economy'
    | 'store_pickup'
    | 'local_delivery';
  public name!: string;
  public description?: string;
  public estimatedDays?: string;
  public isEnabled!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ShippingMethod.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    tenantId: { type: DataTypes.BIGINT.UNSIGNED, field: 'tenant_id', allowNull: false },
    code: {
      type: DataTypes.ENUM(
        'standard',
        'express',
        'same_day',
        'next_day',
        'economy',
        'store_pickup',
        'local_delivery'
      ),
      allowNull: false,
    },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    estimatedDays: {
      type: DataTypes.STRING(50),
      field: 'estimated_days',
      allowNull: true,
      defaultValue: '2-5 Days',
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      field: 'is_enabled',
      allowNull: false,
      defaultValue: true,
    },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false },
  },
  { sequelize, tableName: 'shipping_methods', timestamps: true, underscored: true }
);
