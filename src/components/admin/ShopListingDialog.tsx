import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import type { DeliveredTrack } from '@/hooks/useDeliveredTracks';
import { listTrackInShop, shopListingDefaults } from '@/utils/releaseTrack';
import { renderCardToBlob } from '@/utils/titleCard';
import { invalidateShopProducts } from '@/lib/shop-queries';

/**
 * The pause between clicking "Add to shop" and the listing existing: the owner
 * reviews the copy, the cover and the price, then decides whether it goes live
 * or is saved as a draft. What you see here is the product that gets created.
 */
export function ShopListingDialog({
  track,
  open,
  onOpenChange,
}: {
  track: DeliveredTrack | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [price, setPrice] = useState('6.99');
  const [description, setDescription] = useState('');
  const [live, setLive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cover, setCover] = useState<string | null>(null);

  // Prefill from the same defaults the one-click path used, so the review is
  // never showing something the create step wouldn't.
  useEffect(() => {
    if (!open || !track) return;
    const defaults = shopListingDefaults(track);
    setTitle(defaults.title);
    setArtist(defaults.artist);
    setPrice(defaults.price.toFixed(2));
    setDescription(defaults.description);
    setLive(true);
    setBusy(false);
  }, [open, track]);

  // A real 1:1 title card for the copy on screen, so an edit is visible before
  // saving. Re-rendered a beat after typing stops.
  useEffect(() => {
    if (!open || !track) return;
    let cancelled = false;
    let url: string | null = null;
    const timer = setTimeout(async () => {
      try {
        const blob = await renderCardToBlob(
          { song: title, artist, client: track.client, key: track.key },
          '1:1'
        );
        if (cancelled || !blob) return;
        url = URL.createObjectURL(blob);
        setCover(url);
      } catch {
        // Non-fatal: the frame before stays visible.
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, track, title, artist]);

  const submit = async () => {
    if (!track || busy) return;
    const parsed = Number.parseFloat(price);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast({ title: 'Enter a price above 0', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const { created } = await listTrackInShop(track, {
        active: live,
        title,
        artist,
        price: parsed,
        description,
      });
      await invalidateShopProducts(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['delivered_tracks'] });
      toast(
        created
          ? live
            ? { title: 'Live in the shop', description: `${title} is now for sale.` }
            : {
                title: 'Saved as a shop draft',
                description: `${title} is ready for review — activate it in Shop when you're happy.`,
              }
          : { title: 'Already in the shop', description: `${track.song} already has a listing, so nothing was added.` }
      );
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Could not create the listing', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1C0357]">
            <ShoppingBag className="h-5 w-5" /> Review the shop listing
          </DialogTitle>
          <DialogDescription>
            Check the details, choose whether to go live, then add it to the shop.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Cover</p>
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
              {cover ? (
                <img src={cover} alt={`${title} cover`} className="block w-full" />
              ) : (
                <div className="aspect-square w-full animate-pulse bg-gray-100" />
              )}
            </div>
            <p className="text-xs text-gray-400">The title card, rendered automatically.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="shop-title" className="text-sm font-medium text-[#1C0357]">Title</Label>
              <Input id="shop-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="shop-artist" className="text-sm font-medium text-[#1C0357]">Show / artist</Label>
                <Input id="shop-artist" value={artist} onChange={(e) => setArtist(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shop-price" className="text-sm font-medium text-[#1C0357]">Price (AUD)</Label>
                <Input
                  id="shop-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shop-desc" className="text-sm font-medium text-[#1C0357]">Description</Label>
              <Textarea
                id="shop-desc"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm leading-relaxed"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-[#1C0357]">{live ? 'Go live now' : 'Save as a draft'}</p>
                <p className="text-xs text-gray-500">
                  {live
                    ? 'Shoppers can buy it as soon as it is added.'
                    : 'Hidden from the shop until you activate it.'}
                </p>
              </div>
              <Switch checked={live} onCheckedChange={setLive} aria-label="Go live now" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-2 h-4 w-4" />}
            {live ? 'Add and make live' : 'Save as draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
