import { UploadedImageItem, ImageSourceType } from '../types.ts';

// Allowed extensions and MIME types
const JPEG_EXTENSIONS = ['.jpg', '.jpeg', '.jpe', '.jfif'];
const SUPPORTED_EXTENSIONS = [
  ...JPEG_EXTENSIONS,
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.avif'
];

const JPEG_MIME_TYPES = [
  'image/jpeg',
  'image/pjpeg',
  'image/jfif',
  'image/jpg'
];

const SUPPORTED_MIME_TYPES = [
  ...JPEG_MIME_TYPES,
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/heic-sequence',
  'image/heif-sequence'
];

export interface QualityAnalysisResult {
  isAcceptable: boolean;
  warningMessage: string | null;
  metrics: {
    width: number;
    height: number;
    meanLuminance: number;
    glarePercentage: number;
    blurScore: number;
    isTooDark: boolean;
    isOverexposed: boolean;
    hasExcessiveGlare: boolean;
    isBlurry: boolean;
    isTooSmall: boolean;
  };
}

/**
 * Checks file magic bytes to verify actual image content
 */
export async function detectImageFormatFromBytes(file: File): Promise<{
  format: 'jpeg' | 'png' | 'webp' | 'heic' | 'heif' | 'avif' | 'unknown';
  mimeType: string;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (!reader.result || !(reader.result instanceof ArrayBuffer)) {
        return resolve({ format: 'unknown', mimeType: file.type || 'application/octet-stream' });
      }

      const arr = new Uint8Array(reader.result.slice(0, 32));
      
      // JPEG: FF D8 FF
      if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) {
        return resolve({ format: 'jpeg', mimeType: 'image/jpeg' });
      }

      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (
        arr[0] === 0x89 &&
        arr[1] === 0x50 &&
        arr[2] === 0x4e &&
        arr[3] === 0x47 &&
        arr[4] === 0x0d &&
        arr[5] === 0x0a &&
        arr[6] === 0x1a &&
        arr[7] === 0x0a
      ) {
        return resolve({ format: 'png', mimeType: 'image/png' });
      }

      // WebP: RIFF ... WEBP (bytes 0-3: 52 49 46 46, bytes 8-11: 57 45 42 50)
      if (
        arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 &&
        arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50
      ) {
        return resolve({ format: 'webp', mimeType: 'image/webp' });
      }

      // ISO Base Media File Format (HEIC, HEIF, AVIF) at offset 4
      // 'ftyp' is 0x66 0x74 0x79 0x70
      if (arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) {
        const brand = String.fromCharCode(arr[8], arr[9], arr[10], arr[11]).toLowerCase();
        if (brand.includes('avif') || brand.includes('avis')) {
          return resolve({ format: 'avif', mimeType: 'image/avif' });
        }
        if (
          brand.includes('heic') ||
          brand.includes('heix') ||
          brand.includes('heim') ||
          brand.includes('heis') ||
          brand.includes('mif1') ||
          brand.includes('msf1')
        ) {
          return resolve({ format: 'heic', mimeType: 'image/heic' });
        }
      }

      // Fallback to file extension or declared MIME type
      const lowerName = (file.name || '').toLowerCase();
      if (JPEG_EXTENSIONS.some(ext => lowerName.endsWith(ext)) || JPEG_MIME_TYPES.includes(file.type.toLowerCase())) {
        return resolve({ format: 'jpeg', mimeType: 'image/jpeg' });
      }
      if (lowerName.endsWith('.png') || file.type === 'image/png') {
        return resolve({ format: 'png', mimeType: 'image/png' });
      }
      if (lowerName.endsWith('.webp') || file.type === 'image/webp') {
        return resolve({ format: 'webp', mimeType: 'image/webp' });
      }
      if (lowerName.endsWith('.heic') || lowerName.endsWith('.heif') || file.type.includes('heic') || file.type.includes('heif')) {
        return resolve({ format: 'heic', mimeType: 'image/heic' });
      }
      if (lowerName.endsWith('.avif') || file.type.includes('avif')) {
        return resolve({ format: 'avif', mimeType: 'image/avif' });
      }

      return resolve({ format: 'unknown', mimeType: file.type || 'application/octet-stream' });
    };

    reader.onerror = () => {
      resolve({ format: 'unknown', mimeType: file.type || 'application/octet-stream' });
    };

    reader.readAsArrayBuffer(file.slice(0, 32));
  });
}

