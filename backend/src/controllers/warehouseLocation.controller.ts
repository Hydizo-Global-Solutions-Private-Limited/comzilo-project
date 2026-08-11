import { Request, Response, NextFunction } from 'express';
import { WarehouseLocationService } from '../services/warehouseLocation.service';
import { createAuditLog } from '../utils/auditHelper';
import { success, created } from '../shared/responses';
import { ValidationError } from '../shared/errors/AppError';
import { RESPONSE_MESSAGES } from '../shared/constants';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

export class WarehouseLocationController {
  private locationService: WarehouseLocationService;

  constructor() {
    this.locationService = new WarehouseLocationService();
  }

  private async getStoreId(req: Request): Promise<number> {
    const rawStoreId =
      req.headers['x-store-id'] || req.query.storeId || req.body.storeId || req.context?.storeId;
    if (rawStoreId) {
      const parsed = Number(rawStoreId);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    const tenantId = req.context?.tenantId;
    if (tenantId) {
      const [store]: any = await sequelize.query(
        'SELECT id FROM stores WHERE tenant_id = :tenantId ORDER BY id ASC LIMIT 1',
        { replacements: { tenantId }, type: QueryTypes.SELECT }
      );
      if (store && store.id) {
        return Number(store.id);
      }
    }

    throw new ValidationError('Store context is missing');
  }

  public createLocation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = await this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const warehouseId = parseInt(req.params.warehouseId, 10);

      const location = await this.locationService.createLocation(
        tenantId,
        storeId,
        warehouseId,
        userId,
        req.body
      );

      await createAuditLog(
        {
          tenantId,
          action: 'WAREHOUSE_LOCATION_CREATED',
          entityType: 'warehouse_location',
          entityId: String(location.id),
          newValues: location.toJSON(),
        },
        req.context
      );

      created(res, 'Warehouse location created successfully', location);
    } catch (error) {
      next(error);
    }
  };

  public getLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = await this.getStoreId(req);
      const id = parseInt(req.params.id, 10);

      const location = await this.locationService.getLocation(tenantId, storeId, id);

      success(res, RESPONSE_MESSAGES.SUCCESS, location);
    } catch (error) {
      next(error);
    }
  };

  public listLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = await this.getStoreId(req);
      const warehouseId = parseInt(req.params.warehouseId, 10);

      const locations = await this.locationService.listLocations(
        tenantId,
        storeId,
        warehouseId,
        req.query
      );

      success(res, RESPONSE_MESSAGES.SUCCESS, locations);
    } catch (error) {
      next(error);
    }
  };

  public updateLocation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = await this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const id = parseInt(req.params.id, 10);

      const oldLoc = await this.locationService.getLocation(tenantId, storeId, id);
      const location = await this.locationService.updateLocation(
        tenantId,
        storeId,
        id,
        userId,
        req.body
      );

      await createAuditLog(
        {
          tenantId,
          action: 'WAREHOUSE_LOCATION_UPDATED',
          entityType: 'warehouse_location',
          entityId: String(location.id),
          previousValues: oldLoc.toJSON(),
          newValues: location.toJSON(),
        },
        req.context
      );

      success(res, 'Warehouse location updated successfully', location);
    } catch (error) {
      next(error);
    }
  };

  public setDefaultLocation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = await this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const id = parseInt(req.params.id, 10);

      const oldLoc = await this.locationService.getLocation(tenantId, storeId, id);
      const location = await this.locationService.setDefaultLocation(tenantId, storeId, id, userId);

      await createAuditLog(
        {
          tenantId,
          action: 'WAREHOUSE_LOCATION_DEFAULT_CHANGED',
          entityType: 'warehouse_location',
          entityId: String(location.id),
          previousValues: oldLoc.toJSON(),
          newValues: location.toJSON(),
        },
        req.context
      );

      success(res, 'Default location updated successfully', location);
    } catch (error) {
      next(error);
    }
  };

  public deleteLocation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = await this.getStoreId(req);
      const id = parseInt(req.params.id, 10);

      const oldLoc = await this.locationService.getLocation(tenantId, storeId, id);
      await this.locationService.deleteLocation(tenantId, storeId, id);

      await createAuditLog(
        {
          tenantId,
          action: 'WAREHOUSE_LOCATION_DELETED',
          entityType: 'warehouse_location',
          entityId: String(id),
          previousValues: oldLoc.toJSON(),
        },
        req.context
      );

      success(res, 'Warehouse location deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public restoreLocation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = await this.getStoreId(req);
      const id = parseInt(req.params.id, 10);

      const location = await this.locationService.restoreLocation(tenantId, storeId, id);

      await createAuditLog(
        {
          tenantId,
          action: 'WAREHOUSE_LOCATION_RESTORED',
          entityType: 'warehouse_location',
          entityId: String(id),
          newValues: location.toJSON(),
        },
        req.context
      );

      success(res, 'Warehouse location restored successfully', location);
    } catch (error) {
      next(error);
    }
  };
}
