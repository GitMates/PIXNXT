import React from 'react';
import { Check, X } from 'lucide-react';
import { VOICE_WAVEFORM_BARS } from './useFeedbackVoiceRecorder';
import './VoiceRecordingBar.css';

const DOT_SIZE = 3;
const MAX_BAR_H = 22;

/**
 * Light voice bar: silence → dots; speech → slow scrolling mic waveform.
 */
export default function VoiceRecordingBar({
    elapsedLabel = '0:00',
    levels = null,
    onCancel,
    onAccept,
    className = '',
}) {
    const bars =
        Array.isArray(levels) && levels.length
            ? levels
            : Array.from({ length: VOICE_WAVEFORM_BARS }, () => 0);

    return (
        <div
            className={`voice-recording-bar${className ? ` ${className}` : ''}`}
            role="status"
            aria-live="polite"
            aria-label={`Recording ${elapsedLabel}`}
        >
            <div className="voice-recording-bar__waveform" aria-hidden>
                {bars.map((level, i) => {
                    const amp = Math.max(0, Math.min(1, Number(level) || 0));
                    const silent = amp < 0.03;
                    const height = silent
                        ? DOT_SIZE
                        : Math.max(DOT_SIZE, Math.round(DOT_SIZE + amp * (MAX_BAR_H - DOT_SIZE)));
                    return (
                        <span
                            key={i}
                            className={`voice-recording-bar__bar${
                                silent ? ' voice-recording-bar__bar--dot' : ''
                            }`}
                            style={{ height: `${height}px` }}
                        />
                    );
                })}
            </div>

            <span className="voice-recording-bar__time">{elapsedLabel}</span>

            <div className="voice-recording-bar__actions">
                <button
                    type="button"
                    className="voice-recording-bar__btn voice-recording-bar__btn--cancel"
                    onClick={onCancel}
                    aria-label="Cancel recording"
                >
                    <X size={15} strokeWidth={2.25} />
                </button>
                <button
                    type="button"
                    className="voice-recording-bar__btn voice-recording-bar__btn--accept"
                    onClick={onAccept}
                    aria-label="Finish recording"
                >
                    <Check size={15} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}
