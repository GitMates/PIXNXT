import { supabase } from '../lib/supabase/client';
import { getPublicSiteOrigin } from '../lib/publicSiteUrl';
import { getSmartAlbumPreviewShareUrl } from '../lib/shareSmartAlbum';

const DEFAULTS_CACHE_KEY = 'pixnxt_smart_album_proofer_defaults';
const ALBUM_CACHE_KEY = 'pixnxt_smart_album_proofer_album';

export const ALBUM_PROOFER_SETTINGS_CHANGED_EVENT = 'pixnxt-album-proofer-settings-changed';

export function notifyAlbumProoferSettingsChanged(albumId) {
    if (!albumId || typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent(ALBUM_PROOFER_SETTINGS_CHANGED_EVENT, { detail: { albumId } })
    );
}

export const DEFAULT_PROOFER_SETTINGS = {
    accessControl: 'link',
    allowDownloads: true,
    requireApprovalPin: false,
    multiUserCollaboration: true,
    capRevisions: false,
    revisionLimit: 3,
    photographerAlerts: 'digest',
    enableClientNudges: true,
    nudgeDays: 5,
    statusChangeEmails: true,
    clientReminderTemplate:
        'Hi {{client_name}},\n\nJust a friendly reminder that your album {{album_name}} is awaiting your feedback.\n\nAccess your album here: {{album_link}}\n\nWe\'re excited to hear your thoughts!\n\nBest regards,\nYour Photography Team',
    revisionRequestedTemplate:
        'Hi {{client_name}},\n\nThank you for your feedback on {{album_name}}! Based on your input, we\'ve prepared some revisions for your review.\n\nView the updated album: {{view_album_link}}\n\nPlease let us know if these changes work better for you.\n\nBest regards',
    approvedTemplate:
        'Hi {{client_name}},\n\nWonderful news! Your album {{album_name}} has been approved and is ready for final delivery.\n\nThank you for your collaboration throughout this process!\n\nBest regards',
};

export const DEFAULT_ALBUM_PROOFER_SETTINGS = {
    accessLevel: 'password',
    albumPassword: '',
    privateShareToken: '',
    requireNameForComments: false,
    maxFreeSwaps: 5,
    allowExternalUploads: false,
    maxRevisionRounds: 3,
    approvalPin: '',
    sendReminderEmails: false,
};

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function writeJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* ignore */
    }
}

function mergeSettings(base, patch) {
    return { ...base, ...(patch || {}) };
}

function isMissingTableError(error) {
    const msg = String(error?.message || '').toLowerCase();
    return (
        error?.code === '42P01' ||
        error?.code === 'PGRST205' ||
        msg.includes('does not exist') ||
        msg.includes('proofer_settings')
    );
}

function randomToken() {
    const part = () => Math.random().toString(36).substring(2, 7);
    return `${part()}_${part()}_${part()}`;
}

function randomPin() {
    return Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
}

function privacyFromAccessControl(accessControl) {
    if (accessControl === 'password') return 'password';
    if (accessControl === 'restricted') return 'restricted';
    return 'public';
}

function accessControlFromPrivacy(privacyLevel) {
    if (privacyLevel === 'password') return 'password';
    if (privacyLevel === 'restricted' || privacyLevel === 'private') return 'restricted';
    return 'link';
}

function accessLevelFromLegacy(privacyLevel) {
    if (privacyLevel === 'restricted') return 'private';
    if (privacyLevel === 'password') return 'password';
    return 'public';
}

function dbAlbumToSettings(row = {}) {
    const raw = row.proofer_settings && typeof row.proofer_settings === 'object'
        ? row.proofer_settings
        : {};
    return mergeSettings(DEFAULT_ALBUM_PROOFER_SETTINGS, {
        accessLevel: raw.access_level ?? raw.accessLevel ?? DEFAULT_ALBUM_PROOFER_SETTINGS.accessLevel,
        albumPassword: raw.album_password ?? raw.albumPassword ?? '',
        privateShareToken: raw.private_share_token ?? raw.privateShareToken ?? '',
        requireNameForComments:
            raw.require_name_for_comments ?? raw.requireNameForComments ?? false,
        maxFreeSwaps: Number(raw.max_free_swaps ?? raw.maxFreeSwaps ?? 5) || 0,
        allowExternalUploads:
            raw.allow_external_uploads ?? raw.allowExternalUploads ?? false,
        maxRevisionRounds:
            Number(raw.max_revision_rounds ?? raw.maxRevisionRounds ?? 3) || 1,
        approvalPin: String(raw.approval_pin ?? raw.approvalPin ?? ''),
        sendReminderEmails: raw.send_reminder_emails ?? raw.sendReminderEmails ?? false,
    });
}

