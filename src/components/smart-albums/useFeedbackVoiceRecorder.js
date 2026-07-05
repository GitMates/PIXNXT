import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareCommentAudioFromBlob } from './albumCommentAttachments';

const MAX_RECORDING_MS = 120000;

function formatRecordingTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function useFeedbackVoiceRecorder({ onError, onRecordingReady }) {
    const [recording, setRecording] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const startRef = useRef(0);

    const cleanupStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
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
    }, [cleanupStream, onError, onRecordingReady, preparing, recording, stopTimer]);

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
        toggleRecording,
        cancelRecording,
    };
}
