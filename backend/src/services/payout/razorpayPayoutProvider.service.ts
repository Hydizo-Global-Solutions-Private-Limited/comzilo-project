import {
  IPayoutProvider,
  CreateContactPayload,
  CreateFundAccountPayload,
  InitiatePayoutPayload,
  PayoutResponse,
} from './payoutProvider.interface';
import { ValidationError } from '../../shared/errors/AppError';

export class RazorpayPayoutProvider implements IPayoutProvider {
  public providerName: 'MOCK' | 'RAZORPAY' = 'RAZORPAY';
  private authToken: string;
  private accountNumber: string;
  private baseUrl = 'https://api.razorpay.com/v1';

  constructor() {
    const keyId = process.env.RAZORPAY_PAYOUT_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_PAYOUT_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    this.accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER || '2334455667788';

    if (!keyId || !keySecret) {
      throw new ValidationError(
        'Razorpay Payout API credentials (RAZORPAY_PAYOUT_KEY_ID / RAZORPAY_PAYOUT_KEY_SECRET) are missing.'
      );
    }

    this.authToken = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  }

  private async request(endpoint: string, options: any = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Basic ${this.authToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = (data as any)?.error?.description || `HTTP ${response.status}`;
      throw new ValidationError(`Razorpay API Error (${endpoint}): ${errMsg}`);
    }
    return data;
  }

  public async createContact(payload: CreateContactPayload): Promise<{ id: string; name: string }> {
    const res = await this.request('/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { id: res.id, name: res.name };
  }

  public async createFundAccount(
    payload: CreateFundAccountPayload
  ): Promise<{ id: string; contact_id: string }> {
    const res = await this.request('/fund_accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { id: res.id, contact_id: res.contact_id };
  }

  public async initiatePayout(payload: InitiatePayoutPayload): Promise<PayoutResponse> {
    const body = {
      account_number: payload.account_number || this.accountNumber,
      fund_account_id: payload.fund_account_id,
      amount: Math.round(payload.amount * 100),
      currency: payload.currency || 'INR',
      mode: payload.mode || 'IMPS',
      purpose: payload.purpose || 'payout',
      reference_id: payload.reference_id,
      narration: payload.narration || 'Merchant Settlement',
      notes: payload.notes || {},
    };

    const res = await this.request('/payouts', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      id: res.id,
      entity: 'payout',
      fund_account_id: res.fund_account_id,
      amount: res.amount / 100,
      currency: res.currency,
      status: res.status,
      utr: res.utr,
      mode: res.mode,
      purpose: res.purpose,
      reference_id: res.reference_id,
      narration: res.narration,
      failure_reason: res.failure_reason,
      created_at: res.created_at,
    };
  }

  public async getPayoutStatus(payoutId: string): Promise<PayoutResponse> {
    const res = await this.request(`/payouts/${payoutId}`, { method: 'GET' });
    return {
      id: res.id,
      entity: 'payout',
      fund_account_id: res.fund_account_id,
      amount: res.amount / 100,
      currency: res.currency,
      status: res.status,
      utr: res.utr,
      mode: res.mode,
      purpose: res.purpose,
      reference_id: res.reference_id,
      narration: res.narration,
      failure_reason: res.failure_reason,
      created_at: res.created_at,
    };
  }

  public async cancelPayout(payoutId: string): Promise<PayoutResponse> {
    const res = await this.request(`/payouts/${payoutId}/cancel`, { method: 'POST' });
    return {
      id: res.id,
      entity: 'payout',
      fund_account_id: res.fund_account_id,
      amount: res.amount / 100,
      currency: res.currency,
      status: res.status,
      mode: res.mode,
      purpose: res.purpose,
      reference_id: res.reference_id,
      created_at: res.created_at,
    };
  }
}
