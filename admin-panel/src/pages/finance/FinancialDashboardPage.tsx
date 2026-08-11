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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  FileCode,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { axiosInstance } from '../../api/axiosInstance';
import toast from 'react-hot-toast';

export const FinancialDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<any>(null);
  const [gatewayLogs, setGatewayLogs] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [payoutLogs, setPayoutLogs] = useState<any[]>([]);

  // Filter & Active Tab States
  const [dateFilter, setDateFilter] = useState<string>('30days');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [activeTab, setActiveTab] = useState<number>(0);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [inspectLogData, setInspectLogData] = useState<any>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let queryParams = `?preset=${dateFilter}`;
      if (dateFilter === 'custom' && customStart && customEnd) {
        queryParams = `?startDate=${customStart}&endDate=${customEnd}`;
      }

      const [ovRes, gwRes, whRes, poRes] = await Promise.all([
        axiosInstance.get(`/admin/finance/dashboard${queryParams}`),
        axiosInstance.get('/admin/finance/gateway-logs'),
        axiosInstance.get('/admin/finance/webhook-logs'),
        axiosInstance.get('/admin/finance/payout-logs'),
      ]);

      setOverview(ovRes.data?.data || null);
      setGatewayLogs(gwRes.data?.data || []);
      setWebhookLogs(whRes.data?.data || []);
      setPayoutLogs(poRes.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load financial dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateFilter]);

  const handleExportCSV = async () => {
    try {
      const response = await axiosInstance.get('/admin/finance/export?format=csv', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_report_${Date.now()}.csv`);
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
      const response = await axiosInstance.get('/admin/finance/export?format=excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_report_${Date.now()}.xls`);
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
      <PageContainer title="Super Admin Financial Intelligence Dashboard" subtitle="Aggregating metrics & revenue streams...">
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Super Admin Financial Intelligence Dashboard"
      subtitle="Real-time platform revenue, SaaS subscriptions, GMV, settlements, and audit logs"
      action={
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={fetchDashboardData}
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
      }
    >
      {/* DATE FILTER CONTROLS */}
      <Paper sx={{ p: 2.5, mb: 4, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Calendar size={20} color="#2563EB" />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              DATE RANGE FILTER:
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {['today', '7days', '30days', 'month', 'custom'].map((preset) => (
              <Chip
                key={preset}
                label={
                  preset === 'today'
                    ? 'Today'
                    : preset === '7days'
                    ? 'Last 7 Days'
                    : preset === '30days'
                    ? 'Last 30 Days'
                    : preset === 'month'
                    ? 'This Month'
                    : 'Custom Range'
                }
                onClick={() => setDateFilter(preset)}
                color={dateFilter === preset ? 'primary' : 'default'}
                variant={dateFilter === preset ? 'filled' : 'outlined'}
                sx={{ fontWeight: 800, cursor: 'pointer' }}
              />
            ))}
          </Box>

          {dateFilter === 'custom' && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                type="date"
                size="small"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <Typography variant="caption">to</Typography>
              <TextField
                type="date"
                size="small"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
              <Button variant="contained" size="small" onClick={fetchDashboardData} sx={{ fontWeight: 800 }}>
                Apply
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* 7 REVENUE METRIC STAT CARDS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', bgcolor: '#F0FDF4' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, color: '#166534' }}>
              TOTAL PLATFORM REVENUE
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#15803D', mt: 0.5 }}>
              ₹{(Number(overview?.platformRevenue) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Commissions + Gateway + Subscriptions
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', bgcolor: '#EFF6FF' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, color: '#1E40AF' }}>
              SUBSCRIPTION REVENUE
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1D4ED8', mt: 0.5 }}>
              ₹{(Number(overview?.subscriptionRevenue) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Seller SaaS Plans Total
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', bgcolor: '#F5F3FF' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, color: '#5B21B6' }}>
              MARKETPLACE GMV
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#6D28D9', mt: 0.5 }}>
              ₹{(Number(overview?.marketplaceRevenue) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gross Merchandise Order Volume
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', bgcolor: '#FFFBEB' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, color: '#92400E' }}>
              PENDING SETTLEMENTS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#B45309', mt: 0.5 }}>
              ₹{(Number(overview?.pendingSettlements) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Unsettled Escrow Balances
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', bgcolor: '#ECFDF5' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, color: '#065F46' }}>
              COMPLETED SETTLEMENTS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#047857', mt: 0.5 }}>
              ₹{(Number(overview?.completedSettlements) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Settled Bank Payouts
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', bgcolor: '#FFF1F2' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, color: '#9F1239' }}>
              REFUNDS ({overview?.refunds?.count || 0})
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#BE123C', mt: 0.5 }}>
              ₹{(Number(overview?.refunds?.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Customer Order Refunds
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', bgcolor: '#FEF2F2' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, color: '#991B1B' }}>
              CHARGEBACKS ({overview?.chargebacks?.count || 0})
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#DC2626', mt: 0.5 }}>
              ₹{(Number(overview?.chargebacks?.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Disputed Chargeback Claims
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ANALYTICS CHARTS & BREAKDOWN */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* PAYMENT METHOD ANALYTICS */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', minHeight: 300 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Payment Gateway Method Share
            </Typography>
            {overview?.paymentMethodBreakdown?.length === 0 ? (
              <Typography color="text.secondary">No payment method analytics recorded.</Typography>
            ) : (
              overview?.paymentMethodBreakdown?.map((pm: any, idx: number) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {pm.method} ({pm.count} orders)
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2563EB' }}>
                      ₹{(Number(pm.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', bgcolor: '#E2E8F0', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                    <Box
                      sx={{
                        bgcolor: idx % 2 === 0 ? '#2563EB' : '#10B981',
                        height: '100%',
                        width: `${Math.min(100, (Number(pm.amount) / (overview?.marketplaceRevenue || 1)) * 100)}%`,
                      }}
                    />
                  </Box>
                </Box>
              ))
            )}
          </Paper>
        </Grid>

        {/* MONTHLY REVENUE TREND */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', minHeight: 300 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Monthly Gross Revenue Trends
            </Typography>
            {overview?.monthlyRevenueTrend?.length === 0 ? (
              <Typography color="text.secondary">No monthly trend data recorded.</Typography>
            ) : (
              overview?.monthlyRevenueTrend?.map((mt: any, idx: number) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{mt.month}</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#10B981' }}>
                      ₹{(Number(mt.gmv) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', bgcolor: '#E2E8F0', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                    <Box
                      sx={{
                        bgcolor: '#10B981',
                        height: '100%',
                        width: `${Math.min(100, (Number(mt.gmv) / (overview?.marketplaceRevenue || 1)) * 100)}%`,
                      }}
                    />
                  </Box>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* AUDIT LOG INSPECTION TABS */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)}>
            <Tab label={`Gateway Logs (${gatewayLogs.length})`} sx={{ fontWeight: 800 }} />
            <Tab label={`Webhook Event Logs (${webhookLogs.length})`} sx={{ fontWeight: 800 }} />
            <Tab label={`Payout Audit Logs (${payoutLogs.length})`} sx={{ fontWeight: 800 }} />
          </Tabs>
        </Box>

        {/* TAB 0: GATEWAY LOGS */}
        {activeTab === 0 && (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Order #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Payment Method</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Payment Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Transaction ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gatewayLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>No gateway logs recorded.</TableCell>
                  </TableRow>
                ) : (
                  gatewayLogs.map((g) => (
                    <TableRow key={g.id} hover>
                      <TableCell>{new Date(g.created_at || g.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{g.order_number}</TableCell>
                      <TableCell><Chip label={g.payment_method || 'RAZORPAY'} size="small" variant="outlined" /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#2563EB' }}>
                        INR {Number(g.amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={(g.payment_status || 'paid').toUpperCase()}
                          size="small"
                          color={g.payment_status === 'paid' ? 'success' : 'warning'}
                          sx={{ fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{g.transaction_id || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* TAB 1: WEBHOOK LOGS */}
        {activeTab === 1 && (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Event</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Provider</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Inspection</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {webhookLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>No webhook logs recorded.</TableCell>
                  </TableRow>
                ) : (
                  webhookLogs.map((w) => (
                    <TableRow key={w.id} hover>
                      <TableCell>{new Date(w.created_at || w.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{w.event}</TableCell>
                      <TableCell><Chip label={w.provider || 'RAZORPAY'} size="small" variant="outlined" /></TableCell>
                      <TableCell>
                        <Chip label={w.status_code || 200} size="small" color="success" sx={{ fontWeight: 800 }} />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<FileCode size={14} />}
                          onClick={() => setInspectLogData(w)}
                          sx={{ fontWeight: 700 }}
                        >
                          View Payload
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* TAB 2: PAYOUT LOGS */}
        {activeTab === 2 && (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Withdrawal #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Provider</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status Code</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Latency</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payoutLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>No payout logs recorded.</TableCell>
                  </TableRow>
                ) : (
                  payoutLogs.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>{new Date(p.created_at || p.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{p.action}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>#{p.withdrawal_id || '-'}</TableCell>
                      <TableCell><Chip label={p.provider || 'MOCK'} size="small" variant="outlined" /></TableCell>
                      <TableCell>
                        <Chip label={p.status_code || 200} size="small" color="success" sx={{ fontWeight: 800 }} />
                      </TableCell>
                      <TableCell>{p.execution_time_ms || 0} ms</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* INSPECT LOG MODAL */}
      <Dialog open={!!inspectLogData} onClose={() => setInspectLogData(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Event Payload Inspector: {inspectLogData?.event || inspectLogData?.action}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Request Payload:</Typography>
          <Paper sx={{ p: 2, bgcolor: '#0F172A', color: '#38BDF8', fontFamily: 'monospace', fontSize: 13, mb: 3 }}>
            <pre style={{ margin: 0, overflowX: 'auto' }}>
              {JSON.stringify(inspectLogData?.request_payload || {}, null, 2)}
            </pre>
          </Paper>

          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Response Payload:</Typography>
          <Paper sx={{ p: 2, bgcolor: '#0F172A', color: '#4ADE80', fontFamily: 'monospace', fontSize: 13 }}>
            <pre style={{ margin: 0, overflowX: 'auto' }}>
              {JSON.stringify(inspectLogData?.response_payload || {}, null, 2)}
            </pre>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setInspectLogData(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FinancialDashboardPage;
