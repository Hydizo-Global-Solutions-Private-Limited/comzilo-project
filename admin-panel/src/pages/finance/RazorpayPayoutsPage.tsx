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
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  RefreshCw,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Activity,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { axiosInstance } from '../../api/axiosInstance';
import toast from 'react-hot-toast';

export const RazorpayPayoutsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Data States
  const [queue, setQueue] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [payloadModalData, setPayloadModalData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, hRes, lRes] = await Promise.all([
        axiosInstance.get('/admin/payouts/queue'),
        axiosInstance.get('/admin/payouts/history'),
        axiosInstance.get('/admin/payouts/logs'),
      ]);
      setQueue(qRes.data?.data || []);
      setHistory(hRes.data?.data || []);
      setLogs(lRes.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load Razorpay payout data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProcessQueue = async () => {
    setProcessing(true);
    try {
      const res = await axiosInstance.post('/admin/payouts/process-queue');
      toast.success(`Queue Processed! ${res.data?.data?.processedCount || 0} payout(s) completed.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process payout queue');
    } finally {
      setProcessing(false);
    }
  };

  const handleSimulateWebhook = async (payoutId: string) => {
    try {
      await axiosInstance.post('/webhooks/razorpay-payouts', {
        event: 'payout.processed',
        payload: {
          payout: {
            entity: {
              id: payoutId,
              status: 'processed',
              utr: `UTR_WH_SIM_${Date.now().toString().slice(-6)}`,
            },
          },
        },
      });
      toast.success(`Webhook event simulated for Payout ${payoutId}!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to simulate webhook event');
    }
  };

  const queuedCount = queue.filter((q) => q.status === 'queued').length;
  const processingCount = queue.filter((q) => q.status === 'processing').length;
  const processedCount = history.filter((h) => h.status === 'processed').length;
  const failedCount = history.filter((h) => h.status === 'failed' || h.status === 'reversed').length;

  const queuedTotalAmount = queue
    .filter((q) => q.status === 'queued')
    .reduce((sum, q) => sum + Number(q.amount || 0), 0);

  const processingTotalAmount = queue
    .filter((q) => q.status === 'processing')
    .reduce((sum, q) => sum + Number(q.amount || 0), 0);

  const processedTotalAmount = history
    .filter((h) => h.status === 'processed')
    .reduce((sum, h) => sum + Number(h.amount || 0), 0);

  const failedTotalAmount = history
    .filter((h) => h.status === 'failed' || h.status === 'reversed')
    .reduce((sum, h) => sum + Number(h.amount || 0), 0);

  if (loading) {
    return (
      <PageContainer title="Razorpay Payout Architecture" subtitle="Loading settlement queue & audit logs...">
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Razorpay Payout & Settlement Architecture"
      subtitle="Enterprise automated payout worker system with provider abstraction (Mock / Live Razorpay X API)"
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
            startIcon={<Play size={18} />}
            disabled={processing || queuedCount === 0}
            onClick={handleProcessQueue}
            sx={{ fontWeight: 800 }}
          >
            {processing ? 'Processing...' : `Process Queue (${queuedCount})`}
          </Button>
        </Box>
      }
    >
      {/* PROVIDER MODE STATUS ALERT */}
      <Alert
        severity="info"
        icon={<ShieldCheck size={24} />}
        sx={{ mb: 4, borderRadius: 3, border: '1px solid #93C5FD', bgcolor: '#EFF6FF' }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E40AF' }}>
              CURRENT PAYOUT ENGINE PROVIDER: MOCK TEST ENGINE
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Zero-downtime architecture active. To switch to Live Razorpay X Payouts API, configure{' '}
              <code>RAZORPAY_PAYOUT_MODE=live</code> and add <code>RAZORPAY_PAYOUT_KEY_ID</code> in <code>.env</code>.
            </Typography>
          </Box>
          <Chip label="SERVICE ABSTRACTION ACTIVE" color="primary" sx={{ fontWeight: 800 }} />
        </Box>
      </Alert>

      {/* 4 OVERVIEW STAT CARDS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              QUEUED PAYOUTS ({queuedCount})
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#F59E0B', mt: 0.5 }}>
              ₹{queuedTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {queuedCount} Item(s) Awaiting Dispatch
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              PROCESSING PAYOUTS ({processingCount})
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#2563EB', mt: 0.5 }}>
              ₹{processingTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {processingCount} Item(s) in API Flow
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              TOTAL PAYMENTS PROCESSED ({processedCount})
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#10B981', mt: 0.5 }}>
              ₹{processedTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {processedCount} Completed Settlement UTRs
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              FAILED / REVERSED ({failedCount})
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#EF4444', mt: 0.5 }}>
              ₹{failedTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {failedCount} Payout(s) Requiring Retry
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* TABS FOR QUEUE, HISTORY, AND AUDIT LOGS */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)}>
            <Tab label={`Payout Queue (${queue.length})`} sx={{ fontWeight: 800 }} />
            <Tab label={`Payout History & Status (${history.length})`} sx={{ fontWeight: 800 }} />
            <Tab label={`API Audit Logs (${logs.length})`} sx={{ fontWeight: 800 }} />
          </Tabs>
        </Box>

        {/* TAB 0: PAYOUT QUEUE */}
        {activeTab === 0 && (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Enqueued Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Withdrawal #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Seller / Merchant</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Bank Account</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Mode</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Attempts</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      No items currently in the payout queue.
                    </TableCell>
                  </TableRow>
                ) : (
                  queue.map((q) => (
                    <TableRow key={q.id} hover>
                      <TableCell>{new Date(q.created_at || q.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>#{q.withdrawal_id}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{q.seller_name || `Tenant #${q.tenant_id}`}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{q.bank_name || 'Bank'}</Typography>
                        <Typography variant="caption" color="text.secondary">{q.account_number}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#2563EB' }}>
                        ₹{(Number(q.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell><Chip label={q.mode || 'IMPS'} size="small" variant="outlined" /></TableCell>
                      <TableCell>
                        <Chip
                          label={q.status.toUpperCase()}
                          size="small"
                          color={q.status === 'processed' ? 'success' : q.status === 'processing' ? 'primary' : 'warning'}
                          sx={{ fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell>{q.attempts} / {q.max_attempts || 3}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* TAB 1: PAYOUT HISTORY */}
        {activeTab === 1 && (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Payout Number</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Razorpay Payout ID</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Seller / Merchant</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>UTR / Reference</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Provider</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      No payout history records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell>{new Date(h.created_at || h.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{h.payout_number}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', color: '#2563EB' }}>{h.razorpay_payout_id || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{h.seller_name || `Tenant #${h.tenant_id}`}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#10B981' }}>
                        ₹{(Number(h.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={h.status.toUpperCase()}
                          size="small"
                          color={h.status === 'processed' ? 'success' : h.status === 'processing' ? 'primary' : 'error'}
                          sx={{ fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{h.utr || '-'}</TableCell>
                      <TableCell><Chip label={h.provider || 'MOCK'} size="small" variant="outlined" /></TableCell>
                      <TableCell align="center">
                        <Tooltip title="Simulate Razorpay Webhook Event">
                          <IconButton
                            color="secondary"
                            size="small"
                            onClick={() => handleSimulateWebhook(h.razorpay_payout_id || h.id)}
                          >
                            <Zap size={18} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* TAB 2: AUDIT LOGS */}
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
                  <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Payload Inspection</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      No audit logs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((l) => (
                    <TableRow key={l.id} hover>
                      <TableCell>{new Date(l.created_at || l.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{l.action}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>#{l.withdrawal_id || '-'}</TableCell>
                      <TableCell><Chip label={l.provider || 'MOCK'} size="small" variant="outlined" /></TableCell>
                      <TableCell>
                        <Chip
                          label={l.status_code || 200}
                          size="small"
                          color={l.status_code === 200 ? 'success' : 'error'}
                          sx={{ fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell>{l.execution_time_ms || 0} ms</TableCell>
                      <TableCell align="center">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<FileCode size={14} />}
                          onClick={() => setPayloadModalData(l)}
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
      </Paper>

      {/* PAYLOAD INSPECTOR MODAL */}
      <Dialog open={!!payloadModalData} onClose={() => setPayloadModalData(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          API Payload Inspector - Action: {payloadModalData?.action}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Request Payload:</Typography>
          <Paper sx={{ p: 2, bgcolor: '#0F172A', color: '#38BDF8', fontFamily: 'monospace', fontSize: 13, mb: 3 }}>
            <pre style={{ margin: 0, overflowX: 'auto' }}>
              {JSON.stringify(payloadModalData?.request_payload || {}, null, 2)}
            </pre>
          </Paper>

          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Response Payload:</Typography>
          <Paper sx={{ p: 2, bgcolor: '#0F172A', color: '#4ADE80', fontFamily: 'monospace', fontSize: 13 }}>
            <pre style={{ margin: 0, overflowX: 'auto' }}>
              {JSON.stringify(payloadModalData?.response_payload || {}, null, 2)}
            </pre>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPayloadModalData(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default RazorpayPayoutsPage;
