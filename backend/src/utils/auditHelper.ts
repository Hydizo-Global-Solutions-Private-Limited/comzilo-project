import { sequelize } from '../config/database';
import { RequestContext } from '../middleware/requestContext';

export interface AuditLogPayload {
  tenantId?: number | null;
  actorId?: number | null;
  action: string;
  entityType: string;
  entityId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previousValues?: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValues?: Record<string, any> | null;
}

export const createAuditLog = async (
  payload: any,
  context?: RequestContext,
  ...args: any[]
): Promise<void> => {
  const tenantId = payload.tenantId !== undefined ? payload.tenantId : context?.tenantId || null;
  const actorId =
    payload.actorId !== undefined ? payload.actorId : context?.authenticatedUserId || null;
  const ipAddress = context?.ipAddress || null;
  const userAgent = context?.userAgent || null;
  const requestId = context?.requestId || null;

  try {
    await sequelize.query(
      `INSERT INTO audit_logs (
        tenant_id, user_id, action, entity_type, entity_id, 
        old_values, new_values, ip_address, user_agent, request_id, 
        created_at
      ) VALUES (
        :tenantId, :actorId, :action, :entityType, :entityId, 
        :previousValues, :newValues, :ipAddress, :userAgent, :requestId, 
        NOW()
      )`,
      {
        replacements: {
          tenantId,
          actorId,
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId,
          previousValues: payload.previousValues ? JSON.stringify(payload.previousValues) : null,
          newValues: payload.newValues ? JSON.stringify(payload.newValues) : null,
          ipAddress,
          userAgent,
          requestId,
        },
      }
    );
  } catch (auditErr) {
    console.warn('[AuditLog] Non-fatal audit log insertion warning:', auditErr);
  }
};

export const logVariantCreated = async (variant: any, context?: RequestContext): Promise<void> => {
  await createAuditLog(
    {
      tenantId: variant.tenantId || variant.tenant_id,
      action: 'VARIANT_CREATED',
      entityType: 'ProductVariant',
      entityId: String(variant.id),
      newValues: variant,
    },
    context
  );
};

export const logVariantUpdated = async (
  oldVariant: any,
  newVariant: any,
  context?: RequestContext
): Promise<void> => {
  await createAuditLog(
    {
      tenantId: newVariant.tenantId || newVariant.tenant_id,
      action: 'VARIANT_UPDATED',
      entityType: 'ProductVariant',
      entityId: String(newVariant.id),
      previousValues: oldVariant,
      newValues: newVariant,
    },
    context
  );
};

export const logVariantDeleted = async (variant: any, context?: RequestContext): Promise<void> => {
  await createAuditLog(
    {
      tenantId: variant.tenantId || variant.tenant_id,
      action: 'VARIANT_DELETED',
      entityType: 'ProductVariant',
      entityId: String(variant.id),
      previousValues: variant,
    },
    context
  );
};

export const logVariantPriceChanged = async (
  variantId: number | string,
  tenantId: number | null,
  oldPrice: number,
  newPrice: number,
  context?: RequestContext
): Promise<void> => {
  await createAuditLog(
    {
      tenantId,
      action: 'VARIANT_PRICE_CHANGED',
      entityType: 'ProductVariant',
      entityId: String(variantId),
      previousValues: { price: oldPrice },
      newValues: { price: newPrice },
    },
    context
  );
};

export const logVariantStockChanged = async (
  variantId: number | string,
  tenantId: number | null,
  oldQuantity: number,
  newQuantity: number,
  context?: RequestContext
): Promise<void> => {
  await createAuditLog(
    {
      tenantId,
      action: 'VARIANT_STOCK_CHANGED',
      entityType: 'VariantInventory',
      entityId: String(variantId),
      previousValues: { quantityOnHand: oldQuantity },
      newValues: { quantityOnHand: newQuantity },
    },
    context
  );
};
