import React, { useEffect, useMemo, useState } from 'react';
import {
  buildHorizontalGridRows,
  buildPhotoAspectRatioMap,
  getPhotoAspectRatio,
  getPhotoOrientation,
  sortPhotosByGridStyle,
} from '../../lib/mobileGalleryGrid';

function usePhotoAspectRatios(photos) {
  const [measured, setMeasured] = useState({});

  useEffect(() => {
    photos.forEach((photo) => {
      if (!photo?.id || (photo.width && photo.height)) return;

      const src = photo.thumbnail_url || photo.full_url;
      if (!src) return;

      const img = new Image();
      img.onload = () => {
        setMeasured((prev) => {
          if (prev[photo.id]) return prev;
          return { ...prev, [photo.id]: img.width / img.height };
        });
      };
      img.src = src;
    });
  }, [photos]);

  return measured;
}

function GridCellImage({ photo }) {
  const src = photo.thumbnail_url || photo.full_url;
  if (!src) return <div className="mg-photo-grid-placeholder" aria-hidden />;

  return <img src={src} alt="" loading="lazy" />;
}

export function useMobileGalleryGridPhotos(photos, gridStyle) {
  const measured = usePhotoAspectRatios(photos);
  const aspectRatios = useMemo(
    () => buildPhotoAspectRatioMap(photos, measured),
    [photos, measured]
  );

  const sortedPhotos = useMemo(
    () => sortPhotosByGridStyle(photos, gridStyle, aspectRatios),
    [photos, gridStyle, aspectRatios]
  );

  return { sortedPhotos, aspectRatios };
}

function PhotoGridCell({
  photo,
  aspectRatios,
  variant,
  onPhotoClick,
  index,
  wide = false,
  narrow = false,
}) {
  const aspectRatio = getPhotoAspectRatio(photo, aspectRatios);
  const orientation = getPhotoOrientation(photo, aspectRatios);

  const cellClassName = [
    'mg-photo-grid-cell',
    'mg-photo-grid-cell--horizontal',
    orientation !== 'square' ? `mg-photo-grid-cell--${orientation}` : '',
    wide ? 'mg-photo-grid-cell--wide' : '',
    narrow ? 'mg-photo-grid-cell--narrow' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = String(photo.id).startsWith('placeholder-') ? (
    <div className="mg-photo-grid-placeholder" aria-hidden />
  ) : (
    <GridCellImage photo={photo} />
  );

  const style = { aspectRatio: String(aspectRatio) };

  if (variant === 'interactive') {
    return (
      <button
        type="button"
        className={cellClassName}
        style={style}
        onClick={() => onPhotoClick?.(index, photo)}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cellClassName} style={style}>
      {content}
    </div>
  );
}

export default function MobileGalleryPhotoGrid({
  photos = [],
  gridStyle = 'vertical',
  variant = 'design',
  maxPhotos,
  placeholderCount = 6,
  onPhotoClick,
  className = '',
}) {
  const { sortedPhotos, aspectRatios } = useMobileGalleryGridPhotos(photos, gridStyle);
  const isHorizontal = gridStyle === 'horizontal';

  const displayPhotos = sortedPhotos.length
    ? sortedPhotos.slice(0, maxPhotos ?? sortedPhotos.length)
    : Array.from({ length: placeholderCount }).map((_, index) => ({ id: `placeholder-${index}` }));

  const horizontalRows = isHorizontal
    ? buildHorizontalGridRows(displayPhotos, aspectRatios)
    : [];

  const gridClassName = [
    'mg-photo-grid',
    `mg-photo-grid--${gridStyle}`,
    `mg-photo-grid--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (isHorizontal) {
    const photoIndexMap = new Map(sortedPhotos.map((photo, index) => [photo.id, index]));

    return (
      <div className={gridClassName}>
        {horizontalRows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className={`mg-photo-grid-row mg-photo-grid-row--${row.layout}`}>
            {row.photos.map((photo, cellIndex) => (
              <PhotoGridCell
                key={photo.id}
                photo={photo}
                aspectRatios={aspectRatios}
                variant={variant}
                onPhotoClick={onPhotoClick}
                index={photoIndexMap.get(photo.id) ?? 0}
                wide={row.layout === 'split' && cellIndex === row.wideIndex}
                narrow={row.layout === 'split' && cellIndex !== row.wideIndex}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={gridClassName}>
      {displayPhotos.map((photo, index) => {
        const isPlaceholder = String(photo.id).startsWith('placeholder-');
        const aspectRatio = isPlaceholder ? 1 : getPhotoAspectRatio(photo, aspectRatios);
        const orientation = isPlaceholder ? 'square' : getPhotoOrientation(photo, aspectRatios);

        const cellClassName = [
          'mg-photo-grid-cell',
          'mg-photo-grid-cell--vertical',
          !isPlaceholder && orientation !== 'square' ? `mg-photo-grid-cell--${orientation}` : '',
        ]
          .filter(Boolean)
          .join(' ');

        const style = { aspectRatio: String(aspectRatio) };

        const content = isPlaceholder ? (
          <div className="mg-photo-grid-placeholder" aria-hidden />
        ) : (
          <GridCellImage photo={photo} />
        );

        if (variant === 'interactive') {
          return (
            <button
              key={photo.id}
              type="button"
              className={cellClassName}
              style={style}
              onClick={() => onPhotoClick?.(index, photo)}
            >
              {content}
            </button>
          );
        }

        return (
          <div key={photo.id} className={cellClassName} style={style}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
