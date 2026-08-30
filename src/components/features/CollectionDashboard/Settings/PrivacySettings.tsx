import React from 'react';
import { createPortal } from 'react-dom';
import { persistDeliverySettings } from '../../../../lib/deliverySettingsSync';
import { galleryService } from '../../../../services/gallery.service';
import { getCollectionShareUrl, getQrCodeImageUrl } from '../../../../lib/shareCollection';
import { getGuestRegistrationUrl } from '../../../../lib/guestDeliveryLinks';
import { guestDeliveryService } from '../../../../services/guestDelivery.service';
import type { ClientExclusiveSetOption } from '../../ClientExclusiveAccess';
import {
  EyeIcon,
  LockIcon,
  Toggle,
  displayHostPath,
  formatShortDate,
} from './settingsCardKit';
import './BasicsSettings.css';
import './SettingsCards.css';
import './DownloadSettings.css';

type AccessTab = 'password' | 'email' | 'guest' | 'watermark';

type CaptureFieldMode = 'email' | 'email_name' | 'email_name_phone';
type ReachChannel = 'both' | 'email' | 'whatsapp';

const CAPTURE_FIELD_OPTIONS: { id: CaptureFieldMode; label: string; desc: string }[] = [
  { id: 'email', label: 'Email address', desc: 'One field. The most people get through.' },
  { id: 'email_name', label: 'Email and name', desc: 'Lets you greet them by name in messages.' },
  { id: 'email_name_phone', label: 'Email, name and phone', desc: 'WhatsApp becomes possible. Fewest people finish it.' },
];

const REACH_OPTIONS: { id: ReachChannel; label: string; desc?: string }[] = [
  { id: 'both', label: 'WhatsApp, email as fallback', desc: 'WhatsApp costs more per message than the face matching does.' },
  { id: 'email', label: 'Email only' },
  { id: 'whatsapp', label: 'WhatsApp only' },
];

const FORM_LANGUAGES = [
  { id: 'en', label: 'English', locked: true },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'ta', label: 'தமிழ்' },
];

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
  watermarks?: Array<{ id: string; name: string; position?: string; text?: string }>;
  onSelectWatermark: (name: string) => void;
  onManageWatermarks?: () => void;
  gdEvent?: any;
  guestDeliveryGuests?: any[];
  photographerId?: string;
  onGdEventUpdated?: (event: any) => void;
  onOpenGdQrModal?: () => void;
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

function displayRegistrationPath(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/register\/?$/i, '').replace(/\/+$/, '');
    return `${parsed.host}${path}`;
  } catch {
    return displayHostPath(url);
  }
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg width="20" height="16" viewBox="0 0 24 24" fill="none" stroke="#a39a92" strokeWidth="1.6" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function AskedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c46a3a" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </svg>
  );
}

function MasterRow({
  title,
  desc,
  checked,
  onChange,
  label,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <div className={`cd-dl-master${checked ? ' is-on' : ''}`}>
      <Row
        title={title}
        desc={desc}
        control={<Toggle checked={checked} onChange={onChange} label={label} />}
      />
    </div>
  );
}

const POP_WIDTH = 320;
const VIEWPORT_PAD = 12;
const POP_GAP = 8;

