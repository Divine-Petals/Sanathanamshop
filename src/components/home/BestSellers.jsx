import { Link } from 'react-router-dom'
import { useProducts } from '../../context/ProductContext'
import { useCart } from '../../context/CartContext'

function BestSellerCard({ product }) {
  const { addToCart } = useCart()
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-earth-100 overflow-hidden group flex flex-col">
      {/* Image */}
      <div className="relative h-40 bg-gradient-to-br from-earth-100 to-earth-200 overflow-hidden flex-shrink-0">
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.onerror = null
            e.target.src = `https://placehold.co/240x160/e8c9a6/703410?text=${encodeURIComponent(
              product.name.split(' ')[0]
            )}`
          }}
        />
        <span className="absolute top-2 left-2 bg-saffron-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">
          BESTSELLER
        </span>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <p className="font-serif font-semibold text-deep-green text-sm leading-tight mb-0.5">
          {product.name}
        </p>
        <p className="text-saffron-600 font-bold text-sm mb-2">₹{product.price_in_inr}</p>
        <button
          onClick={() => addToCart(product)}
          className="mt-auto w-full min-h-[36px] bg-deep-green hover:bg-earth-700 active:bg-earth-800 text-white text-xs font-semibold rounded-lg transition-colors"
          aria-label={`Add ${product.name} to cart`}
        >
          Add to Cart
        </button>
      </div>
    </div>
  )
}

export default function BestSellers() {
  const { products } = useProducts()
  const bestsellers = products.filter((p) => p.bestseller && p.available !== false).slice(0, 6)

  return (
    <section className="py-12 md:py-16 bg-cream">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-deep-green">
              Best Sellers
            </h2>
            <p className="text-earth-500 text-sm mt-1">Loved by thousands across India</p>
          </div>
          <Link
            to="/products"
            className="hidden md:inline-block text-saffron-600 text-sm font-semibold hover:underline underline-offset-2"
          >
            View All →
          </Link>
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="md:hidden -mx-4 px-4 overflow-x-auto scrollbar-none pb-2">
          <div className="flex gap-3" style={{ width: 'max-content' }}>
            {bestsellers.map((product) => (
              <div key={product.id} className="w-44 flex-shrink-0">
                <BestSellerCard product={product} />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: grid */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-4">
          {bestsellers.map((product) => (
            <BestSellerCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-5 md:hidden text-center">
          <Link to="/products" className="text-saffron-600 text-sm font-semibold">
            View All Products →
          </Link>
        </div>
      </div>
    </section>
  )
}
