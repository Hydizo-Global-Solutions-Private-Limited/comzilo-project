import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Receipt,
  FileCode,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { axiosInstance } from '../../api/axiosInstance';
import toast from 'react-hot-toast';

export const SellerFinancialDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

  const fetchFinancialDashboard = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/seller/wallet/financial-dashboard');
      setData(res.data?.data || null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load seller financial dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialDashboard();
  }, []);

  const handleExportCSV = async () => {
    try {
      const response = await axiosInstance.get('/seller/wallet/financial-export?format=csv', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `seller_financial_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      toast.success('CSV Financial Report downloaded!');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setExportAnchorEl(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await axiosInstance.get('/seller/wallet/financial-export?format=excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `seller_financial_report_${Date.now()}.xls`);
      document.body.appendChild(link);
      link.click();
      toast.success('Excel Financial Report downloaded!');
    } catch {
      toast.error('Failed to export Excel');
    } finally {
      setExportAnchorEl(null);
    }
  };

  const handlePrintPDF = () => {
    setExportAnchorEl(null);
    window.print();
  };

  if (loading) {
    return (
      <PageContainer title="Seller Financial & Earnings Dashboard" subtitle="Loading financial metrics & reports...">
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Seller Financial & Earnings Dashboard"
      subtitle="Track your revenue, wallet balances, settlements, withdrawals, and commission reports"
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<RefreshCw size={18} />}
          onClick={fetchFinancialDashboard}
          sx={{ fontWeight: 700 }}
        >
          Refresh
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Download size={18} />}
          onClick={(e) => setExportAnchorEl(e.currentTarget)}
          sx={{ fontWeight: 800 }}
        >
          Export Financial Report
        </Button>
        <Menu
          anchorEl={exportAnchorEl}
          open={Boolean(exportAnchorEl)}
          onClose={() => setExportAnchorEl(null)}
        >
          <MenuItem onClick={handleExportCSV}>
            <FileText size={16} style={{ marginRight: 8 }} /> Export CSV
          </MenuItem>
          <MenuItem onClick={handleExportExcel}>
            <FileSpreadsheet size={16} style={{ marginRight: 8 }} /> Export Excel (.xls)
          </MenuItem>
          <MenuItem onClick={handlePrintPDF}>
            <Printer size={16} style={{ marginRight: 8 }} /> Print / Export PDF
          </MenuItem>
        </Menu>
      </Box>
      {/* 5 METRIC STAT CARDS */}
      <Grid container spacing={2.5} sx={{ mb: 4, alignItems: 'stretch' }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #DCFCE7', boxShadow: '0 4px 12px rgba(22,101,52,0.04)', bgcolor: '#F0FDF4', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534', letterSpacing: 0.5 }}>
                TODAY'S REVENUE
              </Typography>
              <TrendingUp size={18} color="#166534" />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#15803D', letterSpacing: '-0.5px', my: 0.5 }}>
                ₹{Number(data?.todayRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#166534', opacity: 0.85, fontWeight: 500 }}>
                Net Earnings Today
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #DBEAFE', boxShadow: '0 4px 12px rgba(30,64,175,0.04)', bgcolor: '#EFF6FF', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#1E40AF', letterSpacing: 0.5 }}>
                MONTHLY REVENUE
              </Typography>
              <DollarSign size={18} color="#1E40AF" />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#1D4ED8', letterSpacing: '-0.5px', my: 0.5 }}>
                ₹{Number(data?.monthlyRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#1E40AF', opacity: 0.85, fontWeight: 500 }}>
                Net Earnings This Month
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #DDD6FE', boxShadow: '0 4px 12px rgba(91,33,182,0.04)', bgcolor: '#F5F3FF', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#5B21B6', letterSpacing: 0.5 }}>
                TOTAL WALLET
              </Typography>
              <CreditCard size={18} color="#5B21B6" />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#6D28D9', letterSpacing: '-0.5px', my: 0.5 }}>
                ₹{Number(data?.totalBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#5B21B6', opacity: 0.85, fontWeight: 500 }}>
                Pending + Available Escrow
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #FEF3C7', boxShadow: '0 4px 12px rgba(146,64,14,0.04)', bgcolor: '#FFFBEB', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#92400E', letterSpacing: 0.5 }}>
                PENDING SETTLEMENT
              </Typography>
              <Clock size={18} color="#92400E" />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#B45309', letterSpacing: '-0.5px', my: 0.5 }}>
                ₹{Number(data?.pendingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#92400E', opacity: 0.85, fontWeight: 500 }}>
                Awaiting Return Window
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #A7F3D0', boxShadow: '0 4px 12px rgba(6,95,70,0.04)', bgcolor: '#ECFDF5', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#065F46', letterSpacing: 0.5 }}>
                AVAILABLE BALANCE
              </Typography>
              <CheckCircle2 size={18} color="#065F46" />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#047857', letterSpacing: '-0.5px', my: 0.5 }}>
                ₹{Number(data?.availableBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#065F46', opacity: 0.85, fontWeight: 500 }}>
                Ready for Payout Request
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* REVENUE CHARTS */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
          Daily Net Revenue Trends (Last 14 Days)
        </Typography>
        {data?.revenueChart?.length === 0 ? (
          <Typography color="text.secondary">No revenue trend data recorded for this store.</Typography>
        ) : (
          data?.revenueChart?.map((rc: any, idx: number) => (
            <Box key={idx} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{rc.date}</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#10B981' }}>
                  INR {Number(rc.amount).toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ width: '100%', bgcolor: '#E2E8F0', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                <Box
                  sx={{
                    bgcolor: '#10B981',
                    height: '100%',
                    width: `${Math.min(100, (Number(rc.amount) / (data?.monthlyRevenue || 1)) * 100)}%`,
                  }}
                />
              </Box>
            </Box>
          ))
        )}
      </Paper>

      {/* FINANCIAL LEDGER TABS */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)}>
            <Tab label={`Settlement History (${data?.settlementHistory?.length || 0})`} sx={{ fontWeight: 800 }} />
            <Tab label={`Withdrawal History (${data?.withdrawalHistory?.length || 0})`} sx={{ fontWeight: 800 }} />
            <Tab label={`Invoices (${data?.invoices?.length || 0})`} sx={{ fontWeight: 800 }} />
            <Tab label={`Commission Reports (${data?.commissionReports?.length || 0})`} sx={{ fontWeight: 800 }} />
          </Tabs>
        </Box>

        {/* TAB 0: SETTLEMENT HISTORY */}
        {activeTab === 0 && (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Transaction #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.settlementHistory?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>No settlement transactions recorded.</TableCell>
                  </TableRow>
                ) : (
                  data?.settlementHistory?.map((s: any) => (
                    <TableRow key={s.id} hover>
                      <TableCell>{new Date(s.created_at || s.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.transaction_number}</TableCell>
                      <TableCell>{s.description || 'Order Escrow Settlement'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#10B981' }}>
                        + INR {Number(s.amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip label={(s.status || 'COMPLETED').toUpperCase()} size="small" color="success" sx={{ fontWeight: 800 }} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* TAB 1: WITHDRAWAL HISTORY */}
        {activeTab === 1 && (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Withdrawal #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Bank Account</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.withdrawalHistory?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>No withdrawal requests recorded.</TableCell>
                  </TableRow>
                ) : (
                  data?.withdrawalHistory?.map((w: any) => (
                    <TableRow key={w.id} hover>
                      <TableCell>{new Date(w.created_at || w.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{w.withdrawal_number}</TableCell>
                      <TableCell>{w.bank_name} ({w.account_number})</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#2563EB' }}>
                        INR {Number(w.net_amount || w.netSellerPayout || w.amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={(w.status || 'pending').toUpperCase()}
                          size="small"
                          color={w.status === 'paid' ? 'success' : w.status === 'rejected' ? 'error' : 'warning'}
                          sx={{ fontWeight: 800 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* TAB 2: INVOICES */}
        {activeTab === 2 && (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Invoice #</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.invoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>No invoices recorded.</TableCell>
                  </TableRow>
                ) : (
                  data?.invoices?.map((i: any) => (
                    <TableRow key={i.id} hover>
                      <TableCell>{new Date(i.created_at || i.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>INV-{i.id}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#2563EB' }}>
                        INR {Number(i.total ?? i.totalAmount ?? i.amount ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip label={(i.status || 'PAID').toUpperCase()} size="small" color="success" sx={{ fontWeight: 800 }} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* TAB 3: COMMISSION REPORTS */}
        {activeTab === 3 && (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Order Gross Total</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Commission (10%)</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Gateway Fee</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Shipping Fee</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Net Seller Payout</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.commissionReports?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>No order commission reports recorded.</TableCell>
                  </TableRow>
                ) : (
                  data?.commissionReports?.map((c: any) => (
                    <TableRow key={c.id} hover>
                      <TableCell>{new Date(c.created_at || c.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>INR {Number(c.order_total || 0).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: '#DC2626' }}>- INR {Number(c.platform_commission || 0).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: '#DC2626' }}>- INR {Number(c.gateway_fee || 0).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: '#DC2626' }}>- INR {Number(c.shipping_fee || 0).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#10B981' }}>
                        + INR {Number(c.net_seller_payout || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </PageContainer>
  );
};

export default SellerFinancialDashboardPage;
