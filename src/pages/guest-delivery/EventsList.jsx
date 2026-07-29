import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { guestDeliveryService } from '../../services/guestDelivery.service';
import { getGuestDeliveryDbErrorMessage } from '../../lib/guestDeliveryDbError';
import CreateEventModal from '../../components/guest-delivery/CreateEventModal';
import { ClientGallerySearchField } from '../../components/features/ClientGallery/ClientGalleryPageShell';
import './GuestDelivery.css';

function getEventInitial(name) {
  const trimmed = String(name || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'E';
}

export default function GuestDeliveryEventsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await guestDeliveryService.getEvents(user.id);
        if (!cancelled) setEvents(data);
      } catch (err) {
        console.error('[guestDelivery] Failed to load events:', err);
        if (!cancelled) {
          setEvents([]);
          setLoadError(getGuestDeliveryDbErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const handleCreate = async ({ name, event_date }) => {
    if (!user) return;
    setCreating(true);
    try {
      const event = await guestDeliveryService.createEvent({
        photographer_id: user.id,
        name,
        event_date,
      });
      setCreateOpen(false);
      navigate(`/guest-delivery/event/${event.id}`);
    } catch (err) {
      console.error(err);
      alert(getGuestDeliveryDbErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (event) => {
    if (!user) return;
    if (!window.confirm(`Delete "${event.name}"? This cannot be undone.`)) return;
    try {
      await guestDeliveryService.deleteEvent(user.id, event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete event.');
    }
  };

  const filteredEvents = events.filter((event) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return event.name?.toLowerCase().includes(q);
  });

  return (
    <div className="gd-events-page">
      <header className="gd-events-header">
        <div>
          <h1 className="gd-events-title">Guest Delivery Events</h1>
          <p className="gd-events-sub">QR registration → upload photos → publish to match &amp; deliver</p>
        </div>
        <button type="button" className="gd-primary-btn" onClick={() => setCreateOpen(true)}>
          + Create Event
        </button>
      </header>

      <div className="gd-events-toolbar">
        <ClientGallerySearchField
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events…"
          ariaLabel="Search events"
          className="gd-events-search"
          typewriterPlaceholder
        />
      </div>

      {loadError && (
        <div className="gd-empty" role="alert">
          <h2>Database setup required</h2>
          <p>{loadError}</p>
        </div>
      )}

      {!loadError && loading ? (
        <p className="gd-muted">Loading events…</p>
      ) : !loadError && events.length === 0 ? (
        <div className="gd-empty">
          <h2>Create your first event</h2>
          <p>Each event gets a QR code for guest registration, photo uploads, and automated delivery.</p>
          <button type="button" className="gd-primary-btn" onClick={() => setCreateOpen(true)}>
            + Create Event
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="gd-empty">
          <h2>No matching events</h2>
        </div>
      ) : (
        <div className="gd-events-grid">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="gd-event-card"
              onClick={() => navigate(`/guest-delivery/event/${event.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/guest-delivery/event/${event.id}`)}
              role="button"
              tabIndex={0}
            >
              <div className="gd-event-card-thumb">
                {event.cover_image_url ? (
                  <img src={event.cover_image_url} alt="" />
                ) : (
                  <span className="gd-event-card-initial">{getEventInitial(event.name)}</span>
                )}
              </div>
              <div className="gd-event-card-body">
                <h3>{event.name}</h3>
                <p className="gd-muted">
                  {event.guest_count || 0} guests · {event.photo_count || 0} photos
                </p>
                <span className={`gd-badge gd-badge--${event.status}`}>{event.status}</span>
              </div>
              <button
                type="button"
                className="gd-event-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(event);
                }}
                aria-label="Delete event"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateEventModal
        isOpen={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        onCreate={handleCreate}
        saving={creating}
      />
    </div>
  );
}
