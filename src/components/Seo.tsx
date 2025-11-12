import React from 'react';
import { Helmet } from 'react-helmet';

interface SeoProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string; // Added optional canonicalUrl prop
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
}

const Seo: React.FC<SeoProps> = ({
  title,
  description,
  keywords,
  canonicalUrl, // Destructure canonicalUrl
  ogImage,
  ogType = 'website',
  twitterCard = 'summary',
}) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />} {/* Render canonical link tag */}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  );
};

export default Seo;