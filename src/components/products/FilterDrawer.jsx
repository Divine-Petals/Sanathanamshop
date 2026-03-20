import { CATEGORIES } from '../../data/products'

function FilterContent({ selectedCategory, onSelectCategory, priceRange, onPriceChange, onClose }) {
  return (
    <div className="space-y-6">
      {/* Category filter */}
      <div>
        <h3 className="font-semibold text-deep-green text-sm mb-3">Category</h3>
        <div className="space-y-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                onSelectCategory(cat)
                if (onClose) onClose()
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                selectedCategory === cat
                  ? 'bg-saffron-500 text-white'
                  : 'bg-earth-50 text-earth-700 hover:bg-earth-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Price filter */}
      <div>
        <h3 className="font-semibold text-deep-green text-sm mb-1">
          Max Price: <span className="text-saffron-600">₹{priceRange}</span>
        </h3>
        <input
          type="range"
          min={150}
          max={400}
          step={10}
          value={priceRange}
          onChange={(e) => onPriceChange(Number(e.target.value))}
          className="w-full mt-2 accent-saffron-500"
          aria-label="Maximum price filter"
        />
        <div className="flex justify-between text-xs text-earth-400 mt-1">
          <span>₹150</span>
          <span>₹400</span>
        </div>
      </div>
    </div>
  )
}

export default function FilterDrawer({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  priceRange,
  onPriceChange,
}) {
  return (
    <>
      {/* Desktop sidebar — always visible on md+ */}
      <aside className="hidden md:block w-52 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-earth-100 p-4 sticky top-20">
          <h2 className="font-serif text-lg font-bold text-deep-green mb-4">Filters</h2>
          <FilterContent
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
            priceRange={priceRange}
            onPriceChange={onPriceChange}
          />
        </div>
      </aside>

      {/* Mobile bottom drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Product filters"
            className="fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto md:hidden shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold text-deep-green">Filters</h2>
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-earth-400 hover:text-deep-green transition-colors"
                aria-label="Close filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FilterContent
              selectedCategory={selectedCategory}
              onSelectCategory={onSelectCategory}
              priceRange={priceRange}
              onPriceChange={onPriceChange}
              onClose={onClose}
            />
          </div>
        </>
      )}
    </>
  )
}
