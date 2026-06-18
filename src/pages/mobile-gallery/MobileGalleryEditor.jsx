import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { mobileGalleryService } from '../../services/mobileGallery.service';
import './MobileGallery.css';

const Chevron = ({ isOpen }) => (
  <svg 
    style={{ 
      transform: isOpen ? 'rotate(90deg)' : 'none', 
      transition: 'transform 0.15s ease',
      color: '#666'
    }} 
    xmlns="http://www.w3.org/2000/svg" 
    width="14" 
    height="14" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

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
  const [sortBy, setSortBy] = useState('none');

  // Preview interactive mockup states
  const [previewTab, setPreviewTab] = useState('home');
  const [previewFavorites, setPreviewFavorites] = useState([]);
  const [showPreviewContact, setShowPreviewContact] = useState(false);
  const [showPreviewShare, setShowPreviewShare] = useState(false);

  // Active accordion section in Design tab
  const [openSection, setOpenSection] = useState('layout');

  const [gridStyleOpen, setGridStyleOpen] = useState(false);
  const [colorThemeOpen, setColorThemeOpen] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  // Form states matching fields
  const [form, setForm] = useState({
    name: '',
    event_date: '',
    cover_style: 'none',
    theme_preset: 'echo',
    grid_style: 'vertical',
    color_theme: 'light',
    theme_color: '#000000',
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
  const iconFileInputRef = useRef(null);
  const gridStyleRef = useRef(null);
  const colorThemeRef = useRef(null);
  const phoneScrollRef = useRef(null);

  useEffect(() => {
    if (!phoneScrollRef.current) return;
    if (openSection === 'cover') {
      phoneScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (openSection === 'layout') {
      // smooth scroll down to the photos grid
      const coverHeight = form.cover_style === 'full' ? 568 : form.cover_style === 'third' ? 220 : 0;
      phoneScrollRef.current.scrollTo({ top: coverHeight, behavior: 'smooth' });
    }
  }, [openSection, form.cover_style]);

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
          theme_color: gData.theme_color || '#000000',
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (gridStyleRef.current && !gridStyleRef.current.contains(event.target)) {
        setGridStyleOpen(false);
      }
      if (colorThemeRef.current && !colorThemeRef.current.contains(event.target)) {
        setColorThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleIconSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingIcon(true);
    try {
      const url = await mobileGalleryService.uploadAppIcon(id, user.id, file);
      setGallery(prev => ({ ...prev, app_icon_url: url }));
      alert('App Icon uploaded successfully!');
    } catch (err) {
      alert('Failed to upload App Icon: ' + err.message);
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const handleRemoveIcon = async () => {
    if (!window.confirm('Are you sure you want to remove the App Icon?')) return;
    setIsUploadingIcon(true);
    try {
      await mobileGalleryService.updateGallery(id, { app_icon_url: null });
      setGallery(prev => ({ ...prev, app_icon_url: null }));
      alert('App Icon removed successfully!');
    } catch (err) {
      alert('Failed to remove App Icon: ' + err.message);
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const toggleSection = (sectionName) => {
    setOpenSection(openSection === sectionName ? '' : sectionName);
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
                onClick={() => window.open(`/mobile-gallery/preview/${gallery.slug}`, '_blank')}
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
                background: '#000000',
                color: '#fff',
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: 'none',
                borderRadius: 3,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
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
              color: tab === 'photos' ? '#111111' : '#888',
              borderBottomColor: tab === 'photos' ? '#00aba6' : 'transparent',
              fontWeight: tab === 'photos' ? 600 : 500,
              paddingBottom: '12px',
              borderBottomWidth: '2px',
              borderBottomStyle: 'solid'
            }}
          >
            Photos
          </span>
          <span
            className={`mge-tab ${tab === 'design' ? 'mge-tab-active' : ''}`}
            onClick={() => navigate(`/mobile-gallery/${id}/design`)}
            style={{
              color: tab === 'design' ? '#111111' : '#888',
              borderBottomColor: tab === 'design' ? '#00aba6' : 'transparent',
              fontWeight: tab === 'design' ? 600 : 500,
              paddingBottom: '12px',
              borderBottomWidth: '2px',
              borderBottomStyle: 'solid'
            }}
          >
            Design
          </span>
          <span
            className={`mge-tab ${tab === 'app-settings' ? 'mge-tab-active' : ''}`}
            onClick={() => navigate(`/mobile-gallery/${id}/app-settings`)}
            style={{
              color: tab === 'app-settings' ? '#111111' : '#888',
              borderBottomColor: tab === 'app-settings' ? '#00aba6' : 'transparent',
              fontWeight: tab === 'app-settings' ? 600 : 500,
              paddingBottom: '12px',
              borderBottomWidth: '2px',
              borderBottomStyle: 'solid'
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

          <div className="mge-photos-bar" style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="mge-photo-count" style={{ fontSize: 13, color: '#666' }}>{images.length} photos</span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: 2,
                    padding: '4px 8px',
                    fontSize: 12,
                    background: '#fff',
                    outline: 'none',
                    cursor: 'pointer',
                    color: '#333'
                  }}
                >
                  <option value="none">Default / Manual</option>
                  <option value="name-asc">Name: A-Z</option>
                  <option value="name-desc">Name: Z-A</option>
                  <option value="random">Random</option>
                </select>
              </div>

              <button className="mge-add-btn" onClick={() => fileInputRef.current?.click()} style={{ color: '#000000', margin: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Photos
              </button>
            </div>

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
                <div className="mge-progress-fill" style={{ width: `${uploadProgress}%`, background: '#000000' }} />
              </div>
              <div className="mge-progress-text" style={{ color: '#000000' }}>Uploading photos... {uploadProgress}%</div>
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
              {(() => {
                let sortedList = [...images];
                if (sortBy === 'name-asc') {
                  sortedList.sort((a, b) => (a.file_name || '').localeCompare(b.file_name || ''));
                } else if (sortBy === 'name-desc') {
                  sortedList.sort((a, b) => (b.file_name || '').localeCompare(a.file_name || ''));
                } else if (sortBy === 'random') {
                  sortedList.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
                }
                return sortedList;
              })().map((img) => (
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
              <div className="mge-section" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <div className="mge-section-head" onClick={() => toggleSection('cover')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', cursor: 'pointer' }}>
                  <span className="mge-section-title" style={{ fontSize: '15px', fontWeight: '600', color: '#111' }}>Cover Style</span>
                  <Chevron isOpen={openSection === 'cover'} />
                </div>
                {openSection === 'cover' && (
                  <div className="mge-section-body" style={{ padding: '0 0 24px 0' }}>
                    
                    {/* Photo Cover Section Header with custom actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#333', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Photo Cover</span>
                      <div style={{ display: 'flex', gap: 14 }}>
                        <button 
                          onClick={() => fileInputRef.current?.click()} 
                          style={{ background: 'none', border: 'none', color: '#00aba6', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          Change photo
                        </button>
                        <button 
                          onClick={() => alert('Focal point updated successfully')} 
                          style={{ background: 'none', border: 'none', color: '#00aba6', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
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
                          borderBottom: form.cover_style === 'full' ? '3px solid #00aba6' : '3px solid transparent',
                          transition: 'border-color 0.15s'
                        }}
                      >
                        <div className="mge-cover-thumb mge-ct-full" style={{ width: 62, height: 98, borderRadius: 6, border: form.cover_style === 'full' ? '2px solid #00aba6' : '1px solid #dcdcdc', background: '#fff', overflow: 'hidden', padding: 4, display: 'flex', flexDirection: 'column' }}>
                          <div className="mge-ct-img" style={{ flex: 1, background: '#dfdfdf', borderRadius: 3 }} />
                        </div>
                        <span className="mge-cover-label" style={{ fontSize: 12, marginTop: 8, fontWeight: form.cover_style === 'full' ? 700 : 500, color: form.cover_style === 'full' ? '#00aba6' : '#555' }}>Full</span>
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
                          borderBottom: form.cover_style === 'third' ? '3px solid #00aba6' : '3px solid transparent',
                          transition: 'border-color 0.15s'
                        }}
                      >
                        <div className="mge-cover-thumb mge-ct-third" style={{ width: 62, height: 98, borderRadius: 6, border: form.cover_style === 'third' ? '2px solid #00aba6' : '1px solid #dcdcdc', background: '#fff', overflow: 'hidden', padding: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div className="mge-ct-img" style={{ height: 32, background: '#dfdfdf', borderRadius: 3 }} />
                          <div className="mge-ct-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                          </div>
                        </div>
                        <span className="mge-cover-label" style={{ fontSize: 12, marginTop: 8, fontWeight: form.cover_style === 'third' ? 700 : 500, color: form.cover_style === 'third' ? '#00aba6' : '#555' }}>Third</span>
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
                          borderBottom: form.cover_style === 'none' ? '3px solid #00aba6' : '3px solid transparent',
                          transition: 'border-color 0.15s'
                        }}
                      >
                        <div className="mge-cover-thumb mge-ct-none" style={{ width: 62, height: 98, borderRadius: 6, border: form.cover_style === 'none' ? '2px solid #00aba6' : '1px solid #dcdcdc', background: '#fff', overflow: 'hidden', padding: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div className="mge-ct-date" style={{ height: 4, width: '40%', background: '#eaeaea', borderRadius: 1, margin: '2px auto 0' }} />
                          <div className="mge-ct-name" style={{ height: 6, width: '70%', background: '#dfdfdf', borderRadius: 1, margin: '0 auto 4px' }} />
                          <div className="mge-ct-grid2" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                            <div className="mge-ct-cell" style={{ background: '#f0f0f0', borderRadius: 2 }} />
                          </div>
                        </div>
                        <span className="mge-cover-label" style={{ fontSize: 12, marginTop: 8, fontWeight: form.cover_style === 'none' ? 700 : 500, color: form.cover_style === 'none' ? '#00aba6' : '#555' }}>None</span>
                      </div>

                    </div>

                    {/* Theme Subsection */}
                    <div style={{ marginTop: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#333', letterSpacing: '0.02em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Theme</span>
                      <div style={{ display: 'flex', gap: 12, background: '#f8f9fa', border: '1px solid #eeeeee', borderRadius: 4, padding: '16px 12px', justifyContent: 'space-around' }}>
                        {[
                          { 
                            id: 'echo', label: 'Echo', 
                            url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&auto=format&fit=crop&q=80',
                            font: "'Inter', sans-serif"
                          },
                          { 
                            id: 'spring', label: 'Spring', 
                            url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=300&auto=format&fit=crop&q=80',
                            font: "'Playfair Display', Georgia, serif"
                          },
                          { 
                            id: 'lark', label: 'Lark', 
                            url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80',
                            font: "'Outfit', 'Montserrat', sans-serif"
                          },
                          { 
                            id: 'sage', label: 'Sage', 
                            url: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=300&auto=format&fit=crop&q=80',
                            font: "'Lora', Georgia, serif"
                          },
                        ].map((t) => {
                          const isSelected = form.theme_preset === t.id;
                          return (
                            <div 
                              key={t.id} 
                              onClick={() => updateForm('theme_preset', t.id)}
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                cursor: 'pointer', 
                                position: 'relative',
                                transition: 'transform 0.15s ease'
                              }}
                            >
                              {/* Theme card with photo + text overlay */}
                              <div style={{ 
                                width: 90, 
                                height: 135, 
                                borderRadius: 6, 
                                overflow: 'hidden', 
                                border: isSelected ? '2.5px solid #00aba6' : '1.5px solid #e0e0e0', 
                                marginBottom: 8, 
                                boxShadow: isSelected ? '0 4px 12px rgba(0,171,166,0.25)' : '0 2px 6px rgba(0,0,0,0.08)',
                                position: 'relative',
                                transition: 'border-color 0.15s, box-shadow 0.15s'
                              }}>
                                {/* Background photo */}
                                <img 
                                  src={t.url} 
                                  alt="" 
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    filter: isSelected ? 'brightness(0.82)' : 'brightness(0.7)'
                                  }} 
                                />
                                {/* Overlay Content */}
                                <div style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.75) 100%)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: t.id === 'lark' ? 'flex-start' : 'center',
                                  justifyContent: 'center',
                                  padding: '0 8px',
                                  textAlign: t.id === 'lark' ? 'left' : 'center',
                                  fontFamily: t.font
                                }}>
                                  
                                  {t.id === 'echo' && (
                                    <div style={{ marginTop: 'auto', marginBottom: 12, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 5, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>January 18, 2018</div>
                                      <div style={{ color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.2, marginBottom: 8 }}>EPIC ADVENTURE</div>
                                      <div style={{ border: '1px solid rgba(255,255,255,0.8)', padding: '2px 6px', fontSize: 4, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff' }}>VIEW PHOTOS</div>
                                    </div>
                                  )}

                                  {t.id === 'spring' && (
                                    <div style={{ marginTop: 'auto', marginBottom: 12, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 400, fontStyle: 'italic', letterSpacing: '0.01em', lineHeight: 1.1, marginBottom: 6 }}>Waterfalls of the<br/>Northwest</div>
                                      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 5, letterSpacing: '0.06em' }}>January 18, 2018</div>
                                      <svg style={{ marginTop: 6, opacity: 0.8 }} xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                                        <polyline points="6 9 12 15 18 9" />
                                      </svg>
                                    </div>
                                  )}

                                  {t.id === 'lark' && (
                                    <div style={{ marginTop: 'auto', marginBottom: 12, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                      <div style={{ width: 12, height: 1, background: '#fff', marginBottom: 6 }}></div>
                                      <div style={{ color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.01em', lineHeight: 1.2, marginBottom: 6 }}>Beautiful coastlines<br/>and beaches</div>
                                      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>JANUARY 18, 2018</div>
                                    </div>
                                  )}

                                  {t.id === 'sage' && (
                                    <div style={{ marginTop: 'auto', marginBottom: 12, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <svg style={{ marginBottom: 4, opacity: 0.9 }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                                        <path d="M12 16v-4"/>
                                        <path d="M12 8h.01"/>
                                      </svg>
                                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.2, marginBottom: 6, fontStyle: 'italic' }}>Camping Trip</div>
                                      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>JANUARY 18, 2018</div>
                                    </div>
                                  )}

                                </div>

                                {/* Selected checkmark */}
                                {isSelected && (
                                  <div style={{
                                    position: 'absolute',
                                    top: 6,
                                    right: 6,
                                    width: 18,
                                    height: 18,
                                    background: '#00aba6',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              {/* Label */}
                              <span style={{ 
                                fontSize: 12, 
                                fontWeight: isSelected ? 700 : 500, 
                                color: isSelected ? '#00aba6' : '#555',
                                fontFamily: t.font,
                                transition: 'color 0.15s'
                              }}>
                                {t.label}
                              </span>

                              {/* Active underline */}
                              {isSelected && (
                                <div style={{ 
                                  height: 2, 
                                  background: '#00aba6', 
                                  width: '70%', 
                                  borderRadius: 1, 
                                  marginTop: 4 
                                }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p style={{ fontSize: 12, color: '#888', marginTop: 10, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
                        Each cover theme offers a unique font and layout giving your cover photo an amazing first impression.
                      </p>
                    </div>

                  </div>
                )}
              </div>

              {/* 2. Photos Layout & Color Accordion */}
              <div className="mge-section" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <div className="mge-section-head" onClick={() => toggleSection('layout')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', cursor: 'pointer' }}>
                  <span className="mge-section-title" style={{ fontSize: '15px', fontWeight: '600', color: '#111' }}>Photos Layout & Color</span>
                  <Chevron isOpen={openSection === 'layout'} />
                </div>
                {openSection === 'layout' && (
                  <div className="mge-section-body" style={{ padding: '0 0 24px 0' }}>
                    
                    {/* Grid Style Custom Dropdown */}
                    <div className="mge-field" style={{ position: 'relative', marginBottom: '24px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '10px', display: 'block' }}>Grid Style</label>
                      <div ref={gridStyleRef} style={{ position: 'relative' }}>
                        <div 
                          onClick={() => setGridStyleOpen(!gridStyleOpen)}
                          className={`mge-custom-select-trigger ${gridStyleOpen ? 'active' : ''}`}
                        >
                          <span>{form.grid_style === 'vertical' ? 'Vertical' : 'Horizontal'}</span>
                          <svg 
                            style={{ 
                              transform: gridStyleOpen ? 'rotate(180deg)' : 'none', 
                              transition: 'transform 0.15s ease',
                              color: '#666'
                            }} 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="12" 
                            height="12" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="3"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                        {gridStyleOpen && (
                          <div className="mge-custom-select-dropdown">
                            <div 
                              onClick={() => { updateForm('grid_style', 'vertical'); setGridStyleOpen(false); }}
                              className={`mge-custom-option ${form.grid_style === 'vertical' ? 'selected' : ''}`}
                            >
                              Vertical
                            </div>
                            <div 
                              onClick={() => { updateForm('grid_style', 'horizontal'); setGridStyleOpen(false); }}
                              className={`mge-custom-option ${form.grid_style === 'horizontal' ? 'selected' : ''}`}
                            >
                              Horizontal
                            </div>
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: '#777', marginTop: '8px', lineHeight: '1.5' }}>
                        Vertical emphasizes portrait photos, and Horizontal emphasizes landscape photos.
                      </p>
                    </div>

                    {/* Color Theme Custom Dropdown */}
                    <div className="mge-field" style={{ position: 'relative', marginBottom: '24px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '10px', display: 'block' }}>Color Theme</label>
                      <div ref={colorThemeRef} style={{ position: 'relative' }}>
                        <div 
                          onClick={() => setColorThemeOpen(!colorThemeOpen)}
                          className={`mge-custom-select-trigger ${colorThemeOpen ? 'active' : ''}`}
                        >
                          <span>{form.color_theme === 'light' ? 'Light' : 'Dark'}</span>
                          <svg 
                            style={{ 
                              transform: colorThemeOpen ? 'rotate(180deg)' : 'none', 
                              transition: 'transform 0.15s ease',
                              color: '#666'
                            }} 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="12" 
                            height="12" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="3"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                        {colorThemeOpen && (
                          <div className="mge-custom-select-dropdown">
                            <div 
                              onClick={() => { updateForm('color_theme', 'light'); setColorThemeOpen(false); }}
                              className={`mge-custom-option ${form.color_theme === 'light' ? 'selected' : ''}`}
                            >
                              Light
                            </div>
                            <div 
                              onClick={() => { updateForm('color_theme', 'dark'); setColorThemeOpen(false); }}
                              className={`mge-custom-option ${form.color_theme === 'dark' ? 'selected' : ''}`}
                            >
                              Dark
                            </div>
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: '#777', marginTop: '8px', lineHeight: '1.5' }}>
                        Choose between a light or dark theme that best suits your photos.
                      </p>
                    </div>



                  </div>
                )}
              </div>

              {/* 3. App Icon Accordion */}
              <div className="mge-section" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <div className="mge-section-head" onClick={() => toggleSection('icon')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', cursor: 'pointer' }}>
                  <span className="mge-section-title" style={{ fontSize: '15px', fontWeight: '600', color: '#111' }}>App Icon</span>
                  <Chevron isOpen={openSection === 'icon'} />
                </div>
                {openSection === 'icon' && (
                  <div className="mge-section-body" style={{ padding: '0 0 24px 0' }}>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px', lineHeight: '1.5' }}>
                      Customize the app icon that is shown when your clients add this gallery to their mobile device home screen.
                    </p>
                    
                    <div className="mge-icon-upload-container">
                      <div className="mge-icon-preview-box">
                        {gallery?.app_icon_url ? (
                          <img src={gallery.app_icon_url} alt="App Icon Preview" />
                        ) : (
                          <div className="mge-icon-placeholder">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                              <line x1="12" y1="18" x2="12.01" y2="18"/>
                            </svg>
                            <span style={{ fontSize: '9px', marginTop: '4px', fontWeight: '500' }}>No Icon</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mge-icon-actions">
                        <button 
                          className="mge-icon-btn-upload" 
                          onClick={() => iconFileInputRef.current?.click()}
                          disabled={isUploadingIcon}
                        >
                          {isUploadingIcon ? 'Uploading...' : gallery?.app_icon_url ? 'Change Icon' : 'Upload Custom Icon'}
                        </button>
                        
                        {gallery?.app_icon_url && (
                          <button 
                            className="mge-icon-btn-remove" 
                            onClick={handleRemoveIcon}
                            disabled={isUploadingIcon}
                          >
                            Remove Icon
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={iconFileInputRef} 
                      onChange={handleIconSelect} 
                      style={{ display: 'none' }} 
                    />
                  </div>
                )}
              </div>

              {/* Sticky Save Bar */}
              <div className="mge-save-bar" style={{ padding: '24px 0', borderTop: 'none' }}>
                <button className="mga-ghost-btn" style={{ padding: '8px 18px' }} onClick={() => navigate('/mobile-gallery')}>
                  Discard
                </button>
                <button className="mge-save-btn" onClick={handleSave} disabled={saving} style={{ background: '#00aba6' }}>
                  {saving ? 'Saving Changes...' : 'Save Design Config'}
                </button>
              </div>

            </div>
          </div>


          {/* RIGHT PANEL: Live Phone Mock Preview */}
          <div className="mge-design-preview">
            {(() => {
              const fontMapping = {
                echo: "'Inter', sans-serif",
                spring: "'Playfair Display', Georgia, serif",
                lark: "'Outfit', 'Montserrat', sans-serif",
                sage: "'Lora', Georgia, serif"
              };
              const currentFont = fontMapping[form.theme_preset] || fontMapping.echo;
              const isDark = form.color_theme === 'dark';
              const accentColor = isDark ? '#ffffff' : '#000000';
              
              // Filter images for favorites mockup tab
              const previewImages = previewTab === 'favorites'
                ? images.filter(im => previewFavorites.includes(im.id))
                : images;
                
              return (
                <div className="mga-phone" style={{ background: isDark ? '#121212' : '#ffffff', fontFamily: currentFont, position: 'relative' }}>
                  <div 
                    ref={phoneScrollRef}
                    style={{ height: '100%', maxHeight: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: 48 }} 
                    className="mga-phone-scroll-body"
                  >
                    {/* 1. Cover Image Header mock preview */}
                    {previewTab === 'home' && form.cover_style !== 'none' && (
                      <div className="mga-phone-cover" style={{ height: form.cover_style === 'full' ? 568 : 220, flexShrink: 0, position: 'relative' }}>
                        {images.length > 0 ? (
                          <img src={images[0].original_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', fontSize: 11 }}>No cover photo</div>
                        )}
                        
                        {form.cover_style === 'full' ? (
                          <div 
                            className="mga-phone-cover-overlay" 
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0, 0, 0, 0.4)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              textAlign: 'center',
                              padding: '24px',
                              fontFamily: currentFont,
                              zIndex: 2
                            }}
                          >
                            <h1 style={{ 
                              fontSize: form.theme_preset === 'spring' || form.theme_preset === 'sage' ? '32px' : '24px', 
                              fontWeight: form.theme_preset === 'spring' ? '400' : '700',
                              fontStyle: form.theme_preset === 'spring' ? 'italic' : 'normal',
                              margin: '0 0 12px 0',
                              letterSpacing: form.theme_preset === 'sage' ? '0.12em' : 'normal',
                              textTransform: form.theme_preset === 'echo' || form.theme_preset === 'sage' ? 'uppercase' : 'none',
                              lineHeight: 1.2
                            }}>
                              {form.name || 'Untitled App'}
                            </h1>
                            <div style={{ 
                              fontSize: '11px', 
                              opacity: 0.9, 
                              letterSpacing: '0.12em', 
                              textTransform: 'uppercase',
                              marginTop: '4px',
                              fontWeight: 500
                            }}>
                              {form.event_date || 'June 30th, 2026'}
                            </div>
                            
                            {/* Down chevron icon at the bottom */}
                            <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', opacity: 0.85 }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="mga-phone-cover-overlay" 
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                              color: '#ffffff',
                              padding: '16px',
                              fontFamily: currentFont,
                              zIndex: 2
                            }}
                          >
                            <h1 style={{ 
                              fontSize: '16px', 
                              fontWeight: '700',
                              margin: '0 0 4px 0',
                              textTransform: form.theme_preset === 'echo' || form.theme_preset === 'sage' ? 'uppercase' : 'none'
                            }}>
                              {form.name || 'Untitled App'}
                            </h1>
                            <div style={{ 
                              fontSize: '9px', 
                              opacity: 0.85, 
                              letterSpacing: '0.08em', 
                              textTransform: 'uppercase' 
                            }}>
                              {form.event_date || 'June 30th, 2026'}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. Header Title mock preview (if cover is none, or if we are in favorites view) */}
                    {previewTab === 'favorites' ? (
                      <div style={{ padding: '24px 20px 16px', textAlign: 'left', flexShrink: 0 }}>
                        <h1 style={{ fontSize: 20, fontWeight: 400, color: isDark ? '#fff' : '#111', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.02em' }}>My Favorites</h1>
                        <hr style={{ border: 'none', height: '1px', backgroundColor: isDark ? '#333' : '#dbdbdb', width: '45px', margin: '0 0 12px 0', padding: 0 }} />
                        <div style={{ fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>Curated List</div>
                      </div>
                    ) : (
                      form.cover_style === 'none' && (
                        <div style={{ padding: '28px 20px 16px', textAlign: 'left', flexShrink: 0 }}>
                          <h1 style={{ fontSize: 20, fontWeight: 400, color: isDark ? '#fff' : '#111', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{form.name || 'Untitled App'}</h1>
                          <hr style={{ border: 'none', height: '1px', backgroundColor: isDark ? '#333' : '#dbdbdb', width: '45px', margin: '0 0 12px 0', padding: 0 }} />
                          {form.event_date && <div style={{ fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>{form.event_date}</div>}
                        </div>
                      )
                    )}

                    {/* 3. Photos grid preview inside phone mockup */}
                    <div style={{ padding: '0 20px 20px 20px', flex: 1 }}>
                      {previewImages.length === 0 ? (
                        <div style={{ padding: '40px 10px', textAlign: 'center', color: '#888', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: isDark ? '#222' : '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 10,
                            color: '#aaa'
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 500 }}>{previewTab === 'favorites' ? 'No favorites yet' : 'No photos'}</span>
                          {previewTab === 'favorites' && <span style={{ fontSize: 9, color: '#aaa', marginTop: 4, textAlign: 'center', maxWidth: 160, lineHeight: 1.3 }}>Click the heart icon on any photo to add it here.</span>}
                        </div>
                      ) : form.grid_style === 'horizontal' ? (
                        <div className="mga-phone-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          {previewImages.slice(0, 12).map((im) => {
                            const isFav = previewFavorites.includes(im.id);
                            return (
                              <div key={im.id} className="mga-phone-cell" style={{ position: 'relative', overflow: 'hidden', aspectRatio: '3/2' }}>
                                <img src={im.thumbnail_url || im.original_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                {/* Preview Favorite toggle */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewFavorites(prev =>
                                      prev.includes(im.id) ? prev.filter(id => id !== im.id) : [...prev, im.id]
                                    );
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: 6,
                                    right: 6,
                                    background: 'rgba(0,0,0,0.5)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 24,
                                    height: 24,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: isFav ? accentColor : '#fff',
                                    padding: 0,
                                    zIndex: 2
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={isFav ? accentColor : 'none'} stroke={isFav ? accentColor : '#fff'} strokeWidth="2.5">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ columnCount: 2, columnGap: 2 }}>
                          {previewImages.slice(0, 12).map((im, idx) => {
                            const isFav = previewFavorites.includes(im.id);
                            const aspect = idx % 3 === 0 ? '2/3' : idx % 3 === 1 ? '1' : '3/2';
                            return (
                              <div 
                                key={im.id} 
                                className="mga-phone-cell" 
                                style={{ 
                                  breakInside: 'avoid', 
                                  marginBottom: 2, 
                                  position: 'relative', 
                                  overflow: 'hidden', 
                                  aspectRatio: aspect 
                                }}
                              >
                                <img src={im.thumbnail_url || im.original_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                {/* Preview Favorite toggle */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewFavorites(prev =>
                                      prev.includes(im.id) ? prev.filter(id => id !== im.id) : [...prev, im.id]
                                    );
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: 6,
                                    right: 6,
                                    background: 'rgba(0,0,0,0.5)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 24,
                                    height: 24,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: isFav ? accentColor : '#fff',
                                    padding: 0,
                                    zIndex: 2
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={isFav ? accentColor : 'none'} stroke={isFav ? accentColor : '#fff'} strokeWidth="2.5">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 4. Optional Contact CTA Button */}
                    {previewTab === 'home' && form.cta_enabled && (
                      <div style={{ padding: 12, textAlign: 'center', marginTop: 'auto', flexShrink: 0 }}>
                        <button
                          style={{
                            background: accentColor,
                            color: isDark ? '#111' : '#fff',
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

                  {/* Photographer Contact Info Modal Sheet (Interactive Preview) */}
                  {showPreviewContact && (
                    <div style={{
                      position: 'absolute',
                      bottom: 48,
                      left: 0,
                      right: 0,
                      background: isDark ? '#1e1e1e' : '#ffffff',
                      color: isDark ? '#ffffff' : '#111111',
                      borderTop: isDark ? '1px solid #333' : '1px solid #eee',
                      borderRadius: '12px 12px 0 0',
                      padding: '16px 12px 24px',
                      zIndex: 10,
                      boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
                      fontFamily: currentFont
                    }}>
                      <div style={{ width: 24, height: 3, background: '#888', borderRadius: 2, margin: '0 auto 10px' }} />
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Contact Photographer</div>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>{form.photographer_name || 'Photographer'}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 10 }}>
                        {form.photographer_email && <div style={{ color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📧 {form.photographer_email}</div>}
                        {form.photographer_phone && <div style={{ color: '#888' }}>📞 {form.photographer_phone}</div>}
                        {form.photographer_instagram && <div style={{ color: '#888' }}>📸 {form.photographer_instagram}</div>}
                        {form.photographer_website && <div style={{ color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🌐 {form.photographer_website}</div>}
                      </div>
                      <button
                        onClick={() => setShowPreviewContact(false)}
                        style={{
                          marginTop: 14,
                          width: '100%',
                          background: isDark ? '#2b2b2b' : '#f0f0f0',
                          color: isDark ? '#ffffff' : '#111111',
                          border: 'none',
                          padding: '6px 0',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 3,
                          cursor: 'pointer'
                        }}
                      >
                        Close
                      </button>
                    </div>
                  )}

                  {/* Share Modal Dialog (Interactive Preview) */}
                  {showPreviewShare && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: isDark ? '#1e1e1e' : '#ffffff',
                      color: isDark ? '#ffffff' : '#111111',
                      border: isDark ? '1px solid #333' : '1px solid #ddd',
                      borderRadius: 8,
                      padding: '16px',
                      zIndex: 10,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                      textAlign: 'center',
                      width: '85%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Share Mobile App</div>
                      <div style={{ fontSize: 9, color: '#888', marginBottom: 10 }}>Copy the link below to share with your friends.</div>
                      <input
                        type="text"
                        readOnly
                        value={getPublicUrl()}
                        style={{ width: '100%', fontSize: 8, padding: '4px 6px', border: '1px solid #ccc', borderRadius: 3, background: isDark ? '#333' : '#f9f9f9', color: isDark ? '#fff' : '#000', marginBottom: 12, boxSizing: 'border-box' }}
                      />
                      <button
                        onClick={() => {
                          try {
                            navigator.clipboard.writeText(getPublicUrl());
                            alert('Preview Link copied!');
                          } catch (_) {}
                          setShowPreviewShare(false);
                        }}
                        style={{
                          background: '#000',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          fontSize: 10,
                          fontWeight: 600,
                          borderRadius: 3,
                          cursor: 'pointer'
                        }}
                      >
                        Copy & Close
                      </button>
                    </div>
                  )}

                  {/* Mock Bottom Navigation Bar */}
                  <div style={{
                    height: 48,
                    background: isDark ? '#1a1a1a' : '#ffffff',
                    borderTop: isDark ? '1px solid #2a2a2a' : '1px solid #eaeaea',
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    flexShrink: 0,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 5
                  }}>
                    <div
                      onClick={() => { setPreviewTab('home'); setShowPreviewContact(false); setShowPreviewShare(false); }}
                      style={{ color: previewTab === 'home' && !showPreviewContact && !showPreviewShare ? accentColor : '#888', cursor: 'pointer', display: 'flex', padding: 8 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                    </div>
                    <div
                      onClick={() => { setPreviewTab('favorites'); setShowPreviewContact(false); setShowPreviewShare(false); }}
                      style={{ color: previewTab === 'favorites' && !showPreviewContact && !showPreviewShare ? accentColor : '#888', cursor: 'pointer', display: 'flex', padding: 8 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={previewTab === 'favorites' && !showPreviewContact && !showPreviewShare ? accentColor : 'none'} stroke="currentColor" strokeWidth="1.2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </div>
                    <div
                      onClick={() => { setShowPreviewShare(true); setShowPreviewContact(false); }}
                      style={{ color: showPreviewShare ? accentColor : '#888', cursor: 'pointer', display: 'flex', padding: 8 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </div>
                    <div
                      onClick={() => { setShowPreviewContact(true); setShowPreviewShare(false); }}
                      style={{ color: showPreviewContact ? accentColor : '#888', cursor: 'pointer', display: 'flex', padding: 8 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                        <path d="M6 19.5a7 7 0 0 1 12 0"/>
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: APP SETTINGS ── */}
      {tab === 'app-settings' && (
        <div style={{ flex: 1, overflowY: 'auto' }} className="mge-settings-wrap">
          <div style={{ maxWidth: 560 }}>
            {/* App Info Section */}
            <div style={{ marginBottom: 36 }}>
              <h3 className="mga-form-section-title">App Information</h3>
              <div className="mge-field">
                <label className="mge-label">App Display Title</label>
                <input className="mge-input" value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
              </div>
              <div className="mge-field">
                <label className="mge-label">Event / Session Date</label>
                <input className="mge-input" type="date" value={form.event_date} onChange={(e) => updateForm('event_date', e.target.value)} />
              </div>
            </div>

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
