import Joi from 'joi';

export const createTenantSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    slug: Joi.string().max(255).allow('', null).optional(),
    ownerUserId: Joi.number().integer().positive().allow(null).optional(),
    currency: Joi.string().max(10).optional().default('INR'),
    timezone: Joi.string().max(100).optional().default('UTC'),
    language: Joi.string().max(10).optional().default('en'),
    plan: Joi.string().max(100).allow('', null).optional(),
    planCode: Joi.string().max(100).allow('', null).optional().default('enterprise'),
    billingCycle: Joi.string().valid('monthly', 'yearly').allow('', null).optional().default('monthly'),
  }),
};

export const updateTenantSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    status: Joi.string().valid('pending', 'active', 'suspended', 'cancelled').optional(),
  }),
};

export const assignPlanSchema = {
  body: Joi.object({
    planCode: Joi.string().max(100).required(),
    billingCycle: Joi.string().valid('monthly', 'yearly').required(),
  }),
};
