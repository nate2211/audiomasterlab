import React, { useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    LinearProgress,
    Paper,
    Slider,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";

import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import WavesRoundedIcon from "@mui/icons-material/WavesRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import CompressRoundedIcon from "@mui/icons-material/CompressRounded";
import SurroundSoundRoundedIcon from "@mui/icons-material/SurroundSoundRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import BlurOnRoundedIcon from "@mui/icons-material/BlurOnRounded";

export const EDITOR_EFFECTS = [
    {
        id: "gain",
        label: "Gain Boost/Cut",
        shortLabel: "GAIN",
        mode: "replace",
        description:
            "Replaces the dry audio inside the block with a louder or quieter version.",
        icon: <GraphicEqRoundedIcon fontSize="small" />,
        params: {
            gainDb: {
                label: "Gain",
                min: -48,
                max: 36,
                step: 0.5,
                unit: " dB",
                defaultValue: 12,
            },
            mix: {
                label: "Replace amount",
                min: 0,
                max: 1,
                step: 0.01,
                unit: "",
                defaultValue: 1,
            },
        },
    },
    {
        id: "silence",
        label: "Silence / Cut",
        shortLabel: "CUT",
        mode: "destructive",
        description: "Mutes the audio inside the block. Use this like a simple timeline cut.",
        icon: <VolumeOffRoundedIcon fontSize="small" />,
        params: {
            amount: {
                label: "Mute amount",
                min: 0,
                max: 1,
                step: 0.01,
                unit: "",
                defaultValue: 1,
            },
        },
    },
    {
        id: "fadein",
        label: "Fade In",
        shortLabel: "FIN",
        mode: "replace",
        description: "Fades the region from silence into full volume.",
        icon: <TimelineRoundedIcon fontSize="small" />,
        params: {
            curve: {
                label: "Curve strength",
                min: 0.25,
                max: 4,
                step: 0.05,
                unit: "",
                defaultValue: 1,
            },
            mix: {
                label: "Replace amount",
                min: 0,
                max: 1,
                step: 0.01,
                unit: "",
                defaultValue: 1,
            },
        },
    },
    {
        id: "fadeout",
        label: "Fade Out",
        shortLabel: "FOUT",
        mode: "replace",
        description: "Fades the region from full volume down to silence.",
        icon: <TimelineRoundedIcon fontSize="small" />,
        params: {
            curve: {
                label: "Curve strength",
                min: 0.25,
                max: 4,
                step: 0.05,
                unit: "",
                defaultValue: 1,
            },
            mix: {
                label: "Replace amount",
                min: 0,
                max: 1,
                step: 0.01,
                unit: "",
                defaultValue: 1,
            },
        },
    },
    {
        id: "highpass",
        label: "High-pass",
        shortLabel: "HPF",
        mode: "replace",
        description: "Strongly removes low frequencies inside the block.",
        icon: <TuneRoundedIcon fontSize="small" />,
        params: {
            frequency: {
                label: "Cutoff",
                min: 20,
                max: 6000,
                step: 10,
                unit: " Hz",
                defaultValue: 950,
            },
            q: {
                label: "Resonance",
                min: 0.1,
                max: 18,
                step: 0.1,
                unit: "",
                defaultValue: 2.2,
            },
            mix: {
                label: "Replace amount",
                min: 0,
                max: 1,
                step: 0.01,
                unit: "",
                defaultValue: 1,
            },
        },
    },
    {
        id: "lowpass",
        label: "Low-pass",
        shortLabel: "LPF",
        mode: "replace",
        description: "Strongly darkens the audio inside the block.",
        icon: <WavesRoundedIcon fontSize="small" />,
        params: {
            frequency: {
                label: "Cutoff",
                min: 120,
                max: 20000,
                step: 20,
                unit: " Hz",
                defaultValue: 1450,
            },
            q: {
                label: "Resonance",
                min: 0.1,
                max: 18,
                step: 0.1,
                unit: "",
                defaultValue: 1.8,
            },
            mix: {
                label: "Replace amount",
                min: 0,
                max: 1,
                step: 0.01,
                unit: "",
                defaultValue: 1,
            },
        },
    },
    {
        id: "peakingeq",
        label: "Peak EQ",
        shortLabel: "EQ",
        mode: "replace",
        description: "Boosts or cuts a focused frequency range inside the block.",
        icon: <AutoFixHighRoundedIcon fontSize="small" />,
        params: {
            frequency: {
                label: "Frequency",
                min: 40,
                max: 18000,
                step: 20,
                unit: " Hz",
                defaultValue: 3200,
            },
            q: {
                label: "Q width",
                min: 0.1,
                max: 20,
                step: 0.1,
                unit: "",
                defaultValue: 5,
            },
            gainDb: {
                label: "EQ gain",
                min: -36,
                max: 36,
                step: 0.5,
                unit: " dB",
                defaultValue: 18,
            },
            mix: {
                label: "Replace amount",
                min: 0,
                max: 1,
                step: 0.01,
                unit: "",
                defaultValue: 1,
            },
        },
    },
    {
        id: "distortion",
        label: "Distortion",
        shortLabel: "DIST",
        mode: "replace",
        description: "Adds obvious saturation/distortion inside the selected range.",
        icon: <BlurOnRoundedIcon fontSize="small" />,
        params: {
            drive: {
                label: "Drive",
                min: 0,
                max: 1200,
                step: 10,
                unit: "",
                defaultValue: 420,
            },
            tone: {
                label: "Tone",
                min: 300,
                max: 16000,
                step: 50,
                unit: " Hz",
                defaultValue: 6800,
            },
            outputDb: {
                label: "Output",
                min: -24,
                max: 12,
                step: 0.5,
                unit: " dB",
                defaultValue: -3,
            },
            mix: {
                label: "Replace amount",
                min: 0,
                max: 1,
                step: 0.01,
                unit: "",
                defaultValue: 1,
            },
        },
    },
    {
        id: "delay",
        label: "Delay Echo",
        shortLabel: "DLY",
        mode: "send",
        description:
            "Adds a loud echo send during the block while keeping the tail after the block.",
        icon: <TimelineRoundedIcon fontSize="small" />,
        params: {
            delayTime: {
                label: "Delay time",
                min: 0.02,
                max: 2,
                step: 0.01,
                unit: " sec",
                defaultValue: 0.36,
            },
            feedback: {
                label: "Feedback",
                min: 0,
                max: 0.92,
                step: 0.01,
                unit: "",
                defaultValue: 0.62,
            },
            mix: {
                label: "Send level",
                min: 0,
                max: 1.5,
                step: 0.01,
                unit: "",
                defaultValue: 0.9,
            },
            dryDuck: {
                label: "Dry duck",
                min: 0,
                max: 1,
                step: 0.01,
                unit: "",
                defaultValue: 0.25,
            },
        },
    },
    {
        id: "reverb",
        label: "Reverb Wash",
        shortLabel: "REV",
        mode: "send",
        description: "Adds an obvious reverb wash during the block and lets the tail ring out.",
        icon: <SurroundSoundRoundedIcon fontSize="small" />,
        params: {
            seconds: {
                label: "Room length",
                min: 0.2,
                max: 8,
                step: 0.1,
                unit: " sec",
                defaultValue: 3.8,
            },
            decay: {
                label: "Decay",
                min: 0.5,
                max: 8,
                step: 0.1,
                unit: "",
                defaultValue: 4.2,
            },
            mix: {
                label: "Send level",
                min: 0,
                max: 1.5,
                step: 0.01,
                unit: "",
                defaultValue: 0.95,
            },
            dryDuck: {
                label: "Dry duck",
                min: 0,
                max: 1,
                step: 0.01,
                unit: "",
                defaultValue: 0.25,
            },
        },
    },
    {
        id: "compressor",
        label: "Compressor Smash",
        shortLabel: "COMP",
        mode: "replace",
        description: "Replaces the block with a heavily compressed version.",
        icon: <CompressRoundedIcon fontSize="small" />,
        params: {
            threshold: {
                label: "Threshold",
                min: -80,
                max: 0,
                step: 1,
                unit: " dB",
                defaultValue: -38,
            },
            ratio: {
                label: "Ratio",
                min: 1,
                max: 30,
                step: 0.5,
                unit: ":1",
                defaultValue: 14,
            },
            attack: {
                label: "Attack",
                min: 0.001,
                max: 0.25,
                step: 0.001,
                unit: " sec",
                defaultValue: 0.003,
            },
            release: {
                label: "Release",
                min: 0.03,
                max: 1.4,
                step: 0.01,
                unit: " sec",
                defaultValue: 0.38,
            },
            makeupDb: {
                label: "Makeup gain",
                min: -12,
                max: 24,
                step: 0.5,
                unit: " dB",
                defaultValue: 9,
            },
            mix: {
                label: "Replace amount",
                min: 0,
                max: 1,
                step: 0.01,
                unit: "",
                defaultValue: 1,
            },
        },
    },
    {
        id: "pan",
        label: "Pan",
        shortLabel: "PAN",
        mode: "replace",
        description: "Moves the block hard left or right.",
        icon: <SurroundSoundRoundedIcon fontSize="small" />,
        params: {
            pan: {
                label: "Pan",
                min: -1,
                max: 1,
                step: 0.01,
                unit: "",
                defaultValue: 0.85,
            },
            mix: {
                label: "Replace amount",
                min: 0,
                max: 1,
                step: 0.01,
                unit: "",
                defaultValue: 1,
            },
        },
    },
];

export function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
}

