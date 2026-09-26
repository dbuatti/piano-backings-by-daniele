import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShoppingCart, Trash2, Tag, FileText, ShieldCheck, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCart';
import { canHaveSheetMusic } from '@/contexts/cart-context';
import { SHOP_SHEET_MUSIC_PRICE } from '@/utils/pricing';
import { getErrorMessage } from '@/lib/utils';

const CHECKOUT_URL = 'https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-stripe-checkout';

interface AppliedPromo {
  code: string;
  discountAmount: number;
  finalAmount: number;
  forSubtotal: number;
}

const money = (n: number) => `$${n.toFixed(2)}`;

const CartDrawer = () => {
  const { items, subtotal, isOpen, setOpen, removeItem, setSheetMusic } = useCart();
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState('');
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // A promo was validated against a specific total; re-apply if the cart changes.
  useEffect(() => {
    if (promo && promo.forSubtotal !== subtotal) setPromo(null);
  }, [promo, subtotal]);

  const currency = items[0]?.currency || 'AUD';
  const total = promo ? promo.finalAmount : subtotal;

  const applyPromo = async () => {
    const code = promoCode.trim();
    if (!code) return;
    setIsValidatingPromo(true);
    try {
      const { data: result, error } = await supabase.rpc('validate_promo_code', { p_code: code, p_amount: subtotal });
      if (error) throw error;
      if (result?.valid) {
        setPromo({ code, discountAmount: result.discountAmount, finalAmount: result.finalAmount, forSubtotal: subtotal });
        toast({ title: "Promo applied", description: `You save ${money(result.discountAmount)}.` });
      } else {
        setPromo(null);
        toast({ title: "Invalid code", description: result?.error || "That promo code can't be used.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Couldn't check that code", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const checkout = async () => {
    setIsCheckingOut(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(CHECKOUT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          items: items.map(i => ({ product_id: i.productId, include_sheet_music: i.includeSheetMusic })),
          ...(promo && { promo_code: promo.code }),
          ...(session?.user?.email && { customer_email: session.user.email }),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Checkout failed (${response.status})`);
      if (result.url) window.location.href = result.url;
    } catch (err) {
      toast({ title: "Checkout error", description: getErrorMessage(err), variant: "destructive" });
      setIsCheckingOut(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b text-left">
          <SheetTitle className="text-2xl font-black text-[#1C0357] tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" /> Your Cart
          </SheetTitle>
          <SheetDescription>
            {items.length === 0 ? 'Your cart is empty.' : `${items.length} item${items.length === 1 ? '' : 's'}`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-4">
            <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center">
              <Music className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Browse the library and add the tracks you need.</p>
            <Button asChild className="rounded-xl bg-[#1C0357] hover:bg-[#2D0B8C] font-bold" onClick={() => setOpen(false)}>
              <Link to="/shop">Browse the Shop</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto divide-y">
              {items.map(item => (
                <li key={item.productId} className="px-6 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-[#1C0357] leading-snug">{item.title}</p>
                      <p className="text-xs text-gray-500 font-medium truncate">
                        {[item.artistName, item.variantLabel].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="font-black text-[#1C0357]">{money(item.price)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                        onClick={() => removeItem(item.productId)}
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {canHaveSheetMusic(item) && (
                    <label className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 cursor-pointer hover:border-[#F538BC]/40">
                      <Checkbox
                        checked={item.includeSheetMusic}
                        onCheckedChange={(v) => setSheetMusic(item.productId, v === true)}
                        className="mt-0.5"
                        aria-label={`Add custom sheet music for ${item.title}`}
                      />
                      <span className="flex-1 text-sm">
                        <span className="font-bold text-[#1C0357] flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" /> Add custom sheet music
                          <span className="ml-auto font-black">+{money(SHOP_SHEET_MUSIC_PRICE)}</span>
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5">
                          A clean, engraved score of this exact cut with no cut marks, emailed within 3–5 business days.
                        </span>
                      </span>
                    </label>
                  )}
                </li>
              ))}
            </ul>

            <div className="border-t px-6 py-5 space-y-4 bg-white">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromo(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(); } }}
                    placeholder="Promo code"
                    aria-label="Promo code"
                    className="pl-9 h-10 rounded-xl font-mono text-xs font-bold uppercase"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={applyPromo}
                  disabled={!promoCode.trim() || isValidatingPromo}
                  className="h-10 rounded-xl text-xs font-bold"
                >
                  {isValidatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span>{money(subtotal)}</span>
                </div>
                {promo && (
                  <div className="flex justify-between text-green-600 font-bold">
                    <span>Promo {promo.code}</span><span>−{money(promo.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black text-[#1C0357] pt-1">
                  <span>Total</span><span>{money(total)} <span className="text-xs text-gray-400">{currency}</span></span>
                </div>
              </div>

              <Button
                onClick={checkout}
                disabled={isCheckingOut}
                className="w-full h-12 rounded-xl bg-[#1C0357] hover:bg-[#2D0B8C] text-base font-black"
              >
                {isCheckingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : total === 0 ? 'Complete Order' : `Checkout — ${money(total)}`}
              </Button>
              <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure payment by Stripe. See our{' '}
                <Link to="/terms" className="underline" onClick={() => setOpen(false)}>terms</Link>.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
