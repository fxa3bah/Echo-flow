/**
 * Icon Generator Script
 *
 * This script generates all PWA icons from the SVG source
 *
 * Usage:
 * 1. Install dependencies: npm install sharp
 * 2. Run: node generate-icons.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, 'public');
const svgPath = path.join(publicDir, 'icon.svg');

// Icon sizes to generate
const sizes = [
  { name: 'favicon.ico', size: 32, format: 'png' }, // Will be converted to .ico manually or use as fallback
  { name: 'favicon-16x16.png', size: 16, format: 'png' },
  { name: 'favicon-32x32.png', size: 32, format: 'png' },
  { name: 'apple-touch-icon.png', size: 180, format: 'png' }, // iOS
  { name: 'icon-192.png', size: 192, format: 'png' }, // Android
  { name: 'icon-512.png', size: 512, format: 'png' }, // Android
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  // Check if SVG exists
  if (!fs.existsSync(svgPath)) {
    console.error('❌ icon.svg not found in public directory');
    process.exit(1);
  }

  // Read SVG
  const svgBuffer = fs.readFileSync(svgPath);

  // Generate each size
  for (const icon of sizes) {
    try {
      const outputPath = path.join(publicDir, icon.name);

      await sharp(svgBuffer)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${icon.name}:`, error.message);
    }
  }

  // Also create favicon.ico from 32x32 png
  try {
    const favicon32Path = path.join(publicDir, 'favicon-32x32.png');
    const faviconPath = path.join(publicDir, 'favicon.ico');

    // Sharp doesn't support .ico output, so we just copy the PNG
    // Browsers will accept PNG as favicon
    fs.copyFileSync(favicon32Path, faviconPath);
    console.log('✅ Generated favicon.ico');
  } catch (error) {
    console.error('⚠️  Could not generate favicon.ico:', error.message);
  }

  console.log('\n✨ All icons generated successfully!');
  console.log('\n📱 Your app is now ready to be installed as a PWA!');
  console.log('   - iOS: Share → Add to Home Screen');
  console.log('   - Android: Menu → Install App');
  console.log('   - Desktop: Install icon in address bar');
}

// Run the generator
generateIcons().catch(console.error);
