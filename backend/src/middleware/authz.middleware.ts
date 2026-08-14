/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { AuthorizationService } from '../services/authorization.service';
import { createAuditLog } from '../utils/auditHelper';
import { sendResponse } from '../shared/responses';
import { HTTP_STATUS } from '../shared/constants';

const authzService = new AuthorizationService();

/**
 * Middleware to enforce authentication status, resolve tenant scope,
 * and initialize request-scoped RBAC caching.
 */
export const authorize = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.context?.authenticatedUserId;
    if (!userId) {
      sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        false,
        'Authentication credentials were not provided',
        null,
        req.context?.requestId,
        []
      );
      return;
    }

    const tenantId = req.context?.tenantId;
    if (!tenantId) {
      sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        false,
        'Tenant context could not be resolved',
        null,
        req.context?.requestId,
        []
      );
      return;
    }

    // Initialize Request RBAC cache
    req.context.rbacCache = {};

    // Validate Tenant membership with Super Admin bypass capability
    const belongs = await authzService.belongsToTenant(userId, tenantId);
    if (!belongs) {
      // Cross-tenant access attempt violation
      await createAuditLog(
        {
          tenantId,
          actorId: userId,
          action: 'CROSS_TENANT_ACCESS_DENIED',
          entityType: 'tenant',
          entityId: String(tenantId),
          previousValues: { ipAddress: req.context.ipAddress },
        },
        req.context
      );

      sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        false,
        'Access denied: You do not belong to this tenant scope',
        null,
        req.context?.requestId,
        []
      );
      return;
    }

    // Validate Store-Tenant match
    const storeIdHeader = req.headers['x-store-id'] || req.headers['X-Store-ID'];
    if (storeIdHeader) {
      const storeId = Number(storeIdHeader);
      if (isNaN(storeId)) {
        sendResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          false,
          'Invalid X-Store-ID header format',
          null,
          req.context?.requestId,
          []
        );
        return;
      }

      const [store]: any = await sequelize.query(
        'SELECT id, tenant_id, status, deleted_at FROM stores WHERE id = :storeId LIMIT 1',
        {
          replacements: { storeId },
          type: QueryTypes.SELECT,
        }
      );

      if (!store) {
        sendResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          false,
          'Store not found',
          null,
          req.context?.requestId,
          []
        );
        return;
      }

      const isSuperAdmin = await authzService.isSuperAdmin(userId, req.context.rbacCache);

      // Verify tenant ownership unless user is Super Admin
      if (!isSuperAdmin && Number(store.tenant_id) !== Number(tenantId)) {
        sendResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          false,
          'Access denied: Store does not belong to this tenant scope',
          null,
          req.context?.requestId,
          []
        );
        return;
      }

      // Verify active/deleted policy
      if (store.status !== 'active' || store.deleted_at !== null) {
        sendResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          false,
          'Access denied: Store is inactive or deleted',
          null,
          req.context?.requestId,
          []
        );
        return;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Enforces specific permission code
 */
