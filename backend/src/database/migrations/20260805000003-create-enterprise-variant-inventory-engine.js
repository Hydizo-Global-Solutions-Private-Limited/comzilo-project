'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update variant_inventories table
    const viDesc = await queryInterface.describeTable('variant_inventories').catch(() => null);
    if (viDesc) {
      if (!viDesc.reserved_stock) {
        await queryInterface.addColumn('variant_inventories', 'reserved_stock', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        });
      }
      if (!viDesc.low_stock_threshold) {
        await queryInterface.addColumn('variant_inventories', 'low_stock_threshold', {
          type: Sequelize.INTEGER,
          defaultValue: 5,
        });
      }
      if (!viDesc.reorder_level) {
        await queryInterface.addColumn('variant_inventories', 'reorder_level', {
          type: Sequelize.INTEGER,
          defaultValue: 10,
        });
      }
      if (!viDesc.status) {
        await queryInterface.addColumn('variant_inventories', 'status', {
          type: Sequelize.ENUM('in_stock', 'low_stock', 'out_of_stock', 'discontinued'),
          defaultValue: 'in_stock',
        });
      }
      if (!viDesc.notes) {
        await queryInterface.addColumn('variant_inventories', 'notes', {
          type: Sequelize.TEXT,
          allowNull: true,
        });
      }
    }

    // Add unique index on (variant_id, warehouse_id) to prevent duplicate warehouse allocation
    await queryInterface
      .addIndex('variant_inventories', ['variant_id', 'warehouse_id'], {
        name: 'idx_var_wh_unique',
        unique: true,
      })
      .catch(() => {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('variant_inventories', 'idx_var_wh_unique').catch(() => {});
  },
};
