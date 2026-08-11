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
import { Plus, Search, Ban, Eye, Sparkles, Shirt, Calendar, User } from 'lucide-react';
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
      headerName: 'Custom Design',
      width: 140,
      renderCell: (params) => {
        const items = params.row.items || [];
        const customItem = items.find((i: any) => i.customization || i.customDesign);
        const previewUrl = customItem?.customization?.previewImage || customItem?.customization?.previewUrl || customItem?.image || 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=150';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Box
              component="img"
              src={previewUrl}
              alt="Custom Design"
              sx={{ width: 36, height: 36, borderRadius: 1.5, objectFit: 'cover', border: '1px solid #E2E8F0' }}
            />
            {customItem && (
              <Chip label="Customized" size="small" color="secondary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} />
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

                        {/* Sides Artwork Summary */}
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mb: 1 }}>
                            🎨 Customer Design Elements Summary
                          </Typography>
                          {cust.sides ? (
                            Object.entries(cust.sides).map(([side, data]: [string, any]) => {
                              const els = data?.elements || [];
                              if (els.length === 0) return null;
                              return (
                                <Box key={side} sx={{ mb: 1, p: 1.5, bgcolor: '#F1F5F9', borderRadius: 2 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#0D9488', display: 'block', mb: 0.5 }}>
                                    Side: {side} ({els.length} element{els.length > 1 ? 's' : ''})
                                  </Typography>
                                  {els.map((el: any, i: number) => (
                                    <Typography key={i} variant="caption" sx={{ display: 'block', color: '#475569', fontSize: '0.75rem' }}>
                                      • Type: <strong>{el.type}</strong> | Content: <em>{el.content?.slice(0, 30)}</em>
                                    </Typography>
                                  ))}
                                </Box>
                              );
                            })
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Custom design configured with active layout parameters.
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                );
              })()}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid #E2E8F0' }}>
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
