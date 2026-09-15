import { useEffect, useRef } from 'react';
import { apiFetch, subscribeSse } from '../../lib/api/client';
import { hydrateAlbumClientFeedback } from './hydrateAlbumClientFeedback';
import { hydrateAlbumPreviewData } from './albumPreviewData';
import { applyRemoteImageReplacements } from './albumImageReplacements';

const DEFAULT_POLL_MS = 6000;
const DEBOUNCE_MS = 280;

/**
 * Keep comments, pins, swaps, audio attachments, and image replacements in sync
 * across client link, photographer preview, and editor — without a full page reload.
 *
 * Uses Workers SSE events, with a visibility-aware poll fallback.
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
                        const data = await apiFetch(`/v1/proofer/studio/albums/${albumId}`).catch(() => null);
                        const preview = data?.album?.preview_data;
                        const parsed = typeof preview === 'string' ? JSON.parse(preview) : preview;
                        if (parsed) {
                            hydrateAlbumPreviewData(albumId, parsed);
                            applyRemoteImageReplacements(albumId, parsed.image_replacements);
                        }
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

        // Workers SSE pushes album events (same debounce as the old realtime channels).
        const unsubscribeSse = subscribeSse(`/v1/proofer/albums/${albumId}/events`, {
            onEvent: (_data, _event, type) => {
                scheduleRefresh({ includePreview: type !== 'feedback-updated' });
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
