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
  Stack,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Zap,
  CheckCircle2,
  RefreshCw,
  Clock,
  ShieldCheck,
  Building2,
  DollarSign,
  FileSpreadsheet,
  Share2,
  Search,
  TrendingUp,
  Award,
  ArrowUpRight,
  Receipt,
  Download,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { axiosInstance } from '../../api/axiosInstance';
import toast from 'react-hot-toast';

export const SettlementReportsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  const filteredSettlements = settlements.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const stlNum = (s.settlement_number || s.settlementNumber || `#STL-${s.id}`).toLowerCase();
    const ordNum = (s.order_number || s.order_id || '').toString().toLowerCase();
    return stlNum.includes(term) || ordNum.includes(term);
  });

  if (loading) {
    return (
      <PageContainer title="Automated Settlement Engine" subtitle="Loading settlement ledger...">
        <Box sx={{ p: 8, textAlign: 'center' }}>
          <CircularProgress size={48} thickness={4} sx={{ color: '#0284C7' }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 600 }}>
            Syncing financial settlement ledger & platform metrics...
          </Typography>
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
            sx={{
              fontWeight: 700,
              borderRadius: 2.5,
              px: 2.5,
              borderColor: '#CBD5E1',
              color: '#334155',
              '&:hover': { borderColor: '#94A3B8', bgcolor: '#F8FAFC' },
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Zap size={18} />}
            disabled={processing}
            onClick={handleProcessEligible}
            sx={{
              fontWeight: 800,
              borderRadius: 2.5,
              px: 3,
              bgcolor: '#0284C7',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
              '&:hover': { bgcolor: '#0369A1', boxShadow: '0 6px 20px rgba(2, 132, 199, 0.45)' },
            }}
          >
            {processing ? 'Processing Engine...' : 'Process Eligible Settlements'}
          </Button>
        </Box>
      }
    >
      {/* ELIGIBILITY EXPLANATION BANNER */}
      <Paper
        elevation={0}
        sx={{
          mb: 3.5,
          p: 2.5,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
          border: '1px solid #A7F3D0',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
        }}
      >
        <Box
          sx={{
            p: 1.2,
            borderRadius: 2.5,
            bgcolor: '#10B981',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            mt: 0.2,
          }}
        >
          <ShieldCheck size={24} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#065F46' }}>
              Comzilo Automated Escrow Settlement Rule
            </Typography>
            <Chip
              label="AUTOMATED RULE"
              size="small"
              sx={{ bgcolor: '#D1FAE5', color: '#047857', fontWeight: 800, fontSize: '0.675rem', height: 20 }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#047857', lineHeight: 1.5 }}>
            Orders qualify for settlement when <strong>Fulfillment = Delivered</strong> and <strong>Return Expiry Date has passed</strong>. Upon engine batch execution, commission, shipping, and taxes are deducted, transitioning funds from <code>Pending Balance</code> to <code>Available Seller Balance</code> with itemized audit records.
          </Typography>
        </Box>
      </Paper>

      {/* 4 EQUALIZED EXECUTIVE METRIC CARDS */}
      <Grid container spacing={2.5} sx={{ mb: 4 }} alignItems="stretch">
        {/* CARD 1: GROSS SETTLED GMV */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.8,
              borderRadius: 3.5,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)', borderColor: '#CBD5E1' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', letterSpacing: '0.6px' }}>
                  GROSS SETTLED GMV
                </Typography>
                <Box sx={{ bgcolor: '#E0F2FE', color: '#0284C7', p: 1, borderRadius: 2, display: 'flex' }}>
                  <TrendingUp size={18} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
                ₹{(Number(reports?.grossSettledGmv) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mt: 2, display: 'block' }}>
              Total Value of Settled Orders
            </Typography>
          </Paper>
        </Grid>

        {/* CARD 2: TOTAL COMMISSION RETAINED */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.8,
              borderRadius: 3.5,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.1)', borderColor: '#A7F3D0' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', letterSpacing: '0.6px' }}>
                  PLATFORM COMMISSION
                </Typography>
                <Box sx={{ bgcolor: '#D1FAE5', color: '#10B981', p: 1, borderRadius: 2, display: 'flex' }}>
                  <Award size={18} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#059669', letterSpacing: '-0.5px' }}>
                ₹{(Number(reports?.totalCommission) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mt: 2, display: 'block' }}>
              Total Retained Revenue
            </Typography>
          </Paper>
        </Grid>

        {/* CARD 3: NET SELLER PAYOUTS */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.8,
              borderRadius: 3.5,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.1)', borderColor: '#BFDBFE' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', letterSpacing: '0.6px' }}>
                  NET SELLER PAYOUTS
                </Typography>
                <Box sx={{ bgcolor: '#DBEAFE', color: '#2563EB', p: 1, borderRadius: 2, display: 'flex' }}>
                  <DollarSign size={18} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#2563EB', letterSpacing: '-0.5px' }}>
                ₹{(Number(reports?.totalNetSellerPayouts) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mt: 2, display: 'block' }}>
              Transferred to Sellers' Wallet
            </Typography>
          </Paper>
        </Grid>

        {/* CARD 4: TOTAL SETTLEMENTS */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.8,
              borderRadius: 3.5,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(217, 119, 6, 0.1)', borderColor: '#FDE68A' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', letterSpacing: '0.6px' }}>
                  TOTAL SETTLEMENTS
                </Typography>
                <Box sx={{ bgcolor: '#FEF3C7', color: '#D97706', p: 1, borderRadius: 2, display: 'flex' }}>
                  <FileSpreadsheet size={18} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#D97706', letterSpacing: '-0.5px' }}>
                {reports?.totalSettlements || 0}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mt: 2, display: 'block' }}>
              Executed Batch Records
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* SETTLEMENTS LEDGER CONTAINER */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3.5,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.05)',
          bgcolor: '#FFFFFF',
        }}
      >
        {/* LEDGER HEADER & SEARCH */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
              Settlement Audit Ledger
            </Typography>
            <Chip
              label={`${filteredSettlements.length} Entries`}
              size="small"
              sx={{ bgcolor: '#F1F5F9', color: '#0F172A', fontWeight: 800, fontSize: '0.75rem' }}
            />
          </Box>

          <TextField
            size="small"
            placeholder="Search settlement ref or order #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#94A3B8" />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: 260,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                bgcolor: '#F8FAFC',
                '& fieldset': { borderColor: '#E2E8F0' },
                '&:hover fieldset': { borderColor: '#CBD5E1' },
              },
            }}
          />
        </Box>

        {/* LEDGER TABLE */}
        <TableContainer sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', py: 2 }}>
                  Settlement Ref & Date
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Order Reference
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Financial Breakdown & Net Payout
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Status
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Share Statement
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSettlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    <Receipt size={36} color="#CBD5E1" style={{ marginBottom: 8 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748B' }}>
                      No settlement records found
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {searchTerm ? 'Try adjusting your search criteria.' : 'Click "Process Eligible Settlements" above to execute a settlement batch.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSettlements.map((s) => {
                  const gross = Number(s.order_total || 0);
                  const comm = Number(s.commission_amount || 0);
                  const fees = Number(s.gateway_fee || 0) + Number(s.shipping_fee || 0) + Number(s.tax_amount || 0);
                  const net = Number(s.net_amount || 0);

                  return (
                    <TableRow key={s.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      {/* 1. Settlement Ref & Date */}
                      <TableCell sx={{ minWidth: 170 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                          {s.settlement_number || s.settlementNumber || `#STL-${s.id}`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: '0.75rem', mt: 0.2 }}>
                          {new Date(s.settlement_date || s.settlementDate || s.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </Typography>
                      </TableCell>

                      {/* 2. Order Reference */}
                      <TableCell sx={{ minWidth: 180 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0284C7', fontFamily: 'monospace' }}>
                          #{s.order_number || s.order_id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.725rem' }}>
                          Order Completed & Settled
                        </Typography>
                      </TableCell>

                      {/* 3. Financial Breakdown */}
                      <TableCell align="right" sx={{ minWidth: 260 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                            Gross GMV: ₹{gross.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 700, fontSize: '0.725rem' }}>
                            Comm: -₹{comm.toFixed(2)} | Fees: -₹{fees.toFixed(2)}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: '#059669', mt: 0.3, fontSize: '0.9rem' }}>
                            Net Seller Payout: ₹{net.toFixed(2)}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* 4. Status */}
                      <TableCell align="center" sx={{ minWidth: 120 }}>
                        <Chip
                          icon={<CheckCircle2 size={13} />}
                          label={s.status?.toUpperCase() || 'SETTLED'}
                          size="small"
                          sx={{ bgcolor: '#D1FAE5', color: '#047857', fontWeight: 800, fontSize: '0.7rem', px: 0.5 }}
                        />
                      </TableCell>

                      {/* 5. Actions */}
                      <TableCell align="center" sx={{ minWidth: 130 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Share2 size={13} />}
                          onClick={() => {
                            const text = encodeURIComponent(`📄 Settlement Statement #${s.settlement_number || s.settlementNumber}\nOrder #: ${s.order_number || s.order_id}\nGross: INR ${gross.toFixed(2)}\nCommission: INR ${comm.toFixed(2)}\nNet Payout: INR ${net.toFixed(2)}\nStatus: ${s.status?.toUpperCase()}`);
                            window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                          }}
                          sx={{
                            fontWeight: 700,
                            borderRadius: 2,
                            borderColor: '#25D366',
                            color: '#15803D',
                            '&:hover': { bgcolor: '#F0FDF4', borderColor: '#16A34A' },
                            px: 1.5,
                            py: 0.4,
                            minWidth: 'auto',
                            fontSize: '0.75rem',
                          }}
                        >
                          WhatsApp
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </PageContainer>
  );
};

export default SettlementReportsPage;

