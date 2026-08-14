import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DesignTabProps } from './DesignTab.types';
import {
  COVER_STYLES,
  TYPOGRAPHY_OPTIONS,
  COLOR_PALETTES,
  THUMBNAIL_SIZES,
} from '../../../../constants/designOptions';
import { cn } from '../../../../lib/utils';
import './DesignWorkspace.css';

const FEATURED_COVER_IDS = ['left', 'stripe', 'journal'] as const;

function ThumbnailSizePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (size: string) => void;
}) {
  const options = THUMBNAIL_SIZES.filter((item) =>
    ['regular', 'small', 'large'].includes(item.id)
  );

  return (
    <div className="cd-design-panel__thumb-row">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={cn('cd-design-panel__thumb-card', value === option.id && 'active')}
          onClick={() => onChange(option.id)}
        >
          <span className="cd-design-panel__thumb-icon" aria-hidden>
            {option.id === 'small' ? (
              <svg width="36" height="36" viewBox="0 0 40 40" fill="currentColor">
                <rect x="6" y="8" width="5" height="7" />
                <rect x="13" y="8" width="5" height="7" />
                <rect x="20" y="8" width="5" height="7" />
                <rect x="27" y="8" width="5" height="7" />
                <rect x="6" y="17" width="5" height="7" />
                <rect x="13" y="17" width="5" height="7" />
                <rect x="20" y="17" width="5" height="7" />
                <rect x="27" y="17" width="5" height="7" />
                <rect x="6" y="26" width="5" height="7" />
                <rect x="13" y="26" width="5" height="7" />
                <rect x="20" y="26" width="5" height="7" />
                <rect x="27" y="26" width="5" height="7" />
              </svg>
            ) : option.id === 'large' ? (
              <svg width="36" height="36" viewBox="0 0 40 40" fill="currentColor">
                <rect x="8" y="10" width="10" height="10" />
                <rect x="22" y="10" width="10" height="10" />
                <rect x="8" y="24" width="10" height="10" />
                <rect x="22" y="24" width="10" height="10" />
              </svg>
            ) : (
              <svg width="36" height="36" viewBox="0 0 40 40" fill="currentColor">
                <rect x="7" y="10" width="7" height="9" />
                <rect x="16" y="10" width="7" height="9" />
                <rect x="25" y="10" width="7" height="9" />
                <rect x="7" y="21" width="7" height="9" />
                <rect x="16" y="21" width="7" height="9" />
                <rect x="25" y="21" width="7" height="9" />
              </svg>
            )}
          </span>
          <span className="cd-design-panel__thumb-label">{option.name}</span>
        </button>
      ))}
    </div>
  );
}

