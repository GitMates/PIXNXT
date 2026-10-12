import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import { DatePicker } from '../components/ui/DatePicker';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { guestDeliveryService } from '../services/guestDelivery.service';
import { photographerQuotaService } from '../services/photographerQuota.service';
import { resolveUploadDefaults } from '../lib/uploadDefaults';
import { getPublicGalleryUrl } from '../lib/publicSiteUrl';
import '../styles/clientGalleryTheme.css';
import './NewDelivery.css';

const PRESET_ORDER = ['wedding', 'shoot', 'corporate'];

const PRESETS = {
    wedding: {
        label: 'Wedding',
        hint: 'Guests on, watermark, 90 days',
        guests: true,
        access: 'Anyone with the link',
        wm: 'On',
        expiry: '90 days after publishing',
        lang: 'English',
        privacy: 'public',
        watermark_enabled: 1,
        email_capture_enabled: 0,
        language: 'english',
    },
    shoot: {
        label: 'Shoot',
        hint: 'Client only, watermark, 60 days',
        guests: false,
        access: 'Anyone with the link',
        wm: 'On',
        expiry: '60 days after publishing',
        lang: 'English',
        privacy: 'public',
        watermark_enabled: 1,
        email_capture_enabled: 0,
        language: 'english',
    },
    corporate: {
        label: 'Corporate',
        hint: 'Named emails, no watermark',
        guests: false,
        access: 'Named email addresses only',
        wm: 'Off',
        expiry: '30 days after publishing',
        lang: 'English',
        privacy: 'public',
        watermark_enabled: 0,
        email_capture_enabled: 1,
        language: 'english',
    },
};

const PRINT_LEAD_DAYS = 3;
const DAY_MS = 86400000;

function deliverySlug(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/&/g, ' ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 28)
        .replace(/-+$/g, '');
}

function startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

function addDays(date, days) {
    return new Date(date.getTime() + days * DAY_MS);
}

function daysUntil(date) {
    return Math.round((date.getTime() - startOfToday().getTime()) / DAY_MS);
}

function formatPrintDay(date) {
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' });
}

function awayLabel(date) {
    const n = daysUntil(date);
    if (n < 0) return `${Math.abs(n)} ${Math.abs(n) === 1 ? 'day ago' : 'days ago'}`;
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    return `${n} days away`;
}

function printBand(eventDate) {
    if (!eventDate) {
        return { tone: 'ok', text: '—' };
    }
    const event = new Date(`${eventDate}T00:00:00`);
    if (Number.isNaN(event.getTime())) return { tone: 'ok', text: '—' };
    const by = addDays(event, -PRINT_LEAD_DAYS);
    const n = daysUntil(by);
    if (n < 0) {
        return {
            tone: 'past',
            text: `Needed by ${formatPrintDay(by)} — that has passed. Print it yourself today.`,
        };
    }
    if (n <= 1) {
        return {
            tone: 'tight',
            text: `By ${formatPrintDay(by)} — ${awayLabel(by)}. No printer will turn this round.`,
        };
    }
    return {
        tone: 'ok',
        text: `Print by ${formatPrintDay(by)} — ${awayLabel(by)}`,
    };
}

function galleryAddressPrefix() {
    try {
        const url = new URL(getPublicGalleryUrl('preview'));
        const path = url.pathname.replace(/\/preview\/?$/, '').replace(/\/$/, '');
        return `${url.host}${path}/`;
    } catch {
        return 'gallery/';
    }
}

