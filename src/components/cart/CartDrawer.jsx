import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useBrand } from '../../context/BrandContext'
import { getThemeMeta } from '../../lib/theme'

function placeholderFor(name) {
  return `https://placehold.co/64x64/e8c9a6/703410?text=${encodeURIComponent(name[0])}`
}

export default function CartDrawer() {
  const { cartItems, isCartOpen, setIsCartOpen, removeFromCart, updateQty, totalPrice } = useCart()
  const brand = useBrand()
  const t = getThemeMeta(brand)
  const navigate = useNavigate()

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
              onClick={() => {
                setIsCartOpen(false)
                navigate('/checkout')
              }}
              className={`w-full min-h-[48px] font-bold rounded-xl text-sm transition-colors ${t.primaryBtn}`}
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  )
}
