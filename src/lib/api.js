const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5214'
const STOREFRONT_TENANT = import.meta.env.VITE_TENANT ?? 'divine-petals'

const CUSTOMER_TOKEN = 'sanathanam.customer.token'
const ADMIN_TOKEN = 'sanathanam.admin.token'
const ADMIN_SITE_KEY = 'sanathanam.admin.site'

export function getStorefrontTenant() {
  return STOREFRONT_TENANT
}

export function getAdminTenant() {
  return localStorage.getItem(ADMIN_SITE_KEY) ?? 'divine-petals'
}

export function setAdminTenant(slug) {
  localStorage.setItem(ADMIN_SITE_KEY, slug)
}

export function getCustomerToken() {
  return localStorage.getItem(CUSTOMER_TOKEN)
}

export function setCustomerToken(token) {
  if (token) localStorage.setItem(CUSTOMER_TOKEN, token)
  else localStorage.removeItem(CUSTOMER_TOKEN)
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN)
}

export function setAdminToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN, token)
  else localStorage.removeItem(ADMIN_TOKEN)
}

async function request(path, { method = 'GET', body, admin = false, auth = true, tenant } = {}) {
  const tenantHeader = tenant ?? (admin ? getAdminTenant() : STOREFRONT_TENANT)
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant': tenantHeader,
  }
  const token = admin ? getAdminToken() : getCustomerToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message ?? `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  storefront: (tenant) => request('/api/storefront', { auth: false, tenant: tenant ?? STOREFRONT_TENANT }),
  products: (tenant) => request('/api/products', { auth: false, tenant }),
  categories: (tenant) => request('/api/categories', { auth: false, tenant }),
  sendOtp: (phone) => request('/api/auth/otp/send', { method: 'POST', body: { phone }, auth: false }),
  verifyOtp: (phone, code) =>
    request('/api/auth/otp/verify', { method: 'POST', body: { phone, code }, auth: false }),
  me: () => request('/api/me'),
  updateMe: (name) => request('/api/me', { method: 'PUT', body: { name } }),
  addresses: () => request('/api/me/addresses'),
  addAddress: (address) => request('/api/me/addresses', { method: 'POST', body: address }),
  placeOrder: (payload) => request('/api/orders', { method: 'POST', body: payload }),
  myOrders: () => request('/api/orders'),
  adminLogin: (email, password) =>
    request('/api/admin/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  adminCreateProduct: (product) =>
    request('/api/admin/products', { method: 'POST', body: product, admin: true }),
  adminUpdateProduct: (id, product) =>
    request(`/api/admin/products/${id}`, { method: 'PUT', body: product, admin: true }),
  adminDeleteProduct: (id) =>
    request(`/api/admin/products/${id}`, { method: 'DELETE', admin: true }),
  adminToggleProduct: (id) =>
    request(`/api/admin/products/${id}/availability`, { method: 'PATCH', admin: true }),
  adminOrders: () => request('/api/admin/orders', { admin: true }),
  adminPatchOrder: (id, status) =>
    request(`/api/admin/orders/${id}`, { method: 'PATCH', body: { status }, admin: true }),
}
