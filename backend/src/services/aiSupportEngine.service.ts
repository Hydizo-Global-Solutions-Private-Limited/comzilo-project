/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Order,
  Shipment,
  Invoice,
  Payment,
  SupportKnowledgeBase,
  SupportTicket,
  TicketMessage,
  Customer,
  Store,
} from '../database/models';
import { SmtpService } from './smtpService';

export class AiSupportEngineService {
  /**
   * 1. Search internal business data (Orders, Shipments, Invoices, Payments, KB)
   */
  static async searchInternalBusinessData(
    tenantId: number,
    storeId: number,
    customerId: number,
    query: string
  ) {
    const qLower = query.toLowerCase();

    // A. Check for Order & Shipment inquiries
    if (
      qLower.includes('order') ||
      qLower.includes('track') ||
      qLower.includes('shipment') ||
      qLower.includes('delivery') ||
      qLower.includes('status') ||
      qLower.includes('where is')
    ) {
      const orders = await Order.findAll({
        where: { tenantId, storeId, customerId },
        limit: 5,
        order: [['createdAt', 'DESC']],
      });

      if (orders && orders.length > 0) {
        const latestOrder: any = orders[0];
        const shipments = await Shipment.findAll({
          where: { tenantId, storeId, orderId: latestOrder.id },
          limit: 1,
        });

        const tracking: any = shipments.length > 0 ? shipments[0] : null;
        let responseText =
          `Here is the real-time status for your latest Order #${latestOrder.orderNumber || latestOrder.id}:\n\n` +
          `• Order Status: ${(latestOrder.status || 'PROCESSING').toUpperCase()}\n` +
          `• Total Amount: ₹${latestOrder.totalAmount || latestOrder.total || 0}\n` +
          `• Date Placed: ${new Date(latestOrder.createdAt).toLocaleDateString()}\n`;

        if (tracking) {
          responseText +=
            `\n🚚 Logistics Shipment Information:\n` +
            `• Carrier: ${tracking.courierName || tracking.carrierName || 'Express Logistics'}\n` +
            `• AWB / Tracking Number: ${tracking.awbNumber || tracking.trackingNumber || 'AWB-PENDING'}\n` +
            `• Tracking Status: ${(tracking.status || 'IN_TRANSIT').toUpperCase()}\n` +
            `• Estimated Delivery: ${tracking.estimatedDelivery ? new Date(tracking.estimatedDelivery).toLocaleDateString() : 'Within 2-3 Days'}`;
        } else {
          responseText += `\n📦 Package Status: Preparing for warehouse dispatch and courier allocation.`;
        }

        return {
          found: true,
          answer: responseText,
          confidenceScore: 100,
          type: 'order_status',
          orderId: latestOrder.id,
        };
      }
    }

    // B. Check for Payment & Invoice inquiries
    if (
      qLower.includes('payment') ||
      qLower.includes('invoice') ||
      qLower.includes('bill') ||
      qLower.includes('receipt') ||
      qLower.includes('charge')
    ) {
      const invoices = await Invoice.findAll({
        where: { tenantId, storeId, orderId: { [require('sequelize').Op.ne]: null } },
        limit: 3,
        order: [['createdAt', 'DESC']],
      });

      if (invoices && invoices.length > 0) {
        const latestInv: any = invoices[0];
        const payments = await Payment.findAll({
          where: { tenantId, storeId, orderId: latestInv.orderId },
          limit: 1,
        });
        const p: any = payments.length > 0 ? payments[0] : null;

        let invText =
          `Here are your latest financial billing records:\n\n` +
          `• Invoice Number: ${latestInv.invoiceNumber || latestInv.id}\n` +
          `• Invoice Status: ${(latestInv.paymentStatus || latestInv.status || 'PAID').toUpperCase()}\n` +
          `• Amount Due/Paid: ₹${latestInv.total || latestInv.totalAmount || 0}\n`;

        if (p) {
          invText +=
            `• Payment Gateway: ${p.paymentMethod || p.paymentGateway || 'Razorpay'}\n` +
            `• Payment Reference: ${p.transactionId || p.transactionRef || p.id}\n` +
            `• Transaction Status: ${(p.status || 'COMPLETED').toUpperCase()}`;
        }

        return {
          found: true,
          answer: invText,
          confidenceScore: 100,
          type: 'invoice_payment',
          invoiceId: latestInv.id,
        };
      }
    }

    // C. Check Knowledge Base articles
    const kbArticles = await SupportKnowledgeBase.findAll({
      where: { tenantId, storeId, isPublished: true },
    });

    for (const article of kbArticles) {
      if (
        qLower.includes(article.title.toLowerCase()) ||
        (article.tags &&
          article.tags.split(',').some((t: string) => qLower.includes(t.trim().toLowerCase())))
      ) {
        return {
          found: true,
          answer: `📌 Help Center KB Article: "${article.title}"\n\n${article.content}`,
          confidenceScore: 95,
          type: 'knowledge_base',
        };
      }
    }

    return { found: false, answer: null, confidenceScore: 0, type: 'unknown' };
  }