export function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00.00";

    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 100);

    return `${minutes}:${String(remaining).padStart(2, "0")}.${String(
        milliseconds
    ).padStart(2, "0")}`;
}

export function getEffectDefinition(type) {
    return EDITOR_EFFECTS.find((effect) => effect.id === type) || EDITOR_EFFECTS[0];
}

export function buildDefaultParams(type) {
    const effect = getEffectDefinition(type);
    const params = {};

    Object.entries(effect.params).forEach(([key, config]) => {
        params[key] = config.defaultValue;
    });

    return params;
}

export function getReadableBytes(size) {
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

export function EditorGlassCard({ children, sx }) {
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
            <CardContent sx={{ p: { xs: 2.2, md: 3 } }}>{children}</CardContent>
        </Card>
    );
}

export function EditorStatusBanner({ status, tone = "info", progress }) {
    const isError = tone === "error";

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 4,
                overflow: "hidden",
                background: isError
                    ? "rgba(248,113,113,0.13)"
                    : "rgba(103,232,249,0.1)",
                border: isError
                    ? "1px solid rgba(248,113,113,0.25)"
                    : "1px solid rgba(103,232,249,0.18)",
            }}
        >
            <Box sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 750, color: "#fff" }}>{status}</Typography>
            </Box>

            {Number.isFinite(progress) && progress > 0 && progress < 100 && (
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                        height: 6,
                        background: "rgba(255,255,255,0.08)",
                        "& .MuiLinearProgress-bar": {
                            background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                        },
                    }}
                />
            )}
        </Paper>
    );
}

