import React, { useState, useEffect, useCallback } from 'react';
import RichTextEditor from '../../RichTextEditor';
import { useAuth } from '../../../hooks/useAuth';
import { galleryService } from '../../../services/gallery.service';
import { AppLoader } from '../../ui/AppLoading';
import '../../../pages/Settings.css';

function getFormattedDate() {
    return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatUpdatedAt(isoOrLabel) {
    if (!isoOrLabel) return '';
    const asDate = new Date(isoOrLabel);
    if (!Number.isNaN(asDate.getTime())) {
        return asDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
    return String(isoOrLabel);
}

function resolveStudioName(name) {
    const trimmed = (name || '').trim();
    if (!trimmed || trimmed === 'Studio') return 'Your studio';
    return trimmed;
}

function htmlToPlain(html) {
    if (!html) return '';
    try {
        const el = document.createElement('div');
        el.innerHTML = html;
        return (el.textContent || el.innerText || '').trim();
    } catch {
        return String(html).replace(/<[^>]+>/g, '').trim();
    }
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [studioName, setStudioName] = useState(() => resolveStudioName(studioNameProp));

    const [tos, setTos] = useState('');
    const [privacyPolicy, setPrivacyPolicy] = useState('');
    const [cookieToggle, setCookieToggle] = useState(false);
    const [faceConsent, setFaceConsent] = useState('');
    const [faceRetention, setFaceRetention] = useState('90d');
    const [noticeType, setNoticeType] = useState('standard');

    const [editingTos, setEditingTos] = useState(false);
    const [editingPrivacy, setEditingPrivacy] = useState(false);

    const [tosUpdated, setTosUpdated] = useState('');
    const [privacyUpdated, setPrivacyUpdated] = useState('');

    const [saveStatus, setSaveStatus] = useState('');

    const markSaved = useCallback(
        (toastMsg) => {
            setSaveStatus('Saved a moment ago.');
            if (toastMsg) showToast?.(toastMsg);
        },
        [showToast]
    );

    const persist = useCallback(
        async (updates, toastMsg) => {
            if (!user?.id) return false;
            setSaving(true);
            try {
                await galleryService.updatePhotographerProfile(user.id, updates);
                markSaved(toastMsg);
                return true;
            } catch (err) {
                console.error(err);
                showToast?.(err?.message || 'Could not save. Please try again.');
                return false;
            } finally {
                setSaving(false);
            }
        },
        [user?.id, markSaved, showToast]
    );

    useEffect(() => {
        if (studioNameProp) setStudioName(resolveStudioName(studioNameProp));
    }, [studioNameProp]);

    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return undefined;
        }
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const data = await galleryService.getPhotographerProfile(user.id);
                if (cancelled || !data) return;

                // One-time migration from the old localStorage prototype.
                const localTos = localStorage.getItem('tos_text') || '';
                const localPrivacy = localStorage.getItem('privacy_policy_text') || '';
                const localCookie = localStorage.getItem('cookie_banner_enabled');
                const migrate = {};
                if (!data.tos_text && localTos) migrate.tos_text = localTos;
                if (!data.privacy_policy_text && localPrivacy) migrate.privacy_policy_text = localPrivacy;
                if (data.cookie_banner_enabled == null && localCookie != null) {
                    migrate.cookie_banner_enabled = localCookie === 'true';
                }
                if (!data.face_matching_consent_notice) {
                    const v = localStorage.getItem('face_matching_consent_notice');
                    if (v) migrate.face_matching_consent_notice = v;
                }
                if (!data.face_data_retention) {
                    const v = localStorage.getItem('face_data_retention');
                    if (v) migrate.face_data_retention = v;
                }
                if (!data.face_notice_type) {
                    const v = localStorage.getItem('face_notice_type');
                    if (v) migrate.face_notice_type = v;
                }
                if (!data.tos_updated_at && localStorage.getItem('tos_updated_at')) {
                    migrate.tos_updated_at = new Date().toISOString();
                }
                if (!data.privacy_updated_at && localStorage.getItem('privacy_updated_at')) {
                    migrate.privacy_updated_at = new Date().toISOString();
                }
                let profile = data;
                if (Object.keys(migrate).length > 0) {
                    await galleryService.updatePhotographerProfile(user.id, migrate).catch(() => null);
                    profile = { ...data, ...migrate };
                    try {
                        localStorage.removeItem('tos_text');
                        localStorage.removeItem('privacy_policy_text');
                        localStorage.removeItem('cookie_banner_enabled');
                        localStorage.removeItem('tos_updated_at');
                        localStorage.removeItem('privacy_updated_at');
                        localStorage.removeItem('face_matching_consent_notice');
                        localStorage.removeItem('face_data_retention');
                        localStorage.removeItem('face_notice_type');
                    } catch {
                        /* ignore */
                    }
                }

                setTos(profile.tos_text || '');
                setPrivacyPolicy(profile.privacy_policy_text || '');
                setCookieToggle(Boolean(profile.cookie_banner_enabled));
                setFaceConsent(profile.face_matching_consent_notice || '');
                setFaceRetention(profile.face_data_retention || '90d');
                setNoticeType(profile.face_notice_type || 'standard');
                setTosUpdated(formatUpdatedAt(profile.tos_updated_at));
                setPrivacyUpdated(formatUpdatedAt(profile.privacy_updated_at));
                setStudioName(
                    resolveStudioName(
                        studioNameProp ||
                            profile.business_name ||
                            profile.display_name ||
                            profile.studio_name
                    )
                );
            } catch (err) {
                console.error(err);
                showToast?.('Failed to load legal settings.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.id, studioNameProp, showToast]);

    const handleCookieToggle = async () => {
        const next = !cookieToggle;
        setCookieToggle(next);
        const ok = await persist(
            { cookie_banner_enabled: next },
            next ? 'Cookie banner enabled' : 'Cookie banner disabled'
        );
        if (!ok) setCookieToggle(!next);
    };

    const saveTos = async () => {
        const dateStr = getFormattedDate();
        const iso = new Date().toISOString();
        const ok = await persist(
            { tos_text: tos, tos_updated_at: iso },
            'Terms of Service saved'
        );
        if (ok) {
            setTosUpdated(dateStr);
            setEditingTos(false);
        }
    };

    const savePrivacyPolicy = async () => {
        const dateStr = getFormattedDate();
        const iso = new Date().toISOString();
        const ok = await persist(
            { privacy_policy_text: privacyPolicy, privacy_updated_at: iso },
            'Privacy Policy saved'
        );
        if (ok) {
            setPrivacyUpdated(dateStr);
            setEditingPrivacy(false);
        }
    };

    const saveFaceConsent = async () => {
        await persist(
            { face_matching_consent_notice: faceConsent },
            'Face matching consent notice saved'
        );
    };

    const handleFaceRetentionChange = async (val) => {
        const previous = faceRetention;
        setFaceRetention(val);
        const ok = await persist({ face_data_retention: val }, 'Face data retention updated');
        if (!ok) setFaceRetention(previous);
    };

    const handleNoticeTypeChange = async (val) => {
        const previous = noticeType;
        setNoticeType(val);
        const ok = await persist({ face_notice_type: val }, 'Consent notice type updated');
        if (!ok) setNoticeType(previous);
    };

    const retentionLabel =
        RETENTION_OPTIONS.find((o) => o.value === faceRetention)?.label || '90 days';

    const renderPreviewRequired = () => (
        <>
            Use my selfie to find and send my photos from this event. {studioName} keeps it for{' '}
            {retentionLabel}, then deletes it.{' '}
            <span className="lc-tick-accent">Required.</span>
        </>
    );

    const renderPreviewOptional = () => (
        <>
            {studioName} may contact me about future shoots.{' '}
            <span className="lc-tick-accent">Optional.</span>
        </>
    );

    if (loading) {
        return <AppLoader label="Loading legal settings" variant="page-short" />;
    }

    const tosSet = Boolean(htmlToPlain(tos));
    const privacySet = Boolean(htmlToPlain(privacyPolicy));

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
                            disabled={saving}
                        >
                            {editingTos ? 'Close editor' : 'Edit terms'}
                        </button>
                        {tosSet ? (
                            <span className="lc-status-badge lc-status-badge--set">
                                <span className="lc-status-dot" />
                                Set{tosUpdated ? ` · updated ${tosUpdated}` : ''}
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
                                onClick={() => void saveTos()}
                                disabled={saving}
                            >
                                {saving ? 'Saving…' : 'Save TOS'}
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
                            disabled={saving}
                        >
                            {editingPrivacy
                                ? 'Close editor'
                                : privacySet
                                  ? 'Edit policy'
                                  : 'Write policy'}
                        </button>
                        {privacySet ? (
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
                                onClick={() => void savePrivacyPolicy()}
                                disabled={saving}
                            >
                                {saving ? 'Saving…' : 'Save Privacy Policy'}
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
                            className={`ya-toggle ${cookieToggle ? 'ya-toggle--on' : ''}`}
                            onClick={() => void handleCookieToggle()}
                            aria-pressed={cookieToggle}
                            aria-label="Cookie notice"
                            disabled={saving}
                        >
                            <span className="ya-toggle__thumb" />
                        </button>
                    </div>
                </div>
            </section>

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
                            onClick={() => void handleNoticeTypeChange('standard')}
                            aria-pressed={noticeType === 'standard'}
                            disabled={saving}
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
                            onClick={() => void handleNoticeTypeChange('custom')}
                            aria-pressed={noticeType === 'custom'}
                            disabled={saving}
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
                                onClick={() => void saveFaceConsent()}
                                disabled={saving}
                            >
                                {saving ? 'Saving…' : 'Save wording'}
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
                                        ? renderPreviewRequired()
                                        : htmlToPlain(faceConsent) || renderPreviewRequired()}
                                </span>
                            </label>
                            <label className="lc-preview-tick">
                                <input type="checkbox" disabled className="lc-checkbox" />
                                <span className="lc-checkbox-custom" />
                                <span className="lc-tick-text">{renderPreviewOptional()}</span>
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
                                    onClick={() => void handleFaceRetentionChange(opt.value)}
                                    aria-pressed={active}
                                    disabled={saving}
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

            {saveStatus ? <p className="lc-save-status">{saveStatus}</p> : null}
        </div>
    );
}