/**
 * Validates if a file is an acceptable eFootball image based on extension, MIME, or byte signatures
 */
export async function validateImageFile(file: File): Promise<{
  isValid: boolean;
  detectedFormat: string;
  normalizedMimeType: string;
  errorMessage?: string;
}> {
  // Max size: 10MB
  const MAX_SIZE_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      detectedFormat: 'unknown',
      normalizedMimeType: '',
      errorMessage: `Image is too large (${sizeMB}MB). Maximum allowed size is 10MB each.`
    };
  }

  const { format, mimeType } = await detectImageFormatFromBytes(file);

  if (format === 'unknown') {
    // Check if filename has supported extension as secondary check
    const lowerName = (file.name || '').toLowerCase();
    const hasSupportedExt = SUPPORTED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
    const hasSupportedMime = SUPPORTED_MIME_TYPES.some(m => file.type.toLowerCase().includes(m));

    if (!hasSupportedExt && !hasSupportedMime) {
      return {
        isValid: false,
        detectedFormat: 'unknown',
        normalizedMimeType: '',
        errorMessage: 'Unsupported image format. Please upload JPG, JPEG, JFIF, PNG, WebP, HEIC/HEIF or AVIF.'
      };
    }
  }

  return {
    isValid: true,
    detectedFormat: format,
    normalizedMimeType: mimeType
  };
}

/**
 * Converts HEIC/HEIF files to standard JPEG transparently
 */
export async function convertHeicToJpeg(file: File): Promise<Blob> {
  try {
    const heic2anyModule: any = await import('heic2any');
    const heic2any = heic2anyModule.default || heic2anyModule;
    
    const conversionResult = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.92
    });

    if (Array.isArray(conversionResult)) {
      return conversionResult[0];
    }
    return conversionResult;
  } catch (err: any) {
    console.error('HEIC conversion failed:', err);
    throw new Error('This image format could not be processed. Please convert the image to JPG or PNG, or take a new photo.');
  }
}

/**
 * Loads an image/blob into an HTMLImageElement with cross-origin safety
 */
export function loadImageElement(blobOrUrl: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);

    img.onload = () => {
      resolve(img);
    };

    img.onerror = (e) => {
      reject(new Error('The image file appears corrupted or could not be decoded. Please try another image.'));
    };

    img.src = url;
  });
}

/**
 * Performs image quality assessment (blur, glare, dark, overexposure, low-res)
 */
export function analyzeImageQuality(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): QualityAnalysisResult {
  // Check minimal dimensions
  if (width < 320 || height < 240) {
    return {
      isAcceptable: false,
      warningMessage: 'Image resolution is too low. Player names and stats will not be legible.',
      metrics: {
        width,
        height,
        meanLuminance: 0,
        glarePercentage: 0,
        blurScore: 0,
        isTooDark: false,
        isOverexposed: false,
        hasExcessiveGlare: false,
        isBlurry: false,
        isTooSmall: true
      }
    };
  }

  // Sample a representative downscaled buffer for fast statistical analysis
  const sampleW = Math.min(240, width);
  const sampleH = Math.min(180, height);
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = sampleW;
  sampleCanvas.height = sampleH;
  const sampleCtx = sampleCanvas.getContext('2d');

  if (!sampleCtx) {
    return {
      isAcceptable: true,
      warningMessage: null,
      metrics: {
        width,
        height,
        meanLuminance: 128,
        glarePercentage: 0,
        blurScore: 100,
        isTooDark: false,
        isOverexposed: false,
        hasExcessiveGlare: false,
        isBlurry: false,
        isTooSmall: false
      }
    };
  }

  sampleCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
  const imgData = sampleCtx.getImageData(0, 0, sampleW, sampleH);
  const data = imgData.data;

  let totalLuminance = 0;
  let glarePixels = 0;
  const grayValues: number[] = new Array(sampleW * sampleH);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLuminance += lum;
    grayValues[p] = lum;

    // Check pure white glare hotspots (near 255 across all channels)
    if (r > 248 && g > 248 && b > 248) {
      glarePixels++;
    }
  }

  const pixelCount = sampleW * sampleH;
  const meanLuminance = totalLuminance / pixelCount;
  const glarePercentage = (glarePixels / pixelCount) * 100;

  // Sharpness / Blur estimation via Laplacian gradient variance
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  let edgeSamples = 0;

  for (let y = 1; y < sampleH - 1; y += 2) {
    for (let x = 1; x < sampleW - 1; x += 2) {
      const idx = y * sampleW + x;
      // Discrete Laplacian filter: 4 * center - (top + bottom + left + right)
      const center = grayValues[idx];
      const top = grayValues[idx - sampleW];
      const bottom = grayValues[idx + sampleW];
      const left = grayValues[idx - 1];
      const right = grayValues[idx + 1];

      const lap = Math.abs(4 * center - (top + bottom + left + right));
      laplacianSum += lap;
      laplacianSqSum += lap * lap;
      edgeSamples++;
    }
  }

  const meanLap = edgeSamples > 0 ? laplacianSum / edgeSamples : 0;
  const blurScore = edgeSamples > 0 ? (laplacianSqSum / edgeSamples) - (meanLap * meanLap) : 100;

  // Thresholds
  const isTooDark = meanLuminance < 32;
  const isOverexposed = meanLuminance > 228;
  const hasExcessiveGlare = glarePercentage > 30;
  const isBlurry = blurScore < 28 && pixelCount > 40000;
  const isTooSmall = width < 500 && height < 400;

  let warningMessage: string | null = null;
  if (isTooDark || isOverexposed || hasExcessiveGlare || isBlurry || isTooSmall) {
    warningMessage = 'Some player information may be difficult to read. Try taking the photo closer, reducing glare, or holding the camera directly in front of the screen.';
  }

  return {
    isAcceptable: !warningMessage,
    warningMessage,
    metrics: {
      width,
      height,
      meanLuminance,
      glarePercentage,
      blurScore,
      isTooDark,
      isOverexposed,
      hasExcessiveGlare,
      isBlurry,
      isTooSmall
    }
  };
}

