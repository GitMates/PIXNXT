import { RekognitionClient, SearchFacesCommand } from '@aws-sdk/client-rekognition';
import { rekognitionDeliveryId } from './faceUtils.js';
import { mapWithConcurrency } from './mapWithConcurrency.js';
import { pickBestAvatarFace } from './faceUtils.js';

/** Initial face-to-face linking — balance recall vs false merges. */
const CLUSTER_MATCH_THRESHOLD = 87;
/** Second pass merges clusters that share the same person across angles/lighting. */
const MERGE_PASS_THRESHOLD = 83;

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

function buildClustersFromUnion(faceEntries, uf) {
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
    cluster.avatarFace = pickBestAvatarFace(cluster.avatarFace, entry);
  }

  return Array.from(clusters.values()).map((cluster) => ({
    id: cluster.id,
    faceIds: Array.from(cluster.faceIds),
    photoIds: Array.from(cluster.photoIds),
    label: 'Not named',
    count: cluster.photoIds.size,
    avatarFace: cluster.avatarFace,
  }));
}

async function mergeSimilarClusters(deliveryFaceGroupId, client, clusters) {
  if (clusters.length < 2) return clusters;

  const uf = new UnionFind(clusters.map((c) => c.id));
  const faceToClusterId = new Map();
  for (const cluster of clusters) {
    for (const faceId of cluster.faceIds) {
      faceToClusterId.set(faceId, cluster.id);
    }
  }

  const repFaceIds = [
    ...new Set(clusters.map((c) => c.avatarFace?.faceId).filter(Boolean)),
  ];

  const pairs = [];
  await mapWithConcurrency(repFaceIds, 8, async (faceId) => {
    try {
      const result = await client.send(
        new SearchFacesCommand({
          CollectionId: deliveryFaceGroupId,
          FaceId: faceId,
          FaceMatchThreshold: MERGE_PASS_THRESHOLD,
          MaxFaces: 100,
        })
      );
      const sourceClusterId = faceToClusterId.get(faceId);
      for (const match of result.FaceMatches || []) {
        const otherFaceId = match.Face?.FaceId;
        const targetClusterId = faceToClusterId.get(otherFaceId);
        if (
          sourceClusterId &&
          targetClusterId &&
          sourceClusterId !== targetClusterId &&
          (match.Similarity || 0) >= MERGE_PASS_THRESHOLD
        ) {
          pairs.push([sourceClusterId, targetClusterId]);
        }
      }
    } catch (err) {
      console.warn('[clusterFaces] merge pass failed for', faceId, err?.message);
    }
  });

  for (const [a, b] of pairs) {
    uf.union(a, b);
  }

  const merged = new Map();
  for (const cluster of clusters) {
    const root = uf.find(cluster.id);
    if (!merged.has(root)) {
      merged.set(root, {
        id: root,
        faceIds: new Set(),
        photoIds: new Set(),
        avatarFace: null,
        label: 'Not named',
      });
    }
    const group = merged.get(root);
    for (const fid of cluster.faceIds) group.faceIds.add(fid);
    for (const pid of cluster.photoIds) group.photoIds.add(pid);
    group.avatarFace = pickBestAvatarFace(group.avatarFace, cluster.avatarFace);
  }

  return Array.from(merged.values()).map((cluster) => ({
    id: cluster.id,
    faceIds: Array.from(cluster.faceIds),
    photoIds: Array.from(cluster.photoIds),
    label: cluster.label,
    count: cluster.photoIds.size,
    avatarFace: cluster.avatarFace,
  }));
}

/**
 * Group Rekognition face IDs into people clusters using SearchFaces.
 * @param {string} deliveryId — PIXNXT delivery (or guest-delivery event) id
 */
export async function clusterFacesForCollection(deliveryId, faceEntries) {
  const uniqueIds = [...new Set(faceEntries.map((f) => f.faceId).filter(Boolean))];
  if (!uniqueIds.length) return [];

  const uf = new UnionFind(uniqueIds);
  const client = getClient();
  const deliveryFaceGroupId = rekognitionDeliveryId(deliveryId);
  const matchPairs = [];

  await mapWithConcurrency(uniqueIds, 8, async (faceId) => {
    try {
      const result = await client.send(
        new SearchFacesCommand({
          CollectionId: deliveryFaceGroupId,
          FaceId: faceId,
          FaceMatchThreshold: CLUSTER_MATCH_THRESHOLD,
          MaxFaces: 50,
        })
      );
      for (const match of result.FaceMatches || []) {
        const matchedId = match.Face?.FaceId;
        if (matchedId && matchedId !== faceId) {
          matchPairs.push([faceId, matchedId]);
        }
      }
    } catch (err) {
      console.warn('[clusterFaces] SearchFaces failed for', faceId, err?.message);
    }
  });

  for (const [a, b] of matchPairs) {
    uf.union(a, b);
  }

  let clusters = buildClustersFromUnion(faceEntries, uf);
  clusters = await mergeSimilarClusters(deliveryFaceGroupId, client, clusters);

  return clusters.filter((p) => p.count > 0).sort((a, b) => b.count - a.count);
}
