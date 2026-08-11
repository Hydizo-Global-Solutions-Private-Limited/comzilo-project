/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseRepository } from '../core/BaseRepository';
import { Customer } from '../database/models/customer';
import { Op } from 'sequelize';

export class CustomerRepository extends BaseRepository<Customer> {
  constructor() {
    super(Customer);
  }

  private applyStoreScope(
    tenantId?: number | null,
    storeId?: number | null,
    options: any = {}
  ): any {
    const opts = { ...options };
    const whereScope: any = { ...opts.where };
    if (tenantId) {
      whereScope.tenantId = tenantId;
    }
    if (storeId) {
      whereScope.storeId = storeId;
    }
    opts.where = whereScope;
    return opts;
  }

  public async findScopedById(
    tenantId: number,
    storeId: number,
    id: number,
    options: any = {}
  ): Promise<Customer | null> {
    return this.model.findOne(
      this.applyStoreScope(tenantId, storeId, { ...options, where: { ...options.where, id } })
    );
  }

  public async findScopedOne(
    tenantId: number,
    storeId: number,
    options: any = {}
  ): Promise<Customer | null> {
    return this.model.findOne(this.applyStoreScope(tenantId, storeId, options));
  }

  public async findScopedMany(
    tenantId: number,
    storeId: number,
    options: any = {}
  ): Promise<Customer[]> {
    return this.model.findAll(this.applyStoreScope(tenantId, storeId, options));
  }

  public async findAndCountAllScoped(
    tenantId: number,
    storeId: number,
    options: any = {}
  ): Promise<{ rows: Customer[]; count: number }> {
    return this.model.findAndCountAll(this.applyStoreScope(tenantId, storeId, options));
  }

  public async createScoped(
    tenantId: number,
    storeId: number,
    data: any,
    options: any = {}
  ): Promise<Customer> {
    return this.model.create(
      {
        ...data,
        tenantId,
        storeId,
        tenant_id: tenantId,
        store_id: storeId,
      },
      options
    );
  }

  public async updateScoped(
    tenantId: number,
    storeId: number,
    id: number,
    data: any,
    options: any = {}
  ): Promise<number> {
    const [affected] = await this.model.update(
      data,
      this.applyStoreScope(tenantId, storeId, { ...options, where: { ...options.where, id } })
    );
    return affected;
  }

  public async deleteScoped(
    tenantId: number,
    storeId: number,
    id: number,
    options: any = {}
  ): Promise<number> {
    return this.model.destroy(
      this.applyStoreScope(tenantId, storeId, { ...options, where: { ...options.where, id } })
    );
  }

  public async restoreScoped(
    tenantId: number,
    storeId: number,
    id: number,
    options: any = {}
  ): Promise<Customer | null> {
    const record = await this.model.findOne(
      this.applyStoreScope(tenantId, storeId, {
        ...options,
        where: { ...options.where, id },
        paranoid: false,
      })
    );
    if (record) {
      await record.restore(options);
      return record;
    }
    return null;
  }
}
