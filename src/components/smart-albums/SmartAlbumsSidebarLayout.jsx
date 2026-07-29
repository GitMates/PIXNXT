import React from 'react';
import SidebarLayout from '../SidebarLayout';
import SmartAlbumNotifications from './SmartAlbumNotifications';
import { useAuth } from '../../hooks/useAuth';
import '../portal/portal.css';
import './SmartAlbumsSidebar.css';

/**
 * Smart Albums product shell — uses the shared Client Gallery sidebar chrome.
 */
const SmartAlbumsSidebarLayout = ({ children }) => {
    const { user } = useAuth();

    return (
        <SidebarLayout
            productId="smart-albums"
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
