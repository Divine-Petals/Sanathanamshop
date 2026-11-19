import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { StoreProvider, useStore } from './context/StoreContext'
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
import AdminStoresPage from './pages/AdminStoresPage'

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

function AdminApp({ children }) {
  return (
    <AdminSiteProvider>
      <AdminInventoryProvider>
        <AdminLayout>{children}</AdminLayout>
      </AdminInventoryProvider>
    </AdminSiteProvider>
  )
}

/** Store pages (/:store, /:store/products) render only for a real store; anything else goes to a valid one. */
function StorePage({ children }) {
  const { store: slug } = useParams()
  const { storesLoaded, isKnown, fallbackSlug } = useStore()
  if (storesLoaded && !isKnown(slug?.toLowerCase())) {
    return <Navigate to={`/${fallbackSlug}`} replace />
  }
  return <StoreLayout>{children}</StoreLayout>
}

/** "/" and old links like "/products?domain=Soaps" go to the active store. */
function ToActiveStore({ path = '' }) {
  const { store } = useStore()
  const location = useLocation()
  return <Navigate to={`/${store.slug}${path}${location.search}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
    <BrandProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <ProductProvider>
            <CartProvider>
                <Routes>
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route
                    path="/admin/inventory"
                    element={
                      <AdminRoute>
                        <AdminApp>
                          <AdminPage />
                        </AdminApp>
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/stores"
                    element={
                      <AdminRoute>
                        <AdminApp>
                          <AdminStoresPage />
                        </AdminApp>
                      </AdminRoute>
                    }
                  />
                  <Route path="/admin" element={<Navigate to="/admin/inventory" replace />} />
                  <Route path="/" element={<ToActiveStore />} />
                  <Route path="/products" element={<ToActiveStore path="/products" />} />
                  <Route
                    path="/:store"
                    element={
                      <StorePage>
                        <LandingPage />
                      </StorePage>
                    }
                  />
                  <Route
                    path="/:store/products"
                    element={
                      <StorePage>
                        <ProductsPage />
                      </StorePage>
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
            </CartProvider>
          </ProductProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </BrandProvider>
      </StoreProvider>
    </BrowserRouter>
  )
}