export const DesignPanel: React.FC<DesignTabProps> = ({
  settings,
  coverPhotoUrl,
  onSettingsChange,
  onOpenCoverModal,
  onOpenFocalModal,
}) => {
  const [moreCoversOpen, setMoreCoversOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const featuredCovers = COVER_STYLES.filter((style) =>
    FEATURED_COVER_IDS.includes(style.id as (typeof FEATURED_COVER_IDS)[number])
  );
  const moreCovers = COVER_STYLES.filter(
    (style) => !FEATURED_COVER_IDS.includes(style.id as (typeof FEATURED_COVER_IDS)[number])
  );

  const coverLabel =
    COVER_STYLES.find((item) => item.id === settings.coverStyle)?.name ?? 'Novel';
  const fontLabel =
    TYPOGRAPHY_OPTIONS.find((item) => item.id === settings.fontFamily)?.name ?? 'Sans';
  const paletteLabel =
    COLOR_PALETTES.find((item) => item.id === settings.colorPalette)?.name ?? 'Light';
  const thumbLabel =
    THUMBNAIL_SIZES.find((item) => item.id === settings.grid.size)?.name?.toLowerCase() ??
    'regular';

  const imageStyle = coverPhotoUrl ? { backgroundImage: `url(${coverPhotoUrl})` } : {};

  useEffect(() => {
    if (!moreCoversOpen) return undefined;
    const handleClick = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreCoversOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreCoversOpen]);

  const handleCoverChange = (id: typeof settings.coverStyle) => {
    onSettingsChange({ ...settings, coverStyle: id });
    setMoreCoversOpen(false);
  };

  const handleFontChange = (id: typeof settings.fontFamily) => {
    onSettingsChange({ ...settings, fontFamily: id });
  };

  const handlePaletteChange = (id: typeof settings.colorPalette) => {
    onSettingsChange({ ...settings, colorPalette: id });
  };

  const handleThumbChange = (size: string) => {
    onSettingsChange({ ...settings, grid: { ...settings.grid, size: size as typeof settings.grid.size } });
  };

  const selectedInMore = moreCovers.some((item) => item.id === settings.coverStyle);

  return (
    <aside className="cd-design-panel">
      <div className="cd-design-panel__scroll">
        <section className="cd-design-panel__section">
          <div className="cd-design-panel__section-head">
            <h3 className="cd-design-panel__section-title">Cover layout</h3>
            <div className="cd-design-panel__cover-actions">
              <button type="button" className="cd-design-panel__link-btn" onClick={onOpenCoverModal}>
                Cover photo
              </button>
              <button type="button" className="cd-design-panel__link-btn" onClick={onOpenFocalModal}>
                Focal
              </button>
            </div>
          </div>

          <div className="cd-design-panel__cover-row">
            {featuredCovers.map((style) => (
              <button
                key={style.id}
                type="button"
                className={cn(
                  'cd-design-panel__cover-tab',
                  settings.coverStyle === style.id && 'active'
                )}
                onClick={() => handleCoverChange(style.id)}
              >
                <span className="cd-design-panel__cover-tab-preview">
                  <span className={cn('preview-box', `style-${style.id}`)}>
                    <span className="preview-content">
                      <span className="preview-image" style={imageStyle} />
                      <span className="preview-title">TITLE</span>
                    </span>
                  </span>
                </span>
                <span className="cd-design-panel__cover-tab-label">{style.name}</span>
              </button>
            ))}

            <div className={cn('cd-design-panel__more-wrap', moreCoversOpen && 'open')} ref={moreRef}>
              <button
                type="button"
                className={cn(
                  'cd-design-panel__more-btn',
                  (moreCoversOpen || selectedInMore) && 'active'
                )}
                onClick={() => setMoreCoversOpen((open) => !open)}
              >
                {moreCovers.length} more
                <ChevronDown size={14} aria-hidden />
              </button>
              {moreCoversOpen ? (
                <div className="cd-design-panel__more-menu">
                  {moreCovers.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      className={cn(
                        'cd-design-panel__more-item',
                        settings.coverStyle === style.id && 'active'
                      )}
                      onClick={() => handleCoverChange(style.id)}
                    >
                      <span className="cd-design-panel__cover-tab-preview cd-design-panel__cover-tab-preview--menu">
                        <span className={cn('preview-box', `style-${style.id}`)}>
                          <span className="preview-content">
                            <span className="preview-image" style={imageStyle} />
                            <span className="preview-title">TITLE</span>
                          </span>
                        </span>
                      </span>
                      <span>{style.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="cd-design-panel__section">
          <h3 className="cd-design-panel__section-title">Typeface</h3>
          <div className="cd-design-panel__type-grid">
            {TYPOGRAPHY_OPTIONS.slice(0, 4).map((option) => (
              <button
                key={option.id}
                type="button"
                className={cn(
                  'cd-design-panel__type-card',
                  settings.fontFamily === option.id && 'active'
                )}
                onClick={() => handleFontChange(option.id)}
              >
                <span className={cn('cd-design-panel__type-sample', `font-preview-${option.id}`)}>
                  {option.sample}
                </span>
                <span className="cd-design-panel__type-name">{option.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="cd-design-panel__section">
          <h3 className="cd-design-panel__section-title">Palette</h3>
          <div className="cd-design-panel__palette-row">
            {COLOR_PALETTES.map((palette) => (
              <button
                key={palette.id}
                type="button"
                className={cn(
                  'cd-design-panel__palette-card',
                  settings.colorPalette === palette.id && 'active'
                )}
                onClick={() => handlePaletteChange(palette.id)}
              >
                <span className="cd-design-panel__palette-swatches">
                  {palette.colors.map((color, index) => (
                    <span
                      key={index}
                      className="cd-design-panel__palette-swatch"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="cd-design-panel__palette-name">{palette.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="cd-design-panel__section">
          <h3 className="cd-design-panel__section-title">Thumbnail size</h3>
          <ThumbnailSizePicker value={settings.grid.size} onChange={handleThumbChange} />
          <p className="cd-design-panel__thumb-hint">
            {thumbLabel.charAt(0).toUpperCase() + thumbLabel.slice(1)} · about{' '}
            {settings.grid.size === 'large' ? '25' : settings.grid.size === 'small' ? '60' : '45'} on
            screen
          </p>
        </section>
      </div>

      <footer className="cd-design-panel__footer">
        <p className="cd-design-panel__summary">
          {coverLabel} · {fontLabel} · {paletteLabel} · {thumbLabel} thumbnails · inherited from
          your last delivery.{' '}
          <button type="button" className="cd-design-panel__reset">
            reset
          </button>
        </p>
      </footer>
    </aside>
  );
};

export default DesignPanel;
