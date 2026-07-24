import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Mail,
  Play,
  Trash2,
} from 'lucide-react';
import {
  formatDownloadDestination,
  countPhotosForDownloadActivity,
  pickDownloadActivityThumbPhoto,
} from '@/lib/downloadActivityResolve';
import { openSpaPath } from '../../../../lib/spaNavigation';
import { DownloadActivityDetailModal } from './DownloadActivityDetailModal';
import { FavoriteActivityDetailModal } from './FavoriteActivityDetailModal';

export interface ActivityViewProps {
  activeActivityMenu: any;
  activeActivitySubTab: any;
  activeDownloadActivityTab: any;
  collection: any;
  downloadActivity: any;
  favoriteActivity: any;
  favoriteActivitySortMenuOpen: any;
  favoriteDetailLoading: any;
  favoriteDetailPhotoMenuPhotoId: any;
  favoriteDetailSort: any;
  favoriteDetailToolbarMenuOpen: any;
  handleDeleteFavoriteActivity: any;
  handleDownloadAllFavoriteList: any;
  handleExportFavoriteList: any;
  handleFavoriteDetailRowDownload: any;
  handleLightroomCopyList: any;
  handleRemovePhotoFromFavoriteList: any;
  highlightsName: any;
  openEditFavoriteListModal: any;
  selectedDownloadId: any;
  selectedFavoriteListId: any;
  setActiveActivityMenu: any;
  setActiveDownloadActivityTab: any;
  setFavoriteActivitySortMenuOpen: any;
  setFavoriteDetailPhotoMenuPhotoId: any;
  setFavoriteDetailSort: any;
  setFavoriteDetailToolbarMenuOpen: any;
  setSelectedDownloadId: any;
  setShowCreateFavoriteListModal: any;
  sets: any;
  activeSidebarTab: any;
  setActiveSidebarTab: any;
  photos: any;
  setDownloadDetailToolbarMenuOpen: any;
  handleExportActivity: any;
  filteredDownloadActivityForTab: any;
  handleDeleteAllDownloadActivity: () => void;
  handleExportDownloadActivityExcel: (explicitItems?: any[]) => void;
  handleExportDownloadActivityPdf: (explicitItems?: any[]) => void;
  downloadDetailPhotos: any;
  loadingActivity: any;
  favoriteActivitySortMenuRef: any;
  favoriteActivityMenuRef: any;
  favoriteDetailToolbarMenuRef: any;
  favoriteDetailPhotoMenuRef: any;
  favoriteActivitySortMode: any;
  favoriteActivitySortTriggerLabel: any;
  favoriteDetailRows: any;
  handleDeleteActivity: any;
  setEditingFavoriteList: any;
  setFavoriteActivitySortMode: any;
  setFavoriteDetailRows: any;
  setFavoriteListDesc: any;
  setFavoriteListEmail: any;
  setFavoriteListMax: any;
  setFavoriteListName: any;
  setSelectedFavoriteListId: any;
  sortedFavoriteActivity: any;
  storeOrders?: any[];
  storeOrderItems?: any[];
  storeOrdersLoading?: boolean;
  emailRegistrationActivity?: any[];
}

