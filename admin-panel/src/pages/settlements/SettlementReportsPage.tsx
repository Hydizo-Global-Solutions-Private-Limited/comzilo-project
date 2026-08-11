import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  Zap,
  CheckCircle2,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  DollarSign,
  FileSpreadsheet,
  Share2,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { axiosInstance } from '../../api/axiosInstance';
import toast from 'react-hot-toast';

export const SettlementReportsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [reports, setReports] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stlRes, repRes] = await Promise.all([
        axiosInstance.get('/admin/settlements'),
        axiosInstance.get('/admin/settlements/reports'),
      ]);
      setSettlements(stlRes.data?.data || []);
      setReports(repRes.data?.data || null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProcessEligible = async () => {
    setProcessing(true);
    try {
      const res = await axiosInstance.post('/admin/settlements/process-eligible', {});
      const count = res.data?.data?.processedCount || 0;
      toast.success(`Automated Settlement Engine processed ${count} eligible order(s)!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process settlements');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Automated Settlement Engine" subtitle="Loading settlement ledger...">
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Automated Order Settlement Engine"
      subtitle="Process escrow settlements for delivered orders post return-window expiry"
      action={
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={fetchData}
            sx={{ fontWeight: 700 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Zap size={18} />}
            disabled={processing}
            onClick={handleProcessEligible}
            sx={{ fontWeight: 800, borderRadius: 2, px: 3 }}
          >
            {processing ? 'Processing Engine...' : 'Process Eligible Settlements'}
          </Button>
        </Box>
      }
    >
      {/* ELIGIBILITY EXPLANATION ALERT */}
      <Alert severity="success" icon={<ShieldCheck size={20} />} sx={{ mb: 4, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          Comzilo Automated Escrow Settlement Rule
        </Typography>
        <Typography variant="body2">
          An order becomes eligible for settlement when <strong>Fulfillment Status = Delivered</strong> AND <strong>Return Window has Completed</strong>. Upon batch trigger, the engine deducts commission, gateway charges, shipping, and tax, transfers funds from <code>Pending Balance</code> $\rightarrow$ <code>Available Balance</code>, and generates an itemized settlement audit log.
        </Typography>
      </Alert>

      {/* SUMMARY STAT CARDS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              GROSS SETTLED GMV
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
              ₹{(Number(reports?.grossSettledGmv) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Settled Orders Value
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              TOTAL COMMISSION RETAINED
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#10B981', mt: 0.5 }}>
              ₹{(Number(reports?.totalCommission) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Platform Revenue Earnings
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              NET SELLER PAYOUTS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#2563EB', mt: 0.5 }}>
              ₹{(Number(reports?.totalNetSellerPayouts) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Transferred to Sellers' Available Balance
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              TOTAL SETTLEMENTS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#F59E0B', mt: 0.5 }}>
              {reports?.totalSettlements || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Executed Batch Records
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* SETTLEMENTS LEDGER TABLE */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
            Settlement Audit Ledger
          </Typography>
          <Chip label={`${settlements.length} Records`} color="primary" size="small" sx={{ fontWeight: 800 }} />
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Settlement Date</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Settlement ID</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Order #</TableCell>
                <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Order Total</TableCell>
                <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Commission</TableCell>
                <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Gateway Fee</TableCell>
                <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Shipping Fee</TableCell>
                <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Net Seller Payout</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {settlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    No settlements executed yet. Click "Process Eligible Settlements" to run batch engine.
                  </TableCell>
                </TableRow>
              ) : (
                settlements.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>{new Date(s.settlement_date || s.settlementDate || s.createdAt).toLocaleString()}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.settlement_number || s.settlementNumber}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>#{s.order_number || s.order_id}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>INR {Number(s.order_total).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ color: '#EF4444', fontWeight: 700 }}>-INR {Number(s.commission_amount).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ color: '#EF4444', fontWeight: 700 }}>-INR {Number(s.gateway_fee).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ color: '#EF4444', fontWeight: 700 }}>-INR {Number(s.shipping_fee).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ color: '#10B981', fontWeight: 800 }}>
                      +INR {Number(s.net_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Chip label={s.status?.toUpperCase()} size="small" color="success" sx={{ fontWeight: 800 }} />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<Share2 size={14} />}
                        onClick={() => {
                          const text = encodeURIComponent(`📄 Settlement Statement #${s.settlement_number || s.settlementNumber}\nOrder #: ${s.order_number || s.order_id}\nNet Payout: INR ${Number(s.net_amount).toFixed(2)}\nStatus: ${s.status?.toUpperCase()}`);
                          window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                        }}
                        sx={{ fontWeight: 700, borderColor: '#25D366', color: '#16A34A', '&:hover': { bgcolor: '#F0FDF4' } }}
                      >
                        Share
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </PageContainer>
  );
};

export default SettlementReportsPage;
