import { Request, Response, NextFunction } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { AuthService } from '../services/auth.service';
import { success, created } from '../shared/responses';
import { User, Tenant, Store, UserRole, Role } from '../database/models';

export class AuthController {
  private readonly authService = new AuthService();

  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const user = await this.authService.register(tenantId, req.body, req.context);

      created(res, 'User registered successfully', {
        uuid: user.uuid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const clientContext = {
        ip: req.context.ipAddress || req.ip || '',
        userAgent: (req.context.userAgent || req.headers['user-agent'] || '') as string,
      };

      const result = await this.authService.login(tenantId, req.body, clientContext, req.context);

      let avatarUrl: string | null = (result.user as any).avatarUrl || (result.user as any).profileImage || null;
      try {
        const [cust]: any = await sequelize.query(
          'SELECT id FROM customers WHERE user_id = :uId AND deleted_at IS NULL ORDER BY id DESC LIMIT 1',
          { replacements: { uId: result.user.id }, type: QueryTypes.SELECT }
        );
        if (cust) {
          avatarUrl = (cust as any).avatar_url || (cust as any).profile_image || avatarUrl;
        }
      } catch {
        // Non-fatal if customer avatar columns are not in schema
      }

      // Look up customer's registered store/tenant details
      let customerTenantId: number | null = null;
      let customerStoreId: number | null = null;
      let customerStoreSlug: string | null = null;
      let customerStoreName: string | null = null;

      try {
        const userTenantId = (result.user as any).tenantId || (result.user as any).tenant_id || 1;
        if (userTenantId > 1) {
          const [custRec]: any = await sequelize.query(
            `SELECT c.tenant_id, c.store_id, s.slug as store_slug, s.name as store_name, t.slug as tenant_slug, t.name as tenant_name
             FROM customers c
             LEFT JOIN stores s ON c.store_id = s.id
             LEFT JOIN tenants t ON c.tenant_id = t.id
             WHERE (c.user_id = :uId OR c.email = :email) AND c.tenant_id = :userTenantId AND c.deleted_at IS NULL
             ORDER BY c.id DESC
             LIMIT 1`,
            { replacements: { uId: result.user.id, email: result.user.email, userTenantId }, type: QueryTypes.SELECT }
          );
          if (custRec) {
            customerTenantId = custRec.tenant_id ? Number(custRec.tenant_id) : null;
            customerStoreId = custRec.store_id ? Number(custRec.store_id) : null;
            customerStoreSlug = custRec.store_slug || custRec.tenant_slug || null;
            customerStoreName = custRec.store_name || custRec.tenant_name || null;
          }
        }
      } catch {
        // Non-fatal
      }

      success(res, 'Login successful', {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: {
          id: result.user.id,
          uuid: result.user.uuid,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          fullName:
            `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim() ||
            result.user.email,
          avatarUrl,
          profileImage: avatarUrl,
          emailVerifiedAt: result.user.emailVerifiedAt,
          status: result.user.status,
          mustChangePassword: result.user.mustChangePassword,
          tenantId: customerTenantId || result.user.tenantId,
          storeId: customerStoreId,
          storeSlug: customerStoreSlug,
          storeName: customerStoreName,
        },
        tenant: {
          uuid: result.tenant.uuid,
          name: customerStoreName || result.tenant.name,
          slug: customerStoreSlug || result.tenant.slug,
          tenantId: customerTenantId || result.user.tenantId,
          storeId: customerStoreId,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const { refreshToken } = req.body;
      await this.authService.logout(tenantId, refreshToken, req.context);
      success(res, 'Logout successful');
    } catch (error) {
      next(error);
    }
  };

  public logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const { refreshToken } = req.body;
      await this.authService.logoutAll(tenantId, refreshToken, req.context);
      success(res, 'Logout from all devices successful');
    } catch (error) {
      next(error);
    }
  };

  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const { refreshToken } = req.body;
      const clientContext = {
        ip: req.context.ipAddress || req.ip || '',
        userAgent: (req.context.userAgent || req.headers['user-agent'] || '') as string,
      };

      const result = await this.authService.refresh(
        tenantId,
        refreshToken,
        clientContext,
        req.context
      );

      success(res, 'Tokens refreshed successfully', {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      next(error);
    }
  };

  public requestPasswordReset = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const clientContext = {
        ip: req.context.ipAddress || req.ip || '',
        userAgent: (req.context.userAgent || req.headers['user-agent'] || '') as string,
        origin: (req.headers.origin || req.headers.referer || req.context.origin || '') as string,
      };

      const token = await this.authService.requestPasswordReset(
        tenantId,
        req.body.email,
        clientContext,
        req.context
      );

      success(res, 'If an account exists for this email, a password reset link has been sent.', {
        // Expose token only in development/test for unit/integration testing
        token: process.env.NODE_ENV === 'test' ? token : undefined,
      });
    } catch (error) {
      next(error);
    }
  };

  public validateResetToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token = String(req.query.token || '');
      const result = await this.authService.validateResetToken(token);
      if (!result.valid) {
        res.status(400).json({
          success: false,
          message: result.message || 'This password reset link is invalid or has expired.',
        });
        return;
      }
      success(res, 'Reset token is valid', { valid: true });
    } catch (error) {
      next(error);
    }
  };

  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      await this.authService.resetPassword(tenantId, req.body, req.context);
      success(res, 'Password has been reset successfully');
    } catch (error) {
      next(error);
    }
  };

  public changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const userId = req.context.authenticatedUserId!;
      await this.authService.changePassword(tenantId, userId, req.body, req.context);
      success(res, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  };

  public requestEmailVerification = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const userId = req.context.authenticatedUserId!;
      const otpCode = await this.authService.requestEmailVerification(
        tenantId,
        userId,
        req.context
      );

      success(res, 'Email verification OTP requested successfully', {
        // Expose OTP only in development/test for unit/integration testing
        otpCode: process.env.NODE_ENV === 'test' ? otpCode : undefined,
      });
    } catch (error) {
      next(error);
    }
  };

  public verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const userId = req.context.authenticatedUserId!;
      const { otpCode } = req.body;
      await this.authService.verifyEmail(tenantId, userId, otpCode, req.context);
      success(res, 'Email verified successfully');
    } catch (error) {
      next(error);
    }
  };

  public me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context.tenantId!;
      const userId = req.context.authenticatedUserId!;

      const user = await User.findOne({
        where: { id: userId, tenantId },
        include: ['profile'],
      });

      if (!user) {
        res.sendStatus(401);
        return;
      }

      const tenant = await Tenant.findByPk(tenantId);
      const store = await Store.findOne({ where: { tenantId } });
      const userRole = await UserRole.findOne({
        where: { userId, tenantId },
        include: [{ model: Role, as: 'role' }],
      });

      const roleName =
        (userRole as any)?.role?.name || (userRole as any)?.role?.code || 'Seller Owner';
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      const tenantName = tenant?.name || 'Comzilo Merchant';
      const storeName = store?.name || 'Main Store';
      const avatar = user.profile?.avatarUrl || null;

      success(res, 'Profile retrieved successfully', {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName,
        tenantId: user.tenantId,
        tenantName,
        storeName,
        role: roleName,
        avatar,
        emailVerifiedAt: user.emailVerifiedAt,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        user: {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName,
          status: user.status,
          mustChangePassword: user.mustChangePassword,
          role: roleName,
          avatar,
        },
        tenant: tenant
          ? {
              id: tenant.id,
              uuid: tenant.uuid,
              name: tenant.name,
              slug: tenant.slug,
            }
          : null,
        store: store
          ? {
              id: store.id,
              uuid: store.uuid,
              name: store.name,
              slug: store.slug,
            }
          : null,
        profile: user.profile
          ? {
              avatarUrl: user.profile.avatarUrl,
              gender: user.profile.gender,
              city: user.profile.city,
              country: user.profile.country,
            }
          : null,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.context.authenticatedUserId!;
      const user = await User.findByPk(userId);
      if (!user) {
        res.sendStatus(401);
        return;
      }

      if (req.body.firstName) user.firstName = req.body.firstName;
      if (req.body.lastName) user.lastName = req.body.lastName;
      if (req.body.email) user.email = req.body.email;
      if (req.body.phone || req.body.mobile)
        (user as any).mobile = req.body.phone || req.body.mobile;

      const imgUrl = req.body.avatarUrl || req.body.profileImage || req.body.avatar;
      if (imgUrl) {
        (user as any).avatarUrl = imgUrl;
        (user as any).profileImage = imgUrl;
        try {
          await sequelize.query(
            'UPDATE users SET avatar_url = :imgUrl, profile_image = :imgUrl WHERE id = :userId',
            { replacements: { imgUrl, userId }, type: QueryTypes.UPDATE }
          );
          await sequelize.query(
            'UPDATE customers SET avatar_url = :imgUrl, profile_image = :imgUrl WHERE user_id = :userId OR email = :email',
            { replacements: { imgUrl, userId, email: user.email }, type: QueryTypes.UPDATE }
          );
        } catch {
          // Non-fatal
        }
      }
      await user.save();

      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      const avatar = imgUrl || (user as any).avatarUrl || (user as any).profileImage || null;

      success(res, 'Profile updated successfully', {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName,
        phone: (user as any).mobile,
        mobile: (user as any).mobile,
        avatar,
        avatarUrl: avatar,
        profileImage: avatar,
      });
    } catch (error) {
      next(error);
    }
  };

  public getPublicStores = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stores: any = await sequelize.query(
        `SELECT s.id, s.name, s.slug, s.tenant_id, t.name as tenant_name, t.slug as tenant_slug
         FROM stores s
         JOIN tenants t ON s.tenant_id = t.id
         WHERE s.status = 'active' AND t.status = 'active'
         ORDER BY 
           CASE 
             WHEN t.slug = 'satish-trade' OR s.slug = 'satish-store' THEN 1
             ELSE 2
           END,
           t.name ASC,
           s.name ASC`,
        { type: QueryTypes.SELECT }
      );

      const formatted = stores.map((st: any) => ({
        id: st.id,
        name: st.name,
        slug: st.slug,
        tenantId: st.tenant_id,
        tenantName: st.tenant_name,
        tenantSlug: st.tenant_slug,
        displayName: st.tenant_name && st.tenant_name !== st.name
          ? `${st.tenant_name} (${st.name})`
          : st.name || st.tenant_name,
      }));

      success(res, 'Public stores retrieved successfully', formatted);
    } catch (error) {
      next(error);
    }
  };
}
