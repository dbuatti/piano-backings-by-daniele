import { Link } from 'react-router-dom';
import { PauseCircle } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { CONTACT_EMAIL } from '@/lib/site';

/** Home-page notice while custom orders are closed (Admin → Settings → Service closure). */
const OrdersClosedBanner = () => {
  const { isServiceClosed, closureReason } = useAppSettings();
  if (!isServiceClosed) return null;

  return (
    <div role="status" className="mx-auto mb-10 max-w-3xl rounded-3xl border-2 border-[#F538BC]/30 bg-white px-6 py-5 text-left shadow-sm">
      <p className="flex items-center gap-2 font-black text-[#1C0357] text-lg">
        <PauseCircle className="h-5 w-5 text-[#F538BC]" aria-hidden="true" /> Custom orders are closed for now
      </p>
      {closureReason && <p className="mt-1 text-gray-600 font-medium">{closureReason}</p>}
      <p className="mt-1 text-gray-600 font-medium">
        The <Link to="/shop" className="font-bold text-[#1C0357] underline">shop's recorded tracks</Link> are still available.
        Questions? <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-[#1C0357] underline">Email me</a>.
      </p>
    </div>
  );
};

export default OrdersClosedBanner;
