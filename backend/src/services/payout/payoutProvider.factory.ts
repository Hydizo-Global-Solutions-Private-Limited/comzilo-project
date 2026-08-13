import { IPayoutProvider } from './payoutProvider.interface';
import { MockPayoutProvider } from './mockPayoutProvider.service';
import { RazorpayPayoutProvider } from './razorpayPayoutProvider.service';

export class PayoutProviderFactory {
  public static getProvider(): IPayoutProvider {
    const hasKeys = !!(
      (process.env.RAZORPAY_PAYOUT_KEY_ID || process.env.RAZORPAY_KEY_ID) &&
      (process.env.RAZORPAY_PAYOUT_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET)
    );

    if (hasKeys) {
      try {
        return new RazorpayPayoutProvider();
      } catch (err) {
        console.warn(
          '[PayoutProviderFactory] Falling back to MockPayoutProvider:',
          err
        );
        return new MockPayoutProvider();
      }
    }

    return new MockPayoutProvider();
  }
}
