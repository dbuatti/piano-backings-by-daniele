// Build-time renderer for the public pages. scripts/prerender-seo.mjs builds this
// with Vite's SSR mode after the client build and writes the result into each
// page's static HTML, so crawlers get the real content without running JavaScript.
import type React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'node:stream';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider, dehydrate, type DehydratedState } from '@tanstack/react-query';
import App from './App';
import { preloadNotFound, preloadRoute } from './routes';
import {
  DEFAULT_SHOP_QUERY,
  SHOP_STALE_TIME,
  fetchShopProducts,
  shopProductsQueryKey,
  type ShopProduct,
} from './lib/shop-queries';

export type { ShopProduct };

// Embedded in public HTML, so keep only what the shop displays: no hidden sheet
// music links or internal bookkeeping. The browser refetches the full rows anyway.
const INTERNAL_FIELDS = ['master_download_link', 'track_urls', 'metadata', 'notion_page_id', 'notion_sync_error', 'notion_synced_at'];
const forHtml = (product: ShopProduct): ShopProduct => {
  const copy: Record<string, unknown> = { ...product };
  for (const field of INTERNAL_FIELDS) delete copy[field];
  if (!product.show_sheet_music_url) copy.sheet_music_url = null;
  return copy as unknown as ShopProduct;
};

/** Active shop products, for listing the per-song pages to prerender. */
export const listShopProducts = () => fetchShopProducts(DEFAULT_SHOP_QUERY);

export interface RenderResult {
  html: string;
  state: DehydratedState;
  /** Errors thrown while rendering; the affected part falls back to client rendering. */
  errors: string[];
}

const renderToHtml = (element: React.ReactElement): Promise<{ html: string; errors: string[] }> =>
  new Promise((resolve, reject) => {
    const errors: string[] = [];
    let html = '';
    const sink = new Writable({
      write(chunk, _encoding, done) {
        html += chunk.toString();
        done();
      },
    });
    sink.on('finish', () => resolve({ html, errors }));
    const stream = renderToPipeableStream(element, {
      onError(error) {
        errors.push(error instanceof Error ? error.stack || error.message : String(error));
      },
      onShellError: reject,
      onAllReady() {
        stream.pipe(sink);
      },
    });
  });

/**
 * Render one route to HTML. `notFound` renders the "Page not found" page whatever
 * the URL. Data the page needs is fetched first and returned as `state`, which the
 * browser loads into react-query before its first render.
 */
export async function render(url: string, options: { notFound?: boolean } = {}): Promise<RenderResult> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: SHOP_STALE_TIME, retry: false } },
  });

  const path = url.split('?')[0];
  // The shop list and every song page render from the full product list.
  if (path === '/shop' || path.startsWith('/shop/')) {
    await queryClient.prefetchQuery({
      queryKey: shopProductsQueryKey(DEFAULT_SHOP_QUERY),
      queryFn: async () => (await fetchShopProducts(DEFAULT_SHOP_QUERY)).map(forHtml),
    });
  }

  await (options.notFound ? preloadNotFound() : preloadRoute(path));

  const { html, errors } = await renderToHtml(
    <HelmetProvider context={{}}>
      <QueryClientProvider client={queryClient}>
        <StaticRouter location={options.notFound ? '/404' : url}>
          <App />
        </StaticRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );

  return { html, state: dehydrate(queryClient), errors };
}
