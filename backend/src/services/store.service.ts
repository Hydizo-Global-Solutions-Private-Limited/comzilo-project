/* eslint-disable @typescript-eslint/no-explicit-any */
import { StoreRepository } from '../repositories/store.repository';
import { StoreDomainRepository } from '../repositories/storeDomain.repository';
import { StoreSettingsRepository } from '../repositories/storeSettings.repository';
import { TenantRepository } from '../repositories/tenant.repository';
import {
  Store,
  StoreDomain,
  StoreSettings,
  Tenant,
  UserRole,
  User,
  Product,
  Customer,
  Order,
} from '../database/models';
import { NotFoundError, ValidationError, AuthorizationError } from '../shared/errors/AppError';
import { sequelize } from '../config/database';
import crypto from 'crypto';

export class StoreService {
  private storeRepo = new StoreRepository();
  private domainRepo = new StoreDomainRepository();
  private settingsRepo = new StoreSettingsRepository();
  private tenantRepo = new TenantRepository();

  private async checkTenantStatus(tenantId: number): Promise<void> {
    const tenant = await this.tenantRepo.findById(null, tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }
    if (tenant.status === 'suspended') {
      throw new AuthorizationError('Tenant is suspended. Operations blocked.');
    }
  }

  public async createStore(
    tenantId: number,
    data: {
      name: string;
      slug?: string;
      legalName?: string;
      email?: string;
      mobile?: string;
      currency?: string;
      timezone?: string;
      language?: string;
      logoUrl?: string;
      faviconUrl?: string;
      status?: 'active' | 'suspended';
    }
  ): Promise<Store> {
    await this.checkTenantStatus(tenantId);

    const slug = data.slug || this.generateSlug(data.name);

    // Verify slug uniqueness per tenant
    const existing = await this.storeRepo.findOne(tenantId, { where: { slug } });
    if (existing) {
      throw new ValidationError(`Store with slug '${slug}' already exists for this tenant`);
    }

    return this.storeRepo.create(tenantId, {
      ...data,
      slug,
    });
  }

  public async getStore(tenantId: number, storeId: number): Promise<Store> {
    await this.checkTenantStatus(tenantId);
    const store = await this.storeRepo.findById(tenantId, storeId);
    if (!store) {
      throw new NotFoundError('Store not found');
    }
    return store;
  }

