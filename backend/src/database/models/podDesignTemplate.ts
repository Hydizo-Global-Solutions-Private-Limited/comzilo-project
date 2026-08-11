/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export interface PodDesignTemplateAttributes {
  id: number;
  tenantId: number;
  sellerId?: number | null;
  productId?: number | null;
  title: string;
  code?: string | null;
  category: string;
  tags?: any;
  price: number;
  thumbnailUrl?: string | null;
  canvasJson: any;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export type PodDesignTemplateCreationAttributes = Optional<
  PodDesignTemplateAttributes,
  'id' | 'tenantId' | 'category' | 'price' | 'isActive'
>;

export class PodDesignTemplate
  extends Model<PodDesignTemplateAttributes, PodDesignTemplateCreationAttributes>
  implements PodDesignTemplateAttributes
{
  declare id: number;
  declare tenantId: number;
  declare sellerId: number | null;
  declare productId: number | null;
  declare title: string;
  declare code: string | null;
  declare category: string;
  declare tags: any;
  declare price: number;
  declare thumbnailUrl: string | null;
  declare canvasJson: any;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare readonly deletedAt: Date | null;
}

PodDesignTemplate.init(
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
    sellerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'seller_id',
    },
    productId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'product_id',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(100),
      allowNull: true,
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
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    thumbnailUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'thumbnail_url',
    },
    canvasJson: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'canvas_json',
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
    modelName: 'PodDesignTemplate',
    tableName: 'pod_design_templates',
    timestamps: true,
    paranoid: true,
    underscored: true,
  }
);
