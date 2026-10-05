/** Sibling storefronts — local ports for dev; override via VITE_*_URL in Netlify. */

export const CHILD_SITES = [
  {
    slug: 'divine-petals',
    name: 'Divine Petals',
    tagline: 'Purity Enhanced',
    category: 'Soaps · Shampoos · Perfumes',
    description:
      'Handcrafted Ayurvedic naturals — soaps, botanical shampoos, and perfumes made with cold-pressed oils and traditional herbs from a Bangalore kitchen.',
    highlights: ['100% natural recipes', 'Handcrafted bars', 'Ayurvedic ingredients'],
    url:
      import.meta.env.VITE_URL_DIVINE_PETALS ??
      (import.meta.env.DEV ? 'http://localhost:5173' : 'https://www.divinepetals.in'),
    accent: '#1a3c34',
    accentSoft: '#e87010',
    tone: 'Forest green & saffron — warm, earthy soap shop',
  },
  {
    slug: 'divine-jewels',
    name: 'Divine Jewels',
    tagline: 'Crafted to shine',
    category: 'Gold · Silver · Gemstones',
    description:
      'Temple-inspired and modern jewellery — necklaces, earrings, rings, and bridal sets finished by artisans in Karnataka.',
    highlights: ['Bridal & festive sets', '925 silver pieces', 'Artisan finished'],
    url:
      import.meta.env.VITE_URL_DIVINE_JEWELS ??
      (import.meta.env.DEV ? 'http://localhost:5174' : 'https://jewels.sanathanamshop.in'),
    accent: '#1f1520',
    accentSoft: '#c9a227',
    tone: 'Deep plum & gold — gallery jewellery look',
  },
  {
    slug: 'sanathanam',
    name: 'Sanathanam',
    tagline: 'Tradition in every weave',
    category: 'Textiles · Dry fruits · Spices',
    description:
      'Handloom sarees, soft cottons, and farm-sourced dry fruits — from loom to larder, packed for Indian homes and gifting.',
    highlights: ['Handloom sarees', 'Premium dry fruits', 'Festival gift boxes'],
    url:
      import.meta.env.VITE_URL_SANATHANAM ??
      (import.meta.env.DEV ? 'http://localhost:5175' : 'https://www.sanathanamshop.in'),
    accent: '#7c2d12',
    accentSoft: '#c2410c',
    tone: 'Maroon & ochre — textiles and pantry',
  },
]

export function getSiteBySlug(slug) {
  return CHILD_SITES.find((s) => s.slug === slug) ?? null
}
