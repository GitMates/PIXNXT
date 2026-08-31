import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { mobileGalleryService } from '../../services/mobileGallery.service';
import MobileGalleryLayout from '../../components/mobile-gallery/MobileGalleryLayout';
import AppPhotosPanel from '../../components/mobile-gallery/AppPhotosPanel';
import AppDesignPanel from '../../components/mobile-gallery/AppDesignPanel';
import AppSettingsPanel from '../../components/mobile-gallery/AppSettingsPanel';
import AppPreviewDropdown from '../../components/mobile-gallery/AppPreviewDropdown';
import { ClientGallerySubpageTabs } from '../../components/features/ClientGallery/ClientGalleryPageShell';
import { AppDetailIconButton, useAppIconEditor } from '../../components/mobile-gallery/useAppIconEditor';
import { AppLoader } from '../../components/ui/AppLoading';
import './MobileGallery.css';

const TABS = [
  { id: 'photos', label: 'Photos' },
  { id: 'design', label: 'Design' },
  { id: 'settings', label: 'App Settings' },
];

const AppDetail = () => {
  const { appId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('photos');

  const { openIconEditor, uploadingIcon, iconModal } = useAppIconEditor(app, user?.id, setApp);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await mobileGalleryService.getApp(user.id, appId);
        if (!cancelled) setApp(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setApp(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, appId]);

  if (loading) {
    return (
      <MobileGalleryLayout>
        <AppLoader label="Loading app" variant="page-short" className="mg-loading app-loader" />
      </MobileGalleryLayout>
    );
  }

  if (!app) {
    return (
      <MobileGalleryLayout>
        <div className="mg-content">
          <div className="mg-empty">
            <h2>App not found</h2>
            <p>This Mobile Gallery App may have been deleted.</p>
            <button type="button" className="mg-btn-primary neu-pill" onClick={() => navigate('/mobile-gallery')}>
              Back to Apps
            </button>
          </div>
        </div>
      </MobileGalleryLayout>
    );
  }

  return (
    <MobileGalleryLayout>
      <div className="mg-app-detail">
        <div className="mg-app-detail-header-bar">
          <header className="mg-app-detail-header mg-content mg-content--wide">
            <div className="mg-app-detail-info">
              <button
                type="button"
                className="mg-app-detail-back"
                onClick={() => navigate('/mobile-gallery')}
                aria-label="Back to apps"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <AppDetailIconButton app={app} onEdit={openIconEditor} uploading={uploadingIcon} />
              <h1 className="mg-app-detail-name cg-page-title">{app.name}</h1>
            </div>
            <div className="mg-app-detail-actions">
              <AppPreviewDropdown appId={app.id} appName={app.name} />
              <button
                type="button"
                className="mg-btn-primary neu-pill"
                onClick={() => navigate(`/mobile-gallery/app/${app.id}/share`)}
              >
                Share →
              </button>
            </div>
          </header>
        </div>

        <div className="mg-app-detail-tabs-bar">
          <div className="mg-content mg-content--wide mg-app-detail-tabs-wrap">
            <ClientGallerySubpageTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
          </div>
        </div>

        <div className="mg-app-detail-content mg-content mg-content--wide">
          {activeTab === 'photos' && (
            <AppPhotosPanel
              app={app}
              photographerId={user?.id}
              onAppUpdated={setApp}
            />
          )}

          {activeTab === 'design' && (
            <AppDesignPanel
              app={app}
              photographerId={user?.id}
              onAppUpdated={setApp}
              onEditIcon={openIconEditor}
              iconUploading={uploadingIcon}
            />
          )}
          {activeTab === 'settings' && (
            <AppSettingsPanel
              app={app}
              photographerId={user?.id}
              onAppUpdated={setApp}
            />
          )}
        </div>
      </div>
      {iconModal}
    </MobileGalleryLayout>
  );
};

export default AppDetail;
