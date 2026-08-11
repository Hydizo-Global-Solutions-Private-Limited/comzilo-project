/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export interface PodClipartAttributes {
  id: number;
  tenantId: number;
  title: string;
  category: string;
  tags?: any;
  svgUrl?: string | null;
  svgContent?: string | null;
  price: number;
  source: 'local' | 'pixabay' | 'openclipart';
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PodClipartCreationAttributes = Optional<
  PodClipartAttributes,
  'id' | 'tenantId' | 'category' | 'price' | 'source' | 'isActive'
>;

export class PodClipart
  extends Model<PodClipartAttributes, PodClipartCreationAttributes>
  implements PodClipartAttributes
{
  declare id: number;
  declare tenantId: number;
  declare title: string;
  declare category: string;
  declare tags: any;
  declare svgUrl: string | null;
  declare svgContent: string | null;
  declare price: number;
  declare source: 'local' | 'pixabay' | 'openclipart';
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PodClipart.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    tenantId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      field: 'tenant_id',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'General',
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    svgUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'svg_url',
    },
    svgContent: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'svg_content',
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    source: {
      type: DataTypes.ENUM('local', 'pixabay', 'openclipart'),
      allowNull: false,
      defaultValue: 'local',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    modelName: 'PodClipart',
    tableName: 'pod_cliparts',
    timestamps: true,
    underscored: true,
  }
);
