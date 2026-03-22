import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { totalItems, setIsCartOpen } = useCart()
  const location = useLocation()

  const links = [
    { to: '/', label: 'Home' },
    { to: '/products', label: 'Explore' },
  ]

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-earth-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" aria-label="Divine Petals — Home">
          <img src="../Sanathanamshop/assets/soaps/divinepetals.jpeg" alt="Divine Petals logo: circular emblem featuring natural soap product with warm, earthy tones" className="h-8 w-8 rounded-full object-cover" aria-hidden="true" />
          <div>
            <p className="font-serif text-lg font-bold text-deep-green leading-none">Divine Petals</p>
            <p className="text-[10px] text-earth-500 leading-none tracking-widest uppercase">Pure Indian Naturals</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? 'text-saffron-600'
                  : 'text-earth-700 hover:text-saffron-500'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative min-w-[44px] min-h-[44px] flex items-center justify-center text-earth-700 hover:text-saffron-500 transition-colors"
            aria-label={`Open cart, ${totalItems} item${totalItems !== 1 ? 's' : ''}`}
          >
            <CartIcon />
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 bg-saffron-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Mobile right actions */}
        <div className="flex md:hidden items-center gap-1">
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative min-w-[44px] min-h-[44px] flex items-center justify-center text-earth-700"
            aria-label={`Open cart, ${totalItems} item${totalItems !== 1 ? 's' : ''}`}
          >
            <CartIcon />
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 bg-saffron-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-earth-700"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-earth-100 bg-white shadow-md">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`block px-5 py-3.5 text-sm font-medium border-b border-earth-50 last:border-0 ${
                location.pathname === link.to
                  ? 'text-saffron-600 bg-saffron-50'
                  : 'text-earth-700'
              }`}
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
