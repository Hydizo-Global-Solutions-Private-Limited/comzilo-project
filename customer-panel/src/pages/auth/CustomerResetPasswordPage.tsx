import React, { useState, useEffect } from 'react';
import { Container, Paper, Typography, Box, TextField, Button, Alert, CircularProgress, Stack } from '@mui/material';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft, Check, X } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { axiosInstance } from '../../api/axiosInstance';
import toast from 'react-hot-toast';

export const CustomerResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const rawToken =
    searchParams.get('token') ||
    new URLSearchParams(window.location.search).get('token') ||
    (window.location.href.includes('token=') ? window.location.href.split('token=')[1]?.split('&')[0]?.split('#')[0] : '') ||
    '';
  const token = rawToken.trim();
  const navigate = useNavigate();

  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setIsValidToken(false);
      setInvalidMessage('This password reset link is missing a valid security token. Please request a new link.');
      return;
    }

    const checkToken = async () => {
      try {
        const res = await axiosInstance.get(`/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
        if (res.data?.success) {
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
          setInvalidMessage(res.data?.message || 'This password reset link is invalid or has expired.');
        }
      } catch (err: any) {
        setIsValidToken(false);
        const serverMsg = err?.response?.data?.message;
        if (serverMsg) {
          setInvalidMessage(serverMsg);
        } else if (err?.message?.includes('Network Error') || !err?.response) {
          setInvalidMessage('Unable to reach server. Please ensure you are connected to the same Wi-Fi network.');
        } else {
          setInvalidMessage('This password reset link is invalid or has expired.');
        }
      } finally {
        setValidating(false);
      }
    };

    checkToken();
  }, [token]);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const isFormValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      if (!passwordsMatch) {
        setError('New Password and Confirm Password must match.');
      } else {
        setError('Please meet all password complexity requirements.');
      }
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await axiosInstance.post('/auth/reset-password', {
        token,
        password,
        confirmPassword,
      });

      toast.success('Password updated successfully.');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <Container maxWidth="xs" sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper sx={{ p: 4, width: '100%', borderRadius: 3, textAlign: 'center', border: '1px solid #E2E8F0' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Validating Security Token...
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (!isValidToken) {
    return (
      <Container maxWidth="xs" sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
        <Paper sx={{ p: 4, width: '100%', borderRadius: 3, textAlign: 'center', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
          <Box sx={{ display: 'inline-flex', p: 2, bgcolor: '#FEF2F2', borderRadius: '50%', mb: 2 }}>
            <AlertCircle size={40} color="#DC2626" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
            Link Expired or Invalid
          </Typography>
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left', borderRadius: 2 }}>
            {invalidMessage || 'This password reset link is invalid or has expired.'}
          </Alert>
          <Button
            component={Link}
            to="/forgot-password"
            variant="contained"
            fullWidth
            size="large"
            sx={{ py: 1.5, fontWeight: 700, borderRadius: 2, mb: 2 }}
          >
            Request New Reset Link
          </Button>
          <Button
            component={Link}
            to="/login"
            variant="outlined"
            fullWidth
            size="large"
            startIcon={<ArrowLeft size={18} />}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Back to Sign In
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xs" sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
      <Paper sx={{ p: 4, width: '100%', borderRadius: 3, textAlign: 'center', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <Box sx={{ display: 'inline-flex', p: 2, bgcolor: '#EFF6FF', borderRadius: '50%', mb: 2 }}>
          <Lock size={36} color="#2563EB" />
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
          Create New Password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter a strong, unique password for your Comzilo customer account.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            label="New Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
            required
            autoFocus
          />

          <TextField
            label="Confirm New Password"
            type="password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            sx={{ mb: 2.5 }}
            required
          />

          {/* PASSWORD COMPLEXITY RULES INDICATOR */}
          <Paper sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, mb: 3, textAlign: 'left', border: '1px solid #E2E8F0' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 1 }}>
              PASSWORD REQUIREMENTS:
            </Typography>
            <Stack spacing={0.5}>
              <RuleItem label="At least 8 characters" valid={hasMinLength} />
              <RuleItem label="At least 1 uppercase letter (A-Z)" valid={hasUpper} />
              <RuleItem label="At least 1 lowercase letter (a-z)" valid={hasLower} />
              <RuleItem label="At least 1 number (0-9)" valid={hasNumber} />
              <RuleItem label="At least 1 special character (!@#$%^&*)" valid={hasSpecial} />
              <RuleItem label="Passwords match" valid={passwordsMatch} />
            </Stack>
          </Paper>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={submitting || !isFormValid}
            startIcon={<CheckCircle2 size={18} />}
            sx={{ py: 1.5, fontWeight: 800, borderRadius: 2, mb: 2 }}
          >
            {submitting ? 'Updating Password...' : 'Reset Password'}
          </Button>

          <Typography variant="body2" color="text.secondary">
            Remembered your password?{' '}
            <Typography component={Link} to="/login" variant="body2" sx={{ fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}>
              Sign In
            </Typography>
          </Typography>
        </form>
      </Paper>
    </Container>
  );
};

const RuleItem: React.FC<{ label: string; valid: boolean }> = ({ label, valid }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    {valid ? <Check size={14} color="#10B981" /> : <X size={14} color="#94A3B8" />}
    <Typography variant="caption" sx={{ color: valid ? '#059669' : '#64748B', fontWeight: valid ? 700 : 500 }}>
      {label}
    </Typography>
  </Box>
);

export default CustomerResetPasswordPage;
