import React, { useCallback, useEffect, useRef, useState } from 'react';
import { guestDeliveryGuestsService } from '../../services/guestDeliveryGuests.service';
import { guestDeliveryPublishService } from '../../services/guestDeliveryPublish.service';
import { getGuestPersonalGalleryUrl } from '../../lib/guestDeliveryLinks';

const STATUS_LABELS = {
  pending: 'Waiting for publish',
  matching: 'Matching…',
  matched: 'Matched',
  sent: 'Email sent',
  no_match: 'No matches',
  failed: 'Failed',
};

const EventGuestsPanel = ({ event, photographerId, onGuestCountChange, refreshKey = 0 }) => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingGuestId, setSendingGuestId] = useState(null);
  const onGuestCountChangeRef = useRef(onGuestCountChange);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    onGuestCountChangeRef.current = onGuestCountChange;
  }, [onGuestCountChange]);

  const loadGuests = useCallback(async ({ silent = false } = {}) => {
    if (!photographerId || !event?.id) return;
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

  const handleDelete = async (guest) => {
    if (!window.confirm(`Remove guest "${guest.name}"?`)) return;
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
    const url = getGuestPersonalGalleryUrl(event?.slug, guest.access_token);
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
    try {
      await guestDeliveryPublishService.sendDeliveryEmail({
        eventId: event.id,
        guestId: guest.id,
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
    <div className="gd-panel">
      <div className="gd-panel-toolbar">
        <div>
          <h2>Registered guests</h2>
          <p className="gd-panel-sub">Guests who scanned the QR and submitted their details + selfie.</p>
        </div>
        <button type="button" className="gd-btn-text" onClick={() => loadGuests({ silent: true })}>
          Refresh
        </button>
      </div>

      {loading && guests.length === 0 ? (
        <p className="gd-muted">Loading guests…</p>
      ) : guests.length === 0 ? (
        <div className="gd-empty-inline">
          <p>No guests registered yet.</p>
          <p className="gd-muted">Share the QR code so guests can sign up before you publish.</p>
        </div>
      ) : (
        <div className="gd-guest-table-wrap">
          <table className="gd-guest-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Registered</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id}>
                  <td>
                    <div className="gd-guest-name-cell">
                      {guest.selfie_url ? (
                        <img src={guest.selfie_url} alt="" className="gd-guest-avatar" loading="lazy" />
                      ) : null}
                      {guest.name}
                      {guest.matched_photo_count > 0 ? (
                        <span className="gd-muted" style={{ display: 'block', fontSize: 12 }}>
                          {guest.matched_photo_count} photo{guest.matched_photo_count === 1 ? '' : 's'}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>{guest.email}</td>
                  <td>{guest.phone || '—'}</td>
                  <td>{new Date(guest.registered_at).toLocaleString()}</td>
                  <td>
                    <span className={`gd-status gd-status--${guest.delivery_status}`}>
                      {STATUS_LABELS[guest.delivery_status] || guest.delivery_status}
                    </span>
                  </td>
                  <td>
                    <div className="gd-guest-actions">
                      {guest.matched_photo_count > 0 && (
                        <>
                          <button type="button" className="gd-btn-text" onClick={() => handleCopyLink(guest)}>
                            Copy link
                          </button>
                          <button
                            type="button"
                            className="gd-btn-text"
                            disabled={sendingGuestId === guest.id || event.status !== 'published'}
                            onClick={() => handleSendEmail(guest)}
                          >
                            {sendingGuestId === guest.id
                              ? 'Sending…'
                              : guest.delivery_status === 'sent'
                                ? 'Resend'
                                : 'Send email'}
                          </button>
                        </>
                      )}
                      <button type="button" className="gd-btn-text gd-btn-danger" onClick={() => handleDelete(guest)}>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EventGuestsPanel;
