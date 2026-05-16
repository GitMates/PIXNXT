import React from 'react';
import { Play } from 'lucide-react';
import { openSpaPath } from '../../../../lib/spaNavigation';

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
}



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
  sortedFavoriteActivity
}) => {
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
                                    {activeActivitySubTab === 'favorite' && (
                                        <div className="favorite-activity-actions">
                                            <div className="favorite-activity-sort-wrap">
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
                                                        setFavoriteActivitySortMenuOpen((o) => !o);
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="13" y1="14" x2="3" y2="14" /><line x1="9" y1="18" x2="3" y2="18" /></svg>
                                                    {favoriteActivitySortTriggerLabel}
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`favorite-activity-header-chevron${favoriteActivitySortMenuOpen ? ' favorite-activity-header-chevron--open' : ''}`} aria-hidden><polyline points="6 9 12 15 18 9" /></svg>
                                                </button>
                                                {favoriteActivitySortMenuOpen && (
                                                    <div ref={favoriteActivitySortMenuRef} className="favorite-activity-sort-menu cd-sort-dropdown" role="menu" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            className={`cd-sort-option w-full text-left ${favoriteActivitySortMode === 'email' ? 'selected' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFavoriteActivitySortMode('email');
                                                                setFavoriteActivitySortMenuOpen(false);
                                                            }}
                                                        >
                                                            Sort by email
                                                        </button>
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            className={`cd-sort-option w-full text-left ${favoriteActivitySortMode === 'created' ? 'selected' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFavoriteActivitySortMode('created');
                                                                setFavoriteActivitySortMenuOpen(false);
                                                            }}
                                                        >
                                                            Sort by created date
                                                        </button>
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            className={`cd-sort-option w-full text-left ${favoriteActivitySortMode === 'updated' ? 'selected' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFavoriteActivitySortMode('updated');
                                                                setFavoriteActivitySortMenuOpen(false);
                                                            }}
                                                        >
                                                            Sort by updated date
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
                                        <div className={`favorite-activity-layout${selectedFavoriteListId ? ' favorite-activity-layout--split' : ''}`}>
                                            <div className={`activity-list-container favorite-activity-table-wrap${selectedFavoriteListId ? ' favorite-activity-table-wrap--compact' : ''}`}>
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
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
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
                                            {selectedFavoriteListId && (() => {
                                                const detail = favoriteActivity.find((a) => a.id === selectedFavoriteListId);
                                                const sortedRows = [...favoriteDetailRows].sort((a, b) => {
                                                    const fa = a.photo?.filename || '';
                                                    const fb = b.photo?.filename || '';
                                                    return favoriteDetailSort === 'name-za' ? fb.localeCompare(fa) : fa.localeCompare(fb);
                                                });
                                                return (
                                                    <aside className="favorite-list-detail-panel">
                                                        <div className="favorite-list-detail-header">
                                                            <h3 className="favorite-list-detail-title">Favorite List Details</h3>
                                                            <button
                                                                type="button"
                                                                className="favorite-list-detail-close"
                                                                onClick={() => {
                                                                    setSelectedFavoriteListId(null);
                                                                    setFavoriteDetailRows([]);
                                                                    setFavoriteDetailToolbarMenuOpen(false);
                                                                    setFavoriteDetailPhotoMenuPhotoId(null);
                                                                }}
                                                                aria-label="Close details"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                            </button>
                                                        </div>
                                                        {detail && (
                                                            <>
                                                                <div className="favorite-list-detail-toolbar">
                                                                    <button type="button" className="favorite-detail-toolbar-link" onClick={() => openEditFavoriteListModal(detail)}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                                        Edit List
                                                                    </button>
                                                                    <button type="button" className="favorite-detail-toolbar-link" onClick={() => handleDownloadAllFavoriteList(detail.id)}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                        Download All
                                                                    </button>
                                                                    <button type="button" className="favorite-detail-toolbar-link" onClick={() => { handleExportFavoriteList(detail.id, detail.name); setFavoriteDetailToolbarMenuOpen(false); }}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                        Export
                                                                    </button>
                                                                    <div className="favorite-detail-toolbar-more-wrap">
                                                                        <button
                                                                            type="button"
                                                                            className="favorite-detail-toolbar-icon-btn"
                                                                            aria-label="More actions"
                                                                            aria-expanded={favoriteDetailToolbarMenuOpen}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveActivityMenu(null);
                                                                                setFavoriteDetailPhotoMenuPhotoId(null);
                                                                                setFavoriteDetailToolbarMenuOpen((o) => !o);
                                                                            }}
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                                                        </button>
                                                                        {favoriteDetailToolbarMenuOpen && (
                                                                            <div ref={favoriteDetailToolbarMenuRef} className="favorite-detail-toolbar-menu" role="menu">
                                                                                <button type="button" className="activity-menu-item" role="menuitem" onClick={() => { handleLightroomCopyList(detail.id); setFavoriteDetailToolbarMenuOpen(false); }}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
                                                                                    Lightroom Copy List
                                                                                </button>
                                                                                <button type="button" className="activity-menu-item" role="menuitem" onClick={() => { openSpaPath(`/gallery/${collection?.slug}?list=${detail.id}`); setFavoriteDetailToolbarMenuOpen(false); }}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                                                    View in Gallery
                                                                                </button>
                                                                                <button type="button" className="activity-menu-item" role="menuitem" onClick={() => handleDownloadAllFavoriteList(detail.id)}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                                    Send as download
                                                                                </button>
                                                                                <button type="button" className="activity-menu-item" role="menuitem" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                                                                    Copy to new set
                                                                                </button>
                                                                                <button type="button" className="activity-menu-item" role="menuitem" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                                                                                    Copy to new collection
                                                                                </button>
                                                                                <button type="button" className="activity-menu-item" role="menuitem" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                                                                                    Create mobile app
                                                                                </button>
                                                                                <div style={{ height: '1px', background: '#eee', margin: '4px 0' }} />
                                                                                <button type="button" className="activity-menu-item delete" role="menuitem" onClick={() => { setFavoriteDetailToolbarMenuOpen(false); handleDeleteFavoriteActivity(detail.id); }}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                                    Delete info
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="favorite-list-detail-meta">
                                                                    <div className="favorite-detail-meta-row"><span className="favorite-detail-meta-label">Name</span><span>{detail.name}</span></div>
                                                                    <div className="favorite-detail-meta-row"><span className="favorite-detail-meta-label">Email</span><span>{detail.email}</span></div>
                                                                    <div className="favorite-detail-meta-row"><span className="favorite-detail-meta-label">No. of photos</span><span>{detail.max_selection != null && Number(detail.max_selection) > 0 ? `${detail.photoCount} of ${detail.max_selection}` : detail.photoCount}</span></div>
                                                                    <div className="favorite-detail-meta-row"><span className="favorite-detail-meta-label">Last modified</span><span>{new Date(detail.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' -')}</span></div>
                                                                    {detail.description?.trim() ? (
                                                                        <div className="favorite-detail-meta-row favorite-detail-meta-row--multiline">
                                                                            <span className="favorite-detail-meta-label">Description</span>
                                                                            <span className="favorite-detail-meta-value-wrap">{detail.description.trim()}</span>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            </>
                                                        )}
                                                        <div className="favorite-list-detail-photos-head">
                                                            <button type="button" className="favorite-detail-sort-btn" onClick={() => setFavoriteDetailSort((s) => (s === 'name-az' ? 'name-za' : 'name-az'))}>
                                                                <span className="favorite-detail-sort-arrows" aria-hidden>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                                                                </span>
                                                                Name: {favoriteDetailSort === 'name-az' ? 'A-Z' : 'Z-A'}
                                                            </button>
                                                        </div>
                                                        <div className="favorite-list-detail-photos">
                                                            {favoriteDetailLoading ? (
                                                                <p className="favorite-detail-loading">Loading…</p>
                                                            ) : sortedRows.length === 0 ? (
                                                                <p className="favorite-detail-empty">No photos in this list yet.</p>
                                                            ) : (
                                                                sortedRows.map((row, index) => {
                                                                    const ph = row.photo;
                                                                    const setLabel = !ph?.set_id ? highlightsName : (sets.find((ss) => ss.id === ph.set_id)?.name || 'Highlights');
                                                                    const thumb = ph?.thumbnail_url || ph?.web_url || ph?.full_url;
                                                                    const menuOpen = favoriteDetailPhotoMenuPhotoId === ph?.id;
                                                                    return (
                                                                        <div
                                                                            key={`${ph?.id}-${row.itemCreatedAt}`}
                                                                            className={`favorite-detail-photo-row${menuOpen ? ' favorite-detail-photo-row--menu-open' : ''}`}
                                                                        >
                                                                            <div className="favorite-detail-thumb">
                                                                                {thumb ? (
                                                                                    /\.(mp4|webm|ogg|mov)$/i.test(ph?.filename || ph?.full_url || '') ? (
                                                                                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                                                            <video src={thumb} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                                                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                                                                                                <Play size={16} fill="white" stroke="white" />
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <img src={thumb} alt="" />
                                                                                    )
                                                                                ) : null}
                                                                            </div>
                                                                            <div className="favorite-detail-photo-main">
                                                                                <div className="favorite-detail-filename">{ph?.filename || 'Photo'}</div>
                                                                                <div className="favorite-detail-sub">
                                                                                    {new Date(row.itemCreatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' -')}
                                                                                    <span className="favorite-detail-sub-sep"> - </span>
                                                                                    <span className="favorite-detail-set-tag">{setLabel}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="favorite-detail-row-actions">
                                                                                <button
                                                                                    type="button"
                                                                                    className="favorite-detail-row-more"
                                                                                    aria-label="More options"
                                                                                    aria-expanded={menuOpen}
                                                                                    aria-haspopup="menu"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setFavoriteDetailToolbarMenuOpen(false);
                                                                                        setActiveActivityMenu(null);
                                                                                        setFavoriteDetailPhotoMenuPhotoId((id) => (id === ph?.id ? null : ph?.id));
                                                                                    }}
                                                                                >
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                                                                </button>
                                                                                {menuOpen && (
                                                                                    <div
                                                                                        ref={favoriteDetailPhotoMenuRef}
                                                                                        className={`favorite-detail-photo-row-menu${index > 0 && index >= sortedRows.length - 2 ? ' favorite-detail-photo-row-menu--up' : ''}`}
                                                                                        role="menu"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    >
                                                                                        <button
                                                                                            type="button"
                                                                                            className="activity-menu-item"
                                                                                            role="menuitem"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleFavoriteDetailRowDownload(ph);
                                                                                            }}
                                                                                        >
                                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                                            Download
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            className="activity-menu-item delete"
                                                                                            role="menuitem"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleRemovePhotoFromFavoriteList(selectedFavoriteListId, ph?.id);
                                                                                            }}
                                                                                        >
                                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                                            Remove Favorite
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </aside>
                                                );
                                            })()}
                                        </div>
                                    ) : activeActivitySubTab === 'store' ? (
                                        <div className="cd-empty-state-content" style={{ padding: '48px 24px', textAlign: 'center' }}>
                                            <div className="cd-empty-state-illustration" style={{ marginBottom: '24px' }}>
                                                <svg width="200" height="140" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                                    <rect x="40" y="40" width="120" height="80" rx="6" fill="#F8FAFB" stroke="#ddd" strokeWidth="1.5" />
                                                    <circle cx="100" cy="75" r="18" fill="#fff" stroke="#00c0a3" strokeWidth="1.5" />
                                                    <path d="M92 75h16M100 67v16" stroke="#00c0a3" strokeWidth="2" strokeLinecap="round" />
                                                </svg>
                                            </div>
                                            <h3 className="cd-empty-state-title">No store orders yet</h3>
                                            <p className="cd-empty-state-text">When clients place orders from your store, they will appear here.</p>
                                        </div>
                                    ) : activeActivitySubTab === 'download' && downloadActivity.filter(a => a.type === activeDownloadActivityTab).length > 0 ? (
                                        <div className={`download-activity-layout${selectedDownloadId ? ' download-activity-layout--split' : ''}`}>
                                            <div className={`activity-list-container download-activity-table-wrap${selectedDownloadId ? ' download-activity-table-wrap--compact' : ''}`}>
                                                <div className="activity-table-header download">
                                                    <div className="activity-col-email">Email</div>
                                                    <div className="activity-col-set">Photo Set</div>
                                                    <div className="activity-col-photos">Photos</div>
                                                    <div className="activity-col-pin">PIN</div>
                                                    <div className="activity-col-date-downloaded">Date Downloaded</div>
                                                    <div className="activity-col-actions"></div>
                                                </div>
                                                <div className="activity-table-body">
                                                    {downloadActivity.filter(a => a.type === activeDownloadActivityTab).map((item, index, array) => (
                                                        <div 
                                                            key={item.id} 
                                                            className={`activity-row download${selectedDownloadId === item.id ? ' download-row-selected' : ''}`}
                                                            onClick={() => {
                                                                setSelectedDownloadId(selectedDownloadId === item.id ? null : item.id);
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
                                                                        let ph = null;
                                                                        if (item.type === 'photo' || item.type === 'video' || item.type === 'single') {
                                                                            ph = photos.find(p => p.filename === item.filename || p.id === item.id);
                                                                        } else if (item.type === 'gallery') {
                                                                            const set = sets.find(s => s.name === item.setName);
                                                                            if (set) ph = photos.find(p => p.set_id === set.id);
                                                                            else if (item.setName === 'Highlights') ph = photos.find(p => !p.set_id);
                                                                        }
                                                                        
                                                                        const thumb = ph?.thumbnail_url || ph?.web_url || ph?.full_url;
                                                                        const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(ph?.filename || ph?.full_url || '');

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
                                                                <span className="list-name-link">
                                                                    {item.setName && item.setName !== 'Unknown Set' 
                                                                        ? item.setName 
                                                                        : (sets.find(s => s.id === item.photoSetId)?.name || 'Highlights')}
                                                                </span>
                                                            </div>
                                                            <div className="activity-col-photos">
                                                                {item.photoCount || 1}
                                                            </div>
                                                            <div className="activity-col-pin">
                                                                {item.pin !== '---' ? item.pin : (item.pinUsed ? 'Yes' : '---')}
                                                            </div>
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
                                                                            className="activity-menu-item delete"
                                                                            onClick={() => handleDeleteActivity(item.id)}
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
                                            {selectedDownloadId && (() => {
                                                const detail = downloadActivity.find((a) => a.id === selectedDownloadId);
                                                return (
                                                    <aside className="download-detail-panel">
                                                        <div className="download-detail-header">
                                                            <h3 className="download-detail-title">Download Details</h3>
                                                            <button
                                                                type="button"
                                                                className="download-detail-close"
                                                                onClick={() => {
                                                                    setSelectedDownloadId(null);
                                                                    setDownloadDetailToolbarMenuOpen(false);
                                                                }}
                                                                aria-label="Close details"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                            </button>
                                                        </div>
                                                        {detail && (
                                                            <>
                                                                <div className="download-detail-toolbar">
                                                                    <button type="button" className="download-detail-toolbar-link" onClick={() => handleExportActivity()}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                        Export
                                                                    </button>
                                                                </div>
                                                                <div className="download-detail-meta">
                                                                    <div className="download-detail-meta-row"><span className="download-detail-meta-label">Email</span><span className="download-detail-meta-value">{detail.email}</span></div>
                                                                    <div className="download-detail-meta-row">
                                                                        <span className="download-detail-meta-label">Photo Set</span>
                                                                        <span className="download-detail-meta-value">
                                                                            {detail.setName && detail.setName !== 'Unknown Set' 
                                                                                ? detail.setName 
                                                                                : (sets.find(s => s.id === detail.photoSetId)?.name || 'Highlights')}
                                                                        </span>
                                                                    </div>
                                                                    <div className="download-detail-meta-row"><span className="download-detail-meta-label">PIN</span><span className="download-detail-meta-value">{detail.pin}</span></div>
                                                                    <div className="download-detail-meta-row"><span className="download-detail-meta-label">Date</span><span className="download-detail-meta-value">{new Date(detail.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' -')}</span></div>
                                                                </div>
                                                            </>
                                                        )}
                                                        <div className="download-detail-photos-head">
                                                            <span className="download-detail-photos-title">Photos ({downloadDetailPhotos.length})</span>
                                                        </div>
                                                        <div className="download-detail-photos">
                                                            {downloadDetailPhotos.length === 0 ? (
                                                                <p className="download-detail-empty">No photos found for this download.</p>
                                                            ) : (
                                                                downloadDetailPhotos.map((ph) => {
                                                                    const setLabel = !ph?.set_id ? highlightsName : (sets.find((ss) => ss.id === ph.set_id)?.name || 'Highlights');
                                                                    const thumb = ph?.thumbnail_url || ph?.web_url || ph?.full_url;
                                                                    return (
                                                                        <div key={ph?.id} className="download-detail-photo-row">
                                                                            <div className="download-detail-thumb">
                                                                                {thumb ? (
                                                                                    /\.(mp4|webm|ogg|mov)$/i.test(ph?.filename || ph?.full_url || '') ? (
                                                                                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                                                            <video src={thumb} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                                                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                                                                                                <Play size={16} fill="white" stroke="white" />
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <img src={thumb} alt="" />
                                                                                    )
                                                                                ) : null}
                                                                            </div>
                                                                            <div className="download-detail-photo-main">
                                                                                <div className="download-detail-filename">{ph?.filename || 'Photo'}</div>
                                                                                <div className="download-detail-sub">
                                                                                    <span className="download-detail-set-tag">{setLabel}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </aside>
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
