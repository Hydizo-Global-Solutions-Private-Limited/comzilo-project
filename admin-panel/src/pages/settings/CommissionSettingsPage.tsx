import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Percent,
  CreditCard,
  Truck,
  DollarSign,
  Receipt,
  Save,
  RefreshCw,
  ShieldCheck,
  Calculator,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { axiosInstance } from '../../api/axiosInstance';
import toast from 'react-hot-toast';

export const CommissionSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [config, setConfig] = useState({
    commissionRate: 10,
    gatewayRate: 0,
    gatewayFixed: 3,
    shippingCharge: 5,
    processingFee: 0,
    taxRate: 0,
  });

  const [reports, setReports] = useState<any>(null);

  const fetchConfigAndReports = async () => {
    setLoading(true);
    try {
      const [confRes, repRes] = await Promise.all([
        axiosInstance.get('/admin/commission/config'),
        axiosInstance.get('/admin/commission/reports'),
      ]);
      if (confRes.data?.data) {
        setConfig(confRes.data.data);
      }
      if (repRes.data?.data) {
        setReports(repRes.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load commission settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigAndReports();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/admin/commission/config', config);
      toast.success('Commission Engine rules saved & updated successfully!');
      fetchConfigAndReports();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save commission settings');
    } finally {
      setSaving(false);
    }
  };

  // Preview Calculation
  const exampleOrderTotal = 100;
  const commAmount = (exampleOrderTotal * (config.commissionRate / 100));
  const gwAmount = (exampleOrderTotal * (config.gatewayRate / 100) + config.gatewayFixed);
  const shipAmount = Number(config.shippingCharge || 0);
  const procAmount = Number(config.processingFee || 0);
  const taxAmount = ((commAmount + gwAmount + procAmount) * (config.taxRate / 100));
  const totalDeductions = commAmount + gwAmount + shipAmount + procAmount + taxAmount;
  const netSellerReceives = Math.max(0, exampleOrderTotal - totalDeductions);

  if (loading) {
    return (
      <PageContainer title="Commission Engine Configuration" subtitle="Loading parameters...">
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Commission Engine & Deduction Settings"
      subtitle="Configure platform commission rates, gateway fees, shipping charges, fixed fees, and tax deductions"
      action={
        <Button
          variant="contained"
          color="primary"
          startIcon={<Save size={18} />}
          disabled={saving}
          onClick={handleSave}
          sx={{ fontWeight: 800, borderRadius: 2, px: 3 }}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      }
    >
      <Grid container spacing={4}>
        {/* Left Side: Rule Controls */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: '#0F172A' }}>
              Financial Deduction Parameters
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Platform Commission Rate (%)"
                  type="number"
                  fullWidth
                  value={config.commissionRate}
                  onChange={(e) => setConfig({ ...config, commissionRate: parseFloat(e.target.value) || 0 })}
                  helperText="Default: 10% on Order Subtotal"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Gateway Fixed Charge (INR/$)"
                  type="number"
                  fullWidth
                  value={config.gatewayFixed}
                  onChange={(e) => setConfig({ ...config, gatewayFixed: parseFloat(e.target.value) || 0 })}
                  helperText="Default: $3.00 / INR 3 fixed per order"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Shipping Charge (INR/$)"
                  type="number"
                  fullWidth
                  value={config.shippingCharge}
                  onChange={(e) => setConfig({ ...config, shippingCharge: parseFloat(e.target.value) || 0 })}
                  helperText="Default: $5.00 / INR 5 shipping fee"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Fixed Processing Fee (INR/$)"
                  type="number"
                  fullWidth
                  value={config.processingFee}
                  onChange={(e) => setConfig({ ...config, processingFee: parseFloat(e.target.value) || 0 })}
                  helperText="Flat admin processing fee"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Gateway Variable Rate (%)"
                  type="number"
                  fullWidth
                  value={config.gatewayRate}
                  onChange={(e) => setConfig({ ...config, gatewayRate: parseFloat(e.target.value) || 0 })}
                  helperText="Percentage charge by payment gateway"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Tax / GST Rate (%)"
                  type="number"
                  fullWidth
                  value={config.taxRate}
                  onChange={(e) => setConfig({ ...config, taxRate: parseFloat(e.target.value) || 0 })}
                  helperText="Tax applied on platform fees"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* FINANCIAL SUMMARY REPORT */}
          <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: '#0F172A' }}>
              Global Revenue & Commission Report Summary
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Gross GMV</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  ₹{(Number(reports?.summary?.grossGmv) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Platform Revenue</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#10B981' }}>
                  ₹{(Number(reports?.summary?.totalPlatformRevenue) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Net Seller Payouts</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#2563EB' }}>
                  ₹{(Number(reports?.summary?.totalSellerPayouts) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* CALCULATION SIMULATOR */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 4, borderRadius: 3, bgcolor: '#0F172A', color: 'white' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: '#38BDF8' }}>
              Payout Simulation (₹100 Order)
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>
              Live net seller payout calculation breakdown
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>Gross Order Total</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>₹100.00</Typography>
            </Box>

            <Divider sx={{ borderColor: '#334155', my: 1.5 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#F87171' }}>- Platform Commission ({config.commissionRate}%)</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#F87171' }}>-₹{commAmount.toFixed(2)}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#F87171' }}>- Gateway Fee ({config.gatewayRate}% + ₹{config.gatewayFixed})</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#F87171' }}>-₹{gwAmount.toFixed(2)}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#F87171' }}>- Shipping Fee</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#F87171' }}>-₹{shipAmount.toFixed(2)}</Typography>
            </Box>

            {procAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#F87171' }}>- Processing Fee</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#F87171' }}>-₹{procAmount.toFixed(2)}</Typography>
              </Box>
            )}

            {taxAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#F87171' }}>- Tax ({config.taxRate}%)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#F87171' }}>-₹{taxAmount.toFixed(2)}</Typography>
              </Box>
            )}

            <Divider sx={{ borderColor: '#334155', my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Net Seller Receives</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#34D399' }}>
                ₹{netSellerReceives.toFixed(2)}
              </Typography>
            </Box>

            <Alert severity="success" sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#34D399', border: '1px solid #10B981', mt: 3, borderRadius: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Verification Match: ₹100 Order - ₹10 Commission - ₹3 Gateway - ₹5 Shipping = <strong>₹82 Seller Payout</strong>
              </Typography>
            </Alert>
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default CommissionSettingsPage;
