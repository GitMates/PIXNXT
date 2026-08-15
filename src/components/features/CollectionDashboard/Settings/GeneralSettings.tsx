import React from 'react';
import { DatePicker } from '../../../ui/DatePicker';
import { galleryService } from '../../../../services/gallery.service';
import { cacheSlideshowEnabled } from '../../../../lib/collectionFeatureFlags';
import { getCollectionShareUrl } from '../../../../lib/shareCollection';
import { CategoryTagsField } from './CategoryTagsField';
import './BasicsSettings.css';

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
    const [openCard, setOpenCard] = React.useState<'link' | 'closes' | 'gallery' | null>('link');
    const [copied, setCopied] = React.useState(false);
    const [showFilenames, setShowFilenames] = React.useState(collection?.show_filenames === true);
    const [remindChannel, setRemindChannel] = React.useState<'both' | 'email' | 'whatsapp'>('both');
    const [remindWhen, setRemindWhen] = React.useState<'3days' | 'week' | 'both'>('week');

    React.useEffect(() => {
        setShowFilenames(collection?.show_filenames === true);
    }, [collection?.show_filenames]);

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

    const toggleCard = (id: 'link' | 'closes' | 'gallery') => {
        setOpenCard((current) => (current === id ? null : id));
    };

    const persistCollection = async (patch: Record<string, unknown>) => {
        try {
            const updated = await galleryService.updateCollection(collectionId, patch);
            if (updated) setCollection((prev) => (prev ? { ...prev, ...updated } : prev));
            else setCollection((prev) => (prev ? { ...prev, ...patch } : prev));
        } catch (err) {
            console.error('Failed to save basics setting:', err);
        }
    };

    const broadcastGallerySettings = (settings: {
        slideshow_enabled?: boolean;
        social_sharing_enabled?: boolean;
    }) => {
        const channel = new BroadcastChannel('pixnxt-gallery-update');
        channel.postMessage({
            type: 'SETTINGS_UPDATED',
            collectionId,
            slug: collectionUrl,
            settings,
        });
        channel.close();
    };

    const persistGalleryVisitorFlags = async (patch: {
        slideshow_enabled?: boolean;
        social_sharing_enabled?: boolean;
        gallery_assist?: boolean;
        show_filenames?: boolean;
    }) => {
        if (patch.slideshow_enabled !== undefined) {
            cacheSlideshowEnabled(collectionId, patch.slideshow_enabled);
        }
        broadcastGallerySettings(patch);
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
        if (!primaryReminder) return;
        try {
            await galleryService.updateCollectionReminder(primaryReminder.id, {
                timing,
                whatsapp_enabled: whatsappEnabled,
            });
        } catch (err) {
            console.error('Failed to update reminder prefs:', err);
        }
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
            Hides itself on <strong>{expiryLabel}</strong>, and you remind them by <strong>{channelLabel} {whenLabel}</strong>.
        </>
    ) : (
        'No closing date yet.'
    );

    const langId = LANGUAGES.some((item) => item.id === language)
        ? language
        : language?.toLowerCase() === 'hindi'
            ? 'Hindi'
            : language?.toLowerCase() === 'tamil'
                ? 'Tamil'
                : 'English';

    return (
        <div className="cd-general-settings-view cd-basics">
            <header className="cd-basics__header">
                <h2 className="cd-basics__title">Basics</h2>
                <p className="cd-basics__kicker">this delivery</p>
                <p className="cd-basics__lead">
                    What this delivery is called, where it lives, and when it closes.
                </p>
            </header>

            <div className="cd-basics__cards">
                <article className={`cd-basics-card${openCard === 'link' ? ' is-open' : ''}`}>
                    <button
                        type="button"
                        className="cd-basics-card__head"
                        onClick={() => toggleCard('link')}
                        aria-expanded={openCard === 'link'}
                    >
                        <span className="cd-basics-card__icon cd-basics-card__icon--cover">
                            {coverUrl ? <img src={coverUrl} alt="" /> : null}
                            <span className="cd-basics-card__brand">{brandHost}</span>
                        </span>
                        <span className="cd-basics-card__copy">
                            <h3 className="cd-basics-card__title">Name and link</h3>
                            <p className="cd-basics-card__summary">
                                Lives at <strong>{shareHostPath || 'your gallery link'}</strong>.
                            </p>
                        </span>
                        <Chevron open={openCard === 'link'} />
                    </button>
                    {openCard === 'link' ? (
                        <div className="cd-basics-card__body">
                            <div className="cd-basics-field">
                                <span className="cd-basics-label">Gallery link</span>
                                <div className="cd-basics-input-row">
                                    <input
                                        type="text"
                                        className="cd-basics-input"
                                        value={collectionUrl}
                                        onChange={(e) => setCollectionUrl(e.target.value)}
                                    />
                                    <button type="button" className="cd-basics-btn" onClick={copyLink}>
                                        {copied ? 'Copied' : 'Copy link'}
                                    </button>
                                </div>
                                <p className="cd-basics-hint">
                                    <strong>{shareHostPath}</strong> — changing this breaks any link already sent.
                                </p>
                            </div>

                            <div className="cd-basics-field cd-basics-field--date">
                                <span className="cd-basics-label">Event date</span>
                                <DatePicker
                                    value={eventDate}
                                    onChange={(next) => void saveEventDate(next)}
                                    placeholder="Add a date"
                                    displayFormat="long"
                                    showQuickSearch={false}
                                />
                            </div>

                            <div className="cd-basics-field">
                                <span className="cd-basics-label">Category tags</span>
                                <CategoryTagsField
                                    tags={categoryTags}
                                    onChange={onCategoryTagsChange}
                                    disabled={categoryTagsSaving}
                                    placeholder="Add a tag and press Enter"
                                />
                            </div>

                            <div className="cd-basics-field">
                                <span className="cd-basics-label">Language</span>
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
                    ) : null}
                </article>

                <article className={`cd-basics-card${openCard === 'closes' ? ' is-open' : ''}`}>
                    <button
                        type="button"
                        className="cd-basics-card__head"
                        onClick={() => toggleCard('closes')}
                        aria-expanded={openCard === 'closes'}
                    >
                        <span className="cd-basics-card__icon">
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
                        </span>
                        <span className="cd-basics-card__copy">
                            <h3 className="cd-basics-card__title">When it closes</h3>
                            <p className="cd-basics-card__summary">{closesSummary}</p>
                        </span>
                        <Chevron open={openCard === 'closes'} />
                    </button>
                    {openCard === 'closes' ? (
                        <div className="cd-basics-card__body">
                            <div className="cd-basics-field">
                                <span className="cd-basics-label">Auto expiry</span>
                                <div className="cd-basics-expiry-row">
                                    <DatePicker
                                        value={autoExpiry}
                                        onChange={(next) => void saveExpiry(next)}
                                        placeholder="Optional"
                                        disablePastDates
                                    />
                                    <button
                                        type="button"
                                        className="cd-basics-btn--ghost"
                                        onClick={() => void saveExpiry(null)}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div className="cd-basics-field">
                                <span className="cd-basics-label">Remind them by</span>
                                <div className="cd-basics-pills">
                                    {REMIND_CHANNELS.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={`cd-basics-pill${remindChannel === item.id ? ' is-on' : ''}`}
                                            onClick={() => void saveReminderPrefs(item.id, remindWhen)}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="cd-basics-field">
                                <span className="cd-basics-label">When</span>
                                <div className="cd-basics-pills">
                                    {REMIND_WHEN.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={`cd-basics-pill${remindWhen === item.id ? ' is-on' : ''}`}
                                            onClick={() => void saveReminderPrefs(remindChannel, item.id)}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="cd-basics-note">
                                <p className="cd-basics-note__text">{reminderPreview}</p>
                                <div className="cd-basics-note__actions">
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
                    ) : null}
                </article>

                <article className={`cd-basics-card${openCard === 'gallery' ? ' is-open' : ''}`}>
                    <button
                        type="button"
                        className="cd-basics-card__head"
                        onClick={() => toggleCard('gallery')}
                        aria-expanded={openCard === 'gallery'}
                    >
                        <span className="cd-basics-card__icon">
                            <span className="cd-basics-grid-icon" aria-hidden>
                                <span /><span /><span /><span />
                            </span>
                        </span>
                        <span className="cd-basics-card__copy">
                            <h3 className="cd-basics-card__title">In the gallery</h3>
                            <p className="cd-basics-card__summary">{gallerySummary}</p>
                        </span>
                        <Chevron open={openCard === 'gallery'} />
                    </button>
                    {openCard === 'gallery' ? (
                        <div className="cd-basics-card__body">
                            <div className="cd-basics-toggles">
                                <div className="cd-basics-toggle">
                                    <div className="cd-basics-toggle__copy">
                                        <p className="cd-basics-toggle__title">Slideshow</p>
                                        <p className="cd-basics-toggle__desc">Visitors can play the delivery as a slideshow.</p>
                                    </div>
                                    <Toggle
                                        checked={slideshow}
                                        onChange={(next) => {
                                            setSlideshow(next);
                                            setCollection((prev) => (prev ? { ...prev, slideshow_enabled: next } : prev));
                                            void persistGalleryVisitorFlags({ slideshow_enabled: next });
                                        }}
                                    />
                                </div>
                                <div className="cd-basics-toggle">
                                    <div className="cd-basics-toggle__copy">
                                        <p className="cd-basics-toggle__title">Social sharing</p>
                                        <p className="cd-basics-toggle__desc">Visitors can share individual photographs.</p>
                                    </div>
                                    <Toggle
                                        checked={socialSharing}
                                        onChange={(next) => {
                                            setSocialSharing(next);
                                            setCollection((prev) => (prev ? { ...prev, social_sharing_enabled: next } : prev));
                                            void persistGalleryVisitorFlags({ social_sharing_enabled: next });
                                        }}
                                    />
                                </div>
                                <div className="cd-basics-toggle">
                                    <div className="cd-basics-toggle__copy">
                                        <p className="cd-basics-toggle__title">Walk-through cards</p>
                                        <p className="cd-basics-toggle__desc">Short prompts showing first-time visitors how the gallery works.</p>
                                    </div>
                                    <Toggle
                                        checked={galleryAssist}
                                        onChange={(next) => {
                                            setGalleryAssist(next);
                                            void persistGalleryVisitorFlags({ gallery_assist: next });
                                        }}
                                    />
                                </div>
                                <div className="cd-basics-toggle">
                                    <div className="cd-basics-toggle__copy">
                                        <p className="cd-basics-toggle__title">Show filenames</p>
                                        <p className="cd-basics-toggle__desc">Useful when a client refers to a shot by number.</p>
                                    </div>
                                    <Toggle
                                        checked={showFilenames}
                                        onChange={(next) => {
                                            setShowFilenames(next);
                                            void persistGalleryVisitorFlags({ show_filenames: next });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}
                </article>
            </div>
        </div>
    );
};
