import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateOgImage() {
  const width = 1200;
  const height = 630;

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0F172A" />
        <stop offset="100%" stop-color="#1E293B" />
      </linearGradient>
      <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2563EB" />
        <stop offset="100%" stop-color="#7C3AED" />
      </linearGradient>
      <radialGradient id="glow" cx="70%" cy="30%" r="60%">
        <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.25" />
        <stop offset="100%" stop-color="#1E293B" stop-opacity="0" />
      </radialGradient>
    </defs>

    <!-- Background -->
    <rect width="${width}" height="${height}" fill="url(#bgGradient)" />
    <rect width="${width}" height="${height}" fill="url(#glow)" />

    <!-- Top Badge -->
    <rect x="80" y="80" width="220" height="40" rx="20" fill="#1E293B" stroke="#334155" stroke-width="1.5" />
    <text x="190" y="105" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="#60A5FA" text-anchor="middle">
      100% Free Online Converter
    </text>

    <!-- App Logo Icon -->
    <rect x="80" y="150" width="72" height="72" rx="20" fill="url(#primaryGrad)" />
    <path d="M96 176 L136 176 L136 196 L96 196 Z" fill="#FFFFFF" fill-opacity="0.3" />
    <path d="M102 168 L142 168 L142 188 L102 188 Z" fill="#FFFFFF" fill-opacity="0.6" />
    <path d="M108 160 L148 160 L148 180 L108 180 Z" fill="#FFFFFF" />

    <!-- App Name Title -->
    <text x="172" y="202" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF">
      Convert<tspan fill="#3B82F6">-X</tspan>
    </text>

    <!-- Main Headline -->
    <text x="80" y="290" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="800" fill="#F8FAFC">
      Fast, Ephemeral &amp; Private
    </text>
    <text x="80" y="348" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="800" fill="#93C5FD">
      Universal File Converter
    </text>

    <!-- Subtitle -->
    <text x="80" y="415" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#94A3B8">
      Convert Images (PNG, JPG, WEBP), Vector Graphics (SVG, DXF), and PDF Documents online.
    </text>

    <!-- Feature Pills -->
    <g transform="translate(80, 480)">
      <!-- Pill 1 -->
      <rect x="0" y="0" width="220" height="54" rx="16" fill="#0F172A" stroke="#334155" />
      <text x="110" y="33" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="bold" fill="#34D399" text-anchor="middle">
        ✓ Zero-Retention
      </text>

      <!-- Pill 2 -->
      <rect x="240" y="0" width="220" height="54" rx="16" fill="#0F172A" stroke="#334155" />
      <text x="350" y="33" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="bold" fill="#60A5FA" text-anchor="middle">
        ✓ 256-bit TLS Security
      </text>

      <!-- Pill 3 -->
      <rect x="480" y="0" width="220" height="54" rx="16" fill="#0F172A" stroke="#334155" />
      <text x="590" y="33" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="bold" fill="#FBBF24" text-anchor="middle">
        ✓ No Sign-up Required
      </text>
    </g>
  </svg>
  `;

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const outPath = path.join(publicDir, 'og-image.png');
  await sharp(Buffer.from(svg))
    .png({ quality: 90 })
    .toFile(outPath);

  console.log(`Generated social card: ${outPath} (${fs.statSync(outPath).size} bytes)`);
}

generateOgImage().catch(console.error);