export function MediaLoaderPanel({
                                     fileName,
                                     mediaInfo,
                                     loading,
                                     onFileSelect,
                                     onClear,
                                 }) {
    return (
        <EditorGlassCard>
            <Stack spacing={2.3}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.5 }}>
                        Import audio
                    </Typography>

                    <Typography sx={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}>
                        Load MP3, WAV, OGG, M4A, MP4, MOV, WebM, or any browser-decodable
                        media file. The editor decodes it into an AudioBuffer for waveform
                        editing.
                    </Typography>
                </Box>

                <Button
                    component="label"
                    variant="contained"
                    size="large"
                    startIcon={<CloudUploadRoundedIcon />}
                    disabled={loading}
                    sx={{
                        borderRadius: 999,
                        py: 1.45,
                        fontWeight: 950,
                        color: "#06111e",
                        background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                    }}
                >
                    Upload audio/video file
                    <input
                        hidden
                        type="file"
                        accept="audio/*,video/*,.mp3,.wav,.ogg,.oga,.opus,.webm,.m4a,.mp4,.mov,.aac,.flac,.aif,.aiff"
                        onChange={(event) => {
                            const file = event.target.files?.[0];

                            if (file) {
                                onFileSelect(file);
                            }

                            event.target.value = "";
                        }}
                    />
                </Button>

                {fileName && (
                    <Stack spacing={1}>
                        <Chip
                            label={`Loaded: ${fileName}`}
                            sx={{
                                justifyContent: "flex-start",
                                color: "#fff",
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                fontWeight: 800,
                            }}
                        />

                        {mediaInfo && (
                            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                                {mediaInfo}
                            </Typography>
                        )}
                    </Stack>
                )}

                <Button
                    variant="text"
                    disabled={loading}
                    onClick={onClear}
                    sx={{
                        alignSelf: "flex-start",
                        color: "rgba(255,255,255,0.72)",
                        fontWeight: 850,
                    }}
                >
                    Clear editor
                </Button>
            </Stack>
        </EditorGlassCard>
    );
}

export function TransportControls({
                                      disabled,
                                      playing,
                                      position,
                                      duration,
                                      onPlayPause,
                                      onStop,
                                      onRestart,
                                      onSeek,
                                  }) {
    return (
        <EditorGlassCard>
            <Stack spacing={2}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.2}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                >
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                            variant="contained"
                            startIcon={playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
                            disabled={disabled}
                            onClick={onPlayPause}
                            sx={{
                                borderRadius: 999,
                                px: 2.4,
                                fontWeight: 950,
                                color: "#06111e",
                                background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                            }}
                        >
                            {playing ? "Pause" : "Play"}
                        </Button>

                        <Button
                            variant="outlined"
                            startIcon={<StopRoundedIcon />}
                            disabled={disabled}
                            onClick={onStop}
                            sx={{
                                borderRadius: 999,
                                color: "#fff",
                                borderColor: "rgba(255,255,255,0.18)",
                                fontWeight: 900,
                            }}
                        >
                            Stop
                        </Button>

                        <Button
                            variant="text"
                            startIcon={<RestartAltRoundedIcon />}
                            disabled={disabled}
                            onClick={onRestart}
                            sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 900 }}
                        >
                            Restart
                        </Button>
                    </Stack>

                    <Typography sx={{ color: "#67e8f9", fontWeight: 950 }}>
                        {formatTime(position)} / {formatTime(duration)}
                    </Typography>
                </Stack>

                <Slider
                    value={duration > 0 ? clamp(position, 0, duration) : 0}
                    min={0}
                    max={Math.max(duration, 0.01)}
                    step={0.01}
                    disabled={disabled}
                    onChange={(_, value) => {
                        const nextValue = Array.isArray(value) ? value[0] : value;
                        onSeek(nextValue);
                    }}
                    sx={{
                        color: "#67e8f9",
                        "& .MuiSlider-thumb": {
                            boxShadow: "0 0 0 8px rgba(103,232,249,0.1)",
                        },
                        "& .MuiSlider-rail": {
                            color: "rgba(255,255,255,0.18)",
                        },
                    }}
                />
            </Stack>
        </EditorGlassCard>
    );
}

