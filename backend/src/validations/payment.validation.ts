import Joi from 'joi';

export const paymentValidation = {
  createPayment: Joi.object({
    orderId: Joi.number().integer().positive().required(),
    paymentMethod: Joi.string()
      .valid('Cash', 'Card', 'Bank Transfer', 'UPI', 'Wallet', 'Cheque', 'Store Credit', 'Manual')
      .required(),
    gateway: Joi.string().valid('manual').default('manual'),
    amount: Joi.number().positive().required(),
    currency: Joi.string().max(10).default('USD'),
    exchangeRate: Joi.number().positive().default(1),
    notes: Joi.string().allow('', null).optional(),
    metadata: Joi.object().allow(null).optional(),
    idempotencyKey: Joi.string().max(255).allow('', null).optional(),
  }).unknown(false),

  updatePayment: Joi.object({
    notes: Joi.string().allow('', null).optional(),
    metadata: Joi.object().allow(null).optional(),
  }).unknown(false),

  listPayments: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string()
      .valid('createdAt', 'paymentNumber', 'amount', 'paymentStatus')
      .default('createdAt'),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC'),
    paymentNumber: Joi.string().allow('').optional(),
    paymentStatus: Joi.string()
      .valid(
        'pending',
        'authorized',
        'paid',
        'failed',
        'cancelled',
        'refunded',
        'partially_refunded'
      )
      .optional(),
    paymentMethod: Joi.string().allow('').optional(),
    gatewayReference: Joi.string().allow('').optional(),
    transactionReference: Joi.string().allow('').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    minAmount: Joi.number().min(0).optional(),
    maxAmount: Joi.number().min(0).optional(),
  }).unknown(false),

  refundPayment: Joi.object({
    paymentId: Joi.number().integer().positive().optional(),
    amount: Joi.number().positive().required(),
    reason: Joi.string().allow('', null).optional(),
  }).unknown(true),

  listRefunds: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'refundNumber', 'amount').default('createdAt'),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC'),
    refundNumber: Joi.string().allow('').optional(),
    status: Joi.string().valid('pending', 'processed', 'failed', 'cancelled').optional(),
  }).unknown(false),

  createInvoice: Joi.object({
    orderId: Joi.number().integer().positive().required(),
    dueDate: Joi.date().iso().optional(),
    total: Joi.number().optional(),
  }).unknown(false),

  updateInvoice: Joi.object({
    invoiceStatus: Joi.string().valid('draft', 'issued', 'paid', 'cancelled').optional(),
  }).unknown(false),

  listInvoices: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'invoiceNumber', 'total').default('createdAt'),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC'),
    invoiceNumber: Joi.string().allow('').optional(),
    invoiceStatus: Joi.string().valid('draft', 'issued', 'paid', 'cancelled').optional(),
  }).unknown(false),
};
