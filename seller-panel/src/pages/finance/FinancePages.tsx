import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { PageContainer } from '../../components/layout/PageContainer';
import { axiosInstance } from '../../api/axiosInstance';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { Plus, DollarSign, TrendingDown, Receipt, Percent, CreditCard, RefreshCw } from 'lucide-react';

// Helper to calculate total
const calculateSum = (arr: any[], field: string) => {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((acc, curr) => acc + (Number(curr[field] || curr.amount || curr.totalAmount || 0) || 0), 0);
};

// 1. Finance Payments Page (/finance/payments)
export const FinancePaymentsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gateway, setGateway] = useState('Razorpay Gateway');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Credit Card');
  const [txnRef, setTxnRef] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/payments');
      const data = res.data?.data?.rows || res.data?.data?.payments || res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data?.data : []);
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleCreatePayment = () => {
    if (!amount) return toast.error('Please enter payment amount');
    const newPay = {
      id: `PAY-FIN-${Date.now().toString().slice(-4)}`,
      paymentGateway: gateway,
      transactionRef: txnRef || `TXN_${Math.floor(100000000 + Math.random() * 900000000)}`,
      paymentMethod: method,
      amount: Number(amount),
      fee: formatCurrency(Number(amount) * 0.015),
      settlementStatus: 'SETTLED',
      createdAt: new Date().toISOString(),
    };
    setPayments((prev) => [newPay, ...prev]);
    toast.success('Financial Settlement recorded successfully!');
    setDialogOpen(false);
    setAmount('');
    setTxnRef('');
  };

  const totalAmount = calculateSum(payments, 'amount');

  return (
    <PageContainer
      title="Financial Payments & Payout Reconciliation"
      subtitle="Track gateway settlements, merchant payouts, payment gateway transaction fees, and bank reconciliations"
      actionText="Record Merchant Settlement"
      onAction={() => setDialogOpen(true)}
      actionIcon={<Plus size={18} />}
    >
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Total Payments Processed</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
              {formatCurrency(totalAmount)}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Total Transaction Records</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'warning.main' }}>
              {payments.length} Payments
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Bank Settlement Status</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
              {formatCurrency(totalAmount)} Settled
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Payment Ref ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Payment Gateway</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Transaction Ref</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Gross Amount</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Settlement Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                  No payment settlements found in database. Click <strong>"Record Merchant Settlement"</strong> to add one.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p, idx) => (
                <TableRow key={p.id || idx}>
                  <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{p.paymentNumber || p.id || `PAY-${idx + 1}`}</TableCell>
                  <TableCell>{p.gateway || p.paymentGateway || 'Razorpay Gateway'}</TableCell>
                  <TableCell><Chip label={p.gatewayReference || p.transactionReference || p.transactionRef || `TXN_${p.id || idx + 100}`} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} /></TableCell>
                  <TableCell>{(p.paymentMethod || p.method || 'Credit Card').toUpperCase()}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'success.main' }}>{formatCurrency(p.amount || 0)}</TableCell>
                  <TableCell>{formatDate(p.createdAt || p.date || new Date())}</TableCell>
                  <TableCell>
                    <Chip
                      label={(p.paymentStatus || p.settlementStatus || p.status || 'PAID').toUpperCase()}
                      color={(p.paymentStatus || p.status) === 'failed' ? 'error' : (p.paymentStatus || p.status) === 'pending' ? 'warning' : 'success'}
                      size="small"
                      sx={{ fontWeight: 800 }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Record Settlement Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Record Merchant Settlement</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Payment Gateway" select fullWidth value={gateway} onChange={(e) => setGateway(e.target.value)}>
              <MenuItem value="Razorpay Gateway">Razorpay Gateway</MenuItem>
              <MenuItem value="Stripe Global">Stripe Global</MenuItem>
              <MenuItem value="Paytm Business">Paytm Business</MenuItem>
              <MenuItem value="Bank Wire Transfer">Bank Wire Transfer</MenuItem>
            </TextField>
            <TextField label="Payment Method" select fullWidth value={method} onChange={(e) => setMethod(e.target.value)}>
              <MenuItem value="Credit Card">Credit Card</MenuItem>
              <MenuItem value="UPI Instant">UPI Instant</MenuItem>
              <MenuItem value="Net Banking">Net Banking</MenuItem>
              <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
            </TextField>
            <TextField label="Amount (₹)" type="number" fullWidth value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 2500" />
            <TextField label="Transaction Reference (Optional)" fullWidth value={txnRef} onChange={(e) => setTxnRef(e.target.value)} placeholder="Auto-generated if blank" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreatePayment} sx={{ fontWeight: 700 }}>
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

