/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Plus,
  Edit2,
  Trash2,
  Layers,
  List,
  Palette,
  FolderTree,
  RefreshCw,
} from 'lucide-react';
import { axiosInstance } from '../api/axiosInstance';
import toast from 'react-hot-toast';

const FIELD_TYPES = [
  { code: 'text', label: 'Single Line Text' },
  { code: 'textarea', label: 'Multi-line Textarea' },
  { code: 'number', label: 'Number (Integer)' },
  { code: 'decimal', label: 'Decimal / Currency' },
  { code: 'dropdown', label: 'Single Select Dropdown' },
  { code: 'multiselect', label: 'Multi-Select Options' },
  { code: 'checkbox', label: 'Checkbox' },
  { code: 'radio', label: 'Radio Selection' },
  { code: 'color_picker', label: 'Color Swatch / Picker' },
  { code: 'date', label: 'Date Picker' },
  { code: 'datetime', label: 'Date & Time' },
  { code: 'boolean', label: 'Boolean (Yes / No Switch)' },
  { code: 'email', label: 'Email Address' },
  { code: 'phone', label: 'Phone Number' },
  { code: 'url', label: 'Website URL' },
  { code: 'image', label: 'Image Upload' },
  { code: 'file', label: 'Document / File Upload' },
];

export const AdminAttributeManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  // Data
  const [groups, setGroups] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryAttributes, setCategoryAttributes] = useState<any[]>([]);

  // Selected Group for Value Management
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupValues, setGroupValues] = useState<any[]>([]);

  // Modals
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [attributeModalOpen, setAttributeModalOpen] = useState(false);
  const [valueModalOpen, setValueModalOpen] = useState(false);

  // Editing Items
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editingAttr, setEditingAttr] = useState<any>(null);
  const [editingValue, setEditingValue] = useState<any>(null);

  // Forms
  const [groupForm, setGroupForm] = useState({ name: '', code: '', displayOrder: 0 });
  const [attrForm, setAttrForm] = useState({
    categoryId: '',
    attributeGroupId: '',
    attributeName: '',
    displayName: '',
    code: '',
    description: '',
    attributeType: 'dropdown',
    placeholder: '',
    defaultValue: '',
    isRequired: false,
    isUnique: false,
    isSearchable: true,
    isFilterable: true,
    isSortable: false,
    isVisible: true,
    displayOrder: 0,
  });
  const [valueForm, setValueForm] = useState({ value: '', hexCode: '', displayOrder: 0 });

  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [groupsRes, catsRes, attrsRes] = await Promise.allSettled([
        axiosInstance.get('/admin/attributes/groups'),
        axiosInstance.get('/categories'),
        axiosInstance.get('/admin/attributes/category-attributes'),
      ]);

      if (groupsRes.status === 'fulfilled') setGroups(groupsRes.value.data.data || []);
      if (catsRes.status === 'fulfilled') {
        const raw = catsRes.value.data.data;
        setCategories(Array.isArray(raw) ? raw : raw?.rows || []);
      }
      if (attrsRes.status === 'fulfilled') setCategoryAttributes(attrsRes.value.data.data || []);

      if (selectedGroup?.id) {
        await fetchGroupValues(selectedGroup.id);
      }

      if (isManualRefresh) {
        toast.success('Category attributes refreshed successfully!');
      }
    } catch {
      toast.error('Failed to load attribute configuration');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchGroupValues = async (groupId: number) => {
    try {
      const res = await axiosInstance.get(`/admin/attributes/groups/${groupId}/values`);
      setGroupValues(res.data.data || []);
    } catch {
      toast.error('Failed to load group values');
    }
  };

  // Handlers for Group
  const handleSaveGroup = async () => {
    if (!groupForm.name || !groupForm.code) return toast.error('Group Name and Code are required');
    try {
      if (editingGroup) {
        await axiosInstance.put(`/admin/attributes/groups/${editingGroup.id}`, groupForm);
        toast.success('Attribute Group updated');
      } else {
        await axiosInstance.post('/admin/attributes/groups', groupForm);
        toast.success('Attribute Group created');
      }
      setGroupModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving group');
    }
  };

  const handleDeleteGroup = async (id: number) => {
    try {
      await axiosInstance.delete(`/admin/attributes/groups/${id}`);
      toast.success('Attribute Group deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete group');
    }
  };

  // Handlers for Attribute
  const handleSaveAttribute = async () => {
    if (!attrForm.categoryId || !attrForm.attributeName) return toast.error('Category and Attribute Name are required');
    try {
      let targetGroupId = attrForm.attributeGroupId;

      if (!targetGroupId) {
        const existingGroup = groups.find((g: any) => g.name.toLowerCase() === attrForm.attributeName.toLowerCase());
        if (existingGroup) {
          targetGroupId = existingGroup.id;
        } else {
          try {
            const groupRes = await axiosInstance.post('/admin/attributes/groups', {
              name: attrForm.attributeName,
              code: attrForm.code || attrForm.attributeName.toLowerCase().replace(/\s+/g, '_'),
              displayOrder: 0,
            });
            targetGroupId = groupRes.data?.data?.id;
          } catch {
            // Fallback if group creation fails
          }
        }
      }

      const payload = { ...attrForm, attributeGroupId: targetGroupId || undefined };

      if (editingAttr) {
        await axiosInstance.put(`/admin/attributes/category-attributes/${editingAttr.id}`, payload);
        toast.success('Category Attribute updated');
      } else {
        await axiosInstance.post('/admin/attributes/category-attributes', payload);
        toast.success('Category Attribute mapped successfully');
      }
      setAttributeModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving attribute');
    }
  };

  const handleManageAttributeValues = async (attr: any) => {
    const attrNameLower = (attr.attributeName || attr.displayName || '').toLowerCase().trim();
    
    // 1. Find group matching attribute name or code
    let matchingGroup = groups.find(
      (g: any) => g.name.toLowerCase().trim() === attrNameLower || g.code.toLowerCase().trim() === attrNameLower
    );

    // 2. If group doesn't exist yet, auto-create a dedicated Attribute Group for this attribute
    if (!matchingGroup) {
      try {
        const groupCode = (attr.code || attr.attributeName).toLowerCase().replace(/[^a-z0-9]/g, '_');
        const res = await axiosInstance.post('/admin/attributes/groups', {
          name: attr.displayName || attr.attributeName,
          code: groupCode,
          displayOrder: 0,
        });
        matchingGroup = res.data?.data;
        if (matchingGroup) {
          // Link CategoryAttribute to this new dedicated group
          await axiosInstance.put(`/admin/attributes/category-attributes/${attr.id}`, {
            attributeGroupId: matchingGroup.id,
          });
          fetchData();
        }
      } catch {
        console.warn('Failed to auto-create dedicated attribute group');
      }
    }

    if (matchingGroup) {
      setSelectedGroup(matchingGroup);
      fetchGroupValues(matchingGroup.id);
    } else {
      const fallbackGroup = {
        id: attr.attributeGroupId || attr.id,
        name: attr.displayName || attr.attributeName,
        code: attr.code || attr.attributeName,
      };
      setSelectedGroup(fallbackGroup);
      if (attr.attributeGroupId) fetchGroupValues(attr.attributeGroupId);
    }
    setActiveTab(2);
  };

  const handleDeleteAttribute = async (id: number) => {
    try {
      await axiosInstance.delete(`/admin/attributes/category-attributes/${id}`);
      toast.success('Attribute mapping removed');
      fetchData();
    } catch {
      toast.error('Failed to delete attribute');
    }
  };

  // Handlers for Values
  const handleSaveValue = async () => {
    if (!selectedGroup) return toast.error('Select an Attribute Group first');
    if (!valueForm.value) return toast.error('Value is required');

    try {
      const payload = { ...valueForm, attributeGroupId: selectedGroup.id };
      if (editingValue) {
        await axiosInstance.put(`/admin/attributes/values/${editingValue.id}`, payload);
        toast.success('Attribute Value updated');
      } else {
        await axiosInstance.post('/admin/attributes/values', payload);
        toast.success('Attribute Value added');
      }
      setValueModalOpen(false);
      fetchGroupValues(selectedGroup.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving value');
    }
  };

  const handleDeleteValue = async (id: number) => {
    try {
      await axiosInstance.delete(`/admin/attributes/values/${id}`);
      toast.success('Value deleted');
      if (selectedGroup) fetchGroupValues(selectedGroup.id);
    } catch {
      toast.error('Failed to delete value');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
            Dynamic Category Attribute Management Engine
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure dynamic attribute groups, field validations, swatches, and category mappings.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          disabled={refreshing || loading}
          startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshCw size={18} />}
          onClick={() => fetchData(true)}
          sx={{ fontWeight: 700, borderRadius: 2 }}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </Box>

      {/* TABS */}
      <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3, boxShadow: 'none' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{ px: 3, borderBottom: '1px solid #E2E8F0' }}
        >
          <Tab icon={<Layers size={18} />} label="Attribute Groups" iconPosition="start" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab icon={<List size={18} />} label="Category Attributes" iconPosition="start" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab icon={<Palette size={18} />} label="Attribute Values / Swatches" iconPosition="start" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab icon={<FolderTree size={18} />} label="Category Mappings Summary" iconPosition="start" sx={{ fontWeight: 700, textTransform: 'none' }} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* TAB 0: ATTRIBUTE GROUPS */}
          {activeTab === 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Attribute Groups ({groups.length})</Typography>
                <Button
                  variant="contained"
                  startIcon={<Plus size={18} />}
                  onClick={() => {
                    setEditingGroup(null);
                    setGroupForm({ name: '', code: '', displayOrder: 0 });
                    setGroupModalOpen(true);
                  }}
                  sx={{ fontWeight: 700, borderRadius: 2 }}
                >
                  Create Group
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Group Name</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Defined Values</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groups.map((g: any) => (
                      <TableRow key={g.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{g.name}</TableCell>
                        <TableCell><Chip label={g.code} size="small" variant="outlined" sx={{ fontWeight: 700 }} /></TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{g.values?.length || 0} values</TableCell>
                        <TableCell><Chip label={g.status || 'ACTIVE'} color="success" size="small" sx={{ fontWeight: 700 }} /></TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="primary" onClick={() => {
                            setEditingGroup(g);
                            setGroupForm({ name: g.name, code: g.code, displayOrder: g.displayOrder || 0 });
                            setGroupModalOpen(true);
                          }}><Edit2 size={16} /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteGroup(g.id)}><Trash2 size={16} /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* TAB 1: CATEGORY ATTRIBUTES */}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Dynamic Category Attributes ({categoryAttributes.length})</Typography>
                <Button
                  variant="contained"
                  startIcon={<Plus size={18} />}
                  onClick={() => {
                    setEditingAttr(null);
                    setAttrForm({
                      categoryId: categories[0]?.id || '',
                      attributeGroupId: '',
                      attributeName: '',
                      displayName: '',
                      code: '',
                      description: '',
                      attributeType: 'dropdown',
                      placeholder: '',
                      defaultValue: '',
                      isRequired: false,
                      isUnique: false,
                      isSearchable: true,
                      isFilterable: true,
                      isSortable: false,
                      isVisible: true,
                      displayOrder: 0,
                    });
                    setAttributeModalOpen(true);
                  }}
                  sx={{ fontWeight: 700, borderRadius: 2 }}
                >
                  Add Category Attribute
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Attribute Name</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Category ID</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Field Type</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Group</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Rules</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryAttributes.map((attr: any) => (
                      <TableRow key={attr.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {attr.displayName || attr.attributeName}
                          <Typography variant="caption" display="block" color="text.secondary">Code: {attr.code || attr.attributeName}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Category #{attr.categoryId}</TableCell>
                        <TableCell><Chip label={(attr.attributeType || 'select').toUpperCase()} size="small" color="secondary" sx={{ fontWeight: 700 }} /></TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{attr.group?.name || 'N/A'}</TableCell>
                        <TableCell>
                          {attr.isRequired && <Chip label="Required" size="small" color="error" sx={{ mr: 0.5, fontWeight: 700 }} />}
                          {attr.isFilterable && <Chip label="Filterable" size="small" color="info" sx={{ fontWeight: 700 }} />}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Palette size={14} />}
                            onClick={() => handleManageAttributeValues(attr)}
                            sx={{ mr: 1, fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
                          >
                            Manage Values
                          </Button>
                          <IconButton size="small" color="primary" onClick={() => {
                            setEditingAttr(attr);
                            setAttrForm({
                              categoryId: attr.categoryId,
                              attributeGroupId: attr.attributeGroupId || '',
                              attributeName: attr.attributeName,
                              displayName: attr.displayName || '',
                              code: attr.code || '',
                              description: attr.description || '',
                              attributeType: attr.attributeType || 'dropdown',
                              placeholder: attr.placeholder || '',
                              defaultValue: attr.defaultValue || '',
                              isRequired: attr.isRequired || false,
                              isUnique: attr.isUnique || false,
                              isSearchable: attr.isSearchable ?? true,
                              isFilterable: attr.isFilterable ?? true,
                              isSortable: attr.isSortable || false,
                              isVisible: attr.isVisible ?? true,
                              displayOrder: attr.displayOrder || 0,
                            });
                            setAttributeModalOpen(true);
                          }}><Edit2 size={16} /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteAttribute(attr.id)}><Trash2 size={16} /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* TAB 2: ATTRIBUTE VALUES / SWATCHES */}
          {activeTab === 2 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: 2, boxShadow: 'none' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>Select Attribute Group</Typography>
                    {groups.map((g: any) => (
                      <Button
                        key={g.id}
                        fullWidth
                        variant={selectedGroup?.id === g.id ? 'contained' : 'outlined'}
                        onClick={() => {
                          setSelectedGroup(g);
                          fetchGroupValues(g.id);
                        }}
                        sx={{ mb: 1, justifyContent: 'flex-start', fontWeight: 700 }}
                      >
                        {g.name} ({g.code})
                      </Button>
                    ))}
                  </Card>
                </Grid>
                <Grid item xs={12} md={8}>
                  {selectedGroup ? (
                    <Card sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: 2, boxShadow: 'none' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>Values for "{selectedGroup.name}" ({groupValues.length})</Typography>
                        <Button
                          variant="contained"
                          startIcon={<Plus size={18} />}
                          onClick={() => {
                            setEditingValue(null);
                            setValueForm({ value: '', hexCode: '', displayOrder: 0 });
                            setValueModalOpen(true);
                          }}
                          sx={{ fontWeight: 700 }}
                        >
                          Add Value
                        </Button>
                      </Box>

                      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table>
                          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 800 }}>Value</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Hex Swatch</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {groupValues.map((v: any) => (
                              <TableRow key={v.id} hover>
                                <TableCell sx={{ fontWeight: 700 }}>{v.value}</TableCell>
                                <TableCell>
                                  {v.hexCode ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: v.hexCode, border: '1px solid #CBD5E1' }} />
                                      <Typography variant="body2">{v.hexCode}</Typography>
                                    </Box>
                                  ) : 'N/A'}
                                </TableCell>
                                <TableCell align="right">
                                  <IconButton size="small" color="error" onClick={() => handleDeleteValue(v.id)}><Trash2 size={16} /></IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Card>
                  ) : (
                    <Alert severity="info">Please select an Attribute Group on the left to manage its values.</Alert>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}

          {/* TAB 3: CATEGORY MAPPINGS SUMMARY */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Category Attribute Assignments Overview</Typography>
              <Grid container spacing={2}>
                {categories.map((c: any) => {
                  const assigned = categoryAttributes.filter((a: any) => Number(a.categoryId) === Number(c.id));
                  return (
                    <Grid item xs={12} sm={6} md={4} key={c.id}>
                      <Card sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2, boxShadow: 'none' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{c.name}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>ID #{c.id} • Slug: {c.slug}</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {assigned.length > 0 ? (
                            assigned.map((a: any) => (
                              <Chip key={a.id} label={a.displayName || a.attributeName} size="small" color="primary" sx={{ fontWeight: 700 }} />
                            ))
                          ) : (
                            <Typography variant="caption" color="text.secondary">No attributes mapped</Typography>
                          )}
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </Box>
      </Card>

      {/* DIALOG: ATTRIBUTE GROUP */}
      <Dialog open={groupModalOpen} onClose={() => setGroupModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingGroup ? 'Edit Attribute Group' : 'Create Attribute Group'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Group Name (e.g. Size)" fullWidth value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} />
            <TextField label="Group Code (e.g. size_group)" fullWidth value={groupForm.code} onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveGroup} sx={{ fontWeight: 700 }}>Save Group</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CATEGORY ATTRIBUTE */}
      <Dialog open={attributeModalOpen} onClose={() => setAttributeModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingAttr ? 'Edit Category Attribute' : 'Map Attribute to Category'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={attrForm.categoryId} label="Category" onChange={(e) => setAttrForm({ ...attrForm, categoryId: e.target.value })}>
                  {categories.map((c: any) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Attribute Group (Optional)</InputLabel>
                <Select value={attrForm.attributeGroupId} label="Attribute Group (Optional)" onChange={(e) => setAttrForm({ ...attrForm, attributeGroupId: e.target.value })}>
                  <MenuItem value="">None / Independent</MenuItem>
                  {groups.map((g: any) => (
                    <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Attribute Internal Name" fullWidth value={attrForm.attributeName} onChange={(e) => setAttrForm({ ...attrForm, attributeName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Display Label (User Facing)" fullWidth value={attrForm.displayName} onChange={(e) => setAttrForm({ ...attrForm, displayName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Field Type (17 Types Supported)</InputLabel>
                <Select value={attrForm.attributeType} label="Field Type (17 Types Supported)" onChange={(e) => setAttrForm({ ...attrForm, attributeType: e.target.value })}>
                  {FIELD_TYPES.map((t) => (
                    <MenuItem key={t.code} value={t.code}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Placeholder Text" fullWidth value={attrForm.placeholder} onChange={(e) => setAttrForm({ ...attrForm, placeholder: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel control={<Switch checked={attrForm.isRequired} onChange={(e) => setAttrForm({ ...attrForm, isRequired: e.target.checked })} />} label="Required Field" />
              <FormControlLabel control={<Switch checked={attrForm.isFilterable} onChange={(e) => setAttrForm({ ...attrForm, isFilterable: e.target.checked })} />} label="Filterable on Storefront" />
              <FormControlLabel control={<Switch checked={attrForm.isSearchable} onChange={(e) => setAttrForm({ ...attrForm, isSearchable: e.target.checked })} />} label="Searchable" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttributeModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAttribute} sx={{ fontWeight: 700 }}>Save Attribute</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: ATTRIBUTE VALUE */}
      <Dialog open={valueModalOpen} onClose={() => setValueModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Add Value for Attribute: "{selectedGroup?.name || 'Selected Attribute'}"
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Chip
              label={`Target Attribute: ${selectedGroup?.name || 'N/A'}`}
              color="primary"
              size="small"
              sx={{ fontWeight: 800, alignSelf: 'flex-start' }}
            />
            <TextField
              label="Option Value (e.g. 128GB, 8GB, XL, Navy Blue)"
              fullWidth
              value={valueForm.value}
              onChange={(e) => setValueForm({ ...valueForm, value: e.target.value })}
            />
            <TextField
              label="Hex Color Swatch Code (Optional e.g. #0000FF)"
              fullWidth
              value={valueForm.hexCode}
              onChange={(e) => setValueForm({ ...valueForm, hexCode: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValueModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveValue} sx={{ fontWeight: 700 }}>Save Value</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
