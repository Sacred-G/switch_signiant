// icon-generator.js
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import png2icons from 'png2icons';

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Required icon sizes for Windows
const REQUIRED_SIZES = [16, 20, 24, 30, 32, 36, 40, 44, 48, 60, 64, 72, 80, 96, 256];

async function generateIcons(inputImagePath, outputDir) {
  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });
    
    // Load the input image
    const image = sharp(inputImagePath);
    
    // Generate resized PNG images
    const resizedImages = await Promise.all(
      REQUIRED_SIZES.map(async (size) => {
        const resized = await image
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
          
        return {
          size,
          buffer: resized
        };
      })
    );
    
    // Save individual PNGs (optional, but useful for verification)
    await Promise.all(
      resizedImages.map(({ size, buffer }) =>
        fs.writeFile(
          path.join(outputDir, `icon-${size}x${size}.png`),
          buffer
        )
      )
    );
    
    console.log('✅ Generated all required icon sizes');
    
    // Convert the largest PNG to ICO
    const largestPng = resizedImages.find(img => img.size === 256);
    const icoBuffer = png2icons.createICO(largestPng.buffer, png2icons.BILINEAR, false);
    
    // Save the ICO file
    await fs.writeFile(
      path.join(outputDir, 'app.ico'),
      icoBuffer
    );
    
    console.log('✅ Generated app.ico file');
    
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// If running directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.log('Usage: node icon-generator.js <input-image> <output-directory>');
    process.exit(1);
  }
  
  const [inputImage, outputDir] = args;
  generateIcons(inputImage, outputDir);
}

export default generateIcons;