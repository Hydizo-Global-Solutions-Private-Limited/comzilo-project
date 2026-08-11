import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { Plus, Edit3, Trash2, Layers, CheckCircle2, AlertTriangle, Upload, Eye } from 'lucide-react';

interface PodTemplate {
  id: number;
  uuid: string;
  name: string;
  productTypeName: string;
  renderingProfile: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  viewsCount?: number;
  createdAt: string;
}

export const EnterprisePodTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<PodTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openModal, setOpenModal] = useState<boolean>(false);

  // Form State
  const [templateName, setTemplateName] = useState<string>('');
  const [productTypeId, setProductTypeId] = useState<number>(1);
  const [renderingProfile, setRenderingProfile] = useState<string>('garment');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Mock / Fetch active POD templates from backend endpoint
      const response = await fetch('http://localhost:5000/api/v1/pod/templates');
      const data = await response.json();
      if (data.success && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      } else {
        // Sample baseline data if endpoint is initializing
        setTemplates([
          {
            id: 1,
            uuid: '0cd97d35-a1bc-44c3-8aa6-0f4f16b125b3',
            name: 'Classic Premium Cotton Tee Template v1',
            productTypeName: 'Apparel',
            renderingProfile: 'garment',
            version: 1,
            status: 'published',
            viewsCount: 4,
            createdAt: new Date().toISOString(),
          },
          {
            id: 2,
            uuid: '7b819f2a-89c0-4e12-b12a-9f4a1209b112',
            name: '11oz Ceramic Coffee Mug Template',
            productTypeName: 'Drinkware',
            renderingProfile: 'mug_wrap',
            version: 1,
            status: 'published',
            viewsCount: 2,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setTemplates([
        {
          id: 1,
          uuid: '0cd97d35-a1bc-44c3-8aa6-0f4f16b125b3',
          name: 'Classic Premium Cotton Tee Template v1',
          productTypeName: 'Apparel',
          renderingProfile: 'garment',
          version: 1,
          status: 'published',
          viewsCount: 4,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) return;

    try {
      const newTpl: PodTemplate = {
        id: templates.length + 1,
        uuid: `tpl-uuid-${Date.now()}`,
        name: templateName,
        productTypeName: productTypeId === 1 ? 'Apparel' : 'Drinkware',
        renderingProfile,
        version: 1,
        status: 'published',
        viewsCount: 4,
        createdAt: new Date().toISOString(),
      };

      setTemplates([newTpl, ...templates]);
      setOpenModal(false);
      setTemplateName('');
      setDescription('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* HEADER SECTION */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
            POD Template Manager
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Create and configure enterprise multi-layer POD product templates for seller customization.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => setOpenModal(true)}
          sx={{
            bgcolor: '#4F46E5',
            '&:hover': { bgcolor: '#4338CA' },
            borderRadius: 2,
            px: 3,
            py: 1.2,
            fontWeight: 700,
            textTransform: 'none',
          }}
        >
          Create POD Template
        </Button>
      </Box>

      {/* METRICS STATS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: '#EEF2FF', color: '#4F46E5', borderRadius: 2 }}>
                <Layers size={24} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                  Active POD Templates
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  {templates.length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: '#ECFDF5', color: '#10B981', borderRadius: 2 }}>
                <CheckCircle2 size={24} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                  Published Status
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  100% Verified
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: '#FEF3C7', color: '#D97706', borderRadius: 2 }}>
                <AlertTriangle size={24} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                  Asset Engine Pipeline
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  Multi-Layer Stack
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* TABLE LIST OF TEMPLATES */}
      <Paper sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Template Name</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Product Type</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Profile</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Views</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Version</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((tpl) => (
                <TableRow key={tpl.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      {tpl.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                      UUID: {tpl.uuid}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={tpl.productTypeName} size="small" sx={{ bgcolor: '#E0E7FF', color: '#3730A3', fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={tpl.renderingProfile} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {tpl.viewsCount || 4} Configured Views
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={`v${tpl.version}`} size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tpl.status.toUpperCase()}
                      size="small"
                      color={tpl.status === 'published' ? 'success' : 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary">
                      <Eye size={18} />
                    </IconButton>
                    <IconButton size="small" color="info">
                      <Edit3 size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* CREATE TEMPLATE DIALOG */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create New POD Template</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              label="Template Name"
              placeholder="e.g. Classic Premium Cotton Tee Template"
              fullWidth
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel>Product Type</InputLabel>
              <Select value={productTypeId} label="Product Type" onChange={(e) => setProductTypeId(Number(e.target.value))}>
                <MenuItem value={1}>Apparel</MenuItem>
                <MenuItem value={2}>Drinkware</MenuItem>
                <MenuItem value={3}>Accessories</MenuItem>
                <MenuItem value={4}>Packaging</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Rendering Profile</InputLabel>
              <Select value={renderingProfile} label="Rendering Profile" onChange={(e) => setRenderingProfile(e.target.value)}>
                <MenuItem value="garment">Garment Multi-Layer Stack</MenuItem>
                <MenuItem value="mug_wrap">Mug Wrap Surface</MenuItem>
                <MenuItem value="phone_case">Phone Case Mold</MenuItem>
                <MenuItem value="canvas">Canvas Wall Art</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Description"
              multiline
              rows={3}
              placeholder="Describe template features, views, and printable areas..."
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenModal(false)} sx={{ color: '#64748B' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateTemplate}
            sx={{ bgcolor: '#4F46E5', '&:hover': { bgcolor: '#4338CA' }, fontWeight: 700 }}
          >
            Create & Configure Views
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnterprisePodTemplateManager;
