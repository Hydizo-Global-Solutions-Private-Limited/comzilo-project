import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export interface PodCategoryAttributes {
  id: number;
  tenantId: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PodCategoryCreationAttributes = Optional<
  PodCategoryAttributes,
  'id' | 'tenantId' | 'description' | 'imageUrl' | 'isActive' | 'displayOrder'
>;

export class PodCategory
  extends Model<PodCategoryAttributes, PodCategoryCreationAttributes>
  implements PodCategoryAttributes
{
  declare id: number;
  declare tenantId: number;
  declare name: string;
  declare slug: string;
  declare description: string | null;
  declare imageUrl: string | null;
  declare isActive: boolean;
  declare displayOrder: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PodCategory.init(
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'image_url',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'display_order',
    },
  },
  {
    sequelize,
    modelName: 'PodCategory',
    tableName: 'pod_categories',
    timestamps: true,
    underscored: true,
  }
);
