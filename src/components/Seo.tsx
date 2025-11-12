import React from 'react';
import { Helmet } from 'react-helmet';

interface SeoProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string; // Open Graph Image URL
  ogType?: string; // Open Graph Type (e.g., 'website', 'article')
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player'; // Twitter Card Type
  twitterCreator?: string; // Twitter @username for the content creator
}

const Seo: React.FC<SeoProps> = ({
  title = "Piano Backings by Daniele",
  description = "Custom piano backing tracks for auditions, performances, and practice. High-quality, personalized musical accompaniment.",
  keywords = "piano backing tracks, custom music, audition tracks, performance tracks, musical accompaniment, Daniele Buatti",
  canonicalUrl = window.location.href,
  ogImage = `${window.location.origin}/default-social-image.jpg`, // Default image for social sharing
  ogType = "website",
  twitterCard = "summary_large_image",
  twitterCreator = "@DanieleBuatti", // Replace with your Twitter handle if applicable
}) => {
  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook / LinkedIn Meta Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="Piano Backings by Daniele" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
      <meta name="twitter:url" content={canonicalUrl} />
    </Helmet>
  );
};

export default Seo;