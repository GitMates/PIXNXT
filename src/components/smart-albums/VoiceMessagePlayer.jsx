import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import './VoiceMessagePlayer.css';

const WAVE_BARS = 32;

function formatVoiceTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60);
    const secs = whole % 60;
    return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function readAudioDuration(audio) {
    const value = audio?.duration;
    if (Number.isFinite(value) && value > 0 && value !== Infinity) {
        return value;
    }
    return 0;
}

function resolveBlobDuration(audio) {
    return new Promise((resolve) => {
        if (!audio) {
            resolve(0);
            return;
        }

        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            cleanup();
            try {
                if (audio.currentTime > 0) audio.currentTime = 0;
            } catch {
                /* ignore */
            }
            resolve(value > 0 ? value : 0);
        };

        const cleanup = () => {
            audio.removeEventListener('loadedmetadata', onMetadata);
            audio.removeEventListener('durationchange', onMetadata);
            audio.removeEventListener('timeupdate', onTimeUpdate);
            window.clearTimeout(timeoutId);
        };

        const onTimeUpdate = () => {
            const seeked = audio.currentTime;
            if (seeked > 0 && Number.isFinite(seeked)) {
                finish(seeked);
            }
        };

        const onMetadata = () => {
            const next = readAudioDuration(audio);
            if (next > 0) {
                finish(next);
                return;
            }
            if (audio.duration === Infinity || !Number.isFinite(audio.duration)) {
                audio.addEventListener('timeupdate', onTimeUpdate);
                try {
                    audio.currentTime = Number.MAX_SAFE_INTEGER;
                } catch {
                    finish(0);
                }
            } else {
                finish(0);
            }
        };

        const existing = readAudioDuration(audio);
        if (existing > 0) {
            finish(existing);
            return;
        }

        audio.addEventListener('loadedmetadata', onMetadata);
        audio.addEventListener('durationchange', onMetadata);

        const timeoutId = window.setTimeout(() => finish(readAudioDuration(audio)), 1500);
    });
}

export default function VoiceMessagePlayer({
    src,
    onRemove,
    removeLabel = 'Remove',
    className = '',
    ariaLabel = 'Voice message',
}) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [current, setCurrent] = useState(0);
    const [durationReady, setDurationReady] = useState(false);

    const safeDuration = duration > 0 ? duration : 0;
    const safeCurrent =
        safeDuration > 0 ? Math.min(current, safeDuration) : Math.max(0, current);
    const progress =
        safeDuration > 0 ? Math.min(100, (safeCurrent / safeDuration) * 100) : 0;

    const syncTime = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        setCurrent(audio.currentTime || 0);
        const nextDuration = readAudioDuration(audio);
        if (nextDuration > 0) {
            setDuration(nextDuration);
            setDurationReady(true);
        }
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return undefined;

        let cancelled = false;

        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onEnded = () => {
            setPlaying(false);
            setCurrent(0);
        };
        const onLoaded = () => syncTime();
        const onTimeUpdate = () => syncTime();

        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('durationchange', onLoaded);
        audio.addEventListener('timeupdate', onTimeUpdate);

        void resolveBlobDuration(audio).then((resolved) => {
            if (cancelled) return;
            if (resolved > 0) {
                setDuration(resolved);
                setDurationReady(true);
            }
        });

        return () => {
            cancelled = true;
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('loadedmetadata', onLoaded);
            audio.removeEventListener('durationchange', onLoaded);
            audio.removeEventListener('timeupdate', onTimeUpdate);
        };
    }, [src, syncTime]);

    useEffect(() => {
        setPlaying(false);
        setCurrent(0);
        setDuration(0);
        setDurationReady(false);
    }, [src]);

    const togglePlayback = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            void audio.play().catch(() => {
                setPlaying(false);
            });
        } else {
            audio.pause();
        }
    }, []);

    const handleSeek = useCallback(
        (event) => {
            const audio = audioRef.current;
            if (!audio || !safeDuration) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const ratio = Math.min(
                1,
                Math.max(0, (event.clientX - rect.left) / rect.width)
            );
            audio.currentTime = ratio * safeDuration;
            syncTime();
        },
        [safeDuration, syncTime]
    );

    const displayTime =
        playing || safeCurrent > 0
            ? formatVoiceTime(safeCurrent)
            : durationReady
              ? formatVoiceTime(safeDuration)
              : '0:00';

    return (
        <div
            className={`av-voice-player${playing ? ' av-voice-player--playing' : ''}${
                className ? ` ${className}` : ''
            }`}
            aria-label={ariaLabel}
        >
            <div className="av-voice-player__body">
                <button
                    type="button"
                    className="av-voice-player__play"
                    onClick={togglePlayback}
                    aria-label={playing ? 'Pause voice message' : 'Play voice message'}
                >
                    {playing ? (
                        <Pause size={16} fill="currentColor" />
                    ) : (
                        <Play size={16} fill="currentColor" />
                    )}
                </button>

                <button
                    type="button"
                    className="av-voice-player__wave-track"
                    onClick={handleSeek}
                    aria-label="Seek voice message"
                >
                    <span className="av-voice-player__wave" aria-hidden>
                        {Array.from({ length: WAVE_BARS }, (_, index) => {
                            const barProgress = ((index + 1) / WAVE_BARS) * 100;
                            const isPlayed = barProgress <= progress;
                            return (
                                <span
                                    key={index}
                                    className={`av-voice-player__bar${
                                        isPlayed ? ' av-voice-player__bar--played' : ''
                                    }${playing ? ' av-voice-player__bar--live' : ''}`}
                                    style={{
                                        '--bar-scale': `${0.28 + ((index * 13) % 9) / 12}`,
                                    }}
                                />
                            );
                        })}
                    </span>
                </button>

                <span className="av-voice-player__time">{displayTime}</span>

                {onRemove ? (
                    <button
                        type="button"
                        className="av-voice-player__remove"
                        onClick={onRemove}
                        aria-label={removeLabel}
                        title={removeLabel}
                    >
                        <X size={14} />
                    </button>
                ) : null}
            </div>
            <audio ref={audioRef} src={src} preload="metadata" className="av-voice-player__audio" />
        </div>
    );
}
