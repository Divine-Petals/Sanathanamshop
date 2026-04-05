export default function BrandStory() {
  const stats = [
    { value: "100%", label: "Natural" },
    { value: "10+", label: "Recipes" },
  ];

  return (
    <section
      id="brand-story"
      className="py-12 md:py-16 bg-deep-green text-white"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-center">
          {/* Text */}
          <div className="flex-1 text-center md:text-left">
            <span className="text-saffron-400 text-xs font-bold tracking-widest uppercase">
              Our Story
            </span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mt-2 mb-5 leading-snug">
              Born from India's
              <br />
              Ancient Wisdom
            </h2>
            <p className="text-earth-200 text-sm leading-relaxed mb-4">
              Divine Petals was born in a small Bangalore kitchen, where our
              founder began blending cold-pressed oils and medicinal herbs.
              Every bar is still made by hand — no machines, no shortcuts, no
              compromise.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center md:text-left">
                  <p className="font-serif text-2xl md:text-3xl font-bold text-saffron-400">
                    {stat.value}
                  </p>
                  <p className="text-xs text-earth-300 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="flex-1 flex justify-center" aria-hidden="true">
            <div className="w-64 h-64 md:w-72 md:h-72 rounded-3xl bg-earth-800/60 border border-earth-700 flex flex-col items-center justify-center gap-3 p-6">
              <span className="text-6xl">
                <img
                  src="../assets/soaps/divinepetals.jpeg"
                  alt="Divine Petals logo: circular emblem featuring natural soap product with warm, earthy tones"
                  className="h-8 w-8 rounded-full object-cover"
                  aria-hidden="true"
                />
              </span>
              <p className="font-serif text-saffron-300 text-lg font-semibold text-center">
                Handcrafted with Love
              </p>
              <p className="text-earth-400 text-xs">Bangalore, Karnataka</p>
              <div className="flex gap-2 flex-wrap justify-center mt-2">
                {["Ayurvedic", "Cruelty-Free", "Vegan"].map((tag) => (
                  <span
                    key={tag}
                    className="bg-earth-700/60 text-earth-300 text-[10px] font-medium px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
