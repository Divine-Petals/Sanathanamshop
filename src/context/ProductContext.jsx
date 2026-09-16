import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'

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
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(['All'])
  const [categoryTree, setCategoryTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const [productRows, categoryRows] = await Promise.all([api.products(), api.categories()])
      setProducts(productRows ?? [])
      const tree = normalizeCategoryRows(categoryRows)
      setCategoryTree(tree)
      setCategories(['All', ...tree.map((c) => c.name)])
    } catch (err) {
      setError(err.message ?? 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

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
