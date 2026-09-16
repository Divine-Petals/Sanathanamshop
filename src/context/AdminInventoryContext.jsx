import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAdminSite } from './AdminSiteContext'

const AdminInventoryContext = createContext(null)

function normalizeCategoryRows(rows) {
  return (rows ?? [])
    .map((row) => {
      if (typeof row === 'string') return { name: row, subcategories: [] }
      if (row?.name) return { name: row.name, subcategories: row.subcategories ?? [] }
      return null
    })
    .filter(Boolean)
}

export function AdminInventoryProvider({ children }) {
  const { activeSite } = useAdminSite()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(['All'])
  const [categoryTree, setCategoryTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const [productRows, categoryRows] = await Promise.all([
        api.products(activeSite),
        api.categories(activeSite),
      ])
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
  }, [activeSite])

  const addProduct = async (product) => {
    const data = await api.adminCreateProduct({
      name: product.name,
      price_in_inr: Number(product.price_in_inr),
      category: product.category,
      subcategory: product.subcategory ?? '',
      description: product.description,
      ingredients: product.ingredients,
      bestseller: product.bestseller,
      available: product.available !== false,
      image_url: product.image_url,
    })
    setProducts((prev) => [...prev, data])
  }

  const removeProduct = async (id) => {
    await api.adminDeleteProduct(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const updateProduct = async (id, product) => {
    const data = await api.adminUpdateProduct(id, {
      name: product.name,
      price_in_inr: Number(product.price_in_inr),
      category: product.category,
      subcategory: product.subcategory ?? '',
      description: product.description,
      ingredients: product.ingredients,
      bestseller: product.bestseller,
      available: product.available !== false,
      image_url: product.image_url,
    })
    setProducts((prev) => prev.map((p) => (p.id === id ? data : p)))
  }

  const toggleAvailability = async (id) => {
    const data = await api.adminToggleProduct(id)
    setProducts((prev) => prev.map((p) => (p.id === id ? data : p)))
  }

  return (
    <AdminInventoryContext.Provider
      value={{
        products,
        categories,
        categoryTree,
        loading,
        error,
        refresh,
        addProduct,
        updateProduct,
        removeProduct,
        toggleAvailability,
      }}
    >
      {children}
    </AdminInventoryContext.Provider>
  )
}

export function useAdminInventory() {
  const ctx = useContext(AdminInventoryContext)
  if (!ctx) throw new Error('useAdminInventory must be used within AdminInventoryProvider')
  return ctx
}
