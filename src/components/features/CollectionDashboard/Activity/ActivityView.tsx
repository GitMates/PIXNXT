import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Mail,
  Plus,
  Trash2,
} from 'lucide-react';
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
  downloadDetailPhotos,
  loadingActivity,
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
  const [downloadActivityMenuOpen, setDownloadActivityMenuOpen] = useState(false);
  const downloadActivityActionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!downloadActivityMenuOpen) return undefined;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        downloadActivityActionsRef.current
        && !downloadActivityActionsRef.current.contains(e.target as Node)
      ) {
        setDownloadActivityMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [downloadActivityMenuOpen]);

  const headerActions = (
    <div className="cd-activity-feed__actions">
      <div className="download-activity-header-actions" ref={downloadActivityActionsRef}>
        <button
          type="button"
          className={`download-activity-actions-trigger${downloadActivityMenuOpen ? ' download-activity-actions-trigger--open' : ''}`}
          aria-expanded={downloadActivityMenuOpen}
          aria-haspopup="menu"
          onClick={(e) => {
            e.stopPropagation();
            setActiveActivityMenu(null);
            setFavoriteActivitySortMenuOpen(false);
            setDownloadActivityMenuOpen((open) => !open);
          }}
        >
          <span>Actions</span>
          <ChevronDown size={16} strokeWidth={2.25} className="download-activity-actions-chevron" aria-hidden />
        </button>
        {downloadActivityMenuOpen ? (
          <div className="download-activity-actions-menu" role="menu" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              role="menuitem"
              className="download-activity-menu-item download-activity-menu-item--danger"
              onClick={(e) => {
                e.stopPropagation();
                setDownloadActivityMenuOpen(false);
                handleDeleteAllDownloadActivity();
              }}
            >
              <span className="download-activity-menu-icon" aria-hidden>
                <Trash2 size={16} strokeWidth={2} />
              </span>
              <span>Delete all downloads</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="download-activity-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                setDownloadActivityMenuOpen(false);
                handleExportDownloadActivityExcel();
              }}
            >
              <span className="download-activity-menu-icon" aria-hidden>
                <FileSpreadsheet size={16} strokeWidth={2} />
              </span>
              <span>Export downloads Excel</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="download-activity-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                setDownloadActivityMenuOpen(false);
                handleExportDownloadActivityPdf();
              }}
            >
              <span className="download-activity-menu-icon" aria-hidden>
                <FileText size={16} strokeWidth={2} />
              </span>
              <span>Export downloads PDF</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="download-activity-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                setDownloadActivityMenuOpen(false);
                setShowCreateFavoriteListModal(true);
              }}
            >
              <span className="download-activity-menu-icon" aria-hidden>
                <Plus size={16} strokeWidth={2} />
              </span>
              <span>Create favorite list</span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="favorite-activity-sort-wrap" ref={favoriteActivitySortMenuRef}>
        <button
          type="button"
          className="favorite-activity-header-link favorite-activity-header-link--muted"
          aria-expanded={favoriteActivitySortMenuOpen}
          aria-haspopup="menu"
          onClick={(e) => {
            e.stopPropagation();
            setActiveActivityMenu(null);
            setDownloadActivityMenuOpen(false);
            setFavoriteActivitySortMenuOpen((open: boolean) => !open);
          }}
        >
          {favoriteActivitySortTriggerLabel}
          <ChevronDown size={14} strokeWidth={2} aria-hidden />
        </button>
        {favoriteActivitySortMenuOpen ? (
          <div className="favorite-activity-sort-menu" role="menu" onClick={(e) => e.stopPropagation()}>
            {(['email', 'created', 'updated'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="menuitem"
                className={`favorite-activity-sort-option${favoriteActivitySortMode === mode ? ' favorite-activity-sort-option--selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setFavoriteActivitySortMode(mode);
                  setFavoriteActivitySortMenuOpen(false);
                }}
              >
                <span className="favorite-activity-sort-option-icon" aria-hidden>
                  {mode === 'email' ? <Mail size={16} strokeWidth={2} /> : null}
                </span>
                <span className="favorite-activity-sort-option-label">
                  {mode === 'email' ? 'Sort by email' : mode === 'created' ? 'Sort by created' : 'Sort by updated'}
                </span>
                {favoriteActivitySortMode === mode ? (
                  <Check size={16} strokeWidth={2.5} className="favorite-activity-sort-option-check" aria-hidden />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

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
        headerActions={headerActions}
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
              onExport={() => {
                const detail = (downloadActivity || []).find((a: any) => a.id === selectedDownloadId);
                if (detail) handleExportDownloadActivityExcel([detail]);
              }}
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
