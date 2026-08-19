import React from 'react';
import { captureModeNeedsName, captureModeNeedsPhone, normalizeCaptureMode } from '../../../../lib/galleryEmailRegistration';
import './GalleryEmailGate.css';

export type CaptureFieldMode = 'email' | 'email_name' | 'email_name_phone';

export function GalleryEmailGate({
  collectionName,
  coverUrl,
  studioName,
  captureMode,
  saving,
  error,
  onSubmit,
}: {
  collectionName?: string | null;
  coverUrl?: string | null;
  studioName?: string | null;
  captureMode?: string | null;
  saving?: boolean;
  error?: string | null;
  onSubmit: (payload: { email: string; name: string; phone: string }) => void | Promise<void>;
}) {
  const mode = normalizeCaptureMode(captureMode);
  const askName = captureModeNeedsName(mode);
  const askPhone = captureModeNeedsPhone(mode);

  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');

  const lead = askPhone
    ? 'Your name, email and phone — once, then the gallery opens.'
    : askName
      ? 'Your name and email — once, then the gallery opens.'
      : 'Your email address — once, then the gallery opens.';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    void onSubmit({
      email: email.trim(),
      name: name.trim(),
      phone: phone.trim(),
    });
  };

  return (
    <div className="geg-page">
      <div className="geg-card">
        {coverUrl ? (
          <div className="geg-cover">
            <img src={coverUrl} alt="" />
          </div>
        ) : null}
        <p className="geg-kicker">{studioName || 'Gallery'}</p>
        <h1 className="geg-title">{collectionName || 'This gallery'}</h1>
        <p className="geg-lead">{lead}</p>

        <form className="geg-form" onSubmit={handleSubmit}>
          {askName ? (
            <label className="geg-field">
              <span>Name</span>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                required
              />
            </label>
          ) : null}

          <label className="geg-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@email.com"
              required
              autoFocus={!askName}
            />
          </label>

          {askPhone ? (
            <label className="geg-field">
              <span>Phone</span>
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="WhatsApp number"
                required
              />
            </label>
          ) : null}

          {error ? <p className="geg-error">{error}</p> : null}

          <button type="submit" className="geg-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>

        <p className="geg-hint">You will not be asked again on this device.</p>
      </div>
    </div>
  );
}
