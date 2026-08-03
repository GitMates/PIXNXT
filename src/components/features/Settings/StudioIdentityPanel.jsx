import React, { useEffect, useRef, useState } from 'react';
import { storageService } from '../../../services/storage.service';
import { CustomDomainPanel } from './CustomDomainPanel';
import '../../../pages/Settings.css';

/**
 * Studio-wide identity settings (domain, logos, site icon, PIXNXT branding).
 * Same photographer profile fields as the former Settings › Branding tab.
 */
export default function StudioIdentityPanel({ profile, updateProfile }) {
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

    useEffect(() => {
        if (profile?.hide_branding !== undefined && profile?.hide_branding !== null) {
            setPToggle(!profile.hide_branding);
        }
    }, [profile?.hide_branding]);

    useEffect(() => {
        const localFavicon = localStorage.getItem('custom_favicon_url');
        if (profile && !profile.favicon_url && localFavicon) {
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
            alert('Site icon uploaded successfully!');
        } catch (err) {
            console.error('Error uploading site icon:', err);
            alert(`Site icon upload failed: ${err.message}`);
        } finally {
            setUploadingFavicon(false);
        }
    };

    const handleFaviconDelete = async () => {
        if (!window.confirm('Are you sure you want to remove your site icon?')) return;
        try {
            localStorage.removeItem('custom_favicon_url');
            await updateProfile({ favicon_url: null });
            alert('Site icon removed successfully!');
        } catch (err) {
            console.error('Error deleting site icon:', err);
            alert(`Failed to delete site icon: ${err.message}`);
        }
    };

    if (!profile) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
        );
    }

    return (
        <div className="set-tab-content">
            <CustomDomainPanel profile={profile} updateProfile={updateProfile} />

            <div className="set-upgrade-box no-bg-mobile">
                <div className="set-box-header">
                    <h3 className="set-upgrade-title">Brand Customization</h3>
                </div>
                <p className="set-help-text mb-4">
                    Add your custom logo and site icon to personalize every delivery.
                </p>

                <div
                    className="set-branding-item"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        marginBottom: '20px',
                    }}
                >
                    <h4 className="set-mini-label" style={{ marginBottom: '5px' }}>
                        Logos
                    </h4>

                    <div
                        style={{
                            display: 'flex',
                            gap: '24px',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}
                        >
                            <div
                                className="set-upload-square"
                                onClick={() => logoInputRef.current?.click()}
                                style={{
                                    position: 'relative',
                                    cursor: 'pointer',
                                    width: '120px',
                                    height: '120px',
                                    border: '1px dashed #ccc',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    backgroundColor: '#f9f9f9',
                                    borderRadius: '4px',
                                }}
                            >
                                {uploadingLogo ? (
                                    <span style={{ fontSize: '11px', color: '#666' }}>
                                        Uploading...
                                    </span>
                                ) : profile?.logo_url ? (
                                    <img
                                        src={profile.logo_url}
                                        alt="Logo"
                                        style={{
                                            maxWidth: '90%',
                                            maxHeight: '90%',
                                            objectFit: 'contain',
                                        }}
                                    />
                                ) : (
                                    <>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#999"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ marginBottom: '4px' }}
                                        >
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        <span
                                            style={{
                                                fontSize: '11px',
                                                color: '#999',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }}
                                        >
                                            Upload
                                        </span>
                                    </>
                                )}
                            </div>
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: '#555',
                                    marginTop: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                LOGO
                            </span>
                            {profile?.logo_url && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void handleLogoDelete();
                                    }}
                                    style={{
                                        marginTop: '4px',
                                        fontSize: '11px',
                                        color: '#ef4444',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Remove
                                </button>
                            )}
                            <input
                                type="file"
                                ref={logoInputRef}
                                onChange={(e) => void handleLogoUpload(e)}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}
                        >
                            <div
                                className="set-upload-square"
                                onClick={() => coverLogoInputRef.current?.click()}
                                style={{
                                    position: 'relative',
                                    cursor: 'pointer',
                                    width: '120px',
                                    height: '120px',
                                    border: '1px dashed #ccc',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    backgroundColor: '#fff',
                                    borderRadius: '4px',
                                }}
                            >
                                {uploadingCoverLogo ? (
                                    <span style={{ fontSize: '11px', color: '#666' }}>
                                        Uploading...
                                    </span>
                                ) : profile?.cover_logo_url ? (
                                    <img
                                        src={profile.cover_logo_url}
                                        alt="Cover Logo"
                                        style={{
                                            maxWidth: '90%',
                                            maxHeight: '90%',
                                            objectFit: 'contain',
                                        }}
                                    />
                                ) : (
                                    <>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#777"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ marginBottom: '4px' }}
                                        >
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        <span
                                            style={{
                                                fontSize: '11px',
                                                color: '#777',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }}
                                        >
                                            Upload
                                        </span>
                                    </>
                                )}
                            </div>
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: '#555',
                                    marginTop: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                COVER LOGO
                            </span>
                            {profile?.cover_logo_url && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void handleCoverLogoDelete();
                                    }}
                                    style={{
                                        marginTop: '4px',
                                        fontSize: '11px',
                                        color: '#ef4444',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Remove
                                </button>
                            )}
                            <input
                                type="file"
                                ref={coverLogoInputRef}
                                onChange={(e) => void handleCoverLogoUpload(e)}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    <p className="set-help-text-[16px]" style={{ marginTop: '10px' }}>
                        The main mark replaces your studio name in headers. The cover mark sits over
                        photographs, so a light version with a transparent background reads best.
                    </p>
                </div>

                <div
                    className="set-branding-item mt-4"
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '20px',
                        marginBottom: '20px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <h4 className="set-mini-label" style={{ marginBottom: '5px' }}>
                            Site icon
                        </h4>
                        <div
                            className="set-upload-square"
                            onClick={() => faviconInputRef.current?.click()}
                            style={{
                                position: 'relative',
                                cursor: 'pointer',
                                width: '100px',
                                height: '100px',
                                border: '1px dashed #ccc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                borderRadius: '4px',
                                backgroundColor: '#f9f9f9',
                            }}
                        >
                            {uploadingFavicon ? (
                                <span style={{ fontSize: '11px', color: '#666' }}>Uploading...</span>
                            ) : profile?.favicon_url ||
                              localStorage.getItem('custom_favicon_url') ? (
                                <img
                                    src={
                                        profile?.favicon_url ||
                                        localStorage.getItem('custom_favicon_url')
                                    }
                                    alt="Site icon"
                                    style={{
                                        maxWidth: '32px',
                                        maxHeight: '32px',
                                        objectFit: 'contain',
                                    }}
                                />
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#999"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            )}
                        </div>
                        {(profile?.favicon_url || localStorage.getItem('custom_favicon_url')) && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void handleFaviconDelete();
                                }}
                                style={{
                                    marginTop: '4px',
                                    fontSize: '11px',
                                    color: '#ef4444',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                Remove
                            </button>
                        )}
                        <input
                            type="file"
                            ref={faviconInputRef}
                            onChange={(e) => void handleFaviconUpload(e)}
                            accept="image/x-icon,image/png,image/gif"
                            style={{ display: 'none' }}
                        />
                    </div>
                    <p
                        className="set-help-text-[16px]"
                        style={{ flex: 1, marginTop: '25px' }}
                    >
                        Square image, 32 px or larger. Shows in browser tabs and on a guest&apos;s
                        home screen.
                    </p>
                </div>

                <div className="set-branding-item mt-4">
                    <h4 className="set-mini-label">PIXNXT Branding</h4>
                    <div className="set-toggle-row">
                        <button
                            type="button"
                            className={`set-toggle ${pToggle ? 'on' : 'off'}`}
                            onClick={handleBrandingToggle}
                        >
                            <div className="set-toggle-handle" />
                        </button>
                        <span className="set-toggle-label">{pToggle ? 'On' : 'Off'}</span>
                    </div>
                    <p className="set-help-text-[16px] mt-2">
                        Turn this off to remove every mention of PIXNXT from your deliveries and
                        Showcase page.
                    </p>
                </div>
            </div>
        </div>
    );
}
