import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { guestDeliveryGuestsService } from '../../services/guestDeliveryGuests.service';
import { guestDeliveryPublishService } from '../../services/guestDeliveryPublish.service';
import { getGuestPersonalGalleryUrl } from '../../lib/guestDeliveryLinks';

function guestReach(guest) {
  if (guest.phone) {
    return { channel: 'WhatsApp', value: String(guest.phone).trim() };
  }
  return { channel: 'Email', value: String(guest.email || '').trim() };
}

function guestBoardState(guest) {
  if (!guest.selfie_url) return 'no-selfie';
  const status = guest.delivery_status;
  if (status === 'sent' || status === 'matched' || (guest.matched_photo_count || 0) > 0) {
    return 'ready';
  }
  return 'review';
}

function guestSentState(guest) {
  if (guest.delivery_status === 'sent' || guest.delivery_email_sent_at) return 'sent';
  return 'not-yet';
}

const STATE_LABEL = {
  ready: 'Ready',
  review: 'Review',
  'no-selfie': 'No selfie',
};

const SENT_LABEL = {
  sent: 'Sent',
  'not-yet': 'Not yet',
};

const EventGuestsPanel = ({
  event,
  photographerId,
  photographerProfile = null,
  onGuestCountChange,
  refreshKey = 0,
}) => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingGuestId, setSendingGuestId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const menuRef = useRef(null);
  const wrapRefs = useRef({});
  const onGuestCountChangeRef = useRef(onGuestCountChange);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    onGuestCountChangeRef.current = onGuestCountChange;
  }, [onGuestCountChange]);

  const loadGuests = useCallback(async ({ silent = false } = {}) => {
    if (!event?.id) return;
    try {
      if (!silent && !hasLoadedRef.current) setLoading(true);
      const data = await guestDeliveryGuestsService.getGuests(photographerId, event.id);
      setGuests(data);
      onGuestCountChangeRef.current?.(data.length);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error(err);
      setGuests([]);
    } finally {
      setLoading(false);
    }
  }, [photographerId, event?.id]);

  useEffect(() => {
    hasLoadedRef.current = false;
    loadGuests();
  }, [loadGuests, refreshKey]);

  useEffect(() => {
    if (!openMenuId) return undefined;
    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      if (wrapRefs.current[openMenuId]?.contains(event.target)) return;
      setOpenMenuId(null);
      setMenuPos(null);
    };
    // The card scrolls/clips, so the open menu lives in a portal —
    // dismiss it instead of letting it detach from its row.
    const onScrollOrResize = () => {
      setOpenMenuId(null);
      setMenuPos(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [openMenuId]);

  const toggleMenu = useCallback((event, guest) => {
    event.stopPropagation();
    setOpenMenuId((id) => {
      if (id === guest.id) {
        setMenuPos(null);
        return null;
      }
      // Position the portaled menu next to the trigger (flip up when
      // there is no room below so it never renders clipped).
      const rect = event.currentTarget?.getBoundingClientRect();
      if (rect) {
        const MENU_W = 184;
        // Remove-only menu is one row; full menu is three rows.
        const MENU_H = (guest.matched_photo_count || 0) > 0 ? 152 : 56;
        const GAP = 6;
        const PAD = 12;
        const left = Math.min(
          Math.max(rect.right - MENU_W, PAD),
          Math.max(window.innerWidth - MENU_W - PAD, PAD)
        );
        const openUp = rect.bottom + GAP + MENU_H > window.innerHeight - PAD;
        const top = openUp
          ? Math.max(rect.top - MENU_H - GAP, PAD)
          : rect.bottom + GAP;
        setMenuPos({ top, left });
      } else {
        setMenuPos(null);
      }
      return guest.id;
    });
  }, []);

  const selfieCount = useMemo(
    () => guests.filter((guest) => Boolean(guest.selfie_url)).length,
    [guests]
  );

  const matchedCount = useMemo(
    () => guests.filter((guest) => (guest.matched_photo_count || 0) > 0).length,
    [guests]
  );

  const handleDelete = async (guest) => {
    if (!window.confirm(`Remove guest "${guest.name}"?`)) return;
    setOpenMenuId(null);
    try {
      await guestDeliveryGuestsService.deleteGuest(photographerId, event.id, guest.id);
      setGuests((prev) => {
        const next = prev.filter((g) => g.id !== guest.id);
        onGuestCountChangeRef.current?.(next.length);
        return next;
      });
    } catch (err) {
      console.error(err);
      alert('Failed to remove guest.');
    }
  };

  const handleCopyLink = async (guest) => {
    const url = getGuestPersonalGalleryUrl(event?.slug, guest.access_token, photographerProfile);
    setOpenMenuId(null);
    try {
      await navigator.clipboard.writeText(url);
      const opened = window.confirm(
        `Gallery link copied.\n\n${url}\n\nOpen it now in this browser? (Use this to test locally — email links use production until you deploy.)`
      );
      if (opened) window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      prompt('Copy this gallery link and open it while npm run dev is running:', url);
    }
  };

  const handleSendEmail = async (guest) => {
    if (!event?.id || event.status !== 'published') {
      alert('Publish the event first before sending delivery messages.');
      return;
    }
    if ((guest.matched_photo_count || 0) < 1) {
      alert('This guest has no matched photos to deliver.');
      return;
    }
    if (!guest.email) {
      alert('This guest has no email address.');
      return;
    }

    setSendingGuestId(guest.id);
    setOpenMenuId(null);
    try {
      await guestDeliveryPublishService.sendDeliveryEmail({
        eventId: event.id,
        guestId: guest.id,
        channel: 'email',
        photographerProfile,
      });
      await loadGuests({ silent: true });
      alert(`Email sent to ${guest.email}.`);
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Failed to send email.');
    } finally {
      setSendingGuestId(null);
    }
  };

  const handleSendWhatsApp = async (guest) => {
    if (!event?.id || event.status !== 'published') {
      alert('Publish the event first before sending delivery messages.');
      return;
    }
    if ((guest.matched_photo_count || 0) < 1) {
      alert('This guest has no matched photos to deliver.');
      return;
    }
    if (!String(guest.phone || '').replace(/\D/g, '').length) {
      alert('This guest has no phone number for WhatsApp.');
      return;
    }

    setSendingGuestId(guest.id);
    setOpenMenuId(null);
    try {
      await guestDeliveryPublishService.sendDeliveryEmail({
        eventId: event.id,
        guestId: guest.id,
        channel: 'whatsapp',
        photographerProfile,
      });
      await loadGuests({ silent: true });
      alert(`WhatsApp delivery queued for ${guest.phone}.`);
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Failed to send WhatsApp message.');
    } finally {
      setSendingGuestId(null);
    }
  };

  const handleSendAuto = async (guest) => {
    if (!event?.id || event.status !== 'published') {
      alert('Publish the event first before sending delivery messages.');
      return;
    }
    if ((guest.matched_photo_count || 0) < 1) {
      alert('This guest has no matched photos to deliver.');
      return;
    }

    setSendingGuestId(guest.id);
    setOpenMenuId(null);
    try {
      const result = await guestDeliveryPublishService.sendDeliveryEmail({
        eventId: event.id,
        guestId: guest.id,
        channel: 'auto',
        photographerProfile,
      });
      await loadGuests({ silent: true });
      const via = result?.channel === 'whatsapp' ? 'WhatsApp' : result?.channel === 'email' ? 'email' : 'WhatsApp (or email fallback)';
      alert(`Delivery queued via ${via}.`);
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Failed to send delivery.');
    } finally {
      setSendingGuestId(null);
    }
  };

  return (
    <div className="gd-guest-board">
      <header className="gd-guest-board__header">
        <h2 className="gd-guest-board__title">Guests</h2>
        <p className="gd-guest-board__sub">
          {guests.length} registered · {selfieCount} with a selfie · {matchedCount} matched
        </p>
      </header>

      {loading && guests.length === 0 ? (
        <p className="gd-muted">Loading guests…</p>
      ) : guests.length === 0 ? (
        <div className="gd-guest-board__empty">
          <p>No guests registered yet.</p>
          <p className="gd-muted">Share the QR code so guests can sign up before you publish.</p>
          {event?.guest_count > 0 ? (
            <button type="button" className="gd-btn-text" onClick={() => loadGuests()}>
              Retry loading guests
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="gd-guest-board__card">
            <div className="gd-guest-board__cols gd-guest-board__cols--head" role="row">
              <span>Guest</span>
              <span>Reaches them by</span>
              <span>Matched</span>
              <span>State</span>
              <span>Sent</span>
              <span className="gd-guest-board__cols-spacer" aria-hidden />
            </div>
            {guests.map((guest) => {
              const reach = guestReach(guest);
              const state = guestBoardState(guest);
              const sent = guestSentState(guest);
              const matched = guest.matched_photo_count || 0;
              return (
                <div key={guest.id} className="gd-guest-board__cols gd-guest-board__row" role="row">
                  <div className="gd-guest-board__person">
                    {guest.selfie_url ? (
                      <img src={guest.selfie_url} alt="" className="gd-guest-board__avatar" loading="lazy" />
                    ) : (
                      <span className="gd-guest-board__avatar gd-guest-board__avatar--placeholder" aria-hidden />
                    )}
                    <span className="gd-guest-board__name">{guest.name}</span>
                  </div>
                  <div className="gd-guest-board__reach">
                    <span className="gd-guest-board__channel">{reach.channel}</span>
                    <span className="gd-guest-board__contact">{reach.value || '—'}</span>
                  </div>
                  <span className="gd-guest-board__matched">
                    {matched > 0 ? matched : '—'}
                  </span>
                  <span className={`gd-guest-board__pill gd-guest-board__pill--${state}`}>
                    {STATE_LABEL[state]}
                  </span>
                  <span className={`gd-guest-board__pill gd-guest-board__pill--${sent}`}>
                    {SENT_LABEL[sent]}
                  </span>
                  <div
                    className="gd-guest-board__menu-wrap"
                    ref={(node) => {
                      if (node) wrapRefs.current[guest.id] = node;
                      else delete wrapRefs.current[guest.id];
                    }}
                  >
                    <button
                      type="button"
                      className="gd-guest-board__menu-btn"
                      aria-label={`Actions for ${guest.name}`}
                      aria-expanded={openMenuId === guest.id}
                      onClick={(event) => toggleMenu(event, guest)}
                    >
                      ···
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {(() => {
            const openGuest = guests.find((guest) => guest.id === openMenuId);
            if (!openGuest || !menuPos) return null;
            const openMatched = openGuest.matched_photo_count || 0;
            return createPortal(
              <div
                className="gd-guest-board__menu gd-guest-board__menu--fixed"
                role="menu"
                ref={menuRef}
                style={{ top: menuPos.top, left: menuPos.left }}
              >
                {openMatched > 0 ? (
                  <>
                    <button type="button" role="menuitem" onClick={() => handleCopyLink(openGuest)}>
                      Copy gallery link
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={sendingGuestId === openGuest.id || event.status !== 'published'}
                      onClick={() => handleSendAuto(openGuest)}
                    >
                      {sendingGuestId === openGuest.id
                        ? 'Sending…'
                        : openGuest.delivery_status === 'sent'
                          ? 'Resend delivery'
                          : 'Send delivery'}
                    </button>
                    {openGuest.phone ? (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={sendingGuestId === openGuest.id || event.status !== 'published'}
                        onClick={() => handleSendWhatsApp(openGuest)}
                      >
                        Send WhatsApp
                      </button>
                    ) : null}
                    {openGuest.email ? (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={sendingGuestId === openGuest.id || event.status !== 'published'}
                        onClick={() => handleSendEmail(openGuest)}
                      >
                        Send email
                      </button>
                    ) : null}
                  </>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  className="gd-guest-board__menu-danger"
                  onClick={() => handleDelete(openGuest)}
                >
                  Remove
                </button>
              </div>,
              document.body
            );
          })()}
          <p className="gd-guest-board__footnote">
            Click any row for the full record. Everything that configures guest registration is under{' '}
            <span>Settings › Access › Guest Delivery</span>.
          </p>
        </>
      )}
    </div>
  );
};

export default EventGuestsPanel;
