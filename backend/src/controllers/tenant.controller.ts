import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenant.service';
import { success, created } from '../shared/responses';
import { createAuditLog } from '../utils/auditHelper';

export class TenantController {
  private tenantService = new TenantService();

  public createTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenant = await this.tenantService.createTenant(req.body);

      await createAuditLog(
        {
          tenantId: tenant.id,
          action: 'tenant.create',
          entityType: 'tenant',
          entityId: String(tenant.id),
          newValues: tenant.toJSON(),
        },
        req.context
      );

      created(res, 'Tenant created successfully', tenant);
    } catch (error) {
      next(error);
    }
  };

  public getTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const tenant = await this.tenantService.getTenantByIdOrUuid(id);
      success(res, 'Tenant retrieved successfully', tenant);
    } catch (error) {
      next(error);
    }
  };

  public listTenants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenants = await this.tenantService.listTenants(req.query);
      success(res, 'Tenants retrieved successfully', tenants);
    } catch (error) {
      next(error);
    }
  };

  public updateTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const original = await this.tenantService.getTenantByIdOrUuid(id);
      const tenant = await this.tenantService.updateTenant(id, req.body);

      await createAuditLog(
        {
          tenantId: tenant.id,
          action: 'tenant.update',
          entityType: 'tenant',
          entityId: String(tenant.id),
          previousValues: original.toJSON(),
          newValues: tenant.toJSON(),
        },
        req.context
      );

      success(res, 'Tenant updated successfully', tenant);
    } catch (error) {
      next(error);
    }
  };

  public deleteTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const original = await this.tenantService.getTenantByIdOrUuid(id);
      await this.tenantService.deleteTenant(id);

      await createAuditLog(
        {
          tenantId: original.id,
          action: 'tenant.delete',
          entityType: 'tenant',
          entityId: String(original.id),
          previousValues: original.toJSON(),
        },
        req.context
      );

      success(res, 'Tenant deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public restoreTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const tenant = await this.tenantService.restoreTenant(id);

      await createAuditLog(
        {
          tenantId: tenant.id,
          action: 'tenant.restore',
          entityType: 'tenant',
          entityId: String(tenant.id),
          newValues: tenant.toJSON(),
        },
        req.context
      );

      success(res, 'Tenant restored successfully', tenant);
    } catch (error) {
      next(error);
    }
  };

  public assignPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      // Get tenant to have numeric ID
      const tenant = await this.tenantService.getTenantByIdOrUuid(id);
      const subscription = await this.tenantService.assignPlan(tenant.id, req.body);

      await createAuditLog(
        {
          tenantId: tenant.id,
          action: 'tenant.subscription.update',
          entityType: 'subscription',
          entityId: String(subscription.id),
          newValues: subscription.toJSON(),
        },
        req.context
      );

      success(res, 'Subscription updated successfully', subscription);
    } catch (error) {
      next(error);
    }
  };

  public getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const tenant = await this.tenantService.getTenantByIdOrUuid(id);
      const stats = await this.tenantService.getStatistics(tenant.id);
      success(res, 'Tenant statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  };
}
