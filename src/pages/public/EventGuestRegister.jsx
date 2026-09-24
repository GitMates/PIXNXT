import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { guestDeliveryService } from '../../services/guestDelivery.service';
import { registerGuestViaApi } from '../../services/guestDeliveryGuests.service';
import { prepareSelfieForRekognition } from '../../lib/selfieImageForRekognition';
import './EventGuestRegister.css';

function RequiredMark() {
  return <span className="egr-required" aria-hidden> *</span>;
}

const COPY = {
  en: {
    eyebrow: 'Guest registration',
    desc: 'Fill in your details below. We\'ll use your selfie to find your photos when the event gallery is published.',
    descNoSelfie: 'Fill in your details below. We\'ll email you when your photographs are ready.',
    name: 'Full name',
    email: 'Email address',
    emailHint: 'We\'ll send your photo link here after the event.',
    phone: 'Phone number',
    optional: 'Optional',
    selfie: 'Selfie photo',
    selfieHint: 'Take a clear front-facing photo in good light. This is only used to match you with your event photos.',
    takeSelfie: 'Take selfie',
    upload: 'Upload photo',
    retake: 'Retake',
    submit: 'Submit',
    submitting: 'Submitting…',
    successTitle: "You're registered!",
    successBody: (name, email, days) => (
      days
        ? `Thanks, ${name}. Your photographs arrive within ${days} days — we'll email you at ${email}.`
        : `Thanks, ${name}. When photos are ready, we'll email you at ${email} with your personal gallery link.`
    ),
    footer: 'Never submit passwords through this form. Powered by PIXNXT Guest Delivery.',
  },
  hi: {
    eyebrow: 'अतिथि पंजीकरण',
    desc: 'नीचे अपना विवरण भरें। गैलरी प्रकाशित होने पर हम आपकी सेल्फी से आपकी तस्वीरें खोजेंगे।',
    descNoSelfie: 'नीचे अपना विवरण भरें। तस्वीरें तैयार होने पर हम आपको ईमेल करेंगे।',
    name: 'पूरा नाम',
    email: 'ईमेल पता',
    emailHint: 'इवेंट के बाद हम यहाँ आपका फ़ोटो लिंक भेजेंगे।',
    phone: 'फ़ोन नंबर',
    optional: 'वैकल्पिक',
    selfie: 'सेल्फी फ़ोटो',
    selfieHint: 'अच्छी रोशनी में साफ़ सामने की फ़ोटो लें। यह केवल आपकी इवेंट फ़ोटो से मिलान के लिए है।',
    takeSelfie: 'सेल्फी लें',
    upload: 'फ़ोटो अपलोड करें',
    retake: 'दोबारा लें',
    submit: 'जमा करें',
    submitting: 'जमा हो रहा है…',
    successTitle: 'आप पंजीकृत हैं!',
    successBody: (name, email, days) => (
      days
        ? `धन्यवाद, ${name}. आपकी तस्वीरें ${days} दिनों में आएँगी — हम ${email} पर ईमेल करेंगे।`
        : `धन्यवाद, ${name}. तस्वीरें तैयार होने पर हम ${email} पर लिंक भेजेंगे।`
    ),
    footer: 'इस फ़ॉर्म में पासवर्ड न डालें। PIXNXT Guest Delivery द्वारा संचालित।',
  },
  ta: {
    eyebrow: 'விருந்தினர் பதிவு',
    desc: 'கீழே உங்கள் விவரங்களை நிரப்பவும். கேலரி வெளியிடப்படும்போது உங்கள் செல்ஃபியால் புகைப்படங்களைக் கண்டுபிடிப்போம்.',
    descNoSelfie: 'கீழே உங்கள் விவரங்களை நிரப்பவும். புகைப்படங்கள் தயாரானதும் மின்னஞ்சல் அனுப்புவோம்.',
    name: 'முழு பெயர்',
    email: 'மின்னஞ்சல்',
    emailHint: 'நிகழ்வுக்குப் பிறகு இங்கே உங்கள் புகைப்பட இணைப்பை அனுப்புவோம்.',
    phone: 'தொலைபேசி எண்',
    optional: 'விருப்பத்தேர்வு',
    selfie: 'செல்ஃபி புகைப்படம்',
    selfieHint: 'நல்ல வெளிச்சத்தில் தெளிவான முன் புகைப்படம் எடுக்கவும். இது உங்கள் நிகழ்வு புகைப்படங்களுடன் பொருத்த மட்டுமே.',
    takeSelfie: 'செல்ஃபி எடு',
    upload: 'பதிவேற்று',
    retake: 'மீண்டும் எடு',
    submit: 'சமர்ப்பி',
    submitting: 'சமர்ப்பிக்கிறது…',
    successTitle: 'நீங்கள் பதிவு செய்துவிட்டீர்கள்!',
    successBody: (name, email, days) => (
      days
        ? `நன்றி, ${name}. உங்கள் புகைப்படங்கள் ${days} நாட்களில் வரும் — ${email}க்கு மின்னஞ்சல் அனுப்புவோம்.`
        : `நன்றி, ${name}. புகைப்படங்கள் தயாரானதும் ${email}க்கு இணைப்பு அனுப்புவோம்.`
    ),
    footer: 'இந்தப் படிவத்தில் கடவுச்சொல்லை உள்ளிட வேண்டாம். PIXNXT Guest Delivery.',
  },
};

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
  const [lang, setLang] = useState('en');
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
          else if (data.registration_enabled === false) {
            setError('This event has finished. Registration is no longer open.');
          } else {
            setEvent(data);
            const offered = Array.isArray(data.settings?.languages) ? data.settings.languages : ['en'];
            const browser = (typeof navigator !== 'undefined' ? navigator.language : 'en').slice(0, 2).toLowerCase();
            setLang(offered.includes(browser) ? browser : (offered[0] || 'en'));
          }
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

  const settings = event?.settings || {};
  const askSelfie = settings.ask_selfie !== false;
  const promiseTimeline = settings.promise_timeline !== false;
  const deliveryDays = Number(settings.delivery_days) || 14;
  const offeredLangs = Array.isArray(settings.languages) && settings.languages.length
    ? settings.languages
    : ['en'];

  const t = useMemo(() => COPY[lang] || COPY.en, [lang]);

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
    if (!name.trim() || !email.trim() || phase === 'submitting') return;
    if (askSelfie && !selfiePreview) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    setPhase('submitting');
    try {
      await registerGuestViaApi({
        slug,
        name: trimmedName,
        email: trimmedEmail,
        phone: phone.trim() || null,
        selfieBase64: askSelfie ? selfiePreview : null,
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
  const canSubmit = Boolean(name.trim() && email.trim() && (!askSelfie || selfiePreview) && !isSubmitting);

  return (
    <div className="egr-page" lang={lang}>
      <div className="egr-form-sheet">
        {isSuccess ? (
          <div className="egr-form-banner egr-form-banner--success egr-success-panel">
            <h1>{t.successTitle}</h1>
            <p>
              {t.successBody(
                confirmedGuest?.name,
                confirmedGuest?.email,
                promiseTimeline ? deliveryDays : null,
              )}
            </p>
          </div>
        ) : (
          <>
            <header className="egr-form-banner">
              {offeredLangs.length > 1 ? (
                <div className="egr-lang-switch" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {offeredLangs.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="egr-selfie-retake"
                      style={{ opacity: lang === id ? 1 : 0.55 }}
                      onClick={() => setLang(id)}
                    >
                      {id === 'hi' ? 'हिन्दी' : id === 'ta' ? 'தமிழ்' : 'English'}
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="egr-form-eyebrow">{t.eyebrow}</p>
              <h1>{event.name}</h1>
              <p className="egr-form-desc">
                {askSelfie ? t.desc : t.descNoSelfie}
                {promiseTimeline ? ` Your photographs arrive within ${deliveryDays} days.` : ''}
              </p>
            </header>

            <form className="egr-questions" onSubmit={handleSubmit}>
              <section className="egr-question">
                <label className="egr-question-label" htmlFor="egr-name">
                  {t.name}
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
                  {t.email}
                  <RequiredMark />
                </label>
                <p className="egr-question-hint">{t.emailHint}</p>
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
                  {t.phone}
                </label>
                <p className="egr-question-hint">{t.optional}</p>
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

              {askSelfie ? (
                <section className="egr-question">
                  <label className="egr-question-label">
                    {t.selfie}
                    <RequiredMark />
                  </label>
                  <p className="egr-question-hint">{t.selfieHint}</p>

                  <div className="egr-selfie-actions">
                    <button
                      type="button"
                      className="egr-selfie-action"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      {t.takeSelfie}
                    </button>
                    <button
                      type="button"
                      className="egr-selfie-action"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      {t.upload}
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
                        {t.retake}
                      </button>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <footer className="egr-form-footer">
                <button
                  type="submit"
                  className="egr-submit"
                  disabled={!canSubmit}
                >
                  {isSubmitting ? t.submitting : t.submit}
                </button>
                <p className="egr-footer-note">{t.footer}</p>
              </footer>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
