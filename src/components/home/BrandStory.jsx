import { useBrand } from '../../context/BrandContext'
import { getThemeMeta } from '../../lib/theme'

export default function BrandStory() {
  const brand = useBrand()
  const t = getThemeMeta(brand)

  const stats =
    brand.theme_key === 'divine-jewels'
      ? [
          { value: '925', label: 'Silver purity' },
          { value: '50+', label: 'Designs' },
          { value: 'Artisan', label: 'Finished' },
        ]
      : brand.theme_key === 'sanathanam'
        ? [
            { value: 'Handloom', label: 'Textiles' },
            { value: 'Farm', label: 'Sourced nuts' },
            { value: 'India', label: 'Wide delivery' },
          ]
        : [
            { value: '100%', label: 'Natural' },
            { value: '10+', label: 'Recipes' },
          ]

  return (
    <section id="brand-story" className={`py-12 md:py-16 ${t.storyBg}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-center">
          <div className="flex-1 text-center md:text-left">
            <span className={`text-xs font-bold tracking-widest uppercase ${t.accent}`}>Our Story</span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mt-2 mb-5 leading-snug">
              {brand.story_title}
            </h2>
            <p className="text-sm leading-relaxed opacity-90 mb-6">{brand.story_body}</p>
            <div className={`grid gap-4 ${stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {stats.map((stat) => (
                <div key={stat.label} className="text-center md:text-left">
                  <p className={`font-serif text-2xl md:text-3xl font-bold ${t.accent}`}>{stat.value}</p>
                  <p className="text-xs opacity-75 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          {brand.theme_key === 'divine-petals' && (
            <div className="flex-1 flex justify-center" aria-hidden="true">
              <div className="w-64 h-64 md:w-72 md:h-72 rounded-3xl bg-earth-800/60 border border-earth-700 flex flex-col items-center justify-center gap-3 p-6">
                <img src={brand.logo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
                <p className="font-serif text-saffron-300 text-lg font-semibold text-center">
                  Handcrafted with Love
                </p>
                <p className="text-earth-400 text-xs">Bangalore, Karnataka</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