export function EffectToolbox({ selectedTool, onSelectTool, disabled }) {
    return (
        <EditorGlassCard>
            <Stack spacing={2}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.4 }}>
                        Effect block guide
                    </Typography>

                    <Typography sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>
                        Each piano-roll row creates its own effect automatically. Use this panel
                        as a guide, or click an effect to highlight it before editing.
                    </Typography>
                </Box>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr 1fr", md: "1fr" },
                        gap: 1,
                    }}
                >
                    {EDITOR_EFFECTS.map((effect) => {
                        const active = selectedTool === effect.id;

                        return (
                            <Tooltip title={effect.description} key={effect.id} arrow>
                                <Button
                                    disabled={disabled}
                                    onClick={() => onSelectTool(effect.id)}
                                    startIcon={effect.icon}
                                    variant={active ? "contained" : "outlined"}
                                    sx={{
                                        justifyContent: "flex-start",
                                        borderRadius: 3,
                                        py: 1.1,
                                        color: active ? "#06111e" : "#fff",
                                        borderColor: "rgba(255,255,255,0.14)",
                                        background: active
                                            ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                            : "rgba(255,255,255,0.035)",
                                        fontWeight: 900,
                                        "&:hover": {
                                            background: active
                                                ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                : "rgba(255,255,255,0.08)",
                                        },
                                    }}
                                >
                                    {effect.label}
                                </Button>
                            </Tooltip>
                        );
                    })}
                </Box>
            </Stack>
        </EditorGlassCard>
    );
}

function prepareCanvas(canvas, heightFallback = 220) {
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, rect.width || 960);
    const height = Math.max(80, rect.height || heightFallback);

    const targetWidth = Math.floor(width * dpr);
    const targetHeight = Math.floor(height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
    }

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { context, width, height };
}

function drawEditorGrid(context, width, height, duration, majorColor, minorColor) {
    context.save();

    context.strokeStyle = minorColor;
    context.lineWidth = 1;

    const minorCount = Math.max(8, Math.ceil(duration * 2));

    for (let i = 0; i <= minorCount; i += 1) {
        const x = (i / minorCount) * width;

        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
    }

    context.strokeStyle = majorColor;

    const majorCount = Math.max(4, Math.ceil(duration / 5));

    for (let i = 0; i <= majorCount; i += 1) {
        const x = (i / majorCount) * width;

        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
    }

    context.restore();
}

function drawRoundRect(context, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);

    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.quadraticCurveTo(
        x + width,
        y + height,
        x + width - safeRadius,
        y + height
    );
    context.lineTo(x + safeRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
    context.closePath();
}

