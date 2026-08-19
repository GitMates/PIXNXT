import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DesignTabProps } from './DesignTab.types';
import {
  COVER_STYLES,
  TYPOGRAPHY_OPTIONS,
  COLOR_PALETTES,
  THUMBNAIL_SIZES,
} from '../../../../constants/designOptions';
import { CoverStyleId, FontId, GridSettings, PaletteId } from '../../../../types/design.types';
import { galleryGridStyleLabel } from '../../../../lib/galleryGridStyle';
import { cn } from '../../../../lib/utils';
import { normalizeFontId, normalizePaletteId } from '../../../../lib/normalizeDesignTokens';
import { coverImageCssStyle } from '../../../../lib/focalPoint';
import './DesignWorkspace.css';

const FEATURED_COVER_IDS: CoverStyleId[] = [
  'novel',
  'center',
  'frame',
  'left',
  'stripe',
  'journal',
];

const MORE_COVER_IDS: CoverStyleId[] = [
  'classic',
  'vintage',
  'outline',
  'divider',
  'stamp',
  'none',
];

function coversByIds(ids: CoverStyleId[]) {
  const byId = new Map(COVER_STYLES.map((style) => [style.id, style]));
  return ids.flatMap((id) => {
    const style = byId.get(id);
    return style ? [style] : [];
  });
}

const THUMB_SIZE_OPTIONS: {
  id: 'large' | 'regular' | 'small';
  name: string;
  web: number;
  mobile: number;
  icon: React.ReactNode;
}[] = [
  {
    id: 'large',
    name: 'Large',
    web: 4,
    mobile: 2,
    icon: (
      <svg width="28" height="22" viewBox="0 0 28 22" fill="currentColor">
        <rect x="1" y="1" width="11" height="8" rx="0.5" />
        <rect x="16" y="1" width="11" height="8" rx="0.5" />
        <rect x="1" y="13" width="11" height="8" rx="0.5" />
        <rect x="16" y="13" width="11" height="8" rx="0.5" />
      </svg>
    ),
  },
  {
    id: 'regular',
    name: 'Regular',
    web: 6,
    mobile: 3,
    icon: (
      <svg width="28" height="22" viewBox="0 0 28 22" fill="currentColor">
        <rect x="1" y="1" width="7" height="8" rx="0.5" />
        <rect x="10.5" y="1" width="7" height="8" rx="0.5" />
        <rect x="20" y="1" width="7" height="8" rx="0.5" />
        <rect x="1" y="13" width="7" height="8" rx="0.5" />
        <rect x="10.5" y="13" width="7" height="8" rx="0.5" />
        <rect x="20" y="13" width="7" height="8" rx="0.5" />
      </svg>
    ),
  },
  {
    id: 'small',
    name: 'Small',
    web: 8,
    mobile: 4,
    icon: (
      <svg width="28" height="22" viewBox="0 0 28 22" fill="currentColor">
        <rect x="0.5" y="1" width="5.6" height="8" rx="0.4" />
        <rect x="7.6" y="1" width="5.6" height="8" rx="0.4" />
        <rect x="14.8" y="1" width="5.6" height="8" rx="0.4" />
        <rect x="21.9" y="1" width="5.6" height="8" rx="0.4" />
        <rect x="0.5" y="13" width="5.6" height="8" rx="0.4" />
        <rect x="7.6" y="13" width="5.6" height="8" rx="0.4" />
        <rect x="14.8" y="13" width="5.6" height="8" rx="0.4" />
        <rect x="21.9" y="13" width="5.6" height="8" rx="0.4" />
      </svg>
    ),
  },
];

function ThumbnailSizePicker({
  value,
  onChange,
}: {
  value: GridSettings['size'];
  onChange: (size: GridSettings['size']) => void;
}) {
  const selectedId =
    value === 'large' ? 'large' : value === 'small' || value === 'x-small' ? 'small' : 'regular';
  const selected = THUMB_SIZE_OPTIONS.find((item) => item.id === selectedId) ?? THUMB_SIZE_OPTIONS[1];

  return (
    <div className="cd-design-panel__thumb-row">
      {THUMB_SIZE_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={cn('cd-design-panel__thumb-btn', selectedId === option.id && 'active')}
          onClick={() => onChange(option.id)}
          aria-label={option.name}
        >
          {option.icon}
        </button>
      ))}
      <p className="cd-design-panel__thumb-hint">
        <strong>{selected.name}</strong>
        <span>
          {' '}
          · {selected.web} web · {selected.mobile} mobile
        </span>
      </p>
    </div>
  );
}

