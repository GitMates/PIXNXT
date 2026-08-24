import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { buildShowcaseUrl } from '../lib/showcaseUrl';
import './Settings.css';
import './ClientGallery.css';

const ALL_NAV_ITEMS = [
    { id: 'delivery-messages', label: 'Delivery & messages', section: 'GETTING PHOTOS OUT' },
    { id: 'guest-delivery', label: 'Guest Delivery', section: 'GETTING PHOTOS OUT', badge: 'NEW' },
    { id: 'face-matching', label: 'Face matching', section: 'GETTING PHOTOS OUT', badge: 'NEW' },
    { id: 'access-defaults', label: 'Access defaults', section: 'GETTING PHOTOS OUT' },
    { id: 'upload-defaults', label: 'Upload defaults', section: 'PHOTO HANDLING' },
    { id: 'protection', label: 'Protection', section: 'PHOTO HANDLING' },
    { id: 'showcase-page', label: 'Showcase page', section: 'THIS MODULE' },
    { id: 'delivery-templates', label: 'Delivery templates', section: 'THIS MODULE' },
];

const Settings = () => {
    const { tab } = useParams();
    const navigate = useNavigate();
    const activeTab = tab || 'delivery-templates';
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

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
            if (data) {
                setProfile(data);
                syncUploadDefaultsToLocalStorage(data);
            }
        } catch (e) {
            console.error('Error fetching settings profile:', e);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // Backwards compatibility redirections
    useEffect(() => {
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
    }, [activeTab, navigate]);

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

    if (loading) {
        return (
            <SidebarLayout>
                <div className="flex h-screen w-full items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a1a1a]"></div>
                </div>
            </SidebarLayout>
        );
    }

    // Filter subnav items
    const filteredNavItems = ALL_NAV_ITEMS.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get unique sections that have matching items
    const visibleSections = Array.from(new Set(filteredNavItems.map(item => item.section)));

    return (
        <SidebarLayout>
            <div className="settings-page-wrapper">
                {/* Header */}
                <div className="settings-header-row">
                    <div>
                        <h1 className="settings-main-title">Settings</h1>
                        <p className="settings-sub-desc">Defaults for new deliveries. Each delivery can override them.</p>
                    </div>
                    <div className="settings-search-wrap">
                        <svg className="settings-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C827A" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search settings"
                            className="settings-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="settings-columns-wrap">
                    {/* Left Sub-nav Column */}
                    <div className="settings-left-nav">
                        {visibleSections.map(section => (
                            <div key={section} className="settings-nav-section-wrap">
                                <span className="settings-nav-section-title">{section}</span>
                                {filteredNavItems
                                    .filter(item => item.section === section)
                                    .map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => navigate(`/settings/${item.id}`)}
                                            className={`settings-nav-item-btn ${activeTab === item.id ? 'active' : ''}`}
                                        >
                                            <span>{item.label}</span>
                                            {item.badge && <span className="settings-badge-new">{item.badge}</span>}
                                        </button>
                                    ))}
                            </div>
                        ))}
                        {visibleSections.length === 0 && (
                            <p style={{ fontSize: '13px', color: '#8C827A', paddingLeft: '12px' }}>No matches found</p>
                        )}
                    </div>

                    {/* Right Details Column — scrolls independently */}
                    <div className="settings-right-content" key={activeTab}>
                        {activeTab === 'delivery-templates' && <PresetsTab profile={profile} />}
                        {activeTab === 'protection' && <WatermarkTab profile={profile} updateProfile={updateProfile} />}
                        {activeTab === 'delivery-messages' && <EmailTemplatesTab profile={profile} />}
                        {activeTab === 'upload-defaults' && <PreferencesTab profile={profile} updateProfile={updateProfile} />}
                        {activeTab === 'showcase-page' && (
                            <ShowcasePageTab profile={profile} user={user} updateProfile={updateProfile} />
                        )}
                        {activeTab === 'guest-delivery' && <GuestDeliveryTab />}
                        {activeTab === 'face-matching' && <FaceMatchingTab />}
                        {activeTab === 'access-defaults' && <AccessDefaultsTab />}
                    </div>
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
        desc: 'Covers the late arrival, the friend who was shown a photo, and the guest who scanned but did not finish. Recommended.',
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
    { value: 'ta', label: 'தமிழ்' },
    { value: 'hi', label: 'हिन्दी' },
    { value: 'te', label: 'తెలుగు' },
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

