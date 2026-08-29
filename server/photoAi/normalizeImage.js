import sharp from 'sharp';

const REKOGNITION_MAX_BYTES = 12 * 1024 * 1024;
const REKOGNITION_MAX_EDGE = 2048;

/** Rekognition SearchFacesByImage accepts JPEG/PNG only — normalize any input to JPEG. */
export async function normalizeImageToJpegBytes(inputBytes) {
  if (!inputBytes?.length) {
    throw new Error('Image is empty.');
  }
  try {
    const buffer = Buffer.from(inputBytes);
    return sharp(buffer, { failOn: 'none', limitInputPixels: false })
      .rotate()
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    throw new Error('Could not process image. Use a clear JPEG or PNG selfie.');
  }
}

/**
 * Prepare delivery originals for Rekognition: auto-orient, cap long edge, JPEG encode.
 * Keeps more detail than /web/ while staying under AWS byte limits and downloading faster.
 */
export async function prepareImageBytesForRekognition(inputBytes) {
  if (!inputBytes?.length) {
    throw new Error('Image is empty.');
  }

  const buffer = Buffer.from(inputBytes);
  const sharpOpts = { failOn: 'none', limitInputPixels: false };

  let meta;
  try {
    meta = await sharp(buffer, sharpOpts).metadata();
  } catch {
    throw new Error('Could not read image for face indexing.');
  }

  const w = meta.width || 0;
  const h = meta.height || 0;
  const longest = Math.max(w, h);
  const isJpeg = meta.format === 'jpeg' || meta.format === 'jpg';

  // Fast path: web JPEGs are already oriented and sized for Rekognition.
  if (isJpeg && longest > 0 && longest <= REKOGNITION_MAX_EDGE && buffer.length <= REKOGNITION_MAX_BYTES) {
    const oriented = await sharp(buffer, sharpOpts).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    if (oriented.length <= REKOGNITION_MAX_BYTES) {
      return new Uint8Array(oriented);
    }
  }

  let resizeOpts = null;
  if (longest > REKOGNITION_MAX_EDGE) {
    resizeOpts =
      w >= h
        ? { width: REKOGNITION_MAX_EDGE, withoutEnlargement: true }
        : { height: REKOGNITION_MAX_EDGE, withoutEnlargement: true };
  }

  const buildPipeline = (edgeOverride = null) => {
    let pipeline = sharp(buffer, sharpOpts).rotate();
    const edge = edgeOverride ?? (resizeOpts ? REKOGNITION_MAX_EDGE : null);
    if (edge) {
      pipeline = pipeline.resize({
        width: w >= h ? edge : undefined,
        height: h > w ? edge : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    return pipeline;
  };

  for (const quality of [92, 88, 85, 80]) {
    const out = await buildPipeline().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (out.length <= REKOGNITION_MAX_BYTES) {
      return new Uint8Array(out);
    }
  }

  for (const edge of [2048, 1600, 1280]) {
    for (const quality of [85, 80, 75]) {
      const out = await buildPipeline(edge).jpeg({ quality, mozjpeg: true }).toBuffer();
      if (out.length <= REKOGNITION_MAX_BYTES) {
        return new Uint8Array(out);
      }
    }
  }

  throw new Error('Image is too large for AI indexing.');
}
