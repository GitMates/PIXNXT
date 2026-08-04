import React, { useState } from 'react';
import RichTextEditor from '../../RichTextEditor';
import { ClientGallerySelect } from '../ClientGallery/ClientGallerySelect';
import '../../../pages/Settings.css';

const FACE_RETENTION_OPTIONS = [
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: '1yr', label: '1 year' },
    { value: 'on_close', label: 'On close' },
];

function readString(key, fallback = '') {
    try {
        return localStorage.getItem(key) || fallback;
    } catch {
        return fallback;
    }
}

function readBool(key) {
    try {
        return localStorage.getItem(key) === 'true';
    } catch {
        return false;
    }
}

/**
 * Studio-wide legal & consent settings (formerly Settings › Preferences legal block).
 * Same localStorage keys so existing guest galleries keep working.
 */
export default function LegalConsentPanel({ showToast }) {
    const [tos, setTos] = useState(() => readString('tos_text'));
    const [privacyPolicy, setPrivacyPolicy] = useState(() => readString('privacy_policy_text'));
    const [cookieToggle, setCookieToggle] = useState(() => readBool('cookie_banner_enabled'));
    const [faceConsent, setFaceConsent] = useState(() =>
        readString('face_matching_consent_notice')
    );
    const [faceRetention, setFaceRetention] = useState(() =>
        readString('face_data_retention', '90d')
    );

    const handleCookieToggle = () => {
        const next = !cookieToggle;
        setCookieToggle(next);
        localStorage.setItem('cookie_banner_enabled', next.toString());
        showToast?.(next ? 'Cookie banner enabled' : 'Cookie banner disabled');
    };

    const saveTos = () => {
        localStorage.setItem('tos_text', tos);
        showToast?.('Terms of Service saved');
    };

    const savePrivacyPolicy = () => {
        localStorage.setItem('privacy_policy_text', privacyPolicy);
        showToast?.('Privacy Policy saved');
    };

    const saveFaceConsent = () => {
        localStorage.setItem('face_matching_consent_notice', faceConsent);
        showToast?.('Face matching consent notice saved');
    };

    const handleFaceRetentionChange = (val) => {
        setFaceRetention(val);
        localStorage.setItem('face_data_retention', val);
        showToast?.('Face data retention updated');
    };

    return (
        <div className="set-tab-content">
            <div className="set-section mt-0">
                <h3 className="set-section-title">Terms of Service</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <RichTextEditor
                        value={tos}
                        onChange={setTos}
                        placeholder="Enter terms of service..."
                    />
                    <button
                        type="button"
                        onClick={saveTos}
                        style={{
                            alignSelf: 'flex-start',
                            padding: '8px 16px',
                            backgroundColor: '#1a1a1a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        Save TOS
                    </button>
                </div>
                <p className="set-help-text">
                    One set of terms across everything the studio delivers. Guests agree by
                    downloading.
                </p>
            </div>

            <div className="set-section mt-4">
                <h3 className="set-section-title">Privacy Policy</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <RichTextEditor
                        value={privacyPolicy}
                        onChange={setPrivacyPolicy}
                        placeholder="Enter privacy policy..."
                    />
                    <button
                        type="button"
                        onClick={savePrivacyPolicy}
                        style={{
                            alignSelf: 'flex-start',
                            padding: '8px 16px',
                            backgroundColor: '#1a1a1a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        Save Privacy Policy
                    </button>
                </div>
                <p className="set-help-text">
                    Shown in the footer of every delivery.
                </p>
            </div>

            <div className="set-section mt-4">
                <h3 className="set-section-title">Cookie banner</h3>
                <div className="set-toggle-row">
                    <button
                        type="button"
                        className={`set-toggle ${cookieToggle ? 'on' : 'off'}`}
                        onClick={handleCookieToggle}
                    >
                        <div className="set-toggle-handle" />
                    </button>
                    <span className="set-toggle-label">{cookieToggle ? 'On' : 'Off'}</span>
                </div>
                <p className="set-help-text">
                    Once per visitor across all your links. Required if you have clients in the EU
                    or UK.
                </p>
            </div>

            <div className="set-section mt-4">
                <h3 className="set-section-title">Face matching consent notice</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <RichTextEditor
                        value={faceConsent}
                        onChange={setFaceConsent}
                        placeholder="Explain how face matching works and ask for consent…"
                    />
                    <button
                        type="button"
                        onClick={saveFaceConsent}
                        style={{
                            alignSelf: 'flex-start',
                            padding: '8px 16px',
                            backgroundColor: '#1a1a1a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        Save notice
                    </button>
                </div>
                <p className="set-help-text">
                    DPDP / GDPR. Obligation follows the studio, not a product.
                </p>
            </div>

            <div className="set-section mt-4">
                <h3 className="set-section-title">Face data retention</h3>
                <ClientGallerySelect
                    value={faceRetention}
                    onChange={handleFaceRetentionChange}
                    options={FACE_RETENTION_OPTIONS}
                />
                <p className="set-help-text">
                    How long face match data is kept. Default 90 days. Options: 30 days, 90 days, 1
                    year, or on close.
                </p>
            </div>
        </div>
    );
}
