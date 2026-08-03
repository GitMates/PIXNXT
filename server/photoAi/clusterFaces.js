import { RekognitionClient, SearchFacesCommand } from '@aws-sdk/client-rekognition';
import { rekognitionCollectionId } from './indexPhoto.js';

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

class UnionFind {
  constructor(ids) {
    this.parent = new Map(ids.map((id) => [id, id]));
  }

  find(id) {
    let root = id;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root);
    }
    let current = id;
    while (this.parent.get(current) !== root) {
      const next = this.parent.get(current);
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }

  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootB, rootA);
  }
}

/**
 * Group Rekognition face IDs into people clusters using SearchFaces.
 */
export async function clusterFacesForCollection(collectionId, faceEntries) {
  const uniqueIds = [...new Set(faceEntries.map((f) => f.faceId).filter(Boolean))];
  if (!uniqueIds.length) return [];

  const uf = new UnionFind(uniqueIds);
  const client = getClient();
  const rekCollectionId = rekognitionCollectionId(collectionId);

  for (const faceId of uniqueIds) {
    try {
      const result = await client.send(
        new SearchFacesCommand({
          CollectionId: rekCollectionId,
          FaceId: faceId,
          FaceMatchThreshold: 90,
          MaxFaces: 50,
        })
      );
      for (const match of result.FaceMatches || []) {
        const matchedId = match.Face?.FaceId;
        if (matchedId && matchedId !== faceId) {
          uf.union(faceId, matchedId);
        }
      }
    } catch (err) {
      console.warn('[clusterFaces] SearchFaces failed for', faceId, err?.message);
    }
  }

  const clusters = new Map();
  for (const entry of faceEntries) {
    if (!entry.faceId) continue;
    const root = uf.find(entry.faceId);
    if (!clusters.has(root)) {
      clusters.set(root, {
        id: root,
        faceIds: new Set(),
        photoIds: new Set(),
        avatarFace: null,
      });
    }
    const cluster = clusters.get(root);
    cluster.faceIds.add(entry.faceId);
    cluster.photoIds.add(entry.photoId);

    const area = (entry.boundingBox?.Width || 0) * (entry.boundingBox?.Height || 0);
    const avatarArea =
      (cluster.avatarFace?.boundingBox?.Width || 0) *
      (cluster.avatarFace?.boundingBox?.Height || 0);
    if (!cluster.avatarFace || area > avatarArea) {
      cluster.avatarFace = entry;
    }
  }

  return Array.from(clusters.values())
    .map((cluster, index) => ({
      id: cluster.id,
      faceIds: Array.from(cluster.faceIds),
      photoIds: Array.from(cluster.photoIds),
      label: 'Not named',
      count: cluster.photoIds.size,
      avatarFace: cluster.avatarFace,
    }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);
}
