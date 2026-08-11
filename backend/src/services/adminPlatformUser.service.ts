import { User, UserRole, UserProfile, Role, Tenant } from '../database/models';
import { sequelize } from '../config/database';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '../shared/errors/AppError';
import { createAuditLog } from '../utils/auditHelper';
import { sendSellerOnboardingEmail, generateSecureTempPassword } from '../utils/emailHelper';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

export interface CreatePlatformUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roleCode: string; // SUPER_ADMIN, PLATFORM_ADMIN, PLATFORM_OPERATIONS, SUPPORT, FINANCE, READ_ONLY
  status: 'active' | 'inactive';
}

export interface UpdatePlatformUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  roleCode?: string;
  status?: 'active' | 'inactive';
}

export class AdminPlatformUserService {
  public async listPlatformUsers(params: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: any[]; total: number; page: number; limit: number }> {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 10);
    const offset = (page - 1) * limit;

    const where: any = {};

    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      where[Op.or] = [
        { firstName: { [Op.like]: q } },
        { lastName: { [Op.like]: q } },
        { email: { [Op.like]: q } },
      ];
    }

    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }

    // Platform Users belong to tenant 1 or main system roles
    const { rows: users, count: total } = await User.findAndCountAll({
      where,
      include: [
        {
          model: UserRole,
          as: 'userRoles',
          include: [{ model: Role, as: 'role' }],
        },
        {
          model: UserProfile,
          as: 'profile',
        },
      ],
      order: [['id', 'ASC']],
      limit,
      offset,
      distinct: true,
    });

    const formattedUsers = users.map((u: any) => {
      const primaryRole =
        u.userRoles && u.userRoles.length > 0 ? u.userRoles[0].role?.code : 'SUPER_ADMIN';
      const roleName =
        u.userRoles && u.userRoles.length > 0 ? u.userRoles[0].role?.name : 'Super Admin';
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;

      return {
        id: u.id,
        uuid: u.uuid,
        firstName: u.firstName,
        lastName: u.lastName,
        name,
        email: u.email,
        phone: u.mobile || '',
        role: (primaryRole || 'SUPER_ADMIN').toUpperCase(),
        roleName,
        status: u.status === 'active' ? 'Active' : 'Inactive',
        rawStatus: u.status,
        mustChangePassword: Boolean(u.mustChangePassword),
        createdAt: u.createdAt,
      };
    });

    // Filter by role if requested
    let finalUsers = formattedUsers;
    if (params.role && params.role !== 'all') {
      finalUsers = formattedUsers.filter(
        (u) => u.role.toLowerCase() === params.role!.toLowerCase()
      );
    }

    return {
      users: finalUsers,
      total: finalUsers.length !== formattedUsers.length ? finalUsers.length : total,
      page,
      limit,
    };
  }

  public async getPlatformUserById(id: number): Promise<any> {
    const user = await User.findByPk(id, {
      include: [
        {
          model: UserRole,
          as: 'userRoles',
          include: [{ model: Role, as: 'role' }],
        },
        {
          model: UserProfile,
          as: 'profile',
        },
      ],
    });

    if (!user) {
      throw new NotFoundError(`Platform User with ID ${id} not found.`);
    }

    const primaryRole = (user as any).userRoles?.[0]?.role?.code || 'SUPER_ADMIN';
    return {
      id: user.id,
      uuid: user.uuid,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      phone: user.mobile || '',
      role: primaryRole.toUpperCase(),
      status: user.status === 'active' ? 'Active' : 'Inactive',
      rawStatus: user.status,
      mustChangePassword: Boolean(user.mustChangePassword),
      createdAt: user.createdAt,
    };
  }

  public async createPlatformUser(input: CreatePlatformUserInput, context: any): Promise<any> {
    if (!input.firstName || !input.firstName.trim()) {
      throw new ValidationError('First Name is required.');
    }
    if (!input.email || !input.email.trim()) {
      throw new ValidationError('Email address is required.');
    }

    const existingEmail = await User.findOne({ where: { email: input.email.trim() } });
    if (existingEmail) {
      throw new ConflictError(`A user with email '${input.email.trim()}' already exists.`);
    }

    const tempPassword = generateSecureTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const t = await sequelize.transaction();

    try {
      const user = await User.create(
        {
          tenantId: 1, // Main Root Tenant
          uuid: uuidv4(),
          email: input.email.trim(),
          passwordHash,
          firstName: input.firstName.trim(),
          lastName: (input.lastName || '').trim(),
          mobile: input.phone || null,
          status: input.status || 'active',
          mustChangePassword: true,
        },
        { transaction: t }
      );

      await UserProfile.create(
        {
          tenantId: 1,
          userId: user.id,
          metadata: {
            isPlatformUser: true,
            createdVia: 'SuperAdminPanel',
          },
        },
        { transaction: t }
      );

      // Find or assign role
      const requestedRoleCode = (input.roleCode || 'super_admin').toLowerCase().trim();
      let role = await Role.findOne({ where: { code: requestedRoleCode }, transaction: t });

      if (!role) {
        role = await Role.findOne({
          where: { code: { [Op.like]: `%${requestedRoleCode}%` } },
          transaction: t,
        });
      }

      if (!role) {
        role = await Role.findOne({ where: { code: 'super_admin' }, transaction: t });
      }

      if (role) {
        await UserRole.create(
          {
            tenantId: 1,
            userId: user.id,
            roleId: role.id,
            assignedAt: new Date(),
            assignedBy: context?.authenticatedUserId || null,
          },
          { transaction: t }
        );
      }

      await t.commit();

      // Audit Log
      await createAuditLog(
        {
          action: 'user.platform_created',
          entityType: 'user',
          entityId: String(user.id),
          newValues: {
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: input.roleCode,
          },
        },
        context
      );

      // Dispatch Credentials Email
      try {
        await sendSellerOnboardingEmail({
          tenantId: 1,
          recipientEmail: user.email,
          ownerName: `${user.firstName} ${user.lastName}`.trim(),
          storeName: 'Comzilo Super Admin Portal',
          tempPassword,
          loginUrl: 'http://localhost:4200/login',
        });
      } catch (emailErr: any) {
        console.error(
          '[AdminPlatformUserService] Failed to send credentials email:',
          emailErr.message
        );
      }

      return {
        id: user.id,
        uuid: user.uuid,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        phone: user.mobile,
        role: (input.roleCode || 'SUPER_ADMIN').toUpperCase(),
        status: user.status === 'active' ? 'Active' : 'Inactive',
        tempPassword,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  public async updatePlatformUser(
    id: number,
    input: UpdatePlatformUserInput,
    context: any
  ): Promise<any> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundError(`Platform User with ID ${id} not found.`);
    }

    if (input.email && input.email.trim() !== user.email) {
      const existing = await User.findOne({
        where: { email: input.email.trim(), id: { [Op.ne]: id } },
      });
      if (existing) {
        throw new ConflictError(`Email '${input.email.trim()}' is already in use by another user.`);
      }
      user.email = input.email.trim();
    }

    if (input.firstName !== undefined) user.firstName = input.firstName.trim();
    if (input.lastName !== undefined) user.lastName = input.lastName.trim();
    if (input.phone !== undefined) user.mobile = input.phone.trim();
    if (input.status !== undefined)
      user.status = input.status === 'inactive' ? 'disabled' : (input.status as any);

    await user.save();

    // Update Role if provided
    if (input.roleCode) {
      const requestedRoleCode = input.roleCode.toLowerCase().trim();
      let role = await Role.findOne({ where: { code: requestedRoleCode } });
      if (!role) {
        role = await Role.findOne({ where: { code: { [Op.like]: `%${requestedRoleCode}%` } } });
      }
      if (!role) {
        role = await Role.findOne({ where: { code: 'super_admin' } });
      }

      if (role) {
        await UserRole.destroy({ where: { userId: user.id } });
        await UserRole.create({
          tenantId: 1,
          userId: user.id,
          roleId: role.id,
          assignedAt: new Date(),
          assignedBy: context?.authenticatedUserId || null,
        });
      }
    }

    // Audit Log
    await createAuditLog(
      {
        action: 'user.platform_updated',
        entityType: 'user',
        entityId: String(user.id),
        newValues: { email: user.email, status: user.status, role: input.roleCode },
      },
      context
    );

    return this.getPlatformUserById(user.id);
  }

  public async resetPassword(
    id: number,
    context: any
  ): Promise<{ tempPassword: string; messageId?: string }> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundError(`Platform User with ID ${id} not found.`);
    }

    const tempPassword = generateSecureTempPassword();
    user.passwordHash = await bcrypt.hash(tempPassword, 10);
    user.mustChangePassword = true;
    await user.save();

    // Send Credentials Email
    const emailRes = await sendSellerOnboardingEmail({
      tenantId: user.tenantId || 1,
      recipientEmail: user.email,
      ownerName:
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Platform Administrator',
      storeName: 'Comzilo Super Admin Portal',
      tempPassword,
      loginUrl: 'http://localhost:4200/login',
    });

    // Audit Log
    await createAuditLog(
      {
        action: 'user.platform_password_reset',
        entityType: 'user',
        entityId: String(user.id),
        newValues: { messageId: emailRes.messageId, recipient: user.email },
      },
      context
    );

    return { tempPassword, messageId: emailRes.messageId };
  }

  public async deletePlatformUser(id: number, context: any): Promise<void> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundError(`Platform User with ID ${id} not found.`);
    }

    // Rule 1: Current logged in Super Admin cannot delete himself
    if (context?.authenticatedUserId && Number(context.authenticatedUserId) === Number(id)) {
      throw new ForbiddenError('You cannot delete your own active Super Admin account.');
    }

    // Rule 2: Cannot delete the last remaining Super Admin
    const superAdminCount = await User.count({ where: { status: 'active' } });
    if (superAdminCount <= 1) {
      throw new ForbiddenError('Cannot delete the last remaining root Super Admin account.');
    }

    await UserRole.destroy({ where: { userId: id } });
    await UserProfile.destroy({ where: { userId: id } });
    await user.destroy();

    // Audit Log
    await createAuditLog(
      {
        action: 'user.platform_deleted',
        entityType: 'user',
        entityId: String(id),
        oldValues: { email: user.email, name: `${user.firstName} ${user.lastName}` },
      },
      context
    );
  }
}
