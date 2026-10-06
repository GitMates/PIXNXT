/**
 * Pool of encode workers. Original uploads stay on the main thread's network
 * stack while these produce web + thumb JPEGs.
 */
const POOL_SIZE = 6;

let workers = [];
let idle = [];
let seq = 0;
const waiters = [];
const pending = new Map();

function spawn() {
  const worker = new Worker(new URL('../workers/derivativeEncode.worker.js', import.meta.url), {
    type: 'module',
  });
  worker.onmessage = (event) => {
    const { id, ok, error } = event.data || {};
    const job = pending.get(id);
    pending.delete(id);
    idle.push(worker);
    const next = waiters.shift();
    if (next) next();
    if (!job) return;
    if (!ok) {
      job.reject(new Error(error || 'Derivative encode failed'));
      return;
    }
    const baseName = job.baseName;
    const lastModified = job.lastModified;
    const webFile = new File([event.data.web], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified,
    });
    const thumbFile = new File([event.data.thumb], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified,
    });
    job.resolve({
      webFile,
      thumbFile,
      width: event.data.width,
      height: event.data.height,
      webResized: event.data.webResized,
    });
  };
  worker.onerror = () => {
    const id = worker._jobId;
    worker._jobId = null;
    try { worker.terminate(); } catch { /* already dead */ }
    idle = idle.filter((w) => w !== worker);
    workers = workers.filter((w) => w !== worker);
    const job = id != null ? pending.get(id) : null;
    if (job) {
      pending.delete(id);
      job.reject(new Error('Derivative encode worker failed'));
    }
    if (waiters.length) {
      idle.push(spawn());
      const next = waiters.shift();
      next();
    }
  };
  workers.push(worker);
  return worker;
}

function acquire() {
  if (idle.length) return Promise.resolve(idle.pop());
  if (workers.length < POOL_SIZE) return Promise.resolve(spawn());
  return new Promise((resolve) => {
    waiters.push(() => resolve(idle.pop()));
  });
}

export function canEncodeOffThread() {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function';
}

/**
 * @param {File} file
 * @param {{ webMaxEdge?: number, thumbMaxEdge?: number, thumbQuality?: number, enhanceRaw?: boolean, sharpen?: string }} options
 */
export function encodeDerivativesOffThread(file, options = {}) {
  if (!canEncodeOffThread()) return Promise.reject(new Error('OffscreenCanvas unavailable'));
  const id = ++seq;
  const baseName = file.name.replace(/\.[^.]+$/i, '') || 'photo';
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, baseName, lastModified: file.lastModified });
    void acquire().then((worker) => {
      if (!pending.has(id)) {
        idle.push(worker);
        return;
      }
      worker._jobId = id;
      worker.postMessage({
        id,
        file,
        webMaxEdge: options.webMaxEdge ?? 2048,
        thumbMaxEdge: options.thumbMaxEdge ?? 400,
        thumbQuality: options.thumbQuality ?? 0.6,
        enhanceRaw: options.enhanceRaw === true,
        sharpen: options.sharpen || 'none',
      });
    });
  });
}
