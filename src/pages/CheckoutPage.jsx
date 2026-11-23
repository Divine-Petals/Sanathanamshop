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
  const { cartItems, setCartItems, storeGroups, totalPrice, setIsCartOpen, updateQty, removeFromCart } = useCart()
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
  const [notice, setNotice] = useState('')
  const [placing, setPlacing] = useState(false)

  // Pull the current stock for everything in the cart, so a stale cart can't block checkout:
  // quantities above stock are lowered, and sold-out items are flagged (and can be removed).
  const syncStock = async () => {
    const slugs = [...new Set(cartItems.map((i) => i.store?.slug ?? activeStore.slug))]
    const results = await Promise.all(slugs.map((slug) => api.products(slug).catch(() => null)))
    const stockById = new Map()
    results.forEach((rows) => rows?.forEach((p) => stockById.set(p.id, typeof p.stock === 'number' ? p.stock : null)))
    const lowered = []
    setCartItems((items) =>
      items.map((i) => {
        if (!stockById.has(i.id)) return i
        const stock = stockById.get(i.id)
        let qty = i.qty
        if (stock !== null && stock > 0 && qty > stock) {
          qty = stock
          lowered.push(i.name)
        }
        return { ...i, stock, qty }
      }),
    )
    setNotice(lowered.length ? `Quantity reduced to what's in stock for: ${lowered.join(', ')}.` : '')
  }

  useEffect(() => {
    if (isAuthenticated && cartItems.length) syncStock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const soldOut = cartItems.filter((i) => typeof i.stock === 'number' && i.stock <= 0)
  const blocked = soldOut.length > 0

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
    if (failure) syncStock()

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
                {group.items.map((i) => {
                  const tracked = typeof i.stock === 'number'
                  const out = tracked && i.stock <= 0
                  return (
                    <div key={i.id} className="py-2 border-b border-earth-50 last:border-0">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className={`min-w-0 flex-1 ${out ? 'text-earth-400 line-through' : ''}`}>{i.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQty(i.id, i.qty - 1)}
                            disabled={out || i.qty <= 1}
                            className="w-7 h-7 rounded-full border border-earth-200 text-earth-700 font-bold disabled:opacity-40"
                            aria-label={`Decrease quantity of ${i.name}`}
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-semibold">{i.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(i.id, i.qty + 1)}
                            disabled={out || (tracked && i.qty >= i.stock)}
                            className="w-7 h-7 rounded-full border border-earth-200 text-earth-700 font-bold disabled:opacity-40"
                            aria-label={`Increase quantity of ${i.name}`}
                          >
                            +
                          </button>
                        </div>
                        <span className="w-20 text-right">₹{(i.price_in_inr * i.qty).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(i.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                          aria-label={`Remove ${i.name}`}
                        >
                          Remove
                        </button>
                      </div>
                      {out ? (
                        <p className="text-[11px] text-red-600 mt-1">Out of stock. Remove it to continue.</p>
                      ) : (
                        tracked && i.qty >= i.stock && (
                          <p className="text-[11px] text-amber-700 mt-1">Only {i.stock} in stock.</p>
                        )
                      )}
                    </div>
                  )
                })}
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

          {notice && <p className="text-amber-700 text-sm">{notice}</p>}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={placing || blocked}
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
