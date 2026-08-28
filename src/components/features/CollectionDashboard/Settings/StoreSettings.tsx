import React from 'react';
import { persistDeliverySettings } from '../../../../lib/deliverySettingsSync';
import { StoreSettingsProps } from './Settings.types';
import { Toggle } from './settingsCardKit';
import './BasicsSettings.css';
import './DownloadSettings.css';

const PRICE_LISTS = [
  { id: 'studio', label: 'Studio default' },
  { id: 'wedding', label: 'Wedding premium' },
  { id: 'custom', label: 'Custom' },
] as const;

type PriceListId = (typeof PRICE_LISTS)[number]['id'];

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function GridGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a39a92" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
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

function RadioMenu({
  value,
  options,
  header,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  header: string;
  onChange: (id: string) => void;
}) {
  const { open, setOpen, ref } = useMenu();
  const label = options.find((item) => item.id === value)?.label || value;

  return (
    <div className={`cd-dl-select${open ? ' is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="cd-dl-select__btn"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <ChevronDown />
      </button>
      {open ? (
        <div className="cd-dl-pop" role="listbox">
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
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PercentField({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (next: string) => void;
  onBlur: () => void;
}) {
  return (
    <label className="cd-dl-pct">
      <input
        type="number"
        min={0}
        max={999}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-label="Your margin"
      />
      <span className="cd-dl-pct__suffix">%</span>
    </label>
  );
}

function priceListStorageKey(collectionId: string) {
  return `pixnxt_print_price_list_${collectionId}`;
}

function readStoredPriceList(collectionId: string): PriceListId {
  try {
    const stored = localStorage.getItem(priceListStorageKey(collectionId));
    if (stored && PRICE_LISTS.some((item) => item.id === stored)) return stored as PriceListId;
  } catch {
    /* ignore */
  }
  return 'studio';
}

export const StoreSettings: React.FC<StoreSettingsProps> = ({
  collectionId,
  collection,
  setCollection,
  storeEnabled,
  setStoreEnabled,
}) => {
  const [guestPrints, setGuestPrints] = React.useState(collection?.guest_prints_enabled !== false);
  const [markup, setMarkup] = React.useState(
    collection?.print_markup_percent != null ? String(collection.print_markup_percent) : '40',
  );
  const [priceList, setPriceList] = React.useState<PriceListId>(() => readStoredPriceList(collectionId));

  React.useEffect(() => {
    setGuestPrints(collection?.guest_prints_enabled !== false);
    setMarkup(collection?.print_markup_percent != null ? String(collection.print_markup_percent) : '40');
    const fromDb = collection?.design_options?.print_price_list_id;
    if (fromDb && PRICE_LISTS.some((item) => item.id === fromDb)) {
      setPriceList(fromDb as PriceListId);
    }
  }, [
    collection?.guest_prints_enabled,
    collection?.print_markup_percent,
    collection?.design_options?.print_price_list_id,
  ]);

  React.useEffect(() => {
    setPriceList(readStoredPriceList(collectionId));
  }, [collectionId]);

  const persist = async (patch: Record<string, unknown>) => {
    await persistDeliverySettings(collectionId, collection?.slug, patch, setCollection);
  };

  const choosePriceList = (id: string) => {
    const next = (PRICE_LISTS.some((item) => item.id === id) ? id : 'studio') as PriceListId;
    setPriceList(next);
    try {
      localStorage.setItem(priceListStorageKey(collectionId), next);
    } catch {
      /* ignore */
    }
    const designOptions =
      collection?.design_options && typeof collection.design_options === 'object'
        ? collection.design_options
        : {};
    void persist({
      design_options: {
        ...designOptions,
        print_price_list_id: next,
      },
    });
  };

  React.useEffect(() => {
    if (!collectionId) return undefined;
    const parsed = markup === '' ? null : Number(markup);
    if (parsed != null && !Number.isFinite(parsed)) return undefined;
    const fromDb =
      collection?.print_markup_percent != null ? Number(collection.print_markup_percent) : 40;
    if (parsed === fromDb) return undefined;

    const timeoutId = window.setTimeout(() => {
      void persist({ print_markup_percent: parsed });
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [markup, collectionId, collection?.print_markup_percent]);

  const sellingSummary = storeEnabled ? (
    guestPrints ? (
      <>
        Prints are <strong>on</strong>, and guests are offered them on <strong>their own photographs</strong>.
      </>
    ) : (
      <>
        Prints are <strong>on</strong>, and only your client is offered them — <strong>guests see no prints</strong>.
      </>
    )
  ) : (
    <>
      Prints are <strong>off</strong>. Nothing can be ordered from inside this gallery.
    </>
  );

  return (
    <div className="cd-general-settings-view cd-basics cd-dl">
      <header className="cd-basics__header">
        <h2 className="cd-basics__title">Print Lab</h2>
        <p className="cd-basics__kicker">this delivery</p>
        <p className="cd-basics__lead">What your client can order without leaving the gallery.</p>
      </header>

      <div className="cd-dl-shell is-first">
        <div className="cd-dl-box">
          <div className="cd-dl-status">
            <div className="cd-basics-card-badge">
              <GridGlyph />
              <span className="cd-basics-card-badge__text">
                {storeEnabled ? 'Prints on' : 'Prints off'}
              </span>
            </div>
            <div className="cd-dl-status__copy">
              <h3 className="cd-dl-status__title">Selling prints</h3>
              <p className="cd-dl-status__desc">{sellingSummary}</p>
            </div>
          </div>

          <div className={`cd-dl-master${storeEnabled ? ' is-on' : ''}`}>
            <Row
              title="Print Lab"
              desc="Visitors can order prints and products from inside the gallery."
              control={<Toggle checked={storeEnabled} onChange={(next) => {
                setStoreEnabled(next);
                void persist({ store_enabled: next });
              }} label="Print Lab" />}
            />
          </div>

          <div className="cd-dl-body">
            <div className="cd-dl-card">
              <Row
                title="Offer prints to guests"
                desc={'‘Take these home’ on each guest’s own photographs after guest delivery.'}
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
              />
              <Row
                title="Price list"
                desc="Built once in your Profile settings and reused. This picks which applies here."
                control={(
                  <RadioMenu
                    header="Price list"
                    value={priceList}
                    options={[...PRICE_LISTS]}
                    onChange={choosePriceList}
                  />
                )}
              />
              <Row
                title="Your margin"
                desc="Above lab cost."
                control={(
                  <PercentField
                    value={markup}
                    onChange={setMarkup}
                    onBlur={() => {
                      const parsed = markup === '' ? null : Number(markup);
                      void persist({ print_markup_percent: parsed });
                    }}
                  />
                )}
              />
            </div>
          </div>
        </div>
      </div>

      <p className="cd-dl-after">
        Print Lab is part of the gallery, not a separate store — same header, same palette, no second link to share.
      </p>
    </div>
  );
};
