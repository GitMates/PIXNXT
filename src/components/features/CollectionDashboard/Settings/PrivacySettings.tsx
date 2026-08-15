import React from 'react';
import { galleryService } from '../../../../services/gallery.service';
import { getCollectionShareUrl } from '../../../../lib/shareCollection';
import type { ClientExclusiveSetOption } from '../../ClientExclusiveAccess';
import {
  EyeIcon,
  GridIcon,
  LockIcon,
  SettingsCard,
  ToggleRow,
  displayHostPath,
  formatShortDate,
} from './settingsCardKit';
import './BasicsSettings.css';
import './SettingsCards.css';

export interface PrivacySettingsProps {
  collectionId: string;
  collection: any;
  setCollection: React.Dispatch<React.SetStateAction<any>>;
  collectionUrl: string;
  profile?: any;
  collectionPassword: string;
  setCollectionPassword: (val: string) => void;
  showOnShowcase: boolean;
  setShowOnShowcase: (val: boolean) => void;
  clientExclusiveAccess: boolean;
  setClientExclusiveAccess: (val: boolean) => void;
  clientPrivatePassword: string;
  setClientPrivatePassword: (val: string) => void;
  allowClientsMarkPrivate: boolean;
  setAllowClientsMarkPrivate: (val: boolean) => void;
  clientOnlyHighlights: boolean;
  setClientOnlyHighlights: (val: boolean) => void;
  clientOnlySets: ClientExclusiveSetOption[];
  onSetClientOnlyChange: (setId: string, isClientOnly: boolean) => void;
  emailRegistration: boolean;
  setEmailRegistration: (val: boolean) => void;
  downloadPin: boolean;
  pinValue: string;
  defaultWatermark: string;
  watermarks?: Array<{ id: string; name: string }>;
  onSelectWatermark: (name: string) => void;
  onManageWatermarks?: () => void;
}

