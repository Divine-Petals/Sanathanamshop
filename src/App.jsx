import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ProductProvider } from './context/ProductContext'
import { CartProvider } from './context/CartContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext'
import { AdminSiteProvider } from './context/AdminSiteContext'
import { AdminInventoryProvider } from './context/AdminInventoryContext'
import { BrandProvider, useBrand } from './context/BrandContext'
import { getThemeMeta } from './lib/theme'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import CartDrawer from './components/cart/CartDrawer'
import AdminLayout from './components/admin/AdminLayout'
import LandingPage from './pages/LandingPage'
import ProductsPage from './pages/ProductsPage'
import AdminPage from './pages/AdminPage'
import LoginPage from './pages/LoginPage'
import AdminLoginPage from './pages/AdminLoginPage'
import CheckoutPage from './pages/CheckoutPage'
import AccountPage, { OrderDetailPage } from './pages/AccountPage'
import BrandsPage from './pages/BrandsPage'

function CustomerRoute({ children }) {
  const { isAuthenticated, authLoading } = useAuth()
  const location = useLocation()
  if (authLoading) return null
  return isAuthenticated ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

function AdminRoute({ children }) {
  const { isAuthenticated } = useAdminAuth()
  return isAuthenticated ? children : <Navigate to="/admin/login" replace />
}

function StoreLayout({ children }) {
  const brand = useBrand()
  const t = getThemeMeta(brand)
  return (
    <div className={`min-h-screen flex flex-col ${t.shell}`}>
      <Navbar />
      <CartDrawer />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

function AdminApp() {
  return (
    <AdminSiteProvider>
      <AdminInventoryProvider>
        <AdminLayout>
          <AdminPage />
        </AdminLayout>
      </AdminInventoryProvider>
    </AdminSiteProvider>
  )
}

export default function App() {
  return (
    <BrandProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <ProductProvider>
            <CartProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route
                    path="/admin/inventory"
                    element={
                      <AdminRoute>
                        <AdminApp />
                      </AdminRoute>
                    }
                  />
                  <Route path="/admin" element={<Navigate to="/admin/inventory" replace />} />
                  <Route
                    path="/"
                    element={
                      <StoreLayout>
                        <LandingPage />
                      </StoreLayout>
                    }
                  />
                  <Route
                    path="/products"
                    element={
                      <StoreLayout>
                        <ProductsPage />
                      </StoreLayout>
                    }
                  />
                  <Route
                    path="/brands"
                    element={
                      <StoreLayout>
                        <BrandsPage />
                      </StoreLayout>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <StoreLayout>
                        <LoginPage />
                      </StoreLayout>
                    }
                  />
                  <Route
                    path="/checkout"
                    element={
                      <StoreLayout>
                        <CheckoutPage />
                      </StoreLayout>
                    }
                  />
                  <Route
                    path="/account"
                    element={
                      <StoreLayout>
                        <CustomerRoute>
                          <AccountPage />
                        </CustomerRoute>
                      </StoreLayout>
                    }
                  />
                  <Route
                    path="/account/orders/:id"
                    element={
                      <StoreLayout>
                        <CustomerRoute>
                          <OrderDetailPage />
                        </CustomerRoute>
                      </StoreLayout>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </CartProvider>
          </ProductProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </BrandProvider>
  )
}
