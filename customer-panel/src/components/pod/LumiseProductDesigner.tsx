/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import {
  ArrowLeft,
  Info,
  Undo2,
  Redo2,
  Maximize2,
  Upload,
  Type,
  Folder,
  Shapes,
  LayoutGrid,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Bold,
  Italic,
  Underline,
  MoveUp,
  MoveDown,
  Square,
  Circle,
  Star,
  Heart,
  ArrowRight,
  X,
  Coffee,
  Shirt,
  Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice } from '../../utils/currencyService';
import { SMART_POD_TEMPLATES, SmartPodTemplate } from './smartTemplates';

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  isLocked: boolean;
  isHidden: boolean;
  flipX?: boolean;
  flipY?: boolean;
  // Visual styling
  filter?: string;
  border?: string;
  borderRadius?: number;
  boxShadow?: string;
  // Text specific
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
  // Image specific
  imageUrl?: string;
  // Shape specific
  shapeType?: 'rectangle' | 'circle' | 'star' | 'heart' | 'arrow';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

interface LumiseProductDesignerProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onAddToCartCustomized: (customizedItem: any) => void;
}

// SAFE PRINT BOUNDS PER PRODUCT TYPE
const PRINT_BOUNDS_MAP = {
  't-shirts': {
    minX: 135,
    minY: 105,
    maxX: 345,
    maxY: 395,
    width: 210,
    height: 290,
    label: 'Chest Print Area (4500 × 5091 px)',
  },
  'phone-covers': {
    minX: 120,
    minY: 45,
    maxX: 340,
    maxY: 415,
    width: 220,
    height: 370,
    label: 'Back Cover Print Area (2400 × 4200 px)',
  },
  'coffee-mugs': {
    minX: 130,
    minY: 130,
    maxX: 330,
    maxY: 350,
    width: 200,
    height: 220,
    label: 'Wrap Print Area (2475 × 1155 px)',
  },
};

const GARMENT_COLORS = [
  { name: 'Pure White', hex: '#FFFFFF', border: '#D1D5DB' },
  { name: 'Asphalt Dark', hex: '#374151', border: '#1F2937' },
  { name: 'Midnight Black', hex: '#111827', border: '#030712' },
  { name: 'Navy Blue', hex: '#1E3A8A', border: '#172554' },
  { name: 'Heather Grey', hex: '#9CA3AF', border: '#6B7280' },
  { name: 'Crimson Red', hex: '#DC2626', border: '#991B1B' },
  { name: 'Forest Green', hex: '#15803D', border: '#166534' },
  { name: 'Pastel Sand', hex: '#F3E8D6', border: '#D7C7A9' },
];

const MUG_COLORS = [
  { name: 'Classic Glossy White', hex: '#FFFFFF', border: '#D1D5DB' },
  { name: 'Midnight Black Ceramic', hex: '#111827', border: '#030712' },
  { name: 'Cobalt Blue', hex: '#1E40AF', border: '#1E3A8A' },
  { name: 'Crimson Red', hex: '#DC2626', border: '#991B1B' },
  { name: 'Emerald Green', hex: '#047857', border: '#065F46' },
  { name: 'Pastel Pink', hex: '#F472B6', border: '#EC4899' },
  { name: 'Golden Honey', hex: '#F59E0B', border: '#D97706' },
];

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

const PHONE_MODELS = [
  'iPhone 15 Pro Max',
  'iPhone 15 Pro',
  'iPhone 15',
  'iPhone 14 Pro',
  'Samsung Galaxy S24 Ultra',
  'Samsung Galaxy S24',
  'Google Pixel 8 Pro',
  'OnePlus 12',
];

const MUG_VARIANTS = [
  '11 oz Standard Ceramic Mug',
  '15 oz Large Ceramic Mug',
  '12 oz Ceramic Latte Mug',
  '11 oz Magic Color-Changing Mug',
  '14 oz Stainless Steel Travel Mug',
];

const FONTS = [
  { name: 'Inter', family: 'Inter, sans-serif' },
  { name: 'Montserrat', family: 'Montserrat, sans-serif' },
  { name: 'Poppins', family: 'Poppins, sans-serif' },
  { name: 'Playfair Display', family: 'Playfair Display, serif' },
  { name: 'Bebas Neue', family: 'Bebas Neue, sans-serif' },
  { name: 'Oswald', family: 'Oswald, sans-serif' },
  { name: 'Pacifico', family: 'Pacifico, cursive' },
  { name: 'Dancing Script', family: 'Dancing Script, cursive' },
  { name: 'Orbitron', family: 'Orbitron, sans-serif' },
  { name: 'Roboto', family: 'Roboto, sans-serif' },
];

const COLOR_PALETTE = [
  '#FFFFFF', '#111827', '#EF4444', '#F59E0B', '#10B981',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#06B6D4',
  '#F97316', '#64748B', '#D97706',
];

