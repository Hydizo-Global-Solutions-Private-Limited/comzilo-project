/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export interface PodSavedDesignAttributes {
  id: number;
  tenantId: number;
  userId?: number | null;
  customerId?: number | null;
  productId: number;
  title: string;
  shareToken?: string | null;
  canvasJson: any;
  previewUrl?: string | null;
  printFilesJson?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PodSavedDesignCreationAttributes = Optional<
  PodSavedDesignAttributes,
  'id' | 'tenantId' | 'title'
>;

export class PodSavedDesign
  extends Model<PodSavedDesignAttributes, PodSavedDesignCreationAttributes>
  implements PodSavedDesignAttributes
{
  declare id: number;
  declare tenantId: number;
  declare userId: number | null;
  declare customerId: number | null;
  declare productId: number;
  declare title: string;
  declare shareToken: string | null;
  declare canvasJson: any;
  declare previewUrl: string | null;
  declare printFilesJson: any;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PodSavedDesign.init(
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
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'user_id',
    },
    customerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'customer_id',
    },
    productId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'product_id',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'My Custom Design',
    },
    shareToken: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'share_token',
    },
    canvasJson: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'canvas_json',
    },
    previewUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'preview_url',
    },
    printFilesJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'print_files_json',
    },
  },
  {
    sequelize,
    modelName: 'PodSavedDesign',
    tableName: 'pod_saved_designs',
    timestamps: true,
    underscored: true,
  }
);
