import {
  RekognitionClient,
  CreateCollectionCommand,
  DeleteCollectionCommand,
} from '@aws-sdk/client-rekognition';
import { rekognitionCollectionId } from '../photoAi/indexPhoto.js';

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

export { rekognitionCollectionId };

/** Wipe and recreate the Rekognition collection for a guest delivery event. */
export async function resetGuestDeliveryCollection(eventId) {
  const client = getClient();
  const collectionId = rekognitionCollectionId(eventId);

  try {
    await client.send(new DeleteCollectionCommand({ CollectionId: collectionId }));
  } catch (err) {
    if (err?.name !== 'ResourceNotFoundException') throw err;
  }

  try {
    await client.send(new CreateCollectionCommand({ CollectionId: collectionId }));
  } catch (err) {
    if (err?.name !== 'ResourceAlreadyExistsException') throw err;
  }

  return collectionId;
}
