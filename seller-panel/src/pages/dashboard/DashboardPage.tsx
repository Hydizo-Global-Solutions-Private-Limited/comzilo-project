import React, { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Box, Paper, Stack, CircularProgress, Chip } from '@mui/material';
import { PageContainer } from '../../components/layout/PageContainer';
import { DollarSign, ShoppingBag, Users, TrendingUp, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { axiosInstance } from '../../api/axiosInstance';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axiosInstance.get('/reports/dashboard');
        if (res.data?.data) {
          setStats(res.data.data);
        }
      } catch {
        // Handle error gracefully
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const totalSales = Number(stats?.totalSales ?? stats?.totalRevenue ?? 0);
  const totalOrders = Number(stats?.totalOrders ?? 0);
  const pendingOrders = Number(stats?.pendingOrders ?? 0);
  const completedOrders = Number(stats?.completedOrders ?? 0);
  const cancelledOrders = Number(stats?.cancelledOrders ?? 0);
  const totalCustomers = Number(stats?.totalCustomers ?? 0);
  const growthRate = Number(stats?.growthRate ?? 0);

  const chartData = stats?.chartData || [
    { month: 'Jan', sales: 0 },
    { month: 'Feb', sales: 0 },
    { month: 'Mar', sales: 0 },
  ];

  return (
    <PageContainer title="Executive Dashboard" subtitle="Overview of real-time sales performance and business metrics">
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Row 1: Primary Order & Financial Metrics (4 Columns) */}
          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="TOTAL REVENUE"
                value={formatCurrency(totalSales)}
                icon={<DollarSign size={22} color="#2563EB" />}
                avatarBg="#EFF6FF"
                badgeText="Sales"
                badgeColor="primary"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="TOTAL ORDERS"
                value={String(totalOrders)}
                icon={<ShoppingBag size={22} color="#10B981" />}
                avatarBg="#ECFDF5"
                badgeText="Overall"
                badgeColor="success"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="PENDING ORDERS"
                value={String(pendingOrders)}
                icon={<Clock size={22} color="#F59E0B" />}
                avatarBg="#FFFBEB"
                badgeText="Active"
                badgeColor="warning"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="COMPLETED ORDERS"
                value={String(completedOrders)}
                icon={<CheckCircle2 size={22} color="#10B981" />}
                avatarBg="#F0FDF4"
                badgeText="Fulfilled"
                badgeColor="success"
              />
            </Grid>
          </Grid>

          {/* Row 2: Secondary Performance & Customer Metrics (3 Columns) */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <MetricCard
                title="CANCELLED ORDERS"
                value={String(cancelledOrders)}
                icon={<XCircle size={22} color="#DC2626" />}
                avatarBg="#FEF2F2"
                badgeText="Cancelled"
                badgeColor="error"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <MetricCard
                title="TOTAL CUSTOMERS"
                value={String(totalCustomers)}
                icon={<Users size={22} color="#8B5CF6" />}
                avatarBg="#F5F3FF"
                badgeText="Registered"
                badgeColor="secondary"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <MetricCard
                title="GROWTH RATE"
                value={`+${growthRate}%`}
                icon={<TrendingUp size={22} color="#10B981" />}
                avatarBg="#ECFDF5"
                badgeText="Monthly"
                badgeColor="success"
              />
            </Grid>
          </Grid>

          {/* Analytics Chart */}
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              mb: 3,
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: '#1E293B' }}>
              Revenue Trend Analysis
            </Typography>
            <Box sx={{ height: 320, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 13 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 13 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="sales" stroke="#2563EB" fill="url(#colorSales)" strokeWidth={3} />
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </>
      )}
    </PageContainer>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  avatarBg: string;
  badgeText: string;
  badgeColor?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'default';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  avatarBg,
  badgeText,
  badgeColor = 'default',
}) => (
  <Card
    sx={{
      borderRadius: 3,
      border: '1px solid #E2E8F0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: '0 12px 20px -8px rgba(0,0,0,0.08)',
        borderColor: '#CBD5E1',
      },
    }}
  >
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: '#64748B',
            fontSize: '0.72rem',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Typography>
        <Chip
          label={badgeText}
          size="small"
          color={badgeColor}
          variant="outlined"
          sx={{
            height: 20,
            fontSize: '0.65rem',
            fontWeight: 700,
            borderRadius: 1,
            px: 0.5,
          }}
        />
      </Stack>

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
          {value}
        </Typography>
        <AvatarBox icon={icon} bgcolor={avatarBg} />
      </Stack>
    </CardContent>
  </Card>
);

const AvatarBox: React.FC<{ icon: React.ReactNode; bgcolor: string }> = ({ icon, bgcolor }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 44,
      borderRadius: 2.5,
      bgcolor,
    }}
  >
    {icon}
  </Box>
);
