import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SeoProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  canonicalUrl?: string;
}

const Seo: React.FC<SeoProps> = ({
  title = "Piano Backings by Daniele - Custom Tracks for Musicals, Auditions & Performances",
  description = "Get high-quality custom piano backing tracks for musicals, auditions, and performances. Order personalized tracks or browse our shop for instant downloads.",
  keywords = "piano backing tracks, musical theatre, audition tracks, custom piano tracks, Daniele Buatti, performance tracks, sheet music, vocal ranges",
  ogTitle,
  ogDescription,
  ogImage = "/pasted-image-2025-09-19T05-15-20-729Z.png", // Default OG image
  ogUrl,
  canonicalUrl,
}) => {
  const defaultOgUrl = window.location.href;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={ogUrl || defaultOgUrl} />
      <meta property="og:title" content={ogTitle || title} />
      <meta property="og:description" content={ogDescription || description} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={ogUrl || defaultOgUrl} />
      <meta name="twitter:title" content={ogTitle || title} />
      <meta name="twitter:description" content={ogDescription || description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
    </Helmet>
  );
};

export default Seo;