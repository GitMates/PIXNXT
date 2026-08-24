import React from 'react';
import { DatePicker } from '../../../ui/DatePicker';
import { galleryService } from '../../../../services/gallery.service';
import { cacheSlideshowEnabled } from '../../../../lib/collectionFeatureFlags';
import { broadcastGalleryLive } from '../../../../lib/galleryLiveSync';
import { getCollectionShareUrl } from '../../../../lib/shareCollection';
import { CategoryTagsField } from './CategoryTagsField';
import './BasicsSettings.css';
import './DownloadSettings.css';


export interface GeneralSettingsProps {
    collectionId: string;
    collection: any;
    setCollection: React.Dispatch<React.SetStateAction<any>>;
    collectionUrl: string;
    setCollectionUrl: (val: string) => void;
    defaultWatermark: string;
    setDefaultWatermark: (val: string) => void;
    autoExpiry: string | null;
    setAutoExpiry: (val: string | null) => void;
    setShowExpiryReminderModal: (val: boolean) => void;
    expiryReminders: any[];
    onEditReminder: (reminder: any) => void;
    onDeleteReminder: (id: string) => void;
    onAddReminder: () => void;
    onRemindersChange?: () => void;
    emailRegistration: boolean;
    setEmailRegistration: (val: boolean) => void;
    galleryAssist: boolean;
    setGalleryAssist: (val: boolean) => void;
    slideshow: boolean;
    setSlideshow: (val: boolean) => void;
    socialSharing: boolean;
    setSocialSharing: (val: boolean) => void;
    language: string;
    setLanguage: (val: string) => void;
    categoryTags: string[];
    onCategoryTagsChange: (tags: string[]) => void;
    categoryTagsSaving?: boolean;
    showGeneralAdditionalOptions: boolean;
    setShowGeneralAdditionalOptions: (val: boolean) => void;
    profile?: any;
}

const LANGUAGES = [
    { id: 'English', label: 'English' },
    { id: 'Hindi', label: 'हिन्दी' },
    { id: 'Tamil', label: 'தமிழ்' },
];

const REMIND_CHANNELS = [
    { id: 'both', label: 'WhatsApp, email as fallback' },
    { id: 'email', label: 'Email only' },
    { id: 'whatsapp', label: 'WhatsApp only' },
] as const;

const REMIND_WHEN = [
    { id: '3days', label: '3 days before', timing: '3 days before auto expiry date' },
    { id: 'week', label: '1 week before', timing: '7 days before auto expiry date' },
    { id: 'both', label: 'Both', timing: '7 days before auto expiry date' },
] as const;

