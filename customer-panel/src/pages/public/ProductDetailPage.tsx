import React, { useState } from 'react';
import { Container, Grid, Box, Typography, Button, Rating, Chip, Paper, Divider, TextField, Alert } from '@mui/material';
import { ShoppingCart, Heart, ShieldCheck, Truck, RotateCcw, Sparkles } from 'lucide-react';
import { PodStudioModal } from '../../components/pod/PodStudioModal';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetProductByIdQuery, useGetProductReviewsQuery } from '../../api/catalogApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addToCart } from '../../store/cartSlice';
import { toggleWishlist } from '../../store/wishlistSlice';
import { formatPrice } from '../../utils/currencyService';
import { getProductImage, API_BASE_URL } from '../../utils/productImageService';
import { VariantSelector, VariantItem } from '../../components/products/VariantSelector';
import { ProductReviewsSection } from '../../components/products/ProductReviewsSection';
import toast from 'react-hot-toast';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<VariantItem | null>(null);

  const validId = id && id !== 'undefined' && id !== 'null' ? id : 1;
  const { data } = useGetProductByIdQuery(validId);
  const { data: reviewData } = useGetProductReviewsQuery(validId);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items: wishlistItems } = useAppSelector((state) => state.wishlist);

  const product = data?.data || data;
  const isWishlisted = product ? wishlistItems.some((i: any) => String(i.id) === String(product.id)) : false;

  const [isPodModalOpen, setIsPodModalOpen] = useState(false);
  const hasVariants = product?.variants && Array.isArray(product.variants) && product.variants.length > 0;

  // Live Price and Image updates based on Selected Variant vs Simple Product
  const currentPrice = selectedVariant ? Number(selectedVariant.price) : Number(product?.price) || 0;
  const comparePrice = selectedVariant ? (selectedVariant.compareAtPrice ? Number(selectedVariant.compareAtPrice) : undefined) : (product?.compareAtPrice ? Number(product.compareAtPrice) : undefined);
  const currentSku = selectedVariant ? selectedVariant.sku : product?.sku || 'SKU-MAIN-01';
  const currentStock = selectedVariant ? Number(selectedVariant.stockQuantity) : Number(product?.stockQuantity ?? 50);

  const rawVariantImg = selectedVariant?.images?.[0]?.imageUrl || (selectedVariant?.images?.[0] as any)?.url;
  const primaryVariantImage = rawVariantImg ? (rawVariantImg.startsWith('http') || rawVariantImg.startsWith('blob:') ? rawVariantImg : `${API_BASE_URL}${rawVariantImg.startsWith('/') ? '' : '/'}${rawVariantImg}`) : null;
  const displayImage = primaryVariantImage || getProductImage(product);

  const handleAddToCart = () => {
    if (!product) return;

    const isPod = product.productType === 'print_on_demand' || product.productTypeRecord?.code === 'print_on_demand';
    if (isPod) {
      setIsPodModalOpen(true);
      toast.success('🎨 Please configure your Front, Back, Left, and Right side artwork in the Studio!');
      return;
    }

    if (hasVariants && !selectedVariant) {
      toast.error('Please select a valid variant combination before adding to cart');
      return;
    }

    if (currentStock <= 0) {
      toast.error('Selected variant is currently out of stock');
      return;
    }

    let variantDetailsText = '';
    if (selectedVariant) {
      if (selectedVariant.attributes && Array.isArray(selectedVariant.attributes) && selectedVariant.attributes.length > 0) {
        variantDetailsText = selectedVariant.attributes
          .map((a: any) => `${a.name || a.attributeName || 'Option'}: ${a.value || a.attributeValue || ''}`)
          .filter((str: string) => !str.endsWith(': '))
          .join(', ');
      }

      if (!variantDetailsText && selectedVariant.sku && selectedVariant.sku.includes('-')) {
        const parts = selectedVariant.sku.split('-');
        if (parts.length >= 4) {
          const potentialRam = parts[parts.length - 3];
          const potentialMem = parts[parts.length - 2];
          const potentialCol = parts[parts.length - 1];
          variantDetailsText = `RAM: ${potentialRam}, Memory: ${potentialMem}, Colour: ${potentialCol}`;
        } else {
          variantDetailsText = `SKU: ${selectedVariant.sku}`;
        }
      }
    }

    const formattedName = variantDetailsText
      ? `${product.name} (${variantDetailsText})`
      : (selectedVariant ? `${product.name} (${selectedVariant.sku})` : product.name);

    const itemPayload = {
      id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
      productId: product.id,
      variantId: selectedVariant?.id,
      name: formattedName,
      variantName: variantDetailsText || (selectedVariant ? `SKU: ${selectedVariant.sku}` : undefined),
      selectedAttributes: selectedVariant?.attributes || [],
      price: currentPrice,
      image: displayImage,
      quantity,
    };

    dispatch(addToCart(itemPayload));
    toast.success(`${quantity}x ${itemPayload.name} added to cart`);
  };

  const handleAddToCartCustomized = (customizedItem: any) => {
    dispatch(
      addToCart({
        id: customizedItem.productId,
        name: customizedItem.name,
        price: customizedItem.price,
        image: customizedItem.image || customizedItem.customization?.previewImage || getProductImage(product),
        quantity: 1,
        customization: customizedItem.customization,
      } as any)
    );
    toast.success('🎨 Custom design added to cart!');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    if (!hasVariants || selectedVariant) navigate('/cart');
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    dispatch(toggleWishlist({ ...product, image: displayImage }));
    toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Grid container spacing={6}>
        {/* Product Image Gallery */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, borderRadius: 4, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Box
              component="img"
              src={displayImage}
              alt={product?.name || 'Product'}
              onError={(e: any) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
              }}
              sx={{ width: '100%', height: 400, objectFit: 'cover', borderRadius: 3 }}
            />
          </Paper>
        </Grid>

        {/* Product Specs & Purchase Options */}
        <Grid item xs={12} md={6}>
          {(() => {
            const rawType = product?.product_type || product?.productType || (product?.pod_template_id ? 'print_on_demand' : 'physical');
            const isPod = rawType === 'print_on_demand' || Boolean(product?.pod_template_id);
            return (
              <Chip
                label={isPod ? 'PRINT ON DEMAND' : (product?.category || 'Retail Product').toUpperCase()}
                size="small"
                sx={{ fontWeight: 800, mb: 1.5, bgcolor: isPod ? '#7C3AED' : '#2563EB', color: '#FFFFFF' }}
              />
            );
          })()}
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
            {product?.name}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Rating value={reviewData?.data?.averageRating || product?.rating || 4.8} precision={0.1} readOnly />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              ({reviewData?.data?.count ?? 0} verified customer review{(reviewData?.data?.count ?? 0) !== 1 ? 's' : ''})
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 2 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#2563EB' }}>
              {formatPrice(currentPrice)}
            </Typography>
            {comparePrice && comparePrice > currentPrice && (
              <Typography variant="h5" sx={{ textDecoration: 'line-through', color: '#94A3B8' }}>
                {formatPrice(comparePrice)}
              </Typography>
            )}
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {product?.description}
          </Typography>

          <Divider sx={{ mb: 3 }} />

          {/* DYNAMIC VARIANT SELECTOR */}
          {hasVariants && (
            <VariantSelector
              productId={product.id}
              variants={product.variants}
              onSelectVariant={(variant) => setSelectedVariant(variant)}
            />
          )}

          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
            SKU Code: <span style={{ color: '#64748B', fontWeight: 500 }}>{currentSku}</span>
          </Typography>

          <Typography variant="body2" sx={{ fontWeight: 700, mb: 3 }}>
            Availability:{' '}
            {currentStock > 10 ? (
              <Chip label="IN STOCK" color="success" size="small" sx={{ ml: 1, fontWeight: 700 }} />
            ) : currentStock > 0 ? (
              <Chip label={`ONLY ${currentStock} LEFT`} color="warning" size="small" sx={{ ml: 1, fontWeight: 700 }} />
            ) : (
              <Chip label="OUT OF STOCK" color="error" size="small" sx={{ ml: 1, fontWeight: 700 }} />
            )}
          </Typography>

          {/* Quantity Selector & Action Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              type="number"
              label="Qty"
              size="small"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              sx={{ width: 90 }}
            />
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={currentStock <= 0}
              startIcon={<ShoppingCart size={18} />}
              onClick={handleAddToCart}
              sx={{ py: 1.5, px: 3, fontWeight: 700, borderRadius: 2 }}
            >
              Add to Cart
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              disabled={currentStock <= 0}
              onClick={handleBuyNow}
              sx={{ py: 1.5, px: 3, fontWeight: 700, borderRadius: 2 }}
            >
              Buy Now
            </Button>
            <Button
              variant={isWishlisted ? 'contained' : 'outlined'}
              color="error"
              onClick={handleToggleWishlist}
              sx={{ p: 1.5, minWidth: 0, borderRadius: 2 }}
            >
              <Heart size={20} fill={isWishlisted ? '#DC2626' : 'none'} />
            </Button>
          </Box>

          {/* LUMISE & PACKDORA 3D CUSTOMIZE BUTTON (ONLY FOR PRINT ON DEMAND PRODUCTS) */}
          {Boolean(product && (product.productType === 'print_on_demand' || product.productType === 'pod' || product.productTypeRecord?.code === 'print_on_demand' || (product as any)?.podTemplate)) && (
            <Box sx={{ mb: 4 }}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<Sparkles size={20} />}
                onClick={() => setIsPodModalOpen(true)}
                sx={{
                  py: 2,
                  fontWeight: 800,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                  },
                }}
              >
                Customize & Design (2D Studio + 3D Packaging)
              </Button>
            </Box>
          )}

          {/* POD STUDIO MODAL */}
          {Boolean(product && (product.productType === 'print_on_demand' || product.productType === 'pod' || product.productTypeRecord?.code === 'print_on_demand' || (product as any)?.podTemplate)) && (
            <PodStudioModal
              isOpen={isPodModalOpen}
              onClose={() => setIsPodModalOpen(false)}
              product={product}
              onAddToCartCustomized={handleAddToCartCustomized}
            />
          )}

          <Paper sx={{ p: 2.5, bgcolor: '#F8FAFC', borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Truck size={20} color="#2563EB" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Free shipping dispatch within 24 hours</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ShieldCheck size={20} color="#10B981" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>2-Year manufacturer warranty included</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <RotateCcw size={20} color="#8B5CF6" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>30-Day return guarantee</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* CUSTOMER REVIEWS & RATINGS COMPONENT */}
      <Divider sx={{ my: 6 }} />
      {product?.id && <ProductReviewsSection productId={product.id} />}
    </Container>
  );
};
