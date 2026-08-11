import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareCommentAudioFromBlob } from './albumCommentAttachments';

const MAX_RECORDING_MS = 120000;
export const VOICE_WAVEFORM_BARS = 56;

function formatRecordingTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function emptyLevels() {
    return Array.from({ length: VOICE_WAVEFORM_BARS }, () => 0);
}

export function useFeedbackVoiceRecorder({ onError, onRecordingReady }) {
    const [recording, setRecording] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [levels, setLevels] = useState(emptyLevels);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const startRef = useRef(0);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const rafRef = useRef(null);
    const levelsHistoryRef = useRef(emptyLevels());
    const timeDomainRef = useRef(null);

    const stopAnalyser = useCallback(() => {
        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        analyserRef.current = null;
        timeDomainRef.current = null;
        if (audioContextRef.current) {
            const ctx = audioContextRef.current;
            audioContextRef.current = null;
            void ctx.close().catch(() => {});
        }
        levelsHistoryRef.current = emptyLevels();
        setLevels(emptyLevels());
    }, []);

    const cleanupStream = useCallback(() => {
        stopAnalyser();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, [stopAnalyser]);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startAnalyser = useCallback((stream) => {
        stopAnalyser();
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.88;
            source.connect(analyser);
            audioContextRef.current = ctx;
            analyserRef.current = analyser;
            timeDomainRef.current = new Uint8Array(analyser.fftSize);
            levelsHistoryRef.current = emptyLevels();
            let smoothed = 0;
            let frame = 0;

            const tick = () => {
                const node = analyserRef.current;
                const buffer = timeDomainRef.current;
                if (!node || !buffer) return;

                node.getByteTimeDomainData(buffer);
                let sum = 0;
                for (let i = 0; i < buffer.length; i += 1) {
                    const v = (buffer[i] - 128) / 128;
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / buffer.length);
                // Gentle speech response — less jumpiness than raw mic peaks.
                const target = Math.min(1, Math.pow(Math.max(0, rms - 0.012) * 2.1, 0.9));
                smoothed = smoothed * 0.82 + target * 0.18;
                const sample = smoothed < 0.03 ? 0 : smoothed;

                // Scroll the waveform more slowly (every 4th frame).
                frame += 1;
                if (frame % 4 === 0) {
                    const next = levelsHistoryRef.current.slice(1);
                    next.push(sample);
                    levelsHistoryRef.current = next;
                    setLevels(next);
                }

                rafRef.current = requestAnimationFrame(tick);
            };

            if (ctx.state === 'suspended') {
                void ctx.resume().catch(() => {});
            }
            rafRef.current = requestAnimationFrame(tick);
        } catch (err) {
            console.warn('Could not start voice analyser', err);
        }
    }, [stopAnalyser]);

    const cancelRecording = useCallback(() => {
        stopTimer();
        const recorder = recorderRef.current;
        if (recorder) {
            recorder.ondataavailable = null;
            recorder.onstop = null;
            if (recorder.state !== 'inactive') {
                try {
                    recorder.stop();
                } catch {
                    /* ignore */
                }
            }
        }
        recorderRef.current = null;
        chunksRef.current = [];
        cleanupStream();
        setRecording(false);
        setElapsedMs(0);
    }, [cleanupStream, stopTimer]);

    useEffect(() => () => cancelRecording(), [cancelRecording]);

    const startRecording = useCallback(async () => {
        if (recording || preparing) return;
        if (typeof window === 'undefined' || !window.MediaRecorder) {
            onError?.('Voice recording is not supported in this browser.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            streamRef.current = stream;
            startAnalyser(stream);
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/ogg;codecs=opus',
                'audio/ogg',
            ];
            const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
            const recorder = mimeType
                ? new MediaRecorder(stream, { mimeType })
                : new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = (event) => {
                if (event.data?.size) chunksRef.current.push(event.data);
            };
            recorder.onstop = async () => {
                stopTimer();
                cleanupStream();
                setRecording(false);
                const blob = new Blob(chunksRef.current, {
                    type: recorder.mimeType || 'audio/webm',
                });
                chunksRef.current = [];
                recorderRef.current = null;
                setElapsedMs(0);
                if (!blob.size) return;
                setPreparing(true);
                try {
                    const prepared = await prepareCommentAudioFromBlob(blob);
                    onRecordingReady?.(prepared);
                } catch (err) {
                    console.error(err);
                    onError?.(err?.message || 'Could not save voice message.');
                } finally {
                    setPreparing(false);
                }
            };
            recorderRef.current = recorder;
            recorder.start(250);
            startRef.current = Date.now();
            setElapsedMs(0);
            setRecording(true);
            timerRef.current = window.setInterval(() => {
                const next = Date.now() - startRef.current;
                setElapsedMs(next);
                if (next >= MAX_RECORDING_MS) {
                    recorder.stop();
                }
            }, 200);
        } catch (err) {
            console.error(err);
            cleanupStream();
            onError?.('Microphone access is required to record a voice message.');
        }
    }, [
        cleanupStream,
        onError,
        onRecordingReady,
        preparing,
        recording,
        startAnalyser,
        stopTimer,
    ]);

    const stopRecording = useCallback(() => {
        const recorder = recorderRef.current;
        if (recorder && recorder.state === 'recording') {
            recorder.stop();
        }
    }, []);

    const toggleRecording = useCallback(() => {
        if (recording) stopRecording();
        else void startRecording();
    }, [recording, startRecording, stopRecording]);

    return {
        recording,
        preparing,
        elapsedMs,
        elapsedLabel: formatRecordingTime(elapsedMs),
        levels,
        toggleRecording,
        cancelRecording,
    };
}
