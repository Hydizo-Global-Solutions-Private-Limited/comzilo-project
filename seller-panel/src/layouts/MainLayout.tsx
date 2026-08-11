import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  Tooltip,
  Collapse,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  Warehouse as WarehouseIcon,
  Boxes,
  UsersRound,
  ShoppingCart,
  Receipt,
  CreditCard,
  MonitorCheck,
  BarChart3,
  Bell,
  Settings as SettingsIcon,
  Webhook,
  LogOut,
  Sun,
  Moon,
  Truck,
  Globe,
  Send,
  MapPin,
  FileText,
  Activity,
  PackageCheck,
  TrendingUp,
  Layers,
  ArrowRightLeft,
  Sliders,
  FileSpreadsheet,
  FileCheck,
  Barcode as BarcodeIcon,
  QrCode,
  Calendar,
  AlertTriangle,
  Printer,
  Server,
  MessageSquare,
  Ticket,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Search,
  RotateCcw,
  DollarSign,
  TrendingDown,
  Percent,
  Star,
  LifeBuoy,
  UserCheck,
  Gift,
  Store,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { toggleTheme } from '../store/slices/themeSlice';

const DRAWER_WIDTH = 270;

interface SubNavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: string;
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: SubNavItem[];
}

interface StandaloneNavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: string;
}

