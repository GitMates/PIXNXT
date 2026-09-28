import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { galleryService } from '../../../services/gallery.service';
import { storageService } from '../../../services/storage.service';
import { signOut, changePassword, updatePassword, listAuthSessions, revokeAuthSession, sendPasswordResetSelf, startTwoFactorEnable, confirmTwoFactorEnable, disableTwoFactor } from '../../../services/auth.service';
import { getUserDisplayLabel, getUserInitial } from '../../../lib/userInitials';
import { isReservedPlatformSubdomain } from '../../../lib/customDomain';
import {
    resolveSessionLocation,
    userHasPasswordIdentity,
} from '../../../lib/accountSessions';
import { PasswordField } from '../Auth/PasswordField';
import { AppLoader } from '../../ui/AppLoading';
import {
    getPhotographerR2Folder,
    buildUserModulePath,
    R2_USER_MODULES,
} from '../../../lib/photographerR2Folder';
import { writeCachedProfileIcon, syncProfileIconCacheFromProfile } from '../../../lib/profileIcon';
import { useAppLanguage } from '../../../context/AppLanguageContext';
import { APP_LANGUAGE_IDS, appLanguageLabel } from '../../../lib/app-languages';
import '../../../pages/Settings.css';

function mapAuthSessionsToRows(apiSessions, location = '—') {
    return (apiSessions || []).map((s) => {
        const current = Boolean(s.current);
        return {
            id: s.id,
            device: s.device || 'Browser',
            location: current ? location : '—',
            label: current
                ? `${s.device || 'Browser'} · ${location}`
                : s.device || 'Browser',
            meta: current
                ? `${s.detail || 'This device'} · active now`
                : s.detail || 'Active recently',
            current,
            canSignOut: !current,
            lastActive: s.createdAt || null,
        };
    });
}

const DEFAULT_NOTIFICATIONS = {
    client_activity: true,
    print_orders: true,
    guest_registrations: true,
    product_news: false,
};

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

