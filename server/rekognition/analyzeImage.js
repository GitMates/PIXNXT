import {
  RekognitionClient,
  CreateCollectionCommand,
  DetectLabelsCommand,
  IndexFacesCommand,
} from '@aws-sdk/client-rekognition';

/** Dev fallback face-group id (AWS CollectionId). */
const DEFAULT_DELIVERY_FACE_GROUP_ID = 'pixnxt-dev-test';

function getClient() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY in environment.');
  }

  return new RekognitionClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/** Ensure the AWS face group exists for this delivery (CreateCollection in AWS terms). */
async function ensureDeliveryFaceGroup(client, deliveryFaceGroupId) {
  try {
    await client.send(new CreateCollectionCommand({ CollectionId: deliveryFaceGroupId }));
  } catch (err) {
    if (err?.name !== 'ResourceAlreadyExistsException') throw err;
  }
}

/**
 * Run Rekognition label + face indexing on raw image bytes.
 * @param {Uint8Array} imageBytes
 * @param {{ deliveryFaceGroupId?: string, collectionId?: string, externalImageId?: string, indexFaces?: boolean }} options
 *        `collectionId` is accepted as a legacy alias for `deliveryFaceGroupId` (AWS CollectionId).
 */
export async function analyzeImageBytes(imageBytes, options = {}) {
  const {
    externalImageId = `pixnxt-${Date.now()}`,
    indexFaces = true,
  } = options;
  const deliveryFaceGroupId =
    options.deliveryFaceGroupId || options.collectionId || DEFAULT_DELIVERY_FACE_GROUP_ID;

  if (!imageBytes?.length) {
    throw new Error('Image bytes are empty.');
  }

  if (imageBytes.length > 12 * 1024 * 1024) {
    throw new Error('Image must be 12 MB or smaller for indexing.');
  }

  const client = getClient();

  let labelsResult;
  let facesResult = null;

  if (indexFaces) {
    await ensureDeliveryFaceGroup(client, deliveryFaceGroupId);
    const [labelsRes, facesRes] = await Promise.allSettled([
      client.send(new DetectLabelsCommand({
        Image: { Bytes: imageBytes },
        MaxLabels: 25,
        MinConfidence: 70,
      })),
      client.send(new IndexFacesCommand({
        CollectionId: deliveryFaceGroupId,
        Image: { Bytes: imageBytes },
        ExternalImageId: String(externalImageId).slice(0, 255),
        DetectionAttributes: ['DEFAULT'],
        MaxFaces: 20,
        QualityFilter: 'AUTO',
      })),
    ]);
    if (facesRes.status === 'rejected') throw facesRes.reason;
    if (labelsRes.status === 'rejected') throw labelsRes.reason;
    labelsResult = labelsRes.value;
    facesResult = facesRes.value;
  } else {
    labelsResult = await client.send(new DetectLabelsCommand({
      Image: { Bytes: imageBytes },
      MaxLabels: 25,
      MinConfidence: 70,
    }));
  }

  return {
    deliveryFaceGroupId: indexFaces ? deliveryFaceGroupId : null,
    /** @deprecated Same as deliveryFaceGroupId (AWS CollectionId). */
    collectionId: indexFaces ? deliveryFaceGroupId : null,
    externalImageId: indexFaces ? externalImageId : null,
    labels: (labelsResult.Labels || []).map((label) => ({
      name: label.Name,
      confidence: Math.round(label.Confidence),
      categories: (label.Categories || []).map((c) => c.Name).filter(Boolean),
    })),
    faces: (facesResult?.FaceRecords || []).map((record) => ({
      faceId: record.Face?.FaceId,
      confidence: Math.round(record.Face?.Confidence ?? 0),
      boundingBox: record.Face?.BoundingBox,
    })),
    unindexedFaceCount: facesResult?.UnindexedFaces?.length ?? 0,
    region: process.env.AWS_REGION || 'us-east-1',
  };
}

export async function handleAnalyzeRequest(body) {
  const imageBase64 = body?.imageBase64;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error('Request body must include imageBase64 (data URL or raw base64).');
  }

  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const imageBytes = Uint8Array.from(Buffer.from(base64Data, 'base64'));

  return analyzeImageBytes(imageBytes, {
    deliveryFaceGroupId:
      body.deliveryFaceGroupId || body.collectionId || DEFAULT_DELIVERY_FACE_GROUP_ID,
    externalImageId: body.externalImageId || `pixnxt-${Date.now()}`,
    indexFaces: body.indexFaces !== false,
  });
}
