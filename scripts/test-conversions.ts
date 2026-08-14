import { ConverterRegistry } from '../server/converters/registry.js';
import { SAMPLE_FILES } from '../server/utils/samples.js';
import sharp from 'sharp';

const converterRegistry = new ConverterRegistry();

async function runTests() {
  console.log('🚀 Starting Complete Bidirectional Matrix Verification Suite...\n');

  // Load sample source files
  const pngSample = await SAMPLE_FILES.sample_photo.getContent();
  const pdfSample = await SAMPLE_FILES.sample_document.getContent();
  const svgSample = await SAMPLE_FILES.vector_artwork.getContent();
  const dxfSample = await SAMPLE_FILES.cad_blueprint.getContent();
  const psdSample = await SAMPLE_FILES.sample_psd.getContent();
  const aiSample = await SAMPLE_FILES.sample_ai.getContent();

  // Create JPG & WEBP sources from PNG sample
  const jpgSample = await sharp(pngSample).flatten({ background: '#ffffff' }).jpeg().toBuffer();
  const webpSample = await sharp(pngSample).webp().toBuffer();

  const testCases: {
    from: string;
    to: string;
    buffer: Buffer;
    options?: any;
    expectedMime: string;
  }[] = [
    // 1. PNG ↔ JPG
    { from: 'png', to: 'jpg', buffer: pngSample, expectedMime: 'image/jpeg' },
    { from: 'jpg', to: 'png', buffer: jpgSample, expectedMime: 'image/png' },

    // 2. PNG ↔ WEBP
    { from: 'png', to: 'webp', buffer: pngSample, expectedMime: 'image/webp' },
    { from: 'webp', to: 'png', buffer: webpSample, expectedMime: 'image/png' },

    // 3. JPG ↔ WEBP
    { from: 'jpg', to: 'webp', buffer: jpgSample, expectedMime: 'image/webp' },
    { from: 'webp', to: 'jpg', buffer: webpSample, expectedMime: 'image/jpeg' },

    // 4. PNG ↔ PDF
    { from: 'png', to: 'pdf', buffer: pngSample, expectedMime: 'application/pdf' },
    { from: 'pdf', to: 'png', buffer: pdfSample, options: { pageNumber: 1 }, expectedMime: 'image/png' },

    // 5. JPG ↔ PDF
    { from: 'jpg', to: 'pdf', buffer: jpgSample, expectedMime: 'application/pdf' },
    { from: 'pdf', to: 'jpg', buffer: pdfSample, options: { pageNumber: 1 }, expectedMime: 'image/jpeg' },

    // 6. WEBP ↔ PDF
    { from: 'webp', to: 'pdf', buffer: webpSample, expectedMime: 'application/pdf' },
    { from: 'pdf', to: 'webp', buffer: pdfSample, options: { pageNumber: 1 }, expectedMime: 'image/webp' },

    // 7. SVG -> Raster & PDF
    { from: 'svg', to: 'png', buffer: svgSample, expectedMime: 'image/png' },
    { from: 'svg', to: 'jpg', buffer: svgSample, expectedMime: 'image/jpeg' },
    { from: 'svg', to: 'webp', buffer: svgSample, expectedMime: 'image/webp' },
    { from: 'svg', to: 'pdf', buffer: svgSample, expectedMime: 'application/pdf' },

    // 8. DXF -> CAD / Vector / Raster
    { from: 'dxf', to: 'svg', buffer: dxfSample, expectedMime: 'image/svg+xml' },
    { from: 'dxf', to: 'pdf', buffer: dxfSample, expectedMime: 'application/pdf' },
    { from: 'dxf', to: 'png', buffer: dxfSample, expectedMime: 'image/png' },
    { from: 'dxf', to: 'jpg', buffer: dxfSample, expectedMime: 'image/jpeg' },

    // 9. PSD -> Raster & PDF
    { from: 'psd', to: 'png', buffer: psdSample, expectedMime: 'image/png' },
    { from: 'psd', to: 'jpg', buffer: psdSample, expectedMime: 'image/jpeg' },
    { from: 'psd', to: 'pdf', buffer: psdSample, expectedMime: 'application/pdf' },

    // 10. AI -> Raster & PDF
    { from: 'ai', to: 'png', buffer: aiSample, expectedMime: 'image/png' },
    { from: 'ai', to: 'jpg', buffer: aiSample, expectedMime: 'image/jpeg' },
    { from: 'ai', to: 'pdf', buffer: aiSample, expectedMime: 'application/pdf' },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    const testName = `[${test.from.toUpperCase()} → ${test.to.toUpperCase()}]`;
    try {
      const engine = converterRegistry.findEngineFor(test.from, test.to);
      if (!engine) {
        throw new Error(`No engine found supporting ${test.from} -> ${test.to}`);
      }

      const result = await engine.convert({
        inputBuffer: test.buffer,
        inputFormat: test.from,
        outputFormat: test.to,
        fileName: `test_file.${test.from}`,
        options: test.options || {},
      });

      if (!result.buffer || result.buffer.length === 0) {
        throw new Error('Conversion generated empty buffer');
      }

      if (result.mimeType !== test.expectedMime) {
        throw new Error(`MIME type mismatch: expected ${test.expectedMime}, got ${result.mimeType}`);
      }

      console.log(`  ✅ ${testName.padEnd(16)} | Engine: ${engine.name.padEnd(20)} | Out: ${result.buffer.length} bytes | MIME: ${result.mimeType}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ ${testName.padEnd(16)} | ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
