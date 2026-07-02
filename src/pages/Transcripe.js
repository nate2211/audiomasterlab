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
    useMediaQuery,
} from "@mui/material";

import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import SubtitlesRoundedIcon from "@mui/icons-material/SubtitlesRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";

import { GlassCard, PageShell, StatusBanner } from "../components/Components.js";

let transformersModulePromise = null;

const MODEL_ID = "onnx-community/whisper-tiny.en";
const MAX_FILE_SIZE_MB = 90;
const LONG_AUDIO_WARNING_SECONDS = 12 * 60;

const PROGRESS_COOKIE_NAME = "aml_transcribe_model_progress_v3";
const SETTINGS_COOKIE_NAME = "aml_transcribe_settings_v3";
const TRANSCRIPT_STORAGE_KEY = "aml_transcribe_transcript_draft_v3";
const CHUNKS_STORAGE_KEY = "aml_transcribe_chunks_draft_v3";
const FILE_META_STORAGE_KEY = "aml_transcribe_file_meta_v3";

const COOKIE_MAX_AGE_DAYS = 30;

async function loadTransformers() {
    if (!transformersModulePromise) {
        transformersModulePromise = import("@huggingface/transformers");
    }

    const { env, pipeline } = await transformersModulePromise;

    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.useBrowserCache = true;

    return { pipeline };
}

function canUseBrowserStorage() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function setCookieValue(name, value, maxAgeDays = COOKIE_MAX_AGE_DAYS) {
    if (typeof document === "undefined") return;

    const maxAgeSeconds = Math.max(1, maxAgeDays) * 24 * 60 * 60;

    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
        value
    )}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
}

function getCookieValue(name) {
    if (typeof document === "undefined") return "";

    const encodedName = encodeURIComponent(name);
    const parts = document.cookie ? document.cookie.split(";") : [];

    for (const part of parts) {
        const [rawKey, ...rawValue] = part.trim().split("=");

        if (rawKey === encodedName) {
            return decodeURIComponent(rawValue.join("=") || "");
        }
    }

    return "";
}

function deleteCookieValue(name) {
    if (typeof document === "undefined") return;

    document.cookie = `${encodeURIComponent(name)}=; max-age=0; path=/; SameSite=Lax`;
}

