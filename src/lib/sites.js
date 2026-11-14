/** Collections on the single sanathanamshop catalog — not separate websites. */

export const CHILD_SITES = [
  {
    slug: 'soaps',
    domain: 'Soaps',
    name: 'Soaps',
    tagline: 'Purity Enhanced',
    category: 'Soaps · Shampoos · Perfumes',
    description:
      'Handcrafted Ayurvedic naturals — soaps, botanical shampoos, and perfumes made with cold-pressed oils and traditional herbs.',
    highlights: ['100% natural recipes', 'Handcrafted bars', 'Ayurvedic ingredients'],
    accent: '#1a3c34',
    accentSoft: '#e87010',
    tone: 'Forest green & saffron — warm, earthy soap shop',
  },
  {
    slug: 'jewels',
    domain: 'Jewels',
    name: 'Jewels',
    tagline: 'Crafted to shine',
    category: 'Gold · Silver · Gemstones',
    description:
      'Temple-inspired and modern jewellery — necklaces, earrings, rings, and bridal sets finished by artisans in Karnataka.',
    highlights: ['Bridal & festive sets', '925 silver pieces', 'Artisan finished'],
    accent: '#1f1520',
    accentSoft: '#c9a227',
    tone: 'Deep plum & gold — gallery jewellery look',
  },
  {
    slug: 'arts',
    domain: 'Arts',
    name: 'Arts',
    tagline: 'Craft for the home',
    category: 'Textiles · Craft · Gifting',
    description:
      'Handloom weaves, artisan crafts, and pieces made for Indian homes and gifting.',
    highlights: ['Handloom pieces', 'Artisan craft', 'Festival gifts'],
    accent: '#7c2d12',
    accentSoft: '#c2410c',
    tone: 'Maroon & ochre — textiles and craft',
  },
]

export function getSiteBySlug(slug) {
  return CHILD_SITES.find((s) => s.slug === slug) ?? null
}
