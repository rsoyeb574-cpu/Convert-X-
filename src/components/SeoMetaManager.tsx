import React, { useEffect } from 'react';
import { SeoRouteConfig, SEO_ROUTES } from '../data/seoRoutes.js';
import { PageView } from '../types.js';

interface SeoMetaManagerProps {
  currentView: PageView;
  seoSlug?: string;
}

export const SeoMetaManager: React.FC<SeoMetaManagerProps> = ({ currentView, seoSlug }) => {
  useEffect(() => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://convert-x.com';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

    let title = 'Convert-X | Universal Online File Converter for Images, PDFs & Design Files';
    let description = 'Convert images, PDFs, vector and professional design files with Convert-X.';
    let canonicalUrl = `${origin}${pathname}`;
    let ogType = 'website';
    let jsonLdSchemas: object[] = [];

    const activeSeoConfig: SeoRouteConfig | undefined =
      currentView === 'seo' && seoSlug ? SEO_ROUTES[seoSlug] : undefined;

    if (activeSeoConfig) {
      title = activeSeoConfig.title;
      description = activeSeoConfig.metaDescription;
      canonicalUrl = `${origin}/${activeSeoConfig.slug}`;

      // 1. SoftwareApplication Schema for this specific converter tool
      jsonLdSchemas.push({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: `${activeSeoConfig.h1} - Convert-X`,
        operatingSystem: 'Any (Web Browser)',
        applicationCategory: 'MultimediaApplication',
        url: canonicalUrl,
        offers: {
          '@type': 'Offer',
          price: '0.00',
          priceCurrency: 'USD',
        },
        description: activeSeoConfig.metaDescription,
        featureList: activeSeoConfig.features.join(', '),
      });

      // 2. FAQPage Schema for the FAQs on this converter page
      if (activeSeoConfig.faq && activeSeoConfig.faq.length > 0) {
        jsonLdSchemas.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: activeSeoConfig.faq.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        });
      }

      // 3. BreadcrumbList Schema
      jsonLdSchemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: origin,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Converters',
            item: `${origin}/formats`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: activeSeoConfig.h1,
            item: canonicalUrl,
          },
        ],
      });
    } else {
      // General view schemas
      if (currentView === 'home') {
        title = 'Convert-X - Universal Online File Converter for Images, PDFs & Design Files';
        description = 'Convert images, PDFs, vector and professional design files with Convert-X.';
        canonicalUrl = `${origin}/`;

        // WebSite Schema
        jsonLdSchemas.push({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Convert-X',
          url: origin,
          description: 'Convert images, PDFs, vector and professional design files with Convert-X.',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${origin}/converter?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        });

        // SoftwareApplication General Schema
        jsonLdSchemas.push({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Convert-X Online File Converter',
          operatingSystem: 'All (Web Application)',
          applicationCategory: 'UtilitiesApplication',
          url: origin,
          offers: {
            '@type': 'Offer',
            price: '0.00',
            priceCurrency: 'USD',
          },
          description: 'High-speed image converter, PDF converter, and design file converter with server-side vector rendering.',
        });
      } else if (currentView === 'formats') {
        title = 'Supported File Formats Matrix | Convert-X';
        description = 'Explore supported input and output formats in Convert-X, including PNG, JPG, WEBP, PDF, SVG, and DXF.';
        canonicalUrl = `${origin}/formats`;
      } else if (currentView === 'how-it-works') {
        title = 'How It Works - Fast & Secure File Conversion | Convert-X';
        description = 'Learn how Convert-X converts images, PDFs, and design files with server-side rendering and automatic zero-retention file deletion.';
        canonicalUrl = `${origin}/how-it-works`;
      } else if (currentView === 'faq') {
        title = 'Frequently Asked Questions (FAQ) | Convert-X';
        description = 'Find answers to common questions about file formats, conversion quality, privacy security, and batch file processing in Convert-X.';
        canonicalUrl = `${origin}/faq`;
      } else if (currentView === 'privacy') {
        title = 'Privacy Policy & Zero-Retention Security | Convert-X';
        description = 'Convert-X privacy policy: 256-bit TLS encryption, strict zero-retention memory processing, and instant automated file purging.';
        canonicalUrl = `${origin}/privacy`;
      } else if (currentView === 'terms') {
        title = 'Terms of Service | Convert-X';
        description = 'Convert-X terms of service, acceptable use policies, and conversion service terms.';
        canonicalUrl = `${origin}/terms`;
      } else if (currentView === 'contact') {
        title = 'Contact Support & Engine Inquiries | Convert-X';
        description = 'Get in touch with the Convert-X technical team for format support, engine issues, or enterprise file processing questions.';
        canonicalUrl = `${origin}/contact`;
      } else if (currentView === 'dashboard') {
        title = 'Conversion History & Batch Queue | Convert-X';
        description = 'Manage your multi-file conversion queue and view previous conversion job records in Convert-X.';
        canonicalUrl = `${origin}/dashboard`;
      } else if (currentView === 'converter') {
        title = 'File Converter Workspace | Convert-X';
        description = 'Upload files, select target formats, adjust DPI and compression settings, and execute fast server-side conversions.';
        canonicalUrl = `${origin}/converter`;
      }
    }

    // 1. Update Title
    document.title = title;

    // 2. Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // 3. Update Canonical URL
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);

    // 4. Update Open Graph Meta
    const updateMetaTag = (attr: 'name' | 'property', key: string, value: string) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', value);
    };

    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:url', canonicalUrl);
    updateMetaTag('property', 'og:site_name', 'Convert-X');
    updateMetaTag('property', 'og:type', ogType);
    updateMetaTag('property', 'og:image', `${origin}/og-image.png`);

    // 5. Update Twitter Meta
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', title);
    updateMetaTag('name', 'twitter:description', description);
    updateMetaTag('name', 'twitter:image', `${origin}/og-image.png`);

    // 6. Inject JSON-LD Structured Data
    const existingScripts = document.querySelectorAll('script[data-seo-jsonld="true"]');
    existingScripts.forEach((s) => s.remove());

    jsonLdSchemas.forEach((schemaObj) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', 'true');
      script.textContent = JSON.stringify(schemaObj);
      document.head.appendChild(script);
    });
  }, [currentView, seoSlug]);

  return null;
};
