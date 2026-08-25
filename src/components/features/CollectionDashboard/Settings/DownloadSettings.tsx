import React from 'react';
import { persistDeliverySettings } from '../../../../lib/deliverySettingsSync';
import { DownloadSettingsProps } from './Settings.types';
import { Toggle, formatMoney } from './settingsCardKit';
import './BasicsSettings.css';
import './DownloadSettings.css';

type TabId = 'downloads' | 'advanced';
type SellingMode = 'off' | 'full' | 'watermarked';
type ContactMode = 'never' | 'large' | 'every';
type FilmPlay = 'adapt' | 'highest';
type Bundle = { count: number; price: number };

const SIZE_OPTIONS = [
  { id: 'web' as const, label: 'Web size', desc: 'About 2,048 px on the long edge.' },
  { id: 'high' as const, label: 'Full resolution', desc: 'Print-ready, straight from your export.' },
  { id: 'original' as const, label: 'Original file', desc: 'Untouched, exactly as it came off the camera.' },
];

const CONTACT_OPTIONS: { id: ContactMode; label: string; desc?: string }[] = [
  { id: 'never', label: 'Never' },
  { id: 'large', label: 'Large downloads only' },
  { id: 'every', label: 'Every download' },
];

const SELLING_OPTIONS: { id: SellingMode; label: string; desc: string }[] = [
  { id: 'off', label: 'Not selling', desc: 'Everything you offer is free' },
  { id: 'full', label: 'Full resolution only', desc: 'Web size free, originals priced' },
  { id: 'watermarked', label: 'Everything, watermarked', desc: 'Nothing free, mark until paid' },
];

const PLAYBACK_OPTIONS: { id: FilmPlay; label: string; desc: string }[] = [
  { id: 'adapt', label: 'Adapt to the connection', desc: 'Adapt starts lower on mobile data and steps up on wifi.' },
  { id: 'highest', label: 'Always highest', desc: 'Play at the highest quality the file allows.' },
];

const DEFAULT_BUNDLES: Bundle[] = [
  { count: 10, price: 1000 },
  { count: 20, price: 1600 },
  { count: 50, price: 3000 },
];

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function DownloadGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function AdvancedGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function parseBundles(raw: unknown): Bundle[] {
  if (!Array.isArray(raw)) return DEFAULT_BUNDLES;
  const next = raw
    .map((item) => ({
      count: Number((item as Bundle)?.count) || 0,
      price: Number((item as Bundle)?.price) || 0,
    }))
    .filter((item) => item.count > 0);
  return next.length ? next : DEFAULT_BUNDLES;
}

