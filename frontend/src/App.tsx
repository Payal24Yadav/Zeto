import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';

// Customer Pages
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Admin Pages
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminProductsPage } from './pages/AdminProductsPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';

// Customer Storefront Layout (Navbar with Cart + Content + Storefront Footer)
const CustomerStorefrontLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* ========================================================
                1. STANDALONE DEDICATED ADMIN AUTHENTICATION
            ======================================================== */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* ========================================================
                2. DEDICATED ADMIN PORTAL ROUTES (Uses AdminLayout)
                   Strictly isolated: No customer navbar, cart, or footer.
            ======================================================== */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Navigate to="/admin/dashboard" replace />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminDashboardPage />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminProductsPage />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminOrdersPage />
                  </AdminLayout>
                </AdminRoute>
              }
            />

            {/* ========================================================
                3. CUSTOMER STOREFRONT ROUTES (Uses CustomerStorefrontLayout)
                   Strictly storefront: Products, Cart, Checkout, My Orders.
            ======================================================== */}
            <Route
              path="/"
              element={
                <CustomerStorefrontLayout>
                  <Navigate to="/products" replace />
                </CustomerStorefrontLayout>
              }
            />
            <Route
              path="/products"
              element={
                <CustomerStorefrontLayout>
                  <ProductsPage />
                </CustomerStorefrontLayout>
              }
            />
            <Route
              path="/products/:id"
              element={
                <CustomerStorefrontLayout>
                  <ProductDetailPage />
                </CustomerStorefrontLayout>
              }
            />
            <Route
              path="/cart"
              element={
                <CustomerStorefrontLayout>
                  <CartPage />
                </CustomerStorefrontLayout>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <CustomerStorefrontLayout>
                    <CheckoutPage />
                  </CustomerStorefrontLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <CustomerStorefrontLayout>
                    <OrdersPage />
                  </CustomerStorefrontLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <CustomerStorefrontLayout>
                    <OrderDetailPage />
                  </CustomerStorefrontLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <CustomerStorefrontLayout>
                  <LoginPage />
                </CustomerStorefrontLayout>
              }
            />
            <Route
              path="/register"
              element={
                <CustomerStorefrontLayout>
                  <RegisterPage />
                </CustomerStorefrontLayout>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/products" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
