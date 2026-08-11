/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, FindOptions, CreateOptions, UpdateOptions, DestroyOptions } from 'sequelize';

export abstract class BaseRepository<M extends Model<any, any>> {
  public constructor(public readonly model: any) {}

  public get dbModel(): any {
    return this.model;
  }

  /**
   * Applies the tenant isolation filter to query options
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected applyTenantFilter(tenantId: number | null, options: any = {}): any {
    if (tenantId === null) {
      return options;
    }
    const opts = { ...options };
    opts.where = {
      ...opts.where,
      tenantId: tenantId,
    };
    return opts;
  }

  public async findById(
    tenantId: number | null,
    id: string | number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options?: Omit<FindOptions<any>, 'where'>
  ): Promise<M | null> {
    const queryOptions = this.applyTenantFilter(tenantId, options);
    const pkAttribute = this.model.primaryKeyAttribute || 'id';
    queryOptions.where = {
      ...queryOptions.where,
      [pkAttribute]: id,
    };
    return this.model.findOne(queryOptions);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async findOne(tenantId: number | null, options: FindOptions<any>): Promise<M | null> {
    const queryOptions = this.applyTenantFilter(tenantId, options);
    return this.model.findOne(queryOptions);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async findMany(tenantId: number | null, options?: FindOptions<any>): Promise<M[]> {
    const queryOptions = this.applyTenantFilter(tenantId, options);
    return this.model.findAll(queryOptions);
  }

  public async findAndCountAll(
    tenantId: number | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options?: FindOptions<any>
  ): Promise<{ rows: M[]; count: number }> {
    const queryOptions = this.applyTenantFilter(tenantId, options);
    return this.model.findAndCountAll(queryOptions);
  }

  public async create(tenantId: number | null, data: unknown, options?: CreateOptions): Promise<M> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recordData = { ...(data as any) };
    if (tenantId !== null) {
      recordData.tenantId = tenantId;
    }
    return this.model.create(recordData, options);
  }

  public async update(
    tenantId: number | null,
    id: string | number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    options?: Omit<UpdateOptions, 'where'>
  ): Promise<[affectedCount: number]> {
    const pkAttribute = this.model.primaryKeyAttribute || 'id';
    const queryOptions = this.applyTenantFilter(tenantId, {
      ...options,
      where: { [pkAttribute]: id },
    });
    return this.model.update(data, queryOptions);
  }

  public async delete(
    tenantId: number | null,
    id: string | number,
    options?: Omit<DestroyOptions, 'where'>
  ): Promise<number> {
    const pkAttribute = this.model.primaryKeyAttribute || 'id';
    const queryOptions = this.applyTenantFilter(tenantId, {
      ...options,
      where: { [pkAttribute]: id },
    });
    return this.model.destroy(queryOptions);
  }

  public async destroy(tenantId: number | null, options?: DestroyOptions): Promise<number> {
    const queryOptions = this.applyTenantFilter(tenantId, options);
    return this.model.destroy(queryOptions);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async exists(tenantId: number | null, where: any): Promise<boolean> {
    const queryOptions = this.applyTenantFilter(tenantId, { where });
    const count = await this.model.count(queryOptions);
    return count > 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async count(tenantId: number | null, options?: FindOptions<any>): Promise<number> {
    const queryOptions = this.applyTenantFilter(tenantId, options);
    return this.model.count(queryOptions);
  }
}
