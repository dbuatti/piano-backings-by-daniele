// SEO copy and structured data for a single shop product. Shared by the shop page
// (react-helmet) and the api/shop-product.ts serverless function that serves the
// same tags in the initial HTML. Plain JS (.mjs) so Vite, Node scripts and Vercel
// functions can all import it without a TypeScript build step.

const CATEGORY_LABELS = {
  'audition-cut': 'audition cut',
  'full-song': 'full song',
  'note-bash': 'note bash',
};

const BRAND = 'Piano Backings by Daniele';

const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();

/**
 * @param {import('./product-seo.d.mts').ProductSeoInput} product
 * @param {string} siteUrl
 */
export const productSeo = (product, siteUrl) => {
  const title = clean(product.title);
  const show = clean(product.artist_name);
  const key = product.show_key_signature === false ? '' : clean(product.key_signature);
  const voices = (product.vocal_ranges || []).map(clean).filter(Boolean).join('/');
  const category = CATEGORY_LABELS[product.category || ''] || '';
  const currency = (product.currency || 'AUD').toUpperCase();
  const price = Number(product.price || 0);
  const url = `${siteUrl}/shop/${product.id}`;

  const pageTitle = `${title}${show ? ` – ${show}` : ''} Piano Backing Track${key ? ` (${key})` : ''} | ${BRAND}`;

  const summary = [
    `${category ? `${category[0].toUpperCase()}${category.slice(1)} piano` : 'Piano'} backing track of "${title}"${show ? ` from ${show}` : ''}${key ? ` in ${key}` : ''}${voices ? ` for ${voices}` : ''}.`,
    clean(product.cut_description) ? `${clean(product.cut_description)}.` : '',
    `Instant download, $${price.toFixed(2)} ${currency}. Recorded by Melbourne pianist Daniele Buatti.`,
  ].filter(Boolean).join(' ');

  const productDescription = clean(product.description) || summary;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `${title}${show ? ` (${show})` : ''} – Piano Backing Track`,
      description: productDescription,
      sku: product.id,
      url,
      image: product.image_url || `${siteUrl}/og-image.png`,
      category: 'Piano backing track',
      brand: { '@type': 'Brand', name: BRAND },
      offers: {
        '@type': 'Offer',
        url,
        price: price.toFixed(2),
        priceCurrency: currency,
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: BRAND },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: `${siteUrl}/shop` },
        { '@type': 'ListItem', position: 3, name: title, item: url },
      ],
    },
  ];

  return { title: pageTitle, description: summary, url, jsonLd };
};
