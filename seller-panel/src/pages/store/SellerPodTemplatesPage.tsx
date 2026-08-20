/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Sparkles,
  Plus,
  Box,
  Printer,
  Download,
  Search,
  Tag,
  DollarSign,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Shirt,
  Smartphone,
  Eye,
  Trash2,
  Upload,
  Layers,
} from 'lucide-react';

export const SellerPodTemplatesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'create-template' | 'pod-orders'>('templates');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [templates, setTemplates] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [podOrders, setPodOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Template Form State
  const [templateTitle, setTemplateTitle] = useState<string>('');
  const [templateCategoryId, setTemplateCategoryId] = useState<number>(1);
  const [templateBasePrice, setTemplateBasePrice] = useState<number>(24.99);
  const [templateDescription, setTemplateDescription] = useState<string>('');
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [printableAreaX, setPrintableAreaX] = useState<number>(25);
  const [printableAreaY, setPrintableAreaY] = useState<number>(20);
  const [printableAreaWidth, setPrintableAreaWidth] = useState<number>(50);
  const [printableAreaHeight, setPrintableAreaHeight] = useState<number>(60);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/pod/categories`),
      axios.get(`${API_BASE}/pod/templates`),
      axios.get(`${API_BASE}/pod/orders`),
    ])
      .then(([catRes, tmplRes, orderRes]) => {
        setCategories(catRes.data?.data || []);
        setTemplates(tmplRes.data?.data || []);
        setPodOrders(orderRes.data?.data || []);
      })
      .catch(() => {
        // Fallback or retry
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Template Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast.error('Only image files (PNG, JPG, JPEG, WEBP, SVG) are allowed.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    axios
      .post(`${API_BASE}/pod/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => {
        setTemplateImage(res.data?.data?.url || res.data?.data?.path);
        toast.success('Template artwork uploaded successfully!');
      })
      .catch(() => {
        // Local FileReader fallback for instant preview
        const reader = new FileReader();
        reader.onload = (evt) => {
          setTemplateImage(evt.target?.result as string);
          toast.success('Template artwork uploaded to preview!');
        };
        reader.readAsDataURL(file);
      });
  };

  // Toggle Template Enable / Disable
  const handleToggleTemplate = (templateId: number, currentStatus: boolean) => {
    axios
      .patch(`${API_BASE}/pod/templates/${templateId}/toggle`, { isActive: !currentStatus })
      .then(() => {
        toast.success(`Template ${!currentStatus ? 'Enabled' : 'Disabled'}!`);
        fetchData();
      })
      .catch(() => toast.error('Failed to update template status'));
  };

  // Create Template Submit
  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateTitle.trim()) {
      toast.error('Please enter a template title');
      return;
    }

    setIsSubmitting(true);
    const selectedCat = categories.find((c) => Number(c.id) === Number(templateCategoryId));
    const isApparel = selectedCat?.slug === 't-shirts' || templateCategoryId === 1;

    const payload = {
      title: templateTitle.trim(),
      categoryId: Number(templateCategoryId),
      basePrice: Number(templateBasePrice),
      description: templateDescription.trim(),
      thumbnailUrl: templateImage || (isApparel ? '/pod/pod_tshirt.png' : '/pod/pod_phone_case.png'),
      printableArea: {
        x: Number(printableAreaX),
        y: Number(printableAreaY),
        width: Number(printableAreaWidth),
        height: Number(printableAreaHeight),
        shape: isApparel ? 'rectangle' : 'rounded-rect',
      },
      allowedColors: isApparel
        ? ['#FFFFFF', '#0F172A', '#1E3A8A', '#DC2626', '#64748B']
        : ['#FFFFFF', '#0F172A', '#F59E0B', '#3B82F6'],
      allowedSizes: isApparel
        ? ['S', 'M', 'L', 'XL', 'XXL']
        : ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'Samsung Galaxy S24 Ultra', 'Google Pixel 8 Pro'],
      isActive: true,
    };

    axios
      .post(`${API_BASE}/pod/templates`, payload)
      .then(() => {
        toast.success('POD Design Template created successfully!');
        setTemplateTitle('');
        setTemplateDescription('');
        setTemplateImage(null);
        setActiveTab('templates');
        fetchData();
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to create template');
      })
      .finally(() => setIsSubmitting(false));
  };

  // Download Customer Uploaded Design
  const handleDownloadDesign = (order: any) => {
    const imageUrl = order.uploadedImageUrl || order.previewImageUrl;
    if (imageUrl) {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = `POD-Artwork-Order-${order.orderId || order.id || 'Design'}.png`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Downloading customer design asset...');
    } else {
      toast.error('No custom uploaded image attached for this design.');
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 't-shirts') return t.categoryId === 1 || t.category?.slug === 't-shirts';
    if (categoryFilter === 'phone-covers') return t.categoryId === 2 || t.category?.slug === 'phone-back-covers';
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-extrabold tracking-tight">Print-On-Demand (POD) Management</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Manage product templates, assign categories, set base prices, define printable zones, and fulfill custom print orders.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('create-template')}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> Create New Template
        </button>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          {[
            { id: 'templates', label: `Templates (${templates.length})`, icon: Sparkles },
            { id: 'create-template', label: 'Create Template', icon: Plus },
            { id: 'pod-orders', label: `Print Orders (${podOrders.length})`, icon: Printer },
          ].map((tab) => {
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <IconComp className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Category Filter for Templates tab */}
        {activeTab === 'templates' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="t-shirts">T-Shirts</option>
              <option value="phone-covers">Phone Back Covers</option>
            </select>
          </div>
        )}
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 font-medium">Loading POD Management data...</div>
      ) : (
        <>
          {/* 1. TEMPLATES LIST TAB */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {filteredTemplates.map((tmpl) => {
                const isTshirt = tmpl.categoryId === 1 || tmpl.category?.slug === 't-shirts';
                return (
                  <div
                    key={tmpl.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-indigo-500/50 transition-all group"
                  >
                    <div>
                      {/* Image Preview & Printable Area Indicator */}
                      <div className="relative w-full h-44 bg-slate-950 rounded-xl overflow-hidden mb-4 border border-slate-800 flex items-center justify-center">
                        <img
                          src={tmpl.thumbnailUrl || (isTshirt ? '/pod/pod_tshirt.png' : '/pod/pod_phone_case.png')}
                          alt={tmpl.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Printable Area Overlay */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${tmpl.printableArea?.x || 25}%`,
                            top: `${tmpl.printableArea?.y || 20}%`,
                            width: `${tmpl.printableArea?.width || 50}%`,
                            height: `${tmpl.printableArea?.height || 60}%`,
                          }}
                          className="border-2 border-dashed border-indigo-400 bg-indigo-500/10 rounded pointer-events-none flex items-center justify-center"
                        >
                          <span className="text-[9px] font-bold text-white bg-indigo-600/80 px-1 rounded">Print Area</span>
                        </div>

                        <span
                          className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tmpl.isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                          }`}
                        >
                          {tmpl.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/50 flex items-center gap-1">
                          {isTshirt ? <Shirt className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                          {tmpl.category?.name || (isTshirt ? 'T-Shirts' : 'Phone Back Covers')}
                        </span>
                        <span className="text-base font-extrabold text-amber-400">${Number(tmpl.basePrice).toFixed(2)}</span>
                      </div>

                      <h3 className="font-bold text-base text-white mt-2.5">{tmpl.title}</h3>
                      <p className="text-slate-400 text-xs mt-1 line-clamp-2">{tmpl.description || 'Pre-configured customizable print template.'}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">Code: {tmpl.code || `TMPL-${tmpl.id}`}</span>
                      <button
                        onClick={() => handleToggleTemplate(tmpl.id, tmpl.isActive)}
                        className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                          tmpl.isActive
                            ? 'bg-rose-900/40 text-rose-300 hover:bg-rose-900/70'
                            : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/70'
                        }`}
                      >
                        {tmpl.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. CREATE TEMPLATE TAB */}
          {activeTab === 'create-template' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Form Controls */}
              <form onSubmit={handleCreateTemplate} className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl text-white">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-lg text-white">Create New Print-On-Demand Template</h3>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Template Title *</label>
                  <input
                    type="text"
                    required
                    value={templateTitle}
                    onChange={(e) => setTemplateTitle(e.target.value)}
                    placeholder="e.g. Modern Cyberpunk Wave"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Assign Category *</label>
                    <select
                      value={templateCategoryId}
                      onChange={(e) => setTemplateCategoryId(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value={1}>T-Shirts</option>
                      <option value={2}>Phone Back Covers</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Base Price ($) *</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={templateBasePrice}
                      onChange={(e) => setTemplateBasePrice(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Description</label>
                  <textarea
                    rows={2}
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Short description of this design template..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Upload Template Image */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Upload Template Base / Artwork Image</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-indigo-400 border border-slate-700 flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" /> {templateImage ? 'Replace Image' : 'Upload Template Image'}
                    </button>
                    {templateImage && (
                      <button
                        type="button"
                        onClick={() => setTemplateImage(null)}
                        className="px-3 py-2 rounded-xl bg-rose-900/40 text-rose-300 hover:bg-rose-900/70 text-xs font-bold"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Printable Area Settings */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="text-xs text-indigo-400 block mb-2 font-bold flex items-center gap-1.5">
                    <Layers className="w-4 h-4" /> Set Printable Area Dimensions (%)
                  </label>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Position X: {printableAreaX}%</span>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={printableAreaX}
                        onChange={(e) => setPrintableAreaX(Number(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400">Position Y: {printableAreaY}%</span>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={printableAreaY}
                        onChange={(e) => setPrintableAreaY(Number(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400">Width: {printableAreaWidth}%</span>
                      <input
                        type="range"
                        min="20"
                        max="80"
                        value={printableAreaWidth}
                        onChange={(e) => setPrintableAreaWidth(Number(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400">Height: {printableAreaHeight}%</span>
                      <input
                        type="range"
                        min="20"
                        max="80"
                        value={printableAreaHeight}
                        onChange={(e) => setPrintableAreaHeight(Number(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'Save & Publish Template'}
                  </button>
                </div>
              </form>

              {/* Live Preview of Template Placement */}
              <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-white">
                <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Template Placement Preview</h4>
                <div className="relative w-72 h-80 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center">
                  <img
                    src={
                      templateImage ||
                      (templateCategoryId === 1
                        ? '/pod/pod_tshirt.png'
                        : '/pod/pod_phone_case.png')
                    }
                    alt="Placement Preview"
                    className="w-full h-full object-cover"
                  />
                  {/* Dynamic Printable Area Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${printableAreaX}%`,
                      top: `${printableAreaY}%`,
                      width: `${printableAreaWidth}%`,
                      height: `${printableAreaHeight}%`,
                    }}
                    className="border-2 border-dashed border-indigo-400 bg-indigo-500/20 rounded flex items-center justify-center p-1"
                  >
                    <span className="text-[10px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded shadow">
                      {templateTitle || 'Print Area'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-3 text-center">
                  Print Area: X={printableAreaX}%, Y={printableAreaY}%, W={printableAreaWidth}%, H={printableAreaHeight}%
                </p>
              </div>
            </div>
          )}

          {/* 3. POD ORDERS MANAGEMENT TAB */}
          {activeTab === 'pod-orders' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-base text-white">Customer Print-On-Demand Orders</h3>
                </div>
                <span className="text-xs text-slate-400 font-semibold">Total POD Orders: {podOrders.length}</span>
              </div>

              {podOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Printer className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold">No POD orders placed yet.</p>
                  <p className="text-xs mt-1">When customers order customized items, their design details and download files will appear here.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase">
                    <tr>
                      <th className="p-4">Order #</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Template</th>
                      <th className="p-4">Custom Text & Font</th>
                      <th className="p-4">Size & Color</th>
                      <th className="p-4">Artwork Preview</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {podOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-800/50">
                        <td className="p-4 font-mono font-bold text-indigo-400">
                          #{order.order?.orderNumber || `ORD-${order.orderId || order.id}`}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-extrabold text-[10px]">
                            PRINT ON DEMAND
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-white">
                          {order.templateName || order.template?.title || 'Custom Artwork'}
                        </td>
                        <td className="p-4">
                          {order.customText ? (
                            <div>
                              <div className="font-bold text-white">"{order.customText}"</div>
                              <div className="text-[11px] text-slate-400">Font: {order.font || 'Default'}</div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">None</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                            {order.size || 'L'} / {order.color || 'Black'}
                          </span>
                        </td>
                        <td className="p-4">
                          {order.uploadedImageUrl || order.previewImageUrl ? (
                            <img
                              src={order.uploadedImageUrl || order.previewImageUrl}
                              alt="Design preview"
                              className="w-10 h-10 object-contain rounded bg-slate-950 border border-slate-800"
                            />
                          ) : (
                            <span className="text-slate-500 italic">No Image</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDownloadDesign(order)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-bold text-white flex items-center gap-1.5 ml-auto transition-all text-xs"
                          >
                            <Download className="w-3.5 h-3.5" /> Download Design
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
