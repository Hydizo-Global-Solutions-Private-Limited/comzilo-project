import { Request, Response, NextFunction } from 'express';
import { SellerBankAccountService } from '../services/sellerBankAccount.service';
import { success } from '../shared/responses';

export class SellerBankAccountController {
  private service = new SellerBankAccountService();

  private extractTenantId(req: Request): number {
    const headerTid = req.headers['x-tenant-id'];
    if (headerTid && !isNaN(Number(headerTid))) {
      return Number(headerTid);
    }
    const contextTid = (req as any).context?.tenantId;
    if (contextTid && !isNaN(Number(contextTid))) {
      return Number(contextTid);
    }
    const userTid = (req as any).user?.tenantId;
    if (userTid && !isNaN(Number(userTid))) {
      return Number(userTid);
    }
    const directTid = (req as any).tenantId;
    if (directTid && !isNaN(Number(directTid))) {
      return Number(directTid);
    }
    return 47;
  }

  public getSellerBankAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.extractTenantId(req);
      const account = await this.service.getBankAccount(tenantId);
      success(res, 'Seller bank account retrieved successfully', account);
    } catch (error) {
      next(error);
    }
  };

  public submitSellerBankAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.extractTenantId(req);
      const account = await this.service.submitBankAccount(tenantId, req.body);
      success(res, 'Bank account details submitted successfully for verification.', account);
    } catch (error) {
      next(error);
    }
  };

  public listAllBankAccounts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { status, search } = req.query;
      const accounts = await this.service.listAllBankAccounts({
        status: status as string,
        search: search as string,
      });
      success(res, 'All seller bank accounts retrieved successfully', accounts);
    } catch (error) {
      next(error);
    }
  };

  public verifyBankAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const adminUserId = (req as any).user?.id || 1;
      const { status, remarks } = req.body;
      const account = await this.service.verifyBankAccount(id, adminUserId, status, remarks);
      success(res, `Bank account #${id} verification status updated to '${status}'.`, account);
    } catch (error) {
      next(error);
    }
  };
}
