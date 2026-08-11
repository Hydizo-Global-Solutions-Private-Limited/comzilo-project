'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Update attribute_groups table
    const agDesc = await queryInterface.describeTable('attribute_groups').catch(() => null);
    if (agDesc) {
      if (!agDesc.display_order) {
        await queryInterface.addColumn('attribute_groups', 'display_order', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        });
      }
      if (!agDesc.status) {
        await queryInterface.addColumn('attribute_groups', 'status', {
          type: Sequelize.ENUM('active', 'inactive', 'archived'),
          defaultValue: 'active',
        });
      }
      if (!agDesc.deleted_at) {
        await queryInterface.addColumn('attribute_groups', 'deleted_at', {
          type: Sequelize.DATE,
          allowNull: true,
        });
      }
    }

    // Add unique index on attribute_groups(tenant_id, code)
    await queryInterface
      .addIndex('attribute_groups', ['tenant_id', 'code'], {
        name: 'idx_ag_tenant_code_unique',
        unique: true,
      })
      .catch(() => {});

    // 2. Update category_attributes table
    const caDesc = await queryInterface.describeTable('category_attributes').catch(() => null);
    if (caDesc) {
      if (!caDesc.attribute_group_id) {
        await queryInterface.addColumn('category_attributes', 'attribute_group_id', {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'attribute_groups',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
      }
      if (!caDesc.display_name) {
        await queryInterface.addColumn('category_attributes', 'display_name', {
          type: Sequelize.STRING(255),
          allowNull: true,
        });
      }
      if (!caDesc.code) {
        await queryInterface.addColumn('category_attributes', 'code', {
          type: Sequelize.STRING(255),
          allowNull: true,
        });
      }
      if (!caDesc.description) {
        await queryInterface.addColumn('category_attributes', 'description', {
          type: Sequelize.TEXT,
          allowNull: true,
        });
      }
      if (!caDesc.placeholder) {
        await queryInterface.addColumn('category_attributes', 'placeholder', {
          type: Sequelize.STRING(255),
          allowNull: true,
        });
      }
      if (!caDesc.default_value) {
        await queryInterface.addColumn('category_attributes', 'default_value', {
          type: Sequelize.STRING(255),
          allowNull: true,
        });
      }
      if (!caDesc.is_unique) {
        await queryInterface.addColumn('category_attributes', 'is_unique', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        });
      }
      if (!caDesc.is_searchable) {
        await queryInterface.addColumn('category_attributes', 'is_searchable', {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        });
      }
      if (!caDesc.is_sortable) {
        await queryInterface.addColumn('category_attributes', 'is_sortable', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        });
      }
      if (!caDesc.is_visible) {
        await queryInterface.addColumn('category_attributes', 'is_visible', {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        });
      }
      if (!caDesc.display_order) {
        await queryInterface.addColumn('category_attributes', 'display_order', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        });
      }
      if (!caDesc.status) {
        await queryInterface.addColumn('category_attributes', 'status', {
          type: Sequelize.ENUM('active', 'inactive', 'archived'),
          defaultValue: 'active',
        });
      }
    }

    // Add unique index on category_attributes(tenant_id, category_id, code)
    await queryInterface
      .addIndex('category_attributes', ['tenant_id', 'category_id', 'attribute_name'], {
        name: 'idx_ca_tenant_cat_attr_unique',
      })
      .catch(() => {});

    // 3. Update attribute_values table
    const avDesc = await queryInterface.describeTable('attribute_values').catch(() => null);
    if (avDesc) {
      if (!avDesc.tenant_id) {
        await queryInterface.addColumn('attribute_values', 'tenant_id', {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
        });
      }
      if (!avDesc.deleted_at) {
        await queryInterface.addColumn('attribute_values', 'deleted_at', {
          type: Sequelize.DATE,
          allowNull: true,
        });
      }
    }

    // Add unique index on attribute_values(attribute_group_id, value)
    await queryInterface
      .addIndex('attribute_values', ['attribute_group_id', 'value'], {
        name: 'idx_av_group_value_unique',
        unique: true,
      })
      .catch(() => {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface
      .removeIndex('attribute_values', 'idx_av_group_value_unique')
      .catch(() => {});
    await queryInterface
      .removeIndex('category_attributes', 'idx_ca_tenant_cat_attr_unique')
      .catch(() => {});
    await queryInterface
      .removeIndex('attribute_groups', 'idx_ag_tenant_code_unique')
      .catch(() => {});
  },
};
