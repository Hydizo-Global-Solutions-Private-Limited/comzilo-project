import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
} from '@mui/material';
import { UserPlus } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { axiosInstance } from '../../api/axiosInstance';

interface StoreOption {
  id: number;
  name: string;
  slug: string;
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  displayName: string;
}

export const CustomerRegisterPage: React.FC = () => {
  const { storeSlug } = useParams<{ storeSlug?: string }>();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    storeSlug: storeSlug || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchStores = async () => {
      try {
        setLoadingStores(true);
        const res = await axiosInstance.get('/auth/stores');
        if (isMounted && res.data?.data) {
          const list: StoreOption[] = res.data.data;
          setStores(list);

          // If storeSlug was provided in URL, preselect it
          if (storeSlug) {
            const matched = list.find(
              (s) =>
                s.slug === storeSlug ||
                s.tenantSlug === storeSlug ||
                s.name.toLowerCase() === storeSlug.toLowerCase() ||
                s.tenantName.toLowerCase() === storeSlug.toLowerCase()
            );
            if (matched) {
              setFormData((prev) => ({
                ...prev,
                storeSlug: matched.slug || matched.tenantSlug,
              }));
            }
          }
        }
      } catch (e) {
        console.error('Failed to load stores list:', e);
      } finally {
        if (isMounted) setLoadingStores(false);
      }
    };

    fetchStores();
    return () => {
      isMounted = false;
    };
  }, [storeSlug]);

  const activeSlug = (formData.storeSlug || storeSlug || '').trim();
  const loginLink = activeSlug ? `/store/${activeSlug}/login` : '/login';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!activeSlug) {
      setError('Please select a seller / store to register under.');
      setLoading(false);
      return;
    }

    try {
      const headers: Record<string, string> = {
        'x-store-slug': activeSlug,
      };

      await axiosInstance.post(
        '/auth/register',
        { ...formData, storeSlug: activeSlug },
        { headers }
      );
      toast.success('Customer account registered successfully! Please sign in.');
      navigate(loginLink);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message;
      const firstDetail = err?.response?.data?.errors?.[0]?.message;
      setError(firstDetail || apiMsg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
      <Paper sx={{ p: 4, width: '100%', borderRadius: 3, textAlign: 'center', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <Box sx={{ display: 'inline-flex', p: 2, bgcolor: '#ECFDF5', borderRadius: '50%', mb: 2 }}>
          <UserPlus size={36} color="#10B981" />
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
          Create Customer Account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Join Comzilo Store to enjoy fast checkout and order tracking
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleRegister}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                label="First Name"
                fullWidth
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Last Name"
                fullWidth
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </Grid>
          </Grid>

          <FormControl fullWidth required sx={{ mb: 2, textAlign: 'left' }}>
            <InputLabel id="store-select-label">Select Seller / Store *</InputLabel>
            <Select
              labelId="store-select-label"
              id="store-select"
              value={formData.storeSlug}
              label="Select Seller / Store *"
              onChange={(e) => setFormData({ ...formData, storeSlug: e.target.value })}
              required
              disabled={loadingStores}
              endAdornment={
                loadingStores ? (
                  <CircularProgress size={20} sx={{ mr: 2 }} />
                ) : null
              }
            >
              <MenuItem value="" disabled>
                <em>-- Choose Seller / Store * --</em>
              </MenuItem>
              {stores.map((s) => (
                <MenuItem key={`${s.tenantId}-${s.id}`} value={s.slug || s.tenantSlug}>
                  {s.displayName || s.tenantName || s.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Compulsory: Select which seller store your account will belong to.
            </FormHelperText>
          </FormControl>

          <TextField
            label="Email Address"
            type="email"
            fullWidth
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            sx={{ mb: 2 }}
            required
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            sx={{ mb: 3 }}
            required
          />

          <Button
            type="submit"
            variant="contained"
            color="success"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ py: 1.5, fontWeight: 800, borderRadius: 2, mb: 2 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
          </Button>
        </form>

        <Typography variant="body2" color="text.secondary">
          Already have an account?{' '}
          <Typography
            component={Link}
            to={loginLink}
            variant="body2"
            sx={{ fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}
          >
            Sign In
          </Typography>
        </Typography>
      </Paper>
    </Container>
  );
};