function readJsonCookie(name, fallback) {
    const raw = getCookieValue(name);

    if (!raw) return fallback;

    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function writeJsonCookie(name, value, maxAgeDays = COOKIE_MAX_AGE_DAYS) {
    try {
        const json = JSON.stringify(value || {});
        setCookieValue(name, json, maxAgeDays);
    } catch {
        // Ignore cookie write failures.
    }
}

function readLocalJson(key, fallback) {
    if (!canUseBrowserStorage()) return fallback;

    try {
        const raw = window.localStorage.getItem(key);

        if (!raw) return fallback;

        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function writeLocalJson(key, value) {
    if (!canUseBrowserStorage()) return;

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage can fail on private browsing or full storage.
    }
}

function deleteLocalValue(key) {
    if (!canUseBrowserStorage()) return;

    try {
        window.localStorage.removeItem(key);
    } catch {
        // Safe cleanup.
    }
}

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

function getSavedProgressSummary() {
    const savedProgress = readJsonCookie(PROGRESS_COOKIE_NAME, null);
    const savedSettings = readJsonCookie(SETTINGS_COOKIE_NAME, null);
    const savedFileMeta = readLocalJson(FILE_META_STORAGE_KEY, null);
    const savedTranscript = canUseBrowserStorage()
        ? window.localStorage.getItem(TRANSCRIPT_STORAGE_KEY) || ""
        : "";

    return {
        savedProgress,
        savedSettings,
        savedFileMeta,
        hasTranscriptDraft: Boolean(savedTranscript),
    };
}

export default function Transcripe() {
    const isMobile = useMediaQuery("(max-width:700px)");
    const isTablet = useMediaQuery("(max-width:1100px)");

    const transcriberRef = useRef(null);
    const objectUrlRef = useRef("");

    const [file, setFile] = useState(null);
    const [audioUrl, setAudioUrl] = useState("");
    const [duration, setDuration] = useState(0);

    const [withTimestamps, setWithTimestamps] = useState(false);
    const [restoreLoaded, setRestoreLoaded] = useState(false);

    const [busy, setBusy] = useState(false);
    const [modelReady, setModelReady] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState(
        "Upload an audio file, then press Transcribe Audio."
    );
    const [tone, setTone] = useState("info");

    const [transcript, setTranscript] = useState("");
    const [chunks, setChunks] = useState([]);
    const [savedFileMeta, setSavedFileMeta] = useState(null);

    const fileTooLarge = file?.size > MAX_FILE_SIZE_MB * 1024 * 1024;
    const longAudioWarning = duration > LONG_AUDIO_WARNING_SECONDS;
    const baseFileName = makeBaseName(file?.name || savedFileMeta?.name);
    const wordCount = getWordCount(transcript);

    const srtText = useMemo(() => buildSrt(chunks), [chunks]);

    const savedSummary = useMemo(() => getSavedProgressSummary(), [restoreLoaded]);

    useEffect(() => {
        const savedSettings = readJsonCookie(SETTINGS_COOKIE_NAME, {});
        const savedProgress = readJsonCookie(PROGRESS_COOKIE_NAME, {});
        const nextTranscript = canUseBrowserStorage()
            ? window.localStorage.getItem(TRANSCRIPT_STORAGE_KEY) || ""
            : "";
        const nextChunks = readLocalJson(CHUNKS_STORAGE_KEY, []);
        const nextFileMeta = readLocalJson(FILE_META_STORAGE_KEY, null);

        if (typeof savedSettings.withTimestamps === "boolean") {
            setWithTimestamps(savedSettings.withTimestamps);
        }

        if (nextTranscript) {
            setTranscript(nextTranscript);
        }

        if (Array.isArray(nextChunks)) {
            setChunks(nextChunks);
        }

        if (nextFileMeta && typeof nextFileMeta === "object") {
            setSavedFileMeta(nextFileMeta);
        }

        if (savedProgress?.status) {
            setStatus(
                savedProgress.completed
                    ? "Restored your last transcript draft. Upload the same audio again if you want to re-run transcription."
                    : savedProgress.status
            );
            setTone(savedProgress.tone || "info");
            setProgress(Number(savedProgress.progress || 0));
            setModelReady(Boolean(savedProgress.modelReady));
        }

        setRestoreLoaded(true);

        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    useEffect(() => {
        writeJsonCookie(SETTINGS_COOKIE_NAME, {
            withTimestamps,
            updatedAt: Date.now(),
        });
    }, [withTimestamps]);

    useEffect(() => {
        if (!restoreLoaded) return;

        writeJsonCookie(PROGRESS_COOKIE_NAME, {
            modelId: MODEL_ID,
            progress: Math.max(0, Math.min(100, Number(progress) || 0)),
            status: String(status || "").slice(0, 360),
            tone,
            modelReady,
            busy,
            completed: Boolean(transcript && progress >= 100),
            wordCount,
            chunksCount: chunks.length,
            updatedAt: Date.now(),
        });
    }, [restoreLoaded, progress, status, tone, modelReady, busy, transcript, wordCount, chunks.length]);

    useEffect(() => {
        if (!restoreLoaded) return;

        if (transcript) {
            try {
                window.localStorage.setItem(TRANSCRIPT_STORAGE_KEY, transcript);
            } catch {
                // Ignore storage failures.
            }
        } else {
            deleteLocalValue(TRANSCRIPT_STORAGE_KEY);
        }
    }, [restoreLoaded, transcript]);

    useEffect(() => {
        if (!restoreLoaded) return;

        if (chunks.length > 0) {
            writeLocalJson(CHUNKS_STORAGE_KEY, chunks);
        } else {
            deleteLocalValue(CHUNKS_STORAGE_KEY);
        }
    }, [restoreLoaded, chunks]);

    function resetOutputOnly() {
        setTranscript("");
        setChunks([]);
        setProgress(0);
        deleteLocalValue(TRANSCRIPT_STORAGE_KEY);
        deleteLocalValue(CHUNKS_STORAGE_KEY);
    }

    function saveFileMeta(nextFile, nextDuration = duration) {
        if (!nextFile) return;

        const meta = {
            name: nextFile.name,
            size: nextFile.size,
            type: nextFile.type,
            lastModified: nextFile.lastModified,
            duration: Number.isFinite(nextDuration) ? nextDuration : 0,
            updatedAt: Date.now(),
        };

        setSavedFileMeta(meta);
        writeLocalJson(FILE_META_STORAGE_KEY, meta);
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
        saveFileMeta(nextFile, 0);
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

    function clearSavedProgress() {
        deleteCookieValue(PROGRESS_COOKIE_NAME);
        deleteCookieValue(SETTINGS_COOKIE_NAME);
        deleteLocalValue(TRANSCRIPT_STORAGE_KEY);
        deleteLocalValue(CHUNKS_STORAGE_KEY);
        deleteLocalValue(FILE_META_STORAGE_KEY);
        setSavedFileMeta(null);
        setTranscript("");
        setChunks([]);
        setProgress(0);
        setModelReady(false);
        setTone("info");
        setStatus("Saved transcript and model progress were cleared.");
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
        setModelReady(false);
        setTone("info");
        setStatus("Upload an audio file, then press Transcribe Audio.");

        clearSavedProgress();
    }

    async function getTranscriber() {
        if (transcriberRef.current) {
            setModelReady(true);
            return transcriberRef.current;
        }

        setModelReady(false);
        setProgress(2);
        setStatus(
            "Loading Whisper model. First load can take time; future loads may reuse the browser model cache."
        );

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

                setStatus(
                    eventFile
                        ? `Model ${eventStatus}: ${eventFile}`
                        : `Model ${eventStatus}...`
                );
            },
        });

        transcriberRef.current = instance;
        setModelReady(true);
        setProgress((previous) => Math.max(previous, 95));
        setStatus("Model ready. Starting transcription.");

        return instance;
    }

    async function handleTranscribe() {
        if (!audioUrl || !file) {
            setTone("error");
            setStatus("Upload an audio file first. A selected file cannot be restored after a page refresh.");
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

            setStatus("Transcribing audio. Keep this tab open until the result appears.");
            setProgress((previous) => Math.max(previous, 25));

            const options = {
                chunk_length_s: isMobile ? 20 : 30,
                stride_length_s: isMobile ? 4 : 5,
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
                setStatus("Done. Your transcript draft is saved locally and can be copied or downloaded.");
            } else {
                setTone("error");
                setStatus(
                    "Finished, but no clear speech was detected. Try cleaner speech, a shorter file, or less background noise."
                );
            }
        } catch (error) {
            console.error(error);

            transcriberRef.current = null;
            setModelReady(false);

            if (isMissingScaleError(error)) {
                setTone("error");
                setStatus(
                    "The browser loaded a broken cached quantized model. Clear this site's browser storage, restart the page, then retry. This file forces fp32 WASM to avoid that missing-scale error."
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

    const uploadButtonText = isMobile ? "Choose file" : "Choose audio file";

    return (
        <>
            <Helmet>
                <title>Audio Transcribe</title>
                <meta
                    name="description"
                    content="Upload supported audio and create a browser-based speech transcript with AudioMaster Lab. Transcript drafts and model progress can be saved locally across refreshes."
                />
                <link rel="canonical" href="https://audiomasterlab.com/transcribe" />
            </Helmet>

            <PageShell>
                <Stack spacing={{ xs: 3, md: 4 }}>
                    <Box>
                        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                            <Chip
                                icon={<SubtitlesRoundedIcon />}
                                label="Browser audio transcription"
                                sx={{
                                    color: "#dffaff",
                                    background: "rgba(103,232,249,0.12)",
                                    border: "1px solid rgba(103,232,249,0.24)",
                                    fontWeight: 850,
                                }}
                            />

                            <Chip
                                icon={<StorageRoundedIcon />}
                                label={modelReady ? "Model ready" : "Model cache supported"}
                                sx={{
                                    color: "#fff",
                                    background: "rgba(255,255,255,0.08)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    fontWeight: 850,
                                }}
                            />

                            {isMobile && (
                                <Chip
                                    icon={<PhoneIphoneRoundedIcon />}
                                    label="Mobile optimized"
                                    sx={{
                                        color: "#fff",
                                        background: "rgba(167,139,250,0.12)",
                                        border: "1px solid rgba(167,139,250,0.22)",
                                        fontWeight: 850,
                                    }}
                                />
                            )}
                        </Stack>

                        <Typography
                            variant="h1"
                            sx={{
                                fontWeight: 950,
                                letterSpacing: { xs: "-0.055em", md: "-0.075em" },
                                lineHeight: { xs: 1.02, md: 0.95 },
                                fontSize: { xs: "2.3rem", sm: "3.1rem", md: "4.8rem" },
                                maxWidth: 980,
                                mb: 2,
                            }}
                        >
                            Transcribe audio to text in the browser.
                        </Typography>

                        <Typography
                            variant={isMobile ? "body1" : "h6"}
                            sx={{
                                color: "rgba(255,255,255,0.68)",
                                lineHeight: 1.7,
                                maxWidth: 900,
                            }}
                        >
                            Upload a supported audio or video file, load the speech model,
                            and create a text transcript. Progress, settings, and transcript
                            drafts are saved locally so a refresh does not wipe your result.
                        </Typography>
                    </Box>

                    {(savedSummary.hasTranscriptDraft || savedSummary.savedFileMeta || savedSummary.savedProgress) && (
                        <Alert
                            severity="info"
                            sx={{
                                borderRadius: 4,
                                background: "rgba(103,232,249,0.09)",
                                color: "#e0f2fe",
                                border: "1px solid rgba(103,232,249,0.22)",
                                "& .MuiAlert-icon": { color: "#67e8f9" },
                            }}
                        >
                            Saved local progress found
                            {savedFileMeta?.name ? ` for ${savedFileMeta.name}` : ""}.
                            The transcript and settings can be restored, but browsers do
                            not let this page restore the original selected file after a
                            refresh. Re-select the file to transcribe again.
                        </Alert>
                    )}

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                lg: "0.86fr 1.14fr",
                            },
                            gap: { xs: 2.25, md: 3 },
                            alignItems: "start",
                        }}
                    >
                        <Stack spacing={{ xs: 2.25, md: 3 }}>
                            <GlassCard>
                                <Stack spacing={{ xs: 2, md: 2.4 }}>
                                    <Box>
                                        <Typography
                                            variant={isMobile ? "h6" : "h5"}
                                            sx={{ fontWeight: 950 }}
                                        >
                                            Upload audio
                                        </Typography>

                                        <Typography
                                            sx={{
                                                color: "rgba(255,255,255,0.62)",
                                                lineHeight: 1.65,
                                                mt: 0.7,
                                            }}
                                        >
                                            Clear voice recordings work best. Shorter files are
                                            safer on phones because transcription uses memory and CPU.
                                        </Typography>
                                    </Box>

                                    <Button
                                        component="label"
                                        variant="contained"
                                        size="large"
                                        fullWidth={isMobile}
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
                                        {uploadButtonText}
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
                                                    maxWidth: "100%",
                                                    color: "#fff",
                                                    background: "rgba(255,255,255,0.08)",
                                                    border: "1px solid rgba(255,255,255,0.08)",
                                                    fontWeight: 800,
                                                    "& .MuiChip-label": {
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    },
                                                }}
                                            />

                                            <Box
                                                component="audio"
                                                src={audioUrl}
                                                controls
                                                preload="metadata"
                                                onLoadedMetadata={(event) => {
                                                    const nextDuration =
                                                        event.currentTarget.duration;

                                                    if (Number.isFinite(nextDuration)) {
                                                        setDuration(nextDuration);
                                                        saveFileMeta(file, nextDuration);
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

                                    {!file && savedFileMeta?.name && (
                                        <Alert
                                            severity="info"
                                            sx={{
                                                borderRadius: 3,
                                                background: "rgba(255,255,255,0.06)",
                                                color: "#fff",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                            }}
                                        >
                                            Last file: {savedFileMeta.name} •{" "}
                                            {formatBytes(savedFileMeta.size)}
                                            {savedFileMeta.duration
                                                ? ` • ${formatTime(savedFileMeta.duration)}`
                                                : ""}
                                        </Alert>
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
                                            This audio is longer than 12 minutes. It may work,
                                            but slower phones can freeze or run out of memory.
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
                                        Stable mode: {MODEL_ID}, WASM runtime, fp32 encoder,
                                        fp32 decoder, and browser model cache enabled.
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
                                            ml: 0,
                                        }}
                                    />

                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        spacing={1}
                                    >
                                        <Button
                                            size="large"
                                            variant="contained"
                                            startIcon={<AutoAwesomeRoundedIcon />}
                                            fullWidth={isMobile}
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
                                            variant="outlined"
                                            startIcon={<RestartAltRoundedIcon />}
                                            fullWidth={isMobile}
                                            disabled={busy}
                                            onClick={clearSavedProgress}
                                            sx={{
                                                borderRadius: 999,
                                                color: "#fff",
                                                borderColor: "rgba(255,255,255,0.18)",
                                                fontWeight: 900,
                                            }}
                                        >
                                            Clear saved
                                        </Button>
                                    </Stack>

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
                                        Clear all
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
                                        position: { xs: "sticky", md: "static" },
                                        bottom: { xs: 12, md: "auto" },
                                        zIndex: { xs: 5, md: "auto" },
                                        backdropFilter: "blur(16px)",
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
                                        <Typography
                                            variant={isMobile ? "h6" : "h5"}
                                            sx={{ fontWeight: 950 }}
                                        >
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
                                            Drafts save locally as you type.
                                        </Typography>
                                    </Box>

                                    <Chip
                                        icon={transcript ? <SaveRoundedIcon /> : <GraphicEqRoundedIcon />}
                                        label={
                                            transcript
                                                ? `${wordCount} word${wordCount === 1 ? "" : "s"} saved`
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
                                    minRows={isMobile ? 10 : isTablet ? 14 : 18}
                                    fullWidth
                                    InputProps={{
                                        sx: {
                                            color: "#fff",
                                            borderRadius: 4,
                                            background: "rgba(255,255,255,0.08)",
                                            alignItems: "flex-start",
                                            fontSize: { xs: 14.5, md: 15 },
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
                                        fullWidth={isMobile}
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
                                        fullWidth={isMobile}
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
                                        fullWidth={isMobile}
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
                                                {chunks.slice(0, isMobile ? 6 : 12).map((chunk, index) => {
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

                                                {chunks.length > (isMobile ? 6 : 12) && (
                                                    <Typography
                                                        sx={{
                                                            color: "rgba(255,255,255,0.55)",
                                                            fontSize: 13,
                                                        }}
                                                    >
                                                        Showing first {isMobile ? 6 : 12} chunks.
                                                        Download SRT to save all timestamp chunks.
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