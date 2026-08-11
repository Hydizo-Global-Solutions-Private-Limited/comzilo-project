import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Paper,
  Chip,
  IconButton,
  Divider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Type,
  ImageIcon,
  Sparkles,
  Layers,
  RotateCcw,
  RotateCw,
  Trash2,
  Lock,
  Plus,
  X,
  CheckCircle,
  Smartphone,
  Shirt,
  Upload,
  Box as BoxIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SellerPodStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  mockupType: string;
  initialTemplateJson?: string;
  onSaveTemplate: (templateJson: string, previewUrl?: string) => void;
}

export interface TemplateElement {
  id: string;
  type: 'text' | 'image_placeholder' | 'clipart' | 'shape';
  label: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fontSize?: number;
  isCurved?: boolean;
  allowCustomerUpload?: boolean;
  allowCustomerEdit?: boolean;
}

export const SellerPodStudioModal: React.FC<SellerPodStudioModalProps> = ({
  isOpen,
  onClose,
  productName,
  mockupType,
  initialTemplateJson,
  onSaveTemplate,
}) => {
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'left' | 'right'>('front');

  // Pre-populate elements from initial json if available
  const [sides, setSides] = useState<Record<string, TemplateElement[]>>(() => {
    if (initialTemplateJson) {
      try {
        const parsed = JSON.parse(initialTemplateJson);
        if (parsed.sides) return parsed.sides;
      } catch {
        // ignore
      }
    }
    return {
      front: [
        {
          id: 'tpl_1',
          type: 'text',
          label: 'Customer Name Line',
          content: 'YOUR CUSTOM NAME HERE',
          x: 100,
          y: 80,
          width: 300,
          height: 50,
          color: '#1E293B',
          fontSize: 24,
          allowCustomerEdit: true,
        },
        {
          id: 'tpl_2',
          type: 'image_placeholder',
          label: 'Front Image Upload Zone',
          content: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500',
          x: 120,
          y: 150,
          width: 260,
          height: 200,
          color: '#6366F1',
          allowCustomerUpload: true,
        },
      ],
      back: [
        {
          id: 'tpl_3',
          type: 'text',
          label: 'Custom Slogan / Description',
          content: 'EDITABLE BACK DESCRIPTION',
          x: 100,
          y: 120,
          width: 300,
          height: 50,
          color: '#0F172A',
          fontSize: 20,
          allowCustomerEdit: true,
        },
      ],
      left: [
        {
          id: 'tpl_4',
          type: 'image_placeholder',
          label: 'Left Side Image Upload Zone',
          content: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=500',
          x: 80,
          y: 60,
          width: 240,
          height: 320,
          color: '#10B981',
          allowCustomerUpload: true,
        },
      ],
      right: [
        {
          id: 'tpl_5',
          type: 'image_placeholder',
          label: 'Right Side Image Upload Zone',
          content: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=500',
          x: 80,
          y: 60,
          width: 240,
          height: 320,
          color: '#F59E0B',
          allowCustomerUpload: true,
        },
      ],
    };
  });

  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>('CUSTOM PLACEHOLDER TEXT');
  const [textColor, setTextColor] = useState<string>('#6366f1');
  const [fontSize, setFontSize] = useState<number>(24);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentElements = sides[activeSide] || [];
  const selectedEl = currentElements.find((e) => e.id === selectedElId);

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      if (imgUrl) {
        const newEl: TemplateElement = {
          id: `tpl_img_${Date.now()}`,
          type: 'image_placeholder',
          label: `${activeSide.toUpperCase()} Image Artwork (${file.name})`,
          content: imgUrl,
          x: 80,
          y: 80,
          width: 260,
          height: 240,
          color: '#6366F1',
          allowCustomerUpload: true,
        };
        setSides((prev) => ({
          ...prev,
          [activeSide]: [...(prev[activeSide] || []), newEl],
        }));
        setSelectedElId(newEl.id);
        toast.success(`Uploaded image artwork onto ${activeSide.toUpperCase()} view side!`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddTextPlaceholder = () => {
    const newEl: TemplateElement = {
      id: `tpl_${Date.now()}`,
      type: 'text',
      label: 'Editable Text Field',
      content: textInput,
      x: 100,
      y: 100 + currentElements.length * 30,
      width: 280,
      height: 50,
      color: textColor,
      fontSize,
      allowCustomerEdit: true,
    };
    setSides({
      ...sides,
      [activeSide]: [...currentElements, newEl],
    });
    setSelectedElId(newEl.id);
    toast.success('Added editable text placeholder to design template');
  };

  const handleAddPhotoPlaceholder = () => {
    const newEl: TemplateElement = {
      id: `tpl_${Date.now()}`,
      type: 'image_placeholder',
      label: 'Customer Photo Upload Zone',
      content: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500',
      x: 100,
      y: 120,
      width: 260,
      height: 220,
      color: '#3B82F6',
      allowCustomerUpload: true,
    };
    setSides({
      ...sides,
      [activeSide]: [...currentElements, newEl],
    });
    setSelectedElId(newEl.id);
    toast.success('Added customer photo upload zone to template');
  };

  const handleDeleteElement = (id: string) => {
    setSides({
      ...sides,
      [activeSide]: currentElements.filter((e) => e.id !== id),
    });
    if (selectedElId === id) setSelectedElId(null);
    toast.success('Removed element from design template');
  };

  const handleSaveAndAttach = () => {
    const templateData = {
      productName,
      mockupType,
      sides,
      createdAt: new Date().toISOString(),
    };
    const jsonString = JSON.stringify(templateData, null, 2);
    const mockPreview = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500';
    onSaveTemplate(jsonString, mockPreview);
    toast.success('Seller Design Template saved and attached to product successfully!');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="xl" fullWidth PaperProps={{ sx: { borderRadius: 4, maxHeight: '92vh' } }}>
      <DialogTitle sx={{ fontWeight: 800, bgcolor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Sparkles size={24} color="#818CF8" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Interactive Seller Template Designer — {productName || 'Print On Demand Item'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#94A3B8' }}>
          <X size={22} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: '#F8FAFC' }}>
        {/* TOP TOOLBAR: VIEW SIDE SWITCHER */}
        <Paper sx={{ p: 1.5, mb: 3, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mr: 1 }}>
              Canvas View Side:
            </Typography>
            <Button
              variant={activeSide === 'front' ? 'contained' : 'outlined'}
              size="small"
              startIcon={<Shirt size={16} />}
              onClick={() => { setActiveSide('front'); setSelectedElId(null); }}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Front Side
            </Button>
            <Button
              variant={activeSide === 'back' ? 'contained' : 'outlined'}
              size="small"
              startIcon={<Shirt size={16} />}
              onClick={() => { setActiveSide('back'); setSelectedElId(null); }}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Back Side
            </Button>
            <Button
              variant={activeSide === 'left' ? 'contained' : 'outlined'}
              size="small"
              color="info"
              startIcon={<Shirt size={16} />}
              onClick={() => { setActiveSide('left'); setSelectedElId(null); }}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Left Side
            </Button>
            <Button
              variant={activeSide === 'right' ? 'contained' : 'outlined'}
              size="small"
              color="secondary"
              startIcon={<Shirt size={16} />}
              onClick={() => { setActiveSide('right'); setSelectedElId(null); }}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Right Side
            </Button>
          </Box>

          <Chip
            label={`Category: ${(mockupType || 'tshirt').toUpperCase().replace(/_/g, ' ')}`}
            color="primary"
            size="small"
            sx={{ fontWeight: 800 }}
          />
        </Paper>

        <Grid container spacing={3}>
          {/* LEFT PANEL: SELLER DESIGN TOOLS */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', height: '100%', boxShadow: 'none' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Layers size={18} color="#4F46E5" /> Add Starter Design Elements
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleLocalImageUpload}
                />

                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<Upload size={18} />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    py: 1.4,
                    fontWeight: 800,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  📁 Upload Image from File Manager ({(activeSide || 'front').toUpperCase()})
                </Button>

                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Type size={18} />}
                  onClick={handleAddTextPlaceholder}
                  sx={{ py: 1.2, fontWeight: 700, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  + Add Editable Text Field
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  startIcon={<ImageIcon size={18} />}
                  onClick={handleAddPhotoPlaceholder}
                  sx={{ py: 1.2, fontWeight: 700, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  + Add Customer Photo Upload Zone
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* SELECTED ELEMENT PROPERTIES EDIT PANEL */}
              {selectedEl ? (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5 }}>
                    Configure Selected Template Field:
                  </Typography>

                  <TextField
                    label="Field Label"
                    size="small"
                    fullWidth
                    value={selectedEl.label}
                    onChange={(e) => {
                      const updated = currentElements.map((el) => el.id === selectedEl.id ? { ...el, label: e.target.value } : el);
                      setSides({ ...sides, [activeSide]: updated });
                    }}
                    sx={{ mb: 2 }}
                  />

                  {selectedEl.type === 'text' && (
                    <>
                      <TextField
                        label="Default Placeholder Text"
                        size="small"
                        fullWidth
                        value={selectedEl.content}
                        onChange={(e) => {
                          const updated = currentElements.map((el) => el.id === selectedEl.id ? { ...el, content: e.target.value } : el);
                          setSides({ ...sides, [activeSide]: updated });
                        }}
                        sx={{ mb: 2 }}
                      />
                      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                        <TextField
                          label="Text Color"
                          type="color"
                          size="small"
                          value={selectedEl.color}
                          onChange={(e) => {
                            const updated = currentElements.map((el) => el.id === selectedEl.id ? { ...el, color: e.target.value } : el);
                            setSides({ ...sides, [activeSide]: updated });
                          }}
                          sx={{ width: 100 }}
                        />
                        <TextField
                          label="Font Size (px)"
                          type="number"
                          size="small"
                          value={selectedEl.fontSize || 24}
                          onChange={(e) => {
                            const updated = currentElements.map((el) => el.id === selectedEl.id ? { ...el, fontSize: Number(e.target.value) } : el);
                            setSides({ ...sides, [activeSide]: updated });
                          }}
                          fullWidth
                        />
                      </Box>
                    </>
                  )}

                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedEl.type === 'text' ? Boolean(selectedEl.allowCustomerEdit) : Boolean(selectedEl.allowCustomerUpload)}
                        onChange={(e) => {
                          const val = e.target.checked;
                          const updated = currentElements.map((el) =>
                            el.id === selectedEl.id
                              ? { ...el, allowCustomerEdit: val, allowCustomerUpload: val }
                              : el
                          );
                          setSides({ ...sides, [activeSide]: updated });
                        }}
                        color="primary"
                      />
                    }
                    label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Allow Customer to Edit / Replace in Storefront</Typography>}
                  />

                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    startIcon={<Trash2 size={16} />}
                    onClick={() => handleDeleteElement(selectedEl.id)}
                    sx={{ mt: 2, fontWeight: 700 }}
                  >
                    Delete Field
                  </Button>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#F1F5F9', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Click any design layer on the canvas to configure customer editing options.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* RIGHT PANEL: INTERACTIVE VISUAL CANVAS PREVIEW */}
          <Grid item xs={12} md={8}>
            <Paper
              sx={{
                p: 4,
                pt: 6,
                borderRadius: 3,
                border: '2px dashed #CBD5E1',
                bgcolor: '#FFFFFF',
                minHeight: 520,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justify: 'center',
                position: 'relative',
                boxShadow: 'none',
              }}
            >
              <Typography variant="caption" sx={{ position: 'absolute', top: 18, left: 24, fontWeight: 800, color: '#475569', letterSpacing: 1.5 }}>
                PRINTABLE AREA CANVAS ({(activeSide || 'front').toUpperCase()} VIEW)
              </Typography>

              {/* MOCKUP CANVAS CONTAINER */}
              <Box
                sx={{
                  width: 400,
                  height: 460,
                  bgcolor: '#F8FAFC',
                  borderRadius: 3,
                  border: '2px solid #E2E8F0',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.06)',
                }}
              >
                {/* RENDER DESIGN LAYERS */}
                {currentElements.map((el) => {
                  const isSelected = el.id === selectedElId;
                  return (
                    <Box
                      key={el.id}
                      onClick={() => setSelectedElId(el.id)}
                      sx={{
                        position: 'absolute',
                        left: el.x,
                        top: el.y,
                        width: el.width,
                        height: el.height,
                        border: isSelected ? '2px solid #6366F1' : '1px dashed #94A3B8',
                        borderRadius: el.type === 'image_placeholder' ? 2 : 1,
                        bgcolor: el.type === 'image_placeholder' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        p: 1,
                        transition: 'border 0.2s ease',
                      }}
                    >
                      {el.type === 'text' && (
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 800,
                            color: el.color,
                            fontSize: el.fontSize || 20,
                            textAlign: 'center',
                            wordBreak: 'break-word',
                          }}
                        >
                          {el.content}
                        </Typography>
                      )}

                      {el.type === 'image_placeholder' && (
                        <Box sx={{ textAlign: 'center' }}>
                          <ImageIcon size={32} color="#4F46E5" />
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#4F46E5', display: 'block', mt: 0.5 }}>
                            {el.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            (Customer Photo Upload Area)
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#0F172A' }}>
        <Button onClick={onClose} sx={{ color: '#94A3B8', fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<CheckCircle size={18} />}
          onClick={handleSaveAndAttach}
          sx={{
            fontWeight: 800,
            px: 3,
            py: 1,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
          }}
        >
          Save Design Template & Attach to Product
        </Button>
      </DialogActions>
    </Dialog>
  );
};
