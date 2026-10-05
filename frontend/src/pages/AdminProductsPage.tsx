import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit2, ArrowLeft, AlertTriangle, Check, Layers, Search, X } from 'lucide-react';
import api from '../api/client';
import { IProduct } from '../types';

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Apparel');
  const [basePrice, setBasePrice] = useState(49.99);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [sku, setSku] = useState(`ZETO-PROD-${Math.floor(100 + Math.random() * 900)}`);
  const [stock, setStock] = useState(10);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter]);

  const fetchProducts = async (overrideSearch?: string, overrideCategory?: string) => {
    try {
      setLoading(true);
      const params: any = {};
      const activeSearch = overrideSearch !== undefined ? overrideSearch : search;
      const activeCategory = overrideCategory !== undefined ? overrideCategory : categoryFilter;

      if (activeSearch.trim()) params.search = activeSearch.trim();
      if (activeCategory && activeCategory !== 'All') params.category = activeCategory;

      const res = await api.get('/products', { params });
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(search, categoryFilter);
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategoryFilter('All');
    fetchProducts('', 'All');
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const variants = [
        { sku: `${sku}-S`, size: 'Small', color: 'Orange', price: basePrice, discountPercent, stock: Math.floor(stock / 2) },
        { sku: `${sku}-M`, size: 'Medium', color: 'Black', price: basePrice, discountPercent, stock: Math.ceil(stock / 2) }
      ];

      const res = await api.post('/products', {
        name,
        description,
        category,
        basePrice,
        discountPercent,
        sku,
        stock,
        variants,
        images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800']
      });

      if (res.data.success) {
        setShowCreateModal(false);
        fetchProducts();
        alert('Product created successfully!');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create product.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete product.');
    }
  };

  const handleQuickRestock = async (product: IProduct) => {
    const additionalStock = prompt(`Enter quantity to add to "${product.name}":`, '10');
    if (!additionalStock || isNaN(Number(additionalStock))) return;

    try {
      const newStock = product.stock + Number(additionalStock);
      // Also update variants
      const updatedVariants = product.variants.map((v) => ({
        ...v,
        stock: v.stock + Math.floor(Number(additionalStock) / product.variants.length)
      }));

      await api.put(`/products/${product._id}`, {
        stock: newStock,
        variants: updatedVariants
      });
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update stock.');
    }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-orange-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Product Catalog Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, update stock, and manage size & color variants.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </button>
      </div>

      {/* Search and Category Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, SKU..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchProducts('', categoryFilter);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
              Category:
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
            >
              <option value="All">All Categories</option>
              <option value="Apparel">Apparel</option>
              <option value="Footwear">Footwear</option>
              <option value="Accessories">Accessories</option>
              <option value="Electronics">Electronics</option>
            </select>
          </div>

          {(search || categoryFilter !== 'All') && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-orange-600 border border-slate-200 hover:border-orange-300 rounded-xl transition-colors whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          No products found matching your search or filter criteria.
          <div className="mt-3">
            <button
              onClick={handleClearFilters}
              className="text-orange-600 font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-4 px-6">Product</th>
                  <th className="py-4 px-6">SKU</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Base Price</th>
                  <th className="py-4 px-6">Stock Status</th>
                  <th className="py-4 px-6">Variants</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-3">
                      <img
                        src={p.images[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">{p.name}</span>
                        <span className="text-[10px] text-slate-400">/{p.slug}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-600">{p.sku}</td>
                    <td className="py-4 px-6 text-slate-800 font-semibold">{p.category}</td>
                    <td className="py-4 px-6 font-bold text-slate-900">${p.basePrice.toFixed(2)}</td>
                    <td className="py-4 px-6">
                      {p.stock === 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                          Out of Stock (0)
                        </span>
                      ) : p.stock <= p.lowStockThreshold ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Low Stock ({p.stock})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          In Stock ({p.stock})
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {p.variants?.map((v) => (
                          <span
                            key={v.sku}
                            className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-100 text-[9px] font-semibold"
                          >
                            {v.size}/{v.color} ({v.stock})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleQuickRestock(p)}
                          className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white font-bold transition-all"
                        >
                          + Restock
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p._id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Add New Catalog Product</h3>
            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Apparel">Apparel</option>
                    <option value="Footwear">Footwear</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Initial Stock</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold"
                >
                  {creating ? 'Saving...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
