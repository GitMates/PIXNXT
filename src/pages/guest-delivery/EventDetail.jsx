import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { guestDeliveryService } from '../../services/guestDelivery.service';
import { guestDeliveryPublishService } from '../../services/guestDeliveryPublish.service';
import { galleryService } from '../../services/gallery.service';
import GuestDeliveryLayout from '../../components/guest-delivery/GuestDeliveryLayout';
import EventPhotosPanel from '../../components/guest-delivery/EventPhotosPanel';
import EventGuestsPanel from '../../components/guest-delivery/EventGuestsPanel';
import { ClientGallerySubpageTabs } from '../../components/features/ClientGallery/ClientGalleryPageShell';
import { AppLoader } from '../../components/ui/AppLoading';
import './GuestDelivery.css';

const TABS = [
  { id: 'photos', label: 'Photos' },
  { id: 'guests', label: 'Guests' },
];

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('photos');
  const [publishing, setPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState('');
  const [guestsRefreshKey, setGuestsRefreshKey] = useState(0);
  const [photographerProfile, setPhotographerProfile] = useState(null);
  const loadedEventIdRef = useRef(null);

  useEffect(() => {
    if (!user?.id) {
      setPhotographerProfile(null);
      return;
    }
    galleryService
      .getPhotographerProfile(user.id)
      .then((data) => setPhotographerProfile(data || null))
      .catch(() => setPhotographerProfile(null));
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const isNewEvent = loadedEventIdRef.current !== eventId;
    if (isNewEvent) {
      setLoading(true);
      setEvent(null);
    }

    (async () => {
      try {
        const data = await guestDeliveryService.getEvent(user.id, eventId);
        if (!cancelled) {
          setEvent(data);
          loadedEventIdRef.current = eventId;
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setEvent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, eventId]);

  const handleGuestCountChange = useCallback((count) => {
    setEvent((prev) => (prev ? { ...prev, guest_count: count } : prev));
  }, []);

  const handlePhotoCountChange = useCallback((count) => {
    setEvent((prev) => (prev ? { ...prev, photo_count: count } : prev));
  }, []);

  const handlePublish = async () => {
    if (!event?.id || publishing) return;

    const photoCount = event.photo_count || 0;
    const guestCount = event.guest_count || 0;

    if (photoCount < 1) {
      alert('Add at least one photo before publishing.');
      return;
    }
    if (guestCount < 1) {
      alert('At least one guest must register before publishing.');
      return;
    }

    const confirmMessage =
      event.status === 'published'
        ? `Re-publish "${event.name}"? This will re-index photos, re-match all guests, and send delivery emails again to guests with matches.`
        : `Publish "${event.name}"? This will index photos, match each guest by selfie, and email personal gallery links. Guests can keep registering via the QR link.`;

    if (!window.confirm(confirmMessage)) return;

    setPublishing(true);
    setPublishStep('Indexing photos and matching faces…');

    try {
      const result = await guestDeliveryPublishService.publishEvent(event.id);
      setEvent((prev) => (prev ? { ...prev, ...result.event } : result.event));

      const matchedGuests = (result.guests || []).filter((g) => g.ok && g.matched);
      const emailErrors = [];

      if (matchedGuests.length) {
        setPublishStep(`Sending emails (${matchedGuests.length} guest${matchedGuests.length === 1 ? '' : 's'})…`);
        for (const entry of matchedGuests) {
          try {
            await guestDeliveryPublishService.sendDeliveryEmail({
              eventId: event.id,
              guestId: entry.guestId,
              photographerProfile,
            });
          } catch (err) {
            console.error(err);
            emailErrors.push(err?.message || 'Email failed');
          }
        }
      }

      setGuestsRefreshKey((k) => k + 1);
      setActiveTab('guests');

      const summary = result.summary || {};
      const failedGuests = (result.guests || []).filter((g) => !g.ok);
      let message = [
        `Indexed ${summary.photosIndexed ?? 0} photo(s) with faces.`,
        summary.photosNoFaces ? `${summary.photosNoFaces} photo(s) had no detectable faces.` : '',
        `${summary.guestsMatched ?? 0} guest(s) matched.`,
        summary.guestsNoMatch ? `${summary.guestsNoMatch} guest(s) with no matches.` : '',
        summary.guestsFailed ? `${summary.guestsFailed} guest(s) failed matching.` : '',
        matchedGuests.length
          ? emailErrors.length
            ? `Emails sent with ${emailErrors.length} error(s).`
            : 'Delivery emails sent.'
          : 'No delivery emails sent (no matches).',
      ]
        .filter(Boolean)
        .join('\n');

      if (failedGuests.length) {
        message += `\n\nMatching errors:\n${failedGuests
          .slice(0, 3)
          .map((g) => `- ${g.error || 'Unknown error'}`)
          .join('\n')}`;
      }

      if (emailErrors.length === matchedGuests.length && matchedGuests.length > 0) {
        message += `\n\nEmail error: ${emailErrors[0]}`;
      } else if (emailErrors.length) {
        message += `\n\nEmail errors:\n${emailErrors.map((e) => `- ${e}`).join('\n')}`;
      }

      alert(message);
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Publish failed. Please try again.');
    } finally {
      setPublishing(false);
      setPublishStep('');
    }
  };

  const canPublish = (event?.photo_count || 0) > 0 && (event?.guest_count || 0) > 0;

  if (loading && !event) {
    return (
      <GuestDeliveryLayout>
        <AppLoader label="Loading event" variant="page-short" className="gd-content app-loader" />
      </GuestDeliveryLayout>
    );
  }

  if (!event) {
    return (
      <GuestDeliveryLayout>
        <div className="gd-content gd-empty">
          <h2>Event not found</h2>
          <button type="button" className="gd-primary-btn" onClick={() => navigate('/guest-delivery')}>
            Back to events
          </button>
        </div>
      </GuestDeliveryLayout>
    );
  }

  return (
    <GuestDeliveryLayout>
      <div className="gd-event-detail">
        <header className="gd-event-detail-header">
          <div className="gd-event-detail-info">
            <button type="button" className="gd-back-btn" onClick={() => navigate('/guest-delivery')} aria-label="Back">
              ←
            </button>
            <div>
              <h1>{event.name}</h1>
              <p className="gd-muted">
                {event.guest_count || 0} guests · {event.photo_count || 0} photos · {event.status}
              </p>
            </div>
          </div>
          <div className="gd-event-detail-actions">
            <button
              type="button"
              className="gd-secondary-btn"
              onClick={() => navigate(`/guest-delivery/event/${event.id}/share`)}
            >
              QR &amp; Link
            </button>
            <button
              type="button"
              className="gd-primary-btn"
              disabled={!canPublish || publishing}
              onClick={handlePublish}
              title={
                !canPublish
                  ? 'Add photos and register at least one guest before publishing'
                  : event.status === 'published'
                    ? 'Re-run matching and resend delivery emails'
                    : 'Index photos, match guests, and send gallery links'
              }
            >
              {publishing ? 'Publishing…' : event.status === 'published' ? 'Re-publish' : 'Publish'}
            </button>
          </div>
        </header>

        <div className="gd-event-tabs">
          <ClientGallerySubpageTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
        </div>

        <div className="gd-content gd-content--photos">
          <div style={{ display: activeTab === 'photos' ? 'block' : 'none' }}>
            <EventPhotosPanel
              event={event}
              photographerId={user?.id}
              onPhotoCountChange={handlePhotoCountChange}
            />
          </div>
          {activeTab === 'guests' && (
            <EventGuestsPanel
              event={event}
              photographerId={user?.id}
              photographerProfile={photographerProfile}
              onGuestCountChange={handleGuestCountChange}
              refreshKey={guestsRefreshKey}
            />
          )}
        </div>

        {publishing && (
          <div className="gd-publish-overlay" role="status" aria-live="polite">
            <div className="gd-publish-card">
              <p className="gd-publish-title">Publishing event</p>
              <p className="gd-muted">{publishStep || 'Working…'}</p>
            </div>
          </div>
        )}
      </div>
    </GuestDeliveryLayout>
  );
}
