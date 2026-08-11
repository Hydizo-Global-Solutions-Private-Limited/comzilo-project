import { Plan } from '../database/models';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors/AppError';
import { Op } from 'sequelize';

export class PlanService {
  public async listPlans(): Promise<Plan[]> {
    return Plan.findAll({
      order: [
        ['sortOrder', 'ASC'],
        ['id', 'ASC'],
      ],
    });
  }

  public async getPlanById(id: number): Promise<Plan> {
    const plan = await Plan.findByPk(id);
    if (!plan) {
      throw new NotFoundError(`Subscription Plan with ID ${id} not found.`);
    }
    return plan;
  }

  public async createPlan(data: any): Promise<Plan> {
    // 1. Validations
    if (!data.name || !data.name.trim()) {
      throw new ValidationError('Plan name is required.');
    }
    if (
      data.priceMonthly === undefined ||
      data.priceMonthly === null ||
      Number(data.priceMonthly) < 0
    ) {
      throw new ValidationError('Monthly price must be a non-negative number.');
    }

    const existingName = await Plan.findOne({
      where: { name: data.name.trim() },
    });
    if (existingName) {
      throw new ConflictError(`A plan with the name '${data.name.trim()}' already exists.`);
    }

    const code =
      data.code ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    return Plan.create({
      code,
      name: data.name.trim(),
      description: data.description || null,
      priceMonthly: Number(data.priceMonthly),
      priceYearly:
        data.priceYearly !== undefined ? Number(data.priceYearly) : Number(data.priceMonthly) * 10,
      currency: data.currency || 'USD',
      trialDays: Number(data.trialDays || 0),
      storeLimit: Number(data.storeLimit || 1),
      userLimit: Number(data.userLimit || 5),
      warehouseLimit: Number(data.warehouseLimit || 1),
      features: Array.isArray(data.features)
        ? data.features
        : typeof data.features === 'string'
          ? JSON.parse(data.features)
          : [],
      sortOrder: Number(data.sortOrder || 0),
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    });
  }

  public async updatePlan(id: number, data: any): Promise<Plan> {
    const plan = await this.getPlanById(id);

    if (data.name && data.name.trim() !== plan.name) {
      const existing = await Plan.findOne({
        where: {
          name: data.name.trim(),
          id: { [Op.ne]: id },
        },
      });
      if (existing) {
        throw new ConflictError(`A plan with the name '${data.name.trim()}' already exists.`);
      }
      plan.name = data.name.trim();
    }

    if (data.priceMonthly !== undefined && data.priceMonthly !== null) {
      if (Number(data.priceMonthly) < 0) {
        throw new ValidationError('Monthly price must be a non-negative number.');
      }
      plan.priceMonthly = Number(data.priceMonthly);
    }

    if (data.priceYearly !== undefined && data.priceYearly !== null) {
      if (Number(data.priceYearly) < 0) {
        throw new ValidationError('Yearly price must be a non-negative number.');
      }
      plan.priceYearly = Number(data.priceYearly);
    }

    if (data.description !== undefined) plan.description = data.description;
    if (data.currency !== undefined) plan.currency = data.currency;
    if (data.trialDays !== undefined) plan.trialDays = Number(data.trialDays);
    if (data.storeLimit !== undefined) plan.storeLimit = Number(data.storeLimit);
    if (data.userLimit !== undefined) plan.userLimit = Number(data.userLimit);
    if (data.warehouseLimit !== undefined) plan.warehouseLimit = Number(data.warehouseLimit);
    if (data.features !== undefined) {
      plan.features = Array.isArray(data.features)
        ? data.features
        : typeof data.features === 'string'
          ? JSON.parse(data.features)
          : [];
    }
    if (data.sortOrder !== undefined) plan.sortOrder = Number(data.sortOrder);
    if (data.isActive !== undefined) plan.isActive = Boolean(data.isActive);

    await plan.save();
    return plan;
  }

  public async deletePlan(id: number): Promise<void> {
    const plan = await this.getPlanById(id);
    await plan.destroy();
  }
}
