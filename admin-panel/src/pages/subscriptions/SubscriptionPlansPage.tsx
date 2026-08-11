import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  IconButton,
  CircularProgress,
  Stack,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Check,
  Edit3,
  Plus,
  Trash2,
  ShieldCheck,
  Store,
  Users,
  Warehouse,
  Clock,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import {
  useGetSubscriptionPlansQuery,
  useUpdateSubscriptionPlanMutation,
  useCreateSubscriptionPlanMutation,
  useDeleteSubscriptionPlanMutation,
  useGetSaaSReportsQuery,
} from '../../api/adminApi';
import toast from 'react-hot-toast';

export const SubscriptionPlansPage: React.FC = () => {
  const { data: plansResponse, isLoading, isError, refetch } = useGetSubscriptionPlansQuery();
  const { data: saasReportData } = useGetSaaSReportsQuery();
  const [updatePlan, { isLoading: isSaving }] = useUpdateSubscriptionPlanMutation();
  const [createPlan, { isLoading: isCreating }] = useCreateSubscriptionPlanMutation();
  const [deletePlan] = useDeleteSubscriptionPlanMutation();

  const [isAnnual, setIsAnnual] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const saas = saasReportData?.data || { mrr: 0, arr: 0, statusCounts: [], planPopularity: [] };
  const statusCountsList = Array.isArray(saas.statusCounts)
    ? saas.statusCounts
    : saas.statusCounts
    ? [saas.statusCounts]
    : [];
  const activeCount = statusCountsList.find((s: any) => s.status === 'active')?.count || 0;
  const trialingCount = statusCountsList.find((s: any) => s.status === 'trialing')?.count || 0;
  const expiredCount = statusCountsList.find((s: any) => s.status === 'expired')?.count || 0;

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    priceMonthly: '',
    priceYearly: '',
    description: '',
    storeLimit: '1',
    userLimit: '5',
    warehouseLimit: '1',
    trialDays: '14',
    isActive: true,
    features: [] as string[],
  });

  const [newFeatureText, setNewFeatureText] = useState('');

  // Extract plans safely
  const rawPlans = plansResponse?.data || plansResponse || [];
  const plans = Array.isArray(rawPlans) ? rawPlans : [];

  const handleOpenCreate = () => {
    setSelectedPlan(null);
    setValidationError(null);
    setFormData({
      name: '',
      priceMonthly: '49',
      priceYearly: '490',
      description: '',
      storeLimit: '1',
      userLimit: '5',
      warehouseLimit: '1',
      trialDays: '14',
      isActive: true,
      features: ['Basic Catalog Management', 'POS Terminal Access', 'Standard Email Support'],
    });
    setEditModalOpen(true);
  };

  const handleOpenEdit = (plan: any) => {
    setSelectedPlan(plan);
    setValidationError(null);

    let parsedFeatures: string[] = [];
    if (Array.isArray(plan.features)) {
      parsedFeatures = plan.features.map((f: any) => (typeof f === 'string' ? f : f?.name || f?.feature || JSON.stringify(f)));
    } else if (typeof plan.features === 'string') {
      try {
        const json = JSON.parse(plan.features);
        parsedFeatures = Array.isArray(json)
          ? json.map((f: any) => (typeof f === 'string' ? f : f?.name || f?.feature || JSON.stringify(f)))
          : [plan.features];
      } catch {
        parsedFeatures = [plan.features];
      }
    }

    setFormData({
      name: plan.name || '',
      priceMonthly: plan.priceMonthly !== undefined ? String(plan.priceMonthly) : '',
      priceYearly: plan.priceYearly !== undefined ? String(plan.priceYearly) : '',
      description: plan.description || '',
      storeLimit: plan.storeLimit !== undefined ? String(plan.storeLimit) : '1',
      userLimit: plan.userLimit !== undefined ? String(plan.userLimit) : '5',
      warehouseLimit: plan.warehouseLimit !== undefined ? String(plan.warehouseLimit) : '1',
      trialDays: plan.trialDays !== undefined ? String(plan.trialDays) : '14',
      isActive: plan.isActive !== undefined ? Boolean(plan.isActive) : true,
      features: parsedFeatures,
    });
    setEditModalOpen(true);
  };

  const handleDeletePlan = async (id: number, planName: string) => {
    if (!window.confirm(`Are you sure you want to delete '${planName}' tier?`)) return;
    try {
      await deletePlan(id).unwrap();
      toast.success(`Subscription Plan '${planName}' deleted successfully.`);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete subscription plan.');
    }
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, newFeatureText.trim()],
    }));
    setNewFeatureText('');
  };

  const handleRemoveFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, idx) => idx !== index),
    }));
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formData.name.trim()) {
      setValidationError('Plan name is required.');
      return;
    }

    const monthly = Number(formData.priceMonthly);
    if (isNaN(monthly) || monthly < 0) {
      setValidationError('Monthly price must be a valid positive number.');
      return;
    }

    const yearly = formData.priceYearly ? Number(formData.priceYearly) : monthly * 10;
    if (isNaN(yearly) || yearly < 0) {
      setValidationError('Annual price must be a valid positive number.');
      return;
    }

    const isDuplicateName = plans.some(
      (p: any) => p.id !== selectedPlan?.id && p.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
    );

    if (isDuplicateName) {
      setValidationError(`A subscription plan named '${formData.name.trim()}' already exists.`);
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        priceMonthly: monthly,
        priceYearly: yearly,
        description: formData.description.trim(),
        storeLimit: Number(formData.storeLimit) || 1,
        userLimit: Number(formData.userLimit) || 5,
        warehouseLimit: Number(formData.warehouseLimit) || 1,
        trialDays: Number(formData.trialDays) || 0,
        isActive: formData.isActive,
        features: formData.features,
      };

      if (selectedPlan) {
        await updatePlan({ id: selectedPlan.id, ...payload }).unwrap();
        toast.success(`Subscription Plan '${formData.name.trim()}' updated successfully!`);
      } else {
        await createPlan(payload).unwrap();
        toast.success(`New Subscription Tier '${formData.name.trim()}' created successfully!`);
      }
      setEditModalOpen(false);
      refetch();
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to save plan changes.';
      setValidationError(msg);
    }
  };

  return (
    <PageContainer
      title="SaaS Subscription Plans & Revenue Analytics"
      subtitle="Manage pricing tiers, feature limits, active subscriptions, and platform revenue metrics"
      action={
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={() => refetch()}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={handleOpenCreate}
            sx={{ fontWeight: 700, borderRadius: 2, px: 2.5 }}
          >
            Add Subscription Tier
          </Button>
        </Box>
      }
    >
      {/* SAAS METRICS OVERVIEW */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', bgcolor: '#F0FDF4' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, color: '#166534' }}>
              Monthly Recurring Revenue (MRR)
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#15803D', mt: 0.5 }}>
              INR {saas.mrr ? saas.mrr.toLocaleString() : '0'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ARR: INR {saas.arr ? saas.arr.toLocaleString() : '0'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', bgcolor: '#EFF6FF' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, color: '#1E40AF' }}>
              Active Subscriptions
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1D4ED8', mt: 0.5 }}>
              {activeCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Active Paid Sellers
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', bgcolor: '#FFFBEB' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, color: '#92400E' }}>
              Trialing Accounts
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#B45309', mt: 0.5 }}>
              {trialingCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              14-Day Free Trials
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', bgcolor: '#FFF1F2' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, color: '#9F1239' }}>
              Expired / Cancelled
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#BE123C', mt: 0.5 }}>
              {expiredCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Requires Renewal
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* BILLING CYCLE TOGGLE */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 4, gap: 1.5 }}>
        <Typography
          variant="body1"
          sx={{ fontWeight: !isAnnual ? 800 : 500, color: !isAnnual ? '#0F172A' : '#64748B' }}
        >
          Monthly Billing
        </Typography>
        <Switch
          checked={isAnnual}
          onChange={(e) => setIsAnnual(e.target.checked)}
          color="primary"
        />
        <Typography
          variant="body1"
          sx={{ fontWeight: isAnnual ? 800 : 500, color: isAnnual ? '#0F172A' : '#64748B' }}
        >
          Annual Billing
        </Typography>
        <Chip
          label="Save 20%"
          color="success"
          size="small"
          icon={<Sparkles size={14} />}
          sx={{ fontWeight: 800, fontSize: 11 }}
        />
      </Box>

      {/* 1. LOADING STATE */}
      {isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress size={44} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 600 }}>
            Fetching subscription plan tiers...
          </Typography>
        </Box>
      )}

      {/* 2. ERROR STATE */}
      {isError && (
        <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid #FECACA', bgcolor: '#FEF2F2', textAlign: 'center', mb: 4 }}>
          <Box sx={{ color: '#DC2626', mb: 1 }}>
            <AlertTriangle size={40} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#991B1B', mb: 0.5 }}>
            Failed to Load Subscription Plans
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Unable to connect to the subscription management microservice.
          </Typography>
          <Button
            variant="contained"
            color="error"
            startIcon={<RefreshCw size={16} />}
            onClick={() => refetch()}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Retry Connection
          </Button>
        </Paper>
      )}

      {/* 3. EMPTY STATE */}
      {!isLoading && !isError && plans.length === 0 && (
        <Paper sx={{ p: 6, borderRadius: 3, border: '1px border #E2E8F0', textAlign: 'center', bgcolor: '#F8FAFC' }}>
          <Box sx={{ color: '#94A3B8', mb: 2 }}>
            <Package size={52} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B', mb: 1 }}>
            No Subscription Tiers Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 450, mx: 'auto' }}>
            There are currently no active SaaS subscription plans configured in the platform. Create a new plan tier to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={handleOpenCreate}
            sx={{ fontWeight: 700, borderRadius: 2, px: 3 }}
          >
            Create First Subscription Tier
          </Button>
        </Paper>
      )}

      {/* 4. ACTIVE PLANS GRID */}
      {!isLoading && !isError && plans.length > 0 && (
        <Grid container spacing={3} alignItems="stretch">
          {plans.map((plan: any, index: number) => {
            const isPopular = index === 1 || plan.code === 'pro' || plan.code === 'professional';
            const priceVal = isAnnual
              ? Number(plan.priceYearly || Number(plan.priceMonthly || 0) * 10)
              : Number(plan.priceMonthly || 0);
            const cycleSuffix = isAnnual ? '/yr' : '/mo';
            const currencySymbol = '₹';
            const formattedPrice = `${currencySymbol}${priceVal.toLocaleString()}${cycleSuffix}`;

            const storeLimitText =
              Number(plan.storeLimit) >= 999
                ? 'Unlimited Stores'
                : `${plan.storeLimit || 1} Store Location${Number(plan.storeLimit) > 1 ? 's' : ''}`;
            const userLimitText =
              Number(plan.userLimit) >= 999 ? 'Unlimited Staff' : `Up to ${plan.userLimit || 5} Users`;
            const warehouseLimitText =
              Number(plan.warehouseLimit) >= 999
                ? 'Unlimited Warehouses'
                : `${plan.warehouseLimit || 1} Warehouse${Number(plan.warehouseLimit) > 1 ? 's' : ''}`;

            // Normalize features safely
            let featuresList: string[] = [];
            if (Array.isArray(plan.features)) {
              featuresList = plan.features.map((f: any) =>
                typeof f === 'string' ? f : f?.name || f?.feature || JSON.stringify(f)
              );
            } else if (typeof plan.features === 'string') {
              try {
                const parsed = JSON.parse(plan.features);
                featuresList = Array.isArray(parsed)
                  ? parsed.map((f: any) => (typeof f === 'string' ? f : f?.name || f?.feature || JSON.stringify(f)))
                  : [plan.features];
              } catch {
                featuresList = [plan.features];
              }
            }

            return (
              <Grid key={plan.id} item xs={12} md={4} sx={{ display: 'flex' }}>
                <Paper
                  sx={{
                    p: 3.5,
                    borderRadius: 3,
                    border: '2px solid #2563EB',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    boxShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.12)',
                    bgcolor: plan.isActive ? '#FFFFFF' : '#F8FAFC',
                  }}
                >
                  {isPopular && (
                    <Chip
                      label="MOST POPULAR"
                      color="primary"
                      size="small"
                      sx={{ position: 'absolute', top: 16, right: 16, fontWeight: 800, fontSize: 11 }}
                    />
                  )}

                  {!plan.isActive && (
                    <Chip
                      label="INACTIVE TIER"
                      color="error"
                      size="small"
                      sx={{ position: 'absolute', top: 16, right: 16, fontWeight: 800, fontSize: 11 }}
                    />
                  )}

                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, pr: 12 }}>
                    {plan.name}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {plan.description || 'Enterprise multi-tenant retail subscription tier'}
                  </Typography>

                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mb: 3 }}>
                    {formattedPrice}
                  </Typography>

                  {/* ENTITLEMENT METRICS */}
                  <Stack spacing={1} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Store size={16} color="#2563EB" />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                        {storeLimitText}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Users size={16} color="#2563EB" />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                        {userLimitText}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Warehouse size={16} color="#2563EB" />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                        {warehouseLimitText}
                      </Typography>
                    </Box>
                    {Number(plan.trialDays) > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Clock size={16} color="#10B981" />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#10B981' }}>
                          {plan.trialDays}-Day Free Trial Included
                        </Typography>
                      </Box>
                    )}
                  </Stack>

                  {/* FEATURE LIST */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4, flexGrow: 1 }}>
                    {featuresList.map((featName: string, idx: number) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Check size={18} color="#10B981" />
                        <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>
                          {featName}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* ACTION ROW */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      startIcon={<Edit3 size={18} />}
                      onClick={() => handleOpenEdit(plan)}
                      sx={{
                        fontWeight: 700,
                        py: 1.2,
                        borderRadius: 2,
                        boxShadow: 'none',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                        },
                      }}
                    >
                      Edit Plan Tier
                    </Button>
                    <Tooltip title="Delete Plan Tier">
                      <IconButton
                        color="error"
                        onClick={() => handleDeletePlan(plan.id, plan.name)}
                        sx={{ border: '1px solid #FCA5A5', borderRadius: 2 }}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* EDIT / CREATE PLAN TIER DIALOG */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {selectedPlan ? `Edit Subscription Tier: ${selectedPlan.name}` : 'Create New Subscription Tier'}
        </DialogTitle>

        <form onSubmit={handleSavePlan}>
          <DialogContent dividers sx={{ py: 3 }}>
            {validationError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {validationError}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Plan Tier Name *"
                  fullWidth
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  label="Monthly Price *"
                  type="number"
                  fullWidth
                  required
                  value={formData.priceMonthly}
                  onChange={(e) => setFormData({ ...formData, priceMonthly: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  label="Annual Price"
                  type="number"
                  fullWidth
                  value={formData.priceYearly}
                  onChange={(e) => setFormData({ ...formData, priceYearly: e.target.value })}
                  placeholder="Auto (10x Monthly)"
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Plan Description"
                  multiline
                  rows={2}
                  fullWidth
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  label="Store Limit"
                  type="number"
                  fullWidth
                  value={formData.storeLimit}
                  onChange={(e) => setFormData({ ...formData, storeLimit: e.target.value })}
                  helperText="999 = unlimited"
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  label="User Limit"
                  type="number"
                  fullWidth
                  value={formData.userLimit}
                  onChange={(e) => setFormData({ ...formData, userLimit: e.target.value })}
                  helperText="999 = unlimited"
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  label="Warehouse Limit"
                  type="number"
                  fullWidth
                  value={formData.warehouseLimit}
                  onChange={(e) => setFormData({ ...formData, warehouseLimit: e.target.value })}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  label="Trial Days"
                  type="number"
                  fullWidth
                  value={formData.trialDays}
                  onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
                />
              </Grid>

              <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      color="primary"
                    />
                  }
                  label={formData.isActive ? 'Active Tier' : 'Inactive Tier'}
                />
              </Grid>

              {/* FEATURES MANAGEMENT */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, mb: 1 }}>
                  Entitlement Feature List
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <TextField
                    size="small"
                    placeholder="Add new plan feature entitlement..."
                    fullWidth
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                  />
                  <Button variant="contained" onClick={handleAddFeature} startIcon={<Plus size={16} />}>
                    Add
                  </Button>
                </Stack>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.features.map((feat, idx) => (
                    <Chip
                      key={idx}
                      label={feat}
                      onDelete={() => handleRemoveFeature(idx)}
                      color="default"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setEditModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSaving || isCreating}
              startIcon={isSaving || isCreating ? <CircularProgress size={18} color="inherit" /> : <ShieldCheck size={18} />}
              sx={{ fontWeight: 700, px: 3 }}
            >
              Save Plan Tier
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </PageContainer>
  );
};

export default SubscriptionPlansPage;