/**
 * Preprocesses, normalizes EXIF orientation, resizes efficiently and creates high-res image data
 */
export async function preprocessImage(
  fileOrBlob: File | Blob,
  source: ImageSourceType,
  originalName?: string
): Promise<UploadedImageItem> {
  let workingBlob: Blob = fileOrBlob;
  const originalFileName = originalName || (fileOrBlob instanceof File ? fileOrBlob.name : 'camera_photo.jpg');

  // 1. Format validation & HEIC conversion if necessary
  if (fileOrBlob instanceof File) {
    const validation = await validateImageFile(fileOrBlob);
    if (!validation.isValid) {
      throw new Error(validation.errorMessage || 'Invalid image file.');
    }

    // Convert HEIC/HEIF
    if (validation.detectedFormat === 'heic' || validation.detectedFormat === 'heif') {
      workingBlob = await convertHeicToJpeg(fileOrBlob);
    }
  }

  // 2. Load into image element (browser natively respects EXIF orientation)
  const img = await loadImageElement(workingBlob);

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  if (origWidth < 200 || origHeight < 150) {
    throw new Error(`Image is too small (${origWidth} × ${origHeight} px). Please provide a clearer squad image.`);
  }

  // 3. Determine target dimensions - keep crisp resolution for player cards while staying well within serverless payload limits
  const MAX_DIMENSION = 1600;
  let targetWidth = origWidth;
  let targetHeight = origHeight;

  if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((origHeight * MAX_DIMENSION) / origWidth);
      targetWidth = MAX_DIMENSION;
    } else {
      targetWidth = Math.round((origWidth * MAX_DIMENSION) / origHeight);
      targetHeight = MAX_DIMENSION;
    }
  }

  // 4. Render to canvas with high-quality smoothing & mild contrast normalization
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable on this browser.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // 5. Quality check
  const quality = analyzeImageQuality(canvas, ctx, targetWidth, targetHeight);

  // 6. Export high-fidelity JPEG data with balanced compression (under 300KB per full screen)
  const base64Data = canvas.toDataURL('image/jpeg', 0.82);
  const previewUrl = URL.createObjectURL(workingBlob);

  return {
    id: Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
    file: fileOrBlob instanceof File ? fileOrBlob : undefined,
    previewUrl,
    base64Data,
    mimeType: 'image/jpeg',
    name: originalFileName,
    source,
    dimensions: {
      width: targetWidth,
      height: targetHeight
    },
    qualityWarning: quality.warningMessage,
    sizeBytes: Math.round((base64Data.length * 3) / 4)
  };
}
