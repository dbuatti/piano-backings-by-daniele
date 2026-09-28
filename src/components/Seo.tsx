import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { SITE_URL, canonicalFor } from '@/lib/site';

const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * Site-wide canonical for the current path (query strings dropped). Pages that
 * render <Seo canonicalUrl=...> override it; react-helmet keeps one canonical tag.
 */
export const CanonicalLink: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <Helmet>
      <link rel="canonical" href={canonicalFor(pathname)} />
    </Helmet>
  );
};

interface SeoProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  noindex?: boolean;
}

const Seo: React.FC<SeoProps> = ({
  title,
  description,
  canonicalUrl,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  noindex = false,
}) => {
  const { pathname } = useLocation();
  const canonical = canonicalUrl || canonicalFor(pathname);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="Piano Backings by Daniele" />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default Seo;