function useAnchoredMenu(optionCount: number, hasFoot: boolean) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const popRef = React.useRef<HTMLDivElement>(null);
  const [popStyle, setPopStyle] = React.useState<React.CSSProperties>({});

  const updatePosition = React.useCallback(() => {
    const btn = btnRef.current;
    const pop = popRef.current;
    if (!btn) return;

    const btnRect = btn.getBoundingClientRect();
    const popHeight = pop?.offsetHeight || 44 + optionCount * 54 + (hasFoot ? 52 : 0);
    const maxHeight = window.innerHeight - VIEWPORT_PAD * 2;
    const height = Math.min(popHeight, maxHeight);

    let top = btnRect.bottom + POP_GAP;
    if (top + height > window.innerHeight - VIEWPORT_PAD) {
      top = btnRect.top - POP_GAP - height;
    }
    top = Math.max(VIEWPORT_PAD, Math.min(top, window.innerHeight - height - VIEWPORT_PAD));

    let left = btnRect.right - POP_WIDTH;
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - POP_WIDTH - VIEWPORT_PAD));

    setPopStyle({
      position: 'fixed',
      top,
      left,
      width: POP_WIDTH,
      maxHeight,
      overflowY: 'auto',
      zIndex: 10000,
    });
  }, [optionCount, hasFoot]);

  React.useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  React.useLayoutEffect(() => {
    if (!open || !popRef.current) return undefined;
    const pop = popRef.current;
    updatePosition();
    const ro = new ResizeObserver(() => updatePosition());
    ro.observe(pop);
    return () => ro.disconnect();
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!wrapRef.current?.contains(target) && !popRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return { open, setOpen, wrapRef, btnRef, popRef, popStyle };
}

function Row({
  title,
  desc,
  control,
  footnote,
}: {
  title: string;
  desc?: string;
  control: React.ReactNode;
  footnote?: string;
}) {
  return (
    <>
      <div className="cd-dl-row">
        <div className="cd-dl-row__copy">
          <p className="cd-dl-row__title">{title}</p>
          {desc ? <p className="cd-dl-row__desc">{desc}</p> : null}
        </div>
        <div className="cd-dl-row__control">{control}</div>
      </div>
      {footnote ? <p className="cd-dl-foot">{footnote}</p> : null}
    </>
  );
}

function RadioMenu({
  value,
  options,
  header,
  onChange,
  foot,
  pill,
}: {
  value: string;
  options: { id: string; label: string; desc?: string }[];
  header: string;
  onChange: (id: string) => void;
  foot?: string;
  pill?: boolean;
}) {
  const { open, setOpen, wrapRef, btnRef, popRef, popStyle } = useAnchoredMenu(
    options.length,
    Boolean(foot),
  );
  const label = options.find((item) => item.id === value)?.label || value;

  const popContent = (
    <div
      ref={popRef}
      className="cd-dl-pop cd-dl-pop--fixed"
      style={popStyle}
      role="listbox"
    >
      <p className="cd-dl-pop__head">{header}</p>
      {options.map((item) => (
        <button
          key={item.id}
          type="button"
          className="cd-dl-opt"
          onClick={() => {
            onChange(item.id);
            setOpen(false);
          }}
        >
          <span className={`cd-dl-radio${item.id === value ? ' is-on' : ''}`} />
          <span className="cd-dl-opt__copy">
            <span className="cd-dl-opt__title">{item.label}</span>
            {item.desc ? <span className="cd-dl-opt__desc">{item.desc}</span> : null}
          </span>
        </button>
      ))}
      {foot ? <p className="cd-dl-pop__foot">{foot}</p> : null}
    </div>
  );

  return (
    <div className={`cd-dl-select${open ? ' is-open' : ''}`} ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={`cd-dl-select__btn${pill ? ' cd-dl-select__btn--pill' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <ChevronDown />
      </button>
      {open ? createPortal(popContent, document.body) : null}
    </div>
  );
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  collectionId,
  collection,
  setCollection,
  collectionUrl,
  profile,
  collectionPassword,
  setCollectionPassword,
  clientExclusiveAccess,
  setClientExclusiveAccess,
  clientPrivatePassword,
  setClientPrivatePassword,
  allowClientsMarkPrivate,
  setAllowClientsMarkPrivate,
  emailRegistration,
  setEmailRegistration,
  downloadPin,
  pinValue,
  defaultWatermark,
  watermarks = [],
  onSelectWatermark,
  onManageWatermarks,
  gdEvent,
  guestDeliveryGuests = [],
  photographerId,
  onGdEventUpdated,
  onOpenGdQrModal,
}) => {
  const guestDeliveryOn = Boolean(collection?.guest_delivery_enabled);
  const [activeTab, setActiveTab] = React.useState<AccessTab>('password');
  const [revealPassword, setRevealPassword] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [includePassword, setIncludePassword] = React.useState(collection?.share_include_password !== false);
  const [includePin, setIncludePin] = React.useState(collection?.share_include_pin !== false);
  const [repromptDays, setRepromptDays] = React.useState(Number(collection?.password_reprompt_days) || 0);
  const [captureMode, setCaptureMode] = React.useState<CaptureFieldMode>(
    (collection?.email_capture_mode as CaptureFieldMode) || 'email',
  );
  const [guestPrints, setGuestPrints] = React.useState(collection?.guest_prints_enabled !== false);
  const [savingReg, setSavingReg] = React.useState(false);
  const [acceptingOverride, setAcceptingOverride] = React.useState<boolean | null>(null);

  const eventSettings = gdEvent?.settings || {};
  const [reachChannel, setReachChannel] = React.useState<ReachChannel>(eventSettings.reach_channel || 'both');
  const [askSelfie, setAskSelfie] = React.useState(eventSettings.ask_selfie !== false);
  const [promiseTimeline, setPromiseTimeline] = React.useState(eventSettings.promise_timeline !== false);
  const [deliveryDays, setDeliveryDays] = React.useState(String(eventSettings.delivery_days || 14));
  const languages = Array.isArray(eventSettings.languages) && eventSettings.languages.length
    ? eventSettings.languages
    : ['en'];

  React.useEffect(() => {
    setIncludePassword(collection?.share_include_password !== false);
    setIncludePin(collection?.share_include_pin !== false);
    setRepromptDays(Number(collection?.password_reprompt_days) || 0);
    setCaptureMode((collection?.email_capture_mode as CaptureFieldMode) || 'email');
    setGuestPrints(collection?.guest_prints_enabled !== false);
  }, [
    collection?.share_include_password,
    collection?.share_include_pin,
    collection?.password_reprompt_days,
    collection?.email_capture_mode,
    collection?.guest_prints_enabled,
  ]);

  React.useEffect(() => {
    setReachChannel(eventSettings.reach_channel || 'both');
    setAskSelfie(eventSettings.ask_selfie !== false);
    setPromiseTimeline(eventSettings.promise_timeline !== false);
    setDeliveryDays(String(eventSettings.delivery_days || 14));
  }, [gdEvent?.id, eventSettings.reach_channel, eventSettings.ask_selfie, eventSettings.promise_timeline, eventSettings.delivery_days]);

  React.useEffect(() => {
    setAcceptingOverride(null);
  }, [gdEvent?.id, gdEvent?.registration_enabled]);

  React.useEffect(() => {
    if (!guestDeliveryOn && activeTab === 'guest') setActiveTab('password');
  }, [guestDeliveryOn, activeTab]);

  const persist = async (patch: Record<string, unknown>) => {
    await persistDeliverySettings(collectionId, collection?.slug, patch, setCollection);
  };

  const persistEventSettings = async (settingsPatch: Record<string, unknown>, updates: Record<string, unknown> = {}) => {
    if (!gdEvent?.id || !photographerId) {
      throw new Error('Guest delivery event is not ready yet.');
    }
    const payload: Record<string, unknown> = { ...updates };
    if (Object.keys(settingsPatch).length > 0) {
      payload.settings = { ...(gdEvent.settings || {}), ...settingsPatch };
    }
    const updated = await guestDeliveryService.updateEvent(photographerId, gdEvent.id, payload);
    onGdEventUpdated?.(updated);
    return updated;
  };

  const shareUrl = getCollectionShareUrl(collectionUrl, profile);
  const shareHostPath = displayHostPath(shareUrl);
  const passwordOn = Boolean(collectionPassword);
  const studioName = profile?.business_name || profile?.display_name || 'Your studio';
  const eventLabel = formatShortDate(collection?.event_date);
  const coverUrl = collection?.cover_url || '';
  const watermarkName = defaultWatermark && defaultWatermark !== 'No watermark' ? defaultWatermark : '';
  const acceptingRegistrations = acceptingOverride ?? (gdEvent?.registration_enabled !== false);
  const registered = guestDeliveryGuests.length || Number(gdEvent?.guest_count) || 0;
  const matched = guestDeliveryGuests.filter((g) => Number(g.matched_photo_count) > 0).length;
  const registrationUrl = gdEvent?.slug ? getGuestRegistrationUrl(gdEvent.slug, profile) : '';
  const registrationPath = registrationUrl ? displayRegistrationPath(registrationUrl) : '';
  const qrThumb = registrationUrl ? getQrCodeImageUrl(registrationUrl, 72) : '';

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

  const toggleAcceptingRegistrations = async (next?: boolean) => {
    if (savingReg) return;
    if (!gdEvent?.id || !photographerId) {
      alert('Registration settings are not ready yet. Try again in a moment.');
      return;
    }
    const target = next ?? !acceptingRegistrations;
    setAcceptingOverride(target);
    setSavingReg(true);
    try {
      const updated = await guestDeliveryService.setRegistrationEnabled(photographerId, gdEvent.id, target);
      onGdEventUpdated?.(updated);
      setAcceptingOverride(null);
    } catch (err) {
      console.error(err);
      setAcceptingOverride(null);
      alert('Could not update registration. Please try again.');
    } finally {
      setSavingReg(false);
    }
  };

  const toggleLanguage = async (id: string) => {
    if (id === 'en') return;
    const next = languages.includes(id)
      ? languages.filter((lang: string) => lang !== id)
      : [...languages, id];
    if (!next.includes('en')) next.unshift('en');
    try {
      await persistEventSettings({ languages: next });
    } catch (err) {
      console.error(err);
    }
  };

  const passwordSummary = passwordOn ? (
    <>
      Closed. Visitors type <strong>{collectionPassword}</strong> before they see anything — except guests
      arriving through a QR registration, who are let straight in.
    </>
  ) : (
    <>
      Open. <strong>Anyone with the link</strong> can view it.
    </>
  );

  const emailSummary = emailRegistration ? (
    captureMode === 'email_name_phone' ? (
      <>Visitors give a <strong>name, email and phone</strong> once, before they see the gallery.</>
    ) : captureMode === 'email_name' ? (
      <>Visitors give a <strong>name and email</strong> once, before they see the gallery.</>
    ) : (
      <>Visitors give an <strong>email address</strong> once, before they see the gallery.</>
    )
  ) : (
    <>
      Nobody is asked who they are. Favourites and downloads are <strong>anonymous</strong>.
    </>
  );

  const guestSummary = acceptingRegistrations ? (
    <>
      Registration is <strong>open</strong>. {registered.toLocaleString()} guest{registered === 1 ? '' : 's'}
      {matched > 0 ? (
        <>, {matched.toLocaleString()} matched to their own photographs.</>
      ) : (
        '.'
      )}
    </>
  ) : (
    <>Registration is <strong>closed</strong>. Nobody new can scan in.</>
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

  const tabs: { id: AccessTab; label: string; show?: boolean }[] = [
    { id: 'password', label: 'Password' },
    { id: 'email', label: 'Email registration' },
    { id: 'guest', label: 'Guest Delivery', show: guestDeliveryOn },
    { id: 'watermark', label: 'Watermark' },
  ];

  return (
    <div className="cd-general-settings-view cd-basics cd-dl">
      <header className="cd-basics__header">
        <h2 className="cd-basics__title">Access</h2>
        <p className="cd-basics__kicker">this delivery</p>
        <p className="cd-basics__lead">
          Who gets in, and what they see when they do.
        </p>
      </header>

      <div className={`cd-dl-shell${activeTab === 'password' ? ' is-first' : ''}`}>
        <div className="cd-dl-tabs" role="tablist">
          {tabs.filter((tab) => tab.show !== false).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`cd-dl-tab${activeTab === tab.id ? ' is-on' : ''}`}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="cd-dl-box">
          {activeTab === 'password' && (
            <>
              <div className="cd-dl-status">
                <div className="cd-basics-card-badge">
                  {passwordOn ? (
                    <>
                      <span style={{ color: '#8a8278' }}><LockIcon size={16} /></span>
                      <span className="cd-basics-card-badge__text">Password</span>
                    </>
                  ) : (
                    <span className="cd-basics-card-badge__text">Open</span>
                  )}
                </div>
                <div className="cd-dl-status__copy">
                  <h3 className="cd-dl-status__title">Password</h3>
                  <p className="cd-dl-status__desc">{passwordSummary}</p>
                </div>
              </div>

              <MasterRow
                title="Require a password to view"
                desc="Typed once, before they see anything. Guests arriving through a QR registration are let in without it."
                checked={passwordOn}
                onChange={togglePassword}
                label="Require a password to view"
              />

              <div className="cd-dl-body">
                {passwordOn ? (
                  <div className="cd-dl-card">
                    <div className="cd-dl-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
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
                    <Row
                      title="Ask again after 30 days"
                      desc="Visitors re-enter the password after a month."
                      control={(
                        <Toggle
                          checked={repromptDays === 30}
                          onChange={(next) => {
                            const days = next ? 30 : 0;
                            setRepromptDays(days);
                            void persist({ password_reprompt_days: days });
                          }}
                          label="Ask again after 30 days"
                        />
                      )}
                    />
                  </div>
                ) : null}

                <p className="cd-dl-section__label" style={{ marginTop: 12 }}>What the share message says</p>
                <div className="cd-dl-card">
                  <div className="cd-dl-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                    <p className="cd-dl-row__title">Preview</p>
                    <p className="cd-dl-row__desc">
                      Anything you switch on is written into the message as text, so they can read it and type it in.
                    </p>
                  </div>
                  <div className="cd-dl-share-preview">{shareMessage}</div>
                  {passwordOn ? (
                    <Row
                      title="Include the password"
                      desc="They still have to type it, so a forwarded link on its own gets nobody in."
                      control={(
                        <Toggle
                          checked={includePassword}
                          onChange={(next) => {
                            setIncludePassword(next);
                            void persist({ share_include_password: next });
                          }}
                          label="Include the password"
                        />
                      )}
                    />
                  ) : null}
                  <Row
                    title="Include the download PIN"
                    desc="Set under Downloads."
                    control={(
                      <Toggle
                        checked={includePin}
                        onChange={(next) => {
                          setIncludePin(next);
                          void persist({ share_include_pin: next });
                        }}
                        label="Include the download PIN"
                      />
                    )}
                  />
                </div>

                <p className="cd-dl-section__label" style={{ marginTop: 28 }}>Client access</p>
                <div className="cd-dl-card">
                  <Row
                    title="Client exclusive access"
                    desc="Your client gets private sets and can mark photos private from everyone else."
                    control={(
                      <Toggle
                        checked={clientExclusiveAccess}
                        onChange={(next) => {
                          setClientExclusiveAccess(next);
                          void persist({
                            client_exclusive_enabled: next,
                            privacy: next ? 'client_exclusive' : 'public',
                          });
                        }}
                        label="Client exclusive access"
                      />
                    )}
                  />
                  {clientExclusiveAccess ? (
                    <>
                      <div className="cd-dl-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
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
                      </div>
                      <Row
                        title="Client can mark photos private"
                        desc="Anything they mark disappears for everyone else."
                        control={(
                          <Toggle
                            checked={allowClientsMarkPrivate}
                            onChange={(next) => {
                              setAllowClientsMarkPrivate(next);
                              void persist({ allow_clients_mark_private: next });
                            }}
                            label="Client can mark photos private"
                          />
                        )}
                      />
                    </>
                  ) : null}
                </div>
              </div>
            </>
          )}

          {activeTab === 'email' && (
            <>
              <div className="cd-dl-status">
                <div className="cd-basics-card-badge">
                  {emailRegistration ? <AskedIcon /> : <EnvelopeIcon />}
                  <span className="cd-basics-card-badge__text">
                    {emailRegistration ? 'Asked' : 'Anonymous'}
                  </span>
                </div>
                <div className="cd-dl-status__copy">
                  <h3 className="cd-dl-status__title">Email registration</h3>
                  <p className="cd-dl-status__desc">{emailSummary}</p>
                </div>
              </div>

              <MasterRow
                title="Ask visitors who they are"
                desc="A one-screen form before the gallery opens. This is what turns anonymous traffic into a contact list, and it is the only way a favourite can be attributed to a person."
                checked={emailRegistration}
                onChange={setEmailRegistration}
                label="Ask visitors who they are"
              />

              {!emailRegistration ? (
                <div className="cd-dl-callout">
                  <p>
                    <strong>Worth knowing what you give up.</strong>{' '}
                    With this off you cannot attribute a favourite to a person, you build no contact list, and Activity
                    can only show that <em>somebody</em> opened the gallery.
                  </p>
                </div>
              ) : null}

              {emailRegistration ? (
                <div className="cd-dl-body">
                  <div className="cd-dl-card cd-dl-card--menu">
                    <Row
                      title="What you ask for"
                      desc="Every extra field costs you people who cannot be bothered."
                      control={(
                        <RadioMenu
                          value={captureMode}
                          options={CAPTURE_FIELD_OPTIONS}
                          header="What you ask for"
                          pill
                          onChange={(next) => {
                            setCaptureMode(next as CaptureFieldMode);
                            void persist({ email_capture_mode: next });
                          }}
                        />
                      )}
                    />
                  </div>

                  <div className="cd-dl-info-banner">
                    <p>
                      The rest is handled for you. Your client and anyone who registered by QR are never asked twice.
                      Everyone who does register is added to <strong>Contacts</strong> in your Profile, tagged with this
                      delivery, and is not asked again on that device.
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {activeTab === 'guest' && guestDeliveryOn && (
            <>
              <div className="cd-dl-status">
                <div className="cd-basics-card-badge">
                  {qrThumb ? (
                    <img src={qrThumb} alt="" className="cd-dl-qr-thumb" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a39a92" strokeWidth="1.6" aria-hidden>
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" />
                    </svg>
                  )}
                </div>
                <div className="cd-dl-status__copy">
                  <h3 className="cd-dl-status__title">Guest Delivery</h3>
                  <p className="cd-dl-status__desc">{guestSummary}</p>
                </div>
              </div>

              <MasterRow
                title="Accepting registrations"
                desc="Guests scan the QR at the venue, leave a name and a selfie, and get only their own photographs."
                checked={acceptingRegistrations}
                onChange={(next) => void toggleAcceptingRegistrations(next)}
                label="Accepting registrations"
              />

              <div className={`cd-dl-body${acceptingRegistrations ? '' : ' cd-dl-muted'}`}>
                <p className="cd-dl-section__label">The code</p>
                <div className="cd-dl-code-panel">
                  <p className="cd-dl-code-panel__url">{registrationPath || 'Registration link not ready yet'}</p>
                  <p className="cd-dl-code-panel__desc">Print it on a standee, a table card, or a screen at the entrance.</p>
                  <div className="cd-dl-code-panel__actions">
                    {qrThumb ? <img src={qrThumb} alt="" className="cd-dl-code-panel__qr" /> : null}
                    <button
                      type="button"
                      className="cd-dl-code-panel__btn"
                      onClick={onOpenGdQrModal}
                      disabled={!gdEvent}
                    >
                      QR and print templates
                    </button>
                  </div>
                </div>

                <p className="cd-dl-section__label">The form</p>
                <div className="cd-dl-card">
                  <Row
                    title="Languages offered"
                    control={(
                      <div className="cd-dl-lang-pills">
                        {FORM_LANGUAGES.map((lang) => {
                          const active = languages.includes(lang.id);
                          return (
                            <button
                              key={lang.id}
                              type="button"
                              className={`cd-dl-lang-pill${active ? ' is-on' : ''}${lang.locked ? ' is-locked' : ''}`}
                              onClick={() => void toggleLanguage(lang.id)}
                              disabled={lang.locked}
                            >
                              {active || lang.locked ? lang.label : `+ ${lang.label}`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                  <Row
                    title="Reach them by"
                    desc="WhatsApp costs more per message than the face matching does."
                    control={(
                      <RadioMenu
                        value={reachChannel}
                        options={REACH_OPTIONS}
                        header="Reach them by"
                        foot="WhatsApp costs more per message than the face matching does."
                        onChange={(next) => {
                          setReachChannel(next as ReachChannel);
                          void persistEventSettings({ reach_channel: next });
                        }}
                      />
                    )}
                  />
                  <Row
                    title="Ask for a selfie"
                    desc="Without one there is nothing to match against, and the guest gets the whole gallery instead of their own set."
                    control={(
                      <Toggle
                        checked={askSelfie}
                        onChange={(next) => {
                          setAskSelfie(next);
                          void persistEventSettings({ ask_selfie: next });
                        }}
                        label="Ask for a selfie"
                      />
                    )}
                  />
                  <Row
                    title="Promise a timeline"
                    desc={'The form reads "Your photographs arrive within 14 days". Guests who know when to expect them do not message you asking.'}
                    control={(
                      <Toggle
                        checked={promiseTimeline}
                        onChange={(next) => {
                          setPromiseTimeline(next);
                          void persistEventSettings({ promise_timeline: next });
                        }}
                        label="Promise a timeline"
                      />
                    )}
                  />
                  {promiseTimeline ? (
                    <div className="cd-dl-children">
                      <div className="cd-dl-child">
                        <div className="cd-dl-row__copy">
                          <p className="cd-dl-row__title">Within</p>
                        </div>
                        <div className="cd-dl-row__control">
                          <div className="cd-dl-days-field">
                            <input
                              type="number"
                              min={1}
                              max={90}
                              className="cd-dl-days-field__input"
                              value={deliveryDays}
                              onChange={(e) => setDeliveryDays(e.target.value)}
                              onBlur={() => {
                                const days = Math.max(1, Number(deliveryDays) || 14);
                                setDeliveryDays(String(days));
                                void persistEventSettings({ delivery_days: days });
                              }}
                            />
                            <span>days</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <p className="cd-dl-section__label">Afterwards</p>
                <div className="cd-dl-card">
                  <Row
                    title="Offer prints to guests"
                    desc={'\'Take these home\' appears on each guest\'s own photographs.'}
                    control={(
                      <Toggle
                        checked={guestPrints}
                        onChange={(next) => {
                          setGuestPrints(next);
                          void persist({ guest_prints_enabled: next });
                        }}
                        label="Offer prints to guests"
                      />
                    )}
                    footnote="The guest list itself is under Guests in the left pane."
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'watermark' && (
            <>
              <div className="cd-dl-status">
                <div className="cd-basics-card-badge">
                  <span className="cd-basics-card__icon cd-basics-card__icon--cover" style={{ width: '100%', height: '100%', minHeight: 0, border: 'none', borderRadius: 8, padding: 0 }}>
                    {coverUrl ? <img src={coverUrl} alt="" /> : null}
                    <span className="cd-basics-card__brand">{watermarkName || 'None'}</span>
                  </span>
                </div>
                <div className="cd-dl-status__copy">
                  <h3 className="cd-dl-status__title">Watermark</h3>
                  <p className="cd-dl-status__desc">{watermarkSummary}</p>
                </div>
              </div>

              <div className="cd-dl-body">
                <div className="cd-dl-card">
                  <div className="cd-dl-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
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
                    <div className="cd-basics-actions-row" style={{ padding: '0 24px 20px' }}>
                      <button type="button" className="cd-basics-btn" onClick={onManageWatermarks}>
                        Manage watermarks
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
