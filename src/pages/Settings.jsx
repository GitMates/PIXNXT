import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';
import { galleryService } from '../services/gallery.service';
import { clientGalleryEmailTemplatesService } from '../services/clientGalleryEmailTemplates.service';
import {
    resolveUploadDefaults,
    syncUploadDefaultsToLocalStorage,
    planAllowsRaw,
} from '../lib/uploadDefaults';
import {
    resolveGuestDeliveryDefaults,
    resolveFaceMatchingDefaults,
    resolveAccessDefaults,
    guestDeliveryPayload,
    faceMatchingPayload,
    accessDefaultsPayload,
} from '../lib/studioDefaults';
import { buildShowcaseUrl } from '../lib/showcaseUrl';
import {
    FeaturedDeliveriesModal,
    EnquiryFormEditorModal,
    normalizeEnquiryFields,
} from '../components/features/Settings';
import { AppLoader } from '../components/ui/AppLoading';
import './Settings.css';
import './ClientGallery.css';

const PRIMARY_TABS = [
    {
        id: 'delivering',
        label: 'Delivering photos',
        items: [
            { id: 'delivery-messages', label: 'Delivery & messages' },
            { id: 'guest-delivery', label: 'Guest Delivery', badge: 'NEW' },
            { id: 'face-matching', label: 'Face matching', badge: 'NEW' },
            { id: 'access-defaults', label: 'Access defaults' },
        ],
    },
    {
        id: 'handling',
        label: 'Photo handling',
        items: [
            { id: 'upload-defaults', label: 'Upload defaults' },
            { id: 'protection', label: 'Watermark' },
        ],
    },
    {
        id: 'module',
        label: 'This module',
        items: [
            { id: 'showcase-page', label: 'Showcase page' },
            { id: 'delivery-templates', label: 'Delivery templates' },
        ],
    },
];

const ALL_NAV_ITEMS = PRIMARY_TABS.flatMap((tab) =>
    tab.items.map((item) => ({ ...item, primaryId: tab.id }))
);

function primaryTabForSubtab(subtabId) {
    return PRIMARY_TABS.find((tab) => tab.items.some((item) => item.id === subtabId)) || PRIMARY_TABS[0];
}

function SettingsSaveStatus({ status, saving, children }) {
    if (!status && !saving) return null;
    return (
        <p className="gd-save-status">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{saving ? 'Saving…' : children || status}</span>
        </p>
    );
}

function useSettingsSaveStatus() {
    const [saveStatus, setSaveStatus] = useState('');
    const [saving, setSaving] = useState(false);

    const markSaved = useCallback((message = 'Saved a moment ago.') => {
        setSaveStatus(message);
        window.clearTimeout(markSaved._t);
        markSaved._t = window.setTimeout(() => setSaveStatus(''), 4000);
    }, []);

    return { saveStatus, saving, setSaving, markSaved };
}

