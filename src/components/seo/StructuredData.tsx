import { Helmet } from 'react-helmet-async';

interface StructuredDataProps {
  type: 'Organization' | 'SoftwareApplication' | 'FAQPage' | 'BreadcrumbList' | 'WebPage';
  data?: any;
}

export const StructuredData = ({ type, data }: StructuredDataProps) => {
  const getStructuredData = () => {
    switch (type) {
      case 'Organization':
        return {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'À La Carte Chat',
          alternateName: 'A La Carte Chat',
          url: 'https://alacartechat.com',
          logo: 'https://alacartechat.com/favicon.png',
          description: 'Unified inbox for business messaging across WhatsApp, Email, SMS, Instagram, and Facebook with AI-powered automation.',
          foundingDate: '2024',
          sameAs: [
            'https://twitter.com/alacartechat',
            'https://www.linkedin.com/company/alacartechat',
            'https://www.facebook.com/alacartechat',
          ],
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Customer Support',
            email: 'support@alacartechat.com',
            availableLanguage: ['English'],
          },
        };

      case 'SoftwareApplication':
        return {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'À La Carte Chat',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web Browser',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            description: 'Free plan available with pay-as-you-go pricing',
          },
          aggregateRating: data?.rating || {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            ratingCount: '150',
            bestRating: '5',
            worstRating: '1',
          },
          description: 'Unified inbox for managing WhatsApp, Email, SMS, Instagram, and Facebook messages in one place with AI-powered automation.',
          featureList: [
            'Unified Inbox across all channels',
            'WhatsApp Business API Integration',
            'AI-Powered Chatbot',
            'Email Integration (IMAP/SMTP)',
            'SMS Messaging',
            'Instagram DM Management',
            'Facebook Messenger Integration',
            'Team Collaboration Tools',
            'Message Templates',
            'Real-time Notifications',
          ],
          screenshot: 'https://storage.googleapis.com/gpt-engineer-file-uploads/wGaqQIqnKMhTZ5DZYA7N0clBDCx1/social-images/social-1759759139573-Screenshot 2025-10-06 at 14.57.17.png',
        };

      case 'FAQPage':
        return {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: data?.questions?.map((q: any) => ({
            '@type': 'Question',
            name: q.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: q.answer,
            },
          })) || [],
        };

      case 'BreadcrumbList':
        return {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: data?.items?.map((item: any, index: number) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: `https://alacartechat.com${item.url}`,
          })) || [],
        };

      case 'WebPage':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: data?.name || 'À La Carte Chat',
          description: data?.description || 'Unified inbox for business messaging',
          url: data?.url || 'https://alacartechat.com',
          inLanguage: 'en-US',
          isPartOf: {
            '@type': 'WebSite',
            name: 'À La Carte Chat',
            url: 'https://alacartechat.com',
          },
        };

      default:
        return null;
    }
  };

  const structuredData = getStructuredData();

  if (!structuredData) return null;

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};
