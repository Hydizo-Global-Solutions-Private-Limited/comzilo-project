/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export interface ProductImageAttributes {
  id: number;
  productId: number;
  imageUrl: string;
  url?: string | null;
  thumbnailUrl: string | null;
  displayOrder: number;
  isPrimary: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProductImageCreationAttributes = Optional<
  ProductImageAttributes,
  'id' | 'url' | 'thumbnailUrl' | 'displayOrder' | 'isPrimary'
>;

export class ProductImage
  extends Model<ProductImageAttributes, ProductImageCreationAttributes>
  implements ProductImageAttributes
{
  declare id: number;
  declare productId: number;
  declare imageUrl: string;
  declare url: string | null;
  declare thumbnailUrl: string | null;
  declare displayOrder: number;
  declare isPrimary: boolean;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ProductImage.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    productId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'product_id',
    },
    imageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: false,
      field: 'image_url',
    },
    url: {
      type: DataTypes.VIRTUAL,
      get(this: ProductImage) {
        return this.getDataValue('imageUrl');
      },
    },
    thumbnailUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'thumbnail_url',
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'display_order',
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_primary',
    },
  },
  {
    sequelize,
    tableName: 'product_images',
    timestamps: true,
    underscored: true,
  }
);
