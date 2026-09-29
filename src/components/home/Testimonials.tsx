import { Quote } from 'lucide-react';
import { SHOW_PLACEHOLDERS, TESTIMONIALS } from '@/lib/home-content';

/** Named client quotes. Placeholder entries only show in development/preview builds. */
const Testimonials = () => {
  const quotes = TESTIMONIALS.filter((t) => !t.placeholder || SHOW_PLACEHOLDERS).slice(0, 4);
  if (!quotes.length) return null;

  return (
    <section aria-labelledby="testimonials-heading">
      <div className="text-center mb-12">
        <h2 id="testimonials-heading" className="text-4xl md:text-6xl font-black text-[#1C0357] mb-6 tracking-tighter">What Singers Say</h2>
      </div>
      <div className={`grid grid-cols-1 gap-6 ${quotes.length === 4 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {quotes.map((t, i) => (
          <figure
            key={i}
            className={`rounded-[32px] bg-white p-8 shadow-sm border ${t.placeholder ? 'border-dashed border-[#1C0357]/30' : 'border-[#1C0357]/10'}`}
          >
            <Quote className="h-8 w-8 text-[#F538BC]" aria-hidden="true" />
            <blockquote className={`mt-4 text-lg font-medium leading-relaxed ${t.placeholder ? 'text-gray-400 italic' : 'text-gray-700'}`}>
              {t.quote}
            </blockquote>
            <figcaption className="mt-6">
              <p className="font-black text-[#1C0357]">{t.name}</p>
              <p className="text-sm font-bold text-gray-500">{t.context}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
