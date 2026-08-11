import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = crypto
  .createHash('sha256')
  .update(env.JWT_ACCESS_SECRET || 'comzilo_default_secret_key_2026')
  .digest();

export const encryptCredential = (text: string | null | undefined): string | null => {
  if (!text) return null;
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    return text;
  }
};

export const decryptCredential = (encryptedText: string | null | undefined): string | null => {
  if (!encryptedText) return null;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return encryptedText;
  }
};
