import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import SidebarLayout from '../SidebarLayout';
import SmartAlbumNotifications from './SmartAlbumNotifications';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import {
    smartAlbumCommentsService,
    COMMENTS_CHANGED_EVENT,
} from '../../services/smartAlbumComments.service';
import {
    ALBUM_PROOF_STATUS_CHANGED_EVENT,
    getAlbumProofStatus,
    mergeAlbumProofTimestamps,
} from './albumProofStatus';
import { readAlbumsListCache } from '../../lib/albumsListCache';
import '../portal/portal.css';
import './SmartAlbumsSidebar.css';

function isNeedsYouTone(tone) {
    return tone === 'awaiting' || tone === 'feedback' || tone === 'revision';
}

function countsFromAlbums(albums, summaries) {
    let needsYou = 0;
    let approved = 0;
    for (const album of albums || []) {
        const merged = mergeAlbumProofTimestamps(album, summaries?.[album.id] || null);
        const tone = getAlbumProofStatus(merged).tone;
        if (isNeedsYouTone(tone)) needsYou += 1;
        if (tone === 'approved') approved += 1;
    }
    return { albums: (albums || []).length, needsYou, approved };
}

/**
 * Album Proofer product shell.
 */
const SmartAlbumsSidebarLayout = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();
    const [navCounts, setNavCounts] = useState({ albums: 0, needsYou: 0, approved: 0 });

    const loadCounts = useCallback(async () => {
        if (!user?.id) {
            setNavCounts({ albums: 0, needsYou: 0, approved: 0 });
            return;
        }

        try {
            const data = await smartAlbumsService.getAlbums(user.id);
            const summaries = await smartAlbumCommentsService.getAlbumProofSummaries(
                data.map((album) => album.id)
            );
            setNavCounts(countsFromAlbums(data, summaries));
        } catch (err) {
            console.error(err);
        }
    }, [user?.id]);

    useLayoutEffect(() => {
        if (!user?.id) return;
        const cached = readAlbumsListCache(user.id);
        if (cached?.albums) {
            setNavCounts(countsFromAlbums(cached.albums, cached.proofSummaries));
        }
    }, [user?.id]);

    useEffect(() => {
        void loadCounts();
    }, [loadCounts, location.pathname]);

    useEffect(() => {
        if (!user?.id) return undefined;

        const refresh = () => {
            void loadCounts();
        };

        window.addEventListener(COMMENTS_CHANGED_EVENT, refresh);
        window.addEventListener(ALBUM_PROOF_STATUS_CHANGED_EVENT, refresh);
        window.addEventListener('focus', refresh);
        const onVisibility = () => {
            if (document.visibilityState === 'visible') refresh();
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            window.removeEventListener(COMMENTS_CHANGED_EVENT, refresh);
            window.removeEventListener(ALBUM_PROOF_STATUS_CHANGED_EVENT, refresh);
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [user?.id, loadCounts]);

    return (
        <SidebarLayout
            productId="album-proofer"
            shellClassName="sa-proofer-shell"
            navCounts={navCounts}
            headerActions={
                <SmartAlbumNotifications userId={user?.id} variant="sidebar" />
            }
        >
            {children}
        </SidebarLayout>
    );
};

export default SmartAlbumsSidebarLayout;