function CoverLayoutCard({
  style,
  active,
  imageStyle,
  onSelect,
}: {
  style: (typeof COVER_STYLES)[number];
  active: boolean;
  imageStyle: React.CSSProperties;
  onSelect: (id: CoverStyleId) => void;
}) {
  return (
    <button
      type="button"
      className={cn('cd-design-panel__cover-tab', active && 'active')}
      onClick={() => onSelect(style.id)}
    >
      <div className="cd-design-panel__cover-tab-preview">
        <div className={cn('preview-box', `style-${style.id}`)}>
          <div className="preview-content">
            <div className="preview-image" style={imageStyle} />
            <div className="preview-title">TITLE</div>
          </div>
        </div>
      </div>
      <span className="cd-design-panel__cover-tab-label">{style.name}</span>
    </button>
  );
}

function GridChoiceRow({
  options,
  value,
  onChange,
}: {
  options: { id: string; name: string; icon: React.ReactNode }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = options.find((opt) => opt.id === value) ?? options[0];
  return (
    <div className="cd-design-panel__thumb-row">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={cn('cd-design-panel__thumb-btn', value === option.id && 'active')}
          onClick={() => onChange(option.id)}
          aria-label={option.name}
        >
          {option.icon}
        </button>
      ))}
      <p className="cd-design-panel__thumb-hint">
        <strong>{selected.name}</strong>
      </p>
    </div>
  );
}

const GRID_STYLE_OPTIONS = [
  {
    id: 'vertical',
    name: galleryGridStyleLabel('vertical'),
    icon: (
      <svg width="24" height="24" viewBox="0 0 40 40" fill="currentColor">
        <rect x="8" y="8" width="10" height="10" />
        <rect x="8" y="22" width="10" height="10" />
        <rect x="22" y="8" width="10" height="24" />
      </svg>
    ),
  },
  {
    id: 'horizontal',
    name: galleryGridStyleLabel('horizontal'),
    icon: (
      <svg width="24" height="24" viewBox="0 0 40 40" fill="currentColor">
        <rect x="8" y="8" width="24" height="10" />
        <rect x="8" y="22" width="10" height="10" />
        <rect x="22" y="22" width="10" height="10" />
      </svg>
    ),
  },
];

const GRID_SPACING_OPTIONS = [
  {
    id: 'regular',
    name: 'Regular spacing',
    icon: (
      <svg width="24" height="24" viewBox="0 0 40 40" fill="currentColor">
        <rect x="11" y="11" width="6" height="6" />
        <rect x="23" y="11" width="6" height="6" />
        <rect x="11" y="23" width="6" height="6" />
        <rect x="23" y="23" width="6" height="6" />
      </svg>
    ),
  },
  {
    id: 'large',
    name: 'Large spacing',
    icon: (
      <svg width="24" height="24" viewBox="0 0 40 40" fill="currentColor">
        <rect x="14" y="14" width="12" height="12" />
      </svg>
    ),
  },
];

const NAVIGATION_OPTIONS = [
  {
    id: 'icon',
    name: 'Icon Only',
    icon: (
      <span className="cd-design-panel__nav-thumb">
        <span className="thumb-box-rounded" />
      </span>
    ),
  },
  {
    id: 'text',
    name: 'Icon & Text',
    icon: (
      <span className="cd-design-panel__nav-thumb">
        <span className="thumb-box-a">A</span>
      </span>
    ),
  },
];

