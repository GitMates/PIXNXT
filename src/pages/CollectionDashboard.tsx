import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCollectionDashboard } from '@/hooks/useCollectionDashboard';
import { usePhotoOperations } from '@/hooks/usePhotoOperations';
import { DashboardSidebar } from '@/components/features/CollectionDashboard/Sidebar';
import { DashboardTopbar } from '@/components/features/CollectionDashboard/Topbar';
import { MediaGridView, SelectionToolbar } from '@/components/features/CollectionDashboard/Media';
import {
  GeneralSettings,
  PrivacySettings,
  DownloadSettings,
  FavoriteSettings,
  StoreSettings
} from '@/components/features/CollectionDashboard/Settings';
import { UploadModal, SetModal } from '@/components/features/CollectionDashboard/Modals';
import { DesignTab } from '@/components/features/CollectionDashboard/DesignTab';
import { PreviewPane } from '@/components/features/CollectionDashboard/PreviewPane';
import { ChangeCoverModal } from '@/components/features/CollectionDashboard/CoverSettings';
import { ActivityView } from '@/components/features/CollectionDashboard/Activity';
import { UploadWidget } from '@/components/features/CollectionDashboard/UploadWidget';
import {
  DASHBOARD_PHOTO_SORT_OPTIONS,
  type DashboardPhotoSort,
  sortDashboardPhotos,
} from '@/utils/sortDashboardPhotos';
import { formatCoverDate } from '@/lib/formatCoverDate';
import './CollectionDashboard.css';

