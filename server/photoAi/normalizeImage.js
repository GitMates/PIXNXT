import sharp from 'sharp';

/** Rekognition SearchFacesByImage accepts JPEG/PNG only — normalize any input to JPEG. */
export async function normalizeImageToJpegBytes(inputBytes) {
  if (!inputBytes?.length) {
    throw new Error('Image is empty.');
  }
  try {
    const buffer = Buffer.from(inputBytes);
    return sharp(buffer, { failOn: 'none' })
      .rotate()
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    throw new Error('Could not process image. Use a clear JPEG or PNG selfie.');
  }
}
