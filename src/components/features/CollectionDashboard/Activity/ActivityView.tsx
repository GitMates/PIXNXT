import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { downloadPhotosToZip } from '../../../../lib/downloadPhoto';
import { DownloadActivityDetailModal } from './DownloadActivityDetailModal';
import { FavoriteActivityDetailModal } from './FavoriteActivityDetailModal';
import { ActivityFeed } from './ActivityFeed';
import type { ActivityViewProps } from './ActivityView.types';

export type { ActivityViewProps };

export const ActivityView: React.FC<ActivityViewProps> = ({
  activeActivitySubTab,
  collection,
  downloadActivity,
  favoriteActivity,
  favoriteActivitySortMenuOpen,
  favoriteDetailLoading,
  favoriteDetailPhotoMenuPhotoId,
  favoriteDetailSort,
  favoriteDetailToolbarMenuOpen,
  handleDeleteFavoriteActivity,
  handleDownloadAllFavoriteList,
  handleExportFavoriteList,
  handleFavoriteDetailRowDownload,
  handleLightroomCopyList,
  handleRemovePhotoFromFavoriteList,
  highlightsName,
  openEditFavoriteListModal,
  handleReopenFavoriteList,
  selectedDownloadId,
  selectedFavoriteListId,
  setActiveActivityMenu,
  setFavoriteActivitySortMenuOpen,
  setFavoriteDetailPhotoMenuPhotoId,
  setFavoriteDetailSort,
  setFavoriteDetailToolbarMenuOpen,
  setSelectedDownloadId,
  setShowCreateFavoriteListModal,
  sets,
  handleDeleteAllDownloadActivity,
  handleExportDownloadActivityExcel,
  handleExportDownloadActivityPdf,
  handleExportActivity,
  downloadDetailPhotos,
  loadingActivity,
  photos = [],
  favoriteActivitySortMenuRef,
  favoriteDetailToolbarMenuRef,
  favoriteDetailPhotoMenuRef,
  favoriteActivitySortMode,
  favoriteActivitySortTriggerLabel,
  favoriteDetailRows,
  setFavoriteActivitySortMode,
  setFavoriteDetailRows,
  setSelectedFavoriteListId,
  storeOrders = [],
  storeOrderItems = [],
  emailRegistrationActivity = [],
  galleryOpenActivity = [],
  guestDeliveryGuests = [],
}) => {


  const handleDownloadSameSet = useCallback(async () => {
    if (!downloadDetailPhotos?.length) {
      window.alert('No photos available for this download.');
      return;
    }
    try {
      const zip = new JSZip();
      const result = await downloadPhotosToZip(zip, downloadDetailPhotos, {});
      if (!result?.fileCount) {
        window.alert('No photos could be downloaded.');
        return;
      }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const base = String(collection?.name || 'delivery').replace(/[/\\:*?"<>|]/g, '_');
      saveAs(blob, `${base}.zip`);
    } catch {
      window.alert('Failed to download this set.');
    }
  }, [collection?.name, downloadDetailPhotos]);

  const handleSelectItem = (item: any) => {
    if (item.source?.kind === 'download') {
      setSelectedFavoriteListId(null);
      setFavoriteDetailRows([]);
      setSelectedDownloadId(item.source.row.id);
      return;
    }
    if (item.source?.kind === 'selection') {
      setSelectedDownloadId(null);
      setSelectedFavoriteListId(item.source.row.id);
      return;
    }
    if (item.source?.kind === 'order') {
      const order = item.source.row;
      const shortId = order.id ? `#${String(order.id).split('-')[0].toUpperCase()}` : 'Order';
      alert(
        `${shortId}\n${order.customer_name || order.customer_email || 'Customer'}\nStatus: ${order.status || '—'}\nTotal: ${order.total ?? order.total_amount ?? '—'}`
      );
    }
  };

  return (
    <>
      <ActivityFeed
        activeActivitySubTab={activeActivitySubTab}
        downloadActivity={downloadActivity}
        favoriteActivity={favoriteActivity}
        storeOrders={storeOrders}
        storeOrderItems={storeOrderItems}
        emailRegistrationActivity={emailRegistrationActivity}
        galleryOpenActivity={galleryOpenActivity}
        guestDeliveryGuests={guestDeliveryGuests}
        loadingActivity={loadingActivity}

        onSelectItem={handleSelectItem}
      />

      {selectedDownloadId
        ? createPortal(
            <DownloadActivityDetailModal
              selectedDownloadId={selectedDownloadId}
              downloadActivity={downloadActivity}
              downloadDetailPhotos={downloadDetailPhotos}
              sets={sets}
              highlightsName={highlightsName}
              onClose={() => setSelectedDownloadId(null)}
              onExportCsv={() => {
                const detail = (downloadActivity || []).find((a: any) => a.id === selectedDownloadId);
                if (detail && handleExportActivity) handleExportActivity([detail]);
              }}
              onDownloadSameSet={handleDownloadSameSet}
            />,
            document.body
          )
        : null}

      {selectedFavoriteListId
        ? createPortal(
            <FavoriteActivityDetailModal
              selectedFavoriteListId={selectedFavoriteListId}
              favoriteActivity={favoriteActivity}
              favoriteDetailRows={favoriteDetailRows}
              favoriteDetailSort={favoriteDetailSort}
              setFavoriteDetailSort={setFavoriteDetailSort}
              favoriteDetailLoading={favoriteDetailLoading}
              favoriteDetailToolbarMenuOpen={favoriteDetailToolbarMenuOpen}
              setFavoriteDetailToolbarMenuOpen={setFavoriteDetailToolbarMenuOpen}
              favoriteDetailPhotoMenuPhotoId={favoriteDetailPhotoMenuPhotoId}
              setFavoriteDetailPhotoMenuPhotoId={setFavoriteDetailPhotoMenuPhotoId}
              favoriteDetailToolbarMenuRef={favoriteDetailToolbarMenuRef}
              favoriteDetailPhotoMenuRef={favoriteDetailPhotoMenuRef}
              collectionSlug={collection?.slug}
              highlightsName={highlightsName}
              sets={sets}
              onClose={() => {
                setSelectedFavoriteListId(null);
                setFavoriteDetailRows([]);
                setFavoriteDetailToolbarMenuOpen(false);
                setFavoriteDetailPhotoMenuPhotoId(null);
              }}
              setActiveActivityMenu={setActiveActivityMenu}
              onEditList={openEditFavoriteListModal}
              onReopenList={handleReopenFavoriteList}
              handleDownloadAllFavoriteList={handleDownloadAllFavoriteList}
              handleExportFavoriteList={handleExportFavoriteList}
              handleLightroomCopyList={handleLightroomCopyList}
              handleFavoriteDetailRowDownload={handleFavoriteDetailRowDownload}
              handleRemovePhotoFromFavoriteList={handleRemovePhotoFromFavoriteList}
              handleDeleteFavoriteActivity={handleDeleteFavoriteActivity}
            />,
            document.body
          )
        : null}
    </>
  );
};
