import { Star } from 'lucide-react';
import { GOOGLE_REVIEW_URL } from '@/lib/site';
import { cn } from '@/lib/utils';

/** "Loved your track?" Google review ask, shown after download links. */
const ReviewCta = ({ className }: { className?: string }) => (
  <div className={cn('rounded-3xl border border-[#1C0357]/10 bg-[#FDFCF7] p-6 text-center', className)}>
    <p className="font-black text-[#1C0357]">Loved your track? A quick Google review helps other performers find me{"\u00a0"}→</p>
    <a
      href={GOOGLE_REVIEW_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#F538BC] px-6 py-3 font-black text-white hover:bg-[#F538BC]/90 transition-colors"
    >
      <Star className="h-4 w-4 fill-current" aria-hidden="true" /> Leave a Google review
    </a>
  </div>
);

export default ReviewCta;
