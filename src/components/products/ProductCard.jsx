import { useCart } from '../../context/CartContext'

function placeholderFor(name) {
  return `https://placehold.co/300x200/e8c9a6/703410?text=${encodeURIComponent(
    name.split('&')[0].trim()
  )}`
}

export default function ProductCard({ product }) {
  const { addToCart } = useCart()

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-earth-100 overflow-hidden group flex flex-col">
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-earth-100 to-earth-200 overflow-hidden flex-shrink-0">
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.onerror = null
            e.target.src = placeholderFor(product.name)
          }}
        />
        {product.bestseller && (
          <span className="absolute top-2 left-2 bg-saffron-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">
            BESTSELLER
          </span>
        )}
        <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-earth-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
          {product.category}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-serif font-semibold text-deep-green text-base leading-tight mb-1">
          {product.name}
        </h3>
        <p className="text-earth-500 text-xs leading-relaxed mb-2">
          {product.description}
        </p>

        {/* Ingredients */}
        {(product.ingredients ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.ingredients.slice(0, 4).map((ing) => (
              <span
                key={ing}
                className="bg-earth-100 text-earth-600 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              >
                {ing}
              </span>
            ))}
            {product.ingredients.length > 4 && (
              <span className="text-[10px] text-earth-400 self-center">
                +{product.ingredients.length - 4} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-auto">
          <div>
            <p className="text-saffron-600 font-bold text-lg leading-none">₹{product.price_in_inr}</p>
          </div>
          <button
            onClick={() => addToCart(product)}
            className="min-h-[44px] min-w-[44px] bg-deep-green hover:bg-earth-700 active:bg-earth-800 text-white text-xs font-semibold px-4 rounded-xl transition-colors"
            aria-label={`Add ${product.name} to cart`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}
