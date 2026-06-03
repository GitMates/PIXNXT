import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { mobileGalleryService } from '../../services/mobileGallery.service';
import './MobileGallery.css';

const MobileGalleryEditor = () => {
  const { id, tab } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [gallery, setGallery] = useState(null);
  const [images, setImages] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Active accordion section in Design tab
  const [openSection, setOpenSection] = useState('cover');

  // Form states matching fields
  const [form, setForm] = useState({
    name: '',
    event_date: '',
    cover_style: 'none',
    theme_preset: 'echo',
    grid_style: 'vertical',
    color_theme: 'light',
    theme_color: '#8BDFDD',
    photographer_name: '',
    photographer_email: '',
    photographer_phone: '',
    photographer_instagram: '',
    photographer_website: '',
    cta_enabled: false,
    cta_text: 'Book a Session',
    cta_url: '',
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        const [gData, imgData, setRes] = await Promise.all([
          mobileGalleryService.getGalleryById(id),
          mobileGalleryService.getImages(id),
          mobileGalleryService.getSettings(id),
        ]);
        setGallery(gData);
        setImages(imgData);
        setSettings(setRes);

        // Populate edit form
        setForm({
          name: gData.name || '',
          event_date: gData.event_date || '',
          cover_style: gData.cover_style || 'none',
          theme_preset: gData.theme_preset || 'echo',
          grid_style: gData.grid_style || 'vertical',
          color_theme: gData.color_theme || 'light',
          theme_color: gData.theme_color || '#8BDFDD',
          photographer_name: gData.photographer_name || '',
          photographer_email: gData.photographer_email || '',
          photographer_phone: gData.photographer_phone || '',
          photographer_instagram: gData.photographer_instagram || '',
          photographer_website: gData.photographer_website || '',
          cta_enabled: gData.cta_enabled || false,
          cta_text: gData.cta_text || 'Book a Session',
          cta_url: gData.cta_url || '',
        });
      } catch (err) {
        console.error(err);
        alert('Failed to load gallery details');
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, [id]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await mobileGalleryService.updateGallery(id, form);
      setGallery(updated);
      alert('Gallery configurations updated successfully!');
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Upload actions
  const onFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await uploadFiles(files);
  };

  const uploadFiles = async (files) => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const uploaded = await mobileGalleryService.uploadImages(
        id,
        user.id,
        files,
        (progress) => setUploadProgress(progress)
      );
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteImage = async (imgId) => {
    if (!window.confirm('Delete this photo from gallery?')) return;
    try {
      await mobileGalleryService.deleteImage(imgId);
      setImages((prev) => prev.filter((im) => im.id !== imgId));
    } catch (err) {
      alert('Delete failed.');
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const getPublicUrl = () => {
    if (!gallery) return '#';
    return `${window.location.origin}/mobile-gallery/view/${gallery.slug}`;
  };

  const handleShare = () => {
    const url = getPublicUrl();
    try {
      navigator.clipboard.writeText(url);
      alert('Public link copied to clipboard!');
    } catch (_) {
      prompt('Copy this link:', url);
    }
  };

  if (loading) {
    return (
      <div className="mge-root">
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          Loading your Mobile App Studio...
        </div>
      </div>
    );
  }

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'P';

  return (
    <div className="mge-root">
      {/* ── Navbar ── */}
      <nav className="mga-navbar">
        <Link to="/dashboard" className="mga-logo">
          PIXNXT
        </Link>
        <div className="mga-divider" />
        <div className="mga-app-switcher" onClick={() => navigate('/mobile-gallery')}>
          <svg className="mga-app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
          <span className="mga-app-name">Mobile Gallery App</span>
        </div>
        <div className="mga-navbar-right">
          <div className="mga-avatar">{userInitial}</div>
        </div>
      </nav>

      {/* Centered Editor Container wrapping everything below global navbar */}
      <div className="mge-container" style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
        
        {/* ── Three-column Editor Sub Header ── */}
        <div className="mge-header" style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 'none' }}>
          {/* Left side: Back Button */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <button
              onClick={() => navigate('/mobile-gallery')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back
            </button>
          </div>

          {/* Center side: High-Fidelity Pixieset Initial Letter box / First thumbnail, and Gallery Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
            <div className="mge-header-logo-box" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}>
              {images.length > 0 ? (
                <img src={images[0].thumbnail_url || images[0].original_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
              ) : (
                gallery?.name ? gallery.name.charAt(0).toUpperCase() : 'Z'
              )}
            </div>
            <span className="mge-gal-name" style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>{gallery?.name}</span>
          </div>

          {/* Right side: Actions */}
          <div className="mge-header-actions" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            {/* Preview Dropdown button */}
            <div style={{ position: 'relative' }}>
              <button
                className="mge-preview-btn"
                onClick={() => window.open(getPublicUrl(), '_blank')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#333',
                  background: '#f1f1f1',
                  border: 'none',
                  borderRadius: 3
                }}
              >
                Preview
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>

            <button
              className="mge-share-btn"
              onClick={handleShare}
              style={{
                background: '#1ea69a',
                color: '#fff',
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: 'none',
                borderRadius: 3,
                boxShadow: '0 2px 6px rgba(30, 166, 154, 0.15)'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share
            </button>
          </div>
        </div>

        {/* ── Sub Navigation Tabs (Centered horizontally) ── */}
        <div className="mge-tabs" style={{ display: 'flex', justifyContent: 'center', gap: 36, borderBottom: '1px solid #f0f0f0', padding: '0 32px' }}>
          <span
            className={`mge-tab ${tab === 'photos' ? 'mge-tab-active' : ''}`}
            onClick={() => navigate(`/mobile-gallery/${id}/photos`)}
            style={{
              color: tab === 'photos' ? '#1ea69a' : '#888',
              borderBottomColor: tab === 'photos' ? '#1ea69a' : 'transparent',
              fontWeight: tab === 'photos' ? 600 : 500
            }}
          >
            Photos
          </span>
          <span
            className={`mge-tab ${tab === 'design' ? 'mge-tab-active' : ''}`}
            onClick={() => navigate(`/mobile-gallery/${id}/design`)}
            style={{
              color: tab === 'design' ? '#1ea69a' : '#888',
              borderBottomColor: tab === 'design' ? '#1ea69a' : 'transparent',
              fontWeight: tab === 'design' ? 600 : 500
            }}
          >
            Design
          </span>
          <span
            className={`mge-tab ${tab === 'app-settings' ? 'mge-tab-active' : ''}`}
            onClick={() => navigate(`/mobile-gallery/${id}/app-settings`)}
            style={{
              color: tab === 'app-settings' ? '#1ea69a' : '#888',
              borderBottomColor: tab === 'app-settings' ? '#1ea69a' : 'transparent',
              fontWeight: tab === 'app-settings' ? 600 : 500
            }}
          >
            App Settings
          </span>
        </div>


      {/* ── TAB CONTENT: PHOTOS ── */}
      {tab === 'photos' && (
        <div
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {/* Subtle drag overlay active indicator */}
          {dragOver && (
            <div className="mge-drag-active-overlay">
              <span className="mge-drag-overlay-text">Drop photos here to upload</span>
            </div>
          )}

          <div className="mge-photos-bar" style={{ padding: '14px 32px' }}>
            <span className="mge-photo-count" style={{ fontSize: 13, color: '#666' }}>{images.length} photos</span>
            <button className="mge-add-btn" onClick={() => fileInputRef.current?.click()} style={{ color: '#1ea69a' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Photos
            </button>
            <input
              type="file"
              multiple
              accept="image/*"
              ref={fileInputRef}
              onChange={onFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Uploading State */}
          {isUploading && (
            <div className="mge-progress" style={{ margin: '0 32px 16px' }}>
              <div className="mge-progress-bar">
                <div className="mge-progress-fill" style={{ width: `${uploadProgress}%`, background: '#1ea69a' }} />
              </div>
              <div className="mge-progress-text" style={{ color: '#1ea69a' }}>Uploading photos... {uploadProgress}%</div>
            </div>
          )}

          {/* Re-designed empty state matching first image */}
          {images.length === 0 ? (
            <div className="mge-empty-state-wrap">
              <div className="mge-empty-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <polyline points="21 15 16 10 5 21"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                </svg>
              </div>
              <h3 className="mge-empty-text">You don't have any photos yet</h3>
              <button className="mge-empty-btn-add" onClick={() => fileInputRef.current?.click()}>
                Add Photos
              </button>
            </div>
          ) : (
            <div className="mge-photos-grid">
              {images.map((img) => (
                <div key={img.id} className="mge-photo-item">
                  <img src={img.thumbnail_url || img.original_url} alt="" />
                  <button className="mge-photo-del" onClick={() => handleDeleteImage(img.id)} title="Delete Photo">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ── TAB CONTENT: DESIGN ── */}
      {tab === 'design' && (
        <div className="mge-design-split">
          <div className="mge-design-form" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px' }}>
            <div className="mge-design-form-inner" style={{ width: '100%', maxWidth: 580 }}>
              {/* 1. Cover Style Accordion */}
              <div className="mge-section">
                <div className="mge-section-head" onClick={() => setOpenSection(openSection === 'cover' ? '' : 'cover')}>
                  <span className="mge-section-title">Cover Style</span>
                  <svg style={{ transform: openSection === 'cover' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                {openSection === 'cover' && (
                  <div className="mge-section-body" style={{ padding: '24px 20px' }}>
                    
                    {/* Photo Cover Section Header with custom actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#333', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Photo Cover</span>
                      <div style={{ display: 'flex', gap: 14 }}>
                        <button 
                          onClick={() => fileInputRef.current?.click()} 
                          style={{ background: 'none', border: 'none', color: '#1ea69a', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          Change photo
                        </button>
                        <button 
                          onClick={() => alert('Focal point updated successfully')} 
                          style={{ background: 'none', border: 'none', color: '#1ea69a', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                          Set focal
                        </button>
                      </div>
                    </div>

                    {/* Silhouettes in a premium gray panel */}
                    <div className="mge-cover-row" style={{ display: 'flex', gap: 16, background: '#f8f9fa', border: '1px solid #eeeeee', borderRadius: 4, padding: '24px 16px', justifyContent: 'space-around', marginBottom: 28 }}>
                      
                      {/* Full option */}
                      <div 
                        className={`mge-cover-opt ${form.cover_style === 'full' ? 'sel' : ''}`} 
                        onClick={() => updateForm('cover_style', 'full')}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          paddingBottom: 8,
                          borderBottom: form.cover_style === 'full' ? '3px solid #1ea69a' : '3px solid transparent',
                          transition: 'border-color 0.15s'
                        }}
                      >
                        <div className="mge-cover-thumb mge-ct-full" style={{ width: 62, height: 98, borderRadius: 6, border: form.cover_style === 'full' ? '2px solid #1ea69a' : '1px solid #dcdcdc', background: '#fff', overflow: 'hidden', padding: 4, display: 'flex', flexDirection: 'column' }}>
                          <div className="mge-ct-img" style={{ flex: 1, background: '#dfdfdf', borderRadius: 3 }} />
                        </div>
                        <span className="mge-cover-label" style={{ fontSize: 12, marginTop: 8, fontWeight: form.cover_style === 'full' ? 700 : 500, color: form.cover_style === 'full' ? '#1ea69a' : '#555' }}>Full</span>
                      </div>

                      {/* Third option */}
                      <div 
                        className={`mge-cover-opt ${form.cover_style === 'third' ? 'sel' : ''}`} 
                        onClick={() => updateForm('cover_style', 'third')}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          paddingBottom: 8,
                          borderBottom: form.cover_style === 'third' ? '3px solid #1ea69a' : '3px solid transparent',
                          transition: 'border-color 0.15s'
                        }}
                      >
                        <div className="mge-cover-thumb mge-ct-third" style={{ width: 62, height: 98, borderRadius: 6, border: form.cover_style === 'third' ? '2px solid #1ea69a' : '1px solid #dcdcdc', background: '#fff', overflow: 'hidden', padding: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div className="mge-ct-img" style={{ height: 32, background: '#dfdfdf', borderRadius: 3 }} />
                          <div className="mge-ct-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                          </div>
                        </div>
                        <span className="mge-cover-label" style={{ fontSize: 12, marginTop: 8, fontWeight: form.cover_style === 'third' ? 700 : 500, color: form.cover_style === 'third' ? '#1ea69a' : '#555' }}>Third</span>
                      </div>

                      {/* None option */}
                      <div 
                        className={`mge-cover-opt ${form.cover_style === 'none' ? 'sel' : ''}`} 
                        onClick={() => updateForm('cover_style', 'none')}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          paddingBottom: 8,
                          borderBottom: form.cover_style === 'none' ? '3px solid #1ea69a' : '3px solid transparent',
                          transition: 'border-color 0.15s'
                        }}
                      >
                        <div className="mge-cover-thumb mge-ct-none" style={{ width: 62, height: 98, borderRadius: 6, border: form.cover_style === 'none' ? '2px solid #1ea69a' : '1px solid #dcdcdc', background: '#fff', overflow: 'hidden', padding: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div className="mge-ct-date" style={{ height: 4, width: '40%', background: '#eaeaea', borderRadius: 1, margin: '2px auto 0' }} />
                          <div className="mge-ct-name" style={{ height: 6, width: '70%', background: '#dfdfdf', borderRadius: 1, margin: '0 auto 4px' }} />
                          <div className="mge-ct-grid2" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                          </div>
                        </div>
                        <span className="mge-cover-label" style={{ fontSize: 12, marginTop: 8, fontWeight: form.cover_style === 'none' ? 700 : 500, color: form.cover_style === 'none' ? '#1ea69a' : '#555' }}>None</span>
                      </div>

                    </div>

                    {/* Theme Subsection */}
                    <div style={{ marginTop: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#333', letterSpacing: '0.02em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Theme</span>
                      <div className="mge-theme-row" style={{ display: 'flex', gap: 16, background: '#f8f9fa', border: '1px solid #eeeeee', borderRadius: 4, padding: '20px 12px', justifyContent: 'space-around' }}>
                        {[
                          { id: 'echo', label: 'Echo', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&auto=format&fit=crop&q=60' },
                          { id: 'spring', label: 'Spring', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&auto=format&fit=crop&q=60' },
                          { id: 'lark', label: 'Lark', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=60' },
                          { id: 'sage', label: 'Sage', url: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=300&auto=format&fit=crop&q=60' },
                        ].map((t) => (
                          <div 
                            key={t.id} 
                            onClick={() => updateForm('theme_preset', t.id)}
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              cursor: 'pointer', 
                              position: 'relative',
                              paddingBottom: 8,
                              borderBottom: form.theme_preset === t.id ? '2px solid #1ea69a' : '2px solid transparent'
                            }}
                          >
                            <div style={{ width: 84, height: 106, borderRadius: 4, overflow: 'hidden', border: form.theme_preset === t.id ? '2px solid #1ea69a' : '1px solid #e0e0e0', marginBottom: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
                              <img src={t.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: form.theme_preset === t.id ? 700 : 500, color: form.theme_preset === t.id ? '#1ea69a' : '#555' }}>{t.label}</span>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: 12, color: '#888', marginTop: 10, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
                        Each cover theme offers a unique font and layout giving your cover photo an amazing first impression.
                      </p>
                    </div>

                  </div>
                )}
              </div>

              {/* 2. Layout Grid Accordion */}
              <div className="mge-section">
                <div className="mge-section-head" onClick={() => setOpenSection(openSection === 'layout' ? '' : 'layout')}>
                  <span className="mge-section-title">Layout & Color Mode</span>
                  <svg style={{ transform: openSection === 'layout' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                {openSection === 'layout' && (
                  <div className="mge-section-body">
                    <div className="mge-field">
                      <label className="mge-label">Grid Layout Orientation</label>
                      <select className="mge-select" value={form.grid_style} onChange={(e) => updateForm('grid_style', e.target.value)}>
                        <option value="vertical">Vertical Masonry (Recommended)</option>
                        <option value="horizontal">Horizontal Grid Rows</option>
                      </select>
                      <p className="mge-select-note">Pinterest-style vertical flow adapts beautifully to all client screens.</p>
                    </div>

                    <div className="mge-field" style={{ marginTop: 16 }}>
                      <label className="mge-label">App Theme Color Mode</label>
                      <select className="mge-select" value={form.color_theme} onChange={(e) => updateForm('color_theme', e.target.value)}>
                        <option value="light">Pure White Minimalist Theme</option>
                        <option value="dark">Sleek Jet Black Theme</option>
                      </select>
                    </div>

                    <div className="mge-field" style={{ marginTop: 16 }}>
                      <label className="mge-label">Accent Highlight Color hex</label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input
                          type="color"
                          value={form.theme_color}
                          onChange={(e) => updateForm('theme_color', e.target.value)}
                          style={{ border: 'none', width: 44, height: 38, cursor: 'pointer', background: 'none' }}
                        />
                        <input
                          type="text"
                          className="mge-input"
                          style={{ width: 100 }}
                          value={form.theme_color}
                          onChange={(e) => updateForm('theme_color', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Text Info Accordion */}
              <div className="mge-section">
                <div className="mge-section-head" onClick={() => setOpenSection(openSection === 'typography' ? '' : 'typography')}>
                  <span className="mge-section-title">App Details & Event Date</span>
                  <svg style={{ transform: openSection === 'typography' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                {openSection === 'typography' && (
                  <div className="mge-section-body">
                    <div className="mge-field">
                      <label className="mge-label">App Display Title</label>
                      <input className="mge-input" value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
                    </div>
                    <div className="mge-field">
                      <label className="mge-label">Event / Session Date</label>
                      <input className="mge-input" type="date" value={form.event_date} onChange={(e) => updateForm('event_date', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Save Bar */}
              <div className="mge-save-bar" style={{ padding: '24px 0', borderTop: 'none' }}>
                <button className="mga-ghost-btn" style={{ padding: '8px 18px' }} onClick={() => navigate('/mobile-gallery')}>
                  Discard
                </button>
                <button className="mge-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving Changes...' : 'Save Design Config'}
                </button>
              </div>
            </div>
          </div>


          {/* RIGHT PANEL: Live Phone Mock Preview */}
          <div className="mge-design-preview">
            <div className="mga-phone" style={{ background: form.color_theme === 'dark' ? '#121212' : '#ffffff' }}>
              <div style={{ height: '100%', maxHeight: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="mga-phone-scroll-body">
                {/* 1. Cover Image Header mock preview */}
                {form.cover_style !== 'none' && (
                  <div className="mga-phone-cover" style={{ height: form.cover_style === 'full' ? 220 : 120, flexShrink: 0 }}>
                    {images.length > 0 ? (
                      <img src={images[0].original_url} alt="" />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', fontSize: 11 }}>No cover photo</div>
                    )}
                    <div className="mga-phone-cover-overlay">
                      <div className="mga-phone-date">{form.event_date}</div>
                      <div className="mga-phone-gname">{form.name || 'Sarah & John'}</div>
                    </div>
                  </div>
                )}

                {/* 2. Header Title mock preview (if cover is none) */}
                {form.cover_style === 'none' && (
                  <div style={{ padding: '24px 14px 12px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                    <div style={{ fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{form.event_date}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: form.color_theme === 'dark' ? '#fff' : '#111' }}>{form.name || 'Untitled App'}</div>
                  </div>
                )}

                {/* 3. Photos grid preview inside phone mockup */}
                <div style={{ padding: 6, flex: 1 }}>
                  <div className="mga-phone-grid">
                    {images.slice(0, 12).map((im) => (
                      <div key={im.id} className="mga-phone-cell">
                        <img src={im.thumbnail_url || im.original_url} alt="" />
                      </div>
                    ))}
                    {images.length === 0 && (
                      <>
                        <div className="mga-phone-cell" />
                        <div className="mga-phone-cell" />
                      </>
                    )}
                  </div>
                </div>

                {/* 4. Optional Contact CTA Button */}
                {form.cta_enabled && (
                  <div style={{ padding: 12, textAlign: 'center', marginTop: 'auto', flexShrink: 0 }}>
                    <button
                      style={{
                        background: form.theme_color,
                        color: '#222',
                        border: 'none',
                        borderRadius: 24,
                        padding: '8px 16px',
                        fontSize: 10,
                        fontWeight: 'bold',
                        width: '100%',
                        cursor: 'default'
                      }}
                    >
                      {form.cta_text}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: APP SETTINGS ── */}
      {tab === 'app-settings' && (
        <div style={{ flex: 1, overflowY: 'auto' }} className="mge-settings-wrap">
          <div style={{ maxWidth: 560 }}>
            {/* Branding Contact */}
            <div style={{ marginBottom: 36 }}>
              <h3 className="mga-form-section-title">Photographer Branding Details</h3>
              <div className="mge-field">
                <label className="mge-label">Studio Business Name</label>
                <input className="mge-input" value={form.photographer_name} onChange={(e) => updateForm('photographer_name', e.target.value)} />
              </div>
              <div className="mge-field">
                <label className="mge-label">Contact Email</label>
                <input className="mge-input" value={form.photographer_email} onChange={(e) => updateForm('photographer_email', e.target.value)} />
              </div>
              <div className="mge-field">
                <label className="mge-label">Phone Number</label>
                <input className="mge-input" value={form.photographer_phone} onChange={(e) => updateForm('photographer_phone', e.target.value)} />
              </div>
              <div className="mge-field">
                <label className="mge-label">Instagram Handle</label>
                <input className="mge-input" value={form.photographer_instagram} onChange={(e) => updateForm('photographer_instagram', e.target.value)} />
              </div>
              <div className="mge-field">
                <label className="mge-label">Website URL</label>
                <input className="mge-input" value={form.photographer_website} onChange={(e) => updateForm('photographer_website', e.target.value)} />
              </div>
            </div>

            {/* Custom CTA Toggle & Details */}
            <div style={{ marginBottom: 36 }}>
              <h3 className="mga-form-section-title">Custom CTA (Call To Action) Action Button</h3>
              <div className="mge-toggle-row">
                <span className="mge-toggle-label">Enable App Footer Action Button</span>
                <div className={`mge-toggle ${form.cta_enabled ? 'on' : ''}`} onClick={() => updateForm('cta_enabled', !form.cta_enabled)}>
                  <div className="mge-toggle-knob" />
                </div>
              </div>
              {form.cta_enabled && (
                <div style={{ marginTop: 18 }}>
                  <div className="mge-field">
                    <label className="mge-label">Button Display Label</label>
                    <input className="mge-input" value={form.cta_text} onChange={(e) => updateForm('cta_text', e.target.value)} />
                  </div>
                  <div className="mge-field">
                    <label className="mge-label">Action Target Link URL</label>
                    <input className="mge-input" type="url" value={form.cta_url} onChange={(e) => updateForm('cta_url', e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Discard & Save Actions */}
            <div style={{ display: 'flex', gap: 12, paddingTop: 16 }}>
              <button className="mga-ghost-btn" onClick={() => navigate('/mobile-gallery')}>
                Cancel
              </button>
              <button className="mge-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default MobileGalleryEditor;
