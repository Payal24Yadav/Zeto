import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, ShoppingBag, ArrowRight, Tag, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import { IProduct } from '../types';
import { useCart } from '../context/CartContext';

const CATEGORIES = ['All', 'Apparel', 'Footwear', 'Accessories', 'Electronics'];

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();

  const searchQuery = searchParams.get('search') || '';
  const selectedCategory = searchParams.get('category') || 'All';
  const sortOption = searchParams.get('sort') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    fetchProducts();
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;
      if (sortOption) params.sort = sortOption;

      const res = await api.get('/products', { params });
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('search', searchInput.trim());
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const handleCategorySelect = (category: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (category === 'All') {
      newParams.delete('category');
    } else {
      newParams.set('category', category);
    }
    setSearchParams(newParams);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParams = new URLSearchParams(searchParams);
    if (e.target.value) {
      newParams.set('sort', e.target.value);
    } else {
      newParams.delete('sort');
    }
    setSearchParams(newParams);
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white py-14 px-4 sm:px-6 lg:px-8 mb-10 shadow-lg relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-700/50 backdrop-blur-sm text-xs font-semibold mb-3 border border-orange-400/30">
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping"></span>
              Task 3: Production E-Commerce Engine
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              Engineered Catalog & Inventory
            </h1>
            <p className="mt-2 text-orange-100 max-w-xl text-sm sm:text-base">
              Explore products featuring atomic stock reservation, multi-variant sizing, and zero-overselling concurrency protection.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center min-w-[120px]">
              <span className="text-2xl font-black">{products.length}</span>
              <p className="text-xs text-orange-100">Live Products</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center min-w-[120px]">
              <span className="text-2xl font-black">100%</span>
              <p className="text-xs text-orange-100">Atomic Safe</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 mb-8 flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search + Sort */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search catalog..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </form>

            <select
              value={sortOption}
              onChange={handleSortChange}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Sort: Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
                <div className="w-full h-48 bg-slate-200 rounded-xl mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
            <ShoppingBag className="w-12 h-12 text-orange-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No products found</h3>
            <p className="text-sm text-slate-500 mt-1">
              Try adjusting your search criteria or category filters.
            </p>
            <button
              onClick={() => setSearchParams({})}
              className="mt-4 px-4 py-2 text-xs font-semibold text-orange-600 bg-orange-50 rounded-xl hover:bg-orange-100"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => {
              const hasDiscount = product.discountPercent > 0;
              const discountedPrice = product.basePrice * (1 - product.discountPercent / 100);
              const isLowStock = product.stock <= product.lowStockThreshold && product.stock > 0;
              const isOutOfStock = product.stock === 0;

              return (
                <div
                  key={product._id}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-orange-300 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Image container */}
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    <img
                      src={product.images[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Discount badge */}
                    {hasDiscount && (
                      <span className="absolute top-3 left-3 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        -{product.discountPercent}% OFF
                      </span>
                    )}

                    {/* Stock status badge */}
                    {isOutOfStock ? (
                      <span className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="absolute top-3 right-3 bg-amber-500/90 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Only {product.stock} left
                      </span>
                    ) : (
                      <span className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                        In Stock ({product.stock})
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>{product.category}</span>
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                          {product.sku}
                        </span>
                      </div>
                      <Link
                        to={`/products/${product._id}`}
                        className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1 text-base"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {product.description}
                      </p>

                      {/* Variant tags preview */}
                      {product.variants?.length > 0 && (
                        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-medium">Variants:</span>
                          {Array.from(new Set(product.variants.map((v) => v.size))).map((size) => (
                            <span
                              key={size}
                              className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-100 font-semibold"
                            >
                              {size}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price and CTA */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-black text-slate-900">
                            ${discountedPrice.toFixed(2)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs text-slate-400 line-through">
                              ${product.basePrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        to={`/products/${product._id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white font-semibold text-xs transition-all"
                      >
                        View
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