function settingsToDbFull(settings) {
    return {
        access_level: settings.accessLevel || 'password',
        album_password: settings.albumPassword || '',
        private_share_token: settings.privateShareToken || '',
        require_name_for_comments: Boolean(settings.requireNameForComments),
        max_free_swaps: Number(settings.maxFreeSwaps) || 0,
        allow_external_uploads: Boolean(settings.allowExternalUploads),
        max_revision_rounds: Number(settings.maxRevisionRounds) || 1,
        approval_pin: settings.approvalPin || '',
        send_reminder_emails: Boolean(settings.sendReminderEmails),
    };
}

function settingsToDb(patch) {
    const out = {};
    if (patch.accessLevel !== undefined) out.access_level = patch.accessLevel;
    if (patch.albumPassword !== undefined) out.album_password = patch.albumPassword;
    if (patch.privateShareToken !== undefined) out.private_share_token = patch.privateShareToken;
    if (patch.requireNameForComments !== undefined) {
        out.require_name_for_comments = patch.requireNameForComments;
    }
    if (patch.maxFreeSwaps !== undefined) out.max_free_swaps = patch.maxFreeSwaps;
    if (patch.allowExternalUploads !== undefined) {
        out.allow_external_uploads = patch.allowExternalUploads;
    }
    if (patch.maxRevisionRounds !== undefined) out.max_revision_rounds = patch.maxRevisionRounds;
    if (patch.approvalPin !== undefined) out.approval_pin = patch.approvalPin;
    if (patch.sendReminderEmails !== undefined) out.send_reminder_emails = patch.sendReminderEmails;
    return out;
}

function cachePhotographerDefaults(photographerId, settings) {
    const all = readJson(DEFAULTS_CACHE_KEY, {});
    all[photographerId] = settings;
    writeJson(DEFAULTS_CACHE_KEY, all);
}

function cacheAlbumSettings(photographerId, albumId, settings) {
    const all = readJson(ALBUM_CACHE_KEY, {});
    const userMap = all[photographerId] || {};
    userMap[albumId] = settings;
    all[photographerId] = userMap;
    writeJson(ALBUM_CACHE_KEY, all);
}

function readCachedPhotographerDefaults(photographerId) {
    const all = readJson(DEFAULTS_CACHE_KEY, {});
    return mergeSettings(DEFAULT_PROOFER_SETTINGS, all[photographerId]);
}

function readCachedAlbumSettings(photographerId, albumId) {
    const all = readJson(ALBUM_CACHE_KEY, {});
    return mergeSettings(DEFAULT_ALBUM_PROOFER_SETTINGS, all[photographerId]?.[albumId]);
}

function hasCachedAlbumSettings(photographerId, albumId) {
    const all = readJson(ALBUM_CACHE_KEY, {});
    return Boolean(all[photographerId]?.[albumId]);
}

