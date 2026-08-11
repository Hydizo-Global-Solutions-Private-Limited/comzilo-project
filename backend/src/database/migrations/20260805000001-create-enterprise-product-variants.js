'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Category Attributes Table
    await queryInterface.createTable('category_attributes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED,
      },
      tenant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      category_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      attribute_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      attribute_type: {
        type: Sequelize.ENUM('text', 'select', 'color', 'size'),
        defaultValue: 'select',
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_filterable: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // 2. Attribute Groups Table
    await queryInterface.createTable('attribute_groups', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED,
      },
      tenant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // 3. Attribute Values Table
    await queryInterface.createTable('attribute_values', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED,
      },
      attribute_group_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'attribute_groups',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      value: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      hex_code: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // 4. Add additional columns and indexes to product_variants safely
    const pvDescription = await queryInterface.describeTable('product_variants').catch(() => null);
    if (pvDescription) {
      if (!pvDescription.tenant_id) {
        await queryInterface.addColumn('product_variants', 'tenant_id', {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
        });
      }
      if (!pvDescription.store_id) {
        await queryInterface.addColumn('product_variants', 'store_id', {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
        });
      }
      if (!pvDescription.compare_at_price) {
        await queryInterface.addColumn('product_variants', 'compare_at_price', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
        });
      }
      if (!pvDescription.cost_price) {
        await queryInterface.addColumn('product_variants', 'cost_price', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
        });
      }
      if (!pvDescription.stock_quantity) {
        await queryInterface.addColumn('product_variants', 'stock_quantity', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        });
      }
      if (!pvDescription.status) {
        await queryInterface.addColumn('product_variants', 'status', {
          type: Sequelize.ENUM('active', 'draft', 'archived'),
          defaultValue: 'active',
        });
      }
      if (!pvDescription.created_by) {
        await queryInterface.addColumn('product_variants', 'created_by', {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
        });
      }
      if (!pvDescription.updated_by) {
        await queryInterface.addColumn('product_variants', 'updated_by', {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
        });
      }
    }

    // Add Indexes to product_variants
    await queryInterface
      .addIndex('product_variants', ['tenant_id'], { name: 'idx_pv_tenant_id' })
      .catch(() => {});
    await queryInterface
      .addIndex('product_variants', ['store_id'], { name: 'idx_pv_store_id' })
      .catch(() => {});
    await queryInterface
      .addIndex('product_variants', ['product_id'], { name: 'idx_pv_product_id' })
      .catch(() => {});
    await queryInterface
      .addIndex('product_variants', ['barcode'], { name: 'idx_pv_barcode' })
      .catch(() => {});
    await queryInterface
      .addIndex('product_variants', ['status'], { name: 'idx_pv_status' })
      .catch(() => {});
    await queryInterface
      .addIndex('product_variants', ['tenant_id', 'sku'], {
        name: 'idx_pv_tenant_sku',
        unique: true,
      })
      .catch(() => {});

    // 5. Variant Attributes Table
    await queryInterface.createTable('variant_attributes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED,
      },
      variant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'product_variants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      attribute_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      attribute_value: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface
      .addIndex('variant_attributes', ['variant_id', 'attribute_name', 'attribute_value'], {
        name: 'idx_va_unique_combination',
        unique: true,
      })
      .catch(() => {});

    // 6. Variant Images Table
    await queryInterface.createTable('variant_images', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED,
      },
      variant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'product_variants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      image_url: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // 7. Variant Inventories Table
    await queryInterface.createTable('variant_inventories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED,
      },
      tenant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      store_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      variant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'product_variants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      warehouse_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      quantity_on_hand: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      quantity_reserved: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      quantity_available: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      reorder_point: {
        type: Sequelize.INTEGER,
        defaultValue: 5,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface
      .addIndex('variant_inventories', ['tenant_id', 'variant_id', 'warehouse_id'], {
        name: 'idx_vi_tenant_variant_warehouse',
      })
      .catch(() => {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('variant_inventories').catch(() => {});
    await queryInterface.dropTable('variant_images').catch(() => {});
    await queryInterface.dropTable('variant_attributes').catch(() => {});
    await queryInterface.removeIndex('product_variants', 'idx_pv_tenant_sku').catch(() => {});
    await queryInterface.removeIndex('product_variants', 'idx_pv_status').catch(() => {});
    await queryInterface.removeIndex('product_variants', 'idx_pv_barcode').catch(() => {});
    await queryInterface.removeIndex('product_variants', 'idx_pv_product_id').catch(() => {});
    await queryInterface.removeIndex('product_variants', 'idx_pv_store_id').catch(() => {});
    await queryInterface.removeIndex('product_variants', 'idx_pv_tenant_id').catch(() => {});
    await queryInterface.dropTable('attribute_values').catch(() => {});
    await queryInterface.dropTable('attribute_groups').catch(() => {});
    await queryInterface.dropTable('category_attributes').catch(() => {});
  },
};
