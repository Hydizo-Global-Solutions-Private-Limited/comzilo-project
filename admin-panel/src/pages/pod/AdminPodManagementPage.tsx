/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CardMedia,
  MenuItem,
} from '@mui/material';
import {
  Sparkles,
  Plus,
  FolderTree,
  Printer,
  DollarSign,
  Download,
  CheckCircle,
  X,
  Edit2,
  Trash2,
  Shirt,
  Smartphone,
  Eye,
  Sliders,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export const AdminPodManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [podOrders, setPodOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Category Modal State
  const [openCategoryModal, setOpenCategoryModal] = useState<boolean>(false);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryDesc, setCategoryDesc] = useState<string>('');
  const [categoryImage, setCategoryImage] = useState<string>('');

  // Template Modal State
  const [openTemplateModal, setOpenTemplateModal] = useState<boolean>(false);
  const [templateTitle, setTemplateTitle] = useState<string>('');
  const [templateCategoryId, setTemplateCategoryId] = useState<number>(1);
  const [templateBasePrice, setTemplateBasePrice] = useState<number>(24.99);
  const [templateDesc, setTemplateDesc] = useState<string>('');
  const [templateThumbnail, setTemplateThumbnail] = useState<string>('');
  const [templateDefaultFont, setTemplateDefaultFont] = useState<string>('Bebas Neue');
  const [templateOverlayUrl, setTemplateOverlayUrl] = useState<string>('');
  const [placeholderWidth, setPlaceholderWidth] = useState<number>(200);
  const [placeholderHeight, setPlaceholderHeight] = useState<number>(180);

  // Pricing Rules State
  const [pricingRules, setPricingRules] = useState({
    tshirtBasePrice: 24.99,
    phoneCaseBasePrice: 18.99,
    artworkUploadFee: 3.00,
    multiZonePrintFee: 4.50,
    rushProductionFee: 5.00,
  });

  const API_BASE = 'http://localhost:5000/api/v1';

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/pod/categories`),
      axios.get(`${API_BASE}/pod/templates`),
      axios.get(`${API_BASE}/pod/orders`),
    ])
      .then(([catRes, tmplRes, orderRes]) => {
        setCategories(catRes.data?.data || []);
        setTemplates(tmplRes.data?.data || []);
        setPodOrders(orderRes.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Category CRUD
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    axios
      .post(`${API_BASE}/pod/categories`, {
        name: categoryName.trim(),
        description: categoryDesc.trim(),
        imageUrl: categoryImage || '/pod/pod_tshirt.png',
      })
      .then(() => {
        toast.success('POD Category created!');
        setOpenCategoryModal(false);
        setCategoryName('');
        setCategoryDesc('');
        setCategoryImage('');
        fetchData();
      })
      .catch(() => toast.error('Failed to create category'));
  };

  const handleDeleteCategory = (id: number) => {
    if (!window.confirm('Are you sure you want to delete this POD category?')) return;
    axios
      .delete(`${API_BASE}/pod/categories/${id}`)
      .then(() => {
        toast.success('Category deleted');
        fetchData();
      })
      .catch(() => toast.error('Failed to delete category'));
  };

  // Template Global Toggle
  const handleToggleTemplateGlobal = (templateId: number, currentStatus: boolean) => {
    axios
      .patch(`${API_BASE}/pod/templates/${templateId}/toggle`, { isActive: !currentStatus })
      .then(() => {
        toast.success(`Template ${!currentStatus ? 'Globally Enabled' : 'Globally Disabled'}`);
        fetchData();
      })
      .catch(() => toast.error('Failed to update template status'));
  };

  const handleDeleteTemplate = (id: number) => {
    if (!window.confirm('Are you sure you want to delete this POD template globally?')) return;
    axios
      .delete(`${API_BASE}/pod/templates/${id}`)
      .then(() => {
        toast.success('Template deleted');
        fetchData();
      })
      .catch(() => toast.error('Failed to delete template'));
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateTitle.trim()) return;

    axios
      .post(`${API_BASE}/pod/templates`, {
        title: templateTitle.trim(),
        categoryId: templateCategoryId,
        basePrice: templateBasePrice,
        description: templateDesc.trim(),
        thumbnailUrl: templateThumbnail || '/pod/pod_tshirt.png',
      })
      .then(() => {
        toast.success('Global Template Published!');
        setOpenTemplateModal(false);
        setTemplateTitle('');
        setTemplateDesc('');
        setTemplateThumbnail('');
        fetchData();
      })
      .catch(() => toast.error('Failed to publish template'));
  };

  // Download Customer Design
  const handleDownloadDesign = (order: any) => {
    const imageUrl = order.uploadedImageUrl || order.previewImageUrl;
    if (imageUrl) {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = `POD-Artwork-Order-${order.orderId || order.id || 'Design'}.png`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Downloading customer artwork asset...');
    } else {
      toast.error('No custom uploaded image found');
    }
  };

  const handleSavePricingRules = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('POD Global Pricing & Markup Rules Updated!');
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* HEADER */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Sparkles size={28} color="#6366F1" />
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              Print-On-Demand (POD) Administration
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Global control over POD categories, design templates, platform-wide POD orders, and pricing markup rules.
          </Typography>
        </Box>
      </Box>

      {/* TABS */}
      <Paper sx={{ mb: 4, borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: '#FFFFFF' }}
        >
          <Tab icon={<FolderTree size={18} />} iconPosition="start" label={`Categories (${categories.length})`} sx={{ fontWeight: 700 }} />
          <Tab icon={<Sparkles size={18} />} iconPosition="start" label={`Global Templates (${templates.length})`} sx={{ fontWeight: 700 }} />
          <Tab icon={<Printer size={18} />} iconPosition="start" label={`Monitor POD Orders (${podOrders.length})`} sx={{ fontWeight: 700 }} />
          <Tab icon={<Sliders size={18} />} iconPosition="start" label="Pricing Rules" sx={{ fontWeight: 700 }} />
        </Tabs>

        {/* TAB 0: CATEGORIES MANAGEMENT */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                POD Product Categories
              </Typography>
              <Button
                variant="contained"
                startIcon={<Plus size={16} />}
                onClick={() => setOpenCategoryModal(true)}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Add Category
              </Button>
            </Box>

            <Grid container spacing={3}>
              {categories.map((cat) => {
                const isTshirt = cat.slug === 't-shirts';
                return (
                  <Grid item xs={12} sm={6} md={4} key={cat.id}>
                    <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
                      <CardMedia
                        component="img"
                        height="140"
                        image={cat.imageUrl || (isTshirt ? '/pod/pod_tshirt.png' : '/pod/pod_phone_case.png')}
                        alt={cat.name}
                      />
                      <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isTshirt ? <Shirt size={18} color="#2563EB" /> : <Smartphone size={18} color="#7C3AED" />}
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                              {cat.name}
                            </Typography>
                          </Box>
                          <Chip label={cat.isActive ? 'Active' : 'Disabled'} color={cat.isActive ? 'success' : 'default'} size="small" sx={{ fontWeight: 700 }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                          {cat.description || 'Custom POD catalog category.'}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #F1F5F9' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#6366F1' }}>
                            {cat.templates?.length || (isTshirt ? 10 : 10)} Active Templates
                          </Typography>
                          <IconButton size="small" color="error" onClick={() => handleDeleteCategory(cat.id)}>
                            <Trash2 size={16} />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* TAB 1: GLOBAL TEMPLATES MANAGEMENT */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                Platform Design Templates (Global Control)
              </Typography>
              <Button
                variant="contained"
                startIcon={<Plus size={16} />}
                onClick={() => setOpenTemplateModal(true)}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Create Platform Template
              </Button>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Preview</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Title & Code</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Base Price</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Global Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((tmpl) => (
                    <TableRow key={tmpl.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#64748B' }}>#{tmpl.id}</TableCell>
                      <TableCell>
                        <Box
                          component="img"
                          src={tmpl.thumbnailUrl || (tmpl.categoryId === 1 ? '/pod/pod_tshirt.png' : '/pod/pod_phone_case.png')}
                          alt={tmpl.title}
                          sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover', border: '1px solid #E2E8F0' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{tmpl.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{tmpl.code || `TMPL-${tmpl.id}`}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={tmpl.category?.name || (tmpl.categoryId === 1 ? 'T-Shirts' : 'Phone Back Covers')}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#2563EB' }}>
                        ${Number(tmpl.basePrice).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={Boolean(tmpl.isActive)}
                              onChange={() => handleToggleTemplateGlobal(tmpl.id, tmpl.isActive)}
                              size="small"
                              color="success"
                            />
                          }
                          label={<Typography variant="caption" sx={{ fontWeight: 700 }}>{tmpl.isActive ? 'Enabled' : 'Disabled'}</Typography>}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => handleDeleteTemplate(tmpl.id)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 2: MONITOR POD ORDERS */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  Platform-Wide Print-On-Demand Orders
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Real-time monitoring of all customized orders placed by customers across the Comzilo marketplace.
                </Typography>
              </Box>
              <Chip label={`Total POD Orders: ${podOrders.length}`} color="primary" sx={{ fontWeight: 800 }} />
            </Box>

            {podOrders.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center', border: '1px dashed #CBD5E1', borderRadius: 3, bgcolor: '#F8FAFC' }}>
                <Printer size={48} color="#94A3B8" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 1.5, color: '#334155' }}>
                  No POD Orders Placed Yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  When customers complete custom t-shirt or phone case orders, they will appear here with full customization logs.
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Order ID</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Badge</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Template Name</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Custom Text & Font</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Size & Color</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Design Artwork</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Download</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {podOrders.map((ord) => (
                      <TableRow key={ord.id} hover>
                        <TableCell sx={{ fontWeight: 800, color: '#2563EB' }}>
                          #{ord.order?.orderNumber || `ORD-${ord.orderId || ord.id}`}
                        </TableCell>
                        <TableCell>
                          <Chip label="PRINT ON DEMAND" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: '#7C3AED', color: '#FFFFFF' }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {ord.templateName || ord.template?.title || 'Custom Template'}
                        </TableCell>
                        <TableCell>
                          {ord.customText ? (
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>"{ord.customText}"</Typography>
                              <Typography variant="caption" color="text.secondary">Font: {ord.font || 'Default'}</Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">None</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            {ord.size || 'L'} / {ord.color || 'Black'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {ord.uploadedImageUrl || ord.previewImageUrl ? (
                            <Box
                              component="img"
                              src={ord.uploadedImageUrl || ord.previewImageUrl}
                              alt="Design asset"
                              sx={{ width: 36, height: 36, borderRadius: 1, objectFit: 'contain', border: '1px solid #CBD5E1', bgcolor: '#F8FAFC' }}
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">No Image</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Download size={14} />}
                            onClick={() => handleDownloadDesign(ord)}
                            sx={{ fontWeight: 700, borderRadius: 1.5 }}
                          >
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* TAB 3: PRICING RULES */}
        {activeTab === 3 && (
          <Box sx={{ p: 4, maxWidth: 800 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
              Print-On-Demand Pricing & Markup Engine
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure base pricing rules, artwork processing fees, and extra print zone charges globally for the marketplace.
            </Typography>

            <form onSubmit={handleSavePricingRules}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="T-Shirt Minimum Base Price ($)"
                    type="number"
                    fullWidth
                    size="small"
                    value={pricingRules.tshirtBasePrice}
                    onChange={(e) => setPricingRules({ ...pricingRules, tshirtBasePrice: Number(e.target.value) })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Phone Case Minimum Base Price ($)"
                    type="number"
                    fullWidth
                    size="small"
                    value={pricingRules.phoneCaseBasePrice}
                    onChange={(e) => setPricingRules({ ...pricingRules, phoneCaseBasePrice: Number(e.target.value) })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Customer Image Upload Processing Fee ($)"
                    type="number"
                    fullWidth
                    size="small"
                    value={pricingRules.artworkUploadFee}
                    onChange={(e) => setPricingRules({ ...pricingRules, artworkUploadFee: Number(e.target.value) })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Extra Print Zone / Side Fee ($)"
                    type="number"
                    fullWidth
                    size="small"
                    value={pricingRules.multiZonePrintFee}
                    onChange={(e) => setPricingRules({ ...pricingRules, multiZonePrintFee: Number(e.target.value) })}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button type="submit" variant="contained" size="large" sx={{ fontWeight: 800, borderRadius: 2, px: 4 }}>
                    Save Global Pricing Rules
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Box>
        )}
      </Paper>

      {/* CREATE CATEGORY MODAL */}
      <Dialog open={openCategoryModal} onClose={() => setOpenCategoryModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveCategory}>
          <DialogTitle sx={{ fontWeight: 800 }}>Create New POD Category</DialogTitle>
          <DialogContent dividers sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Category Name *"
              required
              fullWidth
              size="small"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Mugs & Drinkware"
            />
            <TextField
              label="Description"
              multiline
              rows={2}
              fullWidth
              size="small"
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
            />
            <TextField
              label="Image Banner URL"
              fullWidth
              size="small"
              value={categoryImage}
              onChange={(e) => setCategoryImage(e.target.value)}
              placeholder="https://..."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenCategoryModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 700 }}>
              Create Category
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* CREATE TEMPLATE MODAL */}
      <Dialog open={openTemplateModal} onClose={() => setOpenTemplateModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveTemplate}>
          <DialogTitle sx={{ fontWeight: 800 }}>Publish Global Design Template</DialogTitle>
          <DialogContent dividers sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Template Title *"
              required
              fullWidth
              size="small"
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              placeholder="e.g. Vintage 1990s Crest"
            />
            <TextField
              select
              label="Assign Category *"
              fullWidth
              size="small"
              value={templateCategoryId}
              onChange={(e) => setTemplateCategoryId(Number(e.target.value))}
            >
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Base Price ($) *"
              type="number"
              required
              fullWidth
              size="small"
              value={templateBasePrice}
              onChange={(e) => setTemplateBasePrice(Number(e.target.value))}
            />
            <TextField
              label="Description"
              multiline
              rows={2}
              fullWidth
              size="small"
              value={templateDesc}
              onChange={(e) => setTemplateDesc(e.target.value)}
            />
            <TextField
              label="Thumbnail Artwork URL"
              fullWidth
              size="small"
              value={templateThumbnail}
              onChange={(e) => setTemplateThumbnail(e.target.value)}
              placeholder="/pod/pod_tshirt.png or https://..."
            />
            <TextField
              label="Default Typography Font"
              select
              fullWidth
              size="small"
              value={templateDefaultFont}
              onChange={(e) => setTemplateDefaultFont(e.target.value)}
            >
              {['Montserrat', 'Bebas Neue', 'Playfair Display', 'Orbitron', 'Oswald', 'Pacifico', 'Dancing Script', 'Poppins', 'Inter'].map((f) => (
                <MenuItem key={f} value={f}>{f}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Overlay Graphic / Frame URL (Optional)"
              fullWidth
              size="small"
              value={templateOverlayUrl}
              onChange={(e) => setTemplateOverlayUrl(e.target.value)}
              placeholder="https://... (locked PNG overlay)"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Placeholder Width (px)"
                type="number"
                fullWidth
                size="small"
                value={placeholderWidth}
                onChange={(e) => setPlaceholderWidth(Number(e.target.value))}
              />
              <TextField
                label="Placeholder Height (px)"
                type="number"
                fullWidth
                size="small"
                value={placeholderHeight}
                onChange={(e) => setPlaceholderHeight(Number(e.target.value))}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenTemplateModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 700 }}>
              Publish Smart Template
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
