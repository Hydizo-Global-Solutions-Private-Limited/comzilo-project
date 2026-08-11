import { Request, Response, NextFunction } from 'express';
import { InventoryManagementService } from '../services/inventoryManagement.service';
import { success, created } from '../shared/responses';

const inventoryService = new InventoryManagementService();

export class StoreInventoryManagementController {
  public getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const stats = await inventoryService.getDashboardStats(tenantId);
      success(res, 'Inventory dashboard retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  };

  public getWarehouses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const warehouses = await inventoryService.getWarehouses(tenantId);
      success(res, 'Warehouses retrieved successfully', warehouses);
    } catch (error) {
      next(error);
    }
  };

  public createWarehouse = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const warehouse = await inventoryService.createWarehouse(tenantId, req.body);
      created(res, 'Warehouse created successfully', warehouse);
    } catch (error) {
      next(error);
    }
  };

  public getLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
      const locations = await inventoryService.getLocations(tenantId, warehouseId);
      success(res, 'Warehouse locations retrieved successfully', locations);
    } catch (error) {
      next(error);
    }
  };

  public createLocation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const location = await inventoryService.createLocation(tenantId, req.body);
      created(res, 'Warehouse location created successfully', location);
    } catch (error) {
      next(error);
    }
  };

  public getBalances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const balances = await inventoryService.getInventoryBalances(tenantId);
      success(res, 'Inventory balances retrieved successfully', balances);
    } catch (error) {
      next(error);
    }
  };

  public getTransfers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const transfers = await inventoryService.getTransfers(tenantId);
      success(res, 'Stock transfers retrieved successfully', transfers);
    } catch (error) {
      next(error);
    }
  };

  public createTransfer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const transfer = await inventoryService.createTransfer(tenantId, req.body);
      created(res, 'Stock transfer created successfully', transfer);
    } catch (error) {
      next(error);
    }
  };

  public getAdjustments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const adjustments = await inventoryService.getAdjustments(tenantId);
      success(res, 'Stock adjustments retrieved successfully', adjustments);
    } catch (error) {
      next(error);
    }
  };

  public createAdjustment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const adjustment = await inventoryService.createAdjustment(tenantId, req.body);
      created(res, 'Stock adjustment executed successfully', adjustment);
    } catch (error) {
      next(error);
    }
  };

  public getAdjustmentById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const id = Number(req.params.id);
      const adj = await inventoryService.getAdjustmentById(tenantId, id);
      success(res, 'Stock adjustment retrieved successfully', adj);
    } catch (error) {
      next(error);
    }
  };

  public updateAdjustment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const id = Number(req.params.id);
      const adj = await inventoryService.updateAdjustment(tenantId, id, req.body);
      success(res, 'Stock adjustment updated successfully', adj);
    } catch (error) {
      next(error);
    }
  };

  public deleteAdjustment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const id = Number(req.params.id);
      await inventoryService.deleteAdjustment(tenantId, id);
      success(res, 'Stock adjustment deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public getSuppliers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const suppliers = await inventoryService.getSuppliers(tenantId);
      success(res, 'Suppliers retrieved successfully', suppliers);
    } catch (error) {
      next(error);
    }
  };

  public createSupplier = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const supplier = await inventoryService.createSupplier(tenantId, req.body);
      created(res, 'Supplier created successfully', supplier);
    } catch (error) {
      next(error);
    }
  };

  public updateSupplier = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const id = Number(req.params.id);
      const supplier = await inventoryService.updateSupplier(tenantId, id, req.body);
      success(res, 'Supplier updated successfully', supplier);
    } catch (error) {
      next(error);
    }
  };

  public deleteSupplier = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const id = Number(req.params.id);
      await inventoryService.deleteSupplier(tenantId, id);
      success(res, 'Supplier deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public getPurchaseOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const pos = await inventoryService.getPurchaseOrders(tenantId);
      success(res, 'Purchase orders retrieved successfully', pos);
    } catch (error) {
      next(error);
    }
  };

  public createPurchaseOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const po = await inventoryService.createPurchaseOrder(tenantId, req.body);
      created(res, 'Purchase order created successfully', po);
    } catch (error) {
      next(error);
    }
  };

  public updatePurchaseOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const id = Number(req.params.id);
      const po = await inventoryService.updatePurchaseOrder(tenantId, id, req.body);
      success(res, 'Purchase order updated successfully', po);
    } catch (error) {
      next(error);
    }
  };

  public deletePurchaseOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const id = Number(req.params.id);
      await inventoryService.deletePurchaseOrder(tenantId, id);
      success(res, 'Purchase order deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public getGoodsReceipts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const grns = await inventoryService.getGoodsReceipts(tenantId);
      success(res, 'Goods receipts retrieved successfully', grns);
    } catch (error) {
      next(error);
    }
  };

  public createGoodsReceipt = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const grn = await inventoryService.createGoodsReceipt(tenantId, req.body);
      created(res, 'Goods Receipt Note (GRN) created successfully', grn);
    } catch (error) {
      next(error);
    }
  };

  public getGoodsIssues = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const gins = await inventoryService.getGoodsIssues(tenantId);
      success(res, 'Goods issues retrieved successfully', gins);
    } catch (error) {
      next(error);
    }
  };

  public createGoodsIssue = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const gin = await inventoryService.createGoodsIssue(tenantId, req.body);
      created(res, 'Goods Issue Note (GIN) created successfully', gin);
    } catch (error) {
      next(error);
    }
  };

  public getBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const batches = await inventoryService.getBatches(tenantId);
      success(res, 'Inventory batches retrieved successfully', batches);
    } catch (error) {
      next(error);
    }
  };

  public getSerials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const serials = await inventoryService.getSerials(tenantId);
      success(res, 'Inventory serial numbers retrieved successfully', serials);
    } catch (error) {
      next(error);
    }
  };
}
