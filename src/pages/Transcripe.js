// src/pages/Transcripe.js

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    FormControlLabel,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    TextField,
    Typography,
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
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import ModelTrainingRoundedIcon from "@mui/icons-material/ModelTrainingRounded";
import DataObjectRoundedIcon from "@mui/icons-material/DataObjectRounded";
import VideoFileRoundedIcon from "@mui/icons-material/VideoFileRounded";
import AudiotrackRoundedIcon from "@mui/icons-material/AudiotrackRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import PlaylistAddRoundedIcon from "@mui/icons-material/PlaylistAddRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";

import { GlassCard, PageShell, StatusBanner } from "../components/Components.js";

let transformersModulePromise = null;

const MODEL_OPTIONS = [
    {
        id: "onnx-community/whisper-tiny.en",
        label: "Tiny English",
        short: "Tiny EN",
        description: "Fastest English-only model. Best for phones and quick drafts.",
        mobileSafe: true,
        multilingual: false,
        strength: 1,
    },
    {
        id: "onnx-community/whisper-base.en",
        label: "Base English",
        short: "Base EN",
        description: "Better English accuracy. Good default for most users.",
        mobileSafe: true,
        multilingual: false,
        strength: 2,
    },
    {
        id: "onnx-community/whisper-small.en",
        label: "Small English",
        short: "Small EN",
        description: "Stronger English accuracy. Slower and heavier on memory.",
        mobileSafe: false,
        multilingual: false,
        strength: 3,
    },
    {
        id: "onnx-community/whisper-tiny",
        label: "Tiny multilingual",
        short: "Tiny Multi",
        description: "Fast multilingual model for non-English audio or translation.",
        mobileSafe: true,
        multilingual: true,
        strength: 1,
    },
    {
        id: "onnx-community/whisper-base",
        label: "Base multilingual",
        short: "Base Multi",
        description: "Better multilingual accuracy. Heavier than Tiny.",
        mobileSafe: false,
        multilingual: true,
        strength: 2,
    },
    {
        id: "onnx-community/whisper-small",
        label: "Small multilingual",
        short: "Small Multi",
        description: "Strong multilingual accuracy. Best for desktop browsers.",
        mobileSafe: false,
        multilingual: true,
        strength: 3,
    },
];

const DEFAULT_MODEL_ID = "onnx-community/whisper-base.en";

const TRANSCRIBE_MODE_OPTIONS = [
    {
        value: "fast",
        label: "Fast",
        description: "Lower CPU use. Best for phones and quick drafts.",
    },
    {
        value: "balanced",
        label: "Balanced",
        description: "Good default for most audio.",
    },
    {
        value: "accurate",
        label: "Accurate",
        description: "More overlap and word timestamps. Slower but stronger.",
    },
];

const DEFAULT_TRANSCRIBE_MODE = "balanced";

const LANGUAGE_OPTIONS = [
    { value: "auto", label: "Auto detect" },
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
    { value: "nl", label: "Dutch" },
    { value: "ja", label: "Japanese" },
    { value: "ko", label: "Korean" },
    { value: "zh", label: "Chinese" },
    { value: "ar", label: "Arabic" },
    { value: "hi", label: "Hindi" },
];

const TASK_OPTIONS = [
    {
        value: "transcribe",
        label: "Transcribe",
        description: "Keep the detected speech language.",
    },
    {
        value: "translate",
        label: "Translate to English",
        description: "Translate supported non-English speech into English.",
    },
];

const SUPPORTED_MEDIA_EXTENSIONS = [
    ".mp3",
    ".wav",
    ".wave",
    ".m4a",
    ".mp4",
    ".m4v",
    ".mov",
    ".qt",
    ".ogg",
    ".oga",
    ".opus",
    ".webm",
    ".aac",
    ".caf",
    ".flac",
    ".aif",
    ".aiff",
    ".aifc",
    ".mpga",
    ".mpeg",
    ".3gp",
    ".3g2",
    ".amr",
];

const STREAMING_MANIFEST_EXTENSIONS = [".m3u8", ".mpd", ".ism", ".f4m"];

const ARCHIVE_AUDIO_EXTENSIONS = [
    ".mp3",
    ".m4a",
    ".wav",
    ".ogg",
    ".oga",
    ".opus",
    ".flac",
    ".aac",
    ".webm",
];

const ARCHIVE_SKIP_EXTENSIONS = [
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
    ".torrent",
    ".xml",
    ".sqlite",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".txt",
    ".pdf",
];

const MAX_FILE_SIZE_MB = 90;
const LONG_AUDIO_WARNING_SECONDS = 12 * 60;
const VERY_LONG_AUDIO_SECONDS = 30 * 60;
const COOKIE_MAX_AGE_DAYS = 30;
const MAX_COOKIE_VALUE_LENGTH = 3200;

const PROGRESS_COOKIE_NAME = "aml_transcribe_model_progress_v7";
const SETTINGS_COOKIE_NAME = "aml_transcribe_settings_v7";
const TRANSCRIPT_STORAGE_KEY = "aml_transcribe_transcript_draft_v7";
const CHUNKS_STORAGE_KEY = "aml_transcribe_chunks_draft_v7";
const FILE_META_STORAGE_KEY = "aml_transcribe_file_meta_v7";
const DIRECT_URL_STORAGE_KEY = "aml_transcribe_direct_url_v7";
const SESSION_STORAGE_KEY = "aml_transcribe_session_v7";

async function loadTransformers() {
    if (!transformersModulePromise) {
        transformersModulePromise = import("@huggingface/transformers");
    }

    const { env, pipeline } = await transformersModulePromise;

    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.useBrowserCache = true;

    try {
        if (env.backends?.onnx?.wasm) {
            env.backends.onnx.wasm.numThreads = Math.max(
                1,
                Math.min(4, navigator.hardwareConcurrency || 2)
            );
        }
    } catch {
        // Some Transformers.js versions do not expose ONNX WASM backend settings.
    }

    return { pipeline };
}

