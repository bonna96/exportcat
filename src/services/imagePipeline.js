const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const multer = require('multer');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads';
const MAX_SIZE = (parseInt(process.env.MAX_IMAGE_SIZE_MB) || 10) * 1024 * 1024;

// Responsive sizes for srcset generation
const RESPONSIVE_SIZES = [320, 640, 960, 1280, 1920];

// Multer storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const dir = path.join(process.cwd(), UPLOAD_DIR, 'originals');
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported image format: ${file.mimetype}`));
    }
  },
});

/**
 * Process uploaded image into AVIF and WebP at responsive sizes (FR-11)
 * @param {string} originalPath - Path to the original uploaded image
 * @param {string} slug - Product slug for naming
 * @returns {Object} Generated image paths and metadata
 */
async function processImage(originalPath, slug) {
  const metadata = await sharp(originalPath).metadata();
  const baseName = path.basename(originalPath, path.extname(originalPath));

  const webpDir = path.join(process.cwd(), UPLOAD_DIR, 'webp');
  const avifDir = path.join(process.cwd(), UPLOAD_DIR, 'avif');
  await fs.mkdir(webpDir, { recursive: true });
  await fs.mkdir(avifDir, { recursive: true });

  const results = {
    original: `/${UPLOAD_DIR}/originals/${path.basename(originalPath)}`,
    width: metadata.width,
    height: metadata.height,
    webp: [],
    avif: [],
  };

  for (const size of RESPONSIVE_SIZES) {
    if (size > metadata.width) continue; // Don't upscale

    const aspectRatio = metadata.height / metadata.width;
    const height = Math.round(size * aspectRatio);

    // WebP
    const webpFilename = `${baseName}-${size}w.webp`;
    await sharp(originalPath)
      .resize(size, height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(webpDir, webpFilename));

    results.webp.push({
      url: `/${UPLOAD_DIR}/webp/${webpFilename}`,
      width: size,
      height,
    });

    // AVIF
    const avifFilename = `${baseName}-${size}w.avif`;
    await sharp(originalPath)
      .resize(size, height, { fit: 'inside', withoutEnlargement: true })
      .avif({ quality: 65 })
      .toFile(path.join(avifDir, avifFilename));

    results.avif.push({
      url: `/${UPLOAD_DIR}/avif/${avifFilename}`,
      width: size,
      height,
    });
  }

  // Generate primary WebP and AVIF at original size
  const webpPrimary = `${baseName}.webp`;
  await sharp(originalPath).webp({ quality: 85 }).toFile(path.join(webpDir, webpPrimary));
  results.webpUrl = `/${UPLOAD_DIR}/webp/${webpPrimary}`;

  const avifPrimary = `${baseName}.avif`;
  await sharp(originalPath).avif({ quality: 70 }).toFile(path.join(avifDir, avifPrimary));
  results.avifUrl = `/${UPLOAD_DIR}/avif/${avifPrimary}`;

  return results;
}

/**
 * Generate srcset string for <img> or <source> tags
 */
function generateSrcset(images) {
  return images
    .map((img) => `${img.url} ${img.width}w`)
    .join(', ');
}

module.exports = { upload, processImage, generateSrcset, RESPONSIVE_SIZES };
