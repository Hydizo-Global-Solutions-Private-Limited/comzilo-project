'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. shipping_zones
    await queryInterface.createTable('shipping_zones', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'India',
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      pincode: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
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

    // 2. shipping_methods
    await queryInterface.createTable('shipping_methods', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      code: {
        type: Sequelize.ENUM(
          'standard',
          'express',
          'same_day',
          'next_day',
          'economy',
          'store_pickup',
          'local_delivery'
        ),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      estimated_days: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: '2-5 Days',
      },
      is_enabled: {
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

    // 3. pickup_addresses
    await queryInterface.createTable('pickup_addresses', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      contact_person: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      address_line1: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      address_line2: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'India',
      },
      pincode: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    // 4. shipment_packages
    await queryInterface.createTable('shipment_packages', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      length_cm: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 10.0,
      },
      width_cm: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 10.0,
      },
      height_cm: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 10.0,
      },
      max_weight_kg: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1.0,
      },
      package_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'Box',
      },
      material: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'Corrugated Cardboard',
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    // 5. shipments
    await queryInterface.createTable('shipments', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      order_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      order_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      provider_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      awb_number: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      courier_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM(
          'created',
          'pickup_assigned',
          'picked_up',
          'in_transit',
          'out_for_delivery',
          'delivered',
          'cancelled',
          'returned',
          'failed_delivery',
          'lost',
          'damaged'
        ),
        allowNull: false,
        defaultValue: 'created',
      },
      is_cod: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      cod_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      shipping_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      destination_address: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      pickup_address: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      package_info: {
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

    // 6. shipment_tracking
    await queryInterface.createTable('shipment_tracking', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      shipment_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'shipments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      location: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      activity: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      raw_payload: {
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

    // 7. shipping_labels
    await queryInterface.createTable('shipping_labels', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      shipment_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'shipments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      label_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      barcode: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      qr_code: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      manifest_url: {
        type: Sequelize.TEXT,
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

    // 8. shipping_logs
    await queryInterface.createTable('shipping_logs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      provider_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('success', 'failed', 'pending'),
        allowNull: false,
        defaultValue: 'success',
      },
      request_data: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      response_data: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
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

    // 9. provider_webhooks
    await queryInterface.createTable('provider_webhooks', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      provider_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      event_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('processed', 'failed', 'retrying'),
        allowNull: false,
        defaultValue: 'processed',
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

    // 10. shipping_rate_rules
    await queryInterface.createTable('shipping_rate_rules', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM(
          'flat',
          'weight_based',
          'distance_based',
          'order_value_based',
          'free',
          'courier_api',
          'custom_formula'
        ),
        allowNull: false,
        defaultValue: 'flat',
      },
      min_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      max_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      rate: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
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
    await queryInterface.dropTable('shipping_rate_rules');
    await queryInterface.dropTable('provider_webhooks');
    await queryInterface.dropTable('shipping_logs');
    await queryInterface.dropTable('shipping_labels');
    await queryInterface.dropTable('shipment_tracking');
    await queryInterface.dropTable('shipments');
    await queryInterface.dropTable('shipment_packages');
    await queryInterface.dropTable('pickup_addresses');
    await queryInterface.dropTable('shipping_methods');
    await queryInterface.dropTable('shipping_zones');
  },
};
