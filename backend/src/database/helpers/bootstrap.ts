import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { Tenant, Store, StoreDomain, User, UserProfile, UserRole, Role } from '../models';
import { logger } from '../../shared/logging/logger';

export const bootstrapDefaultData = async (): Promise<void> => {
  try {
    const defaultTenantUuid = '00000000-0000-0000-0000-000000000001';
    const defaultTenantSlug = 'default';

    // 1. Ensure Default Tenant
    let tenant = await Tenant.findOne({
      where: {
        [Op.or]: [{ slug: defaultTenantSlug }, { uuid: defaultTenantUuid }],
      },
      paranoid: false,
    });

    if (!tenant) {
      tenant = await Tenant.create({
        uuid: defaultTenantUuid,
        name: 'Default Organization',
        slug: defaultTenantSlug,
        status: 'active',
      });
      logger.info('✅ Default Tenant created successfully');
    } else {
      if (tenant.deletedAt) {
        await tenant.restore();
        logger.info('✅ Default Tenant restored successfully');
      }
    }

    // 2. Ensure Default Store
    let store = await Store.findOne({
      where: { tenantId: tenant.id, slug: 'default-store' },
      paranoid: false,
    });
    if (!store) {
      store = await Store.create({
        tenantId: tenant.id,
        name: 'Main Store',
        slug: 'default-store',
        currency: 'USD',
        timezone: 'UTC',
        language: 'en',
        status: 'active',
      });
      logger.info('✅ Default Store created successfully');
    } else if (store.deletedAt) {
      await store.restore();
      logger.info('✅ Default Store restored successfully');
    }

    // 3. Ensure Localhost Store Domain
    let domain = await StoreDomain.findOne({
      where: { domain: 'localhost' },
    });
    if (!domain) {
      domain = await StoreDomain.create({
        tenantId: tenant.id,
        storeId: store.id,
        domain: 'localhost',
        domainType: 'custom',
        verificationStatus: 'verified',
        verificationTokenHash: 'localhost_bootstrap_verified_hash',
        isPrimary: true,
      });
      logger.info('✅ Localhost Store Domain mapped successfully');
    } else if (domain.verificationStatus !== 'verified') {
      domain.verificationStatus = 'verified';
      await domain.save();
    }

    // 4. Ensure Super Admin User
    const adminEmail = 'admin@comzilo.com';
    let user = await User.findOne({
      where: { tenantId: tenant.id, email: adminEmail },
      paranoid: false,
    });
    if (!user) {
      const passwordHash = await bcrypt.hash('SuperAdminSecurePassword2026!', 10);
      user = await User.create({
        tenantId: tenant.id,
        uuid: uuidv4(),
        email: adminEmail,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        status: 'active',
      });
      logger.info('✅ Super Admin User created successfully');
    } else if (user.deletedAt) {
      await user.restore();
      logger.info('✅ Super Admin User restored successfully');
    }

    // Create User Profile if missing
    await UserProfile.findOrCreate({
      where: { userId: user.id },
      defaults: { tenantId: tenant.id, userId: user.id },
    });

    // Find Admin Role (Role ID 1 or slug 'tenant_admin' / 'super_admin')
    const role =
      (await Role.findOne({ where: { code: 'tenant_admin' } })) || (await Role.findByPk(1));
    if (role) {
      await UserRole.findOrCreate({
        where: { tenantId: tenant.id, userId: user.id, roleId: role.id },
        defaults: {
          tenantId: tenant.id,
          userId: user.id,
          roleId: role.id,
          storeId: store.id,
          assignedAt: new Date(),
        },
      });
    }
  } catch (error: any) {
    logger.error('Error executing bootstrap default data:', error);
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((e: any) => {
        logger.error(`Validation detail: ${e.message} (field: ${e.path}, value: ${e.value})`);
      });
    }
    if (error.parent) {
      logger.error(`DB detail: ${error.parent.message}`);
    }
  }
};

