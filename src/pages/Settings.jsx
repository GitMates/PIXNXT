import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import {
    ClientGalleryPageShell,
    ClientGallerySubpageTabs,
} from '../components/features/ClientGallery/ClientGalleryPageShell';
import { ClientGallerySelect } from '../components/features/ClientGallery/ClientGallerySelect';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';
import { galleryService } from '../services/gallery.service';
import RichTextEditor from '../components/RichTextEditor';
import './Settings.css';
import './ClientGallery.css';

const SETTINGS_TABS = [
    { id: 'branding', label: 'Branding' },
    { id: 'watermark', label: 'Watermark' },
    { id: 'presets', label: 'Presets' },
    { id: 'email-templates', label: 'Email Templates' },
    { id: 'preferences', label: 'Preferences' },
    // { id: 'integrations', label: 'Integrations' },
];

const Settings = () => {
    const { tab } = useParams();
    const navigate = useNavigate();
    const activeTab = tab || 'branding';
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const fetchProfile = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('photographers')
                .select('*')
                .eq('id', user.id)
                .single();
            if (error) throw error;
            if (data) setProfile(data);
        } catch (e) {
            console.error('Error fetching settings profile:', e);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const updateProfile = async (updates) => {
        if (!user?.id) return;
        try {
            setSaving(true);
            const { error } = await supabase
                .from('photographers')
                .update(updates)
                .eq('id', user.id);
            if (error) throw error;
            setProfile(prev => ({ ...prev, ...updates }));
            // Optional: alert or show toast for success
        } catch (e) {
            console.error('Error updating settings profile:', e);
            alert(`Failed to update: ${e.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SidebarLayout>
                <div className="flex h-screen w-full items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                </div>
            </SidebarLayout>
        );
    }

    return (
        <SidebarLayout>
            <ClientGalleryPageShell
                title="Settings"
                subtitle="Branding, delivery defaults, and gallery preferences."
                toolbar={(
                    <ClientGallerySubpageTabs
                        tabs={SETTINGS_TABS}
                        activeId={activeTab}
                        onChange={(id) => navigate(`/settings/${id}`)}
                    />
                )}
                contentClassName="pt-6"
            >
                <div className="set-content">
                    {activeTab === 'branding' && <BrandingTab profile={profile} updateProfile={updateProfile} />}
                    {activeTab === 'watermark' && <WatermarkTab profile={profile} updateProfile={updateProfile} />}
                    {activeTab === 'presets' && <PresetsTab profile={profile} />}
                    {activeTab === 'email-templates' && <EmailTemplatesTab profile={profile} />}
                    {activeTab === 'preferences' && <PreferencesTab profile={profile} updateProfile={updateProfile} showToast={showToast} />}
                    {activeTab === 'integrations' && <IntegrationsTab profile={profile} updateProfile={updateProfile} />}
                </div>
            </ClientGalleryPageShell>
            {toastMessage && (
                <div className="set-toast">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {toastMessage}
                </div>
            )}
        </SidebarLayout>
    );
};

import { useRef } from 'react';
import { storageService } from '../services/storage.service';
import { CustomDomainPanel } from '../components/features/Settings/CustomDomainPanel';

const BrandingTab = ({ profile, updateProfile }) => {
    const [pToggle, setPToggle] = useState(() => {
        if (profile?.hide_branding !== undefined && profile?.hide_branding !== null) {
            return !profile.hide_branding;
        }
        const saved = localStorage.getItem('hide_branding');
        return saved !== 'true';
    });
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingCoverLogo, setUploadingCoverLogo] = useState(false);
    const [uploadingFavicon, setUploadingFavicon] = useState(false);
    const logoInputRef = useRef(null);
    const coverLogoInputRef = useRef(null);
    const faviconInputRef = useRef(null);

    React.useEffect(() => {
        if (profile?.hide_branding !== undefined && profile?.hide_branding !== null) {
            setPToggle(!profile.hide_branding);
        }
    }, [profile?.hide_branding]);

    React.useEffect(() => {
        const localFavicon = localStorage.getItem('custom_favicon_url');
        if (profile && !profile.favicon_url && localFavicon) {
            console.log('Syncing local favicon to database:', localFavicon);
            void updateProfile({ favicon_url: localFavicon });
        }
    }, [profile, updateProfile]);

    const handleBrandingToggle = () => {
        const nextVal = !pToggle;
        setPToggle(nextVal);
        localStorage.setItem('hide_branding', (!nextVal).toString());
        void updateProfile({ hide_branding: !nextVal });
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingLogo(true);
            const path = `photographers/${profile.id}/logos/logo_${Date.now()}_${file.name}`;
            const result = await storageService.upload(path, file);
            await updateProfile({ logo_url: result.url });
        } catch (err) {
            console.error('Error uploading logo:', err);
            alert(`Logo upload failed: ${err.message}`);
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleLogoDelete = async () => {
        if (!window.confirm('Are you sure you want to remove your logo?')) return;
        try {
            await updateProfile({ logo_url: null });
        } catch (err) {
            console.error('Error deleting logo:', err);
        }
    };

    const handleCoverLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingCoverLogo(true);
            const path = `photographers/${profile.id}/logos/cover_logo_${Date.now()}_${file.name}`;
            const result = await storageService.upload(path, file);
            await updateProfile({ cover_logo_url: result.url });
        } catch (err) {
            console.error('Error uploading cover logo:', err);
            alert(`Cover logo upload failed: ${err.message}`);
        } finally {
            setUploadingCoverLogo(false);
        }
    };

    const handleCoverLogoDelete = async () => {
        if (!window.confirm('Are you sure you want to remove your cover logo?')) return;
        try {
            await updateProfile({ cover_logo_url: null });
        } catch (err) {
            console.error('Error deleting cover logo:', err);
        }
    };

    const handleFaviconUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingFavicon(true);
            const path = `photographers/${profile.id}/favicons/favicon_${Date.now()}_${file.name}`;
            const result = await storageService.upload(path, file);
            localStorage.setItem('custom_favicon_url', result.url);
            await updateProfile({ favicon_url: result.url });
            alert('Favicon uploaded successfully!');
        } catch (err) {
            console.error('Error uploading favicon:', err);
            alert(`Favicon upload failed: ${err.message}`);
        } finally {
            setUploadingFavicon(false);
        }
    };

    const handleFaviconDelete = async () => {
        if (!window.confirm('Are you sure you want to remove your favicon?')) return;
        try {
            localStorage.removeItem('custom_favicon_url');
            await updateProfile({ favicon_url: null });
            alert('Favicon removed successfully!');
        } catch (err) {
            console.error('Error deleting favicon:', err);
            alert(`Failed to delete favicon: ${err.message}`);
        }
    };

    return (
        <div className="set-tab-content">
            <CustomDomainPanel profile={profile} updateProfile={updateProfile} />

            <div className="set-upgrade-box no-bg-mobile">
                <div className="set-box-header">
                    <h3 className="set-upgrade-title">Brand Customization</h3>
                </div>
                <p className="set-help-text mb-4">Add your custom logo and favicon to personalize your client galleries.</p>

                <div className="set-branding-item" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                    <h4 className="set-mini-label" style={{ marginBottom: '5px' }}>Logos</h4>
                    
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Logo */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div
                                className="set-upload-square"
                                onClick={() => logoInputRef.current?.click()}
                                style={{ position: 'relative', cursor: 'pointer', width: '120px', height: '120px', border: '1px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#f9f9f9', borderRadius: '4px' }}
                            >
                                {uploadingLogo ? (
                                    <span style={{ fontSize: '11px', color: '#666' }}>Uploading...</span>
                                ) : profile?.logo_url ? (
                                    <img src={profile.logo_url} alt="Logo" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '4px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        <span style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upload</span>
                                    </>
                                )}
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#555', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LOGO</span>
                            {profile?.logo_url && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleLogoDelete(); }}
                                    style={{ marginTop: '4px', fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Remove
                                </button>
                            )}
                            <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" style={{ display: 'none' }} />
                        </div>

                        {/* Cover Logo */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                             <div
                                className="set-upload-square"
                                onClick={() => coverLogoInputRef.current?.click()}
                                style={{ position: 'relative', cursor: 'pointer', width: '120px', height: '120px', border: '1px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#fff', borderRadius: '4px' }}
                            >
                                {uploadingCoverLogo ? (
                                    <span style={{ fontSize: '11px', color: '#666' }}>Uploading...</span>
                                ) : profile?.cover_logo_url ? (
                                    <img src={profile.cover_logo_url} alt="Cover Logo" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '4px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        <span style={{ fontSize: '11px', color: '#777', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upload</span>
                                    </>
                                )}
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#555', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COVER LOGO</span>
                            {profile?.cover_logo_url && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCoverLogoDelete(); }}
                                    style={{ marginTop: '4px', fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Remove
                                </button>
                            )}
                            <input type="file" ref={coverLogoInputRef} onChange={handleCoverLogoUpload} accept="image/*" style={{ display: 'none' }} />
                        </div>
                    </div>



                    <p className="set-help-text-[16px]" style={{ marginTop: '10px' }}>
                        Your logo will be used in place of the text logo and profile icon. PNG file with transparent background is recommended. For cover logo, we recommend using a white/light color logo with transparent background for best display.
                    </p>
                </div>

                <div className="set-branding-item mt-4" style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h4 className="set-mini-label" style={{ marginBottom: '5px' }}>Favicon</h4>
                        <div
                            className="set-upload-square"
                            onClick={() => faviconInputRef.current?.click()}
                            style={{ position: 'relative', cursor: 'pointer', width: '100px', height: '100px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '4px', backgroundColor: '#f9f9f9' }}
                        >
                            {uploadingFavicon ? (
                                <span style={{ fontSize: '11px', color: '#666' }}>Uploading...</span>
                            ) : (profile?.favicon_url || localStorage.getItem('custom_favicon_url')) ? (
                                <img src={profile?.favicon_url || localStorage.getItem('custom_favicon_url')} alt="Favicon" style={{ maxWidth: '32px', maxHeight: '32px', objectFit: 'contain' }} />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            )}
                        </div>
                        {(profile?.favicon_url || localStorage.getItem('custom_favicon_url')) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleFaviconDelete(); }}
                                style={{ marginTop: '4px', fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                Remove
                            </button>
                        )}
                        <input type="file" ref={faviconInputRef} onChange={handleFaviconUpload} accept="image/x-icon,image/png,image/gif" style={{ display: 'none' }} />
                    </div>
                    <p className="set-help-text-[16px]" style={{ flex: 1, marginTop: '25px' }}>You can upload a GIF, PNG or ICO file up to 32x32 pixels. Learn more</p>
                </div>

                <div className="set-branding-item mt-4">
                    <h4 className="set-mini-label">PIXNXT Branding</h4>
                    <div className="set-toggle-row">
                        <button className={`set-toggle ${pToggle ? 'on' : 'off'}`} onClick={handleBrandingToggle}>
                            <div className="set-toggle-handle"></div>
                        </button>
                        <span className="set-toggle-label">{pToggle ? 'On' : 'Off'}</span>
                    </div>
                    <p className="set-help-text-[16px] mt-2">Switching this off will hide PIXNXT branding from your collections and homepage.</p>
                </div>
            </div>
        </div>
    );
};

const WatermarkTab = ({ profile, updateProfile }) => {
    const navigate = useNavigate();
    const [wToggle, setWToggle] = useState(() => {
        if (profile?.watermark_web_downloads !== undefined && profile?.watermark_web_downloads !== null) {
            return profile.watermark_web_downloads;
        }
        return false;
    });
    
    const [watermarks, setWatermarks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWatermarks = async () => {
            if (!profile?.id) return;
            try {
                const data = await galleryService.getWatermarks(profile.id);
                setWatermarks(data || []);
            } catch (err) {
                console.error('Error fetching watermarks:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchWatermarks();
    }, [profile?.id]);

    const handleWebDownloadToggle = async () => {
        const next = !wToggle;
        setWToggle(next);
        await updateProfile({ watermark_web_downloads: next });
    };

    const handleDeleteWatermark = async (id) => {
        if (!window.confirm('Are you sure you want to remove this watermark?')) return;
        try {
            await galleryService.deleteWatermark(id);
            setWatermarks(prev => prev.filter(w => w.id !== id));
        } catch (err) {
            console.error('Error deleting watermark:', err);
        }
    };

    return (
        <div className="set-tab-content">
            <div className="set-section">
                <h3 className="set-section-title">Watermark</h3>
                
                {loading ? (
                    <div style={{ padding: '20px 0', color: '#666' }}>Loading watermarks...</div>
                ) : (
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {watermarks.map(wm => (
                            <div key={wm.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div
                                    style={{
                                        position: 'relative',
                                        width: '120px',
                                        height: '120px',
                                        border: '1px solid #e5e7eb',
                                        backgroundColor: '#d1d5db',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => navigate(`/settings/watermark/${wm.id}`)}
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteWatermark(wm.id); }}
                                        style={{
                                            position: 'absolute',
                                            top: '4px',
                                            right: '4px',
                                            background: 'rgba(255, 255, 255, 0.9)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            width: '24px',
                                            height: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: '#555',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                        }}
                                        title="Remove Watermark"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                    
                                    {wm.type === 'image' && wm.url ? (
                                        <img
                                            src={wm.url}
                                            alt="Watermark"
                                            style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain', opacity: (wm.opacity || 90) / 100 }}
                                        />
                                    ) : (
                                        <span style={{
                                            fontFamily: wm.font || 'Times New Roman',
                                            fontSize: '14px',
                                            color: wm.color || '#000',
                                            opacity: (wm.opacity || 90) / 100,
                                            textAlign: 'center',
                                            padding: '4px',
                                            wordBreak: 'break-word',
                                        }}>
                                            {wm.text || 'Text Watermark'}
                                        </span>
                                    )}
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {wm.name || 'MY WATERMARK'}
                                </span>
                            </div>
                        ))}

                        {/* Add new watermark box */}
                        <div
                            onClick={() => navigate('/settings/watermark/create')}
                            style={{
                                width: '120px',
                                height: '120px',
                                backgroundColor: '#e5e5e5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                borderRadius: '4px',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d4d4d4'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e5e5e5'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </div>
                    </div>
                )}

                <p className="set-help-text" style={{ marginTop: '20px' }}>
                    Protect your photos with custom watermarks. Watermarks will not appear on prints ordered through Store. <a href="https://support.pixieset.com" target="_blank" rel="noopener noreferrer" style={{ color: '#0d9488' }}>Learn more</a>
                </p>
            </div>

            <div className="set-section">
                <h3 className="set-section-title">Apply watermark to web size downloads</h3>
                <div className="set-toggle-row">
                    <button className={`hp-toggle ${wToggle ? 'on' : 'off'}`} onClick={handleWebDownloadToggle}>
                        <div className="hp-toggle-handle"></div>
                    </button>
                    <span className="hp-toggle-label">{wToggle ? 'On' : 'Off'}</span>
                </div>
                <p className="set-help-text">
                    Enable to apply watermark to web size downloads from your collections and web size downloads sold through Store.
                </p>
            </div>
        </div>
    );
};

const PresetsTab = ({ profile }) => {
    const navigate = useNavigate();
    const [presets, setPresets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    const fetchPresets = useCallback(async () => {
        if (!profile?.id) return;
        try {
            const { data, error } = await supabase
                .from('presets')
                .select('*')
                .eq('photographer_id', profile.id);
            if (error) throw error;
            setPresets(data || []);
        } catch (err) {
            console.error('Error loading presets:', err);
        } finally {
            setLoading(false);
        }
    }, [profile?.id]);

    useEffect(() => {
        fetchPresets();
    }, [fetchPresets]);

    const handleAddPreset = async (e) => {
        e.preventDefault();
        if (!newPresetName.trim() || !profile?.id) return;
        try {
            const { data, error } = await supabase
                .from('presets')
                .insert({
                    name: newPresetName.trim(),
                    photographer_id: profile.id,
                    settings: {
                        coverStyle: 'left',
                        font: 'sans',
                        color: 'light',
                        grid: 'vertical',
                        slideshow: true,
                        socialSharing: true
                    }
                })
                .select()
                .single();
            if (error) throw error;
            if (data) {
                setPresets(prev => [...prev, data]);
                setNewPresetName('');
                setShowAddForm(false);
                navigate(`/settings/presets/${data.id}`);
            }
        } catch (err) {
            console.error('Error adding preset:', err);
            alert(`Failed to add preset: ${err.message}`);
        }
    };

    const handleDeletePreset = async (id) => {
        if (!window.confirm('Are you sure you want to delete this preset?')) return;
        try {
            const { error } = await supabase
                .from('presets')
                .delete()
                .eq('id', id);
            if (error) throw error;
            setPresets(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error('Error deleting preset:', err);
            alert(`Failed to delete preset: ${err.message}`);
        }
    };

    return (
        <div className="set-tab-content">
            <div className="set-section">
                <h3 className="set-section-title">Collection Presets</h3>
                
                {loading ? (
                    <div style={{ padding: '20px 0', color: '#666' }}>Loading presets...</div>
                ) : presets.length === 0 ? (
                    <p className="set-help-text mt-2" style={{ margin: '15px 0' }}>No presets found. Create a preset to save time when making new collections.</p>
                ) : (
                    <div className="set-list-container mt-2" style={{ border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
                        {presets.map(preset => (
                            <div 
                                key={preset.id} 
                                className="set-list-item" 
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #eee', background: '#fff', cursor: 'pointer' }}
                                onClick={() => navigate(`/settings/presets/${preset.id}`)}
                            >
                                <span style={{ fontWeight: '500' }}>{preset.name}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                                    style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div
                    className="set-action-text mt-2"
                    onClick={() => setShowAddForm(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#0d9488', cursor: 'pointer', fontWeight: '500' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    Add Preset
                </div>

                <p className="set-help-text mt-4">Collection presets allow you to apply default settings when creating a new collection so you don't have to make changes every time.</p>
            </div>

            {showAddForm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', position: 'relative' }}>
                        <button 
                            onClick={() => setShowAddForm(false)} 
                            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px', color: '#111827' }}>Create New Preset</h3>
                        
                        <form onSubmit={handleAddPreset}>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#374151', marginBottom: '8px' }}>Give your new preset a name</label>
                                <input
                                    type="text"
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                    autoFocus
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    style={{ padding: '8px 16px', background: 'none', border: 'none', color: '#4b5563', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newPresetName.trim()}
                                    style={{ padding: '8px 24px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', fontWeight: '500', opacity: !newPresetName.trim() ? 0.7 : 1 }}
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
import { clientGalleryEmailTemplatesService } from '../services/clientGalleryEmailTemplates.service';

const EmailTemplatesTab = ({ profile }) => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTemplates = useCallback(async () => {
        if (!profile?.id) return;
        try {
            const data = await clientGalleryEmailTemplatesService.getTemplates(profile.id);
            setTemplates(data || []);
        } catch (err) {
            console.error('Error fetching email templates:', err);
        } finally {
            setLoading(false);
        }
    }, [profile?.id]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const collectionSharingTemplates = templates.filter(t => t.category === 'collection-sharing');
    const autoExpiryTemplates = templates.filter(t => t.category === 'auto-expiry');

    const TemplateListItem = ({ tpl, index, isLast }) => {
        const [showMenu, setShowMenu] = useState(false);
        const menuRef = useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (menuRef.current && !menuRef.current.contains(event.target)) {
                    setShowMenu(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const handleDelete = async (e) => {
            e.stopPropagation();
            setShowMenu(false);
            if (!window.confirm('Are you sure you want to delete this template?')) return;
            try {
                await clientGalleryEmailTemplatesService.deleteTemplate(profile.id, tpl.id);
                setTemplates(prev => prev.filter(t => t.id !== tpl.id));
            } catch (err) {
                console.error('Error deleting template:', err);
                alert(`Failed to delete template: ${err.message}`);
            }
        };

        const handleEdit = (e) => {
            e.stopPropagation();
            setShowMenu(false);
            navigate(`/settings/email-templates/${tpl.id}/edit`);
        };

        return (
            <div 
                className="set-list-item" 
                style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px 20px', 
                    marginBottom: '8px', 
                    border: '1px solid #eceae6', 
                    borderBottom: '1px solid #eceae6', 
                    borderRadius: '6px',
                    background: '#fff',
                    cursor: 'pointer'
                }}
                onClick={() => navigate(`/settings/email-templates/${tpl.id}/edit`)}
            >
                <span style={{ fontWeight: '500', fontSize: '14px', color: '#333' }}>{tpl.name}</span>
                <div style={{ position: 'relative' }} ref={menuRef}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        style={{ color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                    </button>
                    {showMenu && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '8px',
                            background: '#fff',
                            border: '1px solid #eaeaea',
                            borderRadius: '4px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            zIndex: 10,
                            minWidth: '120px',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <button 
                                onClick={handleEdit}
                                style={{ padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#333' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                Edit
                            </button>
                            <button 
                                onClick={handleDelete}
                                style={{ padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#333' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderTemplateList = (list) => {
        return (
            <div className="set-list-container mt-2" style={{ border: 'none', background: 'transparent', overflow: 'visible', marginBottom: '20px' }}>
                {list.map((tpl, index) => (
                    <TemplateListItem key={tpl.id} tpl={tpl} index={index} isLast={index === list.length - 1} />
                ))}
            </div>
        );
    };

    return (
        <div className="set-tab-content">
            <div className="set-section" style={{ paddingBottom: '30px', borderBottom: '1px solid #eaeaea', marginBottom: '30px' }}>
                <h3 className="set-section-title" style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px' }}>Collection Sharing Email</h3>

                {loading ? (
                    <div style={{ padding: '20px 0', color: '#666' }}>Loading templates...</div>
                ) : (
                    <>
                        {renderTemplateList(collectionSharingTemplates)}
                        <div
                            className="set-action-text mt-3"
                            onClick={() => navigate('/settings/email-templates/create')}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#2dd4bf', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                            Add Email Template
                        </div>
                        <p className="set-help-text mt-3" style={{ fontSize: '13px', color: '#888' }}>
                            Create a custom email template and save time when sharing collections with your clients.<br/>
                            <span style={{ color: '#2dd4bf', cursor: 'pointer' }}>Learn more</span>
                        </p>
                    </>
                )}
            </div>

            <div className="set-section">
                <h3 className="set-section-title" style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px' }}>Auto Expiry Email</h3>

                {loading ? (
                    <div style={{ padding: '20px 0', color: '#666' }}>Loading templates...</div>
                ) : (
                    <>
                        {renderTemplateList(autoExpiryTemplates)}
                        <p className="set-help-text mt-3" style={{ fontSize: '13px', color: '#888' }}>
                            You can send reminder emails to individual email addresses and/or to client emails that belong to an activity list. <span style={{ color: '#2dd4bf', cursor: 'pointer' }}>Learn more</span>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

const PreferencesTab = ({ profile, updateProfile, showToast }) => {
    const getInitialString = (key, fallback) => {
        if (profile && profile[key] !== undefined && profile[key] !== null) return profile[key];
        return localStorage.getItem(key) || fallback;
    };

    const getInitialBool = (key) => {
        if (profile && profile[key] !== undefined && profile[key] !== null) return profile[key];
        return localStorage.getItem(key) === 'true';
    };

    const [rawToggle, setRawToggle] = useState(getInitialBool('raw_photo_support'));
    const [cookieToggle, setCookieToggle] = useState(getInitialBool('cookie_banner_enabled'));
    const [language, setLanguage] = useState(getInitialString('default_language', 'english'));
    const [filenameDisplay, setFilenameDisplay] = useState(getInitialString('filename_display', 'show'));
    const [sharpening, setSharpening] = useState(getInitialString('sharpening_level', 'optimal'));
    const [uploadQuality, setUploadQuality] = useState(getInitialString('upload_quality', 'original'));
    const [tos, setTos] = useState(getInitialString('tos_text', ''));
    const [privacyPolicy, setPrivacyPolicy] = useState(getInitialString('privacy_policy_text', ''));

    const handleLanguageChange = async (val) => {
        setLanguage(val);
        localStorage.setItem('default_language', val);
        await updateProfile({ default_language: val }).catch(e => console.warn(e));
    };

    const handleFilenameDisplayChange = async (val) => {
        setFilenameDisplay(val);
        localStorage.setItem('filename_display', val);
    };

    const handleSharpeningChange = async (val) => {
        setSharpening(val);
        localStorage.setItem('sharpening_level', val);
    };

    const handleUploadQualityChange = async (val) => {
        setUploadQuality(val);
        localStorage.setItem('upload_quality', val);
    };

    const handleRawToggle = async () => {
        const next = !rawToggle;
        setRawToggle(next);
        localStorage.setItem('raw_photo_support', next.toString());
    };

    const handleCookieToggle = async () => {
        const next = !cookieToggle;
        setCookieToggle(next);
        localStorage.setItem('cookie_banner_enabled', next.toString());
    };

    const saveTos = async () => {
        localStorage.setItem('tos_text', tos);
        showToast('Terms of Service saved!');
    };

    const savePrivacyPolicy = async () => {
        localStorage.setItem('privacy_policy_text', privacyPolicy);
        showToast('Privacy Policy saved!');
    };

    return (
        <div className="set-tab-content">
            <div className="set-section">
                <h3 className="set-section-title">Default Collection Language</h3>
                <ClientGallerySelect
                    value={language}
                    onChange={handleLanguageChange}
                    options={[
                        { value: 'english', label: 'English' },
                        { value: 'spanish', label: 'Español' },
                        { value: 'french', label: 'Français' },
                        { value: 'german', label: 'Deutsch' }
                    ]}
                />
                <p className="set-help-text">Select the default language for newly created collections.</p>
            </div>

            <div className="set-section">
                <h3 className="set-section-title">Filename Display</h3>
                <ClientGallerySelect
                    value={filenameDisplay}
                    onChange={handleFilenameDisplayChange}
                    options={[
                        { value: 'show', label: 'Show' },
                        { value: 'hide', label: 'Hide' }
                    ]}
                />
                <p className="set-help-text">You can choose to show / hide your filenames on photos in your collections.</p>
            </div>

            <div className="set-section">
                <h3 className="set-section-title">Sharpening Level</h3>
                <ClientGallerySelect
                    value={sharpening}
                    onChange={handleSharpeningChange}
                    options={[
                        { value: 'none', label: 'None' },
                        { value: 'optimal', label: 'Optimal' },
                        { value: 'high', label: 'High' }
                    ]}
                />
                <p className="set-help-text">This setting only applies to web display copies of your photos. Your originals are not altered.</p>
            </div>

            <div className="set-section">
                <h3 className="set-section-title">Upload Quality / Size</h3>
                <ClientGallerySelect
                    value={uploadQuality}
                    onChange={handleUploadQualityChange}
                    options={[
                        { value: 'original', label: 'Original Size (No compression)' },
                        { value: 'high', label: 'High Resolution (3600px - Fast)' },
                        { value: 'web', label: 'Web Size (2048px - Ultra Fast)' }
                    ]}
                />
                <p className="set-help-text">Choose whether to upload original size images or optimize/resize them before uploading to save storage space and increase upload speeds.</p>
            </div>

            <div className="set-section mt-4">
                <h3 className="set-section-title">RAW Photo Support</h3>
                <div className="set-toggle-row">
                    <button className={`set-toggle ${rawToggle ? 'on' : 'off'}`} onClick={handleRawToggle}>
                        <div className="set-toggle-handle"></div>
                    </button>
                    <span className="set-toggle-label">{rawToggle ? 'On' : 'Off'}</span>
                </div>
                <p className="set-help-text"><strong>Pro Feature:</strong> Enable RAW photos to be included in your galleries alongside other file formats.</p>
            </div>

            <div className="set-section mt-4">
                <h3 className="set-section-title">Terms of Service</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <RichTextEditor
                        value={tos}
                        onChange={(val) => setTos(val)}
                        placeholder="Enter terms of service..."
                    />
                    <button
                        onClick={saveTos}
                        style={{ alignSelf: 'flex-start', padding: '8px 16px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Save TOS
                    </button>
                </div>
                <p className="set-help-text">Set the Terms of service that your customers are subject to. This will be shown in the footer of your collections.</p>
            </div>

            <div className="set-section mt-4">
                <h3 className="set-section-title">Privacy Policy</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <RichTextEditor
                        value={privacyPolicy}
                        onChange={(val) => setPrivacyPolicy(val)}
                        placeholder="Enter privacy policy..."
                    />
                    <button
                        onClick={savePrivacyPolicy}
                        style={{ alignSelf: 'flex-start', padding: '8px 16px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Save Privacy Policy
                    </button>
                </div>
                <p className="set-help-text">Set the Privacy Policy that your customers are subject to. This will be shown in the footer of your collections.</p>
            </div>

            <div className="set-section mt-4">
                <h3 className="set-section-title">Enable Cookie Banner</h3>
                <div className="set-toggle-row">
                    <button className={`set-toggle ${cookieToggle ? 'on' : 'off'}`} onClick={handleCookieToggle}>
                        <div className="set-toggle-handle"></div>
                    </button>
                    <span className="set-toggle-label">{cookieToggle ? 'On' : 'Off'}</span>
                </div>
                <p className="set-help-text">Enable banner to notify visitors that your site uses cookies.</p>
            </div>
        </div>
    );
};

const IntegrationsTab = ({ profile, updateProfile }) => {
    const [gaTrackingId, setGaTrackingId] = useState(profile?.ga_tracking_id || '');

    const handleConnectGA = async () => {
        await updateProfile({ ga_tracking_id: gaTrackingId.trim() || null });
        alert('Google Analytics Tracking ID saved!');
    };

    return (
        <div className="set-tab-content">
            <div className="set-integration-card">
                <div className="set-integration-logo lrc-logo">
                    <div className="lrc-box">LrC</div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    <div className="p-box">P</div>
                </div>
                <div className="set-integration-info">
                    <h3>Lightroom Plugin</h3>
                    <p>Download the official Lightroom Plugin that allows you to upload directly from Lightroom Classic to PIXNXT.</p>
                    <div className="set-action-text" style={{ cursor: 'pointer' }} onClick={() => alert('Downloading Lightroom Plugin... (Simulated)')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Download Plugin
                    </div>
                </div>
            </div>

            <div className="set-integration-card">
                <div className="set-integration-logo ga-logo-wrap">
                    <div className="ga-logo-icon">
                        <div className="ga-bar b1"></div>
                        <div className="ga-bar b2"></div>
                        <div className="ga-bar b3"></div>
                    </div>
                    <div className="ga-text">Google Analytics</div>
                </div>
                <div className="set-integration-info">
                    <h3>Google Analytics</h3>
                    <p>Enable Google Analytics on your collections by entering your Google Analytics Tracking ID.</p>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                        <div className="set-input-wrap neu-inset cg-field-shell flex-grow" style={{ flexGrow: 1 }}>
                            <input
                                className="set-input"
                                type="text"
                                placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X"
                                value={gaTrackingId}
                                onChange={(e) => setGaTrackingId(e.target.value)}
                            />
                        </div>
                        <button
                            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
                            style={{ padding: '10px 20px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={handleConnectGA}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
