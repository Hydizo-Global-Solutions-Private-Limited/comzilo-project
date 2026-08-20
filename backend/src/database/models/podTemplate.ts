import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export interface PodTemplateAttributes {
  id: number;
  tenantId: number;
  sellerId?: number | null;
  categoryId: number;
  productId?: number | null;
  title: string;
  code?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  basePrice: number;
  printableArea?: any;
  canvasJson?: any;
  allowedColors?: any;
  allowedSizes?: any;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PodTemplateCreationAttributes = Optional<
  PodTemplateAttributes,
  | 'id'
  | 'tenantId'
  | 'sellerId'
  | 'productId'
  | 'code'
  | 'description'
  | 'thumbnailUrl'
  | 'basePrice'
  | 'printableArea'
  | 'canvasJson'
  | 'allowedColors'
  | 'allowedSizes'
  | 'isActive'
>;

export class PodTemplate
  extends Model<PodTemplateAttributes, PodTemplateCreationAttributes>
  implements PodTemplateAttributes
{
  declare id: number;
  declare tenantId: number;
  declare sellerId: number | null;
  declare categoryId: number;
  declare productId: number | null;
  declare title: string;
  declare code: string | null;
  declare description: string | null;
  declare thumbnailUrl: string | null;
  declare basePrice: number;
  declare printableArea: any;
  declare canvasJson: any;
  declare allowedColors: any;
  declare allowedSizes: any;
  declare isActive: boolean;

  declare category?: any;
  declare product?: any;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PodTemplate.init(
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
    categoryId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'category_id',
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    thumbnailUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'thumbnail_url',
    },
    basePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'base_price',
    },
    printableArea: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'printable_area',
    },
    canvasJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'canvas_json',
    },
    allowedColors: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'allowed_colors',
    },
    allowedSizes: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'allowed_sizes',
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
    modelName: 'PodTemplate',
    tableName: 'pod_templates',
    timestamps: true,
    underscored: true,
  }
);