function StandeeArt() {
    return (
        <svg className="nd-ga" viewBox="0 0 80 100" width="178" height="222" role="img" aria-label="An unstyled standee on a floor stand with a table card beside it">
            <ellipse className="nd-ga-shadow" cx="36" cy="88" rx="26" ry="3.4" />
            <ellipse className="nd-ga-shadow" cx="68" cy="86" rx="9" ry="2" />
            <rect className="nd-ga-sheet" x="12" y="4" width="48" height="64" rx="2.5" />
            <rect className="nd-ga-bar" x="28" y="9.5" width="16" height="2.6" rx="1.3" />
            <rect className="nd-ga-bar" data-weak x="31" y="13.6" width="10" height="1.4" rx=".7" />
            <rect className="nd-ga-bar" data-weak x="22" y="18.4" width="28" height=".8" rx=".4" />
            <rect className="nd-ga-panel" x="25" y="22" width="22" height="22" rx="1.5" />
            <g className="nd-ga-mod">
                <rect x="27" y="24" width="5" height="5" rx=".6" />
                <rect x="40" y="24" width="5" height="5" rx=".6" />
                <rect x="27" y="37" width="5" height="5" rx=".6" />
                <rect x="34.5" y="24" width="2" height="2" />
                <rect x="34.5" y="29.5" width="2" height="2" />
                <rect x="31" y="32.5" width="2" height="2" />
                <rect x="37" y="33.5" width="2" height="2" />
                <rect x="40" y="30.5" width="2" height="2" />
                <rect x="43.5" y="34" width="2" height="2" />
                <rect x="34.5" y="37" width="2" height="2" />
                <rect x="40" y="40" width="2" height="2" />
                <rect x="43.5" y="37.5" width="2" height="2" />
            </g>
            <rect className="nd-ga-bar" x="22" y="48.4" width="28" height="2.6" rx="1.3" />
            <rect className="nd-ga-bar" data-weak x="28" y="54" width="16" height="1.8" rx=".9" />
            <rect className="nd-ga-bar" data-weak x="25" y="60" width="22" height="1.4" rx=".7" />
            <rect className="nd-ga-bar" data-weak x="30" y="63.6" width="12" height="1.1" rx=".55" />
            <rect className="nd-ga-stem" x="34" y="68" width="4" height="16" rx="1" />
            <ellipse className="nd-ga-base" cx="36" cy="85" rx="12" ry="2.8" />
            <g transform="rotate(7 68 72)">
                <rect className="nd-ga-sheet" x="59" y="58" width="18" height="26" rx="1.5" />
                <rect className="nd-ga-bar" data-weak x="63" y="60.6" width="10" height="1.2" rx=".6" />
                <rect className="nd-ga-panel" x="62.5" y="64" width="11" height="11" rx=".8" />
                <g className="nd-ga-mod">
                    <rect x="63.5" y="65" width="2.6" height="2.6" rx=".4" />
                    <rect x="69.9" y="65" width="2.6" height="2.6" rx=".4" />
                    <rect x="63.5" y="71.4" width="2.6" height="2.6" rx=".4" />
                    <rect x="67.5" y="69" width="1.3" height="1.3" />
                    <rect x="70.5" y="71" width="1.3" height="1.3" />
                </g>
                <rect className="nd-ga-bar" x="62.5" y="78" width="11" height="1.4" rx=".7" />
                <rect className="nd-ga-bar" data-weak x="65" y="81" width="6" height="1.4" rx=".7" />
            </g>
            <text className="nd-ga-label" x="36" y="96">A3 entrance · A5 tables</text>
        </svg>
    );
}