export function WaveformViewer({
                                   peaks,
                                   duration,
                                   position,
                                   blocks,
                                   selectedBlockId,
                                   onSeek,
                               }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const prepared = prepareCanvas(canvas, 260);

        if (!prepared) return;

        const { context, width, height } = prepared;

        context.clearRect(0, 0, width, height);

        const gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "rgba(7,10,19,0.98)");
        gradient.addColorStop(1, "rgba(17,24,39,0.96)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);

        drawEditorGrid(
            context,
            width,
            height,
            Math.max(duration, 1),
            "rgba(103,232,249,0.12)",
            "rgba(255,255,255,0.055)"
        );

        const centerY = height / 2;
        const usableHeight = height * 0.76;

        context.fillStyle = "rgba(103,232,249,0.88)";
        context.shadowColor = "rgba(103,232,249,0.5)";
        context.shadowBlur = 10;

        if (peaks?.length) {
            const step = width / peaks.length;

            for (let i = 0; i < peaks.length; i += 1) {
                const value = peaks[i];
                const barHeight = Math.max(1, value * usableHeight);
                const x = i * step;
                const y = centerY - barHeight / 2;

                context.fillRect(x, y, Math.max(1, step * 0.78), barHeight);
            }
        } else {
            context.fillStyle = "rgba(255,255,255,0.26)";
            context.font = "800 16px system-ui, -apple-system, Segoe UI, sans-serif";
            context.fillText("Upload audio to display the full waveform.", 24, 42);
        }

        context.shadowBlur = 0;

        blocks.forEach((block) => {
            const startX = duration > 0 ? (block.start / duration) * width : 0;
            const endX = duration > 0 ? (block.end / duration) * width : 0;
            const isSelected = block.id === selectedBlockId;
            const effect = getEffectDefinition(block.type);

            context.fillStyle = isSelected
                ? "rgba(167,139,250,0.25)"
                : effect.mode === "destructive"
                    ? "rgba(248,113,113,0.18)"
                    : effect.mode === "send"
                        ? "rgba(167,139,250,0.15)"
                        : "rgba(103,232,249,0.13)";

            context.fillRect(startX, 0, Math.max(2, endX - startX), height);
        });

        const playheadX = duration > 0 ? (position / duration) * width : 0;

        context.strokeStyle = "#ffffff";
        context.lineWidth = 2;
        context.shadowColor = "rgba(255,255,255,0.6)";
        context.shadowBlur = 12;
        context.beginPath();
        context.moveTo(playheadX, 0);
        context.lineTo(playheadX, height);
        context.stroke();

        context.shadowBlur = 0;
        context.fillStyle = "#ffffff";
        context.beginPath();
        context.arc(playheadX, 14, 5, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = "rgba(255,255,255,0.76)";
        context.font = "800 12px system-ui, -apple-system, Segoe UI, sans-serif";
        context.fillText(`Playhead ${formatTime(position)}`, 18, height - 18);
    }, [peaks, duration, position, blocks, selectedBlockId]);

    return (
        <EditorGlassCard sx={{ overflow: "hidden" }}>
            <Stack spacing={1.7}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 950 }}>
                            Full waveform
                        </Typography>

                        <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                            Click the waveform to move the playhead. Blocks tint the affected
                            region.
                        </Typography>
                    </Box>

                    <Chip
                        label={duration > 0 ? formatTime(duration) : "No media"}
                        sx={{
                            color: "#fff",
                            fontWeight: 850,
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    />
                </Stack>

                <Box
                    sx={{
                        height: { xs: 190, md: 260 },
                        borderRadius: 4,
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.09)",
                        cursor: duration > 0 ? "crosshair" : "default",
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        style={{ width: "100%", height: "100%", display: "block" }}
                        onPointerDown={(event) => {
                            if (!duration) return;

                            const rect = event.currentTarget.getBoundingClientRect();
                            const nextPosition = clamp(
                                ((event.clientX - rect.left) / rect.width) * duration,
                                0,
                                duration
                            );

                            onSeek(nextPosition);
                        }}
                    />
                </Box>
            </Stack>
        </EditorGlassCard>
    );
}

function getTimelineHit({ event, canvas, duration, blocks, laneHeight }) {
    const rect = canvas.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    const time = duration > 0 ? (x / rect.width) * duration : 0;
    const laneIndex = clamp(Math.floor(y / laneHeight), 0, EDITOR_EFFECTS.length - 1);

    const hitBlock = [...blocks].reverse().find((block) => {
        const effectIndex = EDITOR_EFFECTS.findIndex((item) => item.id === block.type);
        const inLane = effectIndex === laneIndex;
        const inTime = time >= block.start && time <= block.end;

        return inLane && inTime;
    });

    return {
        x,
        y,
        time,
        laneIndex,
        hitBlock,
        rect,
    };
}

export function TimelineEditor({
                                   duration,
                                   position,
                                   blocks,
                                   selectedBlockId,
                                   selectedTool,
                                   onCreateBlock,
                                   onSelectBlock,
                                   onUpdateBlock,
                                   onSeek,
                                   disabled,
                               }) {
    const canvasRef = useRef(null);
    const dragStateRef = useRef(null);
    const [draft, setDraft] = useState(null);

    const laneHeight = 58;
    const timelineHeight = EDITOR_EFFECTS.length * laneHeight;

    function getEffectFromLaneIndex(laneIndex) {
        const safeIndex = clamp(
            Math.floor(Number(laneIndex)),
            0,
            EDITOR_EFFECTS.length - 1
        );

        return EDITOR_EFFECTS[safeIndex] || getEffectDefinition(selectedTool);
    }

    useEffect(() => {
        const canvas = canvasRef.current;
        const prepared = prepareCanvas(canvas, timelineHeight);

        if (!prepared) return;

        const { context, width, height } = prepared;

        context.clearRect(0, 0, width, height);
        context.fillStyle = "rgba(7,10,19,0.98)";
        context.fillRect(0, 0, width, height);

        EDITOR_EFFECTS.forEach((effect, index) => {
            const y = index * laneHeight;

            context.fillStyle =
                index % 2 === 0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.04)";
            context.fillRect(0, y, width, laneHeight);

            context.strokeStyle = "rgba(255,255,255,0.08)";
            context.beginPath();
            context.moveTo(0, y + laneHeight);
            context.lineTo(width, y + laneHeight);
            context.stroke();

            context.fillStyle =
                effect.mode === "destructive"
                    ? "rgba(248,113,113,0.9)"
                    : effect.mode === "send"
                        ? "rgba(167,139,250,0.95)"
                        : "rgba(103,232,249,0.95)";

            context.font = "900 12px system-ui, -apple-system, Segoe UI, sans-serif";
            context.fillText(effect.shortLabel, 12, y + 22);

            context.fillStyle = "rgba(255,255,255,0.45)";
            context.font = "700 11px system-ui, -apple-system, Segoe UI, sans-serif";
            context.fillText(effect.label, 12, y + 40);
        });

        drawEditorGrid(
            context,
            width,
            height,
            Math.max(duration, 1),
            "rgba(103,232,249,0.13)",
            "rgba(255,255,255,0.05)"
        );

        [...blocks, draft].filter(Boolean).forEach((block) => {
            const effect = getEffectDefinition(block.type);
            const effectIndex = EDITOR_EFFECTS.findIndex((item) => item.id === block.type);
            const y = Math.max(0, effectIndex) * laneHeight + 8;
            const x = duration > 0 ? (block.start / duration) * width : 0;
            const endX = duration > 0 ? (block.end / duration) * width : x + 20;
            const blockWidth = Math.max(12, endX - x);
            const isSelected = block.id === selectedBlockId;
            const isDraft = block.id === "draft-block";

            const blockGradient = context.createLinearGradient(x, y, x + blockWidth, y);

            if (effect.mode === "destructive") {
                blockGradient.addColorStop(0, "rgba(248,113,113,0.92)");
                blockGradient.addColorStop(1, "rgba(251,146,60,0.78)");
            } else if (effect.mode === "send") {
                blockGradient.addColorStop(0, "rgba(167,139,250,0.88)");
                blockGradient.addColorStop(1, "rgba(103,232,249,0.68)");
            } else {
                blockGradient.addColorStop(0, "rgba(103,232,249,0.9)");
                blockGradient.addColorStop(1, "rgba(167,139,250,0.76)");
            }

            context.save();
            context.globalAlpha = isDraft ? 0.7 : 1;
            context.shadowColor = isSelected
                ? "rgba(255,255,255,0.8)"
                : "rgba(103,232,249,0.25)";
            context.shadowBlur = isSelected ? 18 : 8;

            context.fillStyle = blockGradient;
            drawRoundRect(context, x, y, blockWidth, laneHeight - 16, 12);
            context.fill();

            context.shadowBlur = 0;
            context.lineWidth = isSelected ? 2 : 1;
            context.strokeStyle = isSelected ? "#fff" : "rgba(255,255,255,0.22)";
            context.stroke();

            context.fillStyle = "#06111e";
            context.font = "950 12px system-ui, -apple-system, Segoe UI, sans-serif";
            context.fillText(effect.label, x + 12, y + 19);

            context.font = "800 10px system-ui, -apple-system, Segoe UI, sans-serif";
            context.fillText(
                `${formatTime(block.start)} → ${formatTime(block.end)}`,
                x + 12,
                y + 36
            );

            context.restore();
        });

        const playheadX = duration > 0 ? (position / duration) * width : 0;

        context.save();
        context.strokeStyle = "#ffffff";
        context.lineWidth = 2;
        context.shadowColor = "rgba(255,255,255,0.8)";
        context.shadowBlur = 10;
        context.beginPath();
        context.moveTo(playheadX, 0);
        context.lineTo(playheadX, height);
        context.stroke();
        context.restore();
    }, [blocks, draft, selectedBlockId, selectedTool, duration, position, timelineHeight]);

    function handlePointerDown(event) {
        if (disabled || !duration) return;

        event.currentTarget.setPointerCapture?.(event.pointerId);

        const hit = getTimelineHit({
            event,
            canvas: event.currentTarget,
            duration,
            blocks,
            laneHeight,
        });

        if (hit.hitBlock) {
            onSelectBlock(hit.hitBlock.id);
            onSeek(hit.time);

            dragStateRef.current = {
                mode: "move",
                blockId: hit.hitBlock.id,
                originalStart: hit.hitBlock.start,
                originalEnd: hit.hitBlock.end,
                grabbedAt: hit.time,
            };

            return;
        }

        const laneEffect = getEffectFromLaneIndex(hit.laneIndex);
        const laneTime = clamp(hit.time, 0, duration);

        dragStateRef.current = {
            mode: "draw",
            type: laneEffect.id,
            start: laneTime,
        };

        setDraft({
            id: "draft-block",
            type: laneEffect.id,
            start: laneTime,
            end: clamp(laneTime + 0.35, 0, duration),
            params: buildDefaultParams(laneEffect.id),
        });

        onSeek(laneTime);
    }

    function handlePointerMove(event) {
        const state = dragStateRef.current;

        if (!state || disabled || !duration) return;

        const hit = getTimelineHit({
            event,
            canvas: event.currentTarget,
            duration,
            blocks,
            laneHeight,
        });

        if (state.mode === "draw") {
            const start = Math.min(state.start, hit.time);
            const end = Math.max(state.start, hit.time);

            setDraft({
                id: "draft-block",
                type: state.type,
                start: clamp(start, 0, duration),
                end: clamp(Math.max(end, start + 0.08), 0, duration),
                params: buildDefaultParams(state.type),
            });

            return;
        }

        if (state.mode === "move") {
            const delta = hit.time - state.grabbedAt;
            const blockDuration = state.originalEnd - state.originalStart;
            const nextStart = clamp(state.originalStart + delta, 0, duration - blockDuration);
            const nextEnd = nextStart + blockDuration;

            onUpdateBlock(state.blockId, {
                start: nextStart,
                end: nextEnd,
            });
        }
    }

    function handlePointerUp() {
        const state = dragStateRef.current;

        if (state?.mode === "draw" && draft) {
            const start = Math.min(draft.start, draft.end);
            const end = Math.max(draft.start, draft.end);

            if (end - start >= 0.08) {
                onCreateBlock({
                    type: draft.type,
                    start,
                    end,
                    params: buildDefaultParams(draft.type),
                });
            }
        }

        setDraft(null);
        dragStateRef.current = null;
    }

    return (
        <EditorGlassCard>
            <Stack spacing={1.7}>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    spacing={1}
                >
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 950 }}>
                            Piano-roll effect timeline
                        </Typography>

                        <Typography sx={{ color: "rgba(255,255,255,0.62)", fontSize: 13 }}>
                            Drag directly on any effect row to create that effect. Click a block
                            to select it. Drag a block to move it.
                        </Typography>
                    </Box>

                    <Chip
                        label={`${blocks.length} block${blocks.length === 1 ? "" : "s"}`}
                        sx={{
                            color: "#fff",
                            fontWeight: 850,
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    />
                </Stack>

                <Box
                    sx={{
                        height: timelineHeight,
                        borderRadius: 4,
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.09)",
                        cursor: disabled ? "not-allowed" : "crosshair",
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "block",
                            touchAction: "none",
                        }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    />
                </Box>
            </Stack>
        </EditorGlassCard>
    );
}