  /**
   * 2. Evaluate AI Chat Query & Execute Hybrid Auto-Escalation
   */
  static async evaluateAndProcessAiChat(
    tenantId: number,
    storeId: number,
    customerId: number,
    userQuery: string
  ) {
    // 1. Search internal business data first
    const businessData = await this.searchInternalBusinessData(
      tenantId,
      storeId,
      customerId,
      userQuery
    );
    if (businessData.found && businessData.confidenceScore >= 90) {
      return {
        reply: businessData.answer,
        confidenceScore: businessData.confidenceScore,
        aiResolved: true,
        ticketCreated: false,
        ticket: null,
      };
    }

    // 2. Automated AI Reasoning Response (High Confidence Check)
    const qLower = userQuery.toLowerCase();
    let aiReply = '';
    let confidenceScore = 65; // Default below 90% threshold for complex questions

    if (qLower.includes('hours') || qLower.includes('open') || qLower.includes('contact')) {
      aiReply =
        'Our store support team is active Monday through Saturday from 9:00 AM to 7:00 PM IST.';
      confidenceScore = 95;
    } else if (qLower.includes('hi') || qLower.includes('hello') || qLower.includes('hey')) {
      aiReply =
        'Hello! Welcome to Customer Support. How can I assist you with your orders, shipments, or payments today?';
      confidenceScore = 98;
    }

    // If confidence score >= 90%, return AI answer
    if (confidenceScore >= 90 && aiReply) {
      return {
        reply: aiReply,
        confidenceScore,
        aiResolved: true,
        ticketCreated: false,
        ticket: null,
      };
    }

    // 3. Confidence < 90% or Unresolved -> Auto-Escalate to Seller Store Ticket!
    let validCustomerId = customerId;
    const existingCust: any = await Customer.findByPk(customerId).catch(() => null);
    if (!existingCust) {
      const anyCust: any = await Customer.findOne({ where: { tenantId, storeId } }).catch(
        () => null
      );
      if (anyCust) validCustomerId = anyCust.id;
    }

    const ticketNumber = `TCK-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const slaDueAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour SLA

    const ticket = await SupportTicket.create({
      tenantId,
      storeId,
      customerId: validCustomerId,
      ticketNumber,
      subject: userQuery.slice(0, 100) || 'AI Escalated Customer Support Ticket',
      category: 'AI Escalation',
      priority: 'medium',
      status: 'open',
      aiConfidenceScore: confidenceScore,
      aiResolved: false,
      slaDueAt,
    });

    // Save Customer Message
    await TicketMessage.create({
      ticketId: ticket.id,
      senderType: 'customer',
      senderId: customerId,
      message: userQuery,
    });

    // Save AI System Handover Message
    const escalationMessage = `I've analyzed your query regarding "${userQuery}". Since this requires specialized assistance, I have automatically created Support Ticket #${ticketNumber} and assigned it directly to your store's support team. A seller agent will respond shortly!`;

    await TicketMessage.create({
      ticketId: ticket.id,
      senderType: 'ai_assistant',
      senderId: null,
      senderName: 'AI Support Assistant',
      message: escalationMessage,
    });

    // Notify Seller via Email & In-App
    try {
      const customer: any = await Customer.findByPk(customerId);
      const store: any = await Store.findByPk(storeId);
      const sellerEmail = store?.email || 'admin@comzilo.com';

      const smtp = new SmtpService();
      await smtp
        .sendEmail({
          tenantId,
          to: sellerEmail,
          subject: `🚨 [New Support Ticket #${ticketNumber}] Customer Issue Escalated`,
          html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1E293B;">
            <h2>New Customer Support Ticket Escalated</h2>
            <p>Customer <strong>${customer?.firstName || 'Customer'} ${customer?.lastName || ''}</strong> has requested support.</p>
            <p><strong>Ticket #:</strong> ${ticketNumber}</p>
            <p><strong>Query:</strong> "${userQuery}"</p>
            <p><a href="http://localhost:5173/support/tickets/${ticket.id}" style="background: #2563EB; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">Open Seller Workspace</a></p>
          </div>
        `,
        })
        .catch(() => {});
    } catch {
      // Non-blocking notification fallback
    }

    return {
      reply: escalationMessage,
      confidenceScore,
      aiResolved: false,
      ticketCreated: true,
      ticket,
    };
  }
}
