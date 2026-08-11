import {
  IPayoutProvider,
  CreateContactPayload,
  CreateFundAccountPayload,
  InitiatePayoutPayload,
  PayoutResponse,
} from './payoutProvider.interface';

export class MockPayoutProvider implements IPayoutProvider {
  public providerName: 'MOCK' | 'RAZORPAY' = 'MOCK';

  public async createContact(payload: CreateContactPayload): Promise<{ id: string; name: string }> {
    const contactId = `cont_mock_${Date.now().toString().slice(-8)}`;
    return {
      id: contactId,
      name: payload.name,
    };
  }

  public async createFundAccount(
    payload: CreateFundAccountPayload
  ): Promise<{ id: string; contact_id: string }> {
    const fundAccountId = `fa_mock_${Date.now().toString().slice(-8)}`;
    return {
      id: fundAccountId,
      contact_id: payload.contact_id,
    };
  }

  public async initiatePayout(payload: InitiatePayoutPayload): Promise<PayoutResponse> {
    const payoutId = `pout_mock_${Date.now().toString().slice(-8)}`;
    const utr = `UTR_MOCK_${Date.now().toString().slice(-8)}`;

    return {
      id: payoutId,
      entity: 'payout',
      fund_account_id: payload.fund_account_id,
      amount: payload.amount,
      currency: payload.currency || 'INR',
      status: 'processed',
      utr,
      mode: payload.mode || 'IMPS',
      purpose: payload.purpose || 'payout',
      reference_id: payload.reference_id,
      narration: payload.narration || 'Merchant Settlement Payout',
      notes: payload.notes,
      fees: 5.0,
      tax: 0.9,
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  public async getPayoutStatus(payoutId: string): Promise<PayoutResponse> {
    return {
      id: payoutId,
      entity: 'payout',
      fund_account_id: 'fa_mock_12345678',
      amount: 10000,
      currency: 'INR',
      status: 'processed',
      utr: `UTR_MOCK_${Date.now().toString().slice(-8)}`,
      mode: 'IMPS',
      purpose: 'payout',
      reference_id: 'REF_MOCK_123',
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  public async cancelPayout(payoutId: string): Promise<PayoutResponse> {
    return {
      id: payoutId,
      entity: 'payout',
      fund_account_id: 'fa_mock_12345678',
      amount: 10000,
      currency: 'INR',
      status: 'cancelled',
      mode: 'IMPS',
      purpose: 'payout',
      reference_id: 'REF_MOCK_123',
      created_at: Math.floor(Date.now() / 1000),
    };
  }
}
