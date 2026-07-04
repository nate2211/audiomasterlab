// src/pages/Recorder.js
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Helmet } from "react-helmet-async";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Slider,
    Stack,
    Switch,
    Typography,
} from "@mui/material";

import MicRoundedIcon from "@mui/icons-material/MicRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import HeadphonesRoundedIcon from "@mui/icons-material/HeadphonesRounded";
import CableRoundedIcon from "@mui/icons-material/CableRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import SettingsInputComponentRoundedIcon from "@mui/icons-material/SettingsInputComponentRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);

    return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function clamp(value, min, max) {
    const number = Number(value);

    if (!Number.isFinite(number)) return min;

    return Math.min(max, Math.max(min, number));
}

function safeDisconnect(node) {
    try {
        node?.disconnect?.();
    } catch {
        // Safari and some older browsers can throw when disconnecting an already
        // disconnected WebAudio node. Ignore because cleanup is best-effort.
    }
}

function getReadableBytes(size) {
    const bytes = Number(size);

    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
        units.length - 1,
        Math.floor(Math.log(bytes) / Math.log(1024))
    );

    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${
        units[index]
    }`;
}

function getBestSupportedMimeType() {
    if (typeof window === "undefined" || !window.MediaRecorder) return "";

    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
    ];

    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function audioBufferToWavBlob(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeString(offset, value) {
        for (let i = 0; i < value.length; i += 1) {
            view.setUint8(offset + i, value.charCodeAt(i));
        }
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;

    for (let i = 0; i < length; i += 1) {
        for (let channel = 0; channel < numberOfChannels; channel += 1) {
            const channelData = audioBuffer.getChannelData(channel);
            const sample = clamp(channelData[i], -1, 1);
            const pcm = sample < 0 ? sample * 0x8000 : sample * 0x7fff;

            view.setInt16(offset, pcm, true);
            offset += 2;
        }
    }

    return new Blob([buffer], { type: "audio/wav" });
}

async function blobToAudioBuffer(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
        throw new Error("This browser does not support WebAudio decoding.");
    }

    const audioContext = new AudioContextClass();

    try {
        return await audioContext.decodeAudioData(arrayBuffer.slice(0));
    } finally {
        await audioContext.close?.();
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadLameJsFromCdn() {
    if (window.lamejs) return window.lamejs;

    await new Promise((resolve, reject) => {
        const existing = document.querySelector("script[data-lamejs]");

        if (existing) {
            existing.addEventListener("load", resolve, { once: true });
            existing.addEventListener("error", reject, { once: true });
            return;
        }

        const script = document.createElement("script");

        script.src = "https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js";
        script.async = true;
        script.dataset.lamejs = "true";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });

    if (!window.lamejs) {
        throw new Error("MP3 encoder failed to load.");
    }

    return window.lamejs;
}

function audioBufferToMp3Blob(audioBuffer, bitrate = 192) {
    const lamejs = window.lamejs;

    if (!lamejs) {
        throw new Error("MP3 encoder is not available.");
    }

    const sampleRate = audioBuffer.sampleRate;
    const channels = Math.min(2, audioBuffer.numberOfChannels);
    const left = audioBuffer.getChannelData(0);
    const right =
        channels > 1 ? audioBuffer.getChannelData(1) : audioBuffer.getChannelData(0);

    const mp3Encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitrate);
    const mp3Chunks = [];
    const sampleBlockSize = 1152;

    function floatTo16BitPcm(input) {
        const output = new Int16Array(input.length);

        for (let i = 0; i < input.length; i += 1) {
            const sample = clamp(input[i], -1, 1);
            output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        return output;
    }

    for (let i = 0; i < left.length; i += sampleBlockSize) {
        const leftChunk = floatTo16BitPcm(left.subarray(i, i + sampleBlockSize));
        const rightChunk = floatTo16BitPcm(right.subarray(i, i + sampleBlockSize));

        const mp3Buffer =
            channels > 1
                ? mp3Encoder.encodeBuffer(leftChunk, rightChunk)
                : mp3Encoder.encodeBuffer(leftChunk);

        if (mp3Buffer.length) {
            mp3Chunks.push(mp3Buffer);
        }
    }

    const finalBuffer = mp3Encoder.flush();

    if (finalBuffer.length) {
        mp3Chunks.push(finalBuffer);
    }

    return new Blob(mp3Chunks, { type: "audio/mpeg" });
}

function buildWaveformPeaks(audioBuffer, peakCount = 1400) {
    if (!audioBuffer || !Number.isFinite(audioBuffer.duration)) return [];

    const length = audioBuffer.length;
    const channelCount = audioBuffer.numberOfChannels;

    if (!length || !channelCount) return [];

    const safePeakCount = Math.min(peakCount, length);
    const samplesPerPeak = Math.max(1, Math.floor(length / safePeakCount));
    const peaks = new Array(safePeakCount).fill(0);

    let globalMax = 0;

    for (let peakIndex = 0; peakIndex < safePeakCount; peakIndex += 1) {
        const start = peakIndex * samplesPerPeak;
        const end =
            peakIndex === safePeakCount - 1
                ? length
                : Math.min(length, start + samplesPerPeak);

        const stride = Math.max(1, Math.floor((end - start) / 180));
        let localMax = 0;

        for (let channel = 0; channel < channelCount; channel += 1) {
            const channelData = audioBuffer.getChannelData(channel);

            for (let sampleIndex = start; sampleIndex < end; sampleIndex += stride) {
                localMax = Math.max(localMax, Math.abs(channelData[sampleIndex] || 0));
            }
        }

        peaks[peakIndex] = localMax;
        globalMax = Math.max(globalMax, localMax);
    }

    if (globalMax <= 0) return peaks;

    return peaks.map((peak) => peak / globalMax);
}

function RecorderCard({ children, sx }) {
    return (
        <Card
            elevation={0}
            sx={{
                height: "100%",
                borderRadius: 5,
                color: "#fff",
                background: "rgba(255,255,255,0.065)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(14px)",
                ...sx,
            }}
        >
            <CardContent sx={{ p: { xs: 2.35, md: 3.2 } }}>{children}</CardContent>
        </Card>
    );
}

function Meter({ level, peak }) {
    const safeLevel = clamp(level * 100, 0, 100);
    const safePeak = clamp(peak * 100, 0, 100);

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography sx={{ fontWeight: 900 }}>Input level</Typography>

                <Typography sx={{ color: "#67e8f9", fontWeight: 950 }}>
                    Peak {safePeak.toFixed(0)}%
                </Typography>
            </Stack>

            <Box
                sx={{
                    height: 18,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    overflow: "hidden",
                }}
            >
                <Box
                    sx={{
                        width: `${safeLevel}%`,
                        height: "100%",
                        background:
                            safeLevel > 92
                                ? "linear-gradient(90deg, #fb7185, #f97316)"
                                : safeLevel > 72
                                    ? "linear-gradient(90deg, #67e8f9, #facc15)"
                                    : "linear-gradient(90deg, #67e8f9, #a78bfa)",
                        transition: "width 80ms linear",
                    }}
                />
            </Box>

            <Typography sx={{ mt: 1, color: "rgba(255,255,255,0.58)", fontSize: 13 }}>
                Keep peaks below 90% for clean vocals, guitar amps, and interface inputs.
            </Typography>
        </Box>
    );
}

function WaveformPlayer({
                            audioBuffer,
                            audioUrl,
                            disabled,
                            isPlaying,
                            playbackDuration,
                            playbackTime,
                            onSeek,
                            onTogglePlayback,
                        }) {
    const canvasRef = useRef(null);
    const draggingRef = useRef(false);
    const [canvasTick, setCanvasTick] = useState(0);

    const peaks = useMemo(() => buildWaveformPeaks(audioBuffer), [audioBuffer]);

    const progress = useMemo(() => {
        if (!playbackDuration) return 0;
        return clamp(playbackTime / playbackDuration, 0, 1);
    }, [playbackDuration, playbackTime]);

    const seekFromPointer = useCallback(
        (event) => {
            if (!canvasRef.current || !playbackDuration || disabled) return;

            const rect = canvasRef.current.getBoundingClientRect();
            const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
            const nextTime = ratio * playbackDuration;

            onSeek(nextTime);
        },
        [disabled, onSeek, playbackDuration]
    );

    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const cssWidth = Math.max(1, Math.floor(rect.width));
        const cssHeight = Math.max(1, Math.floor(rect.height || 190));
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);

        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssWidth, cssHeight);

        const radius = 28;

        ctx.fillStyle = "rgba(255,255,255,0.045)";
        ctx.beginPath();
        ctx.roundRect?.(0, 0, cssWidth, cssHeight, radius);
        if (!ctx.roundRect) {
            ctx.rect(0, 0, cssWidth, cssHeight);
        }
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();

        const centerY = cssHeight / 2;
        const usableHeight = cssHeight * 0.72;

        if (!peaks.length || !audioUrl) {
            ctx.fillStyle = "rgba(255,255,255,0.24)";
            ctx.font = "800 15px Inter, system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Record a take to generate a playable waveform", cssWidth / 2, centerY);
            return;
        }

        const barGapRatio = 0.32;
        const barSlotWidth = cssWidth / peaks.length;
        const barWidth = Math.max(1, barSlotWidth * (1 - barGapRatio));

        function drawBars(fillStyle) {
            ctx.fillStyle = fillStyle;

            for (let i = 0; i < peaks.length; i += 1) {
                const peak = clamp(peaks[i], 0, 1);
                const x = i * barSlotWidth;
                const barHeight = Math.max(2, peak * usableHeight);
                const y = centerY - barHeight / 2;

                ctx.fillRect(x, y, barWidth, barHeight);
            }
        }

        drawBars("rgba(255,255,255,0.18)");

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, cssWidth * progress, cssHeight);
        ctx.clip();

        const gradient = ctx.createLinearGradient(0, 0, cssWidth, 0);
        gradient.addColorStop(0, "#67e8f9");
        gradient.addColorStop(1, "#a78bfa");

        drawBars(gradient);
        ctx.restore();

        const playheadX = clamp(cssWidth * progress, 0, cssWidth);

        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 18);
        ctx.lineTo(playheadX, cssHeight - 18);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(playheadX, centerY, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.82)";
        ctx.font = "900 13px Inter, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(formatTime(playbackTime), 18, 16);

        ctx.textAlign = "right";
        ctx.fillText(formatTime(playbackDuration), cssWidth - 18, 16);
    }, [audioUrl, peaks, playbackDuration, playbackTime, progress]);

    useEffect(() => {
        drawWaveform();
    }, [canvasTick, drawWaveform]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas || typeof ResizeObserver === "undefined") return undefined;

        const observer = new ResizeObserver(() => {
            setCanvasTick((value) => value + 1);
        });

        observer.observe(canvas);

        return () => observer.disconnect();
    }, []);

    function handlePointerDown(event) {
        if (disabled || !audioUrl) return;

        draggingRef.current = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        seekFromPointer(event);
    }

    function handlePointerMove(event) {
        if (!draggingRef.current) return;
        seekFromPointer(event);
    }

    function handlePointerUp(event) {
        draggingRef.current = false;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        seekFromPointer(event);
    }

    function handleKeyDown(event) {
        if (disabled || !audioUrl) return;

        const smallStep = event.shiftKey ? 10 : 1;
        const largeStep = 5;

        if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            onTogglePlayback();
            return;
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            onSeek(clamp(playbackTime + smallStep, 0, playbackDuration));
            return;
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            onSeek(clamp(playbackTime - smallStep, 0, playbackDuration));
            return;
        }

        if (event.key === "PageUp") {
            event.preventDefault();
            onSeek(clamp(playbackTime + largeStep, 0, playbackDuration));
            return;
        }

        if (event.key === "PageDown") {
            event.preventDefault();
            onSeek(clamp(playbackTime - largeStep, 0, playbackDuration));
            return;
        }

        if (event.key === "Home") {
            event.preventDefault();
            onSeek(0);
            return;
        }

        if (event.key === "End") {
            event.preventDefault();
            onSeek(playbackDuration);
        }
    }

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 1.3, md: 1.6 },
                borderRadius: 5,
                background:
                    "linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
                border: "1px solid rgba(255,255,255,0.12)",
            }}
        >
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "auto 1fr" },
                    alignItems: "center",
                    gap: 1.5,
                }}
            >
                <Button
                    size="large"
                    variant="contained"
                    disabled={disabled || !audioUrl}
                    onClick={onTogglePlayback}
                    startIcon={isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
                    sx={{
                        minWidth: { xs: "100%", sm: 132 },
                        borderRadius: 999,
                        py: 1.25,
                        fontWeight: 950,
                        color: "#06111e",
                        background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                    }}
                >
                    {isPlaying ? "Pause" : "Play"}
                </Button>

                <Box
                    component="canvas"
                    ref={canvasRef}
                    role="slider"
                    tabIndex={audioUrl && !disabled ? 0 : -1}
                    aria-label="Recording waveform playback position"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(playbackDuration || 0)}
                    aria-valuenow={Math.round(playbackTime || 0)}
                    aria-valuetext={`${formatTime(playbackTime)} of ${formatTime(
                        playbackDuration
                    )}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={() => {
                        draggingRef.current = false;
                    }}
                    onKeyDown={handleKeyDown}
                    sx={{
                        width: "100%",
                        height: { xs: 172, md: 198 },
                        display: "block",
                        borderRadius: 4,
                        cursor: audioUrl && !disabled ? "pointer" : "default",
                        touchAction: "none",
                        outline: "none",
                        "&:focus-visible": {
                            boxShadow: "0 0 0 3px rgba(103,232,249,0.45)",
                        },
                    }}
                />
            </Box>

            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mt: 1.2 }}
            >
                <Typography sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 800 }}>
                    {formatTime(playbackTime)}
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                    Click or drag the waveform to move the playhead.
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 800 }}>
                    {formatTime(playbackDuration)}
                </Typography>
            </Stack>
        </Paper>
    );
}

