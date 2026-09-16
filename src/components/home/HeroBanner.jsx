import { Link } from 'react-router-dom'
import { useBrand } from '../../context/BrandContext'
import { getThemeKey } from '../../lib/theme'

export default function HeroBanner() {
  const brand = useBrand()
  const theme = getThemeKey(brand)

  if (theme === 'divine-jewels') {
    return (
      <section className="relative bg-[#1f1520] text-[#faf7f2] overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, #c9a227 0%, transparent 45%), radial-gradient(circle at 80% 70%, #8b6914 0%, transparent 40%)',
          }}
          aria-hidden="true"
        />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <span className="inline-block text-[#c9a227] text-xs font-semibold tracking-[0.25em] uppercase mb-4">
              {brand.hero_eyebrow}
            </span>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
              {brand.hero_title}
              <span className="block text-[#e8c547] mt-2">{brand.hero_highlight}</span>
            </h1>
            <p className="text-[#e8dcc8] text-base md:text-lg max-w-lg mb-8 leading-relaxed">
              {brand.hero_body}
            </p>
            <Link
              to="/products"
              className="min-h-[48px] inline-flex items-center justify-center font-semibold px-10 py-3 text-sm border border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#1f1520] transition-colors tracking-wide"
            >
              View Collection
            </Link>
          </div>
          <div className="flex-1 flex justify-center" aria-hidden="true">
            <div className="w-72 h-72 md:w-80 md:h-80 border border-[#c9a227]/50 p-3 rotate-3">
              <div className="w-full h-full border border-[#c9a227]/30 flex items-center justify-center bg-[#2d2430]">
                <img
                  src={brand.logo_url}
                  alt=""
                  className="w-32 h-32 rounded-full object-cover ring-2 ring-[#c9a227]/60"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (theme === 'sanathanam') {
    return (
      <section className="relative bg-[#fff8f0] text-[#5c1a0a] overflow-hidden border-b border-[#fed7aa]">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #c2410c 0, #c2410c 2px, transparent 2px, transparent 12px), repeating-linear-gradient(-45deg, #b45309 0, #b45309 2px, transparent 2px, transparent 12px)',
          }}
          aria-hidden="true"
        />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 text-center md:text-left">
            <span className="inline-block bg-[#c2410c]/10 text-[#c2410c] text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4">
              {brand.hero_eyebrow}
            </span>
            <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-4 text-[#7c2d12]">
              {brand.hero_title}
              <span className="text-[#c2410c]"> {brand.hero_highlight}</span>
            </h1>
            <p className="text-[#78350f] text-base md:text-lg max-w-xl mb-8 leading-relaxed">
              {brand.hero_body}
            </p>
            <Link
              to="/products"
              className="min-h-[48px] inline-flex items-center justify-center bg-[#c2410c] hover:bg-[#ea580c] text-white font-bold px-8 py-3 rounded-full text-sm transition-colors"
            >
              Shop Sanathanam
            </Link>
          </div>
          <div className="flex gap-3" aria-hidden="true">
            <div className="w-36 h-44 rounded-2xl bg-[#fde68a] border-2 border-[#c2410c]/30 flex items-center justify-center text-center p-3 text-xs font-semibold text-[#7c2d12]">
              Handloom textiles
            </div>
            <div className="w-36 h-44 rounded-2xl bg-[#fef3c7] border-2 border-[#b45309]/30 flex items-center justify-center text-center p-3 text-xs font-semibold text-[#78350f] mt-8">
              Premium dry fruits
            </div>
          </div>
        </div>
      </section>
    )
  }

  /* Divine Petals — original soap shop hero */
  return (
    <section className="relative bg-gradient-to-br from-earth-800 via-deep-green to-earth-900 text-white overflow-hidden">
      <div
        className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-saffron-500/10 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-saffron-400/10 pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 lg:py-32 flex flex-col md:flex-row items-center gap-10 md:gap-16">
        <div className="flex-1 text-center md:text-left">
          <span className="inline-block bg-saffron-500/20 text-saffron-300 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4">
            {brand.hero_eyebrow}
          </span>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
            {brand.hero_title}
            <br className="hidden sm:block" />
            <span className="text-saffron-400">{brand.hero_highlight}</span>
          </h1>
          <p className="text-earth-200 text-base md:text-lg max-w-md mx-auto md:mx-0 mb-8 leading-relaxed">
            {brand.hero_body}
          </p>
          <Link
            to="/products"
            className="min-h-[48px] flex items-center justify-center bg-saffron-500 hover:bg-saffron-400 active:bg-saffron-600 text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors"
          >
            Shop Now
          </Link>
        </div>
        <div className="flex-1 flex justify-center" aria-hidden="true">
          <div className="relative w-96 h-96 md:w-[30rem] md:h-[30rem]">
            <div className="absolute inset-0 rounded-full bg-saffron-500/20 animate-pulse" />
            <div className="absolute inset-6 rounded-full bg-saffron-400/20" />
            <div className="absolute inset-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
              {brand.hero_video_url ? (
                <video className="w-full h-full object-cover rounded-full" autoPlay muted loop>
                  <source src={brand.hero_video_url} type="video/mp4" />
                </video>
              ) : (
                <img src={brand.logo_url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