function formatGb(bytes: number) {
  const gb = bytes / 1024 ** 3;
  if (gb >= 10) return `${Math.round(gb)} GB`;
  if (gb >= 0.1) return `${gb.toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

function sellingFromCollection(collection: any): SellingMode {
  const saved = collection?.download_selling;
  if (saved === 'off' || saved === 'full' || saved === 'watermarked') return saved;
  if (saved === 'all' || saved === 'web') return 'watermarked';
  if (Number(collection?.download_price_full) > 0 || Number(collection?.download_price_web) > 0) return 'full';
  return 'off';
}

function contactFromCollection(collection: any): ContactMode {
  const saved = collection?.download_contact_mode;
  if (saved === 'never' || saved === 'large' || saved === 'every') return saved;
  if (saved === 'always') return 'every';
  return collection?.large_download_contact === true ? 'large' : 'never';
}

function playbackFromCollection(collection: any): FilmPlay {
  return collection?.film_playback === 'highest' ? 'highest' : 'adapt';
}

function Row({
  title,
  desc,
  control,
}: {
  title: string;
  desc?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="cd-dl-row">
      <div className="cd-dl-row__copy">
        <p className="cd-dl-row__title">{title}</p>
        {desc ? <p className="cd-dl-row__desc">{desc}</p> : null}
      </div>
      <div className="cd-dl-row__control">{control}</div>
    </div>
  );
}

function useMenu() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return { open, setOpen, ref };
}

function RadioMenu({
  value,
  options,
  header,
  onChange,
  wide,
  pill,
}: {
  value: string;
  options: { id: string; label: string; desc?: string }[];
  header: string;
  onChange: (id: string) => void;
  wide?: boolean;
  pill?: boolean;
}) {
  const { open, setOpen, ref } = useMenu();
  const label = options.find((item) => item.id === value)?.label || value;

  return (
    <div className={`cd-dl-select${open ? ' is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`cd-dl-select__btn${pill ? ' cd-dl-select__btn--pill' : ''}`}
        style={wide ? { minWidth: 240 } : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <ChevronDown />
      </button>
      {open ? (
        <div className="cd-dl-pop">
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
        </div>
      ) : null}
    </div>
  );
}

function SizesMenu({
  selected,
  onToggle,
}: {
  selected: Record<'web' | 'high' | 'original', boolean>;
  onToggle: (size: 'web' | 'high' | 'original') => void;
}) {
  const { open, setOpen, ref } = useMenu();
  const parts = SIZE_OPTIONS.filter((item) => selected[item.id]).map((item) => item.label);
  const label = parts.join(', ') || 'None';

  return (
    <div className={`cd-dl-select${open ? ' is-open' : ''}`} ref={ref}>
      <button type="button" className="cd-dl-select__btn" style={{ minWidth: 240 }} onClick={() => setOpen((c) => !c)}>
        <span>{label}</span>
        <ChevronDown />
      </button>
      {open ? (
        <div className="cd-dl-pop">
          <p className="cd-dl-pop__head">Sizes they can choose</p>
          {SIZE_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`cd-dl-check${selected[item.id] ? ' is-on' : ''}`}
              onClick={() => onToggle(item.id)}
            >
              <span className="cd-dl-check__box">{selected[item.id] ? <CheckIcon /> : null}</span>
              <span className="cd-dl-opt__copy">
                <span className="cd-dl-opt__title">{item.label}</span>
                <span className="cd-dl-opt__desc">{item.desc}</span>
              </span>
            </button>
          ))}
          <p className="cd-dl-pop__foot">Offer more than one and they choose at the point of download.</p>
        </div>
      ) : null}
    </div>
  );
}

function MoneyField({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (next: string) => void;
  onBlur: () => void;
}) {
  return (
    <label className="cd-dl-money">
      ₹
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </label>
  );
}

