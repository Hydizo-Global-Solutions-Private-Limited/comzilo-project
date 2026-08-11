import { Request, Response, NextFunction } from 'express';
import { SellerWalletService } from '../services/sellerWallet.service';
import { success, created } from '../shared/responses';
import { UnauthorizedError } from '../shared/errors/AppError';

export class SellerWalletController {
  private service = new SellerWalletService();

  public getWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const wallet = await this.service.getWallet(tenantId);
      success(res, 'Seller wallet details retrieved successfully', wallet);
    } catch (err) {
      next(err);
    }
  };

  public updateBankDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const wallet = await this.service.updateBankDetails(tenantId, req.body);
      success(res, 'Bank details updated successfully', wallet);
    } catch (err) {
      next(err);
    }
  };

  public requestWithdrawal = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = 1;
      const { amount, bankDetails } = req.body;
      const result = await this.service.requestWithdrawal(
        tenantId,
        storeId,
        Number(amount),
        bankDetails
      );
      created(res, 'Withdrawal request submitted successfully', result);
    } catch (err) {
      next(err);
    }
  };

  public getTransactions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const txs = await this.service.getTransactions(tenantId);
      success(res, 'Wallet transactions retrieved successfully', txs);
    } catch (err) {
      next(err);
    }
  };

  public getWithdrawals = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const withdrawals = await this.service.getWithdrawals(tenantId);
      success(res, 'Withdrawal history retrieved successfully', withdrawals);
    } catch (err) {
      next(err);
    }
  };

  public getAllWithdrawals = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const statusFilter = (req.query.status as string) || undefined;
      const withdrawals = await this.service.getAllWithdrawals(statusFilter);
      success(res, 'All seller withdrawals retrieved successfully', withdrawals);
    } catch (err) {
      next(err);
    }
  };

  public approveWithdrawal = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const withdrawalId = Number(req.params.id);
      const result = await this.service.approveWithdrawal(withdrawalId);
      success(res, 'Withdrawal request approved successfully', result);
    } catch (err) {
      next(err);
    }
  };

  public markWithdrawalPaid = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const withdrawalId = Number(req.params.id);
      const payoutRef = req.body.payoutReference || 'SETTLE_PO_123';
      const result = await this.service.markWithdrawalPaid(withdrawalId, payoutRef);
      success(res, 'Withdrawal marked as paid successfully', result);
    } catch (err) {
      next(err);
    }
  };

  public rejectWithdrawal = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const withdrawalId = Number(req.params.id);
      const reason = req.body.reason || 'Withdrawal request rejected by admin';
      const result = await this.service.rejectWithdrawal(withdrawalId, reason);
      success(res, 'Withdrawal request rejected and balance refunded successfully', result);
    } catch (err) {
      next(err);
    }
  };

  public getWithdrawalReports = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const reports = await this.service.getWithdrawalReports();
      success(res, 'Withdrawal financial reports generated successfully', reports);
    } catch (err) {
      next(err);
    }
  };

  public getSellerFinancialDashboard = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const data = await this.service.getSellerFinancialDashboard(tenantId);
      success(res, 'Seller financial dashboard retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  };

  public exportFinancialData = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const format = (req.query.format as string) || 'csv';
      const data = await this.service.getSellerFinancialDashboard(tenantId);

      if (format === 'csv' || format === 'excel') {
        const csvRows = [
          'Metric,Value (INR)',
          `Today Revenue,${data.todayRevenue}`,
          `Monthly Revenue,${data.monthlyRevenue}`,
          `Total Wallet Balance,${data.totalBalance}`,
          `Pending Escrow Balance,${data.pendingBalance}`,
          `Available Balance,${data.availableBalance}`,
        ];

        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="seller_financial_report_${Date.now()}.${format === 'csv' ? 'csv' : 'xls'}"`
        );
        res.send(csvRows.join('\n'));
        return;
      }

      success(res, 'Seller financial export generated successfully', data);
    } catch (err) {
      next(err);
    }
  };
}
