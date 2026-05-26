// generate-icons.mjs
// Run with: node generate-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = join(__dirname, 'public', 'logo.png');
const OUTPUT_DIR = join(__dirname, 'public', 'icons');

mkdirSync(OUTPUT_DIR, { recursive: true });

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of SIZES) {
  await sharp(INPUT)
    .resize(size, size, { fit: 'contain', background: { r: 6, g: 13, b: 26, alpha: 1 } })
    .png()
    .toFile(join(OUTPUT_DIR, `icon-${size}x${size}.png`));
  console.log(`✅ Generated icon-${size}x${size}.png`);
}

// Also generate favicon.ico equivalent (96x96)
await sharp(INPUT)
  .resize(32, 32, { fit: 'contain', background: { r: 6, g: 13, b: 26, alpha: 1 } })
  .png()
  .toFile(join(OUTPUT_DIR, 'favicon-32x32.png'));

console.log('✅ All PWA icons generated successfully in public/icons/');
