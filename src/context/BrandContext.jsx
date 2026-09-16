import { createContext, useContext, useEffect, useState } from 'react'
import { api, getStorefrontTenant } from '../lib/api'

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

const tenant = import.meta.env.VITE_TENANT ?? getStorefrontTenant()
const FALLBACK = FALLBACKS[tenant] ?? FALLBACKS['divine-petals']

export function BrandProvider({ children }) {
  const [brand, setBrand] = useState(FALLBACK)

  useEffect(() => {
    api.storefront().then(setBrand).catch(() => setBrand(FALLBACKS[tenant] ?? FALLBACKS['divine-petals']))
  }, [])

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
