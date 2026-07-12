import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { guestDeliveryService } from '../../services/guestDelivery.service';
import { registerGuestViaApi } from '../../services/guestDeliveryGuests.service';
import { prepareSelfieForRekognition } from '../../lib/selfieImageForRekognition';
import './EventGuestRegister.css';

function RequiredMark() {
  return <span className="egr-required" aria-hidden> *</span>;
}

export default function EventGuestRegister() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [phase, setPhase] = useState('form');
  const [confirmedGuest, setConfirmedGuest] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('egr-body-lock');
    document.documentElement.classList.add('egr-root-lock');
    return () => {
      document.body.classList.remove('egr-body-lock');
      document.documentElement.classList.remove('egr-root-lock');
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await guestDeliveryService.getEventBySlug(slug);
        if (!cancelled) {
          if (!data) setError('This event was not found.');
          else setEvent(data);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Could not load event. Please try again in a moment.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleSelfieFile = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await prepareSelfieForRekognition(file);
      setSelfiePreview(dataUrl);
    } catch (err) {
      alert(err?.message || 'Could not read image.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !selfiePreview || phase === 'submitting') return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    setPhase('submitting');
    try {
      await registerGuestViaApi({
        slug,
        name: trimmedName,
        email: trimmedEmail,
        phone: phone.trim() || null,
        selfieBase64: selfiePreview,
      });
      setConfirmedGuest({ name: trimmedName, email: trimmedEmail });
      setPhase('success');
    } catch (err) {
      setPhase('form');
      alert(err?.message || 'Registration failed.');
    }
  };

  if (loading) {
    return (
      <div className="egr-page">
        <div className="egr-loading">Loading registration form…</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="egr-page">
        <div className="egr-form-sheet">
          <div className="egr-form-banner egr-form-banner--error">
            <h1>Registration unavailable</h1>
            <p>{error || 'This event is not accepting registrations.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = phase === 'success';
  const isSubmitting = phase === 'submitting';

  return (
    <div className="egr-page">
      <div className="egr-form-sheet">
        {isSuccess ? (
          <div className="egr-form-banner egr-form-banner--success egr-success-panel">
            <h1>You&apos;re registered!</h1>
            <p>
              Thanks, {confirmedGuest?.name}. When photos are ready, we&apos;ll email you at{' '}
              <strong>{confirmedGuest?.email}</strong> with your personal gallery link.
            </p>
          </div>
        ) : (
          <>
            <header className="egr-form-banner">
              <p className="egr-form-eyebrow">Guest registration</p>
              <h1>{event.name}</h1>
              <p className="egr-form-desc">
                Fill in your details below. We&apos;ll use your selfie to find your photos when the event gallery is published.
              </p>
            </header>

            <form className="egr-questions" onSubmit={handleSubmit}>
              <section className="egr-question">
                <label className="egr-question-label" htmlFor="egr-name">
                  Full name
                  <RequiredMark />
                </label>
                <input
                  id="egr-name"
                  type="text"
                  className="egr-input"
                  placeholder="Your answer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  disabled={isSubmitting}
                />
              </section>

              <section className="egr-question">
                <label className="egr-question-label" htmlFor="egr-email">
                  Email address
                  <RequiredMark />
                </label>
                <p className="egr-question-hint">We&apos;ll send your photo link here after the event.</p>
                <input
                  id="egr-email"
                  type="email"
                  className="egr-input"
                  placeholder="Your answer"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  inputMode="email"
                  disabled={isSubmitting}
                />
              </section>

              <section className="egr-question">
                <label className="egr-question-label" htmlFor="egr-phone">
                  Phone number
                </label>
                <p className="egr-question-hint">Optional</p>
                <input
                  id="egr-phone"
                  type="tel"
                  className="egr-input"
                  placeholder="Your answer"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  disabled={isSubmitting}
                />
              </section>

              <section className="egr-question">
                <label className="egr-question-label">
                  Selfie photo
                  <RequiredMark />
                </label>
                <p className="egr-question-hint">
                  Take a clear front-facing photo in good light. This is only used to match you with your event photos.
                </p>

                <div className="egr-selfie-actions">
                  <button
                    type="button"
                    className="egr-selfie-action"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    Take selfie
                  </button>
                  <button
                    type="button"
                    className="egr-selfie-action egr-selfie-action--secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    Upload photo
                  </button>
                </div>

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  hidden
                  onChange={(e) => handleSelfieFile(e.target.files?.[0])}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleSelfieFile(e.target.files?.[0])}
                />

                {selfiePreview ? (
                  <div className="egr-selfie-preview-wrap">
                    <img src={selfiePreview} alt="Your selfie preview" className="egr-selfie-preview" />
                    <button
                      type="button"
                      className="egr-selfie-retake"
                      onClick={() => {
                        setSelfiePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        if (cameraInputRef.current) cameraInputRef.current.value = '';
                      }}
                      disabled={isSubmitting}
                    >
                      Retake
                    </button>
                  </div>
                ) : null}
              </section>

              <footer className="egr-form-footer">
                <button
                  type="submit"
                  className="egr-submit"
                  disabled={!name.trim() || !email.trim() || !selfiePreview || isSubmitting}
                >
                  {isSubmitting ? 'Submitting…' : 'Submit'}
                </button>
                <p className="egr-footer-note">
                  Never submit passwords through this form. Powered by PIXNXT Guest Delivery.
                </p>
              </footer>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
