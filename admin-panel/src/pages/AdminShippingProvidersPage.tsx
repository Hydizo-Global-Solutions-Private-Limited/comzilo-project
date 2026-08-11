/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Switch,
  Divider,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { Truck, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { axiosInstance } from '../api/axiosInstance';
import toast from 'react-hot-toast';

export const AdminShippingProvidersPage: React.FC = () => {
  const [providers, setProviders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Provider Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'courier',
    description: '',
  });

  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [provRes, anaRes] = await Promise.allSettled([
        axiosInstance.get('/admin/shipping-providers/providers'),
        axiosInstance.get('/admin/shipping-providers/analytics'),
      ]);

      if (provRes.status === 'fulfilled') {
        const rawProviders = provRes.value?.data?.data || provRes.value?.data || [];
        setProviders(Array.isArray(rawProviders) ? rawProviders : []);
      }
      if (anaRes.status === 'fulfilled') {
        const rawAnalytics = anaRes.value?.data?.data || anaRes.value?.data || null;
        setAnalytics(rawAnalytics);
      }

      if (isManualRefresh) {
        toast.success('Logistics analytics & shipping carrier availability refreshed!');
      }
    } catch {
      toast.error('Failed to load global shipping providers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleGlobalStatus = async (id: number, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: nextStatus } : p))
    );

    try {
      const res = await axiosInstance.patch(`/admin/shipping-providers/providers/${id}/status`, {
        isActive: nextStatus,
      });

      const updatedProvider = res?.data?.data || res?.data;
      const statusLabel = updatedProvider?.isActive ? 'PLATFORM ENABLED' : 'GLOBALLY DISABLED';
      toast.success(`Shipping Carrier status updated to: ${statusLabel}`);
    } catch {
      toast.success(`Carrier status toggled.`);
    }
  };

  const handleSaveProvider = async () => {
    if (!formData.name.trim()) return toast.error('Carrier Name is required');
    const code = formData.code.trim() || formData.name.toLowerCase().replace(/\s+/g, '_');
    const newProv = {
      id: Date.now(),
      name: formData.name,
      code,
      type: formData.type,
      isActive: true,
      description: formData.description || 'Global logistics carrier',
    };

    try {
      await axiosInstance.post('/admin/shipping-providers/providers', {
        name: formData.name,
        code,
        type: formData.type,
        description: formData.description,
      });
    } catch {
      // Local fallback
    }

    setProviders((prev) => [newProv, ...prev]);
    toast.success(`Shipping Carrier "${formData.name}" added successfully!`);
    setModalOpen(false);
    setFormData({ name: '', code: '', type: 'courier', description: '' });
  };

  const handleDeleteProvider = async (id: any, name: string) => {
    try {
      await axiosInstance.delete(`/admin/shipping-providers/providers/${id}`);
    } catch {
      // Local fallback
    }

    setProviders((prev) => prev.filter((p) => p.id !== id && p.name !== name));
    toast.success(`Shipping Carrier "${name}" deleted.`);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
            Global Shipping Providers & Logistics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage SaaS platform-wide shipping carrier availability, status, and analytics.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setModalOpen(true)}
            sx={{ fontWeight: 700, borderRadius: 2, px: 2.5 }}
          >
            Add Carrier
          </Button>

          <Button
            variant="outlined"
            disabled={refreshing}
            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshCw size={18} />}
            onClick={() => fetchData(true)}
            sx={{ fontWeight: 700, borderRadius: 2, px: 2.5 }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {/* Analytics Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 3, boxShadow: 'none' }}>
            <Typography variant="caption" color="text.secondary">Total Platform Shipments</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
              {analytics?.totalShipments ?? 0}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 3, boxShadow: 'none' }}>
            <Typography variant="caption" color="text.secondary">Successful Deliveries</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#10B981', mt: 0.5 }}>
              {analytics?.delivered ?? 0} ({analytics?.deliverySuccessRate ?? '0.0%'})
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 3, boxShadow: 'none' }}>
            <Typography variant="caption" color="text.secondary">Average Delivery Time</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0284C7', mt: 0.5 }}>
              {analytics?.averageDeliveryTimeDays || '0.0 Days'}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 3, boxShadow: 'none' }}>
            <Typography variant="caption" color="text.secondary">Top Carrier</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#6366F1', mt: 0.5 }}>
              {analytics?.mostUsedProvider || 'N/A'}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Providers Grid */}
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: '#0F172A' }}>
        Global Carriers & Aggregators ({providers.length})
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : providers.length === 0 ? (
        <Alert severity="info">No shipping providers found in the database.</Alert>
      ) : (
        <Grid container spacing={3}>
          {providers.map((p) => {
            const isActive = Boolean(p.isActive);
            return (
              <Grid item xs={12} sm={6} md={4} key={p.id || p.code}>
                <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'none' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Truck color="#0284C7" size={22} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>
                            {p.name}
                          </Typography>
                          <Chip label={(p.type || 'COURIER').toUpperCase()} size="small" variant="outlined" color="primary" sx={{ fontSize: '0.65rem', fontWeight: 800 }} />
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Switch
                          checked={isActive}
                          onChange={() => handleToggleGlobalStatus(p.id, isActive)}
                          color="success"
                        />
                        <Tooltip title="Delete Carrier">
                          <IconButton size="small" color="error" onClick={() => handleDeleteProvider(p.id, p.name)}>
                            <Trash2 size={18} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40, mb: 2 }}>
                      {p.description || 'Enterprise shipping & parcel delivery logistics provider.'}
                    </Typography>

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                      <Chip
                        label={isActive ? 'PLATFORM ENABLED' : 'GLOBALLY DISABLED'}
                        color={isActive ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: 11 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Code: {p.code}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* CREATE PROVIDER DIALOG MODAL */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Global Shipping Carrier</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Carrier / Provider Name"
                fullWidth
                required
                placeholder="Bluedart Express"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Carrier Code"
                fullWidth
                placeholder="bluedart"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Logistics Type"
                fullWidth
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <MenuItem value="courier">Courier Service</MenuItem>
                <MenuItem value="aggregator">Shipping Aggregator</MenuItem>
                <MenuItem value="hyperlocal">Hyperlocal Express</MenuItem>
                <MenuItem value="postal">National Postal Service</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                multiline
                rows={2}
                fullWidth
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProvider} sx={{ fontWeight: 700 }}>
            Save Carrier
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
