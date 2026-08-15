import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Generate 512x512 SVG buffer
  const svg512 = `
    <svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="112" fill="#0B1120"/>
      <circle cx="256" cy="256" r="210" fill="url(#grad)" opacity="0.15"/>
      <defs>
        <linearGradient id="grad" x1="46" y1="46" x2="466" y2="466" gradientUnits="userSpaceOnUse">
          <stop stop-color="#2563EB"/>
          <stop offset="1" stop-color="#7C3AED"/>
        </linearGradient>
        <linearGradient id="bolt" x1="160" y1="120" x2="352" y2="392" gradientUnits="userSpaceOnUse">
          <stop stop-color="#38BDF8"/>
          <stop offset="0.5" stop-color="#2563EB"/>
          <stop offset="1" stop-color="#7C3AED"/>
        </linearGradient>
      </defs>
      <!-- Stylized X and Arrows -->
      <path d="M150 160L362 352M362 160L150 352" stroke="url(#bolt)" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="150" cy="160" r="24" fill="#38BDF8"/>
      <circle cx="362" cy="352" r="24" fill="#7C3AED"/>
      <circle cx="362" cy="160" r="24" fill="#2563EB"/>
      <circle cx="150" cy="352" r="24" fill="#60A5FA"/>
    </svg>
  `;

  await sharp(Buffer.from(svg512))
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));

  await sharp(Buffer.from(svg512))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  console.log('Generated icon-192.png and icon-512.png successfully!');
}

generateIcons().catch(console.error);
