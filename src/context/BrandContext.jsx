import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useStore } from './StoreContext'

const BrandContext = createContext(null)

const FALLBACKS = {
  'divine-petals': {
    slug: 'divine-petals',
    name: 'Divine Petals',
    tagline: 'Purity Enhanced',
    theme_key: 'divine-petals',
    hero_eyebrow: 'Soaps · Shampoos · Perfumes',
    hero_title: 'Naturals That Tell',
    hero_highlight: "India's Story",
    hero_body:
      'Handcrafted soaps, botanical shampoos & natural perfumes — processed with Ayurvedic herbs and ancient Indian formulations.',
    story_title: "Born from India's Ancient Wisdom",
    story_body:
      'Divine Petals was born in a small Bangalore kitchen, where our founder began blending cold-pressed oils and medicinal herbs.',
    logo_url: '/assets/soaps/divinepetals.jpeg',
    hero_video_url:
      'https://socllleyedkzivnimxru.supabase.co/storage/v1/object/public/divinepetalsassessts/WhatsApp%20Video%202026-04-03%20at%2017.48.52.mp4',
  },
  'divine-jewels': {
    slug: 'divine-jewels',
    name: 'Divine Jewels',
    tagline: 'Crafted to shine',
    theme_key: 'divine-jewels',
    hero_eyebrow: 'Gold · Silver · Gemstones',
    hero_title: 'Jewellery that carries',
    hero_highlight: 'your light',
    hero_body:
      'Hand-finished necklaces, earrings, and rings — temple-inspired motifs and modern minimal lines.',
    story_title: 'Every stone, a story',
    story_body:
      'Divine Jewels curates fine jewellery for weddings, festivals, and everyday grace.',
    logo_url: 'https://placehold.co/128x128/1f1520/c9a227?text=DJ',
    hero_video_url: '',
  },
  sanathanam: {
    slug: 'sanathanam',
    name: 'Sanathanam',
    tagline: 'Tradition in every weave',
    theme_key: 'sanathanam',
    hero_eyebrow: 'Textiles · Dry fruits · Spices',
    hero_title: 'Weaves, fabrics &',
    hero_highlight: 'farm-fresh bounty',
    hero_body:
      'Handloom sarees, soft cottons, and premium dry fruits from Indian farms.',
    story_title: 'From loom to larder',
    story_body:
      'Sanathanam brings together India\'s textile heritage and the richness of dry fruits.',
    logo_url: 'https://placehold.co/128x128/7c2d12/fef3c7?text=S',
    hero_video_url: '',
  },
}

// Built-in texts for a store. A store added in the admin borrows its theme preset's look,
// with its own name in place of the preset's texts.
export function fallbackFor(store) {
  if (FALLBACKS[store.slug]) return FALLBACKS[store.slug]
  const preset = FALLBACKS[store.theme_key] ?? FALLBACKS['divine-petals']
  return {
    ...preset,
    slug: store.slug,
    name: store.name,
    tagline: store.tagline || '',
    theme_key: store.theme_key || preset.theme_key,
    hero_eyebrow: store.tagline || '',
    hero_title: store.name,
    hero_highlight: '',
    hero_body: '',
    story_title: store.name,
    story_body: '',
    logo_url: store.logo_url || `https://placehold.co/128x128/1a3c34/ffffff?text=${encodeURIComponent(store.name[0] ?? 'S')}`,
    hero_video_url: '',
  }
}

export function BrandProvider({ children }) {
  const { store } = useStore()
  const [brand, setBrand] = useState(() => fallbackFor(store))

  useEffect(() => {
    let cancelled = false
    const fallback = fallbackFor(store)
    setBrand(fallback)
    // Fields left empty in the database (Admin → Stores) keep the built-in default.
    api.storefront(store.slug)
      .then((data) => {
        if (cancelled) return
        const filled = Object.fromEntries(
          Object.entries(data ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== ''),
        )
        setBrand({ ...fallback, ...filled })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [store.slug, store.name, store.theme_key])

  useEffect(() => {
    document.documentElement.dataset.theme = brand.theme_key ?? brand.slug
    document.title = `${brand.name} — ${brand.tagline}`
  }, [brand])

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}

export function useBrand() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}
