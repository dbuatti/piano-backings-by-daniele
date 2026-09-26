import { ShoppingBag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';

const CartButton = ({ className }: { className?: string }) => {
  const { count, setOpen } = useCart();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setOpen(true)}
      aria-label={count > 0 ? `Open cart, ${count} item${count === 1 ? '' : 's'}` : 'Open cart'}
      className={cn("relative rounded-full transition-colors", className)}
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F538BC] text-white text-[10px] font-black flex items-center justify-center">
          {count}
        </span>
      )}
    </Button>
  );
};

export default CartButton;
