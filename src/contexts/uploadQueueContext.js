import { createContext, useCallback, useContext } from 'react';
import {
  pendingTilesEqual,
  selectHasPendingUploads,
  selectPendingUploadTiles,
  useStoreSelector,
} from './uploadQueueStore';

/** Actions + rarely-changing fields (notice, destinationLabel…). Never changes on progress. */
export const UploadQueueContext = createContext(null);
/** The external store instance. Stable for the provider's lifetime. */
export const UploadQueueStoreContext = createContext(null);

export function useUploadQueueContext() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) {
    throw new Error('useUploadQueueContext must be used within UploadQueueProvider');
  }
  return ctx;
}

export function useUploadQueueStore() {
  const store = useContext(UploadQueueStoreContext);
  if (!store) {
    throw new Error('useUploadQueueStore must be used within UploadQueueProvider');
  }
  return store;
}

const identity = (s) => s;

/** Full widget state — only for the Uploads panel itself. Re-renders on every tick. */
export function useUploadQueueState() {
  return useStoreSelector(useUploadQueueStore(), identity);
}

export function useUploadQueueSelector(selector, isEqual) {
  return useStoreSelector(useUploadQueueStore(), selector, isEqual);
}

/** Pending files for a collection, without progress (or with quantized progress). */
export function usePendingUploads(collectionId, options) {
  const step = options?.progressStep;
  const selector = useCallback(
    (state) => selectPendingUploadTiles(state, collectionId, step ? { progressStep: step } : undefined),
    [collectionId, step]
  );
  return useStoreSelector(useUploadQueueStore(), selector, pendingTilesEqual);
}

/** True while any file is waiting/uploading/processing. */
export function useUploadQueueBusy() {
  return useStoreSelector(useUploadQueueStore(), selectHasPendingUploads);
}
