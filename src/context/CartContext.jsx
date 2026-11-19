import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useStore } from './StoreContext'

const CartContext = createContext(null)
const CART_KEY = 'sanathanam.cart'

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((i) => i?.id && i.qty > 0) : []
  } catch {
    return []
  }
}

/** Splits cart lines by store: [{ store: { slug, name }, items, total }]. */
export function groupByStore(items) {
  const groups = new Map()
  for (const item of items) {
    const key = item.store?.slug ?? ''
    if (!groups.has(key)) groups.set(key, { store: item.store ?? null, items: [], total: 0 })
    const g = groups.get(key)
    g.items.push(item)
    g.total += item.price_in_inr * item.qty
  }
  return [...groups.values()]
}

// One cart shared by every store; each line remembers which store it came from,
// so checkout can place one order per store.
export function CartProvider({ children }) {
  const { store } = useStore()
  const [cartItems, setCartItems] = useState(readCart)
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cartItems))
    } catch {
      /* private mode or full storage: the cart still works for this visit */
    }
  }, [cartItems])

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        )
      }
      const { id, name, price_in_inr, image_url } = product
      return [...prev, { id, name, price_in_inr, image_url, qty: 1, store: { slug: store.slug, name: store.name } }]
    })
    setIsCartOpen(true)
  }

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQty = (id, qty) => {
    if (qty < 1) {
      removeFromCart(id)
      return
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty } : item))
    )
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0)
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price_in_inr * item.qty,
    0
  )
  const storeGroups = useMemo(() => groupByStore(cartItems), [cartItems])

  return (
    <CartContext.Provider
      value={{
        cartItems,
        setCartItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQty,
        totalItems,
        totalPrice,
        storeGroups,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
