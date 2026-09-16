import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useBrand } from '../context/BrandContext'

export default function CheckoutPage() {
  const { isAuthenticated, user, authLoading } = useAuth()
  const { cartItems, totalPrice, setIsCartOpen } = useCart()
  const brand = useBrand()
  const navigate = useNavigate()
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

  const handlePlace = async (e) => {
    e.preventDefault()
    if (cartItems.length === 0) return
    setError('')
    setPlacing(true)
    try {
      const payload = {
        items: cartItems.map((i) => ({ product_id: i.id, qty: i.qty })),
      }
      if (addressId) payload.address_id = addressId
      else {
        payload.address = {
          full_name: form.full_name,
          line1: form.line1,
          city: form.city,
          pincode: form.pincode,
          state: form.state,
        }
      }
      const order = await api.placeOrder(payload)
      navigate(`/account/orders/${order.id}`, { state: { justPlaced: true } })
    } catch (err) {
      setError(err.message)
    } finally {
      setPlacing(false)
    }
  }

  if (authLoading || !isAuthenticated) return null

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-serif text-3xl font-bold text-deep-green mb-2">Checkout</h1>
      <p className="text-sm text-earth-500 mb-8">
        Signed in as {user.phone}. {brand.name} will send the order on WhatsApp.
      </p>
      {cartItems.length === 0 ? (
        <p className="text-earth-500">Your cart is empty.</p>
      ) : (
        <form onSubmit={handlePlace} className="space-y-6">
          <div className="bg-white border border-earth-100 rounded-2xl p-4">
            {cartItems.map((i) => (
              <div key={i.id} className="flex justify-between text-sm py-2 border-b border-earth-50 last:border-0">
                <span>{i.name} × {i.qty}</span>
                <span>₹{(i.price_in_inr * i.qty).toFixed(2)}</span>
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
              {['full_name', 'line1', 'city', 'pincode'].map((key) => (
                <input
                  key={key}
                  required
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
            {placing ? 'Placing order…' : 'Place order'}
          </button>
        </form>
      )}
    </div>
  )
}
