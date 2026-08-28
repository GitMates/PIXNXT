import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { guestDeliveryGuestsService } from '../../services/guestDeliveryGuests.service';
import { guestDeliveryPublishService } from '../../services/guestDeliveryPublish.service';
import { getGuestPersonalGalleryUrl } from '../../lib/guestDeliveryLinks';

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function maskPhoneDisplay(phone) {
  const digits = digitsOnly(phone);
  if (!digits) return '';
  let country = '+91';
  let national = digits;
  if (digits.startsWith('91') && digits.length >= 12) {
    national = digits.slice(2);
  } else if (String(phone).trim().startsWith('+') && !digits.startsWith('91')) {
    const match = String(phone).trim().match(/^\+(\d{1,3})/);
    country = match ? `+${match[1]}` : '+';
    national = digits.slice((match?.[1] || '').length);
  }
  if (national.length < 4) return `${country} ${national}`;
  return `${country} ${national.slice(0, 2)}••• ••${national.slice(-2)}`;
}

function maskEmailDisplay(email) {
  const raw = String(email || '').trim();
  const at = raw.indexOf('@');
  if (at < 1) return raw;
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const tld = domain.match(/(\.[a-z]{2,})$/i)?.[1] || '';
  return `${local}@••••${tld}`;
}

function guestReach(guest) {
  if (guest.phone) {
    return { channel: 'WhatsApp', value: maskPhoneDisplay(guest.phone) };
  }
  return { channel: 'Email', value: maskEmailDisplay(guest.email) };
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
  const menuRef = useRef(null);
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
      if (!menuRef.current?.contains(event.target)) setOpenMenuId(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openMenuId]);

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
      alert('Publish the event first before sending delivery emails.');
      return;
    }
    if ((guest.matched_photo_count || 0) < 1) {
      alert('This guest has no matched photos to deliver.');
      return;
    }

    setSendingGuestId(guest.id);
    setOpenMenuId(null);
    try {
      await guestDeliveryPublishService.sendDeliveryEmail({
        eventId: event.id,
        guestId: guest.id,
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
                  <div className="gd-guest-board__menu-wrap" ref={openMenuId === guest.id ? menuRef : null}>
                    <button
                      type="button"
                      className="gd-guest-board__menu-btn"
                      aria-label={`Actions for ${guest.name}`}
                      aria-expanded={openMenuId === guest.id}
                      onClick={() => setOpenMenuId((id) => (id === guest.id ? null : guest.id))}
                    >
                      ···
                    </button>
                    {openMenuId === guest.id ? (
                      <div className="gd-guest-board__menu" role="menu">
                        {matched > 0 ? (
                          <>
                            <button type="button" role="menuitem" onClick={() => handleCopyLink(guest)}>
                              Copy gallery link
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              disabled={sendingGuestId === guest.id || event.status !== 'published'}
                              onClick={() => handleSendEmail(guest)}
                            >
                              {sendingGuestId === guest.id
                                ? 'Sending…'
                                : guest.delivery_status === 'sent'
                                  ? 'Resend email'
                                  : 'Send email'}
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          role="menuitem"
                          className="gd-guest-board__menu-danger"
                          onClick={() => handleDelete(guest)}
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
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