export const DownloadSettings: React.FC<DownloadSettingsProps> = ({
  collectionId,
  collection,
  setCollection,
  photos = [],
  photoDownload,
  setPhotoDownload,
  setGalleryDownload,
  singlePhotoDownload,
  setSinglePhotoDownload,
  downloadPin,
  setDownloadPin,
  onDownloadPinChange,
  pinValue,
  setPinValue,
  onPinEnter,
  downloadLimit,
  setDownloadLimit,
  restrictToEmails,
  setRestrictToEmails,
  selectedDownloadSets,
  setSelectedDownloadSets,
  sets,
  pinUsageLimit,
  setPinUsageLimit,
  photoDownloadSizes = ['high', 'web'],
  setPhotoDownloadSizes,
  setHighResChoice,
  setWebSizeChoice,
  setActiveSidebarTab,
  setActiveActivitySubTab,
}) => {
  const [tab, setTab] = React.useState<TabId>('downloads');
  const [copied, setCopied] = React.useState(false);
  const [editingBundles, setEditingBundles] = React.useState(false);
  const [pricePhoto, setPricePhoto] = React.useState(String(collection?.download_price_full ?? collection?.download_price_web ?? ''));
  const [priceFilm, setPriceFilm] = React.useState(String(collection?.download_price_film ?? ''));
  const [bundles, setBundles] = React.useState<Bundle[]>(() => parseBundles(collection?.download_bundles));
  const [selling, setSelling] = React.useState<SellingMode>(() => sellingFromCollection(collection));
  const [contact, setContact] = React.useState<ContactMode>(() => contactFromCollection(collection));
  const [filmResolution, setFilmResolution] = React.useState(collection?.video_download_resolution || '1080p');
  const [filmPlayback, setFilmPlayback] = React.useState<FilmPlay>(() => playbackFromCollection(collection));
  const [singleFilm, setSingleFilm] = React.useState(collection?.single_film_download !== false);

  React.useEffect(() => {
    setPricePhoto(String(collection?.download_price_full ?? collection?.download_price_web ?? ''));
    setPriceFilm(String(collection?.download_price_film ?? ''));
    setBundles(parseBundles(collection?.download_bundles));
    setSelling(sellingFromCollection(collection));
    setContact(contactFromCollection(collection));
    setFilmResolution(collection?.video_download_resolution || '1080p');
    setFilmPlayback(playbackFromCollection(collection));
    setSingleFilm(collection?.single_film_download !== false);
  }, [
    collection?.download_price_full,
    collection?.download_price_web,
    collection?.download_price_film,
    collection?.download_bundles,
    collection?.download_selling,
    collection?.download_contact_mode,
    collection?.large_download_contact,
    collection?.video_download_resolution,
    collection?.film_playback,
    collection?.single_film_download,
  ]);

  const persist = async (patch: Record<string, unknown>) => {
    await persistDeliverySettings(collectionId, collection?.slug, patch, setCollection);
  };

  const webOffered = photoDownloadSizes.includes('web');
  const highOffered = photoDownloadSizes.includes('high') || photoDownloadSizes.includes('full');
  const originalOffered = photoDownloadSizes.includes('original');
  const filmsOffered = photoDownloadSizes.includes('video') || collection?.video_downloads_enabled === true;
  const filmChoice = filmsOffered ? (filmResolution === '4k' || filmResolution === '2160p' ? '4k' : '1080p') : 'none';

  const persistSizes = (next: string[]) => {
    const unique = Array.from(new Set(next));
    setPhotoDownloadSizes?.(unique);
    void persist({
      download_resolutions: unique
        .map((item) => (item === 'high' ? 'full' : item))
        .filter((item) => item === 'web' || item === 'full' || item === 'original'),
      video_downloads_enabled: unique.includes('video'),
    });
  };

  const toggleSize = (size: 'web' | 'high' | 'original' | 'video') => {
    const has = size === 'high'
      ? photoDownloadSizes.includes('high') || photoDownloadSizes.includes('full')
      : photoDownloadSizes.includes(size);
    const without = photoDownloadSizes.filter((item) => {
      if (size === 'high') return item !== 'high' && item !== 'full';
      return item !== size;
    });
    const next = has ? without : [...without, size === 'high' ? 'high' : size];
    if (size === 'web' && !has) setWebSizeChoice?.('2048px');
    if (size === 'high' && !has) setHighResChoice?.('3600px');
    if (size === 'original' && !has) setHighResChoice?.('original');
    persistSizes(next);
  };

  const setFilmOption = (id: string) => {
    if (id === 'none') {
      setFilmResolution('1080p');
      void persist({ video_download_resolution: 'none', video_downloads_enabled: false });
      persistSizes(photoDownloadSizes.filter((item) => item !== 'video'));
      return;
    }
    setFilmResolution(id);
    void persist({ video_download_resolution: id, video_downloads_enabled: true });
    if (!photoDownloadSizes.includes('video')) persistSizes([...photoDownloadSizes, 'video']);
  };

  const setContactMode = (mode: ContactMode) => {
    setContact(mode);
    void persist({
      download_contact_mode: mode,
      large_download_contact: mode !== 'never',
    });
  };

  const setSellingMode = (mode: SellingMode) => {
    setSelling(mode);
    void persist({ download_selling: mode });
  };

  const savePhotoPrice = () => {
    const num = pricePhoto === '' ? null : Number(pricePhoto);
    void persist({
      download_price_full: num,
      digital_download_price_single: num,
    });
  };

  const saveFilmPrice = () => {
    void persist({ download_price_film: priceFilm === '' ? null : Number(priceFilm) });
  };

  const saveBundles = (next: Bundle[]) => {
    setBundles(next);
    void persist({ download_bundles: next });
  };

  const generatePin = () => {
    const next = String(Math.floor(1000 + Math.random() * 9000));
    setPinValue(next);
    onPinEnter?.(next);
  };

  const copyPin = async () => {
    try {
      await navigator.clipboard.writeText(pinValue || '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const commitPin = (pin: string) => onPinEnter?.(pin);

  const stillPhotos = React.useMemo(
    () => (photos || []).filter((photo: any) => photo?.media_type !== 'video'),
    [photos],
  );
  const films = React.useMemo(
    () => (photos || []).filter((photo: any) => photo?.media_type === 'video'),
    [photos],
  );
  const filmBytes = films.reduce((sum: number, film: any) => sum + (Number(film.size_bytes) || 0), 0);
  const filmOptions = [
    {
      id: 'none',
      label: 'Watch only',
      desc: 'Separate from photographs. You can release every photograph and still keep the films watch-only.',
    },
    {
      id: '1080p',
      label: 'Allowed at 1080p',
      desc: filmBytes ? `This delivery ≈ ${formatGb(filmBytes)}.` : 'A 46-minute film ≈ 2.1 GB.',
    },
    {
      id: '4k',
      label: 'Allowed at 4K',
      desc: filmBytes ? `This delivery ≈ ${formatGb(filmBytes * 7)}.` : 'A 46-minute film ≈ 14.7 GB.',
    },
  ];

  const downloadSets = React.useMemo(() => {
    const highlightsOn = collection?.highlights_enabled !== false;
    const items: { id: string; name: string; count: number }[] = [];
    if (highlightsOn) {
      items.push({
        id: 'Highlights',
        name: collection?.highlights_name || 'Highlights',
        count: stillPhotos.filter((photo: any) => !photo.set_id).length,
      });
    }
    sets.forEach((set) => {
      if (String(set.name).toLowerCase() === 'highlights') return;
      items.push({
        id: set.name,
        name: set.name,
        count: stillPhotos.filter((photo: any) => photo.set_id === set.id).length,
      });
    });
    return items;
  }, [collection?.highlights_enabled, collection?.highlights_name, sets, stillPhotos]);

  const allSetNames = downloadSets.map((item) => item.id);
  const setEnabled = (name: string) => selectedDownloadSets.length === 0 || selectedDownloadSets.includes(name);
  const enabledSetCount = downloadSets.filter((item) => setEnabled(item.id)).length;

  const toggleSet = (name: string) => {
    const enabled = selectedDownloadSets.length === 0 ? allSetNames : selectedDownloadSets;
    const next = enabled.includes(name) ? enabled.filter((item) => item !== name) : [...enabled, name];
    const result = next.length === allSetNames.length ? [] : next;
    setSelectedDownloadSets(result);
    void persist({ selected_download_sets: result.length ? result : null });
  };

  const sizeNames = [
    webOffered ? 'Web size' : null,
    highOffered ? 'Full resolution' : null,
    originalOffered ? 'Original file' : null,
  ].filter(Boolean) as string[];
  const filmResLabel = filmChoice === '4k' ? '4K' : '1080p';
  const limitLabel = downloadLimit ? `${downloadLimit} total` : 'No total limit';
  const addressLabel = restrictToEmails.trim() ? 'Restricted to listed addresses' : 'Open to any address';
  const setsLabel = downloadSets.length
    ? `${enabledSetCount} of ${downloadSets.length} sets downloadable`
    : 'No sets yet';

  const bundleLabel = bundles
    .filter((item) => item.count > 0)
    .map((item) => `${item.count} for ${formatMoney(item.price)}`)
    .join(' · ');

  return (
    <div className="cd-general-settings-view cd-basics cd-dl">
      <header className="cd-basics__header">
        <h2 className="cd-basics__title">Downloads</h2>
        <p className="cd-basics__kicker">this delivery</p>
      </header>

      <div className={`cd-dl-shell${tab === 'downloads' ? ' is-first' : ''}`}>
        <div className="cd-dl-tabs" role="tablist">
          <button type="button" role="tab" className={`cd-dl-tab${tab === 'downloads' ? ' is-on' : ''}`} aria-selected={tab === 'downloads'} onClick={() => setTab('downloads')}>
            Downloads
          </button>
          <button type="button" role="tab" className={`cd-dl-tab${tab === 'advanced' ? ' is-on' : ''}`} aria-selected={tab === 'advanced'} onClick={() => setTab('advanced')}>
            Advanced
          </button>
        </div>

        <div className="cd-dl-box">
      {tab === 'downloads' ? (
        <>
          <div className="cd-dl-status">
            <div className={`cd-dl-status__icon${photoDownload ? '' : ' is-off'}`}>
              <DownloadGlyph />
              <span className="cd-dl-status__mark">{photoDownload ? 'On' : 'Off'}</span>
            </div>
            <div className="cd-dl-status__copy">
              <h3 className="cd-dl-status__title">Downloads</h3>
              <p className="cd-dl-status__desc">
                {photoDownload
                  ? `On. ${sizeNames.join(', ') || 'No sizes offered'}${filmsOffered ? `, films at ${filmResLabel}` : ''}. ${singlePhotoDownload ? 'Single photographs allowed.' : 'Single photographs off.'}`
                  : 'Off. No download control renders anywhere — not in the header, not on a photograph, not on a film.'}
              </p>
            </div>
          </div>

          <div className={`cd-dl-master${photoDownload ? ' is-on' : ''}`}>
            <Row
              title="Allow downloading"
              desc="The master switch. Off means no download control renders anywhere — not in the header, not on a photograph, not on a film."
              control={<Toggle checked={photoDownload} onChange={(next) => {
                setPhotoDownload(next);
                setGalleryDownload?.(next);
                void persist({
                  downloads_enabled: next,
                  gallery_download_enabled: next,
                });
              }} label="Allow downloading" />}
            />
          </div>

          <div className={photoDownload ? undefined : 'cd-dl-muted'}>
            <section className="cd-dl-section">
              <span className="cd-dl-section__label">What they get</span>
              <div className="cd-dl-card">
                <Row
                  title="Sizes offered"
                  desc="Offer more than one and they choose at the point of download."
                  control={<SizesMenu selected={{ web: webOffered, high: highOffered, original: originalOffered }} onToggle={toggleSize} />}
                />
                <Row
                  title="Films"
                  desc="Separate from photographs. You can release every photograph and still keep the films watch-only."
                  control={<RadioMenu header="Films" value={filmChoice} options={filmOptions} onChange={setFilmOption} />}
                />
              </div>
            </section>

            <section className="cd-dl-section">
              <span className="cd-dl-section__label">On each photograph</span>
              <div className="cd-dl-card">
                <Row
                  title="Allow single image download"
                  desc="Puts a download icon on each photograph on hover. Off means the only way to take anything is the DOWNLOAD button in the header, which hands over a whole set."
                  control={<Toggle checked={singlePhotoDownload} onChange={(next) => {
                    setSinglePhotoDownload(next);
                    void persist({ single_photo_download_enabled: next });
                  }} label="Allow single image download" />}
                />
              </div>
            </section>

            <section className="cd-dl-section">
              <span className="cd-dl-section__label">What you ask for</span>
              <div className="cd-dl-card">
                <Row
                  title="Ask for a PIN"
                  desc="A four-digit code given out separately from the link. The password under Access controls viewing; this controls taking."
                  control={(
                    <Toggle
                      checked={downloadPin}
                      onChange={(next) => {
                        if (onDownloadPinChange) {
                          onDownloadPinChange(next);
                        } else {
                          setDownloadPin(next);
                        }
                        if (next && !pinValue) generatePin();
                      }}
                      label="Ask for a PIN"
                    />
                  )}
                />
                {downloadPin ? (
                  <div className="cd-dl-children">
                    <div className="cd-dl-child">
                      <div className="cd-dl-row__copy">
                        <p className="cd-dl-row__title">The PIN</p>
                        <p className="cd-dl-row__desc">Four digits, given out separately from the link.</p>
                      </div>
                      <div className="cd-dl-row__control">
                        <div className="cd-dl-pin">
                          <input
                            className="cd-dl-pin__box"
                            inputMode="numeric"
                            maxLength={7}
                            value={pinValue.replace(/\D/g, '').slice(0, 4).split('').join(' ')}
                            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            onBlur={() => commitPin(pinValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitPin(pinValue);
                              }
                            }}
                          />
                          <button type="button" className="cd-dl-textbtn" onClick={() => void copyPin()}>
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                          <button type="button" className="cd-dl-textbtn" onClick={generatePin}>
                            Generate
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                <Row
                  title="Ask for a contact"
                  desc="Where to send the link when a set is large enough to be zipped server-side."
                  control={<RadioMenu header="Ask for a contact" value={contact} options={CONTACT_OPTIONS} onChange={(id) => setContactMode(id as ContactMode)} />}
                />
              </div>
            </section>

            <section className="cd-dl-section">
              <span className="cd-dl-section__label">Selling digital copies</span>
              <div className="cd-dl-card">
                <Row
                  title="Selling"
                  desc="What a visitor pays for, if anything."
                  control={<RadioMenu header="Selling digital copies" value={selling} options={SELLING_OPTIONS} onChange={(id) => setSellingMode(id as SellingMode)} />}
                />
                {selling !== 'off' ? (
                  <div className="cd-dl-children">
                    <div className="cd-dl-child">
                      <div className="cd-dl-row__copy">
                        <p className="cd-dl-row__title">One photograph</p>
                      </div>
                      <div className="cd-dl-row__control">
                        <MoneyField value={pricePhoto} onChange={setPricePhoto} onBlur={savePhotoPrice} />
                      </div>
                    </div>
                    <div className="cd-dl-child">
                      <div className="cd-dl-row__copy">
                        <p className="cd-dl-row__title">One film</p>
                      </div>
                      <div className="cd-dl-row__control">
                        <MoneyField value={priceFilm} onChange={setPriceFilm} onBlur={saveFilmPrice} />
                      </div>
                    </div>
                    <div className="cd-dl-child">
                      <div className="cd-dl-row__copy">
                        <p className="cd-dl-row__title">Bundles</p>
                        {!editingBundles && bundleLabel ? <p className="cd-dl-row__desc">{bundleLabel}</p> : null}
                      </div>
                      <div className="cd-dl-row__control">
                        {editingBundles ? (
                          <div className="cd-dl-bundles">
                            {bundles.map((item, index) => (
                              <div key={`${item.count}-${index}`} className="cd-dl-bundles__row">
                                <input
                                  type="number"
                                  min={1}
                                  value={item.count || ''}
                                  onChange={(e) => {
                                    const next = bundles.map((bundle, i) => (i === index ? { ...bundle, count: Number(e.target.value) || 0 } : bundle));
                                    setBundles(next);
                                  }}
                                />
                                <span className="cd-dl-bundles__for">for ₹</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={item.price || ''}
                                  onChange={(e) => {
                                    const next = bundles.map((bundle, i) => (i === index ? { ...bundle, price: Number(e.target.value) || 0 } : bundle));
                                    setBundles(next);
                                  }}
                                />
                              </div>
                            ))}
                            <button
                              type="button"
                              className="cd-dl-textbtn"
                              onClick={() => {
                                saveBundles(bundles);
                                setEditingBundles(false);
                              }}
                            >
                              Done
                            </button>
                          </div>
                        ) : (
                          <button type="button" className="cd-dl-textbtn" onClick={() => setEditingBundles(true)}>
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </>
      ) : (
        <>
          <div className="cd-dl-status">
            <div className="cd-dl-status__icon is-wide">
              <AdvancedGlyph />
              <span className="cd-dl-status__mark cd-dl-status__mark--long">Advanced</span>
            </div>
            <div className="cd-dl-status__copy">
              <h3 className="cd-dl-status__title">Advanced</h3>
              <p className="cd-dl-status__desc">{limitLabel}. {addressLabel}. {setsLabel}.</p>
            </div>
          </div>

          <section className="cd-dl-section">
            <span className="cd-dl-section__label">Limits</span>
            <div className="cd-dl-card">
              <Row
                title="Total downloads allowed"
                control={(
                  <input
                    className="cd-dl-pill"
                    type="number"
                    min={0}
                    placeholder="No limit"
                    value={downloadLimit}
                    onChange={(e) => setDownloadLimit(e.target.value)}
                  />
                )}
              />
              <Row
                title="The PIN can be used"
                control={(
                  <input
                    className="cd-dl-pill"
                    type="number"
                    min={0}
                    placeholder="Unlimited"
                    value={pinUsageLimit}
                    onChange={(e) => setPinUsageLimit(e.target.value)}
                  />
                )}
              />
              <Row
                title="Restrict to these addresses"
                desc="Comma separated. Blank allows anyone."
                control={(
                  <input
                    className="cd-dl-pill cd-dl-pill--wide"
                    type="text"
                    placeholder="Anyone"
                    value={restrictToEmails}
                    onChange={(e) => setRestrictToEmails(e.target.value)}
                  />
                )}
              />
            </div>
          </section>

          <section className="cd-dl-section">
            <span className="cd-dl-section__label">Films</span>
            <div className="cd-dl-card">
              <Row
                title="Film playback"
                desc="Adapt starts lower on mobile data and steps up on wifi."
                control={<RadioMenu header="Film playback" value={filmPlayback} options={PLAYBACK_OPTIONS} wide pill onChange={(id) => {
                  setFilmPlayback(id as FilmPlay);
                  void persist({ film_playback: id });
                }} />}
              />
              <Row
                title="A single film on its own"
                desc="Rather than only as part of the whole set."
                control={(
                  <Toggle
                    checked={singleFilm}
                    onChange={(next) => {
                      setSingleFilm(next);
                      void persist({ single_film_download: next });
                    }}
                    label="A single film on its own"
                  />
                )}
              />
            </div>
          </section>

          <section className="cd-dl-section">
            <span className="cd-dl-section__label">Which sets can be downloaded</span>
            <div className="cd-dl-card cd-dl-sets">
              {downloadSets.length ? downloadSets.map((item) => (
                <div key={item.id} className="cd-dl-set">
                  <div className="cd-dl-row__copy">
                    <p className="cd-dl-set__name">{item.name}</p>
                    <p className="cd-dl-set__count">{item.count.toLocaleString('en-IN')} photographs</p>
                  </div>
                  <Toggle
                    checked={setEnabled(item.id)}
                    onChange={() => toggleSet(item.id)}
                    label={`${item.name} downloadable`}
                  />
                </div>
              )) : (
                <div className="cd-dl-row">
                  <p className="cd-dl-row__desc">Sets you add to this delivery will appear here.</p>
                </div>
              )}
            </div>
            <p className="cd-dl-foot">
              Who actually downloaded what is under{' '}
              <button
                type="button"
                className="cd-dl-link"
                onClick={() => {
                  setActiveSidebarTab?.('activity');
                  setActiveActivitySubTab?.('downloads');
                }}
              >
                Activity
              </button>
              .
            </p>
          </section>
        </>
      )}
        </div>
      </div>
    </div>
  );
};
