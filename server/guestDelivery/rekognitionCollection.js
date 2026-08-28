import {
  RekognitionClient,
  CreateCollectionCommand,
  DeleteCollectionCommand,
} from '@aws-sdk/client-rekognition';
import { rekognitionDeliveryId } from '../photoAi/indexPhoto.js';

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

export { rekognitionDeliveryId, rekognitionDeliveryId as rekognitionCollectionId };

/** Wipe and recreate the Rekognition face group for a guest delivery event. */
export async function resetGuestDeliveryFaceGroup(eventId) {
  const client = getClient();
  const deliveryFaceGroupId = rekognitionDeliveryId(eventId);

  try {
    await client.send(new DeleteCollectionCommand({ CollectionId: deliveryFaceGroupId }));
  } catch (err) {
    if (err?.name !== 'ResourceNotFoundException') throw err;
  }

  try {
    await client.send(new CreateCollectionCommand({ CollectionId: deliveryFaceGroupId }));
  } catch (err) {
    if (err?.name !== 'ResourceAlreadyExistsException') throw err;
  }

  return deliveryFaceGroupId;
}

/** @deprecated Prefer resetGuestDeliveryFaceGroup */
export const resetGuestDeliveryCollection = resetGuestDeliveryFaceGroup;
