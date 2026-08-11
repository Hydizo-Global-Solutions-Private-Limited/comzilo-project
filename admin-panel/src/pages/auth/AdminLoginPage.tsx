import React, { useState } from 'react';
import { Container, Paper, Typography, TextField, Button, Box, Alert } from '@mui/material';
import { ShieldAlert, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/authSlice';
import { axiosInstance } from '../../api/axiosInstance';
import toast from 'react-hot-toast';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@comzilo.com');
  const [password, setPassword] = useState('SuperAdminSecurePassword2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await axiosInstance.post('/auth/login', { email, password });
      if (res.data?.data?.accessToken) {
        const { user, accessToken } = res.data.data;

        // Check if SUPER_ADMIN or Tenant Admin
        dispatch(setCredentials({ user, accessToken }));
        toast.success('Super Admin Authenticated Successfully');
        navigate('/dashboard');
      } else {
        setError('Authentication failed: Invalid response format');
      }
    } catch (err: any) {
      if (!err?.response) {
        setError('Cannot connect to Backend Server. Please ensure backend is running on http://localhost:5000');
      } else {
        setError(err?.response?.data?.message || 'Access Denied: Invalid Super Admin Credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ p: 4, width: '100%', borderRadius: 3, textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <Box sx={{ display: 'inline-flex', p: 2, bgcolor: '#FEF2F2', borderRadius: '50%', mb: 2 }}>
          <ShieldAlert size={36} color="#DC2626" />
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
          Super Admin SaaS Portal
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          System-wide Multi-Tenant Platform Administration
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin} autoComplete="off">
          <TextField
            label="Super Admin Email"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            sx={{ mb: 2 }}
            required
          />
          <TextField
            label="Security Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            sx={{ mb: 3 }}
            required
          />
          <Button
            type="submit"
            variant="contained"
            color="error"
            fullWidth
            size="large"
            disabled={loading}
            startIcon={<Lock size={18} />}
            sx={{ py: 1.5, fontWeight: 800, borderRadius: 2 }}
          >
            {loading ? 'Authenticating...' : 'Authenticate Super Admin Session'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
};
