'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create pod_design_templates table
    await queryInterface.createTable('pod_design_templates', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      seller_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      product_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'General',
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      thumbnail_url: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      canvas_json: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // 2. Create pod_cliparts table
    await queryInterface.createTable('pod_cliparts', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'General',
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      svg_url: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      svg_content: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      source: {
        type: Sequelize.ENUM('local', 'pixabay', 'openclipart'),
        allowNull: false,
        defaultValue: 'local',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 3. Create pod_saved_designs table
    await queryInterface.createTable('pod_saved_designs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      customer_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      product_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'My Custom Design',
      },
      share_token: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
      },
      canvas_json: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      preview_url: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      print_files_json: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 4. Create pod_packaging_models table (Packdora 3D Packaging Models)
    await queryInterface.createTable('pod_packaging_models', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'Boxes',
      },
      model_type: {
        type: Sequelize.ENUM('box', 'mailer', 'pouch', 'bag', 'bottle', 'mug'),
        allowNull: false,
        defaultValue: 'box',
      },
      gltf_url: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      uv_map_config: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      default_material: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'matte',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pod_packaging_models');
    await queryInterface.dropTable('pod_saved_designs');
    await queryInterface.dropTable('pod_cliparts');
    await queryInterface.dropTable('pod_design_templates');
  },
};
