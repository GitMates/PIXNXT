import React from 'react';
import { useDeliveryDownload } from '@/contexts/deliveryDownloadContext';
import { DeliveryDownloadProgress } from './DeliveryDownloadProgress';

export function GlobalDeliveryDownloadShell() {
  const { progress, minimized, dismiss, minimize, expand } = useDeliveryDownload();
  return (
    <DeliveryDownloadProgress
      progress={progress}
      minimized={minimized}
      onClose={dismiss}
      onMinimize={minimize}
      onExpand={expand}
    />
  );
}
