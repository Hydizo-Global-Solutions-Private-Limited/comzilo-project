import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  IconButton,
  TextField,
  Divider,
  MenuItem,
  Chip,
} from '@mui/material';
import { Trash2, ArrowRight, ShoppingBag, Plus, Minus, Heart, ArrowLeft, Tag, X, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getProductImage } from '../../utils/productImageService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateQuantity, removeFromCart, applyCoupon, removeCoupon } from '../../store/cartSlice';
import { toggleWishlist } from '../../store/wishlistSlice';
import { useValidateCouponMutation } from '../../api/customerPortalApi';
import { formatPrice } from '../../utils/currencyService';
import toast from 'react-hot-toast';

const AVAILABLE_OFFERS = [
  { code: 'SAVE10', title: '10% Instant Discount', discPct: 0.1, minSubtotal: 0, badge: 'POPULAR' },
  { code: 'WELCOME10', title: '₹50 Flat Welcome Discount', discFlat: 50, minSubtotal: 150, badge: 'NEW USER' },
  { code: 'FESTIVE500', title: '₹100 Mega Saver', discFlat: 100, minSubtotal: 300, badge: 'MEGA DEAL' },
  { code: 'FREESHIP', title: 'Free Express Shipping', isFreeShip: true, minSubtotal: 0, badge: 'FREE SHIPPING' },
];

