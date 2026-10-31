import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { markOnboardingComplete } from '../hooks/useOnboardingGate';
import {
  OTHER_COUNTRY,
  PHONE_COUNTRIES,
  guessDefaultCountry,
  normalizePhoneNumber,
  prettifyAccountName,
  profileFlagEnabled,
  resolvePostOnboardingPath,
  splitFullName,
  splitStoredPhone,
  verifySavedOnboardingProfile,
} from '../lib/onboarding';
import './Onboarding.css';

const STEPS = [
  { key: 'name', label: 'About you' },
  { key: 'studio', label: 'Your studio' },
  { key: 'phone', label: 'Contact' },
];

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * First-run studio setup, shown once between login and the studio.
 *
 * Three questions only: name (pre-filled), studio name (skippable), mobile
 * (required). Phone is written with `show_phone: false` so it stays private.
 */
export default function Onboarding() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => ({
    fullName: prettifyAccountName(
      user?.user_metadata?.display_name || user?.user_metadata?.full_name || '',
    ),
    businessName: '',
    phone: '',
    country: guessDefaultCountry(),
    customDial: '',
    showPhone: false,
  }));
  const [profileLoading, setProfileLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [skipStudio, setSkipStudio] = useState(false);
  const [error, setError] = useState('');

  const nameRef = useRef(null);
  const studioRef = useRef(null);
  const phoneRef = useRef(null);
  const customDialRef = useRef(null);

  // Pre-fill from the profile (Google name, existing studio name, saved phone).
  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const profile = await galleryService.getPhotographerProfile(user.id);
        if (cancelled || !profile) return;
        setExistingProfile(profile);
        const storedPhone = splitStoredPhone(profile.phone);
        const profileName = [profile.first_name, profile.last_name]
          .filter(Boolean)
          .join(' ')
          || profile.display_name
          || '';
        setForm((prev) => ({
          ...prev,
          fullName: profileName ? prettifyAccountName(profileName) : prev.fullName,
          businessName: profile.business_name || prev.businessName,
          phone: storedPhone?.national || prev.phone,
          country: storedPhone?.country || prev.country,
          showPhone: profileFlagEnabled(profile.show_phone),
        }));
      } catch {
        // Keep the initial (metadata / browser-locale) values.
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Focus the active question, matching the one-question-at-a-time rhythm.
  useEffect(() => {
    if (profileLoading) return undefined;
    const timer = window.setTimeout(() => {
      if (step === 0) nameRef.current?.focus();
      else if (step === 1) studioRef.current?.focus();
      else if (step === 2) phoneRef.current?.focus();
    }, 90);
    return () => window.clearTimeout(timer);
  }, [step, profileLoading]);

  const activeCountry = useMemo(() => {
    if (form.country.iso !== 'OTHER') return form.country;
    const digits = String(form.customDial || '').replace(/\D/g, '').slice(0, 4);
    return { ...OTHER_COUNTRY, dial: digits ? `+${digits}` : '' };
  }, [form.country, form.customDial]);

  const phonePreview = useMemo(() => {
    if (!String(form.phone || '').trim()) return '';
    const checked = normalizePhoneNumber(form.phone, activeCountry);
    return checked.ok ? checked.e164 : '';
  }, [form.phone, activeCountry]);

  const firstName = useMemo(
    () => splitFullName(form.fullName).firstName,
    [form.fullName],
  );

  const updateField = (key, value) => {
    setError('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCountryChange = (iso) => {
    setError('');
    if (iso === 'OTHER') {
      setForm((prev) => ({ ...prev, country: OTHER_COUNTRY }));
      window.setTimeout(() => customDialRef.current?.focus(), 0);
      return;
    }
    const next = PHONE_COUNTRIES.find((country) => country.iso === iso) || PHONE_COUNTRIES[0];
    setForm((prev) => ({ ...prev, country: next, customDial: '' }));
  };

  const handleCustomDialChange = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
    setError('');
    setForm((prev) => ({ ...prev, customDial: digits ? `+${digits}` : '' }));
  };

  const validateStep = (index) => {
    if (index === 0) {
      const name = form.fullName.trim();
      if (name.length < 2) return 'Please tell us your name so clients know who you are.';
      if (name.length > 120) return 'That name is a little too long — please shorten it.';
    }
    if (index === 2) {
      const checked = normalizePhoneNumber(form.phone, activeCountry);
      if (!checked.ok) return checked.error;
    }
    return '';
  };

  const goBack = () => {
    if (saving) return;
    setError('');
    setStep((current) => Math.max(0, current - 1));
  };

  const skipStudioStep = () => {
    setError('');
    setSkipStudio(true);
    setStep(2);
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (saving) return;

    const stepError = validateStep(step);
    if (stepError) {
      setError(stepError);
      return;
    }

    if (step < STEPS.length - 1) {
      setError('');
      setStep(step + 1);
      return;
    }

    if (!user?.id) {
      setError('Your session expired. Please sign in again.');
      return;
    }

    const checkedPhone = normalizePhoneNumber(form.phone, activeCountry);
    if (!checkedPhone.ok) {
      setError(checkedPhone.error);
      return;
    }

    const { firstName: first, lastName: last } = splitFullName(form.fullName);
    const updates = {
      display_name: form.fullName.trim(),
      first_name: first,
      last_name: last || null,
      phone: checkedPhone.e164,
      show_phone: Boolean(form.showPhone),
    };
    if (form.country.iso !== 'OTHER' && !existingProfile?.business_country) {
      updates.business_country = form.country.name;
    }
    const timeZone = browserTimeZone();
    if (timeZone && !existingProfile?.time_zone) {
      updates.time_zone = timeZone;
    }
    if (!skipStudio && form.businessName.trim()) {
      updates.business_name = form.businessName.trim();
    }

    setSaving(true);
    setError('');

    try {
      const updatedProfile = await galleryService.updatePhotographerProfile(user.id, updates);

      // The PATCH response is the row read back from Cloudflare D1. Only mark
      // onboarding complete after those saved values match what we sent.
      const verified = verifySavedOnboardingProfile(updatedProfile, updates);
      if (!verified.ok) {
        throw new Error(verified.error);
      }

      // Keep the shared profile cache used by the dashboard/sidebar in sync.
      try {
        const key = `photographer_profile_${user.id}`;
        const raw = localStorage.getItem(key);
        const previous = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          key,
          JSON.stringify({ ...previous, ...updates, ...(updatedProfile || {}), id: user.id }),
        );
      } catch {
        /* private mode / quota */
      }

      markOnboardingComplete(user.id);
      try {
        await refresh?.();
      } catch {
        /* navigation should not depend on the metadata refresh */
      }

      navigate(resolvePostOnboardingPath(location.state?.from), { replace: true });
    } catch (err) {
      setError(err?.message || 'We could not save your details. Please try again.');
      setSaving(false);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await logout?.();
    } catch {
      /* best-effort */
    }
    navigate('/auth', { replace: true });
  };

  if (!user) return null;

  const stepStatus = (index) => {
    if (index < step) return 'done';
    if (index === step) return 'active';
    return 'todo';
  };

  return (
    <div className="onb-root">
      <header className="onb-topbar">
        <Link className="onb-brand" to="/" aria-label="PIXNXT home">
          PIXNXT
        </Link>

        <ol className="onb-steps" aria-label="Studio setup progress">
          {STEPS.map((item, index) => (
            <li
              key={item.key}
              className={`onb-step onb-step--${stepStatus(index)}`}
              aria-current={index === step ? 'step' : undefined}
            >
              <span className="onb-step-node" aria-hidden>
                {index < step ? <Check size={12} strokeWidth={3} /> : index + 1}
              </span>
              <span className="onb-step-label">{item.label}</span>
              {index < STEPS.length - 1 ? <span className="onb-step-line" aria-hidden /> : null}
            </li>
          ))}
        </ol>

        <span className="onb-account" title={`Signed in as ${user.email}`}>
          {user.email}
        </span>
      </header>

      <main className="onb-main">
        <section className="onb-panel" aria-live="polite">
          <p className="onb-kicker">
            Step {step + 1} of {STEPS.length}
            <span className="onb-kicker-dot" aria-hidden>·</span>
            {STEPS[step].label}
          </p>

          <div className="onb-step-panel" key={STEPS[step].key}>
            {step === 0 ? (
              <>
                <h1 className="onb-question">
                  First, what should we <strong>call you</strong>?
                </h1>
                <p className="onb-sub">
                  This is the name clients see on their galleries, downloads, and emails.
                </p>

                <form onSubmit={handleSubmit} noValidate>
                  <div className="onb-field">
                    <label className="onb-label" htmlFor="onb-name">Full name</label>
                    <input
                      ref={nameRef}
                      id="onb-name"
                      className="onb-input"
                      type="text"
                      value={form.fullName}
                      onChange={(event) => updateField('fullName', event.target.value)}
                      placeholder="e.g. Sam Rivera"
                      autoComplete="name"
                      autoCapitalize="words"
                      maxLength={120}
                      disabled={saving}
                    />
                  </div>

                  {error ? <p className="onb-error" role="alert">{error}</p> : null}

                  <div className="onb-actions">
                    <button type="submit" className="onb-continue" disabled={saving || profileLoading}>
                      {profileLoading ? <Loader2 className="onb-spin" size={18} /> : null}
                      Continue <ArrowRight size={17} />
                    </button>
                  </div>
                </form>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h1 className="onb-question">
                  {firstName ? `${firstName}, what's your` : "What's your"}{' '}
                  <strong>studio</strong> called?
                </h1>
                <p className="onb-sub">
                  Shown on your public page, invoices, and client emails. You can change it anytime.
                </p>

                <form onSubmit={handleSubmit} noValidate>
                  <div className="onb-field">
                    <label className="onb-label" htmlFor="onb-studio">Studio or business name</label>
                    <input
                      ref={studioRef}
                      id="onb-studio"
                      className="onb-input"
                      type="text"
                      value={form.businessName}
                      onChange={(event) => {
                        setSkipStudio(false);
                        updateField('businessName', event.target.value);
                      }}
                      placeholder="e.g. Bloom Studio"
                      autoComplete="organization"
                      maxLength={160}
                      disabled={saving}
                    />
                  </div>

                  {error ? <p className="onb-error" role="alert">{error}</p> : null}

                  <div className="onb-actions">
                    <button type="button" className="onb-back" onClick={goBack} disabled={saving}>
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button type="submit" className="onb-continue" disabled={saving}>
                      Continue <ArrowRight size={17} />
                    </button>
                    <button type="button" className="onb-skip" onClick={skipStudioStep} disabled={saving}>
                      I'll add this later
                    </button>
                  </div>
                </form>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h1 className="onb-question">
                  How can we <strong>reach you</strong>?
                </h1>
                <p className="onb-sub">
                  We use your number for account recovery and delivery updates. It stays private
                  unless you choose to show it.
                </p>

                <form onSubmit={handleSubmit} noValidate>
                  <div className="onb-field">
                    <label className="onb-label" htmlFor="onb-phone">Mobile number</label>
                    <div className="onb-phone-row">
                      <select
                        className="onb-select onb-country"
                        value={form.country.iso}
                        onChange={(event) => handleCountryChange(event.target.value)}
                        aria-label="Country"
                        disabled={saving}
                      >
                        {PHONE_COUNTRIES.map((country) => (
                          <option key={`${country.iso}-${country.dial}`} value={country.iso}>
                            {country.name} ({country.dial})
                          </option>
                        ))}
                        <option value="OTHER">Other country</option>
                      </select>

                      {form.country.iso === 'OTHER' ? (
                        <input
                          ref={customDialRef}
                          className="onb-input onb-dial"
                          type="tel"
                          inputMode="tel"
                          value={form.customDial}
                          onChange={(event) => handleCustomDialChange(event.target.value)}
                          placeholder="+1"
                          aria-label="Country calling code"
                          disabled={saving}
                        />
                      ) : null}

                      <input
                        ref={phoneRef}
                        id="onb-phone"
                        className="onb-input onb-phone-input"
                        type="tel"
                        inputMode="tel"
                        value={form.phone}
                        onChange={(event) => updateField('phone', event.target.value.replace(/[^\d\s()-]/g, ''))}
                        placeholder="98765 43210"
                        autoComplete="tel-national"
                        maxLength={24}
                        disabled={saving}
                      />
                    </div>
                    {phonePreview ? (
                      <p className="onb-help onb-help--saved">
                        We'll save <strong>{phonePreview}</strong>
                      </p>
                    ) : null}
                  </div>

                  <label className="onb-check">
                    <input
                      type="checkbox"
                      checked={Boolean(form.showPhone)}
                      onChange={(event) => updateField('showPhone', event.target.checked)}
                      disabled={saving}
                    />
                    <span>Show this number on my public portfolio</span>
                  </label>

                  {error ? <p className="onb-error" role="alert">{error}</p> : null}

                  <div className="onb-actions">
                    <button type="button" className="onb-back" onClick={goBack} disabled={saving}>
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button type="submit" className="onb-continue" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="onb-spin" size={18} /> Saving…
                        </>
                      ) : (
                        <>
                          Finish setup <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="onb-footer">
        <span className="onb-footer-note">
          <Lock size={12} /> Your details stay private. Change them anytime in Account settings.
        </span>
        <button type="button" className="onb-footer-link" onClick={handleSwitchAccount}>
          Use another account
        </button>
      </footer>
    </div>
  );
}
