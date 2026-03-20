import { createContext, useContext, useState, useEffect } from 'react'
import { initialProducts } from '../data/products'

const ProductContext = createContext(null)

export function ProductProvider({ children }) {
  const [products, setProducts] = useState(() => {
    try {
      const stored = localStorage.getItem('divine_petals_products')
      return stored ? JSON.parse(stored) : initialProducts
    } catch {
      return initialProducts
    }
  })

  useEffect(() => {
    localStorage.setItem('divine_petals_products', JSON.stringify(products))
  }, [products])

  const addProduct = (product) => {
    const newProduct = { ...product, id: crypto.randomUUID() }
    setProducts((prev) => [...prev, newProduct])
  }

  const removeProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const updateProduct = (id, data) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p))
    )
  }

  const toggleAvailability = (id) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, available: p.available !== false ? false : true } : p
      )
    )
  }

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, removeProduct, toggleAvailability }}>
      {children}
    </ProductContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductContext)
  if (!ctx) throw new Error('useProducts must be used within ProductProvider')
  return ctx
}
