import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Zap,
  Building2,
  Users,
  Warehouse,
  Package,
  Calendar,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { axiosInstance } from '../../api/axiosInstance';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const SubscriptionPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [subData, setSubData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      const [subRes, plansRes, invRes] = await Promise.all([
        axiosInstance.get('/seller/subscription'),
        axiosInstance.get('/subscription-plans'),
        axiosInstance.get('/seller/subscription/invoices'),
      ]);
      setSubData(subRes.data.data);
      setPlans(plansRes.data.data || []);
      setInvoices(invRes.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const handleSubscribe = async (plan: any) => {
    setCheckoutLoading(plan.id);
    setPaymentError(null);
    setPaymentSuccessData(null);

    try {
      // 1. Call backend POST /create-order
      const res = await axiosInstance.post('/seller/subscription/create-order', {
        planId: plan.id,
        billingCycle,
      });

      const orderData = res.data.data;
      const orderId = orderData.order_id || orderData.razorpayOrderId;
      const keyId = orderData.key_id || orderData.keyId;
      const amountPaise = orderData.amountPaise || Math.round((orderData.amount || 0) * 100);

      // Check if Razorpay JS SDK is loaded
      if (typeof window.Razorpay !== 'function') {
        toast.error('Razorpay SDK failed to load. Please check your network connection.');
        setPaymentError('Razorpay Checkout SDK not loaded');
        setCheckoutLoading(null);
        return;
      }

      // 2. Open official Razorpay Checkout Modal
      const options: any = {
        key: keyId,
        amount: amountPaise,
        currency: orderData.currency || 'INR',
        name: 'Comzilo Enterprise SaaS',
        description: `Subscription Upgrade to ${plan.name} (${billingCycle})`,
        order_id: orderId,
        handler: async function (response: any) {
          setCheckoutLoading(plan.id);
          try {
            // 3. Verify Payment with HMAC SHA256 on Backend
            const verifyRes = await axiosInstance.post('/seller/subscription/verify-payment', {
              planId: plan.id,
              billingCycle,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success(`✔ Payment Successful! Subscribed to ${plan.name}`);
            setPaymentSuccessData({
              planName: plan.name,
              transactionId: response.razorpay_payment_id,
              paymentDate: new Date().toLocaleDateString(),
              nextBillingDate: verifyRes.data.data?.nextBillingDate
                ? new Date(verifyRes.data.data.nextBillingDate).toLocaleDateString()
                : 'N/A',
              invoiceNumber: verifyRes.data.data?.invoiceNumber || 'INV-SUB',
            });
            fetchSubscriptionData();
          } catch (verifyErr: any) {
            const errMsg = verifyErr.response?.data?.message || 'Payment Verification Failed';
            toast.error(errMsg);
            setPaymentError(`Payment Verification Failed: ${errMsg}`);
          } finally {
            setCheckoutLoading(null);
          }
        },
        modal: {
          ondismiss: function () {
            toast.error('Payment cancelled or closed');
            setPaymentError('Payment Failed / Cancelled. Status remains PENDING_PAYMENT. You may retry payment anytime.');
            setCheckoutLoading(null);
          },
        },
        theme: {
          color: '#3b82f6',
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payment initiation failed');
      setPaymentError('Payment Failed during order creation.');
      setCheckoutLoading(null);
    }
  };

  const handleDownloadInvoicePdf = (inv: any) => {
    const invNumber = inv?.invoiceNumber || inv?.invoice_number || `INV-SUB-${Date.now().toString().slice(-6)}`;
    const invAmount = inv?.amount || inv?.total || subData?.subscription?.amount || currentPlan?.priceMonthly || 499;
    const planName = inv?.planName || currentPlan?.name || 'SaaS Subscription Plan';
    const tenantName = subData?.tenantName || 'Merchant Account';
    const tenantId = subData?.subscription?.tenantId || '';
    const transactionId = inv?.transactionId || subData?.subscription?.providerSubscriptionId || 'pay_RZP_VERIFIED';
    const dateIssued = inv?.paymentDate || (subData?.subscription?.currentPeriodStart ? new Date(subData.subscription.currentPeriodStart).toLocaleDateString() : new Date().toLocaleDateString());
    const nextBilling = inv?.nextBillingDate || (subData?.subscription?.currentPeriodEnd ? new Date(subData.subscription.currentPeriodEnd).toLocaleDateString() : 'N/A');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice #${invNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #0f172a; background: #ffffff; }
          .invoice-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; max-width: 720px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 24px; }
          .brand { font-size: 26px; font-weight: 800; color: #0284c7; }
          .badge { background: #d1fae5; color: #047857; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .label { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
          .val { font-size: 14px; font-weight: 700; color: #1e293b; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .table th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 12px; color: #475569; }
          .table td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .total { display: flex; justify-content: space-between; align-items: center; background: #eff6ff; padding: 16px 20px; border-radius: 8px; border: 1px solid #bfdbfe; font-size: 18px; font-weight: bold; color: #1d4ed8; }
          .footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="brand">Comzilo SaaS</div>
              <div style="font-size: 13px; color: #64748b;">Official Subscription Tax Invoice</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 18px; font-weight: 800;">#${invNumber}</div>
              <div style="margin-top: 4px;"><span class="badge">VERIFIED & PAID</span></div>
            </div>
          </div>

          <div class="grid">
            <div>
              <div class="label">Billed To (Merchant)</div>
              <div class="val">${tenantName} (Tenant #${tenantId})</div>
            </div>
            <div>
              <div class="label">Razorpay Reference</div>
              <div class="val" style="font-family: monospace;">${transactionId}</div>
            </div>
            <div>
              <div class="label">Invoice Date</div>
              <div class="val">${dateIssued}</div>
            </div>
            <div>
              <div class="label">Next Renewal Date</div>
              <div class="val">${nextBilling}</div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Cycle</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${planName} Tier</strong><br><span style="font-size: 12px; color: #64748b;">POS Monolith, Multi-Location Inventory & Storefront API</span></td>
                <td style="text-transform: capitalize;">${subData?.subscription?.billingCycle || 'monthly'}</td>
                <td style="text-align: right; font-weight: bold;">₹${Number(invAmount).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="total">
            <span>Total Subscription Paid:</span>
            <span>₹${Number(invAmount).toFixed(2)}</span>
          </div>

          <div class="footer">
            Thank you for subscribing to Comzilo SaaS Infrastructure. Keep this document for tax and accounting records.
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${invNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const printWin = window.open(url, '_blank');
    if (printWin) {
      printWin.onload = () => {
        printWin.print();
      };
    }

    toast.success(`Invoice ${invNumber} downloaded successfully!`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  const currentPlan = subData?.plan || {};
  const currentSub = subData?.subscription || {};
  const usage = subData?.usage || {};
  const isExpired = subData?.isExpired;
  const trialDays = subData?.trialDaysRemaining || 0;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CreditCard size={32} color="#3b82f6" /> Subscription & Billing
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your SaaS tier, plan limits, payment invoices, and billing cycle.
        </Typography>
      </Box>

      {/* Payment Success Card Banner */}
      {paymentSuccessData && (
        <Alert
          severity="success"
          icon={<CheckCircle2 size={28} color="#22c55e" />}
          sx={{ mb: 4, borderRadius: 3, p: 2, border: '1px solid #22c55e' }}
        >
          <Typography variant="h6" fontWeight="bold" color="success.main" gutterBottom>
            ✔ Payment Successful
          </Typography>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Current Plan Updated: {paymentSuccessData.planName}
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={3}>
              <Typography variant="caption" color="text.secondary" display="block">Transaction ID</Typography>
              <Typography variant="body2" fontWeight="bold">{paymentSuccessData.transactionId}</Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="caption" color="text.secondary" display="block">Payment Date</Typography>
              <Typography variant="body2" fontWeight="bold">{paymentSuccessData.paymentDate}</Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="caption" color="text.secondary" display="block">Next Billing Date</Typography>
              <Typography variant="body2" fontWeight="bold">{paymentSuccessData.nextBillingDate}</Typography>
            </Grid>
            <Grid item xs={12} sm={3} display="flex" alignItems="center">
              <Button
                variant="outlined"
                color="success"
                size="small"
                startIcon={<ArrowUpRight size={14} />}
                onClick={() => handleDownloadInvoicePdf(paymentSuccessData)}
              >
                Download Invoice
              </Button>
            </Grid>
          </Grid>
        </Alert>
      )}

      {/* Payment Error / Failed Alert */}
      {paymentError && (
        <Alert severity="error" icon={<AlertTriangle size={24} />} sx={{ mb: 4, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Payment Failed
          </Typography>
          {paymentError}
        </Alert>
      )}

      {/* Trial / Expired Alerts */}
      {isExpired && !paymentSuccessData && (
        <Alert severity="error" icon={<AlertTriangle size={24} />} sx={{ mb: 4, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Subscription Expired
          </Typography>
          Your free trial or plan subscription has expired. Please select a plan below to renew access and unlock full storefront operations.
        </Alert>
      )}

      {currentSub.status === 'trialing' && !isExpired && !paymentSuccessData && (
        <Alert severity="info" icon={<Sparkles size={24} />} sx={{ mb: 4, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Active Free Trial ({trialDays} Days Remaining)
          </Typography>
          You are currently experiencing the <b>{currentPlan.name}</b> tier. Subscribe to a paid plan before your trial ends to maintain uninterrupted access.
        </Alert>
      )}

      {/* Current Subscription & Usage Summary */}
      <Grid container spacing={3} mb={5}>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', borderRadius: 3, p: 1 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Chip
                  label={currentSub.status?.toUpperCase() || 'ACTIVE'}
                  color={isExpired ? 'error' : currentSub.status === 'trialing' ? 'warning' : 'success'}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Tenant #{currentSub.tenantId}
                </Typography>
              </Box>

              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {currentPlan.name || 'Starter Plan'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
                {currentPlan.description || 'Essential capabilities for scaling merchants'}
              </Typography>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />

              <Stack spacing={1.5}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Billing Cycle:</Typography>
                  <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                    {currentSub.billingCycle || 'Monthly'}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Price:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    ₹{Number(currentSub.amount || currentPlan.priceMonthly || 0).toFixed(2)} / {currentSub.billingCycle || 'month'}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Renews / Ends On:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {currentSub.currentPeriodEnd ? new Date(currentSub.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Usage Limits */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%', borderRadius: 3, p: 1 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Zap size={20} color="#eab308" /> Plan Usage & Resource Quotas
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Monitor your current consumption against tier resource limits.
              </Typography>

              <Grid container spacing={3}>
                {/* Warehouses */}
                <Grid item xs={12} sm={6}>
                  <Box mb={1} display="flex" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Warehouse size={16} /> Warehouses
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {usage.warehouses?.used} / {usage.warehouses?.limit}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (usage.warehouses?.used / usage.warehouses?.limit) * 100)}
                    color={usage.warehouses?.used >= usage.warehouses?.limit ? 'error' : 'primary'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Grid>

                {/* Stores */}
                <Grid item xs={12} sm={6}>
                  <Box mb={1} display="flex" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Building2 size={16} /> Stores
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {usage.stores?.used} / {usage.stores?.limit}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (usage.stores?.used / usage.stores?.limit) * 100)}
                    color={usage.stores?.used >= usage.stores?.limit ? 'error' : 'primary'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Grid>

                {/* Staff Users */}
                <Grid item xs={12} sm={6}>
                  <Box mb={1} display="flex" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Users size={16} /> Staff Users
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {usage.users?.used} / {usage.users?.limit}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (usage.users?.used / usage.users?.limit) * 100)}
                    color={usage.users?.used >= usage.users?.limit ? 'error' : 'primary'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Grid>

                {/* Products */}
                <Grid item xs={12} sm={6}>
                  <Box mb={1} display="flex" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Package size={16} /> Products Catalog
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {usage.products?.used} / {usage.products?.limit > 900000 ? 'Unlimited' : usage.products?.limit}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={usage.products?.limit > 900000 ? 5 : Math.min(100, (usage.products?.used / usage.products?.limit) * 100)}
                    color="primary"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Plan Comparison & Upgrade Section */}
      <Box mb={6}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" mb={4}>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Available Subscription Plans
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upgrade or switch plans anytime. All plans include 256-bit SSL encryption & POS Monolith features.
            </Typography>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={billingCycle === 'yearly'}
                onChange={(e) => setBillingCycle(e.target.checked ? 'yearly' : 'monthly')}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" fontWeight="bold">
                Annual Billing <Chip label="SAVE 20%" color="success" size="small" sx={{ ml: 0.5, fontWeight: 'bold' }} />
              </Typography>
            }
          />
        </Box>
        <Grid container spacing={3}>
          {plans.map((plan: any) => {
            // Check if this plan tier matches active subscription
            const isMatchingTier =
              Number(currentPlan?.id) === Number(plan?.id) ||
              (currentPlan?.code && plan?.code && String(currentPlan.code).toLowerCase() === String(plan.code).toLowerCase()) ||
              (currentPlan?.name && plan?.name && String(currentPlan.name).toLowerCase().trim() === String(plan.name).toLowerCase().trim());

            // ONLY display CURRENT PLAN badge if the merchant actually has THIS billing cycle active!
            const userActiveCycle = (currentSub?.billingCycle || 'monthly').toLowerCase();
            const isCurrentPlan = isMatchingTier && userActiveCycle === billingCycle.toLowerCase();

            // Price calculation - Sync active subscription rate if current plan matches
            const activeAmount = Number(currentSub?.amount);
            const monthlyPrice = (isCurrentPlan && activeAmount > 0 && userActiveCycle === 'monthly')
              ? activeAmount
              : Number(plan.priceMonthly || plan.price || 0);

            const yearlyPrice = (isCurrentPlan && activeAmount > 0 && userActiveCycle === 'yearly')
              ? activeAmount
              : Number(plan.priceYearly || plan.priceYearlyTotal || (monthlyPrice * 12 * 0.8));

            const price = billingCycle === 'yearly' ? yearlyPrice.toFixed(2) : monthlyPrice.toFixed(2);
            const unitLabel = billingCycle === 'yearly' ? '/ year' : '/ month';

            return (
              <Grid item xs={12} md={4} key={plan.id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    position: 'relative',
                    border: isCurrentPlan ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    boxShadow: isCurrentPlan ? '0 10px 30px rgba(37,99,235,0.12)' : 'none',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {isCurrentPlan && (
                    <Chip
                      label="CURRENT PLAN"
                      color="primary"
                      size="small"
                      sx={{ position: 'absolute', top: 16, right: 16, fontWeight: 800, fontSize: 11 }}
                    />
                  )}

                  <CardContent sx={{ p: 3, flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {plan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" minHeight={40} mb={2}>
                      {plan.description}
                    </Typography>

                    <Box mb={3}>
                      <Typography variant="h4" fontWeight="extrabold" component="span" sx={{ color: '#0F172A' }}>
                        ₹{price}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" component="span" ml={1}>
                        {unitLabel}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Stack spacing={1.5} mb={4}>
                      <Typography variant="subtitle2" fontWeight="bold" color="primary">
                        Included Features & Limits:
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircle2 size={16} color="#22c55e" />
                        <Typography variant="body2">
                          <b>{plan.warehouseLimit || plan.warehouse_limit || 3}</b> Warehouses
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircle2 size={16} color="#22c55e" />
                        <Typography variant="body2">
                          <b>{plan.userLimit || plan.user_limit || 15}</b> Staff Accounts
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircle2 size={16} color="#22c55e" />
                        <Typography variant="body2">
                          <b>{plan.storeLimit || plan.store_limit || 3}</b> Storefronts
                        </Typography>
                      </Box>

                      {Array.isArray(plan.features) &&
                        plan.features.map((feat: string, idx: number) => (
                          <Box display="flex" alignItems="center" gap={1} key={idx}>
                            <CheckCircle2 size={16} color="#22c55e" />
                            <Typography variant="body2">{feat}</Typography>
                          </Box>
                        ))}
                    </Stack>
                  </CardContent>

                  <Box p={3} pt={0}>
                    <Button
                      fullWidth
                      variant={isCurrentPlan ? 'outlined' : 'contained'}
                      color="primary"
                      disabled={isCurrentPlan && !isExpired}
                      onClick={() => handleSubscribe(plan)}
                      startIcon={checkoutLoading === plan.id ? <CircularProgress size={18} /> : <Zap size={18} />}
                      sx={{ py: 1.2, borderRadius: 2, fontWeight: 'bold' }}
                    >
                      {isCurrentPlan && !isExpired
                        ? 'Current Plan'
                        : billingCycle === 'yearly'
                        ? `Subscribe Annual (₹${price}/yr)`
                        : `Subscribe Monthly (₹${price}/mo)`}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Invoices & Billing History */}
      <Box>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Receipt size={24} color="#3b82f6" /> Billing & Payment History
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Download invoice statements for past subscription payments.
        </Typography>

        <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
          <Table>
            <TableHead sx={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Invoice #</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Date Issued</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Amount Paid</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No payment invoices recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell sx={{ fontWeight: 'medium' }}>{inv.invoice_number}</TableCell>
                    <TableCell>{new Date(inv.issued_at || inv.created_at).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>₹{Number(inv.total || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip label={inv.invoice_status?.toUpperCase() || 'PAID'} color="success" size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ArrowUpRight size={14} />}
                        onClick={() => handleDownloadInvoicePdf(inv)}
                      >
                        Download PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default SubscriptionPage;
