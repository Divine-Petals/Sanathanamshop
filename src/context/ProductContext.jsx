import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useStore } from './StoreContext'

const ProductContext = createContext(null)

function normalizeCategoryRows(rows) {
  return (rows ?? [])
    .map((row) => {
      if (typeof row === 'string') return { name: row, subcategories: [] }
      if (row?.name) return { name: row.name, subcategories: row.subcategories ?? [] }
      return null
    })
    .filter(Boolean)
}

export function ProductProvider({ children }) {
  const { store } = useStore()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(['All'])
  const [categoryTree, setCategoryTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = async (cancelled = () => false) => {
    setLoading(true)
    setError(null)
    try {
      const [productRows, categoryRows] = await Promise.all([api.products(store.slug), api.categories(store.slug)])
      if (cancelled()) return
      setProducts(productRows ?? [])
      const tree = normalizeCategoryRows(categoryRows)
      setCategoryTree(tree)
      setCategories(['All', ...tree.map((c) => c.name)])
    } catch (err) {
      if (!cancelled()) setError(err.message ?? 'Failed to load products')
    } finally {
      if (!cancelled()) setLoading(false)
    }
  }

  // Each store has its own catalog: reload when the customer switches store.
  useEffect(() => {
    let stale = false
    setProducts([])
    refresh(() => stale)
    return () => {
      stale = true
    }
  }, [store.slug])

  return (
    <ProductContext.Provider value={{ products, categories, categoryTree, loading, error, refresh }}>
      {children}
    </ProductContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductContext)
  if (!ctx) throw new Error('useProducts must be used within ProductProvider')
  return ctx
}