export const requirePermission = (permissionCode: string, storeIdParamKey?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const userId = req.context.authenticatedUserId!;
      const cache = req.context.rbacCache;

      let storeId: number | undefined;
      if (storeIdParamKey && (storeIdParamKey !== 'id' || req.baseUrl.includes('/stores'))) {
        const rawStoreId = req.params[storeIdParamKey] || req.query[storeIdParamKey];
        if (rawStoreId) {
          storeId = Number(rawStoreId);
        }
      }

      const hasPerm = await authzService.hasPermission(
        tenantId,
        userId,
        permissionCode,
        storeId,
        cache
      );

      if (!hasPerm) {
        await createAuditLog(
          {
            tenantId,
            actorId: userId,
            action: 'PERMISSION_DENIED',
            entityType: 'permission',
            entityId: permissionCode,
            previousValues: { requiredPermission: permissionCode, storeId },
          },
          req.context
        );

        sendResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          false,
          `Access denied: Missing required permission [${permissionCode}]`,
          null,
          req.context.requestId,
          []
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Enforces any of the specified permission codes
 */
export const requireAnyPermission = (permissionCodes: string[], storeIdParamKey?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const userId = req.context.authenticatedUserId!;
      const cache = req.context.rbacCache;

      let storeId: number | undefined;
      if (storeIdParamKey && (storeIdParamKey !== 'id' || req.baseUrl.includes('/stores'))) {
        const rawStoreId = req.params[storeIdParamKey] || req.query[storeIdParamKey];
        if (rawStoreId) {
          storeId = Number(rawStoreId);
        }
      }

      const hasPerm = await authzService.hasAnyPermission(
        tenantId,
        userId,
        permissionCodes,
        storeId,
        cache
      );

      if (!hasPerm) {
        await createAuditLog(
          {
            tenantId,
            actorId: userId,
            action: 'ANY_PERMISSION_DENIED',
            entityType: 'permission',
            entityId: permissionCodes.join(','),
            previousValues: { requiredPermissions: permissionCodes, storeId },
          },
          req.context
        );

        sendResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          false,
          `Access denied: Missing any required permission from [${permissionCodes.join(', ')}]`,
          null,
          req.context.requestId,
          []
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Enforces all of the specified permission codes
 */
export const requireAllPermissions = (permissionCodes: string[], storeIdParamKey?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const userId = req.context.authenticatedUserId!;
      const cache = req.context.rbacCache;

      let storeId: number | undefined;
      if (storeIdParamKey) {
        const rawStoreId = req.params[storeIdParamKey] || req.query[storeIdParamKey];
        if (rawStoreId) {
          storeId = Number(rawStoreId);
        }
      }

      const hasPerm = await authzService.hasAllPermissions(
        tenantId,
        userId,
        permissionCodes,
        storeId,
        cache
      );

      if (!hasPerm) {
        await createAuditLog(
          {
            tenantId,
            actorId: userId,
            action: 'ALL_PERMISSIONS_DENIED',
            entityType: 'permission',
            entityId: permissionCodes.join(','),
            previousValues: { requiredPermissions: permissionCodes, storeId },
          },
          req.context
        );

        sendResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          false,
          `Access denied: Missing all required permissions from [${permissionCodes.join(', ')}]`,
          null,
          req.context.requestId,
          []
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Enforces specific role code
 */
export const requireRole = (roleCode: string, storeIdParamKey?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const userId = req.context.authenticatedUserId!;
      const cache = req.context.rbacCache;

      let storeId: number | undefined;
      if (storeIdParamKey) {
        const rawStoreId = req.params[storeIdParamKey] || req.query[storeIdParamKey];
        if (rawStoreId) {
          storeId = Number(rawStoreId);
        }
      }

      const hasRole = await authzService.hasRole(tenantId, userId, roleCode, storeId, cache);

      if (!hasRole) {
        await createAuditLog(
          {
            tenantId,
            actorId: userId,
            action: 'ROLE_DENIED',
            entityType: 'role',
            entityId: roleCode,
            previousValues: { requiredRole: roleCode, storeId },
          },
          req.context
        );

        sendResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          false,
          `Access denied: Missing required role [${roleCode}]`,
          null,
          req.context.requestId,
          []
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Enforces any of the specified role codes
 */
export const requireAnyRole = (roleCodes: string[], storeIdParamKey?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const userId = req.context.authenticatedUserId!;
      const cache = req.context.rbacCache;

      let storeId: number | undefined;
      if (storeIdParamKey) {
        const rawStoreId = req.params[storeIdParamKey] || req.query[storeIdParamKey];
        if (rawStoreId) {
          storeId = Number(rawStoreId);
        }
      }

      const roles = await authzService.getUserRoles(tenantId, userId, storeId, cache);
      const hasRole = roleCodes.some((code) => roles.includes(code));

      if (!hasRole) {
        await createAuditLog(
          {
            tenantId,
            actorId: userId,
            action: 'ANY_ROLE_DENIED',
            entityType: 'role',
            entityId: roleCodes.join(','),
            previousValues: { requiredRoles: roleCodes, storeId },
          },
          req.context
        );

        sendResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          false,
          `Access denied: Missing any required role from [${roleCodes.join(', ')}]`,
          null,
          req.context.requestId,
          []
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Enforces all of the specified role codes
 */
export const requireAllRoles = (roleCodes: string[], storeIdParamKey?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const userId = req.context.authenticatedUserId!;
      const cache = req.context.rbacCache;

      let storeId: number | undefined;
      if (storeIdParamKey) {
        const rawStoreId = req.params[storeIdParamKey] || req.query[storeIdParamKey];
        if (rawStoreId) {
          storeId = Number(rawStoreId);
        }
      }

      const roles = await authzService.getUserRoles(tenantId, userId, storeId, cache);
      const hasRole = roleCodes.every((code) => roles.includes(code));

      if (!hasRole) {
        await createAuditLog(
          {
            tenantId,
            actorId: userId,
            action: 'ALL_ROLES_DENIED',
            entityType: 'role',
            entityId: roleCodes.join(','),
            previousValues: { requiredRoles: roleCodes, storeId },
          },
          req.context
        );

        sendResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          false,
          `Access denied: Missing all required roles from [${roleCodes.join(', ')}]`,
          null,
          req.context.requestId,
          []
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