export function ParameterSlider({ label, value, min, max, step, unit, onChange }) {
    const decimals = step < 0.01 ? 3 : step < 1 ? 2 : 0;

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                <Typography sx={{ fontWeight: 850 }}>{label}</Typography>

                <Typography sx={{ color: "#67e8f9", fontWeight: 950 }}>
                    {Number(value).toFixed(decimals)}
                    {unit}
                </Typography>
            </Stack>

            <Slider
                value={Number(value)}
                min={min}
                max={max}
                step={step}
                onChange={(_, nextValue) => {
                    const cleanValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                    onChange(cleanValue);
                }}
                sx={{
                    color: "#67e8f9",
                    "& .MuiSlider-thumb": {
                        boxShadow: "0 0 0 8px rgba(103,232,249,0.09)",
                    },
                    "& .MuiSlider-rail": {
                        color: "rgba(255,255,255,0.18)",
                    },
                }}
            />
        </Box>
    );
}

export function EffectInspector({
                                    selectedBlock,
                                    duration,
                                    onUpdateBlock,
                                    onDeleteBlock,
                                    onDuplicateBlock,
                                }) {
    const effect = selectedBlock ? getEffectDefinition(selectedBlock.type) : null;

    if (!selectedBlock || !effect) {
        return (
            <EditorGlassCard>
                <Stack spacing={1.5}>
                    <Typography variant="h5" sx={{ fontWeight: 950 }}>
                        Effect parameters
                    </Typography>

                    <Typography sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>
                        Select a timeline block to edit its start time, end time, and
                        WebAudio effect parameters.
                    </Typography>
                </Stack>
            </EditorGlassCard>
        );
    }

    const blockLength = selectedBlock.end - selectedBlock.start;

    return (
        <EditorGlassCard>
            <Stack spacing={2.3}>
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.7 }}>
                        <Typography variant="h5" sx={{ fontWeight: 950 }}>
                            {effect.label}
                        </Typography>

                        <Chip
                            size="small"
                            label={effect.mode}
                            sx={{
                                color: "#06111e",
                                fontWeight: 950,
                                background:
                                    effect.mode === "destructive"
                                        ? "#fb7185"
                                        : effect.mode === "send"
                                            ? "#a78bfa"
                                            : "#67e8f9",
                            }}
                        />
                    </Stack>

                    <Typography sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>
                        {effect.description}
                    </Typography>
                </Box>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                <Stack direction="row" spacing={1}>
                    <TextField
                        fullWidth
                        label="Start"
                        type="number"
                        value={Number(selectedBlock.start).toFixed(2)}
                        onChange={(event) => {
                            const nextStart = clamp(
                                Number(event.target.value),
                                0,
                                Math.max(0, selectedBlock.end - 0.05)
                            );

                            onUpdateBlock(selectedBlock.id, { start: nextStart });
                        }}
                        InputLabelProps={{ sx: { color: "rgba(255,255,255,0.62)" } }}
                        InputProps={{
                            sx: {
                                color: "#fff",
                                borderRadius: 3,
                                background: "rgba(255,255,255,0.08)",
                            },
                        }}
                    />

                    <TextField
                        fullWidth
                        label="End"
                        type="number"
                        value={Number(selectedBlock.end).toFixed(2)}
                        onChange={(event) => {
                            const nextEnd = clamp(
                                Number(event.target.value),
                                Math.min(duration, selectedBlock.start + 0.05),
                                duration
                            );

                            onUpdateBlock(selectedBlock.id, { end: nextEnd });
                        }}
                        InputLabelProps={{ sx: { color: "rgba(255,255,255,0.62)" } }}
                        InputProps={{
                            sx: {
                                color: "#fff",
                                borderRadius: 3,
                                background: "rgba(255,255,255,0.08)",
                            },
                        }}
                    />
                </Stack>

                <Chip
                    label={`Length: ${formatTime(blockLength)}`}
                    sx={{
                        alignSelf: "flex-start",
                        color: "#fff",
                        fontWeight: 850,
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                />

                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                {Object.entries(effect.params).map(([key, config]) => (
                    <ParameterSlider
                        key={key}
                        label={config.label}
                        value={
                            selectedBlock.params?.[key] === undefined
                                ? config.defaultValue
                                : selectedBlock.params[key]
                        }
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        unit={config.unit}
                        onChange={(nextValue) => {
                            onUpdateBlock(selectedBlock.id, {
                                params: {
                                    ...selectedBlock.params,
                                    [key]: nextValue,
                                },
                            });
                        }}
                    />
                ))}

                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<ContentCopyRoundedIcon />}
                        onClick={() => onDuplicateBlock(selectedBlock.id)}
                        sx={{
                            borderRadius: 3,
                            color: "#fff",
                            borderColor: "rgba(255,255,255,0.18)",
                            fontWeight: 900,
                        }}
                    >
                        Duplicate
                    </Button>

                    <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteRoundedIcon />}
                        onClick={() => onDeleteBlock(selectedBlock.id)}
                        sx={{
                            borderRadius: 3,
                            fontWeight: 900,
                        }}
                    >
                        Delete
                    </Button>
                </Stack>
            </Stack>
        </EditorGlassCard>
    );
}

