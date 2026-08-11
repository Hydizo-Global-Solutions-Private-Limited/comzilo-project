import { Request, Response, NextFunction } from 'express';
import { CustomerPaymentService } from '../services/customerPayment.service';
import { success } from '../shared/responses';

export class CustomerPaymentController {
  private service = new CustomerPaymentService();

  public getPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customerId = Number(req.query.customerId || req.context?.tenantId || 1);
      const data = await this.service.getCustomerPayments(customerId);
      success(res, 'Customer payment history retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  };

  public getInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customerId = Number(req.query.customerId || req.context?.tenantId || 1);
      const data = await this.service.getCustomerInvoices(customerId);
      success(res, 'Customer invoices retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  };

  public getRefunds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customerId = Number(req.query.customerId || req.context?.tenantId || 1);
      const data = await this.service.getCustomerRefunds(customerId);
      success(res, 'Customer refund history retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  };

  public retryPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = Number(req.params.orderId);
      const data = await this.service.retryFailedPayment(orderId);
      success(res, 'Retry payment session initialized successfully', data);
    } catch (err) {
      next(err);
    }
  };

  public sendEmailReceipt = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = Number(req.params.orderId);
      const { email } = req.body;
      const data = await this.service.sendEmailReceipt(orderId, email);
      success(res, 'Receipt email dispatched successfully', data);
    } catch (err) {
      next(err);
    }
  };

  public sendWhatsAppReceipt = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = Number(req.params.orderId);
      const { phone } = req.body;
      const data = await this.service.sendWhatsAppReceipt(orderId, phone);
      success(res, 'WhatsApp receipt sent successfully', data);
    } catch (err) {
      next(err);
    }
  };
}
