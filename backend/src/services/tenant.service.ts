/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../config/database';
import { TenantRepository } from '../repositories/tenant.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { PlanRepository } from '../repositories/plan.repository';
import { UserRepository } from '../repositories/user.repository';
import { StoreRepository } from '../repositories/store.repository';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';
import { Tenant, Subscription } from '../database/models';
import { buildFilters } from '../utils/filtering';

export class TenantService {
  private tenantRepo = new TenantRepository();
  private subscriptionRepo = new SubscriptionRepository();
  private planRepo = new PlanRepository();
  private userRepo = new UserRepository();
  private storeRepo = new StoreRepository();

  public async createTenant(data: {
    name: string;
    slug?: string;
    ownerUserId?: number;
    currency?: string;
    timezone?: string;
    language?: string;
    plan?: string;
    planCode?: string;
    billingCycle?: 'monthly' | 'yearly';
  }): Promise<Tenant> {
    const rawSlug = data.slug && data.slug.trim() ? data.slug : data.name;
    const slug = this.generateSlug(rawSlug);

    // Check slug uniqueness
    const existing = await this.tenantRepo.findBySlug(slug);
    if (existing) {
      throw new ValidationError(`Tenant with slug '${slug}' already exists`);
    }

    const rawPlanCode = data.planCode || data.plan || 'enterprise';
    const targetPlanCode = String(rawPlanCode).toLowerCase();
    let plan = await this.planRepo.findByCode(targetPlanCode);
    if (!plan) {
      const allPlans = await this.planRepo.findMany(null);
      plan = allPlans.find((p: any) => p.name.toLowerCase().includes(targetPlanCode) || p.code.toLowerCase() === targetPlanCode) || allPlans[0];
    }
    if (!plan) {
      throw new NotFoundError(`No subscription plan found in system`);
    }

    const effectiveBillingCycle = data.billingCycle || 'monthly';

    return sequelize.transaction(async (t) => {
      // Create Tenant
      const tenant = await Tenant.create(
        {
          uuid: uuidv4(),
          name: data.name,
          slug,
          owner_user_id: data.ownerUserId || null,
          status: 'active',
        },
        { transaction: t }
      );

      // Create initial subscription
      const amount = effectiveBillingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
      const startsAt = new Date();
      const trialEndsAt =
        plan.trialDays > 0
          ? new Date(startsAt.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
          : null;
      const currentPeriodEnd = new Date(
        startsAt.getTime() + (effectiveBillingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
      );

      await Subscription.create(
        {
          tenantId: tenant.id,
          planId: plan.id,
          status: plan.trialDays > 0 ? 'trialing' : 'active',
          startsAt,
          trialEndsAt,
          currentPeriodStart: startsAt,
          currentPeriodEnd,
          endsAt: currentPeriodEnd,
          billingCycle: effectiveBillingCycle,
          amount,
          currency: plan.currency,
          provider: 'manual',
        },
        { transaction: t }
      );

      return tenant;
    });
  }

  public async getTenantByIdOrUuid(idOrUuid: string | number): Promise<Tenant> {
    let tenant: Tenant | null = null;
    if (typeof idOrUuid === 'number' || !isNaN(Number(idOrUuid))) {
      tenant = await this.tenantRepo.findById(null, Number(idOrUuid));
    } else {
      tenant = await this.tenantRepo.findByUuid(idOrUuid);
    }

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }
    return tenant;
  }

  public async listTenants(query?: Record<string, any>): Promise<Tenant[]> {
    if (!query || Object.keys(query).length === 0) {
      return this.tenantRepo.findMany(null, { order: [['id', 'ASC']] });
    }
    const where = buildFilters(query, ['name', 'slug']);
    const options: any = { where, order: [['id', 'ASC']] };
    if (query.limit) {
      const limit = parseInt(query.limit, 10);
      if (!isNaN(limit) && limit > 0) {
        options.limit = limit;
        if (query.page) {
          const page = parseInt(query.page, 10);
          if (!isNaN(page) && page > 0) {
            options.offset = (page - 1) * limit;
          }
        }
      }
    }
    return this.tenantRepo.findMany(null, options);
  }

  public async updateTenant(
    idOrUuid: string | number,
    data: { name?: string; status?: any }
  ): Promise<Tenant> {
    const tenant = await this.getTenantByIdOrUuid(idOrUuid);
    if (data.name) tenant.name = data.name;
    if (data.status) tenant.status = data.status;
    await tenant.save();
    return tenant;
  }

  public async deleteTenant(idOrUuid: string | number): Promise<void> {
    const tenant = await this.getTenantByIdOrUuid(idOrUuid);
    await tenant.destroy(); // paranoid soft-delete
  }

  public async restoreTenant(idOrUuid: string | number): Promise<Tenant> {
    // Need to find with soft deletes included
    let tenant: Tenant | null = null;
    if (typeof idOrUuid === 'number' || !isNaN(Number(idOrUuid))) {
      tenant = await Tenant.findOne({ where: { id: Number(idOrUuid) }, paranoid: false });
    } else {
      tenant = await Tenant.findOne({ where: { uuid: idOrUuid }, paranoid: false });
    }

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    await tenant.restore();
    return tenant;
  }

  public async assignPlan(
    tenantId: number,
    data: { planCode: string; billingCycle: 'monthly' | 'yearly' }
  ): Promise<Subscription> {
    const tenant = await this.tenantRepo.findById(null, tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    const plan = await this.planRepo.findByCode(data.planCode);
    if (!plan) {
      throw new NotFoundError(`Plan with code '${data.planCode}' not found`);
    }

    return sequelize.transaction(async (t) => {
      // Expire current active subscription
      await Subscription.update(
        { status: 'expired', cancelledAt: new Date() },
        {
          where: {
            tenant_id: tenantId,
            status: ['active', 'trialing', 'past_due'],
          },
          transaction: t,
        }
      );

      // Create new subscription
      const amount = data.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
      const startsAt = new Date();
      const currentPeriodEnd = new Date(
        startsAt.getTime() + (data.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
      );

      return Subscription.create(
        {
          tenantId,
          planId: plan.id,
          status: 'active',
          startsAt,
          currentPeriodStart: startsAt,
          currentPeriodEnd,
          endsAt: currentPeriodEnd,
          billingCycle: data.billingCycle,
          amount,
          currency: plan.currency,
          provider: 'manual',
        },
        { transaction: t }
      );
    });
  }

  public async getStatistics(tenantId: number): Promise<any> {
    const tenant = await this.tenantRepo.findById(null, tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    const storeCount = await this.storeRepo.count(tenantId);
    const userCount = await this.userRepo.count(tenantId);
    const activeUsers = await this.userRepo.count(tenantId, { where: { status: 'active' } });
    const activeSub = await this.subscriptionRepo.findActiveSubscription(tenantId);

    let planName = 'Free Trial';
    if (activeSub) {
      const plan = await this.planRepo.findById(null, activeSub.planId);
      if (plan) planName = plan.name;
    }

    return {
      storeCount,
      userCount,
      activeUsers,
      subscriptionPlan: planName,
      storageUsageBytes: 1024 * 1024 * 50, // mock 50 MB
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
}
