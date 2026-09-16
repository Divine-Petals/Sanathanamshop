/** Theme tokens per storefront — Divine Petals keeps the original soap-shop look. */
export const THEME_META = {
  'divine-petals': {
    catalogTitle: 'Explore Our Naturals',
    searchPlaceholder: 'Search naturals...',
    exploreLabel: 'Explore',
    shell: 'bg-cream text-deep-green',
    nav: 'bg-white/95 backdrop-blur-sm border-b border-earth-100 shadow-sm',
    navTitle: 'text-deep-green',
    navTagline: 'text-earth-500',
    navLinkActive: 'text-saffron-600',
    navLink: 'text-earth-700 hover:text-saffron-500',
    footer: 'bg-deep-green text-earth-300',
    accent: 'text-saffron-600',
    accentBg: 'bg-saffron-500',
    accentBgHover: 'hover:bg-saffron-400',
    primaryBtn: 'bg-deep-green hover:bg-earth-800 text-white',
    cardBorder: 'border-earth-100',
    storyBg: 'bg-deep-green text-white',
  },
  'divine-jewels': {
    catalogTitle: 'Explore the Collection',
    searchPlaceholder: 'Search jewels…',
    exploreLabel: 'Collection',
    shell: 'bg-[#faf7f2] text-[#1f1520]',
    nav: 'bg-[#1f1520]/95 backdrop-blur-sm border-b border-[#c9a227]/30',
    navTitle: 'text-[#faf7f2]',
    navTagline: 'text-[#c9a227]',
    navLinkActive: 'text-[#e8c547]',
    navLink: 'text-[#e8dcc8] hover:text-[#e8c547]',
    footer: 'bg-[#1f1520] text-[#e8dcc8]',
    accent: 'text-[#c9a227]',
    accentBg: 'bg-[#c9a227]',
    accentBgHover: 'hover:bg-[#d4af37]',
    primaryBtn: 'bg-[#1f1520] hover:bg-[#2d2430] text-[#faf7f2] border border-[#c9a227]/40',
    cardBorder: 'border-[#e8dcc8]',
    storyBg: 'bg-[#1f1520] text-[#faf7f2]',
  },
  sanathanam: {
    catalogTitle: 'Textiles & Dry Fruits',
    searchPlaceholder: 'Search sarees, fabrics, nuts…',
    exploreLabel: 'Shop',
    shell: 'bg-[#fff8f0] text-[#5c1a0a]',
    nav: 'bg-[#fff8f0]/95 backdrop-blur-sm border-b border-[#c2410c]/20 shadow-sm',
    navTitle: 'text-[#7c2d12]',
    navTagline: 'text-[#b45309]',
    navLinkActive: 'text-[#c2410c]',
    navLink: 'text-[#78350f] hover:text-[#c2410c]',
    footer: 'bg-[#7c2d12] text-[#fde68a]',
    accent: 'text-[#c2410c]',
    accentBg: 'bg-[#c2410c]',
    accentBgHover: 'hover:bg-[#ea580c]',
    primaryBtn: 'bg-[#7c2d12] hover:bg-[#9a3412] text-white',
    cardBorder: 'border-[#fed7aa]',
    storyBg: 'bg-[#7c2d12] text-[#fff8f0]',
  },
}

export function getThemeKey(brand) {
  return brand?.theme_key ?? brand?.slug ?? 'divine-petals'
}

export function getThemeMeta(brand) {
  const key = getThemeKey(brand)
  return THEME_META[key] ?? THEME_META['divine-petals']
}
