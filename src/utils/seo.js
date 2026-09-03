// SEO metadata configuration for each page

export const seoConfig = {
  siteName: 'Honey Chain',
  siteUrl: 'https://honeychain.in',
  defaultTitle: 'Honey Chain — Blockchain Honey Traceability for KVIC Beekeepers',
  defaultDescription: 'Verify authentic KVIC honey with blockchain traceability, QR code authentication, and AI-powered smart beekeeping. Empowering rural beekeepers across India.',
  twitterHandle: '@HoneyChainIndia',
  ogImage: '/og-image.png',
};

export const pageMetadata = {
  beekeeper: {
    title: 'Beekeeper Dashboard — Register Honey Batches & Monitor Hive Health | Honey Chain',
    description: 'Register honey batches on blockchain, monitor real-time IoT hive sensors, track temperature, humidity, weight. Get AI alerts for disease detection and yield predictions.',
    keywords: 'beekeeper dashboard, honey batch registration, hive monitoring, IoT sensors, beekeeping AI, yield prediction, KVIC beekeepers',
    ogTitle: 'Beekeeper Dashboard — Smart Beekeeping with IoT & Blockchain',
    h1: 'Smart Beekeeper Dashboard',
    breadcrumb: 'Beekeeper',
  },
  consumer: {
    title: 'Verify Honey Authenticity — QR Code Batch Verification | Honey Chain',
    description: 'Scan QR code or enter batch ID to verify authentic KVIC honey. View complete blockchain chain of custody from hive to consumer. Detect tampering instantly.',
    keywords: 'verify honey authenticity, QR code verification, honey traceability, blockchain verification, KVIC honey, genuine honey check',
    ogTitle: 'Verify Honey Authenticity — Blockchain-Powered Consumer Trust',
    h1: 'Verify Your Honey\'s Authenticity',
    breadcrumb: 'Consumer Verification',
  },
  admin: {
    title: 'KVIC Admin Dashboard — Honey Production Analytics & Blockchain Monitoring | Honey Chain',
    description: 'Monitor KVIC honey mission network with real-time analytics, regional distribution charts, beekeeper cluster management, and blockchain health monitoring.',
    keywords: 'KVIC admin dashboard, honey production analytics, blockchain monitoring, beekeeper clusters, regional honey statistics, smart India hackathon',
    ogTitle: 'KVIC Admin Dashboard — National Honey Traceability Network',
    h1: 'KVIC Honey Mission Control Center',
    breadcrumb: 'Admin Dashboard',
  },
  notFound: {
    title: '404 — Page Not Found | Honey Chain',
    description: 'The page you\'re looking for doesn\'t exist. Return to Honey Chain dashboard to verify honey authenticity or register batches.',
    keywords: '404 error, page not found',
    ogTitle: 'Page Not Found — Honey Chain',
    h1: 'Oops! Lost in the Hive',
    breadcrumb: '404',
  },
};

// Generate meta tags for a specific page
export function generateMetaTags(pageKey) {
  const page = pageMetadata[pageKey] || pageMetadata.beekeeper;
  const canonical = `${seoConfig.siteUrl}/${pageKey === 'beekeeper' ? '' : pageKey}`;

  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    canonical,
    ogTitle: page.ogTitle || page.title,
    ogDescription: page.description,
    ogUrl: canonical,
    ogImage: seoConfig.ogImage,
    twitterCard: 'summary_large_image',
    twitterTitle: page.ogTitle || page.title,
    twitterDescription: page.description,
    h1: page.h1,
    breadcrumb: page.breadcrumb,
  };
}

// Structured data for Organization
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Honey Chain',
  url: seoConfig.siteUrl,
  logo: `${seoConfig.siteUrl}/logo-512.png`,
  description: seoConfig.defaultDescription,
  foundingDate: '2026',
  areaServed: 'India',
  slogan: 'Blockchain-Powered Honey Traceability for Rural Beekeepers',
  sameAs: [
    'https://twitter.com/HoneyChainIndia',
    'https://github.com/honeychain',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    areaServed: 'IN',
    availableLanguage: ['English', 'Hindi'],
  },
};

// Structured data for WebApplication
export const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Honey Chain Platform',
  url: seoConfig.siteUrl,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
  featureList: [
    'Blockchain-based honey traceability',
    'QR code batch verification',
    'IoT hive monitoring',
    'AI disease detection',
    'Yield prediction',
    'Tamper-proof batch tracking',
  ],
  screenshot: `${seoConfig.siteUrl}/screenshot.png`,
};

// Structured data for BreadcrumbList
export function generateBreadcrumbSchema(pageKey) {
  const page = pageMetadata[pageKey] || pageMetadata.beekeeper;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: seoConfig.siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: page.breadcrumb,
        item: `${seoConfig.siteUrl}/${pageKey === 'beekeeper' ? '' : pageKey}`,
      },
    ],
  };
}
