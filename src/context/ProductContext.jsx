import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ProductContext = createContext(null)

export function ProductProvider({ children }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(['All'])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        // Fetch products and categories in parallel
        const [productsResult, categoriesResult] = await Promise.all([
          supabase.from('products').select('*').order('name'),
          supabase.from('categories').select('name').order('name'),
        ])

        if (productsResult.error) throw productsResult.error

        setProducts(productsResult.data ?? [])

        // Fall back to deriving categories from product data if the
        // categories table is missing or empty
        if (categoriesResult.error || !categoriesResult.data?.length) {
          const unique = [
            ...new Set(
              (productsResult.data ?? []).map((p) => p.category).filter(Boolean)
            ),
          ].sort()
          setCategories(['All', ...unique])
        } else {
          setCategories(['All', ...categoriesResult.data.map((c) => c.name)])
        }
      } catch (err) {
        setError(err.message ?? 'Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const addProduct = async (product) => {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single()
    if (error) throw error
    setProducts((prev) => [...prev, data])
  }

  const removeProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const updateProduct = async (id, data) => {
    const { data: updated, error } = await supabase
      .from('products')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)))
  }

  const toggleAvailability = async (id) => {
    const product = products.find((p) => p.id === id)
    const available = product?.available === false ? true : false
    const { error } = await supabase
      .from('products')
      .update({ available })
      .eq('id', id)
    if (error) throw error
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, available } : p))
    )
  }

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        loading,
        error,
        addProduct,
        updateProduct,
        removeProduct,
        toggleAvailability,
      }}
    >
      {children}
    </ProductContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductContext)
  if (!ctx) throw new Error('useProducts must be used within ProductProvider')
  return ctx
}
