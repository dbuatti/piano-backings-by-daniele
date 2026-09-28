import { Award } from 'lucide-react';
import { CREDITS } from '@/lib/home-content';
import { cn } from '@/lib/utils';

/** Daniele's credits, shown in the hero and the About section. */
const Credits = ({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) => (
  <div className={cn('flex flex-wrap items-center justify-center gap-2', className)}>
    <span className={cn('flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em]', tone === 'dark' ? 'text-white/70' : 'text-gray-500')}>
      <Award className="h-4 w-4 text-[#F538BC]" aria-hidden="true" /> Credits
    </span>
    <ul className="contents">
      {CREDITS.map((credit) => (
        <li
          key={credit}
          className={cn(
            'rounded-full px-3 py-1 text-sm font-black border',
            tone === 'dark' ? 'border-white/20 text-white' : 'border-[#1C0357]/15 bg-white text-[#1C0357]',
          )}
        >
          {credit}
        </li>
      ))}
    </ul>
  </div>
);

export default Credits;
