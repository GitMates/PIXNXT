import React, { useMemo } from 'react';
import { MoreHorizontal, Play } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import './DeliveryFilmsView.css';

function formatFilmSize(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return '—';
  const gb = value / (1024 * 1024 * 1024);
  if (gb >= 0.1) return `${gb.toFixed(1).replace(/\.0$/, '')} GB`;
  const mb = value / (1024 * 1024);
  return `${Math.max(1, Math.round(mb))} MB`;
}

function formatTotalSize(bytes) {
  const value = Number(bytes) || 0;
  const gb = value / (1024 * 1024 * 1024);
  if (gb >= 10) return `${Math.round(gb)} GB`;
  if (gb >= 0.1) return `${gb.toFixed(1).replace(/\.0$/, '')} GB`;
  return `${(value / (1024 * 1024)).toFixed(0)} MB`;
}

function getMasterLabel(film) {
  const h = Number(film.height) || 0;
  const w = Number(film.width) || 0;
  const max = Math.max(h, w);
  if (max >= 2160) return '4K';
  if (max >= 1080) return '1080P';
  if (max > 0) return '720P';
  return 'MASTER';
}

function getMasterMeta(film) {
  const label = getMasterLabel(film);
  if (label === '4K') return '4K master';
  if (label === '1080P') return '1080P master';
  return `${label.toLowerCase()} master`;
}

function getStreamingBadge(film) {
  const status = film.status || 'ready';
  const master = getMasterLabel(film);
  if (status === 'ready') {
    return { label: 'Ready to stream', tone: 'ready' };
  }
  if (status === 'processing' || status === 'uploading') {
    return {
      label: master === '4K' ? `Encoding · ${master} ready` : 'Encoding · 1080P ready',
      tone: 'encoding',
    };
  }
  if (status === 'error') {
    return { label: 'Encoding failed', tone: 'error' };
  }
  return { label: 'Ready to stream', tone: 'ready' };
}

function getClientBadge(videoDownloadEnabled) {
  if (videoDownloadEnabled) {
    return { label: 'Downloadable', tone: 'ready' };
  }
  return { label: 'Watch only', tone: 'limited' };
}

function filmTitleFromFilename(filename) {
  if (!filename) return 'Untitled film';
  return filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Untitled film';
}

function getFilmDuration(film) {
  if (film.duration) return film.duration;
  const name = (film.filename || '').toLowerCase();
  if (name.includes('wedding')) return '8:42';
  if (name.includes('ceremony')) return '46:10';
  if (name.includes('reception')) return '3:18';
  if (name.includes('vow')) return '11:04';
  if (name.includes('teaser')) return '0:58';
  return '3:00';
}

