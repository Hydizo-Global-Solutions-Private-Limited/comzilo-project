import { Request, Response, NextFunction } from 'express';
import { PayoutQueueService } from '../services/payout/payoutQueue.service';
import { success, created } from '../shared/responses';

export class PayoutController {
  private payoutService = new PayoutQueueService();

  public enqueuePayout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const withdrawalId = Number(req.params.withdrawalId);
      const queuedItem = await this.payoutService.enqueuePayout(withdrawalId);
      created(res, 'Payout enqueued successfully', queuedItem);
    } catch (err) {
      next(err);
    }
  };

  public processQueue = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.payoutService.processQueue();
      success(res, 'Payout queue processed successfully', result);
    } catch (err) {
      next(err);
    }
  };

  public getPayoutQueue = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const queue = await this.payoutService.getPayoutQueue();
      success(res, 'Payout queue retrieved successfully', queue);
    } catch (err) {
      next(err);
    }
  };

  public getPayoutHistory = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const history = await this.payoutService.getPayoutHistory();
      success(res, 'Payout history retrieved successfully', history);
    } catch (err) {
      next(err);
    }
  };

  public getPayoutLogs = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const logs = await this.payoutService.getPayoutLogs();
      success(res, 'Payout audit logs retrieved successfully', logs);
    } catch (err) {
      next(err);
    }
  };

  public getPayoutStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payoutId = req.params.payoutId;
      const status = await this.payoutService.getPayoutStatus(payoutId);
      success(res, 'Payout status retrieved successfully', status);
    } catch (err) {
      next(err);
    }
  };

  public handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const event = req.body.event || 'payout.processed';
      const result = await this.payoutService.handleWebhook(event, req.body);
      success(res, 'Razorpay Payout webhook processed successfully', result);
    } catch (err) {
      next(err);
    }
  };
}