function canUseBrowserStorage() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function storageAvailable() {
    if (!canUseBrowserStorage()) return false;

    try {
        const key = "__aml_transcribe_storage_test__";
        window.localStorage.setItem(key, "1");
        window.localStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

function setCookieValue(name, value, maxAgeDays = COOKIE_MAX_AGE_DAYS) {
    if (typeof document === "undefined") return false;

    const encoded = encodeURIComponent(String(value || ""));

    if (!encoded || encoded.length > MAX_COOKIE_VALUE_LENGTH) {
        return false;
    }

    const maxAgeSeconds = Math.max(1, maxAgeDays) * 24 * 60 * 60;
    const secure =
        typeof window !== "undefined" && window.location?.protocol === "https:";

    document.cookie = `${encodeURIComponent(name)}=${encoded}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax${
        secure ? "; Secure" : ""
    }`;

    return true;
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
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function writeJsonCookie(name, value, maxAgeDays = COOKIE_MAX_AGE_DAYS) {
    try {
        const json = JSON.stringify(value || {});
        return setCookieValue(name, json, maxAgeDays);
    } catch {
        return false;
    }
}

function readLocalValue(key, fallback = "") {
    if (!storageAvailable()) return fallback;

    try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : raw;
    } catch {
        return fallback;
    }
}

function writeLocalValue(key, value) {
    if (!storageAvailable()) return false;

    try {
        window.localStorage.setItem(key, String(value || ""));
        return true;
    } catch {
        return false;
    }
}

function readLocalJson(key, fallback) {
    if (!storageAvailable()) return fallback;

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
    if (!storageAvailable()) return false;

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function deleteLocalValue(key) {
    if (!storageAvailable()) return false;

    try {
        window.localStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

function cleanText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
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

function formatVttTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const secs = Math.floor(safe % 60);
    const millis = Math.floor((safe % 1) * 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
    )}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function normalizeTimestampPair(chunk) {
    const timestamps = chunk?.timestamp || chunk?.timestamps || [];
    const start = Number(timestamps[0]);
    const end = Number(timestamps[1]);

    if (!Number.isFinite(start)) {
        return null;
    }

    return {
        start: Math.max(0, start),
        end: Number.isFinite(end) && end > start ? end : start + 2,
    };
}

function buildSrt(chunks) {
    if (!Array.isArray(chunks) || !chunks.length) return "";

    return chunks
        .map((chunk, index) => {
            const pair = normalizeTimestampPair(chunk);
            const text = cleanText(chunk?.text);

            if (!pair || !text) return null;

            return `${index + 1}
${formatSrtTime(pair.start)} --> ${formatSrtTime(pair.end)}
${text}`;
        })
        .filter(Boolean)
        .join("\n\n");
}

function buildVtt(chunks) {
    if (!Array.isArray(chunks) || !chunks.length) return "";

    const body = chunks
        .map((chunk) => {
            const pair = normalizeTimestampPair(chunk);
            const text = cleanText(chunk?.text);

            if (!pair || !text) return null;

            return `${formatVttTime(pair.start)} --> ${formatVttTime(pair.end)}
${text}`;
        })
        .filter(Boolean)
        .join("\n\n");

    return body ? `WEBVTT\n\n${body}` : "";
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

function getFileExtension(fileName) {
    const cleanName = String(fileName || "").split("?")[0].split("#")[0];
    const lastDot = cleanName.lastIndexOf(".");

    if (lastDot < 0) return "";

    return cleanName.slice(lastDot).toLowerCase();
}

function getUrlPathname(value) {
    try {
        return new URL(value).pathname || "";
    } catch {
        return String(value || "");
    }
}

function hasAnyExtension(value, extensions) {
    const lower = String(getUrlPathname(value) || value)
        .split("?")[0]
        .split("#")[0]
        .toLowerCase();

    return extensions.some((extension) => lower.endsWith(extension));
}

function isStreamingManifestUrl(urlValue) {
    return hasAnyExtension(urlValue, STREAMING_MANIFEST_EXTENSIONS);
}

function isLikelyMediaUrl(urlValue) {
    const lower = String(urlValue || "").toLowerCase();

    if (
        lower.startsWith("blob:") ||
        lower.startsWith("data:audio/") ||
        lower.startsWith("data:video/")
    ) {
        return true;
    }

    return hasAnyExtension(urlValue, SUPPORTED_MEDIA_EXTENSIONS);
}

function isLikelySupportedPickedFile(file) {
    if (!file) return false;

    const type = String(file.type || "").toLowerCase();

    if (type.startsWith("audio/") || type.startsWith("video/")) {
        return true;
    }

    return SUPPORTED_MEDIA_EXTENSIONS.includes(getFileExtension(file.name));
}

function isAppleMobileDevice() {
    if (typeof navigator === "undefined") return false;

    const platform = navigator.platform || "";
    const userAgent = navigator.userAgent || "";
    const touchCapableMac =
        platform === "MacIntel" &&
        typeof navigator.maxTouchPoints === "number" &&
        navigator.maxTouchPoints > 1;

    return /iPhone|iPad|iPod/i.test(userAgent) || touchCapableMac;
}

function isMissingScaleError(error) {
    const message = String(error?.message || error || "");

    return (
        message.includes("Missing required scale") ||
        message.includes("TransposeDQWeightsForMatMulNBits") ||
        message.includes("weight_merged_0_scale")
    );
}

function isEnglishOnlyLanguageTaskError(error) {
    const message = String(error?.message || error || "");

    return (
        message.includes("Cannot specify `task` or `language`") ||
        message.includes("English-only model") ||
        message.includes("is_multilingual=true")
    );
}

function isMemoryError(error) {
    const message = String(error?.message || error || "").toLowerCase();

    return (
        message.includes("out of memory") ||
        message.includes("allocation") ||
        message.includes("memory access out of bounds") ||
        message.includes("array buffer allocation failed")
    );
}

function makeFileNameFromUrl(urlValue) {
    try {
        const parsed = new URL(urlValue);
        const lastPart = parsed.pathname.split("/").filter(Boolean).pop();

        if (lastPart) {
            return decodeURIComponent(lastPart)
                .replace(/[^\w.\-() ]+/g, "-")
                .replace(/-+/g, "-")
                .slice(0, 160);
        }

        return parsed.hostname.replace(/[^\w.-]+/g, "-") || "remote-audio";
    } catch {
        return "remote-audio";
    }
}

function safeDecodeURIComponent(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function encodeArchivePath(path) {
    return String(path || "")
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/");
}

function buildArchiveServeUrl(identifier, fileName) {
    return `https://archive.org/serve/${encodeURIComponent(identifier)}/${encodeArchivePath(
        fileName
    )}`;
}

function buildArchiveDownloadUrl(identifier, fileName) {
    return `https://archive.org/download/${encodeURIComponent(
        identifier
    )}/${encodeArchivePath(fileName)}`;
}

function isArchiveAudioFile(name = "") {
    const lower = String(name || "").toLowerCase().split("?")[0].split("#")[0];
    return ARCHIVE_AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function isArchiveSkipFile(name = "") {
    const lower = String(name || "").toLowerCase().split("?")[0].split("#")[0];
    return ARCHIVE_SKIP_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function isArchiveHost(host = "") {
    const lower = String(host || "").toLowerCase();

    return (
        lower === "archive.org" ||
        lower === "www.archive.org" ||
        /^ia\d+\.us\.archive\.org$/.test(lower)
    );
}

function parseArchiveMediaTarget(rawUrl) {
    try {
        const url = new URL(rawUrl);
        const host = url.hostname.toLowerCase();

        if (!isArchiveHost(host)) {
            return null;
        }

        const parts = url.pathname
            .split("/")
            .filter(Boolean)
            .map(safeDecodeURIComponent);

        let identifier = "";
        let fileName = "";

        if (
            (host === "archive.org" || host === "www.archive.org") &&
            parts[0] === "details" &&
            parts[1]
        ) {
            return {
                type: "item",
                identifier: parts[1],
                originalUrl: rawUrl,
            };
        }

        if (
            (host === "archive.org" || host === "www.archive.org") &&
            (parts[0] === "download" || parts[0] === "serve") &&
            parts.length >= 2
        ) {
            identifier = parts[1];
            fileName = parts.slice(2).join("/");
        }

        if (/^ia\d+\.us\.archive\.org$/.test(host)) {
            const itemsIndex = parts.indexOf("items");

            if (itemsIndex >= 0 && parts.length >= itemsIndex + 2) {
                identifier = parts[itemsIndex + 1];
                fileName = parts.slice(itemsIndex + 2).join("/");
            }
        }

        if (!identifier) {
            return null;
        }

        if (fileName && isArchiveAudioFile(fileName) && !isArchiveSkipFile(fileName)) {
            return {
                type: "audio",
                identifier,
                fileName,
                originalUrl: rawUrl,
                serveUrl: buildArchiveServeUrl(identifier, fileName),
                downloadUrl: buildArchiveDownloadUrl(identifier, fileName),
            };
        }

        return {
            type: "item",
            identifier,
            originalUrl: rawUrl,
        };
    } catch {
        return null;
    }
}

async function fetchJson(url) {
    const response = await fetch(url, {
        method: "GET",
        headers: {
            Accept: "application/json",
        },
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Archive request failed with HTTP ${response.status}.`);
    }

    return response.json();
}

async function resolveArchiveItemToFirstPlayableUrl(identifier) {
    const metadata = await fetchJson(
        `https://archive.org/metadata/${encodeURIComponent(identifier)}`
    );

    const files = Array.isArray(metadata?.files) ? metadata.files : [];

    const playable = files.find((file) => {
        if (!file?.name) return false;
        if (!isArchiveAudioFile(file.name)) return false;
        if (isArchiveSkipFile(file.name)) return false;
        return true;
    });

    if (!playable?.name) {
        throw new Error(
            "This Archive item loaded, but no direct browser-playable audio file was found."
        );
    }

    return {
        url: buildArchiveServeUrl(identifier, playable.name),
        title: playable.name,
        itemTitle: metadata?.metadata?.title || identifier,
    };
}

async function resolveInputUrlToMediaUrl(value) {
    const clean = String(value || "").trim();

    if (!clean) {
        throw new Error("Paste a direct audio/video URL first.");
    }

    let parsed;

    try {
        parsed = new URL(clean);
    } catch {
        throw new Error("That is not a valid URL.");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Only http and https media links are supported.");
    }

    if (isStreamingManifestUrl(clean)) {
        throw new Error(
            "This looks like an HLS/DASH streaming manifest. Use a direct .mp3, .wav, .m4a, .mp4, .webm, .ogg, .aac, or .flac file URL."
        );
    }

    const archiveTarget = parseArchiveMediaTarget(clean);

    if (archiveTarget?.type === "audio") {
        return {
            url: archiveTarget.serveUrl,
            title: archiveTarget.fileName,
            provider: "Archive.org",
        };
    }

    if (archiveTarget?.type === "item") {
        const resolved = await resolveArchiveItemToFirstPlayableUrl(
            archiveTarget.identifier
        );

        return {
            url: resolved.url,
            title: resolved.title,
            provider: "Archive.org",
            itemTitle: resolved.itemTitle,
        };
    }

    return {
        url: clean,
        title: makeFileNameFromUrl(clean),
        provider: parsed.hostname,
    };
}

function contentTypeLooksMedia(contentType) {
    const lower = String(contentType || "").toLowerCase();

    return (
        lower.startsWith("audio/") ||
        lower.startsWith("video/") ||
        lower.includes("octet-stream") ||
        lower.includes("mpeg") ||
        lower.includes("mp4") ||
        lower.includes("ogg") ||
        lower.includes("webm") ||
        lower.includes("wav") ||
        lower.includes("flac")
    );
}

async function fetchRemoteMediaAsFile(urlValue, suggestedName = "") {
    const response = await fetch(urlValue, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Media fetch failed with HTTP ${response.status}.`);
    }

    const contentType =
        response.headers.get("content-type") || "application/octet-stream";

    if (contentType.toLowerCase().includes("text/html")) {
        throw new Error(
            "This URL returned an HTML page instead of raw audio/video. Use a direct media file URL."
        );
    }

    const blob = await response.blob();

    if (!blob.size) {
        throw new Error("The fetched media file was empty.");
    }

    if (!contentTypeLooksMedia(contentType) && !isLikelyMediaUrl(urlValue)) {
        throw new Error(
            `The URL did not look like browser-decodable media. Content-Type: ${contentType}.`
        );
    }

    const fileName = suggestedName || makeFileNameFromUrl(urlValue);

    try {
        return new File([blob], fileName, {
            type: contentType,
            lastModified: Date.now(),
        });
    } catch {
        blob.name = fileName;
        blob.lastModified = Date.now();
        return blob;
    }
}

function buildPickedFileWarning(file) {
    if (!file) return "";

    if (file.size === 0) {
        return "The selected file is empty. If this came from iCloud Drive, Google Drive, Dropbox, Proton Drive, or another cloud provider, open the file in that app first so it downloads locally, then select it again.";
    }

    if (!isLikelySupportedPickedFile(file)) {
        return "This file does not look like a common browser-decodable audio/video file. MP3, WAV, M4A, MP4, MOV, WebM, OGG/Opus, AAC, CAF, and FLAC usually work best.";
    }

    return "";
}

function getSelectedModel(modelId) {
    return MODEL_OPTIONS.find((model) => model.id === modelId) || MODEL_OPTIONS[0];
}

function modelSupportsLanguageTask(modelId) {
    const selected = getSelectedModel(modelId);
    return Boolean(selected.multilingual);
}

function getSelectedTranscribeMode(mode) {
    return (
        TRANSCRIBE_MODE_OPTIONS.find((option) => option.value === mode) ||
        TRANSCRIBE_MODE_OPTIONS.find((option) => option.value === DEFAULT_TRANSCRIBE_MODE) ||
        TRANSCRIBE_MODE_OPTIONS[0]
    );
}

function buildFriendlyTranscribeError(error) {
    if (isEnglishOnlyLanguageTaskError(error)) {
        return "The selected Whisper model is English-only, so it cannot receive language or translate options. Choose Tiny multilingual, Base multilingual, or Small multilingual if you need language selection or translation.";
    }

    if (isMissingScaleError(error)) {
        return "The browser loaded a broken cached quantized model. Clear this site's browser storage, restart the page, then retry. This page uses fp32 WASM to reduce that missing-scale error.";
    }

    if (isMemoryError(error)) {
        return "The browser ran out of memory while transcribing. Try Tiny/Base, Fast/Balanced mode, a shorter clip, fewer timestamps, or a desktop browser.";
    }

    const message = String(error?.message || "");

    if (message.toLowerCase().includes("failed to fetch")) {
        return "The browser could not fetch that media or model file. Check your connection, CORS permissions, or use a local upload.";
    }

    if (message.toLowerCase().includes("wasm")) {
        return "The browser WASM runtime failed. Try refreshing, clearing site storage, or switching to Chrome/Edge on desktop.";
    }

    return message || "Transcription failed. Try a shorter file, a different browser, or a WAV/MP3 file.";
}

function buildJsonExport({
                             transcript,
                             chunks,
                             file,
                             savedFileMeta,
                             modelId,
                             language,
                             task,
                             sourceKind,
                             directUrl,
                             duration,
                             transcribeMode,
                         }) {
    const supportsLanguageTask = modelSupportsLanguageTask(modelId);

    return JSON.stringify(
        {
            app: "AudioMaster Lab",
            page: "Transcripe",
            type: "transcript",
            model: {
                id: modelId,
                label: getSelectedModel(modelId).label,
                multilingual: supportsLanguageTask,
                language: supportsLanguageTask ? language : "english-only",
                task: supportsLanguageTask ? task : "transcribe",
                mode: transcribeMode,
            },
            source: {
                kind: sourceKind,
                name: file?.name || savedFileMeta?.name || "",
                size: file?.size || savedFileMeta?.size || 0,
                type: file?.type || savedFileMeta?.type || "",
                duration: duration || savedFileMeta?.duration || 0,
                directUrl: sourceKind === "url" ? directUrl : "",
            },
            stats: {
                words: getWordCount(transcript),
                characters: String(transcript || "").length,
                chunks: Array.isArray(chunks) ? chunks.length : 0,
            },
            transcript,
            chunks,
            exportedAt: new Date().toISOString(),
        },
        null,
        2
    );
}

function getSavedProgressSummary() {
    const savedProgress = readJsonCookie(PROGRESS_COOKIE_NAME, null);
    const savedSettings = readJsonCookie(SETTINGS_COOKIE_NAME, null);
    const savedFileMeta = readLocalJson(FILE_META_STORAGE_KEY, null);
    const savedSession = readLocalJson(SESSION_STORAGE_KEY, null);
    const savedDirectUrl = readLocalValue(DIRECT_URL_STORAGE_KEY, "");
    const savedTranscript = canUseBrowserStorage()
        ? window.localStorage.getItem(TRANSCRIPT_STORAGE_KEY) || ""
        : "";

    return {
        savedProgress,
        savedSettings,
        savedFileMeta,
        savedSession,
        savedDirectUrl,
        hasTranscriptDraft: Boolean(savedTranscript),
    };
}

function makeSessionSummary({
                                modelId,
                                language,
                                task,
                                withTimestamps,
                                sourceKind,
                                directUrl,
                                file,
                                duration,
                                transcript,
                                chunks,
                                transcribeMode,
                            }) {
    const supportsLanguageTask = modelSupportsLanguageTask(modelId);

    return {
        modelId,
        language: supportsLanguageTask ? language : "english-only",
        task: supportsLanguageTask ? task : "transcribe",
        transcribeMode,
        withTimestamps,
        sourceKind,
        directUrl: sourceKind === "url" ? directUrl : "",
        fileName: file?.name || "",
        fileSize: file?.size || 0,
        fileType: file?.type || "",
        duration: Number.isFinite(duration) ? duration : 0,
        wordCount: getWordCount(transcript),
        chunksCount: Array.isArray(chunks) ? chunks.length : 0,
        updatedAt: Date.now(),
    };
}

export default function Transcripe() {
    const isMobile = useMediaQuery("(max-width:700px)");
    const isTablet = useMediaQuery("(max-width:1100px)");
    const [searchParams, setSearchParams] = useSearchParams();

    const transcriberRef = useRef(null);
    const transcriberModelRef = useRef("");
    const objectUrlRef = useRef("");
    const routeLoadedRef = useRef(false);

    const [file, setFile] = useState(null);
    const [audioUrl, setAudioUrl] = useState("");
    const [duration, setDuration] = useState(0);

    const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
    const [language, setLanguage] = useState("auto");
    const [task, setTask] = useState("transcribe");
    const [withTimestamps, setWithTimestamps] = useState(false);
    const [transcribeMode, setTranscribeMode] = useState(DEFAULT_TRANSCRIBE_MODE);

    const [directUrl, setDirectUrl] = useState("");
    const [sourceKind, setSourceKind] = useState("file");
    const [dragActive, setDragActive] = useState(false);

    const [restoreLoaded, setRestoreLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [fetchingUrl, setFetchingUrl] = useState(false);
    const [modelReady, setModelReady] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState(
        "Upload an audio file, paste a direct media URL, or open an Archive.org audio link."
    );
    const [tone, setTone] = useState("info");

    const [transcript, setTranscript] = useState("");
    const [chunks, setChunks] = useState([]);
    const [savedFileMeta, setSavedFileMeta] = useState(null);

    const selectedModel = useMemo(() => getSelectedModel(modelId), [modelId]);
    const selectedMode = useMemo(
        () => getSelectedTranscribeMode(transcribeMode),
        [transcribeMode]
    );
    const selectedModelSupportsLanguageTask = selectedModel.multilingual;

    const fileTooLarge = file?.size > MAX_FILE_SIZE_MB * 1024 * 1024;
    const longAudioWarning = duration > LONG_AUDIO_WARNING_SECONDS;
    const veryLongAudioWarning = duration > VERY_LONG_AUDIO_SECONDS;
    const baseFileName = makeBaseName(file?.name || savedFileMeta?.name);
    const wordCount = getWordCount(transcript);

    const srtText = useMemo(() => buildSrt(chunks), [chunks]);
    const vttText = useMemo(() => buildVtt(chunks), [chunks]);

    const jsonText = useMemo(
        () =>
            buildJsonExport({
                transcript,
                chunks,
                file,
                savedFileMeta,
                modelId,
                language,
                task,
                sourceKind,
                directUrl,
                duration,
                transcribeMode,
            }),
        [
            transcript,
            chunks,
            file,
            savedFileMeta,
            modelId,
            language,
            task,
            sourceKind,
            directUrl,
            duration,
            transcribeMode,
        ]
    );

    const savedSummary = useMemo(() => getSavedProgressSummary(), [restoreLoaded]);

    useEffect(() => {
        const savedSettings = readJsonCookie(SETTINGS_COOKIE_NAME, {});
        const savedProgress = readJsonCookie(PROGRESS_COOKIE_NAME, {});
        const nextTranscript = canUseBrowserStorage()
            ? window.localStorage.getItem(TRANSCRIPT_STORAGE_KEY) || ""
            : "";
        const nextChunks = readLocalJson(CHUNKS_STORAGE_KEY, []);
        const nextFileMeta = readLocalJson(FILE_META_STORAGE_KEY, null);
        const nextSession = readLocalJson(SESSION_STORAGE_KEY, null);
        const nextDirectUrl = readLocalValue(DIRECT_URL_STORAGE_KEY, "");

        if (savedSettings.modelId) {
            setModelId(savedSettings.modelId);
        } else if (nextSession?.modelId) {
            setModelId(nextSession.modelId);
        }

        if (savedSettings.language) {
            setLanguage(savedSettings.language);
        } else if (nextSession?.language && nextSession.language !== "english-only") {
            setLanguage(nextSession.language);
        }

        if (savedSettings.task) {
            setTask(savedSettings.task);
        } else if (nextSession?.task) {
            setTask(nextSession.task);
        }

        if (savedSettings.transcribeMode) {
            setTranscribeMode(savedSettings.transcribeMode);
        } else if (nextSession?.transcribeMode) {
            setTranscribeMode(nextSession.transcribeMode);
        }

        if (typeof savedSettings.withTimestamps === "boolean") {
            setWithTimestamps(savedSettings.withTimestamps);
        } else if (typeof nextSession?.withTimestamps === "boolean") {
            setWithTimestamps(nextSession.withTimestamps);
        }

        if (nextDirectUrl) {
            setDirectUrl(nextDirectUrl);
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
        if (!restoreLoaded) return;

        writeJsonCookie(SETTINGS_COOKIE_NAME, {
            modelId,
            language,
            task,
            transcribeMode,
            withTimestamps,
            updatedAt: Date.now(),
        });
    }, [restoreLoaded, modelId, language, task, transcribeMode, withTimestamps]);

    useEffect(() => {
        if (!restoreLoaded) return;

        writeJsonCookie(PROGRESS_COOKIE_NAME, {
            modelId,
            transcribeMode,
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
    }, [
        restoreLoaded,
        modelId,
        transcribeMode,
        progress,
        status,
        tone,
        modelReady,
        busy,
        transcript,
        wordCount,
        chunks.length,
    ]);

    useEffect(() => {
        if (!restoreLoaded) return;

        if (transcript) {
            writeLocalValue(TRANSCRIPT_STORAGE_KEY, transcript);
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

    useEffect(() => {
        if (!restoreLoaded) return;

        if (sourceKind === "url" && directUrl) {
            writeLocalValue(DIRECT_URL_STORAGE_KEY, directUrl);
        }

        writeLocalJson(
            SESSION_STORAGE_KEY,
            makeSessionSummary({
                modelId,
                language,
                task,
                transcribeMode,
                withTimestamps,
                sourceKind,
                directUrl,
                file,
                duration,
                transcript,
                chunks,
            })
        );
    }, [
        restoreLoaded,
        modelId,
        language,
        task,
        transcribeMode,
        withTimestamps,
        sourceKind,
        directUrl,
        file,
        duration,
        transcript,
        chunks,
    ]);

    useEffect(() => {
        if (!restoreLoaded || routeLoadedRef.current) return;

        const routeUrl = searchParams.get("url");

        if (!routeUrl) return;

        routeLoadedRef.current = true;
        setDirectUrl(routeUrl);
        loadDirectUrlAsFile(routeUrl);
        setSearchParams({}, { replace: true });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restoreLoaded, searchParams, setSearchParams]);

    function resetOutputOnly() {
        setTranscript("");
        setChunks([]);
        setProgress(0);
        deleteLocalValue(TRANSCRIPT_STORAGE_KEY);
        deleteLocalValue(CHUNKS_STORAGE_KEY);
    }

    function saveFileMeta(
        nextFile,
        nextDuration = duration,
        sourceKindOverride = sourceKind,
        directUrlOverride = directUrl
    ) {
        if (!nextFile) return;

        const meta = {
            name: nextFile.name,
            size: nextFile.size,
            type: nextFile.type,
            lastModified: nextFile.lastModified,
            duration: Number.isFinite(nextDuration) ? nextDuration : 0,
            sourceKind: sourceKindOverride,
            directUrl: sourceKindOverride === "url" ? directUrlOverride : "",
            updatedAt: Date.now(),
        };

        setSavedFileMeta(meta);
        writeLocalJson(FILE_META_STORAGE_KEY, meta);
    }

    function revokeCurrentObjectUrl() {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
        }

        objectUrlRef.current = "";
    }

    function handleFileSelect(nextFile, nextSourceKind = "file", nextDirectUrl = "") {
        if (!nextFile) return;

        revokeCurrentObjectUrl();

        const nextUrl = URL.createObjectURL(nextFile);

        objectUrlRef.current = nextUrl;

        setFile(nextFile);
        setAudioUrl(nextUrl);
        setDuration(0);
        setSourceKind(nextSourceKind);
        setDirectUrl(nextSourceKind === "url" ? nextDirectUrl : "");

        resetOutputOnly();

        const warning = buildPickedFileWarning(nextFile);

        if (nextSourceKind === "file") {
            writeLocalValue(DIRECT_URL_STORAGE_KEY, "");
        }

        saveFileMeta(nextFile, 0, nextSourceKind, nextDirectUrl);

        if (nextFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            setTone("error");
            setStatus(
                `This file is ${formatBytes(
                    nextFile.size
                )}. For browser transcription, keep files under ${MAX_FILE_SIZE_MB} MB.`
            );
            return;
        }

        if (warning) {
            setTone("warning");
            setStatus(warning);
            return;
        }

        setTone("info");
        setStatus(
            nextSourceKind === "url"
                ? "Direct media URL loaded. Press Transcribe Audio."
                : "Audio loaded. Press Transcribe Audio to convert it to text."
        );
    }

    async function loadDirectUrlAsFile(urlValue) {
        if (!urlValue || fetchingUrl || busy) return;

        setFetchingUrl(true);
        setTone("info");
        setStatus("Resolving media link...");
        setProgress(3);

        try {
            const resolved = await resolveInputUrlToMediaUrl(urlValue);

            setStatus(
                resolved.provider === "Archive.org"
                    ? "Archive.org audio resolved. Fetching playable media..."
                    : "Fetching direct media..."
            );
            setProgress(8);

            const remoteFile = await fetchRemoteMediaAsFile(
                resolved.url,
                resolved.title
            );

            setProgress(0);
            setTone("info");

            setDirectUrl(resolved.url);
            writeLocalValue(DIRECT_URL_STORAGE_KEY, resolved.url);

            handleFileSelect(remoteFile, "url", resolved.url);

            setStatus(
                resolved.itemTitle
                    ? `Loaded ${resolved.itemTitle}. Press Transcribe Audio.`
                    : "Direct media loaded. Press Transcribe Audio."
            );
        } catch (error) {
            setTone("error");
            setStatus(
                error?.message ||
                "Could not load this direct URL. The host may block browser CORS."
            );
            setProgress(0);
        } finally {
            setFetchingUrl(false);
        }
    }

    function handleDirectUrlLoad() {
        loadDirectUrlAsFile(directUrl);
    }

    function clearSavedProgress() {
        deleteCookieValue(PROGRESS_COOKIE_NAME);
        deleteCookieValue(SETTINGS_COOKIE_NAME);
        deleteLocalValue(TRANSCRIPT_STORAGE_KEY);
        deleteLocalValue(CHUNKS_STORAGE_KEY);
        deleteLocalValue(FILE_META_STORAGE_KEY);
        deleteLocalValue(SESSION_STORAGE_KEY);
        deleteLocalValue(DIRECT_URL_STORAGE_KEY);

        setSavedFileMeta(null);
        setTranscript("");
        setChunks([]);
        setProgress(0);
        setModelReady(false);
        setTone("info");
        setStatus("Saved transcript, settings, and model progress were cleared.");
    }

    function clearAll() {
        revokeCurrentObjectUrl();

        transcriberRef.current = null;
        transcriberModelRef.current = "";

        setFile(null);
        setAudioUrl("");
        setDuration(0);
        setTranscript("");
        setChunks([]);
        setProgress(0);
        setBusy(false);
        setFetchingUrl(false);
        setModelReady(false);
        setDirectUrl("");
        setSourceKind("file");
        setTone("info");

        clearSavedProgress();

        setStatus(
            "Upload an audio file, paste a direct media URL, or open an Archive.org audio link."
        );
    }

    async function getTranscriber() {
        if (
            transcriberRef.current &&
            transcriberModelRef.current === modelId
        ) {
            setModelReady(true);
            return transcriberRef.current;
        }

        transcriberRef.current = null;
        transcriberModelRef.current = "";

        setModelReady(false);
        setProgress(2);
        setStatus(
            `Loading ${modelId}. Stronger models are more accurate but can take longer to download and run.`
        );

        const { pipeline } = await loadTransformers();

        const instance = await pipeline("automatic-speech-recognition", modelId, {
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
        transcriberModelRef.current = modelId;
        setModelReady(true);
        setProgress((previous) => Math.max(previous, 95));
        setStatus("Model ready. Starting transcription.");

        return instance;
    }

    function buildTranscriptionOptions() {
        const modeSettings = {
            fast: {
                chunkLength: isMobile ? 15 : 20,
                strideLength: isMobile ? 3 : 4,
                timestampValue: withTimestamps ? true : false,
            },
            balanced: {
                chunkLength: isMobile ? 20 : 30,
                strideLength: isMobile ? 4 : 5,
                timestampValue: withTimestamps ? true : false,
            },
            accurate: {
                chunkLength: isMobile ? 25 : 30,
                strideLength: isMobile ? 6 : 8,
                timestampValue: withTimestamps ? "word" : false,
            },
        };

        const selected = modeSettings[transcribeMode] || modeSettings.balanced;

        const options = {
            chunk_length_s: selected.chunkLength,
            stride_length_s: selected.strideLength,
        };

        if (modelSupportsLanguageTask(modelId)) {
            options.task = task;

            if (language !== "auto") {
                options.language = language;
            }
        }

        if (selected.timestampValue) {
            options.return_timestamps = selected.timestampValue;
        }

        return options;
    }

    async function handleTranscribe() {
        if (!audioUrl || !file) {
            setTone("error");
            setStatus(
                "Upload a file or load a direct media URL first. A selected local file cannot be restored after a page refresh."
            );
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

            setStatus(
                `${selectedMode.label} mode active. Transcribing audio. Keep this tab open until the result appears.`
            );
            setProgress((previous) => Math.max(previous, 25));

            const options = buildTranscriptionOptions();
            const result = await transcriber(audioUrl, options);

            const nextText = cleanText(result?.text);
            const nextChunks = Array.isArray(result?.chunks) ? result.chunks : [];

            setTranscript(nextText);
            setChunks(nextChunks);
            setProgress(100);

            if (nextText) {
                setTone("info");
                setStatus(
                    `Done. ${getWordCount(
                        nextText
                    )} words generated with ${selectedModel.label} in ${selectedMode.label} mode.`
                );
            } else {
                setTone("error");
                setStatus(
                    "Finished, but no clear speech was detected. Try cleaner speech, a stronger model, Accurate mode, a shorter file, or less background noise."
                );
            }
        } catch (error) {
            console.error(error);

            transcriberRef.current = null;
            transcriberModelRef.current = "";
            setModelReady(false);
            setTone("error");
            setStatus(buildFriendlyTranscribeError(error));
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

    function copyDirectUrl() {
        const value = sourceKind === "url" ? directUrl : audioUrl;

        if (!value) return;

        navigator.clipboard
            .writeText(value)
            .then(() => {
                setTone("info");
                setStatus("Media link copied.");
            })
            .catch(() => {
                setTone("error");
                setStatus("Could not copy media link in this browser.");
            });
    }

    function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        setDragActive(false);

        if (busy || fetchingUrl) return;

        const nextFile = event.dataTransfer?.files?.[0];

        if (nextFile) {
            setSourceKind("file");
            setDirectUrl("");
            handleFileSelect(nextFile, "file", "");
        }
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!busy && !fetchingUrl) {
            setDragActive(true);
        }
    }

    function handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();

        setDragActive(false);
    }

    function changeModel(nextModelId) {
        setModelId(nextModelId);
        transcriberRef.current = null;
        transcriberModelRef.current = "";
        setModelReady(false);
        resetOutputOnly();

        const nextModel = getSelectedModel(nextModelId);

        if (!nextModel.multilingual) {
            setLanguage("auto");
            setTask("transcribe");
        }

        setTone(nextModel.mobileSafe ? "info" : "warning");
        setStatus(
            nextModel.mobileSafe
                ? `${nextModel.label} selected. Model will load when you transcribe.`
                : `${nextModel.label} selected. This is stronger but heavier. Use desktop for best stability.`
        );
    }

    function changeTranscribeMode(nextMode) {
        setTranscribeMode(nextMode);
        resetOutputOnly();

        const mode = getSelectedTranscribeMode(nextMode);

        setTone("info");
        setStatus(`${mode.label} mode selected. ${mode.description}`);
    }

    const uploadButtonText = isMobile ? "Choose file" : "Choose audio/video file";
    const actionBusy = busy || fetchingUrl;
    const hasSavedProgress =
        savedSummary.hasTranscriptDraft ||
        savedSummary.savedFileMeta ||
        savedSummary.savedProgress ||
        savedSummary.savedDirectUrl;

    return (
        <>
            <Helmet>
                <title>Audio Transcribe | AudioMaster Lab</title>
                <meta
                    name="description"
                    content="Upload audio, load direct Archive.org media links, choose stronger Whisper models, and create browser-based transcripts. Export TXT, SRT, VTT, and JSON."
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

                            <Chip
                                icon={<ModelTrainingRoundedIcon />}
                                label={selectedModel.short}
                                sx={{
                                    color: "#fff",
                                    background: selectedModel.mobileSafe
                                        ? "rgba(34,197,94,0.12)"
                                        : "rgba(251,191,36,0.12)",
                                    border: selectedModel.mobileSafe
                                        ? "1px solid rgba(34,197,94,0.22)"
                                        : "1px solid rgba(251,191,36,0.24)",
                                    fontWeight: 850,
                                }}
                            />

                            <Chip
                                icon={<PsychologyRoundedIcon />}
                                label={`${selectedMode.label} mode`}
                                sx={{
                                    color: "#fff",
                                    background:
                                        transcribeMode === "accurate"
                                            ? "rgba(167,139,250,0.14)"
                                            : "rgba(255,255,255,0.08)",
                                    border:
                                        transcribeMode === "accurate"
                                            ? "1px solid rgba(167,139,250,0.28)"
                                            : "1px solid rgba(255,255,255,0.1)",
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
                                maxWidth: 1080,
                                mb: 2,
                            }}
                        >
                            Transcribe with stronger Whisper models.
                        </Typography>

                        <Typography
                            variant={isMobile ? "body1" : "h6"}
                            sx={{
                                color: "rgba(255,255,255,0.68)",
                                lineHeight: 1.7,
                                maxWidth: 960,
                            }}
                        >
                            Upload a local file, drag and drop audio, or paste a direct
                            media URL. Choose Fast, Balanced, or Accurate mode, then pick
                            Tiny, Base, or Small Whisper models depending on speed and
                            accuracy needs.
                        </Typography>
                    </Box>

                    {hasSavedProgress && (
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
                            Transcript drafts, settings, timestamps, model choice, mode,
                            and the last direct URL can restore. Browsers cannot restore
                            the original selected local file after refresh, so re-select it
                            to transcribe again.
                        </Alert>
                    )}

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                lg: "0.88fr 1.12fr",
                            },
                            gap: { xs: 2.25, md: 3 },
                            alignItems: "start",
                        }}
                    >
                        <Stack spacing={{ xs: 2.25, md: 3 }}>
                            <GlassCard>
                                <Box
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    sx={{
                                        p: dragActive ? 1.25 : 0,
                                        borderRadius: 4,
                                        outline: dragActive
                                            ? "2px dashed rgba(103,232,249,0.8)"
                                            : "none",
                                        background: dragActive
                                            ? "rgba(103,232,249,0.08)"
                                            : "transparent",
                                        transition: "all 180ms ease",
                                    }}
                                >
                                    <Stack spacing={{ xs: 2, md: 2.4 }}>
                                        <Box>
                                            <Stack
                                                direction="row"
                                                spacing={1}
                                                alignItems="center"
                                                sx={{ mb: 0.7 }}
                                            >
                                                <LibraryMusicRoundedIcon
                                                    sx={{ color: "#67e8f9" }}
                                                />
                                                <Typography
                                                    variant={isMobile ? "h6" : "h5"}
                                                    sx={{ fontWeight: 950 }}
                                                >
                                                    Input source
                                                </Typography>
                                            </Stack>

                                            <Typography
                                                sx={{
                                                    color: "rgba(255,255,255,0.62)",
                                                    lineHeight: 1.65,
                                                }}
                                            >
                                                Clean speech close to the mic gives the
                                                best results. Stronger models help, but bad
                                                audio is still harder to transcribe.
                                            </Typography>
                                        </Box>

                                        <Button
                                            component="label"
                                            variant="contained"
                                            size="large"
                                            fullWidth={isMobile}
                                            startIcon={<CloudUploadRoundedIcon />}
                                            disabled={actionBusy}
                                            sx={{
                                                borderRadius: 999,
                                                py: 1.55,
                                                fontWeight: 950,
                                                color: "#06111e",
                                                background:
                                                    "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                boxShadow:
                                                    "0 18px 46px rgba(103,232,249,0.2)",
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
                                                accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.oga,.opus,.webm,.mp4,.mov,.aac,.flac,.aif,.aiff,.caf"
                                                onChange={(event) => {
                                                    const nextFile =
                                                        event.target.files?.[0];

                                                    if (nextFile) {
                                                        setDirectUrl("");
                                                        handleFileSelect(
                                                            nextFile,
                                                            "file",
                                                            ""
                                                        );
                                                    }

                                                    event.target.value = "";
                                                }}
                                            />
                                        </Button>

                                        <Alert
                                            severity={dragActive ? "success" : "info"}
                                            sx={{
                                                borderRadius: 3,
                                                background: dragActive
                                                    ? "rgba(34,197,94,0.1)"
                                                    : "rgba(255,255,255,0.055)",
                                                color: "#fff",
                                                border: dragActive
                                                    ? "1px solid rgba(34,197,94,0.24)"
                                                    : "1px solid rgba(255,255,255,0.1)",
                                            }}
                                        >
                                            Drag and drop an audio/video file here, or choose
                                            a file from your device.
                                        </Alert>

                                        <Divider
                                            sx={{ borderColor: "rgba(255,255,255,0.1)" }}
                                        />

                                        <Stack spacing={1}>
                                            <Stack
                                                direction="row"
                                                spacing={1}
                                                alignItems="center"
                                            >
                                                <LinkRoundedIcon
                                                    sx={{ color: "#a78bfa" }}
                                                />
                                                <Typography
                                                    sx={{
                                                        fontWeight: 900,
                                                        color: "rgba(255,255,255,0.82)",
                                                    }}
                                                >
                                                    Load direct URL or Archive.org link
                                                </Typography>
                                            </Stack>

                                            <Stack
                                                direction={{ xs: "column", sm: "row" }}
                                                spacing={1}
                                            >
                                                <TextField
                                                    value={directUrl}
                                                    disabled={actionBusy}
                                                    onChange={(event) =>
                                                        setDirectUrl(event.target.value)
                                                    }
                                                    placeholder="https://archive.org/serve/item/file.mp3"
                                                    fullWidth
                                                    size="small"
                                                    InputProps={{
                                                        sx: {
                                                            color: "#fff",
                                                            borderRadius: 999,
                                                            background:
                                                                "rgba(255,255,255,0.08)",
                                                        },
                                                    }}
                                                />

                                                <Button
                                                    variant="outlined"
                                                    startIcon={
                                                        fetchingUrl ? (
                                                            <GraphicEqRoundedIcon />
                                                        ) : (
                                                            <LinkRoundedIcon />
                                                        )
                                                    }
                                                    disabled={
                                                        actionBusy || !directUrl.trim()
                                                    }
                                                    onClick={handleDirectUrlLoad}
                                                    sx={{
                                                        borderRadius: 999,
                                                        color: "#fff",
                                                        borderColor:
                                                            "rgba(255,255,255,0.18)",
                                                        fontWeight: 900,
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {fetchingUrl ? "Loading..." : "Load URL"}
                                                </Button>
                                            </Stack>

                                            <Typography
                                                sx={{
                                                    color: "rgba(255,255,255,0.5)",
                                                    fontSize: 13,
                                                    lineHeight: 1.55,
                                                }}
                                            >
                                                Supports direct files like MP3, WAV, M4A,
                                                OGG, WebM, MP4, MOV, AAC, FLAC, and
                                                Archive.org details/download/serve links.
                                            </Typography>
                                        </Stack>

                                        {file && (
                                            <Stack spacing={1.4}>
                                                <Stack
                                                    direction="row"
                                                    flexWrap="wrap"
                                                    gap={1}
                                                >
                                                    <Chip
                                                        icon={
                                                            sourceKind === "url" ? (
                                                                <LinkRoundedIcon />
                                                            ) : (
                                                                <AudiotrackRoundedIcon />
                                                            )
                                                        }
                                                        label={`${
                                                            sourceKind === "url"
                                                                ? "Remote"
                                                                : "Local"
                                                        } source`}
                                                        sx={{
                                                            color: "#fff",
                                                            background:
                                                                "rgba(255,255,255,0.08)",
                                                            border:
                                                                "1px solid rgba(255,255,255,0.08)",
                                                            fontWeight: 850,
                                                        }}
                                                    />

                                                    <Chip
                                                        icon={<VideoFileRoundedIcon />}
                                                        label={`${file.name} • ${formatBytes(
                                                            file.size
                                                        )}${
                                                            duration
                                                                ? ` • ${formatTime(
                                                                    duration
                                                                )}`
                                                                : ""
                                                        }`}
                                                        sx={{
                                                            justifyContent: "flex-start",
                                                            maxWidth: "100%",
                                                            color: "#fff",
                                                            background:
                                                                "rgba(255,255,255,0.08)",
                                                            border:
                                                                "1px solid rgba(255,255,255,0.08)",
                                                            fontWeight: 800,
                                                            "& .MuiChip-label": {
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                            },
                                                        }}
                                                    />
                                                </Stack>

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
                                                            saveFileMeta(
                                                                file,
                                                                nextDuration,
                                                                sourceKind,
                                                                directUrl
                                                            );
                                                        }
                                                    }}
                                                    sx={{
                                                        width: "100%",
                                                        filter:
                                                            "drop-shadow(0 12px 28px rgba(0,0,0,0.25))",
                                                    }}
                                                />

                                                {sourceKind === "url" && directUrl && (
                                                    <Button
                                                        variant="text"
                                                        size="small"
                                                        startIcon={
                                                            <ContentCopyRoundedIcon />
                                                        }
                                                        onClick={copyDirectUrl}
                                                        sx={{
                                                            alignSelf: "flex-start",
                                                            color: "rgba(255,255,255,0.72)",
                                                            fontWeight: 850,
                                                        }}
                                                    >
                                                        Copy loaded media URL
                                                    </Button>
                                                )}
                                            </Stack>
                                        )}

                                        {!file && savedFileMeta?.name && (
                                            <Alert
                                                severity="info"
                                                sx={{
                                                    borderRadius: 3,
                                                    background: "rgba(255,255,255,0.06)",
                                                    color: "#fff",
                                                    border:
                                                        "1px solid rgba(255,255,255,0.1)",
                                                }}
                                            >
                                                Last file: {savedFileMeta.name} •{" "}
                                                {formatBytes(savedFileMeta.size)}
                                                {savedFileMeta.duration
                                                    ? ` • ${formatTime(
                                                        savedFileMeta.duration
                                                    )}`
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
                                                    border:
                                                        "1px solid rgba(248,113,113,0.24)",
                                                    "& .MuiAlert-icon": {
                                                        color: "#fb7185",
                                                    },
                                                }}
                                            >
                                                This file is too large for safe browser
                                                transcription. Keep uploads under{" "}
                                                {MAX_FILE_SIZE_MB} MB.
                                            </Alert>
                                        )}

                                        {veryLongAudioWarning && !fileTooLarge && (
                                            <Alert
                                                severity="warning"
                                                icon={<WarningAmberRoundedIcon />}
                                                sx={{
                                                    borderRadius: 3,
                                                    background: "rgba(251,191,36,0.1)",
                                                    color: "#fff",
                                                    border:
                                                        "1px solid rgba(251,191,36,0.24)",
                                                    "& .MuiAlert-icon": {
                                                        color: "#fbbf24",
                                                    },
                                                }}
                                            >
                                                This audio is longer than 30 minutes. For
                                                browser transcription, split long files into
                                                smaller parts for better stability.
                                            </Alert>
                                        )}

                                        {longAudioWarning &&
                                            !veryLongAudioWarning &&
                                            !fileTooLarge && (
                                                <Alert
                                                    severity="warning"
                                                    icon={<WarningAmberRoundedIcon />}
                                                    sx={{
                                                        borderRadius: 3,
                                                        background:
                                                            "rgba(251,191,36,0.1)",
                                                        color: "#fff",
                                                        border:
                                                            "1px solid rgba(251,191,36,0.24)",
                                                        "& .MuiAlert-icon": {
                                                            color: "#fbbf24",
                                                        },
                                                    }}
                                                >
                                                    This audio is longer than 12 minutes.
                                                    It may work, but slower phones can
                                                    freeze or run out of memory.
                                                </Alert>
                                            )}

                                        <Divider
                                            sx={{ borderColor: "rgba(255,255,255,0.1)" }}
                                        />

                                        <Alert
                                            severity="info"
                                            sx={{
                                                borderRadius: 3,
                                                background: "rgba(103,232,249,0.08)",
                                                color: "#dffaff",
                                                border:
                                                    "1px solid rgba(103,232,249,0.16)",
                                                "& .MuiAlert-icon": {
                                                    color: "#67e8f9",
                                                },
                                            }}
                                        >
                                            Stable mode: {modelId}, {selectedMode.label} mode,
                                            WASM runtime, fp32 encoder, fp32 decoder, and browser
                                            model cache enabled.
                                        </Alert>

                                        {isAppleMobileDevice() && (
                                            <Alert
                                                severity="info"
                                                sx={{
                                                    borderRadius: 3,
                                                    background:
                                                        "rgba(167,139,250,0.09)",
                                                    color: "#fff",
                                                    border:
                                                        "1px solid rgba(167,139,250,0.2)",
                                                }}
                                            >
                                                On iPhone/iPad, keep this tab open while
                                                transcribing. iOS may pause heavy browser
                                                work when the screen locks or the tab is
                                                backgrounded.
                                            </Alert>
                                        )}

                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={withTimestamps}
                                                    disabled={actionBusy}
                                                    onChange={(event) => {
                                                        setWithTimestamps(
                                                            event.target.checked
                                                        );
                                                        resetOutputOnly();
                                                    }}
                                                />
                                            }
                                            label="Create timestamps for SRT / VTT export"
                                            sx={{
                                                color: "rgba(255,255,255,0.78)",
                                                fontWeight: 800,
                                                ml: 0,
                                            }}
                                        />

                                        <Divider
                                            sx={{ borderColor: "rgba(255,255,255,0.1)" }}
                                        />

                                        <Stack spacing={1.5}>
                                            <Typography sx={{ fontWeight: 950 }}>
                                                Advanced transcription controls
                                            </Typography>

                                            <FormControl fullWidth size="small">
                                                <InputLabel
                                                    sx={{
                                                        color: "rgba(255,255,255,0.7)",
                                                    }}
                                                >
                                                    Model strength
                                                </InputLabel>
                                                <Select
                                                    value={modelId}
                                                    label="Model strength"
                                                    disabled={actionBusy}
                                                    onChange={(event) =>
                                                        changeModel(event.target.value)
                                                    }
                                                    sx={{
                                                        color: "#fff",
                                                        borderRadius: 3,
                                                        background:
                                                            "rgba(255,255,255,0.07)",
                                                    }}
                                                >
                                                    {MODEL_OPTIONS.map((option) => (
                                                        <MenuItem
                                                            key={option.id}
                                                            value={option.id}
                                                        >
                                                            {option.label} —{" "}
                                                            {option.description}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>

                                            <FormControl fullWidth size="small">
                                                <InputLabel
                                                    sx={{
                                                        color: "rgba(255,255,255,0.7)",
                                                    }}
                                                >
                                                    Transcription mode
                                                </InputLabel>
                                                <Select
                                                    value={transcribeMode}
                                                    label="Transcription mode"
                                                    disabled={actionBusy}
                                                    onChange={(event) =>
                                                        changeTranscribeMode(
                                                            event.target.value
                                                        )
                                                    }
                                                    sx={{
                                                        color: "#fff",
                                                        borderRadius: 3,
                                                        background:
                                                            "rgba(255,255,255,0.07)",
                                                    }}
                                                >
                                                    {TRANSCRIBE_MODE_OPTIONS.map((option) => (
                                                        <MenuItem
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label} —{" "}
                                                            {option.description}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>

                                            <FormControl fullWidth size="small">
                                                <InputLabel
                                                    sx={{
                                                        color: "rgba(255,255,255,0.7)",
                                                    }}
                                                >
                                                    Language
                                                </InputLabel>
                                                <Select
                                                    value={language}
                                                    label="Language"
                                                    disabled={
                                                        actionBusy ||
                                                        !selectedModelSupportsLanguageTask
                                                    }
                                                    onChange={(event) => {
                                                        setLanguage(event.target.value);
                                                        resetOutputOnly();
                                                    }}
                                                    sx={{
                                                        color: "#fff",
                                                        borderRadius: 3,
                                                        background:
                                                            "rgba(255,255,255,0.07)",
                                                    }}
                                                >
                                                    {LANGUAGE_OPTIONS.map((option) => (
                                                        <MenuItem
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>

                                            <FormControl fullWidth size="small">
                                                <InputLabel
                                                    sx={{
                                                        color: "rgba(255,255,255,0.7)",
                                                    }}
                                                >
                                                    Task
                                                </InputLabel>
                                                <Select
                                                    value={task}
                                                    label="Task"
                                                    disabled={
                                                        actionBusy ||
                                                        !selectedModelSupportsLanguageTask
                                                    }
                                                    onChange={(event) => {
                                                        setTask(event.target.value);
                                                        resetOutputOnly();
                                                    }}
                                                    sx={{
                                                        color: "#fff",
                                                        borderRadius: 3,
                                                        background:
                                                            "rgba(255,255,255,0.07)",
                                                    }}
                                                >
                                                    {TASK_OPTIONS.map((option) => (
                                                        <MenuItem
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label} —{" "}
                                                            {option.description}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>

                                            {!selectedModelSupportsLanguageTask && (
                                                <Alert
                                                    severity="info"
                                                    sx={{
                                                        borderRadius: 3,
                                                        background:
                                                            "rgba(103,232,249,0.08)",
                                                        color: "#dffaff",
                                                        border:
                                                            "1px solid rgba(103,232,249,0.16)",
                                                        "& .MuiAlert-icon": {
                                                            color: "#67e8f9",
                                                        },
                                                    }}
                                                >
                                                    English-only model selected. Language
                                                    and translate controls are disabled.
                                                    Choose Tiny multilingual, Base
                                                    multilingual, or Small multilingual to
                                                    use language selection or translation.
                                                </Alert>
                                            )}

                                            {transcribeMode === "accurate" && (
                                                <Alert
                                                    severity="info"
                                                    sx={{
                                                        borderRadius: 3,
                                                        background:
                                                            "rgba(167,139,250,0.1)",
                                                        color: "#fff",
                                                        border:
                                                            "1px solid rgba(167,139,250,0.24)",
                                                        "& .MuiAlert-icon": {
                                                            color: "#a78bfa",
                                                        },
                                                    }}
                                                >
                                                    Accurate mode uses more overlap and
                                                    word-level timestamps when timestamps
                                                    are enabled. It can improve boundary
                                                    handling, but it is slower.
                                                </Alert>
                                            )}
                                        </Stack>

                                        {!selectedModel.mobileSafe && isMobile && (
                                            <Alert
                                                severity="warning"
                                                icon={<WarningAmberRoundedIcon />}
                                                sx={{
                                                    borderRadius: 3,
                                                    background:
                                                        "rgba(251,191,36,0.1)",
                                                    color: "#fff",
                                                    border:
                                                        "1px solid rgba(251,191,36,0.24)",
                                                    "& .MuiAlert-icon": {
                                                        color: "#fbbf24",
                                                    },
                                                }}
                                            >
                                                This model can be heavy on phones. Tiny or
                                                Base English is safer for mobile browsers.
                                            </Alert>
                                        )}

                                        <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            spacing={1}
                                        >
                                            <Button
                                                size="large"
                                                variant="contained"
                                                startIcon={<AutoAwesomeRoundedIcon />}
                                                fullWidth={isMobile}
                                                disabled={
                                                    !audioUrl ||
                                                    actionBusy ||
                                                    fileTooLarge
                                                }
                                                onClick={handleTranscribe}
                                                sx={{
                                                    borderRadius: 999,
                                                    py: 1.55,
                                                    fontWeight: 950,
                                                    color: "#06111e",
                                                    background:
                                                        "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                    boxShadow:
                                                        "0 18px 46px rgba(103,232,249,0.2)",
                                                    "&:hover": {
                                                        background:
                                                            "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                        filter: "brightness(1.04)",
                                                    },
                                                }}
                                            >
                                                {busy
                                                    ? "Transcribing..."
                                                    : "Transcribe Audio"}
                                            </Button>

                                            <Button
                                                variant="outlined"
                                                startIcon={<RestartAltRoundedIcon />}
                                                fullWidth={isMobile}
                                                disabled={actionBusy}
                                                onClick={clearSavedProgress}
                                                sx={{
                                                    borderRadius: 999,
                                                    color: "#fff",
                                                    borderColor:
                                                        "rgba(255,255,255,0.18)",
                                                    fontWeight: 900,
                                                }}
                                            >
                                                Clear saved
                                            </Button>
                                        </Stack>

                                        <Button
                                            variant="text"
                                            startIcon={<DeleteRoundedIcon />}
                                            disabled={actionBusy && !file}
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
                                </Box>
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

                            <GlassCard>
                                <Stack spacing={1.4}>
                                    <Typography variant="h6" sx={{ fontWeight: 950 }}>
                                        Session details
                                    </Typography>

                                    <Stack direction="row" flexWrap="wrap" gap={1}>
                                        <Chip
                                            icon={<ModelTrainingRoundedIcon />}
                                            label={selectedModel.label}
                                            sx={{
                                                color: "#fff",
                                                background: "rgba(255,255,255,0.08)",
                                                border:
                                                    "1px solid rgba(255,255,255,0.08)",
                                                fontWeight: 850,
                                            }}
                                        />
                                        <Chip
                                            icon={<SpeedRoundedIcon />}
                                            label={`${selectedMode.label} mode`}
                                            sx={{
                                                color: "#fff",
                                                background: "rgba(255,255,255,0.08)",
                                                border:
                                                    "1px solid rgba(255,255,255,0.08)",
                                                fontWeight: 850,
                                            }}
                                        />
                                        <Chip
                                            icon={<TranslateRoundedIcon />}
                                            label={
                                                selectedModelSupportsLanguageTask
                                                    ? LANGUAGE_OPTIONS.find(
                                                    (item) =>
                                                        item.value === language
                                                )?.label || language
                                                    : "English-only"
                                            }
                                            sx={{
                                                color: "#fff",
                                                background: "rgba(255,255,255,0.08)",
                                                border:
                                                    "1px solid rgba(255,255,255,0.08)",
                                                fontWeight: 850,
                                            }}
                                        />
                                        <Chip
                                            icon={<TimerRoundedIcon />}
                                            label={
                                                withTimestamps
                                                    ? "Timestamps on"
                                                    : "Timestamps off"
                                            }
                                            sx={{
                                                color: "#fff",
                                                background: "rgba(255,255,255,0.08)",
                                                border:
                                                    "1px solid rgba(255,255,255,0.08)",
                                                fontWeight: 850,
                                            }}
                                        />
                                        <Chip
                                            icon={<PlaylistAddRoundedIcon />}
                                            label={`${chunks.length} chunk${
                                                chunks.length === 1 ? "" : "s"
                                            }`}
                                            sx={{
                                                color: "#fff",
                                                background: "rgba(255,255,255,0.08)",
                                                border:
                                                    "1px solid rgba(255,255,255,0.08)",
                                                fontWeight: 850,
                                            }}
                                        />
                                    </Stack>
                                </Stack>
                            </GlassCard>
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
                                            Edit the result before copying or downloading
                                            it. Drafts save locally as you type.
                                        </Typography>
                                    </Box>

                                    <Chip
                                        icon={
                                            transcript ? (
                                                <SaveRoundedIcon />
                                            ) : (
                                                <GraphicEqRoundedIcon />
                                            )
                                        }
                                        label={
                                            transcript
                                                ? `${wordCount} word${
                                                    wordCount === 1 ? "" : "s"
                                                } saved`
                                                : "No transcript yet"
                                        }
                                        sx={{
                                            alignSelf: {
                                                xs: "flex-start",
                                                md: "center",
                                            },
                                            color: "#fff",
                                            background: "rgba(255,255,255,0.08)",
                                            border:
                                                "1px solid rgba(255,255,255,0.08)",
                                            fontWeight: 850,
                                        }}
                                    />
                                </Stack>

                                <TextField
                                    value={transcript}
                                    onChange={(event) =>
                                        setTranscript(event.target.value)
                                    }
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

                                    <Button
                                        variant="outlined"
                                        startIcon={<FileDownloadRoundedIcon />}
                                        disabled={!vttText}
                                        fullWidth={isMobile}
                                        onClick={() =>
                                            downloadText(
                                                `${baseFileName}-captions.vtt`,
                                                vttText,
                                                "text/vtt;charset=utf-8"
                                            )
                                        }
                                        sx={{
                                            borderRadius: 999,
                                            color: "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 900,
                                        }}
                                    >
                                        Download VTT
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        startIcon={<DataObjectRoundedIcon />}
                                        disabled={!transcript}
                                        fullWidth={isMobile}
                                        onClick={() =>
                                            downloadText(
                                                `${baseFileName}-transcript.json`,
                                                jsonText,
                                                "application/json;charset=utf-8"
                                            )
                                        }
                                        sx={{
                                            borderRadius: 999,
                                            color: "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 900,
                                        }}
                                    >
                                        Download JSON
                                    </Button>
                                </Stack>

                                {chunks.length > 0 && (
                                    <>
                                        <Divider
                                            sx={{ borderColor: "rgba(255,255,255,0.1)" }}
                                        />

                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 950, mb: 1.3 }}
                                            >
                                                Timestamp preview
                                            </Typography>

                                            <Stack spacing={1}>
                                                {chunks
                                                    .slice(0, isMobile ? 6 : 12)
                                                    .map((chunk, index) => {
                                                        const pair =
                                                            normalizeTimestampPair(
                                                                chunk
                                                            ) || {
                                                                start: 0,
                                                                end: 2,
                                                            };

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
                                                                    {formatTime(pair.start)} →{" "}
                                                                    {formatTime(pair.end)}
                                                                </Typography>

                                                                <Typography
                                                                    sx={{
                                                                        color:
                                                                            "rgba(255,255,255,0.78)",
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
                                                            color:
                                                                "rgba(255,255,255,0.55)",
                                                            fontSize: 13,
                                                        }}
                                                    >
                                                        Showing first{" "}
                                                        {isMobile ? 6 : 12} chunks.
                                                        Download SRT, VTT, or JSON to save
                                                        all timestamp chunks.
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </Box>
                                    </>
                                )}

                                {!chunks.length && withTimestamps && transcript && (
                                    <Alert
                                        severity="warning"
                                        sx={{
                                            borderRadius: 3,
                                            background: "rgba(251,191,36,0.1)",
                                            color: "#fff",
                                            border:
                                                "1px solid rgba(251,191,36,0.24)",
                                            "& .MuiAlert-icon": {
                                                color: "#fbbf24",
                                            },
                                        }}
                                    >
                                        Transcript text was generated, but no timestamp
                                        chunks were returned. Try re-running with a smaller
                                        model, Balanced mode, or shorter audio.
                                    </Alert>
                                )}
                            </Stack>
                        </GlassCard>
                    </Box>
                </Stack>
            </PageShell>
        </>
    );
}