export function ProjectActions({
                                   disabled,
                                   rendering,
                                   blocks,
                                   onRender,
                                   onApplyToEditor,
                                   onExportProject,
                                   onImportProject,
                                   onClearBlocks,
                               }) {
    return (
        <EditorGlassCard>
            <Stack spacing={2}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.5 }}>
                        Export and destructive edit
                    </Typography>

                    <Typography sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>
                        Render the blocks to WAV, or apply the render back into the editor
                        so the waveform is truly changed and you can keep editing.
                    </Typography>
                </Box>

                <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    startIcon={<FileDownloadRoundedIcon />}
                    disabled={disabled || rendering}
                    onClick={onRender}
                    sx={{
                        borderRadius: 4,
                        py: 1.5,
                        fontWeight: 950,
                        color: "#06111e",
                        background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                    }}
                >
                    {rendering ? "Rendering WAV..." : "Render edited WAV"}
                </Button>

                <Button
                    fullWidth
                    size="large"
                    variant="outlined"
                    startIcon={<AutoFixHighRoundedIcon />}
                    disabled={disabled || rendering || !blocks.length}
                    onClick={onApplyToEditor}
                    sx={{
                        borderRadius: 4,
                        py: 1.35,
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.2)",
                        fontWeight: 950,
                    }}
                >
                    Apply render to editor
                </Button>

                <Stack direction={{ xs: "column", sm: "row", md: "column" }} spacing={1}>
                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<SaveRoundedIcon />}
                        disabled={!blocks.length}
                        onClick={onExportProject}
                        sx={{
                            borderRadius: 3,
                            color: "#fff",
                            borderColor: "rgba(255,255,255,0.18)",
                            fontWeight: 900,
                        }}
                    >
                        Save project JSON
                    </Button>

                    <Button
                        fullWidth
                        component="label"
                        variant="outlined"
                        startIcon={<FolderOpenRoundedIcon />}
                        sx={{
                            borderRadius: 3,
                            color: "#fff",
                            borderColor: "rgba(255,255,255,0.18)",
                            fontWeight: 900,
                        }}
                    >
                        Import project JSON
                        <input
                            hidden
                            type="file"
                            accept="application/json,.json"
                            onChange={(event) => {
                                const file = event.target.files?.[0];

                                if (file) {
                                    onImportProject(file);
                                }

                                event.target.value = "";
                            }}
                        />
                    </Button>

                    <Button
                        fullWidth
                        variant="text"
                        startIcon={<DeleteRoundedIcon />}
                        disabled={!blocks.length}
                        onClick={onClearBlocks}
                        sx={{
                            color: "rgba(255,255,255,0.72)",
                            fontWeight: 900,
                        }}
                    >
                        Clear blocks
                    </Button>
                </Stack>
            </Stack>
        </EditorGlassCard>
    );
}

export function EditorHelpPanel() {
    return (
        <EditorGlassCard>
            <Stack spacing={1.7}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                    Piano-roll editing
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
                    You no longer need to select a filter before drawing. Each timeline row is
                    its own effect lane. Drag on the Silence row to cut audio, drag on the
                    Reverb row to add a reverb block, drag on the Delay row for echo, and so on.
                    Send effects keep their tails, while insert effects duck or replace the dry
                    signal inside the selected region.
                </Typography>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                <Stack direction="row" flexWrap="wrap" gap={1}>
                    {[
                        "Piano-roll lanes",
                        "No filter preselect needed",
                        "Dry ducking",
                        "Insert replacement",
                        "Destructive apply",
                        "Silence cuts",
                        "Fade blocks",
                        "Distortion",
                        "Loud delay",
                        "Loud reverb",
                        "WAV export",
                    ].map((label) => (
                        <Chip
                            key={label}
                            label={label}
                            sx={{
                                color: "#fff",
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                fontWeight: 750,
                            }}
                        />
                    ))}
                </Stack>
            </Stack>
        </EditorGlassCard>
    );
}