function suggestPassword(slug: string) {
  const words = String(slug || 'gallery')
    .replace(/[^a-z0-9-]/gi, '')
    .split('-')
    .filter(Boolean)
    .slice(0, 2);
  const year = String(new Date().getFullYear()).slice(-2);
  return `${words.join('-') || 'gallery'}-${year}`;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  collectionId,
  collection,
  setCollection,
  collectionUrl,
  profile,
  collectionPassword,
  setCollectionPassword,
  showOnShowcase,
  setShowOnShowcase,
  clientExclusiveAccess,
  setClientExclusiveAccess,
  clientPrivatePassword,
  setClientPrivatePassword,
  allowClientsMarkPrivate,
  setAllowClientsMarkPrivate,
  clientOnlySets,
  emailRegistration,
  setEmailRegistration,
  downloadPin,
  pinValue,
  defaultWatermark,
  watermarks = [],
  onSelectWatermark,
  onManageWatermarks,
}) => {
  const [openCard, setOpenCard] = React.useState<string | null>(null);
  const [revealPassword, setRevealPassword] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [includePassword, setIncludePassword] = React.useState(collection?.share_include_password !== false);
  const [includePin, setIncludePin] = React.useState(collection?.share_include_pin !== false);
  const [repromptDays, setRepromptDays] = React.useState(Number(collection?.password_reprompt_days) || 0);

  React.useEffect(() => {
    setIncludePassword(collection?.share_include_password !== false);
    setIncludePin(collection?.share_include_pin !== false);
    setRepromptDays(Number(collection?.password_reprompt_days) || 0);
  }, [collection?.share_include_password, collection?.share_include_pin, collection?.password_reprompt_days]);

  const persist = async (patch: Record<string, unknown>) => {
    try {
      const updated = await galleryService.updateCollection(collectionId, patch);
      setCollection((prev: any) => (prev ? { ...prev, ...(updated || patch) } : prev));
    } catch (err) {
      console.error('Failed to save access setting:', err);
    }
  };

  const shareUrl = getCollectionShareUrl(collectionUrl, profile);
  const shareHostPath = displayHostPath(shareUrl);
  const coverUrl = collection?.cover_url || '';
  const passwordOn = Boolean(collectionPassword);
  const studioName = profile?.business_name || profile?.display_name || 'Your studio';
  const eventLabel = formatShortDate(collection?.event_date);
  const watermarkName = defaultWatermark && defaultWatermark !== 'No watermark' ? defaultWatermark : '';
  const hiddenSets = clientOnlySets.filter((item) => item.isClientOnly).length;

  const toggleCard = (id: string) => setOpenCard((current) => (current === id ? null : id));

  const togglePassword = (next: boolean) => {
    setCollectionPassword(next ? suggestPassword(collectionUrl) : '');
    if (!next) setRevealPassword(false);
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(collectionPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const openingSummary = passwordOn ? (
    <>
      Closed. Visitors type <strong>{collectionPassword}</strong> before they see anything — except guests
      arriving through a QR registration, who are let straight in.
    </>
  ) : (
    <>
      Open. <strong>Anyone with the link</strong> can view it. Nothing is asked of them.
    </>
  );

  const watermarkSummary = watermarkName ? (
    <>
      <strong>{watermarkName}</strong> is stamped on every photograph shown and downloaded.
    </>
  ) : (
    <>
      No mark. Photographs are shown and downloaded <strong>exactly as you exported them</strong>.
    </>
  );

  const whereSummary = (
    <>
      {showOnShowcase ? (
        <>Listed on your <strong>Showcase</strong>.</>
      ) : (
        <>Not listed on your <strong>Showcase</strong>.</>
      )}{' '}
      {hiddenSets > 0 ? (
        <>
          <strong>{hiddenSets} set{hiddenSets === 1 ? ' is' : 's are'}</strong> hidden from the client.
        </>
      ) : (
        'Every set is visible to the client.'
      )}
    </>
  );

  const shareMessage = (
    <div className="cd-basics-msg">
      <p>Your photographs{eventLabel ? ` from ${eventLabel}` : ''} are ready.</p>
      <p className="cd-basics-msg__link">{shareHostPath}</p>
      {passwordOn && includePassword ? (
        <p>Password to view: <strong>{collectionPassword}</strong></p>
      ) : null}
      {downloadPin && includePin && pinValue ? (
        <p>PIN to download: <strong>{pinValue}</strong></p>
      ) : null}
      <p className="cd-basics-msg__sign">— {studioName}</p>
    </div>
  );

  return (
    <div className="cd-general-settings-view cd-basics">
      <header className="cd-basics__header">
        <h2 className="cd-basics__title">Access</h2>
        <p className="cd-basics__kicker">this delivery</p>
        <p className="cd-basics__lead">
          Three decisions about who gets in and what they see when they do.
        </p>
      </header>

      <div className="cd-basics__cards">
        <SettingsCard
          id="open"
          openId={openCard}
          onToggle={toggleCard}
          title="Opening the gallery"
          summary={openingSummary}
          icon={(
            <span className={`cd-basics-card__icon ${passwordOn ? 'cd-basics-card__icon--muted' : 'cd-basics-card__icon--cover'}`}>
              {coverUrl && !passwordOn ? <img src={coverUrl} alt="" /> : null}
              {passwordOn ? (
                <span style={{ color: '#8a8278' }}><LockIcon size={14} /></span>
              ) : null}
              <span className="cd-basics-card__brand">{passwordOn ? 'Password' : 'Open'}</span>
            </span>
          )}
        >
          <div className="cd-basics-toggles">
            <ToggleRow
              title="Require a password"
              desc="Visitors type it once before they see anything. Guests arriving through a QR registration are let in without it."
              checked={passwordOn}
              onChange={togglePassword}
            />
          </div>

          {passwordOn ? (
            <>
              <div className="cd-basics-field" style={{ marginTop: 18 }}>
                <span className="cd-basics-label">Password</span>
                <div className="cd-basics-input-row">
                  <input
                    type={revealPassword ? 'text' : 'password'}
                    className="cd-basics-input"
                    value={collectionPassword}
                    onChange={(e) => setCollectionPassword(e.target.value)}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="cd-basics-iconbtn"
                    aria-label={revealPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setRevealPassword((v) => !v)}
                  >
                    <EyeIcon off={revealPassword} />
                  </button>
                  <button type="button" className="cd-basics-btn" onClick={copyPassword}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    className="cd-basics-btn"
                    onClick={() => setCollectionPassword(suggestPassword(collectionUrl))}
                  >
                    Generate
                  </button>
                </div>
                <p className="cd-basics-hint">Changing it locks out anyone still using the old one.</p>
              </div>

              <div className="cd-basics-toggles">
                <ToggleRow
                  title="Ask again after 30 days"
                  desc="Visitors re-enter the password after a month."
                  checked={repromptDays === 30}
                  onChange={(next) => {
                    const days = next ? 30 : 0;
                    setRepromptDays(days);
                    void persist({ password_reprompt_days: days });
                  }}
                />
              </div>
            </>
          ) : null}

          <span className="cd-basics-caplabel">What the share message says</span>
          {shareMessage}

          <div className="cd-basics-toggles" style={{ marginTop: 16 }}>
            {passwordOn ? (
              <ToggleRow
                title="Include the password"
                desc="They still have to type it, so a forwarded link on its own gets nobody in."
                checked={includePassword}
                onChange={(next) => {
                  setIncludePassword(next);
                  void persist({ share_include_password: next });
                }}
              />
            ) : null}
            <ToggleRow
              title="Include the download PIN"
              desc="Same again, for the PIN set under Downloads."
              checked={includePin}
              onChange={(next) => {
                setIncludePin(next);
                void persist({ share_include_pin: next });
              }}
            />
          </div>
          <p className="cd-basics-hint">
            {downloadPin
              ? 'Turn these off and you can send the credentials separately — by phone, or in a second message.'
              : 'No download PIN is set yet — turn one on under Downloads and it will appear here.'}
          </p>
        </SettingsCard>

        <SettingsCard
          id="watermark"
          openId={openCard}
          onToggle={toggleCard}
          title="Watermark"
          summary={watermarkSummary}
          icon={(
            <span className="cd-basics-card__icon cd-basics-card__icon--cover">
              {coverUrl ? <img src={coverUrl} alt="" /> : null}
              <span className="cd-basics-card__brand">{watermarkName || 'None'}</span>
            </span>
          )}
        >
          <div className="cd-basics-field">
            <span className="cd-basics-label">Watermark</span>
            <div className="cd-basics-pills">
              <button
                type="button"
                className={`cd-basics-pill${watermarkName ? '' : ' is-on'}`}
                onClick={() => onSelectWatermark('No watermark')}
              >
                No watermark
              </button>
              {watermarks.map((item) => (
                <button
                  key={item.id || item.name}
                  type="button"
                  className={`cd-basics-pill${watermarkName === item.name ? ' is-on' : ''}`}
                  onClick={() => onSelectWatermark(item.name)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <p className="cd-basics-hint">
              Applied to photographs as the gallery shows them. Your originals are never touched.
            </p>
          </div>

          {onManageWatermarks ? (
            <div className="cd-basics-actions-row">
              <button type="button" className="cd-basics-btn" onClick={onManageWatermarks}>
                Manage watermarks
              </button>
            </div>
          ) : null}
        </SettingsCard>

        <SettingsCard
          id="where"
          openId={openCard}
          onToggle={toggleCard}
          title="Where it appears"
          summary={whereSummary}
          icon={(
            <span className="cd-basics-card__icon">
              <GridIcon variant="alt" />
            </span>
          )}
        >
          <div className="cd-basics-toggles">
            <ToggleRow
              title="Show on Showcase"
              desc="List this delivery on your public page."
              checked={showOnShowcase}
              onChange={setShowOnShowcase}
            />
            <ToggleRow
              title="Client exclusive access"
              desc="Your client gets private sets and can mark photos private from everyone else."
              checked={clientExclusiveAccess}
              onChange={setClientExclusiveAccess}
            />
            <ToggleRow
              title="Record who opens it"
              desc="Log email addresses accessing this delivery. Needed if you want favourites attributed to a person."
              checked={emailRegistration}
              onChange={setEmailRegistration}
            />
          </div>

          {clientExclusiveAccess ? (
            <div className="cd-basics-field" style={{ marginTop: 18 }}>
              <span className="cd-basics-label">Client password</span>
              <div className="cd-basics-input-row">
                <input
                  type="text"
                  className="cd-basics-input"
                  value={clientPrivatePassword}
                  placeholder="A password only your client knows"
                  onChange={(e) => setClientPrivatePassword(e.target.value)}
                />
                <button
                  type="button"
                  className="cd-basics-btn"
                  onClick={() => setClientPrivatePassword(suggestPassword(`${collectionUrl}-client`))}
                >
                  Generate
                </button>
              </div>
              <div className="cd-basics-toggles" style={{ marginTop: 14 }}>
                <ToggleRow
                  title="Client can mark photos private"
                  desc="Anything they mark disappears for everyone else."
                  checked={allowClientsMarkPrivate}
                  onChange={setAllowClientsMarkPrivate}
                />
              </div>
            </div>
          ) : null}

          <p className="cd-basics-hint">
            Hiding an individual set is done from its ··· menu in the left pane, not here.
          </p>
        </SettingsCard>
      </div>
    </div>
  );
};
