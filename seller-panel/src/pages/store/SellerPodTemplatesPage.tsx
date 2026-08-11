/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
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
  Image as ImageIcon,
} from 'lucide-react';

export const SellerPodTemplatesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'cliparts' | '3d-models' | 'print-orders'>('templates');
  const [templates, setTemplates] = useState<any[]>([]);
  const [cliparts, setCliparts] = useState<any[]>([]);
  const [packagingModels, setPackagingModels] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Template Form
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [templateTitle, setTemplateTitle] = useState<string>('');
  const [templateCategory, setTemplateCategory] = useState<string>('Apparel');
  const [templatePrice, setTemplatePrice] = useState<number>(5.0);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/pod/templates`),
      axios.get(`${API_BASE}/pod/cliparts`),
      axios.get(`${API_BASE}/pod/3d-models`),
    ])
      .then(([tmplRes, clipRes, modelRes]) => {
        setTemplates(tmplRes.data?.data || []);
        setCliparts(clipRes.data?.data || []);
        setPackagingModels(modelRes.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateTitle.trim()) return;

    axios
      .post(`${API_BASE}/pod/templates`, {
        title: templateTitle,
        category: templateCategory,
        price: templatePrice,
        canvasJson: {
          sides: {
            front: {
              elements: [
                { id: '1', type: 'text', content: templateTitle, x: 200, y: 200, fontSize: 28, color: '#6366f1' },
              ],
            },
          },
        },
      })
      .then(() => {
        toast.success('POD Design Template Created!');
        setShowCreateModal(false);
        setTemplateTitle('');
        fetchData();
      })
      .catch(() => {
        toast.error('Failed to create template');
      });
  };

  const handleDownloadPrintPackage = (orderId: string) => {
    axios
      .post(`${API_BASE}/pod/designs/export-print`, { sides: { front: { svgData: '<svg></svg>' } } })
      .then((res) => {
        const data = JSON.stringify(res.data?.data, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `300DPI-PRINT-PACKAGE-${orderId}.json`;
        a.click();
        toast.success(`300 DPI Print Package generated & downloaded for Order #${orderId}`);
      })
      .catch(() => toast.error('Failed to generate print package'));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-extrabold tracking-tight">Print-On-Demand (POD) Studio Manager</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Manage pre-built design templates, vector cliparts, Packdora 3D packaging models, and high-res print orders.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Design Template
        </button>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 w-fit">
        {[
          { id: 'templates', label: 'Design Templates', icon: Sparkles },
          { id: 'cliparts', label: 'Clipart Library', icon: ImageIcon },
          { id: '3d-models', label: 'Packdora 3D Models', icon: Box },
          { id: 'print-orders', label: 'Print File Orders', icon: Printer },
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

      {/* TAB CONTENT */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 font-medium">Loading POD Studio data...</div>
      ) : (
        <>
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-indigo-500/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                        {tmpl.category}
                      </span>
                      <span className="text-sm font-bold text-amber-400">${tmpl.price}</span>
                    </div>
                    <h3 className="font-bold text-base text-white mt-3">{tmpl.title}</h3>
                    <p className="text-slate-400 text-xs mt-1">Code: {tmpl.code || 'TMPL-001'}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Active Template</span>
                    <button className="text-indigo-400 hover:underline font-semibold">Edit Layout</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'cliparts' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cliparts.map((clip) => (
                <div key={clip.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-3 text-center">
                  <div
                    className="w-16 h-16 text-indigo-400 flex items-center justify-center bg-slate-950 rounded-xl p-2"
                    dangerouslySetInnerHTML={{ __html: clip.svgContent }}
                  />
                  <div>
                    <div className="font-bold text-sm text-white">{clip.title}</div>
                    <div className="text-xs text-slate-400">{clip.category} ({clip.source})</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === '3d-models' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packagingModels.map((model) => (
                <div key={model.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800/50 uppercase">
                      {model.modelType}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{model.code}</span>
                  </div>
                  <h3 className="font-bold text-base text-white mt-3">{model.name}</h3>
                  <p className="text-slate-400 text-xs mt-1">Material Finish: {model.defaultMaterial}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'print-orders' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase">
                  <tr>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Item Name</th>
                    <th className="p-4">Print Zone Count</th>
                    <th className="p-4">Resolution</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {[
                    { id: '1092', name: 'Custom Printed Eco Hoodie', zones: 2, dpi: '300 DPI Vector' },
                    { id: '1093', name: 'Custom Tuck-End Packaging Box', zones: 4, dpi: '300 DPI Vector' },
                    { id: '1094', name: 'Ceramic Photo Coffee Mug', zones: 1, dpi: '300 DPI Vector' },
                  ].map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/50">
                      <td className="p-4 font-mono font-bold text-indigo-400">#ORD-{order.id}</td>
                      <td className="p-4 font-semibold text-white">{order.name}</td>
                      <td className="p-4">{order.zones} Zone(s)</td>
                      <td className="p-4"><span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono">{order.dpi}</span></td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDownloadPrintPackage(order.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-bold text-white flex items-center gap-1.5 ml-auto transition-all"
                        >
                          <Download className="w-3.5 h-3.5" /> Download 300DPI Print ZIP
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* CREATE TEMPLATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <form onSubmit={handleCreateTemplate} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl text-white">
            <h3 className="font-bold text-lg text-indigo-400">Create New POD Design Template</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Template Title</label>
              <input
                type="text"
                required
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                placeholder="e.g. Summer Vintage Graphic"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Category</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="Apparel">Apparel</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Drinkware">Drinkware</option>
                  <option value="Badges">Badges</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Template Price ($)</label>
                <input
                  type="number"
                  step="0.5"
                  value={templatePrice}
                  onChange={(e) => setTemplatePrice(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30"
              >
                Save & Publish Template
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
