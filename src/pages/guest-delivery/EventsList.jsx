import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { guestDeliveryService } from '../../services/guestDelivery.service';
import { getGuestDeliveryDbErrorMessage } from '../../lib/guestDeliveryDbError';
import CreateEventModal from '../../components/guest-delivery/CreateEventModal';
import { ClientGallerySearchField } from '../../components/features/ClientGallery/ClientGalleryPageShell';
import { AppLoader } from '../../components/ui/AppLoading';
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
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

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

  const handleDeleteAll = async () => {
    if (!user || filteredEvents.length === 0) return;
    setDeletingAll(true);
    try {
      for (const event of filteredEvents) {
        await guestDeliveryService.deleteEvent(user.id, event.id);
      }
      const deletedIds = new Set(filteredEvents.map((e) => e.id));
      setEvents((prev) => prev.filter((e) => !deletedIds.has(e.id)));
      setShowDeleteAll(false);
    } catch (err) {
      console.error(err);
      alert('Failed to delete all events. Please try again.');
    } finally {
      setDeletingAll(false);
    }
  };

  const pluralize = (count, singular) => `${count || 0} ${singular}${Number(count) === 1 ? '' : 's'}`;

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
        <div className="gd-events-header-actions">
          {events.length > 0 && (
            <button
              type="button"
              className="gd-secondary-btn gd-danger-outline-btn"
              onClick={() => setShowDeleteAll(true)}
              disabled={deletingAll}
            >
              Delete all
            </button>
          )}
          <button type="button" className="gd-primary-btn" onClick={() => setCreateOpen(true)}>
            + Create Event
          </button>
        </div>
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
        {!loading && !loadError && events.length > 0 && (
          <span className="gd-events-count">
            {filteredEvents.length === events.length
              ? `${events.length} event${events.length === 1 ? '' : 's'}`
              : `${filteredEvents.length} of ${events.length} events`}
          </span>
        )}
      </div>

      {loadError && (
        <div className="gd-empty" role="alert">
          <h2>Database setup required</h2>
          <p>{loadError}</p>
        </div>
      )}

      {!loadError && loading ? (
        <AppLoader label="Loading events" variant="page-short" className="gd-content app-loader" />
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
                <h3 title={event.name}>{event.name}</h3>
                <p className="gd-muted">
                  {pluralize(event.guest_count, 'guest')} · {pluralize(event.photo_count, 'photo')}
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
                aria-label={`Delete ${event.name}`}
                title="Delete event"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
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

      {showDeleteAll && (
        <div className="gd-modal-overlay" onClick={() => !deletingAll && setShowDeleteAll(false)}>
          <div className="gd-modal gd-delete-all-modal" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="gd-delete-all-title">
            <h3 id="gd-delete-all-title" className="gd-modal-title">Delete all events?</h3>
            <p className="gd-delete-all-text">
              This will permanently delete{' '}
              <strong>
                {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}
              </strong>
              {searchQuery.trim() ? ' matching your search' : ''}. This cannot be undone.
            </p>
            <div className="gd-modal-actions">
              <button
                type="button"
                className="gd-secondary-btn"
                onClick={() => setShowDeleteAll(false)}
                disabled={deletingAll}
              >
                Cancel
              </button>
              <button
                type="button"
                className="gd-primary-btn gd-delete-confirm-btn"
                onClick={handleDeleteAll}
                disabled={deletingAll}
              >
                {deletingAll ? 'Deleting…' : 'Delete all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
