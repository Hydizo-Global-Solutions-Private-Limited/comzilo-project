import { Request, Response } from 'express';
import { AiSupportEngineService } from '../services/aiSupportEngine.service';
import { EnterpriseSupportService } from '../services/enterpriseSupport.service';
import { Customer } from '../database/models';

function getTenantAndStore(req: Request) {
  const tenantId = Number(
    (req as any).context?.tenantId ||
      (req as any).user?.tenantId ||
      req.headers['x-tenant-id'] ||
      req.query.tenantId ||
      req.body.tenantId ||
      1
  );

  const storeId = Number(
    (req as any).user?.storeId ||
      req.headers['x-store-id'] ||
      req.query.storeId ||
      req.body.storeId ||
      1
  );

  return { tenantId, storeId };
}

async function getCustomerId(req: Request): Promise<number> {
  const reqUserId = (req as any).context?.authenticatedUserId || (req as any).user?.id;
  if (reqUserId) {
    const cust: any = await Customer.findOne({ where: { userId: reqUserId } }).catch(() => null);
    if (cust) return cust.id;
  }
  return Number(req.query.customerId || req.body.customerId || (req as any).user?.id || 13);
}

export class SupportCenterController {
  // 1. CUSTOMER: AI Chat Assistant
  static async customerAiChat(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);
      const customerId = await getCustomerId(req);
      const { message } = req.body;

      if (!message) {
        res.status(400).json({ success: false, message: 'Message query is required' });
        return;
      }

