import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Divider,
  Paper,
  Chip,
  Grid,
  Slider,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  X,
  Shirt,
  Image as ImageIcon,
  Type as TypeIcon,
  Layers as LayersIcon,
  Palette,
  Upload,
  RotateCw,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  Shapes,
  Smile,
  QrCode,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo,
  Redo,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePodCanvas, CanvasElement } from '../../hooks/usePodCanvas';
import { getProductImage } from '../../utils/productImageService';

interface PodStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onAddToCartCustomized: (customizedItem: any) => void;
}

const PRESET_GARMENT_COLORS = [
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Jet Black', hex: '#111827' },
  { name: 'Royal Blue', hex: '#1D4ED8' },
  { name: 'Heather Gray', hex: '#64748B' },
  { name: 'Crimson Red', hex: '#DC2626' },
  { name: 'Cyan Blue', hex: '#0891B2' },
  { name: 'Blush Pink', hex: '#DB2777' },
  { name: 'Forest Green', hex: '#15803D' },
];

const PRESET_SAMPLE_ARTWORKS = [
  { name: 'Retro Sunset', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300' },
  { name: 'Urban Graphic', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300' },
  { name: 'Minimalist Wave', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300' },
];

const PRESET_SHAPES = [
  { name: 'Square', type: 'square', path: 'M10 10 H90 V90 H10 Z' },
  { name: 'Circle', type: 'circle', path: 'M50 10 A40 40 0 1 0 50 90 A40 40 0 1 0 50 10 Z' },
  { name: 'Triangle', type: 'triangle', path: 'M50 10 L90 90 L10 90 Z' },
  { name: 'Star', type: 'star', path: 'M50 5 L63 38 L98 38 L70 59 L81 93 L50 72 L19 93 L30 59 L2 38 L37 38 Z' },
  { name: 'Heart', type: 'heart', path: 'M50 88 C20 60 5 45 5 28 A20 20 0 0 1 45 15 L50 22 L55 15 A20 20 0 0 1 95 28 C95 45 80 60 50 88 Z' },
];

const PRESET_CLIPARTS = [
  { name: 'Crown Badge', svg: '<path fill="currentColor" d="M12 2L15 9L22 9L16.5 13.5L18.5 20.5L12 16L5.5 20.5L7.5 13.5L2 9L9 9Z"/>' },
  { name: 'Lightning Spark', svg: '<path fill="currentColor" d="M13 2L3 14H12L11 22L21 10H12L13 2Z"/>' },
  { name: 'Flame Energy', svg: '<path fill="currentColor" d="M12 2C12 2 7 7 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12C17 7 12 2 12 2Z"/>' },
];

export const PodStudioModal: React.FC<PodStudioModalProps> = ({
  isOpen,
  onClose,
  product,
  onAddToCartCustomized,
}) => {
  const {
    activeSide,
    setActiveSide,
    sides,
    setSides,
    selectedElementId,
    setSelectedElementId,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    moveElementLayer,
    undo,
    redo,
    canUndo,
    canRedo,
  } = usePodCanvas();

  const [activeNav, setActiveNav] = useState<'product' | 'images' | 'text' | 'layers' | 'shapes' | 'cliparts'>('product');
  const [productColor, setProductColor] = useState<string>('#FFFFFF');
  const [sizeQty, setSizeQty] = useState<{ S: number; M: number; L: number; XL: number }>({ S: 1, M: 0, L: 0, XL: 0 });
  const [textInput, setTextInput] = useState<string>('Custom Lumise Text');
  const [textColor, setTextColor] = useState<string>('#111827');
  const [fontSize, setFontSize] = useState<number>(28);
  const [fontFamily, setFontFamily] = useState<string>('Inter');
  const [isCurved, setIsCurved] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [podBundle, setPodBundle] = useState<any>(null);

  // Dragging State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && product?.id) {
      fetch(`http://localhost:5000/api/v1/pod/engine/product/${product.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.hasPodTemplate) {
            setPodBundle(data.bundle);
          } else {
            setPodBundle(null);
          }
        })
        .catch(() => setPodBundle(null));
    }
  }, [isOpen, product]);

  if (!isOpen) return null;

  const currentElements = (sides && sides[activeSide]?.elements) || [];
  const selectedEl = currentElements.find((e: any) => e.id === selectedElementId);

  const handleAddText = () => {
    if (!textInput.trim()) return;
    addElement({
      type: 'text',
      content: textInput,
      x: 80,
      y: 120 + currentElements.length * 25,
      width: 240,
      height: 60,
      rotation: 0,
      color: textColor,
      fontSize,
      fontFamily,
      isCurved,
      opacity: 1,
      filter: 'none',
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      if (imgUrl) {
        addElement({
          type: 'image',
          content: imgUrl,
          x: 70,
          y: 90,
          width: 220,
          height: 200,
          rotation: 0,
          color: '#ffffff',
          opacity: 1,
          filter: 'none',
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddShape = (shape: (typeof PRESET_SHAPES)[0]) => {
    addElement({
      type: 'shape',
      content: shape.path,
      x: 100,
      y: 100,
      width: 140,
      height: 140,
      rotation: 0,
      color: textColor,
      opacity: 1,
      filter: 'none',
    });
  };

  const handleAddClipart = (clip: (typeof PRESET_CLIPARTS)[0]) => {
    addElement({
      type: 'clipart',
      content: clip.svg,
      x: 100,
      y: 100,
      width: 140,
      height: 140,
      rotation: 0,
      color: textColor,
      opacity: 1,
      filter: 'none',
    });
  };

  const handleMouseDown = (e: React.MouseEvent, el: CanvasElement) => {
    if (el.isLocked) return;
    e.stopPropagation();
    setSelectedElementId(el.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ x: el.x, y: el.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElementId) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    updateElement(selectedElementId, {
      x: Math.max(-50, Math.min(350, elementStart.x + dx)),
      y: Math.max(-50, Math.min(450, elementStart.y + dy)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getFilterCss = (filter?: string) => {
    switch (filter) {
      case 'grayscale': return 'grayscale(100%)';
      case 'sepia': return 'sepia(100%)';
      case 'vintage': return 'contrast(120%) sepia(40%) hue-rotate(-20deg)';
      case 'contrast': return 'contrast(180%)';
      case 'blur': return 'blur(2px)';
      default: return 'none';
    }
  };

  const generateCustomizedPreviewImage = async (): Promise<string> => {
    try {
      const transparentGarmentImg = 'http://localhost:5000/uploads/pod_assets/photo_tshirt_base_front.png';
      const transparentMaskImg = 'http://localhost:5000/uploads/pod_assets/photo_tshirt_mask_front.png';
      const currentViewElements = (sides && sides[activeSide]?.elements) || [];

      const textElementsSvg = currentViewElements
        .filter((el: any) => el.type === 'text')
        .map((el: any) => `<text x="${el.x || 50}" y="${(el.y || 50) + 24}" fill="${el.color || '#111827'}" font-size="${el.fontSize || 24}" font-family="Inter, sans-serif" font-weight="bold">${el.content || ''}</text>`)
        .join('\n');

      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
        <rect width="500" height="500" fill="#F8FAFC"/>
        <image href="${transparentGarmentImg}" width="500" height="500" preserveAspectRatio="xMidYMid meet"/>
        ${productColor !== '#FFFFFF' ? `<rect width="500" height="500" fill="${productColor}" opacity="0.85" style="mask-image: url(${transparentMaskImg}); -webkit-mask-image: url(${transparentMaskImg}); mask-size: contain; -webkit-mask-size: contain; mix-blend-mode: multiply;"/>` : ''}
        ${textElementsSvg}
      </svg>`;

      return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
    } catch {
      return getProductImage(product);
    }
  };

  const handleAddToCart = async () => {
    const previewImage = await generateCustomizedPreviewImage();
    const colorObj = PRESET_GARMENT_COLORS.find((c) => c.hex.toUpperCase() === productColor.toUpperCase());
    const productColorName = colorObj ? colorObj.name : 'Custom Color';

    const customizedItem = {
      productId: product?.id || 1,
      name: `${product?.name || 'Lumise POD Item'} (${productColorName})`,
      price: Number(product?.price || 0),
      image: previewImage,
      customization: {
        productColor,
        productColorName,
        sizeQty,
        sides,
        previewImage,
        createdAt: new Date().toISOString(),
      },
    };
    onAddToCartCustomized(customizedItem);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="xl" fullWidth PaperProps={{ sx: { height: '96vh', borderRadius: 2, overflow: 'hidden' } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#0D9488' }}>
        
        {/* 1. TOP LUMISE TEAL HEADER BAR */}
        <Box sx={{ height: 52, px: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 0.6, bgcolor: '#FFFFFF', borderRadius: 1.5, display: 'flex', color: '#0D9488' }}>
              <Shirt size={20} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: '1.1rem' }}>
              Lumise POD Engine — <span style={{ fontWeight: 500, opacity: 0.9 }}>{product?.name}</span>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title="Undo">
              <span>
                <IconButton disabled={!canUndo} onClick={undo} sx={{ color: '#FFF' }}>
                  <Undo size={18} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Redo">
              <span>
                <IconButton disabled={!canRedo} onClick={redo} sx={{ color: '#FFF' }}>
                  <Redo size={18} />
                </IconButton>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              onClick={handleAddToCart}
              sx={{ bgcolor: '#FFFFFF', color: '#0D9488', fontWeight: 800, px: 3, py: 0.8, borderRadius: 2, '&:hover': { bgcolor: '#F0FDFA' } }}
            >
              🛒 Save & Add to Cart
            </Button>
            <IconButton onClick={onClose} sx={{ color: '#FFF' }}>
              <X size={22} />
            </IconButton>
          </Box>
        </Box>

        {/* 2. MAIN THREE-COLUMN WORKSPACE */}
        <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', bgcolor: '#F8FAFC' }}>
          
          {/* LEFT ICON SIDEBAR (LUMISE TOOLKIT NAV) */}
          <Paper square elevation={0} sx={{ width: 72, bgcolor: '#0F172A', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, gap: 2, borderRight: '1px solid #1E293B', zIndex: 10 }}>
            {[
              { id: 'product', label: 'Product', icon: Shirt },
              { id: 'images', label: 'Images', icon: ImageIcon },
              { id: 'text', label: 'Text', icon: TypeIcon },
              { id: 'shapes', label: 'Shapes', icon: Shapes },
              { id: 'cliparts', label: 'Cliparts', icon: Smile },
              { id: 'layers', label: 'Layers', icon: LayersIcon },
            ].map((nav) => {
              const IconComp = nav.icon;
              const isActive = activeNav === nav.id;
              return (
                <Box
                  key={nav.id}
                  onClick={() => setActiveNav(nav.id as any)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justify: 'center',
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    cursor: 'pointer',
                    bgcolor: isActive ? '#0D9488' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#94A3B8',
                    transition: 'all 0.2s ease',
                    '&:hover': { bgcolor: isActive ? '#0D9488' : '#1E293B', color: '#FFFFFF' },
                  }}
                >
                  <IconComp size={20} />
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 700, mt: 0.5 }}>
                    {nav.label}
                  </Typography>
                </Box>
              );
            })}
          </Paper>

          {/* SECONDARY TOOL PANELS */}
          <Paper square elevation={0} sx={{ width: 310, bgcolor: '#1E293B', color: '#F8FAFC', p: 2.5, overflowY: 'auto', borderRight: '1px solid #334155' }}>
            
            {/* NAV 1: PRODUCT GARMENT CONFIGURATOR */}
            {activeNav === 'product' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', fontSize: '0.75rem', mb: 1.5 }}>
                    Garment Colors
                  </Typography>
                  <Grid container spacing={1.2}>
                    {PRESET_GARMENT_COLORS.map((clr) => (
                      <Grid key={clr.hex} item xs={3}>
                        <Box
                          onClick={() => setProductColor(clr.hex)}
                          sx={{
                            width: '100%',
                            height: 38,
                            borderRadius: 2,
                            bgcolor: clr.hex,
                            border: productColor === clr.hex ? '3px solid #0D9488' : '1px solid #475569',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            '&:hover': { transform: 'scale(1.08)' },
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                <Divider sx={{ bgcolor: '#334155' }} />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#94A3B8', mb: 1.5 }}>
                    Quantity & Sizes
                  </Typography>
                  <Grid container spacing={1.5}>
                    {(['S', 'M', 'L', 'XL'] as const).map((sz) => (
                      <Grid key={sz} item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={sizeQty[sz]}
                            onChange={(e) => setSizeQty({ ...sizeQty, [sz]: Math.max(0, parseInt(e.target.value) || 0) })}
                            sx={{ width: 60, bgcolor: '#0F172A', borderRadius: 1, input: { color: '#FFF', textAlign: 'center', p: 1 } }}
                          />
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#94A3B8' }}>{sz}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>
            )}

            {/* NAV 2: IMAGES UPLOAD TOOL */}
            {activeNav === 'images' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#FFF' }}>
                  Upload Custom Artwork
                </Typography>
                <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Upload size={18} />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ py: 1.5, fontWeight: 800, borderRadius: 2, bgcolor: '#0D9488', '&:hover': { bgcolor: '#0F766E' } }}
                >
                  📁 Upload Device Image
                </Button>

                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mt: 1 }}>
                  Preset Sample Artworks:
                </Typography>
                <Grid container spacing={1}>
                  {PRESET_SAMPLE_ARTWORKS.map((art) => (
                    <Grid key={art.name} item xs={6}>
                      <Paper
                        onClick={() => addElement({ type: 'image', content: art.url, x: 80, y: 80, width: 180, height: 180, rotation: 0, color: '#ffffff', opacity: 1, filter: 'none' })}
                        sx={{ p: 1, bgcolor: '#0F172A', border: '1px solid #334155', cursor: 'pointer', borderRadius: 2, '&:hover': { border: '1px solid #0D9488' } }}
                      >
                        <Box component="img" src={art.url} sx={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 1 }} />
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#FFF', display: 'block', mt: 0.5, textAlign: 'center' }}>
                          {art.name}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* NAV 3: TEXT TYPOGRAPHY TOOL */}
            {activeNav === 'text' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#FFF' }}>Add Custom Typography</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  sx={{ bgcolor: '#0F172A', borderRadius: 1, textarea: { color: '#FFF' } }}
                />

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700 }}>Font Size</Typography>
                    <Slider value={fontSize} min={12} max={72} onChange={(_, v) => setFontSize(v as number)} sx={{ color: '#0D9488' }} />
                  </Box>
                  <Box sx={{ width: 45, height: 38, bgcolor: textColor, borderRadius: 1.5, border: '2px solid #FFF', cursor: 'pointer', mt: 2 }} />
                </Box>

                <Button variant="contained" onClick={handleAddText} sx={{ py: 1.2, fontWeight: 800, borderRadius: 2, bgcolor: '#0D9488', '&:hover': { bgcolor: '#0F766E' } }}>
                  ➕ Add Text to {activeSide.toUpperCase()}
                </Button>
              </Box>
            )}

            {/* NAV 4: SHAPES TOOL */}
            {activeNav === 'shapes' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#FFF' }}>Add Geometric Shapes</Typography>
                <Grid container spacing={1}>
                  {PRESET_SHAPES.map((shp) => (
                    <Grid key={shp.name} item xs={4}>
                      <Paper
                        onClick={() => handleAddShape(shp)}
                        sx={{ p: 1.5, bgcolor: '#0F172A', border: '1px solid #334155', borderRadius: 2, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', '&:hover': { border: '1px solid #0D9488' } }}
                      >
                        <svg width="36" height="36" viewBox="0 0 100 100">
                          <path d={shp.path} fill={textColor} />
                        </svg>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#FFF', mt: 0.5 }}>{shp.name}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* NAV 5: CLIPARTS TOOL */}
            {activeNav === 'cliparts' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#FFF' }}>Add Clipart Badges</Typography>
                <Grid container spacing={1}>
                  {PRESET_CLIPARTS.map((clip) => (
                    <Grid key={clip.name} item xs={4}>
                      <Paper
                        onClick={() => handleAddClipart(clip)}
                        sx={{ p: 1.5, bgcolor: '#0F172A', border: '1px solid #334155', borderRadius: 2, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', '&:hover': { border: '1px solid #0D9488' } }}
                      >
                        <svg width="36" height="36" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: clip.svg }} style={{ color: textColor }} />
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#FFF', mt: 0.5 }}>{clip.name}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* NAV 6: LAYERS MANAGER */}
            {activeNav === 'layers' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#FFF' }}>
                  {activeSide.toUpperCase()} Canvas Layers ({currentElements.length})
                </Typography>
                {currentElements.length === 0 ? (
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>No design elements on this view.</Typography>
                ) : (
                  currentElements.map((el: any, idx: number) => (
                    <Paper
                      key={el.id}
                      onClick={() => setSelectedElementId(el.id)}
                      sx={{ p: 1.2, bgcolor: el.id === selectedElementId ? '#0D9488' : '#0F172A', color: '#FFF', borderRadius: 2, border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>
                        {idx + 1}. {el.type.toUpperCase()} ({el.content.substring(0, 10)})
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); moveElementLayer(el.id, 'up'); }} sx={{ color: '#FFF' }}>
                          <ChevronUp size={14} />
                        </IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} sx={{ color: '#F87171' }}>
                          <Trash2 size={14} />
                        </IconButton>
                      </Box>
                    </Paper>
                  ))
                )}
              </Box>
            )}
          </Paper>

          {/* CENTER CANVAS STAGE */}
          <Box
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            sx={{ flexGrow: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4, bgcolor: '#F1F5F9', overflow: 'hidden' }}
          >
            {/* STAGE CONTAINER WITH SEPARATED POD LAYERS */}
            <Paper
              elevation={4}
              sx={{
                width: 480,
                height: 560,
                bgcolor: '#FFFFFF',
                borderRadius: 4,
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #CBD5E1',
                transform: `scale(${zoomLevel / 100})`,
                transition: 'transform 0.1s ease',
              }}
            >
              {/* RENDER LUMISE POD TEMPLATE STACK OR STANDARD PHOTO FALLBACK */}
              {(() => {
                const currentView = podBundle?.views?.find((v: any) => v.viewName?.toLowerCase() === activeSide.toLowerCase()) || podBundle?.views?.[0];
                const layers = currentView?.layers || [];
                const sortedLayers = [...layers].sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

                if (sortedLayers.length > 0) {
                  return sortedLayers.map((lyr: any, idx: number) => {
                    // MASK LAYER (GARMENT RECOLORING OVERLAY)
                    if (lyr.layerType === 'mask') {
                      if (productColor === '#FFFFFF') return null;
                      return (
                        <Box
                          key={lyr.id || idx}
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            bgcolor: productColor,
                            maskImage: `url(${lyr.assetUrl})`,
                            WebkitMaskImage: `url(${lyr.assetUrl})`,
                            maskSize: 'contain',
                            WebkitMaskSize: 'contain',
                            maskPosition: 'center',
                            WebkitMaskPosition: 'center',
                            maskRepeat: 'no-repeat',
                            WebkitMaskRepeat: 'no-repeat',
                            mixBlendMode: 'multiply',
                            opacity: 0.9,
                            zIndex: 2,
                            pointerEvents: 'none',
                            transition: 'background-color 0.25s ease',
                          }}
                        />
                      );
                    }

                    // BASE MOCKUP, SHADOW, HIGHLIGHT, TEXTURE LAYERS
                    return (
                      <Box
                        key={lyr.id || idx}
                        component="img"
                        src={lyr.assetUrl}
                        alt={lyr.layerType}
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          pointerEvents: 'none',
                          mixBlendMode: lyr.blendMode || 'normal',
                          opacity: lyr.opacity ?? 1,
                          zIndex: lyr.layerType === 'base_mockup' ? 1 : 3,
                        }}
                      />
                    );
                  });
                }

                // Standard Fallback when no template is configured
                return (
                  <Box
                    component="img"
                    src={getProductImage(product)}
                    alt={product?.name || 'Selected Product Image'}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  />
                );
              })()}

              {/* RENDER INTERACTIVE CANVAS DESIGN ELEMENTS */}
              {currentElements.map((el: any) => {
                const isSelected = el.id === selectedElementId;
                const filterCss = getFilterCss(el.filter);

                return (
                  <Box
                    key={el.id}
                    onMouseDown={(e) => handleMouseDown(e, el)}
                    sx={{
                      position: 'absolute',
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      transform: `rotate(${el.rotation || 0}deg)`,
                      opacity: el.opacity ?? 1,
                      filter: filterCss,
                      border: isSelected ? '2px solid #0D9488' : '1px dashed transparent',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: el.isLocked ? 'not-allowed' : 'move',
                      p: 1,
                      zIndex: 10,
                      userSelect: 'none',
                    }}
                  >
                    {/* TEXT ELEMENT */}
                    {el.type === 'text' && (
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 800,
                          color: el.color,
                          fontSize: el.fontSize || 28,
                          fontFamily: el.fontFamily || 'Inter',
                          textAlign: 'center',
                          wordBreak: 'break-word',
                        }}
                      >
                        {el.content}
                      </Typography>
                    )}

                    {/* IMAGE ELEMENT */}
                    {el.type === 'image' && (
                      <Box component="img" src={el.content} alt="Artwork" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    )}

                    {/* SHAPE ELEMENT */}
                    {el.type === 'shape' && (
                      <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
                        <path d={el.content} fill={el.color} />
                      </svg>
                    )}

                    {/* CLIPART ELEMENT */}
                    {el.type === 'clipart' && (
                      <svg width="100%" height="100%" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: el.content }} style={{ color: el.color }} />
                    )}
                  </Box>
                );
              })}
            </Paper>

            {/* LIVE FLOATING PROPERTY CONTROL TOOLBAR FOR SELECTED ELEMENT */}
            {selectedEl && (
              <Paper
                elevation={6}
                sx={{
                  position: 'absolute',
                  bottom: 24,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  px: 2.5,
                  py: 1.2,
                  bgcolor: '#0F172A',
                  color: '#FFF',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  zIndex: 30,
                  border: '1px solid #334155',
                }}
              >
                {/* COLOR PICKER (FOR TEXT/SHAPE/CLIPART) */}
                {(selectedEl.type === 'text' || selectedEl.type === 'shape' || selectedEl.type === 'clipart') && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#94A3B8' }}>Color:</Typography>
                    <input
                      type="color"
                      value={selectedEl.color || '#111827'}
                      onChange={(e) => updateElement(selectedEl.id, { color: e.target.value })}
                      style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    />
                  </Box>
                )}

                {/* ROTATION SLIDER */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 110 }}>
                  <RotateCw size={14} color="#94A3B8" />
                  <Slider
                    size="small"
                    value={selectedEl.rotation || 0}
                    min={0}
                    max={360}
                    onChange={(_, v) => updateElement(selectedEl.id, { rotation: v as number })}
                    sx={{ color: '#0D9488' }}
                  />
                </Box>

                {/* OPACITY SLIDER */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 100 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#94A3B8' }}>Opacity:</Typography>
                  <Slider
                    size="small"
                    value={Math.round((selectedEl.opacity ?? 1) * 100)}
                    min={10}
                    max={100}
                    onChange={(_, v) => updateElement(selectedEl.id, { opacity: (v as number) / 100 })}
                    sx={{ color: '#0D9488' }}
                  />
                </Box>

                {/* IMAGE FILTERS */}
                {selectedEl.type === 'image' && (
                  <Select
                    size="small"
                    value={selectedEl.filter || 'none'}
                    onChange={(e) => updateElement(selectedEl.id, { filter: e.target.value as any })}
                    sx={{ bgcolor: '#1E293B', color: '#FFF', height: 32, fontSize: '0.75rem', borderRadius: 1 }}
                  >
                    <MenuItem value="none">Normal</MenuItem>
                    <MenuItem value="grayscale">Grayscale</MenuItem>
                    <MenuItem value="sepia">Sepia</MenuItem>
                    <MenuItem value="vintage">Vintage</MenuItem>
                    <MenuItem value="contrast">Contrast</MenuItem>
                    <MenuItem value="blur">Blur</MenuItem>
                  </Select>
                )}

                {/* ACTION BUTTONS */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Tooltip title="Duplicate">
                    <IconButton size="small" onClick={() => duplicateElement(selectedEl.id)} sx={{ color: '#FFF' }}>
                      <Copy size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Lock Element">
                    <IconButton size="small" onClick={() => updateElement(selectedEl.id, { isLocked: !selectedEl.isLocked })} sx={{ color: selectedEl.isLocked ? '#F59E0B' : '#FFF' }}>
                      {selectedEl.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => deleteElement(selectedEl.id)} sx={{ color: '#F87171' }}>
                      <Trash2 size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            )}

            {/* FAR RIGHT VIEW SWITCHER THUMBNAILS (LUMISE STYLE) */}
            <Paper
              elevation={2}
              sx={{
                position: 'absolute',
                right: 24,
                top: '50%',
                transform: 'translateY(-50%)',
                p: 1,
                bgcolor: '#FFFFFF',
                borderRadius: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                border: '1px solid #E5E7EB',
              }}
            >
              {(['front', 'back', 'left', 'right'] as const).map((side) => (
                <Box
                  key={side}
                  onClick={() => { setActiveSide(side); setSelectedElementId(null); }}
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2,
                    border: activeSide === side ? '2px solid #0D9488' : '1px solid #E5E7EB',
                    bgcolor: activeSide === side ? '#F0FDFA' : '#F9FAFB',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justify: 'center',
                    transition: 'all 0.15s ease',
                    '&:hover': { border: '2px solid #0D9488' },
                  }}
                >
                  <Shirt size={22} color={activeSide === side ? '#0D9488' : '#64748B'} />
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 800, color: activeSide === side ? '#0D9488' : '#64748B', textTransform: 'capitalize' }}>
                    {side}
                  </Typography>
                </Box>
              ))}
            </Paper>

            {/* BOTTOM RIGHT ZOOM CONTROLS */}
            <Paper
              elevation={2}
              sx={{
                position: 'absolute',
                bottom: 24,
                right: 24,
                p: 0.5,
                bgcolor: '#FFFFFF',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                border: '1px solid #E5E7EB',
              }}
            >
              <IconButton size="small" onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}>
                <ZoomOut size={16} />
              </IconButton>
              <Typography variant="caption" sx={{ fontWeight: 800, minWidth: 35, textAlign: 'center' }}>
                {zoomLevel}%
              </Typography>
              <IconButton size="small" onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}>
                <ZoomIn size={16} />
              </IconButton>
              <IconButton size="small" onClick={() => setZoomLevel(100)}>
                <Maximize2 size={16} />
              </IconButton>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};
