import { useEffect } from 'react';
import { generateMetaTags, organizationSchema, webApplicationSchema, generateBreadcrumbSchema } from '../utils/seo';

export default function SEOHead({ pageKey }) {
  useEffect(() => {
    const meta = generateMetaTags(pageKey);

    // Update title
    document.title = meta.title;

    // Update or create meta tags
    const metaTags = {
      description: meta.description,
      keywords: meta.keywords,
      'og:title': meta.ogTitle,
      'og:description': meta.ogDescription,
      'og:url': meta.ogUrl,
      'og:image': meta.ogImage,
      'og:type': 'website',
      'og:site_name': 'Honey Chain',
      author: 'HEMANTH RAO',
      'twitter:card': meta.twitterCard,
      'twitter:title': meta.twitterTitle,
      'twitter:description': meta.twitterDescription,
      'twitter:image': meta.ogImage,
      'theme-color': '#f59e0b',
    };

    Object.entries(metaTags).forEach(([name, content]) => {
      let element = document.querySelector(`meta[name="${name}"]`) ||
                    document.querySelector(`meta[property="${name}"]`);

      if (!element) {
        element = document.createElement('meta');
        if (name.startsWith('og:') || name.startsWith('twitter:')) {
          element.setAttribute('property', name);
        } else {
          element.setAttribute('name', name);
        }
        document.head.appendChild(element);
      }

      element.setAttribute('content', content);
    });

    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', meta.canonical);

    // Update or create structured data
    updateStructuredData('org-schema', organizationSchema);
    updateStructuredData('webapp-schema', webApplicationSchema);
    updateStructuredData('breadcrumb-schema', generateBreadcrumbSchema(pageKey));

  }, [pageKey]);

  return null;
}

function updateStructuredData(id, schema) {
  let script = document.getElementById(id);

  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(schema);
}
