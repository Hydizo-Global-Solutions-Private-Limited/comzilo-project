import { Request, Response, NextFunction } from 'express';
import { StoreService } from '../services/store.service';
import { success, created } from '../shared/responses';
import { createAuditLog } from '../utils/auditHelper';
import { ValidationError } from '../shared/errors/AppError';

export class StoreController {
  private storeService = new StoreService();

  public createStore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId;
      if (!tenantId) {
        throw new ValidationError('Tenant context is missing');
      }

      const store = await this.storeService.createStore(tenantId, req.body);

      await createAuditLog(
        {
          tenantId,
          action: 'store.create',
          entityType: 'store',
          entityId: String(store.id),
          newValues: store.toJSON(),
        },
        req.context
      );

      created(res, 'Store created successfully', store);
    } catch (error) {
      next(error);
    }
  };

  public getStore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId;
      if (!tenantId) {
        throw new ValidationError('Tenant context is missing');
      }
      const { id } = req.params;
      const store = await this.storeService.getStore(tenantId, Number(id));
      success(res, 'Store retrieved successfully', store);
    } catch (error) {
      next(error);
    }
  };

  public listStores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userRole = req.context?.userRole || req.user?.role;
      const isSuperAdmin =
        userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || req.query.all === 'true';

      const tenantId = isSuperAdmin ? null : req.context?.tenantId;
      const stores = await this.storeService.listStores(tenantId);
      success(res, 'Stores retrieved successfully', stores);
    } catch (error) {
      next(error);
    }
  };

  public updateStore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId;
      if (!tenantId) {
        throw new ValidationError('Tenant context is missing');
      }
      const { id } = req.params;
      const original = await this.storeService.getStore(tenantId, Number(id));
      const store = await this.storeService.updateStore(tenantId, Number(id), req.body);

      await createAuditLog(
        {
          tenantId,
          action: 'store.update',
          entityType: 'store',
          entityId: String(store.id),
          previousValues: original.toJSON(),
          newValues: store.toJSON(),
        },
        req.context
      );

      success(res, 'Store updated successfully', store);
    } catch (error) {
      next(error);
    }
  };

  public deleteStore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId;
      if (!tenantId) {
        throw new ValidationError('Tenant context is missing');
      }
      const { id } = req.params;
      const original = await this.storeService.getStore(tenantId, Number(id));
      await this.storeService.deleteStore(tenantId, Number(id));

      await createAuditLog(
        {
          tenantId,
          action: 'store.delete',
          entityType: 'store',
          entityId: String(original.id),
          previousValues: original.toJSON(),
        },
        req.context
      );

      success(res, 'Store deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public restoreStore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId;
      if (!tenantId) {
        throw new ValidationError('Tenant context is missing');
      }
      const { id } = req.params;
      const store = await this.storeService.restoreStore(tenantId, Number(id));

      await createAuditLog(
        {
          tenantId,
          action: 'store.restore',
          entityType: 'store',
          entityId: String(store.id),
          newValues: store.toJSON(),
        },
        req.context
      );

      success(res, 'Store restored successfully', store);
    } catch (error) {
      next(error);
    }
  };

  // Settings
  public getSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId;
      if (!tenantId) {
        throw new ValidationError('Tenant context is missing');
      }
      const { id } = req.params;
      const settings = await this.storeService.getSettings(tenantId, Number(id));
      success(res, 'Store settings retrieved successfully', settings);
    } catch (error) {
      next(error);
    }
  };

  public updateSettings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId;
      if (!tenantId) {
        throw new ValidationError('Tenant context is missing');
      }
      const { id } = req.params;
      const original = await this.storeService.getSettings(tenantId, Number(id));
      await this.storeService.updateSettings(tenantId, Number(id), req.body);

      await createAuditLog(
        {
          tenantId,
          action: 'store.settings.update',
          entityType: 'store_settings',
          entityId: id,
          previousValues: original,
          newValues: req.body,
        },
        req.context
      );

      success(res, 'Store settings updated successfully');
    } catch (error) {
      next(error);
    }
  };

  // Custom Domains
  public addDomain = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId;
      if (!tenantId) {
        throw new ValidationError('Tenant context is missing');
      }
      const { id } = req.params;
      const { domain, domainType } = req.body;
      const record = await this.storeService.addDomain(tenantId, Number(id), domain, domainType);

      await createAuditLog(
        {
          tenantId,
          action: 'store.domain.create',
          entityType: 'store_domain',
          entityId: String(record.id),
          newValues: record.toJSON(),
        },
        req.context
      );

      created(res, 'Domain registered successfully', record);
    } catch (error) {
      next(error);
    }
  };

  public removeDomain = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId;
      if (!tenantId) {
        throw new ValidationError('Tenant context is missing');
      }
      const { id } = req.params;
      const { domain } = req.body;
      await this.storeService.removeDomain(tenantId, Number(id), domain);

      await createAuditLog(
        {
          tenantId,
          action: 'store.domain.delete',
          entityType: 'store_domain',
          entityId: domain,
        },
        req.context
      );

      success(res, 'Domain deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public verifyDomain = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId;
      if (!tenantId) {
        throw new ValidationError('Tenant context is missing');
      }
      const { id } = req.params;
      const { domain } = req.body;
      const record = await this.storeService.verifyDomain(tenantId, Number(id), domain);

      await createAuditLog(
        {
          tenantId,
          action: 'store.domain.verify',
          entityType: 'store_domain',
          entityId: String(record.id),
          newValues: record.toJSON(),
        },
        req.context
      );

      success(res, 'Domain verified successfully', record);
    } catch (error) {
      next(error);
    }
  };

  public setPrimaryDomain = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId;
      if (!tenantId) {
        throw new ValidationError('Tenant context is missing');
      }
      const { id } = req.params;
      const { domain } = req.body;
      const record = await this.storeService.setPrimaryDomain(tenantId, Number(id), domain);

      await createAuditLog(
        {
          tenantId,
          action: 'store.domain.primary',
          entityType: 'store_domain',
          entityId: String(record.id),
          newValues: record.toJSON(),
        },
        req.context
      );

      success(res, 'Domain set as primary successfully', record);
    } catch (error) {
      next(error);
    }
  };
}
