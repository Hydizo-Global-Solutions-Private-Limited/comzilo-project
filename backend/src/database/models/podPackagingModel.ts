/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export interface PodPackagingModelAttributes {
  id: number;
  name: string;
  code: string;
  category: string;
  modelType: 'box' | 'mailer' | 'pouch' | 'bag' | 'bottle' | 'mug';
  gltfUrl?: string | null;
  uvMapConfig?: any;
  defaultMaterial: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PodPackagingModelCreationAttributes = Optional<
  PodPackagingModelAttributes,
  'id' | 'category' | 'modelType' | 'defaultMaterial' | 'isActive'
>;

export class PodPackagingModel
  extends Model<PodPackagingModelAttributes, PodPackagingModelCreationAttributes>
  implements PodPackagingModelAttributes
{
  declare id: number;
  declare name: string;
  declare code: string;
  declare category: string;
  declare modelType: 'box' | 'mailer' | 'pouch' | 'bag' | 'bottle' | 'mug';
  declare gltfUrl: string | null;
  declare uvMapConfig: any;
  declare defaultMaterial: string;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PodPackagingModel.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Boxes',
    },
    modelType: {
      type: DataTypes.ENUM('box', 'mailer', 'pouch', 'bag', 'bottle', 'mug'),
      allowNull: false,
      defaultValue: 'box',
      field: 'model_type',
    },
    gltfUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'gltf_url',
    },
    uvMapConfig: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'uv_map_config',
    },
    defaultMaterial: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'matte',
      field: 'default_material',
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
    modelName: 'PodPackagingModel',
    tableName: 'pod_packaging_models',
    timestamps: true,
    underscored: true,
  }
);
