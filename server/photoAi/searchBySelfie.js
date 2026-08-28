import { RekognitionClient, SearchFacesByImageCommand } from '@aws-sdk/client-rekognition';
import { rekognitionDeliveryId } from './indexPhoto.js';
import { normalizeImageToJpegBytes } from './normalizeImage.js';

function getClient() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing AWS credentials.');
  }
  return new RekognitionClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function parseImageBase64(imageBase64) {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error('imageBase64 is required.');
  }
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const bytes = Uint8Array.from(Buffer.from(base64Data, 'base64'));
  if (!bytes.length) throw new Error('Image is empty.');
  if (bytes.length > 5 * 1024 * 1024) {
    throw new Error('Selfie must be 5 MB or smaller.');
  }
  return bytes;
}

/**
 * Search a delivery’s face group for faces matching a selfie image.
 * @param {string} deliveryId — PIXNXT delivery (or guest-delivery event) id
 */
export async function searchFacesBySelfie(deliveryId, imageBase64, threshold = 85) {
  const rawBytes = parseImageBase64(imageBase64);
  const imageBytes = new Uint8Array(await normalizeImageToJpegBytes(rawBytes));
  const client = getClient();
  const deliveryFaceGroupId = rekognitionDeliveryId(deliveryId);

  let result;
  try {
    result = await client.send(
      new SearchFacesByImageCommand({
        CollectionId: deliveryFaceGroupId,
        Image: { Bytes: imageBytes },
        FaceMatchThreshold: threshold,
        MaxFaces: 30,
      })
    );
  } catch (err) {
    if (err?.name === 'InvalidImageFormatException') {
      throw new Error('Invalid selfie format. Please upload a JPEG or PNG photo with a clear face.');
    }
    if (err?.name === 'InvalidParameterException') {
      throw new Error('No face detected in the selfie. Use a clear front-facing photo.');
    }
    throw err;
  }

  const matches = (result.FaceMatches || [])
    .map((match) => ({
      faceId: match.Face?.FaceId || null,
      photoId: match.Face?.ExternalImageId || null,
      similarity: Math.round(match.Similarity || 0),
    }))
    .filter((m) => m.faceId && m.photoId);

  const photoIds = [...new Set(matches.map((m) => m.photoId))];
  const faceIds = [...new Set(matches.map((m) => m.faceId))];

  return {
    matched: photoIds.length > 0,
    photoIds,
    faceIds,
    matches,
    searchedFaceConfidence: result.SearchedFaceConfidence
      ? Math.round(result.SearchedFaceConfidence)
      : null,
  };
}
