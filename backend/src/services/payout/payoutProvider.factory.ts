import { IPayoutProvider } from './payoutProvider.interface';
import { MockPayoutProvider } from './mockPayoutProvider.service';
import { RazorpayPayoutProvider } from './razorpayPayoutProvider.service';

export class PayoutProviderFactory {
  public static getProvider(): IPayoutProvider {
    const payoutMode = (process.env.RAZORPAY_PAYOUT_MODE || 'test').toLowerCase();
    const hasLiveKeys = !!(
      process.env.RAZORPAY_PAYOUT_KEY_ID && process.env.RAZORPAY_PAYOUT_KEY_SECRET
    );

    if (payoutMode === 'live' && hasLiveKeys) {
      try {
        return new RazorpayPayoutProvider();
      } catch (err) {
        console.warn(
          '[PayoutProviderFactory] Failed to initialize RazorpayPayoutProvider, falling back to MockPayoutProvider:',
          err
        );
        return new MockPayoutProvider();
      }
    }

    return new MockPayoutProvider();
  }
}
