import React from 'react';
import { galleryService } from '../../../../services/gallery.service';
import { StoreSettingsProps } from './Settings.types';
import { SettingsCard, ToggleRow } from './settingsCardKit';
import './BasicsSettings.css';
import './SettingsCards.css';

export const StoreSettings: React.FC<StoreSettingsProps> = ({
  collectionId,
  collection,
  setCollection,
  storeEnabled,
  setStoreEnabled,
  setActiveSidebarTab,
  setActiveActivitySubTab,
}) => {
  const [openCard, setOpenCard] = React.useState<string | null>(null);
  const [guestPrints, setGuestPrints] = React.useState(collection?.guest_prints_enabled !== false);
  const [markup, setMarkup] = React.useState(
    collection?.print_markup_percent != null ? String(collection.print_markup_percent) : '40',
  );

  React.useEffect(() => {
    setGuestPrints(collection?.guest_prints_enabled !== false);
    setMarkup(collection?.print_markup_percent != null ? String(collection.print_markup_percent) : '40');
  }, [collection?.guest_prints_enabled, collection?.print_markup_percent]);

  const persist = async (patch: Record<string, unknown>) => {
    try {
      const updated = await galleryService.updateCollection(collectionId, patch);
      setCollection?.((prev: any) => (prev ? { ...prev, ...(updated || patch) } : prev));
    } catch (err) {
      console.error('Failed to save print lab setting:', err);
    }
  };

  const toggleCard = (id: string) => setOpenCard((current) => (current === id ? null : id));
  const coverUrl = collection?.cover_url || '';
  const markupLabel = `${Number(markup) || 0}%`;

  const sellingSummary = (
    <>
      Prints are <strong>{storeEnabled ? 'on' : 'off'}</strong>.{' '}
      {storeEnabled ? (
        guestPrints ? (
          <>Guests are offered them on <strong>their own photographs</strong> after guest delivery.</>
        ) : (
          <>Only your client is offered them — <strong>guests see no prints</strong>.</>
        )
      ) : (
        <>Nothing can be ordered from inside this gallery.</>
      )}
    </>
  );

  const pricingSummary = (
    <>
      Your <strong>studio default</strong> list, at <strong>{markupLabel}</strong> above lab cost.
    </>
  );

  return (
    <div className="cd-general-settings-view cd-basics">
      <header className="cd-basics__header">
        <h2 className="cd-basics__title">Print Lab</h2>
        <p className="cd-basics__kicker">this delivery</p>
        <p className="cd-basics__lead">What your client can order without leaving the gallery.</p>
      </header>

      <div className="cd-basics__cards">
        <SettingsCard
          id="selling"
          openId={openCard}
          onToggle={toggleCard}
          title="Selling from this delivery"
          summary={sellingSummary}
          icon={(
            <span className="cd-basics-card__icon cd-basics-card__icon--frame">
              <span className="cd-basics-frame" />
              <span className="cd-basics-card__brand">{storeEnabled ? 'Prints on' : 'Prints off'}</span>
            </span>
          )}
        >
          <div className="cd-basics-toggles">
            <ToggleRow
              title="Print Lab"
              desc="Visitors can order prints and products from inside the gallery."
              checked={storeEnabled}
              onChange={setStoreEnabled}
            />
            <ToggleRow
              title="Offer prints to guests"
              desc={'"Take these home" appears on each guest\'s own photographs after guest delivery.'}
              checked={guestPrints}
              onChange={(next) => {
                setGuestPrints(next);
                void persist({ guest_prints_enabled: next });
              }}
            />
          </div>
          <p className="cd-basics-hint">
            Print Lab is part of the gallery, not a separate store — same header, same palette, no second
            link to share.
          </p>
        </SettingsCard>

        <SettingsCard
          id="pricing"
          openId={openCard}
          onToggle={toggleCard}
          title="Pricing"
          summary={pricingSummary}
          icon={(
            <span className="cd-basics-card__icon cd-basics-card__icon--cover">
              {coverUrl ? <img src={coverUrl} alt="" /> : null}
              <span className="cd-basics-card__brand">{markupLabel} margin</span>
            </span>
          )}
        >
          <div className="cd-basics-field">
            <span className="cd-basics-label">Margin above lab cost</span>
            <div className="cd-basics-input-row">
              <input
                type="number"
                min={0}
                className="cd-basics-input cd-basics-input--sm"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                onBlur={() => void persist({ print_markup_percent: markup === '' ? null : Number(markup) })}
              />
              <button
                type="button"
                className="cd-basics-btn"
                onClick={() => window.open('/store/orders', '_blank', 'noopener,noreferrer')}
              >
                Open price list
              </button>
            </div>
            <p className="cd-basics-hint">
              Every product in the studio default list is sold at this margin unless you price it yourself.
            </p>
          </div>

          <div className="cd-basics-actions-row">
            <button
              type="button"
              className="cd-basics-btn"
              onClick={() => {
                setActiveSidebarTab('activity');
                setActiveActivitySubTab('store');
              }}
            >
              Print Lab activity
            </button>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
};
