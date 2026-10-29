/** Keep gallery previews off the main uplink while originals are blasting. */
export const PREVIEW_PUT_PARALLEL = 2;

export function createPreviewGate(max = PREVIEW_PUT_PARALLEL) {
  let active = 0;
  const waiters = [];
  return {
    get active() {
      return active;
    },
    acquire(signal) {
      if (signal?.aborted) return Promise.reject(new Error('Upload cancelled.'));
      if (active < max) {
        active += 1;
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        const waiter = () => {
          signal?.removeEventListener('abort', onAbort);
          active += 1;
          resolve();
        };
        const onAbort = () => {
          const idx = waiters.indexOf(waiter);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(new Error('Upload cancelled.'));
        };
        waiters.push(waiter);
        signal?.addEventListener('abort', onAbort, { once: true });
      });
    },
    release() {
      active = Math.max(0, active - 1);
      const next = waiters.shift();
      if (next) next();
    },
  };
}

export const previewPutGate = createPreviewGate();
