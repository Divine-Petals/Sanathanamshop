import { useState, useMemo } from 'react'
import { useProducts } from '../context/ProductContext'
import { useCart } from '../context/CartContext'
import ProductGrid from '../components/products/ProductGrid'
import FilterDrawer from '../components/products/FilterDrawer'

export default function ProductsPage() {
  const { products } = useProducts()
  const { totalItems, totalPrice, setIsCartOpen } = useCart()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [priceRange, setPriceRange] = useState(400)
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (p.available === false) return false
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false
      if (p.price_in_inr > priceRange) return false
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [products, selectedCategory, priceRange, searchQuery])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-10 pb-24 md:pb-10">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-deep-green">
          Explore Our Naturals
        </h1>
        <p className="text-earth-500 text-sm mt-1">
          {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Search bar + mobile filter button */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="search"
            placeholder="Search naturals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-earth-200 bg-white text-deep-green text-sm placeholder-earth-400 focus:outline-none focus:ring-2 focus:ring-saffron-300"
            aria-label="Search naturals"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-earth-400 pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter toggle — mobile only */}
        <button
          onClick={() => setFilterOpen(true)}
          className="md:hidden min-h-[44px] min-w-[44px] flex items-center gap-2 bg-white border border-earth-200 rounded-xl px-3 text-sm font-medium text-earth-700"
          aria-label="Open filters"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filter</span>
          {selectedCategory !== 'All' && (
            <span className="bg-saffron-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">1</span>
          )}
        </button>
      </div>

      {/* Sidebar + product grid */}
      <div className="flex gap-6">
        <FilterDrawer
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          priceRange={priceRange}
          onPriceChange={setPriceRange}
        />
        <div className="flex-1 min-w-0">
          <ProductGrid products={filtered} />
        </div>
      </div>

      {/* Sticky bottom cart bar (mobile only) — appears when cart has items */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden z-30 px-4 pb-4 pointer-events-none">
          <button
            onClick={() => setIsCartOpen(true)}
            className="pointer-events-auto w-full min-h-[52px] bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white rounded-2xl shadow-lg flex items-center justify-between px-5 transition-colors"
            aria-label={`View cart — ${totalItems} items, ₹${totalPrice.toFixed(2)}`}
          >
            <div className="flex items-center gap-2.5">
              <span className="bg-white text-saffron-600 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
              <span className="font-semibold text-sm">View Cart</span>
            </div>
            <span className="font-bold">₹{totalPrice.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
