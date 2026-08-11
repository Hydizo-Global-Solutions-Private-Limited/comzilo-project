import Joi from 'joi';

export const registerSchema = {
  body: Joi.object({
    email: Joi.string().email().max(255).required(),
    password: Joi.string().min(8).max(100).required(),
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    mobile: Joi.string().max(50).optional().allow('', null),
  }),
};

export const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    deviceUuid: Joi.string().max(255).optional(),
    deviceName: Joi.string().max(255).optional(),
    platform: Joi.string().max(100).optional(),
    browser: Joi.string().max(100).optional(),
    os: Joi.string().max(100).optional(),
  }),
};

export const requestPasswordResetSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
  }),
};

export const passwordComplexityPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export const validatePasswordPolicy = (password: string): boolean => {
  return passwordComplexityPattern.test(password);
};

export const resetPasswordSchema = {
  body: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).max(100).optional(),
    newPassword: Joi.string().min(8).max(100).optional(),
    confirmPassword: Joi.string().optional(),
  }).or('password', 'newPassword'),
};

export const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(100).regex(passwordComplexityPattern).required().messages({
      'string.pattern.base':
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    }),
  }),
};

export const requestEmailVerificationSchema = {
  body: Joi.object({}),
};

export const verifyEmailSchema = {
  body: Joi.object({
    otpCode: Joi.string().length(6).required(),
  }),
};