const GuestDeliveryTab = () => {
    const navigate = useNavigate();
    const [enabled, setEnabled] = useState(true);
    const [regClose, setRegClose] = useState('48h');
    const [autoBatches, setAutoBatches] = useState(true);
    const [channel, setChannel] = useState('whatsapp_email');
    const [arrival, setArrival] = useState('next_day');
    const [slipMessage, setSlipMessage] = useState(true);
    const [standee, setStandee] = useState('classic');
    const [languages, setLanguages] = useState(['en', 'ta']);

    const toggleLanguage = (value) => {
        if (value === 'more') return;
        setLanguages((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        );
    };

    return (
        <div className="gd-panel">
            <h2 className="gd-title">Guest Delivery</h2>
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
                            onClick={() => setEnabled((v) => !v)}
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
                                    onClick={() => setRegClose(opt.value)}
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
                </div>

                <div className="gd-setting gd-setting--spaced">
                    <div className="gd-setting-head">
                        <span className="gd-label">Send later batches automatically</span>
                        <button
                            type="button"
                            className={`settings-toggle ${autoBatches ? 'settings-toggle--on' : ''}`}
                            onClick={() => setAutoBatches((v) => !v)}
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
                                    onClick={() => setChannel(opt.value)}
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
                                    onClick={() => setArrival(opt.value)}
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
                            onClick={() => setSlipMessage((v) => !v)}
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
                                    onClick={() => setStandee(opt.value)}
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

            <p className="gd-save-status">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>
                    Saved a moment ago. Applies to new deliveries only — the 12 you already have keep their own
                    settings.
                </span>
            </p>
        </div>
    );
};

/* ── Face matching (static defaults UI) ── */
const FM_MATCH_OPTIONS = [
    {
        value: 'strict',
        title: 'Strict',
        desc: "Sends a photo only when the system is confident. A few photos of a guest get missed rather than a stranger's photo being sent to the wrong person. Recommended.",
    },
    {
        value: 'balanced',
        title: 'Balanced',
        desc: 'Sends more photos per guest and occasionally sends one they are not in.',
    },
];

const FaceMatchingTab = () => {
    const navigate = useNavigate();
    const [matchCertainty, setMatchCertainty] = useState('strict');
    const [holdLowConfidence, setHoldLowConfidence] = useState(true);
    const [sendHighlightsWhenEmpty, setSendHighlightsWhenEmpty] = useState(true);
    const [guestSelfClaim, setGuestSelfClaim] = useState(true);

    return (
        <div className="fm-panel">
            <h2 className="fm-title">Face matching</h2>
            <p className="fm-lead">
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
                        Profile &gt; Legal &amp; consent
                    </button>
                    . This page is only about accuracy.
                </p>
            </div>

            <section className="gd-section">
                <span className="gd-overline">HOW CERTAIN A MATCH MUST BE</span>
                <div className="gd-radio-cards">
                    {FM_MATCH_OPTIONS.map((opt) => {
                        const active = matchCertainty === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                className={`gd-radio-card${active ? ' gd-radio-card--active' : ''}`}
                                onClick={() => setMatchCertainty(opt.value)}
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
                <p className="fm-footnote">
                    A guest browsing a gallery can ignore a wrong photo. A guest <strong>sent</strong> a
                    stranger&apos;s photo is a complaint, and possibly a privacy incident. That asymmetry is
                    why the default is Strict.
                </p>
            </section>

            <section className="gd-section">
                <span className="gd-overline">WHEN THE SYSTEM IS UNSURE</span>

                <div className="gd-setting">
                    <div className="gd-setting-head">
                        <span className="gd-label">Hold low-confidence matches for you to review</span>
                        <button
                            type="button"
                            className={`settings-toggle ${holdLowConfidence ? 'settings-toggle--on' : ''}`}
                            onClick={() => setHoldLowConfidence((v) => !v)}
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
                            onClick={() => setSendHighlightsWhenEmpty((v) => !v)}
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
                            onClick={() => setGuestSelfClaim((v) => !v)}
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

            <p className="gd-save-status">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Saved a moment ago.</span>
            </p>
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

const AccessDefaultsTab = () => {
    const [whoCanOpen, setWhoCanOpen] = useState('anyone');
    const [askAbovePhotos, setAskAbovePhotos] = useState('40');

    return (
        <div className="ad-panel">
            <h2 className="ad-title">Access defaults</h2>
            <p className="ad-lead">
                Who can open a new delivery, and what they must give you first. Every delivery can override
                this.
            </p>

            <section className="gd-section ad-section">
                <span className="gd-overline">WHO CAN OPEN A NEW DELIVERY</span>
                <div className="gd-radio-cards">
                    {AD_OPEN_OPTIONS.map((opt) => {
                        const active = whoCanOpen === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                className={`gd-radio-card${active ? ' gd-radio-card--active' : ''}`}
                                onClick={() => setWhoCanOpen(opt.value)}
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
                <span className="gd-overline">BEFORE A FULL DOWNLOAD</span>
                <div className="gd-block">
                    <span className="gd-label">Ask where to send the archive</span>
                    <p className="gd-desc">
                        Full sets are built on the server and emailed as a link. Asking for an address first
                        avoids a half-hour wait on a phone that then loses the file. Below this count, the
                        browser can handle it alone.
                    </p>
                    <label className="ad-threshold">
                        <span>Ask above</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            className="ad-threshold-input"
                            value={askAbovePhotos}
                            onChange={(e) => setAskAbovePhotos(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                            aria-label="Ask above this many photos"
                        />
                        <span>photos</span>
                    </label>
                </div>
            </section>

            <div className="gd-divider" />

            <p className="gd-save-status">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Saved a moment ago.</span>
            </p>
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
            <h2 className="dt-title">Delivery templates</h2>
            <p className="dt-lead">
                Save a set of delivery settings once and apply it to every new wedding, so you&apos;re not
                repeating the same six toggles.
            </p>

            <span className="dt-overline">YOUR TEMPLATES</span>

            {loading ? (
                <div className="dt-loading">Loading templates…</div>
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
    const [featuredCount, setFeaturedCount] = useState(null);
    const [enquiries, setEnquiries] = useState([]);
    const [enquiriesLoading, setEnquiriesLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!profile) return;
        setPublishShowcase(profile.showcase_enabled !== false);
        setEnquiryForm(profile.showcase_enquiry_enabled !== false);
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

    useEffect(() => {
        if (!profile?.id) return;
        let cancelled = false;
        galleryService
            .getCollections(profile.id)
            .then((collections) => {
                if (cancelled) return;
                const count = (collections || []).filter(
                    (c) => c.status === 'published' && c.show_on_showcase !== false
                ).length;
                setFeaturedCount(count);
            })
            .catch((err) => {
                console.error('Failed to load featured delivery count:', err);
                if (!cancelled) setFeaturedCount(0);
            });
        return () => {
            cancelled = true;
        };
    }, [profile?.id]);

    const markSaved = () => {
        setSaveStatus('Saved a moment ago.');
        window.clearTimeout(markSaved._t);
        markSaved._t = window.setTimeout(() => setSaveStatus(''), 4000);
    };

    const showcaseUrl = buildShowcaseUrl(profile, user);

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

    const featuredLabel =
        featuredCount === null
            ? 'Loading featured deliveries…'
            : featuredCount === 0
              ? 'None chosen yet. Turn on “Show in Showcase” on each delivery.'
              : featuredCount === 1
                ? '1 chosen. Order is drag-and-drop on the Showcase page itself.'
                : `${featuredCount} chosen. Order is drag-and-drop on the Showcase page itself.`;

    return (
        <div className="lc-panel">
            <h2 className="settings-right-title">Showcase page</h2>
            <p className="settings-right-desc">
                Your public page, built from deliveries you choose to feature. Stays in this module
                because the work on it is Client Gallery work.
            </p>

            <span className="settings-section-overline mt-5">PAGE</span>

            {/* Item 1: Publish Showcase */}
            <div className="si-branding-row" style={{ padding: '16px 0', borderBottom: '1px solid #dcd7cc' }}>
                <div className="si-branding-text">
                    <strong className="settings-field-title" style={{ fontSize: '15px' }}>Publish Showcase</strong>
                    <p className="settings-right-desc" style={{ marginTop: '2px', fontSize: '13.5px' }}>
                        {publishShowcase ? (
                            <>
                                Live at{' '}
                                <a
                                    href={showcaseUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: '#c46a3a', textDecoration: 'underline' }}
                                >
                                    {showcaseUrl.replace(/^https?:\/\//, '')}
                                </a>
                                . Turn off and the address returns nothing.
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

            {/* Item 2: Featured deliveries */}
            <div className="si-branding-row" style={{ padding: '16px 0', borderBottom: '1px solid #dcd7cc', alignItems: 'center' }}>
                <div className="si-branding-text">
                    <strong className="settings-field-title" style={{ fontSize: '15px' }}>Featured deliveries</strong>
                    <p className="settings-right-desc" style={{ marginTop: '2px', fontSize: '13.5px' }}>
                        {featuredLabel}
                    </p>
                </div>
                <button
                    type="button"
                    className="settings-pill-btn"
                    onClick={() => navigate('/showcase')}
                    style={{ borderRadius: '24px', padding: '8px 24px' }}
                >
                    Choose
                </button>
            </div>

            {/* Item 3: Enquiry form */}
            <div className="si-branding-row" style={{ padding: '16px 0', borderBottom: '1px solid #dcd7cc' }}>
                <div className="si-branding-text">
                    <strong className="settings-field-title" style={{ fontSize: '15px' }}>Enquiry form</strong>
                    <p className="settings-right-desc" style={{ marginTop: '2px', fontSize: '13.5px' }}>
                        {enquiryForm
                            ? 'Shows a contact form on your public Showcase. New messages appear in the list below.'
                            : 'Hidden on your Showcase. Turn on to let visitors send you a message.'}
                    </p>
                </div>
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

            {enquiryForm && (
                <div style={{ paddingTop: 20 }}>
                    <div className="si-branding-row" style={{ alignItems: 'center', marginBottom: 12 }}>
                        <strong className="settings-field-title" style={{ fontSize: '14px' }}>Recent messages</strong>
                        <button
                            type="button"
                            className="settings-pill-btn"
                            onClick={() => navigate('/portal')}
                            style={{ borderRadius: '24px', padding: '6px 18px', fontSize: '13px' }}
                        >
                            Open Portal
                        </button>
                    </div>
                    {enquiriesLoading ? (
                        <p className="settings-right-desc" style={{ fontSize: '13.5px' }}>Loading messages…</p>
                    ) : enquiries.length === 0 ? (
                        <p className="settings-right-desc" style={{ fontSize: '13.5px' }}>
                            No enquiries yet. When someone submits the form on your Showcase, it will appear here.
                        </p>
                    ) : (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {enquiries.map((row) => (
                                <li
                                    key={row.id}
                                    style={{
                                        padding: '14px 16px',
                                        border: '1px solid #e8e4de',
                                        borderRadius: 12,
                                        background: '#faf9f7',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                                        <strong style={{ fontSize: '14px', color: '#1a1a1a' }}>{row.sender_name}</strong>
                                        <span style={{ fontSize: '12px', color: '#8c857e', whiteSpace: 'nowrap' }}>
                                            {new Date(row.created_at).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                    <a
                                        href={`mailto:${row.sender_email}`}
                                        style={{ fontSize: '13px', color: '#c46a3a', textDecoration: 'none' }}
                                    >
                                        {row.sender_email}
                                    </a>
                                    <p style={{ margin: '8px 0 0', fontSize: '13.5px', lineHeight: 1.45, color: '#5c5650' }}>
                                        {row.message}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {saveStatus && (
                <div className="si-save-status" style={{ marginTop: '24px', color: '#8c857e' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{saveStatus}</span>
                </div>
            )}
        </div>
    );
};

/* ── WatermarkTab ── */
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
        <div>
            <h2 className="settings-right-title">Protection</h2>
            <p className="settings-right-desc">Protect your photos with custom watermarks.</p>

            <span className="settings-section-overline mt-5">YOUR WATERMARKS</span>
            
            {loading ? (
                <div style={{ padding: '20px 0', color: '#8C827A' }}>Loading watermarks...</div>
            ) : (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px' }}>
                    {watermarks.map(wm => (
                        <div key={wm.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div
                                style={{
                                    position: 'relative',
                                    width: '120px',
                                    height: '120px',
                                    border: '1px solid #eceae6',
                                    backgroundColor: '#FAF9F5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '8px',
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
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#8C827A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                            backgroundColor: '#FAF9F5',
                            border: '1px dashed #eceae6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            borderRadius: '8px',
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8C827A" strokeWidth="1.5">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </div>
                </div>
            )}

            <p className="settings-right-desc mt-5" style={{ fontSize: '13.5px' }}>
                Watermarks are stripped from anything sent to the print lab, so ordered prints stay clean.{' '}
                <a href="https://support.pixnxt.com" target="_blank" rel="noopener noreferrer" style={{ color: '#c46a3a', textDecoration: 'underline' }}>
                    Learn more
                </a>
            </p>

            <hr className="settings-divider" />

            <div className="mt-4">
                <h3 className="settings-field-title">Apply watermark to web size downloads</h3>
                <div className="flex items-center gap-3 mt-3">
                    <button
                        type="button"
                        className={`settings-toggle ${wToggle ? 'settings-toggle--on' : ''}`}
                        onClick={handleWebDownloadToggle}
                    >
                        <span className="settings-toggle-thumb" />
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>{wToggle ? 'On' : 'Off'}</span>
                </div>
                <p className="settings-right-desc mt-2">
                    Enable to apply watermark to web size downloads from your deliveries and web size downloads sold through Store.
                </p>
            </div>
        </div>
    );
};

/* ── EmailTemplatesTab (Delivery & messages) ── */
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

    const collectionSharingTemplates = templates.filter(
      (t) => t.category === 'delivery-sharing' || t.category === 'collection-sharing'
    );
    const autoExpiryTemplates = templates.filter(t => t.category === 'auto-expiry');

    const TemplateListItem = ({ tpl }) => {
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
                className="settings-template-row" 
                onClick={() => navigate(`/settings/email-templates/${tpl.id}/edit`)}
                style={{ cursor: 'pointer' }}
            >
                <span style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>{tpl.name}</span>
                <div style={{ position: 'relative' }} ref={menuRef}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        style={{ color: '#8C827A', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
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
                            border: '1px solid #eceae6',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            zIndex: 10,
                            minWidth: '120px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            <button 
                                onClick={handleEdit}
                                style={{ padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1a1a1a', fontWeight: '500' }}
                            >
                                Edit
                            </button>
                            <button 
                                onClick={handleDelete}
                                style={{ padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ef4444', fontWeight: '500' }}
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div>
            <h2 className="settings-right-title">Delivery &amp; messages</h2>
            <p className="settings-right-desc">Save email templates to use when sharing galleries and reminders.</p>

            <div style={{ marginTop: '24px' }}>
                <span className="settings-section-overline">DELIVERY SHARING EMAIL</span>

                {loading ? (
                    <div style={{ padding: '20px 0', color: '#8C827A' }}>Loading templates...</div>
                ) : (
                    <div className="settings-templates-list mt-3">
                        {collectionSharingTemplates.map((tpl) => (
                            <TemplateListItem key={tpl.id} tpl={tpl} />
                        ))}
                    </div>
                )}

                <button
                    type="button"
                    className="settings-pill-btn mt-4"
                    onClick={() => navigate('/settings/email-templates/create')}
                >
                    + Add email template
                </button>
            </div>

            <hr className="settings-divider" />

            <div className="mt-4">
                <span className="settings-section-overline">AUTO EXPIRY EMAIL</span>

                {loading ? (
                    <div style={{ padding: '20px 0', color: '#8C827A' }}>Loading templates...</div>
                ) : (
                    <div className="settings-templates-list mt-3">
                        {autoExpiryTemplates.map((tpl) => (
                            <TemplateListItem key={tpl.id} tpl={tpl} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ── PreferencesTab (Upload defaults) ── */
const WEB_QUALITY_OPTIONS = [
    {
        value: 'standard',
        title: 'Standard',
        desc: 'Fastest to open on event Wi-Fi and mobile data.',
    },
    {
        value: 'high',
        title: 'High',
        desc: 'Sharper on a laptop. Recommended for wedding work.',
    },
    {
        value: 'maximum',
        title: 'Maximum',
        desc: 'Largest files. Noticeably slower on a 4G connection at a venue.',
    },
];

const PreferencesTab = ({ profile, updateProfile }) => {
    const defaults = resolveUploadDefaults(profile);
    const [webQuality, setWebQuality] = useState(defaults.webDisplayQuality);
    const [rawToggle, setRawToggle] = useState(defaults.rawPhotoSupport);
    const [sharpenWeb, setSharpenWeb] = useState(defaults.sharpenForWeb);
    const [saveStatus, setSaveStatus] = useState('');
    const [saving, setSaving] = useState(false);
    const rawAllowed = planAllowsRaw(profile?.plan);

    useEffect(() => {
        const next = resolveUploadDefaults(profile);
        setWebQuality(next.webDisplayQuality);
        setRawToggle(next.rawPhotoSupport);
        setSharpenWeb(next.sharpenForWeb);
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
                web_display_quality: localState?.webQuality ?? webQuality,
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

    const handleWebQuality = async (val) => {
        setWebQuality(val);
        await persist({ web_display_quality: val }, { webQuality: val });
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
            <h2 className="ud-title">Upload defaults</h2>
            <p className="ud-lead">
                What happens to a file between your card and a guest&apos;s screen.
            </p>

            <section className="ud-section">
                <span className="ud-overline">WEB DISPLAY QUALITY</span>
                <div className="ud-radio-cards">
                    {WEB_QUALITY_OPTIONS.map((opt) => {
                        const active = webQuality === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                className={`ud-radio-card${active ? ' ud-radio-card--active' : ''}`}
                                onClick={() => handleWebQuality(opt.value)}
                                aria-pressed={active}
                            >
                                <span className="ud-radio-circle" aria-hidden>
                                    {active ? <span className="ud-radio-dot" /> : null}
                                </span>
                                <span className="ud-radio-copy">
                                    <span className="ud-radio-title">{opt.title}</span>
                                    <span className="ud-radio-desc">{opt.desc}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
                <p className="ud-footnote">
                    Applies to the versions guests view in the browser. Your uploaded files are never touched.
                </p>
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

                <div className="ud-file-row ud-file-row--last">
                    <div className="ud-file-text">
                        <span className="ud-file-label">Sharpen for the web</span>
                        <p className="ud-file-desc">
                            Applied when the display copy is made. Off if you sharpen in Lightroom already.
                        </p>
                    </div>
                    <button
                        type="button"
                        className={`settings-toggle ${sharpenWeb ? 'settings-toggle--on' : ''}`}
                        onClick={handleSharpenToggle}
                        aria-pressed={sharpenWeb}
                        aria-label="Sharpen for the web"
                    >
                        <span className="settings-toggle-thumb" />
                    </button>
                </div>
            </section>

            {(saveStatus || saving) && (
                <p className="ud-save-status">
                    {saving ? 'Saving…' : saveStatus}
                </p>
            )}
        </div>
    );
};

export default Settings;
