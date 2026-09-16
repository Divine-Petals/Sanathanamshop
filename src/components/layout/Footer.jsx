import { Link } from 'react-router-dom'
import { useBrand } from '../../context/BrandContext'
import { getThemeMeta } from '../../lib/theme'

export default function Footer() {
  const brand = useBrand()
  const t = getThemeMeta(brand)

  return (
    <footer className={`pt-10 pb-6 mt-auto ${t.footer}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-8 justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-3">
              <img src={brand.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
              <div>
                <p className="font-serif text-lg font-bold leading-none opacity-95">{brand.name}</p>
                <p className="text-[10px] opacity-70 leading-none tracking-widest uppercase">{brand.tagline}</p>
              </div>
            </div>
            <p className="text-xs opacity-70 leading-relaxed">{brand.story_body}</p>
          </div>
          <div>
            <p className="font-semibold text-sm mb-3 opacity-95">Shop</p>
            <Link to="/products" className="block text-xs opacity-70 hover:opacity-100 transition-opacity mb-2">
              {t.exploreLabel}
            </Link>
            <Link to="/brands" className="block text-xs opacity-70 hover:opacity-100 transition-opacity">
              Our brands
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 text-xs opacity-60">
          © 2026 {brand.name}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
