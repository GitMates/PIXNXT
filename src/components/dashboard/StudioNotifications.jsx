import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  buildStudioNotificationUrl,
  clearAllStudioNotifications,
  groupStudioNotificationSections,
  listStudioNotifications,
  markAllStudioNotificationsRead,
  STUDIO_NOTIFICATION_REFRESH_EVENTS,
} from '../../services/studioNotifications';
import './StudioNotifications.css';

const PANEL_WIDTH = 360;
const PANEL_GAP = 10;
const VIEWPORT_PAD = 12;

function clampPanelPosition(triggerRect) {
  let left = triggerRect.right - PANEL_WIDTH;
  const top = triggerRect.bottom + PANEL_GAP;
  const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD;
  if (left > maxLeft) left = maxLeft;
  if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
  return { top, left };
}

export default function StudioNotifications({ userId, variant = 'default' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [footer, setFooter] = useState('');
  const [albums, setAlbums] = useState([]);
  const [clientGalleryItems, setClientGalleryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [panelPos, setPanelPos] = useState(null);
  const rootRef = useRef(null);

  const unreadCount = useMemo(() => items.filter((item) => item.isUnread).length, [items]);

  const sections = useMemo(
    () => groupStudioNotificationSections(items),
    [items],
  );

  const hasNotifications = sections.some((section) => section.items.length > 0);

  const notificationState = useMemo(
    () => ({ items, albums, clientGalleryItems }),
    [items, albums, clientGalleryItems],
  );

  const updatePanelPosition = useCallback(() => {
    if (!rootRef.current) return;
    setPanelPos(clampPanelPosition(rootRef.current.getBoundingClientRect()));
  }, []);

  const refreshItems = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setFooter('');
      setAlbums([]);
      setClientGalleryItems([]);
      return;
    }

    setLoading(true);
    try {
      const next = await listStudioNotifications(userId);
      setItems(next.items || []);
      setFooter(next.footer || '');
      setAlbums(next.albums || []);
      setClientGalleryItems(next.clientGalleryItems || []);
    } catch {
      setItems([]);
      setFooter('');
      setAlbums([]);
      setClientGalleryItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setFooter('');
      setAlbums([]);
      setClientGalleryItems([]);
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
    STUDIO_NOTIFICATION_REFRESH_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, onRefresh);
    });
    return () => {
      STUDIO_NOTIFICATION_REFRESH_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, onRefresh);
      });
    };
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
      const panel = document.getElementById('sd-notifications-panel');
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
    navigate(buildStudioNotificationUrl(item, albums));
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    await markAllStudioNotificationsRead(notificationState);
    setItems((prev) => prev.map((row) => ({ ...row, isUnread: false })));
  };

  const handleClearAll = async (e) => {
    e.stopPropagation();
    await clearAllStudioNotifications(notificationState);
    setItems([]);
    setOpen(false);
  };

  const isSidebar = variant === 'sidebar';

  return (
    <div className={`sd-notifications${isSidebar ? ' sd-notifications--sidebar' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={
          isSidebar
            ? `sd-notifications-trigger sd-notifications-trigger--sidebar neu-circle${open ? ' is-open' : ''}`
            : `sd-icon-btn${open ? ' is-open' : ''}`
        }
        onClick={handleToggle}
        title="Notifications"
        aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <svg
          width={isSidebar ? 16 : 18}
          height={isSidebar ? 16 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span
            className={
              isSidebar
                ? 'sd-notifications-badge sd-notifications-badge--dot'
                : 'sd-icon-btn-dot'
            }
            aria-hidden
          />
        ) : null}
      </button>

      {open && panelPos
        ? createPortal(
            <div
              id="sd-notifications-panel"
              className="sd-notifications-panel"
              role="menu"
              style={{ top: panelPos.top, left: panelPos.left }}
            >
              <div className="sd-notifications-header">
                <span className="sd-notifications-title">Notifications</span>
                <div className="sd-notifications-header-actions">
                  {unreadCount > 0 ? (
                    <span className="sd-notifications-new-count">
                      {unreadCount} new
                    </span>
                  ) : null}
                  {items.length > 0 ? (
                    <button
                      type="button"
                      className="sd-notifications-clear-btn"
                      onClick={handleClearAll}
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>
              </div>

              {unreadCount > 0 && hasNotifications ? (
                <div className="sd-notifications-toolbar">
                  <button
                    type="button"
                    className="sd-notifications-mark-read-btn"
                    onClick={handleMarkAllRead}
                  >
                    Mark all as read
                  </button>
                </div>
              ) : null}

              {loading && !hasNotifications ? (
                <div className="sd-notifications-empty">Loading…</div>
              ) : !hasNotifications ? (
                <div className="sd-notifications-empty">Nothing needs you right now</div>
              ) : (
                <>
                  <div className="sd-notifications-body">
                    {sections.map((section) => (
                      <section key={section.id} className="sd-notifications-group">
                        <p className="sd-notifications-kicker">{section.label}</p>
                        <ul className="sd-notifications-list">
                          {section.items.map((item) => (
                            <li key={item.id} className="sd-notifications-row">
                              <button
                                type="button"
                                className="sd-notifications-item"
                                role="menuitem"
                                onClick={() => handleSelect(item)}
                              >
                                <span
                                  className={`sd-notifications-dot sd-notifications-dot--${item.tone || 'ok'}`}
                                  aria-hidden
                                />
                                <span className="sd-notifications-copy">
                                  <span className="sd-notifications-item-title">{item.title}</span>
                                  <span className="sd-notifications-item-preview">{item.subtitle}</span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                  {footer ? <p className="sd-notifications-footer">{footer}</p> : null}
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