function formatPasswordChanged(iso, a) {
    if (!iso) return null;
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return a.lastChangedRecent;
    const months = Math.max(
        0,
        Math.round((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    );
    if (months <= 0) return a.lastChangedMonth;
    if (months === 1) return a.lastChanged1;
    return a.lastChangedN(months);
}

function passwordStatusLabel({ passwordChangedAt, loginPasswordSet, user }, a) {
    const changed = formatPasswordChanged(passwordChangedAt, a);
    if (changed) return changed;
    if (userHasPasswordIdentity(user, loginPasswordSet)) return a.passwordSet;
    return a.notSetYet;
}

export default function YourAccountPanel({ user, showToast }) {
    const navigate = useNavigate();
    const { lang: appLang, setAppLanguage, t: appT } = useAppLanguage();
    const fileInputRef = useRef(null);
    const saveTimers = useRef({});

    const [loading, setLoading] = useState(true);
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const [showHandleModal, setShowHandleModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showPasswordSuccess, setShowPasswordSuccess] = useState(false);
    const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
    const [twoFactorMode, setTwoFactorMode] = useState('enable'); // enable | disable
    const [twoFactorChallengeId, setTwoFactorChallengeId] = useState('');
    const [twoFactorEmailHint, setTwoFactorEmailHint] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [twoFactorPassword, setTwoFactorPassword] = useState('');
    const [twoFactorError, setTwoFactorError] = useState('');
    const [twoFactorBusy, setTwoFactorBusy] = useState(false);
    const [forgotBusy, setForgotBusy] = useState(false);
    const [handleDraft, setHandleDraft] = useState('');
    const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [handleCounts, setHandleCounts] = useState({ deliveries: 12, guestLinks: 148 });

    const [profileIcon, setProfileIcon] = useState('');
    const [iconSize, setIconSize] = useState({ w: 72, h: 72 });
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [website, setWebsite] = useState('');
    const [socialInstagram, setSocialInstagram] = useState('');
    const [socialFacebook, setSocialFacebook] = useState('');
    const [socialXTwitter, setSocialXTwitter] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [city, setCity] = useState('');
    const [stateProvince, setStateProvince] = useState('');
    const [handle, setHandle] = useState('');
    const [twoFactor, setTwoFactor] = useState(false);
    const [loginPasswordSet, setLoginPasswordSet] = useState(false);
    const [passwordChangedAt, setPasswordChangedAt] = useState('');
    const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
    const [sessions, setSessions] = useState([]);

    const markSaved = useCallback(
        (toastMsg) => {
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
                // Keep the shared profile cache fresh so avatars across the
                // dashboard/sidebars pick up changes (e.g. profile icon) without reload.
                try {
                    const key = `photographer_profile_${user.id}`;
                    const raw = localStorage.getItem(key);
                    const prev = raw ? JSON.parse(raw) : {};
                    const next = { ...prev, ...updates, id: prev.id || user.id };
                    localStorage.setItem(key, JSON.stringify(next));
                    if ('profile_icon_url' in updates || 'avatar_url' in updates) {
                        writeCachedProfileIcon(user.id, next.profile_icon_url || next.avatar_url || '');
                    } else {
                        syncProfileIconCacheFromProfile(next);
                    }
                } catch {
                    /* ignore */
                }
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
                setWebsite(data?.website || '');
                setSocialInstagram(data?.social_instagram || '');
                setSocialFacebook(data?.social_facebook || '');
                setSocialXTwitter(data?.social_x_twitter || '');
                setAddressLine1(data?.address_line_1 || '');
                setCity(data?.city || '');
                setStateProvince(data?.state_province || '');
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

                // Real refresh sessions from auth_sessions (not invented profile JSON).
                const location = await resolveSessionLocation();
                let nextSessions = [];
                try {
                    const apiSessions = await listAuthSessions();
                    nextSessions = mapAuthSessionsToRows(apiSessions, location);
                } catch (sessionErr) {
                    console.warn('Failed to load auth sessions:', sessionErr);
                    nextSessions = [];
                }
                if (!nextSessions.some((s) => s.current)) {
                    nextSessions = [
                        {
                            id: 'current',
                            device: 'This browser',
                            location,
                            label: `This browser · ${location}`,
                            meta: 'This device · active now',
                            current: true,
                            canSignOut: false,
                        },
                        ...nextSessions,
                    ];
                }
                setSessions(nextSessions);

                try {
                    const collections = await galleryService.getCollections(user.id);
                    const deliveries = (collections || []).length;
                    const guestLinks = (collections || []).reduce(
                        (acc, c) => acc + (Number(c.share_count) || Number(c.guest_count) || 0),
                        0,
                    );
                    if (!cancelled) {
                        setHandleCounts({
                            deliveries,
                            guestLinks,
                        });
                    }
                } catch {
                    if (!cancelled) setHandleCounts({ deliveries: 0, guestLinks: 0 });
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
        if (user?.id) persist({ phone }, 'Phone saved');
    };

    const handleWebsiteChange = (value) => {
        setWebsite(value);
        debouncePersist('website', { website: value }, 'Website saved');
    };

    const handleSocialChange = (key, value, setter) => {
        setter(value);
        debouncePersist(key, { [key]: value }, 'Social links saved');
    };

    const handleAddressLineChange = (value) => {
        setAddressLine1(value);
        debouncePersist('address_line_1', { address_line_1: value }, 'Business address saved');
    };

    const handleCityChange = (value) => {
        setCity(value);
        debouncePersist('city', { city: value }, 'Business address saved');
    };

    const handleStateChange = (value) => {
        setStateProvince(value);
        debouncePersist('state_province', { state_province: value }, 'Business address saved');
    };

    const handleIconChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;
        setUploadingIcon(true);
        try {
            const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'png';
            const folder = await getPhotographerR2Folder(user.id);
            const path = buildUserModulePath(
                folder,
                R2_USER_MODULES.STUDIO,
                `profile_icon_${Date.now()}.${ext}`,
            );
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
        setTwoFactorError('');
        setTwoFactorCode('');
        setTwoFactorPassword('');
        if (twoFactor) {
            setTwoFactorMode('disable');
            setShowTwoFactorModal(true);
            return;
        }
        setTwoFactorBusy(true);
        try {
            const data = await startTwoFactorEnable();
            if (data?.alreadyEnabled) {
                setTwoFactor(true);
                showToast?.('Two-step verification is already on');
                return;
            }
            setTwoFactorChallengeId(data?.challengeId || '');
            setTwoFactorEmailHint(data?.emailHint || user?.email || '');
            setTwoFactorMode('enable');
            setShowTwoFactorModal(true);
        } catch (err) {
            console.error(err);
            showToast?.(err?.message || 'Could not start two-step verification.');
        } finally {
            setTwoFactorBusy(false);
        }
    };

    const confirmEnableTwoFactor = async (e) => {
        e.preventDefault();
        setTwoFactorError('');
        if (!twoFactorCode.trim()) {
            setTwoFactorError('Enter the code from your email.');
            return;
        }
        setTwoFactorBusy(true);
        try {
            await confirmTwoFactorEnable({
                challengeId: twoFactorChallengeId,
                code: twoFactorCode.trim(),
            });
            setTwoFactor(true);
            setShowTwoFactorModal(false);
            showToast?.('Two-step verification is on');
        } catch (err) {
            setTwoFactorError(err?.message || 'Invalid verification code.');
        } finally {
            setTwoFactorBusy(false);
        }
    };

    const confirmDisableTwoFactor = async (e) => {
        e.preventDefault();
        setTwoFactorError('');
        if (hasPassword && !twoFactorPassword) {
            setTwoFactorError('Enter your password to turn this off.');
            return;
        }
        setTwoFactorBusy(true);
        try {
            await disableTwoFactor(
                hasPassword ? { password: twoFactorPassword } : {},
            );
            setTwoFactor(false);
            setShowTwoFactorModal(false);
            showToast?.('Two-step verification is off');
        } catch (err) {
            setTwoFactorError(err?.message || 'Could not turn off two-step verification.');
        } finally {
            setTwoFactorBusy(false);
        }
    };

    const sendForgotPassword = async () => {
        if (!user?.email) {
            showToast?.('No login email on this account.');
            return;
        }
        setForgotBusy(true);
        try {
            const data = await sendPasswordResetSelf();
            showToast?.(
                `Reset link sent to ${data?.emailHint || user.email}`,
            );
        } catch (err) {
            console.error(err);
            showToast?.(err?.message || 'Could not send reset email.');
        } finally {
            setForgotBusy(false);
        }
    };

    const toggleNotification = async (key) => {
        const next = { ...notifications, [key]: !notifications[key] };
        setNotifications(next);
        await persist({ account_notifications: next }, 'Notification preferences saved');
    };

    const revokeSession = async (sessionRow) => {
        if (sessionRow?.current) {
            try {
                await signOut();
                navigate('/auth', { replace: true });
            } catch (err) {
                console.error(err);
                showToast?.('Could not sign out. Please try again.');
            }
            return;
        }

        if (!sessionRow?.id) return;
        const previous = sessions;
        setSessions((rows) => rows.filter((s) => s.id !== sessionRow.id));
        try {
            await revokeAuthSession(sessionRow.id);
            showToast?.('Signed out of device');
        } catch (err) {
            console.error(err);
            setSessions(previous);
            showToast?.(err?.message || 'Could not sign out that device.');
        }
    };

    const saveHandle = async () => {
        const cleaned = handleDraft
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')
            .replace(/^-+|-+$/g, '');
        if (!cleaned) return;
        if (isReservedPlatformSubdomain(cleaned)) {
            showToast?.('This handle is reserved — please choose another.');
            return;
        }
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
        if (hasPassword && !passwordForm.current) {
            setPasswordError('Enter your current password.');
            return;
        }
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
            // The current-password field is only shown when
            // the account already has a password — match it: changePassword
            // when the current password is available, updatePassword
            // otherwise (both via auth.service → Workers).
            if (hasPassword) {
                await changePassword(passwordForm.current, passwordForm.next);
            } else {
                await updatePassword(passwordForm.next);
            }
            const now = new Date().toISOString();
            setPasswordChangedAt(now);
            setLoginPasswordSet(true);
            setShowPasswordModal(false);
            setPasswordForm({ current: '', next: '', confirm: '' });
            setShowPasswordSuccess(true);
            showToast?.('Password changed successfully');
            void persist({ login_password_set: true, password_changed_at: now });
        } catch (err) {
            setPasswordError(err.message || 'Failed to update password.');
        } finally {
            setPasswordSaving(false);
        }
    };

    const passwordHint = passwordStatusLabel({ passwordChangedAt, loginPasswordSet, user }, appT.account);
    const notifyRows = [
        { key: 'client_activity', title: appT.account.notifyClientTitle, hint: appT.account.notifyEmailPush },
        { key: 'print_orders', title: appT.account.notifyPrintTitle, hint: appT.account.notifyEmailPush },
        { key: 'guest_registrations', title: appT.account.notifyGuestTitle, hint: appT.account.notifyGuestHint },
        { key: 'product_news', title: appT.account.notifyNewsTitle, hint: appT.account.notifyNewsHint },
    ];
    const hasPassword = userHasPasswordIdentity(user, loginPasswordSet);

    if (loading) {
        return <AppLoader label={appT.account.loadingAccount} variant="page-short" className="ya-loading app-loader" />;
    }

    return (
        <div className="ya-panel">
            <div className="ya-info-banner">
                <span className="ya-info-banner__icon">
                    <PersonIcon />
                </span>
                <p className="ya-info-banner__text">
                    {appT.account.personalNote}
                </p>
            </div>

            {/* ── YOU ── */}
            <section className="ya-section">
                <span className="ya-overline">{appT.account.youOverline}</span>

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
                        <p className="ya-avatar-title">{appT.account.profileIcon}</p>
                        <p className="ya-field-hint">
                            {appT.account.profileIconDesc}
                        </p>
                        <div className="ya-avatar-actions">
                            <button
                                type="button"
                                className="ya-btn ya-btn--ghost"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {profileIcon ? appT.common.change : appT.common.upload}
                            </button>
                            {profileIcon ? (
                                <button
                                    type="button"
                                    className="ya-text-btn"
                                    onClick={handleRemoveIcon}
                                >
                                    {appT.common.remove}
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="ya-field">
                    <label className="ya-label" htmlFor="ya-name">
                        {appT.account.name}
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
                        {appT.account.email}
                    </label>
                    <input
                        id="ya-email"
                        className="ya-input"
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                    />
                    <p className="ya-field-hint">
                        {appT.account.emailHint}
                    </p>
                </div>

                <div className="ya-field">
                    <label className="ya-label" htmlFor="ya-phone">
                        {appT.account.phone}
                    </label>
                    <input
                        id="ya-phone"
                        className="ya-input"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        placeholder={appT.account.phonePh}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={handlePhoneBlur}
                    />
                    <p className="ya-field-hint">
                        {appT.account.phoneHint}
                    </p>
                </div>

                <div className="ya-field">
                    <span className="ya-label" id="ya-language-label">
                        {appT.account.language}
                    </span>
                    <div className="ya-lang-segment" role="group" aria-labelledby="ya-language-label">
                        {APP_LANGUAGE_IDS.map((id) => (
                            <button
                                key={id}
                                type="button"
                                className={`ya-lang-segment__item${appLang === id ? ' is-on' : ''}`}
                                aria-pressed={appLang === id}
                                onClick={() => setAppLanguage(id)}
                            >
                                {appLanguageLabel(id)}
                            </button>
                        ))}
                    </div>
                    <p className="ya-field-hint">
                        {appT.account.languageApplies}
                    </p>
                </div>
            </section>

            <section className="ya-section">
                <span className="ya-overline">{appT.account.publicContact}</span>
                <p className="ya-section-lead">
                    {appT.account.publicContactLead}
                </p>

                <div className="ya-field">
                    <label className="ya-label" htmlFor="ya-website">
                        {appT.account.website}
                    </label>
                    <input
                        id="ya-website"
                        className="ya-input"
                        type="url"
                        placeholder={appT.account.websitePh}
                        value={website}
                        onChange={(e) => handleWebsiteChange(e.target.value)}
                    />
                </div>

                <div className="ya-field">
                    <span className="ya-label">{appT.account.socialLinks}</span>
                    <div className="ya-social-fields">
                        <div className="ya-field ya-field--nested">
                            <label className="ya-label ya-label--sub" htmlFor="ya-social-instagram">
                                Instagram
                            </label>
                            <input
                                id="ya-social-instagram"
                                className="ya-input"
                                type="text"
                                placeholder={appT.account.instagramPh}
                                value={socialInstagram}
                                onChange={(e) =>
                                    handleSocialChange(
                                        'social_instagram',
                                        e.target.value,
                                        setSocialInstagram,
                                    )
                                }
                            />
                        </div>
                        <div className="ya-field ya-field--nested">
                            <label className="ya-label ya-label--sub" htmlFor="ya-social-facebook">
                                Facebook
                            </label>
                            <input
                                id="ya-social-facebook"
                                className="ya-input"
                                type="text"
                                placeholder={appT.account.facebookPh}
                                value={socialFacebook}
                                onChange={(e) =>
                                    handleSocialChange(
                                        'social_facebook',
                                        e.target.value,
                                        setSocialFacebook,
                                    )
                                }
                            />
                        </div>
                        <div className="ya-field ya-field--nested">
                            <label className="ya-label ya-label--sub" htmlFor="ya-social-x">
                                X (Twitter)
                            </label>
                            <input
                                id="ya-social-x"
                                className="ya-input"
                                type="text"
                                placeholder={appT.account.instagramPh}
                                value={socialXTwitter}
                                onChange={(e) =>
                                    handleSocialChange(
                                        'social_x_twitter',
                                        e.target.value,
                                        setSocialXTwitter,
                                    )
                                }
                            />
                        </div>
                    </div>
                </div>

                <div className="ya-field">
                    <label className="ya-label" htmlFor="ya-address-line">
                        {appT.account.businessAddress}
                    </label>
                    <input
                        id="ya-address-line"
                        className="ya-input"
                        type="text"
                        placeholder={appT.account.streetPh}
                        value={addressLine1}
                        onChange={(e) => handleAddressLineChange(e.target.value)}
                    />
                    <div className="ya-field-row">
                        <div className="ya-field ya-field--nested">
                            <label className="ya-label ya-label--sub" htmlFor="ya-city">
                                {appT.account.city}
                            </label>
                            <input
                                id="ya-city"
                                className="ya-input"
                                type="text"
                                value={city}
                                onChange={(e) => handleCityChange(e.target.value)}
                            />
                        </div>
                        <div className="ya-field ya-field--nested">
                            <label className="ya-label ya-label--sub" htmlFor="ya-state">
                                {appT.account.state}
                            </label>
                            <input
                                id="ya-state"
                                className="ya-input"
                                type="text"
                                value={stateProvince}
                                onChange={(e) => handleStateChange(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── STUDIO HANDLE ── */}
            <section className="ya-section">
                <span className="ya-overline">{appT.account.studioHandle}</span>
                <p className="ya-handle">{handle || '—'}</p>
                <p className="ya-field-hint ya-field-hint--tight">
                    {appT.account.handleLead}
                </p>

                <div className="ya-warn-box">
                    <p className="ya-warn-box__text">
                        <strong>
                            {appT.account.handleWarn(handleCounts.deliveries, handleCounts.guestLinks)}
                        </strong>{' '}
                        {appT.account.handleWarnRest}
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
                    {appT.account.changeHandle}
                </button>
            </section>

            {/* ── SIGNING IN ── */}
            <section className="ya-section">
                <span className="ya-overline">{appT.account.signingIn}</span>

                <div className="ya-row">
                    <div className="ya-row__copy">
                        <h3 className="ya-row__title">{appT.account.password}</h3>
                        <p className="ya-row__hint">{passwordHint}</p>
                    </div>
                    <div
                        className="ya-row__actions"
                        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}
                    >
                        {hasPassword ? (
                            <button
                                type="button"
                                className="ya-btn ya-btn--ghost"
                                disabled={forgotBusy}
                                onClick={sendForgotPassword}
                            >
                                {forgotBusy ? appT.account.sending : appT.account.forgotPassword}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="ya-btn ya-btn--ghost"
                            onClick={() => {
                                setPasswordError('');
                                setShowPasswordModal(true);
                            }}
                        >
                            {hasPassword ? appT.common.change : appT.account.set}
                        </button>
                    </div>
                </div>

                <div className="ya-row">
                    <div className="ya-row__copy">
                        <h3 className="ya-row__title">{appT.account.twoStep}</h3>
                        <p className="ya-row__hint">
                            {appT.account.twoStepHint}
                        </p>
                    </div>
                    <button
                        type="button"
                        className={`ya-toggle ${twoFactor ? 'ya-toggle--on' : ''}`}
                        onClick={toggleTwoFactor}
                        disabled={twoFactorBusy}
                        aria-pressed={twoFactor}
                        aria-label={appT.account.twoStep}
                    >
                        <span className="ya-toggle__thumb" />
                    </button>
                </div>

                <div className="ya-block">
                    <h3 className="ya-row__title">{appT.account.sessionsTitle}</h3>
                    <p className="ya-row__hint">{appT.account.sessionsHint}</p>

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
                                        {session.current ? appT.account.thisDevice : appT.account.activeRecently}
                                    </span>
                                </div>
                                {session.canSignOut || !session.current ? (
                                    <button
                                        type="button"
                                        className="ya-btn ya-btn--ghost"
                                        onClick={() => revokeSession(session)}
                                    >
                                        {appT.common.signOut}
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>

                    <p className="ya-field-hint">
                        {appT.account.sessionsFoot}
                    </p>
                </div>
            </section>

            {/* ── WHAT YOU GET TOLD ── */}
            <section className="ya-section ya-section--last">
                <span className="ya-overline">{appT.account.toldTitle}</span>
                <p className="ya-section-lead">
                    {appT.account.toldLeadBefore} <strong>{appT.account.toldLeadYou}</strong>
                    {appT.account.toldLeadAfter}
                </p>

                <div className="ya-notify-list">
                    {notifyRows.map((row) => (
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
                    {appT.account.savedAgo}
                </p>
            </section>

            {/* Handle modal */}
            {showHandleModal ? (
                <div className="ya-modal-backdrop" role="presentation">
                    <div className="ya-modal" role="dialog" aria-modal="true">
                        <div className="ya-modal__head">
                            <h2 className="ya-modal__title">{appT.account.changeHandle}</h2>
                            <button
                                type="button"
                                className="ya-modal__close"
                                onClick={() => setShowHandleModal(false)}
                                aria-label={appT.account.close}
                            >
                                ×
                            </button>
                        </div>
                        <div className="ya-modal__body">
                            <label className="ya-label" htmlFor="ya-handle-input">
                                {appT.account.handleField}
                            </label>
                            <input
                                id="ya-handle-input"
                                className="ya-input"
                                value={handleDraft}
                                onChange={(e) => setHandleDraft(e.target.value)}
                            />
                            <p className="ya-field-hint">
                                {appT.account.handleHint}
                            </p>
                        </div>
                        <div className="ya-modal__actions">
                            <button
                                type="button"
                                className="ya-btn ya-btn--ghost"
                                onClick={() => setShowHandleModal(false)}
                            >
                                {appT.common.cancel}
                            </button>
                            <button type="button" className="ya-btn ya-btn--dark" onClick={saveHandle}>
                                {appT.account.saveHandle}
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
                                {hasPassword ? appT.account.changePassword : appT.account.setPassword}
                            </h2>
                            <button
                                type="button"
                                className="ya-modal__close"
                                onClick={() => setShowPasswordModal(false)}
                                aria-label={appT.account.close}
                            >
                                ×
                            </button>
                        </div>
                        <div className="ya-modal__body">
                            <input
                                type="email"
                                name="username"
                                autoComplete="username"
                                value={user?.email || email || ''}
                                readOnly
                                tabIndex={-1}
                                aria-hidden="true"
                                style={{
                                    position: 'absolute',
                                    opacity: 0,
                                    height: 0,
                                    width: 0,
                                    pointerEvents: 'none',
                                }}
                            />
                            {hasPassword ? (
                                <>
                                    <label className="ya-label" htmlFor="ya-pass-current">
                                        {appT.account.currentPassword}
                                    </label>
                                    <PasswordField
                                        id="ya-pass-current"
                                        value={passwordForm.current}
                                        onChange={(e) =>
                                            setPasswordForm((p) => ({ ...p, current: e.target.value }))
                                        }
                                        autoComplete="current-password"
                                        shellClassName="ya-password-shell"
                                        inputClassName="ya-input ya-input--password"
                                        actionClassName="ya-password-action"
                                    />
                                </>
                            ) : null}
                            <label className="ya-label" htmlFor="ya-pass-next">
                                {appT.account.newPassword}
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
                                {appT.account.confirmPassword}
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
                                {appT.common.cancel}
                            </button>
                            <button
                                type="submit"
                                className="ya-btn ya-btn--dark"
                                disabled={passwordSaving}
                            >
                                {passwordSaving ? appT.account.saving : appT.account.savePassword}
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}

            {showTwoFactorModal ? (
                <div className="ya-modal-backdrop" role="presentation">
                    <form
                        className="ya-modal"
                        onSubmit={
                            twoFactorMode === 'enable'
                                ? confirmEnableTwoFactor
                                : confirmDisableTwoFactor
                        }
                    >
                        <div className="ya-modal__head">
                            <h2 className="ya-modal__title">
                                {twoFactorMode === 'enable'
                                    ? appT.account.turnOn2fa
                                    : appT.account.turnOff2fa}
                            </h2>
                            <button
                                type="button"
                                className="ya-modal__close"
                                onClick={() => setShowTwoFactorModal(false)}
                                aria-label={appT.account.close}
                            >
                                ×
                            </button>
                        </div>
                        <div className="ya-modal__body">
                            {twoFactorMode === 'enable' ? (
                                <>
                                    <p className="ya-field-hint">
                                        {appT.account.codeSent(twoFactorEmailHint || user?.email || appT.account.yourLoginEmail)}
                                    </p>
                                    <label className="ya-label" htmlFor="ya-2fa-code">
                                        {appT.account.verificationCode}
                                    </label>
                                    <input
                                        id="ya-2fa-code"
                                        className="ya-input"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        value={twoFactorCode}
                                        onChange={(e) =>
                                            setTwoFactorCode(
                                                e.target.value.replace(/\D/g, '').slice(0, 6),
                                            )
                                        }
                                        placeholder="123456"
                                        required
                                        minLength={6}
                                        maxLength={6}
                                        autoFocus
                                    />
                                </>
                            ) : (
                                <>
                                    <p className="ya-field-hint">
                                        {appT.account.turnOff2faHint}
                                    </p>
                                    {hasPassword ? (
                                        <>
                                            <input
                                                type="email"
                                                name="username"
                                                autoComplete="username"
                                                value={user?.email || email || ''}
                                                readOnly
                                                tabIndex={-1}
                                                aria-hidden="true"
                                                style={{
                                                    position: 'absolute',
                                                    opacity: 0,
                                                    height: 0,
                                                    width: 0,
                                                    pointerEvents: 'none',
                                                }}
                                            />
                                            <label className="ya-label" htmlFor="ya-2fa-password">
                                                {appT.account.currentPassword}
                                            </label>
                                            <PasswordField
                                                id="ya-2fa-password"
                                                value={twoFactorPassword}
                                                onChange={(e) =>
                                                    setTwoFactorPassword(e.target.value)
                                                }
                                                autoComplete="current-password"
                                                shellClassName="ya-password-shell"
                                                inputClassName="ya-input ya-input--password"
                                                actionClassName="ya-password-action"
                                            />
                                        </>
                                    ) : null}
                                </>
                            )}
                            {twoFactorError ? (
                                <p className="ya-error">{twoFactorError}</p>
                            ) : null}
                        </div>
                        <div className="ya-modal__actions">
                            <button
                                type="button"
                                className="ya-btn ya-btn--ghost"
                                onClick={() => setShowTwoFactorModal(false)}
                            >
                                {appT.common.cancel}
                            </button>
                            <button
                                type="submit"
                                className="ya-btn ya-btn--dark"
                                disabled={twoFactorBusy}
                            >
                                {twoFactorBusy
                                    ? appT.account.saving
                                    : twoFactorMode === 'enable'
                                      ? appT.account.enable
                                      : appT.account.turnOff}
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
                                {appT.account.passwordChanged}
                            </h2>
                            <p className="ya-field-hint ya-field-hint--center">
                                {appT.account.passwordChangedHint}
                            </p>
                        </div>
                        <div className="ya-modal__actions ya-modal__actions--center">
                            <button
                                type="button"
                                className="ya-btn ya-btn--dark"
                                onClick={() => setShowPasswordSuccess(false)}
                            >
                                {appT.account.done}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
