import { useBrand } from '../context/BrandContext'
import { getThemeMeta } from '../lib/theme'
import { CHILD_SITES } from '../lib/sites'

export default function BrandsPage() {
  const brand = useBrand()
  const t = getThemeMeta(brand)
  const currentSlug = brand.theme_key ?? brand.slug

  return (
    <div className="relative overflow-hidden">
      <section className="relative max-w-5xl mx-auto px-4 pt-14 pb-10 md:pt-20 md:pb-14">
        <p className={`text-xs font-bold tracking-[0.2em] uppercase mb-3 ${t.accent}`}>Our brands</p>
        <h1
          className={`font-serif text-4xl md:text-5xl font-bold leading-tight max-w-2xl ${
            currentSlug === 'divine-jewels'
              ? 'text-[#1f1520]'
              : currentSlug === 'sanathanam'
                ? 'text-[#7c2d12]'
                : 'text-deep-green'
          }`}
        >
          Three shops. One family.
        </h1>
        <p className="mt-4 text-base md:text-lg max-w-xl opacity-80 leading-relaxed">
          Explore each storefront — soaps &amp; naturals, jewellery, and textiles with dry fruits.
          Same checkout experience; distinct look, catalog, and craft.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-20 space-y-6 md:space-y-8">
        {CHILD_SITES.map((site, index) => {
          const isCurrent = site.slug === currentSlug
          return (
            <article
              key={site.slug}
              className={`relative overflow-hidden border ${t.cardBorder} ${
                currentSlug === 'divine-jewels' ? 'bg-white/80' : 'bg-white'
              }`}
              style={{
                borderLeftWidth: 4,
                borderLeftColor: site.accentSoft,
              }}
            >
              <div className="p-6 md:p-8 md:flex md:gap-10 md:items-start">
                <div className="md:flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5"
                      style={{ backgroundColor: `${site.accentSoft}22`, color: site.accent }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {isCurrent && (
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${t.accent}`}>
                        You are here
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif text-2xl md:text-3xl font-bold" style={{ color: site.accent }}>
                    {site.name}
                  </h2>
                  <p className="text-xs tracking-widest uppercase mt-1 opacity-60">{site.tagline}</p>
                  <p className={`text-sm font-medium mt-3 ${t.accent}`}>{site.category}</p>
                  <p className="mt-3 text-sm leading-relaxed opacity-80 max-w-xl">{site.description}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {site.highlights.map((h) => (
                      <li
                        key={h}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-black/[0.04]"
                      >
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 md:mt-0 md:w-52 flex-shrink-0 flex flex-col gap-3">
                  {isCurrent ? (
                    <span
                      className="min-h-[48px] inline-flex items-center justify-center text-sm font-semibold border opacity-60 cursor-default"
                      style={{ borderColor: site.accentSoft, color: site.accent }}
                    >
                      Viewing this site
                    </span>
                  ) : (
                    <a
                      href={site.url}
                      className="min-h-[48px] inline-flex items-center justify-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: site.accent }}
                    >
                      Visit {site.name}
                    </a>
                  )}
                  <p className="text-[11px] opacity-50 leading-snug">{site.tone}</p>
                  <p className="text-[10px] font-mono opacity-40 break-all">{site.url}</p>
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
