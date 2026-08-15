import React from 'react';
import { galleryService } from '../../../../services/gallery.service';
import { DownloadSettingsProps } from './Settings.types';
import {
  GridIcon,
  LockIcon,
  PlayIcon,
  SettingsCard,
  ToggleRow,
  formatMoney,
} from './settingsCardKit';
import './BasicsSettings.css';
import './SettingsCards.css';

const WEB_SIZES = [
  { id: '2048px', label: '2048 px' },
  { id: '1024px', label: '1024 px' },
  { id: '640px', label: '640 px' },
];

const HIGH_RES = [
  { id: 'original', label: 'Original' },
  { id: '3600px', label: '3600 px' },
];

const FILM_RESOLUTIONS = [
  { id: 'original', label: 'Original' },
  { id: '1080p', label: '1080p' },
  { id: '720p', label: '720p' },
];

function gigabytes(bytes: number) {
  if (!bytes) return '';
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

export const DownloadSettings: React.FC<DownloadSettingsProps> = ({
  collectionId,
  collection,
  setCollection,
  photos = [],
  photoDownload,
  setPhotoDownload,
  galleryDownload,
  setGalleryDownload,
  singlePhotoDownload,
  setSinglePhotoDownload,
  requirePinForSinglePhoto,
  setRequirePinForSinglePhoto,
  downloadPin,
  setDownloadPin,
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
  highResChoice = '3600px',
  setHighResChoice,
  webSizeChoice = '1024px',
  setWebSizeChoice,
}) => {
  const [openCard, setOpenCard] = React.useState<string | null>(null);
  const [priceWeb, setPriceWeb] = React.useState(String(collection?.download_price_web ?? ''));
  const [priceFull, setPriceFull] = React.useState(String(collection?.download_price_full ?? ''));
  const [priceBundle, setPriceBundle] = React.useState(String(collection?.download_price_bundle ?? ''));
  const [askContact, setAskContact] = React.useState(collection?.large_download_contact === true);
  const [filmResolution, setFilmResolution] = React.useState(collection?.video_download_resolution || '1080p');

  React.useEffect(() => {
    setPriceWeb(String(collection?.download_price_web ?? ''));
    setPriceFull(String(collection?.download_price_full ?? ''));
    setPriceBundle(String(collection?.download_price_bundle ?? ''));
    setAskContact(collection?.large_download_contact === true);
    setFilmResolution(collection?.video_download_resolution || '1080p');
  }, [
    collection?.download_price_web,
    collection?.download_price_full,
    collection?.download_price_bundle,
    collection?.large_download_contact,
    collection?.video_download_resolution,
  ]);

  const persist = async (patch: Record<string, unknown>) => {
    try {
      const updated = await galleryService.updateCollection(collectionId, patch);
      setCollection?.((prev: any) => (prev ? { ...prev, ...(updated || patch) } : prev));
    } catch (err) {
      console.error('Failed to save download setting:', err);
    }
  };

  const pinInputRef = React.useRef<HTMLInputElement>(null);
  const commitPin = (pin: string) => {
    onPinEnter?.(pin);
    pinInputRef.current?.blur();
  };

  const toggleCard = (id: string) => setOpenCard((current) => (current === id ? null : id));

  const webOffered = photoDownloadSizes.includes('web');
  const highOffered = photoDownloadSizes.includes('high');
  const filmsOffered = photoDownloadSizes.includes('video');

  const toggleSize = (size: 'web' | 'high' | 'video') => {
    const next = photoDownloadSizes.includes(size)
      ? photoDownloadSizes.filter((item) => item !== size)
      : [...photoDownloadSizes, size];
    setPhotoDownloadSizes?.(next);
  };

  const films = React.useMemo(
    () => (photos || []).filter((photo: any) => photo?.media_type === 'video'),
    [photos],
  );
  const filmBytes = films.reduce((sum: number, film: any) => sum + (Number(film.size_bytes) || 0), 0);
  const filmSizeLabel = gigabytes(filmBytes);

  const webPriceNum = Number(priceWeb) || 0;
  const fullPriceNum = Number(priceFull) || 0;
  const bundlePriceNum = Number(priceBundle) || 0;

  const chargeSummary = (
    <>
      Web size is <strong>{webPriceNum > 0 ? formatMoney(webPriceNum) : 'free'}</strong>. Full resolution
      {fullPriceNum > 0 ? (
        <> costs <strong>{formatMoney(fullPriceNum)}</strong></>
      ) : (
        <> is <strong>free</strong></>
      )}
      {bundlePriceNum > 0 ? (
        <>, or <strong>{formatMoney(bundlePriceNum)}</strong> each in a bundle.</>
      ) : (
        '.'
      )}
    </>
  );

  const sizeNames = [
    webOffered ? 'Web size' : null,
    highOffered ? 'Full resolution' : null,
  ].filter(Boolean) as string[];

  const sizesSummary = sizeNames.length ? (
    <>
      {sizeNames.map((name, index) => (
        <React.Fragment key={name}>
          {index > 0 ? ' and ' : ''}
          <strong>{name}</strong>
        </React.Fragment>
      ))}
      {askContact ? ', and you ask for a contact on large downloads.' : ', and no contact is asked for.'}
    </>
  ) : (
    'No sizes offered — nothing can be downloaded.'
  );

  const filmsSummary = films.length ? (
    <>
      Films can be taken at <strong>{FILM_RESOLUTIONS.find((r) => r.id === filmResolution)?.label || filmResolution}</strong>.
      {filmSizeLabel ? (
        <> {films.length} film{films.length === 1 ? '' : 's'} comes to <strong>{filmSizeLabel}</strong>.</>
      ) : null}
    </>
  ) : (
    <>No films in this delivery yet. They would download at <strong>{filmResolution}</strong>.</>
  );

  const pinSummary = downloadPin && pinValue ? (
    <>
      Visitors must enter <strong>{pinValue}</strong> before anything downloads.
    </>
  ) : (
    <>No PIN. <strong>Anyone in the gallery</strong> can download straight away.</>
  );

  const coverUrl = collection?.cover_url || '';
  const allSetNames = ['Highlights', ...sets.map((set) => set.name)];
  const setEnabled = (name: string) => selectedDownloadSets.length === 0 || selectedDownloadSets.includes(name);
  const toggleSet = (name: string) => {
    setSelectedDownloadSets((prev) => {
      if (prev.length === 0) return allSetNames.filter((item) => item !== name);
      return prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name];
    });
  };

  return (
    <div className="cd-general-settings-view cd-basics">
      <header className="cd-basics__header">
        <h2 className="cd-basics__title">Downloads</h2>
        <p className="cd-basics__kicker">this delivery</p>
        <p className="cd-basics__lead">
          Four decisions. Each one shows what it does to the gallery your client opens — open any of them
          to change it.
        </p>
      </header>

      <div className="cd-basics__cards">
        <SettingsCard
          id="charge"
          openId={openCard}
          onToggle={toggleCard}
          title="What you charge for"
          summary={chargeSummary}
          icon={(
            <span className="cd-basics-card__icon cd-basics-card__icon--cover">
              {coverUrl ? <img src={coverUrl} alt="" /> : null}
              <span className="cd-basics-card__corner"><LockIcon size={10} /></span>
              <span className="cd-basics-card__brand">
                {webPriceNum > 0 ? `Web ${formatMoney(webPriceNum)}` : 'Web free'}
              </span>
            </span>
          )}
        >
          <div className="cd-basics-toggles">
            <ToggleRow
              title="Downloads"
              desc="Visitors can take photographs out of the gallery."
              checked={photoDownload}
              onChange={setPhotoDownload}
            />
          </div>

          <div className="cd-basics-field" style={{ marginTop: 18 }}>
            <span className="cd-basics-label">Prices</span>
            <div className="cd-basics-money-row">
              <div className="cd-basics-money">
                <span className="cd-basics-caplabel" style={{ marginTop: 0 }}>Web size</span>
                <input
                  type="number"
                  min={0}
                  className="cd-basics-input cd-basics-input--sm"
                  placeholder="Free"
                  value={priceWeb}
                  onChange={(e) => setPriceWeb(e.target.value)}
                  onBlur={() => void persist({ download_price_web: priceWeb === '' ? null : Number(priceWeb) })}
                />
              </div>
              <div className="cd-basics-money">
                <span className="cd-basics-caplabel" style={{ marginTop: 0 }}>Full resolution</span>
                <input
                  type="number"
                  min={0}
                  className="cd-basics-input cd-basics-input--sm"
                  placeholder="Free"
                  value={priceFull}
                  onChange={(e) => setPriceFull(e.target.value)}
                  onBlur={() => void persist({ download_price_full: priceFull === '' ? null : Number(priceFull) })}
                />
              </div>
              <div className="cd-basics-money">
                <span className="cd-basics-caplabel" style={{ marginTop: 0 }}>Each in a bundle</span>
                <input
                  type="number"
                  min={0}
                  className="cd-basics-input cd-basics-input--sm"
                  placeholder="Same price"
                  value={priceBundle}
                  onChange={(e) => setPriceBundle(e.target.value)}
                  onBlur={() => void persist({ download_price_bundle: priceBundle === '' ? null : Number(priceBundle) })}
                />
              </div>
            </div>
            <p className="cd-basics-hint">
              Leave a price empty and that size stays free. Bundle price applies once they take a whole set.
            </p>
          </div>
        </SettingsCard>

        <SettingsCard
          id="sizes"
          openId={openCard}
          onToggle={toggleCard}
          title="Sizes you offer"
          summary={sizesSummary}
          icon={(
            <span className="cd-basics-card__icon cd-basics-card__icon--cover">
              {coverUrl ? <img src={coverUrl} alt="" /> : null}
              <span className="cd-basics-card__chips" aria-hidden><i /><i /></span>
            </span>
          )}
        >
          <div className="cd-basics-field">
            <span className="cd-basics-label">Sizes</span>
            <div className="cd-basics-pills">
              <button
                type="button"
                className={`cd-basics-pill${webOffered ? ' is-on' : ''}`}
                onClick={() => toggleSize('web')}
              >
                Web size
              </button>
              <button
                type="button"
                className={`cd-basics-pill${highOffered ? ' is-on' : ''}`}
                onClick={() => toggleSize('high')}
              >
                Full resolution
              </button>
            </div>
          </div>

          {webOffered ? (
            <div className="cd-basics-field">
              <span className="cd-basics-label">Web size is</span>
              <div className="cd-basics-pills">
                {WEB_SIZES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`cd-basics-pill${webSizeChoice === item.id ? ' is-on' : ''}`}
                    onClick={() => setWebSizeChoice?.(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {highOffered ? (
            <div className="cd-basics-field">
              <span className="cd-basics-label">Full resolution is</span>
              <div className="cd-basics-pills">
                {HIGH_RES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`cd-basics-pill${highResChoice === item.id ? ' is-on' : ''}`}
                    onClick={() => setHighResChoice?.(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="cd-basics-toggles">
            <ToggleRow
              title="Ask for a contact on large downloads"
              desc="An email address before a whole gallery or set leaves."
              checked={askContact}
              onChange={(next) => {
                setAskContact(next);
                void persist({ large_download_contact: next });
              }}
            />
            <ToggleRow
              title="Whole gallery download"
              desc="One button that takes everything at once."
              checked={galleryDownload}
              onChange={setGalleryDownload}
            />
            <ToggleRow
              title="Single photo download"
              desc="A download button on each photograph."
              checked={singlePhotoDownload}
              onChange={setSinglePhotoDownload}
            />
          </div>

          <span className="cd-basics-caplabel">Limits</span>
          <div className="cd-basics-field">
            <span className="cd-basics-label">Total downloads allowed</span>
            <input
              type="number"
              min={0}
              className="cd-basics-input cd-basics-input--sm"
              placeholder="No limit"
              value={downloadLimit}
              onChange={(e) => setDownloadLimit(e.target.value)}
            />
          </div>

          <div className="cd-basics-field">
            <span className="cd-basics-label">Only these email addresses</span>
            <input
              type="text"
              className="cd-basics-input"
              placeholder="client@example.com, assistant@example.com"
              value={restrictToEmails}
              onChange={(e) => setRestrictToEmails(e.target.value)}
            />
            <p className="cd-basics-hint">Leave empty and anyone in the gallery can download.</p>
          </div>

          <div className="cd-basics-field">
            <span className="cd-basics-label">Sets that can be downloaded</span>
            <div className="cd-basics-pills">
              {allSetNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`cd-basics-pill${setEnabled(name) ? ' is-on' : ''}`}
                  onClick={() => toggleSet(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          id="films"
          openId={openCard}
          onToggle={toggleCard}
          title="Films"
          summary={filmsSummary}
          icon={(
            <span className="cd-basics-card__icon cd-basics-card__icon--cover">
              {coverUrl ? <img src={coverUrl} alt="" /> : null}
              <span className="cd-basics-card__center"><PlayIcon /></span>
              <span className="cd-basics-card__brand" style={{ left: 'auto', right: 6 }}>
                {FILM_RESOLUTIONS.find((r) => r.id === filmResolution)?.label || filmResolution}
              </span>
            </span>
          )}
        >
          <div className="cd-basics-toggles">
            <ToggleRow
              title="Film downloads"
              desc="Visitors can take the films as well as the photographs."
              checked={filmsOffered}
              onChange={() => toggleSize('video')}
            />
          </div>

          <div className="cd-basics-field" style={{ marginTop: 18 }}>
            <span className="cd-basics-label">Taken at</span>
            <div className="cd-basics-pills">
              {FILM_RESOLUTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`cd-basics-pill${filmResolution === item.id ? ' is-on' : ''}`}
                  onClick={() => {
                    setFilmResolution(item.id);
                    void persist({ video_download_resolution: item.id });
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="cd-basics-hint">
              {films.length
                ? `${films.length} film${films.length === 1 ? '' : 's'} in this delivery${filmSizeLabel ? `, ${filmSizeLabel} in total` : ''}.`
                : 'Upload a film and it will show up here.'}
            </p>
          </div>
        </SettingsCard>

        <SettingsCard
          id="pin"
          openId={openCard}
          onToggle={toggleCard}
          title="Download PIN"
          summary={pinSummary}
          icon={(
            <span className="cd-basics-card__icon">
              <GridIcon />
              <span className="cd-basics-card__center cd-basics-card__center--dark"><LockIcon size={12} /></span>
            </span>
          )}
        >
          <div className="cd-basics-toggles">
            <ToggleRow
              title="Require a PIN"
              desc="Four digits before anything downloads."
              checked={downloadPin}
              onChange={setDownloadPin}
            />
          </div>

          {downloadPin ? (
            <>
              <div className="cd-basics-field" style={{ marginTop: 18 }}>
                <span className="cd-basics-label">PIN</span>
                <div className="cd-basics-input-row">
                  <input
                    ref={pinInputRef}
                    type="text"
                    inputMode="numeric"
                    className="cd-basics-input cd-basics-input--sm"
                    value={pinValue}
                    maxLength={4}
                    placeholder="4 digits"
                    onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitPin(pinValue);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="cd-basics-btn"
                    onClick={() => {
                      const next = String(Math.floor(1000 + Math.random() * 9000));
                      setPinValue(next);
                      commitPin(next);
                    }}
                  >
                    Generate
                  </button>
                </div>
                <p className="cd-basics-hint">Send it with the link, or separately if you would rather.</p>
              </div>

              <div className="cd-basics-toggles">
                <ToggleRow
                  title="Ask for it on single photographs too"
                  desc="Otherwise the PIN is only asked for whole sets."
                  checked={requirePinForSinglePhoto}
                  onChange={setRequirePinForSinglePhoto}
                />
              </div>

              <div className="cd-basics-field" style={{ marginTop: 18 }}>
                <span className="cd-basics-label">Times the PIN can be used</span>
                <input
                  type="number"
                  min={0}
                  className="cd-basics-input cd-basics-input--sm"
                  placeholder="No limit"
                  value={pinUsageLimit}
                  onChange={(e) => setPinUsageLimit(e.target.value)}
                />
              </div>
            </>
          ) : null}
        </SettingsCard>
      </div>
    </div>
  );
};