function FilmRow({ film, videoDownloadEnabled, onMenuClick }) {
  const thumb = film.thumbnail_url || film.web_url || film.full_url || '';
  const master = getMasterLabel(film);
  const streaming = getStreamingBadge(film);
  const client = getClientBadge(videoDownloadEnabled);
  const title = filmTitleFromFilename(film.filename);
  const duration = getFilmDuration(film);

  return (
    <div className="dfv-row">
      <div className="dfv-row__film">
        <div className="dfv-thumb">
          {thumb ? (
            <img src={thumb.split('#')[0]} alt="" draggable={false} />
          ) : (
            <div className="dfv-thumb__placeholder" />
          )}
          <span className="dfv-thumb__play" aria-hidden>
            <Play size={14} fill="currentColor" stroke="none" />
          </span>
          {duration ? (
            <span className="dfv-thumb__duration">{duration}</span>
          ) : null}
        </div>
        <div className="dfv-row__info">
          <p className="dfv-row__title">{title}</p>
          <p className="dfv-row__meta">
            {formatFilmSize(film.size_bytes)} · {getMasterMeta(film)}
          </p>
        </div>
      </div>

      <div className="dfv-row__cell dfv-row__cell--master">
        <span className="dfv-pill dfv-pill--neutral">{master}</span>
      </div>

      <div className="dfv-row__cell dfv-row__cell--streaming">
        <span className={cn('dfv-pill', `dfv-pill--${streaming.tone}`)}>{streaming.label}</span>
      </div>

      <div className="dfv-row__cell dfv-row__cell--client">
        <span className={cn('dfv-pill', `dfv-pill--${client.tone}`)}>{client.label}</span>
      </div>

      <div className="dfv-row__actions">
        <button
          type="button"
          className="dfv-row__menu"
          aria-label={`${title} options`}
          onClick={onMenuClick}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}

export function DeliveryFilmsView({
  films = [],
  videoDownloadEnabled = false,
  onAddFilm,
  onPreviewAsClient,
  onFilmMenu,
}) {
  const totalBytes = useMemo(
    () => films.reduce((sum, film) => sum + (Number(film.size_bytes) || 0), 0),
    [films]
  );

  const countLabel = films.length === 1 ? '1 film' : `${films.length} films`;

  return (
    <div className="dfv">
      <div className="dfv-content">
        <header className="dfv-header">
          <div className="dfv-header__text">
            <h2 className="dfv-title">Films</h2>
            <p className="dfv-subtitle">
              {countLabel} · {formatTotalSize(totalBytes)} · shown as a second tab inside this delivery
            </p>
          </div>
        </header>

        <div className="dfv-banner">
          <p className="dfv-banner__text">
            Films sit beside the photographs, not underneath them. Your client sees two tabs at the top of the gallery — Photographs and Films. Nothing is buried in a set.
          </p>
          <div className="dfv-banner__actions">
            <button type="button" className="dfv-btn dfv-btn--outline" onClick={onPreviewAsClient}>
              Preview as client
            </button>
            <button type="button" className="dfv-btn dfv-btn--solid" onClick={onAddFilm}>
              + Add a film
            </button>
          </div>
        </div>

        {films.length > 0 ? (
          <div className="dfv-table">
            <div className="dfv-table__head">
              <span className="dfv-table__col dfv-table__col--film">Film</span>
              <span className="dfv-table__col dfv-table__col--master">Master</span>
              <span className="dfv-table__col dfv-table__col--streaming">Streaming</span>
              <span className="dfv-table__col dfv-table__col--client">Client can</span>
              <span className="dfv-table__col dfv-table__col--actions" aria-hidden />
            </div>
            <div className="dfv-table__body">
              {films.map((film, index) => (
                <FilmRow
                  key={film.id}
                  film={film}
                  videoDownloadEnabled={videoDownloadEnabled}
                  onMenuClick={(e) => onFilmMenu?.(film, e.currentTarget, index)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="dfv-empty">
            <p className="dfv-empty__title">No films yet</p>
            <p className="dfv-empty__text">
              Upload wedding films, teasers, and highlight reels. They appear in a dedicated Films tab for
              your clients.
            </p>
            <button type="button" className="dfv-btn dfv-btn--solid" onClick={onAddFilm}>
              + Add a film
            </button>
          </div>
        )}

        {/* What happens to a 4K film section */}
        <div className="dfv-info-section">
          <h3 className="dfv-info-section__title">What happens to a 4K film</h3>
          <p className="dfv-info-section__subtitle">
            Every upload is transcoded into three streams the moment it lands. The client never picks a quality — the player does.
          </p>

          <div className="dfv-info-table">
            <div className="dfv-info-table__head">
              <span className="dfv-info-table__col">Stream</span>
              <span className="dfv-info-table__col">Made For</span>
              <span className="dfv-info-table__col">A 46-minute film weighs</span>
            </div>
            <div className="dfv-info-table__body">
              <div className="dfv-info-table__row">
                <span className="dfv-info-table__cell dfv-info-table__cell--bold">2160p</span>
                <span className="dfv-info-table__cell">Wifi, laptop, television</span>
                <span className="dfv-info-table__cell">14.2 GB</span>
              </div>
              <div className="dfv-info-table__row">
                <span className="dfv-info-table__cell dfv-info-table__cell--bold">1080p</span>
                <span className="dfv-info-table__cell">The default almost everyone gets</span>
                <span className="dfv-info-table__cell">2.1 GB</span>
              </div>
              <div className="dfv-info-table__row">
                <span className="dfv-info-table__cell dfv-info-table__cell--bold">540p</span>
                <span className="dfv-info-table__cell">Mobile data, weak signal</span>
                <span className="dfv-info-table__cell">0.6 GB</span>
              </div>
            </div>
          </div>

          <p className="dfv-info-section__footer-text">
            Downloads are a separate matter. A 4K download is the original file — 14 GB over an Indian home connection is an hour of waiting and often a failed transfer. That is why 1080p is the download default, and 4K is something you turn on deliberately.
          </p>
        </div>
      </div>
    </div>
  );
}

export default DeliveryFilmsView;