function formatLongDate(value?: string | null) {
    if (!value) return '';
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const date = match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function calendarParts(value?: string | null) {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const date = match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return {
        day: String(date.getDate()),
        month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        year: String(date.getFullYear()),
    };
}

function displayHostPath(url: string) {
    return String(url || '').replace(/^https?:\/\//, '');
}

function Chevron({ open }: { open: boolean }) {
    return (
        <svg className="cd-basics-card__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            {open
                ? <polyline points="18 15 12 9 6 15" />
                : <polyline points="6 9 12 15 18 9" />}
        </svg>
    );
}

function Toggle({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
}) {
    return (
        <label className="cd-toggle">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span className="cd-toggle-slider" />
        </label>
    );
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
    collectionId,
    collection,
    setCollection,
    collectionUrl,
    setCollectionUrl,
    autoExpiry,
    setAutoExpiry,
    expiryReminders = [],
    onEditReminder,
    onAddReminder,
    onRemindersChange,
    galleryAssist,
    setGalleryAssist,
    slideshow,
    setSlideshow,
    socialSharing,
    setSocialSharing,
    language,
    setLanguage,
    categoryTags,
    onCategoryTagsChange,
    categoryTagsSaving = false,
    profile,
}) => {
    const [activeTab, setActiveTab] = React.useState<'link' | 'closes' | 'gallery'>('link');
    const [copied, setCopied] = React.useState(false);
    const [remindChannel, setRemindChannel] = React.useState<'both' | 'email' | 'whatsapp'>('both');
    const [remindWhen, setRemindWhen] = React.useState<'3days' | 'week' | 'both'>('week');

    const expiryPickerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!expiryReminders.length) return;
        const hasWa = expiryReminders.some((r) => r.whatsapp_enabled);
        const hasEmail = expiryReminders.some((r) => !r.whatsapp_enabled || r.send_copy !== false);
        if (hasWa && hasEmail) setRemindChannel('both');
        else if (hasWa) setRemindChannel('whatsapp');
        else setRemindChannel('email');

        const timings = expiryReminders.map((r) => String(r.timing || ''));
        const has3 = timings.some((t) => t.startsWith('3 '));
        const has7 = timings.some((t) => t.startsWith('7 ') || t.includes('week'));
        if (has3 && has7) setRemindWhen('both');
        else if (has3) setRemindWhen('3days');
        else if (has7) setRemindWhen('week');
    }, [expiryReminders]);

    const shareUrl = getCollectionShareUrl(collectionUrl, profile);
    const shareHostPath = displayHostPath(shareUrl);
    const eventDate = collection?.event_date || null;
    const expiryLabel = formatLongDate(autoExpiry);
    const cal = calendarParts(autoExpiry);
    const coverUrl = collection?.cover_url || '';
    const brandHost = shareHostPath.split('/')[0] || 'gallery';
    const primaryReminder = expiryReminders[0];
    const reminderPreview = primaryReminder?.body
        || 'Closing soon — download anything you want to keep';

    const persistCollection = async (patch: Record<string, unknown>) => {
        try {
            const updated = await galleryService.updateCollection(collectionId, patch);
            if (updated) setCollection((prev) => (prev ? { ...prev, ...updated } : prev));
            else setCollection((prev) => (prev ? { ...prev, ...patch } : prev));
        } catch (err) {
            console.error('Failed to save basics setting:', err);
        }
    };

    const persistGalleryVisitorFlags = async (patch: {
        slideshow_enabled?: boolean;
        social_sharing_enabled?: boolean;
        gallery_assist?: boolean;
    }) => {
        if (patch.slideshow_enabled !== undefined) {
            cacheSlideshowEnabled(collectionId, patch.slideshow_enabled);
        }
        setCollection((prev) => (prev ? { ...prev, ...patch } : prev));
        broadcastGalleryLive({
            type: 'SETTINGS_UPDATED',
            collectionId,
            slug: collectionUrl,
            settings: patch,
        });
        await persistCollection(patch);
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            setCopied(false);
        }
    };

    const saveEventDate = async (next: string | null) => {
        await persistCollection({ event_date: next });
    };

    const saveExpiry = async (next: string | null) => {
        setAutoExpiry(next);
        await persistCollection({ auto_expiry: next });
        if (next && !expiryReminders[0]) {
            try {
                await galleryService.ensureCollectionReminder(collectionId);
                onRemindersChange?.();
            } catch (err) {
                console.error('Failed to create default expiry reminder:', err);
            }
        }
    };

    const saveLanguage = async (next: string) => {
        setLanguage(next);
        await persistCollection({ language: next });
    };

    const saveReminderPrefs = async (
        channel: typeof remindChannel,
        when: typeof remindWhen,
    ) => {
        setRemindChannel(channel);
        setRemindWhen(when);
        const timing = REMIND_WHEN.find((item) => item.id === when)?.timing
            || '7 days before auto expiry date';
        const whatsappEnabled = channel !== 'email';
        try {
            await galleryService.ensureCollectionReminder(collectionId, {
                timing,
                whatsapp_enabled: whatsappEnabled,
            });
            onRemindersChange?.();
        } catch (err) {
            console.error('Failed to update reminder prefs:', err);
        }
    };

    const toggleAutoExpiry = async (checked: boolean) => {
        if (!checked) {
            await saveExpiry(null);
        } else {
            const defaultDate = new Date();
            defaultDate.setMonth(defaultDate.getMonth() + 3);
            const yyyy = defaultDate.getFullYear();
            const mm = String(defaultDate.getMonth() + 1).padStart(2, '0');
            const dd = String(defaultDate.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            await saveExpiry(dateStr);
        }
    };

    const triggerExpiryPicker = () => {
        const el = expiryPickerRef.current?.querySelector('.dp-input-field') as HTMLElement;
        if (el) el.click();
    };

    const onOff = (value: boolean) => (value ? 'on' : 'off');
    const gallerySummary = (
        <>
            Slideshow and social sharing are <strong>{onOff(slideshow)}</strong>. Walk-through cards are <strong>{onOff(galleryAssist)}</strong>.
        </>
    );
    const channelLabel = REMIND_CHANNELS.find((item) => item.id === remindChannel)?.label || 'WhatsApp, email as fallback';
    const whenLabel = remindWhen === '3days'
        ? '3 days before'
        : remindWhen === 'both'
            ? '3 days and a week before'
            : 'a week before';
    const closesSummary = autoExpiry ? (
        <>
            Hides itself on <strong>{expiryLabel}</strong>, reminder by <strong>WhatsApp, email as fallback</strong> a week before.
        </>
    ) : (
        'No auto expiry set yet.'
    );

    const langId = LANGUAGES.some((item) => item.id === language)
        ? language
        : language?.toLowerCase() === 'hindi'
            ? 'Hindi'
            : language?.toLowerCase() === 'tamil'
                ? 'Tamil'
                : 'English';

    const showOnShowcase = collection?.show_on_showcase !== false;

    return (
        <div className="cd-general-settings-view cd-basics cd-dl">
            <header className="cd-basics__header">
                <h2 className="cd-basics__title">Basics</h2>
                <p className="cd-basics__kicker">this delivery</p>
                <p className="cd-basics__lead">
                    What this delivery is called, where it lives, and when it closes.
                </p>
            </header>

            <div className={`cd-dl-shell${activeTab === 'link' ? ' is-first' : ''}`}>
                <div className="cd-dl-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        className={`cd-dl-tab${activeTab === 'link' ? ' is-on' : ''}`}
                        aria-selected={activeTab === 'link'}
                        onClick={() => setActiveTab('link')}
                    >
                        Name and link
                    </button>
                    <button
                        type="button"
                        role="tab"
                        className={`cd-dl-tab${activeTab === 'closes' ? ' is-on' : ''}`}
                        aria-selected={activeTab === 'closes'}
                        onClick={() => setActiveTab('closes')}
                    >
                        Auto expiry
                    </button>
                    <button
                        type="button"
                        role="tab"
                        className={`cd-dl-tab${activeTab === 'gallery' ? ' is-on' : ''}`}
                        aria-selected={activeTab === 'gallery'}
                        onClick={() => setActiveTab('gallery')}
                    >
                        In the gallery
                    </button>
                </div>

                <div className="cd-dl-box">
                    {activeTab === 'link' && (
                        <>
                            <div className="cd-dl-status">
                                <div className="cd-basics-card-badge">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a39a92" strokeWidth="2">
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                    </svg>
                                    <span className="cd-basics-card-badge__text">
                                        {collection?.name || 'GALLERY'}
                                    </span>
                                </div>
                                <div className="cd-dl-status__copy">
                                    <h3 className="cd-dl-status__title">Name and link</h3>
                                    <p className="cd-dl-status__desc">
                                        Lives at <strong>{shareHostPath || 'your gallery link'}</strong>, and listed on your Showcase.
                                    </p>
                                </div>
                            </div>

                            <div className="cd-dl-body">
                            <div className="cd-dl-card">
                                <div className="cd-dl-row">
                                    <div className="cd-dl-row__copy">
                                        <p className="cd-dl-row__title">Gallery link</p>
                                        <p className="cd-dl-row__desc">
                                            {brandHost}/g/
                                        </p>
                                        <p className="cd-dl-row__title" style={{ fontSize: '15px', marginTop: '2px' }}>
                                            {collectionUrl}
                                        </p>
                                        <p className="cd-dl-row__desc" style={{ fontSize: '11px', color: '#b0a89e' }}>
                                            — changing this breaks any link already sent.
                                        </p>
                                    </div>
                                    <div className="cd-dl-row__control">
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                className="cd-basics-input"
                                                style={{ width: '220px' }}
                                                value={collectionUrl}
                                                onChange={(e) => setCollectionUrl(e.target.value)}
                                            />
                                            <button type="button" className="cd-basics-btn" onClick={copyLink}>
                                                {copied ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="cd-dl-row">
                                    <div className="cd-dl-row__copy">
                                        <p className="cd-dl-row__title">Event date</p>
                                    </div>
                                    <div className="cd-dl-row__control">
                                        <DatePicker
                                            value={eventDate}
                                            onChange={(next) => void saveEventDate(next)}
                                            placeholder="Add a date"
                                            displayFormat="long"
                                            showQuickSearch={false}
                                        />
                                    </div>
                                </div>

                                <div className="cd-dl-row">
                                    <div className="cd-dl-row__copy">
                                        <p className="cd-dl-row__title">Language</p>
                                        <p className="cd-dl-row__desc">What the gallery is written in for your client.</p>
                                    </div>
                                    <div className="cd-dl-row__control">
                                        <div className="cd-basics-segment" role="group" aria-label="Language">
                                            {LANGUAGES.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    className={`cd-basics-segment__item${langId === item.id ? ' is-on' : ''}`}
                                                    onClick={() => void saveLanguage(item.id)}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="cd-dl-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                    <div className="cd-dl-row__copy" style={{ marginBottom: '8px' }}>
                                        <p className="cd-dl-row__title">Category tags</p>
                                        <p className="cd-dl-row__desc">Used to group deliveries on your Showcase and in search.</p>
                                    </div>
                                    <CategoryTagsField
                                        tags={categoryTags}
                                        onChange={onCategoryTagsChange}
                                        disabled={categoryTagsSaving}
                                        placeholder="Add a tag and press Enter"
                                    />
                                </div>
                            </div>

                            <p className="cd-dl-section__label" style={{ marginTop: '28px', marginBottom: '8px' }}>WHERE ELSE IT APPEARS</p>
                            <div className="cd-dl-card">
                                <div className="cd-dl-row">
                                    <div className="cd-dl-row__copy">
                                        <p className="cd-dl-row__title">Show on Showcase</p>
                                        <p className="cd-dl-row__desc">List this delivery on your public home page, so people who find your work can see it.</p>
                                    </div>
                                    <div className="cd-dl-row__control">
                                        <Toggle
                                            checked={showOnShowcase}
                                            onChange={(next) => void persistCollection({ show_on_showcase: next })}
                                        />
                                    </div>
                                </div>
                            </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'closes' && (
                        <>
                            <div className="cd-dl-status">
                                <div className="cd-basics-card-badge cd-basics-card-badge--date">
                                    {cal ? (
                                        <span className="cd-basics-cal">
                                            <span className="cd-basics-cal__day">{cal.day}</span>
                                            <span className="cd-basics-cal__mon">{cal.month} {cal.year}</span>
                                        </span>
                                    ) : (
                                        <span className="cd-basics-cal">
                                            <span className="cd-basics-cal__day">—</span>
                                            <span className="cd-basics-cal__mon">Date</span>
                                        </span>
                                    )}
                                </div>
                                <div className="cd-dl-status__copy">
                                    <h3 className="cd-dl-status__title">Auto expiry</h3>
                                    <p className="cd-dl-status__desc">
                                        {closesSummary}
                                    </p>
                                </div>
                            </div>

                            <div className="cd-dl-body">
                            <div className="cd-basics-note-banner">
                                <div className="cd-dl-row" style={{ padding: 0 }}>
                                    <div className="cd-dl-row__copy">
                                        <p className="cd-dl-row__title">Close this delivery automatically</p>
                                        <p className="cd-dl-row__desc">Off means it stays open until you close it yourself. Storage keeps counting either way.</p>
                                    </div>
                                    <div className="cd-dl-row__control">
                                        <Toggle
                                            checked={!!autoExpiry}
                                            onChange={toggleAutoExpiry}
                                        />
                                    </div>
                                </div>
                            </div>

                            {!!autoExpiry && (
                                <>
                                    <p className="cd-dl-section__label">WHEN</p>
                                    <div className="cd-dl-card" style={{ marginBottom: '24px' }}>
                                        <div className="cd-dl-row">
                                            <div className="cd-dl-row__copy">
                                                <p className="cd-dl-row__title">Closes on</p>
                                            </div>
                                            <div className="cd-dl-row__control">
                                                <div className="cd-basics-expiry-row">
                                                    <div ref={expiryPickerRef}>
                                                        <DatePicker
                                                            value={autoExpiry}
                                                            onChange={(next) => void saveExpiry(next)}
                                                            placeholder="Optional"
                                                            disablePastDates
                                                        />
                                                    </div>
                                                    <button type="button" className="cd-basics-btn" onClick={triggerExpiryPicker}>
                                                        Change
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="cd-dl-row">
                                            <div className="cd-dl-row__copy">
                                                <p className="cd-dl-row__title">Hidden at</p>
                                                <p className="cd-dl-row__desc">Nothing is deleted — you can reopen it any time.</p>
                                            </div>
                                            <div className="cd-dl-row__control">
                                                <span style={{ fontSize: '14.5px', fontWeight: 500, color: '#2a241e' }}>11:59 pm IST</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="cd-dl-section__label">REMINDER</p>
                                    <div className="cd-dl-card">
                                        <div className="cd-dl-row">
                                            <div className="cd-dl-row__copy">
                                                <p className="cd-dl-row__title">Remind them by</p>
                                            </div>
                                            <div className="cd-dl-row__control">
                                                <select
                                                    value={remindChannel}
                                                    onChange={(e) => void saveReminderPrefs(e.target.value as any, remindWhen)}
                                                    className="cd-dl-select-input"
                                                >
                                                    {REMIND_CHANNELS.map((item) => (
                                                        <option key={item.id} value={item.id}>{item.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="cd-dl-row">
                                            <div className="cd-dl-row__copy">
                                                <p className="cd-dl-row__title">How long before</p>
                                            </div>
                                            <div className="cd-dl-row__control">
                                                <select
                                                    value={remindWhen}
                                                    onChange={(e) => void saveReminderPrefs(remindChannel, e.target.value as any)}
                                                    className="cd-dl-select-input"
                                                >
                                                    {REMIND_WHEN.map((item) => (
                                                        <option key={item.id} value={item.id}>{item.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="cd-dl-row">
                                            <div className="cd-dl-row__copy">
                                                <p className="cd-dl-row__title">The message</p>
                                                <p className="cd-dl-row__desc" style={{ color: '#2a241e', fontWeight: 500, marginTop: '2px' }}>
                                                    {reminderPreview}
                                                </p>
                                            </div>
                                            <div className="cd-dl-row__control" style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    className="cd-basics-btn"
                                                    onClick={() => (primaryReminder ? onEditReminder(primaryReminder) : onAddReminder())}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="cd-basics-btn"
                                                    onClick={() => (primaryReminder ? onEditReminder(primaryReminder) : onAddReminder())}
                                                >
                                                    Preview
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            </div>
                        </>
                    )}

                    {activeTab === 'gallery' && (
                        <>
                            <div className="cd-dl-status">
                                <div className="cd-basics-card-badge">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a39a92" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                                        <rect x="14" y="14" width="7" height="7" rx="1.5" />
                                    </svg>
                                    <span className="cd-basics-card-badge__text">
                                        IN GALLERY
                                    </span>
                                </div>
                                <div className="cd-dl-status__copy">
                                    <h3 className="cd-dl-status__title">In the gallery</h3>
                                    <p className="cd-dl-status__desc">
                                        {gallerySummary}
                                    </p>
                                </div>
                            </div>

                            <div className="cd-dl-body">
                            <div className="cd-dl-card">
                                <div className="cd-dl-row">
                                    <div className="cd-dl-row__copy">
                                        <p className="cd-dl-row__title">Slideshow</p>
                                        <p className="cd-dl-row__desc">Visitors can play the delivery as a slideshow.</p>
                                    </div>
                                    <div className="cd-dl-row__control">
                                        <Toggle
                                            checked={slideshow}
                                            onChange={(next) => {
                                                setSlideshow(next);
                                                setCollection((prev) => (prev ? { ...prev, slideshow_enabled: next } : prev));
                                                void persistGalleryVisitorFlags({ slideshow_enabled: next });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="cd-dl-row">
                                    <div className="cd-dl-row__copy">
                                        <p className="cd-dl-row__title">Social sharing</p>
                                        <p className="cd-dl-row__desc">Visitors can share individual photographs.</p>
                                    </div>
                                    <div className="cd-dl-row__control">
                                        <Toggle
                                            checked={socialSharing}
                                            onChange={(next) => {
                                                setSocialSharing(next);
                                                setCollection((prev) => (prev ? { ...prev, social_sharing_enabled: next } : prev));
                                                void persistGalleryVisitorFlags({ social_sharing_enabled: next });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="cd-dl-row">
                                    <div className="cd-dl-row__copy">
                                        <p className="cd-dl-row__title">Walk-through cards</p>
                                        <p className="cd-dl-row__desc">Short prompts showing first-time visitors how the gallery works.</p>
                                    </div>
                                    <div className="cd-dl-row__control">
                                        <Toggle
                                            checked={galleryAssist}
                                            onChange={(next) => {
                                                setGalleryAssist(next);
                                                void persistGalleryVisitorFlags({ gallery_assist: next });
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

