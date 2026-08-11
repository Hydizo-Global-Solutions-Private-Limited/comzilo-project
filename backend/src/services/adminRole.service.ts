import { Role, Permission, RolePermission, UserRole, User } from '../database/models';
import { sequelize } from '../config/database';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '../shared/errors/AppError';
import { createAuditLog } from '../utils/auditHelper';
import { Op } from 'sequelize';

export interface CreateRoleInput {
  code: string;
  name: string;
  description?: string;
  priority?: number;
  status?: 'active' | 'inactive';
  permissionIds?: number[];
  permissionCodes?: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  priority?: number;
  status?: 'active' | 'inactive';
  permissionIds?: number[];
  permissionCodes?: string[];
}

export class AdminRoleService {
  public async listRoles(): Promise<any[]> {
    const roles = await Role.findAll({
      order: [['id', 'ASC']],
    });

    const result = [];
    for (const r of roles) {
      const permCount = await RolePermission.count({ where: { roleId: r.id } });
      const userCount = await UserRole.count({ where: { roleId: r.id } });

      result.push({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description || '',
        isSystem: Boolean(r.isSystem),
        priority: (r as any).priority || 1,
        status: (r as any).status || 'active',
        permissionCount: permCount,
        userCount,
        createdAt: r.createdAt,
      });
    }

    return result;
  }