export const CartPage: React.FC = () => {
  const { items, couponCode, discountAmount } = useAppSelector((state) => state.cart);
  const [couponInput, setCouponInput] = useState('');
  const [selectedDropdownCoupon, setSelectedDropdownCoupon] = useState('');
  const [validateCoupon, { isLoading: isValidating }] = useValidateCouponMutation();

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = couponCode === 'FREESHIP' ? 0 : (subtotal > 99 || subtotal === 0 ? 0 : 15);
  const tax = Math.max(0, (subtotal - discountAmount) * 0.08);
  const grandTotal = Math.max(0, subtotal + shipping + tax - discountAmount);

  const applySelectedCoupon = (code: string) => {
    if (!code) return;
    const targetCode = code.toUpperCase().trim();
    const offer = AVAILABLE_OFFERS.find((o) => o.code === targetCode);

    let disc = 10;
    if (offer) {
      if (offer.discPct) {
        disc = Math.round(subtotal * offer.discPct * 100) / 100;
      } else if (offer.discFlat) {
        disc = Math.min(subtotal, offer.discFlat);
      } else if (offer.isFreeShip) {
        disc = 15;
      }
    } else {
      disc = Math.round(subtotal * 0.1 * 100) / 100;
    }

    dispatch(applyCoupon({ code: targetCode, discount: disc }));
    setSelectedDropdownCoupon(targetCode);
    toast.success(`Coupon "${targetCode}" applied! Saved ${formatPrice(disc)}`);
    setCouponInput('');
  };

  const handleDropdownChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedDropdownCoupon(val);
    if (val) {
      applySelectedCoupon(val);
    } else {
      dispatch(removeCoupon());
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.error('Please enter a coupon promo code');
      return;
    }

    const upperCode = couponInput.trim().toUpperCase();
    try {
      const res = await validateCoupon({ code: upperCode, subtotal }).unwrap();
      const disc = res.data?.discountAmount || Math.round(subtotal * 0.1 * 100) / 100;
      dispatch(applyCoupon({ code: res.data?.code || upperCode, discount: disc }));
      setSelectedDropdownCoupon(res.data?.code || upperCode);
      toast.success(`Coupon ${res.data?.code || upperCode} applied! Saved ${formatPrice(disc)}`);
      setCouponInput('');
    } catch {
      applySelectedCoupon(upperCode);
    }
  };

  const handleRemoveCoupon = () => {
    dispatch(removeCoupon());
    setSelectedDropdownCoupon('');
    toast.success('Coupon removed.');
  };

  const handleSaveForLater = (item: any) => {
    dispatch(toggleWishlist(item));
    dispatch(removeFromCart(item.id));
    toast.success(`${item.name} moved to wishlist`);
  };

  if (items.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 10, textAlign: 'center' }}>
        <Paper sx={{ p: 6, borderRadius: 4, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
          <ShoppingBag size={64} color="#94A3B8" />
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 2, mb: 1, color: '#0F172A' }}>
            Your Shopping Cart is Empty
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Explore our tech catalog and add your favorite items to cart.
          </Typography>
          <Button component={Link} to="/products" variant="contained" size="large" sx={{ fontWeight: 700, px: 4, py: 1.5, borderRadius: 2 }}>
            Browse Storefront
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
          Shopping Cart ({items.length} Items)
        </Typography>
        <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/products')}>
          Continue Shopping
        </Button>
      </Box>

      <Grid container spacing={4}>
        {/* 1. Cart Items Review Table */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ borderRadius: 3, p: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            {items.map((item, idx) => (
              <React.Fragment key={item.id}>
                {idx > 0 && <Divider sx={{ my: 2.5 }} />}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                  <Box
                    component="img"
                    src={item.image || (item as any).customization?.previewImage || getProductImage(item)}
                    alt={item.name}
                    sx={{ width: 90, height: 90, objectFit: 'contain', borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      SKU: PROD-{String(item.id).padStart(4, '0')}
                    </Typography>
                    {(item as any).customization && (
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        <Chip
                          label="🎨 Custom Design Attached (Front, Back, Left, Right)"
                          color="secondary"
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                        />
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        size="small"
                        startIcon={<Heart size={14} />}
                        onClick={() => handleSaveForLater(item)}
                        sx={{ fontSize: '0.75rem', p: 0 }}
                      >
                        Save for Later
                      </Button>
                    </Box>
                  </Box>

                  {/* Quantity Controller */}
                  <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid #CBD5E1', borderRadius: 2 }}>
                    <IconButton
                      size="small"
                      onClick={() => dispatch(updateQuantity({ id: item.id, quantity: Math.max(1, item.quantity - 1) }))}
                    >
                      <Minus size={14} />
                    </IconButton>
                    <Typography variant="body2" sx={{ px: 1.5, fontWeight: 700 }}>
                      {item.quantity}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                    >
                      <Plus size={14} />
                    </IconButton>
                  </Box>

                  <Typography variant="subtitle1" sx={{ fontWeight: 800, minWidth: 90, textAlign: 'right', color: '#0F172A' }}>
                    {formatPrice(item.price * item.quantity)}
                  </Typography>

                  <IconButton color="error" onClick={() => dispatch(removeFromCart(item.id))}>
                    <Trash2 size={18} />
                  </IconButton>
                </Box>
              </React.Fragment>
            ))}
          </Paper>
        </Grid>

        {/* 2. Order Total & Coupon Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: '#0F172A' }}>
              Order Summary
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary">Subtotal</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatPrice(subtotal)}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary">Shipping Fee</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {shipping === 0 ? 'FREE' : formatPrice(shipping)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary">Estimated Tax (8%)</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatPrice(tax)}</Typography>
            </Box>

            {discountAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, color: '#10B981', bgcolor: '#ECFDF5', p: 1.5, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tag size={16} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Coupon ({couponCode})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    -{formatPrice(discountAmount)}
                  </Typography>
                  <IconButton size="small" onClick={handleRemoveCoupon} sx={{ color: '#EF4444', p: 0.2 }}>
                    <X size={16} />
                  </IconButton>
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Grand Total</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#2563EB' }}>{formatPrice(grandTotal)}</Typography>
            </Box>

            {/* Dropdown Coupon Picker */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 0.8, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Sparkles size={14} color="#0284C7" /> Select Available Coupon
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={selectedDropdownCoupon || couponCode || ''}
                onChange={handleDropdownChange}
                sx={{
                  bgcolor: '#F8FAFC',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-root': { fontWeight: 700 },
                }}
              >
                <MenuItem value="">
                  <em>-- Select a Promo Coupon --</em>
                </MenuItem>
                {AVAILABLE_OFFERS.map((off) => (
                  <MenuItem key={off.code} value={off.code}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0284C7' }}>
                        {off.code} - {off.title}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* Manual Promo Code Entry */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <TextField
                placeholder="Or Enter Custom Promo Code"
                size="small"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                fullWidth
              />
              <Button variant="outlined" disabled={isValidating} onClick={handleApplyCoupon} sx={{ fontWeight: 700 }}>
                Apply
              </Button>
            </Box>

            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              endIcon={<ArrowRight size={18} />}
              onClick={() => navigate('/checkout')}
              sx={{ py: 1.5, fontWeight: 800, borderRadius: 2 }}
            >
              Proceed to Checkout
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
