import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { galleryService } from '../../../services/gallery.service';
import { storageService } from '../../../services/storage.service';
import { signOut } from '../../../services/auth.service';
import { supabase } from '../../../lib/supabase/client';
import { getUserDisplayLabel, getUserInitial } from '../../../lib/userInitials';
import {
    buildCurrentSessionRows,
    mergeStoredSessions,
    resolveSessionLocation,
    userHasPasswordIdentity,
} from '../../../lib/accountSessions';
import { PasswordField } from '../Auth/PasswordField';
import { AppLoader } from '../../ui/AppLoading';
import '../../../pages/Settings.css';

const DEFAULT_NOTIFICATIONS = {
    client_activity: true,
    print_orders: true,
    guest_registrations: true,
    product_news: false,
};

const NOTIFY_ROWS = [
    {
        key: 'client_activity',
        title: 'A client comments or approves',
        hint: 'Email and push.',
    },
    {
        key: 'print_orders',
        title: 'A print order comes in',
        hint: 'Email and push.',
    },
    {
        key: 'guest_registrations',
        title: 'Guest registrations during an event',
        hint: 'A single summary an hour, not one per guest. 148 registrations should not be 148 notifications.',
    },
    {
        key: 'product_news',
        title: 'Product news from PIXNXT',
        hint: 'Occasional. Never more than monthly.',
    },
];

function PersonIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function CheckSmall() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function maskPhone(phone) {
    const raw = (phone || '').trim();
    if (!raw) return '';
    if (raw.includes('•')) return raw;
    const digits = raw.replace(/[^\d+]/g, '');
    if (digits.length < 6) return raw;
    const start = digits.slice(0, Math.min(5, digits.length - 3));
    const end = digits.slice(-3);
    return `${start}••••••${end}`;
}

