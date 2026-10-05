import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, ShieldCheck, Truck, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import api from '../api/client';
import { IProduct, IVariant } from '../types';
import { useCart } from '../context/CartContext';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, isLoading: cartLoading } = useCart();

  const [product, setProduct] = useState<IProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<IVariant | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/products/${id}`);
      if (res.data.success) {
        const prod: IProduct = res.data.data;
        setProduct(prod);
        setSelectedImage(prod.images[0] || '');

        if (prod.variants && prod.variants.length > 0) {
          const firstVariant = prod.variants[0];
          setSelectedVariant(firstVariant);
          setSelectedSize(firstVariant.size);
          setSelectedColor(firstVariant.color);
        }
      }
    } catch (err) {
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };

  // When size or color changes, resolve the matching variant
  useEffect(() => {
    if (!product || !product.variants) return;

    const match = product.variants.find(
      (v) => v.size === selectedSize && v.color === selectedColor
    );

    if (match) {
      setSelectedVariant(match);
      setQuantity(1);
    } else {
      // Fallback: Pick first variant with selected size or selected color
      const fallback =
        product.variants.find((v) => v.size === selectedSize) ||
        product.variants.find((v) => v.color === selectedColor) ||
        product.variants[0];
      if (fallback) {
        setSelectedVariant(fallback);
        setSelectedSize(fallback.size);
        setSelectedColor(fallback.color);
      }
    }
  }, [selectedSize, selectedColor, product]);

  const handleAddToCart = async () => {
    if (!product) return;
    const sku = selectedVariant ? selectedVariant.sku : product.sku;

    try {
      await addToCart(product._id, sku, quantity);
      setSuccessMsg(`Added ${quantity} item(s) to your cart!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      // Handled by context alert
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Product not found</h2>
        <Link to="/products" className="mt-4 inline-block text-orange-600 font-semibold">
          &larr; Back to catalog
        </Link>
      </div>
    );
  }

  // Calculate pricing based on selected variant or base product
  const activePrice = selectedVariant ? selectedVariant.price : product.basePrice;
  const activeDiscount = selectedVariant ? selectedVariant.discountPercent : product.discountPercent;
  const discountedPrice = activePrice * (1 - activeDiscount / 100);
  const activeStock = selectedVariant ? selectedVariant.stock : product.stock;

  const sizes = Array.from(new Set(product.variants.map((v) => v.size)));
  const colors = Array.from(new Set(product.variants.map((v) => v.color)));

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/products"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-orange-600 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm relative">
            <img
              src={selectedImage || product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {activeDiscount > 0 && (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                -{activeDiscount}% OFF
              </span>
            )}
          </div>

          {/* Thumbnail row */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                    selectedImage === img ? 'border-orange-500 scale-95 shadow-md' : 'border-slate-200 opacity-70'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">
              <span>{product.category}</span>
              <span>•</span>
              <span className="font-mono text-slate-400">SKU: {selectedVariant?.sku || product.sku}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {product.name}
            </h1>

            {/* Price display */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900">
                ${discountedPrice.toFixed(2)}
              </span>
              {activeDiscount > 0 && (
                <span className="text-lg text-slate-400 line-through">
                  ${activePrice.toFixed(2)}
                </span>
              )}
              {activeDiscount > 0 && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  Save ${(activePrice - discountedPrice).toFixed(2)}
                </span>
              )}
            </div>

            <p className="mt-4 text-slate-600 text-sm leading-relaxed">
              {product.description}
            </p>

            {/* Variant Selectors */}
            <div className="mt-8 space-y-6 pt-6 border-t border-slate-100">
              {/* Size Selector */}
              {sizes.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Select Size: <span className="text-orange-600">{selectedSize}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          selectedSize === size
                            ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/30'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Selector */}
              {colors.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Select Color: <span className="text-orange-600">{selectedColor}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          selectedColor === color
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Variant Stock Indicator */}
              <div className="flex items-center gap-2 pt-2">
                {activeStock === 0 ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
                    <AlertTriangle className="w-4 h-4" />
                    Variant Out of Stock
                  </div>
                ) : activeStock <= product.lowStockThreshold ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Low Stock: Only {activeStock} units remaining
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {activeStock} units available in stock
                  </div>
                )}
              </div>

              {/* Quantity Selector + Add to Cart */}
              <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1 w-full sm:w-auto justify-between sm:justify-start">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || activeStock === 0}
                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-white rounded-lg disabled:opacity-30 font-bold transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-sm text-slate-800">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(activeStock, quantity + 1))}
                    disabled={quantity >= activeStock || activeStock === 0}
                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-white rounded-lg disabled:opacity-30 font-bold transition-colors"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={activeStock === 0 || cartLoading}
                  className="flex-1 w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {activeStock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
                  <Check className="w-4 h-4" />
                  {successMsg}
                </div>
              )}
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-10 grid grid-cols-3 gap-4 pt-6 border-t border-slate-100 text-center">
            <div className="flex flex-col items-center">
              <Truck className="w-5 h-5 text-orange-500 mb-1" />
              <span className="text-[11px] font-semibold text-slate-700">Free Shipping</span>
              <span className="text-[10px] text-slate-400">On orders over $100</span>
            </div>
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-5 h-5 text-orange-500 mb-1" />
              <span className="text-[11px] font-semibold text-slate-700">Atomic Safe</span>
              <span className="text-[10px] text-slate-400">Zero overselling</span>
            </div>
            <div className="flex flex-col items-center">
              <RefreshCw className="w-5 h-5 text-orange-500 mb-1" />
              <span className="text-[11px] font-semibold text-slate-700">Easy Returns</span>
              <span className="text-[10px] text-slate-400">30-day money back</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
