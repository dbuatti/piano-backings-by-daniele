import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronRight, Clock, Key, Mic2, Music, ShoppingCart, Check, Sparkles, Headphones, Mic } from 'lucide-react';
import Header from '@/components/Header';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useCart } from '@/hooks/useCart';
import { MAX_CART_ITEMS } from '@/contexts/cart-context';
import { useAppSettings } from '@/hooks/useAppSettings';
import { SITE_URL } from '@/lib/site';
import { trackConversion } from '@/lib/analytics';
import { songIntro, useSongCatalog, type ShopSong } from '@/lib/songs';
import type { ShopProduct } from '@/lib/shop-queries';
import {
  CATEGORY_LABELS,
  CUSTOM_TIERS,
  findSong,
  formatDuration,
  formatKey,
  relatedSongs,
  songLabel,
  songPath,
  songSeo,
} from '../../shared/song-catalog.mjs';
import NotFound from './NotFound';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIER_ICONS: Record<string, React.ElementType> = { 'note-bash': Mic, 'audition-ready': Headphones, 'full-song': Sparkles };

const variantLabel = (v: ShopProduct) =>
  [CATEGORY_LABELS[v.category] || 'Backing track', formatKey(v.key_signature), (v.vocal_ranges || []).join(' / '), formatDuration(v.duration_seconds)]
    .filter(Boolean)
    .join(' · ');

const Fact: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl bg-white border border-[#1C0357]/10 px-4 py-3">
    <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
      <Icon size={12} className="text-[#F538BC]" aria-hidden="true" /> {label}
    </dt>
    <dd className={value ? 'mt-1 font-black text-[#1C0357]' : 'mt-1 font-semibold text-gray-400'}>{value || 'Not listed yet'}</dd>
  </div>
);

