import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceIcon = join(__dirname, '..', 'public', 'favicon.ico');
const outputDir = join(__dirname, '..', 'public', 'icons');

async function generateIcons() {
  try {
    // Read the source icon
    const sourceBuffer = readFileSync(sourceIcon);
    
    // Generate 192x192 icon
    await sharp(sourceBuffer)
      .resize(192, 192, { fit: 'contain', background: { r: 53, g: 49, b: 56, alpha: 1 } })
      .png()
      .toFile(join(outputDir, 'icon-192.png'));
    console.log('✓ Generated icon-192.png');
    
    // Generate 512x512 icon
    await sharp(sourceBuffer)
      .resize(512, 512, { fit: 'contain', background: { r: 53, g: 49, b: 56, alpha: 1 } })
      .png()
      .toFile(join(outputDir, 'icon-512.png'));
    console.log('✓ Generated icon-512.png');
    
    // Generate 512x512 maskable icon (with safe zone padding)
    await sharp(sourceBuffer)
      .resize(410, 410, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: { r: 53, g: 49, b: 56, alpha: 1 }
      })
      .png()
      .toFile(join(outputDir, 'icon-maskable-512.png'));
    console.log('✓ Generated icon-maskable-512.png');
    
    // Generate 180x180 Apple touch icon
    await sharp(sourceBuffer)
      .resize(180, 180, { fit: 'contain', background: { r: 53, g: 49, b: 56, alpha: 1 } })
      .png()
      .toFile(join(outputDir, 'apple-touch-icon.png'));
    console.log('✓ Generated apple-touch-icon.png');
    
    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
