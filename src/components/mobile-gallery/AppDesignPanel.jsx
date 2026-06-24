import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { mobileGalleryService } from '../../services/mobileGallery.service';

import { mobileGalleryPhotosService } from '../../services/mobileGalleryPhotos.service';

import { storageService } from '../../services/storage.service';

import { getWallpaperUrl } from '../../lib/mobileGalleryPreviewFormat';

import {
  getAppDesignSettings,
  getDesignPreviewBackgroundUrl,
  getThemeById,
  MG_COVER_STYLES,
  MG_THEMES,
} from '../../lib/mobileGalleryDesign';

import { sortMobileGalleryPhotos } from '../../lib/mobileGalleryPhotoSort';

import FocalPointModal from './FocalPointModal';
import ThemeCoverContent, { ThemeThumbContent } from './ThemeCoverContent';
import MobileGalleryPhotoGrid from './MobileGalleryPhotoGrid';

import '../../pages/mobile-gallery/MobileGallery.css';



function getAppInitial(name) {

  const trimmed = String(name || '').trim();

  return trimmed ? trimmed.charAt(0).toUpperCase() : 'A';

}



function ChevronIcon({ open }) {

  return (

    <svg

      width="14"

      height="14"

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth="2"

      className={`mg-design-chevron${open ? ' mg-design-chevron--open' : ''}`}

      aria-hidden

    >

      <polyline points="9 18 15 12 9 6" />

    </svg>

  );

}



function CoverLayoutIcon({ type }) {

  if (type === 'full') {

    return (

      <svg width="40" height="64" viewBox="0 0 40 64" aria-hidden>

        <rect x="4" y="4" width="32" height="56" rx="2" fill="#fff" stroke="#ccc" />

        <rect x="8" y="8" width="24" height="48" fill="#20a398" opacity="0.35" />

      </svg>

    );

  }

  if (type === 'third') {

    return (

      <svg width="40" height="64" viewBox="0 0 40 64" aria-hidden>

        <rect x="4" y="4" width="32" height="56" rx="2" fill="#fff" stroke="#ccc" />

        <rect x="8" y="8" width="24" height="14" fill="#20a398" opacity="0.35" />

        <rect x="11" y="28" width="10" height="1.5" rx="0.75" fill="#bbb" />

        <rect x="11" y="32" width="18" height="2" rx="1" fill="#999" />

        <rect x="8" y="42" width="7" height="5" fill="#ddd" />

        <rect x="16.5" y="42" width="7" height="5" fill="#ddd" />

        <rect x="25" y="42" width="7" height="5" fill="#ddd" />

      </svg>

    );

  }

  return (

    <svg width="40" height="64" viewBox="0 0 40 64" aria-hidden>

      <rect x="4" y="4" width="32" height="56" rx="2" fill="#fff" stroke="#ccc" />

      <rect x="11" y="12" width="10" height="1.5" rx="0.75" fill="#bbb" />

      <rect x="11" y="16" width="18" height="2" rx="1" fill="#999" />

      <rect x="8" y="26" width="7" height="5" fill="#ddd" />

      <rect x="16.5" y="26" width="7" height="5" fill="#ddd" />

      <rect x="25" y="26" width="7" height="5" fill="#ddd" />

      <rect x="8" y="33" width="7" height="5" fill="#ddd" />

      <rect x="16.5" y="33" width="7" height="5" fill="#ddd" />

      <rect x="25" y="33" width="7" height="5" fill="#ddd" />

    </svg>

  );

}



function DesignAccordion({ id, title, open, onToggle, children }) {

  return (

    <section className="mg-design-section">

      <button type="button" className="mg-design-section-head" onClick={() => onToggle(id)} aria-expanded={open}>

        <span>{title}</span>

        <ChevronIcon open={open} />

      </button>

      {open && <div className="mg-design-section-body">{children}</div>}

    </section>

  );

}



