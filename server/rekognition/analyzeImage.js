import {
  RekognitionClient,
  CreateCollectionCommand,
  DetectLabelsCommand,
  IndexFacesCommand,
} from '@aws-sdk/client-rekognition';

const DEFAULT_COLLECTION_ID = 'pixnxt-dev-test';

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

async function ensureCollection(client, collectionId) {
  try {
    await client.send(new CreateCollectionCommand({ CollectionId: collectionId }));
  } catch (err) {
    if (err?.name !== 'ResourceAlreadyExistsException') throw err;
  }
}

/**
 * Run Rekognition label + face indexing on raw image bytes.
 * @param {Uint8Array} imageBytes
 * @param {{ collectionId?: string, externalImageId?: string, indexFaces?: boolean }} options
 */
export async function analyzeImageBytes(imageBytes, options = {}) {
  const {
    collectionId = DEFAULT_COLLECTION_ID,
    externalImageId = `pixnxt-${Date.now()}`,
    indexFaces = true,
  } = options;

  if (!imageBytes?.length) {
    throw new Error('Image bytes are empty.');
  }

  if (imageBytes.length > 12 * 1024 * 1024) {
    throw new Error('Image must be 12 MB or smaller for indexing.');
  }

  const client = getClient();

  const labelsPromise = client.send(
    new DetectLabelsCommand({
      Image: { Bytes: imageBytes },
      MaxLabels: 25,
      MinConfidence: 70,
    })
  );

  let facesResult = null;
  if (indexFaces) {
    await ensureCollection(client, collectionId);
    facesResult = await client.send(
      new IndexFacesCommand({
        CollectionId: collectionId,
        Image: { Bytes: imageBytes },
        ExternalImageId: String(externalImageId).slice(0, 255),
        DetectionAttributes: ['DEFAULT'],
        MaxFaces: 20,
        QualityFilter: 'AUTO',
      })
    );
  }

  const labelsResult = await labelsPromise;

  return {
    collectionId: indexFaces ? collectionId : null,
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
    collectionId: body.collectionId || DEFAULT_COLLECTION_ID,
    externalImageId: body.externalImageId || `pixnxt-${Date.now()}`,
    indexFaces: body.indexFaces !== false,
  });
}