export const DesignPanel: React.FC<DesignTabProps> = ({
  settings,
  coverPhotoUrl,
  coverFocalX = 50,
  coverFocalY = 50,
  onSettingsChange,
  onOpenCoverModal,
  onOpenFocalModal,
}) => {
  const featuredCovers = coversByIds(FEATURED_COVER_IDS);
  const moreCovers = coversByIds(MORE_COVER_IDS);
  const [moreCoversOpen, setMoreCoversOpen] = useState(() =>
    MORE_COVER_IDS.includes(settings.coverStyle)
  );

  const activeFont = normalizeFontId(settings.fontFamily);
  const activePalette = normalizePaletteId(settings.colorPalette);
  const coverLabel =
    COVER_STYLES.find((item) => item.id === settings.coverStyle)?.name ?? 'Novel';
  const fontLabel =
    TYPOGRAPHY_OPTIONS.find((item) => item.id === activeFont)?.name ?? 'Sans';
  const paletteLabel =
    COLOR_PALETTES.find((item) => item.id === activePalette)?.name ?? 'Light';
  const gridStyleLabel = galleryGridStyleLabel(settings.grid.style);
  const spacingLabel = settings.grid.spacing === 'large' ? 'large spacing' : 'regular spacing';
  const navLabel = settings.grid.navigation === 'text' ? 'icon & text' : 'icon only';
  const thumbLabel =
    THUMBNAIL_SIZES.find((item) => item.id === settings.grid.size)?.name?.toLowerCase() ??
    'regular';

  const imageStyle = coverImageCssStyle(coverPhotoUrl, coverFocalX, coverFocalY);

  const handleCoverChange = (id: CoverStyleId) => {
    onSettingsChange({ ...settings, coverStyle: id });
  };

  const handleFontChange = (id: FontId) => {
    onSettingsChange({ ...settings, fontFamily: id });
  };

  const handlePaletteChange = (id: PaletteId) => {
    onSettingsChange({ ...settings, colorPalette: id });
  };

  const handleGridChange = <K extends keyof GridSettings>(key: K, value: GridSettings[K]) => {
    onSettingsChange({ ...settings, grid: { ...settings.grid, [key]: value } });
  };

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

          <div className="cd-design-panel__cover-grid">
            {featuredCovers.map((style) => (
              <CoverLayoutCard
                key={style.id}
                style={style}
                active={settings.coverStyle === style.id}
                imageStyle={imageStyle}
                onSelect={handleCoverChange}
              />
            ))}
            {moreCoversOpen
              ? moreCovers.map((style) => (
                  <CoverLayoutCard
                    key={style.id}
                    style={style}
                    active={settings.coverStyle === style.id}
                    imageStyle={imageStyle}
                    onSelect={handleCoverChange}
                  />
                ))
              : null}
          </div>
          <button
            type="button"
            className={cn('cd-design-panel__more-btn', moreCoversOpen && 'active')}
            onClick={() => setMoreCoversOpen((open) => !open)}
          >
            {moreCoversOpen ? 'Show fewer' : `${moreCovers.length} more`}
            {moreCoversOpen ? (
              <ChevronUp size={14} aria-hidden />
            ) : (
              <ChevronDown size={14} aria-hidden />
            )}
          </button>
        </section>

        <section className="cd-design-panel__section">
          <h3 className="cd-design-panel__section-title">Typeface</h3>
          <div className="cd-design-panel__type-grid">
            {TYPOGRAPHY_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={cn(
                  'cd-design-panel__type-card',
                  `font-preview-${option.id}`,
                  activeFont === option.id && 'active'
                )}
                onClick={() => handleFontChange(option.id)}
              >
                <span className="cd-design-panel__type-sample sample-text">{option.sample}</span>
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
                  activePalette === palette.id && 'active'
                )}
                onClick={() => handlePaletteChange(palette.id)}
                aria-pressed={activePalette === palette.id}
                aria-label={palette.name}
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
          <h3 className="cd-design-panel__section-title">Grid style</h3>
          <GridChoiceRow
            options={GRID_STYLE_OPTIONS}
            value={settings.grid.style}
            onChange={(id) => handleGridChange('style', id as GridSettings['style'])}
          />
        </section>

        <section className="cd-design-panel__section">
          <h3 className="cd-design-panel__section-title">Thumbnail size</h3>
          <ThumbnailSizePicker
            value={settings.grid.size}
            onChange={(size) => handleGridChange('size', size)}
          />
        </section>

        <section className="cd-design-panel__section">
          <h3 className="cd-design-panel__section-title">Grid spacing</h3>
          <GridChoiceRow
            options={GRID_SPACING_OPTIONS}
            value={settings.grid.spacing === 'large' ? 'large' : 'regular'}
            onChange={(id) => handleGridChange('spacing', id as GridSettings['spacing'])}
          />
        </section>

        <section className="cd-design-panel__section">
          <h3 className="cd-design-panel__section-title">Navigation style</h3>
          <GridChoiceRow
            options={NAVIGATION_OPTIONS}
            value={settings.grid.navigation}
            onChange={(id) => handleGridChange('navigation', id as GridSettings['navigation'])}
          />
        </section>
      </div>

      <footer className="cd-design-panel__footer">
        <p className="cd-design-panel__summary">
          {coverLabel} · {fontLabel} · {paletteLabel} · {gridStyleLabel} · {thumbLabel} thumbnails ·{' '}
          {spacingLabel} · {navLabel} · inherited from your last delivery.{' '}
          <button type="button" className="cd-design-panel__reset">
            reset
          </button>
        </p>
      </footer>
    </aside>
  );
};

export default DesignPanel;
