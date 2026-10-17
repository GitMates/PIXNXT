import { useEffect, useRef, useState } from 'react';
import {
  getPhotoStreamPhase,
  getPhotoVideoPoster,
  getPhotoVideoSrc,
  isVideoPreviewClip,
} from '../../../lib/photoDisplayUrl';
import './GalleryVideo.css';

function isHlsUrl(src) {
  return /\.m3u8(\?|#|$)/i.test(src || '');
}

/**
 * Plays a gallery film. HLS (Cloudflare Stream) uses hls.js on browsers that
 * cannot play a manifest natively. The R2 original is only used when Stream
 * has not been started for that file.
 */
export function GalleryVideo({
  photo,
  filmPlayback = 'adapt',
  className = '',
  style,
  controls = false,
  autoPlay = false,
  muted = false,
  loop = false,
  playsInline = true,
  hoverPreview = false,
  fit = 'contain',
  onClick,
}) {
  const videoRef = useRef(null);
  const phase = getPhotoStreamPhase(photo);
  const src = getPhotoVideoSrc(photo);
  const poster = getPhotoVideoPoster(photo);
  const [previewOn, setPreviewOn] = useState(false);
  const [previewFrame, setPreviewFrame] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || phase === 'preparing') return undefined;
    if (hoverPreview && !previewOn) return undefined;
    let cancelled = false;
    let hls = null;
    let detach = () => {};

    const play = () => {
      if (autoPlay || hoverPreview) video.play().catch(() => {});
    };

    const useNative = !isHlsUrl(src) || video.canPlayType('application/vnd.apple.mpegurl');
    if (useNative) {
      video.src = src;
      play();
      detach = () => {
        video.pause();
        video.removeAttribute('src');
        video.load();
      };
    } else {
      import('hls.js').then(({ default: Hls }) => {
        if (cancelled || !videoRef.current || !Hls.isSupported()) return;
        const highest = filmPlayback === 'highest' && !hoverPreview;
        hls = new Hls({
          capLevelToPlayerSize: !highest,
          startLevel: highest ? -1 : 0,
          maxBufferLength: hoverPreview ? 8 : 20,
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (highest && hls.levels?.length) hls.currentLevel = hls.levels.length - 1;
          play();
        });
      });
      detach = () => {
        hls?.destroy();
        hls = null;
      };
    }

    return () => {
      cancelled = true;
      detach();
    };
  }, [src, phase, filmPlayback, autoPlay, hoverPreview, previewOn]);

  if (phase === 'preparing') {
    return (
      <div className={`gallery-video-preparing ${className}`.trim()} style={style} onClick={onClick}>
        {poster ? <img src={poster} alt="" /> : null}
        <p>Preparing this film. Playback starts as soon as it is ready.</p>
      </div>
    );
  }

  if (hoverPreview) {
    return (
      <div
        className={`gallery-video-still ${className}`.trim()}
        style={style}
        onMouseEnter={() => setPreviewOn(true)}
        onMouseLeave={() => {
          setPreviewOn(false);
          setPreviewFrame(false);
        }}
      >
        {poster ? <img src={poster} alt="" /> : null}
        {previewOn && src ? (
          <video
            ref={videoRef}
            className={`gallery-video gallery-video--${fit}${previewFrame ? ' gallery-video-preview-on' : ''}`}
            muted
            loop
            playsInline
            preload="auto"
            onPlaying={() => setPreviewFrame(true)}
          />
        ) : null}
      </div>
    );
  }

  if (!src) return null;

  const isPreview = isVideoPreviewClip(photo);
  const durationMin = Math.round((Number(photo?.video_duration_seconds) || 0) / 60);

  return (
    <div className={`gallery-video-shell ${className}`.trim()} style={style} onClick={onClick}>
      <video
        ref={videoRef}
        src={isHlsUrl(src) ? undefined : src}
        poster={poster || undefined}
        className={`gallery-video gallery-video--${fit}`}
        style={{
          width: "100%",
          maxHeight: hoverPreview ? undefined : "calc(100dvh - 8rem)",
          background: "#000",
        }}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted || hoverPreview}
        loop={loop || hoverPreview}
        playsInline={playsInline}
        preload={hoverPreview ? 'none' : 'metadata'}
        onMouseEnter={hoverPreview ? (e) => e.currentTarget.play().catch(() => {}) : undefined}
        onMouseLeave={hoverPreview ? (e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; } : undefined}
      />
      {isPreview ? (
        <div className="gallery-video-preview-badge" aria-hidden="true">
          <span>
            3-min preview · Full film
            {durationMin > 0 ? ` (${durationMin}m)` : ''} available for download
          </span>
        </div>
      ) : null}
    </div>
  );
}
