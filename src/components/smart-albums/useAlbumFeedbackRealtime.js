import { useEffect, useRef } from 'react';
import { apiFetch, subscribeSse } from '../../lib/api/client';
import { hydrateAlbumClientFeedback } from './hydrateAlbumClientFeedback';
import { hydrateAlbumPreviewData } from './albumPreviewData';
import { applyRemoteImageReplacements } from './albumImageReplacements';
import { overwriteLocalPagesFromRemote } from './albumPagePhotos';
import { overwriteLocalCollectionFromRemote } from './albumCollection';

const DEFAULT_POLL_MS = 6000;
const DEBOUNCE_MS = 280;

/** Dispatched after client/public preview overwrites local pages from cloud. */
export const ALBUM_PAGES_REMOTE_SYNCED_EVENT = 'pixnxt-album-pages-remote-synced';

/**
 * Keep comments, pins, swaps, audio attachments, and image replacements in sync
 * across client link, photographer preview, and editor — without a full page reload.
 *
 * Uses Workers SSE events, with a visibility-aware poll fallback.
 *
 * For client/public viewers (custom-domain share), also overwrites local page +
 * collection caches from the cloud snapshot so a "New version" upload drops
 * stale page keys immediately (not only after a hard reload).
 */
export function useAlbumFeedbackRealtime(
    albumId,
    {
        viewerRole = 'photographer',
        viewerKey = 'default',
        enabled = true,
        pollMs = DEFAULT_POLL_MS,
    } = {}
) {
    const viewerRef = useRef({ viewerRole, viewerKey });
    viewerRef.current = { viewerRole, viewerKey };

    useEffect(() => {
        if (!enabled || !albumId) return undefined;

        let cancelled = false;
        let debounceTimer = null;
        let inFlight = null;
        let lastRefreshAt = 0;

        const applyPreviewSnapshot = (parsed, role) => {
            if (!parsed) return;
            hydrateAlbumPreviewData(albumId, parsed);
            applyRemoteImageReplacements(albumId, parsed.image_replacements);

            // Client / share viewers have no local edits — cloud is source of truth.
            // Editor and photographer in-app preview must keep local placements.
            if (role === 'client') {
                overwriteLocalCollectionFromRemote(albumId);
                overwriteLocalPagesFromRemote(albumId);
                try {
                    window.dispatchEvent(
                        new CustomEvent(ALBUM_PAGES_REMOTE_SYNCED_EVENT, {
                            detail: { albumId },
                        })
                    );
                } catch {
                    /* ignore */
                }
            }
        };

        const fetchPreviewData = async (role) => {
            if (role === 'client') {
                // Prefer public endpoint (works anonymous on custom domains).
                const publicData = await apiFetch(
                    `/v1/proofer/public/${encodeURIComponent(albumId)}`,
                    { auth: false }
                ).catch(() => null);
                const preview = publicData?.album?.preview_data;
                if (preview != null) {
                    return typeof preview === 'string' ? JSON.parse(preview) : preview;
                }
            }
            const data = await apiFetch(`/v1/proofer/studio/albums/${albumId}`).catch(() => null);
            const preview = data?.album?.preview_data;
            if (preview == null) return null;
            return typeof preview === 'string' ? JSON.parse(preview) : preview;
        };

        const refreshFeedback = async ({ includePreview = false } = {}) => {
            if (cancelled) return;
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                return;
            }

            const run = async () => {
                const { viewerRole: role, viewerKey: key } = viewerRef.current;
                await hydrateAlbumClientFeedback(albumId, {
                    viewerRole: role,
                    viewerKey: key,
                });

                if (includePreview) {
                    try {
                        const parsed = await fetchPreviewData(role);
                        applyPreviewSnapshot(parsed, role);
                    } catch (err) {
                        console.warn('album feedback preview refresh:', err);
                    }
                }
                lastRefreshAt = Date.now();
            };

            if (inFlight) {
                try {
                    await inFlight;
                } catch {
                    /* ignore prior failure */
                }
            }
            inFlight = run();
            try {
                await inFlight;
            } finally {
                inFlight = null;
            }
        };

        const scheduleRefresh = (opts) => {
            if (cancelled) return;
            if (debounceTimer) window.clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                debounceTimer = null;
                void refreshFeedback(opts);
            }, DEBOUNCE_MS);
        };

        // Initial sync in case another tab posted while this view was mounting.
        void refreshFeedback({ includePreview: true });

        // Backend currently emits feedback-updated for album fingerprint changes
        // too — always pull preview so "New version" page keys sync live.
        const unsubscribeSse = subscribeSse(`/v1/proofer/albums/${albumId}/events`, {
            onEvent: () => {
                scheduleRefresh({ includePreview: true });
            },
        });

        const pollId = window.setInterval(() => {
            if (Date.now() - lastRefreshAt < Math.max(2000, pollMs / 2)) return;
            void refreshFeedback({ includePreview: true });
        }, pollMs);

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                void refreshFeedback({ includePreview: true });
            }
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            cancelled = true;
            if (debounceTimer) window.clearTimeout(debounceTimer);
            window.clearInterval(pollId);
            document.removeEventListener('visibilitychange', onVisible);
            unsubscribeSse();
        };
    }, [albumId, enabled, pollMs]);
}