  public async listStores(tenantId?: number | null): Promise<Store[]> {
    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const stores = await Store.findAll({
      where,
      include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'name', 'slug', 'status'] }],
      order: [['id', 'DESC']],
    });

    const enrichedStores = await Promise.all(
      stores.map(async (store: any) => {
        const storeObj = store.toJSON();

        try {
          const userRole: any = await UserRole.findOne({
            where: { tenantId: store.tenantId },
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName', 'email', 'mobile'],
              },
            ],
          });
          if (userRole && userRole.user) {
            storeObj.sellerName =
              `${userRole.user.firstName || ''} ${userRole.user.lastName || ''}`.trim() ||
              'Store Owner';
            storeObj.businessEmail = userRole.user.email;
            storeObj.phone = userRole.user.mobile || '+915220230512';
          } else {
            storeObj.sellerName = 'Super Admin';
            storeObj.businessEmail = 'admin@comzilo.com';
            storeObj.phone = '+919999999999';
          }
        } catch {
          storeObj.sellerName = 'Store Owner';
          storeObj.businessEmail = 'owner@comzilo.com';
          storeObj.phone = '+919999999999';
        }

        try {
          const productsCount = await Product.count({ where: { tenantId: store.tenantId } });
          const customersCount = await Customer.count({ where: { tenantId: store.tenantId } });
          const ordersCount = await Order.count({ where: { tenantId: store.tenantId } });
          const totalRevenue = await Order.sum('totalAmount', {
            where: { tenantId: store.tenantId },
          });

          storeObj.tenantName = store.tenant?.name || 'Main Tenant';
          storeObj.subscriptionPlan = 'Enterprise Multi-Store';
          storeObj.totalProducts = productsCount || 0;
          storeObj.totalCustomers = customersCount || 0;
          storeObj.totalOrders = ordersCount || 0;
          storeObj.revenue = totalRevenue ? `$${Number(totalRevenue).toFixed(2)}` : '$0.00';
        } catch {
          storeObj.tenantName = store.tenant?.name || 'Main Tenant';
          storeObj.subscriptionPlan = 'Standard Plan';
          storeObj.totalProducts = 0;
          storeObj.totalCustomers = 0;
          storeObj.totalOrders = 0;
          storeObj.revenue = '$0.00';
        }

        return storeObj;
      })
    );

    return enrichedStores as any;
  }

  public async updateStore(
    tenantId: number,
    storeId: number,
    data: Partial<Store>
  ): Promise<Store> {
    await this.checkTenantStatus(tenantId);
    const store = await this.getStore(tenantId, storeId);

    if (data.slug) {
      const existing = await this.storeRepo.findOne(tenantId, { where: { slug: data.slug } });
      if (existing && existing.id !== storeId) {
        throw new ValidationError(`Store with slug '${data.slug}' already exists`);
      }
    }

    await store.update(data);
    return store;
  }

  public async deleteStore(tenantId: number, storeId: number): Promise<void> {
    await this.checkTenantStatus(tenantId);
    const store = await this.getStore(tenantId, storeId);
    await store.destroy(); // soft-delete
  }

  public async restoreStore(tenantId: number, storeId: number): Promise<Store> {
    await this.checkTenantStatus(tenantId);
    const store = await Store.findOne({
      where: { id: storeId, tenant_id: tenantId },
      paranoid: false,
    });
    if (!store) {
      throw new NotFoundError('Store not found');
    }
    await store.restore();
    return store;
  }

  // Settings
  public async getSettings(tenantId: number, storeId: number): Promise<Record<string, any>> {
    await this.checkTenantStatus(tenantId);
    // Verify store exists
    await this.getStore(tenantId, storeId);

    const settings = await this.settingsRepo.findByStoreId(tenantId, storeId);
    const result: Record<string, any> = {};
    for (const s of settings) {
      result[s.settingKey] = s.settingValue;
    }
    return result;
  }

  public async updateSettings(
    tenantId: number,
    storeId: number,
    settings: Record<string, { value: any; isPublic?: boolean }>
  ): Promise<void> {
    await this.checkTenantStatus(tenantId);
    // Verify store exists
    await this.getStore(tenantId, storeId);

    await sequelize.transaction(async (t) => {
      for (const [key, config] of Object.entries(settings)) {
        const [settingRecord] = await StoreSettings.findOrCreate({
          where: { tenantId, storeId, settingKey: key },
          defaults: {
            tenantId,
            storeId,
            settingKey: key,
            settingValue: config.value,
            isPublic: config.isPublic ?? false,
          },
          transaction: t,
        });

        if (settingRecord) {
          settingRecord.settingValue = config.value;
          if (config.isPublic !== undefined) {
            settingRecord.isPublic = config.isPublic;
          }
          await settingRecord.save({ transaction: t });
        }
      }
    });
  }

  // Custom Domains
  public async addDomain(
    tenantId: number,
    storeId: number,
    domain: string,
    domainType: 'subdomain' | 'custom' = 'custom'
  ): Promise<StoreDomain> {
    await this.checkTenantStatus(tenantId);
    await this.getStore(tenantId, storeId);

    // Verify domain uniqueness globally
    const existing = await this.domainRepo.findByDomain(domain);
    if (existing) {
      throw new ValidationError(`Domain '${domain}' is already registered`);
    }

    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(domain + Date.now().toString())
      .digest('hex');

    return this.domainRepo.create(tenantId, {
      storeId,
      domain,
      domainType,
      verificationStatus: 'pending',
      verificationTokenHash,
      isPrimary: false,
    });
  }

  public async removeDomain(tenantId: number, storeId: number, domain: string): Promise<void> {
    await this.checkTenantStatus(tenantId);
    await this.getStore(tenantId, storeId);

    const domainRecord = await this.domainRepo.findOne(tenantId, {
      where: { store_id: storeId, domain },
    });
    if (!domainRecord) {
      throw new NotFoundError('Domain not found');
    }

    await domainRecord.destroy();
  }

  public async verifyDomain(
    tenantId: number,
    storeId: number,
    domain: string
  ): Promise<StoreDomain> {
    await this.checkTenantStatus(tenantId);
    await this.getStore(tenantId, storeId);

    const domainRecord = await this.domainRepo.findOne(tenantId, {
      where: { store_id: storeId, domain },
    });
    if (!domainRecord) {
      throw new NotFoundError('Domain not found');
    }

    // Simulate standard domain verification checks
    domainRecord.verificationStatus = 'verified';
    domainRecord.verifiedAt = new Date();
    await domainRecord.save();
    return domainRecord;
  }

  public async setPrimaryDomain(
    tenantId: number,
    storeId: number,
    domain: string
  ): Promise<StoreDomain> {
    await this.checkTenantStatus(tenantId);
    await this.getStore(tenantId, storeId);

    const domainRecord = await this.domainRepo.findOne(tenantId, {
      where: { store_id: storeId, domain },
    });
    if (!domainRecord) {
      throw new NotFoundError('Domain not found');
    }

    if (domainRecord.verificationStatus !== 'verified') {
      throw new ValidationError('Only verified domains can be set as primary');
    }

    await sequelize.transaction(async (t) => {
      // Clear current primary domain for this store
      await StoreDomain.update(
        { isPrimary: false },
        { where: { tenant_id: tenantId, store_id: storeId }, transaction: t }
      );

      domainRecord.isPrimary = true;
      await domainRecord.save({ transaction: t });
    });

    return domainRecord;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
}
