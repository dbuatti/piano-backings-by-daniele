"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Loader2, Key, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isWithinInterval, subDays } from 'date-fns';
import { getTrackTypeInfo } from '@/utils/trackTypes';
import { formatDuration } from '@/utils/helpers';
import { PreviewButton } from './ProductCard';

interface TableProduct {
  id: string;
  created_at: string;
  title: string;
  price: number;
  currency: string;
  artist_name: string;
  category: string;
  key_signature: string | null;
  vocal_ranges: string[];
  track_type: string;
  duration_seconds?: number | null;
  track_urls?: { url: string | null }[];
}

interface TableRow {
  product: TableProduct;
  variants: TableProduct[];
}

interface ProductTableProps {
  rows: TableRow[];
  onViewDetails: (product: TableProduct, variants?: TableProduct[]) => void;
  onBuyNow: (product: TableProduct) => Promise<void>;
  isBuying: boolean;
}

const GRID_COLS = "grid-cols-[minmax(0,2fr)_minmax(0,1fr)_100px_130px_120px_90px_100px_auto]";

const TableRowView: React.FC<{ row: TableRow; onViewDetails: ProductTableProps['onViewDetails']; onBuyNow: ProductTableProps['onBuyNow']; isBuying: boolean }> = ({ row, onViewDetails, onBuyNow, isBuying }) => {
  const { product, variants } = row;
  const isNew = isWithinInterval(new Date(product.created_at), { start: subDays(new Date(), 14), end: new Date() });
  const quality = getTrackTypeInfo(product.track_type);
  const isMulti = variants.length > 1;
  const prices = variants.map(v => v.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceLabel = minPrice !== maxPrice ? `$${minPrice.toFixed(2)} – $${maxPrice.toFixed(2)}` : `$${minPrice.toFixed(2)}`;
  const voiceLabel = product.vocal_ranges?.length ? product.vocal_ranges.join(' / ') : '—';
  const duration = formatDuration(product.duration_seconds);

  const open = () => onViewDetails(product, variants);

  return (
    <div className="group cursor-pointer" onClick={open} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') open(); }}>
      {/* Desktop row */}
      <div className={cn("hidden lg:grid gap-4 px-6 py-4 items-center transition-colors hover:bg-gray-50/80", GRID_COLS)}>
        <div className="min-w-0">
          <p className="font-black text-[#1C0357] text-sm truncate group-hover:text-[#F538BC] transition-colors">{product.title}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {isNew && <Badge className="bg-[#F538BC] text-white border-none text-[9px] font-black h-4 px-1.5">NEW</Badge>}
            {isMulti && (
              <span className="inline-flex items-center rounded-full bg-[#1C0357]/5 border border-[#1C0357]/10 text-[#1C0357] text-[9px] font-bold px-1.5 py-px">
                {variants.length} versions
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500 font-medium truncate">{product.artist_name || '—'}</p>
        <p className="text-sm text-gray-600 font-semibold">{product.key_signature || '—'}</p>
        <p className="text-sm text-gray-600 font-semibold truncate">{voiceLabel}</p>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase w-fit", quality.badgeClass)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", quality.dotClass)} />
          {quality.label}
        </span>
        <p className="text-sm text-gray-600 font-semibold">{duration || '—'}</p>
        <p className="text-sm font-black text-[#1C0357] text-right whitespace-nowrap">{priceLabel}</p>
        <div className="flex items-center justify-end gap-2">
          <PreviewButton variant={product} />
          <Button
            onClick={(e) => { e.stopPropagation(); onBuyNow(product); }}
            disabled={isBuying}
            className="h-9 px-4 text-xs font-black bg-[#1C0357] hover:bg-[#1C0357]/90 rounded-lg shadow-sm active:scale-[0.98] transition-all"
          >
            {isBuying ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart size={14} className="mr-1.5" /> Buy</>}
          </Button>
        </div>
      </div>

      {/* Mobile row */}
      <div className="lg:hidden p-4 transition-colors hover:bg-gray-50/80">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-black text-[#1C0357] text-base leading-snug">{product.title}</p>
            <p className="text-xs font-bold text-gray-500 mt-0.5 truncate">{product.artist_name || 'Various Artists'}</p>
          </div>
          <PreviewButton variant={product} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {isNew && <Badge className="bg-[#F538BC] text-white border-none text-[9px] font-black h-4 px-1.5">NEW</Badge>}
          {isMulti && (
            <span className="inline-flex items-center rounded-full bg-[#1C0357]/5 border border-[#1C0357]/10 text-[#1C0357] text-[9px] font-bold px-1.5 py-px">
              {variants.length} versions
            </span>
          )}
          {product.key_signature && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-gray-200 bg-gray-50/50 text-gray-600 font-bold">
              <Key size={10} className="mr-1.5 text-gray-400" /> {product.key_signature}
            </Badge>
          )}
          {voiceLabel !== '—' && (
            <Badge variant="secondary" className="bg-[#D1AAF2]/10 text-[#1C0357] text-[10px] px-2 py-0.5 border-none font-bold">
              {voiceLabel}
            </Badge>
          )}
          {duration && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-gray-200 bg-gray-50/50 text-gray-600 font-bold">
              <Clock size={10} className="mr-1.5 text-gray-400" /> {duration}
            </Badge>
          )}
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", quality.badgeClass)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", quality.dotClass)} />
            {quality.label}
          </span>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <p className="text-lg font-black text-[#1C0357]">{priceLabel}</p>
          <Button
            onClick={(e) => { e.stopPropagation(); onBuyNow(product); }}
            disabled={isBuying}
            className="h-10 px-6 text-xs font-black bg-[#1C0357] hover:bg-[#1C0357]/90 rounded-xl shadow-sm active:scale-[0.98] transition-all"
          >
            {isBuying ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart size={15} className="mr-1.5" /> Buy</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

const ProductTable: React.FC<ProductTableProps> = ({ rows, onViewDetails, onBuyNow, isBuying }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={cn("hidden lg:grid gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50/60", GRID_COLS)}>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Title</span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Show</span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Key</span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Voice</span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Quality</span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Duration</span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Price</span>
        <span className="text-right" />
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map(row => (
          <TableRowView key={row.product.id} row={row} onViewDetails={onViewDetails} onBuyNow={onBuyNow} isBuying={isBuying} />
        ))}
      </div>
    </div>
  );
};

export default ProductTable;