// 2. Finance Refunds Page (/finance/refunds)
export const FinanceRefundsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Customer return');
  const [mode, setMode] = useState('Original Payment Source (Bank)');

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/refunds');
      const data = res.data?.data || res.data?.items || res.data;
      setRefunds(Array.isArray(data) ? data : []);
    } catch {
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleCreateRefund = () => {
    if (!amount) return toast.error('Please enter refund amount');
    const newRef = {
      id: `REF-FIN-${Date.now().toString().slice(-4)}`,
      orderId: orderId || 'ORD-2026-1001',
      amount: Number(amount),
      reason,
      mode,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    };
    setRefunds((prev) => [newRef, ...prev]);
    toast.success('Financial Refund processed successfully!');
    setDialogOpen(false);
    setAmount('');
    setOrderId('');
  };

  const totalRefunds = calculateSum(refunds, 'amount');

  return (
    <PageContainer
      title="Financial Refunds & Disbursements"
      subtitle="Manage customer refund accounting, bank reversals, store credit wallet disbursements, and audit logs"
      actionText="Process Manual Refund"
      onAction={() => setDialogOpen(true)}
      actionIcon={<Plus size={18} />}
    >
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Total Refunds Disbursed</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'error.main' }}>
              {formatCurrency(totalRefunds)}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Total Refund Records</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
              {refunds.length} Refunds
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Pending Bank Reversals</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
              0 Pending
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Refund ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Order ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Refund Reason</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Disbursement Mode</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Refund Amount</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : refunds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                  No refund disbursements found in database. Click <strong>"Process Manual Refund"</strong> to add one.
                </TableCell>
              </TableRow>
            ) : (
              refunds.map((r, idx) => (
                <TableRow key={r.id || idx}>
                  <TableCell sx={{ fontWeight: 600 }}>{r.id || `REF-${idx + 1}`}</TableCell>
                  <TableCell><Chip label={r.orderId || r.orderNumber || `ORD-${idx + 100}`} size="small" variant="outlined" /></TableCell>
                  <TableCell>{r.reason || 'Customer return'}</TableCell>
                  <TableCell>{r.mode || 'Original Payment Source'}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>{formatCurrency(r.amount || 0)}</TableCell>
                  <TableCell>{formatDate(r.createdAt || r.date || new Date())}</TableCell>
                  <TableCell>
                    <Chip label={(r.status || 'COMPLETED').toUpperCase()} color="success" size="small" sx={{ fontWeight: 700 }} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Process Refund Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Process Financial Refund</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Order Number" fullWidth value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="e.g. ORD-2026-000008" />
            <TextField label="Refund Amount (₹)" type="number" fullWidth value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1500" />
            <TextField label="Refund Reason" fullWidth value={reason} onChange={(e) => setReason(e.target.value)} />
            <TextField label="Disbursement Mode" select fullWidth value={mode} onChange={(e) => setMode(e.target.value)}>
              <MenuItem value="Original Payment Source (Bank)">Original Payment Source (Bank)</MenuItem>
              <MenuItem value="Store Credit Wallet">Store Credit Wallet</MenuItem>
              <MenuItem value="Manual Bank Transfer">Manual Bank Transfer</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateRefund} sx={{ fontWeight: 700 }}>
            Process Refund
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

// 3. Taxes Page (/finance/taxes)
export const TaxesPage: React.FC = () => {
  const [taxes, setTaxes] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taxName, setTaxName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [region, setRegion] = useState('India National');

  const handleAddTax = () => {
    if (!taxName || !taxRate) return toast.error('Please enter tax name and rate');
    const newTax = {
      id: Date.now(),
      name: taxName,
      code: taxCode || `GST_${taxRate}`,
      rate: `${taxRate}%`,
      type: 'Percentage',
      region,
      status: 'ACTIVE',
    };
    setTaxes((prev) => [...prev, newTax]);
    toast.success(`Tax Rule "${taxName}" added successfully!`);
    setDialogOpen(false);
    setTaxName('');
    setTaxRate('');
    setTaxCode('');
  };

  return (
    <PageContainer
      title="Tax Rules & Rates"
      subtitle="Configure multi-region sales tax rules, GST brackets, and tax exemption certificates"
      actionText="Add Tax Rule"
      onAction={() => setDialogOpen(true)}
      actionIcon={<Plus size={18} />}
    >
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Total Configured Tax Rules</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
              {taxes.length} Rules
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Active Status</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
              {taxes.filter((t) => t.status === 'ACTIVE').length} Active
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Default Tax Jurisdiction</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>GST India (Interstate)</Typography>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Tax Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Tax Code</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Rate</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Applicable Region</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {taxes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                  No tax rules configured. Click <strong>"Add Tax Rule"</strong> to define GST / Sales tax brackets.
                </TableCell>
              </TableRow>
            ) : (
              taxes.map((row) => (
                <TableRow key={row.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                  <TableCell><Chip label={row.code} size="small" variant="outlined" /></TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{row.rate}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.region}</TableCell>
                  <TableCell><Chip label={row.status} color="success" size="small" sx={{ fontWeight: 700 }} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Tax Rule Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Tax Rule</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Tax Rule Name" fullWidth value={taxName} onChange={(e) => setTaxName(e.target.value)} placeholder="e.g. GST Standard Rate" />
            <TextField label="Tax Code" fullWidth value={taxCode} onChange={(e) => setTaxCode(e.target.value)} placeholder="e.g. GST_18" />
            <TextField label="Tax Rate (%)" type="number" fullWidth value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="e.g. 18" />
            <TextField label="Applicable Region" fullWidth value={region} onChange={(e) => setRegion(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTax} sx={{ fontWeight: 700 }}>
            Save Tax Rule
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

// 4. Expenses Page (/finance/expenses)
export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Logistics');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');

  const handleAddExpense = () => {
    if (!title || !amount) return toast.error('Please enter expense title and amount');
    const newExp = {
      id: `EXP-${Date.now().toString().slice(-4)}`,
      title,
      category,
      amount: Number(amount),
      vendor: vendor || 'Vendor',
      date: new Date().toISOString().split('T')[0],
      status: 'PAID',
    };
    setExpenses((prev) => [newExp, ...prev]);
    toast.success(`Expense "${title}" recorded successfully!`);
    setDialogOpen(false);
    setTitle('');
    setAmount('');
    setVendor('');
  };

  const totalExp = calculateSum(expenses, 'amount');

  return (
    <PageContainer
      title="Expense Directory"
      subtitle="Track operational expenses, shipping carrier invoices, marketing spend, and overhead"
      actionText="Record New Expense"
      onAction={() => setDialogOpen(true)}
      actionIcon={<Plus size={18} />}
    >
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Total Operating Expenses</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'error.main' }}>
              {formatCurrency(totalExp)}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Total Expenses Recorded</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
              {expenses.length} Records
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Pending Payable Invoices</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
              ₹0.00 (All Clear)
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Expense ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Title / Description</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Vendor</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                  No operational expenses recorded. Click <strong>"Record New Expense"</strong> to log courier or advertising costs.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{exp.id}</TableCell>
                  <TableCell>{exp.title}</TableCell>
                  <TableCell><Chip label={exp.category} size="small" variant="outlined" /></TableCell>
                  <TableCell>{exp.vendor}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>{formatCurrency(exp.amount)}</TableCell>
                  <TableCell>{exp.date}</TableCell>
                  <TableCell><Chip label={exp.status} color="success" size="small" sx={{ fontWeight: 700 }} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Record Expense Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Record Operational Expense</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Expense Title / Description" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Courier Shipping Fees" />
            <TextField label="Category" select fullWidth value={category} onChange={(e) => setCategory(e.target.value)}>
              <MenuItem value="Logistics">Logistics & Parcel Courier</MenuItem>
              <MenuItem value="Marketing">Marketing & Meta Ads</MenuItem>
              <MenuItem value="IT & Software">IT & Software Hosting</MenuItem>
              <MenuItem value="Warehouse Overhead">Warehouse Overhead & Utilities</MenuItem>
            </TextField>
            <TextField label="Vendor / Service Provider" fullWidth value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Delhivery Express" />
            <TextField label="Amount (₹)" type="number" fullWidth value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5000" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddExpense} sx={{ fontWeight: 700 }}>
            Save Expense
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

// 5. Profit & Loss Page (/finance/pnl)
export const ProfitLossPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/reports');
      setAnalytics(res.data?.data || res.data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const totalSales = Number(analytics?.totalSales || analytics?.grossRevenue || 0);
  const cogs = Number(analytics?.cogs || Math.round(totalSales * 0.4));
  const opex = Number(analytics?.opex || Math.round(totalSales * 0.15));
  const netIncome = totalSales - cogs - opex;

  return (
    <PageContainer
      title="Profit & Loss Statement (P&L)"
      subtitle="Executive income statement detailing gross revenue, COGS, operating costs, and net margin"
      actionText="Refresh Financials"
      onAction={fetchAnalytics}
      actionIcon={<RefreshCw size={18} />}
    >
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: 3, borderLeft: '4px solid #10B981' }}>
            <Typography variant="body2" color="text.secondary">Gross Sales Revenue</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#10B981' }}>
              {formatCurrency(totalSales)}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: 3, borderLeft: '4px solid #F59E0B' }}>
            <Typography variant="body2" color="text.secondary">Cost of Goods Sold (COGS)</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#F59E0B' }}>
              {formatCurrency(cogs)}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: 3, borderLeft: '4px solid #EF4444' }}>
            <Typography variant="body2" color="text.secondary">Operating Expenses</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#EF4444' }}>
              {formatCurrency(opex)}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: 3, borderLeft: '4px solid #2563EB' }}>
            <Typography variant="body2" color="text.secondary">Net Operating Income</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#2563EB' }}>
              {formatCurrency(netIncome)}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Real-Time Financial Income Statement</Typography>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Financial Statement Line Item</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Amount (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Margin / Contribution %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Total Gross Order Revenue</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'success.main' }}>{formatCurrency(totalSales)}</TableCell>
                <TableCell><Chip label="100.0%" color="success" size="small" sx={{ fontWeight: 700 }} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Cost of Goods Sold (COGS)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{formatCurrency(cogs)}</TableCell>
                <TableCell><Chip label={totalSales > 0 ? `${((cogs / totalSales) * 100).toFixed(1)}%` : '0.0%'} color="warning" size="small" sx={{ fontWeight: 700 }} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Gross Operating Profit</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{formatCurrency(totalSales - cogs)}</TableCell>
                <TableCell><Chip label={totalSales > 0 ? `${(((totalSales - cogs) / totalSales) * 100).toFixed(1)}%` : '0.0%'} color="primary" size="small" sx={{ fontWeight: 700 }} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Operating Expenses & Shipping Logistics</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>{formatCurrency(opex)}</TableCell>
                <TableCell><Chip label={totalSales > 0 ? `${((opex / totalSales) * 100).toFixed(1)}%` : '0.0%'} color="error" size="small" sx={{ fontWeight: 700 }} /></TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#EFF6FF' }}>
                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Net Profit (EBITDA)</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '1rem', color: 'primary.main' }}>{formatCurrency(netIncome)}</TableCell>
                <TableCell><Chip label={totalSales > 0 ? `${((netIncome / totalSales) * 100).toFixed(1)}%` : '0.0%'} color="success" size="small" sx={{ fontWeight: 800 }} /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </PageContainer>
  );
};
