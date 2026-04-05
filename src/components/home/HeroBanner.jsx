import { Link } from "react-router-dom";

export default function HeroBanner() {
  return (
    <section className="relative bg-gradient-to-br from-earth-800 via-deep-green to-earth-900 text-white overflow-hidden">
      {/* Decorative blobs */}
      <div
        className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-saffron-500/10 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-saffron-400/10 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 lg:py-32 flex flex-col md:flex-row items-center gap-10 md:gap-16">
        {/* Text content */}
        <div className="flex-1 text-center md:text-left">
          <span className="inline-block bg-saffron-500/20 text-saffron-300 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4">
            Soaps · Shampoos · Perfumes
          </span>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
            Naturals That Tell
            <br className="hidden sm:block" />{" "}
            <span className="text-saffron-400">India's Story</span>
          </h1>
          <p className="text-earth-200 text-base md:text-lg max-w-md mx-auto md:mx-0 mb-8 leading-relaxed">
            Handcrafted soaps, botanical shampoos &amp; natural perfumes —
            processed with Ayurvedic herbs and ancient Indian Formulations. Pure
            goodness starting from ₹140 .
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <Link
              to="/products"
              className="min-h-[48px] flex items-center justify-center bg-saffron-500 hover:bg-saffron-400 active:bg-saffron-600 text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors"
            >
              Shop Now
            </Link>
          </div>
        </div>
        {/* Visual element */}
        <div className="flex-1 flex justify-center" aria-hidden="true">
          <div className="relative w-96 h-96 md:w-[30rem] md:h-[30rem]">
            <div className="absolute inset-0 rounded-full bg-saffron-500/20 animate-pulse" />
            <div className="absolute inset-6 rounded-full bg-saffron-400/20" />
            <div className="absolute inset-12 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-6xl md:text-7xl select-none"></span>
              <video
                className="w-full h-full object-cover rounded-full"
                autoPlay
                muted
                loop
              >
                <source
                  src="https://socllleyedkzivnimxru.supabase.co/storage/v1/object/public/divinepetalsassessts/WhatsApp%20Video%202026-04-03%20at%2017.48.52.mp4"
                  type="video/mp4"
                />
              </video>
            </div>
          </div>
        </div>
         
      </div>
    </section>
  );
}
