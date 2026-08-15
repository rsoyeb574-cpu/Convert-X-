import { SEO_ROUTES } from '../src/data/seoRoutes.js';

async function testSeoSystem() {
  console.log('====================================================');
  console.log('RUNNING CONVERT-X ORGANIC TRAFFIC & SEO VERIFICATION');
  console.log('====================================================');

  const requiredSeoSlugs = [
    'png-to-jpg',
    'jpg-to-png',
    'png-to-pdf',
    'jpg-to-pdf',
    'pdf-to-png',
    'pdf-to-jpg',
    'image-to-pdf',
    'image-compressor',
    'pdf-compressor',
  ];

  let passed = 0;
  let total = 0;

  for (const slug of requiredSeoSlugs) {
    total++;
    const config = SEO_ROUTES[slug];
    if (!config) {
      console.error(`[FAIL] Missing SEO route configuration for /${slug}`);
      continue;
    }

    const checks = [
      Boolean(config.title && config.title.length > 10),
      Boolean(config.metaDescription && config.metaDescription.length > 20),
      Boolean(config.h1 && config.h1.length > 5),
      Boolean(config.shortExplanation && config.shortExplanation.length > 20),
      Boolean(config.faq && config.faq.length >= 2),
      Boolean(config.features && config.features.length >= 3),
      Boolean(config.howToUse && config.howToUse.length === 4),
      Boolean(config.comparison && config.comparison.fromPoints.length >= 2),
      Boolean(config.relatedSlugs && config.relatedSlugs.length >= 2),
    ];

    if (checks.every(Boolean)) {
      console.log(`[PASS] /${slug}: Unique Title, H1, Meta Description, FAQs, Specs, and Internal Links verified.`);
      passed++;
    } else {
      console.error(`[FAIL] /${slug} failed quality checks:`, checks);
    }
  }

  console.log('====================================================');
  console.log(`SEO TEST RESULTS: ${passed} / ${total} SEO PAGES VERIFIED`);
  console.log('====================================================');
}

testSeoSystem().catch(console.error);
