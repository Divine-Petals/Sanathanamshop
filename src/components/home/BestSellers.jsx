import { Link } from 'react-router-dom'
import { useProducts } from '../../context/ProductContext'
import { useCart } from '../../context/CartContext'
import { useBrand } from '../../context/BrandContext'
import { getThemeMeta } from '../../lib/theme'

function BestSellerCard({ product, t, themeKey }) {
  const { addToCart } = useCart()
  const titleClass =
    themeKey === 'divine-jewels' ? 'text-[#1f1520]' : themeKey === 'sanathanam' ? 'text-[#7c2d12]' : 'text-deep-green'

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden group flex flex-col ${t.cardBorder}`}>
      <div className="relative h-40 bg-gradient-to-br from-earth-100 to-earth-200 overflow-hidden flex-shrink-0">
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.onerror = null
            e.target.src = `https://placehold.co/240x160/e8c9a6/703410?text=${encodeURIComponent(product.name.split(' ')[0])}`
          }}
        />
        <span className={`absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide ${t.accentBg}`}>
          BESTSELLER
        </span>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className={`font-serif font-semibold text-sm leading-tight mb-0.5 ${titleClass}`}>{product.name}</p>
        <p className={`font-bold text-sm mb-2 ${t.accent}`}>₹{product.price_in_inr}</p>
        <button
          onClick={() => addToCart(product)}
          className={`mt-auto w-full min-h-[36px] text-white text-xs font-semibold rounded-lg transition-colors ${t.primaryBtn}`}
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
  const brand = useBrand()
  const t = getThemeMeta(brand)
  const themeKey = brand.theme_key ?? brand.slug
  const bestsellers = products.filter((p) => p.bestseller && p.available !== false).slice(0, 6)

  const subtitle =
    themeKey === 'divine-jewels'
      ? 'Pieces loved for weddings & festivals'
      : themeKey === 'sanathanam'
        ? 'Popular weaves and pantry picks'
        : 'Loved by thousands across India'

  const titleClass =
    themeKey === 'divine-jewels' ? 'text-[#1f1520]' : themeKey === 'sanathanam' ? 'text-[#7c2d12]' : 'text-deep-green'

  return (
    <section className={`py-12 md:py-16 ${t.shell}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`font-serif text-2xl md:text-3xl font-bold ${titleClass}`}>Best Sellers</h2>
            <p className="text-earth-500 text-sm mt-1">{subtitle}</p>
          </div>
          <Link to="/products" className={`hidden md:inline-block text-sm font-semibold hover:underline underline-offset-2 ${t.accent}`}>
            View All →
          </Link>
        </div>
        <div className="md:hidden -mx-4 px-4 overflow-x-auto scrollbar-none pb-2">
          <div className="flex gap-3" style={{ width: 'max-content' }}>
            {bestsellers.map((product) => (
              <div key={product.id} className="w-44 flex-shrink-0">
                <BestSellerCard product={product} t={t} themeKey={themeKey} />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-4">
          {bestsellers.map((product) => (
            <BestSellerCard key={product.id} product={product} t={t} themeKey={themeKey} />
          ))}
        </div>
        <div className="mt-5 md:hidden text-center">
          <Link to="/products" className={`text-sm font-semibold ${t.accent}`}>View All →</Link>
        </div>
      </div>
    </section>
  )
}