export function getAlbumShareDisplayUrl(album, settings) {
    const origin = getPublicSiteOrigin();
    const host = origin.replace(/^https?:\/\//, '');
    const slug = album?.slug || album?.id || '';

    if (settings?.accessLevel === 'private') {
        const token = settings.privateShareToken || album?.id || '';
        return `${host}/album-preview/${encodeURIComponent(album?.id || '')}?token=${token}`;
    }

    return `${host}/album-preview/${encodeURIComponent(slug || album?.id || '')}`;
}

export function getAlbumShareCopyUrl(album, settings) {
    if (settings?.accessLevel === 'private') {
        const token = settings.privateShareToken || album?.id || '';
        const origin = getPublicSiteOrigin();
        return `${origin}/album-preview/${encodeURIComponent(album?.id || '')}?token=${token}`;
    }
    return getSmartAlbumPreviewShareUrl(album);
}

export const smartAlbumProoferSettingsService = {
    getPhotographerDefaults(photographerId) {
        return readCachedPhotographerDefaults(photographerId);
    },

    async loadPhotographerDefaults(photographerId) {
        if (!photographerId) return { ...DEFAULT_PROOFER_SETTINGS };

        try {
            const { data, error } = await supabase
                .from('smart_album_proofer_settings')
                .select('settings')
                .eq('photographer_id', photographerId)
                .maybeSingle();

            if (error && !isMissingTableError(error)) throw error;

            const merged = mergeSettings(
                DEFAULT_PROOFER_SETTINGS,
                data?.settings || readCachedPhotographerDefaults(photographerId)
            );
            cachePhotographerDefaults(photographerId, merged);
            return merged;
        } catch (err) {
            console.warn('loadPhotographerDefaults:', err?.message || err);
            return readCachedPhotographerDefaults(photographerId);
        }
    },

    async savePhotographerDefaults(photographerId, patch) {
        if (!photographerId) return { ...DEFAULT_PROOFER_SETTINGS };

        const current = await this.loadPhotographerDefaults(photographerId);
        const next = mergeSettings(current, patch);
        cachePhotographerDefaults(photographerId, next);

        try {
            const now = new Date().toISOString();
            const { error } = await supabase.from('smart_album_proofer_settings').upsert(
                {
                    photographer_id: photographerId,
                    settings: next,
                    updated_at: now,
                },
                { onConflict: 'photographer_id' }
            );
            if (error && !isMissingTableError(error)) throw error;
        } catch (err) {
            console.warn('savePhotographerDefaults:', err?.message || err);
        }

        return next;
    },

    updatePhotographerDefaults(photographerId, patch) {
        const next = mergeSettings(readCachedPhotographerDefaults(photographerId), patch);
        cachePhotographerDefaults(photographerId, next);
        void this.savePhotographerDefaults(photographerId, patch);
        return next;
    },

    parseAlbumProoferSettings(album) {
        return dbAlbumToSettings(album || {});
    },

    async loadAlbumSettings(photographerId, albumId, album = null) {
        if (!photographerId || !albumId) {
            return { ...DEFAULT_ALBUM_PROOFER_SETTINGS };
        }

        let row = album;
        if (!row?.proofer_settings) {
            try {
                const { data, error } = await supabase
                    .from('smart_albums')
                    .select('proofer_settings, slug')
                    .eq('photographer_id', photographerId)
                    .eq('id', albumId)
                    .maybeSingle();
                if (!error && data) row = { ...album, ...data };
            } catch {
                /* use cache */
            }
        }

        const parsed = dbAlbumToSettings(row);
        if (!parsed.approvalPin) {
            parsed.approvalPin = randomPin();
        }
        if (parsed.accessLevel === 'private' && !parsed.privateShareToken) {
            parsed.privateShareToken = randomToken();
        }

        cacheAlbumSettings(photographerId, albumId, parsed);
        return parsed;
    },

    async saveAlbumSettings(photographerId, albumId, patch, { album = null, clientPatch = {} } = {}) {
        if (!photographerId || !albumId) return null;

        const current = await this.loadAlbumSettings(photographerId, albumId, album);
        const next = mergeSettings(current, patch);
        cacheAlbumSettings(photographerId, albumId, next);

        const proofer_settings = settingsToDbFull(next);

        const payload = {
            proofer_settings,
            updated_at: new Date().toISOString(),
            ...clientPatch,
        };

        try {
            const { data, error } = await supabase
                .from('smart_albums')
                .update(payload)
                .eq('photographer_id', photographerId)
                .eq('id', albumId)
                .select('*')
                .maybeSingle();

            if (error && !isMissingTableError(error)) throw error;
            notifyAlbumProoferSettingsChanged(albumId);
            return data;
        } catch (err) {
            console.warn('saveAlbumSettings:', err?.message || err);
            notifyAlbumProoferSettingsChanged(albumId);
            return null;
        }
    },

    getAlbumAccess(photographerId, albumId) {
        return readCachedAlbumSettings(photographerId, albumId);
    },

    updateAlbumAccess(photographerId, albumId, patch) {
        const next = mergeSettings(readCachedAlbumSettings(photographerId, albumId), patch);
        cacheAlbumSettings(photographerId, albumId, next);
        void this.saveAlbumSettings(photographerId, albumId, patch);
        return next;
    },

    getEffectiveAlbumAccess(photographerId, albumId, album = null, previewData = null) {
        const fromSnapshot = previewData?.proofer_access;
        const snapshotParsed = fromSnapshot
            ? mergeSettings(DEFAULT_ALBUM_PROOFER_SETTINGS, {
                  accessLevel: accessLevelFromLegacy(fromSnapshot.privacyLevel),
                  albumPassword: fromSnapshot.accessPassword || '',
                  privateShareToken: fromSnapshot.privateShareToken || '',
                  approvalPin: fromSnapshot.approvalPin || '',
                  requireNameForComments: fromSnapshot.requireNameForComments ?? false,
                  maxFreeSwaps: fromSnapshot.maxFreeSwaps ?? 5,
                  allowExternalUploads: fromSnapshot.allowExternalUploads ?? false,
                  maxRevisionRounds: fromSnapshot.maxRevisionRounds ?? 3,
                  sendReminderEmails: fromSnapshot.sendReminderEmails ?? false,
              })
            : null;

        const hasRowSettings =
            album?.proofer_settings &&
            typeof album.proofer_settings === 'object' &&
            Object.keys(album.proofer_settings).length > 0;

        let parsed;
        if (hasRowSettings) {
            parsed = dbAlbumToSettings(album);
        } else if (photographerId && albumId && hasCachedAlbumSettings(photographerId, albumId)) {
            parsed = readCachedAlbumSettings(photographerId, albumId);
        } else if (snapshotParsed) {
            parsed = snapshotParsed;
        } else if (album) {
            parsed = dbAlbumToSettings(album);
        } else {
            parsed = { ...DEFAULT_ALBUM_PROOFER_SETTINGS };
        }

        const defaults = readCachedPhotographerDefaults(photographerId);

        return {
            privacyLevel:
                parsed.accessLevel === 'private'
                    ? 'restricted'
                    : parsed.accessLevel === 'password'
                      ? 'password'
                      : 'public',
            accessLevel: parsed.accessLevel,
            accessPassword: parsed.albumPassword || '',
            privateShareToken: parsed.privateShareToken || '',
            whitelistedEmails: [],
            allowDownloads: defaults.allowDownloads,
            allowMultiUserCollab: defaults.multiUserCollaboration,
            requireDigitalVerification:
                Boolean(parsed.approvalPin) || defaults.requireApprovalPin,
            approvalPin: parsed.approvalPin || '',
            requireNameForComments: parsed.requireNameForComments,
            maxFreeSwaps: parsed.maxFreeSwaps,
            allowExternalUploads: parsed.allowExternalUploads,
            maxRevisionRounds: parsed.maxRevisionRounds,
            sendReminderEmails: parsed.sendReminderEmails,
            commentsEnabled: album?.comments_enabled !== false,
            swapsEnabled: album?.messages_enabled !== false,
            shareLinkEnabled: album?.share_link_enabled !== false,
            repliesEnabled: album?.replies_enabled !== false,
        };
    },

    applyDefaultsToNewAlbum(photographerId, albumId) {
        const defaults = readCachedPhotographerDefaults(photographerId);
        const accessLevel = privacyFromAccessControl(defaults.accessControl);
        const mapped =
            accessLevel === 'restricted'
                ? 'private'
                : accessLevel === 'password'
                  ? 'password'
                  : 'public';

        const patch = {
            accessLevel: mapped,
            approvalPin: defaults.requireApprovalPin ? randomPin() : '',
            privateShareToken: mapped === 'private' ? randomToken() : '',
            maxRevisionRounds: defaults.capRevisions ? defaults.revisionLimit : 3,
            sendReminderEmails: defaults.enableClientNudges,
        };

        cacheAlbumSettings(photographerId, albumId, mergeSettings(DEFAULT_ALBUM_PROOFER_SETTINGS, patch));
        void this.saveAlbumSettings(photographerId, albumId, patch);
        return patch;
    },

    serializeAccessForPreview(photographerId, albumId, album = null) {
        const effective = this.getEffectiveAlbumAccess(
            photographerId,
            albumId,
            album,
            album?.preview_data
        );
        return {
            privacyLevel: effective.privacyLevel,
            accessLevel: effective.accessLevel,
            accessPassword: effective.accessPassword || '',
            privateShareToken: effective.privateShareToken || '',
            whitelistedEmails: effective.whitelistedEmails || [],
            allowDownloads: effective.allowDownloads,
            allowMultiUserCollab: effective.allowMultiUserCollab,
            requireDigitalVerification: effective.requireDigitalVerification,
            approvalPin: effective.approvalPin || '',
            requireNameForComments: effective.requireNameForComments,
            maxFreeSwaps: effective.maxFreeSwaps,
            allowExternalUploads: effective.allowExternalUploads,
            maxRevisionRounds: effective.maxRevisionRounds,
            sendReminderEmails: effective.sendReminderEmails,
            commentsEnabled: effective.commentsEnabled,
            swapsEnabled: effective.swapsEnabled,
            shareLinkEnabled: effective.shareLinkEnabled,
        };
    },

    accessControlFromPrivacy,
    privacyFromAccessControl,
    randomPin,
    randomToken,
};