  public async getRoleById(id: number): Promise<any> {
    const role = await Role.findByPk(id);
    if (!role) {
      throw new NotFoundError(`Role with ID ${id} not found.`);
    }

    const rolePerms = await RolePermission.findAll({
      where: { roleId: id },
    });

    const permIds = rolePerms.map((rp: any) => rp.permissionId);

    let permissions: any[] = [];
    if (permIds.length > 0) {
      const foundPerms = await Permission.findAll({
        where: { id: { [Op.in]: permIds } },
      });
      permissions = foundPerms.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.code.split('.')[0],
      }));
    }

    const foundPermIds = permissions.map((p) => p.id);
    const foundPermCodes = permissions.map((p) => p.code);

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description || '',
      isSystem: Boolean(role.isSystem),
      priority: (role as any).priority || 1,
      status: (role as any).status || 'active',
      permissionIds: foundPermIds,
      permissionCodes: foundPermCodes,
      permissions,
      createdAt: role.createdAt,
    };
  }

  public async createRole(input: CreateRoleInput, context: any): Promise<any> {
    if (!input.name || !input.name.trim()) {
      throw new ValidationError('Role Name is required.');
    }

    const rawCode = (input.code || input.name.toLowerCase().replace(/\s+/g, '_')).trim();
    const existing = await Role.findOne({ where: { code: rawCode } });
    if (existing) {
      throw new ConflictError(`Role code '${rawCode}' already exists.`);
    }

    const t = await sequelize.transaction();

    try {
      const role = await Role.create(
        {
          code: rawCode,
          name: input.name.trim(),
          description: (input.description || '').trim(),
          isSystem: false,
          priority: input.priority || 10,
          status: input.status || 'active',
        } as any,
        { transaction: t }
      );

      // Handle permission mappings
      let permIdsToAdd: number[] = input.permissionIds || [];

      if (input.permissionCodes && input.permissionCodes.length > 0) {
        const foundPerms = await Permission.findAll({
          where: { code: { [Op.in]: input.permissionCodes } },
          transaction: t,
        });
        const foundIds = foundPerms.map((p) => p.id);
        permIdsToAdd = Array.from(new Set([...permIdsToAdd, ...foundIds]));
      }

      if (permIdsToAdd.length > 0) {
        const mappings = permIdsToAdd.map((permId) => ({
          roleId: role.id,
          permissionId: permId,
          tenantId: 1,
        }));
        await RolePermission.bulkCreate(mappings, { transaction: t });
      }

      await t.commit();

      // Audit Log
      await createAuditLog(
        {
          action: 'role.created',
          entityType: 'role',
          entityId: String(role.id),
          newValues: { code: role.code, name: role.name, permissionsCount: permIdsToAdd.length },
        },
        context
      );

      return this.getRoleById(role.id);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  public async updateRole(id: number, input: UpdateRoleInput, context: any): Promise<any> {
    const role = await Role.findByPk(id);
    if (!role) {
      throw new NotFoundError(`Role with ID ${id} not found.`);
    }

    if (input.name !== undefined) role.name = input.name.trim();
    if (input.description !== undefined) role.description = input.description.trim();
    if (input.priority !== undefined) (role as any).priority = input.priority;
    if (input.status !== undefined) (role as any).status = input.status;

    const t = await sequelize.transaction();

    try {
      await role.save({ transaction: t });

      if (input.permissionIds !== undefined || input.permissionCodes !== undefined) {
        let permIdsToAdd: number[] = input.permissionIds || [];

        if (input.permissionCodes && input.permissionCodes.length > 0) {
          const foundPerms = await Permission.findAll({
            where: { code: { [Op.in]: input.permissionCodes } },
            transaction: t,
          });
          const foundIds = foundPerms.map((p) => p.id);
          permIdsToAdd = Array.from(new Set([...permIdsToAdd, ...foundIds]));
        }

        // Replace mappings
        await RolePermission.destroy({ where: { roleId: role.id }, transaction: t });

        if (permIdsToAdd.length > 0) {
          const mappings = permIdsToAdd.map((permId) => ({
            roleId: role.id,
            permissionId: permId,
            tenantId: 1,
          }));
          await RolePermission.bulkCreate(mappings, { transaction: t });
        }
      }

      await t.commit();

      // Audit Log
      await createAuditLog(
        {
          action: 'role.updated',
          entityType: 'role',
          entityId: String(role.id),
          newValues: { name: role.name, status: (role as any).status },
        },
        context
      );

      return this.getRoleById(role.id);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  public async deleteRole(id: number, context: any): Promise<void> {
    const role = await Role.findByPk(id);
    if (!role) {
      throw new NotFoundError(`Role with ID ${id} not found.`);
    }

    // Protection 1: Cannot delete SUPER_ADMIN role
    if (role.code === 'super_admin' || Boolean(role.isSystem)) {
      throw new ForbiddenError('System Root Roles (SUPER_ADMIN) cannot be deleted.');
    }

    // Protection 2: Cannot delete role assigned to active users
    const userCount = await UserRole.count({ where: { roleId: id } });
    if (userCount > 0) {
      throw new ForbiddenError(
        `Cannot delete role '${role.name}' because it is assigned to ${userCount} active users.`
      );
    }

    const t = await sequelize.transaction();

    try {
      await RolePermission.destroy({ where: { roleId: id }, transaction: t });
      await role.destroy({ transaction: t });
      await t.commit();

      // Audit Log
      await createAuditLog(
        {
          action: 'role.deleted',
          entityType: 'role',
          entityId: String(id),
          oldValues: { code: role.code, name: role.name },
        },
        context
      );
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  public async listAllPermissions(): Promise<any> {
    const permissions = await Permission.findAll({
      order: [['code', 'ASC']],
    });

    const grouped: { [category: string]: any[] } = {};

    permissions.forEach((p) => {
      const category = p.code.split('.')[0] || 'general';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description || '',
        action: p.code.split('.')[1] || 'access',
      });
    });

    return {
      total: permissions.length,
      categories: grouped,
      permissions: permissions.map((p) => ({ id: p.id, code: p.code, name: p.name })),
    };
  }

  public async assignUserRole(userId: number, roleCode: string, context: any): Promise<any> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found.`);
    }

    let role = await Role.findOne({ where: { code: roleCode.toLowerCase().trim() } });
    if (!role) {
      role = await Role.findOne({ where: { code: { [Op.like]: `%${roleCode.toLowerCase()}%` } } });
    }
    if (!role) {
      throw new NotFoundError(`Role with code '${roleCode}' not found.`);
    }

    await UserRole.destroy({ where: { userId } });
    await UserRole.create({
      tenantId: user.tenantId || 1,
      userId: user.id,
      roleId: role.id,
      assignedAt: new Date(),
      assignedBy: context?.authenticatedUserId || null,
    });

    // Audit Log
    await createAuditLog(
      {
        action: 'user.role_assigned',
        entityType: 'user',
        entityId: String(userId),
        newValues: { roleId: role.id, roleCode: role.code },
      },
      context
    );

    return { userId, roleId: role.id, roleCode: role.code };
  }
}
