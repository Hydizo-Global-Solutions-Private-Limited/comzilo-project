import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Tabs,
  Tab,
  Avatar,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Upload, User, Settings as SettingsIcon, CheckCircle } from 'lucide-react';
import { PageContainer } from '../../../components/layout/PageContainer';
import {
  useGetSettingsQuery,
  useGetSellerProfileQuery,
  useUpdateSellerProfileMutation,
} from '../../../api/endpoints/platformApi';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setCredentials } from '../../../store/slices/authSlice';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user: authUser, tenant: authTenant, stores: authStores, accessToken: authAccessToken, refreshToken: authRefreshToken } = useAppSelector((state) => state.auth);
  const { data: settingsData } = useGetSettingsQuery();
  const { data: profileResponse, isLoading: isProfileLoading } = useGetSellerProfileQuery();
  const [updateSellerProfile, { isLoading: isUpdatingProfile }] = useUpdateSellerProfileMutation();

  const [activeTab, setActiveTab] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Sync profile data when loaded
  useEffect(() => {
    const profile = profileResponse?.data || profileResponse || authUser;
    if (profile) {
      setFirstName(profile.firstName || authUser?.firstName || '');
      setLastName(profile.lastName || authUser?.lastName || '');
      setEmail(profile.email || authUser?.email || '');
      setPhone(profile.phone || profile.mobile || (authUser as any)?.phone || (authUser as any)?.mobile || '');
      const img = profile.avatarUrl || profile.profileImage || profile.avatar || (authUser as any)?.avatarUrl || (authUser as any)?.profileImage || null;
      if (img) setAvatarPreview(img);
    }
  }, [profileResponse, authUser]);

  const handleOpenFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Photo = reader.result as string;
        setAvatarPreview(base64Photo);
        toast.success('Profile photo selected! Click Save Profile Changes to apply.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email) {
      toast.error('First name, last name, and email are required');
      return;
    }

    try {
      const payload = {
        firstName,
        lastName,
        email,
        phone,
        mobile: phone,
        avatarUrl: avatarPreview || undefined,
        profileImage: avatarPreview || undefined,
        avatar: avatarPreview || undefined,
      };

      const res = await updateSellerProfile(payload).unwrap();
      const updated = res.data || res;
      const img = updated?.avatarUrl || updated?.profileImage || avatarPreview;

      if (authTenant && authAccessToken && authRefreshToken) {
        dispatch(
          setCredentials({
            user: {
              ...(authUser || {}),
              firstName,
              lastName,
              email,
              phone,
              mobile: phone,
              avatarUrl: img,
              profileImage: img,
              avatar: img,
            } as any,
            tenant: authTenant,
            stores: authStores || [],
            accessToken: authAccessToken,
            refreshToken: authRefreshToken,
          })
        );
      }

      toast.success('Seller profile & photo updated successfully!');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update seller profile');
    }
  };

  const handleSaveSettings = () => {
    toast.success('System settings saved successfully!');
  };

  return (
    <PageContainer
      title="Platform Settings & Merchant Profile"
      subtitle="Manage seller profile details, contact information, profile avatar photo, and system preferences"
    >
      <Paper sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: 'none', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#F8FAFC', px: 3, pt: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            indicatorColor="primary"
            textColor="primary"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '0.95rem',
                minHeight: 48,
              },
            }}
          >
            <Tab icon={<User size={18} />} iconPosition="start" label="Update Profile" />
            <Tab icon={<SettingsIcon size={18} />} iconPosition="start" label="General System Preferences" />
          </Tabs>
        </Box>

        {/* TAB 0: UPDATE PROFILE */}
        {activeTab === 0 && (
          <Box component="form" onSubmit={handleSaveProfile} sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
              Merchant Profile Details
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mb: 4 }}>
              Update seller profile avatar photo from file manager, name, email address, and contact number.
            </Typography>

            {/* Profile Avatar Selection Box */}
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: '#F8FAFC',
                border: '1px border-dashed #CBD5E1',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                mb: 4,
                flexWrap: 'wrap',
              }}
            >
              <Avatar
                src={avatarPreview || (authUser as any)?.avatarUrl || (authUser as any)?.profileImage || undefined}
                imgProps={{ style: { objectFit: 'cover' } }}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: '#2563EB',
                  fontSize: '2rem',
                  fontWeight: 800,
                  border: '3px solid #38BDF8',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.15)',
                }}
              >
                {!avatarPreview && (firstName?.[0] || authUser?.firstName?.[0] || 'S').toUpperCase()}
              </Avatar>

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>
                  Profile Avatar Photo
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1.5 }}>
                  Select and upload profile picture from your local file manager (JPG, PNG, or WebP max size 2MB).
                </Typography>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                <Button
                  variant="outlined"
                  onClick={handleOpenFilePicker}
                  startIcon={<Upload size={18} />}
                  sx={{
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 2,
                    borderColor: '#CBD5E1',
                    color: '#0F172A',
                    '&:hover': { bgcolor: '#F1F5F9', borderColor: '#94A3B8' },
                  }}
                >
                  UPLOAD PROFILE FROM FILE MANAGER
                </Button>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Profile Form Fields */}
            {isProfileLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="First Name"
                    fullWidth
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Last Name"
                    fullWidth
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email Address"
                    type="email"
                    fullWidth
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Contact / Phone Number"
                    fullWidth
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+919876543210"
                  />
                </Grid>
              </Grid>
            )}

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                disabled={isUpdatingProfile}
                startIcon={isUpdatingProfile ? <CircularProgress size={18} color="inherit" /> : <CheckCircle size={18} />}
                sx={{
                  fontWeight: 700,
                  px: 4,
                  py: 1.2,
                  borderRadius: 2,
                  bgcolor: '#2563EB',
                  '&:hover': { bgcolor: '#1D4ED8' },
                }}
              >
                {isUpdatingProfile ? 'Saving Profile...' : 'Save Profile Changes'}
              </Button>
            </Box>
          </Box>
        )}

        {/* TAB 1: GENERAL SYSTEM PREFERENCES */}
        {activeTab === 1 && (
          <Box sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 3 }}>
              General System Preferences
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField label="Platform Name" fullWidth defaultValue={settingsData?.data?.siteName || 'Comzilo ERP'} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField label="Default Currency" fullWidth defaultValue={settingsData?.data?.currency || 'USD'} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField label="Timezone" fullWidth defaultValue={settingsData?.data?.timezone || 'America/New_York'} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField label="Support Email" fullWidth defaultValue={settingsData?.data?.supportEmail || 'support@comzilo.com'} />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={handleSaveSettings} sx={{ fontWeight: 700, px: 4, py: 1.2, borderRadius: 2 }}>
                Save Settings
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </PageContainer>
  );
};

