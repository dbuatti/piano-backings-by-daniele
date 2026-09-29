import { Headphones, Mic, Music, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SHOW_PLACEHOLDERS, TIER_SAMPLES } from '@/lib/home-content';

const ICONS = [Mic, Headphones, Sparkles];

/** "Hear each tier": one short clip per custom-order tier. */
const AudioSamples = () => {
  const samples = TIER_SAMPLES.map((s, i) => ({ ...s, Icon: ICONS[i] || Music })).filter((s) => s.src || SHOW_PLACEHOLDERS);
  if (!samples.length) return null;

  return (
    <section aria-labelledby="samples-heading">
      <div className="text-center mb-12">
        <h2 id="samples-heading" className="text-4xl md:text-6xl font-black text-[#1C0357] mb-6 tracking-tighter">Hear the Difference</h2>
        <p className="text-xl text-gray-600 font-medium">A short clip of each tier, so you know exactly what you're ordering.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {samples.map(({ tier, price, file, src, about, Icon }) => (
          <div key={tier} className="rounded-[32px] bg-white border border-[#1C0357]/10 shadow-sm p-8 flex flex-col">
            <div className="flex items-center justify-between">
              <Icon className="h-8 w-8 text-[#F538BC]" aria-hidden="true" />
              <span className="font-black text-[#1C0357]">${price} <span className="text-xs text-gray-400">AUD</span></span>
            </div>
            <h3 className="mt-4 text-2xl font-black text-[#1C0357]">{tier}</h3>
            <p className="mt-2 text-gray-600 font-medium flex-1">{about}</p>
            {src ? (
              <audio controls preload="none" src={src} className="mt-6 w-full" aria-label={`${tier} sample`} />
            ) : (
              <p className="mt-6 rounded-2xl border-2 border-dashed border-[#1C0357]/20 px-4 py-3 text-sm font-bold text-gray-500">
                Sample placeholder: add <code className="text-[#1C0357]">src/assets/samples/{file}</code>
              </p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-8 text-center">
        <Link to="/form-page" className="font-black text-[#1C0357] underline underline-offset-4 hover:text-[#F538BC]">Order yours in your key</Link>
      </p>
    </section>
  );
};

export default AudioSamples;
