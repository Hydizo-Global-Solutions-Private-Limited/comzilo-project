/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { QueryTypes } from 'sequelize';
import jwt from 'jsonwebtoken';
import { sequelize } from '../config/database';
import { TenantNotFoundError } from '../shared/errors/AppError';
import { logger } from '../shared/logging/logger';
import { env } from '../config/env';

export const tenantResolver = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let tenantId: number | null = null;
    let tenantUuid: string | null = null;

    // 1. Resolve via headers
    const headerId = req.headers['x-tenant-id'] as string;
    const headerUuid = req.headers['x-tenant-uuid'] as string;
    const headerSlug = req.headers['x-tenant-slug'] as string;
    const headerStoreSlug = req.headers['x-store-slug'] as string;

    if (headerId && !isNaN(Number(headerId))) {
      const [results]: any = await sequelize.query(
        'SELECT id, uuid FROM tenants WHERE id = :id AND status = "active" LIMIT 1',
        {
          replacements: { id: Number(headerId) },
          type: QueryTypes.SELECT,
        }
      );
      if (results) {
        tenantId = Number(results.id);
        tenantUuid = results.uuid;
      }
    } else if (headerUuid) {
      const [results]: any = await sequelize.query(
        'SELECT id, uuid FROM tenants WHERE uuid = :uuid AND status = "active" LIMIT 1',
        {
          replacements: { uuid: headerUuid },
          type: QueryTypes.SELECT,
        }
      );
      if (results) {
        tenantId = Number(results.id);
        tenantUuid = results.uuid;
      }
    } else if (headerSlug || headerStoreSlug || req.body?.storeSlug || req.body?.storeName) {
      const rawInput = (headerSlug || headerStoreSlug || req.body?.storeSlug || req.body?.storeName || '').toString().trim();
      if (rawInput) {
        const slugified = rawInput.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const alphanumeric = rawInput.toLowerCase().replace(/[^a-z0-9]/g, '');
        const firstWord = rawInput.toLowerCase().split(/[\s-_]+/)[0];
        const likeFirst = firstWord && firstWord.length >= 3 ? `${firstWord}%` : '%nevermatch%';
        const likeAlpha = alphanumeric ? `%${alphanumeric}%` : '%nevermatch%';

        // First check matching tenant
        const [tenantRes]: any = await sequelize.query(
          `SELECT id, uuid, slug, name FROM tenants 
           WHERE status = "active" AND (
             slug = :rawInput OR slug = :slugified OR LOWER(name) = LOWER(:rawInput) OR LOWER(name) = :slugified OR
             slug LIKE :likeAlpha OR LOWER(name) LIKE :likeAlpha OR
             slug LIKE :likeFirst OR LOWER(name) LIKE :likeFirst
           ) ORDER BY 
             CASE 
               WHEN slug = :slugified THEN 1 
               WHEN LOWER(name) = LOWER(:rawInput) THEN 2 
               WHEN slug = :rawInput THEN 3 
               WHEN slug LIKE :likeAlpha THEN 4 
               ELSE 5 
             END LIMIT 1`,
          {
            replacements: { rawInput, slugified, likeAlpha, likeFirst },
            type: QueryTypes.SELECT,
          }
        );

        // Also check matching store
        const [storeRes]: any = await sequelize.query(
          `SELECT id, tenant_id, slug, name FROM stores 
           WHERE status = "active" AND (
             slug = :rawInput OR slug = :slugified OR LOWER(name) = LOWER(:rawInput) OR LOWER(name) = :slugified OR
             slug LIKE :likeAlpha OR LOWER(name) LIKE :likeAlpha OR
             slug LIKE :likeFirst OR LOWER(name) LIKE :likeFirst
           ) ORDER BY 
             CASE 
               WHEN slug = :slugified THEN 1 
               WHEN LOWER(name) = LOWER(:rawInput) THEN 2 
               WHEN slug = :rawInput THEN 3 
               WHEN slug LIKE :likeAlpha THEN 4 
               ELSE 5 
             END LIMIT 1`,
          {
            replacements: { rawInput, slugified, likeAlpha, likeFirst },
            type: QueryTypes.SELECT,
          }
        );

        if (tenantRes) {
          tenantId = Number(tenantRes.id);
          tenantUuid = tenantRes.uuid;
          if (storeRes && Number(storeRes.tenant_id) === tenantId) {
            req.context.storeId = Number(storeRes.id);
            req.context.storeSlug = storeRes.slug;
          } else {
            const [tStore]: any = await sequelize.query(
              'SELECT id, slug FROM stores WHERE tenant_id = :tId AND status = "active" ORDER BY id ASC LIMIT 1',
              { replacements: { tId: tenantId }, type: QueryTypes.SELECT }
            );
            if (tStore) {
              req.context.storeId = Number(tStore.id);
              req.context.storeSlug = tStore.slug;
            }
          }
        } else if (storeRes) {
          tenantId = Number(storeRes.tenant_id);
          req.context.storeId = Number(storeRes.id);
          req.context.storeSlug = storeRes.slug;
          const [tRes]: any = await sequelize.query(
            'SELECT id, uuid FROM tenants WHERE id = :tId AND status = "active" LIMIT 1',
            { replacements: { tId: tenantId }, type: QueryTypes.SELECT }
          );
          if (tRes) {
            tenantUuid = tRes.uuid;
          }
        }
      }
    }

    // 1.5 Resolve via Authorization Bearer token (for authenticated endpoints without tenant headers)
    if (!tenantId && req.headers.authorization?.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        let decoded: any;
        try {
          decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
        } catch {
          try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-jwt-key-for-comzilo-marketplace-2026');
          } catch {
            decoded = jwt.decode(token);
          }
        }
        if (decoded && decoded.tenantId) {
          const [tRes]: any = await sequelize.query(
            'SELECT id, uuid FROM tenants WHERE id = :tId AND status = "active" LIMIT 1',
            {
              replacements: { tId: decoded.tenantId },
              type: QueryTypes.SELECT,
            }
          );
          if (tRes) {
            tenantId = Number(tRes.id);
            tenantUuid = tRes.uuid;
          }
        }
      } catch {
        // Ignore token verification errors here; authenticate middleware will handle invalid tokens
      }
    }

    // 2. Resolve via User Email (for login/auth when headers are absent)
    let resolvedByEmail = false;
    if (!tenantId && req.body?.email && typeof req.body.email === 'string') {
      const inputEmail = req.body.email.toLowerCase().trim();
      const [userRes]: any = await sequelize.query(
        'SELECT tenant_id FROM users WHERE email = :email AND deleted_at IS NULL LIMIT 1',
        {
          replacements: { email: inputEmail },
          type: QueryTypes.SELECT,
        }
      );
      if (userRes) {
        const [tRes]: any = await sequelize.query(
          'SELECT id, uuid FROM tenants WHERE id = :tId AND status = "active" LIMIT 1',
          {
            replacements: { tId: userRes.tenant_id },
            type: QueryTypes.SELECT,
          }
        );
        if (tRes) {
          tenantId = Number(tRes.id);
          tenantUuid = tRes.uuid;
          resolvedByEmail = true;
        }
      }
    }

    // 3. Resolve via Hostname parsing (subdomains or custom domains)
    if (!tenantId) {
      const hostname = req.hostname;
      const [domainRes]: any = await sequelize.query(
        'SELECT tenant_id FROM store_domains WHERE domain = :hostname AND verification_status = "verified" LIMIT 1',
        {
          replacements: { hostname },
          type: QueryTypes.SELECT,
        }
      );

      let finalTenantId = domainRes ? domainRes.tenant_id : null;

      if (!finalTenantId) {
        const parts = hostname.split('.');
        if (parts.length > 2) {
          const subdomain = parts[0];
          if (subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'admin') {
            const [storeRes]: any = await sequelize.query(
              'SELECT tenant_id FROM stores WHERE slug = :subdomain AND status = "active" LIMIT 1',
              {
                replacements: { subdomain },
                type: QueryTypes.SELECT,
              }
            );
            if (storeRes) {
              finalTenantId = storeRes.tenant_id;
            }
          }
        }
      }

      // 4. Fallback to default active tenant if hostname is localhost or local IP
      if (
        !finalTenantId &&
        (hostname === 'localhost' || hostname === '127.0.0.1' || env.NODE_ENV !== 'production')
      ) {
        const [defaultTenant]: any = await sequelize.query(
          'SELECT id, uuid FROM tenants WHERE status = "active" ORDER BY id ASC LIMIT 1',
          {
            type: QueryTypes.SELECT,
          }
        );
        if (defaultTenant) {
          tenantId = Number(defaultTenant.id);
          tenantUuid = defaultTenant.uuid;
        }
      } else if (finalTenantId) {
        const [tRes]: any = await sequelize.query(
          'SELECT id, uuid FROM tenants WHERE id = :tenantId AND status = "active" LIMIT 1',
          {
            replacements: { tenantId: finalTenantId },
            type: QueryTypes.SELECT,
          }
        );
        if (tRes) {
          tenantId = Number(tRes.id);
          tenantUuid = tRes.uuid;
        }
      }
    }

    if (!tenantId) {
      throw new TenantNotFoundError();
    }

    // Store resolved context parameters
    req.context.tenantId = tenantId;
    req.context.tenantUuid = tenantUuid;
    req.tenantId = tenantUuid || undefined;

    next();
  } catch (error: any) {
    logger.error(`[TenantResolver Error] ${error?.message || error}`, {
      path: req.path,
      hostname: req.hostname,
      stack: error?.stack,
    });
    next(error);
  }
};
