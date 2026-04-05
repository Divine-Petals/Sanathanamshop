import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-deep-green text-earth-300 pt-10 pb-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-8 justify-between">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl" aria-hidden="true">🧼</span>
              <div>
                <p className="font-serif text-lg font-bold text-white leading-none">Divine Petals</p>
                <p className="text-[10px] text-earth-400 leading-none tracking-widest uppercase">Pure Indian Naturals</p>
              </div>
            </div>
            <p className="text-xs text-earth-400 leading-relaxed">
              Handcrafted Ayurvedic naturals made from India's finest botanical
              ingredients. Clean, ethical, and kind to your skin.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12">
            <div>
              <p className="text-white font-semibold text-sm mb-3">Shop</p>
              <div className="space-y-2">
                <Link to="/products" className="block text-xs text-earth-400 hover:text-white transition-colors">
                  All Products
                </Link>
                <a href="#brand-story" className="block text-xs text-earth-400 hover:text-white transition-colors">
                  Our Story
                </a>
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Info</p>
              <div className="space-y-2">
                <p className="text-xs text-earth-400">Ships across India</p>
                <p className="text-xs text-earth-400">100% Natural Ingredients</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-earth-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-earth-500">
          <p>© 2026 Divine Petals All rights reserved.</p>
          <p>Made with 🌿 in Bangalore, India</p>
        </div>
      </div>
    </footer>
  )
}
