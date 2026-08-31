import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AppSpinner } from '../../../components/ui/AppLoading';
import {
  buildClientGalleryNotificationUrl,
  listClientGalleryNotifications,
  CG_NOTIFICATIONS_CHANGED_EVENT,
  CG_NOTIFICATION_SECTIONS,
} from '../../../services/clientGalleryNotifications';
import './ClientGalleryNotifications.css';

const PANEL_WIDTH = 360;
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
  const [footer, setFooter] = useState('');
  const [loading, setLoading] = useState(false);
  const [panelPos, setPanelPos] = useState(null);
  const rootRef = useRef(null);

  const unreadCount = useMemo(() => items.filter((item) => item.isUnread).length, [items]);
  const isSidebar = variant === 'sidebar';
  const sections = useMemo(
    () =>
      CG_NOTIFICATION_SECTIONS.map((section) => ({
        ...section,
        items: items.filter((item) => (item.section || 'activity') === section.id),
      })).filter((section) => section.items.length > 0),
    [items]
  );

  const updatePanelPosition = useCallback(() => {
    if (!rootRef.current) return;
    setPanelPos(clampPanelPosition(rootRef.current.getBoundingClientRect()));
  }, []);

  const refreshItems = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setFooter('');
      return;
    }
    setLoading(true);
    try {
      const next = await listClientGalleryNotifications(userId);
      setItems(next.items || []);
      setFooter(next.footer || '');
    } catch {
      setItems([]);
      setFooter('');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setFooter('');
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

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div className="cg-notifications" ref={rootRef}>
      <button
        type="button"
        className={`cg-notifications-trigger${isSidebar ? ' cg-notifications-trigger--sidebar neu-circle' : ''}${open ? ' is-open' : ''}`}
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
            {loading && !items.length ? (
              <div className="cg-notifications-empty app-loader app-loader--dropdown">
                <AppSpinner size="sm" />
                <span className="app-loader__label--sans">Loading</span>
              </div>
            ) : items.length === 0 ? (
              <div className="cg-notifications-empty">Nothing needs you right now</div>
            ) : (
              <>
                <div className="cg-notifications-body">
                  {sections.map((section) => (
                    <section key={section.id} className="cg-notifications-group">
                      <p className="cg-notifications-kicker">{section.label}</p>
                      <ul className="cg-notifications-list">
                        {section.items.map((item) => (
                          <li key={item.id} className="cg-notifications-row">
                            <button
                              type="button"
                              className="cg-notifications-item"
                              role="menuitem"
                              onClick={() => handleSelect(item)}
                            >
                              <span
                                className={`cg-notifications-dot cg-notifications-dot--${item.tone || 'ok'}`}
                                aria-hidden
                              />
                              <span className="cg-notifications-copy">
                                <span className="cg-notifications-item-album">
                                  {item.title || item.collectionName}
                                </span>
                                <span className="cg-notifications-item-preview">
                                  {item.subtitle || item.preview}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
                {footer ? <p className="cg-notifications-footer">{footer}</p> : null}
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