const Settings = () => {
    const { tab } = useParams();
    const navigate = useNavigate();
    const activeTab = tab || 'delivery-messages';
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState(null);
    const [toastMessage, setToastMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    useEffect(() => {
        if (authLoading) return;

        if (!user?.id) {
            setProfile(null);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const { data, error } = await supabase
                    .from('photographers')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                if (error) throw error;
                if (cancelled || !data) return;
                setProfile(data);
                syncUploadDefaultsToLocalStorage(data);
            } catch (e) {
                console.error('Error fetching settings profile:', e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.id, authLoading]);

    // Backwards compatibility redirections
    useEffect(() => {
        if (!tab) {
            navigate('/settings/delivery-messages', { replace: true });
            return;
        }
        if (activeTab === 'presets') {
            navigate('/settings/delivery-templates', { replace: true });
        } else if (activeTab === 'watermark') {
            navigate('/settings/protection', { replace: true });
        } else if (activeTab === 'email-templates') {
            navigate('/settings/delivery-messages', { replace: true });
        } else if (activeTab === 'preferences') {
            navigate('/settings/upload-defaults', { replace: true });
        } else if (activeTab === 'branding') {
            navigate('/account/studio-identity', { replace: true });
        } else if (activeTab === 'showcase_page') {
            navigate('/settings/showcase-page', { replace: true });
        }
    }, [tab, activeTab, navigate]);

    const updateProfile = async (updates, options = {}) => {
        if (!user?.id) return;
        try {
            const { error } = await supabase
                .from('photographers')
                .update(updates)
                .eq('id', user.id);
            if (error) throw error;
            setProfile(prev => ({ ...prev, ...updates }));
            if (!options.silent) {
                showToast('Preferences saved');
            }
        } catch (e) {
            console.error('Error updating settings profile:', e);
            if (!options.silent) {
                alert(`Failed to update: ${e.message || 'Unknown error'}`);
            }
            throw e;
        }
    };

    const q = searchQuery.trim().toLowerCase();
    const filteredNavItems = ALL_NAV_ITEMS.filter((item) =>
        !q || item.label.toLowerCase().includes(q)
    );
    const activePrimary = primaryTabForSubtab(activeTab);
    const pillItems = q ? filteredNavItems : activePrimary.items;
    const visiblePrimaryTabs = q
        ? PRIMARY_TABS.filter((tab) =>
            tab.items.some((item) => item.label.toLowerCase().includes(q))
          )
        : PRIMARY_TABS;

    if (authLoading) {
        return (
            <SidebarLayout>
                <div className="flex h-screen w-full items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a1a1a]"></div>
                </div>
            </SidebarLayout>
        );
    }

    return (
        <SidebarLayout>
            <div className="settings-page-wrapper">
                <div className="settings-header-row">
                    <div>
                        <h1 className="settings-main-title">Settings</h1>
                        <p className="settings-sub-desc">
                            Defaults for new deliveries. Each delivery can override them.
                        </p>
                    </div>
                    <div className="settings-search-wrap">
                        <svg className="settings-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C827A" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search all settings"
                            className="settings-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="settings-primary-tabs" role="tablist" aria-label="Settings sections">
                    {visiblePrimaryTabs.map((tab) => {
                        const isActive = !q
                            ? tab.id === activePrimary.id
                            : tab.items.some((item) => item.id === activeTab);
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                className={`settings-primary-tab${isActive ? ' is-active' : ''}`}
                                onClick={() => {
                                    const first = tab.items[0];
                                    if (first) navigate(`/settings/${first.id}`);
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="settings-pill-tabs" role="tablist" aria-label="Settings topics">
                    {pillItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === item.id}
                            className={`settings-pill-tab${activeTab === item.id ? ' is-active' : ''}`}
                            onClick={() => navigate(`/settings/${item.id}`)}
                        >
                            <span>{item.label}</span>
                            {item.badge ? <span className="settings-badge-new">{item.badge}</span> : null}
                        </button>
                    ))}
                    {pillItems.length === 0 ? (
                        <p className="settings-search-empty">No matches found</p>
                    ) : null}
                </div>

                <div className="settings-right-content settings-right-content--single" key={activeTab}>
                    {activeTab === 'delivery-templates' && <PresetsTab profile={profile} />}
                    {activeTab === 'protection' && <WatermarkTab profile={profile} updateProfile={updateProfile} />}
                    {activeTab === 'delivery-messages' && (
                        <EmailTemplatesTab profile={profile} updateProfile={updateProfile} />
                    )}
                    {activeTab === 'upload-defaults' && <PreferencesTab profile={profile} updateProfile={updateProfile} />}
                    {activeTab === 'showcase-page' && (
                        <ShowcasePageTab profile={profile} user={user} updateProfile={updateProfile} />
                    )}
                    {activeTab === 'guest-delivery' && (
                        <GuestDeliveryTab profile={profile} updateProfile={updateProfile} />
                    )}
                    {activeTab === 'face-matching' && (
                        <FaceMatchingTab profile={profile} updateProfile={updateProfile} />
                    )}
                    {activeTab === 'access-defaults' && (
                        <AccessDefaultsTab profile={profile} updateProfile={updateProfile} />
                    )}
                </div>
            </div>

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

/* ── Placeholder Tab helper ── */
const PlaceholderTab = ({ title, desc, link, linkText }) => {
    const navigate = useNavigate();
    return (
        <div className="settings-placeholder-tab">
            <h2 className="settings-right-title">{title}</h2>
            <p className="settings-right-desc">{desc}</p>
            {link && (
                <button
                    type="button"
                    className="settings-pill-btn mt-4"
                    onClick={() => navigate(link)}
                >
                    {linkText}
                </button>
            )}
        </div>
    );
};

/* ── Guest Delivery (static defaults UI) ── */
const GD_REG_CLOSE_OPTIONS = [
    {
        value: '48h',
        title: '48 hours after the event date',
        desc: 'Covers the late arrival, the friend who was shown a photo, and the guest who scanned but did not finish.',
        recommended: true,
    },
    {
        value: 'custom',
        title: 'A set time you choose per delivery',
        desc: 'For multi-day weddings where the code stays up across three functions.',
    },
    {
        value: 'on_publish',
        title: 'When you publish the photos',
        desc: "Today's behaviour. Anyone scanning after you publish gets a request form, not a dead end.",
    },
];

const GD_CHANNEL_OPTIONS = [
    {
        value: 'whatsapp_email',
        title: 'WhatsApp, with email as a fallback',
        desc: 'The guest chooses at registration. Recommended for India.',
    },
    {
        value: 'email',
        title: 'Email only',
        desc: 'For studios shooting outside WhatsApp markets.',
    },
];

const GD_ARRIVAL_OPTIONS = [
    { value: 'same_evening', label: 'Same evening' },
    { value: 'next_day', label: 'Next day' },
    { value: 'within_3_days', label: 'Within 3 days' },
    { value: 'within_week', label: 'Within a week' },
    { value: 'custom', label: 'Custom' },
];

const GD_STANDEE_OPTIONS = [
    { value: 'classic', title: 'Classic', desc: 'Serif, ivory, quiet', icon: 'classic' },
    { value: 'modern', title: 'Modern', desc: 'Sans, high contrast', icon: 'modern' },
    { value: 'festive', title: 'Festive', desc: 'Marigold, ornamental', icon: 'festive' },
];

const GD_LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'ta', label: 'Tamil' },
    { value: 'hi', label: 'Hindi' },
    { value: 'te', label: 'Telugu' },
    { value: 'more', label: '+ 6 more' },
];

function GdStandeeIcon({ type }) {
    if (type === 'classic') {
        return (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
                <rect x="3" y="3" width="9" height="9" rx="1.5" stroke="#8c857e" strokeWidth="1.5" />
                <rect x="16" y="3" width="9" height="9" rx="1.5" stroke="#8c857e" strokeWidth="1.5" />
                <rect x="3" y="16" width="9" height="9" rx="1.5" stroke="#8c857e" strokeWidth="1.5" />
                <rect x="16" y="16" width="9" height="9" rx="1.5" stroke="#8c857e" strokeWidth="1.5" />
            </svg>
        );
    }
    if (type === 'modern') {
        return (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
                <rect x="4" y="4" width="20" height="20" rx="3" stroke="#8c857e" strokeWidth="1.5" />
                <path d="M14 9v10M9 14h10" stroke="#8c857e" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        );
    }
    return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <path
                d="M14 4.5l2.4 6.2 6.6.4-5.1 4.3 1.7 6.4L14 18.4l-5.6 3.4 1.7-6.4-5.1-4.3 6.6-.4L14 4.5z"
                stroke="#8c857e"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </svg>
    );
}

const GuestDeliveryTab = ({ profile, updateProfile }) => {
    const navigate = useNavigate();
    const { saveStatus, saving, setSaving, markSaved } = useSettingsSaveStatus();
    const [enabled, setEnabled] = useState(false);
    const [regClose, setRegClose] = useState('48h');
    const [autoBatches, setAutoBatches] = useState(true);
    const [channel, setChannel] = useState('whatsapp_email');
    const [arrival, setArrival] = useState('next_day');
    const [slipMessage, setSlipMessage] = useState(true);
    const [standee, setStandee] = useState('classic');
    const [languages, setLanguages] = useState(['en', 'ta']);

    useEffect(() => {
        if (!profile) return;
        const d = resolveGuestDeliveryDefaults(profile);
        setEnabled(d.enabled);
        setRegClose(d.regClose);
        setAutoBatches(d.autoBatches);
        setChannel(d.channel);
        setArrival(d.arrival);
        setSlipMessage(d.slipMessage);
        setStandee(d.standee);
        setLanguages(d.languages);
    }, [profile?.id, profile?.guest_delivery_defaults]);

    const persist = useCallback(async (patch) => {
        if (!profile?.id || saving) return;
        const payload = guestDeliveryPayload({
            enabled,
            regClose,
            autoBatches,
            channel,
            arrival,
            slipMessage,
            standee,
            languages,
            ...patch,
        });
        setSaving(true);
        try {
            await updateProfile({ guest_delivery_defaults: payload }, { silent: true });
            markSaved('Saved just now. Applies to new deliveries only.');
        } catch (e) {
            console.error('Guest delivery defaults save failed:', e);
            alert(`Failed to save: ${e.message || 'Unknown error'}`);
            throw e;
        } finally {
            setSaving(false);
        }
    }, [
        profile?.id,
        saving,
        enabled,
        regClose,
        autoBatches,
        channel,
        arrival,
        slipMessage,
        standee,
        languages,
        updateProfile,
        markSaved,
        setSaving,
    ]);

    const apply = (patch) => {
        if ('enabled' in patch) setEnabled(patch.enabled);
        if ('regClose' in patch) setRegClose(patch.regClose);
        if ('autoBatches' in patch) setAutoBatches(patch.autoBatches);
        if ('channel' in patch) setChannel(patch.channel);
        if ('arrival' in patch) setArrival(patch.arrival);
        if ('slipMessage' in patch) setSlipMessage(patch.slipMessage);
        if ('standee' in patch) setStandee(patch.standee);
        if ('languages' in patch) setLanguages(patch.languages);
        persist(patch);
    };

    const toggleLanguage = (value) => {
        if (value === 'more') return;
        setLanguages((prev) => {
            const next = prev.includes(value)
                ? prev.filter((v) => v !== value)
                : [...prev, value];
            persist({ languages: next });
            return next;
        });
    };

    return (
        <div className="gd-panel">
            <p className="gd-lead">
                Guests at the event scan a code, register with a selfie, and receive their own photos on
                WhatsApp. These are the defaults every new delivery starts with.
            </p>

            <div className="gd-info-box">
                <span className="gd-info-icon" aria-hidden>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                </span>
                <p className="gd-info-text">
                    The consent wording and how long face data is kept are{' '}
                    <strong>studio-wide</strong>, because the obligation is yours, not this module&apos;s.
                    They live in{' '}
                    <button
                        type="button"
                        className="gd-info-link"
                        onClick={() => navigate('/account/legal-consent')}
                    >
                        Profile &gt; Legal &amp; consent
                    </button>
                    .
                </p>
            </div>

            <section className="gd-section">
                <span className="gd-overline">REGISTRATION</span>

                <div className="gd-setting">
                    <div className="gd-setting-head">
                        <span className="gd-label">Turn on Guest Delivery for new deliveries</span>
                        <button
                            type="button"
                            className={`settings-toggle ${enabled ? 'settings-toggle--on' : ''}`}
                            onClick={() => apply({ enabled: !enabled })}
                            aria-pressed={enabled}
                            aria-label="Turn on Guest Delivery for new deliveries"
                        >
                            <span className="settings-toggle-thumb" />
                        </button>
                    </div>
                    <p className="gd-desc">
                        Off by default. A corporate shoot or a studio portrait has no guests to match.
                    </p>
                </div>

                <div className="gd-divider" />

                <div className="gd-block">
                    <span className="gd-label">Registration closes</span>
                    <p className="gd-desc">
                        When guests can no longer sign up. Publishing photos and closing registration are
                        separate events — a guest arriving late at the reception must still be able to scan.
                    </p>
                    <div className="gd-radio-cards">
                        {GD_REG_CLOSE_OPTIONS.map((opt) => {
                            const active = regClose === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`gd-radio-card${active ? ' gd-radio-card--active' : ''}`}
                                    onClick={() => apply({ regClose: opt.value })}
                                    aria-pressed={active}
                                >
                                    <span className="gd-radio-circle" aria-hidden>
                                        {active ? <span className="gd-radio-dot" /> : null}
                                    </span>
                                    <span className="gd-radio-copy">
                                        <span className="gd-radio-title">{opt.title}</span>
                                        <span className="gd-radio-desc">
                                            {opt.desc}
                                            {opt.recommended ? (
                                                <>
                                                    {' '}
                                                    <span className="gd-radio-rec">Recommended.</span>
                                                </>
                                            ) : null}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="gd-setting gd-setting--spaced">
                    <div className="gd-setting-head">
                        <span className="gd-label">Send later batches automatically</span>
                        <button
                            type="button"
                            className={`settings-toggle ${autoBatches ? 'settings-toggle--on' : ''}`}
                            onClick={() => apply({ autoBatches: !autoBatches })}
                            aria-pressed={autoBatches}
                            aria-label="Send later batches automatically"
                        >
                            <span className="settings-toggle-thumb" />
                        </button>
                    </div>
                    <p className="gd-desc">
                        You upload over three days. Each time you publish, guests already registered get
                        only what is new — never a duplicate of what they already have.
                    </p>
                </div>
            </section>

            <div className="gd-divider" />

            <section className="gd-section">
                <span className="gd-overline">HOW PHOTOS REACH A GUEST</span>

                <div className="gd-block">
                    <span className="gd-label">Channel</span>
                    <p className="gd-desc">
                        WhatsApp first, email always offered. A guest who gives only an email address is never
                        a dead end.
                    </p>
                    <div className="gd-radio-cards">
                        {GD_CHANNEL_OPTIONS.map((opt) => {
                            const active = channel === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`gd-radio-card${active ? ' gd-radio-card--active' : ''}`}
                                    onClick={() => apply({ channel: opt.value })}
                                    aria-pressed={active}
                                >
                                    <span className="gd-radio-circle" aria-hidden>
                                        {active ? <span className="gd-radio-dot" /> : null}
                                    </span>
                                    <span className="gd-radio-copy">
                                        <span className="gd-radio-title">{opt.title}</span>
                                        <span className="gd-radio-desc">{opt.desc}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="gd-footnote">
                        Photos always arrive as a link to their own page, never as images pasted into the chat.
                        The page carries your name and the print offer; a chat attachment carries neither.
                    </p>
                </div>

                <div className="gd-divider" />

                <div className="gd-block">
                    <span className="gd-label">Tell guests when photos will arrive</span>
                    <p className="gd-desc">
                        Printed on the standee, the registration screen and the confirmation message. A guest
                        who knows photos arrive Thursday does not stop you mid-reception to ask.
                    </p>
                    <div className="gd-pills">
                        {GD_ARRIVAL_OPTIONS.map((opt) => {
                            const active = arrival === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`gd-pill${active ? ' gd-pill--active' : ''}`}
                                    onClick={() => apply({ arrival: opt.value })}
                                    aria-pressed={active}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="gd-setting gd-setting--spaced">
                    <div className="gd-setting-head">
                        <span className="gd-label">Message guests if it slips</span>
                        <button
                            type="button"
                            className={`settings-toggle ${slipMessage ? 'settings-toggle--on' : ''}`}
                            onClick={() => apply({ slipMessage: !slipMessage })}
                            aria-pressed={slipMessage}
                            aria-label="Message guests if it slips"
                        >
                            <span className="settings-toggle-thumb" />
                        </button>
                    </div>
                    <p className="gd-desc">
                        If you pass the date you promised, guests get one message with a new one. Silence
                        is what generates the calls.
                    </p>
                </div>
            </section>

            <div className="gd-divider" />

            <section className="gd-section">
                <span className="gd-overline">THE CODE GUESTS SCAN</span>

                <div className="gd-block">
                    <span className="gd-label">Default standee design</span>
                    <p className="gd-desc">
                        Ready to print at A3 and A5, plus a 16:9 venue screen and a 9:16 version for the
                        couple&apos;s status. You should never take a bare code to a printer.
                    </p>
                    <div className="gd-standee-grid">
                        {GD_STANDEE_OPTIONS.map((opt) => {
                            const active = standee === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`gd-standee-card${active ? ' gd-standee-card--active' : ''}`}
                                    onClick={() => apply({ standee: opt.value })}
                                    aria-pressed={active}
                                >
                                    <span className="gd-standee-preview">
                                        <GdStandeeIcon type={opt.icon} />
                                    </span>
                                    <span className="gd-standee-meta">
                                        <span className="gd-standee-title">{opt.title}</span>
                                        <span className="gd-standee-desc">{opt.desc}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="gd-footnote">
                        Studio marks, event details, an editable headline, and the scan line repeated in every
                        language you select. Bare SVG is also exported for a designer.
                    </p>
                </div>

                <div className="gd-block gd-block--spaced">
                    <span className="gd-label">Languages on the standee</span>
                    <p className="gd-desc">
                        The scan instruction repeats in each. Everything else stays in English.
                    </p>
                    <div className="gd-pills">
                        {GD_LANGUAGE_OPTIONS.map((opt) => {
                            const active = languages.includes(opt.value);
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`gd-pill${active ? ' gd-pill--active' : ''}`}
                                    onClick={() => toggleLanguage(opt.value)}
                                    aria-pressed={active}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            <div className="gd-divider" />

            <SettingsSaveStatus status={saveStatus} saving={saving}>
                Saved just now. Applies to new deliveries only — existing deliveries keep their own settings.
            </SettingsSaveStatus>
        </div>
    );
};

/* ── Face matching defaults UI ── */
const FM_MATCH_OPTIONS = [
    {
        value: 'strict',
        title: 'Strict',
        desc: "Sends a photo only when the system is confident. A few photos of a guest get missed rather than a stranger's photo being sent to the wrong person.",
        recommended: true,
    },
    {
        value: 'balanced',
        title: 'Balanced',
        desc: 'Sends more photos per guest and occasionally sends one they are not in.',
    },
];

const FaceMatchingTab = ({ profile, updateProfile }) => {
    const navigate = useNavigate();
    const { saveStatus, saving, setSaving, markSaved } = useSettingsSaveStatus();
    const [matchCertainty, setMatchCertainty] = useState('strict');
    const [holdLowConfidence, setHoldLowConfidence] = useState(true);
    const [sendHighlightsWhenEmpty, setSendHighlightsWhenEmpty] = useState(true);
    const [guestSelfClaim, setGuestSelfClaim] = useState(true);

    useEffect(() => {
        if (!profile) return;
        const d = resolveFaceMatchingDefaults(profile);
        setMatchCertainty(d.matchCertainty);
        setHoldLowConfidence(d.holdLowConfidence);
        setSendHighlightsWhenEmpty(d.sendHighlightsWhenEmpty);
        setGuestSelfClaim(d.guestSelfClaim);
    }, [profile?.id, profile?.face_matching_defaults]);

    const persist = useCallback(async (patch) => {
        if (!profile?.id || saving) return;
        const payload = faceMatchingPayload({
            matchCertainty,
            holdLowConfidence,
            sendHighlightsWhenEmpty,
            guestSelfClaim,
            ...patch,
        });
        setSaving(true);
        try {
            await updateProfile({ face_matching_defaults: payload }, { silent: true });
            markSaved();
        } catch (e) {
            console.error('Face matching defaults save failed:', e);
            alert(`Failed to save: ${e.message || 'Unknown error'}`);
            throw e;
        } finally {
            setSaving(false);
        }
    }, [
        profile?.id,
        saving,
        matchCertainty,
        holdLowConfidence,
        sendHighlightsWhenEmpty,
        guestSelfClaim,
        updateProfile,
        markSaved,
        setSaving,
    ]);

    const apply = (patch) => {
        if ('matchCertainty' in patch) setMatchCertainty(patch.matchCertainty);
        if ('holdLowConfidence' in patch) setHoldLowConfidence(patch.holdLowConfidence);
        if ('sendHighlightsWhenEmpty' in patch) setSendHighlightsWhenEmpty(patch.sendHighlightsWhenEmpty);
        if ('guestSelfClaim' in patch) setGuestSelfClaim(patch.guestSelfClaim);
        persist(patch);
    };

    return (
        <div className="fm-panel gd-panel">
            <p className="gd-lead">
                How hard the system tries to find a person in your photographs, and what happens when it is
                unsure.
            </p>

            <div className="gd-info-box">
                <span className="gd-info-icon" aria-hidden>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                </span>
                <p className="gd-info-text">
                    Consent wording and retention are <strong>studio-wide</strong> —{' '}
                    <button
                        type="button"
                        className="gd-info-link"
                        onClick={() => navigate('/account/legal-consent')}
                    >
                        Profile › Legal &amp; consent
                    </button>
                    . This page is only about accuracy.
                </p>
            </div>

            <section className="gd-section">
                <div className="gd-block">
                    <span className="fm-section-title">How certain a match must be</span>
                    <div className="gd-radio-cards">
                        {FM_MATCH_OPTIONS.map((opt) => {
                            const active = matchCertainty === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`gd-radio-card${active ? ' gd-radio-card--active' : ''}`}
                                    onClick={() => apply({ matchCertainty: opt.value })}
                                    aria-pressed={active}
                                >
                                    <span className="gd-radio-circle" aria-hidden>
                                        {active ? <span className="gd-radio-dot" /> : null}
                                    </span>
                                    <span className="gd-radio-copy">
                                        <span className="gd-radio-title">{opt.title}</span>
                                        <span className="gd-radio-desc">
                                            {opt.desc}
                                            {opt.recommended ? (
                                                <>
                                                    {' '}
                                                    <span className="gd-radio-rec">Recommended.</span>
                                                </>
                                            ) : null}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="gd-footnote">
                        A guest browsing a gallery can ignore a wrong photo. A guest <strong>sent</strong> a
                        stranger&apos;s photo is a complaint, and possibly a privacy incident. That asymmetry is
                        why the default is Strict.
                    </p>
                </div>
            </section>

            <div className="gd-divider" />

            <section className="gd-section">
                <span className="fm-section-title">When the system is unsure</span>

                <div className="gd-setting">
                    <div className="gd-setting-head">
                        <span className="gd-label">Hold low-confidence matches for you to review</span>
                        <button
                            type="button"
                            className={`settings-toggle ${holdLowConfidence ? 'settings-toggle--on' : ''}`}
                            onClick={() => apply({ holdLowConfidence: !holdLowConfidence })}
                            aria-pressed={holdLowConfidence}
                            aria-label="Hold low-confidence matches for you to review"
                        >
                            <span className="settings-toggle-thumb" />
                        </button>
                    </div>
                    <p className="gd-desc">
                        They appear in People with the guest&apos;s registered photo beside the match. Approve
                        or reject in a tap.
                    </p>
                </div>

                <div className="gd-divider" />

                <div className="gd-setting">
                    <div className="gd-setting-head">
                        <span className="gd-label">When a guest has no photos at all</span>
                        <button
                            type="button"
                            className={`settings-toggle ${sendHighlightsWhenEmpty ? 'settings-toggle--on' : ''}`}
                            onClick={() => apply({ sendHighlightsWhenEmpty: !sendHighlightsWhenEmpty })}
                            aria-pressed={sendHighlightsWhenEmpty}
                            aria-label="When a guest has no photos at all"
                        >
                            <span className="settings-toggle-thumb" />
                        </button>
                    </div>
                    <p className="gd-desc">
                        Send them the event highlights instead, and tell you it happened. This will occur at
                        every wedding, and silence reads to the guest as broken.
                    </p>
                </div>

                <div className="gd-divider" />

                <div className="gd-setting">
                    <div className="gd-setting-head">
                        <span className="gd-label">Let guests say &quot;I&apos;m in this one too&quot;</span>
                        <button
                            type="button"
                            className={`settings-toggle ${guestSelfClaim ? 'settings-toggle--on' : ''}`}
                            onClick={() => apply({ guestSelfClaim: !guestSelfClaim })}
                            aria-pressed={guestSelfClaim}
                            aria-label={`Let guests say I'm in this one too`}
                        >
                            <span className="settings-toggle-thumb" />
                        </button>
                    </div>
                    <p className="gd-desc">
                        A guest can point at a photo you missed. Without this, every missed person is a silent
                        failure you never hear about.
                    </p>
                </div>
            </section>

            <aside className="fm-vocab" aria-label="Vocabulary guidance">
                <p>
                    <strong>Vocabulary, enforced in the component.</strong> One detected person is{' '}
                    <strong>one person</strong>. Never <em>group</em>, <em>cluster</em>, <em>face group</em>,{' '}
                    <em>match set</em> or <em>unclaimed cluster</em> — every one of those reads to a normal
                    person as several individuals bundled together, which is the opposite of what happens.
                    Never render the cluster index: it is <strong>Not named</strong> with a{' '}
                    <strong>That&apos;s me</strong> action, not <em>Person 14</em>.
                </p>
            </aside>

            <SettingsSaveStatus status={saveStatus} saving={saving} />
        </div>
    );
};

/* ── Access defaults (static UI) ── */
const AD_OPEN_OPTIONS = [
    {
        value: 'anyone',
        title: 'Anyone with the link',
        desc: 'No PIN. Fewest support messages, and the right default for most weddings.',
    },
    {
        value: 'link_pin',
        title: 'Link + PIN',
        desc: 'A 4-digit code travels with the link in the same message.',
    },
    {
        value: 'named_email',
        title: 'Named email addresses only',
        desc: 'For commercial work where you must know who opened it.',
    },
];

const AccessDefaultsTab = ({ profile, updateProfile }) => {
    const { saveStatus, saving, setSaving, markSaved } = useSettingsSaveStatus();
    const [whoCanOpen, setWhoCanOpen] = useState('anyone');

    useEffect(() => {
        if (!profile) return;
        const d = resolveAccessDefaults(profile);
        setWhoCanOpen(d.whoCanOpen);
    }, [profile?.id, profile?.access_defaults]);

    const persist = useCallback(async (nextWhoCanOpen) => {
        if (!profile?.id || saving) return;
        setSaving(true);
        try {
            await updateProfile(
                { access_defaults: accessDefaultsPayload({ whoCanOpen: nextWhoCanOpen }) },
                { silent: true }
            );
            markSaved();
        } catch (e) {
            console.error('Access defaults save failed:', e);
            alert(`Failed to save: ${e.message || 'Unknown error'}`);
            throw e;
        } finally {
            setSaving(false);
        }
    }, [profile?.id, saving, updateProfile, markSaved, setSaving]);

    const handleWhoCanOpen = (value) => {
        setWhoCanOpen(value);
        persist(value);
    };

    return (
        <div className="ad-panel">
            <p className="ad-lead">
                Who can open a new delivery. One question, three answers, and every delivery can override it.
            </p>

            <section className="gd-section ad-section">
                <span className="gd-overline">WHO CAN OPEN A NEW DELIVERY</span>
                <div className="gd-radio-cards ad-radio-cards--row">
                    {AD_OPEN_OPTIONS.map((opt) => {
                        const active = whoCanOpen === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                className={`gd-radio-card${active ? ' gd-radio-card--active' : ''}`}
                                onClick={() => handleWhoCanOpen(opt.value)}
                                aria-pressed={active}
                            >
                                <span className="gd-radio-circle" aria-hidden>
                                    {active ? <span className="gd-radio-dot" /> : null}
                                </span>
                                <span className="gd-radio-copy">
                                    <span className="gd-radio-title">{opt.title}</span>
                                    <span className="gd-radio-desc">{opt.desc}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <div className="gd-divider" />

            <section className="gd-section">
                <span className="gd-overline">FULL DOWNLOADS</span>
                <div className="settings-callout">
                    <strong>Removed — &quot;ask where to send the archive above 40 photos&quot;</strong>
                    <p>
                        Full sets are zipped on the server and emailed as a link when the browser cannot
                        handle them alone. The delivery address is collected once at access, not again at
                        download.
                    </p>
                </div>
            </section>

            <div className="gd-divider" />

            <SettingsSaveStatus status={saveStatus} saving={saving} />
        </div>
    );
};

/* ── PresetsTab (Delivery templates) ── */
const presetSummaryLine = (settings = {}) => {
    const s = settings || {};
    const parts = [];
    parts.push(s.emailRegistration || s.guestDelivery ? 'Guest Delivery on' : 'Guest Delivery off');
    parts.push(s.defaultWatermark ? 'watermark on' : 'watermark off');
    parts.push(s.socialSharing !== false ? 'sharing on' : 'sharing off');
    parts.push(s.photoDownload !== false ? 'downloads on' : 'downloads off');
    parts.push(s.favoritePhotos !== false ? 'favorites on' : 'favorites off');
    if (s.storeStatus === false) parts.push('store off');
    else parts.push('store on');
    return parts.join(' · ');
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
                .eq('photographer_id', profile.id)
                .order('created_at', { ascending: true });
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
                        typography: 'sans',
                        colorTheme: 'light',
                        socialSharing: true,
                        slideshow: true,
                        photoDownload: true,
                        favoritePhotos: true,
                        storeStatus: true,
                        isDefault: presets.length === 0,
                    },
                })
                .select()
                .single();
            if (error) throw error;
            if (data) {
                setPresets((prev) => [...prev, data]);
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
        if (!window.confirm('Are you sure you want to delete this template?')) return;
        try {
            const { error } = await supabase.from('presets').delete().eq('id', id);
            if (error) throw error;
            setPresets((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
            console.error('Error deleting preset:', err);
            alert(`Failed to delete template: ${err.message}`);
        }
    };

    const isDefaultPreset = (preset, index) =>
        Boolean(preset?.settings?.isDefault) || (index === 0 && !presets.some((p) => p?.settings?.isDefault));

    return (
        <div className="dt-panel">
            <p className="dt-lead">
                Save a set of delivery settings once and apply it to every new wedding, so you&apos;re not
                repeating the same six toggles.
            </p>

            <span className="dt-overline">YOUR TEMPLATES</span>

            {loading ? (
                <AppLoader label="Loading templates" variant="compact" className="dt-loading app-loader" />
            ) : presets.length === 0 ? (
                <p className="dt-empty">No templates yet. Create one to reuse delivery settings.</p>
            ) : (
                <ul className="dt-list">
                    {presets.map((preset, index) => {
                        const isDefault = isDefaultPreset(preset, index);
                        return (
                        <li key={preset.id} className="dt-row">
                            <div className="dt-row-main">
                                <div className="dt-row-title-line">
                                    <span className="dt-row-name">{preset.name}</span>
                                    {isDefault ? (
                                        <span className="dt-default-badge">
                                            <span className="dt-default-dot" aria-hidden />
                                            Default
                                        </span>
                                    ) : null}
                                </div>
                                <p className="dt-row-summary">{presetSummaryLine(preset.settings)}</p>
                            </div>
                            <div className="dt-row-actions">
                                <button
                                    type="button"
                                    className="dt-edit-btn"
                                    onClick={() => navigate(`/settings/presets/${preset.id}`)}
                                >
                                    Edit
                                </button>
                                {!isDefault ? (
                                    <button
                                        type="button"
                                        className="dt-delete-btn"
                                        onClick={() => handleDeletePreset(preset.id)}
                                        aria-label={`Delete ${preset.name}`}
                                    >
                                        Delete
                                    </button>
                                ) : null}
                            </div>
                        </li>
                        );
                    })}
                </ul>
            )}

            <button type="button" className="dt-new-btn" onClick={() => setShowAddForm(true)}>
                + New template
            </button>

            {showAddForm ? (
                <div className="dt-modal-backdrop" role="presentation" onClick={() => setShowAddForm(false)}>
                    <div
                        className="dt-modal"
                        role="dialog"
                        aria-labelledby="dt-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="dt-modal-close"
                            onClick={() => setShowAddForm(false)}
                            aria-label="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                        <h3 id="dt-modal-title" className="dt-modal-title">
                            Create new template
                        </h3>
                        <form onSubmit={handleAddPreset}>
                            <label className="dt-modal-label" htmlFor="dt-new-name">
                                Give your new template a name
                            </label>
                            <input
                                id="dt-new-name"
                                type="text"
                                value={newPresetName}
                                onChange={(e) => setNewPresetName(e.target.value)}
                                autoFocus
                                className="dt-modal-input"
                                placeholder="e.g. Wedding — full"
                            />
                            <div className="dt-modal-actions">
                                <button type="button" className="dt-modal-cancel" onClick={() => setShowAddForm(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="dt-modal-create" disabled={!newPresetName.trim()}>
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

/* ── ShowcasePageTab ── */
const ShowcasePageTab = ({ profile, user, updateProfile }) => {
    const navigate = useNavigate();
    const [publishShowcase, setPublishShowcase] = useState(true);
    const [enquiryForm, setEnquiryForm] = useState(true);
    const [enquiryFields, setEnquiryFields] = useState(() =>
        normalizeEnquiryFields(profile?.showcase_enquiry_fields)
    );
    const [featuredCount, setFeaturedCount] = useState(null);
    const [publishedTotal, setPublishedTotal] = useState(null);
    const [enquiries, setEnquiries] = useState([]);
    const [enquiriesLoading, setEnquiriesLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');
    const [saving, setSaving] = useState(false);
    const [featureOpen, setFeatureOpen] = useState(false);
    const [enquiryOpen, setEnquiryOpen] = useState(false);

    useEffect(() => {
        if (!profile) return;
        setPublishShowcase(profile.showcase_enabled !== false);
        setEnquiryForm(profile.showcase_enquiry_enabled !== false);
        let fields = normalizeEnquiryFields(profile.showcase_enquiry_fields);
        if (!profile.showcase_enquiry_fields && profile.id) {
            try {
                const raw = localStorage.getItem(`pixnxt:showcase_enquiry_fields:${profile.id}`);
                if (raw) fields = normalizeEnquiryFields(JSON.parse(raw));
            } catch {
                /* ignore */
            }
        }
        setEnquiryFields(fields);
    }, [profile]);

    useEffect(() => {
        if (!profile?.id) return;
        let cancelled = false;
        setEnquiriesLoading(true);
        galleryService
            .getShowcaseEnquiries(profile.id, 8)
            .then((rows) => {
                if (!cancelled) setEnquiries(rows || []);
            })
            .catch((err) => {
                console.error('Failed to load showcase enquiries:', err);
                if (!cancelled) setEnquiries([]);
            })
            .finally(() => {
                if (!cancelled) setEnquiriesLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [profile?.id, enquiryForm]);

    const refreshFeaturedCount = useCallback(async () => {
        if (!profile?.id) return;
        try {
            const collections = await galleryService.getCollections(profile.id);
            const published = (collections || []).filter((c) => c.status === 'published');
            const count = published.filter((c) => c.show_on_showcase !== false).length;
            setFeaturedCount(count);
            setPublishedTotal(published.length);
        } catch (err) {
            console.error('Failed to load featured delivery count:', err);
            setFeaturedCount(0);
            setPublishedTotal(0);
        }
    }, [profile?.id]);

    useEffect(() => {
        refreshFeaturedCount();
    }, [refreshFeaturedCount]);

    const markSaved = () => {
        setSaveStatus('Saved a moment ago.');
        window.clearTimeout(markSaved._t);
        markSaved._t = window.setTimeout(() => setSaveStatus(''), 4000);
    };

    const showcaseUrl = buildShowcaseUrl(profile, user);
    const studioName =
        profile?.business_name || profile?.studio_name || profile?.full_name || 'Your studio';

    const handlePublishToggle = async () => {
        if (saving) return;
        const next = !publishShowcase;
        const prev = publishShowcase;
        setPublishShowcase(next);
        setSaving(true);
        try {
            await updateProfile({ showcase_enabled: next }, { silent: true });
            markSaved();
        } catch (err) {
            console.error('Failed to update showcase publish setting:', err);
            setPublishShowcase(prev);
            alert('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleEnquiryToggle = async () => {
        if (saving) return;
        const next = !enquiryForm;
        const prev = enquiryForm;
        setEnquiryForm(next);
        setSaving(true);
        try {
            await updateProfile({ showcase_enquiry_enabled: next }, { silent: true });
            markSaved();
        } catch (err) {
            console.error('Failed to update enquiry form setting:', err);
            setEnquiryForm(prev);
            alert('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveEnquiryFields = async (fields) => {
        try {
            await updateProfile({ showcase_enquiry_fields: fields }, { silent: true });
        } catch (err) {
            // Column may not exist until migration is applied — keep a local copy.
            if (profile?.id) {
                localStorage.setItem(
                    `pixnxt:showcase_enquiry_fields:${profile.id}`,
                    JSON.stringify(fields)
                );
            } else {
                throw err;
            }
        }
        if (profile?.id) {
            localStorage.setItem(
                `pixnxt:showcase_enquiry_fields:${profile.id}`,
                JSON.stringify(fields)
            );
        }
        setEnquiryFields(fields);
        markSaved();
    };

    const featuredLabel =
        featuredCount === null
            ? 'Loading featured deliveries…'
            : featuredCount === 0
              ? 'None chosen yet. Order, covers and crops are set on the Showcase page itself.'
              : `${featuredCount} of ${publishedTotal ?? featuredCount} chosen. Order, covers and crops are set on the Showcase page itself.`;

    return (
        <div className="lc-panel settings-showcase-panel">
            <p className="settings-right-desc settings-showcase-intro">
                Your public page at{' '}
                <a href={showcaseUrl} target="_blank" rel="noreferrer" className="settings-inline-link">
                    {showcaseUrl.replace(/^https?:\/\//, '')}
                </a>
                , built from deliveries you choose to feature.
            </p>

            <span className="settings-section-overline">PAGE</span>

            <div className="settings-row">
                <div className="settings-row__text">
                    <strong className="settings-field-title">Publish Showcase</strong>
                    <p className="settings-right-desc">
                        {publishShowcase ? (
                            <>
                                Live at{' '}
                                <a href={showcaseUrl} target="_blank" rel="noreferrer" className="settings-inline-link">
                                    {showcaseUrl.replace(/^https?:\/\//, '')}
                                </a>
                                . Turn off and the address returns nothing — no holding page, no stale portfolio.
                            </>
                        ) : (
                            'Showcase is off. Your public address shows nothing until you turn this back on.'
                        )}
                    </p>
                </div>
                <button
                    type="button"
                    className={`settings-toggle ${publishShowcase ? 'settings-toggle--on' : ''}`}
                    onClick={handlePublishToggle}
                    disabled={saving}
                    aria-pressed={publishShowcase}
                    aria-label={publishShowcase ? 'Turn off Publish Showcase' : 'Turn on Publish Showcase'}
                >
                    <span className="settings-toggle-thumb" />
                </button>
            </div>

            <div className="settings-row">
                <div className="settings-row__text">
                    <strong className="settings-field-title">Featured deliveries</strong>
                    <p className="settings-right-desc">{featuredLabel}</p>
                </div>
                <button
                    type="button"
                    className="settings-pill-btn"
                    onClick={() => setFeatureOpen(true)}
                >
                    Choose
                </button>
            </div>

            <div className="settings-row settings-row--last">
                <div className="settings-row__text">
                    <strong className="settings-field-title">Enquiry form</strong>
                    <p className="settings-right-desc">
                        A booking form at the foot of Showcase. Enquiries land in your inbox and in People,
                        tagged as enquiries.
                    </p>
                </div>
                <div className="settings-row__actions">
                    <button
                        type="button"
                        className="settings-pill-btn"
                        onClick={() => setEnquiryOpen(true)}
                    >
                        Edit form
                    </button>
                    <button
                        type="button"
                        className={`settings-toggle ${enquiryForm ? 'settings-toggle--on' : ''}`}
                        onClick={handleEnquiryToggle}
                        disabled={saving}
                        aria-pressed={enquiryForm}
                        aria-label={enquiryForm ? 'Turn off enquiry form' : 'Turn on enquiry form'}
                    >
                        <span className="settings-toggle-thumb" />
                    </button>
                </div>
            </div>

            {enquiryForm && (
                <div className="settings-enquiry-recent">
                    <div className="settings-row settings-row--compact">
                        <strong className="settings-field-title" style={{ fontSize: '14px' }}>
                            Recent messages
                        </strong>
                        <button
                            type="button"
                            className="settings-pill-btn"
                            onClick={() => navigate('/portal')}
                            style={{ padding: '6px 18px', fontSize: '13px' }}
                        >
                            Open Portal
                        </button>
                    </div>
                    {enquiriesLoading ? (
                        <p className="settings-right-desc">Loading messages…</p>
                    ) : enquiries.length === 0 ? (
                        <p className="settings-right-desc">
                            No enquiries yet. When someone submits the form on your Showcase, it will appear here.
                        </p>
                    ) : (
                        <ul className="settings-enquiry-list">
                            {enquiries.map((row) => (
                                <li key={row.id} className="settings-enquiry-item">
                                    <div className="settings-enquiry-item__top">
                                        <strong>{row.sender_name}</strong>
                                        <span>
                                            {new Date(row.created_at).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                    <a href={`mailto:${row.sender_email}`} className="settings-inline-link">
                                        {row.sender_email}
                                    </a>
                                    <p>{row.message}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {saveStatus ? (
                <div className="si-save-status settings-save-footer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{saveStatus}</span>
                </div>
            ) : null}

            <FeaturedDeliveriesModal
                open={featureOpen}
                photographerId={profile?.id}
                onClose={() => setFeatureOpen(false)}
                onSaved={(count) => {
                    setFeaturedCount(count);
                    refreshFeaturedCount();
                    markSaved();
                }}
            />

            <EnquiryFormEditorModal
                open={enquiryOpen}
                initialFields={enquiryFields}
                studioName={studioName}
                onClose={() => setEnquiryOpen(false)}
                onSave={handleSaveEnquiryFields}
            />
        </div>
    );
};

/* ── WatermarkTab ── */
const WatermarkTab = ({ profile, updateProfile }) => {
    const navigate = useNavigate();
    const { saveStatus, saving, setSaving, markSaved } = useSettingsSaveStatus();
    const [wToggle, setWToggle] = useState(() => {
        if (profile?.watermark_web_downloads !== undefined && profile?.watermark_web_downloads !== null) {
            return profile.watermark_web_downloads;
        }
        return false;
    });
    
    const [watermarks, setWatermarks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.watermark_web_downloads !== undefined && profile?.watermark_web_downloads !== null) {
            setWToggle(profile.watermark_web_downloads);
        }
    }, [profile?.watermark_web_downloads]);

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
        if (saving) return;
        const next = !wToggle;
        const prev = wToggle;
        setWToggle(next);
        setSaving(true);
        try {
            await updateProfile({ watermark_web_downloads: next }, { silent: true });
            markSaved();
        } catch {
            setWToggle(prev);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="wm-panel">
            <p className="settings-right-desc">
                Formerly called Protection. Applied to the versions guests view and download — not to your
                masters, and never to anything sent to the print lab.
            </p>

            <span className="settings-section-overline" style={{ marginTop: 24 }}>WATERMARK</span>

            <div className="settings-row">
                <div className="settings-row__text">
                    <strong className="settings-field-title">Watermark new deliveries</strong>
                    <p className="settings-right-desc">
                        Applied to the versions guests view and download.
                    </p>
                </div>
                <button
                    type="button"
                    className={`settings-toggle ${wToggle ? 'settings-toggle--on' : ''}`}
                    onClick={handleWebDownloadToggle}
                    aria-pressed={wToggle}
                    aria-label="Watermark new deliveries"
                >
                    <span className="settings-toggle-thumb" />
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '20px 0', color: '#8C827A' }}>Loading watermarks...</div>
            ) : (
                <div className="wm-card">
                    {watermarks[0] ? (
                        <>
                            <div className="wm-card__preview">
                                {watermarks[0].type === 'image' && watermarks[0].url ? (
                                    <img src={watermarks[0].url} alt="" />
                                ) : (
                                    <span>{watermarks[0].text || 'Watermark'}</span>
                                )}
                            </div>
                            <div className="wm-card__meta">
                                <strong>Watermark image</strong>
                                <p>
                                    {watermarks[0].position || 'Bottom right'} at{' '}
                                    {watermarks[0].opacity || 35}%, medium
                                </p>
                                <p className="wm-card__file">
                                    {watermarks[0].name || 'watermark'}
                                    {watermarks[0].url ? '' : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="settings-pill-btn"
                                onClick={() => navigate(`/settings/watermark/${watermarks[0].id}`)}
                            >
                                Edit watermark
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="wm-card__preview wm-card__preview--empty" aria-hidden />
                            <div className="wm-card__meta">
                                <strong>No watermark yet</strong>
                                <p>Add an image or text mark for new deliveries.</p>
                            </div>
                            <button
                                type="button"
                                className="settings-pill-btn"
                                onClick={() => navigate('/settings/watermark/create')}
                            >
                                Edit watermark
                            </button>
                        </>
                    )}
                </div>
            )}

            <p className="settings-right-desc" style={{ marginTop: 16, fontSize: '13px' }}>
                Watermarks are stripped from anything sent to the print lab, so ordered prints stay clean.
            </p>

            <SettingsSaveStatus status={saveStatus} saving={saving} />
        </div>
    );
};

/* ── EmailTemplatesTab (Delivery & messages) ── */
const EmailTemplatesTab = ({ profile, updateProfile }) => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [defaultLanguage, setDefaultLanguage] = useState('english');
    const [langSaving, setLangSaving] = useState(false);

    useEffect(() => {
        if (!profile) return;
        setDefaultLanguage(profile.default_language || 'english');
    }, [profile?.default_language, profile?.id]);

    useEffect(() => {
        if (!profile?.id) return;
        let cancelled = false;
        clientGalleryEmailTemplatesService
            .getTemplates(profile.id)
            .then((data) => {
                if (!cancelled) setTemplates(data || []);
            })
            .catch((err) => {
                console.error("Error fetching email templates:", err);
            });
        return () => {
            cancelled = true;
        };
    }, [profile?.id]);

    const collectionSharingTemplates = templates.filter(
        (t) => t.category === "delivery-sharing" || t.category === "collection-sharing"
    );
    const autoExpiryTemplates = templates.filter((t) => t.category === "auto-expiry");

    const handleLanguageChange = async (e) => {
        const next = e.target.value;
        const prev = defaultLanguage;
        setDefaultLanguage(next);
        setLangSaving(true);
        try {
            await updateProfile({ default_language: next }, { silent: true });
            syncUploadDefaultsToLocalStorage({
                ...resolveUploadDefaults(profile),
                defaultLanguage: next,
            });
        } catch (err) {
            console.error('Failed to save default language:', err);
            setDefaultLanguage(prev);
            alert('Failed to save language. Please try again.');
        } finally {
            setLangSaving(false);
        }
    };

    return (
        <div className="dm-panel gd-panel">
            <p className="gd-lead">
                The wording that goes out with a link, and the language a new delivery starts in. Email
                templates and the default language were two unrelated pages; they do one job.
            </p>

            <section className="gd-section">
                <span className="gd-overline">Messages</span>
                <div className="dm-message-cards">
                    {[
                        {
                            title: 'Delivery ready',
                            desc: 'Sent when you share a finished delivery with a client.',
                            editId: collectionSharingTemplates[0]?.id,
                        },
                        {
                            title: 'Selections reminder',
                            desc: 'Sent if a client has not finished choosing after a set number of days.',
                            editId: autoExpiryTemplates[0]?.id,
                        },
                        {
                            title: 'Guest photos ready',
                            desc: 'Goes to an event guest on WhatsApp with their own link. Kept as a utility template — marketing templates cost two to three times more per message.',
                        },
                        {
                            title: 'Order confirmed',
                            desc: 'Sent by Print Lab after a client pays.',
                        },
                    ].map((row) => (
                        <div key={row.title} className="dm-message-card">
                            <div className="dm-message-card__body">
                                <strong className="dm-message-card__title">{row.title}</strong>
                                <p className="dm-message-card__desc">{row.desc}</p>
                            </div>
                            <button
                                type="button"
                                className="settings-pill-btn dm-message-card__action"
                                onClick={() => {
                                    if (row.editId) navigate(`/settings/email-templates/${row.editId}/edit`);
                                    else navigate('/settings/email-templates/create');
                                }}
                            >
                                Edit
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <section className="gd-section">
                <span className="gd-overline">Language</span>
                <div className="dm-message-card dm-message-card--language">
                    <div className="dm-message-card__body">
                        <strong className="dm-message-card__title">Default language for new deliveries</strong>
                        <p className="dm-message-card__desc">
                            The language a client sees. Each delivery can be set differently.
                        </p>
                    </div>
                    <select
                        className="settings-select dm-message-card__select"
                        value={defaultLanguage}
                        onChange={handleLanguageChange}
                        disabled={langSaving}
                        aria-label="Default language"
                    >
                        <option value="english">English</option>
                        <option value="tamil">தமிழ்</option>
                        <option value="hindi">हिन्दी</option>
                        <option value="telugu">తెలుగు</option>
                    </select>
                </div>
            </section>
        </div>
    );
};

/* ── PreferencesTab (Upload defaults) ── */
const PreferencesTab = ({ profile, updateProfile }) => {
    const defaults = resolveUploadDefaults(profile);
    const [rawToggle, setRawToggle] = useState(defaults.rawPhotoSupport);
    const [sharpenWeb, setSharpenWeb] = useState(defaults.sharpenForWeb);
    const [showFilenames, setShowFilenames] = useState(
        () => resolveUploadDefaults(profile).filenameDisplay === 'show'
    );
    const [saveStatus, setSaveStatus] = useState('');
    const [saving, setSaving] = useState(false);
    const rawAllowed = planAllowsRaw(profile?.plan);

    useEffect(() => {
        const next = resolveUploadDefaults(profile);
        setRawToggle(next.rawPhotoSupport);
        setSharpenWeb(next.sharpenForWeb);
        setShowFilenames(next.filenameDisplay === 'show');
        syncUploadDefaultsToLocalStorage(next);
    }, [profile]);

    const markSaved = () => {
        setSaveStatus('Saved a moment ago.');
        window.clearTimeout(markSaved._t);
        markSaved._t = window.setTimeout(() => setSaveStatus(''), 4000);
    };

    const persist = async (patch, localState) => {
        setSaving(true);
        try {
            await updateProfile(patch, { silent: true });
            const merged = resolveUploadDefaults({
                ...profile,
                ...patch,
                sharpen_for_web: localState?.sharpenWeb ?? sharpenWeb,
                raw_photo_support: localState?.rawToggle ?? rawToggle,
            });
            syncUploadDefaultsToLocalStorage(merged);
            markSaved();
        } catch (e) {
            console.error('Upload defaults save failed:', e);
            alert(`Failed to save: ${e.message || 'Unknown error'}`);
            throw e;
        } finally {
            setSaving(false);
        }
    };

    const handleRawToggle = async () => {
        if (saving) return;
        if (!rawAllowed && !rawToggle) {
            alert('Accept RAW files is available on Studio (Plus) and Pro plans.');
            return;
        }
        const next = !rawToggle;
        const prev = rawToggle;
        setRawToggle(next);
        try {
            await persist({ raw_photo_support: next }, { rawToggle: next });
        } catch {
            setRawToggle(prev);
        }
    };

    const handleFilenamesToggle = async () => {
        if (saving) return;
        const next = !showFilenames;
        const prev = showFilenames;
        setShowFilenames(next);
        setSaving(true);
        try {
            await updateProfile({ filename_display: next ? 'show' : 'hide' }, { silent: true });
            syncUploadDefaultsToLocalStorage({
                ...resolveUploadDefaults(profile),
                filenameDisplay: next ? 'show' : 'hide',
            });
            markSaved();
        } catch {
            setShowFilenames(prev);
        } finally {
            setSaving(false);
        }
    };

    const handleSharpenToggle = async () => {
        const next = !sharpenWeb;
        setSharpenWeb(next);
        await persist(
            {
                sharpen_for_web: next,
                sharpening_level: next ? 'high' : 'none',
            },
            { sharpenWeb: next }
        );
    };

    return (
        <div className="ud-panel">
            <p className="ud-lead">
                What happens to a file between your card and a guest&apos;s screen. Display quality used to
                be three named tiers; the upload pipeline now picks one sensible web size for you.
            </p>

            <section className="ud-section">
                <span className="ud-overline">DISPLAY QUALITY</span>
                <div className="settings-callout">
                    <strong>Removed — Standard / High / Maximum</strong>
                    <p>
                        Guests always get a web-sized preview built for the screen they are on. Your uploaded
                        files are never touched, and downloads are always the original.
                    </p>
                </div>
            </section>

            <section className="ud-section">
                <span className="ud-overline">FILES</span>

                <div className="ud-file-row">
                    <div className="ud-file-text">
                        <div className="ud-file-title-row">
                            <span className="ud-file-label">Accept RAW files</span>
                            <span className="ud-studio-badge">STUDIO</span>
                        </div>
                        <p className="ud-file-desc">
                            Include RAW files alongside JPEGs in a delivery. Available on Studio and Pro.
                            {!rawAllowed && !rawToggle && (
                                <span style={{ display: 'block', marginTop: 4, color: '#94783e' }}>
                                    Upgrade to Studio or Pro to enable this.
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        className={`settings-toggle ${rawToggle ? 'settings-toggle--on' : ''}`}
                        onClick={handleRawToggle}
                        disabled={saving || (!rawAllowed && !rawToggle)}
                        aria-pressed={rawToggle}
                        aria-label="Accept RAW files"
                        aria-disabled={!rawAllowed && !rawToggle}
                    >
                        <span className="settings-toggle-thumb" />
                    </button>
                </div>

                <div className="ud-file-row">
                    <div className="ud-file-text">
                        <span className="ud-file-label">Sharpen when resizing for the web</span>
                        <p className="ud-file-desc">
                            Softens JPEG artefacts after downsizing. Leave on unless you already sharpen in
                            Lightroom before export.
                        </p>
                    </div>
                    <button
                        type="button"
                        className={`settings-toggle ${sharpenWeb ? 'settings-toggle--on' : ''}`}
                        onClick={handleSharpenToggle}
                        aria-pressed={sharpenWeb}
                        aria-label="Sharpen when resizing for the web"
                    >
                        <span className="settings-toggle-thumb" />
                    </button>
                </div>

                <div className="ud-file-row ud-file-row--last">
                    <div className="ud-file-text">
                        <span className="ud-file-label">Show filenames to clients</span>
                        <p className="ud-file-desc">
                            Useful when a client refers to a shot by number. Most weddings do not need it.
                        </p>
                    </div>
                    <button
                        type="button"
                        className={`settings-toggle ${showFilenames ? 'settings-toggle--on' : ''}`}
                        onClick={handleFilenamesToggle}
                        disabled={saving}
                        aria-pressed={showFilenames}
                        aria-label="Show filenames to clients"
                    >
                        <span className="settings-toggle-thumb" />
                    </button>
                </div>
            </section>

            {(saveStatus || saving) && (
                <p className="ud-save-status">
                    {saving ? 'Saving…' : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>{saveStatus}</span>
                        </>
                    )}
                </p>
            )}
        </div>
    );
};

export default Settings;
