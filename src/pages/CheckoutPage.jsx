import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useBrand } from '../context/BrandContext'
import { useStore } from '../context/StoreContext'
import { orderWhatsAppLink } from '../lib/whatsapp'

export default function CheckoutPage() {
  const { isAuthenticated, user, authLoading } = useAuth()
  const { cartItems, setCartItems, storeGroups, totalPrice, setIsCartOpen } = useCart()
  const brand = useBrand()
  const { store: activeStore } = useStore()
  const [placedOrders, setPlacedOrders] = useState([])
  const navigate = useNavigate()
  // Orders from a multi-store checkout live in the URL (?placed=id1,id2), so the list
  // is still here when the customer comes back from WhatsApp.
  const [searchParams] = useSearchParams()
  const placedParam = searchParams.get('placed') ?? ''
  const [sentIds, setSentIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('sanathanam.sentOrders') ?? '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    const ids = placedParam.split(',').filter(Boolean)
    if (!ids.length || !isAuthenticated) {
      setPlacedOrders([])
      return
    }
    api.myOrders()
      .then((list) => setPlacedOrders(ids.map((id) => list.find((o) => o.id === id)).filter(Boolean)))
      .catch(() => {})
  }, [placedParam, isAuthenticated])

  const markSent = (id) => {
    const next = [...new Set([...sentIds, id])]
    setSentIds(next)
    try {
      sessionStorage.setItem('sanathanam.sentOrders', JSON.stringify(next))
    } catch {
      /* private mode */
    }
  }
  const [addresses, setAddresses] = useState([])
  const [addressId, setAddressId] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    line1: '',
    city: '',
    pincode: '',
    state: 'Karnataka',
  })
  const [error, setError] = useState('')
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    setIsCartOpen(false)
  }, [setIsCartOpen])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true, state: { from: '/checkout' } })
    }
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (!isAuthenticated) return
    api.addresses().then((list) => {
      setAddresses(list)
      const def = list.find((a) => a.is_default) ?? list[0]
      if (def) setAddressId(def.id)
    }).catch(() => {})
  }, [isAuthenticated])

  // The cart can hold items from several stores: place one order per store,
  // each sent to that store's own WhatsApp.
  const handlePlace = async (e) => {
    e.preventDefault()
    if (cartItems.length === 0) return
    setError('')
    setPlacing(true)
    const base = {}
    const hasNewAddress = ['full_name', 'line1', 'city', 'pincode'].some((k) => form[k].trim())
    if (addressId) base.address_id = addressId
    else if (hasNewAddress) {
      base.address = {
        full_name: form.full_name,
        line1: form.line1,
        city: form.city,
        pincode: form.pincode,
        state: form.state,
      }
    }

    const placed = []
    let failure = ''
    for (const group of storeGroups) {
      const slug = group.store?.slug ?? activeStore.slug
      try {
        const order = await api.placeOrder(
          { ...base, items: group.items.map((i) => ({ product_id: i.id, qty: i.qty })) },
          slug,
        )
        placed.push({ ...order, store: order.store ?? group.store, itemIds: group.items.map((i) => i.id) })
      } catch (err) {
        failure = `${group.store?.name ?? 'Store'}: ${err.message}`
        break
      }
    }
    setPlacing(false)

    if (placed.length === 1 && !failure) {
      navigate(`/account/orders/${placed[0].id}`, { state: { justPlaced: true } })
      return
    }
    // Keep only what still needs ordering in the cart.
    const done = new Set(placed.flatMap((o) => o.itemIds))
    setCartItems((items) => items.filter((i) => !done.has(i.id)))
    const allIds = [...placedParam.split(',').filter(Boolean), ...placed.map((o) => o.id)]
    if (allIds.length) navigate(`/checkout?placed=${allIds.join(',')}`, { replace: true })
    if (failure) setError(failure)
  }

  if (authLoading || !isAuthenticated) return null

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-serif text-3xl font-bold text-deep-green mb-2">Checkout</h1>
      <p className={`text-sm text-earth-500 mb-8 ${cartItems.length === 0 ? 'hidden' : ''}`}>
        Signed in as {user.phone}. After placing the order, send it to{' '}
        {storeGroups.length > 1 ? 'each store' : storeGroups[0]?.store?.name ?? brand.name} on WhatsApp.
      </p>
      {placedOrders.length > 0 && (
        <div className="mb-8 space-y-3">
          <p className="text-sm font-semibold text-deep-green">
            {placedOrders.length} orders placed. Send each one to its store on WhatsApp to confirm.
          </p>
          {placedOrders.map((o) => {
            const storeName = o.store?.name ?? brand.name
            const link = orderWhatsAppLink(o, storeName, o.store?.whatsapp_number)
            return (
              <div key={o.id} className="bg-white border border-earth-100 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-deep-green">{storeName}</span>
                  <Link to={`/account/orders/${o.id}`} className="text-earth-500 underline underline-offset-2">
                    {o.order_number}
                  </Link>
                </div>
                {link ? (
                  // Same tab: new-tab links are blocked by many in-app and mobile browsers.
                  // Coming back lands on this list again (the order ids are in the URL).
                  <a
                    href={link}
                    onClick={() => markSent(o.id)}
                    className={`flex items-center justify-center w-full min-h-[44px] font-bold rounded-xl text-sm ${
                      sentIds.includes(o.id)
                        ? 'bg-white border border-[#25D366] text-[#128C7E]'
                        : 'bg-[#25D366] text-white'
                    }`}
                  >
                    {sentIds.includes(o.id) ? `Sent ✓ · Send to ${storeName} again` : `Send to ${storeName} on WhatsApp`}
                  </a>
                ) : (
                  <p className="text-xs text-earth-500">{storeName} will contact you on {o.phone} to confirm.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
      {cartItems.length === 0 ? (
        placedOrders.length === 0 && <p className="text-earth-500">Your cart is empty.</p>
      ) : (
        <form onSubmit={handlePlace} className="space-y-6">
          <div className="bg-white border border-earth-100 rounded-2xl p-4">
            {storeGroups.map((group) => (
              <div key={group.store?.slug ?? 'store'} className="mb-2">
                {storeGroups.length > 1 && (
                  <p className="text-xs font-bold uppercase tracking-wide text-earth-600 pt-2">
                    {group.store?.name ?? 'Store'} · ₹{group.total.toFixed(2)}
                  </p>
                )}
                {group.items.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm py-2 border-b border-earth-50 last:border-0">
                    <span>{i.name} × {i.qty}</span>
                    <span>₹{(i.price_in_inr * i.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ))}
            <div className="flex justify-between font-bold mt-3">
              <span>Total</span>
              <span>₹{totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {addresses.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-earth-600 mb-2">Saved address</label>
              <select
                value={addressId}
                onChange={(e) => setAddressId(e.target.value)}
                className="w-full min-h-[44px] px-3 border border-earth-200 rounded-xl text-sm"
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}, {a.line1}, {a.city} {a.pincode}
                  </option>
                ))}
                <option value="">New address</option>
              </select>
            </div>
          )}

          {!addressId && (
            <div className="grid gap-3">
              <p className="text-xs text-earth-500">
                Delivery address (optional). You can also share it on WhatsApp.
              </p>
              {['full_name', 'line1', 'city', 'pincode'].map((key) => (
                <input
                  key={key}
                  placeholder={key.replace('_', ' ')}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full min-h-[44px] px-3 border border-earth-200 rounded-xl text-sm"
                />
              ))}
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={placing}
            className="w-full min-h-[48px] bg-deep-green text-white font-bold rounded-xl disabled:opacity-50"
          >
            {placing
              ? 'Placing order…'
              : storeGroups.length > 1
                ? `Place ${storeGroups.length} orders`
                : 'Place order'}
          </button>
        </form>
      )}
    </div>
  )
}