export default function Recorder() {
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState("");
    const [inputMode, setInputMode] = useState("instrument");
    const [monitoring, setMonitoring] = useState(false);
    const [gainDb, setGainDb] = useState(0);
    const [echoCancellation, setEchoCancellation] = useState(false);
    const [noiseSuppression, setNoiseSuppression] = useState(false);
    const [autoGainControl, setAutoGainControl] = useState(false);

    const [status, setStatus] = useState(
        "Choose an input, then press Start Recording."
    );
    const [error, setError] = useState("");
    const [recordingState, setRecordingState] = useState("idle");
    const [recordingDuration, setRecordingDuration] = useState(0);

    const [recordedBlob, setRecordedBlob] = useState(null);
    const [recordedUrl, setRecordedUrl] = useState("");
    const [recordedBuffer, setRecordedBuffer] = useState(null);
    const [recordedName, setRecordedName] = useState("");

    const [playbackDuration, setPlaybackDuration] = useState(0);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [playbackActive, setPlaybackActive] = useState(false);

    const [exportingMp3, setExportingMp3] = useState(false);
    const [level, setLevel] = useState(0);
    const [peak, setPeak] = useState(0);

    const streamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const inputSourceRef = useRef(null);
    const gainNodeRef = useRef(null);
    const analyserRef = useRef(null);
    const monitorNodeRef = useRef(null);
    const recordingDestinationRef = useRef(null);
    const meterAnimationRef = useRef(null);
    const playbackAnimationRef = useRef(null);
    const startedAtRef = useRef(0);
    const timerRef = useRef(null);
    const audioElementRef = useRef(null);
    const recordedUrlRef = useRef("");

    const supportedMimeType = useMemo(() => getBestSupportedMimeType(), []);

    const selectedDeviceLabel = useMemo(() => {
        const match = devices.find((device) => device.deviceId === selectedDeviceId);

        return match?.label || "Default browser input";
    }, [devices, selectedDeviceId]);

    const hasRecording = Boolean(recordedBuffer && recordedUrl);
    const isRecording = recordingState === "recording";
    const isStopping = recordingState === "stopping";

    useEffect(() => {
        recordedUrlRef.current = recordedUrl;
    }, [recordedUrl]);

    async function refreshDevices() {
        if (!navigator.mediaDevices?.enumerateDevices) {
            setError("This browser does not support audio device selection.");
            return;
        }

        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = allDevices.filter(
                (device) => device.kind === "audioinput"
            );

            setDevices(audioInputs);

            if (!selectedDeviceId && audioInputs[0]?.deviceId) {
                setSelectedDeviceId(audioInputs[0].deviceId);
            }
        } catch (deviceError) {
            setError(deviceError?.message || "Could not list audio input devices.");
        }
    }

    async function requestInputPermission() {
        setError("");

        try {
            const tempStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            });

            tempStream.getTracks().forEach((track) => track.stop());
            await refreshDevices();
            setStatus("Input permission granted. Pick your interface or microphone.");
        } catch (permissionError) {
            setError(
                permissionError?.message ||
                "Microphone permission was blocked. Allow microphone/input access in your browser."
            );
        }
    }

    function stopMeter() {
        if (meterAnimationRef.current) {
            cancelAnimationFrame(meterAnimationRef.current);
            meterAnimationRef.current = null;
        }
    }

    function startMeter() {
        stopMeter();

        const analyser = analyserRef.current;

        if (!analyser) return;

        const data = new Uint8Array(analyser.fftSize);

        const tick = () => {
            analyser.getByteTimeDomainData(data);

            let sum = 0;
            let max = 0;

            for (let i = 0; i < data.length; i += 1) {
                const centered = (data[i] - 128) / 128;

                sum += centered * centered;
                max = Math.max(max, Math.abs(centered));
            }

            const rms = Math.sqrt(sum / data.length);

            setLevel(rms * 2.8);
            setPeak((currentPeak) => Math.max(max, currentPeak * 0.96));

            meterAnimationRef.current = requestAnimationFrame(tick);
        };

        tick();
    }

    async function createStreamGraph() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            throw new Error("This browser does not support WebAudio.");
        }

        const constraints = {
            audio: {
                deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                echoCancellation,
                noiseSuppression,
                autoGainControl,
                channelCount: { ideal: inputMode === "voice" ? 1 : 2 },
            },
            video: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const audioContext = new AudioContextClass();

        if (audioContext.state === "suspended") {
            await audioContext.resume?.();
        }

        const source = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        const analyser = audioContext.createAnalyser();
        const monitorGain = audioContext.createGain();
        const recordingDestination = audioContext.createMediaStreamDestination();

        gainNode.gain.value = Math.pow(10, gainDb / 20);
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.72;
        monitorGain.gain.value = monitoring ? 1 : 0;

        source.connect(gainNode);
        gainNode.connect(analyser);

        // This makes the MediaRecorder capture the WebAudio-processed signal.
        // That keeps the exported take aligned with the gain node and decoded buffer.
        analyser.connect(recordingDestination);

        // Monitoring is separated from the recording destination so headphones can
        // be turned on/off without affecting the recorded file.
        analyser.connect(monitorGain);
        monitorGain.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        inputSourceRef.current = source;
        gainNodeRef.current = gainNode;
        analyserRef.current = analyser;
        monitorNodeRef.current = monitorGain;
        recordingDestinationRef.current = recordingDestination;
        streamRef.current = stream;

        startMeter();

        return recordingDestination.stream;
    }

    function cleanupStreamGraph() {
        stopMeter();

        streamRef.current?.getTracks?.().forEach((track) => track.stop());
        streamRef.current = null;

        recordingDestinationRef.current?.stream
            ?.getTracks?.()
            ?.forEach((track) => track.stop());

        safeDisconnect(inputSourceRef.current);
        safeDisconnect(gainNodeRef.current);
        safeDisconnect(analyserRef.current);
        safeDisconnect(monitorNodeRef.current);
        safeDisconnect(recordingDestinationRef.current);

        inputSourceRef.current = null;
        gainNodeRef.current = null;
        analyserRef.current = null;
        monitorNodeRef.current = null;
        recordingDestinationRef.current = null;

        audioContextRef.current?.close?.();
        audioContextRef.current = null;

        setLevel(0);
    }

    function clearRecording() {
        const audio = audioElementRef.current;

        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            audio.removeAttribute("src");
            audio.load?.();
        }

        if (recordedUrlRef.current) {
            URL.revokeObjectURL(recordedUrlRef.current);
            recordedUrlRef.current = "";
        }

        setRecordedBlob(null);
        setRecordedBuffer(null);
        setRecordedUrl("");
        setRecordedName("");
        setPlaybackDuration(0);
        setPlaybackTime(0);
        setPlaybackActive(false);
        setStatus("Recording cleared. Start a new take when ready.");
    }

    async function startRecording() {
        setError("");

        if (!navigator.mediaDevices?.getUserMedia) {
            setError("This browser does not support recording from audio inputs.");
            return;
        }

        if (!window.MediaRecorder) {
            setError("This browser does not support MediaRecorder.");
            return;
        }

        try {
            clearRecording();

            const recordStream = await createStreamGraph();

            chunksRef.current = [];

            const recorderOptions = supportedMimeType ? { mimeType: supportedMimeType } : {};
            const recorder = new MediaRecorder(recordStream, recorderOptions);

            recorder.ondataavailable = (event) => {
                if (event.data?.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                try {
                    const blob = new Blob(chunksRef.current, {
                        type: supportedMimeType || "audio/webm",
                    });

                    if (!blob.size) {
                        throw new Error("The recording was empty. Try another input device.");
                    }

                    const buffer = await blobToAudioBuffer(blob);
                    const url = URL.createObjectURL(blob);
                    const decodedDuration = Number.isFinite(buffer.duration)
                        ? buffer.duration
                        : 0;

                    const name = `audiomaster-recording-${new Date()
                        .toISOString()
                        .replace(/[:.]/g, "-")}`;

                    setRecordedBlob(blob);
                    setRecordedUrl(url);
                    setRecordedBuffer(buffer);
                    setRecordedName(name);
                    setPlaybackDuration(decodedDuration);
                    setPlaybackTime(0);
                    setPlaybackActive(false);
                    setRecordingDuration(0);

                    setStatus(
                        `Recorded ${formatTime(decodedDuration)} from ${selectedDeviceLabel}. The waveform player is ready.`
                    );
                } catch (decodeError) {
                    setError(
                        decodeError?.message ||
                        "Recording finished, but the browser could not decode the take."
                    );
                } finally {
                    cleanupStreamGraph();
                    setRecordingState("idle");
                    window.clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };

            mediaRecorderRef.current = recorder;
            recorder.start(250);

            startedAtRef.current = performance.now();
            setRecordingDuration(0);
            setRecordingState("recording");
            setStatus(`Recording from ${selectedDeviceLabel}...`);

            timerRef.current = window.setInterval(() => {
                setRecordingDuration((performance.now() - startedAtRef.current) / 1000);
            }, 100);
        } catch (recordError) {
            cleanupStreamGraph();
            setRecordingState("idle");
            setError(
                recordError?.message ||
                "Could not start recording. Check input permissions and device connection."
            );
        }
    }

    function stopRecording() {
        const recorder = mediaRecorderRef.current;

        if (recorder && recorder.state !== "inactive") {
            recorder.stop();
        }

        setRecordingState("stopping");
        setStatus("Stopping recording and decoding the waveform...");
    }

    async function togglePlayback() {
        const audio = audioElementRef.current;

        if (!audio || !recordedUrl || !playbackDuration) return;

        try {
            if (audio.paused) {
                if (audio.currentTime >= playbackDuration - 0.05) {
                    audio.currentTime = 0;
                    setPlaybackTime(0);
                }

                await audio.play();
                setPlaybackActive(true);
            } else {
                audio.pause();
                setPlaybackActive(false);
            }
        } catch (playError) {
            setPlaybackActive(false);
            setError(
                playError?.message ||
                "Playback could not start. Try clicking the waveform or Play button again."
            );
        }
    }

    function seekPlayback(nextTime) {
        const audio = audioElementRef.current;
        const safeDuration = playbackDuration || recordedBuffer?.duration || 0;

        if (!audio || !safeDuration) return;

        const safeTime = clamp(nextTime, 0, safeDuration);

        try {
            audio.currentTime = safeTime;
        } catch {
            // Some browsers can reject currentTime before metadata loads.
        }

        setPlaybackTime(safeTime);

        if (safeTime >= safeDuration) {
            audio.pause();
            setPlaybackActive(false);
        }
    }

    function syncAudioMetadata() {
        const audio = audioElementRef.current;

        if (!audio) return;

        const decodedDuration = recordedBuffer?.duration;
        const browserDuration = audio.duration;
        const bestDuration =
            Number.isFinite(decodedDuration) && decodedDuration > 0
                ? decodedDuration
                : Number.isFinite(browserDuration) && browserDuration > 0
                    ? browserDuration
                    : 0;

        setPlaybackDuration(bestDuration);
        setPlaybackTime(clamp(audio.currentTime || 0, 0, bestDuration));
    }

    function syncAudioTime() {
        const audio = audioElementRef.current;

        if (!audio) return;

        const safeDuration = playbackDuration || recordedBuffer?.duration || audio.duration || 0;

        setPlaybackTime(clamp(audio.currentTime || 0, 0, safeDuration));
    }

    function handleAudioEnded() {
        setPlaybackActive(false);
        setPlaybackTime(playbackDuration);
    }

    function exportWav() {
        if (!recordedBuffer) {
            setError("Record something first before exporting WAV.");
            return;
        }

        const wavBlob = audioBufferToWavBlob(recordedBuffer);

        downloadBlob(wavBlob, `${recordedName || "audiomaster-recording"}.wav`);
        setStatus(
            `WAV exported: ${getReadableBytes(wavBlob.size)} at ${formatTime(
                recordedBuffer.duration
            )}.`
        );
    }

    async function exportMp3() {
        if (!recordedBuffer) {
            setError("Record something first before exporting MP3.");
            return;
        }

        setError("");
        setExportingMp3(true);
        setStatus("Encoding MP3 in the browser...");

        try {
            await loadLameJsFromCdn();

            const mp3Blob = audioBufferToMp3Blob(recordedBuffer, 192);

            downloadBlob(mp3Blob, `${recordedName || "audiomaster-recording"}.mp3`);
            setStatus(
                `MP3 exported: ${getReadableBytes(mp3Blob.size)} at 192 kbps.`
            );
        } catch (mp3Error) {
            setError(
                `${mp3Error?.message || "MP3 export failed."} WAV export still works.`
            );
        } finally {
            setExportingMp3(false);
        }
    }

    useEffect(() => {
        refreshDevices();

        navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices);

        return () => {
            navigator.mediaDevices?.removeEventListener?.(
                "devicechange",
                refreshDevices
            );
            cleanupStreamGraph();

            if (recordedUrlRef.current) {
                URL.revokeObjectURL(recordedUrlRef.current);
            }

            window.clearInterval(timerRef.current);

            if (playbackAnimationRef.current) {
                cancelAnimationFrame(playbackAnimationRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = Math.pow(10, gainDb / 20);
        }
    }, [gainDb]);

    useEffect(() => {
        if (monitorNodeRef.current) {
            monitorNodeRef.current.gain.value = monitoring ? 1 : 0;
        }
    }, [monitoring]);

    useEffect(() => {
        if (!playbackActive) {
            if (playbackAnimationRef.current) {
                cancelAnimationFrame(playbackAnimationRef.current);
                playbackAnimationRef.current = null;
            }
            return undefined;
        }

        const tick = () => {
            const audio = audioElementRef.current;

            if (audio) {
                const safeDuration =
                    playbackDuration || recordedBuffer?.duration || audio.duration || 0;

                setPlaybackTime(clamp(audio.currentTime || 0, 0, safeDuration));

                if (safeDuration && audio.currentTime >= safeDuration) {
                    audio.pause();
                    setPlaybackActive(false);
                    setPlaybackTime(safeDuration);
                    return;
                }
            }

            playbackAnimationRef.current = requestAnimationFrame(tick);
        };

        tick();

        return () => {
            if (playbackAnimationRef.current) {
                cancelAnimationFrame(playbackAnimationRef.current);
                playbackAnimationRef.current = null;
            }
        };
    }, [playbackActive, playbackDuration, recordedBuffer]);

    return (
        <>
            <Helmet>
                <title>Recorder</title>
                <link rel="canonical" href="https://audiomasterlab.com/recorder" />
                <meta
                    name="description"
                    content="Record vocals, microphones, Focusrite-style audio interface inputs, guitar amp line outputs, and instrument takes in the browser with a WebAudio waveform player."
                />
                <meta
                    name="keywords"
                    content="browser recorder, online audio recorder, WebAudio waveform, WAV recorder, MP3 recorder, Focusrite recorder, guitar amp recorder, audio interface recorder"
                />
                <meta property="og:title" content="Recorder | AudioMaster Lab" />
                <meta
                    property="og:description"
                    content="Record from microphones, USB interfaces, and instrument inputs directly in the browser, then play the take with a draggable waveform and export WAV or MP3."
                />
            </Helmet>

            <Box
                component="main"
                sx={{
                    minHeight: "100vh",
                    color: "#fff",
                    pb: 8,
                    background:
                        "radial-gradient(circle at top left, rgba(103,232,249,0.16), transparent 30%), radial-gradient(circle at top right, rgba(167,139,250,0.14), transparent 34%), #070a13",
                }}
            >
                <Box
                    sx={{
                        width: "min(1500px, calc(100% - 32px))",
                        mx: "auto",
                        pt: 5,
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            mb: 3,
                            overflow: "hidden",
                            borderRadius: { xs: 4, md: 7 },
                            border: "1px solid rgba(255,255,255,0.1)",
                            background:
                                "linear-gradient(135deg, rgba(13,18,36,0.94), rgba(18,25,52,0.78))",
                            position: "relative",
                        }}
                    >
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                opacity: 0.48,
                                background:
                                    "radial-gradient(circle at 22% 20%, rgba(103,232,249,0.36), transparent 28%), radial-gradient(circle at 78% 18%, rgba(167,139,250,0.34), transparent 28%)",
                            }}
                        />

                        <Box
                            sx={{
                                position: "relative",
                                p: { xs: 3, md: 6 },
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
                                gap: 4,
                                alignItems: "center",
                            }}
                        >
                            <Box>
                                <Chip
                                    icon={<MicRoundedIcon />}
                                    label="Browser recorder"
                                    sx={{
                                        mb: 2.5,
                                        color: "#dffaff",
                                        background: "rgba(103,232,249,0.12)",
                                        border: "1px solid rgba(103,232,249,0.24)",
                                        fontWeight: 900,
                                    }}
                                />

                                <Typography
                                    variant="h1"
                                    sx={{
                                        maxWidth: 920,
                                        fontWeight: 950,
                                        fontSize: { xs: "2.45rem", md: "4.7rem" },
                                        lineHeight: 0.94,
                                        letterSpacing: "-0.075em",
                                        mb: 2.5,
                                    }}
                                >
                                    Record, see the waveform, and drag the playhead.
                                </Typography>

                                <Typography
                                    variant="h6"
                                    sx={{
                                        maxWidth: 800,
                                        color: "rgba(255,255,255,0.72)",
                                        lineHeight: 1.65,
                                        fontWeight: 500,
                                        mb: 3,
                                    }}
                                >
                                    Use any browser-visible input: laptop mic, USB microphone,
                                    Focusrite/Scarlett interface, mixer output, or guitar amp line
                                    output. The finished recording is decoded with WebAudio so the
                                    player duration and waveform match the real take.
                                </Typography>

                                <Stack direction="row" flexWrap="wrap" gap={1}>
                                    {[
                                        "WebAudio waveform",
                                        "Draggable playhead",
                                        "Accurate duration",
                                        "WAV export",
                                        "MP3 export",
                                        "Input selector",
                                        "Live meter",
                                    ].map((item) => (
                                        <Chip
                                            key={item}
                                            label={item}
                                            sx={{
                                                color: "#fff",
                                                background: "rgba(255,255,255,0.09)",
                                                border: "1px solid rgba(255,255,255,0.08)",
                                                fontWeight: 800,
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Box>

                            <RecorderCard>
                                <Stack spacing={2}>
                                    <Stack direction="row" spacing={1.3} alignItems="center">
                                        <Box
                                            sx={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 3,
                                                display: "grid",
                                                placeItems: "center",
                                                color: "#06111e",
                                                background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                            }}
                                        >
                                            <CableRoundedIcon />
                                        </Box>

                                        <Box>
                                            <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                                Interface-friendly setup
                                            </Typography>

                                            <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
                                                Plug your amp/interface into the computer first, then
                                                refresh inputs.
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                                    <Alert
                                        severity="info"
                                        sx={{
                                            color: "#dffaff",
                                            background: "rgba(103,232,249,0.1)",
                                            border: "1px solid rgba(103,232,249,0.18)",
                                            "& .MuiAlert-icon": { color: "#67e8f9" },
                                        }}
                                    >
                                        The MediaRecorder records the WebAudio graph output, so browser
                                        gain, meter analysis, waveform duration, playback, and exports all
                                        stay aligned around the decoded recording.
                                    </Alert>
                                </Stack>
                            </RecorderCard>
                        </Box>
                    </Paper>

                    {error && (
                        <Alert
                            severity="error"
                            sx={{
                                mb: 3,
                                color: "#fff",
                                background: "rgba(248,113,113,0.13)",
                                border: "1px solid rgba(248,113,113,0.25)",
                                "& .MuiAlert-icon": { color: "#fb7185" },
                            }}
                        >
                            {error}
                        </Alert>
                    )}

                    <Grid container spacing={3}>
                        <Grid item xs={12} lg={4}>
                            <Stack spacing={3}>
                                <RecorderCard>
                                    <Stack spacing={2.4}>
                                        <Box>
                                            <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.6 }}>
                                                Input source
                                            </Typography>

                                            <Typography sx={{ color: "rgba(255,255,255,0.64)", lineHeight: 1.65 }}>
                                                Select your microphone, USB interface, Focusrite input,
                                                mixer, or amp output when it appears in the browser.
                                            </Typography>
                                        </Box>

                                        <Button
                                            variant="outlined"
                                            onClick={requestInputPermission}
                                            startIcon={<SettingsInputComponentRoundedIcon />}
                                            sx={{
                                                borderRadius: 999,
                                                color: "#fff",
                                                borderColor: "rgba(255,255,255,0.2)",
                                                fontWeight: 900,
                                            }}
                                        >
                                            Allow / refresh inputs
                                        </Button>

                                        <FormControl fullWidth>
                                            <InputLabel sx={{ color: "rgba(255,255,255,0.65)" }}>
                                                Recording input
                                            </InputLabel>

                                            <Select
                                                value={selectedDeviceId}
                                                label="Recording input"
                                                disabled={isRecording || isStopping}
                                                onChange={(event) => setSelectedDeviceId(event.target.value)}
                                                sx={{
                                                    color: "#fff",
                                                    borderRadius: 3,
                                                    background: "rgba(255,255,255,0.07)",
                                                    ".MuiOutlinedInput-notchedOutline": {
                                                        borderColor: "rgba(255,255,255,0.16)",
                                                    },
                                                    "&:hover .MuiOutlinedInput-notchedOutline": {
                                                        borderColor: "rgba(103,232,249,0.5)",
                                                    },
                                                    ".MuiSvgIcon-root": { color: "#fff" },
                                                }}
                                            >
                                                {devices.length === 0 && (
                                                    <MenuItem value="">
                                                        Default input / permission needed
                                                    </MenuItem>
                                                )}

                                                {devices.map((device, index) => (
                                                    <MenuItem key={device.deviceId || index} value={device.deviceId}>
                                                        {device.label || `Audio input ${index + 1}`}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        <FormControl fullWidth>
                                            <InputLabel sx={{ color: "rgba(255,255,255,0.65)" }}>
                                                Recording mode
                                            </InputLabel>

                                            <Select
                                                value={inputMode}
                                                label="Recording mode"
                                                disabled={isRecording || isStopping}
                                                onChange={(event) => setInputMode(event.target.value)}
                                                sx={{
                                                    color: "#fff",
                                                    borderRadius: 3,
                                                    background: "rgba(255,255,255,0.07)",
                                                    ".MuiOutlinedInput-notchedOutline": {
                                                        borderColor: "rgba(255,255,255,0.16)",
                                                    },
                                                    ".MuiSvgIcon-root": { color: "#fff" },
                                                }}
                                            >
                                                <MenuItem value="instrument">Instrument / interface</MenuItem>
                                                <MenuItem value="voice">Voice / podcast</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                                        <Box>
                                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.7 }}>
                                                <Typography sx={{ fontWeight: 900 }}>Input gain</Typography>

                                                <Typography sx={{ color: "#67e8f9", fontWeight: 950 }}>
                                                    {gainDb > 0 ? "+" : ""}
                                                    {gainDb.toFixed(1)} dB
                                                </Typography>
                                            </Stack>

                                            <Slider
                                                value={gainDb}
                                                min={-18}
                                                max={18}
                                                step={0.5}
                                                disabled={isRecording || isStopping}
                                                onChange={(_, value) => {
                                                    const nextValue = Array.isArray(value) ? value[0] : value;
                                                    setGainDb(nextValue);
                                                }}
                                                sx={{
                                                    color: "#67e8f9",
                                                    "& .MuiSlider-rail": { color: "rgba(255,255,255,0.18)" },
                                                }}
                                            />

                                            <Typography sx={{ color: "rgba(255,255,255,0.58)", fontSize: 13 }}>
                                                Use your interface/amp gain first. Keep browser gain near 0 dB
                                                unless the signal is too quiet.
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </RecorderCard>

                                <RecorderCard>
                                    <Stack spacing={2}>
                                        <Stack direction="row" spacing={1.2} alignItems="center">
                                            <TuneRoundedIcon sx={{ color: "#67e8f9" }} />

                                            <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                                Capture cleanup
                                            </Typography>
                                        </Stack>

                                        <Typography sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>
                                            For music and amps, leave these off for a more natural take.
                                            For speech, turning them on can help reduce room noise.
                                        </Typography>

                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={echoCancellation}
                                                    disabled={isRecording || isStopping}
                                                    onChange={(event) => setEchoCancellation(event.target.checked)}
                                                />
                                            }
                                            label="Echo cancellation"
                                        />

                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={noiseSuppression}
                                                    disabled={isRecording || isStopping}
                                                    onChange={(event) => setNoiseSuppression(event.target.checked)}
                                                />
                                            }
                                            label="Noise suppression"
                                        />

                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={autoGainControl}
                                                    disabled={isRecording || isStopping}
                                                    onChange={(event) => setAutoGainControl(event.target.checked)}
                                                />
                                            }
                                            label="Automatic gain control"
                                        />

                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={monitoring}
                                                    onChange={(event) => setMonitoring(event.target.checked)}
                                                />
                                            }
                                            label="Live monitor"
                                        />

                                        <Alert
                                            severity="warning"
                                            sx={{
                                                color: "#fff",
                                                background: "rgba(250,204,21,0.1)",
                                                border: "1px solid rgba(250,204,21,0.2)",
                                                "& .MuiAlert-icon": { color: "#facc15" },
                                            }}
                                        >
                                            Use headphones before enabling monitor to avoid feedback.
                                        </Alert>
                                    </Stack>
                                </RecorderCard>
                            </Stack>
                        </Grid>

                        <Grid item xs={12} lg={8}>
                            <Stack spacing={3}>
                                <RecorderCard>
                                    <Stack spacing={2.6}>
                                        <Stack
                                            direction={{ xs: "column", md: "row" }}
                                            justifyContent="space-between"
                                            spacing={2}
                                        >
                                            <Box>
                                                <Typography variant="h4" sx={{ fontWeight: 950, mb: 0.6 }}>
                                                    Recorder
                                                </Typography>

                                                <Typography sx={{ color: "rgba(255,255,255,0.64)" }}>
                                                    Current input:{" "}
                                                    <Box component="span" sx={{ color: "#67e8f9", fontWeight: 950 }}>
                                                        {selectedDeviceLabel}
                                                    </Box>
                                                </Typography>
                                            </Box>

                                            <Chip
                                                icon={isRecording ? <MicRoundedIcon /> : <GraphicEqRoundedIcon />}
                                                label={
                                                    isRecording
                                                        ? `Recording ${formatTime(recordingDuration)}`
                                                        : hasRecording
                                                            ? `Take ${formatTime(playbackDuration)}`
                                                            : "Ready"
                                                }
                                                sx={{
                                                    alignSelf: { xs: "flex-start", md: "center" },
                                                    color: "#fff",
                                                    fontWeight: 900,
                                                    background: isRecording
                                                        ? "rgba(248,113,113,0.16)"
                                                        : "rgba(103,232,249,0.12)",
                                                    border: isRecording
                                                        ? "1px solid rgba(248,113,113,0.28)"
                                                        : "1px solid rgba(103,232,249,0.2)",
                                                }}
                                            />
                                        </Stack>

                                        <Meter level={level} peak={peak} />

                                        {isStopping && (
                                            <LinearProgress
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 999,
                                                    background: "rgba(255,255,255,0.08)",
                                                    "& .MuiLinearProgress-bar": {
                                                        background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                    },
                                                }}
                                            />
                                        )}

                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                borderRadius: 4,
                                                background: "rgba(255,255,255,0.055)",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                            }}
                                        >
                                            <Typography sx={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.7 }}>
                                                {status}
                                            </Typography>
                                        </Paper>

                                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.3}>
                                            {!isRecording ? (
                                                <Button
                                                    fullWidth
                                                    size="large"
                                                    variant="contained"
                                                    startIcon={<MicRoundedIcon />}
                                                    disabled={isStopping}
                                                    onClick={startRecording}
                                                    sx={{
                                                        borderRadius: 999,
                                                        py: 1.45,
                                                        fontWeight: 950,
                                                        color: "#06111e",
                                                        background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                        boxShadow: "0 18px 46px rgba(103,232,249,0.2)",
                                                    }}
                                                >
                                                    Start Recording
                                                </Button>
                                            ) : (
                                                <Button
                                                    fullWidth
                                                    size="large"
                                                    variant="contained"
                                                    color="error"
                                                    startIcon={<StopRoundedIcon />}
                                                    onClick={stopRecording}
                                                    sx={{
                                                        borderRadius: 999,
                                                        py: 1.45,
                                                        fontWeight: 950,
                                                    }}
                                                >
                                                    Stop Recording
                                                </Button>
                                            )}

                                            <Button
                                                fullWidth
                                                size="large"
                                                variant="outlined"
                                                startIcon={<DeleteRoundedIcon />}
                                                disabled={isRecording || isStopping || !hasRecording}
                                                onClick={clearRecording}
                                                sx={{
                                                    borderRadius: 999,
                                                    py: 1.45,
                                                    color: "#fff",
                                                    borderColor: "rgba(255,255,255,0.18)",
                                                    fontWeight: 900,
                                                }}
                                            >
                                                Clear Take
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </RecorderCard>

                                <RecorderCard>
                                    <Stack spacing={2.4}>
                                        <Stack
                                            direction={{ xs: "column", md: "row" }}
                                            justifyContent="space-between"
                                            spacing={1.5}
                                        >
                                            <Box>
                                                <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.4 }}>
                                                    Waveform playback and export
                                                </Typography>

                                                <Typography sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>
                                                    The canvas below is the player. Click, drag, or use keyboard
                                                    arrows to move the playhead. Duration comes from the decoded
                                                    WebAudio buffer, not the browser media container guess.
                                                </Typography>
                                            </Box>

                                            {recordedBlob && (
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
                                                >
                                                    <Chip
                                                        label={getReadableBytes(recordedBlob.size)}
                                                        sx={{
                                                            color: "#fff",
                                                            background: "rgba(255,255,255,0.08)",
                                                            border: "1px solid rgba(255,255,255,0.08)",
                                                            fontWeight: 850,
                                                        }}
                                                    />

                                                    <Chip
                                                        label={formatTime(playbackDuration)}
                                                        sx={{
                                                            color: "#dffaff",
                                                            background: "rgba(103,232,249,0.1)",
                                                            border: "1px solid rgba(103,232,249,0.18)",
                                                            fontWeight: 850,
                                                        }}
                                                    />
                                                </Stack>
                                            )}
                                        </Stack>

                                        <audio
                                            ref={audioElementRef}
                                            src={recordedUrl || undefined}
                                            preload="metadata"
                                            style={{ display: "none" }}
                                            onLoadedMetadata={syncAudioMetadata}
                                            onDurationChange={syncAudioMetadata}
                                            onTimeUpdate={syncAudioTime}
                                            onPlay={() => setPlaybackActive(true)}
                                            onPause={() => setPlaybackActive(false)}
                                            onEnded={handleAudioEnded}
                                        />

                                        {recordedUrl ? (
                                            <WaveformPlayer
                                                audioBuffer={recordedBuffer}
                                                audioUrl={recordedUrl}
                                                disabled={isRecording || isStopping}
                                                isPlaying={playbackActive}
                                                playbackDuration={playbackDuration}
                                                playbackTime={playbackTime}
                                                onSeek={seekPlayback}
                                                onTogglePlayback={togglePlayback}
                                            />
                                        ) : (
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: 3,
                                                    borderRadius: 4,
                                                    textAlign: "center",
                                                    background: "rgba(255,255,255,0.045)",
                                                    border: "1px dashed rgba(255,255,255,0.18)",
                                                }}
                                            >
                                                <MusicNoteRoundedIcon
                                                    sx={{ color: "#67e8f9", fontSize: 42, mb: 1 }}
                                                />

                                                <Typography sx={{ fontWeight: 900 }}>
                                                    No recording yet
                                                </Typography>

                                                <Typography sx={{ color: "rgba(255,255,255,0.58)" }}>
                                                    Start a take to generate the waveform player and enable exports.
                                                </Typography>
                                            </Paper>
                                        )}

                                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.3}>
                                            <Button
                                                fullWidth
                                                size="large"
                                                variant="outlined"
                                                disabled={!hasRecording}
                                                startIcon={
                                                    playbackActive ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />
                                                }
                                                onClick={togglePlayback}
                                                sx={{
                                                    borderRadius: 999,
                                                    py: 1.35,
                                                    color: "#fff",
                                                    borderColor: "rgba(255,255,255,0.18)",
                                                    fontWeight: 900,
                                                }}
                                            >
                                                {playbackActive ? "Pause" : "Play"}
                                            </Button>

                                            <Button
                                                fullWidth
                                                size="large"
                                                variant="contained"
                                                disabled={!hasRecording}
                                                startIcon={<FileDownloadRoundedIcon />}
                                                onClick={exportWav}
                                                sx={{
                                                    borderRadius: 999,
                                                    py: 1.35,
                                                    fontWeight: 950,
                                                    color: "#06111e",
                                                    background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                }}
                                            >
                                                Export WAV
                                            </Button>

                                            <Button
                                                fullWidth
                                                size="large"
                                                variant="contained"
                                                disabled={!hasRecording || exportingMp3}
                                                startIcon={<FileDownloadRoundedIcon />}
                                                onClick={exportMp3}
                                                sx={{
                                                    borderRadius: 999,
                                                    py: 1.35,
                                                    fontWeight: 950,
                                                    color: "#06111e",
                                                    background: "linear-gradient(135deg, #a78bfa, #67e8f9)",
                                                }}
                                            >
                                                {exportingMp3 ? "Encoding..." : "Export MP3"}
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </RecorderCard>

                                <Grid container spacing={3}>
                                    {[
                                        {
                                            icon: <CableRoundedIcon />,
                                            title: "Focusrite and USB interfaces",
                                            description:
                                                "Connect the interface before opening the page, allow microphone access, then select the interface input from the dropdown.",
                                        },
                                        {
                                            icon: <HeadphonesRoundedIcon />,
                                            title: "Guitar amp output",
                                            description:
                                                "Use a line out, headphone out, mixer send, or interface input. Start with low output volume and watch the peak meter.",
                                        },
                                        {
                                            icon: <GraphicEqRoundedIcon />,
                                            title: "Waveform playback",
                                            description:
                                                "The take is decoded into an AudioBuffer. That buffer controls waveform drawing, duration display, playhead seeking, and export length.",
                                        },
                                    ].map((feature) => (
                                        <Grid item xs={12} md={4} key={feature.title}>
                                            <RecorderCard>
                                                <Stack spacing={1.5}>
                                                    <Box
                                                        sx={{
                                                            width: 46,
                                                            height: 46,
                                                            borderRadius: 3,
                                                            display: "grid",
                                                            placeItems: "center",
                                                            color: "#06111e",
                                                            background:
                                                                "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                        }}
                                                    >
                                                        {feature.icon}
                                                    </Box>

                                                    <Typography variant="h6" sx={{ fontWeight: 950 }}>
                                                        {feature.title}
                                                    </Typography>

                                                    <Typography sx={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}>
                                                        {feature.description}
                                                    </Typography>
                                                </Stack>
                                            </RecorderCard>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </>
    );
}