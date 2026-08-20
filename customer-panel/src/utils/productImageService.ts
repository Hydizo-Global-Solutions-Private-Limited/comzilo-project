export const API_BASE_URL = 'http://localhost:5000';

const PRODUCT_TYPE_DEFAULT_IMAGES: Record<string, string> = {
  physical: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
  variable: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500',
  virtual: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500',
  downloadable: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500',
  print_on_demand: '/pod/pod_tshirt.png',
  bundle: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500',
  service: 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=500',
  subscription: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500',
  gift_card: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500',
  rental: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500',
};

const SKU_IMAGE_MAP: Record<string, string> = {
  'PHYS-TSHIRT-001': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500',
  'PHYS-MOUSE-002': 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500',
  'VAR-POLO-001': 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500',
  'VAR-SHOES-002': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
  'VIRT-MEMBERSHIP-001': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500',
  'VIRT-CONSULT-002': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500',
  'DL-JAVA-PDF-001': 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500',
  'DL-FLUTTER-CODE-002': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=500',
  'POD-MUG-001': '/pod/pod_mugs.png',
  'POD-HOODIE-002': '/pod/pod_hoodie.png',
  'POD-TSHIRT-001': '/pod/pod_tshirt.png',
  'POD-PHONE-002': '/pod/pod_phone_case.png',
};

/**
 * Returns full image URL for storefront display (Catalog, Details, Search, Cart).
 */
export const getProductImage = (prod: any): string => {
  if (typeof prod === 'string' && prod) {
    if (prod.startsWith('http://') || prod.startsWith('https://') || prod.startsWith('data:image/')) {
      return prod;
    } else if (!prod.startsWith('blob:')) {
      return `${API_BASE_URL}${prod.startsWith('/') ? '' : '/'}${prod}`;
    }
  }

  // Check for customized item preview image
  const customImg = prod?.image || prod?.customization?.previewImage || prod?.customization?.previewUrl;
  if (customImg && typeof customImg === 'string' && (customImg.startsWith('http://') || customImg.startsWith('https://') || customImg.startsWith('data:image/'))) {
    return customImg;
  }

  const images = prod?.images || prod?.media || prod?.productImages || prod?.product_images || [];
  
  // 1. First look for real non-blob uploaded image URL
  const validImg = images.find((img: any) => {
    const url = typeof img === 'string' ? img : (img?.imageUrl || img?.url || img?.image_url || img?.thumbnail_url || img?.path);
    return url && typeof url === 'string' && !url.startsWith('blob:');
  });

  let rawUrl = typeof validImg === 'string' ? validImg : (validImg?.imageUrl || validImg?.url || validImg?.image_url || validImg?.thumbnail_url || validImg?.path || prod?.thumbnail_image || prod?.image || prod?.imageUrl || prod?.image_url);

  if (rawUrl && typeof rawUrl === 'string' && !rawUrl.startsWith('blob:')) {
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:image/')) {
      return rawUrl;
    }
    return `${API_BASE_URL}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  }

  // 2. Check product SKU mapping
  if (prod?.sku && SKU_IMAGE_MAP[prod.sku]) {
    return SKU_IMAGE_MAP[prod.sku];
  }

  // 3. Fallback to clean retail product photo
  const pType = (prod?.productType || prod?.type || '').toLowerCase();
  if (pType && PRODUCT_TYPE_DEFAULT_IMAGES[pType]) {
    return PRODUCT_TYPE_DEFAULT_IMAGES[pType];
  }

  return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
};
