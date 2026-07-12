import React, { useCallback, useEffect, useRef, useState } from 'react';
import { guestDeliveryGuestsService } from '../../services/guestDeliveryGuests.service';

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
                    <button type="button" className="gd-btn-text gd-btn-danger" onClick={() => handleDelete(guest)}>
                      Remove
                    </button>
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
