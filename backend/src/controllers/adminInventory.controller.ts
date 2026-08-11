import { Request, Response, NextFunction } from 'express';
import { InventoryManagementService } from '../services/inventoryManagement.service';
import { Warehouse } from '../database/models';
import { success } from '../shared/responses';

const inventoryService = new InventoryManagementService();

export class AdminInventoryController {
  public getAnalytics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await inventoryService.getGlobalDashboardStats();
      success(res, 'Global inventory analytics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  };

  public getWarehouseMonitoring = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const warehouses = await Warehouse.findAll({ order: [['id', 'ASC']] });
      success(res, 'Warehouse monitoring data retrieved successfully', warehouses);
    } catch (error) {
      next(error);
    }
  };

  public getPurchaseOrders = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const pos = await inventoryService.getGlobalPurchaseOrders();
      success(res, 'Global purchase orders retrieved successfully', pos);
    } catch (error) {
      next(error);
    }
  };

  public updatePurchaseOrderStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await inventoryService.updateGlobalPurchaseOrderStatus(Number(id), status);
      success(res, `Purchase order status updated to ${status}`, updated);
    } catch (error) {
      next(error);
    }
  };
}
