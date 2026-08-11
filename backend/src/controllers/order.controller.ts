import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { success, created } from '../shared/responses';
import { ValidationError } from '../shared/errors/AppError';

export class OrderController {
  private orderService = new OrderService();

  private getStoreId(req: Request): number {
    const storeId = Number(
      req.headers['x-store-id'] || req.query.storeId || req.body.storeId || req.context?.storeId
    );
    if (storeId && !isNaN(storeId)) {
      return storeId;
    }
    return 1;
  }

  public createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const order = await this.orderService.createOrder(
        tenantId,
        storeId,
        userId,
        req.body,
        ip,
        userAgent
      );
      created(res, 'Order created successfully', order);
    } catch (error) {
      next(error);
    }
  };

  public getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);

      const order = await this.orderService.getOrder(tenantId, storeId, id);
      success(res, 'Order retrieved successfully', order);
    } catch (error) {
      next(error);
    }
  };

  public listOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);

      const result = await this.orderService.listOrders(tenantId, storeId, req.query);
      success(res, 'Orders listed successfully', result);
    } catch (error) {
      next(error);
    }
  };

  public updateOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const order = await this.orderService.updateOrder(
        tenantId,
        storeId,
        id,
        userId,
        req.body,
        ip,
        userAgent
      );
      success(res, 'Order updated successfully', order);
    } catch (error) {
      next(error);
    }
  };

  public confirmOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const order = await this.orderService.confirmOrder(
        tenantId,
        storeId,
        id,
        userId,
        ip,
        userAgent
      );
      success(res, 'Order confirmed successfully', order);
    } catch (error) {
      next(error);
    }
  };

  public cancelOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const order = await this.orderService.cancelOrder(
        tenantId,
        storeId,
        id,
        userId,
        ip,
        userAgent
      );
      success(res, 'Order cancelled successfully', order);
    } catch (error) {
      next(error);
    }
  };

  public completeOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const order = await this.orderService.completeOrder(
        tenantId,
        storeId,
        id,
        userId,
        ip,
        userAgent
      );
      success(res, 'Order completed successfully', order);
    } catch (error) {
      next(error);
    }
  };

  public restoreOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const order = await this.orderService.restoreOrder(
        tenantId,
        storeId,
        id,
        userId,
        ip,
        userAgent
      );
      success(res, 'Order restored successfully', order);
    } catch (error) {
      next(error);
    }
  };

  public deleteOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      await this.orderService.deleteOrder(tenantId, storeId, id, userId, ip, userAgent);
      success(res, 'Order deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}
