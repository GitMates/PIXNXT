import React, { useState, useEffect, useCallback } from 'react';
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

function readBool(key, fallback = false) {
    try {
        const v = localStorage.getItem(key);
        if (v === null) return fallback;
        return v === 'true';
    } catch {
        return fallback;
    }
}

function getFormattedDate() {
    return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function resolveStudioName(name) {
    const trimmed = (name || '').trim();
    if (!trimmed || trimmed === 'Studio') return 'Karakovan Photography';
    return trimmed;
}

const RETENTION_OPTIONS = [
    {
        value: '30d',
        title: '30 days',
        desc: 'Tightest. Late guests cannot be topped up after a month.',
        label: '30 days',
    },
    {
        value: '90d',
        title: '90 days',
        desc: 'Covers late uploads and reprint requests. Recommended default.',
        label: '90 days',
    },
    {
        value: '1yr',
        title: '1 year',
        desc: 'Only if you have a stated reason. Longer retention is harder to defend.',
        label: '1 year',
    },
    {
        value: 'on_close',
        title: 'Until the delivery closes',
        desc: 'Deleted the moment you archive the delivery.',
        label: 'until the delivery closes',
    },
];

export default function LegalConsentPanel({ showToast, studioName: studioNameProp }) {
    const { user } = useAuth();

    const [studioName, setStudioName] = useState(() =>
        resolveStudioName(studioNameProp)
    );

    useEffect(() => {
        if (studioNameProp) {
            setStudioName(resolveStudioName(studioNameProp));
            return;
        }
        if (!user?.id) return;
        try {
            const cached = localStorage.getItem(`photographer_profile_${user.id}`);
            if (!cached) return;
            const parsed = JSON.parse(cached);
            const name =
                parsed.business_name ||
                parsed.display_name ||
                parsed.studio_name;
            if (name) setStudioName(resolveStudioName(name));
        } catch {
            /* keep fallback */
        }
    }, [studioNameProp, user?.id]);

    const [tos, setTos] = useState(() => readString('tos_text'));
    const [privacyPolicy, setPrivacyPolicy] = useState(() => readString('privacy_policy_text'));
    const [cookieToggle, setCookieToggle] = useState(() => readBool('cookie_banner_enabled', true));
    const [faceConsent, setFaceConsent] = useState(() => readString('face_matching_consent_notice'));
    const [faceRetention, setFaceRetention] = useState(() => readString('face_data_retention', '90d'));
    const [noticeType, setNoticeType] = useState(() => readString('face_notice_type', 'standard'));

    const [editingTos, setEditingTos] = useState(false);
    const [editingPrivacy, setEditingPrivacy] = useState(false);

    const [tosUpdated, setTosUpdated] = useState(() => readString('tos_updated_at') || '14 Mar');
    const [privacyUpdated, setPrivacyUpdated] = useState(() => readString('privacy_updated_at') || '');

    const [saveStatus, setSaveStatus] = useState('Saved a moment ago.');

    const markSaved = useCallback((toastMsg) => {
        setSaveStatus('Saved a moment ago.');
        if (toastMsg) showToast?.(toastMsg);
    }, [showToast]);

    const handleCookieToggle = () => {
        const next = !cookieToggle;
        setCookieToggle(next);
        localStorage.setItem('cookie_banner_enabled', next.toString());
        markSaved(next ? 'Cookie banner enabled' : 'Cookie banner disabled');
    };

    const saveTos = () => {
        localStorage.setItem('tos_text', tos);
        const dateStr = getFormattedDate();
        localStorage.setItem('tos_updated_at', dateStr);
        setTosUpdated(dateStr);
        setEditingTos(false);
        markSaved('Terms of Service saved');
    };

    const savePrivacyPolicy = () => {
        localStorage.setItem('privacy_policy_text', privacyPolicy);
        const dateStr = getFormattedDate();
        localStorage.setItem('privacy_updated_at', dateStr);
        setPrivacyUpdated(dateStr);
        setEditingPrivacy(false);
        markSaved('Privacy Policy saved');
    };

    const saveFaceConsent = () => {
        localStorage.setItem('face_matching_consent_notice', faceConsent);
        markSaved('Face matching consent notice saved');
    };

    const handleFaceRetentionChange = (val) => {
        setFaceRetention(val);
        localStorage.setItem('face_data_retention', val);
        markSaved('Face data retention updated');
    };

    const handleNoticeTypeChange = (val) => {
        setNoticeType(val);
        localStorage.setItem('face_notice_type', val);
        markSaved('Consent notice type updated');
    };

    const retentionLabel =
        RETENTION_OPTIONS.find((o) => o.value === faceRetention)?.label || '90 days';

    const defaultPreviewText = `Use my selfie to find and send my photos from this event. ${studioName} keeps it for ${retentionLabel}, then deletes it. Required.`;
    const defaultMarketingText = `${studioName} may contact me about future shoots. Optional.`;

    return (
        <div className="lc-panel">
            <div className="lc-info-banner">
                <span className="lc-info-banner__icon" aria-hidden>
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                </span>
                <p className="lc-info-banner__text">
                    Applies to <strong>every module.</strong> The obligation follows you, not a
                    product — which is why these are here and not inside Client Gallery.
                </p>
            </div>

            {/* ── DOCUMENTS ── */}
            <section className="lc-section">
                <span className="lc-overline">DOCUMENTS</span>

                <div className="lc-doc-item">
                    <h3 className="lc-heading-3">Terms of service</h3>
                    <p className="lc-body-muted">
                        Your terms appear in the footer of every delivery. Guests agree to them by
                        downloading.
                    </p>
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
                            <button
                                type="button"
                                className="lc-btn lc-btn--dark"
                                onClick={saveTos}
                            >
                                Save TOS
                            </button>
                        </div>
                    )}
                </div>

                <hr className="lc-divider" />

                <div className="lc-doc-item">
                    <h3 className="lc-heading-3">Privacy policy</h3>
                    <p className="lc-body-muted">
                        Linked beside your terms. If you use face matching, this must say what you
                        do with a guest&apos;s photograph.
                    </p>
                    <div className="lc-doc-action-row">
                        <button
                            type="button"
                            className="lc-btn lc-btn--outline"
                            onClick={() => setEditingPrivacy(!editingPrivacy)}
                        >
                            {editingPrivacy
                                ? 'Close editor'
                                : privacyPolicy
                                  ? 'Edit policy'
                                  : 'Write policy'}
                        </button>
                        {privacyPolicy ? (
                            <span className="lc-status-badge lc-status-badge--set">
                                <span className="lc-status-dot" />
                                Set{privacyUpdated ? ` · updated ${privacyUpdated}` : ''}
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
                            <button
                                type="button"
                                className="lc-btn lc-btn--dark"
                                onClick={savePrivacyPolicy}
                            >
                                Save Privacy Policy
                            </button>
                        </div>
                    )}
                </div>

                <hr className="lc-divider" />

                <div className="lc-doc-item lc-doc-item--toggle">
                    <div className="lc-toggle-row-wrap">
                        <div className="lc-toggle-copy">
                            <h3 className="lc-heading-3">Cookie notice</h3>
                            <p className="lc-body-muted">
                                Show a cookie notice to guests. Required if you have clients in the
                                EU or UK. Once per visitor across all your links.
                            </p>
                        </div>
                        <button
                            type="button"
                            className={`lc-toggle ${cookieToggle ? 'lc-toggle--on' : ''}`}
                            onClick={handleCookieToggle}
                            aria-pressed={cookieToggle}
                            aria-label="Cookie notice"
                        >
                            <span className="lc-toggle-thumb" />
                        </button>
                    </div>
                </div>
            </section>

            {/* ── FACE MATCHING ── */}
            <section className="lc-section lc-section--face">
                <span className="lc-overline">FACE MATCHING</span>

                <div className="lc-alert-box">
                    <p className="lc-alert-text">
                        <strong>You cannot re-consent 200 people after the wedding.</strong> These
                        two settings govern a photograph of a stranger&apos;s face collected at an
                        event. Get them right before the first standee is printed.
                    </p>
                </div>

                <div className="lc-block">
                    <h3 className="lc-heading-3">Consent notice shown at registration</h3>
                    <p className="lc-body-muted lc-body-muted--lead">
                        The wording a guest agrees to when they submit a selfie. Two ticks — one
                        required, one optional and unticked.
                    </p>

                    <div className="lc-radio-cards" role="radiogroup" aria-label="Consent notice type">
                        <button
                            type="button"
                            className={`lc-radio-card ${noticeType === 'standard' ? 'lc-radio-card--active' : ''}`}
                            onClick={() => handleNoticeTypeChange('standard')}
                            aria-pressed={noticeType === 'standard'}
                        >
                            <span className="lc-radio-circle" aria-hidden>
                                {noticeType === 'standard' ? <span className="lc-radio-dot" /> : null}
                            </span>
                            <span className="lc-radio-content">
                                <span className="lc-radio-title">Standard notice</span>
                                <span className="lc-radio-desc">
                                    Written for DPDP and GDPR. Names the studio, the purpose, the
                                    retention period and the withdrawal route. Recommended.
                                </span>
                            </span>
                        </button>

                        <button
                            type="button"
                            className={`lc-radio-card ${noticeType === 'custom' ? 'lc-radio-card--active' : ''}`}
                            onClick={() => handleNoticeTypeChange('custom')}
                            aria-pressed={noticeType === 'custom'}
                        >
                            <span className="lc-radio-circle" aria-hidden>
                                {noticeType === 'custom' ? <span className="lc-radio-dot" /> : null}
                            </span>
                            <span className="lc-radio-content">
                                <span className="lc-radio-title">Your own wording</span>
                                <span className="lc-radio-desc">
                                    Replaces the standard notice. You are responsible for what it
                                    says.
                                </span>
                            </span>
                        </button>
                    </div>

                    {noticeType === 'custom' && (
                        <div className="lc-editor-wrapper">
                            <RichTextEditor
                                value={faceConsent}
                                onChange={setFaceConsent}
                                placeholder="Explain how face matching works and ask for consent…"
                            />
                            <button
                                type="button"
                                className="lc-btn lc-btn--dark"
                                onClick={saveFaceConsent}
                            >
                                Save wording
                            </button>
                        </div>
                    )}

                    <div className="lc-preview-box">
                        <span className="lc-preview-label">PREVIEW — WHAT THE GUEST SEES</span>
                        <div className="lc-preview-ticks">
                            <label className="lc-preview-tick">
                                <input
                                    type="checkbox"
                                    defaultChecked
                                    disabled
                                    className="lc-checkbox"
                                />
                                <span className="lc-checkbox-custom" />
                                <span className="lc-tick-text">
                                    {noticeType === 'standard'
                                        ? defaultPreviewText
                                        : faceConsent || defaultPreviewText}
                                </span>
                            </label>
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

                <div className="lc-block lc-block--spaced">
                    <h3 className="lc-heading-3">Keep face data for</h3>
                    <p className="lc-body-muted lc-body-muted--lead">
                        How long a guest&apos;s selfie and the matching data stay on our servers.
                        Their delivered photos are not affected.
                    </p>

                    <div
                        className="lc-radio-cards"
                        role="radiogroup"
                        aria-label="Face data retention"
                    >
                        {RETENTION_OPTIONS.map((opt) => {
                            const active = faceRetention === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`lc-radio-card ${active ? 'lc-radio-card--active' : ''}`}
                                    onClick={() => handleFaceRetentionChange(opt.value)}
                                    aria-pressed={active}
                                >
                                    <span className="lc-radio-circle" aria-hidden>
                                        {active ? <span className="lc-radio-dot" /> : null}
                                    </span>
                                    <span className="lc-radio-content">
                                        <span className="lc-radio-title">{opt.title}</span>
                                        <span className="lc-radio-desc">{opt.desc}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <p className="lc-footnote">
                        Whatever you choose here is printed in the consent notice above. The two
                        cannot disagree.
                    </p>
                </div>
            </section>

            <p className="lc-save-status">{saveStatus}</p>
        </div>
    );
}
