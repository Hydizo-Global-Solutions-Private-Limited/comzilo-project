/* eslint-disable @typescript-eslint/no-explicit-any */
import { CustomerRepository } from '../repositories/customer.repository';
import { CustomerPreferenceRepository } from '../repositories/customerPreference.repository';
import { CustomerAddressRepository } from '../repositories/customerAddress.repository';
import {
  Customer,
  CustomerPreference,
  CustomerAddress,
  CustomerTag,
  Tenant,
  Store,
} from '../database/models';
import { BaseService } from '../core/BaseService';
import { sequelize } from '../config/database';
import { ConflictError, NotFoundError } from '../shared/errors/AppError';
import { createAuditLog } from '../utils/auditHelper';
import { createActivityLog } from '../utils/activityHelper';
import { Op } from 'sequelize';

export class CustomerService extends BaseService {
  private customerRepo = new CustomerRepository();
  private preferenceRepo = new CustomerPreferenceRepository();
  private addressRepo = new CustomerAddressRepository();

  constructor() {
    super('CustomerService');
  }

  private async generateCustomerCode(tenantId: number, storeId: number): Promise<string> {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    let isUnique = false;

    while (!isUnique) {
      let result = 'CUST-';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.customerRepo.findScopedOne(tenantId, storeId, {
        where: { customerCode: result },
        paranoid: false,
      });
      if (!existing) {
        code = result;
        isUnique = true;
      }
    }
    return code;
  }

