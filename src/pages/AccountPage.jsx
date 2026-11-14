import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useBrand } from '../context/BrandContext'
import { orderWhatsAppLink } from '../lib/whatsapp'

export default function AccountPage() {
  const { isAuthenticated, user, authLoading, logout, updateName } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [name, setName] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/login', { replace: true, state: { from: '/account' } })
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user])

  useEffect(() => {
    if (!isAuthenticated) return
    api.myOrders().then(setOrders).catch(() => setOrders([]))
  }, [isAuthenticated])

  if (authLoading || !isAuthenticated) return null

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-deep-green">Account</h1>
          <p className="text-sm text-earth-500 mt-1">{user.phone}</p>
        </div>
        <button onClick={() => { logout(); navigate('/') }} className="text-sm text-earth-600 border border-earth-200 px-3 py-2 rounded-xl">
          Sign out
        </button>
      </div>
      <form
        className="flex gap-2 mb-10"
        onSubmit={(e) => {
          e.preventDefault()
          updateName(name)
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="flex-1 min-h-[44px] px-3 border border-earth-200 rounded-xl text-sm"
        />
        <button className="px-4 bg-deep-green text-white rounded-xl text-sm">Save</button>
      </form>
      <h2 className="font-serif text-xl font-bold text-deep-green mb-4">Orders</h2>
      {orders.length === 0 ? (
        <p className="text-earth-500 text-sm">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              to={`/account/orders/${o.id}`}
              className="block bg-white border border-earth-100 rounded-2xl p-4"
            >
              <div className="flex justify-between">
                <span className="font-semibold text-deep-green">{o.order_number}</span>
                <span className="text-xs uppercase tracking-wide text-saffron-600">{o.status}</span>
              </div>
              <p className="text-sm text-earth-500 mt-1">₹{Number(o.total_price).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function OrderDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const { isAuthenticated, authLoading } = useAuth()
  const { setCartItems } = useCart()
  const brand = useBrand()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [shopNumber, setShopNumber] = useState(brand.whatsapp_number ?? '')
  const autoOpened = useRef(false)
  const justPlaced = location.state?.justPlaced

  // Read the number fresh so a change saved in Admin → Inventory applies immediately.
  useEffect(() => {
    api.storefront()
      .then((s) => setShopNumber(s.whatsapp_number ?? ''))
      .catch(() => {})
  }, [])

  const waLink = order ? orderWhatsAppLink(order, brand.name, shopNumber) : null

  // Right after checkout, open the shop's WhatsApp chat with the order filled in.
  useEffect(() => {
    if (!justPlaced || !waLink || autoOpened.current) return
    autoOpened.current = true
    navigate(location.pathname, { replace: true, state: { justPlaced: false, sentToWhatsApp: true } })
    window.location.assign(waLink)
  }, [justPlaced, waLink, navigate, location.pathname])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/login', { replace: true })
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (!isAuthenticated) return
    api.myOrders().then((list) => {
      const found = list.find((o) => o.id === id)
      setOrder(found ?? null)
    })
  }, [id, isAuthenticated])

  useEffect(() => {
    if (justPlaced && setCartItems) setCartItems([])
  }, [justPlaced, setCartItems])

  if (!order) return <div className="px-4 py-16 text-center text-earth-400">Loading order…</div>

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      {(justPlaced || location.state?.sentToWhatsApp) && (
        <p className="mb-4 text-sm bg-earth-50 border border-earth-100 rounded-xl px-3 py-2">
          Order placed. Send it to {brand.name} on WhatsApp to confirm.
        </p>
      )}
      {waLink ? (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full min-h-[48px] mb-6 bg-[#25D366] text-white font-bold rounded-xl"
        >
          Send order on WhatsApp
        </a>
      ) : (
        <p className="mb-6 text-sm text-earth-500">
          {brand.name} will contact you on {order.phone} to confirm this order.
        </p>
      )}
      <h1 className="font-serif text-2xl font-bold text-deep-green">{order.order_number}</h1>
      <p className="text-xs uppercase text-saffron-600 mt-1">{order.status}</p>
      <div className="mt-6 space-y-2">
        {order.items.map((i) => (
          <div key={i.product_id + i.name} className="flex justify-between text-sm">
            <span>{i.name} × {i.qty}</span>
            <span>₹{(i.price_in_inr * i.qty).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <p className="font-bold mt-4">Total ₹{Number(order.total_price).toFixed(2)}</p>
      <Link to="/account" className="inline-block mt-6 text-sm text-saffron-600">Back to account</Link>
    </div>
  )
}
