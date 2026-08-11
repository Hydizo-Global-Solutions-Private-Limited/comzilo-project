import { Request, Response, NextFunction } from 'express';
import { InvoiceService } from '../services/invoice.service';
import { success, created } from '../shared/responses';
import { ValidationError } from '../shared/errors/AppError';

export class InvoiceController {
  private invoiceService = new InvoiceService();

  private getStoreId(req: Request): number {
    const storeId = Number(
      req.headers['x-store-id'] || req.query.storeId || req.body.storeId || req.context?.storeId
    );
    if (storeId && !isNaN(storeId)) {
      return storeId;
    }
    return req.context?.storeId || 1;
  }

  public createInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const invoice = await this.invoiceService.createInvoice(
        tenantId,
        storeId,
        userId,
        req.body,
        ip,
        userAgent
      );
      created(res, 'Invoice created successfully', invoice);
    } catch (error) {
      next(error);
    }
  };

  public getInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);

      const invoice = await this.invoiceService.getInvoice(tenantId, storeId, id);
      success(res, 'Invoice retrieved successfully', invoice);
    } catch (error) {
      next(error);
    }
  };

  public listInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);

      const result = await this.invoiceService.listInvoices(tenantId, storeId, req.query);
      success(res, 'Invoices listed successfully', result);
    } catch (error) {
      next(error);
    }
  };

  public updateInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const invoice = await this.invoiceService.updateInvoice(
        tenantId,
        storeId,
        id,
        userId,
        req.body,
        ip,
        userAgent
      );
      success(res, 'Invoice updated successfully', invoice);
    } catch (error) {
      next(error);
    }
  };
}
