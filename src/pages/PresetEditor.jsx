import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Wrench, Palette, Lock, Download, Heart, ShoppingCart, X } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../hooks/useAuth';
import './PresetEditor.css';
import './CollectionDashboard.css';
import { galleryService } from '../services/gallery.service';
import { galleryGridStyleLabel } from '../lib/galleryGridStyle';

const TABS = [
  { id: 'general', label: 'General', icon: Wrench },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'privacy', label: 'Privacy', icon: Lock },
  { id: 'download', label: 'Download', icon: Download },
  { id: 'favorite', label: 'Favorite', icon: Heart },
  { id: 'store', label: 'Store', icon: ShoppingCart },
];

export default function PresetEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [activeDesignTab, setActiveDesignTab] = useState('cover');
  const [preset, setPreset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [watermarks, setWatermarks] = useState([]);
  
  // Settings state
  const [settings, setSettings] = useState({
    collectionTags: '',
    photoSets: 'Highlights',
    defaultWatermark: '',
    autoExpiryReminder: false,
    emailRegistration: false,
    galleryAssist: false,
    slideshow: true,
    socialSharing: true,
    language: 'English',
    coverStyle: 'center',
    typography: 'sans',
    colorTheme: 'light',
    gridStyle: 'vertical',
    thumbnailSize: 'regular',
    gridSpacing: 'regular',
    navigationStyle: 'icon',
    collectionPassword: false,
    showOnHomepage: true,
    photoDownload: true,
    highResolutionDownload: true,
    highResolutionSize: '3600px',
    webSizeDownload: true,
    webSize: '1024px',
    videoDownload: false,
    downloadPin: true,
    restrictDownloads: false,
    limitPhotoDownloads: false,
    limitPinUsage: '',
    favoritePhotos: true,
    favoriteNotes: true,
    storeStatus: true,
    priceSheet: 'My Price Sheet'
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !id) return;
      try {
        const { data, error } = await supabase
          .from('presets')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        setPreset(data);
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }

        // Fetch watermarks
        const { data: profileData } = await supabase
          .from('photographers')
          .select('id')
          .eq('id', user.id)
          .single();
          
        if (profileData) {
          const wms = await galleryService.getWatermarks(profileData.id);
          setWatermarks(wms || []);
        }

      } catch (err) {
        console.error('Error fetching preset:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user?.id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('presets')
        .update({ settings })
        .eq('id', id);
        
      if (error) throw error;
      navigate('/settings/presets');
    } catch (err) {
      console.error('Error saving preset:', err);
      alert('Failed to save preset.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="preset-editor-loading">Loading...</div>;
  }

  if (!preset) {
    return <div className="preset-editor-loading">Preset not found</div>;
  }

  return (
    <div className="preset-editor-container">
      <div className="preset-editor-topbar">
        <div className="topbar-left">
          <button className="topbar-close-btn" onClick={() => navigate('/settings/presets')}>
            <X size={20} />
          </button>
          <h2 className="topbar-title">{preset.name}</h2>
        </div>
        <button 
          className="topbar-save-btn" 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="preset-editor-body">
        <div className="preset-sidebar">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} className="sidebar-tab-icon" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="preset-content-area">
          <h3 className="content-title">{TABS.find(t => t.id === activeTab)?.label}</h3>
          
          {activeTab === 'general' && (
            <div className="tab-content general-tab">
              <div className="form-group">
                <label>Delivery Tags</label>
                <input 
                  type="text" 
                  placeholder="Optional" 
                  value={settings.collectionTags || ''} 
                  onChange={e => setSettings({...settings, collectionTags: e.target.value})}
                />
                <p className="help-text">Add tags to categorize different deliveries e.g. wedding, outdoor, summer. <a href="#">Learn more</a></p>
              </div>

              <div className="form-group">
                <label>Photo Sets</label>
                <input 
                  type="text" 
                  value={settings.photoSets || ''} 
                  onChange={e => setSettings({...settings, photoSets: e.target.value})}
                />
                <p className="help-text">Separate photo sets by comma. e.g. Highlights, Reception, Getting Ready</p>
              </div>

              <div className="form-group">
                <label>Default Watermark</label>
                <select 
                  value={settings.defaultWatermark || ''} 
                  onChange={e => setSettings({...settings, defaultWatermark: e.target.value})}
                >
                  <option value="">No watermark</option>
                  {watermarks.map(wm => (
                    <option key={wm.id} value={wm.id}>{wm.name || 'Unnamed Watermark'}</option>
                  ))}
                </select>
                <p className="help-text">Set the default watermark to apply to photos. Manage watermarks in App Settings.</p>
              </div>

              <div className="form-group form-group-spaced">
                <label style={{ fontSize: '15px', fontWeight: '600', color: '#374151', marginBottom: '16px', display: 'block' }}>Auto Expiry Reminder Email</label>
                
                <div className="upsell-box" style={{ marginTop: '0', marginBottom: '24px', backgroundColor: '#f2f8f9', padding: '20px 24px', border: 'none' }}>
                  <div className="upsell-title" style={{ color: '#111827', marginBottom: '12px', fontSize: '15px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <span>Upgrade for Premium Features</span>
                  </div>
                  <div className="upsell-content" style={{ paddingLeft: '26px' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#4b5563', lineHeight: '1.6' }}>Sending reminder emails to activity lists is only available for upgraded accounts.<br/>Default settings for activity lists will not apply until you have upgraded.</p>
                    <button className="action-link" style={{ fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>Upgrade</button>
                  </div>
                </div>

                <div>
                  <button className="action-link" style={{ fontWeight: '500', fontSize: '15px', color: '#10b981' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    Add expiry reminder email
                  </button>
                  <p className="help-text" style={{ marginTop: '12px' }}>Setup reminder emails that will send when you create a delivery and add an Auto Expiry date.</p>
                </div>
              </div>

              <div className="form-group form-group-spaced">
                <label>Email Registration</label>
                <div className="toggle-row">
                  <button 
                    className={`toggle-switch ${settings.emailRegistration ? 'on' : ''}`}
                    onClick={() => setSettings({...settings, emailRegistration: !settings.emailRegistration})}
                  >
                    <div className="toggle-handle" />
                  </button>
                  <span className="toggle-label">{settings.emailRegistration ? 'On' : 'Off'}</span>
                </div>
                <p className="help-text">Track email addresses accessing this delivery. <a href="#">Learn more</a></p>
              </div>

              <div className="form-group form-group-spaced">
                <label>Gallery Assist</label>
                <div className="toggle-row">
                  <button 
                    className={`toggle-switch ${settings.galleryAssist ? 'on' : ''}`}
                    onClick={() => setSettings({...settings, galleryAssist: !settings.galleryAssist})}
                  >
                    <div className="toggle-handle" />
                  </button>
                  <span className="toggle-label">{settings.galleryAssist ? 'On' : 'Off'}</span>
                </div>
                <p className="help-text">Add walk through cards to help visitors use the delivery. <a href="#">Learn more</a></p>
              </div>

              <div className="form-group form-group-spaced">
                <label>Slideshow</label>
                <div className="toggle-row">
                  <button 
                    className={`toggle-switch ${settings.slideshow ? 'on' : ''}`}
                    onClick={() => setSettings({...settings, slideshow: !settings.slideshow})}
                  >
                    <div className="toggle-handle" />
                  </button>
                  <span className="toggle-label">{settings.slideshow ? 'On' : 'Off'}</span>
                </div>
                <p className="help-text">Allow visitors to view the images in their delivery as a slideshow. <a href="#">Learn more</a></p>
                <button className="action-link" style={{ marginTop: '8px' }}>
                  Additional options
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
              </div>

              <div className="form-group form-group-spaced">
                <label>Social Sharing</label>
                <div className="toggle-row">
                  <button 
                    className={`toggle-switch ${settings.socialSharing ? 'on' : ''}`}
                    onClick={() => setSettings({...settings, socialSharing: !settings.socialSharing})}
                  >
                    <div className="toggle-handle" />
                  </button>
                  <span className="toggle-label">{settings.socialSharing ? 'On' : 'Off'}</span>
                </div>
                <p className="help-text">Allow delivery visitors to share your work to social media.</p>
              </div>

              <div className="form-group form-group-spaced">
                <label>Language</label>
                <select 
                  value={settings.language || 'English'} 
                  onChange={e => setSettings({...settings, language: e.target.value})}
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
                <p className="help-text">Choose the language to display these deliveries in.</p>
              </div>

              <div style={{ textAlign: 'right', marginTop: '24px' }}>
                <button className="action-link" onClick={() => setActiveTab('design')} style={{ color: '#374151', fontSize: '16px' }}>
                  Next 
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <div className="tab-content design-tab" style={{ display: 'flex', gap: '32px' }}>
              <div className="design-sidebar" style={{ width: '200px', flexShrink: 0 }}>
                <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Design</h4>
                {[
                  { id: 'cover', label: 'Cover' },
                  { id: 'typography', label: 'Typography' },
                  { id: 'color', label: 'Color' },
                  { id: 'grid', label: 'Grid' },
                ].map(tab => (
                  <div
                    key={tab.id}
                    className={`design-tab-item ${activeDesignTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveDesignTab(tab.id)}
                    style={{ 
                      padding: '8px 12px', 
                      cursor: 'pointer', 
                      borderRadius: '6px', 
                      backgroundColor: activeDesignTab === tab.id ? '#f3f4f6' : 'transparent', 
                      fontWeight: activeDesignTab === tab.id ? '500' : 'normal',
                      color: activeDesignTab === tab.id ? '#111827' : '#4b5563',
                      marginBottom: '4px' 
                    }}
                  >
                    {tab.label}
                  </div>
                ))}
              </div>
              <div className="design-content" style={{ flex: 1 }}>
                {activeDesignTab === 'cover' && (
                  <div className="form-group">
                    <label>Cover</label>
                    <div className="cd-cover-grid" style={{ marginTop: '16px' }}>
                      {COVER_STYLES.map(style => (
                        <div
                          key={style.id}
                          className={`cd-cover-card ${settings.coverStyle === style.id ? 'active' : ''}`}
                          onClick={() => setSettings({...settings, coverStyle: style.id})}
                        >
                          <div className="cd-cover-card-preview">
                            <div className={`preview-box style-${style.id}`}>
                              <div className="preview-content">
                                <div className="preview-image" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80)` }}></div>
                                <div className="preview-title">TITLE</div>
                              </div>
                            </div>
                          </div>
                          <span className="cd-cover-card-name" style={{ textTransform: 'capitalize' }}>{style.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

            {activeDesignTab === 'typography' && (
              <div className="form-group form-group-spaced">
                <label>Typography</label>
                <div className="cd-typography-grid" style={{ marginTop: '16px' }}>
                  {TYPOGRAPHY_OPTIONS.map(option => (
                    <div
                      key={option.id}
                      className={`cd-typography-card ${settings.typography === option.id ? 'active' : ''}`}
                      onClick={() => setSettings({...settings, typography: option.id})}
                    >
                      <div className={`cd-typography-preview-box font-preview-${option.id}`}>
                        <div className="sample-text">{option.sample}</div>
                        <div className="desc-text">{option.desc}</div>
                      </div>
                      <span className="cd-typography-name">{option.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeDesignTab === 'color' && (
              <div className="form-group form-group-spaced">
                <label>Color</label>
                <div className="cd-color-grid" style={{ marginTop: '16px' }}>
                  {COLOR_PALETTES.map(palette => (
                    <div
                      key={palette.id}
                      className={`cd-color-card ${settings.colorTheme === palette.id ? 'active' : ''}`}
                      onClick={() => setSettings({...settings, colorTheme: palette.id})}
                    >
                      <div className="cd-color-preview-box">
                        {palette.colors.map((color, i) => (
                          <div key={i} className="color-swatch" style={{ backgroundColor: color }}></div>
                        ))}
                      </div>
                      <span className="cd-color-name">{palette.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeDesignTab === 'grid' && (
              <div className="cd-grid-settings-pane-content" style={{ marginTop: '16px' }}>
                {/* Grid Style */}
                <div className="grid-setting-section">
                  <label className="grid-section-label">Grid Style</label>
                  <div className="grid-option-cards">
                    <div className="grid-option-container">
                      <div
                        className={`grid-option-card ${settings.gridStyle === 'vertical' ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, gridStyle: 'vertical'})}
                      >
                        <div className="grid-card-icon">
                          <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                            <rect x="8" y="8" width="10" height="10" />
                            <rect x="8" y="22" width="10" height="10" />
                            <rect x="22" y="8" width="10" height="24" />
                          </svg>
                        </div>
                      </div>
                      <span className="card-label">{galleryGridStyleLabel('vertical')}</span>
                    </div>
                    <div className="grid-option-container">
                      <div
                        className={`grid-option-card ${settings.gridStyle === 'horizontal' ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, gridStyle: 'horizontal'})}
                      >
                        <div className="grid-card-icon">
                          <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                            <rect x="8" y="8" width="24" height="10" />
                            <rect x="8" y="22" width="10" height="10" />
                            <rect x="22" y="22" width="10" height="10" />
                          </svg>
                        </div>
                      </div>
                      <span className="card-label">{galleryGridStyleLabel('horizontal')}</span>
                    </div>
                  </div>
                </div>

                {/* Thumbnail Size */}
                <div className="grid-setting-section">
                  <label className="grid-section-label">Thumbnail Size</label>
                  <div className="grid-option-cards">
                    <div className="grid-option-container">
                      <div
                        className={`grid-option-card ${settings.thumbnailSize === 'regular' ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, thumbnailSize: 'regular'})}
                      >
                        <div className="grid-card-icon">
                          <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                            <rect x="8" y="11" width="6" height="8" />
                            <rect x="17" y="11" width="6" height="8" />
                            <rect x="26" y="11" width="6" height="8" />
                            <rect x="8" y="21" width="6" height="8" />
                            <rect x="17" y="21" width="6" height="8" />
                            <rect x="26" y="21" width="6" height="8" />
                          </svg>
                        </div>
                      </div>
                      <span className="card-label">Regular</span>
                    </div>
                    <div className="grid-option-container">
                      <div
                        className={`grid-option-card ${settings.thumbnailSize === 'large' ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, thumbnailSize: 'large'})}
                      >
                        <div className="grid-card-icon">
                          <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                            <rect x="10" y="10" width="8" height="8" />
                            <rect x="22" y="10" width="8" height="8" />
                            <rect x="10" y="22" width="8" height="8" />
                            <rect x="22" y="22" width="8" height="8" />
                          </svg>
                        </div>
                      </div>
                      <span className="card-label">Large</span>
                    </div>
                  </div>
                </div>

                {/* Grid Spacing */}
                <div className="grid-setting-section">
                  <label className="grid-section-label">Grid Spacing</label>
                  <div className="grid-option-cards">
                    <div className="grid-option-container">
                      <div
                        className={`grid-option-card ${settings.gridSpacing === 'regular' ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, gridSpacing: 'regular'})}
                      >
                        <div className="grid-card-icon">
                          <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                            <rect x="11" y="11" width="6" height="6" />
                            <rect x="23" y="11" width="6" height="6" />
                            <rect x="11" y="23" width="6" height="6" />
                            <rect x="23" y="23" width="6" height="6" />
                          </svg>
                        </div>
                      </div>
                      <span className="card-label">Regular</span>
                    </div>
                    <div className="grid-option-container">
                      <div
                        className={`grid-option-card ${settings.gridSpacing === 'large' ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, gridSpacing: 'large'})}
                      >
                        <div className="grid-card-icon">
                          <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                            <rect x="14" y="14" width="12" height="12" />
                          </svg>
                        </div>
                      </div>
                      <span className="card-label">Large</span>
                    </div>
                  </div>
                </div>

                {/* Navigation Style */}
                <div className="grid-setting-section">
                  <label className="grid-section-label">Navigation Style</label>
                  <div className="grid-option-cards">
                    <div className="grid-option-container">
                      <div
                        className={`grid-option-card ${settings.navigationStyle === 'icon' ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, navigationStyle: 'icon'})}
                      >
                        <div className="grid-card-icon">
                          <div className="icon-only-thumb">
                            <div className="thumb-box-rounded"></div>
                          </div>
                        </div>
                      </div>
                      <span className="card-label">Icon Only</span>
                    </div>
                    <div className="grid-option-container">
                      <div
                        className={`grid-option-card ${(settings.navigationStyle === 'text' || settings.navigationStyle === 'icon_text') ? 'active' : ''}`}
                        onClick={() => setSettings({...settings, navigationStyle: 'text'})}
                      >
                        <div className="grid-card-icon">
                          <div className="icon-text-thumb">
                            <div className="thumb-box-a">A</div>
                          </div>
                        </div>
                      </div>
                      <span className="card-label">Icon & Text</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '48px' }}>
                <button className="action-link" onClick={() => setActiveTab('general')} style={{ color: '#374151', fontSize: '14px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  Back
                </button>
                <button className="action-link" onClick={() => setActiveTab('privacy')} style={{ color: '#374151', fontSize: '14px' }}>
                  Next 
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="tab-content privacy-tab">
              <div className="form-group form-group-spaced" style={{ marginTop: 0 }}>
                <label>Delivery Password</label>
                <div className="toggle-row">
                  <button 
                    className={`toggle-switch ${settings.collectionPassword ? 'on' : ''}`}
                    onClick={() => setSettings({...settings, collectionPassword: !settings.collectionPassword})}
                  >
                    <div className="toggle-handle" />
                  </button>
                  <span className="toggle-label">{settings.collectionPassword ? 'On' : 'Off'}</span>
                </div>
                <p className="help-text">If enabled, all deliveries created from this delivery preset will have a secure password set automatically at the time of their creation.</p>
              </div>

              <div className="form-group form-group-spaced">
                <label>Show on Homepage</label>
                <div className="toggle-row">
                  <button 
                    className={`toggle-switch ${settings.showOnHomepage ? 'on' : ''}`}
                    onClick={() => setSettings({...settings, showOnHomepage: !settings.showOnHomepage})}
                  >
                    <div className="toggle-handle" />
                  </button>
                  <span className="toggle-label">{settings.showOnHomepage ? 'On' : 'Off'}</span>
                </div>
                <p className="help-text">Show your deliveries on your <a href="#">Homepage</a>. Manage Homepage in <a href="#">Settings</a>.</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '48px' }}>
                <button className="action-link" onClick={() => setActiveTab('design')} style={{ color: '#374151', fontSize: '14px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  Back
                </button>
                <button className="action-link" onClick={() => setActiveTab('download')} style={{ color: '#374151', fontSize: '14px' }}>
                  Next 
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'download' && (
            <div className="tab-content download-tab">
              <div className="form-group upsell-box" style={{ marginTop: 0 }}>
                <div className="upsell-content">
                  <div className="upsell-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <span>Upgrade for Premium Features</span>
                  </div>
                  <p>Original size photos and video downloads are available on upgraded accounts. You may save Presets with these settings, then upgrade at any time for them to apply.</p>
                  <button className="action-link" style={{ fontSize: '12px' }}>Upgrade</button>
                </div>
              </div>

              <div className="form-group form-group-spaced">
                <label>Photo Download</label>
                <div className="toggle-row">
                  <button 
                    className={`toggle-switch ${settings.photoDownload ? 'on' : ''}`}
                    onClick={() => setSettings({...settings, photoDownload: !settings.photoDownload})}
                  >
                    <div className="toggle-handle" />
                  </button>
                  <span className="toggle-label">{settings.photoDownload ? 'On' : 'Off'}</span>
                </div>
                <button className="action-link" style={{ marginTop: '8px' }}>
                  Additional options
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
              </div>


              <div className="form-group form-group-spaced">
                <label>Video Download</label>
                <div className="toggle-row">
                  <button 
                    className={`toggle-switch ${settings.videoDownload ? 'on' : ''}`}
                    onClick={() => setSettings({...settings, videoDownload: !settings.videoDownload})}
                  >
                    <div className="toggle-handle" />
                  </button>
                  <span className="toggle-label">{settings.videoDownload ? 'On' : 'Off'}</span>
                </div>
                <p className="help-text">Allow videos to be downloaded for offline viewing. <a href="#">Learn more</a></p>
              </div>

              <div className="form-group form-group-spaced">
                <label>Download PIN</label>
                <div className="toggle-row">
                  <button 
                    className={`toggle-switch ${settings.downloadPin ? 'on' : ''}`}
                    onClick={() => setSettings({...settings, downloadPin: !settings.downloadPin})}
                  >
                    <div className="toggle-handle" />
                  </button>
                  <span className="toggle-label">{settings.downloadPin ? 'On' : 'Off'}</span>
                </div>
                <p className="help-text">If enabled, all deliveries created from this delivery preset will have a download PIN set automatically at the time of their creation.</p>
              </div>

              <div className="form-group form-group-spaced">
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Advanced Settings</h4>
                
                <div style={{ marginBottom: '32px' }}>
                  <label>Restrict Downloads to Delivery Contacts</label>
                  <div className="toggle-row">
                    <button 
                      className={`toggle-switch ${settings.restrictDownloads ? 'on' : ''}`}
                      onClick={() => setSettings({...settings, restrictDownloads: !settings.restrictDownloads})}
                    >
                      <div className="toggle-handle" />
                    </button>
                    <span className="toggle-label">{settings.restrictDownloads ? 'On' : 'Off'}</span>
                  </div>
                  <p className="help-text">Allow only assigned Delivery Contacts to download photos.</p>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label>Limit Photo Downloads</label>
                  <div className="toggle-row">
                    <button 
                      className={`toggle-switch ${settings.limitPhotoDownloads ? 'on' : ''}`}
                      onClick={() => setSettings({...settings, limitPhotoDownloads: !settings.limitPhotoDownloads})}
                    >
                      <div className="toggle-handle" />
                    </button>
                    <span className="toggle-label">{settings.limitPhotoDownloads ? 'On' : 'Off'}</span>
                  </div>
                  <p className="help-text">Set the number of photos that can be downloaded in these deliveries. Note that this limit is shared between all visitors who can download. If you restrict downloads to contacts only, each client will be able to download their own set of photos up to the limit. <a href="#">Learn more</a></p>
                </div>

                <div>
                  <label>Limit PIN Usage</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 5" 
                    value={settings.limitPinUsage || ''} 
                    onChange={e => setSettings({...settings, limitPinUsage: e.target.value})}
                  />
                  <p className="help-text">Limit the number of times this PIN can be used for Delivery Download. This does not apply to Video download or Single Photo download.</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '48px' }}>
                <button className="action-link" onClick={() => setActiveTab('privacy')} style={{ color: '#374151', fontSize: '14px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  Back
                </button>
                <button className="action-link" onClick={() => setActiveTab('favorite')} style={{ color: '#374151', fontSize: '14px' }}>
                  Next 
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'favorite' && (
            <div className="tab-content favorite-tab">
              <div className="form-group form-group-spaced" style={{ marginTop: 0 }}>
                <label>Favorite Photos</label>
                <div className="toggle-row">
                  <button 
                    className={`toggle-switch ${settings.favoritePhotos ? 'on' : ''}`}
                    onClick={() => setSettings({...settings, favoritePhotos: !settings.favoritePhotos})}
                  >
                    <div className="toggle-handle" />
                  </button>
                  <span className="toggle-label">{settings.favoritePhotos ? 'On' : 'Off'}</span>
                </div>
                <p className="help-text">Allow visitors to favorite photos. You can review these afterwards in Favorite Activity.</p>
              </div>

              <div className="form-group form-group-spaced">
                <label>Favorite Notes</label>
                <div className="toggle-row">
                  <button 
                    className={`toggle-switch ${settings.favoriteNotes ? 'on' : ''}`}
                    onClick={() => setSettings({...settings, favoriteNotes: !settings.favoriteNotes})}
                  >
                    <div className="toggle-handle" />
                  </button>
                  <span className="toggle-label">{settings.favoriteNotes ? 'On' : 'Off'}</span>
                </div>
                <p className="help-text">Allow clients to add notes to photos they have favorited. <a href="#">Learn more</a></p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '48px' }}>
                <button className="action-link" onClick={() => setActiveTab('download')} style={{ color: '#374151', fontSize: '14px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  Back
                </button>
                <button className="action-link" onClick={() => setActiveTab('store')} style={{ color: '#374151', fontSize: '14px' }}>
                  Next 
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'store' && (
            <div className="tab-content store-tab">
              <div className="form-group upsell-box" style={{ marginTop: 0, backgroundColor: '#f0fdfa', borderColor: '#ccfbf1' }}>
                <div className="upsell-content">
                  <div className="upsell-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <span>Activate Store</span>
                  </div>
                  <p>Setup Pixieset Store to start selling prints, digital downloads, and more directly from your deliveries.</p>
                  <button className="action-link" style={{ fontSize: '14px', marginTop: '4px' }}>Get Started</button>
                </div>
              </div>

              <div className="form-group form-group-spaced">
                <label>Store Status</label>
                <div className="toggle-row">
                  <button 
                    className={`toggle-switch ${settings.storeStatus ? 'on' : ''}`}
                    onClick={() => setSettings({...settings, storeStatus: !settings.storeStatus})}
                  >
                    <div className="toggle-handle" />
                  </button>
                  <span className="toggle-label">{settings.storeStatus ? 'On' : 'Off'}</span>
                </div>
                <p className="help-text">Allow visitors to purchase products from deliveries.</p>
              </div>

              <div className="form-group form-group-spaced">
                <label>Price Sheet</label>
                <select 
                  value={settings.priceSheet || 'My Price Sheet'} 
                  onChange={e => setSettings({...settings, priceSheet: e.target.value})}
                >
                  <option value="My Price Sheet">My Price Sheet</option>
                  <option value="Default Price Sheet">Default Price Sheet</option>
                </select>
                <p className="help-text">Set which products are for sale in deliveries. Manage price sheets in <a href="#">Store</a></p>
              </div>

              <div className="form-group form-group-spaced">
                <label>Personalized Product Preview</label>
                <p className="help-text" style={{ fontSize: '13px', lineHeight: '1.5', marginTop: '8px' }}>
                  This feature is only available with a lab price sheet on our next generation Store system. Create a new Price Sheet to gain full access to all the all-new Store experience or select existing price sheet that matches requirements.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginTop: '48px' }}>
                <button className="action-link" onClick={() => setActiveTab('favorite')} style={{ color: '#374151', fontSize: '14px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
