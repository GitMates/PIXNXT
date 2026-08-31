import {
  RekognitionClient,
  CreateCollectionCommand,
  DeleteCollectionCommand,
} from '@aws-sdk/client-rekognition';
import { rekognitionDeliveryId } from './faceUtils.js';

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

/** Wipe and recreate the Rekognition face group for a delivery (fixes stale face IDs on re-analyze). */
export async function resetDeliveryFaceGroup(deliveryId) {
  const deliveryFaceGroupId = rekognitionDeliveryId(deliveryId);
  const client = getClient();

  try {
    await client.send(new DeleteCollectionCommand({ CollectionId: deliveryFaceGroupId }));
  } catch (err) {
    if (err?.name !== 'ResourceNotFoundException') {
      console.warn('[rekognitionCollection] delete failed:', err?.message || err);
    }
  }

  await client.send(new CreateCollectionCommand({ CollectionId: deliveryFaceGroupId }));
  return deliveryFaceGroupId;
}
