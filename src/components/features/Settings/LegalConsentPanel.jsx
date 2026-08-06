import React, { useState, useEffect } from 'react';
import RichTextEditor from '../../RichTextEditor';
import { useAuth } from '../../../hooks/useAuth';
import '../../../pages/Settings.css';

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

export default function LegalConsentPanel({ showToast }) {
    const { user } = useAuth();

    // Load dynamic studio/business name
    const [studioName, setStudioName] = useState(() => {
        if (typeof window !== 'undefined' && user?.id) {
            const cached = localStorage.getItem(`photographer_profile_${user.id}`);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    return parsed.display_name || parsed.studio_name || 'Karakovan Photography';
                } catch {
                    return 'Karakovan Photography';
                }
            }
        }
        return 'Karakovan Photography';
    });

    // Local states
    const [tos, setTos] = useState(() => readString('tos_text'));
    const [privacyPolicy, setPrivacyPolicy] = useState(() => readString('privacy_policy_text'));
    const [cookieToggle, setCookieToggle] = useState(() => readBool('cookie_banner_enabled'));
    const [faceConsent, setFaceConsent] = useState(() => readString('face_matching_consent_notice'));
    const [faceRetention, setFaceRetention] = useState(() => readString('face_data_retention', '90d'));
    const [noticeType, setNoticeType] = useState(() => readString('face_notice_type', 'standard'));

    // Inline edit toggles
    const [editingTos, setEditingTos] = useState(false);
    const [editingPrivacy, setEditingPrivacy] = useState(false);

    // Save date indicators
    const [tosUpdated, setTosUpdated] = useState(() => readString('tos_updated_at') || '14 Mar');
    const [privacyUpdated, setPrivacyUpdated] = useState(() => readString('privacy_updated_at') || '');

    const handleCookieToggle = () => {
        const next = !cookieToggle;
        setCookieToggle(next);
        localStorage.setItem('cookie_banner_enabled', next.toString());
        showToast?.(next ? 'Cookie banner enabled' : 'Cookie banner disabled');
    };

    const getFormattedDate = () => {
        return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const saveTos = () => {
        localStorage.setItem('tos_text', tos);
        const dateStr = getFormattedDate();
        localStorage.setItem('tos_updated_at', dateStr);
        setTosUpdated(dateStr);
        setEditingTos(false);
        showToast?.('Terms of Service saved');
    };

    const savePrivacyPolicy = () => {
        localStorage.setItem('privacy_policy_text', privacyPolicy);
        const dateStr = getFormattedDate();
        localStorage.setItem('privacy_updated_at', dateStr);
        setPrivacyUpdated(dateStr);
        setEditingPrivacy(false);
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

    const handleNoticeTypeChange = (val) => {
        setNoticeType(val);
        localStorage.setItem('face_notice_type', val);
        showToast?.('Consent notice type updated');
    };

    // Calculate dynamic preview wording
    const retentionLabel =
        faceRetention === '30d'
            ? '30 days'
            : faceRetention === '90d'
            ? '90 days'
            : faceRetention === '1yr'
            ? '1 year'
            : 'until the delivery closes';

    const defaultPreviewText = `Use my selfie to find and send my photos from this event. ${studioName} keeps it for ${retentionLabel}, then deletes it. Required.`;
    const defaultMarketingText = `${studioName} may contact me about future shoots. Optional.`;

    return (
        <div className="lc-panel">
            {/* ════════════════════════════════════════════════════════
                DOCUMENTS SECTION
               ════════════════════════════════════════════════════════ */}
            <section className="lc-section">
                <span className="lc-overline">DOCUMENTS</span>

                {/* Terms of Service */}
                <div className="lc-doc-item">
                    <div className="lc-doc-header">
                        <div>
                            <h3 className="lc-heading-3">Terms of service</h3>
                            <p className="lc-body-muted">
                                Your terms appear in the footer of every delivery. Guests agree to
                                them by downloading.
                            </p>
                        </div>
                    </div>

                    <div className="lc-doc-action-row">
                        <button
                            type="button"
                            className="lc-btn lc-btn--outline"
                            onClick={() => setEditingTos(!editingTos)}
                        >
                            {editingTos ? 'Close editor' : 'Edit terms'}
                        </button>
                        {tos ? (
                            <span className="lc-status-badge lc-status-badge--set">
                                <span className="lc-status-dot" />
                                Set · updated {tosUpdated}
                            </span>
                        ) : (
                            <span className="lc-status-badge lc-status-badge--unset">
                                <span className="lc-status-dot" />
                                Not set
                            </span>
                        )}
                    </div>

                    {editingTos && (
                        <div className="lc-editor-wrapper">
                            <RichTextEditor
                                value={tos}
                                onChange={setTos}
                                placeholder="Enter terms of service..."
                            />
                            <button type="button" className="lc-btn lc-btn--dark mt-3" onClick={saveTos}>
                                Save TOS
                            </button>
                        </div>
                    )}
                </div>

                <hr className="lc-divider" />

                {/* Privacy Policy */}
                <div className="lc-doc-item">
                    <div className="lc-doc-header">
                        <div>
                            <h3 className="lc-heading-3">Privacy policy</h3>
                            <p className="lc-body-muted">
                                Linked beside your terms. If you use face matching, this must say
                                what you do with a guest's photograph.
                            </p>
                        </div>
                    </div>

                    <div className="lc-doc-action-row">
                        <button
                            type="button"
                            className="lc-btn lc-btn--outline"
                            onClick={() => setEditingPrivacy(!editingPrivacy)}
                        >
                            {editingPrivacy ? 'Close editor' : privacyPolicy ? 'Edit policy' : 'Write policy'}
                        </button>
                        {privacyPolicy ? (
                            <span className="lc-status-badge lc-status-badge--set">
                                <span className="lc-status-dot" />
                                Set {privacyUpdated && `· updated ${privacyUpdated}`}
                            </span>
                        ) : (
                            <span className="lc-status-badge lc-status-badge--unset">
                                <span className="lc-status-dot" />
                                Not set
                            </span>
                        )}
                    </div>

                    {editingPrivacy && (
                        <div className="lc-editor-wrapper">
                            <RichTextEditor
                                value={privacyPolicy}
                                onChange={setPrivacyPolicy}
                                placeholder="Enter privacy policy..."
                            />
                            <button type="button" className="lc-btn lc-btn--dark mt-3" onClick={savePrivacyPolicy}>
                                Save Privacy Policy
                            </button>
                        </div>
                    )}
                </div>

                <hr className="lc-divider" />

                {/* Cookie Notice */}
                <div className="lc-doc-item">
                    <div className="lc-toggle-row-wrap">
                        <div className="flex-1">
                            <h3 className="lc-heading-3">Cookie notice</h3>
                            <p className="lc-body-muted">
                                Show a cookie notice to guests. Required if you have clients in the EU
                                or UK. Once per visitor across all your links.
                            </p>
                        </div>
                        <button
                            type="button"
                            className={`lc-toggle ${cookieToggle ? 'lc-toggle--on' : ''}`}
                            onClick={handleCookieToggle}
                            aria-pressed={cookieToggle}
                        >
                            <span className="lc-toggle-thumb" />
                        </button>
                    </div>
                </div>
            </section>

            <hr className="lc-divider" />

            {/* ════════════════════════════════════════════════════════
                FACE MATCHING SECTION
               ════════════════════════════════════════════════════════ */}
            <section className="lc-section">
                <span className="lc-overline">FACE MATCHING</span>

                {/* Info alert box */}
                <div className="lc-alert-box">
                    <p className="lc-alert-text">
                        <strong>You cannot re-consent 200 people after the wedding.</strong> These
                        two settings govern a photograph of a stranger's face collected at an event.
                        Get them right before the first standee is printed.
                    </p>
                </div>

                <div className="mt-4">
                    <h3 className="lc-heading-3" style={{ fontSize: '15px' }}>
                        Consent notice shown at registration
                    </h3>
                    <p className="lc-body-muted" style={{ marginTop: '4px', marginBottom: '16px' }}>
                        The wording a guest agrees to when they submit a selfie. Two ticks — one
                        required, one optional and unticked.
                    </p>

                    <div className="lc-radio-cards">
                        {/* Option 1: Standard Notice */}
                        <div
                            className={`lc-radio-card ${noticeType === 'standard' ? 'lc-radio-card--active' : ''}`}
                            onClick={() => handleNoticeTypeChange('standard')}
                        >
                            <div className="lc-radio-circle">
                                {noticeType === 'standard' && <div className="lc-radio-dot" />}
                            </div>
                            <div className="lc-radio-content">
                                <strong className="lc-radio-title">Standard notice</strong>
                                <p className="lc-radio-desc">
                                    Written for DPDP and GDPR. Names the studio, the purpose, the
                                    retention period and the withdrawal route. Recommended.
                                </p>
                            </div>
                        </div>

                        {/* Option 2: Your Own Wording */}
                        <div
                            className={`lc-radio-card ${noticeType === 'custom' ? 'lc-radio-card--active' : ''}`}
                            onClick={() => handleNoticeTypeChange('custom')}
                        >
                            <div className="lc-radio-circle">
                                {noticeType === 'custom' && <div className="lc-radio-dot" />}
                            </div>
                            <div className="lc-radio-content">
                                <strong className="lc-radio-title">Your own wording</strong>
                                <p className="lc-radio-desc">
                                    Replaces the standard notice. You are responsible for what it says.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Custom wording notice editor */}
                    {noticeType === 'custom' && (
                        <div className="lc-editor-wrapper mt-3">
                            <RichTextEditor
                                value={faceConsent}
                                onChange={setFaceConsent}
                                placeholder="Explain how face matching works and ask for consent…"
                            />
                            <button type="button" className="lc-btn lc-btn--dark mt-3" onClick={saveFaceConsent}>
                                Save Wording
                            </button>
                        </div>
                    )}

                    {/* Preview box */}
                    <div className="lc-preview-box mt-4">
                        <span className="lc-preview-label">PREVIEW — WHAT THE GUEST SEES</span>

                        <div className="lc-preview-ticks">
                            {/* Checkbox 1 */}
                            <label className="lc-preview-tick">
                                <input type="checkbox" defaultChecked disabled className="lc-checkbox" />
                                <span className="lc-checkbox-custom" />
                                <span className="lc-tick-text">
                                    {noticeType === 'standard' ? defaultPreviewText : faceConsent || defaultPreviewText}
                                </span>
                            </label>

                            {/* Checkbox 2 */}
                            <label className="lc-preview-tick">
                                <input type="checkbox" disabled className="lc-checkbox" />
                                <span className="lc-checkbox-custom" />
                                <span className="lc-tick-text">{defaultMarketingText}</span>
                            </label>
                        </div>

                        <p className="lc-preview-footnote">
                            Only the second tick adds a guest to your exportable contact list.
                        </p>
                    </div>
                </div>

                {/* Keep face data for */}
                <div className="mt-5">
                    <h3 className="lc-heading-3" style={{ fontSize: '15px' }}>Keep face data for</h3>
                    <p className="lc-body-muted" style={{ marginTop: '4px', marginBottom: '16px' }}>
                        How long a guest's selfie and the matching data stay on our servers. Their
                        delivered photos are not affected — only the face data used to find them.
                    </p>

                    <div className="lc-radio-cards">
                        {/* 30 days */}
                        <div
                            className={`lc-radio-card ${faceRetention === '30d' ? 'lc-radio-card--active' : ''}`}
                            onClick={() => handleFaceRetentionChange('30d')}
                        >
                            <div className="lc-radio-circle">
                                {faceRetention === '30d' && <div className="lc-radio-dot" />}
                            </div>
                            <div className="lc-radio-content">
                                <strong className="lc-radio-title">30 days</strong>
                                <p className="lc-radio-desc">
                                    Tightest. Late guests cannot be topped up after a month.
                                </p>
                            </div>
                        </div>

                        {/* 90 days */}
                        <div
                            className={`lc-radio-card ${faceRetention === '90d' ? 'lc-radio-card--active' : ''}`}
                            onClick={() => handleFaceRetentionChange('90d')}
                        >
                            <div className="lc-radio-circle">
                                {faceRetention === '90d' && <div className="lc-radio-dot" />}
                            </div>
                            <div className="lc-radio-content">
                                <strong className="lc-radio-title">90 days</strong>
                                <p className="lc-radio-desc">
                                    Covers late uploads and reprint requests. Recommended default.
                                </p>
                            </div>
                        </div>

                        {/* 1 year */}
                        <div
                            className={`lc-radio-card ${faceRetention === '1yr' ? 'lc-radio-card--active' : ''}`}
                            onClick={() => handleFaceRetentionChange('1yr')}
                        >
                            <div className="lc-radio-circle">
                                {faceRetention === '1yr' && <div className="lc-radio-dot" />}
                            </div>
                            <div className="lc-radio-content">
                                <strong className="lc-radio-title">1 year</strong>
                                <p className="lc-radio-desc">
                                    Only if you have a stated reason. Longer retention is harder to
                                    defend.
                                </p>
                            </div>
                        </div>

                        {/* Until delivery closes */}
                        <div
                            className={`lc-radio-card ${faceRetention === 'on_close' ? 'lc-radio-card--active' : ''}`}
                            onClick={() => handleFaceRetentionChange('on_close')}
                        >
                            <div className="lc-radio-circle">
                                {faceRetention === 'on_close' && <div className="lc-radio-dot" />}
                            </div>
                            <div className="lc-radio-content">
                                <strong className="lc-radio-title">Until the delivery closes</strong>
                                <p className="lc-radio-desc">
                                    Deleted the moment you archive the delivery, whenever that is.
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="lc-footnote mt-4">
                        Whatever you choose here is printed in the consent notice above. The two
                        cannot disagree.
                    </p>
                </div>
            </section>
        </div>
    );
}
