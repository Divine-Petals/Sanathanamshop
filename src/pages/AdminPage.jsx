import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProducts } from '../context/ProductContext'
import { useAuth } from '../context/AuthContext'

const EMPTY_FORM = {
  name: '',
  price_in_inr: '',
  category: '',
  description: '',
  ingredients: '',
  bestseller: false,
  image_url: '',
}

function productToForm(product) {
  return {
    name: product.name ?? '',
    price_in_inr: product.price_in_inr ?? '',
    category: product.category ?? 'Herbal',
    description: product.description ?? '',
    ingredients: Array.isArray(product.ingredients)
      ? product.ingredients.join(', ')
      : product.ingredients ?? '',
    bestseller: product.bestseller ?? false,
    image_url: product.image_url ?? '',
  }
}

function formToProduct(form) {
  return {
    ...form,
    price_in_inr: Number(form.price_in_inr),
    ingredients: form.ingredients
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  }
}

function ProductForm({ editingProduct, onClose, onSubmit, categories }) {
  const isEditing = !!editingProduct
  const [form, setForm] = useState(isEditing ? productToForm(editingProduct) : EMPTY_FORM)
  const fileRef = useRef(null)

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onloadend = () => set('image_url', reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.price_in_inr) return
    onSubmit(formToProduct(form))
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-earth-100 rounded-2xl p-4 md:p-6 mb-6 shadow-sm"
      noValidate
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg font-bold text-deep-green">
          {isEditing ? `Edit: ${editingProduct.name}` : 'New Product'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-w-[36px] min-h-[36px] flex items-center justify-center text-earth-400 hover:text-deep-green transition-colors rounded-full"
          aria-label="Close form"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-earth-600 mb-1" htmlFor="prod-name">
            Product Name *
          </label>
          <input
            id="prod-name"
            required
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Sandalwood & Turmeric"
            className="w-full min-h-[44px] px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-semibold text-earth-600 mb-1" htmlFor="prod-price">
            Price (₹) *
          </label>
          <input
            id="prod-price"
            required
            type="number"
            min={1}
            max={9999}
            value={form.price_in_inr}
            onChange={(e) => set('price_in_inr', e.target.value)}
            placeholder="249"
            className="w-full min-h-[44px] px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-earth-600 mb-1" htmlFor="prod-category">
            Category
          </label>
          <select
            id="prod-category"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green bg-white"
          >
            {categories.filter((c) => c !== 'All').map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-xs font-semibold text-earth-600 mb-1">
            Product Image
          </label>
          <div className="flex gap-2 items-center">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              aria-label="Upload product image from gallery"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 min-h-[44px] border-2 border-dashed border-earth-200 rounded-xl text-xs text-earth-500 hover:border-saffron-400 hover:text-saffron-600 transition-colors flex items-center justify-center gap-2"
            >
              📷 {form.image_url ? 'Change Image' : 'Upload from Gallery'}
            </button>
            {form.image_url && (
              <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border border-earth-100">
                <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <input
            type="text"
            value={form.image_url.startsWith('data:') ? '' : form.image_url}
            onChange={(e) => set('image_url', e.target.value)}
            placeholder="Or paste image URL…"
            className="mt-1.5 w-full min-h-[36px] px-3 py-1.5 border border-earth-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green placeholder-earth-300"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-earth-600 mb-1" htmlFor="prod-desc">
            Description
          </label>
          <textarea
            id="prod-desc"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Brief product description…"
            rows={2}
            className="w-full px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green resize-none"
          />
        </div>

        {/* Ingredients */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-earth-600 mb-1" htmlFor="prod-ingredients">
            Ingredients
            <span className="ml-1 font-normal text-earth-400">(comma-separated)</span>
          </label>
          <textarea
            id="prod-ingredients"
            value={form.ingredients}
            onChange={(e) => set('ingredients', e.target.value)}
            placeholder="e.g. Coconut Oil, Turmeric, Shea Butter, Vitamin E"
            rows={2}
            className="w-full px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green resize-none"
          />
          {form.ingredients.trim() && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.ingredients
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((ing) => (
                  <span
                    key={ing}
                    className="bg-earth-100 text-earth-700 text-[10px] font-medium px-2 py-0.5 rounded-full"
                  >
                    {ing}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Bestseller toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer" htmlFor="prod-bestseller">
            <input
              id="prod-bestseller"
              type="checkbox"
              checked={form.bestseller}
              onChange={(e) => set('bestseller', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-10 h-6 rounded-full transition-colors ${form.bestseller ? 'bg-saffron-500' : 'bg-earth-200'}`} />
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.bestseller ? 'translate-x-4' : 'translate-x-0'}`} />
          </label>
          <span className="text-sm text-earth-700">Mark as Bestseller</span>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          className="min-h-[44px] bg-deep-green hover:bg-earth-800 text-white font-semibold px-8 rounded-xl text-sm transition-colors"
        >
          {isEditing ? 'Save Changes' : 'Add Product'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] border border-earth-200 text-earth-600 hover:bg-earth-50 font-semibold px-6 rounded-xl text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function AdminPage() {
  const { products, categories, addProduct, updateProduct, removeProduct, toggleAvailability } = useProducts()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [formMode, setFormMode] = useState(null) // null | 'add' | product-id

  const editingProduct =
    formMode && formMode !== 'add' ? products.find((p) => p.id === formMode) ?? null : null

  const openAdd = () => setFormMode('add')
  const openEdit = (product) => setFormMode(product.id)
  const closeForm = () => setFormMode(null)

  const handleSubmit = async (data) => {
    try {
      if (formMode === 'add') {
        await addProduct({ ...data, available: true })
      } else {
        await updateProduct(formMode, data)
      }
      closeForm()
    } catch (err) {
      alert(`Error saving product: ${err.message}`)
    }
  }

  const handleRemove = async (product) => {
    if (window.confirm(`Remove "${product.name}" from inventory?`)) {
      try {
        await removeProduct(product.id)
      } catch (err) {
        alert(`Error removing product: ${err.message}`)
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-deep-green">Inventory</h1>
          <p className="text-earth-500 text-sm mt-1">
            {products.length} product{products.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!formMode && (
            <button
              onClick={openAdd}
              className="min-h-[44px] bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold px-4 rounded-xl text-sm flex items-center gap-2 transition-colors"
            >
              <span className="text-lg leading-none font-light">+</span>
              Add Product
            </button>
          )}
          <button
            onClick={() => { logout(); navigate('/admin/login') }}
            className="min-h-[44px] border border-earth-200 text-earth-600 hover:bg-earth-50 font-semibold px-4 rounded-xl text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Admin tabs */}
      <div className="flex gap-1 mb-6 bg-earth-100 rounded-xl p-1 w-fit">
        <Link
          to="/admin/inventory"
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-white text-deep-green shadow-sm"
        >
          Inventory
        </Link>
        <Link
          to="/admin/orders"
          className="px-4 py-2 rounded-lg text-sm font-medium text-earth-600 hover:bg-white transition-colors"
        >
          Orders
        </Link>
      </div>

      {/* Add / Edit form */}
      {formMode && (
        <ProductForm
          editingProduct={editingProduct}
          onClose={closeForm}
          onSubmit={handleSubmit}
          categories={categories}
        />
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-earth-100 shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <div className="text-center py-14 text-earth-400 text-sm">
            No products yet — add your first one above!
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-earth-50 text-left border-b border-earth-100">
              <tr>
                <th className="px-4 py-3 font-semibold text-earth-600 text-xs uppercase tracking-wide">Product</th>
                <th className="px-4 py-3 font-semibold text-earth-600 text-xs uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 font-semibold text-earth-600 text-xs uppercase tracking-wide">Price (₹)</th>
                <th className="px-4 py-3 font-semibold text-earth-600 text-xs uppercase tracking-wide">Ingredients</th>
                <th className="px-4 py-3 font-semibold text-earth-600 text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 font-semibold text-earth-600 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-earth-50">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-earth-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-earth-100 flex-shrink-0">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = `https://placehold.co/40x40/e8c9a6/703410?text=${encodeURIComponent(product.name[0])}`
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-deep-green truncate max-w-[160px]">{product.name}</p>
                        {product.bestseller && (
                          <span className="text-[10px] text-saffron-600 font-semibold">★ Bestseller</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-earth-600 whitespace-nowrap">{product.category}</td>
                  <td className="px-4 py-3 font-semibold text-deep-green whitespace-nowrap">₹{product.price_in_inr}</td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {(product.ingredients ?? []).slice(0, 3).map((ing) => (
                        <span
                          key={ing}
                          className="bg-earth-100 text-earth-600 text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap"
                        >
                          {ing}
                        </span>
                      ))}
                      {(product.ingredients ?? []).length > 3 && (
                        <span className="text-[10px] text-earth-400">
                          +{product.ingredients.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAvailability(product.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                        product.available !== false
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-earth-100 text-earth-500 hover:bg-earth-200'
                      }`}
                      aria-label={`Toggle availability for ${product.name}`}
                    >
                      {product.available !== false ? 'In Stock' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(product)}
                        className="text-saffron-600 hover:text-saffron-700 text-xs font-medium transition-colors"
                        aria-label={`Edit ${product.name}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemove(product)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                        aria-label={`Remove ${product.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {products.length === 0 && (
          <div className="text-center py-14 text-earth-400 text-sm">
            No products yet — add your first one above!
          </div>
        )}
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-2xl border border-earth-100 p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-earth-100 flex-shrink-0">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.src = `https://placehold.co/64x64/e8c9a6/703410?text=${encodeURIComponent(product.name[0])}`
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif font-semibold text-deep-green text-sm leading-tight truncate">
                  {product.name}
                </p>
                <p className="text-earth-500 text-xs">{product.category}</p>
                <p className="text-saffron-600 font-bold text-sm mt-0.5">₹{product.price_in_inr}</p>
                {product.bestseller && (
                  <p className="text-[10px] text-saffron-500 font-semibold mt-0.5">★ Bestseller</p>
                )}
              </div>
            </div>

            {(product.ingredients ?? []).length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1">
                {product.ingredients.map((ing) => (
                  <span
                    key={ing}
                    className="bg-earth-100 text-earth-600 text-[10px] font-medium px-2 py-0.5 rounded-full"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-earth-50 gap-2">
              <button
                onClick={() => openEdit(product)}
                className="min-h-[40px] flex-1 flex items-center justify-center gap-1.5 bg-saffron-50 text-saffron-700 rounded-xl text-xs font-semibold transition-colors hover:bg-saffron-100"
                aria-label={`Edit ${product.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => toggleAvailability(product.id)}
                className={`min-h-[40px] flex-1 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  product.available !== false
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-earth-100 text-earth-500 hover:bg-earth-200'
                }`}
                aria-label={`Toggle availability for ${product.name}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${product.available !== false ? 'bg-green-500' : 'bg-earth-400'}`} />
                {product.available !== false ? 'In Stock' : 'Hidden'}
              </button>
              <button
                onClick={() => handleRemove(product)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                aria-label={`Remove ${product.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
