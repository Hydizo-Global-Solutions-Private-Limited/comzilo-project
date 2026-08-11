import { Request, Response, NextFunction } from 'express';
import { User, UserRole, UserProfile, Tenant, Store, Role } from '../database/models';
import { sequelize } from '../config/database';
import { AdminSellerService } from '../services/adminSeller.service';
import { NotificationService } from '../services/notification.service';
import { EmailQueueManager } from '../services/emailQueueManager';
import { success } from '../shared/responses';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';
import { createAuditLog } from '../utils/auditHelper';
import { Op } from 'sequelize';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import { sendSellerOnboardingEmail, generateSecureTempPassword } from '../utils/emailHelper';

const sellerService = new AdminSellerService();

export const createSellerValidationSchema = Joi.object({
  ownerName: Joi.string().required().min(2).max(100),
  email: Joi.string().email().required(),
  phone: Joi.string().required().min(8).max(20),
  password: Joi.string().required().min(6).max(100),
  businessName: Joi.string().required().min(2).max(100),
  businessType: Joi.string()
    .valid('Retail', 'Wholesale', 'Manufacturer', 'Distributor', 'Other')
    .default('Retail'),
  gstNumber: Joi.string().allow('', null).max(15),
  panNumber: Joi.string().allow('', null).max(10),
  addressLine1: Joi.string().allow('', null).max(255),
  addressLine2: Joi.string().allow('', null).max(255),
  city: Joi.string().allow('', null).max(100),
  state: Joi.string().allow('', null).max(100),
  country: Joi.string().allow('', null).max(100),
  postalCode: Joi.string().allow('', null).max(20),
  tenantConfig: Joi.object({
    mode: Joi.string().valid('assign', 'create').required(),
    tenantId: Joi.number().optional(),
    newName: Joi.string().optional(),
    newSlug: Joi.string().optional(),
    newStatus: Joi.string().valid('pending', 'active', 'suspended', 'cancelled').optional(),
  }).required(),
  storeConfig: Joi.object({
    mode: Joi.string().valid('assign', 'create').required(),
    storeId: Joi.number().optional(),
    newName: Joi.string().optional(),
    newCode: Joi.string().optional(),
    newAddress: Joi.string().optional(),
    newStatus: Joi.string().valid('active', 'suspended').optional(),
  }).required(),
  roleCode: Joi.string().valid('tenant_owner', 'manager', 'staff').required(),
  status: Joi.string()
    .valid('invited', 'active', 'suspended', 'locked', 'disabled')
    .default('active'),
});

export const updateSellerValidationSchema = Joi.object({
  ownerName: Joi.string().optional().min(2).max(100),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional().min(8).max(20),
  businessName: Joi.string().optional().min(2).max(100),
  businessType: Joi.string()
    .valid('Retail', 'Wholesale', 'Manufacturer', 'Distributor', 'Other')
    .optional(),
  gstNumber: Joi.string().allow('', null).max(15).optional(),
  panNumber: Joi.string().allow('', null).max(10).optional(),
  addressLine1: Joi.string().allow('', null).max(255).optional(),
  addressLine2: Joi.string().allow('', null).max(255).optional(),
  city: Joi.string().allow('', null).max(100).optional(),
  state: Joi.string().allow('', null).max(100).optional(),
  country: Joi.string().allow('', null).max(100).optional(),
  postalCode: Joi.string().allow('', null).max(20).optional(),
  storeId: Joi.number().allow(null).optional(),
  roleCode: Joi.string().valid('tenant_owner', 'manager', 'staff').optional(),
  status: Joi.string().valid('invited', 'active', 'suspended', 'locked', 'disabled').optional(),
});

