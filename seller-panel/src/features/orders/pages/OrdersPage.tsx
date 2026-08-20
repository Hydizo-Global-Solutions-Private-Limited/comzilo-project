import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Paper,
  Divider,
  Grid,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Plus, Search, Ban, Eye, Sparkles, Shirt, Calendar, User, Download } from 'lucide-react';
import { PageContainer } from '../../../components/layout/PageContainer';
import { DataTable } from '../../../components/data-display/DataTable';
import { useGetOrdersQuery, useCreateOrderMutation, useCancelOrderMutation } from '../../../api/endpoints/salesApi';
import { usePermission } from '../../../hooks/usePermission';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import toast from 'react-hot-toast';

export const OrdersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);

  const [formData, setFormData] = useState({
    customerId: '',
    items: [{ productId: '', quantity: 1, unitPrice: 10 }],
  });

  const canCreate = usePermission('order.create');
  const canCancel = usePermission('order.cancel');

  const { data, isLoading } = useGetOrdersQuery({ page: page + 1, limit: 10, search });
  const [createOrder, { isLoading: isCreating }] = useCreateOrderMutation();
  const [cancelOrder] = useCancelOrderMutation();

  const handleCreate = async () => {
    try {
      await createOrder({
        customerId: Number(formData.customerId),
        items: formData.items.map((i) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      }).unwrap();
      toast.success('Sales order placed successfully');
      setOpenModal(false);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to place order');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelOrder(id).unwrap();
      toast.success('Order cancelled and stock released');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to cancel order');
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'Order ID', width: 90 },
    { field: 'orderNumber', headerName: 'Order #', width: 160 },
    {
      field: 'customPreview',
      headerName: 'Print On Demand',
      width: 170,
      renderCell: (params) => {
        const items = params.row.items || [];
        const customItem = items.find((i: any) => i.customization || i.customDesign || String(i.sku || '').startsWith('POD-') || i.productName?.includes('(POD') || i.product?.productType === 'print_on_demand');
        const cust = customItem?.customization || customItem?.customDesign || {};
        const previewUrl = cust.uploadedImage || cust.previewImage || cust.previewUrl || customItem?.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Box
              component="img"
              src={previewUrl}
              alt="POD Design"
              sx={{ width: 36, height: 36, borderRadius: 1.5, objectFit: 'cover', border: '1px solid #CBD5E1', bgcolor: '#F8FAFC' }}
            />
            {customItem ? (
              <Chip label="Print On Demand" size="small" sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#7C3AED', color: '#FFFFFF' }} />
            ) : (
              <Typography variant="caption" color="text.secondary">Standard</Typography>
            )}
          </Box>
        );
      },
    },
    { field: 'totalAmount', headerName: 'Total Amount', width: 130, renderCell: (params) => formatCurrency(params.value || 0) },
    {
      field: 'paymentStatus',
      headerName: 'Payment Status',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={params.value || 'Paid'}
          color={params.value === 'paid' ? 'success' : params.value === 'refunded' ? 'error' : 'warning'}
          size="small"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Fulfillment',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value || 'pending'}
          color={params.value === 'cancelled' ? 'error' : params.value === 'completed' ? 'success' : 'info'}
          size="small"
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 160,
      renderCell: (params) => formatDateTime(params.value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<Eye size={14} />}
            onClick={() => setSelectedOrderDetails(params.row)}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            View Design
          </Button>
          {canCancel && params.row.status !== 'cancelled' && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<Ban size={14} />}
              onClick={() => handleCancel(params.row.id)}
            >
              Cancel
            </Button>
          )}
        </Box>
      ),
    },
  ];

  const rows = data?.data?.rows || data?.data?.orders || (Array.isArray(data?.data) ? data.data : []);
  const totalCount = data?.data?.count || data?.data?.total || rows.length;

  return (
    <PageContainer
      title="Sales Orders"
      subtitle="Manage customer sales orders, fulfillment, and customized POD designs"
      actionText={canCreate ? 'Create Sales Order' : undefined}
      actionIcon={<Plus size={18} />}
      onAction={() => setOpenModal(true)}
    >
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          size="small"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <Search size={18} style={{ marginRight: 8 }} />,
            },
          }}
          sx={{ maxWidth: 300 }}
        />
      </Box>

      <DataTable
        rows={rows}
        columns={columns}
        loading={isLoading}
        rowCount={totalCount}
        page={page}
        onPageChange={(p) => setPage(p)}
      />

      {/* CUSTOMIZED ORDER DETAILS MODAL */}
      <Dialog
        open={Boolean(selectedOrderDetails)}
        onClose={() => setSelectedOrderDetails(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedOrderDetails && (
          <>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #E2E8F0', py: 2 }}>
              <Sparkles color="#7C3AED" size={24} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  Customer Customization — Order #{selectedOrderDetails.orderNumber}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Placed on {formatDateTime(selectedOrderDetails.createdAt)}
                </Typography>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 3, pb: 3 }}>
              {(() => {
                const items = selectedOrderDetails.items || [];
                const customItem = items.find((i: any) => i.customization || i.customDesign) || items[0];
                const cust = customItem?.customization || {};
                const previewImg = cust.previewImage || cust.previewUrl || 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500';

                return (
                  <Grid container spacing={3}>
                    {/* Left: Customized Product Image Preview */}
                    <Grid item xs={12} md={5}>
                      <Paper elevation={0} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 3, textAlign: 'center', bgcolor: '#F8FAFC' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#475569' }}>
                          CUSTOMIZED PRODUCT IMAGE
                        </Typography>
                        <Box
                          component="img"
                          src={previewImg}
                          alt="Customer Design Preview"
                          sx={{ width: '100%', height: 260, objectFit: 'contain', borderRadius: 2, border: '1px solid #CBD5E1', bgcolor: '#FFFFFF' }}
                        />
                        {cust.productColor && (
                          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>Garment Color:</Typography>
                            <Box
                              sx={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                bgcolor: cust.productColor,
                                border: '2px solid #CBD5E1',
                              }}
                            />
                            <Typography variant="caption" sx={{ fontWeight: 800 }}>
                              {cust.productColorName || cust.productColor}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    </Grid>

                    {/* Right: Order Details & Artwork Breakdown */}
                    <Grid item xs={12} md={7}>
                      <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                            {customItem?.productName || 'Customized T-Shirt'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            SKU: {customItem?.sku || 'POD-SKU-CUSTOM'}
                          </Typography>
                        </Box>

                        <Divider />

                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Chip label={`Quantity: ${customItem?.quantity || 1}`} size="small" color="primary" sx={{ fontWeight: 700 }} />
                          <Chip label={`Total: ${formatCurrency(selectedOrderDetails.totalAmount || 0)}`} size="small" color="success" sx={{ fontWeight: 700 }} />
                          <Chip label={`Status: ${selectedOrderDetails.paymentStatus || 'paid'}`} size="small" variant="outlined" sx={{ fontWeight: 700, textTransform: 'capitalize' }} />
                        </Box>

                        <Divider />

                        {/* POD Customization Breakdown */}
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mb: 1 }}>
                            🎨 Customization Specifications
                          </Typography>
                          <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption" color="text.secondary">Template:</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: '#6366F1' }}>
                                {cust.templateName || cust.templateTitle || 'Custom Template'}
                              </Typography>
                            </Box>
                            {cust.customText && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="text.secondary">Custom Text:</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800 }}>"{cust.customText}"</Typography>
                              </Box>
                            )}
                            {cust.font && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="text.secondary">Font Style:</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>{cust.font}</Typography>
                              </Box>
                            )}
                            {cust.textColor && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary">Text Color:</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: cust.textColor, border: '1px solid #CBD5E1' }} />
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{cust.textColor}</Typography>
                                </Box>
                              </Box>
                            )}
                            {(cust.size || cust.color) && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="text.secondary">Size / Base Color:</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  {cust.size || 'Standard'} / {cust.color || cust.productColorName || 'Default'}
                                </Typography>
                              </Box>
                            )}
                            {cust.layers && Array.isArray(cust.layers) && cust.layers.length > 0 && (
                              <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #CBD5E1' }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', display: 'block', mb: 0.5 }}>
                                  Studio Layers Breakdown ({cust.layers.length}):
                                </Typography>
                                {cust.layers.map((l: any, idx: number) => (
                                  <Typography key={idx} variant="caption" sx={{ display: 'block', color: '#64748B', fontSize: 11 }}>
                                    • [{l.type?.toUpperCase()}] {l.name || l.text || 'Layer'} {l.fontSize ? `(${l.fontSize}px, ${l.fontFamily})` : ''}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                );
              })()}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
              {(() => {
                const items = selectedOrderDetails.items || [];
                const customItem = items.find((i: any) => i.customization || i.customDesign) || items[0];
                const cust = customItem?.customization || {};
                const downloadUrl = cust.uploadedImage || cust.previewImage || cust.previewUrl;
                return (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {downloadUrl && (
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<Download size={16} />}
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = downloadUrl;
                          a.download = `Print-Ready-Art-Order-${selectedOrderDetails.orderNumber}.png`;
                          a.target = '_blank';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          toast.success('Downloading print-ready PNG...');
                        }}
                        sx={{ fontWeight: 800, borderRadius: 2 }}
                      >
                        Download Print-Ready PNG
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<Download size={16} />}
                      onClick={() => {
                        const packageData = JSON.stringify({
                          orderNumber: selectedOrderDetails.orderNumber,
                          date: selectedOrderDetails.createdAt,
                          customer: selectedOrderDetails.customer,
                          product: customItem?.productName,
                          specs: cust,
                        }, null, 2);
                        const blob = new Blob([packageData], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `POD-Production-Package-${selectedOrderDetails.orderNumber}.json`;
                        a.click();
                        toast.success('Production print package exported!');
                      }}
                      sx={{ fontWeight: 700, borderRadius: 2 }}
                    >
                      Export Print Specs
                    </Button>
                  </Box>
                );
              })()}
              <Button onClick={() => setSelectedOrderDetails(null)} variant="outlined" sx={{ fontWeight: 700 }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* CREATE ORDER MODAL */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create Sales Order</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Customer ID"
            fullWidth
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
          />
          <TextField
            label="Product ID"
            fullWidth
            value={formData.items[0].productId}
            onChange={(e) =>
              setFormData({
                ...formData,
                items: [{ ...formData.items[0], productId: e.target.value }],
              })
            }
          />
          <TextField
            label="Quantity"
            type="number"
            fullWidth
            value={formData.items[0].quantity}
            onChange={(e) =>
              setFormData({
                ...formData,
                items: [{ ...formData.items[0], quantity: Number(e.target.value) }],
              })
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={isCreating}>
            {isCreating ? 'Placing...' : 'Place Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};