export const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const { user, tenant } = useAppSelector((state) => state.auth);
  const { mode } = useAppSelector((state) => state.theme);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const navGroups: NavGroup[] = [
    {
      id: 'catalog',
      label: 'Catalog',
      icon: <Package size={19} />,
      items: [
        { label: 'Products', path: '/products', icon: <Package size={17} />, permission: 'product.read' },
        { label: 'Categories', path: '/categories', icon: <FolderTree size={17} />, permission: 'category.read' },
        { label: 'Brands & Tags', path: '/tags', icon: <Tags size={17} />, permission: 'tag.read' },
      ],
    },
    {
      id: 'sales',
      label: 'Sales',
      icon: <ShoppingCart size={19} />,
      items: [
        { label: 'Customers', path: '/customers', icon: <UsersRound size={17} />, permission: 'customer.read' },
        { label: 'Sales Orders', path: '/orders', icon: <ShoppingCart size={17} />, permission: 'order.read' },
        { label: 'Returns', path: '/refunds', icon: <RotateCcw size={17} />, badge: 'RMA', permission: 'refund.read' },
        { label: 'Invoices', path: '/invoices', icon: <Receipt size={17} />, permission: 'invoice.read' },
        { label: 'Payments', path: '/payments', icon: <CreditCard size={17} />, permission: 'payment.read' },
      ],
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: <Boxes size={19} />,
      items: [
        { label: 'Inventory Dashboard', path: '/inventory/dashboard', icon: <TrendingUp size={17} /> },
        { label: 'Warehouses', path: '/inventory/warehouses', icon: <WarehouseIcon size={17} />, permission: 'warehouse.read' },
        { label: 'Warehouse Locations', path: '/inventory/locations', icon: <MapPin size={17} /> },
        { label: 'Inventory Balances', path: '/inventory/balances', icon: <Boxes size={17} />, permission: 'inventory.read' },
        { label: 'Stock Management', path: '/inventory/stock-management', icon: <Layers size={17} /> },
        { label: 'Stock Transfers', path: '/inventory/transfers', icon: <ArrowRightLeft size={17} /> },
        { label: 'Stock Adjustments', path: '/inventory/adjustments', icon: <Sliders size={17} /> },
        { label: 'Suppliers', path: '/inventory/suppliers', icon: <UsersRound size={17} /> },
        { label: 'Purchase Orders', path: '/inventory/purchase-orders', icon: <FileSpreadsheet size={17} /> },
        { label: 'Goods Receipt (GRN)', path: '/inventory/grn', icon: <FileCheck size={17} /> },
        { label: 'Goods Issue (GIN)', path: '/inventory/gin', icon: <FileText size={17} /> },
        { label: 'Barcode', path: '/inventory/barcode', icon: <BarcodeIcon size={17} /> },
        { label: 'Serial Numbers', path: '/inventory/serials', icon: <QrCode size={17} /> },
        { label: 'Batch Management', path: '/inventory/batches', icon: <Layers size={17} /> },
        { label: 'Expiry Management', path: '/inventory/expiry', icon: <Calendar size={17} /> },
        { label: 'Inventory Reports', path: '/inventory/reports', icon: <AlertTriangle size={17} /> },
      ],
    },
    {
      id: 'shipping',
      label: 'Shipping',
      icon: <Truck size={19} />,
      items: [
        { label: 'Shipping Providers', path: '/settings/shipping-providers', icon: <Truck size={17} /> },
        { label: 'Shipping Zones', path: '/settings/shipping/zones', icon: <Globe size={17} /> },
        { label: 'Shipping Methods', path: '/settings/shipping/methods', icon: <Send size={17} /> },
        { label: 'Pickup Addresses', path: '/settings/shipping/pickup-addresses', icon: <MapPin size={17} /> },
        { label: 'Packaging', path: '/settings/shipping/packaging', icon: <PackageCheck size={17} /> },
        { label: 'Shipping Labels', path: '/settings/shipping/labels', icon: <FileText size={17} /> },
        { label: 'Shipment Logs', path: '/settings/shipping/logs', icon: <Activity size={17} /> },
      ],
    },
    {
      id: 'marketing',
      label: 'Marketing',
      icon: <Send size={19} />,
      items: [
        { label: 'Marketing Dashboard', path: '/marketing/dashboard', icon: <BarChart3 size={17} /> },
        { label: 'Email Providers', path: '/marketing/email-providers', icon: <Server size={17} /> },
        { label: 'Email Templates', path: '/marketing/email-templates', icon: <FileText size={17} /> },
        { label: 'Campaigns', path: '/marketing/campaigns', icon: <Send size={17} /> },
        { label: 'Coupons & Discounts', path: '/marketing/coupons', icon: <Ticket size={17} /> },
        { label: 'Abandoned Carts', path: '/marketing/abandoned-carts', icon: <ShoppingCart size={17} /> },
        { label: 'Customer Segments', path: '/marketing/segments', icon: <UsersRound size={17} /> },
        { label: 'Automation Rules', path: '/marketing/automation-rules', icon: <GitBranch size={17} /> },
        { label: 'Marketing Analytics', path: '/marketing/analytics', icon: <BarChart3 size={17} /> },
      ],
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: <DollarSign size={19} />,
      items: [
        { label: 'Financial Dashboard', path: '/finance/dashboard', icon: <BarChart3 size={17} /> },
        { label: 'Customer Payments', path: '/customer/payments', icon: <Receipt size={17} /> },
        { label: 'Wallet', path: '/wallet', icon: <Wallet size={17} /> },
        { label: 'Bank Account', path: '/finance/bank-account', icon: <ShieldCheck size={17} /> },
        { label: 'Settlement Requests', path: '/withdrawals', icon: <DollarSign size={17} /> },
        { label: 'Payout History', path: '/finance/payments', icon: <CreditCard size={17} /> },
        { label: 'Transactions', path: '/finance/payments', icon: <CreditCard size={17} /> },
        { label: 'Subscription & Billing', path: '/settings/subscription', icon: <CreditCard size={17} /> },
      ],
    },
    {
      id: 'store',
      label: 'Store Management',
      icon: <Store size={19} />,
      items: [
        { label: 'POS Terminal', path: '/pos', icon: <MonitorCheck size={17} />, permission: 'pos.access' },
        { label: 'Reviews', path: '/store/reviews', icon: <Star size={17} /> },
        { label: 'Support Tickets', path: '/store/support-tickets', icon: <LifeBuoy size={17} /> },
        { label: 'Staff Management', path: '/store/staff', icon: <UserCheck size={17} /> },
        { label: 'POD Templates & Print Orders', path: '/store/pod-templates', icon: <Printer size={17} /> },
        { label: 'Loyalty Program', path: '/marketing/loyalty', icon: <Gift size={17} /> },
        { label: 'Reports', path: '/reports', icon: <BarChart3 size={17} />, permission: 'report.read' },
        { label: 'Integrations', path: '/integrations', icon: <Webhook size={17} />, permission: 'integration.read' },
        { label: 'Store Settings', path: '/settings', icon: <SettingsIcon size={17} />, permission: 'settings.read' },
        { label: 'Subscription & Billing', path: '/settings/subscription', icon: <CreditCard size={17} /> },
      ],
    },
  ];

  const standaloneDashboard: StandaloneNavItem = {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard size={19} />,
  };

  const standaloneSettings: StandaloneNavItem = {
    label: 'Settings',
    path: '/settings',
    icon: <SettingsIcon size={19} />,
    permission: 'settings.read',
  };

  // Auto-expand active group on location change
  useEffect(() => {
    const currentPath = location.pathname;
    let foundGroup: string | null = null;
    for (const group of navGroups) {
      if (group.items.some((item) => item.path === currentPath || (item.path !== '/' && currentPath.startsWith(item.path + '/')))) {
        foundGroup = group.id;
        break;
      }
    }
    if (foundGroup) {
      setExpandedGroup(foundGroup);
    }
  }, [location.pathname]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleUserMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleUserMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleUserMenuClose();
    dispatch(logout());
    navigate('/login');
  };

  const handleGroupClick = (groupId: string) => {
    // Accordion requirement: only ONE major section expanded at a time
    setExpandedGroup((prev) => (prev === groupId ? null : groupId));
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (mobileOpen) setMobileOpen(false);
  };

  const hasPermission = (code?: string): boolean => {
    if (!code) return true;
    if (!user) return false;
    if (user.permissions?.includes('*')) return true;
    return user.permissions?.includes(code) ?? true;
  };

  const isRouteActive = (path: string): boolean => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: mode === 'light' ? '#FAFAFA' : '#0F172A' }}>
      {/* Header Profile Brand */}
      <Box sx={{ p: 2.5, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          src={(user as any)?.avatarUrl || (user as any)?.profileImage || (user as any)?.avatar || undefined}
          imgProps={{ style: { objectFit: 'cover' } }}
          sx={{ bgcolor: 'primary.main', fontWeight: 800, width: 40, height: 40, boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}
        >
          {!((user as any)?.avatarUrl || (user as any)?.profileImage || (user as any)?.avatar) &&
            (user?.firstName?.[0] || tenant?.name?.[0] || 'S').toUpperCase()}
        </Avatar>
        <Box sx={{ overflow: 'hidden' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.3px' }}>
            Seller ERP Portal
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.75rem' }}>
            {tenant?.name || 'Seller Store Merchant'}
          </Typography>
        </Box>
      </Box>

      {/* Sidebar Search Bar */}
      <Box sx={{ px: 2, pb: 1.5 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search navigation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} style={{ color: mode === 'light' ? '#94A3B8' : '#64748B' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              fontSize: '0.8125rem',
              bgcolor: mode === 'light' ? '#FFFFFF' : '#1E293B',
              '& fieldset': { borderColor: mode === 'light' ? '#E2E8F0' : '#334155' },
              '&:hover fieldset': { borderColor: 'primary.main' },
            },
          }}
        />
      </Box>

      <Divider sx={{ opacity: 0.6 }} />

      {/* Accordion Navigation List */}
      <List sx={{ flexGrow: 1, px: 1.5, py: 1.5, overflowY: 'auto' }}>
        {/* Standalone Dashboard */}
        {(!searchQuery || 'dashboard'.includes(searchQuery.toLowerCase())) && (
          <ListItemButton
            onClick={() => handleNavigate(standaloneDashboard.path)}
            selected={isRouteActive(standaloneDashboard.path)}
            sx={{
              borderRadius: 2,
              mb: 0.75,
              py: 1,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: '#FFFFFF',
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                '& .MuiListItemIcon-root': { color: '#FFFFFF' },
                '&:hover': { bgcolor: 'primary.dark' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: isRouteActive(standaloneDashboard.path) ? '#FFFFFF' : 'text.secondary' }}>
              {standaloneDashboard.icon}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: isRouteActive(standaloneDashboard.path) ? 700 : 500 }}>
                  {standaloneDashboard.label}
                </Typography>
              }
            />
          </ListItemButton>
        )}

        {/* Group Navigation (Accordion) */}
        {navGroups.map((group) => {
          // Filter items by search query
          const filteredItems = group.items.filter(
            (item) =>
              hasPermission(item.permission) &&
              (!searchQuery ||
                item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                group.label.toLowerCase().includes(searchQuery.toLowerCase()))
          );

          if (filteredItems.length === 0) return null;

          const isGroupExpanded = searchQuery ? true : expandedGroup === group.id;
          const isAnyChildActive = group.items.some((item) => isRouteActive(item.path));

          return (
            <Box key={group.id} sx={{ mb: 0.75 }}>
              {/* Accordion Group Header */}
              <ListItemButton
                onClick={() => handleGroupClick(group.id)}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  bgcolor: isAnyChildActive && !isGroupExpanded ? (mode === 'light' ? '#EFF6FF' : '#1E293B') : 'transparent',
                  color: isAnyChildActive ? 'primary.main' : 'text.primary',
                  '&:hover': {
                    bgcolor: mode === 'light' ? '#F1F5F9' : '#1E293B',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 34, color: isAnyChildActive ? 'primary.main' : 'text.secondary' }}>
                  {group.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: isAnyChildActive ? 700 : 600,
                        letterSpacing: '-0.1px',
                      }}
                    >
                      {group.label}
                    </Typography>
                  }
                />
                {isGroupExpanded ? (
                  <ChevronDown size={16} style={{ color: mode === 'light' ? '#64748B' : '#94A3B8' }} />
                ) : (
                  <ChevronRight size={16} style={{ color: mode === 'light' ? '#94A3B8' : '#64748B' }} />
                )}
              </ListItemButton>

              {/* Accordion Child Sub-items */}
              <Collapse in={isGroupExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2, pt: 0.5, pb: 0.5 }}>
                  {filteredItems.map((item) => {
                    const isSelected = isRouteActive(item.path);

                    return (
                      <ListItemButton
                        key={item.label}
                        onClick={() => handleNavigate(item.path)}
                        selected={isSelected}
                        sx={{
                          borderRadius: 2,
                          mb: 0.4,
                          py: 0.75,
                          pl: 1.5,
                          '&.Mui-selected': {
                            bgcolor: 'primary.main',
                            color: '#FFFFFF',
                            boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                            '& .MuiListItemIcon-root': { color: '#FFFFFF' },
                            '&:hover': { bgcolor: 'primary.dark' },
                          },
                          '&:hover': {
                            bgcolor: mode === 'light' ? '#E2E8F0' : '#334155',
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 30, color: isSelected ? '#FFFFFF' : 'text.secondary' }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: isSelected ? 600 : 500 }}>
                                {item.label}
                              </Typography>
                              {item.badge && (
                                <Chip
                                  label={item.badge}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    bgcolor: isSelected ? '#FFFFFF' : 'primary.main',
                                    color: isSelected ? 'primary.main' : '#FFFFFF',
                                  }}
                                />
                              )}
                            </Box>
                          }
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}

        <Divider sx={{ my: 1.5, opacity: 0.6 }} />

        {/* Standalone Settings */}
        {hasPermission(standaloneSettings.permission) && (!searchQuery || 'settings'.includes(searchQuery.toLowerCase())) && (
          <ListItemButton
            onClick={() => handleNavigate(standaloneSettings.path)}
            selected={isRouteActive(standaloneSettings.path)}
            sx={{
              borderRadius: 2,
              py: 1,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: '#FFFFFF',
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                '& .MuiListItemIcon-root': { color: '#FFFFFF' },
                '&:hover': { bgcolor: 'primary.dark' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: isRouteActive(standaloneSettings.path) ? '#FFFFFF' : 'text.secondary' }}>
              {standaloneSettings.icon}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: isRouteActive(standaloneSettings.path) ? 700 : 500 }}>
                  {standaloneSettings.label}
                </Typography>
              }
            />
          </ListItemButton>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Top Navbar Header */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
              <MenuIcon />
            </IconButton>

            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.3px' }}>
              Merchant Operations Portal
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Toggle Dark/Light Mode">
              <IconButton onClick={() => dispatch(toggleTheme())} color="inherit">
                {mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Account Settings">
              <IconButton onClick={handleUserMenuOpen} size="small" sx={{ ml: 1 }}>
                <Avatar
                  src={(user as any)?.avatarUrl || (user as any)?.profileImage || (user as any)?.avatar || undefined}
                  imgProps={{ style: { objectFit: 'cover' } }}
                  sx={{ width: 36, height: 36, bgcolor: '#0F172A', color: '#FFFFFF', fontWeight: 700 }}
                >
                  {!((user as any)?.avatarUrl || (user as any)?.profileImage || (user as any)?.avatar) &&
                    (user?.firstName?.[0] || 'S').toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleUserMenuClose}>
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Seller Merchant'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email || 'seller@comzilo.com'}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon sx={{ color: 'error.main', minWidth: 32 }}>
                  <LogOut size={18} />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer Sidebar */}
      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Viewport */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8,
          backgroundColor: mode === 'light' ? '#F8FAFC' : 'background.default',
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

