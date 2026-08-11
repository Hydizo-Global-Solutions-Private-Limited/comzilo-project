export interface CreateContactPayload {
  name: string;
  email: string;
  contact: string;
  type: string; // 'vendor' | 'customer' | 'employee'
  reference_id?: string;
}

export interface CreateFundAccountPayload {
  contact_id: string;
  account_type: 'bank_account' | 'vpa';
  bank_account?: {
    name: string;
    ifsc: string;
    account_number: string;
  };
  vpa?: {
    address: string;
  };
}

export interface InitiatePayoutPayload {
  account_number: string; // Razorpay X Account Number
  fund_account_id: string;
  amount: number; // in subunits (paise for INR, e.g. 10000 = Rs.100) or decimal
  currency: string;
  mode: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI';
  purpose: 'payout' | 'refund' | 'salary' | 'vendor_bill';
  reference_id: string;
  narration?: string;
  notes?: Record<string, any>;
}

export interface PayoutResponse {
  id: string;
  entity: 'payout';
  fund_account_id: string;
  amount: number;
  currency: string;
  notes?: Record<string, any>;
  fees?: number;
  tax?: number;
  status:
    | 'queued'
    | 'pending'
    | 'processing'
    | 'processed'
    | 'cancelled'
    | 'rejected'
    | 'reversed'
    | 'failed';
  utr?: string;
  mode: string;
  purpose: string;
  reference_id: string;
  narration?: string;
  failure_reason?: string;
  created_at: number;
}

export interface IPayoutProvider {
  providerName: 'MOCK' | 'RAZORPAY';
  createContact(payload: CreateContactPayload): Promise<{ id: string; name: string }>;
  createFundAccount(payload: CreateFundAccountPayload): Promise<{ id: string; contact_id: string }>;
  initiatePayout(payload: InitiatePayoutPayload): Promise<PayoutResponse>;
  getPayoutStatus(payoutId: string): Promise<PayoutResponse>;
  cancelPayout(payoutId: string): Promise<PayoutResponse>;
}
