import { Request, Response, NextFunction } from 'express';
import { SellerSubscriptionService } from '../services/sellerSubscription.service';
import { success } from '../shared/responses';
import { ValidationError } from '../shared/errors/AppError';

export class SellerSubscriptionController {
  private readonly service = new SellerSubscriptionService();

  public getCurrentSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const data = await this.service.getCurrentSubscription(tenantId);
      success(res, 'Current subscription and usage metrics retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  public createCheckoutSession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const { planId, billingCycle } = req.body;
      if (!planId) {
        throw new ValidationError('planId is required');
      }
      const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
      const checkoutData = await this.service.createCheckoutSession(tenantId, planId, cycle);
      success(res, 'Subscription checkout session initiated successfully', checkoutData);
    } catch (error) {
      next(error);
    }
  };

  public verifyAndActivateSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const result = await this.service.verifyAndActivateSubscription(tenantId, req.body);
      success(res, 'Subscription activated successfully', result);
    } catch (error) {
      next(error);
    }
  };

  public getInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const invoices = await this.service.getTenantInvoices(tenantId);
      success(res, 'Invoices retrieved successfully', invoices);
    } catch (error) {
      next(error);
    }
  };

  public getSaaSReports = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const reports = await this.service.getSaaSReports();
      success(res, 'SaaS subscription reports retrieved successfully', reports);
    } catch (error) {
      next(error);
    }
  };
}
