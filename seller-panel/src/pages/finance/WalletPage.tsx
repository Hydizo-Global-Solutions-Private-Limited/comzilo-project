import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Wallet,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Building2,
  DollarSign,
  Download,
  CreditCard,
  Send,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { axiosInstance } from '../../api/axiosInstance';
import toast from 'react-hot-toast';

export const WalletPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Withdraw Modal State
  const [withdrawModalOpen, setWithdrawModalOpen] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState<boolean>(false);

  // Bank Modal State
  const [bankModalOpen, setBankModalOpen] = useState<boolean>(false);
  const [bankData, setBankData] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
  });

  const [bankAccount, setBankAccount] = useState<any>(null);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const [walletRes, txRes, wthRes, bankRes] = await Promise.all([
        axiosInstance.get('/seller/wallet'),
        axiosInstance.get('/seller/wallet/transactions'),
        axiosInstance.get('/seller/wallet/withdrawals'),
        axiosInstance.get('/seller/bank-account').catch(() => ({ data: { data: null } })),
      ]);
      setWallet(walletRes.data.data);
      setTransactions(txRes.data.data?.rows || (Array.isArray(txRes.data.data) ? txRes.data.data : []));
      setWithdrawals(wthRes.data.data?.rows || (Array.isArray(wthRes.data.data) ? wthRes.data.data : []));
      setBankAccount(bankRes.data?.data || null);
      if (walletRes.data.data?.bankDetails) {
        setBankData(walletRes.data.data.bankDetails);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleWithdrawSubmit = async () => {
    if (!bankAccount || bankAccount.status !== 'VERIFIED') {
      toast.error('Your bank account must be verified before requesting settlements.');
      return;
    }

    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid positive withdrawal amount');
      return;
    }
    if (wallet && amt > wallet.availableBalance) {
      toast.error(`Amount exceeds withdrawable available balance (INR ${wallet.availableBalance.toFixed(2)})`);
      return;
    }

    setWithdrawSubmitting(true);
    try {
      await axiosInstance.post('/seller/wallet/withdraw', {
        amount: amt,
        bankDetails: bankData,
      });
      toast.success(`Withdrawal request of INR ${amt.toFixed(2)} submitted successfully!`);
      setWithdrawModalOpen(false);
      setWithdrawAmount('');
      fetchWalletData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit withdrawal request');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!bankData.bankName || !bankData.accountNumber || !bankData.ifscCode) {
      toast.error('Bank Name, Account Number, and IFSC code are required');
      return;
    }
    try {
      await axiosInstance.post('/seller/wallet/bank-details', bankData);
      toast.success('Bank account details updated successfully!');
      setBankModalOpen(false);
      fetchWalletData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update bank details');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading Seller Wallet & Escrow Balances...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header & Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
            Seller Wallet & Settlement Hub
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comzilo Escrow Protection System • Automated Order Settlements & Bank Payouts
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={fetchWalletData}
            sx={{ fontWeight: 700 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!bankAccount || bankAccount.status !== 'VERIFIED'}
            startIcon={<Send size={18} />}
            onClick={() => setWithdrawModalOpen(true)}
            sx={{ fontWeight: 800, px: 3 }}
          >
            Withdraw Funds
          </Button>
        </Box>
      </Box>

      {/* BANK VERIFICATION GUARD ALERT */}
      {(!bankAccount || bankAccount.status !== 'VERIFIED') && (
        <Alert
          severity="warning"
          icon={<ShieldCheck size={24} />}
          action={
            <Button color="inherit" size="small" href="/finance/bank-account" sx={{ fontWeight: 800 }}>
              Verify Bank Account
            </Button>
          }
          sx={{ mb: 4, borderRadius: 3, fontWeight: 600 }}
        >
          Your bank account must be verified before requesting settlements.
        </Alert>
      )}

      {/* 4 STAT CARDS */}
      <Grid container spacing={3} sx={{ mb: 4, alignItems: 'stretch' }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', color: '#FFF', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800, letterSpacing: 0.5 }}>
                TOTAL WALLET
              </Typography>
              <Wallet size={20} color="#38BDF8" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px', my: 0.5 }}>
                ₹{Number(wallet?.totalBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                Combined Escrow & Available
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #FEF3C7', boxShadow: '0 4px 12px rgba(146,64,14,0.04)', bgcolor: '#FFFBEB', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, color: '#92400E', letterSpacing: 0.5 }}>
                PENDING (ESCROW)
              </Typography>
              <Clock size={20} color="#F59E0B" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#F59E0B', letterSpacing: '-0.5px', my: 0.5 }}>
                ₹{Number(wallet?.pendingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Held in Escrow until Delivery
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #A7F3D0', boxShadow: '0 4px 12px rgba(6,95,70,0.04)', bgcolor: '#ECFDF5', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, color: '#065F46', letterSpacing: 0.5 }}>
                AVAILABLE PAYOUT
              </Typography>
              <CheckCircle2 size={20} color="#10B981" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#10B981', letterSpacing: '-0.5px', my: 0.5 }}>
                ₹{Number(wallet?.availableBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ready for Instant Payout
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #DBEAFE', boxShadow: '0 4px 12px rgba(30,64,175,0.04)', bgcolor: '#EFF6FF', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, color: '#1E40AF', letterSpacing: 0.5 }}>
                TOTAL WITHDRAWN
              </Typography>
              <ArrowUpRight size={20} color="#2563EB" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#2563EB', letterSpacing: '-0.5px', my: 0.5 }}>
                ₹{Number(wallet?.totalWithdrawn || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Settled to Bank Account
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ESCROW EXPLANATION NOTICE */}
      <Alert severity="info" icon={<ShieldCheck size={20} />} sx={{ mb: 4, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          Comzilo Platform Escrow Protection Active
        </Typography>
        <Typography variant="body2">
          Customer payments are held securely in <strong>Pending Balance</strong> when an order is placed. Once the order status changes to <strong>Delivered</strong>, funds automatically transition to your <strong>Available Balance</strong> (minus 5% platform commission) for immediate bank withdrawal.
        </Typography>
      </Alert>

      {/* BANK ACCOUNT SUMMARY CARD */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Building2 size={28} color="#2563EB" />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Settlement Bank Account: {bankData?.bankName || 'Not Configured'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {bankData?.accountNumber ? `Account #: ${bankData.accountNumber} • IFSC: ${bankData.ifscCode} • Holder: ${bankData.accountHolderName}` : 'Add your settlement bank account details to enable withdrawals.'}
              </Typography>
            </Box>
          </Box>
          <Button variant="outlined" size="small" onClick={() => setBankModalOpen(true)} sx={{ fontWeight: 700 }}>
            Edit Bank Details
          </Button>
        </Box>
      </Paper>

      {/* TABS FOR TRANSACTIONS & WITHDRAWALS */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)}>
            <Tab label={`Transaction History (${transactions.length})`} sx={{ fontWeight: 800 }} />
            <Tab label={`Withdrawal Requests (${withdrawals.length})`} sx={{ fontWeight: 800 }} />
          </Tabs>
        </Box>

        {/* TAB 0: TRANSACTIONS */}
        {activeTab === 0 && (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Txn Number</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Balance After</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      No wallet transactions recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id} hover>
                      <TableCell>{new Date(tx.created_at || tx.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{tx.transaction_number || tx.transactionNumber}</TableCell>
                      <TableCell>
                        <Chip
                          label={tx.type?.toUpperCase()}
                          size="small"
                          color={
                            tx.type === 'escrow_release' || tx.type === 'credit'
                              ? 'success'
                              : tx.type === 'escrow_hold'
                              ? 'warning'
                              : 'primary'
                          }
                          sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>{tx.description}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: Number(tx.amount) >= 0 ? '#10B981' : '#EF4444' }}>
                        {Number(tx.amount) >= 0 ? `+INR ${Number(tx.amount).toFixed(2)}` : `-INR ${Math.abs(Number(tx.amount)).toFixed(2)}`}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        INR {Number(tx.balance_after || tx.balanceAfter || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip label={tx.status?.toUpperCase()} size="small" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* TAB 1: WITHDRAWALS */}
        {activeTab === 1 && (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Requested Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Withdrawal #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Bank Details</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Payout Ref</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      No withdrawal requests submitted yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((w) => (
                    <TableRow key={w.id} hover>
                      <TableCell>{new Date(w.requested_at || w.requestedAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{w.withdrawal_number || w.withdrawalNumber}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{w.bank_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{w.account_number} ({w.ifsc_code})</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#2563EB' }}>
                        INR {Number(w.net_amount || w.netSellerPayout || w.amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={w.status?.toUpperCase()}
                          size="small"
                          color={w.status === 'processed' ? 'success' : w.status === 'requested' ? 'warning' : 'default'}
                          sx={{ fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{w.payout_reference || 'Pending Approval'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* WITHDRAW FUNDS DIALOG */}
      <Dialog open={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Withdraw Funds to Bank Account</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Available for Instant Withdrawal: <strong>INR {wallet?.availableBalance?.toFixed(2) || '0.00'}</strong>
            </Typography>
          </Box>

          <TextField
            label="Withdrawal Amount (INR) *"
            type="number"
            fullWidth
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="e.g. 1000.00"
            sx={{ mb: 3 }}
          />

          <Paper sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Destination Bank Account
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {bankData.bankName} ({bankData.accountNumber})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Account Holder: {bankData.accountHolderName} | IFSC: {bankData.ifscCode}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setWithdrawModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={withdrawSubmitting}
            onClick={handleWithdrawSubmit}
            sx={{ fontWeight: 800 }}
          >
            {withdrawSubmitting ? 'Submitting...' : 'Confirm Withdrawal'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT BANK DETAILS DIALOG */}
      <Dialog open={bankModalOpen} onClose={() => setBankModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Settlement Bank Account</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Bank Name *"
            fullWidth
            value={bankData.bankName}
            onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Account Number *"
            fullWidth
            value={bankData.accountNumber}
            onChange={(e) => setBankData({ ...bankData, accountNumber: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            label="IFSC Code *"
            fullWidth
            value={bankData.ifscCode}
            onChange={(e) => setBankData({ ...bankData, ifscCode: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Account Holder Name *"
            fullWidth
            value={bankData.accountHolderName}
            onChange={(e) => setBankData({ ...bankData, accountHolderName: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setBankModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveBankDetails} sx={{ fontWeight: 800 }}>
            Save Bank Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WalletPage;
