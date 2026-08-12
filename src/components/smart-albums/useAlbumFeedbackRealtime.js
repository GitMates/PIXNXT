import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase/client';
import { hydrateAlbumClientFeedback } from './hydrateAlbumClientFeedback';
import { hydrateAlbumPreviewData } from './albumPreviewData';
import { applyRemoteImageReplacements } from './albumImageReplacements';

const FEEDBACK_TABLES = [
    'album_proofer_comments',
    'album_proofer_photo_pins',
    'album_proofer_swap_marks',
    'album_proofer_proof_replies',
];

const DEFAULT_POLL_MS = 6000;
const DEBOUNCE_MS = 280;

/**
 * Keep comments, pins, swaps, audio attachments, and image replacements in sync
 * across client link, photographer preview, and editor — without a full page reload.
 *
 * Uses Supabase Realtime when available, with a visibility-aware poll fallback.
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
                        const { data, error } = await supabase
                            .from('album_proofer_albums')
                            .select('preview_data')
                            .eq('id', albumId)
                            .maybeSingle();
                        if (!error && data?.preview_data) {
                            hydrateAlbumPreviewData(albumId, data.preview_data);
                            applyRemoteImageReplacements(
                                albumId,
                                data.preview_data.image_replacements
                            );
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

        let channel = supabase.channel(`album-feedback:${albumId}`);
        FEEDBACK_TABLES.forEach((table) => {
            channel = channel.on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table,
                    filter: `album_id=eq.${albumId}`,
                },
                () => scheduleRefresh({ includePreview: false })
            );
        });
        channel = channel.on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'album_proofer_albums',
                filter: `id=eq.${albumId}`,
            },
            () => scheduleRefresh({ includePreview: true })
        );
        channel.subscribe();

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
            void supabase.removeChannel(channel);
        };
    }, [albumId, enabled, pollMs]);
}
