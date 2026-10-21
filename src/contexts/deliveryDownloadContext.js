import { createContext, useContext } from 'react';

export const DeliveryDownloadContext = createContext(null);

export function useDeliveryDownload() {
  const ctx = useContext(DeliveryDownloadContext);
  if (!ctx) {
    throw new Error('useDeliveryDownload must be used within DeliveryDownloadProvider');
  }
  return ctx;
}
