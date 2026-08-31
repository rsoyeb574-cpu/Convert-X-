import React, { useEffect } from 'react';
import { SeoRouteConfig, SEO_ROUTES } from '../data/seoRoutes.js';
import { PageView } from '../types.js';

interface SeoMetaManagerProps {
  currentView: PageView;
  seoSlug?: string;
}

export const SeoMetaManager: React.FC<SeoMetaManagerProps> = ({ currentView, seoSlug }) => {
  useEffect(() => {
    const origin =
      typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('run.app')
        ? window.location.origin
        : 'https://convert-x.onrender.com';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

    let title = 'Convert-X - Free Online File Converter';
    let description = 'Convert images, PDFs and supported design files online for free with Convert-X. Fast, simple and easy file conversion.';
    let canonicalUrl = `${origin}${pathname}`;
    let ogType = 'website';
    let jsonLdSchemas: object[] = [];

    const activeSeoConfig: SeoRouteConfig | undefined =
      currentView === 'seo' && seoSlug ? SEO_ROUTES[seoSlug] : undefined;

    if (activeSeoConfig) {
      title = activeSeoConfig.title;
      description = activeSeoConfig.metaDescription;
      canonicalUrl = `${origin}/${activeSeoConfig.slug}`;

      // 1. SoftwareApplication & WebApplication Schema for this specific converter tool
      jsonLdSchemas.push({
        '@context': 'https://schema.org',
        '@type': ['SoftwareApplication', 'WebApplication'],
        '@id': `${canonicalUrl}#software`,
        name: `Convert-X: ${activeSeoConfig.h1}`,
        headline: activeSeoConfig.title,
        description: activeSeoConfig.metaDescription,
        url: canonicalUrl,
        applicationCategory: 'UtilitiesApplication',
        applicationSubCategory: 'FileConverter',
        operatingSystem: 'All (Web Browser, Windows, macOS, Linux, iOS, Android)',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
        softwareVersion: '2.4.0',
        offers: {
          '@type': 'Offer',
          price: '0.00',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          category: 'Free Online File Conversion',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '1420',
          bestRating: '5',
          worstRating: '1',
        },
        author: {
          '@type': 'Organization',
          name: 'Convert-X',
          url: origin,
          logo: `${origin}/icon-192.png`,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Convert-X',
          url: origin,
        },
        screenshot: `${origin}/og-image.png`,
        featureList: activeSeoConfig.features,
        fileFormat: [
          ...activeSeoConfig.supportedInputFormats,
          ...activeSeoConfig.supportedOutputFormats,
        ],
      });

      // 2. HowTo Schema for Step-by-Step Instructions
      jsonLdSchemas.push({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        '@id': `${canonicalUrl}#howto`,
        name: `How to convert ${activeSeoConfig.fromFormat.toUpperCase()} to ${activeSeoConfig.toFormat.toUpperCase()} online for free`,
        description: `Step-by-step instructions to convert ${activeSeoConfig.fromFormat.toUpperCase()} files into ${activeSeoConfig.toFormat.toUpperCase()} format using Convert-X.`,
        totalTime: 'PT30S',
        tool: [
          {
            '@type': 'HowToTool',
            name: `Convert-X ${activeSeoConfig.h1}`,
          },
        ],
        step: activeSeoConfig.howToUse.map((step) => ({
          '@type': 'HowToStep',
          position: step.step,
          name: step.title,
          text: step.text,
          url: `${canonicalUrl}#step-${step.step}`,
        })),
      });

      // 3. FAQPage Schema for the FAQs on this converter page
      if (activeSeoConfig.faq && activeSeoConfig.faq.length > 0) {
        jsonLdSchemas.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          '@id': `${canonicalUrl}#faq`,
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

      // 4. BreadcrumbList Schema
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
        title = 'Convert-X - Free Online File Converter';
        description = 'Convert images, PDFs and supported design files online for free with Convert-X. Fast, simple and easy file conversion.';
        canonicalUrl = `${origin}/`;

        // WebSite Schema
        jsonLdSchemas.push({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Convert-X',
          url: origin,
          description: 'Convert images, PDFs and supported design files online for free with Convert-X. Fast, simple and easy file conversion.',
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
      } else if (currentView === 'text-to-voice') {
        title = 'Text to Voice – Convert Text to Natural Speech | Convert-X';
        description =
          'Turn your text into natural-sounding speech and download the audio. Multilingual speech synthesis with voice, speed, and pitch customization.';
        canonicalUrl = `${origin}/text-to-voice`;

        // SoftwareApplication / WebApplication Schema for TTS
        jsonLdSchemas.push({
          '@context': 'https://schema.org',
          '@type': ['SoftwareApplication', 'WebApplication'],
          '@id': `${canonicalUrl}#software`,
          name: 'Convert-X Text to Voice Online',
          headline: 'Text to Voice – Convert Text to Natural Speech | Convert-X',
          description: description,
          url: canonicalUrl,
          applicationCategory: 'UtilitiesApplication',
          applicationSubCategory: 'TextToSpeechApplication',
          operatingSystem: 'All (Web Browser, Windows, macOS, Linux, iOS, Android)',
          browserRequirements: 'Requires JavaScript. Requires HTML5.',
          softwareVersion: '2.4.0',
          offers: {
            '@type': 'Offer',
            price: '0.00',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            category: 'Free Online Text to Speech',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            reviewCount: '1350',
            bestRating: '5',
            worstRating: '1',
          },
          featureList: [
            'Natural neural voices (Male & Female)',
            'Full support for English, Hindi, Urdu, Spanish, French, German, Arabic, and more',
            'Customizable playback speed (0.5x to 2x), pitch, and volume',
            'Live audio waveform preview player',
            'Direct high-fidelity MP3 and WAV audio download',
            'Zero-retention 256-bit encrypted ephemeral processing',
          ],
        });

        // HowTo Schema for Step-by-Step Instructions
        jsonLdSchemas.push({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          '@id': `${canonicalUrl}#howto`,
          name: 'How to convert text to natural speech and download audio online for free',
          description: 'Step-by-step instructions to convert text into natural-sounding speech using Convert-X.',
          totalTime: 'PT20S',
          step: [
            {
              '@type': 'HowToStep',
              position: 1,
              name: 'Enter or Paste Text',
              text: 'Type or paste your text into the Convert-X Text to Voice editor with live character counting.',
            },
            {
              '@type': 'HowToStep',
              position: 2,
              name: 'Select Language & Voice Settings',
              text: 'Select your language (e.g., English, Hindi, Urdu), choose a voice model, and adjust speed or pitch.',
            },
            {
              '@type': 'HowToStep',
              position: 3,
              name: 'Preview & Download Audio',
              text: 'Click Generate Voice, preview the natural speech in the built-in audio player, and download as MP3 or WAV.',
            },
          ],
        });

        // Breadcrumb Schema
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
              name: 'Text to Voice',
              item: canonicalUrl,
            },
          ],
        });
      } else if (currentView === 'compress') {
        title = 'Compress Files Online – Reduce File Size | Convert-X';
        description =
          'Compress PDF, JPG, PNG and WebP files online. Reduce file size while maintaining good quality with Convert-X.';
        canonicalUrl = `${origin}/compress`;

        // SoftwareApplication / WebApplication Schema for Compression
        jsonLdSchemas.push({
          '@context': 'https://schema.org',
          '@type': ['SoftwareApplication', 'WebApplication'],
          '@id': `${canonicalUrl}#software`,
          name: 'Convert-X Online File Compressor',
          headline: 'Compress Files Online – Reduce File Size with Convert-X',
          description: description,
          url: canonicalUrl,
          applicationCategory: 'UtilitiesApplication',
          applicationSubCategory: 'FileCompressor',
          operatingSystem: 'All (Web Browser, Windows, macOS, Linux, iOS, Android)',
          browserRequirements: 'Requires JavaScript. Requires HTML5.',
          softwareVersion: '2.4.0',
          offers: {
            '@type': 'Offer',
            price: '0.00',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            category: 'Free Online File Compression',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            reviewCount: '1180',
            bestRating: '5',
            worstRating: '1',
          },
          featureList: [
            'Lossless PNG compression with full transparency preservation',
            'Smart PDF vector stream and image optimization',
            'Customizable compression levels (Maximum, Balanced, High Quality)',
            'Optional target file size reduction engine',
            'Zero-retention 256-bit encrypted ephemeral processing',
          ],
        });

        // HowTo Schema for Step-by-Step Instructions
        jsonLdSchemas.push({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          '@id': `${canonicalUrl}#howto`,
          name: 'How to compress PDF, JPG, PNG, and WebP files online for free',
          description: 'Step-by-step instructions to reduce file sizes online while preserving visual quality using Convert-X.',
          totalTime: 'PT20S',
          step: [
            {
              '@type': 'HowToStep',
              position: 1,
              name: 'Upload File',
              text: 'Drag and drop your PDF, JPG, PNG, or WebP file into the Convert-X compressor upload area.',
            },
            {
              '@type': 'HowToStep',
              position: 2,
              name: 'Select Compression Level',
              text: 'Choose Balanced (recommended), Maximum, or High Quality, or set an optional Target File Size.',
            },
            {
              '@type': 'HowToStep',
              position: 3,
              name: 'Download Compressed File',
              text: 'Click Compress File and download your optimized result immediately with full size reduction stats.',
            },
          ],
        });

        // Breadcrumb Schema
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
              name: 'Tools',
              item: `${origin}/tools`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: 'Compress File',
              item: canonicalUrl,
            },
          ],
        });
      } else if (currentView === 'tools') {
        title = 'All Free Online Conversion Tools | Convert-X Directory';
        description = 'Browse the complete catalog of free online file conversion tools. Fast, private, and zero-retention image, PDF, and vector converters.';
        canonicalUrl = `${origin}/tools`;
      } else if (currentView === 'about') {
        title = 'About Convert-X - Fast, Ephemeral & Private File Conversion';
        description = 'Learn about Convert-X: our high-speed C++ conversion pipeline, zero-retention privacy architecture, 256-bit encryption, and technical mission.';
        canonicalUrl = `${origin}/about`;
      } else if (currentView === 'formats') {
        title = 'Supported File Formats Matrix | Convert-X';
        description = 'Explore supported input and output formats in Convert-X, including PNG, JPG, WEBP, PDF, SVG, and DXF.';
        canonicalUrl = `${origin}/formats`;
      } else if (currentView === 'pricing') {
        title = 'Pricing Plans & Pro Limits | Convert-X';
        description = 'Compare Free and Pro plans in Convert-X. Convert up to 100MB files, unlock unlimited daily conversions, and batch queues.';
        canonicalUrl = `${origin}/pricing`;
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
      } else if (currentView === '404') {
        title = 'Page Not Found (404) | Convert-X';
        description = 'The requested file conversion tool or page could not be found.';
        canonicalUrl = `${origin}/404`;
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
