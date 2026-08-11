import { Request, Response, NextFunction } from 'express';
import { SellerSubscriptionService } from '../services/sellerSubscription.service';
import { AuthorizationError } from '../shared/errors/AppError';

const subService = new SellerSubscriptionService();

export function validateSubscriptionLimit(
  resourceType: 'warehouses' | 'stores' | 'users' | 'products'
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId;
      if (!tenantId) {
        return next();
      }

      const subData = await subService.getCurrentSubscription(tenantId);
      if (subData.isExpired) {
        return next(
          new AuthorizationError(
            'Your SaaS subscription or free trial has expired. Please renew your subscription to perform this action.'
          )
        );
      }

      const usageInfo = subData.usage[resourceType];
      if (usageInfo && usageInfo.used >= usageInfo.limit) {
        return next(
          new AuthorizationError(
            `You have reached the maximum allowed limit for ${resourceType} (${usageInfo.limit}) on your current ${subData.plan?.name || 'Subscription'} plan. Upgrade your plan to increase limits.`
          )
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