export const LumiseProductDesigner: React.FC<LumiseProductDesignerProps> = ({
  isOpen,
  onClose,
  product,
  onAddToCartCustomized,
}) => {
  // DYNAMIC PRODUCT TYPE DETECTION (Apparel vs Phone Cover vs Ceramic Coffee Mug)
  const productName = (product?.name || '').toLowerCase();
  const productCategory = (product?.category || '').toLowerCase();
  const productSku = (product?.sku || '').toLowerCase();

  const isMugProduct =
    productCategory.includes('mug') ||
    productCategory.includes('cup') ||
    productCategory.includes('coffee') ||
    productName.includes('mug') ||
    productName.includes('cup') ||
    productName.includes('coffee') ||
    productSku.includes('mug');

  const isPhoneProduct =
    !isMugProduct &&
    (productCategory.includes('phone') ||
      productCategory.includes('cover') ||
      productCategory.includes('case') ||
      productName.includes('phone') ||
      productName.includes('cover') ||
      productName.includes('case') ||
      productSku.includes('phone') ||
      productSku.includes('phn'));

  const detectedCategory: 't-shirts' | 'phone-covers' | 'coffee-mugs' = isMugProduct
    ? 'coffee-mugs'
    : isPhoneProduct
    ? 'phone-covers'
    : 't-shirts';

  const [selectedCategory, setSelectedCategory] = useState<'t-shirts' | 'phone-covers' | 'coffee-mugs'>(detectedCategory);

  // Template Filtering per Product Type
  const categoryTemplates = SMART_POD_TEMPLATES.filter((t) => {
    if (selectedCategory === 'coffee-mugs') {
      return t.category === 'coffee-mugs';
    }
    return t.category === 't-shirts' || t.category === 'both' || t.category === 'phone-covers';
  });

  const activeTemplates = categoryTemplates.length > 0 ? categoryTemplates : SMART_POD_TEMPLATES;

  // Active Tool in Left Sidebar
  const [activeTool, setActiveTool] = useState<'upload' | 'text' | 'templates' | 'shapes' | 'library' | null>('templates');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [showProductInfo, setShowProductInfo] = useState<boolean>(true);

  // Product Selection State
  const defaultColors = selectedCategory === 'coffee-mugs' ? MUG_COLORS : GARMENT_COLORS;
  const [selectedTemplate, setSelectedTemplate] = useState<SmartPodTemplate>(activeTemplates[0] || SMART_POD_TEMPLATES[0]);
  const [selectedColor, setSelectedColor] = useState<any>(defaultColors[0]);
  const [selectedSize, setSelectedSize] = useState<string>(
    selectedCategory === 'coffee-mugs'
      ? MUG_VARIANTS[0]
      : selectedCategory === 't-shirts'
      ? 'L'
      : PHONE_MODELS[0]
  );

  // Multi-Side Support (Front, Back, Handle/Wrap)
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'handle'>('front');

  // Multi-Side Canvas Layers
  const [sideDesigns, setSideDesigns] = useState<{ front: CanvasElement[]; back: CanvasElement[]; handle?: CanvasElement[] }>({
    front: (activeTemplates[0] || SMART_POD_TEMPLATES[0]).defaultLayers.map((l) => ({ ...l, id: `${l.id}-${Date.now()}` })),
    back: [],
    handle: [],
  });

  const currentElements = sideDesigns[activeSide] || [];
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    currentElements[0]?.id || null
  );
  const [history, setHistory] = useState<{ front: CanvasElement[]; back: CanvasElement[]; handle?: CanvasElement[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Uploaded Assets Library
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);
  const [userUploadedImage, setUserUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dragging & Interaction State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragAction, setDragAction] = useState<'move' | 'resize-se' | 'rotate' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState<any>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const printBounds = PRINT_BOUNDS_MAP[selectedCategory] || PRINT_BOUNDS_MAP['t-shirts'];

  // Save state to History for Undo / Redo
  const saveStateToHistory = (newSides: { front: CanvasElement[]; back: CanvasElement[]; handle?: CanvasElement[] }) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    setHistory([...updatedHistory, newSides]);
    setHistoryIndex(updatedHistory.length);
  };

  const updateCurrentElements = (newElements: CanvasElement[]) => {
    const updatedSides = {
      ...sideDesigns,
      [activeSide]: newElements,
    };
    setSideDesigns(updatedSides);
    saveStateToHistory(updatedSides);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSideDesigns(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSideDesigns(history[historyIndex + 1]);
    }
  };

  // Sync Category Change on Product Change
  useEffect(() => {
    setSelectedCategory(detectedCategory);
    const tmpls = SMART_POD_TEMPLATES.filter((t) => {
      if (detectedCategory === 'coffee-mugs') return t.category === 'coffee-mugs';
      return t.category === 't-shirts' || t.category === 'both' || t.category === 'phone-covers';
    });

    const initialTmpl = tmpls[0] || SMART_POD_TEMPLATES[0];
    setSelectedTemplate(initialTmpl);

    if (detectedCategory === 'coffee-mugs') {
      setSelectedColor(MUG_COLORS[0]);
      setSelectedSize(MUG_VARIANTS[0]);
    } else if (detectedCategory === 't-shirts') {
      setSelectedColor(GARMENT_COLORS[1]);
      setSelectedSize('L');
    } else {
      setSelectedColor(GARMENT_COLORS[1]);
      setSelectedSize(PHONE_MODELS[0]);
    }

    const defaultLayers = initialTmpl.defaultLayers.map((l) => ({
      ...l,
      id: `${l.id}-${Date.now()}`,
      imageUrl: userUploadedImage || '',
    }));

    const newSides = { front: defaultLayers, back: [], handle: [] };
    setSideDesigns(newSides);
    setSelectedElementId(defaultLayers[0]?.id || null);
    saveStateToHistory(newSides);
  }, [product, detectedCategory]);

  const selectedElement = currentElements.find((el) => el.id === selectedElementId);

  // Update selected element property
  const updateSelectedElement = (props: Partial<CanvasElement>) => {
    if (!selectedElementId) return;
    const updated = currentElements.map((el) => {
      if (el.id === selectedElementId) {
        return { ...el, ...props };
      }
      return el;
    });
    updateCurrentElements(updated);
  };

  // Add Text Layer to Canvas
  const handleAddText = (styleType: 'heading' | 'subheading' | 'body') => {
    const newId = `text-${Date.now()}`;
    const defaultText = selectedCategory === 'coffee-mugs' ? 'BUT FIRST, COFFEE' : 'TAKE IT EASY';
    const newElement: CanvasElement = {
      id: newId,
      type: 'text',
      name: styleType === 'heading' ? 'Headline Text' : styleType === 'subheading' ? 'Subheading' : 'Body Text',
      text: styleType === 'heading' ? defaultText : styleType === 'subheading' ? 'Classic Edition' : 'Custom text here...',
      fontFamily: styleType === 'heading' ? 'Bebas Neue' : 'Montserrat',
      fontSize: styleType === 'heading' ? 32 : styleType === 'subheading' ? 20 : 14,
      color: selectedColor.hex === '#FFFFFF' ? '#111827' : '#FFFFFF',
      fontWeight: styleType === 'heading' ? 'bold' : 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      letterSpacing: styleType === 'heading' ? 2 : 0.5,
      x: 150,
      y: 170 + currentElements.length * 15,
      width: 180,
      height: 40,
      rotation: 0,
      opacity: 1,
      isLocked: false,
      isHidden: false,
    };
    const updated = [...currentElements, newElement];
    updateCurrentElements(updated);
    setSelectedElementId(newId);
    toast.success('Text added to design!');
  };

  // Add Shape Layer to Canvas
  const handleAddShape = (shapeType: 'rectangle' | 'circle' | 'star' | 'heart' | 'arrow') => {
    const newId = `shape-${Date.now()}`;
    const newElement: CanvasElement = {
      id: newId,
      type: 'shape',
      shapeType,
      name: `${shapeType.toUpperCase()} Vector`,
      fillColor: '#FFFFFF',
      strokeColor: '#374151',
      strokeWidth: 2,
      x: 180,
      y: 190,
      width: 90,
      height: 90,
      rotation: 0,
      opacity: 1,
      isLocked: false,
      isHidden: false,
    };
    const updated = [...currentElements, newElement];
    updateCurrentElements(updated);
    setSelectedElementId(newId);
    toast.success(`${shapeType} shape added!`);
  };

  // SMART TEMPLATE AUTO-SNAP ON IMAGE UPLOAD
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast.error('Only image files (PNG, JPG, JPEG, WEBP, SVG) are allowed.');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Maximum upload size is 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setUserUploadedImage(dataUrl);
      setUploadedAssets((prev) => [dataUrl, ...prev]);

      // Smart Template Image Placeholder Auto-Snap
      const ph = selectedTemplate.imagePlaceholder;
      const existingImgIndex = currentElements.findIndex((el) => el.type === 'image');

      if (existingImgIndex !== -1) {
        const updated = [...currentElements];
        updated[existingImgIndex] = {
          ...updated[existingImgIndex],
          imageUrl: dataUrl,
          x: ph.x,
          y: ph.y,
          width: ph.width,
          height: ph.height,
          filter: ph.filter || 'none',
          border: ph.border || 'none',
          borderRadius: ph.borderRadius || 0,
          boxShadow: ph.boxShadow || 'none',
        };
        updateCurrentElements(updated);
        setSelectedElementId(updated[existingImgIndex].id);
      } else {
        const newId = `img-${Date.now()}`;
        const newElement: CanvasElement = {
          id: newId,
          type: 'image',
          name: 'Custom Artwork',
          imageUrl: dataUrl,
          x: ph.x,
          y: ph.y,
          width: ph.width,
          height: ph.height,
          rotation: 0,
          opacity: 1,
          isLocked: false,
          isHidden: false,
          filter: ph.filter || 'none',
          border: ph.border || 'none',
          borderRadius: ph.borderRadius || 0,
          boxShadow: ph.boxShadow || 'none',
        };
        const updated = [...currentElements, newElement];
        updateCurrentElements(updated);
        setSelectedElementId(newId);
      }

      toast.success(`🎯 Artwork snapped onto ${selectedCategory === 'coffee-mugs' ? 'Ceramic Mug' : 'Product'}!`);
    };
    reader.readAsDataURL(file);
  };

  const handleAddAssetToCanvas = (assetUrl: string) => {
    setUserUploadedImage(assetUrl);
    const ph = selectedTemplate.imagePlaceholder;
    const existingImgIndex = currentElements.findIndex((el) => el.type === 'image');

    if (existingImgIndex !== -1) {
      const updated = [...currentElements];
      updated[existingImgIndex] = {
        ...updated[existingImgIndex],
        imageUrl: assetUrl,
        x: ph.x,
        y: ph.y,
        width: ph.width,
        height: ph.height,
      };
      updateCurrentElements(updated);
      setSelectedElementId(updated[existingImgIndex].id);
    } else {
      const newId = `img-${Date.now()}`;
      const newElement: CanvasElement = {
        id: newId,
        type: 'image',
        name: 'Library Graphic',
        imageUrl: assetUrl,
        x: ph.x,
        y: ph.y,
        width: ph.width,
        height: ph.height,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
      };
      const updated = [...currentElements, newElement];
      updateCurrentElements(updated);
      setSelectedElementId(newId);
    }
    toast.success('Graphic applied to canvas!');
  };

  // SMART TEMPLATE SWITCHER (PRESERVES BASE PRODUCT & APPLIES DESIGN PRESETS)
  const handleApplySmartTemplate = (tmpl: SmartPodTemplate) => {
    setSelectedTemplate(tmpl);

    const activePhotoUrl = userUploadedImage || '';
    const isLightProduct = selectedColor.hex === '#FFFFFF' || selectedColor.hex === '#F3E8D6';

    const newLayers: CanvasElement[] = tmpl.defaultLayers.map((layer) => {
      const layerId = `${layer.id}-${Date.now()}`;

      if (layer.type === 'image') {
        return {
          ...layer,
          id: layerId,
          imageUrl: activePhotoUrl,
          x: tmpl.imagePlaceholder.x,
          y: tmpl.imagePlaceholder.y,
          width: tmpl.imagePlaceholder.width,
          height: tmpl.imagePlaceholder.height,
          filter: tmpl.imagePlaceholder.filter || 'none',
          border: tmpl.imagePlaceholder.border || 'none',
          borderRadius: tmpl.imagePlaceholder.borderRadius || 0,
          boxShadow: tmpl.imagePlaceholder.boxShadow || 'none',
        };
      }

      if (layer.type === 'text') {
        const adjustedColor = isLightProduct
          ? layer.color === '#FFFFFF'
            ? '#111827'
            : layer.color
          : layer.color === '#0F172A'
          ? '#FFFFFF'
          : layer.color;
        return {
          ...layer,
          id: layerId,
          color: adjustedColor,
        };
      }

      return {
        ...layer,
        id: layerId,
      };
    });

    updateCurrentElements(newLayers);
    setSelectedElementId(newLayers[0]?.id || null);
    toast.success(`✨ Applied ${tmpl.name} Template!`);
  };

  // Layers Operations
  const handleToggleHideLayer = (id: string) => {
    const updated = currentElements.map((el) => (el.id === id ? { ...el, isHidden: !el.isHidden } : el));
    updateCurrentElements(updated);
  };

  const handleToggleLockLayer = (id: string) => {
    const updated = currentElements.map((el) => (el.id === id ? { ...el, isLocked: !el.isLocked } : el));
    updateCurrentElements(updated);
  };

  const handleDeleteLayer = (id: string) => {
    const target = currentElements.find((el) => el.id === id);
    if (target?.isLocked) {
      toast.error('Cannot delete locked template decoration layers.');
      return;
    }
    const updated = currentElements.filter((el) => el.id !== id);
    updateCurrentElements(updated);
    if (selectedElementId === id) {
      setSelectedElementId(updated.length > 0 ? updated[updated.length - 1].id : null);
    }
    toast.success('Layer removed');
  };

  const handleDuplicateLayer = (id: string) => {
    const el = currentElements.find((e) => e.id === id);
    if (!el) return;
    const duplicated: CanvasElement = {
      ...el,
      id: `copy-${Date.now()}`,
      name: `${el.name} (Copy)`,
      x: Math.min(printBounds.maxX - el.width, el.x + 10),
      y: Math.min(printBounds.maxY - el.height, el.y + 10),
      isLocked: false,
    };
    const updated = [...currentElements, duplicated];
    updateCurrentElements(updated);
    setSelectedElementId(duplicated.id);
    toast.success('Layer duplicated');
  };

  const handleMoveLayerUp = (index: number) => {
    if (index >= currentElements.length - 1) return;
    const newArr = [...currentElements];
    const temp = newArr[index];
    newArr[index] = newArr[index + 1];
    newArr[index + 1] = temp;
    updateCurrentElements(newArr);
  };

  const handleMoveLayerDown = (index: number) => {
    if (index <= 0) return;
    const newArr = [...currentElements];
    const temp = newArr[index];
    newArr[index] = newArr[index - 1];
    newArr[index - 1] = temp;
    updateCurrentElements(newArr);
  };

  // Pointer / Drag / Resize / Rotate with Safe Print Area Clamping
  const handlePointerDown = (e: React.PointerEvent, element: CanvasElement, action: 'move' | 'resize-se' | 'rotate') => {
    if (element.isLocked || element.isHidden || viewMode === 'preview') return;
    e.stopPropagation();
    setSelectedElementId(element.id);
    setIsDragging(true);
    setDragAction(action);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ ...element });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !selectedElementId || !elementStart) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (dragAction === 'move') {
      const clampedX = Math.max(printBounds.minX, Math.min(printBounds.maxX - elementStart.width, elementStart.x + dx));
      const clampedY = Math.max(printBounds.minY, Math.min(printBounds.maxY - elementStart.height, elementStart.y + dy));

      const updated = currentElements.map((el) =>
        el.id === selectedElementId
          ? { ...el, x: clampedX, y: clampedY }
          : el
      );
      setSideDesigns({ ...sideDesigns, [activeSide]: updated });
    } else if (dragAction === 'resize-se') {
      const maxAllowedW = printBounds.maxX - elementStart.x;
      const maxAllowedH = printBounds.maxY - elementStart.y;
      const newW = Math.max(30, Math.min(maxAllowedW, elementStart.width + dx));
      const newH = Math.max(20, Math.min(maxAllowedH, elementStart.height + dy));

      const updated = currentElements.map((el) =>
        el.id === selectedElementId
          ? { ...el, width: newW, height: newH }
          : el
      );
      setSideDesigns({ ...sideDesigns, [activeSide]: updated });
    } else if (dragAction === 'rotate') {
      const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      const updated = currentElements.map((el) =>
        el.id === selectedElementId
          ? { ...el, rotation: (elementStart.rotation + angle) % 360 }
          : el
      );
      setSideDesigns({ ...sideDesigns, [activeSide]: updated });
    }
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragAction(null);
      setElementStart(null);
      saveStateToHistory(sideDesigns);
    }
  };

  // Live Pricing Engine
  const basePrice = Number(
    product?.price || (selectedCategory === 'coffee-mugs' ? 14.99 : selectedCategory === 't-shirts' ? 24.99 : 18.99)
  );
  const hasUploadedArt = sideDesigns.front.some((el) => el.type === 'image') || sideDesigns.back.some((el) => el.type === 'image');
  const hasBackArt = sideDesigns.back.length > 0;
  const templateFee = selectedTemplate?.badge === 'PREMIUM' || selectedTemplate?.badge === 'HOT' ? 2.0 : 0;
  const uploadFee = hasUploadedArt ? 3.0 : 0;
  const backSideFee = hasBackArt ? 3.5 : 0;
  const totalPrice = basePrice + templateFee + uploadFee + backSideFee;

  // Add to Cart / Save Product
  const handleAddToCart = () => {
    const frontTexts = sideDesigns.front.filter((el) => el.type === 'text');
    const frontImages = sideDesigns.front.filter((el) => el.type === 'image');

    const primaryText = frontTexts[0]?.text || '';
    const primaryFont = frontTexts[0]?.fontFamily || selectedTemplate.defaultFont;
    const primaryTextColor = frontTexts[0]?.color || selectedTemplate.defaultTextColor;
    const primaryUploadedImage = frontImages[0]?.imageUrl || null;

    const categoryLabel =
      selectedCategory === 'coffee-mugs'
        ? 'Coffee Mugs'
        : selectedCategory === 't-shirts'
        ? 'T-Shirts'
        : 'Phone Back Covers';

    const defaultThumbnail =
      selectedCategory === 'coffee-mugs'
        ? '/pod/pod_mugs.png'
        : selectedCategory === 't-shirts'
        ? '/pod/pod_tmpl_minimal.png'
        : '/pod/pod_phone_case.png';

    const customizationPayload = {
      productId: product?.id || 1,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      category: categoryLabel,
      color: selectedColor.name,
      colorHex: selectedColor.hex,
      size: selectedSize,
      productColor: selectedColor.name,
      customText: primaryText,
      font: primaryFont,
      textColor: primaryTextColor,
      uploadedImage: primaryUploadedImage,
      previewImage: primaryUploadedImage || selectedTemplate.thumbnailUrl || defaultThumbnail,
      frontDesign: sideDesigns.front,
      backDesign: sideDesigns.back,
      layers: currentElements,
      price: totalPrice,
    };

    onAddToCartCustomized({
      productId: product?.id || 1,
      name: `${product?.name || (selectedCategory === 'coffee-mugs' ? 'Custom Ceramic Mug' : 'Custom Graphic Apparel')} (${selectedTemplate.name} - ${selectedSize})`,
      price: totalPrice,
      customization: customizationPayload,
    });

    toast.success('🎉 Custom Product Saved & Added to Cart!');
    onClose();
  };

  const productIcon =
    selectedCategory === 'coffee-mugs' ? (
      <Coffee size={16} color="#B45309" />
    ) : selectedCategory === 'phone-covers' ? (
      <Smartphone size={16} color="#4338CA" />
    ) : (
      <Shirt size={16} color="#4338CA" />
    );

  const productTypeLabel =
    selectedCategory === 'coffee-mugs'
      ? 'Ceramic Mug Studio'
      : selectedCategory === 'phone-covers'
      ? 'Phone Case Studio'
      : 'T-Shirt Studio';

  return (
    <Dialog
      fullScreen
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: '#F3F4F6',
          color: '#111827',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
        },
      }}
    >
      {/* 1. TOP PRINTIFY/LUMISE NAVBAR */}
      <Box
        sx={{
          height: 56,
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
        }}
      >
        {/* Left: Back Arrow, Info, Undo/Redo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={onClose} sx={{ color: '#374151', '&:hover': { bgcolor: '#F3F4F6' } }}>
            <ArrowLeft size={20} />
          </IconButton>
          <Divider orientation="vertical" flexItem sx={{ my: 1.5, borderColor: '#E5E7EB' }} />
          <Tooltip title="Product Info">
            <IconButton size="small" onClick={() => setShowProductInfo(!showProductInfo)} sx={{ color: '#4B5563' }}>
              <Info size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Undo">
            <span>
              <IconButton size="small" onClick={handleUndo} disabled={historyIndex <= 0} sx={{ color: '#4B5563' }}>
                <Undo2 size={18} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo">
            <span>
              <IconButton size="small" onClick={handleRedo} disabled={historyIndex >= history.length - 1} sx={{ color: '#4B5563' }}>
                <Redo2 size={18} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Center: Title / Breadcrumb with Product Type Badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#111827' }}>
            {product?.name || (selectedCategory === 'coffee-mugs' ? 'Custom Ceramic Coffee Mug (11oz/15oz)' : 'Bella+Canvas 3001 Unisex Tee')}
          </Typography>
          <Chip
            icon={productIcon}
            label={productTypeLabel}
            size="small"
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 700,
              bgcolor: selectedCategory === 'coffee-mugs' ? '#FEF3C7' : '#E0E7FF',
              color: selectedCategory === 'coffee-mugs' ? '#92400E' : '#4338CA',
            }}
          />
        </Box>

        {/* Right: Edit / Preview Switcher */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ bgcolor: '#F3F4F6', p: 0.4, borderRadius: 2, display: 'flex', border: '1px solid #E5E7EB' }}>
            <Button
              size="small"
              onClick={() => setViewMode('edit')}
              sx={{
                py: 0.4,
                px: 2,
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 1.5,
                bgcolor: viewMode === 'edit' ? '#5A6351' : 'transparent',
                color: viewMode === 'edit' ? '#FFFFFF' : '#4B5563',
                '&:hover': { bgcolor: viewMode === 'edit' ? '#4D5445' : '#E5E7EB' },
              }}
            >
              Edit
            </Button>
            <Button
              size="small"
              onClick={() => setViewMode('preview')}
              sx={{
                py: 0.4,
                px: 2,
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 1.5,
                bgcolor: viewMode === 'preview' ? '#5A6351' : 'transparent',
                color: viewMode === 'preview' ? '#FFFFFF' : '#4B5563',
                '&:hover': { bgcolor: viewMode === 'preview' ? '#4D5445' : '#E5E7EB' },
              }}
            >
              Preview
            </Button>
          </Box>

          <IconButton size="small" sx={{ color: '#4B5563' }}>
            <Maximize2 size={18} />
          </IconButton>
        </Box>
      </Box>

      {/* 2. MAIN 3-PANEL STUDIO WORKSPACE */}
      <Box sx={{ display: 'flex', flexGrow: 1, height: 'calc(100vh - 112px)', position: 'relative', overflow: 'hidden' }}>
        
        {/* LEFT CLEAN TOOLBAR STRIP */}
        <Box
          sx={{
            width: 76,
            bgcolor: '#FFFFFF',
            borderRight: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 2,
            gap: 1.2,
            zIndex: 20,
          }}
        >
          {[
            { id: 'upload', label: 'Upload', icon: Upload },
            { id: 'text', label: 'Add text', icon: Type },
            { id: 'templates', label: 'Templates', icon: LayoutGrid },
            { id: 'shapes', label: 'Graphics', icon: Shapes },
            { id: 'library', label: 'My library', icon: Folder },
          ].map((tool) => {
            const IconComp = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <Box
                key={tool.id}
                onClick={() => setActiveTool(activeTool === tool.id ? null : (tool.id as any))}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 60,
                  borderRadius: 2,
                  cursor: 'pointer',
                  bgcolor: isActive ? '#F3F4F6' : 'transparent',
                  color: isActive ? '#111827' : '#6B7280',
                  border: isActive ? '1px solid #D1D5DB' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: '#F9FAFB',
                    color: '#111827',
                  },
                }}
              >
                <IconComp size={20} strokeWidth={2} />
                <Typography sx={{ fontSize: 10, fontWeight: 600, mt: 0.5, textAlign: 'center' }}>
                  {tool.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* LEFT SLIDE-OUT TOOL DRAWER PANEL */}
        {activeTool && (
          <Box
            sx={{
              width: 300,
              bgcolor: '#FFFFFF',
              borderRight: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              p: 2.5,
              zIndex: 15,
              overflowY: 'auto',
              boxShadow: '4px 0 20px rgba(0,0,0,0.03)',
            }}
          >
            {/* TEMPLATES TOOL */}
            {activeTool === 'templates' && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#111827' }}>
                    🎨 {selectedCategory === 'coffee-mugs' ? 'Mug Smart Templates' : 'Smart Templates'}
                  </Typography>
                  <IconButton size="small" onClick={() => setActiveTool(null)}><X size={16} /></IconButton>
                </Box>
                <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 2 }}>
                  {selectedCategory === 'coffee-mugs'
                    ? 'Templates tailored for 360 wrap and ceramic mugs.'
                    : 'Click a template to apply preset typography, graphics, and image layout.'}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                  {activeTemplates.map((tmpl) => {
                    const isSelected = selectedTemplate?.id === tmpl.id;
                    return (
                      <Paper
                        key={tmpl.id}
                        elevation={0}
                        onClick={() => handleApplySmartTemplate(tmpl)}
                        sx={{
                          p: 1.2,
                          borderRadius: 2,
                          cursor: 'pointer',
                          bgcolor: isSelected ? '#EFF6FF' : '#F9FAFB',
                          border: isSelected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                          display: 'flex',
                          gap: 1.2,
                          alignItems: 'center',
                          transition: 'all 0.15s',
                          '&:hover': { borderColor: '#3B82F6' },
                        }}
                      >
                        <Box
                          component="img"
                          src={tmpl.thumbnailUrl}
                          alt={tmpl.name}
                          sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover', bgcolor: '#F3F4F6' }}
                        />
                        <Box sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>
                              {tmpl.name}
                            </Typography>
                            <Chip label={tmpl.badge} size="small" sx={{ height: 16, fontSize: 9, fontWeight: 800, bgcolor: '#DBEAFE', color: '#1E40AF' }} />
                          </Box>
                          <Typography variant="caption" sx={{ color: '#6B7280', fontSize: 11, display: 'block' }}>
                            {tmpl.desc}
                          </Typography>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* UPLOAD TOOL */}
            {activeTool === 'upload' && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#111827' }}>
                    📁 Upload Artwork
                  </Typography>
                  <IconButton size="small" onClick={() => setActiveTool(null)}><X size={16} /></IconButton>
                </Box>
                <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 2 }}>
                  PNG, JPG, SVG • Snaps directly into the {selectedCategory === 'coffee-mugs' ? 'mug wrap area' : 'safe print area'}!
                </Typography>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />

                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Upload size={18} />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    py: 1.2,
                    fontWeight: 700,
                    bgcolor: '#2563EB',
                    borderRadius: 2,
                    textTransform: 'none',
                    mb: 2.5,
                  }}
                >
                  Upload from Device
                </Button>

                <Typography variant="caption" sx={{ fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', mb: 1, display: 'block' }}>
                  Uploaded Assets
                </Typography>
                {uploadedAssets.length === 0 ? (
                  <Typography variant="caption" sx={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                    No uploaded images yet.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    {uploadedAssets.map((asset, i) => (
                      <Box
                        key={i}
                        onClick={() => handleAddAssetToCanvas(asset)}
                        sx={{
                          p: 1,
                          bgcolor: '#F9FAFB',
                          borderRadius: 2,
                          border: '1px solid #E5E7EB',
                          cursor: 'pointer',
                          textAlign: 'center',
                          '&:hover': { borderColor: '#2563EB' },
                        }}
                      >
                        <Box
                          component="img"
                          src={asset}
                          alt="Asset"
                          sx={{ width: '100%', height: 60, objectFit: 'contain' }}
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* TEXT TOOL */}
            {activeTool === 'text' && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#111827' }}>
                    ✍️ Add Text
                  </Typography>
                  <IconButton size="small" onClick={() => setActiveTool(null)}><X size={16} /></IconButton>
                </Box>
                <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 2 }}>
                  Add custom typography and quotes to your {selectedCategory === 'coffee-mugs' ? 'mug' : 'product'}.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => handleAddText('heading')}
                    sx={{
                      justifyContent: 'flex-start',
                      py: 1.2,
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      fontFamily: 'Bebas Neue',
                      color: '#111827',
                      borderColor: '#D1D5DB',
                      textTransform: 'none',
                    }}
                  >
                    + Add Large Headline
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleAddText('subheading')}
                    sx={{
                      justifyContent: 'flex-start',
                      py: 1,
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: '#374151',
                      borderColor: '#D1D5DB',
                      textTransform: 'none',
                    }}
                  >
                    + Add Subheading
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleAddText('body')}
                    sx={{
                      justifyContent: 'flex-start',
                      py: 0.8,
                      fontSize: '0.8rem',
                      color: '#4B5563',
                      borderColor: '#D1D5DB',
                      textTransform: 'none',
                    }}
                  >
                    + Add Body Paragraph
                  </Button>
                </Box>
              </Box>
            )}

            {/* SHAPES & GRAPHICS */}
            {activeTool === 'shapes' && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#111827' }}>
                    🔷 Vector Graphics
                  </Typography>
                  <IconButton size="small" onClick={() => setActiveTool(null)}><X size={16} /></IconButton>
                </Box>
                <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 2 }}>
                  Add vector clipart shapes directly to print area.
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.2 }}>
                  {[
                    { type: 'rectangle', label: 'Rectangle', icon: Square },
                    { type: 'circle', label: 'Circle', icon: Circle },
                    { type: 'star', label: 'Star', icon: Star },
                    { type: 'heart', label: 'Heart', icon: Heart },
                    { type: 'arrow', label: 'Arrow', icon: ArrowRight },
                  ].map((s) => {
                    const IconC = s.icon;
                    return (
                      <Box
                        key={s.type}
                        onClick={() => handleAddShape(s.type as any)}
                        sx={{
                          p: 1.5,
                          bgcolor: '#F9FAFB',
                          borderRadius: 2,
                          border: '1px solid #E5E7EB',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 0.8,
                          '&:hover': { borderColor: '#2563EB' },
                        }}
                      >
                        <IconC size={24} color="#374151" />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151' }}>
                          {s.label}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* MY LIBRARY */}
            {activeTool === 'library' && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#111827' }}>
                    📂 Design Library
                  </Typography>
                  <IconButton size="small" onClick={() => setActiveTool(null)}><X size={16} /></IconButton>
                </Box>
                <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 2 }}>
                  Saved graphics and previous uploads.
                </Typography>
                <Typography variant="caption" sx={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                  {uploadedAssets.length} saved items ready to place.
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* LEFT FLOATING PRODUCT INFO CARD (COLLAPSIBLE) */}
        {showProductInfo && (
          <Paper
            elevation={2}
            sx={{
              position: 'absolute',
              top: 20,
              left: activeTool ? 390 : 96,
              width: 280,
              bgcolor: '#FFFFFF',
              borderRadius: 3,
              p: 2,
              zIndex: 10,
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#111827', fontSize: 12 }}>
                Important product information
              </Typography>
              <IconButton size="small" onClick={() => setShowProductInfo(false)} sx={{ p: 0.2 }}>
                <X size={14} />
              </IconButton>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#111827', mb: 1 }}>
              {product?.name || (selectedCategory === 'coffee-mugs' ? 'Custom Ceramic Coffee Mug (11oz/15oz)' : 'Bella+Canvas - 3001 Unisex Tee')}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1.5 }}>
              <Box
                component="img"
                src={selectedCategory === 'coffee-mugs' ? '/pod/pod_mugs.png' : '/pod/pod_tmpl_minimal.png'}
                alt="Product"
                sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'contain', bgcolor: '#F3F4F6' }}
              />
              <Box>
                <Typography variant="caption" sx={{ color: '#4B5563', display: 'block', fontSize: 11 }}>
                  Fulfilled by Comzilo POD Network
                </Typography>
                <Typography variant="caption" sx={{ color: '#16A34A', fontWeight: 700, fontSize: 11 }}>
                  Ceramic In-Stock • Dishwasher Safe
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 1, borderColor: '#F3F4F6' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>Production price:</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#111827' }}>{formatPrice(totalPrice)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>Print area size:</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#6B7280' }}>
                {selectedCategory === 'coffee-mugs' ? '2475 × 1155 px (Wrap)' : '4500 × 5091 px'}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* CENTER CLEAN CANVAS WORKSPACE */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#F4F4F2',
            position: 'relative',
            overflow: 'hidden',
            p: 4,
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* FLOATING TEXT EDITING TOOLBAR */}
          {selectedElement && selectedElement.type === 'text' && !selectedElement.isLocked && (
            <Paper
              elevation={4}
              sx={{
                position: 'absolute',
                top: 20,
                bgcolor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: 2.5,
                px: 2,
                py: 0.8,
                display: 'flex',
                alignItems: 'center',
                gap: 1.2,
                zIndex: 30,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}
            >
              <TextField
                select
                size="small"
                value={selectedElement.fontFamily || 'Montserrat'}
                onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
                sx={{ width: 130, '& .MuiSelect-select': { py: 0.5, fontSize: 12, fontWeight: 700 } }}
              >
                {FONTS.map((f) => (
                  <MenuItem key={f.name} value={f.name} sx={{ fontFamily: f.family }}>
                    {f.name}
                  </MenuItem>
                ))}
              </TextField>

              <Box sx={{ display: 'flex', gap: 0.3 }}>
                <IconButton
                  size="small"
                  onClick={() => updateSelectedElement({ fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
                  sx={{ color: selectedElement.fontWeight === 'bold' ? '#2563EB' : '#6B7280' }}
                >
                  <Bold size={16} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => updateSelectedElement({ fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                  sx={{ color: selectedElement.fontStyle === 'italic' ? '#2563EB' : '#6B7280' }}
                >
                  <Italic size={16} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => updateSelectedElement({ textDecoration: selectedElement.textDecoration === 'underline' ? 'none' : 'underline' })}
                  sx={{ color: selectedElement.textDecoration === 'underline' ? '#2563EB' : '#6B7280' }}
                >
                  <Underline size={16} />
                </IconButton>
              </Box>

              <Divider orientation="vertical" flexItem sx={{ borderColor: '#E5E7EB' }} />

              {/* Color Swatches */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {COLOR_PALETTE.slice(0, 6).map((c) => (
                  <Box
                    key={c}
                    onClick={() => updateSelectedElement({ color: c })}
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      bgcolor: c,
                      border: selectedElement.color === c ? '2px solid #2563EB' : '1px solid #D1D5DB',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Box>

              <Divider orientation="vertical" flexItem sx={{ borderColor: '#E5E7EB' }} />

              <IconButton size="small" onClick={() => handleDuplicateLayer(selectedElement.id)} sx={{ color: '#6B7280' }}>
                <Copy size={16} />
              </IconButton>
              <IconButton size="small" onClick={() => handleDeleteLayer(selectedElement.id)} sx={{ color: '#EF4444' }}>
                <Trash2 size={16} />
              </IconButton>
            </Paper>
          )}

          {/* MAIN PRODUCT MOCKUP: 2D FLAT-LAY T-SHIRT / PHONE COVER / CERAMIC COFFEE MUG */}
          <Box
            ref={canvasRef}
            sx={{
              position: 'relative',
              width: 480,
              height: 480,
              transform: `scale(${zoomLevel / 100})`,
              transition: isDragging ? 'none' : 'transform 0.15s ease',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* 1. REALISTIC CERAMIC COFFEE MUG VECTOR */}
            {selectedCategory === 'coffee-mugs' ? (
              <svg
                width="460"
                height="460"
                viewBox="0 0 460 460"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', top: 0, left: 10, pointerEvents: 'none' }}
              >
                {/* Ceramic Handle (Side / Back Angle) */}
                <path
                  d="M330 160 C400 160 400 320 330 320 L330 290 C375 290 375 190 330 190 Z"
                  fill={selectedColor.hex}
                  stroke="#2D3748"
                  strokeWidth="2.5"
                />

                {/* Mug Cylinder Body */}
                <path
                  d="M130 110 C130 110 130 360 130 370 C130 395 330 395 330 370 C330 360 330 110 330 110 Z"
                  fill={selectedColor.hex}
                  stroke="#2D3748"
                  strokeWidth="2.5"
                />

                {/* Mug Bottom Base Curve */}
                <ellipse cx="230" cy="370" rx="100" ry="20" fill="none" stroke="#2D3748" strokeWidth="2" opacity="0.4" />

                {/* Mug Top Rim Opening Lip */}
                <ellipse cx="230" cy="110" rx="100" ry="24" fill={selectedColor.hex === '#FFFFFF' ? '#F9FAFB' : '#374151'} stroke="#2D3748" strokeWidth="2.5" />
                {/* Inner Depth */}
                <ellipse cx="230" cy="112" rx="90" ry="18" fill="#1F2937" opacity={selectedColor.hex === '#FFFFFF' ? '0.1' : '0.4'} />

                {/* Ceramic Gloss Highlight Sheen */}
                <path d="M150 140 L150 350" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity={selectedColor.hex === '#FFFFFF' ? '0.6' : '0.25'} />
              </svg>
            ) : selectedCategory === 'phone-covers' ? (
              /* 2. REALISTIC PHONE CASE VECTOR */
              <svg
                width="280"
                height="460"
                viewBox="0 0 280 460"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', top: 0, left: 100, pointerEvents: 'none' }}
              >
                <rect x="20" y="20" width="240" height="420" rx="36" fill={selectedColor.hex} stroke="#2D3748" strokeWidth="3" />
                <rect x="40" y="40" width="70" height="70" rx="16" fill="#1F2937" stroke="#374151" strokeWidth="2" />
                <circle cx="60" cy="60" r="14" fill="#000000" />
                <circle cx="90" cy="90" r="14" fill="#000000" />
              </svg>
            ) : (
              /* 3. REALISTIC 2D FLAT-LAY T-SHIRT VECTOR */
              <svg
                width="460"
                height="460"
                viewBox="0 0 460 460"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', top: 0, left: 10, pointerEvents: 'none' }}
              >
                {/* T-Shirt Body Outline & Garment Color */}
                <path
                  d="M145 55 C160 85 300 85 315 55 L385 130 C400 145 425 130 405 175 L355 195 L350 415 C350 425 340 430 330 430 L130 430 C120 430 110 425 110 415 L105 195 L55 175 C35 130 60 145 75 130 Z"
                  fill={selectedColor.hex}
                  stroke="#2D3748"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                {/* Crew Neck Collar Ribbing */}
                <path
                  d="M145 55 C165 95 295 95 315 55 C295 78 165 78 145 55 Z"
                  fill={selectedColor.hex === '#FFFFFF' ? '#F3F4F6' : '#1F2937'}
                  stroke="#2D3748"
                  strokeWidth="2"
                />
                {/* Sleeve Crease Lines */}
                <path d="M105 195 L140 120" stroke="#2D3748" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
                <path d="M355 195 L320 120" stroke="#2D3748" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
                <line x1="115" y1="418" x2="345" y2="418" stroke="#2D3748" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
              </svg>
            )}

            {/* DASHED SAFE PRINT AREA RECTANGLE (Printify/Lumise Style) */}
            {viewMode === 'edit' && (
              <Box
                sx={{
                  position: 'absolute',
                  top: printBounds.minY,
                  left: printBounds.minX,
                  width: printBounds.width,
                  height: printBounds.height,
                  border: '1.5px dashed rgba(255, 255, 255, 0.85)',
                  outline: '1px dashed rgba(0, 0, 0, 0.45)',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />
            )}

            {/* CANVAS DESIGN LAYERS */}
            {currentElements.map((el) => {
              if (el.isHidden) return null;
              const isSelected = selectedElementId === el.id && viewMode === 'edit';

              return (
                <Box
                  key={el.id}
                  onPointerDown={(e) => handlePointerDown(e, el, 'move')}
                  sx={{
                    position: 'absolute',
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                    transform: `rotate(${el.rotation}deg)`,
                    opacity: el.opacity,
                    cursor: el.isLocked || viewMode === 'preview' ? 'default' : 'move',
                    border: isSelected && !el.isLocked ? '1.5px solid #2563EB' : 'none',
                    borderRadius: el.borderRadius ? `${el.borderRadius}px` : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    touchAction: 'none',
                    zIndex: 5,
                  }}
                >
                  {/* TEXT LAYER */}
                  {el.type === 'text' && (
                    <Typography
                      sx={{
                        width: '100%',
                        fontFamily: el.fontFamily,
                        fontSize: el.fontSize,
                        color: el.color,
                        fontWeight: el.fontWeight,
                        fontStyle: el.fontStyle,
                        textDecoration: el.textDecoration,
                        textAlign: el.textAlign,
                        letterSpacing: `${el.letterSpacing}px`,
                        lineHeight: 1.15,
                        wordBreak: 'break-word',
                        userSelect: 'none',
                      }}
                    >
                      {el.text}
                    </Typography>
                  )}

                  {/* IMAGE LAYER */}
                  {el.type === 'image' && (
                    el.imageUrl ? (
                      <Box
                        component="img"
                        src={el.imageUrl}
                        alt={el.name}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          filter: el.filter || 'none',
                          border: el.border || 'none',
                          borderRadius: el.borderRadius ? `${el.borderRadius}px` : 0,
                          boxShadow: el.boxShadow || 'none',
                          pointerEvents: 'none',
                        }}
                      />
                    ) : (
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        sx={{
                          width: '100%',
                          height: '100%',
                          border: '2px dashed rgba(59, 130, 246, 0.7)',
                          borderRadius: 2,
                          bgcolor: 'rgba(59, 130, 246, 0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5,
                          p: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.12)' },
                        }}
                      >
                        <Upload size={20} color="#2563EB" />
                        <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 700, fontSize: 10, textAlign: 'center' }}>
                          Upload Photo (Snaps Here)
                        </Typography>
                      </Box>
                    )
                  )}

                  {/* SHAPE LAYER */}
                  {el.type === 'shape' && (
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {el.shapeType === 'rectangle' && (
                        <Box sx={{ width: '100%', height: '100%', bgcolor: el.fillColor, border: `${el.strokeWidth}px solid ${el.strokeColor}`, borderRadius: 1 }} />
                      )}
                      {el.shapeType === 'circle' && (
                        <Box sx={{ width: '100%', height: '100%', bgcolor: el.fillColor, border: `${el.strokeWidth}px solid ${el.strokeColor}`, borderRadius: '50%' }} />
                      )}
                      {el.shapeType === 'star' && <Star size={el.width * 0.8} fill={el.fillColor} color={el.strokeColor} />}
                      {el.shapeType === 'heart' && <Heart size={el.width * 0.8} fill={el.fillColor} color={el.strokeColor} />}
                      {el.shapeType === 'arrow' && <ArrowRight size={el.width * 0.8} color={el.fillColor} strokeWidth={4} />}
                    </Box>
                  )}

                  {/* TRANSFORM HANDLES */}
                  {isSelected && !el.isLocked && (
                    <>
                      <Box
                        onPointerDown={(e) => handlePointerDown(e, el, 'resize-se')}
                        sx={{
                          position: 'absolute',
                          bottom: -6,
                          right: -6,
                          width: 12,
                          height: 12,
                          bgcolor: '#2563EB',
                          border: '2px solid #FFFFFF',
                          borderRadius: '50%',
                          cursor: 'se-resize',
                        }}
                      />

                      <Box
                        onPointerDown={(e) => handlePointerDown(e, el, 'rotate')}
                        sx={{
                          position: 'absolute',
                          top: -20,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 16,
                          height: 16,
                          bgcolor: '#2563EB',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'grab',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        }}
                      >
                        <RotateCw size={10} color="#FFFFFF" />
                      </Box>
                    </>
                  )}
                </Box>
              );
            })}
          </Box>

          {/* BOTTOM FLOATING CONTROLS: FRONT/BACK/HANDLE TOGGLE PILL */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 24,
              display: 'flex',
              alignItems: 'center',
              bgcolor: '#FFFFFF',
              borderRadius: 3,
              p: 0.5,
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            }}
          >
            <Button
              size="small"
              onClick={() => setActiveSide('front')}
              sx={{
                py: 0.4,
                px: 2,
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 2.5,
                bgcolor: activeSide === 'front' ? '#5A6351' : 'transparent',
                color: activeSide === 'front' ? '#FFFFFF' : '#4B5563',
                '&:hover': { bgcolor: activeSide === 'front' ? '#4D5445' : '#F3F4F6' },
              }}
            >
              Front side
            </Button>
            <Button
              size="small"
              onClick={() => setActiveSide('back')}
              sx={{
                py: 0.4,
                px: 2,
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 2.5,
                bgcolor: activeSide === 'back' ? '#5A6351' : 'transparent',
                color: activeSide === 'back' ? '#FFFFFF' : '#4B5563',
                '&:hover': { bgcolor: activeSide === 'back' ? '#4D5445' : '#F3F4F6' },
              }}
            >
              Back side
            </Button>
            {selectedCategory === 'coffee-mugs' && (
              <Button
                size="small"
                onClick={() => setActiveSide('handle')}
                sx={{
                  py: 0.4,
                  px: 2,
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 2.5,
                  bgcolor: activeSide === 'handle' ? '#5A6351' : 'transparent',
                  color: activeSide === 'handle' ? '#FFFFFF' : '#4B5563',
                  '&:hover': { bgcolor: activeSide === 'handle' ? '#4D5445' : '#F3F4F6' },
                }}
              >
                Handle view
              </Button>
            )}
          </Box>
        </Box>

        {/* RIGHT SIDE PANEL: "VARIANTS AND LAYERS" (Printify/Lumise Style) */}
        <Box
          sx={{
            width: 320,
            bgcolor: '#FFFFFF',
            borderLeft: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            p: 2.5,
            zIndex: 20,
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#111827' }}>
              Variants and layers
            </Typography>
            <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
          </Box>

          {/* Variants Section */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#374151' }}>
                Variants
              </Typography>
              <Button
                size="small"
                variant="outlined"
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  py: 0.2,
                  px: 1.5,
                  borderRadius: 1.5,
                  color: '#EA580C',
                  borderColor: '#EA580C',
                  textTransform: 'none',
                }}
              >
                Select variants
              </Button>
            </Box>

            <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, display: 'block', mb: 1 }}>
              {selectedCategory === 'coffee-mugs' ? 'Mug Ceramic Colors' : 'Garment Colors'} ({defaultColors.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {defaultColors.map((col) => {
                const isSelected = selectedColor.hex === col.hex;
                return (
                  <Tooltip key={col.hex} title={col.name}>
                    <Box
                      onClick={() => setSelectedColor(col)}
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        bgcolor: col.hex,
                        border: isSelected ? '3px solid #EA580C' : `1px solid ${col.border}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && <CheckCircle size={14} color={col.hex === '#FFFFFF' ? '#111827' : '#FFFFFF'} />}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>

            <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, display: 'block', mb: 0.8 }}>
              {selectedCategory === 'coffee-mugs' ? 'Mug Size / Type' : selectedCategory === 't-shirts' ? 'Apparel Size' : 'Device Model'}
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              sx={{ bgcolor: '#F9FAFB', '& .MuiSelect-select': { py: 0.8, fontSize: 12, fontWeight: 700 } }}
            >
              {(selectedCategory === 'coffee-mugs' ? MUG_VARIANTS : selectedCategory === 't-shirts' ? APPAREL_SIZES : PHONE_MODELS).map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ mt: 1.5, p: 1.2, bgcolor: '#F9FAFB', borderRadius: 2, border: '1px solid #E5E7EB' }}>
              <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', fontSize: 11 }}>
                Currently editing the <b>default design</b>
              </Typography>
              <Typography variant="caption" sx={{ color: '#0284C7', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                Make a specific design for {selectedColor.name}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5, borderColor: '#E5E7EB' }} />

          {/* Layers Section */}
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#374151' }}>
                Layers ({currentElements.length})
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {currentElements.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center', bgcolor: '#F9FAFB', borderRadius: 2, border: '1px dashed #D1D5DB' }}>
                  <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                    No layers on {activeSide} side. Use the left toolbar to add elements.
                  </Typography>
                </Box>
              ) : (
                currentElements.map((el, index) => {
                  const isSelected = selectedElementId === el.id;
                  return (
                    <Paper
                      key={el.id}
                      elevation={0}
                      onClick={() => setSelectedElementId(el.id)}
                      sx={{
                        p: 1.2,
                        bgcolor: isSelected ? '#EFF6FF' : '#F9FAFB',
                        border: isSelected ? '1.5px solid #2563EB' : '1px solid #E5E7EB',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 130, overflow: 'hidden' }}>
                        {el.type === 'text' && <Type size={16} color="#0284C7" />}
                        {el.type === 'image' && <Upload size={16} color="#16A34A" />}
                        {el.type === 'shape' && <Shapes size={16} color="#D97706" />}
                        <Box>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: '#111827', fontSize: 12 }}>
                            {el.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#16A34A', fontSize: 10, display: 'block', fontWeight: 600 }}>
                            Ready for print
                          </Typography>
                        </Box>
                      </Box>

                      {/* Controls */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggleHideLayer(el.id); }} sx={{ p: 0.4 }}>
                          {el.isHidden ? <EyeOff size={14} color="#9CA3AF" /> : <Eye size={14} color="#4B5563" />}
                        </IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggleLockLayer(el.id); }} sx={{ p: 0.4 }}>
                          {el.isLocked ? <Lock size={14} color="#F59E0B" /> : <Unlock size={14} color="#4B5563" />}
                        </IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMoveLayerUp(index); }} disabled={index >= currentElements.length - 1} sx={{ p: 0.4 }}>
                          <MoveUp size={14} color="#4B5563" />
                        </IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMoveLayerDown(index); }} disabled={index <= 0} sx={{ p: 0.4 }}>
                          <MoveDown size={14} color="#4B5563" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); handleDeleteLayer(el.id); }}
                          disabled={el.isLocked}
                          sx={{ p: 0.4 }}
                        >
                          <Trash2 size={14} color={el.isLocked ? '#D1D5DB' : '#EF4444'} />
                        </IconButton>
                      </Box>
                    </Paper>
                  );
                })
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 3. BOTTOM FOOTER BAR WITH PROMINENT SAVE BUTTON */}
      <Box
        sx={{
          height: 56,
          bgcolor: '#FFFFFF',
          borderTop: '1px solid #E5E7EB',
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
        }}
      >
        {/* Left: Zoom Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))} sx={{ color: '#4B5563' }}>
            <ZoomOut size={16} />
          </IconButton>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151', minWidth: 40, textAlign: 'center' }}>
            {zoomLevel}%
          </Typography>
          <IconButton size="small" onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))} sx={{ color: '#4B5563' }}>
            <ZoomIn size={16} />
          </IconButton>
        </Box>

        {/* Right: Live Price & Vibrant Green "Save product" Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: '#6B7280', fontSize: 10, textTransform: 'uppercase', display: 'block' }}>
              Total Price
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#111827', lineHeight: 1 }}>
              {formatPrice(totalPrice)}
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="medium"
            onClick={handleAddToCart}
            sx={{
              fontWeight: 700,
              fontSize: 14,
              px: 4,
              py: 1,
              borderRadius: 1.5,
              bgcolor: '#84CC16',
              color: '#000000',
              textTransform: 'none',
              boxShadow: '0 2px 8px rgba(132, 204, 22, 0.3)',
              '&:hover': {
                bgcolor: '#65A30D',
              },
            }}
          >
            Save product
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};