const CreateCollection = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const folderId = searchParams.get('folderId');
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [presetId, setPresetId] = useState('shoot');
    const [guestDeliveryEnabled, setGuestDeliveryEnabled] = useState(false);
    const [studioName, setStudioName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user?.id) return undefined;
        let cancelled = false;
        galleryService.getPhotographerProfile(user.id).then((profile) => {
            if (cancelled || !profile) return;
            const label = profile.business_name || profile.display_name || '';
            if (label) setStudioName(label);
        }).catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    const preset = PRESETS[presetId] || PRESETS.wedding;
    const slug = deliverySlug(name);
    const addressPrefix = useMemo(() => galleryAddressPrefix(), []);
    const band = printBand(date);

    const handleClose = () => {
        if (folderId) navigate(`/folders/${folderId}`);
        else navigate('/client-gallery');
    };

    const pickPreset = (id) => {
        const next = PRESETS[id];
        if (!next) return;
        setPresetId(id);
        setGuestDeliveryEnabled(next.guests);
    };

    const onPresetKeyDown = (event, id) => {
        const index = PRESET_ORDER.indexOf(id);
        let next = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            next = PRESET_ORDER[(index + 1) % PRESET_ORDER.length];
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            next = PRESET_ORDER[(index - 1 + PRESET_ORDER.length) % PRESET_ORDER.length];
        } else {
            return;
        }
        event.preventDefault();
        pickPreset(next);
        document.getElementById(`nd-preset-${next}`)?.focus();
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        if (!user) {
            setError('You must be logged in to create a delivery.');
            return;
        }
        const trimmed = name.trim();
        if (!trimmed) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const prefs = resolveUploadDefaults(null);
            const base = {
                photographer_id: user.id,
                name: trimmed,
                event_date: date || null,
                status: 'draft',
                font_family: 'sans_1',
                color_palette: 'light_1',
                grid_style: 'vertical',
                thumbnail_size: 'regular',
                grid_spacing: 'regular',
                nav_style: 'icons',
                privacy: preset.privacy,
                cover_style: 'photo',
                cover_layout: 'novel',
                guest_delivery_enabled: guestDeliveryEnabled,
                watermark_enabled: preset.watermark_enabled,
                email_capture_enabled: preset.email_capture_enabled,
                language: preset.language || prefs.defaultLanguage || 'english',
                show_filenames: prefs.filenameDisplay === 'show',
                ...(folderId ? { folder_id: folderId } : {}),
            };

            await photographerQuotaService.assertCreationDeliveryQuota(user.id, 1);

            let collectionSlug = slug || `delivery-${Date.now().toString(36)}`;
            let created;
            try {
                created = await galleryService.createCollection({ ...base, slug: collectionSlug });
            } catch (err) {
                const message = String(err?.message || '');
                if (!/already exists/i.test(message)) throw err;
                collectionSlug = `${(slug || 'delivery').slice(0, 22)}-${Date.now().toString(36).slice(-4)}`;
                created = await galleryService.createCollection({ ...base, slug: collectionSlug });
            }

            void photographerQuotaService.recordUsage(user.id, 'delivery', 1).catch(() => {});

            if (guestDeliveryEnabled) {
                await guestDeliveryService.createLinkedEvent({
                    collectionId: created.id,
                    photographerId: user.id,
                    name: trimmed,
                    eventDate: date || null,
                    slug: collectionSlug,
                });
            }

            navigate(`/deliveries/manage?id=${created.id}`);
        } catch (err) {
            console.error('Error creating collection:', err);
            const message = err.message || 'Failed to create delivery. Please try again.';
            setError(message);
            if (/limit|quota|disabled|exceeded|reached/i.test(message)) {
                alert(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const studioLabel = studioName || 'Your studio';
    const canSubmit = Boolean(name.trim()) && !isSubmitting;

    return (
        <SidebarLayout>
            <div className="nd-page">
                <header className="nd-head">
                    <button type="button" className="nd-back" onClick={handleClose} aria-label="Back to deliveries">
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                            <path d="M9.5 4 5.5 8l4 4" />
                        </svg>
                    </button>
                    <div>
                        <h1>New delivery</h1>
                        <div className="nd-where">Client Gallery · {studioLabel}</div>
                    </div>
                </header>

                <div className="nd-splitwrap">
                    <div className="nd-split" data-col={guestDeliveryEnabled ? 'true' : 'false'}>
                        <form className="nd-form" onSubmit={handleCreate}>
                            <div className="nd-field nd-field--name">
                                <label htmlFor="nd-name">Delivery name</label>
                                <input
                                    id="nd-name"
                                    className="nd-input"
                                    type="text"
                                    placeholder="Aditi & Rajat"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoComplete="off"
                                    autoFocus
                                    maxLength={120}
                                    required
                                />
                                <div className="nd-addr" data-empty={slug ? undefined : ''}>
                                    <span className="nd-addr-host">{addressPrefix}</span>
                                    <em>{slug || '…'}</em>
                                </div>
                            </div>

                            <div className="nd-field">
                                <label id="nd-date-lbl">Event date</label>
                                <div className="nd-date" aria-labelledby="nd-date-lbl">
                                    <DatePicker
                                        value={date}
                                        onChange={setDate}
                                        placeholder="Select event date"
                                    />
                                </div>
                            </div>

                            <div className="nd-field">
                                <label id="nd-preset-lbl">Preset</label>
                                <div className="nd-presets" role="radiogroup" aria-labelledby="nd-preset-lbl">
                                    {PRESET_ORDER.map((id) => {
                                        const item = PRESETS[id];
                                        const selected = id === presetId;
                                        return (
                                            <button
                                                key={id}
                                                id={`nd-preset-${id}`}
                                                type="button"
                                                className="nd-preset"
                                                role="radio"
                                                aria-checked={selected}
                                                tabIndex={selected ? 0 : -1}
                                                onClick={() => pickPreset(id)}
                                                onKeyDown={(e) => onPresetKeyDown(e, id)}
                                            >
                                                <b>{item.label}</b>
                                                <span>{item.hint}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="nd-sets">
                                    <h4>What {preset.label} sets</h4>
                                    <div className="nd-setrow"><span className="k">Who can open it</span><span className="v">{preset.access}</span></div>
                                    <div className="nd-setrow"><span className="k">Watermark</span><span className="v">{preset.wm}</span></div>
                                    <div className="nd-setrow"><span className="k">Gallery closes</span><span className="v">{preset.expiry}</span></div>
                                    <div className="nd-setrow"><span className="k">Language</span><span className="v">{preset.lang}</span></div>
                                </div>
                            </div>

                            <div className="nd-addon" data-on={guestDeliveryEnabled ? 'true' : 'false'}>
                                <div className="col">
                                    <div className="lbl">Also deliver to guests at the event</div>
                                    <div className="dsc">
                                        {guestDeliveryEnabled ? (
                                            'Guests get their own link. Your client’s gallery is unaffected.'
                                        ) : (
                                            <>
                                                Guests scan a printed code at the venue and get photographs on WhatsApp.{' '}
                                                <b>You print the code — it has to exist before the event.</b>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="nd-switch"
                                    role="switch"
                                    aria-checked={guestDeliveryEnabled}
                                    aria-label="Also deliver to guests at the event"
                                    onClick={() => setGuestDeliveryEnabled((on) => !on)}
                                />
                            </div>

                            <div className="nd-actions">
                                {error ? <p className="nd-error" role="alert">{error}</p> : null}
                                <button type="submit" className="nd-btn nd-btn--primary" disabled={!canSubmit}>
                                    {isSubmitting ? 'Creating…' : 'Create delivery'}
                                </button>
                                <button type="button" className="nd-btn nd-btn--ghost" onClick={handleClose}>
                                    Cancel
                                </button>
                            </div>
                        </form>

                        {guestDeliveryEnabled ? (
                            <aside className="nd-side" aria-label="What guests get">
                                <div className="nd-preview">
                                    <div className="nd-pv-head">
                                        What guests get
                                        <span className="right">Three designs</span>
                                    </div>
                                    <div className="nd-pv-body">
                                        <StandeeArt />
                                        <div className="nd-pv-t">A standee and table cards</div>
                                        <div className="nd-pv-d">
                                            Made in one click once this delivery exists, carrying this event&apos;s own code.{' '}
                                            <b>You pick one of three designs</b> when you make it.
                                        </div>
                                        <div className="nd-gband" data-tone={band.tone}>{band.text}</div>
                                    </div>
                                    <div className="nd-gsteps">
                                        <div className="nd-gstep"><b>You print</b> the standee for the entrance and cards for the tables.</div>
                                        <div className="nd-gstep"><b>Guests scan</b> and leave a WhatsApp number. Nothing to install.</div>
                                        <div className="nd-gstep"><b>Photographs arrive</b> when you publish — every number lands in <i>People</i>.</div>
                                    </div>
                                    <div className="nd-pv-foot">
                                        Whether each guest gets <b>only the photographs they appear in</b> is set inside the delivery, on the Guests tab. You choose the design — <b>Classic, Modern or Festive</b> — on the screen where the artwork is made.
                                    </div>
                                </div>
                            </aside>
                        ) : null}
                    </div>
                </div>
            </div>
        </SidebarLayout>
    );
};

export default CreateCollection;