const SongView: React.FC<{ song: ShopSong; catalog: ShopSong[] }> = ({ song, catalog }) => {
  const cart = useCart();
  const { toast } = useToast();
  const { isServiceClosed } = useAppSettings();
  const intro = songIntro(song);
  const seo = songSeo(song, SITE_URL, intro);
  const related = relatedSongs(catalog, song, 3);

  const addToCart = (v: ShopProduct, buyNow = false) => {
    trackConversion('buy_click', { where: 'song_page', what: buyNow ? 'buy_now' : 'add_to_cart', song: song.slug, price: v.price });
    const already = cart.isInCart(v.id);
    if (!already && cart.count >= MAX_CART_ITEMS) {
      toast({ title: 'Cart is full', description: `You can buy up to ${MAX_CART_ITEMS} items at once.`, variant: 'destructive' });
      return;
    }
    cart.addItem({
      productId: v.id,
      title: v.title,
      artistName: v.artist_name,
      variantLabel: (v.vocal_ranges || []).join('/') || formatKey(v.key_signature) || null,
      price: v.price,
      currency: v.currency || 'AUD',
      productType: v.product_type,
    });
    if (buyNow) {
      cart.setOpen(true);
      return;
    }
    toast({
      title: already ? 'Already in your cart' : 'Added to cart',
      description: v.title,
      action: <ToastAction altText="View cart" onClick={() => cart.setOpen(true)}>View cart</ToastAction>,
    });
  };

  const orderLink = (tierId: string) =>
    `/form-page?${new URLSearchParams({ tier: tierId, song: song.title, show: song.show }).toString()}`;

  return (
    <div className="min-h-screen bg-[#FDFCF7]">
      <Seo title={seo.title} description={seo.description} canonicalUrl={seo.url} />
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-black uppercase tracking-widest text-gray-400">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/" className="hover:text-[#1C0357]">Home</Link></li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li><Link to="/shop" className="hover:text-[#1C0357]">Backing track library</Link></li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[#F538BC] truncate max-w-[16rem]" aria-current="page">{song.title}</li>
          </ol>
        </nav>

        <h1 className="text-4xl md:text-6xl font-black text-[#1C0357] tracking-tighter leading-[0.95]">
          {songLabel(song)} <span className="text-[#F538BC]">piano backing track</span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-gray-700 font-medium leading-relaxed max-w-3xl">{intro}</p>

        <dl className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Fact icon={Key} label={song.keys.length > 1 ? 'Keys' : 'Key'} value={song.keys.join(' / ')} />
          <Fact icon={Mic2} label="Voice type" value={song.voices.join(' / ')} />
          <Fact icon={Clock} label="Duration" value={song.durations.join(' / ')} />
          <Fact icon={Music} label="Track" value={song.categories.map((c) => CATEGORY_LABELS[c] || c).join(' / ')} />
        </dl>

        <section className="mt-8 rounded-3xl bg-white border border-[#1C0357]/10 p-6">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#1C0357]">Preview</h2>
          {song.previewUrl ? (
            <audio controls preload="none" src={song.previewUrl} className="mt-4 w-full" aria-label={`Preview of ${song.title}`}>
              Your browser can't play this preview.
            </audio>
          ) : (
            <p className="mt-3 text-gray-500 font-medium">A preview clip for this track isn't available yet.</p>
          )}
        </section>

        <section className="mt-12" aria-labelledby="buy-recorded">
          <h2 id="buy-recorded" className="text-2xl md:text-3xl font-black text-[#1C0357] tracking-tight">Buy this recording</h2>
          <p className="mt-2 text-gray-600 font-medium">Instant download after checkout. MP3 320kbps, prices in AUD.</p>
          <ul className="mt-6 space-y-3">
            {song.variants.map((v) => {
              const inCart = cart.isInCart(v.id);
              return (
                <li key={v.id} className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between rounded-2xl bg-white border border-[#1C0357]/10 p-5">
                  <div>
                    <p className="font-black text-[#1C0357]">{variantLabel(v)}</p>
                    <p className="text-2xl font-black text-[#1C0357] mt-1">${Number(v.price).toFixed(2)} <span className="text-xs text-gray-400">AUD</span></p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => addToCart(v)}
                      className="rounded-xl border-2 border-[#1C0357] text-[#1C0357] font-black"
                    >
                      {inCart ? <Check className="mr-2 h-4 w-4" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                      {inCart ? 'In cart' : 'Add to cart'}
                    </Button>
                    <Button onClick={() => addToCart(v, true)} className="rounded-xl bg-[#1C0357] hover:bg-[#2D0B8C] text-white font-black">
                      Buy now
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-12" aria-labelledby="buy-custom">
          <h2 id="buy-custom" className="text-2xl md:text-3xl font-black text-[#1C0357] tracking-tight">Or have it recorded in your key</h2>
          <p className="mt-2 text-gray-600 font-medium">
            A new recording made for you: your key, your cut, your tempo. Free transposition, delivered worldwide.
          </p>
          {isServiceClosed && (
            <p className="mt-3 text-sm font-bold text-[#F538BC]">Custom orders are paused at the moment. The recorded tracks above are still available.</p>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {CUSTOM_TIERS.map((tier) => {
              const Icon = TIER_ICONS[tier.id] || Music;
              return (
                <div key={tier.id} className="flex flex-col rounded-3xl bg-white border border-[#1C0357]/10 p-6">
                  <Icon className="h-8 w-8 text-[#F538BC]" aria-hidden="true" />
                  <h3 className="mt-4 text-xl font-black text-[#1C0357]">{tier.name}</h3>
                  <p className="text-3xl font-black text-[#1C0357] mt-1">${tier.price} <span className="text-xs text-gray-400">AUD</span></p>
                  <p className="mt-2 text-gray-600 font-medium flex-1">{tier.blurb}</p>
                  <Button asChild className="mt-5 rounded-xl bg-[#F538BC] hover:bg-[#F538BC]/90 text-white font-black">
                    <Link
                      to={orderLink(tier.id)}
                      onClick={() => trackConversion('buy_click', { where: 'song_page', what: tier.id, song: song.slug, price: tier.price })}
                    >
                      Order {tier.name} – ${tier.price}
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-16" aria-labelledby="related">
            <h2 id="related" className="text-2xl md:text-3xl font-black text-[#1C0357] tracking-tight">You might also like</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link to={songPath(r)} className="block h-full rounded-3xl bg-white border border-[#1C0357]/10 p-6 hover:border-[#F538BC] hover:shadow-lg transition-all">
                    <p className="font-black text-[#1C0357] text-lg leading-snug">{r.title}</p>
                    {r.show && <p className="text-sm font-bold text-gray-500 mt-1">{r.show}</p>}
                    <p className="text-xs font-bold text-gray-400 mt-3">
                      {[r.keys.join(' / '), r.voices.join(' / ')].filter(Boolean).join(' · ') || CATEGORY_LABELS[r.categories[0]]}
                    </p>
                    <p className="mt-3 text-sm font-black text-[#F538BC]">From ${r.minPrice.toFixed(2)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
};

/** /shop/:slug — one song, with all its recorded versions and custom-order tiers. */
const SongPage = () => {
  const { slug = '' } = useParams();
  const { catalog, isLoading, error } = useSongCatalog();

  if (isLoading || (error && !catalog.length)) {
    return (
      <div className="min-h-screen bg-[#FDFCF7]">
        <Header />
        <div className="max-w-5xl mx-auto px-4 pt-32" role="status" aria-live="polite">
          <div className="h-12 w-3/4 rounded-2xl bg-[#1C0357]/5 animate-pulse" />
          <div className="mt-6 h-24 rounded-2xl bg-[#1C0357]/5 animate-pulse" />
          <span className="sr-only">Loading…</span>
        </div>
      </div>
    );
  }

  // Old links used the product id: send them to the song's page.
  if (UUID.test(slug)) {
    const owner = catalog.find((s) => s.variants.some((v) => v.id === slug));
    return owner ? <Navigate to={songPath(owner)} replace /> : <NotFound />;
  }

  const match = findSong(catalog, slug);
  if (!match) return <NotFound />;
  if (match.redirect) return <Navigate to={`/shop/${match.redirect}`} replace />;
  return <SongView song={match.song} catalog={catalog} />;
};

export default SongPage;