function DesignPhonePreview({
  app,
  design,
  photos,
  previewMode,
  wallpaperUrl,
  previewBgUrl,
  iconUrl,
}) {
  const scrollRef = useRef(null);
  const gridRef = useRef(null);
  const theme = getThemeById(design.theme);
  const isDark = design.color_theme === 'dark';
  const focalX = design.cover_focal_x ?? 50;
  const focalY = design.cover_focal_y ?? 50;

  useEffect(() => {
    if (previewMode !== 'layout') return;

    const scrollEl = scrollRef.current;
    const gridEl = gridRef.current;
    if (!scrollEl || !gridEl) return;

    const scrollToGrid = () => {
      scrollEl.scrollTo({
        top: gridEl.offsetTop,
        behavior: 'smooth',
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToGrid);
    });
  }, [previewMode, design.grid_style, design.color_theme]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [design.cover_style]);

  const coverStyle = {
    backgroundImage: previewBgUrl && design.cover_style !== 'none' ? `url(${previewBgUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: `${focalX}% ${focalY}%`,
  };



  if (previewMode === 'icon') {

    const appSlot = 7;

    const gridItems = Array.from({ length: 20 }).map((_, i) => {

      if (i === appSlot) {

        return (

          <div key="app" className="mg-design-homescreen-app">

            {iconUrl ? (

              <img src={iconUrl} alt="" className="mg-design-homescreen-app-icon" />

            ) : (

              <div className="mg-design-homescreen-app-icon mg-design-homescreen-app-icon--letter">

                {getAppInitial(app?.name)}

              </div>

            )}

            <span>{app?.name}</span>

          </div>

        );

      }

      return <div key={i} className="mg-design-homescreen-app-placeholder" />;

    });



    return (

      <div className="mg-design-phone mg-design-phone--homescreen">

        <div className="mg-design-homescreen-bg">

          <div className="mg-design-homescreen-status" aria-hidden>
            <span className="mg-design-homescreen-time">9:00 AM</span>
          </div>

          <div className="mg-design-homescreen-grid">{gridItems}</div>

          <div className="mg-design-homescreen-dock">

            {Array.from({ length: 4 }).map((_, i) => (

              <div key={i} className="mg-design-homescreen-dock-icon" />

            ))}

          </div>

        </div>

      </div>

    );

  }



  const showCoverImage = previewBgUrl && design.cover_style !== 'none';
  const coverImageStyle = showCoverImage
    ? {
        backgroundImage: `url(${previewBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: `${focalX}% ${focalY}%`,
      }
    : undefined;

  return (
    <div
      className={`mg-design-phone mg-design-phone--scrollable${isDark ? ' mg-design-phone--dark' : ''}`}
      key={`phone-${design.theme}-${previewBgUrl}-${design.color_theme}`}
    >
      <div className="mg-design-phone-scroll" ref={scrollRef}>
        <div
          key={previewBgUrl}
          className={`mg-design-cover-preview mg-design-cover-preview--${design.cover_style} mg-design-cover-preview--theme-${theme.id}${isDark ? ' mg-design-cover-preview--dark' : ''}`}
          style={design.cover_style === 'full' ? coverStyle : undefined}
        >
          {design.cover_style === 'third' && (
            <div
              className={`mg-design-cover-third-img${showCoverImage ? '' : ' mg-design-cover-third-img--empty'}`}
              style={coverImageStyle}
            />
          )}
          {design.cover_style === 'full' && <div className="mg-design-cover-overlay" />}
          <div className={`mg-design-cover-body mg-design-cover-body--${design.cover_style}`}>
            <ThemeCoverContent
              key={design.theme}
              themeId={design.theme}
              appName={app?.name}
              eventDate={app?.event_date}
              coverStyle={design.cover_style}
              variant="preview"
            />
          </div>
        </div>
        <div className="mg-design-grid-preview" ref={gridRef}>
          <MobileGalleryPhotoGrid
            photos={photos}
            gridStyle={design.grid_style}
            variant="design"
            maxPhotos={24}
          />
        </div>
      </div>
      <DesignBottomNav isDark={isDark} />
    </div>
  );
}



function DesignBottomNav({ isDark = false }) {

  return (

    <nav className={`mg-design-bottom-nav${isDark ? ' mg-design-bottom-nav--dark' : ''}`} aria-hidden>

      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">

        <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />

      </svg>

      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">

        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />

      </svg>

      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">

        <line x1="22" y1="2" x2="11" y2="13" />

        <polygon points="22 2 15 22 11 13 2 9 22 2" />

      </svg>

      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">

        <circle cx="12" cy="8" r="4" />

        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />

      </svg>

    </nav>

  );

}



const AppDesignPanel = ({ app, photographerId, onAppUpdated, onEditIcon, iconUploading = false }) => {

  const coverInputRef = useRef(null);
  const saveTimerRef = useRef(null);

  const [design, setDesign] = useState(() => getAppDesignSettings(app));
  const [photos, setPhotos] = useState([]);
  const [openSection, setOpenSection] = useState('cover');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showFocalModal, setShowFocalModal] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState(() => app?.cover_image_url || null);
  const [iconImageUrl, setIconImageUrl] = useState(() => app?.icon_url || null);

  useEffect(() => {
    setDesign(getAppDesignSettings(app));
  }, [app]);

  useEffect(() => {
    setCoverImageUrl(app?.cover_image_url || null);
  }, [app?.cover_image_url]);

  useEffect(() => {
    setIconImageUrl(app?.icon_url || null);
  }, [app?.icon_url]);



  useEffect(() => {

    if (!photographerId || !app?.id) return;

    mobileGalleryPhotosService.getPhotos(photographerId, app.id).then((data) => {

      setPhotos(sortMobileGalleryPhotos(data, 'position'));

    }).catch(() => setPhotos([]));

  }, [photographerId, app?.id]);



  const wallpaperUrl = useMemo(
    () => getWallpaperUrl(app, photos, coverImageUrl),
    [coverImageUrl, app, photos]
  );
  const previewBgUrl = useMemo(
    () => getDesignPreviewBackgroundUrl(app, photos, design.theme, coverImageUrl),
    [app, photos, design.theme, coverImageUrl]
  );



  const previewMode = openSection === 'icon' ? 'icon' : openSection === 'layout' ? 'layout' : 'cover';



  const showSaveToast = useCallback(() => {

    setSaveToast(true);

    setTimeout(() => setSaveToast(false), 2800);

  }, []);



  const saveAppFields = useCallback(
    async (appPatch, nextDesign = design, showToast = true) => {
      if (!photographerId || !app?.id) return;
      try {
        const updated = await mobileGalleryService.updateApp(photographerId, app.id, {
          ...appPatch,
          settings: { ...(app.settings || {}), design: nextDesign },
        });
        onAppUpdated?.(updated);
        if (showToast) showSaveToast();
        return updated;
      } catch (err) {
        console.error('Failed to save app settings', err);
        throw err;
      }
    },
    [photographerId, app, design, onAppUpdated, showSaveToast]
  );

  const persistDesign = useCallback(
    (nextDesign, appPatch = {}, showToast = true) => {
      setDesign(nextDesign);
      if (!photographerId || !app?.id) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await saveAppFields(appPatch, nextDesign, showToast);
        } catch {
          /* logged in saveAppFields */
        }
      }, 400);
    },
    [photographerId, app?.id, saveAppFields]
  );



  const updateDesign = (patch, appPatch) => {

    const next = { ...design, ...patch };

    persistDesign(next, appPatch);

  };



  const handleFocalChange = ({ x, y }) => {

    const next = { ...design, cover_focal_x: x, cover_focal_y: y };

    persistDesign(next, {}, false);

  };



  const toggleSection = (id) => {

    setOpenSection((current) => (current === id ? '' : id));

  };



  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !photographerId || !app?.id) return;
    setUploadingCover(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `photographers/${photographerId}/mobile-gallery/${app.id}/cover_${Date.now()}.${ext}`;
      const result = await storageService.upload(path, file);
      setCoverImageUrl(result.url);
      onAppUpdated?.({ ...app, cover_image_url: result.url });
      await saveAppFields({ cover_image_url: result.url }, design);
    } catch (err) {
      console.error(err);
      alert('Failed to upload cover photo.');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };



  useEffect(() => () => {

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

  }, []);



  return (

    <>

      <div className="mg-design-layout">

        <div className="mg-design-controls">

          <DesignAccordion id="cover" title="Cover Style" open={openSection === 'cover'} onToggle={toggleSection}>

            <div className="mg-design-cover-actions">

              <button type="button" className="mg-design-link-btn" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>

                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>

                  <rect x="3" y="3" width="18" height="18" rx="2" />

                  <circle cx="8.5" cy="8.5" r="1.5" />

                  <polyline points="21 15 16 10 5 21" />

                </svg>

                {uploadingCover ? 'Uploading…' : 'Change photo'}

              </button>

              <button

                type="button"

                className="mg-design-link-btn"

                onClick={() => setShowFocalModal(true)}

                disabled={!wallpaperUrl}

              >

                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>

                  <circle cx="12" cy="12" r="10" />

                  <circle cx="12" cy="12" r="3" />

                </svg>

                Set focal

              </button>

              <input ref={coverInputRef} type="file" accept="image/*" className="mg-design-file-input" onChange={handleCoverUpload} />
            </div>

            <p className="mg-design-help mg-design-help--inline">
              Change photo sets the cover wallpaper shown on your app splash screen. This is separate from the app icon.
            </p>



            <div className="mg-design-cover-layouts">
              {MG_COVER_STYLES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`mg-design-cover-layout${design.cover_style === id ? ' mg-design-cover-layout--active' : ''}`}
                  onClick={() => updateDesign({ cover_style: id })}
                >
                  <CoverLayoutIcon type={id} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="mg-design-theme-block">
              <h3 className="mg-design-subsection-title">Theme</h3>
              <div className="mg-design-themes">
                {MG_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`mg-design-theme${design.theme === theme.id ? ' mg-design-theme--active' : ''}`}
                    onClick={() => updateDesign({ theme: theme.id })}
                  >
                    <div
                      className={`mg-design-theme-thumb mg-design-theme-thumb--${theme.id}`}
                      style={{ backgroundImage: `url(${theme.thumbImage})` }}
                    >
                      <div className="mg-design-theme-thumb-overlay" />
                      <ThemeThumbContent theme={theme} />
                    </div>
                    <span className="mg-design-theme-label">{theme.label}</span>
                  </button>
                ))}
              </div>
              <p className="mg-design-help">
                Each cover theme offers a unique font and layout giving your cover photo an amazing first impression.
              </p>
            </div>
          </DesignAccordion>

          <DesignAccordion id="layout" title="Photos Layout &amp; Color" open={openSection === 'layout'} onToggle={toggleSection}>

            <label className="mg-design-field">

              <span className="mg-design-field-label">Grid Style</span>

              <select

                className="mg-design-select"

                value={design.grid_style}

                onChange={(e) => updateDesign({ grid_style: e.target.value })}

              >

                <option value="vertical">Vertical</option>

                <option value="horizontal">Horizontal</option>

              </select>

              <p className="mg-design-help">

                Vertical emphasizes portrait photos, and Horizontal emphasizes landscape photos.

              </p>

            </label>



            <label className="mg-design-field">

              <span className="mg-design-field-label">Color Theme</span>

              <select

                className="mg-design-select"

                value={design.color_theme}

                onChange={(e) => updateDesign({ color_theme: e.target.value })}

              >

                <option value="light">Light</option>

                <option value="dark">Dark</option>

              </select>

              <p className="mg-design-help">Choose between a light or dark theme that best suits your photos.</p>

            </label>

          </DesignAccordion>



          <DesignAccordion id="icon" title="App Icon" open={openSection === 'icon'} onToggle={toggleSection}>

            <div className="mg-design-icon-panel">

              <div className="mg-design-icon-preview-box">

                {iconImageUrl ? (

                  <img src={iconImageUrl} alt="" />

                ) : (

                  <div className="mg-design-icon-letter">{getAppInitial(app?.name)}</div>

                )}

                <button type="button" className="mg-design-add-icon" onClick={() => onEditIcon?.()} disabled={iconUploading}>

                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>

                    <path d="M12 20h9" />

                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />

                  </svg>

                  {iconUploading ? 'Uploading…' : 'Add Icon'}

                </button>

              </div>

              <p className="mg-design-help">

                Edit the image used for the App&apos;s icon when it has been installed on your client&apos;s phone homescreen.

              </p>

            </div>

          </DesignAccordion>

        </div>



        <div className="mg-design-preview-wrap">

          <DesignPhonePreview
            app={app}
            design={design}
            photos={photos}
            previewMode={previewMode}
            wallpaperUrl={wallpaperUrl}
            previewBgUrl={previewBgUrl}
            iconUrl={iconImageUrl}
          />

          {previewMode === 'layout' && (

            <p className="mg-design-preview-disclaimer">The images used above are for preview purposes only.</p>

          )}

        </div>

      </div>



      <FocalPointModal

        open={showFocalModal}

        coverUrl={wallpaperUrl}

        focalX={design.cover_focal_x}

        focalY={design.cover_focal_y}

        onChange={handleFocalChange}

        onClose={() => {

          setShowFocalModal(false);

          showSaveToast();

        }}

      />

      {saveToast && (

        <div className="mg-design-save-toast" role="status">

          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>

            <polyline points="20 6 9 17 4 12" />

          </svg>

          Changes successfully saved.

        </div>

      )}

    </>

  );

};



export default AppDesignPanel;


