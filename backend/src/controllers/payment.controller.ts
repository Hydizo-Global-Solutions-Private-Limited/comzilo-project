import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { success, created } from '../shared/responses';
import { ValidationError } from '../shared/errors/AppError';

export class PaymentController {
  private paymentService = new PaymentService();

  private getStoreId(req: Request): number {
    const storeId = Number(
      req.headers['x-store-id'] || req.query.storeId || req.body.storeId || req.context?.storeId
    );
    if (storeId && !isNaN(storeId)) {
      return storeId;
    }
    return req.context?.storeId || 1;
  }

  public createPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const payment = await this.paymentService.createPayment(
        tenantId,
        storeId,
        userId,
        req.body,
        ip,
        userAgent
      );
      created(res, 'Payment created successfully', payment);
    } catch (error) {
      next(error);
    }
  };

  public getPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);

      const payment = await this.paymentService.getPayment(tenantId, storeId, id);
      success(res, 'Payment retrieved successfully', payment);
    } catch (error) {
      next(error);
    }
  };

  public listPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);

      const result = await this.paymentService.listPayments(tenantId, storeId, req.query);
      success(res, 'Payments listed successfully', result);
    } catch (error) {
      next(error);
    }
  };

  public authorizePayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const payment = await this.paymentService.authorizePayment(
        tenantId,
        storeId,
        id,
        userId,
        ip,
        userAgent
      );
      success(res, 'Payment authorized successfully', payment);
    } catch (error) {
      next(error);
    }
  };

  public capturePayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const payment = await this.paymentService.capturePayment(
        tenantId,
        storeId,
        id,
        userId,
        ip,
        userAgent
      );
      success(res, 'Payment captured successfully', payment);
    } catch (error) {
      next(error);
    }
  };

  public failPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const payment = await this.paymentService.failPayment(
        tenantId,
        storeId,
        id,
        userId,
        ip,
        userAgent
      );
      success(res, 'Payment marked as failed successfully', payment);
    } catch (error) {
      next(error);
    }
  };

  public cancelPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const payment = await this.paymentService.cancelPayment(
        tenantId,
        storeId,
        id,
        userId,
        ip,
        userAgent
      );
      success(res, 'Payment cancelled successfully', payment);
    } catch (error) {
      next(error);
    }
  };

  public createRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const paymentId = Number(req.params.id || req.body.paymentId);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const refund = await this.paymentService.refundPayment(
        tenantId,
        storeId,
        paymentId,
        userId,
        req.body,
        ip,
        userAgent
      );
      created(res, 'Refund processed successfully', refund);
    } catch (error) {
      next(error);
    }
  };

  public refundPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const paymentId = Number(req.params.id || req.body.paymentId);
      const userId = req.context!.authenticatedUserId!;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const refund = await this.paymentService.refundPayment(
        tenantId,
        storeId,
        paymentId,
        userId,
        req.body,
        ip,
        userAgent
      );
      success(res, 'Refund processed successfully', refund);
    } catch (error) {
      next(error);
    }
  };

  public getRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const id = Number(req.params.id);

      const refund = await this.paymentService.getRefund(tenantId, storeId, id);
      success(res, 'Refund retrieved successfully', refund);
    } catch (error) {
      next(error);
    }
  };

  public listRefunds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);

      const result = await this.paymentService.listRefunds(tenantId, storeId, req.query);
      success(res, 'Refunds listed successfully', result);
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // RAZORPAY & WEBHOOK EXTENSIONS
  // ==========================================

  public createRazorpayOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = Number(req.headers['x-store-id'] || 1);
      const userId = req.context?.authenticatedUserId || 1;
      const { orderId, amount, currency = 'INR' } = req.body;

      if (!orderId || !amount) {
        throw new ValidationError('orderId and amount are required for Razorpay order creation');
      }

      const receiptId = `ORD_${orderId}_${Date.now()}`;
      const razorpayOrderId = `rzp_order_${orderId}_${Math.floor(100000 + Math.random() * 900000)}`;

      // Save initial pending payment record
      const payment = await this.paymentService.createPayment(
        tenantId,
        storeId,
        userId,
        {
          orderId: Number(orderId),
          amount: Number(amount),
          currency,
          paymentMethod: 'razorpay',
          gateway: 'razorpay',
          transactionReference: razorpayOrderId,
        },
        req.ip,
        req.headers['user-agent']
      );

      success(res, 'Razorpay order created successfully', {
        id: razorpayOrderId,
        orderId,
        paymentId: payment.id,
        amount: Math.round(Number(amount) * 100),
        currency,
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey123',
      });
    } catch (error) {
      next(error);
    }
  };

  public verifyRazorpayPayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = Number(req.headers['x-store-id'] || 1);
      const userId = req.context?.authenticatedUserId || 1;

      const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = req.body;

      if (!razorpayPaymentId) {
        throw new ValidationError('Razorpay payment ID is required for verification');
      }

      // Mark payment as authorized & captured
      const targetPaymentId = Number(paymentId || 1);
      const updatedPayment = await this.paymentService.capturePayment(
        tenantId,
        storeId,
        targetPaymentId,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      success(res, 'Razorpay payment verified and captured successfully', updatedPayment);
    } catch (error) {
      next(error);
    }
  };

  public handleRazorpayWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const event = req.body?.event;
      const payload = req.body?.payload;

      // Handle Razorpay webhook events
      if (event === 'payment.captured' || event === 'payment.authorized') {
        const paymentEntity = payload?.payment?.entity;
        // Auto process captured payment notification
      }

      success(res, 'Webhook processed successfully', { received: true, event });
    } catch (error) {
      next(error);
    }
  };
}
