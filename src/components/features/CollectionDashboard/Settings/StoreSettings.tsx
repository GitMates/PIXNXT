import React from 'react';
import { persistDeliverySettings } from '../../../../lib/deliverySettingsSync';
import { StoreSettingsProps } from './Settings.types';
import { Toggle } from './settingsCardKit';
import './BasicsSettings.css';
import './DownloadSettings.css';

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

export const StoreSettings: React.FC<StoreSettingsProps> = ({
  collectionId,
  collection,
  setCollection,
  storeEnabled,
  setStoreEnabled,
}) => {
  const [guestPrints, setGuestPrints] = React.useState(collection?.guest_prints_enabled !== false);

  React.useEffect(() => {
    setGuestPrints(collection?.guest_prints_enabled !== false);
  }, [collection?.guest_prints_enabled]);

  const persist = async (patch: Record<string, unknown>) => {
    await persistDeliverySettings(collectionId, collection?.slug, patch, setCollection);
  };

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

          <div className={`cd-dl-body${storeEnabled ? '' : ' cd-dl-muted'}`}>
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