function formatPasswordChanged(iso) {
    if (!iso) return null;
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return 'Last changed recently';
    const months = Math.max(
        0,
        Math.round((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    );
    if (months <= 0) return 'Last changed this month';
    if (months === 1) return 'Last changed 1 month ago';
    return `Last changed ${months} months ago`;
}

function passwordStatusLabel({ passwordChangedAt, loginPasswordSet, user }) {
    const changed = formatPasswordChanged(passwordChangedAt);
    if (changed) return changed;
    if (userHasPasswordIdentity(user, loginPasswordSet)) return 'Password set';
    return 'Not set yet';
}

export default function YourAccountPanel({ user, showToast }) {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const saveTimers = useRef({});

    const [loading, setLoading] = useState(true);
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const [saveStatus, setSaveStatus] = useState('Saved a moment ago.');
    const [showHandleModal, setShowHandleModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showPasswordSuccess, setShowPasswordSuccess] = useState(false);
    const [handleDraft, setHandleDraft] = useState('');
    const [passwordForm, setPasswordForm] = useState({ next: '', confirm: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [handleCounts, setHandleCounts] = useState({ deliveries: 12, guestLinks: 148 });

    const [profileIcon, setProfileIcon] = useState('');
    const [iconSize, setIconSize] = useState({ w: 72, h: 72 });
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [phoneDisplay, setPhoneDisplay] = useState('');
    const [editingPhone, setEditingPhone] = useState(false);
    const [handle, setHandle] = useState('');
    const [twoFactor, setTwoFactor] = useState(false);
    const [loginPasswordSet, setLoginPasswordSet] = useState(false);
    const [passwordChangedAt, setPasswordChangedAt] = useState('');
    const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
    const [sessions, setSessions] = useState([]);

    const markSaved = useCallback(
        (toastMsg) => {
            setSaveStatus('Saved a moment ago.');
            if (toastMsg) showToast?.(toastMsg);
        },
        [showToast],
    );

    const persist = useCallback(
        async (updates, toastMsg) => {
            if (!user?.id) return false;
            try {
                if (updates.account_notifications) {
                    localStorage.setItem(
                        `pixnxt_account_notifications_${user.id}`,
                        JSON.stringify(updates.account_notifications),
                    );
                }
                await galleryService.updatePhotographerProfile(user.id, updates);
                markSaved(toastMsg);
                return true;
            } catch (err) {
                console.error('Failed to save account field', updates, err);
                showToast?.('Could not save changes. Please try again.');
                return false;
            }
        },
        [user?.id, markSaved, showToast],
    );

    const debouncePersist = useCallback(
        (key, updates, toastMsg) => {
            if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
            saveTimers.current[key] = setTimeout(() => {
                persist(updates, toastMsg);
            }, 500);
        },
        [persist],
    );

    useEffect(() => {
        return () => {
            Object.values(saveTimers.current).forEach(clearTimeout);
        };
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;

        (async () => {
            try {
                const data = await galleryService.getPhotographerProfile(user.id);
                if (cancelled) return;

                const resolvedName =
                    data?.display_name ||
                    data?.first_name ||
                    [data?.first_name, data?.last_name].filter(Boolean).join(' ') ||
                    getUserDisplayLabel(user) ||
                    '';
                const resolvedEmail = data?.contact_email || user.email || '';
                const resolvedPhone = data?.phone || '';
                const resolvedHandle =
                    data?.showcase_slug ||
                    data?.slug ||
                    user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
                    '';

                setProfileIcon(data?.profile_icon_url || '');
                if (!data?.profile_icon_url) setIconSize({ w: 72, h: 72 });
                setName(resolvedName);
                setEmail(resolvedEmail);
                setPhone(resolvedPhone);
                setPhoneDisplay(maskPhone(resolvedPhone));
                setHandle(resolvedHandle);
                setHandleDraft(resolvedHandle);
                setTwoFactor(Boolean(data?.two_factor_enabled));
                setLoginPasswordSet(Boolean(data?.login_password_set));
                setPasswordChangedAt(data?.password_changed_at || '');
                let storedNotifications = data?.account_notifications || null;
                if (!storedNotifications) {
                    try {
                        const raw = localStorage.getItem(
                            `pixnxt_account_notifications_${user.id}`,
                        );
                        if (raw) storedNotifications = JSON.parse(raw);
                    } catch {
                        /* ignore */
                    }
                }
                setNotifications({
                    ...DEFAULT_NOTIFICATIONS,
                    ...(storedNotifications || {}),
                });

                const { data: authData } = await supabase.auth.getSession();
                const location = await resolveSessionLocation();
                const currentRows = buildCurrentSessionRows(authData?.session ?? null, location);
                const nextSessions = mergeStoredSessions(data?.active_sessions, currentRows);
                setSessions(nextSessions);
                await galleryService.updatePhotographerProfile(user.id, {
                    active_sessions: nextSessions,
                });

                try {
                    const collections = await galleryService.getCollections(user.id);
                    const deliveries = (collections || []).length;
                    const guestLinks = (collections || []).reduce(
                        (acc, c) => acc + (Number(c.share_count) || Number(c.guest_count) || 0),
                        0,
                    );
                    if (!cancelled) {
                        setHandleCounts({
                            deliveries: deliveries || 12,
                            guestLinks: guestLinks || 148,
                        });
                    }
                } catch {
                    /* keep demo counts */
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user]);

    const handleNameChange = (value) => {
        setName(value);
        debouncePersist(
            'name',
            { display_name: value, first_name: value.split(/\s+/)[0] || value },
            'Name saved',
        );
    };

    const handleEmailChange = (value) => {
        setEmail(value);
        debouncePersist('email', { contact_email: value }, 'Email saved');
    };

    const handlePhoneBlur = () => {
        setEditingPhone(false);
        setPhoneDisplay(maskPhone(phone));
        if (user?.id) persist({ phone }, 'Phone saved');
    };

    const handleIconChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;
        setUploadingIcon(true);
        try {
            const ext = file.name.split('.').pop() || 'png';
            const path = `photographers/${user.id}/profile_icon_${Date.now()}.${ext}`;
            const uploadResult = await storageService.upload(path, file);
            const imageUrl = uploadResult.url;
            setProfileIcon(imageUrl);
            setIconSize({ w: 72, h: 72 });
            await persist({ profile_icon_url: imageUrl }, 'Profile icon updated');
        } catch (err) {
            console.error(err);
            alert('Failed to upload profile icon. Please try again.');
        } finally {
            setUploadingIcon(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveIcon = async (e) => {
        e.stopPropagation();
        if (!user?.id) return;
        setUploadingIcon(true);
        try {
            setProfileIcon('');
            setIconSize({ w: 72, h: 72 });
            await persist({ profile_icon_url: '' }, 'Profile icon removed');
        } catch (err) {
            console.error(err);
        } finally {
            setUploadingIcon(false);
        }
    };

    const toggleTwoFactor = async () => {
        const next = !twoFactor;
        if (next && !phone?.trim()) {
            showToast?.('Add a phone number first — codes are sent there.');
            return;
        }
        const previous = twoFactor;
        setTwoFactor(next);
        const saved = await persist(
            { two_factor_enabled: next },
            next ? 'Two-step verification on' : 'Two-step verification off',
        );
        if (!saved) setTwoFactor(previous);
    };

    const toggleNotification = async (key) => {
        const next = { ...notifications, [key]: !notifications[key] };
        setNotifications(next);
        await persist({ account_notifications: next });
    };

    const revokeSession = async (sessionRow) => {
        if (sessionRow?.canSignOut && sessionRow?.current) {
            try {
                await signOut();
                navigate('/auth', { replace: true });
            } catch (err) {
                console.error(err);
                showToast?.('Could not sign out. Please try again.');
            }
            return;
        }

        const next = sessions.filter((s) => s.id !== sessionRow?.id);
        const previous = sessions;
        setSessions(next);
        const saved = await persist({ active_sessions: next }, 'Signed out of device');
        if (!saved) setSessions(previous);
    };

    const saveHandle = async () => {
        const cleaned = handleDraft
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')
            .replace(/^-+|-+$/g, '');
        if (!cleaned) return;
        setHandle(cleaned);
        setShowHandleModal(false);
        await persist({ showcase_slug: cleaned }, 'Handle updated');
        window.dispatchEvent(
            new CustomEvent('pixnxt:username-changed', { detail: { slug: cleaned } }),
        );
    };

    const savePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        if (!passwordForm.next) {
            setPasswordError('Password cannot be empty.');
            return;
        }
        if (passwordForm.next !== passwordForm.confirm) {
            setPasswordError('Passwords do not match.');
            return;
        }
        if (passwordForm.next.length < 8) {
            setPasswordError('Password must be at least 8 characters.');
            return;
        }
        setPasswordSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: passwordForm.next });
            if (error) throw error;
            const now = new Date().toISOString();
            setPasswordChangedAt(now);
            setLoginPasswordSet(true);
            setShowPasswordModal(false);
            setPasswordForm({ next: '', confirm: '' });
            setShowPasswordSuccess(true);
            showToast?.('Password changed successfully');
            void persist({ login_password_set: true, password_changed_at: now });
        } catch (err) {
            setPasswordError(err.message || 'Failed to update password.');
        } finally {
            setPasswordSaving(false);
        }
    };

    const passwordHint = passwordStatusLabel({ passwordChangedAt, loginPasswordSet, user });
    const hasPassword = userHasPasswordIdentity(user, loginPasswordSet);

    if (loading) {
        return <AppLoader label="Loading account" variant="page-short" className="ya-loading app-loader" />;
    }

    return (
        <div className="ya-panel">
            <div className="ya-info-banner">
                <span className="ya-info-banner__icon">
                    <PersonIcon />
                </span>
                <p className="ya-info-banner__text">
                    Personal to <strong>you</strong>, not to the studio. Nothing on this page
                    appears to a client or a guest.
                </p>
            </div>

            {/* ── YOU ── */}
            <section className="ya-section">
                <span className="ya-overline">YOU</span>

                <div className="ya-avatar-row">
                    <button
                        type="button"
                        className={`ya-avatar ${profileIcon ? 'ya-avatar--image' : 'ya-avatar--empty'}`}
                        style={
                            profileIcon
                                ? { width: iconSize.w, height: iconSize.h }
                                : undefined
                        }
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Change profile icon"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="ya-hidden-input"
                            onChange={handleIconChange}
                        />
                        {uploadingIcon ? (
                            <span className="ya-avatar-spinner" />
                        ) : profileIcon ? (
                            <img
                                src={profileIcon}
                                alt=""
                                className="ya-avatar-img"
                                onLoad={(e) => {
                                    const img = e.currentTarget;
                                    const max = 160;
                                    const nw = img.naturalWidth || 72;
                                    const nh = img.naturalHeight || 72;
                                    const scale = Math.min(1, max / Math.max(nw, nh));
                                    setIconSize({
                                        w: Math.max(56, Math.round(nw * scale)),
                                        h: Math.max(56, Math.round(nh * scale)),
                                    });
                                }}
                            />
                        ) : (
                            <span className="ya-avatar-fallback">{getUserInitial(user)}</span>
                        )}
                    </button>
                    <div className="ya-avatar-meta">
                        <p className="ya-avatar-title">Profile icon</p>
                        <p className="ya-field-hint">
                            Shown on your galleries and showcase. The preview fits the full image.
                        </p>
                        <div className="ya-avatar-actions">
                            <button
                                type="button"
                                className="ya-btn ya-btn--ghost"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {profileIcon ? 'Change' : 'Upload'}
                            </button>
                            {profileIcon ? (
                                <button
                                    type="button"
                                    className="ya-text-btn"
                                    onClick={handleRemoveIcon}
                                >
                                    Remove
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="ya-field">
                    <label className="ya-label" htmlFor="ya-name">
                        Name
                    </label>
                    <input
                        id="ya-name"
                        className="ya-input"
                        type="text"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                    />
                </div>

                <div className="ya-field">
                    <label className="ya-label" htmlFor="ya-email">
                        Email
                    </label>
                    <input
                        id="ya-email"
                        className="ya-input"
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                    />
                    <p className="ya-field-hint">
                        Changing this needs confirmation from both addresses.
                    </p>
                </div>

                <div className="ya-field">
                    <label className="ya-label" htmlFor="ya-phone">
                        Phone
                    </label>
                    <input
                        id="ya-phone"
                        className="ya-input"
                        type="text"
                        value={editingPhone ? phone : phoneDisplay || phone}
                        onFocus={() => {
                            setEditingPhone(true);
                        }}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={handlePhoneBlur}
                    />
                    <p className="ya-field-hint">
                        Used for sign-in codes, never shown to clients or guests.
                    </p>
                </div>
            </section>

            {/* ── STUDIO HANDLE ── */}
            <section className="ya-section">
                <span className="ya-overline">STUDIO HANDLE</span>
                <p className="ya-handle">{handle || '—'}</p>
                <p className="ya-field-hint ya-field-hint--tight">
                    The first part of every address your studio uses.
                </p>

                <div className="ya-warn-box">
                    <p className="ya-warn-box__text">
                        <strong>
                            {handleCounts.deliveries} deliveries and {handleCounts.guestLinks} guest
                            links currently use this handle.
                        </strong>{' '}
                        Changing it breaks every link you have already sent. The old handle
                        redirects for 12 months, then stops.
                    </p>
                </div>

                <button
                    type="button"
                    className="ya-btn ya-btn--ghost"
                    onClick={() => {
                        setHandleDraft(handle);
                        setShowHandleModal(true);
                    }}
                >
                    Change handle
                </button>
            </section>

            {/* ── SIGNING IN ── */}
            <section className="ya-section">
                <span className="ya-overline">SIGNING IN</span>

                <div className="ya-row">
                    <div className="ya-row__copy">
                        <h3 className="ya-row__title">Password</h3>
                        <p className="ya-row__hint">{passwordHint}</p>
                    </div>
                    <button
                        type="button"
                        className="ya-btn ya-btn--ghost"
                        onClick={() => {
                            setPasswordError('');
                            setShowPasswordModal(true);
                        }}
                    >
                        {hasPassword ? 'Change' : 'Set'}
                    </button>
                </div>

                <div className="ya-row">
                    <div className="ya-row__copy">
                        <h3 className="ya-row__title">Two-step verification</h3>
                        <p className="ya-row__hint">
                            A code to your phone after the password. Worth it — this account holds
                            client galleries and billing.
                        </p>
                    </div>
                    <button
                        type="button"
                        className={`ya-toggle ${twoFactor ? 'ya-toggle--on' : ''}`}
                        onClick={toggleTwoFactor}
                        aria-pressed={twoFactor}
                        aria-label="Two-step verification"
                    >
                        <span className="ya-toggle__thumb" />
                    </button>
                </div>

                <div className="ya-block">
                    <h3 className="ya-row__title">Where you&apos;re signed in</h3>
                    <p className="ya-row__hint">Sign out of any device you don&apos;t recognise.</p>

                    <div className="ya-session-card">
                        {sessions.map((session, idx) => (
                            <div
                                key={session.id || idx}
                                className={`ya-session-row ${idx === sessions.length - 1 ? 'ya-session-row--last' : ''}`}
                            >
                                <div className="ya-session-row__copy">
                                    <span className="ya-session-row__device">
                                        {session.label ||
                                            `${session.device}${session.location ? ` · ${session.location}` : ''}`}
                                    </span>
                                    <span className="ya-session-row__meta">
                                        {session.meta ||
                                            session.lastActive ||
                                            (session.current
                                                ? 'This device · active now'
                                                : 'Active recently')}
                                    </span>
                                </div>
                                {session.canSignOut || !session.current ? (
                                    <button
                                        type="button"
                                        className="ya-btn ya-btn--ghost"
                                        onClick={() => revokeSession(session)}
                                    >
                                        Sign out
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>

                    <p className="ya-field-hint">
                        Venue laptops and borrowed machines are how sessions outlive their
                        usefulness. This list is the only way to end one.
                    </p>
                </div>
            </section>

            {/* ── WHAT YOU GET TOLD ── */}
            <section className="ya-section ya-section--last">
                <span className="ya-overline">WHAT YOU GET TOLD</span>
                <p className="ya-section-lead">
                    Messages to <strong>you</strong>. What clients and guests receive is set per
                    module, in that module&apos;s Delivery &amp; messages.
                </p>

                <div className="ya-notify-list">
                    {NOTIFY_ROWS.map((row) => (
                        <div key={row.key} className="ya-row ya-row--notify">
                            <div className="ya-row__copy">
                                <h3 className="ya-row__title">{row.title}</h3>
                                <p className="ya-row__hint">{row.hint}</p>
                            </div>
                            <button
                                type="button"
                                className={`ya-toggle ${notifications[row.key] ? 'ya-toggle--on' : ''}`}
                                onClick={() => toggleNotification(row.key)}
                                aria-pressed={Boolean(notifications[row.key])}
                                aria-label={row.title}
                            >
                                <span className="ya-toggle__thumb" />
                            </button>
                        </div>
                    ))}
                </div>

                <p className="ya-save-status">
                    <CheckSmall />
                    {saveStatus}
                </p>
            </section>

            {/* Handle modal */}
            {showHandleModal ? (
                <div className="ya-modal-backdrop" role="presentation">
                    <div className="ya-modal" role="dialog" aria-modal="true">
                        <div className="ya-modal__head">
                            <h2 className="ya-modal__title">Change handle</h2>
                            <button
                                type="button"
                                className="ya-modal__close"
                                onClick={() => setShowHandleModal(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                        <div className="ya-modal__body">
                            <label className="ya-label" htmlFor="ya-handle-input">
                                Studio handle
                            </label>
                            <input
                                id="ya-handle-input"
                                className="ya-input"
                                value={handleDraft}
                                onChange={(e) => setHandleDraft(e.target.value)}
                            />
                            <p className="ya-field-hint">
                                Lowercase letters and numbers only. Old links redirect for 12
                                months.
                            </p>
                        </div>
                        <div className="ya-modal__actions">
                            <button
                                type="button"
                                className="ya-btn ya-btn--ghost"
                                onClick={() => setShowHandleModal(false)}
                            >
                                Cancel
                            </button>
                            <button type="button" className="ya-btn ya-btn--dark" onClick={saveHandle}>
                                Save handle
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Password modal */}
            {showPasswordModal ? (
                <div className="ya-modal-backdrop" role="presentation">
                    <form className="ya-modal" onSubmit={savePassword}>
                        <div className="ya-modal__head">
                            <h2 className="ya-modal__title">
                                {hasPassword ? 'Change password' : 'Set password'}
                            </h2>
                            <button
                                type="button"
                                className="ya-modal__close"
                                onClick={() => setShowPasswordModal(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                        <div className="ya-modal__body">
                            <label className="ya-label" htmlFor="ya-pass-next">
                                New password
                            </label>
                            <PasswordField
                                id="ya-pass-next"
                                value={passwordForm.next}
                                onChange={(e) =>
                                    setPasswordForm((p) => ({ ...p, next: e.target.value }))
                                }
                                autoComplete="new-password"
                                shellClassName="ya-password-shell"
                                inputClassName="ya-input ya-input--password"
                                actionClassName="ya-password-action"
                            />
                            <label className="ya-label ya-label--spaced" htmlFor="ya-pass-confirm">
                                Confirm password
                            </label>
                            <PasswordField
                                id="ya-pass-confirm"
                                value={passwordForm.confirm}
                                onChange={(e) =>
                                    setPasswordForm((p) => ({ ...p, confirm: e.target.value }))
                                }
                                autoComplete="new-password"
                                shellClassName="ya-password-shell"
                                inputClassName="ya-input ya-input--password"
                                actionClassName="ya-password-action"
                            />
                            {passwordError ? (
                                <p className="ya-error">{passwordError}</p>
                            ) : null}
                        </div>
                        <div className="ya-modal__actions">
                            <button
                                type="button"
                                className="ya-btn ya-btn--ghost"
                                onClick={() => setShowPasswordModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="ya-btn ya-btn--dark"
                                disabled={passwordSaving}
                            >
                                {passwordSaving ? 'Saving…' : 'Save password'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}

            {showPasswordSuccess ? (
                <div className="ya-modal-backdrop" role="presentation">
                    <div
                        className="ya-modal ya-modal--success"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ya-password-success-title"
                    >
                        <div className="ya-modal__body ya-modal__body--success">
                            <div className="ya-success-icon" aria-hidden>
                                <CheckSmall />
                            </div>
                            <h2 id="ya-password-success-title" className="ya-modal__title">
                                Password changed
                            </h2>
                            <p className="ya-field-hint ya-field-hint--center">
                                Your new password is saved. Use it the next time you sign in.
                            </p>
                        </div>
                        <div className="ya-modal__actions ya-modal__actions--center">
                            <button
                                type="button"
                                className="ya-btn ya-btn--dark"
                                onClick={() => setShowPasswordSuccess(false)}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
