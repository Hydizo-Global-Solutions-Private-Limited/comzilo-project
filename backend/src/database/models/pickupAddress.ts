import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database';

export class PickupAddress extends Model {
  public id!: number;
  public tenantId!: number;
  public name!: string;
  public contactPerson!: string;
  public phone!: string;
  public email?: string;
  public addressLine1!: string;
  public addressLine2?: string;
  public city!: string;
  public state!: string;
  public country!: string;
  public pincode!: string;
  public isDefault!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PickupAddress.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    tenantId: { type: DataTypes.BIGINT.UNSIGNED, field: 'tenant_id', allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    contactPerson: { type: DataTypes.STRING(100), field: 'contact_person', allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: true },
    addressLine1: { type: DataTypes.STRING(255), field: 'address_line1', allowNull: false },
    addressLine2: { type: DataTypes.STRING(255), field: 'address_line2', allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: false },
    state: { type: DataTypes.STRING(100), allowNull: false },
    country: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'India' },
    pincode: { type: DataTypes.STRING(20), allowNull: false },
    isDefault: {
      type: DataTypes.BOOLEAN,
      field: 'is_default',
      allowNull: false,
      defaultValue: false,
    },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false },
  },
  { sequelize, tableName: 'pickup_addresses', timestamps: true, underscored: true }
);

export class ShipmentPackage extends Model {
  public id!: number;
  public tenantId!: number;
  public name!: string;
  public lengthCm!: number;
  public widthCm!: number;
  public heightCm!: number;
  public maxWeightKg!: number;
  public packageType!: string;
  public material?: string;
  public isDefault!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ShipmentPackage.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    tenantId: { type: DataTypes.BIGINT.UNSIGNED, field: 'tenant_id', allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    lengthCm: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'length_cm',
      allowNull: false,
      defaultValue: 10.0,
    },
    widthCm: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'width_cm',
      allowNull: false,
      defaultValue: 10.0,
    },
    heightCm: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'height_cm',
      allowNull: false,
      defaultValue: 10.0,
    },
    maxWeightKg: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'max_weight_kg',
      allowNull: false,
      defaultValue: 1.0,
    },
    packageType: {
      type: DataTypes.STRING(50),
      field: 'package_type',
      allowNull: false,
      defaultValue: 'Box',
    },
    material: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'Corrugated Cardboard' },
    isDefault: {
      type: DataTypes.BOOLEAN,
      field: 'is_default',
      allowNull: false,
      defaultValue: false,
    },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false },
  },
  { sequelize, tableName: 'shipment_packages', timestamps: true, underscored: true }
);