const getNumericPrice = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const safeFormatPrice = (val: any): string => {
  if (val === null || val === undefined) return '0.00';
  if (typeof val === 'number') return isNaN(val) ? '0.00' : val.toFixed(2);
  const str = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

export const ActivityView: React.FC<ActivityViewProps> = ({
  activeActivityMenu,
  activeActivitySubTab,
  activeDownloadActivityTab,
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
  setActiveDownloadActivityTab,
  setFavoriteActivitySortMenuOpen,
  setFavoriteDetailPhotoMenuPhotoId,
  setFavoriteDetailSort,
  setFavoriteDetailToolbarMenuOpen,
  setSelectedDownloadId,
  setShowCreateFavoriteListModal,
  sets,
  activeSidebarTab,
  setActiveSidebarTab,
  photos,
  setDownloadDetailToolbarMenuOpen,
  handleExportActivity,
  filteredDownloadActivityForTab,
  handleDeleteAllDownloadActivity,
  handleExportDownloadActivityExcel,
  handleExportDownloadActivityPdf,
  downloadDetailPhotos,
  loadingActivity,
  favoriteActivitySortMenuRef,
  favoriteActivityMenuRef,
  favoriteDetailToolbarMenuRef,
  favoriteDetailPhotoMenuRef,
  favoriteActivitySortMode,
  favoriteActivitySortTriggerLabel,
  favoriteDetailRows,
  handleDeleteActivity,
  setEditingFavoriteList,
  setFavoriteActivitySortMode,
  setFavoriteDetailRows,
  setFavoriteListDesc,
  setFavoriteListEmail,
  setFavoriteListMax,
  setFavoriteListName,
  setSelectedFavoriteListId,
  sortedFavoriteActivity,
  storeOrders = [],
  storeOrderItems = [],
  storeOrdersLoading = false,
  emailRegistrationActivity = [],
}) => {
  const [downloadActivityMenuOpen, setDownloadActivityMenuOpen] = useState(false);
  const [expandedStoreOrderId, setExpandedStoreOrderId] = useState<string | null>(null);
  const [storeGlobalSearch, setStoreGlobalSearch] = useState<string>('');
  const [emailRegSearch, setEmailRegSearch] = useState<string>('');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const downloadActivityActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!downloadActivityMenuOpen) return;
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

  return (
    <>
                            <div className={`cd-general-settings-view${activeActivitySubTab === 'favorite' && favoriteActivity.length > 0 ? ' cd-favorite-activity-wide' : ''}`}>
                                <div className="cd-settings-content-header split">
                                    <h2 className="cd-settings-main-title">
                                        {activeActivitySubTab === 'download' && 'Download Activity'}
                                        {activeActivitySubTab === 'favorite' && 'Favorite Activity'}

                                        {activeActivitySubTab === 'store' && 'Store Orders'}
                                        {activeActivitySubTab === 'email' && 'Email Registration'}
                                    </h2>
                                    {activeActivitySubTab === 'download' && (
                                        <div
                                            className="download-activity-header-actions"
                                            ref={downloadActivityActionsRef}
                                        >
                                            <button
                                                type="button"
                                                className={`download-activity-actions-trigger${downloadActivityMenuOpen ? ' download-activity-actions-trigger--open' : ''}`}
                                                aria-expanded={downloadActivityMenuOpen}
                                                aria-haspopup="menu"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveActivityMenu(null);
                                                    setFavoriteActivitySortMenuOpen(false);
                                                    setDownloadActivityMenuOpen((o) => !o);
                                                }}
                                            >
                                                <span>Actions</span>
                                                <ChevronDown
                                                    size={16}
                                                    strokeWidth={2.25}
                                                    className="download-activity-actions-chevron"
                                                    aria-hidden
                                                />
                                            </button>
                                            {downloadActivityMenuOpen ? (
                                                <div
                                                    className="download-activity-actions-menu"
                                                    role="menu"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
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
                                                        <span>Delete all</span>
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
                                                        <span>Export in Excel</span>
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
                                                        <span>Export in PDF</span>
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                    {activeActivitySubTab === 'favorite' && (
                                        <div className="favorite-activity-actions">
                                            <div className="favorite-activity-sort-wrap" ref={favoriteActivitySortMenuRef}>
                                                <button
                                                    type="button"
                                                    className="favorite-activity-header-link favorite-activity-header-link--muted"
                                                    aria-expanded={favoriteActivitySortMenuOpen}
                                                    aria-haspopup="menu"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveActivityMenu(null);
                                                        setFavoriteDetailToolbarMenuOpen(false);
                                                        setFavoriteDetailPhotoMenuPhotoId(null);
                                                        setDownloadActivityMenuOpen(false);
                                                        setFavoriteActivitySortMenuOpen((o) => !o);
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="13" y1="14" x2="3" y2="14" /><line x1="9" y1="18" x2="3" y2="18" /></svg>
                                                    {favoriteActivitySortTriggerLabel}
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`favorite-activity-header-chevron${favoriteActivitySortMenuOpen ? ' favorite-activity-header-chevron--open' : ''}`} aria-hidden><polyline points="6 9 12 15 18 9" /></svg>
                                                </button>
                                                {favoriteActivitySortMenuOpen && (
                                                    <div
                                                        className="favorite-activity-sort-menu"
                                                        role="menu"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            className={`favorite-activity-sort-option${favoriteActivitySortMode === 'email' ? ' favorite-activity-sort-option--selected' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFavoriteActivitySortMode('email');
                                                                setFavoriteActivitySortMenuOpen(false);
                                                            }}
                                                        >
                                                            <span className="favorite-activity-sort-option-icon" aria-hidden>
                                                                <Mail size={16} strokeWidth={2} />
                                                            </span>
                                                            <span className="favorite-activity-sort-option-label">Sort by email</span>
                                                            {favoriteActivitySortMode === 'email' ? (
                                                                <Check size={16} strokeWidth={2.5} className="favorite-activity-sort-option-check" aria-hidden />
                                                            ) : null}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            className={`favorite-activity-sort-option${favoriteActivitySortMode === 'created' ? ' favorite-activity-sort-option--selected' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFavoriteActivitySortMode('created');
                                                                setFavoriteActivitySortMenuOpen(false);
                                                            }}
                                                        >
                                                            <span className="favorite-activity-sort-option-icon" aria-hidden>
                                                                <Calendar size={16} strokeWidth={2} />
                                                            </span>
                                                            <span className="favorite-activity-sort-option-label">Sort by created date</span>
                                                            {favoriteActivitySortMode === 'created' ? (
                                                                <Check size={16} strokeWidth={2.5} className="favorite-activity-sort-option-check" aria-hidden />
                                                            ) : null}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            className={`favorite-activity-sort-option${favoriteActivitySortMode === 'updated' ? ' favorite-activity-sort-option--selected' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFavoriteActivitySortMode('updated');
                                                                setFavoriteActivitySortMenuOpen(false);
                                                            }}
                                                        >
                                                            <span className="favorite-activity-sort-option-icon" aria-hidden>
                                                                <CalendarClock size={16} strokeWidth={2} />
                                                            </span>
                                                            <span className="favorite-activity-sort-option-label">Sort by updated date</span>
                                                            {favoriteActivitySortMode === 'updated' ? (
                                                                <Check size={16} strokeWidth={2.5} className="favorite-activity-sort-option-check" aria-hidden />
                                                            ) : null}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <button type="button" className="favorite-activity-header-link favorite-activity-header-link--teal" onClick={() => {
                                                setEditingFavoriteList(null);
                                                setFavoriteListEmail('');
                                                setFavoriteListName('');
                                                setFavoriteListMax('');
                                                setFavoriteListDesc('');
                                                setSelectedFavoriteListId(null);
                                                setFavoriteDetailRows([]);
                                                setFavoriteDetailToolbarMenuOpen(false);
                                                setFavoriteActivitySortMenuOpen(false);
                                                setShowCreateFavoriteListModal(true);
                                            }}>
                                                + New Favorite List
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {activeActivitySubTab === 'download' && (
                                    <div className="settings-tab-nav">
                                        <span className={`settings-tab-item ${activeDownloadActivityTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveDownloadActivityTab('gallery')}>Gallery</span>
                                        <span className={`settings-tab-item ${activeDownloadActivityTab === 'photo' ? 'active' : ''}`} onClick={() => setActiveDownloadActivityTab('photo')}>Single Photo</span>
                                        <span className={`settings-tab-item ${activeDownloadActivityTab === 'video' ? 'active' : ''}`} onClick={() => setActiveDownloadActivityTab('video')}>Single Video</span>
                                    </div>
                                )}

                                <div className="cd-empty-state-section">
                                    {activeActivitySubTab === 'favorite' && favoriteActivity.length > 0 ? (
                                        <div className="favorite-activity-layout">
                                            <div className="activity-list-container favorite-activity-table-wrap">
                                                <div className="activity-table-header favorite">
                                                    <div className="activity-col-email">Email</div>
                                                    <div className="activity-col-list">Favorite List</div>
                                                    <div className="activity-col-photos">Photos</div>
                                                    <div className="activity-col-created">Date Created</div>
                                                    <div className="activity-col-updated">Date Updated</div>
                                                    <div className="activity-col-actions"></div>
                                                </div>
                                                <div className="activity-table-body">
                                                    {sortedFavoriteActivity.map((item, index, array) => (
                                                        <div
                                                            key={item.id}
                                                            role="button"
                                                            tabIndex={0}
                                                            className={`activity-row favorite${selectedFavoriteListId === item.id ? ' favorite-row-selected' : ''}`}
                                                            onClick={() => {
                                                                setSelectedFavoriteListId(item.id);
                                                                setActiveActivityMenu(null);
                                                                setFavoriteDetailToolbarMenuOpen(false);
                                                                setFavoriteDetailPhotoMenuPhotoId(null);
                                                                setFavoriteActivitySortMenuOpen(false);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    setSelectedFavoriteListId(item.id);
                                                                    setActiveActivityMenu(null);
                                                                    setFavoriteDetailToolbarMenuOpen(false);
                                                                    setFavoriteDetailPhotoMenuPhotoId(null);
                                                                    setFavoriteActivitySortMenuOpen(false);
                                                                }
                                                            }}
                                                        >
                                                            <div className="activity-col-email">
                                                                <span>{item.email}</span>
                                                            </div>
                                                            <div className="activity-col-list">
                                                                <div className="list-thumb">
                                                                    {item.thumbnail ? (
                                                                        <img src={item.thumbnail} alt="" />
                                                                    ) : (
                                                                        <div className="thumb-placeholder thumb-placeholder--favorite">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className="list-name-link">{item.name}</span>
                                                            </div>
                                                            <div className="activity-col-photos">
                                                                {item.max_selection != null && Number(item.max_selection) > 0
                                                                    ? `${item.photoCount} of ${item.max_selection}`
                                                                    : item.photoCount}
                                                            </div>
                                                            <div className="activity-col-created">
                                                                {new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' -')}
                                                            </div>
                                                            <div className="activity-col-updated">
                                                                {new Date(item.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' -')}
                                                            </div>
                                                            <div className="activity-col-actions">
                                                                <button
                                                                    type="button"
                                                                    className="row-action-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setFavoriteDetailToolbarMenuOpen(false);
                                                                        setFavoriteDetailPhotoMenuPhotoId(null);
                                                                        setFavoriteActivitySortMenuOpen(false);
                                                                        setActiveActivityMenu(activeActivityMenu === item.id ? null : item.id);
                                                                    }}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                                                </button>

                                                                {activeActivityMenu === item.id && (
                                                                    <div 
                                                                        ref={favoriteActivityMenuRef}
                                                                        className={`activity-row-menu favorite-menu ${index > 0 && index >= array.length - 3 ? 'up' : ''}`}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                    >
                                                                        <button type="button" className="activity-menu-item" onClick={(e) => { e.stopPropagation(); handleExportFavoriteList(item.id, item.name); setActiveActivityMenu(null); }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                            Export
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" onClick={(e) => { e.stopPropagation(); handleLightroomCopyList(item.id); setActiveActivityMenu(null); }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
                                                                            Lightroom Copy List
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openEditFavoriteListModal(item);
                                                                            setActiveActivityMenu(null);
                                                                        }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                                            Edit List
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" onClick={(e) => { e.stopPropagation(); openSpaPath(`/gallery/${collection?.slug}?list=${item.id}`); setActiveActivityMenu(null); }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                                            View in Gallery
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" onClick={(e) => { e.stopPropagation(); handleDownloadAllFavoriteList(item.id); setActiveActivityMenu(null); }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                            Download all
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                                                            Send as download
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                                                            Copy to new set
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                                                                            Copy to new collection
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                                                                            Create mobile app
                                                                        </button>
                                                                        <div style={{ height: '1px', background: '#f5f5f5', margin: '4px 0' }} />
                                                                        <button
                                                                            type="button"
                                                                            className="activity-menu-item delete"
                                                                            onMouseDown={(e) => e.stopPropagation()}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveActivityMenu(null);
                                                                                handleDeleteFavoriteActivity(item.id);
                                                                            }}
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                            Delete info
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
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
                                        </div>
                                     ) : activeActivitySubTab === 'store' ? (
                                        (storeOrders || []).length === 0 ? (
                                            <div className="cd-empty-state-content">
                                                <div className="cd-empty-state-illustration">
                                                    <svg width="200" height="140" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                        <rect x="40" y="40" width="120" height="80" rx="6" fill="#F8FAFB" stroke="#ddd" strokeWidth="1.5" />
                                                        <circle cx="100" cy="75" r="18" fill="#fff" stroke="#111" strokeWidth="1.5" />
                                                        <path d="M92 75h16M100 67v16" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                                                    </svg>
                                                </div>
                                                <h3 className="cd-empty-state-title">No store orders yet</h3>
                                                <p className="cd-empty-state-text">When clients place orders from your store, they will appear here.</p>
                                            </div>
                                        ) : (
                                            <div className="store-orders-activity-layout">
                                                <div className="store-orders-search">
                                                    <div className="store-orders-search-field">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                                        <input
                                                            type="search"
                                                            value={storeGlobalSearch}
                                                            onChange={(e) => setStoreGlobalSearch(e.target.value)}
                                                            placeholder="Search for name, order id, time and etc.."
                                                        />
                                                    </div>
                                                </div>

                                                {(() => {
                                                    const filtered = (storeOrders || []).filter((order: any) => {
                                                        if (!storeGlobalSearch.trim()) return true;
                                                        const q = storeGlobalSearch.toLowerCase();
                                                        const shortId = order.id ? `#${order.id.split('-')[0].toUpperCase()}` : '';
                                                        const fullId = order.id ? order.id.toLowerCase() : '';
                                                        const name = order.customer_name ? order.customer_name.toLowerCase() : '';
                                                        const email = order.customer_email ? order.customer_email.toLowerCase() : '';
                                                        const phone = order.customer_phone ? order.customer_phone.toLowerCase() : '';
                                                        return (
                                                            shortId.toLowerCase().includes(q) ||
                                                            fullId.includes(q) ||
                                                            name.includes(q) ||
                                                            email.includes(q) ||
                                                            phone.includes(q)
                                                        );
                                                    });

                                                    if (filtered.length === 0) {
                                                        return (
                                                            <div className="store-orders-empty-search">
                                                                No orders found matching search criteria.
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="store-orders-table-scroll">
                                                        <div className="activity-list-container store-orders-table-wrap">
                                                            <div className="activity-table-header store">
                                                                <div className="activity-col-order-id">Order ID</div>
                                                                <div className="activity-col-status">Status</div>
                                                                <div className="activity-col-customer">Customer</div>
                                                                <div className="activity-col-contact">Contact</div>
                                                                <div className="activity-col-date">Date</div>
                                                                <div className="activity-col-time">Time</div>
                                                                <div className="activity-col-items">Items</div>
                                                                <div className="activity-col-amount">Amount</div>
                                                                <div className="activity-col-actions">Action</div>
                                                            </div>
                                                            <div className="activity-table-body">
                                                                {filtered.map((order: any) => {
                                                                    const isExpanded = expandedStoreOrderId === order.id;
                                                                    const shortId = order.id ? `#${order.id.split('-')[0].toUpperCase()}` : '';
                                                                    const items = (storeOrderItems || []).filter((item: any) => item.order_id === order.id);
                                                                    const itemCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
                                                                    const statusClass = `status-${String(order.status || 'pending').toLowerCase()}`;

                                                                    return (
                                                                        <React.Fragment key={order.id}>
                                                                            <div
                                                                                className={`activity-row store${isExpanded ? ' store-row-selected' : ''}`}
                                                                                onClick={(e) => {
                                                                                    const next = isExpanded ? null : order.id;
                                                                                    setExpandedStoreOrderId(next);
                                                                                    if (next) {
                                                                                        const scroller = (e.currentTarget as HTMLElement).closest('.store-orders-table-scroll') as HTMLElement | null;
                                                                                        if (scroller) scroller.scrollLeft = 0;
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <div className="activity-col-order-id">{shortId}</div>
                                                                                <div className="activity-col-status">
                                                                                    <span className={`store-order-status-badge ${statusClass}`}>
                                                                                        {String(order.status || 'pending').replace(/_/g, ' ')}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="activity-col-customer">{order.customer_name || '—'}</div>
                                                                                <div className="activity-col-contact">{order.customer_email || '—'}</div>
                                                                                <div className="activity-col-date">{formatDate(order.created_at)}</div>
                                                                                <div className="activity-col-time">{formatTime(order.created_at)}</div>
                                                                                <div className="activity-col-items">{itemCount}</div>
                                                                                <div className="activity-col-amount">₹{safeFormatPrice(order.total)}</div>
                                                                                <div className="activity-col-actions">
                                                                                    <button
                                                                                        type="button"
                                                                                        className="store-order-view-btn"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            const next = isExpanded ? null : order.id;
                                                                                            setExpandedStoreOrderId(next);
                                                                                            if (next) {
                                                                                                const scroller = (e.currentTarget as HTMLElement).closest('.store-orders-table-scroll') as HTMLElement | null;
                                                                                                if (scroller) scroller.scrollLeft = 0;
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        {isExpanded ? 'Hide' : 'View'}
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            {isExpanded && (
                                                                                <div
                                                                                    className="store-order-detail"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <div className="store-order-detail-inner">
                                                                                    <div className="store-order-detail-card">
                                                                                        <h4 className="store-order-detail-title">Shipping Details</h4>
                                                                                        <div className="store-order-detail-grid">
                                                                                            <div className="store-order-detail-field">
                                                                                                <span className="store-order-detail-label">Shipping Method</span>
                                                                                                <span className="store-order-detail-value">{order.shipping_method || 'India Ground Shipping'}</span>
                                                                                            </div>
                                                                                            <div className="store-order-detail-field">
                                                                                                <span className="store-order-detail-label">Tracking Info</span>
                                                                                                <span className="store-order-detail-value store-order-detail-value--mono">
                                                                                                    {order.payment_intent_id || '—'}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="store-order-detail-field">
                                                                                                <span className="store-order-detail-label">Delivery Address</span>
                                                                                                <span className="store-order-detail-value">
                                                                                                    {order.customer_name || '—'}
                                                                                                    <br />
                                                                                                    {order.shipping_address?.address || '—'}
                                                                                                    {order.shipping_address?.city ? `, ${order.shipping_address.city}` : ''}
                                                                                                    <br />
                                                                                                    {[order.shipping_address?.zip, order.shipping_address?.country || 'India'].filter(Boolean).join(', ')}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="store-order-detail-card store-order-detail-card--items">
                                                                                        <div className="store-order-items-header">
                                                                                            <div className="store-order-items-col store-order-items-col--thumb">Item</div>
                                                                                            <div className="store-order-items-col store-order-items-col--product">Product</div>
                                                                                            <div className="store-order-items-col store-order-items-col--qty">Qty</div>
                                                                                            <div className="store-order-items-col store-order-items-col--price">Price</div>
                                                                                        </div>
                                                                                        <div className="store-order-items-body">
                                                                                            {items.length === 0 ? (
                                                                                                <div className="store-order-items-empty">No items on this order.</div>
                                                                                            ) : items.map((item: any, idx: number) => {
                                                                                                const opt = item.options || {};
                                                                                                const photoUrl =
                                                                                                    opt.photo?.web_url ||
                                                                                                    opt.photo?.url ||
                                                                                                    opt.photo?.thumbnail_url ||
                                                                                                    (opt.photos && (opt.photos[0]?.web_url || opt.photos[0]?.url)) ||
                                                                                                    '';
                                                                                                return (
                                                                                                    <div className="store-order-items-row" key={item.id || idx}>
                                                                                                        <div className="store-order-items-col store-order-items-col--thumb">
                                                                                                            {photoUrl ? (
                                                                                                                <img src={photoUrl} alt="" className="store-order-item-thumb" />
                                                                                                            ) : (
                                                                                                                <div className="store-order-item-thumb-empty">No photo</div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                        <div className="store-order-items-col store-order-items-col--product">
                                                                                                            <div className="store-order-item-name">{item.product_name}</div>
                                                                                                            {opt.size && (
                                                                                                                <div className="store-order-item-meta">
                                                                                                                    Size: {typeof opt.size === 'object' ? opt.size.label : opt.size}
                                                                                                                </div>
                                                                                                            )}
                                                                                                            {opt.frame && (
                                                                                                                <div className="store-order-item-meta">
                                                                                                                    Frame: {typeof opt.frame === 'object' ? (opt.frame.name || opt.frame.label || opt.frame.id) : opt.frame}
                                                                                                                </div>
                                                                                                            )}
                                                                                                            {opt.paper && (
                                                                                                                <div className="store-order-item-meta">
                                                                                                                    Paper: {typeof opt.paper === 'object' ? (opt.paper.name || opt.paper.label) : opt.paper}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                        <div className="store-order-items-col store-order-items-col--qty">
                                                                                                            {item.quantity || 1}
                                                                                                        </div>
                                                                                                        <div className="store-order-items-col store-order-items-col--price">
                                                                                                            ₹{safeFormatPrice((getNumericPrice(item.unit_price) || getNumericPrice(item.price) || (getNumericPrice(item.subtotal) / (item.quantity || 1))) * (item.quantity || 1))}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )
                                    ) : activeActivitySubTab === 'download' && filteredDownloadActivityForTab.length > 0 ? (
                                        <div className="download-activity-layout">
                                            <div className={`activity-list-container download-activity-table-wrap${activeDownloadActivityTab !== 'gallery' ? ' download-activity-table-wrap--single' : ''}`}>
                                                <div className={`activity-table-header download${activeDownloadActivityTab !== 'gallery' ? ' download--single' : ''}`}>
                                                    <div className="activity-col-email">Email</div>
                                                    {activeDownloadActivityTab === 'gallery' ? (
                                                        <>
                                                            <div className="activity-col-set activity-col-set-header">
                                                                <span className="download-activity-set-header-spacer" aria-hidden />
                                                                <span>Photo Set</span>
                                                            </div>
                                                            <div className="activity-col-photos">Photos</div>
                                                            <div className="activity-col-destination">Saved to</div>
                                                            <div className="activity-col-pin">PIN</div>
                                                            <div className="activity-col-date-downloaded">Date Downloaded</div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="activity-col-set activity-col-set-header">
                                                                <span className="download-activity-set-header-spacer" aria-hidden />
                                                                <span>{activeDownloadActivityTab === 'video' ? 'Video' : 'Photo'}</span>
                                                            </div>
                                                            <div className="activity-col-quality">Quality</div>
                                                            <div className="activity-col-destination">Saved to</div>
                                                            <div className="activity-col-source">Source</div>
                                                            <div className="activity-col-date-downloaded">Date Downloaded</div>
                                                        </>
                                                    )}
                                                    <div className="activity-col-actions"></div>
                                                </div>
                                                <div className="activity-table-body">
                                                    {filteredDownloadActivityForTab.map((item, index, array) => (
                                                        <div 
                                                            key={item.id} 
                                                            className={`activity-row download${activeDownloadActivityTab !== 'gallery' ? ' download--single' : ''}${selectedDownloadId === item.id ? ' download-row-selected' : ''}`}
                                                            onClick={() => {
                                                                setSelectedDownloadId(item.id);
                                                                setActiveActivityMenu(null);
                                                                setDownloadDetailToolbarMenuOpen(false);
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <div className="activity-col-email">
                                                                <span>{item.email}</span>
                                                            </div>
                                                            <div className="activity-col-set activity-col-list">
                                                                <div className="list-thumb">
                                                                    {(() => {
                                                                        const ph = pickDownloadActivityThumbPhoto(item, photos, sets);
                                                                        const thumb = ph?.thumbnail_url || ph?.web_url || ph?.full_url;
                                                                        const isVideo = activeDownloadActivityTab === 'video'
                                                                            || /\.(mp4|webm|ogg|mov)$/i.test(ph?.filename || ph?.full_url || item.filename || '');

                                                                        if (thumb) {
                                                                            if (isVideo) {
                                                                                return (
                                                                                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                                                        <video src={thumb} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                                                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)' }}>
                                                                                            <Play size={10} fill="white" stroke="white" />
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return <img src={thumb} alt="" />;
                                                                        }
                                                                        return (
                                                                            <div className="thumb-placeholder">
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                                <span className="list-name-link" title={
                                                                    activeDownloadActivityTab === 'gallery'
                                                                        ? (item.setName || '')
                                                                        : (item.filename || '')
                                                                }>
                                                                    {activeDownloadActivityTab === 'gallery'
                                                                        ? (item.setName && item.setName !== 'Unknown Set'
                                                                            ? item.setName
                                                                            : (sets.find(s => s.id === item.photoSetId)?.name || 'Highlights'))
                                                                        : (item.filename
                                                                            || pickDownloadActivityThumbPhoto(item, photos, sets)?.filename
                                                                            || (activeDownloadActivityTab === 'video' ? 'Video' : 'Photo'))}
                                                                </span>
                                                            </div>
                                                            {activeDownloadActivityTab === 'gallery' ? (
                                                                <>
                                                                    <div className="activity-col-photos">
                                                                        {countPhotosForDownloadActivity(item, photos, sets)}
                                                                    </div>
                                                                    <div className="activity-col-destination">
                                                                        <span className={`download-destination-badge download-destination-badge--${item.destination === 'google_drive' ? 'drive' : item.destination === 'email' ? 'email' : 'local'}`}>
                                                                            {formatDownloadDestination(item.destination)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="activity-col-pin">
                                                                        {item.pin !== '---' ? item.pin : (item.pinUsed ? 'Yes' : '---')}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="activity-col-quality">
                                                                        <span className="download-quality-badge">{item.resolution || 'Original'}</span>
                                                                    </div>
                                                                    <div className="activity-col-destination">
                                                                        <span className={`download-destination-badge download-destination-badge--${item.destination === 'google_drive' ? 'drive' : item.destination === 'email' ? 'email' : 'local'}`}>
                                                                            {formatDownloadDestination(item.destination)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="activity-col-source">
                                                                        {item.source || 'Gallery'}
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="activity-col-date-downloaded">
                                                                {new Date(item.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' -')}
                                                            </div>
                                                            <div className="activity-col-actions">
                                                                <button 
                                                                    className="row-action-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveActivityMenu(activeActivityMenu === item.id ? null : item.id);
                                                                    }}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                                                </button>
    
                                                                {activeActivityMenu === item.id && (
                                                                    <div className={`activity-row-menu ${index >= array.length - 2 && array.length > 3 ? 'up' : ''}`}>
                                                                        <button 
                                                                            type="button"
                                                                            className="activity-menu-item delete"
                                                                            onMouseDown={(e) => e.stopPropagation()}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveActivityMenu(null);
                                                                                handleDeleteActivity(item.id);
                                                                            }}
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                            Delete info
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            {selectedDownloadId
                                                ? createPortal(
                                                    <DownloadActivityDetailModal
                                                      selectedDownloadId={selectedDownloadId}
                                                      downloadActivity={downloadActivity}
                                                      downloadDetailPhotos={downloadDetailPhotos}
                                                      sets={sets}
                                                      highlightsName={highlightsName}
                                                      onClose={() => {
                                                        setSelectedDownloadId(null);
                                                        setDownloadDetailToolbarMenuOpen(false);
                                                      }}
                                                      onExport={() => {
                                                        const detail = downloadActivity.find(
                                                          (a) => a.id === selectedDownloadId
                                                        );
                                                        if (detail) handleExportDownloadActivityExcel([detail]);
                                                      }}
                                                    />,
                                                    document.body
                                                  )
                                                : null}
                                        </div>
                                    ) : activeActivitySubTab === 'email' && (emailRegistrationActivity || []).length > 0 ? (
                                        <div className="email-registration-layout">
                                            <div className="email-registration-search">
                                                <div className="email-registration-search-field">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                                    <input
                                                        type="search"
                                                        className="neu-inset"
                                                        value={emailRegSearch}
                                                        onChange={(e) => setEmailRegSearch(e.target.value)}
                                                        placeholder="Search registered emails…"
                                                    />
                                                </div>
                                            </div>
                                            {(() => {
                                                const filtered = (emailRegistrationActivity || []).filter((row: any) => {
                                                    if (!emailRegSearch.trim()) return true;
                                                    const q = emailRegSearch.toLowerCase();
                                                    return String(row.email || '').toLowerCase().includes(q)
                                                        || String(row.source || '').toLowerCase().includes(q)
                                                        || String(row.accessLevel || '').toLowerCase().includes(q);
                                                });

                                                if (filtered.length === 0) {
                                                    return (
                                                        <div className="email-registration-empty-search">
                                                            No registered emails match your search.
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="email-registration-table-scroll">
                                                        <div className="activity-list-container email-registration-table-wrap">
                                                            <div className="activity-table-header email-reg">
                                                                <div className="activity-col-index">#</div>
                                                                <div className="activity-col-email">Email</div>
                                                                <div className="activity-col-access">Access</div>
                                                                <div className="activity-col-source">Source</div>
                                                                <div className="activity-col-date-registered">Date Registered</div>
                                                            </div>
                                                            <div className="activity-table-body">
                                                                {filtered.map((row: any, index: number) => (
                                                                    <div key={row.id} className="activity-row email-reg">
                                                                        <div className="activity-col-index">{index + 1}</div>
                                                                        <div className="activity-col-email" title={row.email}>
                                                                            {row.email || '—'}
                                                                        </div>
                                                                        <div className="activity-col-access">
                                                                            <span className="email-access-badge">
                                                                                {row.accessLevel || 'guest'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="activity-col-source">
                                                                            {row.source || 'Gallery Registration'}
                                                                        </div>
                                                                        <div className="activity-col-date-registered">
                                                                            {new Date(row.date).toLocaleString('en-US', {
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                year: 'numeric',
                                                                                hour: 'numeric',
                                                                                minute: '2-digit',
                                                                                hour12: true,
                                                                            }).replace(',', ' -')}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="cd-empty-state-content">
                                            <div className="cd-empty-state-illustration">
                                                {/* Unified Illustration Container */}
                                                {activeActivitySubTab === 'download' && (
                                                    <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M40 140H200L180 60H60L40 140Z" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                        <rect x="80" y="40" width="80" height="60" rx="4" fill="white" stroke="#666" strokeWidth="1.5" />
                                                        <path d="M120 70V110M120 110L110 100M120 110L130 100" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                                {activeActivitySubTab === 'favorite' && (
                                                    <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <circle cx="120" cy="90" r="50" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                        <path d="M120 75C120 75 115 65 100 65C85 65 80 80 80 90C80 115 120 140 120 140C120 140 160 115 160 90C160 80 155 65 140 65C125 65 120 75 120 75Z" fill="white" stroke="#111111" strokeWidth="2" />
                                                    </svg>
                                                )}

                                                {activeActivitySubTab === 'email' && (
                                                    <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <rect x="50" y="60" width="140" height="80" rx="4" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                        <path d="M50 60L120 100L190 60" stroke="#666" strokeWidth="1.5" />
                                                        <circle cx="120" cy="110" r="15" fill="white" stroke="#111111" strokeWidth="2" />
                                                    </svg>
                                                )}
                                                {activeActivitySubTab === 'share' && (
                                                    <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M70 110L170 110" stroke="#666" strokeWidth="1.5" strokeDasharray="4 4" />
                                                        <circle cx="70" cy="110" r="20" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                        <circle cx="170" cy="110" r="20" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                        <path d="M120 90V130" stroke="#111111" strokeWidth="2" />
                                                    </svg>
                                                )}
                                                {activeActivitySubTab === 'private' && (
                                                    <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M120 60C150 60 180 80 180 110C180 140 150 160 120 160C90 160 60 140 60 110C60 80 90 60 120 60Z" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                        <circle cx="120" cy="110" r="20" fill="white" stroke="#111111" strokeWidth="2" />
                                                    </svg>
                                                )}
                                            </div>
                                            <h3 className="cd-empty-state-title">
                                                {activeActivitySubTab === 'download' && (
                                                    activeDownloadActivityTab === 'gallery' ? 'No gallery downloads yet' :
                                                    activeDownloadActivityTab === 'photo' ? 'No single photo downloads yet' :
                                                    'No single video downloads yet'
                                                )}
                                                {activeActivitySubTab === 'favorite' && (loadingActivity ? 'Loading activity...' : 'No favorites activity yet')}

                                                {activeActivitySubTab === 'email' && 'No email registration activity yet'}
                                                {activeActivitySubTab === 'share' && 'No quick share links yet'}
                                                {activeActivitySubTab === 'private' && 'No private photo activity yet'}
                                            </h3>
                                            <p className="cd-empty-state-text">
                                                {activeActivitySubTab === 'download' && (
                                                    activeDownloadActivityTab === 'gallery' ? 'Gallery download activity details will show here when visitors download all photos from their collection.' :
                                                    activeDownloadActivityTab === 'photo' ? 'Single photo download activity details will show here when visitors download individual photos.' :
                                                    'Single video download activity details will show here when visitors download individual videos.'
                                                )}
                                                {activeActivitySubTab === 'favorite' && 'Activity details will show here when visitors favorite photos in their collection.'}

                                                {activeActivitySubTab === 'email' && 'Email registration activity will show here when visitors register their email before viewing the collection.'}
                                                {activeActivitySubTab === 'share' && 'Quick Share links will show here when you create them from the photos tab.'}
                                                {activeActivitySubTab === 'private' && 'Private photo activity details will show here when clients mark photos as private.'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
    </>
  );
};
