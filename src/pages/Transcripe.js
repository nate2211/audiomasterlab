// src/pages/Transcripe.js

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    LinearProgress,
    Paper,
    Stack,
    Switch,
    TextField,
    Typography,
    FormControlLabel,
} from "@mui/material";

import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import SubtitlesRoundedIcon from "@mui/icons-material/SubtitlesRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import { GlassCard, PageShell, StatusBanner } from "../components/Components.js";

let transformersModulePromise = null;

async function loadTransformers() {
    if (!transformersModulePromise) {
        transformersModulePromise = import("@huggingface/transformers");
    }

    const { env, pipeline } = await transformersModulePromise;

    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.useBrowserCache = true;

    // Use the hosted WASM binaries unless you decide to self-host them later.
    // Hugging Face documents that Transformers.js uses hosted pretrained models
    // and precompiled WASM binaries by default.
    return { pipeline };
}

const MODEL_ID = "onnx-community/whisper-tiny.en";
const MAX_FILE_SIZE_MB = 90;
const LONG_AUDIO_WARNING_SECONDS = 12 * 60;

function formatBytes(size) {
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

function formatTime(seconds) {
    const safeSeconds = Number(seconds);

    if (!Number.isFinite(safeSeconds) || safeSeconds <= 0) return "0:00";

    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remaining = Math.floor(safeSeconds % 60);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(
            remaining
        ).padStart(2, "0")}`;
    }

    return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function formatSrtTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const secs = Math.floor(safe % 60);
    const millis = Math.floor((safe % 1) * 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
    )}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

function cleanText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function buildSrt(chunks) {
    if (!Array.isArray(chunks) || !chunks.length) return "";

    return chunks
        .map((chunk, index) => {
            const timestamps = chunk.timestamp || chunk.timestamps || [];
            const start = Number(timestamps[0]);
            const end = Number(timestamps[1]);
            const text = cleanText(chunk.text);

            if (!text || !Number.isFinite(start)) return null;

            const safeEnd = Number.isFinite(end) && end > start ? end : start + 2;

            return `${index + 1}
${formatSrtTime(start)} --> ${formatSrtTime(safeEnd)}
${text}`;
        })
        .filter(Boolean)
        .join("\n\n");
}

function downloadText(filename, text, mimeType = "text/plain;charset=utf-8") {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function makeBaseName(fileName) {
    const clean = String(fileName || "audiomaster-transcript")
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    return clean || "audiomaster-transcript";
}

function getWordCount(value) {
    const text = cleanText(value);

    if (!text) return 0;

    return text.split(/\s+/).filter(Boolean).length;
}

function isMissingScaleError(error) {
    const message = String(error?.message || error || "");

    return (
        message.includes("Missing required scale") ||
        message.includes("TransposeDQWeightsForMatMulNBits") ||
        message.includes("weight_merged_0_scale")
    );
}

export default function Transcripe() {
    const transcriberRef = useRef(null);
    const objectUrlRef = useRef("");

    const [file, setFile] = useState(null);
    const [audioUrl, setAudioUrl] = useState("");
    const [duration, setDuration] = useState(0);

    const [withTimestamps, setWithTimestamps] = useState(false);

    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState(
        "Upload an audio file, then press Transcribe Audio."
    );
    const [tone, setTone] = useState("info");

    const [transcript, setTranscript] = useState("");
    const [chunks, setChunks] = useState([]);

    const fileTooLarge = file?.size > MAX_FILE_SIZE_MB * 1024 * 1024;
    const longAudioWarning = duration > LONG_AUDIO_WARNING_SECONDS;
    const baseFileName = makeBaseName(file?.name);
    const wordCount = getWordCount(transcript);

    const srtText = useMemo(() => buildSrt(chunks), [chunks]);

    useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    function resetOutputOnly() {
        setTranscript("");
        setChunks([]);
        setProgress(0);
    }

    function handleFileSelect(nextFile) {
        if (!nextFile) return;

        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
        }

        const nextUrl = URL.createObjectURL(nextFile);

        objectUrlRef.current = nextUrl;

        setFile(nextFile);
        setAudioUrl(nextUrl);
        setDuration(0);
        resetOutputOnly();

        if (nextFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            setTone("error");
            setStatus(
                `This file is ${formatBytes(
                    nextFile.size
                )}. For browser transcription, keep files under ${MAX_FILE_SIZE_MB} MB.`
            );
            return;
        }

        setTone("info");
        setStatus("Audio loaded. Press Transcribe Audio to convert it to text.");
    }

    function clearAll() {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
        }

        objectUrlRef.current = "";
        transcriberRef.current = null;

        setFile(null);
        setAudioUrl("");
        setDuration(0);
        setTranscript("");
        setChunks([]);
        setProgress(0);
        setBusy(false);
        setTone("info");
        setStatus("Upload an audio file, then press Transcribe Audio.");
    }

    async function getTranscriber() {
        if (transcriberRef.current) {
            return transcriberRef.current;
        }

        setProgress(2);
        setStatus("Loading Whisper model. First load can take time.");

        const { pipeline } = await loadTransformers();

        const instance = await pipeline("automatic-speech-recognition", MODEL_ID, {
            device: "wasm",
            dtype: {
                encoder_model: "fp32",
                decoder_model_merged: "fp32",
            },
            progress_callback: (event) => {
                const amount = Number(event?.progress);

                if (Number.isFinite(amount)) {
                    setProgress(Math.max(2, Math.min(95, amount)));
                }

                const eventStatus = event?.status || "loading";
                const eventFile = event?.file || event?.name || "";

                setStatus(eventFile ? `Model ${eventStatus}: ${eventFile}` : `Model ${eventStatus}...`);
            },
        });

        transcriberRef.current = instance;
        return instance;
    }

    async function handleTranscribe() {
        if (!audioUrl || !file) {
            setTone("error");
            setStatus("Upload an audio file first.");
            return;
        }

        if (fileTooLarge) {
            setTone("error");
            setStatus(
                `This file is too large for safe browser transcription. Use a file under ${MAX_FILE_SIZE_MB} MB.`
            );
            return;
        }

        setBusy(true);
        setTone("info");
        setProgress(0);
        setTranscript("");
        setChunks([]);

        try {
            const transcriber = await getTranscriber();

            setStatus("Transcribing audio. Keep this tab open.");
            setProgress((previous) => Math.max(previous, 25));

            const options = {
                chunk_length_s: 30,
                stride_length_s: 5,
            };

            if (withTimestamps) {
                options.return_timestamps = true;
            }

            const result = await transcriber(audioUrl, options);

            const nextText = cleanText(result?.text);
            const nextChunks = Array.isArray(result?.chunks) ? result.chunks : [];

            setTranscript(nextText);
            setChunks(nextChunks);
            setProgress(100);

            if (nextText) {
                setTone("info");
                setStatus("Done. You can edit, copy, or download the transcript.");
            } else {
                setTone("error");
                setStatus(
                    "Finished, but no clear speech was detected. Try cleaner vocals, a shorter file, or less background music."
                );
            }
        } catch (error) {
            console.error(error);

            transcriberRef.current = null;

            if (isMissingScaleError(error)) {
                setTone("error");
                setStatus(
                    "The browser loaded a broken cached quantized model. Clear this site's browser storage, restart the dev server, then retry. This file now forces fp32 WASM to avoid that qdq scale error."
                );
            } else {
                setTone("error");
                setStatus(
                    error?.message ||
                    "Transcription failed. Try a shorter file, a different browser, or a WAV/MP3 file."
                );
            }

            setProgress(0);
        } finally {
            setBusy(false);
        }
    }

    async function copyTranscript() {
        if (!transcript) return;

        try {
            await navigator.clipboard.writeText(transcript);
            setTone("info");
            setStatus("Transcript copied to clipboard.");
        } catch {
            setTone("error");
            setStatus("Clipboard copy failed. Select the text manually and copy it.");
        }
    }

    return (
        <>
            <Helmet>
                <title>Audio Transcribe</title>
                <meta
                    name="description"
                    content="Upload audio and transcribe speech to text directly in the browser with AudioMaster Lab."
                />
                <meta
                    name="keywords"
                    content="audio transcription, speech to text, browser transcription, whisper transcription, audio to text, audio lyrics transcription"
                />
            </Helmet>

            <PageShell>
                <Stack spacing={4}>
                    <Box>
                        <Chip
                            icon={<SubtitlesRoundedIcon />}
                            label="Browser-only audio transcription"
                            sx={{
                                mb: 2,
                                color: "#dffaff",
                                background: "rgba(103,232,249,0.12)",
                                border: "1px solid rgba(103,232,249,0.24)",
                                fontWeight: 850,
                            }}
                        />

                        <Typography
                            variant="h1"
                            sx={{
                                fontWeight: 950,
                                letterSpacing: "-0.075em",
                                lineHeight: 0.95,
                                fontSize: { xs: "2.5rem", md: "4.8rem" },
                                maxWidth: 980,
                                mb: 2,
                            }}
                        >
                            Transcribe audio to text directly in the browser.
                        </Typography>

                        <Typography
                            variant="h6"
                            sx={{
                                color: "rgba(255,255,255,0.68)",
                                lineHeight: 1.7,
                                maxWidth: 860,
                            }}
                        >
                            Upload MP3, WAV, M4A, OGG, WebM, MP4, or another
                            browser-supported media file. This version forces fp32 WASM to
                            avoid the broken quantized model path that caused the missing
                            scale session error.
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", lg: "0.86fr 1.14fr" },
                            gap: 3,
                            alignItems: "start",
                        }}
                    >
                        <Stack spacing={3}>
                            <GlassCard>
                                <Stack spacing={2.4}>
                                    <Box>
                                        <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                            Upload audio
                                        </Typography>

                                        <Typography
                                            sx={{
                                                color: "rgba(255,255,255,0.62)",
                                                lineHeight: 1.65,
                                                mt: 0.7,
                                            }}
                                        >
                                            Clear voice recordings work best. Full songs can work,
                                            but loud beats, bass, reverb, and layered vocals can
                                            reduce accuracy.
                                        </Typography>
                                    </Box>

                                    <Button
                                        component="label"
                                        variant="contained"
                                        size="large"
                                        startIcon={<CloudUploadRoundedIcon />}
                                        disabled={busy}
                                        sx={{
                                            borderRadius: 999,
                                            py: 1.55,
                                            fontWeight: 950,
                                            color: "#06111e",
                                            background:
                                                "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                            boxShadow: "0 18px 46px rgba(103,232,249,0.2)",
                                            "&:hover": {
                                                background:
                                                    "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                filter: "brightness(1.04)",
                                            },
                                        }}
                                    >
                                        Choose audio file
                                        <input
                                            hidden
                                            type="file"
                                            accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.oga,.opus,.webm,.mp4,.mov,.aac,.flac,.aif,.aiff"
                                            onChange={(event) => {
                                                const nextFile = event.target.files?.[0];

                                                if (nextFile) {
                                                    handleFileSelect(nextFile);
                                                }

                                                event.target.value = "";
                                            }}
                                        />
                                    </Button>

                                    {file && (
                                        <Stack spacing={1.4}>
                                            <Chip
                                                label={`${file.name} • ${formatBytes(file.size)}${
                                                    duration ? ` • ${formatTime(duration)}` : ""
                                                }`}
                                                sx={{
                                                    justifyContent: "flex-start",
                                                    color: "#fff",
                                                    background: "rgba(255,255,255,0.08)",
                                                    border: "1px solid rgba(255,255,255,0.08)",
                                                    fontWeight: 800,
                                                }}
                                            />

                                            <Box
                                                component="audio"
                                                src={audioUrl}
                                                controls
                                                onLoadedMetadata={(event) => {
                                                    const nextDuration =
                                                        event.currentTarget.duration;

                                                    if (Number.isFinite(nextDuration)) {
                                                        setDuration(nextDuration);
                                                    }
                                                }}
                                                sx={{
                                                    width: "100%",
                                                    filter:
                                                        "drop-shadow(0 12px 28px rgba(0,0,0,0.25))",
                                                }}
                                            />
                                        </Stack>
                                    )}

                                    {fileTooLarge && (
                                        <Alert
                                            severity="error"
                                            icon={<WarningAmberRoundedIcon />}
                                            sx={{
                                                borderRadius: 3,
                                                background: "rgba(248,113,113,0.1)",
                                                color: "#fff",
                                                border: "1px solid rgba(248,113,113,0.24)",
                                                "& .MuiAlert-icon": {
                                                    color: "#fb7185",
                                                },
                                            }}
                                        >
                                            This file is too large for safe browser transcription.
                                            Keep uploads under {MAX_FILE_SIZE_MB} MB.
                                        </Alert>
                                    )}

                                    {longAudioWarning && !fileTooLarge && (
                                        <Alert
                                            severity="warning"
                                            icon={<WarningAmberRoundedIcon />}
                                            sx={{
                                                borderRadius: 3,
                                                background: "rgba(251,191,36,0.1)",
                                                color: "#fff",
                                                border: "1px solid rgba(251,191,36,0.24)",
                                                "& .MuiAlert-icon": {
                                                    color: "#fbbf24",
                                                },
                                            }}
                                        >
                                            This audio is longer than 12 minutes. It may work, but
                                            slower devices can freeze or run out of memory.
                                        </Alert>
                                    )}

                                    <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                                    <Alert
                                        severity="info"
                                        sx={{
                                            borderRadius: 3,
                                            background: "rgba(103,232,249,0.08)",
                                            color: "#dffaff",
                                            border: "1px solid rgba(103,232,249,0.16)",
                                            "& .MuiAlert-icon": {
                                                color: "#67e8f9",
                                            },
                                        }}
                                    >
                                        Stable mode enabled: onnx-community/whisper-tiny.en,
                                        WASM runtime, fp32 encoder, fp32 decoder. This avoids the
                                        qdq MatMulNBits missing-scale crash.
                                    </Alert>

                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={withTimestamps}
                                                disabled={busy}
                                                onChange={(event) => {
                                                    setWithTimestamps(event.target.checked);
                                                    resetOutputOnly();
                                                }}
                                            />
                                        }
                                        label="Create timestamps for SRT export"
                                        sx={{
                                            color: "rgba(255,255,255,0.78)",
                                            fontWeight: 800,
                                        }}
                                    />

                                    <Button
                                        size="large"
                                        variant="contained"
                                        startIcon={<AutoAwesomeRoundedIcon />}
                                        disabled={!audioUrl || busy || fileTooLarge}
                                        onClick={handleTranscribe}
                                        sx={{
                                            borderRadius: 999,
                                            py: 1.55,
                                            fontWeight: 950,
                                            color: "#06111e",
                                            background:
                                                "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                            boxShadow: "0 18px 46px rgba(103,232,249,0.2)",
                                            "&:hover": {
                                                background:
                                                    "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                filter: "brightness(1.04)",
                                            },
                                        }}
                                    >
                                        {busy ? "Transcribing..." : "Transcribe Audio"}
                                    </Button>

                                    <Button
                                        variant="text"
                                        startIcon={<DeleteRoundedIcon />}
                                        disabled={busy && !file}
                                        onClick={clearAll}
                                        sx={{
                                            alignSelf: "flex-start",
                                            color: "rgba(255,255,255,0.72)",
                                            fontWeight: 850,
                                        }}
                                    >
                                        Clear
                                    </Button>
                                </Stack>
                            </GlassCard>

                            <StatusBanner status={status} tone={tone} />

                            {progress > 0 && progress < 100 && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.4,
                                        borderRadius: 4,
                                        background: "rgba(255,255,255,0.055)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                    }}
                                >
                                    <Stack spacing={1}>
                                        <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <Typography
                                                sx={{
                                                    color: "rgba(255,255,255,0.76)",
                                                    fontWeight: 850,
                                                    fontSize: 13,
                                                }}
                                            >
                                                Loading / processing
                                            </Typography>

                                            <Typography
                                                sx={{
                                                    color: "#67e8f9",
                                                    fontWeight: 950,
                                                    fontSize: 13,
                                                }}
                                            >
                                                {Math.round(progress)}%
                                            </Typography>
                                        </Stack>

                                        <LinearProgress
                                            variant="determinate"
                                            value={progress}
                                            sx={{
                                                height: 8,
                                                borderRadius: 999,
                                                background: "rgba(255,255,255,0.08)",
                                                "& .MuiLinearProgress-bar": {
                                                    background:
                                                        "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                },
                                            }}
                                        />
                                    </Stack>
                                </Paper>
                            )}
                        </Stack>

                        <GlassCard>
                            <Stack spacing={2.2}>
                                <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    justifyContent="space-between"
                                    spacing={1.5}
                                >
                                    <Box>
                                        <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                            Transcript output
                                        </Typography>

                                        <Typography
                                            sx={{
                                                color: "rgba(255,255,255,0.62)",
                                                lineHeight: 1.65,
                                                mt: 0.5,
                                            }}
                                        >
                                            Edit the result before copying or downloading it.
                                        </Typography>
                                    </Box>

                                    <Chip
                                        icon={<GraphicEqRoundedIcon />}
                                        label={
                                            transcript
                                                ? `${wordCount} word${wordCount === 1 ? "" : "s"}`
                                                : "No transcript yet"
                                        }
                                        sx={{
                                            alignSelf: { xs: "flex-start", md: "center" },
                                            color: "#fff",
                                            background: "rgba(255,255,255,0.08)",
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            fontWeight: 850,
                                        }}
                                    />
                                </Stack>

                                <TextField
                                    value={transcript}
                                    onChange={(event) => setTranscript(event.target.value)}
                                    placeholder="Your transcribed audio text will appear here..."
                                    multiline
                                    minRows={18}
                                    fullWidth
                                    InputProps={{
                                        sx: {
                                            color: "#fff",
                                            borderRadius: 4,
                                            background: "rgba(255,255,255,0.08)",
                                            alignItems: "flex-start",
                                            fontSize: 15,
                                            lineHeight: 1.7,
                                        },
                                    }}
                                />

                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={1}
                                    flexWrap="wrap"
                                >
                                    <Button
                                        variant="outlined"
                                        startIcon={<ContentCopyRoundedIcon />}
                                        disabled={!transcript}
                                        onClick={copyTranscript}
                                        sx={{
                                            borderRadius: 999,
                                            color: "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 900,
                                        }}
                                    >
                                        Copy text
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        startIcon={<FileDownloadRoundedIcon />}
                                        disabled={!transcript}
                                        onClick={() =>
                                            downloadText(
                                                `${baseFileName}-transcript.txt`,
                                                transcript,
                                                "text/plain;charset=utf-8"
                                            )
                                        }
                                        sx={{
                                            borderRadius: 999,
                                            color: "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 900,
                                        }}
                                    >
                                        Download TXT
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        startIcon={<FileDownloadRoundedIcon />}
                                        disabled={!srtText}
                                        onClick={() =>
                                            downloadText(
                                                `${baseFileName}-captions.srt`,
                                                srtText,
                                                "application/x-subrip;charset=utf-8"
                                            )
                                        }
                                        sx={{
                                            borderRadius: 999,
                                            color: "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 900,
                                        }}
                                    >
                                        Download SRT
                                    </Button>
                                </Stack>

                                {chunks.length > 0 && (
                                    <>
                                        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 950, mb: 1.3 }}
                                            >
                                                Timestamp preview
                                            </Typography>

                                            <Stack spacing={1}>
                                                {chunks.slice(0, 12).map((chunk, index) => {
                                                    const timestamps =
                                                        chunk.timestamp || chunk.timestamps || [];
                                                    const start = Number(timestamps[0]);
                                                    const end = Number(timestamps[1]);
                                                    const safeStart = Number.isFinite(start)
                                                        ? start
                                                        : 0;
                                                    const safeEnd =
                                                        Number.isFinite(end) && end > safeStart
                                                            ? end
                                                            : safeStart + 2;

                                                    return (
                                                        <Box
                                                            key={`${chunk.text}-${index}`}
                                                            sx={{
                                                                p: 1.5,
                                                                borderRadius: 3,
                                                                background:
                                                                    "rgba(255,255,255,0.055)",
                                                                border:
                                                                    "1px solid rgba(255,255,255,0.08)",
                                                            }}
                                                        >
                                                            <Typography
                                                                sx={{
                                                                    color: "#67e8f9",
                                                                    fontSize: 12,
                                                                    fontWeight: 950,
                                                                    mb: 0.5,
                                                                }}
                                                            >
                                                                {formatTime(safeStart)} →{" "}
                                                                {formatTime(safeEnd)}
                                                            </Typography>

                                                            <Typography
                                                                sx={{
                                                                    color: "rgba(255,255,255,0.78)",
                                                                    lineHeight: 1.55,
                                                                }}
                                                            >
                                                                {cleanText(chunk.text)}
                                                            </Typography>
                                                        </Box>
                                                    );
                                                })}

                                                {chunks.length > 12 && (
                                                    <Typography
                                                        sx={{
                                                            color: "rgba(255,255,255,0.55)",
                                                            fontSize: 13,
                                                        }}
                                                    >
                                                        Showing first 12 chunks. Download SRT to
                                                        save all timestamp chunks.
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </Box>
                                    </>
                                )}
                            </Stack>
                        </GlassCard>
                    </Box>
                </Stack>
            </PageShell>
        </>
    );
}