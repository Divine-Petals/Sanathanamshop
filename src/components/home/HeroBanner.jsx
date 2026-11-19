import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useStore } from '../../context/StoreContext'
import { fallbackFor } from '../../context/BrandContext'

const SLIDE_MS = 6000

// One layout (the original Divine Petals hero) in each store's own colours.
const HERO_STYLES = {
  'divine-petals': {
    section: 'bg-gradient-to-br from-earth-800 via-deep-green to-earth-900 text-white',
    blobA: 'bg-saffron-500/10',
    blobB: 'bg-saffron-400/10',
    eyebrow: 'bg-saffron-500/20 text-saffron-300',
    highlight: 'text-saffron-400',
    body: 'text-earth-200',
    button: 'bg-saffron-500 hover:bg-saffron-400 active:bg-saffron-600 text-white',
    ringA: 'bg-saffron-500/20',
    ringB: 'bg-saffron-400/20',
    dot: 'bg-saffron-400',
  },
  'divine-jewels': {
    section: 'bg-gradient-to-br from-[#2d2430] via-[#1f1520] to-[#120c13] text-[#faf7f2]',
    blobA: 'bg-[#c9a227]/10',
    blobB: 'bg-[#e8c547]/10',
    eyebrow: 'bg-[#c9a227]/20 text-[#e8c547]',
    highlight: 'text-[#e8c547]',
    body: 'text-[#e8dcc8]',
    button: 'bg-[#c9a227] hover:bg-[#d4af37] active:bg-[#b8911f] text-[#1f1520]',
    ringA: 'bg-[#c9a227]/20',
    ringB: 'bg-[#e8c547]/20',
    dot: 'bg-[#e8c547]',
  },
  sanathanam: {
    section: 'bg-gradient-to-br from-[#9a3412] via-[#7c2d12] to-[#5c1a0a] text-white',
    blobA: 'bg-[#fdba74]/10',
    blobB: 'bg-[#fde68a]/10',
    eyebrow: 'bg-[#fde68a]/20 text-[#fde68a]',
    highlight: 'text-[#fdba74]',
    body: 'text-[#fed7aa]',
    button: 'bg-[#ea580c] hover:bg-[#f97316] active:bg-[#c2410c] text-white',
    ringA: 'bg-[#fdba74]/20',
    ringB: 'bg-[#fde68a]/20',
    dot: 'bg-[#fdba74]',
  },
}

const styleFor = (brand) => HERO_STYLES[brand.theme_key] ?? HERO_STYLES[brand.slug] ?? HERO_STYLES['divine-petals']