export class AdminSellerController {
  public listSellers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG STEP 1] Controller Reached: GET ${req.originalUrl || req.url}`);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';
      const status = (req.query.status as string) || '';
      const roleCode = (req.query.role as string) || '';

      const rawTenantId = req.query.tenantId as string;
      const rawStoreId = req.query.storeId as string;

      const tenantId =
        rawTenantId && rawTenantId.trim() !== '' && !isNaN(Number(rawTenantId))
          ? Number(rawTenantId)
          : null;
      const storeId =
        rawStoreId && rawStoreId.trim() !== '' && !isNaN(Number(rawStoreId))
          ? Number(rawStoreId)
          : null;
      const sort = (req.query.sort as string) || 'newest';

      const offset = (page - 1) * limit;

      // Build User where clause
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereClause: any = {};
      if (status) {
        whereClause.status = status;
      }
      if (tenantId) {
        whereClause.tenantId = tenantId;
      }

      if (search) {
        whereClause[Op.or] = [
          { firstName: { [Op.like]: `%${search}%` } },
          { lastName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { mobile: { [Op.like]: `%${search}%` } },
        ];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userRoleWhere: any = {};
      if (storeId) {
        userRoleWhere.storeId = storeId;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roleWhere: any = {};
      if (roleCode) {
        roleWhere.code = roleCode;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderClause: any[] =
        sort === 'oldest' ? [['createdAt', 'ASC']] : [['createdAt', 'DESC']];

      const includeConfig = [
        {
          model: UserProfile,
          as: 'profile',
          required: false,
        },
        {
          model: Tenant,
          as: 'tenant',
          required: false,
        },
        {
          model: UserRole,
          as: 'userRoles',
          where: Object.keys(userRoleWhere).length ? userRoleWhere : undefined,
          required: Object.keys(userRoleWhere).length > 0,
          include: [
            {
              model: Role,
              as: 'role',
              where: Object.keys(roleWhere).length ? roleWhere : undefined,
              required: Object.keys(roleWhere).length > 0,
            },
            {
              model: Store,
              as: 'store',
              required: false,
            },
          ],
        },
      ];

      // eslint-disable-next-line no-console
      console.log('[DEBUG STEP 2] Executing User.findAndCountAll with options:', {
        whereClause: JSON.stringify(whereClause),
        userRoleWhere: JSON.stringify(userRoleWhere),
        roleWhere: JSON.stringify(roleWhere),
        limit,
        offset,
        sort,
      });

      const { count, rows } = await User.findAndCountAll({
        where: whereClause,
        include: includeConfig,
        limit,
        offset,
        order: orderClause,
        distinct: true,
      });

      // eslint-disable-next-line no-console
      console.log(
        `[DEBUG STEP 2 COMPLETE] User.findAndCountAll Result -> count: ${count}, rows.length: ${rows.length}`
      );

      success(res, 'Sellers list retrieved successfully', {
        sellers: rows,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[DEBUG STEP 3 ERROR] User.findAndCountAll Exception:', {
        name: error?.name,
        message: error?.message,
        sql: error?.sql,
        stack: error?.stack,
      });
      next(error);
    }
  };

  public getSeller = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const seller = await User.findOne({
        where: { id },
        include: [
          {
            model: UserProfile,
            as: 'profile',
          },
          {
            model: Tenant,
            as: 'tenant',
          },
          {
            model: UserRole,
            as: 'userRoles',
            include: [
              {
                model: Role,
                as: 'role',
              },
              {
                model: Store,
                as: 'store',
              },
            ],
          },
        ],
      });

      if (!seller) {
        throw new NotFoundError('Seller not found');
      }

      success(res, 'Seller details retrieved successfully', seller);
    } catch (error) {
      next(error);
    }
  };

  public createSeller = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = createSellerValidationSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const tempPassword = value.password || generateSecureTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const seller = await sellerService.createSeller(
        {
          ...value,
          passwordHash,
          mustChangePassword: true,
        },
        req.context
      );

      // Enqueue Seller Approval Email via Email Queue Engine (Database First + Gmail SMTP)
      const emailQueueManager = new EmailQueueManager();
      await emailQueueManager.addJob({
        tenantId: seller.tenantId || 1,
        triggerEvent: 'seller_approval',
        recipient: seller.email,
        payload: {
          sellerName: value.ownerName,
          sellerEmail: seller.email,
          temporaryPassword: tempPassword,
          storeName: value.businessName,
          sellerLoginUrl: 'http://localhost:5173/login',
        },
        delayMinutes: 0,
      });

      // Process pending queue jobs immediately
      emailQueueManager
        .processPendingJobs()
        .catch((err) => console.error('[EmailQueue] Process error:', err));

      // Log direct audit seller creation
      await createAuditLog(
        {
          action: 'seller.created',
          entityType: 'user',
          entityId: String(seller.id),
        },
        req.context
      );

      success(res, 'Seller created successfully. Login credentials have been emailed.', {
        seller,
        temporaryPassword: tempPassword,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateSeller = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = updateSellerValidationSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const user = await User.findByPk(id);
      if (!user) {
        throw new NotFoundError('Seller not found');
      }

      if (value.email && user.email !== value.email) {
        if (user.emailVerifiedAt) {
          throw new ValidationError('Email cannot be changed as it is already verified');
        }
      }

      const t = await sequelize.transaction();

      try {
        if (value.ownerName) {
          const [firstName, ...lastNameParts] = value.ownerName.trim().split(' ');
          const lastName = lastNameParts.join(' ') || ' ';
          user.firstName = firstName;
          user.lastName = lastName;
        }

        if (value.email) user.email = value.email;
        if (value.phone) user.mobile = value.phone;
        if (value.status) user.status = value.status;

        await user.save({ transaction: t });

        // Update Store / Role mappings if requested
        if (value.storeId !== undefined || value.roleCode !== undefined) {
          const userRole = await UserRole.findOne({ where: { userId: user.id } });
          if (userRole) {
            if (value.storeId !== undefined) userRole.storeId = value.storeId;
            if (value.roleCode) {
              const role = await Role.findOne({ where: { code: value.roleCode } });
              if (role) {
                userRole.roleId = role.id;
              }
            }
            await userRole.save({ transaction: t });
          }
        }

        // Update Profile
        const profile = await UserProfile.findOne({ where: { userId: user.id } });
        if (profile) {
          if (value.addressLine1 !== undefined) profile.addressLine1 = value.addressLine1;
          if (value.addressLine2 !== undefined) profile.addressLine2 = value.addressLine2;
          if (value.city !== undefined) profile.city = value.city;
          if (value.state !== undefined) profile.state = value.state;
          if (value.country !== undefined) profile.country = value.country;
          if (value.postalCode !== undefined) profile.postalCode = value.postalCode;

          const metadata = { ...(profile.metadata || {}) };
          if (value.businessName) metadata.businessName = value.businessName;
          if (value.businessType) metadata.businessType = value.businessType;
          if (value.gstNumber !== undefined) metadata.gstNumber = value.gstNumber;
          if (value.panNumber !== undefined) metadata.panNumber = value.panNumber;

          profile.metadata = metadata;
          await profile.save({ transaction: t });
        }

        await t.commit();

        await createAuditLog(
          {
            action: 'seller.updated',
            entityType: 'user',
            entityId: String(user.id),
          },
          req.context
        );

        // Send Email Notification
        const notificationService = new NotificationService();
        await notificationService.sendNotification(user.tenantId, null, {
          userId: user.id,
          recipient: user.email,
          channel: 'email',
          title: 'Seller Account Updated',
          content: `Dear ${user.firstName}, your seller account details have been updated by the administrator.`,
        });

        success(res, 'Seller updated successfully', user);
      } catch (err) {
        await t.rollback();
        throw err;
      }
    } catch (error) {
      next(error);
    }
  };

  public updateSellerStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        throw new ValidationError('Status is required');
      }

      const user = await User.findByPk(id);
      if (!user) {
        throw new NotFoundError('Seller not found');
      }

      user.status = status;
      await user.save();

      await createAuditLog(
        {
          action: 'user.status_updated',
          entityType: 'user',
          entityId: String(user.id),
          newValues: { status },
        },
        req.context
      );

      success(res, 'Seller status updated successfully', user);
    } catch (error) {
      next(error);
    }
  };

  public suspendSeller = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        throw new ValidationError('Reason is required for suspension');
      }

      const user = await User.findByPk(id);
      if (!user) {
        throw new NotFoundError('Seller not found');
      }

      user.status = 'suspended';
      await user.save();

      await createAuditLog(
        {
          action: 'seller.suspended',
          entityType: 'user',
          entityId: String(user.id),
          newValues: { reason },
        },
        req.context
      );

      // Send Email Notification
      const notificationService = new NotificationService();
      await notificationService.sendNotification(user.tenantId, null, {
        userId: user.id,
        recipient: user.email,
        channel: 'email',
        title: 'Account Suspended',
        content: `Dear ${user.firstName}, your account has been suspended. Reason: ${reason}`,
      });

      success(res, 'Seller suspended successfully', user);
    } catch (error) {
      next(error);
    }
  };

  public activateSeller = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);
      if (!user) {
        throw new NotFoundError('Seller not found');
      }

      user.status = 'active';
      await user.save();

      await createAuditLog(
        {
          action: 'seller.activated',
          entityType: 'user',
          entityId: String(user.id),
        },
        req.context
      );

      // Send Email Notification
      const notificationService = new NotificationService();
      await notificationService.sendNotification(user.tenantId, null, {
        userId: user.id,
        recipient: user.email,
        channel: 'email',
        title: 'Account Activated',
        content: `Dear ${user.firstName}, your account has been activated. You can now log in again.`,
      });

      success(res, 'Seller activated successfully', user);
    } catch (error) {
      next(error);
    }
  };

  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);
      if (!user) {
        throw new NotFoundError('Seller not found');
      }

      const tempPassword =
        'Sel' +
        Math.floor(100 + Math.random() * 900) +
        'Reset!' +
        Math.floor(100 + Math.random() * 900);
      user.passwordHash = await bcrypt.hash(tempPassword, 10);
      user.mustChangePassword = true;
      await user.save();

      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(
          `[DEV MODE] Seller Password Reset: Email: ${user.email} | Temp Password: ${tempPassword}`
        );
      }

      await createAuditLog(
        {
          action: 'password.reset',
          entityType: 'user',
          entityId: String(user.id),
        },
        req.context
      );

      // Send Email Notification
      const notificationService = new NotificationService();
      await notificationService.sendNotification(user.tenantId, null, {
        userId: user.id,
        recipient: user.email,
        channel: 'email',
        title: 'Password Reset Notification',
        content: `Dear ${user.firstName}, your temporary password is: ${tempPassword}. Please change your password upon login.`,
      });

      success(res, 'Password reset successfully', {
        temporaryPassword: tempPassword,
        email: user.email,
      });
    } catch (error) {
      next(error);
    }
  };

  public resendCredentials = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id, {
        include: [{ model: Tenant, as: 'tenant' }],
      });
      if (!user) {
        throw new NotFoundError('Seller not found');
      }

      // 1. Generate secure random temporary password
      const tempPassword = generateSecureTempPassword();

      // 2. Hash password with bcrypt
      user.passwordHash = await bcrypt.hash(tempPassword, 10);
      user.mustChangePassword = true;
      await user.save();

      // 3. Find store name for email
      const store = await Store.findOne({ where: { tenantId: user.tenantId } });
      const storeName = store?.name || (user as any).tenant?.name || 'Comzilo Store';

      // 4. Send Real SMTP Email
      const emailRes = await sendSellerOnboardingEmail({
        tenantId: user.tenantId,
        recipientEmail: user.email,
        ownerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Seller',
        storeName,
        tempPassword,
      });

      await createAuditLog(
        {
          action: 'seller.credentials_resent',
          entityType: 'user',
          entityId: String(user.id),
          newValues: { messageId: emailRes.messageId, recipient: user.email },
        },
        req.context
      );

      success(res, 'Credentials email sent successfully via SMTP', {
        email: user.email,
        messageId: emailRes.messageId,
      });
    } catch (error) {
      next(error);
    }
  };

  public impersonateSeller = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);
      if (!user) {
        throw new NotFoundError('Seller not found');
      }

      await createAuditLog(
        {
          action: 'seller.impersonated',
          entityType: 'user',
          entityId: String(user.id),
        },
        req.context
      );

      success(res, 'Impersonation token generated (placeholder)', {
        impersonatedUserId: user.id,
        email: user.email,
        token: `impersonate_${user.uuid}_${Date.now()}`,
        message: 'Impersonation feature placeholder: Single-use seller session token ready.',
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteSeller = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);
      if (!user) {
        throw new NotFoundError('Seller not found');
      }

      await user.destroy(); // Paranoid soft delete

      await createAuditLog(
        {
          action: 'seller.deleted',
          entityType: 'user',
          entityId: String(user.id),
        },
        req.context
      );

      success(res, 'Seller deleted successfully', null);
    } catch (error) {
      next(error);
    }
  };
}