  public async createCustomer(
    tenantId: number,
    storeId: number,
    userId: number,
    data: any,
    ip?: string,
    userAgent?: string
  ): Promise<Customer> {
    const existingEmail = await this.customerRepo.findOne(tenantId, {
      where: { email: data.email },
      paranoid: false,
    });
    if (existingEmail) {
      throw new ConflictError(`A customer with email '${data.email}' already exists.`);
    }

    const existingPhone = await this.customerRepo.findOne(tenantId, {
      where: { phone: data.phone },
      paranoid: false,
    });
    if (existingPhone) {
      throw new ConflictError(`A customer with phone '${data.phone}' already exists.`);
    }

    const customerCode = data.customerCode || (await this.generateCustomerCode(tenantId, storeId));
    const fullName = `${data.firstName} ${data.lastName}`.trim();

    const customer = await sequelize.transaction(async (t) => {
      const newCustomer = await this.customerRepo.createScoped(
        tenantId,
        storeId,
        {
          ...data,
          customerCode,
          fullName,
          createdBy: userId,
          updatedBy: userId,
        },
        { transaction: t }
      );

      await this.preferenceRepo.createScoped(
        tenantId,
        storeId,
        {
          customerId: newCustomer.id,
          emailNotifications: true,
          smsNotifications: true,
          whatsappNotifications: true,
          marketingEmails: false,
          marketingSms: false,
          preferredLanguage: data.preferredLanguage || 'en',
          preferredCurrency: data.preferredCurrency || 'USD',
          preferredTimezone: 'UTC',
        },
        { transaction: t }
      );

      return newCustomer;
    });

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'CUSTOMER_CREATED',
        entityType: 'Customer',
        entityId: String(customer.id),
        previousValues: null,
        newValues: customer.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'CUSTOMER_CREATED',
        description: `Created customer with ID ${customer.id}`,
      },
      { ipAddress: ip } as any
    );

    return this.getCustomer(tenantId, storeId, customer.id);
  }

  public async getCustomer(tenantId: number, storeId: number, id: number): Promise<Customer> {
    const customer = await this.customerRepo.findScopedById(tenantId, storeId, id, {
      include: [
        { model: CustomerPreference, as: 'preference' },
        { model: CustomerAddress, as: 'addresses' },
        { model: CustomerTag, as: 'tags', through: { attributes: [] } },
      ],
    });
    if (!customer) {
      throw new NotFoundError(`Customer with ID ${id} not found.`);
    }
    return customer;
  }

  public async listCustomers(
    tenantId: number,
    storeId: number,
    query: any
  ): Promise<{ rows: Customer[]; count: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      status,
      customerType,
      email,
      phone,
      customerCode,
      companyName,
    } = query;

    const offset = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (status) where.status = status;
    if (customerType) where.customerType = customerType;
    if (email) where.email = email;
    if (phone) where.phone = phone;
    if (customerCode) where.customerCode = customerCode;
    if (companyName) where.companyName = { [Op.like]: `%${companyName}%` };

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { customerCode: { [Op.like]: `%${search}%` } },
        { companyName: { [Op.like]: `%${search}%` } },
      ];
    }

    const sortWhitelist = [
      'createdAt',
      'firstName',
      'lastName',
      'fullName',
      'email',
      'customerCode',
    ];
    const orderField = sortWhitelist.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    where.tenantId = tenantId;
    if (storeId && storeId !== 1) {
      where.storeId = storeId;
    }

    return Customer.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [[orderField, orderDirection]],
      include: [
        { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'slug'] },
        { model: Store, as: 'store', attributes: ['id', 'name', 'slug'] },
        { model: CustomerPreference, as: 'preference' },
        { model: CustomerTag, as: 'tags', through: { attributes: [] } },
      ],
    });
  }

  public async updateCustomer(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    data: any,
    ip?: string,
    userAgent?: string
  ): Promise<Customer> {
    const customer = await this.getCustomer(tenantId, storeId, id);
    const oldValues = customer.toJSON();

    if (data.email && data.email !== customer.email) {
      const existingEmail = await this.customerRepo.findOne(tenantId, {
        where: { email: data.email, id: { [Op.ne]: id } },
        paranoid: false,
      });
      if (existingEmail) {
        throw new ConflictError(`A customer with email '${data.email}' already exists.`);
      }
    }

    if (data.phone && data.phone !== customer.phone) {
      const existingPhone = await this.customerRepo.findOne(tenantId, {
        where: { phone: data.phone, id: { [Op.ne]: id } },
        paranoid: false,
      });
      if (existingPhone) {
        throw new ConflictError(`A customer with phone '${data.phone}' already exists.`);
      }
    }

    const fullName =
      data.firstName || data.lastName
        ? `${data.firstName ?? customer.firstName} ${data.lastName ?? customer.lastName}`.trim()
        : customer.fullName;

    await sequelize.transaction(async (t) => {
      await this.customerRepo.updateScoped(
        tenantId,
        storeId,
        id,
        {
          ...data,
          fullName,
          updatedBy: userId,
        },
        { transaction: t }
      );
    });

    const updated = await this.getCustomer(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'CUSTOMER_UPDATED',
        entityType: 'Customer',
        entityId: String(id),
        previousValues: oldValues,
        newValues: updated.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'CUSTOMER_UPDATED',
        description: `Updated customer with ID ${id}`,
      },
      { ipAddress: ip } as any
    );

    return updated;
  }

  public async blockCustomer(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<Customer> {
    const customer = await this.getCustomer(tenantId, storeId, id);
    if (customer.status === 'blocked') {
      return customer;
    }
    const oldValues = customer.toJSON();

    await this.customerRepo.updateScoped(tenantId, storeId, id, {
      status: 'blocked',
      updatedBy: userId,
    });
    const updated = await this.getCustomer(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'CUSTOMER_BLOCKED',
        entityType: 'Customer',
        entityId: String(id),
        previousValues: oldValues,
        newValues: updated.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'CUSTOMER_BLOCKED',
        description: `Blocked customer with ID ${id}`,
      },
      { ipAddress: ip } as any
    );

    return updated;
  }

  public async unblockCustomer(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<Customer> {
    const customer = await this.getCustomer(tenantId, storeId, id);
    if (customer.status !== 'blocked') {
      return customer;
    }
    const oldValues = customer.toJSON();

    await this.customerRepo.updateScoped(tenantId, storeId, id, {
      status: 'active',
      updatedBy: userId,
    });
    const updated = await this.getCustomer(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'CUSTOMER_UNBLOCKED',
        entityType: 'Customer',
        entityId: String(id),
        previousValues: oldValues,
        newValues: updated.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'CUSTOMER_UNBLOCKED',
        description: `Unblocked customer with ID ${id}`,
      },
      { ipAddress: ip } as any
    );

    return updated;
  }

  public async deactivateCustomer(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<Customer> {
    const customer = await this.getCustomer(tenantId, storeId, id);
    if (customer.status === 'inactive') {
      return customer;
    }
    const oldValues = customer.toJSON();

    await this.customerRepo.updateScoped(tenantId, storeId, id, {
      status: 'inactive',
      updatedBy: userId,
    });
    const updated = await this.getCustomer(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'CUSTOMER_DEACTIVATED',
        entityType: 'Customer',
        entityId: String(id),
        previousValues: oldValues,
        newValues: updated.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'CUSTOMER_DEACTIVATED',
        description: `Deactivated customer with ID ${id}`,
      },
      { ipAddress: ip } as any
    );

    return updated;
  }

  public async activateCustomer(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<Customer> {
    const customer = await this.getCustomer(tenantId, storeId, id);
    if (customer.status === 'active') {
      return customer;
    }
    const oldValues = customer.toJSON();

    await this.customerRepo.updateScoped(tenantId, storeId, id, {
      status: 'active',
      updatedBy: userId,
    });
    const updated = await this.getCustomer(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'CUSTOMER_ACTIVATED',
        entityType: 'Customer',
        entityId: String(id),
        previousValues: oldValues,
        newValues: updated.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'CUSTOMER_ACTIVATED',
        description: `Activated customer with ID ${id}`,
      },
      { ipAddress: ip } as any
    );

    return updated;
  }

  public async deleteCustomer(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const customer = await this.getCustomer(tenantId, storeId, id);

    await sequelize.transaction(async (t) => {
      await this.addressRepo.dbModel.destroy({
        where: { customer_id: id, tenant_id: tenantId, store_id: storeId },
        transaction: t,
      });

      await this.customerRepo.deleteScoped(tenantId, storeId, id, { transaction: t });
    });

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'CUSTOMER_DELETED',
        entityType: 'Customer',
        entityId: String(id),
        previousValues: customer.toJSON(),
        newValues: null,
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'CUSTOMER_DELETED',
        description: `Deleted customer with ID ${id}`,
      },
      { ipAddress: ip } as any
    );
  }

  public async restoreCustomer(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<Customer> {
    const customer = await sequelize.transaction(async (t) => {
      const restored = await this.customerRepo.restoreScoped(tenantId, storeId, id, {
        transaction: t,
      });
      if (!restored) {
        throw new NotFoundError(`Customer with ID ${id} not found or not deleted.`);
      }
      return restored;
    });

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'CUSTOMER_RESTORED',
        entityType: 'Customer',
        entityId: String(id),
        previousValues: null,
        newValues: customer.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'CUSTOMER_RESTORED',
        description: `Restored customer with ID ${id}`,
      },
      { ipAddress: ip } as any
    );

    return this.getCustomer(tenantId, storeId, id);
  }
}
