import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { guestDeliveryService } from '../../services/guestDelivery.service';
import { galleryService } from '../../services/gallery.service';
import { getGuestRegistrationUrl } from '../../lib/guestDeliveryLinks';
import { getQrCodeImageUrl } from '../../lib/shareCollection';
import { getShareUrlWarning } from '../../lib/publicSiteUrl';
import GuestDeliveryLayout from '../../components/guest-delivery/GuestDeliveryLayout';
import { AppLoader } from '../../components/ui/AppLoading';
import './GuestDelivery.css';

export default function EventShare() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [photographerProfile, setPhotographerProfile] = useState(null);

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
    (async () => {
      try {
        setLoading(true);
        const data = await guestDeliveryService.getEvent(user.id, eventId);
        if (!cancelled) setEvent(data);
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

  if (loading) {
    return (
      <GuestDeliveryLayout>
        <AppLoader label="Loading" variant="page-short" className="gd-content app-loader" />
      </GuestDeliveryLayout>
    );
  }

  if (!event) {
    return (
      <GuestDeliveryLayout>
        <div className="gd-content gd-empty">
          <h2>Event not found</h2>
          <button type="button" className="gd-primary-btn" onClick={() => navigate('/guest-delivery')}>
            Back
          </button>
        </div>
      </GuestDeliveryLayout>
    );
  }

  const registrationUrl = getGuestRegistrationUrl(event.slug, photographerProfile);
  const qrSrc = getQrCodeImageUrl(registrationUrl, 240);
  const warning = getShareUrlWarning(registrationUrl);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(registrationUrl);
    }
  };

  return (
    <GuestDeliveryLayout>
      <div className="gd-content gd-share-page">
        <button type="button" className="gd-back-btn" onClick={() => navigate(`/guest-delivery/event/${event.id}`)}>
          ← Back to event
        </button>

        <h1>Guest registration</h1>
        <p className="gd-muted">Print or display this QR at the event. Guests scan it to register with name, email, and selfie.</p>

        {warning ? <p className="gd-share-warning" role="status">{warning}</p> : null}

        {import.meta.env.DEV ? (
          <p className="gd-share-warning" role="status">
            Local dev mode: this link uses <strong>{window.location.origin}</strong>. Restart dev server after changing .env.
          </p>
        ) : null}

        <div className="gd-share-card">
          <div className="gd-qr-wrap">
            <img src={qrSrc} alt={`QR code for ${event.name}`} width={240} height={240} />
          </div>
          <div className="gd-share-details">
            <label className="gd-field-label">Registration link</label>
            <div className="gd-link-row">
              <input type="text" readOnly value={registrationUrl} className="gd-field-input" />
              <button type="button" className="gd-secondary-btn" onClick={copyLink}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="gd-muted">Route: /e/{event.slug}/register</p>
          </div>
        </div>
      </div>
    </GuestDeliveryLayout>
  );
}
