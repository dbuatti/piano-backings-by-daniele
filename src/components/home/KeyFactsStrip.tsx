import { KEY_FACTS } from '@/lib/home-content';

/** One-line summary of the practical details buyers ask about first. */
const KeyFactsStrip = () => (
  <section aria-label="Key facts" className="bg-[#1C0357] text-white">
    <ul className="max-w-7xl mx-auto px-4 py-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm md:text-base font-bold">
      {KEY_FACTS.map((fact, i) => (
        <li key={fact} className="flex items-center gap-4">
          {i > 0 && <span className="text-[#F538BC]" aria-hidden="true">·</span>}
          {fact}
        </li>
      ))}
    </ul>
  </section>
);

export default KeyFactsStrip;
