import React, { useEffect, useState } from 'react';
import SidebarLayout from '../SidebarLayout';
import SmartAlbumNotifications from './SmartAlbumNotifications';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import { smartAlbumCommentsService } from '../../services/smartAlbumComments.service';
import {
    getAlbumProofStatus,
    mergeAlbumProofTimestamps,
} from './albumProofStatus';
import '../portal/portal.css';
import './SmartAlbumsSidebar.css';

/**
 * Smart Albums / Album Proofer product shell.
 */
const SmartAlbumsSidebarLayout = ({ children }) => {
    const { user } = useAuth();
    const [navCounts, setNavCounts] = useState({ albums: 0, needsYou: 0, approved: 0 });

    useEffect(() => {
        if (!user?.id) {
            setNavCounts({ albums: 0, needsYou: 0, approved: 0 });
            return undefined;
        }

        let cancelled = false;

        const loadCounts = async () => {
            try {
                const data = await smartAlbumsService.getAlbums(user.id);
                const summaries = await smartAlbumCommentsService.getAlbumProofSummaries(
                    data.map((album) => album.id)
                );
                if (cancelled) return;

                let needsYou = 0;
                let approved = 0;
                for (const album of data) {
                    const merged = mergeAlbumProofTimestamps(album, summaries[album.id] || null);
                    const tone = getAlbumProofStatus(merged).tone;
                    if (tone === 'revision') needsYou += 1;
                    if (tone === 'approved') approved += 1;
                }
                setNavCounts({ albums: data.length, needsYou, approved });
            } catch (err) {
                console.error(err);
            }
        };

        void loadCounts();
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    return (
        <SidebarLayout
            productId="smart-albums"
            shellClassName="sa-proofer-shell"
            navCounts={navCounts}
            headerActions={
                <div className="sa-sidebar-actions flex items-center">
                    <SmartAlbumNotifications userId={user?.id} variant="sidebar" />
                </div>
            }
        >
            {children}
        </SidebarLayout>
    );
};

export default SmartAlbumsSidebarLayout;
