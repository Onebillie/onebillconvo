import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  ogType?: 'website' | 'article' | 'product';
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  noindex?: boolean;
  structuredData?: object;
}

export const SEOHead = ({
  title = 'À La Carte Chat - Unified Inbox for Business Messaging',
  description = 'Manage WhatsApp, Email, SMS, Instagram, and Facebook messages in one unified inbox. Pay-as-you-go pricing with AI-powered automation for exceptional customer service.',
  keywords = [
    'unified inbox',
    'business messaging',
    'WhatsApp Business API',
    'customer service platform',
    'multi-channel messaging',
    'AI chatbot',
    'SMS management',
    'email integration',
    'Instagram DM',
    'Facebook Messenger',
  ],
  canonical,
  ogType = 'website',
  ogImage = 'https://storage.googleapis.com/gpt-engineer-file-uploads/wGaqQIqnKMhTZ5DZYA7N0clBDCx1/social-images/social-1759759139573-Screenshot 2025-10-06 at 14.57.17.png',
  twitterCard = 'summary_large_image',
  noindex = false,
  structuredData,
}: SEOHeadProps) => {
  const baseUrl = 'https://alacartechat.com';
  const fullCanonical = canonical ? `${baseUrl}${canonical}` : baseUrl;
  const fullTitle = title.includes('À La Carte Chat') ? title : `${title} | À La Carte Chat`;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;
  }, [fullTitle]);

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      <link rel="canonical" href={fullCanonical} />
      
      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="À La Carte Chat" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:url" content={fullCanonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@alacartechat" />
      <meta name="twitter:creator" content="@alacartechat" />

      {/* Additional SEO Tags */}
      <meta name="author" content="À La Carte Chat" />
      <meta name="language" content="English" />
      <meta httpEquiv="content-language" content="en-US" />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};
