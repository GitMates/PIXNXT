import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  buildClientGalleryNotificationUrl,
  clearAllClientGalleryNotifications,
  dismissClientGalleryNotification,
  getClientGalleryNotificationTypeLabel,
  listClientGalleryNotifications,
  markAllClientGalleryNotificationsRead,
  CG_NOTIFICATIONS_CHANGED_EVENT,
} from '../../../services/clientGalleryNotifications';
import './ClientGalleryNotifications.css';

const PANEL_WIDTH = 340;
const PANEL_GAP = 10;
const VIEWPORT_PAD = 12;

function clampPanelPosition(triggerRect) {
  let left = triggerRect.left;
  const top = triggerRect.bottom + PANEL_GAP;
  const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD;
  if (left > maxLeft) left = maxLeft;
  if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
  return { top, left };
}

export default function ClientGalleryNotifications({ userId, variant = 'default' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [panelPos, setPanelPos] = useState(null);
  const rootRef = useRef(null);

  const unreadCount = useMemo(() => items.filter((item) => item.isUnread).length, [items]);
  const isSidebar = variant === 'sidebar';

  const updatePanelPosition = useCallback(() => {
    if (!rootRef.current) return;
    setPanelPos(clampPanelPosition(rootRef.current.getBoundingClientRect()));
  }, []);

  const refreshItems = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const next = await listClientGalleryNotifications(userId);
      setItems(next);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      if (!cancelled) await refreshItems();
    })();

    const pollId = window.setInterval(() => {
      if (!cancelled) refreshItems();
    }, 45000);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [userId, refreshItems]);

  useEffect(() => {
    const onRefresh = () => refreshItems();
    window.addEventListener(CG_NOTIFICATIONS_CHANGED_EVENT, onRefresh);
    return () => window.removeEventListener(CG_NOTIFICATIONS_CHANGED_EVENT, onRefresh);
  }, [refreshItems]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return undefined;
    }
    updatePanelPosition();
    const onLayoutChange = () => updatePanelPosition();
    window.addEventListener('resize', onLayoutChange);
    window.addEventListener('scroll', onLayoutChange, true);
    return () => {
      window.removeEventListener('resize', onLayoutChange);
      window.removeEventListener('scroll', onLayoutChange, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    const onDocClick = (e) => {
      const panel = document.getElementById('cg-notifications-panel');
      if (rootRef.current?.contains(e.target)) return;
      if (panel?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) await refreshItems();
  };

  const handleSelect = (item) => {
    setOpen(false);
    navigate(buildClientGalleryNotificationUrl(item));
  };

  const handleDismiss = (e, item) => {
    e.stopPropagation();
    dismissClientGalleryNotification(item.id);
    setItems((prev) => prev.filter((row) => row.id !== item.id));
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    markAllClientGalleryNotificationsRead(items);
    setItems((prev) => prev.map((row) => ({ ...row, isUnread: false })));
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    clearAllClientGalleryNotifications(items);
    setItems([]);
    setOpen(false);
  };

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div className="cg-notifications" ref={rootRef}>
      <button
        type="button"
        className={`cg-notifications-trigger${isSidebar ? ' cg-notifications-trigger--sidebar neu-circle' : ''}`}
        onClick={handleToggle}
        aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width={isSidebar ? 16 : 18} height={isSidebar ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className={`cg-notifications-badge${isSidebar ? ' cg-notifications-badge--dot' : ''}`}
          >
            {isSidebar ? '' : badgeLabel}
          </span>
        )}
      </button>

      {open &&
        panelPos &&
        createPortal(
          <div
            id="cg-notifications-panel"
            className="cg-notifications-panel"
            role="menu"
            style={{ top: panelPos.top, left: panelPos.left }}
          >
            <div className="cg-notifications-panel-header">
              <span>Activities</span>
              <div className="cg-notifications-panel-actions">
                {unreadCount > 0 && (
                  <span className="cg-notifications-panel-count">{unreadCount} new</span>
                )}
                {items.length > 0 && (
                  <button type="button" className="cg-notifications-clear-btn" onClick={handleClearAll}>
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {unreadCount > 0 && items.length > 0 && (
              <div className="cg-notifications-toolbar">
                <button type="button" className="cg-notifications-mark-read-btn" onClick={handleMarkAllRead}>
                  Mark all as read
                </button>
              </div>
            )}

            {loading && !items.length ? (
              <div className="cg-notifications-empty">Loading…</div>
            ) : items.length === 0 ? (
              <div className="cg-notifications-empty">No activity yet</div>
            ) : (
              <ul className="cg-notifications-list">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={`cg-notifications-row${item.isUnread ? ' cg-notifications-row--unread' : ' cg-notifications-row--read'}`}
                  >
                    <button
                      type="button"
                      className="cg-notifications-item"
                      role="menuitem"
                      onClick={() => handleSelect(item)}
                    >
                      <span className="cg-notifications-item-top">
                        <span className="cg-notifications-item-type">
                          {item.isUnread && <span className="cg-notifications-unread-dot" aria-hidden />}
                          {getClientGalleryNotificationTypeLabel(item.type)}
                        </span>
                        <span className="cg-notifications-item-time">{item.timeLabel}</span>
                      </span>
                      <span className="cg-notifications-item-album">{item.collectionName}</span>
                      <span className="cg-notifications-item-preview">{item.preview}</span>
                    </button>
                    <button
                      type="button"
                      className="cg-notifications-dismiss"
                      aria-label="Dismiss notification"
                      onClick={(e) => handleDismiss(e, item)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