/** Branding for every store, current store first. Empty database fields keep the built-in texts. */
function useStoreBrands() {
  const { stores, store } = useStore()
  const ordered = [store, ...stores.filter((s) => s.slug !== store.slug)]
  const key = ordered.map((s) => `${s.slug}:${s.name}:${s.theme_key}`).join('|')
  const [brands, setBrands] = useState(() => ordered.map(fallbackFor))

  useEffect(() => {
    let cancelled = false
    const base = ordered.map(fallbackFor)
    setBrands(base)
    Promise.all(
      ordered.map((s, i) =>
        api
          .storefront(s.slug)
          .then((data) => ({
            ...base[i],
            ...Object.fromEntries(Object.entries(data ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== '')),
          }))
          .catch(() => base[i]),
      ),
    ).then((list) => {
      if (!cancelled) setBrands(list)
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return brands
}

function Slide({ brand, isCurrent, isActive }) {
  const s = styleFor(brand)
  const Heading = isCurrent ? 'h1' : 'h2'
  return (
    <div
      className={`relative w-full shrink-0 ${s.section}`}
      aria-hidden={!isActive}
      inert={isActive ? undefined : ''}
      role="group"
      aria-roledescription="slide"
      aria-label={brand.name}
    >
      <div className={`absolute -top-12 -right-12 w-56 h-56 rounded-full pointer-events-none ${s.blobA}`} aria-hidden="true" />
      <div className={`absolute -bottom-10 -left-10 w-44 h-44 rounded-full pointer-events-none ${s.blobB}`} aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 lg:py-32 flex flex-col md:flex-row items-center gap-10 md:gap-16">
        <div className="flex-1 text-center md:text-left">
          <span className={`inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4 ${s.eyebrow}`}>
            {brand.hero_eyebrow || brand.name}
          </span>
          <Heading className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
            {brand.hero_title}
            {brand.hero_highlight && (
              <>
                <br className="hidden sm:block" />
                <span className={s.highlight}> {brand.hero_highlight}</span>
              </>
            )}
          </Heading>
          {brand.hero_body && (
            <p className={`text-base md:text-lg max-w-md mx-auto md:mx-0 mb-8 leading-relaxed ${s.body}`}>{brand.hero_body}</p>
          )}
          <Link
            to={isCurrent ? `/${brand.slug}/products` : `/${brand.slug}`}
            tabIndex={isActive ? 0 : -1}
            className={`min-h-[48px] flex items-center justify-center font-bold px-8 py-3 rounded-xl text-sm transition-colors ${s.button}`}
          >
            {isCurrent ? 'Shop Now' : `Visit ${brand.name}`}
          </Link>
        </div>
        <div className="flex-1 flex justify-center" aria-hidden="true">
          <div className="relative w-72 h-72 sm:w-96 sm:h-96 md:w-[30rem] md:h-[30rem]">
            <div className={`absolute inset-0 rounded-full animate-pulse ${s.ringA}`} />
            <div className={`absolute inset-6 rounded-full ${s.ringB}`} />
            <div className="absolute inset-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
              {brand.hero_video_url && isActive ? (
                <video className="w-full h-full object-cover rounded-full" autoPlay muted loop playsInline poster={brand.logo_url}>
                  <source src={brand.hero_video_url} type="video/mp4" />
                </video>
              ) : (
                <img src={brand.logo_url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Home hero: one slide per store, auto-advancing, the current store first. */
export default function HeroBanner() {
  const brands = useStoreBrands()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef(null)
  const count = brands.length
  const current = brands[0]?.slug

  // Start on the current store again after switching store.
  useEffect(() => setIndex(0), [current])

  useEffect(() => {
    if (count < 2 || paused) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS)
    return () => clearInterval(id)
  }, [count, paused])

  const go = (i) => setIndex(((i % count) + count) % count)
  const activeStyle = styleFor(brands[index] ?? brands[0])

  return (
    <section
      className="relative overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Our stores"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX
        setPaused(true)
      }}
      onTouchEnd={(e) => {
        const start = touchX.current
        touchX.current = null
        setPaused(false)
        if (start == null || count < 2) return
        const dx = e.changedTouches[0].clientX - start
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1))
      }}
    >
      <div
        className="flex items-stretch transition-transform duration-700 ease-in-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {brands.map((b, i) => (
          <Slide key={b.slug} brand={b} isCurrent={i === 0} isActive={i === index} />
        ))}
      </div>

      {count > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous store"
            className="h-8 w-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/35 text-white transition-colors"
          >
            <Chevron dir="left" />
          </button>
          {brands.map((b, i) => (
            <button
              key={b.slug}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show ${b.name}`}
              aria-current={i === index}
              className="h-8 min-w-6 flex items-center justify-center"
            >
              <span
                className={`block h-2 rounded-full transition-all ${i === index ? `w-6 ${activeStyle.dot}` : 'w-2 bg-white/50'}`}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next store"
            className="h-8 w-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/35 text-white transition-colors"
          >
            <Chevron dir="right" />
          </button>
        </div>
      )}
    </section>
  )
}

function Chevron({ dir }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
      <path d={dir === 'left' ? 'M12.5 4.5L7 10l5.5 5.5' : 'M7.5 4.5L13 10l-5.5 5.5'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
