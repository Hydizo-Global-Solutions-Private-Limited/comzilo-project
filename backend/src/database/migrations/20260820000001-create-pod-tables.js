'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create pod_categories table
    await queryInterface.createTable('pod_categories', {
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
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      image_url: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    // 2. Create pod_templates table
    await queryInterface.createTable('pod_templates', {
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
      category_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
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
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      thumbnail_url: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      base_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      printable_area: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      canvas_json: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      allowed_colors: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      allowed_sizes: {
        type: Sequelize.JSON,
        allowNull: true,
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

    // 3. Create pod_customizations table
    await queryInterface.createTable('pod_customizations', {
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
      order_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      order_item_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      product_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      template_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      template_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      uploaded_image_url: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      custom_text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      font: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      text_color: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      size: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      color: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      preview_image_url: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      meta_data: {
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pod_customizations');
    await queryInterface.dropTable('pod_templates');
    await queryInterface.dropTable('pod_categories');
  },
};