      const result = await AiSupportEngineService.evaluateAndProcessAiChat(
        tenantId,
        storeId,
        customerId,
        message
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      const status =
        err?.name === 'ForbiddenError' || err?.message?.includes('Access Denied') ? 403 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  // 2. CUSTOMER: Get List of Customer Tickets
  static async getCustomerTickets(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);
      const customerId = await getCustomerId(req);

      const tickets = await EnterpriseSupportService.getCustomerTickets(
        tenantId,
        storeId,
        customerId
      );
      res.json({ success: true, data: tickets });
    } catch (err: any) {
      const status =
        err?.name === 'ForbiddenError' || err?.message?.includes('Access Denied') ? 403 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  // 3. CUSTOMER: Get Single Ticket Details & Timeline
  static async getCustomerTicketDetails(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);
      const customerId = await getCustomerId(req);
      const ticketId = Number(req.params.id);

      const details = await EnterpriseSupportService.getCustomerTicketDetails(
        tenantId,
        storeId,
        customerId,
        ticketId
      );
      res.json({ success: true, data: details });
    } catch (err: any) {
      res.status(403).json({ success: false, message: err.message || 'Access Denied' });
    }
  }

  // 4. CUSTOMER: Raise New Support Ticket
  static async createCustomerTicket(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);
      const customerId = await getCustomerId(req);

      const ticket = await EnterpriseSupportService.createCustomerTicket(
        tenantId,
        storeId,
        customerId,
        req.body
      );
      res.status(201).json({ success: true, data: ticket });
    } catch (err: any) {
      const status =
        err?.name === 'ForbiddenError' || err?.message?.includes('Access Denied') ? 403 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  // 5. CUSTOMER: Add Reply
  static async addCustomerReply(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);
      const customerId = await getCustomerId(req);
      const ticketId = Number(req.params.id);
      const { message, attachments } = req.body;

      const reply = await EnterpriseSupportService.addCustomerReply(
        tenantId,
        storeId,
        customerId,
        ticketId,
        message,
        attachments
      );
      res.json({ success: true, data: reply });
    } catch (err: any) {
      const status =
        err?.name === 'ForbiddenError' || err?.message?.includes('Access Denied') ? 403 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  // 6. CUSTOMER: Rate Ticket CSAT ⭐
  static async rateCustomerTicket(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);
      const customerId = await getCustomerId(req);
      const ticketId = Number(req.params.id);
      const { score, feedback } = req.body;

      const ticket = await EnterpriseSupportService.rateCustomerTicket(
        tenantId,
        storeId,
        customerId,
        ticketId,
        score,
        feedback
      );
      res.json({ success: true, data: ticket });
    } catch (err: any) {
      const status =
        err?.name === 'ForbiddenError' || err?.message?.includes('Access Denied') ? 403 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  // 7. SELLER: Get Tickets (Strict Multi-Tenant Scoped!)
  static async getSellerTickets(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);
      const status = req.query.status as string;

      const tickets = await EnterpriseSupportService.getSellerTickets(tenantId, storeId, status);
      res.json({ success: true, data: tickets });
    } catch (err: any) {
      const status =
        err?.name === 'ForbiddenError' || err?.message?.includes('Access Denied') ? 403 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  // 8. SELLER: Get Single Ticket Context & History
  static async getSellerTicketDetails(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);
      const ticketId = Number(req.params.id);

      const details = await EnterpriseSupportService.getSellerTicketDetails(
        tenantId,
        storeId,
        ticketId
      );
      res.json({ success: true, data: details });
    } catch (err: any) {
      res.status(403).json({ success: false, message: err.message || 'Access Denied' });
    }
  }

  // 9. SELLER: Reply Ticket
  static async sellerReplyTicket(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);
      const staffUserId = Number((req as any).user?.id || 1);
      const staffName = (req as any).user?.firstName
        ? `${(req as any).user.firstName} ${(req as any).user.lastName || ''}`.trim()
        : 'Store Support Agent';
      const ticketId = Number(req.params.id);
      const { message, attachments } = req.body;

      const reply = await EnterpriseSupportService.sellerReplyTicket(
        tenantId,
        storeId,
        staffUserId,
        staffName,
        ticketId,
        message,
        attachments
      );
      res.json({ success: true, data: reply });
    } catch (err: any) {
      const status =
        err?.name === 'ForbiddenError' || err?.message?.includes('Access Denied') ? 403 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  // 10. SELLER: Add Internal Staff Note
  static async addInternalNote(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);
      const staffUserId = Number((req as any).user?.id || 1);
      const staffName = (req as any).user?.firstName
        ? `${(req as any).user.firstName} ${(req as any).user.lastName || ''}`.trim()
        : 'Store Staff';
      const ticketId = Number(req.params.id);
      const { note } = req.body;

      const internalNote = await EnterpriseSupportService.addInternalNote(
        tenantId,
        storeId,
        staffUserId,
        staffName,
        ticketId,
        note
      );
      res.json({ success: true, data: internalNote });
    } catch (err: any) {
      const status =
        err?.name === 'ForbiddenError' || err?.message?.includes('Access Denied') ? 403 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  // 11. SELLER: Update Status / Priority
  static async updateTicketStatusPriority(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);
      const staffUserId = Number((req as any).user?.id || 1);
      const ticketId = Number(req.params.id);
      const { status, priority } = req.body;

      const ticket = await EnterpriseSupportService.updateTicketStatusPriority(
        tenantId,
        storeId,
        staffUserId,
        ticketId,
        status,
        priority
      );
      res.json({ success: true, data: ticket });
    } catch (err: any) {
      const status =
        err?.name === 'ForbiddenError' || err?.message?.includes('Access Denied') ? 403 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  // 12. SELLER: Support Analytics
  static async getSellerSupportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);

      const analytics = await EnterpriseSupportService.getSellerSupportAnalytics(tenantId, storeId);
      res.json({ success: true, data: analytics });
    } catch (err: any) {
      const status =
        err?.name === 'ForbiddenError' || err?.message?.includes('Access Denied') ? 403 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  // 13. SELLER: Canned Responses
  static async getCannedResponses(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);

      const list = await EnterpriseSupportService.getCannedResponses(tenantId, storeId);
      res.json({ success: true, data: list });
    } catch (err: any) {
      const status =
        err?.name === 'ForbiddenError' || err?.message?.includes('Access Denied') ? 403 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  static async createCannedResponse(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, storeId } = getTenantAndStore(req);
      const { title, shortcut, content, category } = req.body;

      const item = await EnterpriseSupportService.createCannedResponse(
        tenantId,
        storeId,
        title,
        shortcut,
        content,
        category
      );
      res.status(201).json({ success: true, data: item });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 14. SUPER ADMIN: High-Level Support Analytics (STRICT ISOLATION: NO ticket content!)
  static async getSuperAdminSupportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await EnterpriseSupportService.getSuperAdminSupportAnalytics();
      res.json({ success: true, data: analytics });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