export default function CollectionDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const collectionId = searchParams.get('id');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const gridSettingsRef = useRef<HTMLDivElement>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showGridSettings, setShowGridSettings] = useState(false);
  const [photoSort, setPhotoSort] = useState<DashboardPhotoSort>('upload-new-old');

  const dashboardState = useCollectionDashboard(collectionId || '');
  const photoOps = usePhotoOperations({
    collectionId: collectionId || '',
    setPhotos: dashboardState.setPhotos as any
  });

  const {
    collection,
    photos,
    sets,
    isLoading,
    activeSidebarTab,
    setActiveSidebarTab,
    activeSetId,
    setActiveSetId,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    showUploadModal,
    setShowUploadModal,
    activeMediaTab,
    setActiveMediaTab,
    status,
    setStatus,
    pinValue,
    gridSize,
    setGridSize,
    showFilename,
    setShowFilename,
    showAddSetModal,
    setShowAddSetModal,
    newSetName,
    setNewSetName,
    newSetDescription,
    setNewSetDescription,
    savingSet,
    editingSet,
    setEditingSet,
    showCoverModal,
    setShowCoverModal,
    activeSettingsTab,
    activeActivityTab,
    setActiveActivityTab,
    uploadWidget,
    setUploadWidget,
  } = dashboardState;

  const activeSet = activeSetId ? sets.find((s) => s.id === activeSetId) : null;
  const activeSetName = activeSet ? activeSet.name : 'Highlights';

  const sortedDisplayPhotos = useMemo(() => {
    const display =
      activeSetId !== null
        ? photos.filter((p) => p.set_id === activeSetId)
        : photos;
    return sortDashboardPhotos(display, photoSort);
  }, [photos, activeSetId, photoSort]);

  const activeSetPhotoCount = sortedDisplayPhotos.length;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (sortRef.current && !sortRef.current.contains(t)) setShowSortMenu(false);
      if (gridSettingsRef.current && !gridSettingsRef.current.contains(t)) setShowGridSettings(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  if (isLoading) {
    return (
      <div className="cd-loading-screen">
        <div className="cd-loader"></div>
        <p>Loading collection...</p>
      </div>
    );
  }

  const handleAddSet = () => {
    setEditingSet(null);
    setNewSetName('');
    setNewSetDescription('');
    setShowAddSetModal(true);
  };

  const handleEditSet = (set: any) => {
    setEditingSet(set);
    // Highlights is a virtual set (photos with set_id = null); its name is fixed.
    // We store its description on the collection itself.
    if (set.id === 'highlights-default') {
      setNewSetName('Highlights');
      setNewSetDescription(collection?.description || '');
    } else {
      setNewSetName(set.name);
      setNewSetDescription(set.description || '');
    }
    setShowAddSetModal(true);
  };

  const handleSaveSet = async () => {
    if (!collectionId || !collection?.photographer_id) return;

    dashboardState.setSavingSet(true);
    try {
      if (editingSet) {
        if (editingSet.id === 'highlights-default') {
          const { error: descError } = await supabase
            .from('collections')
            .update({ description: newSetDescription.trim() || null })
            .eq('id', collectionId);
          if (descError) throw descError;
        } else {
          // Normal set — require a name and update the sets table.
          if (!newSetName.trim()) return;

          const { error } = await supabase
            .from('sets')
            .update({
              name: newSetName,
              description: newSetDescription
            })
            .eq('id', editingSet.id);

          if (error) throw error;
        }
      } else {
        // Creating a new set — name is required.
        if (!newSetName.trim()) return;

        const { error } = await supabase
          .from('sets')
          .insert([{
            name: newSetName,
            description: newSetDescription,
            collection_id: collectionId,
            photographer_id: collection?.photographer_id,
            position: sets.length
          }]);

        if (error) throw error;
      }

      await dashboardState.refreshData();
      setShowAddSetModal(false);
      setNewSetName('');
      setNewSetDescription('');
      setEditingSet(null);
    } catch (error) {
      console.error('Error saving set:', error);
      alert('Failed to save set');
    } finally {
      dashboardState.setSavingSet(false);
    }
  };

  const handleDeleteSet = async (setId: string) => {
    // Highlights is a virtual set (photos with no set_id) and cannot be deleted.
    if (setId === 'highlights-default') {
      alert('The Highlights set cannot be deleted. It contains all photos not assigned to a specific set.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this set? All photos and activities for this photo set will be deleted. This cannot be undone.')) {
      return;
    }

    try {
      // Delete photos first to avoid foreign key issues if not cascaded
      const { error: photosError } = await supabase
        .from('photos')
        .delete()
        .eq('set_id', setId);

      if (photosError) throw photosError;

      const { error: setErrors } = await supabase
        .from('sets')
        .delete()
        .eq('id', setId);

      if (setErrors) throw setErrors;

      if (activeSetId === setId) {
        setActiveSetId(null);
      }

      await dashboardState.refreshData();
    } catch (error) {
      console.error('Error deleting set:', error);
      alert('Failed to delete set');
    }
  };

  const renderContent = () => {
    if (activeSidebarTab === 'photos') {
      return (
        <div className="cd-main-scroll">
          <div className="cd-content-padding">
            <div className="cd-main-header">
              <h2 className="cd-main-title">{activeSetName} ({activeSetPhotoCount})</h2>
              <div className="cd-main-actions">
                <div className="cd-sort-wrapper" ref={sortRef}>
                  <button
                    type="button"
                    className="cd-icon-btn sort-btn"
                    aria-expanded={showSortMenu}
                    aria-haspopup="menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowGridSettings(false);
                      setShowSortMenu((open) => !open);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="18" x2="12" y2="18"></line><line x1="3" y1="6" x2="3" y2="18"></line><polyline points="1 15 3 18 5 15"></polyline></svg>
                  </button>
                  {showSortMenu && (
                    <div className="cd-sort-dropdown" role="menu">
                      <div className="cd-sort-label">Sort by</div>
                      {DASHBOARD_PHOTO_SORT_OPTIONS.map((opt) => (
                        <div
                          key={opt.value}
                          role="menuitem"
                          className={`cd-sort-option ${photoSort === opt.value ? 'selected' : ''}`}
                          onClick={() => {
                            setPhotoSort(opt.value);
                            setShowSortMenu(false);
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="cd-main-actions-divider" />
                <div className="cd-grid-settings-wrapper" ref={gridSettingsRef}>
                  <button
                    type="button"
                    className="cd-icon-btn active grid-btn"
                    aria-expanded={showGridSettings}
                    aria-haspopup="menu"
                    title="Grid size and display"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSortMenu(false);
                      setShowGridSettings((open) => !open);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  </button>
                  {showGridSettings && (
                    <div className="cd-grid-dropdown" role="menu">
                      <div className="cd-grid-section-label">Grid Size</div>
                      <div
                        className={`cd-grid-option ${gridSize === 'small' ? 'selected' : ''}`}
                        role="menuitemradio"
                        aria-checked={gridSize === 'small'}
                        onClick={() => setGridSize('small')}
                      >
                        <span>Small</span>
                        {gridSize === 'small' && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </div>
                      <div
                        className={`cd-grid-option ${gridSize === 'large' ? 'selected' : ''}`}
                        role="menuitemradio"
                        aria-checked={gridSize === 'large'}
                        onClick={() => setGridSize('large')}
                      >
                        <span>Large</span>
                        {gridSize === 'large' && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </div>
                      <div className="cd-grid-divider" />
                      <div className="cd-grid-section-label">Show</div>
                      <div className="cd-grid-toggle-row">
                        <span>Filename</span>
                        <label className="cd-toggle" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={showFilename} onChange={() => setShowFilename(!showFilename)} />
                          <span className="cd-toggle-slider" />
                        </label>
                        <span className="cd-toggle-label">{showFilename ? 'On' : 'Off'}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="cd-main-actions-divider" />
                <button type="button" className="cd-add-media-btn" onClick={() => setShowUploadModal(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                  Add Media
                </button>
              </div>
            </div>
            <MediaGridView
              photos={sortedDisplayPhotos}
              gridSize={gridSize}
              showFilename={showFilename}
              selectedPhotos={photoOps.selectedPhotos}
              onToggleSelection={photoOps.togglePhotoSelection}
              onToggleStar={photoOps.handleToggleStar}
              onDelete={photoOps.deleteSelectedPhotos}
              onAddMedia={() => setShowUploadModal(true)}
            />
          </div>
          <SelectionToolbar
            selectedCount={photoOps.selectedPhotos.length}
            onClear={photoOps.clearSelection}
            onSelectAll={() => photoOps.setSelectedPhotos(photos.map(p => p.id))}
            onDelete={() => photoOps.deleteSelectedPhotos()}
            onMoveToSet={photoOps.handleMovePhotosToSet}
            sets={[{ id: null, name: 'Highlights' }, ...sets.map(s => ({ id: s.id || '', name: s.name }))]}
          />
        </div>
      );
    }

    if (activeSidebarTab === 'design') {
      return (
        <div className="cd-design-layout">
          <div className="cd-design-sidebar border-r">
            <DesignTab
              activeTab={dashboardState.activeDesignTab}
              settings={dashboardState.designSettings}
              onSettingsChange={dashboardState.setDesignSettings}
              onOpenCoverModal={() => setShowCoverModal(true)}
              onOpenFocalModal={() => { }} // TODO: add focal modal logic
            />
          </div>
          <div className="cd-design-preview bg-black/10 flex-1">
            <PreviewPane
              settings={dashboardState.designSettings}
              collectionTitle={collection?.name || ''}
              collectionDate={formatCoverDate(collection?.event_date || collection?.created_at)}
              collectionDescription={activeSetId ? sets.find(s => s.id === activeSetId)?.description || '' : (collection?.description || sets[0]?.description || '')}
              coverPhotoUrl={photos.find(p => p.id === collection?.cover_photo_id)?.full_url || undefined}
              gridPhotos={dashboardState.allPhotos as any}
              previewMode={dashboardState.previewMode}
              onPreviewModeChange={dashboardState.setPreviewMode}
              dashboardState={dashboardState}
              onSetActiveSet={setActiveSetId}
            />
          </div>
        </div>
      );
    }

    if (activeSidebarTab === 'settings') {
      return (
        <div className="cd-settings-layout">
          <div className="cd-settings-sidebar border-r border-[#222]">
            {['general', 'privacy', 'download', 'favorite', 'store'].map(tab => (
              <div
                key={tab}
                className={`cd-settings-nav-item ${dashboardState.activeSettingsTab === tab ? 'active' : ''}`}
                onClick={() => dashboardState.setActiveSettingsTab(tab as any)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </div>
            ))}
          </div>
          <div className="cd-settings-main-pane h-full overflow-y-auto">
            <div className="cd-settings-pane-wrapper">
              {dashboardState.activeSettingsTab === 'general' && <GeneralSettings {...dashboardState as any} />}
              {dashboardState.activeSettingsTab === 'privacy' && <PrivacySettings {...dashboardState as any} />}
              {dashboardState.activeSettingsTab === 'download' && <DownloadSettings {...dashboardState as any} />}
              {dashboardState.activeSettingsTab === 'favorite' && <FavoriteSettings {...dashboardState as any} />}
              {dashboardState.activeSettingsTab === 'store' && <StoreSettings />}
            </div>
          </div>
        </div>
      );
    }

    if (activeSidebarTab === 'activity') {
      // @ts-ignore: ActivityView props are not fully typed yet in the new TSX structure
      return <ActivityView activeTab={dashboardState.activeActivityTab} onTabChange={dashboardState.setActiveActivityTab} />;
    }

    return null;
  };

  function openSpaPath(arg0: string): void {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="cd-layout">
      <DashboardSidebar
        activeTab={activeSidebarTab}
        onTabChange={setActiveSidebarTab}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        sets={sets}
        activeSetId={activeSetId}
        onSetChange={setActiveSetId}
        onAddSet={handleAddSet}
        onEditSet={handleEditSet}
        onDeleteSet={handleDeleteSet}
        onManageSets={() => { }}
      />

      <main className="cd-main">
        <DashboardTopbar
          collectionName={collection?.name || ''}
          status={status}
          onStatusChange={(newStatus: 'DRAFT' | 'PUBLISHED') => setStatus(newStatus)}
          onPreview={() => openSpaPath(`/gallery/${collection?.slug}`)}
          onShare={() => { }}
          onBack={() => navigate('/dashboard')}
          moreMenu={{
            collectionId: collection?.id,
            collectionSlug: collection?.slug,
            photographerId: collection?.photographer_id,
            eventDate: collection?.event_date,
            pinValue: pinValue || '',
            clientPasswordDisplay: '',
            onOpenDownloadSettings: () => {
              dashboardState.setActiveSidebarTab('settings');
              dashboardState.setActiveSettingsTab('download');
            },
          }}
        />

        <div className="cd-content">
          {renderContent()}
        </div>
      </main>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onBrowse={() => fileInputRef.current?.click()}
        onDrop={() => { }} // TODO
        activeTab={activeMediaTab}
        onTabChange={setActiveMediaTab}
        isDragging={false}
        onDragOver={() => { }}
        onDragLeave={() => { }}
      />

      <SetModal
        isOpen={showAddSetModal}
        onClose={() => setShowAddSetModal(false)}
        onSave={handleSaveSet}
        title={editingSet?.id === 'highlights-default' ? 'Edit Highlights Set' : (editingSet ? 'Edit Set' : 'Add Set')}
        name={newSetName}
        setName={setNewSetName}
        description={newSetDescription}
        setDescription={setNewSetDescription}
        isSaving={savingSet}
        isHighlights={editingSet?.id === 'highlights-default'}
      />

      {showCoverModal && (
        <ChangeCoverModal
          isOpen={showCoverModal}
          onClose={() => setShowCoverModal(false)}
          photos={photos}
          onSelectPhoto={(photo: any) => {
            dashboardState.setCollection((prev: any) => ({ ...prev, cover_photo_id: photo.id }));
            setShowCoverModal(false);
          }}
        />
      )}

      <UploadWidget
        isOpen={uploadWidget.isOpen}
        isMinimized={uploadWidget.isMinimized}
        onMinimize={() => setUploadWidget({ ...uploadWidget, isMinimized: !uploadWidget.isMinimized })}
        onClose={() => setUploadWidget({ ...uploadWidget, isOpen: false })}
        files={uploadWidget.files as any}
      />

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        accept="image/*"
        onChange={() => { }} // TODO
      />
    </div>
  );
}
