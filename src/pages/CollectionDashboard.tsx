import React, { useRef } from 'react';
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
import './CollectionDashboard.css';

export default function CollectionDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const collectionId = searchParams.get('id');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    gridSize,
    showFilename,
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
    setNewSetName(set.name);
    setNewSetDescription(set.description || '');
    setShowAddSetModal(true);
  };

  const handleSaveSet = async () => {
     // ... logic from original file
  };

  const renderContent = () => {
    if (activeSidebarTab === 'photos') {
      const displayPhotos = activeSetId 
        ? photos.filter(p => p.set_id === activeSetId)
        : photos;

      return (
        <div className="cd-main-scroll">
          <div className="cd-content-padding">
            <MediaGridView
              photos={displayPhotos || []}
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
                onOpenFocalModal={() => {}} // TODO: add focal modal logic
             />
          </div>
          <div className="cd-design-preview bg-black/10 flex-1">
             <PreviewPane 
                settings={dashboardState.designSettings}
                collectionTitle={collection?.name || ''}
                collectionDate={collection?.event_date || ''}
                coverPhotoUrl={photos.find(p => p.id === collection?.cover_photo_id)?.full_url || undefined}
                gridPhotos={photos as any}
                previewMode={dashboardState.previewMode}
                onPreviewModeChange={dashboardState.setPreviewMode}
                dashboardState={dashboardState}
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
       return <ActivityView activeTab={activeActivityTab} onTabChange={setActiveActivityTab} />;
    }

    return null;
  };

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
        onDeleteSet={() => {}} // TODO
        onManageSets={() => {}}
      />

      <main className="cd-main">
        <DashboardTopbar
          collectionName={collection?.name || ''}
          status={status}
          onStatusChange={(newStatus: 'DRAFT' | 'PUBLISHED') => setStatus(newStatus)}
          onPreview={() => window.open(`/gallery/${collection?.slug}`, '_blank')}
          onShare={() => {}}
          onBack={() => navigate('/dashboard')}
        />

        <div className="cd-content">
          {renderContent()}
        </div>
      </main>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onBrowse={() => fileInputRef.current?.click()}
        onDrop={() => {}} // TODO
        activeTab={activeMediaTab}
        onTabChange={setActiveMediaTab}
        isDragging={false}
        onDragOver={() => {}}
        onDragLeave={() => {}}
      />

      <SetModal
        isOpen={showAddSetModal}
        onClose={() => setShowAddSetModal(false)}
        onSave={handleSaveSet}
        title={editingSet ? 'Edit Set' : 'Add Set'}
        name={newSetName}
        setName={setNewSetName}
        description={newSetDescription}
        setDescription={setNewSetDescription}
        isSaving={savingSet}
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
            onUploadPhoto={() => {}} // TODO: add upload logic from dashboardState
            isUploading={false}
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
        onChange={() => {}} // TODO
      />
    </div>
  );
}
