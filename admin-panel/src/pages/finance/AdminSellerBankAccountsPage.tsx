import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  CircularProgress,
  Stack,
  Alert,
  Tooltip,
} from '@mui/material';
import { PageContainer } from '../../components/layout/PageContainer';
import { axiosInstance } from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Eye, RefreshCw, FileText, Search } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const AdminSellerBankAccountsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const [selectedAcc, setSelectedAcc] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [remarks, setRemarks] = useState('');

  const fetchBankAccounts = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/admin/bank-accounts?status=${statusFilter}&search=${search}`);
      const data = res.data?.data || [];
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load seller bank accounts:', err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBankAccounts();
    }, 300);
    return () => clearTimeout(timer);
  }, [statusFilter, search]);

  const handleOpenDetails = (acc: any) => {
    setSelectedAcc(acc);
    setRemarks(acc.remarks || '');
    setDetailsOpen(true);
  };

  const handleAction = async (newStatus: 'VERIFIED' | 'REJECTED' | 'NEEDS_CHANGES') => {
    if (newStatus === 'REJECTED' && (!remarks || !remarks.trim())) {
      return toast.error('Please enter a rejection reason/remarks for the seller.');
    }

    setVerifying(true);
    try {
      await axiosInstance.patch(`/admin/bank-accounts/${selectedAcc.id}/verify`, {
        status: newStatus,
        remarks: remarks.trim() || undefined,
      });

      toast.success(`Bank Account #${selectedAcc.id} status updated to ${newStatus}!`);
      setDetailsOpen(false);
      fetchBankAccounts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update bank account status.');
    } finally {
      setVerifying(false);
    }
  };

  const maskAccount = (num: string) => {
    if (!num || num.length < 4) return num;
    return `•••• •••• ${num.slice(-4)}`;
  };

  return (
    <PageContainer
      title="Seller Bank Verification & KYC Approvals"
      subtitle="Verify merchant settlement bank accounts, validate PAN/IFSC compliance, and manage payout eligibility"
      action={
        <Button
          variant="outlined"
          startIcon={<RefreshCw size={18} />}
          onClick={fetchBankAccounts}
          sx={{ fontWeight: 700, borderRadius: 2 }}
        >
          Refresh
        </Button>
      }
    >
      {/* FILTER TABS & SEARCH */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #E2E8F0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Tabs value={statusFilter} onChange={(_, val) => setStatusFilter(val)} indicatorColor="primary" textColor="primary">
            <Tab label="All Accounts" value="ALL" sx={{ fontWeight: 700 }} />
            <Tab label="Pending" value="PENDING" sx={{ fontWeight: 700 }} />
            <Tab label="Verified" value="VERIFIED" sx={{ fontWeight: 700 }} />
            <Tab label="Rejected" value="REJECTED" sx={{ fontWeight: 700 }} />
            <Tab label="Needs Changes" value="NEEDS_CHANGES" sx={{ fontWeight: 700 }} />
          </Tabs>

          <TextField
            size="small"
            placeholder="Search holder, bank, IFSC, PAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchBankAccounts();
            }}
            InputProps={{
              startAdornment: <Search size={18} style={{ marginRight: 8, color: '#94A3B8' }} />,
            }}
            sx={{ width: 280 }}
          />
        </Box>
      </Paper>

      {/* TABLE LIST */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Tenant / ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Account Holder</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Bank Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Account Number</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>IFSC Code</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>PAN Number</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No seller bank accounts found matching filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((acc) => (
                <TableRow key={acc.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>Tenant #{acc.tenantId}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{acc.accountHolderName}</TableCell>
                  <TableCell>{acc.bankName}</TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{maskAccount(acc.accountNumber)}</Typography></TableCell>
                  <TableCell><Chip label={acc.ifscCode} size="small" variant="outlined" sx={{ fontWeight: 700 }} /></TableCell>
                  <TableCell><Chip label={acc.panNumber} size="small" variant="outlined" sx={{ fontWeight: 700 }} /></TableCell>
                  <TableCell>{formatDate(acc.createdAt)}</TableCell>
                  <TableCell>
                    {acc.status === 'VERIFIED' && <Chip label="VERIFIED" color="success" size="small" sx={{ fontWeight: 800 }} />}
                    {acc.status === 'PENDING' && <Chip label="PENDING" color="warning" size="small" sx={{ fontWeight: 800 }} />}
                    {acc.status === 'REJECTED' && <Chip label="REJECTED" color="error" size="small" sx={{ fontWeight: 800 }} />}
                    {acc.status === 'NEEDS_CHANGES' && <Chip label="NEEDS CHANGES" color="warning" size="small" sx={{ fontWeight: 800 }} />}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Eye size={14} />}
                      onClick={() => handleOpenDetails(acc)}
                      sx={{ fontWeight: 700 }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* VERIFICATION DETAILS MODAL */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        {selectedAcc && (
          <>
            <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
              Review Bank Account: Tenant #{selectedAcc.tenantId} ({selectedAcc.accountHolderName})
            </DialogTitle>
            <DialogContent dividers sx={{ py: 3 }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Bank Name:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedAcc.bankName}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Account Holder:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedAcc.accountHolderName}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Full Account Number:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#2563EB' }}>
                    {selectedAcc.accountNumber}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">IFSC Code:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedAcc.ifscCode}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">PAN Number:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedAcc.panNumber}</Typography>
                </Box>
                {selectedAcc.upiId && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">UPI ID:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedAcc.upiId}</Typography>
                  </Box>
                )}
                {selectedAcc.gstNumber && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">GSTIN:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedAcc.gstNumber}</Typography>
                  </Box>
                )}

                {/* REMARKS INPUT */}
                <TextField
                  label="Admin Remarks / Rejection Reason"
                  multiline
                  rows={2}
                  fullWidth
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Required if rejecting or requesting changes..."
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
              <Button onClick={() => setDetailsOpen(false)} color="inherit">
                Close
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="warning"
                  disabled={verifying}
                  onClick={() => handleAction('NEEDS_CHANGES')}
                  startIcon={<AlertTriangle size={16} />}
                >
                  Needs Changes
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  disabled={verifying}
                  onClick={() => handleAction('REJECTED')}
                  startIcon={<XCircle size={16} />}
                >
                  Reject
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  disabled={verifying}
                  onClick={() => handleAction('VERIFIED')}
                  startIcon={verifying ? <CircularProgress size={16} color="inherit" /> : <CheckCircle2 size={16} />}
                  sx={{ fontWeight: 700 }}
                >
                  Approve Account
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>
    </PageContainer>
  );
};
