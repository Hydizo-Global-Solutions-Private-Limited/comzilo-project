/* eslint-disable @typescript-eslint/no-explicit-any */
import { Role, Permission, UserRole, User } from '../database/models';
import { BaseService } from '../core/BaseService';
import { Op } from 'sequelize';

export class AuthorizationService extends BaseService {
  public constructor() {
    super('AuthorizationService');
  }
  /**
   * Checks if user has a system-wide super_admin role assignment
   */
  public async isSuperAdmin(userId: number, cache?: any): Promise<boolean> {
    if (cache && cache.isSuperAdmin !== undefined) {
      return cache.isSuperAdmin;
    }
    const count = await UserRole.count({
      include: [
        {
          model: Role,
          as: 'role',
          where: { code: 'super_admin' },
        },
      ],
      where: { userId },
    });
    const result = count > 0;
    if (cache) {
      cache.isSuperAdmin = result;
    }
    return result;
  }

  /**
   * Resolves list of active role codes for user in a given tenant and store scope
   */
  public async getUserRoles(
    tenantId: number,
    userId: number,
    storeId?: number,
    cache?: any
  ): Promise<string[]> {
    if (cache && cache.roles !== undefined) {
      return cache.roles;
    }

    const isSuper = await this.isSuperAdmin(userId, cache);
    if (isSuper) {
      if (cache) {
        cache.roles = ['super_admin'];
      }
      return ['super_admin'];
    }

    const userRoleWhere: any = {
      userId,
      tenantId,
    };

    if (storeId) {
      userRoleWhere.storeId = {
        [Op.or]: [null, storeId],
      };
    }

    const roles = await Role.findAll({
      include: [
        {
          model: UserRole,
          as: 'userRoles',
          where: userRoleWhere,
        },
      ],
      attributes: ['code'],
    });

    const codes = roles.map((r) => r.code);
    if (cache) {
      cache.roles = codes;
    }
    return codes;
  }

  /**
   * Resolves list of unique permission codes for user in a given tenant and store scope
   */
  public async getUserPermissions(
    tenantId: number,
    userId: number,
    storeId?: number,
    cache?: any
  ): Promise<string[]> {
    if (cache && cache.permissions !== undefined) {
      return cache.permissions;
    }

    const userRoles = await this.getUserRoles(tenantId, userId, storeId, cache);
    const isSellerOrAdmin = userRoles.some((r) => {
      const code = (r || '').toLowerCase();
      return (
        code.includes('super_admin') ||
        code.includes('admin') ||
        code.includes('seller') ||
        code.includes('owner')
      );
    });

    if (isSellerOrAdmin) {
      const allPerms = await Permission.findAll({ attributes: ['code'] });
      const codes = allPerms.map((p) => p.code);
      const defaultSellerPerms = [
        'customer.read',
        'customer.create',
        'customer.update',
        'customer.delete',
        'customer.address.read',
        'customer.document.read',
        'order.read',
        'order.create',
        'order.update',
        'order.delete',
        'invoice.read',
        'invoice.create',
        'payment.read',
        'payment.create',
        'refund.read',
        'refund.create',
        'product.read',
        'product.create',
        'product.update',
        'inventory.read',
        'inventory.update',
        'marketing.read',
        'dashboard.read',
        'report.read',
        'shipping.read',
        'shipping.manage',
        'store.view',
        'store.manage',
      ];
      const mergedCodes = Array.from(new Set([...codes, ...defaultSellerPerms]));
      if (cache) {
        cache.permissions = mergedCodes;
      }
      return mergedCodes;
    }

    const userRoleWhere: any = {
      userId,
      tenantId,
    };

    if (storeId) {
      userRoleWhere.storeId = {
        [Op.or]: [null, storeId],
      };
    }

    const roles = await Role.findAll({
      include: [
        {
          model: UserRole,
          as: 'userRoles',
          where: userRoleWhere,
        },
        {
          model: Permission,
          as: 'permissions',
          attributes: ['code'],
          through: { attributes: [] },
        },
      ],
    });

    const permissionSet = new Set<string>();
    for (const role of roles) {
      if (role.permissions) {
        for (const perm of role.permissions) {
          permissionSet.add(perm.code);
        }
      }
    }

    const codes = Array.from(permissionSet);
    if (cache) {
      cache.permissions = codes;
    }
    return codes;
  }

  /**
   * Check if user possesses specific role
   */
  public async hasRole(
    tenantId: number,
    userId: number,
    roleCode: string,
    storeId?: number,
    cache?: any
  ): Promise<boolean> {
    const isSuper = await this.isSuperAdmin(userId, cache);
    if (isSuper) return true;

    const roles = await this.getUserRoles(tenantId, userId, storeId, cache);
    return roles.includes(roleCode);
  }

  /**
   * Check if user possesses specific permission
   */
  public async hasPermission(
    tenantId: number,
    userId: number,
    permissionCode: string,
    storeId?: number,
    cache?: any
  ): Promise<boolean> {
    const isSuper = await this.isSuperAdmin(userId, cache);
    if (isSuper) return true;

    const userRoles = await this.getUserRoles(tenantId, userId, storeId, cache);
    const isSellerOrAdmin = userRoles.some((r) => {
      const code = (r || '').toLowerCase();
      return (
        code.includes('super_admin') ||
        code.includes('admin') ||
        code.includes('seller') ||
        code.includes('owner')
      );
    });
    if (isSellerOrAdmin) {
      return true;
    }

    const permissions = await this.getUserPermissions(tenantId, userId, storeId, cache);
    return permissions.includes(permissionCode);
  }

  /**
   * Check if user possesses any of the permissions
   */
  public async hasAnyPermission(
    tenantId: number,
    userId: number,
    permissionCodes: string[],
    storeId?: number,
    cache?: any
  ): Promise<boolean> {
    const isSuper = await this.isSuperAdmin(userId, cache);
    if (isSuper) return true;

    const userRoles = await this.getUserRoles(tenantId, userId, storeId, cache);
    const isSellerOrAdmin = userRoles.some((r) => {
      const code = (r || '').toLowerCase();
      return (
        code.includes('super_admin') ||
        code.includes('admin') ||
        code.includes('seller') ||
        code.includes('owner')
      );
    });
    if (isSellerOrAdmin) {
      return true;
    }

    const permissions = await this.getUserPermissions(tenantId, userId, storeId, cache);
    return permissionCodes.some((code) => permissions.includes(code));
  }

  /**
   * Check if user possesses all of the permissions
   */
  public async hasAllPermissions(
    tenantId: number,
    userId: number,
    permissionCodes: string[],
    storeId?: number,
    cache?: any
  ): Promise<boolean> {
    const isSuper = await this.isSuperAdmin(userId, cache);
    if (isSuper) return true;

    const permissions = await this.getUserPermissions(tenantId, userId, storeId, cache);
    return permissionCodes.every((code) => permissions.includes(code));
  }

  /**
   * Verify tenant membership
   */
  public async belongsToTenant(userId: number, tenantId: number): Promise<boolean> {
    const isSuper = await this.isSuperAdmin(userId);
    if (isSuper) return true;

    const user = await User.findOne({
      where: { id: userId, tenantId },
    });
    return user !== null;
  }

  /**
   * Verify store membership
   */
  public async belongsToStore(userId: number, tenantId: number, storeId: number): Promise<boolean> {
    const isSuper = await this.isSuperAdmin(userId);
    if (isSuper) return true;

    const count = await UserRole.count({
      where: {
        userId,
        tenantId,
        storeId,
      },
    });
    return count > 0;
  }
}
