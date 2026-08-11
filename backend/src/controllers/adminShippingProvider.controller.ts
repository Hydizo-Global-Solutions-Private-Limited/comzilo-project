import { Request, Response, NextFunction } from 'express';
import { ShippingProviderService } from '../services/shippingProvider.service';
import { success } from '../shared/responses';

const shippingService = new ShippingProviderService();

export class AdminShippingProviderController {
  public getGlobalProviders = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const providers = await shippingService.getGlobalProviders();
      success(res, 'Global shipping providers retrieved successfully', providers);
    } catch (error) {
      next(error);
    }
  };

  public updateProviderStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const provider = await shippingService.updateGlobalProviderStatus(
        Number(id),
        Boolean(isActive)
      );
      success(res, 'Provider status updated successfully', provider);
    } catch (error) {
      next(error);
    }
  };

  public getGlobalAnalytics = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const analytics = await shippingService.getGlobalAnalytics();
      success(res, 'Global shipping analytics retrieved successfully', analytics);
    } catch (error) {
      next(error);
    }
  };
}
