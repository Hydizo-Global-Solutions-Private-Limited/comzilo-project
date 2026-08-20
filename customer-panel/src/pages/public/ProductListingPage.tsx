import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  TextField,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Rating,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Paper,
  Divider,
  Chip,
  InputAdornment,
} from '@mui/material';
import { Search, ShoppingCart, Heart, Filter, PackageX, Globe, Sparkles } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useGetProductsQuery } from '../../api/catalogApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addToCart } from '../../store/cartSlice';
import { toggleWishlist } from '../../store/wishlistSlice';
import { SUPPORTED_COUNTRIES, formatPrice } from '../../utils/currencyService';
import { getProductImage } from '../../utils/productImageService';
import toast from 'react-hot-toast';

interface ProductTypeItem {
  code: string;
  name: string;
}

const ALL_PRODUCT_TYPES: ProductTypeItem[] = [
  { code: 'physical', name: 'Physical Products' },
  { code: 'variable', name: 'Variable Products' },
  { code: 'virtual', name: 'Virtual Products' },
  { code: 'downloadable', name: 'Downloadable Products' },
  { code: 'print_on_demand', name: 'Print On Demand' },
];

const PRODUCT_IMAGE_MAP: Record<string, string> = {
  'PHYS-TSHIRT-001': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500',
  'PHYS-MOUSE-002': 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500',
  'VAR-POLO-001': 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500',
  'VAR-SHOES-002': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
  'VIRT-MEMBERSHIP-001': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500',
  'VIRT-CONSULT-002': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500',
  'DIG-FIGMA-001': 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=500',
  'DIG-WP-THEME-002': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500',
  'DL-JAVA-PDF-001': 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500',
  'DL-FLUTTER-CODE-002': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=500',
  'POD-MUG-001': '/pod/pod_mugs.png',
  'POD-HOODIE-002': '/pod/pod_hoodie.png',
  'POD-TSHIRT-001': '/pod/pod_tshirt.png',
  'POD-PHONE-002': '/pod/pod_phone_case.png',
  'BNDL-OFFICE-001': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500',
  'BNDL-GAMER-002': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500',
  'SRV-REPAIR-001': 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=500',
  'SRV-CLEAN-002': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500',
  'SUB-ERP-MONTHLY-001': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500',
  'SUB-ERP-ANNUAL-002': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500',
  'GC-500-001': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500',
  'GC-1000-002': 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=500',
  'RNT-CAM-4K-001': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500',
  'RNT-PROJ-HD-002': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
};

