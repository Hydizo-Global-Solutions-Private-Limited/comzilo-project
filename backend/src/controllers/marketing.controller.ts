/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { MarketingService } from '../services/marketing.service';
import { success } from '../shared/responses';

export class MarketingController {
  private service = new MarketingService();

  // Dashboard Stats
  public getDashboardStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const stats = await this.service.getMarketingDashboardStats(tenantId);
      success(res, 'Marketing Dashboard stats retrieved successfully', stats);
    } catch (err) {
      next(err);
    }
  };

  // Email Providers
  public getEmailProviders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const providers = await this.service.getEmailProviders(tenantId);
      success(res, 'Email providers retrieved successfully', providers);
    } catch (err) {
      next(err);
    }
  };

  public saveEmailProvider = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const result = await this.service.saveEmailProvider(tenantId, req.body);
      success(res, 'Email provider saved successfully', result);
    } catch (err) {
      next(err);
    }
  };

  public testSmtpConnection = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      await this.service.testSmtpConnection(tenantId, req.body);
      success(res, 'SMTP Connection verified successfully');
    } catch (err) {
      next(err);
    }
  };

  public sendTestEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const { recipientEmail, config } = req.body;
      const result = await this.service.sendTestEmail(tenantId, recipientEmail, config);
      success(res, 'Test email sent successfully', result);
    } catch (err) {
      next(err);
    }
  };

  public generateAiEmailContent = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.generateAiEmailContent(req.body);
      success(res, 'AI Email template generated successfully', result);
    } catch (err) {
      next(err);
    }
  };

  public getEmailLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const logs = await this.service.getEmailLogs(tenantId);
      success(res, 'Email logs retrieved successfully', logs);
    } catch (err) {
      next(err);
    }
  };

  public getEmailQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const isSuperAdmin = req.context?.userRole?.toUpperCase() === 'SUPER_ADMIN';
      const tenantId = isSuperAdmin ? null : req.context?.tenantId || 1;
      const queue = await this.service.getEmailQueue(tenantId);
      success(res, 'Email queue retrieved successfully', queue);
    } catch (err) {
      next(err);
    }
  };

  public enqueueCartAbandonment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const { recipient, payload, delayMinutes, cartToken } = req.body;
      const jobId = await this.service.enqueueCartAbandonment(
        tenantId,
        recipient,
        payload,
        delayMinutes,
        cartToken
      );
      success(res, 'Cart abandonment email queued successfully', { jobId });
    } catch (err) {
      next(err);
    }
  };

  public processQueueNow = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.processQueueNow();
      success(res, 'Email queue processed successfully', result);
    } catch (err) {
      next(err);
    }
  };

  // Email Templates
  public getEmailTemplates = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const templates = await this.service.getEmailTemplates(tenantId);
      success(res, 'Email templates retrieved successfully', templates);
    } catch (err) {
      next(err);
    }
  };

  public createEmailTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = req.context?.storeId || 1;
      const template = await this.service.createEmailTemplate(tenantId, storeId, req.body);
      success(res, 'Email template created successfully', template, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  // Campaigns
  public getCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const campaigns = await this.service.getCampaigns(tenantId);
      success(res, 'Marketing campaigns retrieved successfully', campaigns);
    } catch (err) {
      next(err);
    }
  };

  public createCampaign = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = req.context?.storeId || 1;
      const campaign = await this.service.createCampaign(tenantId, storeId, req.body);
      success(res, 'Campaign created successfully', campaign, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  // Coupons
  public getCoupons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const coupons = await this.service.getCoupons(tenantId);
      success(res, 'Coupons retrieved successfully', coupons);
    } catch (err) {
      next(err);
    }
  };

  public createCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = req.context?.storeId || 1;
      const coupon = await this.service.createCoupon(tenantId, storeId, req.body);
      success(res, 'Coupon created successfully', coupon, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  // Abandoned Carts
  public getAbandonedCarts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const carts = await this.service.getAbandonedCarts(tenantId);
      success(res, 'Abandoned carts retrieved successfully', carts);
    } catch (err) {
      next(err);
    }
  };

  // Customer Segments
  public getCustomerSegments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const segments = await this.service.getCustomerSegments(tenantId);
      success(res, 'Customer segments retrieved successfully', segments);
    } catch (err) {
      next(err);
    }
  };

  public createCustomerSegment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = req.context?.storeId || 1;
      const segment = await this.service.createCustomerSegment(tenantId, storeId, req.body);
      success(res, 'Customer segment created successfully', segment, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  // Automation Rules
  public getAutomationRules = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const rules = await this.service.getAutomationRules(tenantId);
      success(res, 'Automation rules retrieved successfully', rules);
    } catch (err) {
      next(err);
    }
  };

  public createAutomationRule = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = req.context?.storeId || 1;
      const rule = await this.service.createAutomationRule(tenantId, storeId, req.body);
      success(res, 'Automation rule created successfully', rule, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  // Marketing Analytics
  public getMarketingAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const analytics = await this.service.getMarketingAnalytics(tenantId);
      success(res, 'Marketing analytics retrieved successfully', analytics);
    } catch (err) {
      next(err);
    }
  };

  // WhatsApp Automation & Settings
  public getWhatsAppSettings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const settings = await this.service.getWhatsAppSettings(tenantId);
      success(res, 'WhatsApp settings retrieved successfully', settings);
    } catch (err) {
      next(err);
    }
  };

  public saveWhatsAppSettings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const result = await this.service.saveWhatsAppSettings(tenantId, req.body);
      success(res, 'WhatsApp settings saved successfully', result);
    } catch (err) {
      next(err);
    }
  };

  public testWhatsAppConnection = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      await this.service.testWhatsAppConnection(tenantId, req.body);
      success(res, 'WhatsApp Cloud API Connection verified successfully');
    } catch (err) {
      next(err);
    }
  };

  public sendWhatsAppTestMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const { recipientPhone, config } = req.body;
      const result = await this.service.sendWhatsAppTestMessage(tenantId, recipientPhone, config);
      success(res, 'WhatsApp test message processed successfully', result);
    } catch (err) {
      next(err);
    }
  };

  public getWhatsAppTemplates = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const templates = await this.service.getWhatsAppTemplates(tenantId);
      success(res, 'WhatsApp templates retrieved successfully', templates);
    } catch (err) {
      next(err);
    }
  };

  public createWhatsAppTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = req.context?.storeId || 1;
      const template = await this.service.createWhatsAppTemplate(tenantId, storeId, req.body);
      success(res, 'WhatsApp template created successfully', template, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  public getCommunicationLogs = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const logs = await this.service.getCommunicationLogs(tenantId);
      success(res, 'Communication logs retrieved successfully', logs);
    } catch (err) {
      next(err);
    }
  };
}
