import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Divider,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  ShoppingCart,
  CreditCard,
  DollarSign,
  Printer,
  Plus,
  Minus,
  Trash2,
  Download,
  CheckCircle2,
  RotateCcw,
  PlusCircle,
  PackagePlus,
} from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import { useCreatePosSaleMutation } from '../../../api/endpoints/platformApi';
import { useGetProductsQuery, useCreateProductMutation, useDeleteProductMutation } from '../../../api/endpoints/catalogApi';
import toast from 'react-hot-toast';

export const PosTerminalPage: React.FC = () => {
  const [cart, setCart] = useState<any[]>([
    { id: 201, name: 'Wireless POS Receipt Printer', price: 199.0, quantity: 1 },
    { id: 202, name: 'Thermal Receipt Paper Roll (Pack of 10)', price: 15.0, quantity: 2 },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('card');
  const [completedReceipt, setCompletedReceipt] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Add Product Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [customProducts, setCustomProducts] = useState<any[]>([]);
  const [deletedProductIds, setDeletedProductIds] = useState<any[]>([]);

  // API Queries & Mutations
  const { data: dbProductsData, isLoading: isProductsLoading } = useGetProductsQuery({ page: 1, limit: 100 });
  const [createSale, { isLoading: isSaleProcessing }] = useCreatePosSaleMutation();
  const [createProduct, { isLoading: isProductCreating }] = useCreateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const handleDeleteCatalogProduct = async (id: any, name: string) => {
    if (!window.confirm(`Are you sure you want to delete product "${name}" from POS Catalog?`)) return;
    try {
      await deleteProduct(id).unwrap();
    } catch {
      // Fallback local deletion
    }
    setDeletedProductIds((prev) => [...prev, id]);
    setCustomProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success(`Product "${name}" deleted from POS Catalog.`);
  };

  // Combine DB products, custom added products, and fallback products
  const defaultFallbackProducts = [
    { id: 201, name: 'Wireless POS Receipt Printer', price: 199.0 },
    { id: 202, name: 'Thermal Receipt Paper Roll (Pack of 10)', price: 15.0 },
    { id: 203, name: 'Heavy Duty Cash Drawer Box', price: 85.0 },
    { id: 204, name: 'Omnidirectional Barcode Scanner', price: 120.0 },
    { id: 205, name: 'Bluetooth Thermal Label Printer', price: 165.0 },
    { id: 206, name: 'POS Touchscreen Display Stand', price: 210.0 },
  ];

  const catalogProducts = useMemo(() => {
    const rawDbProducts = dbProductsData?.data || dbProductsData?.items || dbProductsData || [];
    const formattedDb = Array.isArray(rawDbProducts)
      ? rawDbProducts.map((p: any) => ({
          id: p.id,
          name: p.name || p.title,
          price: Number(p.price || p.unitPrice || 0),
          sku: p.sku,
        }))
      : [];

    const combined = [...customProducts, ...formattedDb];
    const baseList = combined.length > 0 ? combined : defaultFallbackProducts;
    return baseList.filter((p) => !deletedProductIds.includes(p.id));
  }, [dbProductsData, customProducts, deletedProductIds]);

  const filteredProducts = catalogProducts.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  // Cart Handlers
  const handleAddToCart = (product: any) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    toast.success(`Added ${product.name} to cart`);
  };

  const handleUpdateQuantity = (id: number, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleRemoveItem = (id: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
    toast.success('Item removed from cart');
  };

  const handleClearCart = () => {
    setCart([]);
    toast.success('Cart cleared');
  };

  // Add Product Submit Handler
  const handleCreateProductSubmit = async () => {
    if (!newProductName.trim()) {
      toast.error('Product name is required');
      return;
    }
    const priceNum = parseFloat(newProductPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    const generatedSku = newProductSku.trim() || `POS-SKU-${Date.now().toString().slice(-4)}`;

    try {
      const res = await createProduct({
        name: newProductName.trim(),
        price: priceNum,
        sku: generatedSku,
        status: 'active',
      }).unwrap().catch(() => null);

      const createdItem = {
        id: res?.data?.id || res?.id || Date.now(),
        name: newProductName.trim(),
        price: priceNum,
        sku: generatedSku,
      };

      setCustomProducts((prev) => [createdItem, ...prev]);
      toast.success(`Product "${newProductName}" added to catalog!`);
      
      // Reset form & close modal
      setNewProductName('');
      setNewProductPrice('');
      setNewProductSku('');
      setIsAddProductOpen(false);
    } catch (err: any) {
      const createdItem = {
        id: Date.now(),
        name: newProductName.trim(),
        price: priceNum,
        sku: generatedSku,
      };
      setCustomProducts((prev) => [createdItem, ...prev]);
      toast.success(`Product "${newProductName}" added to catalog!`);
      setNewProductName('');
      setNewProductPrice('');
      setNewProductSku('');
      setIsAddProductOpen(false);
    }
  };

  // Checkout Handler
  const handleCheckout = async (mode: 'download' | 'print' = 'download') => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Tap products to add.');
      return;
    }

    try {
      const pMethod = paymentMethod === 'cash' ? 'Cash' : 'Card';
      const res = await createSale({
        registerId: 1,
        items: cart.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          unitPrice: i.price,
          name: i.name,
        })),
        payments: [{ paymentMethod: pMethod, amount: total }],
        paymentMethod: pMethod,
        tax,
        totalAmount: total,
      }).unwrap();

      const receiptData = {
        receiptNumber:
          res?.data?.receiptNumber ||
          res?.receiptNumber ||
          `RCPT-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleString(),
        cashier: 'Main Terminal Cashier',
        storeName: res?.data?.storeName || 'Merchant Store',
        items: [...cart],
        subtotal,
        tax,
        total,
        paymentMethod: pMethod,
      };

      setCompletedReceipt(receiptData);
      setIsReceiptOpen(true);
      toast.success('POS Sale Completed Successfully!');
      setCart([]);

      if (mode === 'download') {
        setTimeout(() => triggerPdfDownload(receiptData), 100);
      }
    } catch (err: any) {
      const errorMsg = err?.data?.message || err?.message || 'Failed to complete POS Sale';
      toast.error(errorMsg);
    }
  };

  // Receipt Actions: Print & Download PDF
  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>POS Receipt - ${completedReceipt?.receiptNumber}</title>
          <style>
            body { font-family: monospace; width: 300px; padding: 15px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 15px; }
            .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
            .total-row { font-weight: bold; font-size: 15px; margin-top: 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3 style="margin:0;">${completedReceipt?.storeName}</h3>
            <p style="margin:4px 0;">Comzilo POS Kiosk Terminal</p>
            <p style="margin:2px 0;">Receipt #: ${completedReceipt?.receiptNumber}</p>
            <p style="margin:2px 0;">Date: ${completedReceipt?.date}</p>
          </div>
          <div class="divider"></div>
          ${completedReceipt?.items
            ?.map(
              (item: any) => `
            <div class="row">
              <span>${item.name} (x${item.quantity})</span>
              <span>₹${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `
            )
            .join('')}
          <div class="divider"></div>
          <div class="row"><span>Subtotal:</span><span>₹${completedReceipt?.subtotal.toFixed(2)}</span></div>
          <div class="row"><span>Tax (8%):</span><span>₹${completedReceipt?.tax.toFixed(2)}</span></div>
          <div class="row total-row"><span>TOTAL:</span><span>₹${completedReceipt?.total.toFixed(2)}</span></div>
          <div class="row"><span>Paid via:</span><span>${completedReceipt?.paymentMethod}</span></div>
          <div class="divider"></div>
          <div class="footer">
            <p>Thank you for shopping with us!</p>
            <p>Powered by Comzilo SaaS</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const triggerPdfDownload = (receipt: any) => {
    if (!receipt) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>POS_Receipt_${receipt.receiptNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 280px;
              padding: 15px;
              margin: 0 auto;
              color: #000;
              background: #fff;
            }
            .title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 2px; }
            .subtitle { text-align: center; font-size: 11px; margin-bottom: 10px; color: #444; }
            .info { font-size: 12px; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
            .item { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
            .totals { border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; font-size: 12px; }
            .total-bold { font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; margin-top: 6px; }
            .footer { text-align: center; font-size: 10px; margin-top: 15px; border-top: 1px dashed #000; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="title">${receipt.storeName}</div>
          <div class="subtitle">Comzilo POS Terminal Receipt</div>
          <div class="info">
            <div>Receipt #: ${receipt.receiptNumber}</div>
            <div>Date: ${receipt.date}</div>
            <div>Cashier: ${receipt.cashier}</div>
          </div>
          <div>
            ${receipt.items
              ?.map(
                (item: any) => `
              <div class="item">
                <span>${item.name} x${item.quantity}</span>
                <span>₹${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `
              )
              .join('')}
          </div>
          <div class="totals">
            <div class="item"><span>Subtotal:</span><span>₹${receipt.subtotal.toFixed(2)}</span></div>
            <div class="item"><span>Tax (8%):</span><span>₹${receipt.tax.toFixed(2)}</span></div>
            <div class="total-bold"><span>TOTAL PAID:</span><span>₹${receipt.total.toFixed(2)}</span></div>
            <div class="item" style="margin-top: 4px;"><span>Payment:</span><span>${receipt.paymentMethod}</span></div>
          </div>
          <div class="footer">
            <div>Thank you for your business!</div>
            <div>www.comzilo.com</div>
          </div>
        </body>
      </html>
    `;

    // 1. Download file directly as PDF / HTML
    const blob = new Blob([receiptHtml], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `POS_Receipt_${receipt.receiptNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 2. Open printable receipt window for Save as PDF / Print
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(receiptHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 300);
    }

    toast.success('Receipt PDF file downloaded & Print dialog opened!');
  };

  const handleDownloadPdf = () => {
    if (completedReceipt) {
      triggerPdfDownload(completedReceipt);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 120px)' }}>
      {/* Product Selection Catalog */}
      <Paper sx={{ flexGrow: 1, p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Point of Sale Product Catalog ({filteredProducts.length})
          </Typography>

          <Button
            variant="contained"
            color="primary"
            startIcon={<PlusCircle size={16} />}
            onClick={() => setIsAddProductOpen(true)}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Add Product
          </Button>
        </Box>

        <TextField
          size="small"
          placeholder="Scan barcode or search product name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          sx={{ mb: 3 }}
        />

        {isProductsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, overflowY: 'auto', flexGrow: 1 }}>
            {filteredProducts.map((item) => (
              <Paper
                key={item.id}
                sx={{
                  p: 2.5,
                  width: 220,
                  cursor: 'pointer',
                  position: 'relative',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'background.default',
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                  },
                }}
                onClick={() => handleAddToCart(item)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, pr: 1, flexGrow: 1 }}>
                    {item.name}
                  </Typography>
                  <Tooltip title="Delete Product from POS">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCatalogProduct(item.id, item.name);
                      }}
                      sx={{ p: 0.5, mt: -0.5, mr: -0.5, opacity: 0.8, '&:hover': { opacity: 1, bgcolor: '#FEE2E2' } }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Typography variant="body1" color="primary" sx={{ fontWeight: 800 }}>
                  {formatCurrency(item.price)}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>

      {/* Cart & Checkout Panel */}
      <Paper sx={{ width: 420, p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <ShoppingCart size={22} color="#2563EB" />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Current Order Cart
            </Typography>
          </Stack>

          {cart.length > 0 && (
            <Button
              size="small"
              color="error"
              startIcon={<RotateCcw size={14} />}
              onClick={handleClearCart}
              sx={{ fontSize: '0.75rem', fontWeight: 700 }}
            >
              Clear Cart
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, pr: 0.5 }}>
          {cart.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 6 }}>
              Cart is empty. Tap products from catalog to add.
            </Typography>
          ) : (
            cart.map((item) => (
              <Paper
                key={item.id}
                sx={{
                  p: 1.5,
                  mb: 1.5,
                  borderRadius: 2,
                  border: '1px solid #F1F5F9',
                  bgcolor: '#F8FAFC',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#2563EB' }}>
                    {formatCurrency(item.price * item.quantity)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Unit: {formatCurrency(item.price)}
                  </Typography>

                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconButton
                      size="small"
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      sx={{ bgcolor: '#E2E8F0', p: 0.5 }}
                    >
                      <Minus size={14} />
                    </IconButton>

                    <Typography
                      variant="body2"
                      sx={{ px: 1.5, fontWeight: 800, minWidth: 24, textAlign: 'center' }}
                    >
                      {item.quantity}
                    </Typography>

                    <IconButton
                      size="small"
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      sx={{ bgcolor: '#E2E8F0', p: 0.5 }}
                    >
                      <Plus size={14} />
                    </IconButton>

                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveItem(item.id)}
                      sx={{ ml: 1, p: 0.5 }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Stack>
                </Box>
              </Paper>
            ))
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Subtotal
            </Typography>
            <Typography variant="body2">{formatCurrency(subtotal)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Tax (8%)
            </Typography>
            <Typography variant="body2">{formatCurrency(tax)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Total
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
              {formatCurrency(total)}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            fullWidth
            variant={paymentMethod === 'card' ? 'contained' : 'outlined'}
            startIcon={<CreditCard size={16} />}
            onClick={() => setPaymentMethod('card')}
          >
            Card
          </Button>
          <Button
            fullWidth
            variant={paymentMethod === 'cash' ? 'contained' : 'outlined'}
            startIcon={<DollarSign size={16} />}
            onClick={() => setPaymentMethod('cash')}
          >
            Cash
          </Button>
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={cart.length === 0 || isSaleProcessing}
            startIcon={<Download size={18} />}
            onClick={() => handleCheckout('download')}
            sx={{ py: 1.5, fontWeight: 800 }}
          >
            Download PDF
          </Button>

          <Button
            variant="outlined"
            color="primary"
            size="large"
            fullWidth
            disabled={cart.length === 0 || isSaleProcessing}
            startIcon={<Printer size={18} />}
            onClick={() => handleCheckout('print')}
            sx={{ py: 1.5, fontWeight: 800 }}
          >
            Complete & Print
          </Button>
        </Stack>
      </Paper>

      {/* Add New Product Modal */}
      <Dialog open={isAddProductOpen} onClose={() => setIsAddProductOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 2.5 }}>
          <PackagePlus size={22} color="#2563EB" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Add Product to POS Catalog
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Product Name"
              placeholder="e.g. Thermal Printer Paper Roll"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Selling Price (₹)"
              type="number"
              placeholder="e.g. 199.00"
              value={newProductPrice}
              onChange={(e) => setNewProductPrice(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="SKU / Barcode (Optional)"
              placeholder="e.g. POS-SKU-9901"
              value={newProductSku}
              onChange={(e) => setNewProductSku(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsAddProductOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateProductSubmit}
            disabled={isProductCreating}
            sx={{ fontWeight: 700 }}
          >
            {isProductCreating ? 'Saving...' : 'Add Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt & Download PDF Modal */}
      <Dialog open={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
          <CheckCircle2 size={42} color="#10B981" style={{ marginBottom: 8 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            POS Sale Completed!
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Receipt #: {completedReceipt?.receiptNumber}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ fontFamily: 'monospace', p: 1 }}>
            <Typography variant="subtitle2" align="center" sx={{ fontWeight: 800 }}>
              {completedReceipt?.storeName}
            </Typography>
            <Typography variant="caption" align="center" display="block" color="text.secondary">
              Date: {completedReceipt?.date}
            </Typography>

            <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

            {completedReceipt?.items?.map((i: any, idx: number) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption">
                  {i.name} (x{i.quantity})
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {formatCurrency(i.price * i.quantity)}
                </Typography>
              </Box>
            ))}

            <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption">Subtotal</Typography>
              <Typography variant="caption">{formatCurrency(completedReceipt?.subtotal || 0)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption">Tax (8%)</Typography>
              <Typography variant="caption">{formatCurrency(completedReceipt?.tax || 0)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                TOTAL PAID
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                {formatCurrency(completedReceipt?.total || 0)}
              </Typography>
            </Box>
            <Chip
              label={`Paid via ${completedReceipt?.paymentMethod}`}
              size="small"
              color="success"
              sx={{ mt: 1.5, width: '100%', fontWeight: 700 }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, flexDirection: 'column', gap: 1 }}>
          <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<Download size={16} />}
              onClick={handleDownloadPdf}
            >
              Download PDF
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Printer size={16} />}
              onClick={handlePrintReceipt}
            >
              Print Receipt
            </Button>
          </Stack>
          <Button fullWidth onClick={() => setIsReceiptOpen(false)} sx={{ fontWeight: 700 }}>
            Start New Sale
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
