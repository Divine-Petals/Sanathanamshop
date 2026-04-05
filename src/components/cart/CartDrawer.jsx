import { useState } from 'react'
import { useCart } from '../../context/CartContext'
import { supabase } from '../../lib/supabase'

// Replace with your WhatsApp business number (country code + number, no + or spaces)
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPPHONES

function generateOrderNumber() {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `DP-${ts}-${rand}`
}

function buildWhatsAppMessage(orderNumber, cartItems, totalPrice) {
  const lines = cartItems.map(
    (item) => `• ${item.name} x${item.qty} — ₹${(item.price_in_inr * item.qty).toFixed(2)}`
  )
  return (
    `🌿 *Divine Petals — New Order*\n` +
    `🔖 Order No: *${orderNumber}*\n\n` +
    lines.join('\n') +
    `\n\n*Total: ₹${totalPrice.toFixed(2)}*\n\nPlease confirm my order. Thank you!`
  )
}

function placeholderFor(name) {
  return `https://placehold.co/64x64/e8c9a6/703410?text=${encodeURIComponent(name[0])}`
}

export default function CartDrawer() {
  const { cartItems, isCartOpen, setIsCartOpen, removeFromCart, updateQty, totalPrice } =
    useCart()
  const [ordering, setOrdering] = useState(false)

  const handleWhatsAppOrder = async () => {
    setOrdering(true)
    const orderNumber = generateOrderNumber()
    try {
      await supabase.from('orders').insert({
        order_number: orderNumber,
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          price_in_inr: item.price_in_inr,
        })),
        total_price: totalPrice,
        status: 'pending',
      })
    } catch {
      // Non-blocking — proceed to WhatsApp even if DB write fails
    }
    const message = buildWhatsAppMessage(orderNumber, cartItems, totalPrice)
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    )
    setOrdering(false)
  }

  if (!isCartOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-earth-100">
          <h2 className="font-serif text-xl font-bold text-deep-green">Your Cart</h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-earth-400 hover:text-deep-green transition-colors"
            aria-label="Close cart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-earth-400 gap-3 pb-10">
              <span className="text-5xl" aria-hidden="true">🛒</span>
              <p className="text-center text-sm">
                Your cart is empty.
                <br />
                Add some handcrafted naturals!
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="flex gap-3 bg-earth-50 rounded-2xl p-3">
                {/* Product image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-earth-100">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = placeholderFor(item.name)
                    }}
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-deep-green text-sm leading-tight truncate">{item.name}</p>
                  <p className="text-saffron-600 font-bold text-sm mt-0.5">₹{item.price_in_inr}</p>
                  {/* Qty controls */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="w-7 h-7 rounded-full bg-white border border-earth-200 flex items-center justify-center text-earth-700 font-bold text-sm hover:bg-earth-100 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="text-sm font-semibold w-5 text-center text-deep-green">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="w-7 h-7 rounded-full bg-white border border-earth-200 flex items-center justify-center text-earth-700 font-bold text-sm hover:bg-earth-100 transition-colors"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-earth-300 hover:text-red-500 transition-colors self-start"
                  aria-label={`Remove ${item.name} from cart`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-earth-100 px-4 py-4 bg-white">
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="text-earth-600">Subtotal</span>
              <span className="font-bold text-deep-green">₹{totalPrice.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-earth-400 mb-3">Free shipping above ₹499</p>
            <button
              onClick={handleWhatsAppOrder}
              disabled={ordering}
              className="w-full min-h-[48px] bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a84f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {ordering ? 'Placing Order…' : 'Order via WhatsApp'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
