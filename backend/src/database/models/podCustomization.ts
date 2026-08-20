import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export interface PodCustomizationAttributes {
  id: number;
  tenantId: number;
  orderId?: number | null;
  orderItemId?: number | null;
  productId: number;
  templateId?: number | null;
  templateName?: string | null;
  uploadedImageUrl?: string | null;
  customText?: string | null;
  font?: string | null;
  textColor?: string | null;
  size?: string | null;
  color?: string | null;
  previewImageUrl?: string | null;
  metaData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PodCustomizationCreationAttributes = Optional<
  PodCustomizationAttributes,
  | 'id'
  | 'tenantId'
  | 'orderId'
  | 'orderItemId'
  | 'templateId'
  | 'templateName'
  | 'uploadedImageUrl'
  | 'customText'
  | 'font'
  | 'textColor'
  | 'size'
  | 'color'
  | 'previewImageUrl'
  | 'metaData'
>;

export class PodCustomization
  extends Model<PodCustomizationAttributes, PodCustomizationCreationAttributes>
  implements PodCustomizationAttributes
{
  declare id: number;
  declare tenantId: number;
  declare orderId: number | null;
  declare orderItemId: number | null;
  declare productId: number;
  declare templateId: number | null;
  declare templateName: string | null;
  declare uploadedImageUrl: string | null;
  declare customText: string | null;
  declare font: string | null;
  declare textColor: string | null;
  declare size: string | null;
  declare color: string | null;
  declare previewImageUrl: string | null;
  declare metaData: any;

  declare order?: any;
  declare orderItem?: any;
  declare product?: any;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PodCustomization.init(
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
    orderId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'order_id',
    },
    orderItemId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'order_item_id',
    },
    productId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'product_id',
    },
    templateId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'template_id',
    },
    templateName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'template_name',
    },
    uploadedImageUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'uploaded_image_url',
    },
    customText: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'custom_text',
    },
    font: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    textColor: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'text_color',
    },
    size: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    previewImageUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'preview_image_url',
    },
    metaData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'meta_data',
    },
  },
  {
    sequelize,
    modelName: 'PodCustomization',
    tableName: 'pod_customizations',
    timestamps: true,
    underscored: true,
  }
);