export const ProductListingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState('popular');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const isPodFilterSelected = selectedTypes.includes('print_on_demand');
  // Hide POD products by default. Only include POD products when explicitly selected.
  const typesQuery = selectedTypes.length > 0
    ? selectedTypes.join(',')
    : 'physical,variable,virtual,downloadable';

  const tenantIdParam = searchParams.get('tenant_id');
  const storeIdParam = searchParams.get('store_id');
  const storeSlugParam = searchParams.get('store');

  const { data, isLoading } = useGetProductsQuery({
    limit: 100,
    search,
    types: typesQuery,
    sortBy,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    tenant_id: tenantIdParam ? Number(tenantIdParam) : undefined,
    store_id: storeIdParam ? Number(storeIdParam) : undefined,
    store: storeSlugParam || undefined,
  });
  const dispatch = useAppDispatch();
  const { items: wishlistItems } = useAppSelector((state) => state.wishlist);
  const isWishlisted = (id: number | string) => wishlistItems.some((i: any) => String(i.id) === String(id));

  const handleTypeToggle = (typeCode: string) => {
    if (selectedTypes.includes(typeCode)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== typeCode));
    } else {
      setSelectedTypes([...selectedTypes, typeCode]);
    }
  };

  const navigate = useNavigate();

  const handleAddToCart = (prod: any) => {
    const isPod = prod.productType === 'print_on_demand' || prod.productTypeRecord?.code === 'print_on_demand' || (prod.sku && String(prod.sku).startsWith('POD-'));
    if (isPod) {
      navigate(`/products/${prod.id}`);
      toast.success('🎨 Customization Required: Opening Design Studio!');
      return;
    }
    dispatch(
      addToCart({
        id: prod.id,
        name: prod.name,
        price: Number(prod.price),
        image: getProductImage(prod),
        quantity: 1,
      })
    );
    toast.success(`${prod.name} added to cart`);
  };

  // Real database rows only from MySQL with active client & server-side sorting
  const rawProducts = data?.data?.products || data?.data || [];
  const initialProducts = useMemo(() => (Array.isArray(rawProducts) ? [...rawProducts] : []), [rawProducts]);

  const products = useMemo(() => {
    return [...initialProducts].sort((a: any, b: any) => {
      const priceA = Number(a.price || 0);
      const priceB = Number(b.price || 0);

      if (sortBy === 'price-low') {
        return priceA - priceB;
      }
      if (sortBy === 'price-high') {
        return priceB - priceA;
      }
      if (sortBy === 'name-asc') {
        return String(a.name || '').localeCompare(String(b.name || ''));
      }
      if (sortBy === 'name-desc') {
        return String(b.name || '').localeCompare(String(a.name || ''));
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      return 0;
    });
  }, [initialProducts, sortBy]);

  return (
    <Container maxWidth="xl" sx={{ py: 5 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
            Discover & Shop Premium Products
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Explore curated electronics, fashion, digital assets & print-on-demand essentials with fast delivery and buyer protection on Comzilo Store.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* STEP 2: SIDEBAR FILTER PANEL FOR MULTI-TYPE CHECKBOXES */}
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, borderColor: '#E2E8F0', sticky: 'top', top: 20 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Filter size={20} color="#2563EB" />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                Filter Catalog
              </Typography>
            </Box>
            <Divider sx={{ mb: 2.5 }} />

            {/* PRODUCT TYPES MULTI-SELECT CHECKBOXES */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#334155' }}>
              Product Type
            </Typography>
            <FormGroup sx={{ mb: 3 }}>
              {ALL_PRODUCT_TYPES.map((t) => (
                <FormControlLabel
                  key={t.code}
                  control={
                    <Checkbox
                      size="small"
                      checked={selectedTypes.includes(t.code)}
                      onChange={() => handleTypeToggle(t.code)}
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontSize: 13, fontWeight: selectedTypes.includes(t.code) ? 700 : 400 }}>{t.name}</Typography>}
                />
              ))}
            </FormGroup>

            <Divider sx={{ mb: 2.5 }} />

            {/* PRICE RANGE FILTER */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#334155' }}>
              Price Range
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <TextField
                size="small"
                placeholder="Min"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <TextField
                size="small"
                placeholder="Max"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </Box>

            {(selectedTypes.length > 0 || minPrice || maxPrice) && (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                size="small"
                onClick={() => {
                  setSelectedTypes([]);
                  setMinPrice('');
                  setMaxPrice('');
                }}
                sx={{ mt: 1, fontWeight: 700 }}
              >
                Clear All Filters
              </Button>
            )}
          </Paper>
        </Grid>

        {/* MAIN PRODUCT LISTINGS CONTENT */}
        <Grid item xs={12} md={9}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search catalog products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 320 }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {selectedTypes.length > 0 && (
                <Chip label={`${selectedTypes.length} Product Types Filtered`} color="primary" size="small" sx={{ fontWeight: 700 }} />
              )}
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel>Sort By</InputLabel>
                <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
                  <MenuItem value="popular">Most Popular</MenuItem>
                  <MenuItem value="price-low">Price: Low to High</MenuItem>
                  <MenuItem value="price-high">Price: High to Low</MenuItem>
                  <MenuItem value="name-asc">Name: A to Z</MenuItem>
                  <MenuItem value="name-desc">Name: Z to A</MenuItem>
                  <MenuItem value="newest">Newest Arrivals</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* STEP 4: EMPTY STATE WHEN ZERO MATCHING PRODUCTS EXIST */}
          {products.length === 0 && !isLoading ? (
            <Paper sx={{ textAlign: 'center', py: 8, border: '1px dashed #CBD5E1', borderRadius: 3, bgcolor: '#F8FAFC' }}>
              <PackageX size={56} color="#94A3B8" />
              <Typography variant="h6" sx={{ mt: 2, fontWeight: 700, color: '#334155' }}>
                {isPodFilterSelected && selectedTypes.length === 1
                  ? 'No Print On Demand products available'
                  : 'No Products Found'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {isPodFilterSelected && selectedTypes.length === 1
                  ? 'There are currently no Print-On-Demand products matching your search or price criteria.'
                  : selectedTypes.length > 0 || search || minPrice || maxPrice
                    ? 'No products match your selected filters. Try clearing some criteria to explore more items.'
                    : 'There are currently no active products matching your search.'}
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {products.map((prod: any) => {
                const wishlisted = isWishlisted(prod.id);
                return (
                  <Grid key={prod.id} item xs={12} sm={6} md={4}>
                    <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ position: 'relative' }}>
                        <CardMedia
                          component="img"
                          height="200"
                          image={getProductImage(prod)}
                          alt={prod.name}
                          onError={(e: any) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
                          }}
                          sx={{ objectFit: 'cover' }}
                        />
                        <Button
                          onClick={() => {
                            const imgUrl = getProductImage(prod);
                            dispatch(toggleWishlist({ ...prod, image: imgUrl }));
                            toast.success(wishlisted ? 'Removed from wishlist' : 'Added to wishlist');
                          }}
                          sx={{ position: 'absolute', top: 8, right: 8, minWidth: 0, p: 1, bgcolor: '#FFFFFF', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                        >
                          <Heart size={18} color="#DC2626" fill={wishlisted ? '#DC2626' : 'none'} />
                        </Button>
                      {(() => {
                        const rawType = prod.product_type || prod.productType || (prod.pod_template_id ? 'print_on_demand' : 'physical');
                        const isPod = rawType === 'print_on_demand' || Boolean(prod.pod_template_id);
                        return (
                          <Chip
                            label={isPod ? 'PRINT ON DEMAND' : rawType.toUpperCase().replace(/_/g, ' ')}
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              fontWeight: 800,
                              fontSize: 10,
                              bgcolor: isPod ? '#7C3AED' : '#2563EB',
                              color: '#FFFFFF',
                            }}
                          />
                        );
                      })()}
                    </Box>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {prod.sku ? `SKU: ${prod.sku}` : 'Retail Item'}
                      </Typography>
                      <Typography
                        component={Link}
                        to={`/products/${prod.id}`}
                        variant="subtitle1"
                        sx={{ fontWeight: 700, display: 'block', textDecoration: 'none', color: '#0F172A', mt: 0.5, mb: 1, '&:hover': { color: '#2563EB' } }}
                      >
                        {prod.name}
                      </Typography>
                      <Rating value={4.8} precision={0.5} size="small" readOnly />

                      {/* LOCATION-AWARE AUTOMATIC CURRENCY FORMATTING */}
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#2563EB', mt: 1 }}>
                        {formatPrice(prod.price)}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      {(() => {
                        const isPod = Boolean(
                          prod &&
                          (prod.productType === 'print_on_demand' || prod.productType === 'pod' || prod.productTypeRecord?.code === 'print_on_demand') &&
                          prod.productType !== 'physical' &&
                          prod.productType !== 'virtual' &&
                          prod.productType !== 'downloadable' &&
                          prod.productType !== 'variable'
                        );
                        return (
                          <Button
                            variant="contained"
                            fullWidth
                            color={isPod ? 'secondary' : 'primary'}
                            startIcon={isPod ? <Sparkles size={16} /> : <ShoppingCart size={16} />}
                            onClick={() => handleAddToCart(prod)}
                            sx={{
                              fontWeight: 800,
                              borderRadius: 2,
                              background: isPod ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' : undefined,
                            }}
                          >
                            {isPod ? '🎨 CUSTOMIZE & DESIGN' : 'Add to Cart'}
                          </Button>
                        );
                      })()}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};
