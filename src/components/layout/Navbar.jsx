import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useBrand } from '../../context/BrandContext'
import { getThemeMeta } from '../../lib/theme'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { totalItems, setIsCartOpen } = useCart()
  const { isAuthenticated } = useAuth()
  const brand = useBrand()
  const t = getThemeMeta(brand)
  const location = useLocation()

  const links = [
    { to: '/', label: 'Home' },
    { to: '/products', label: t.exploreLabel },
    { to: '/brands', label: 'Our brands' },
    { to: isAuthenticated ? '/account' : '/login', label: isAuthenticated ? 'Account' : 'Sign in' },
  ]

  const cartBadge =
    brand.theme_key === 'divine-jewels'
      ? 'bg-[#c9a227] text-[#1f1520]'
      : brand.theme_key === 'sanathanam'
        ? 'bg-[#c2410c] text-white'
        : 'bg-saffron-500 text-white'

  return (
    <nav className={`sticky top-0 z-40 ${t.nav}`}>
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" aria-label={`${brand.name} — Home`}>
          <img src={brand.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" aria-hidden="true" />
          <div>
            <p className={`font-serif text-lg font-bold leading-none ${t.navTitle}`}>{brand.name}</p>
            <p className={`text-[10px] leading-none tracking-widest uppercase ${t.navTagline}`}>
              {brand.tagline}
            </p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.to ? t.navLinkActive : t.navLink
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => setIsCartOpen(true)}
            className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${t.navLink}`}
            aria-label={`Open cart, ${totalItems} item${totalItems !== 1 ? 's' : ''}`}
          >
            <CartIcon />
            {totalItems > 0 && (
              <span className={`absolute top-1 right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${cartBadge}`}>
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        </div>

        <div className="flex md:hidden items-center gap-1">
          <button
            onClick={() => setIsCartOpen(true)}
            className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center ${t.navTitle}`}
            aria-label={`Open cart, ${totalItems} item${totalItems !== 1 ? 's' : ''}`}
          >
            <CartIcon />
            {totalItems > 0 && (
              <span className={`absolute top-1 right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${cartBadge}`}>
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center ${t.navTitle}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className={`md:hidden border-t ${brand.theme_key === 'divine-jewels' ? 'border-[#c9a227]/20 bg-[#1f1520]' : 'border-earth-100 bg-white'}`}>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`block px-5 py-3.5 text-sm font-medium border-b last:border-0 ${
                location.pathname === link.to ? t.navLinkActive : t.navLink
              } ${brand.theme_key === 'divine-jewels' ? 'border-[#c9a227]/10' : 'border-earth-50'}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}

function CartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
