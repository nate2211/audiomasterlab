import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    InputLabel,
    LinearProgress,
    MenuItem,
    Select,
    Slider,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import PlaylistAddRoundedIcon from "@mui/icons-material/PlaylistAddRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import VolumeDownRoundedIcon from "@mui/icons-material/VolumeDownRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import EqualizerRoundedIcon from "@mui/icons-material/EqualizerRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import AudioFileRoundedIcon from "@mui/icons-material/AudioFileRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import {
    GlassCard,
    MediaInputForm,
    PageShell,
    RenderButton,
    SectionTitle,
    StatusBanner,
    ControlSlider,
} from "../components/Components.js";

const DEFAULT_SETTINGS = {
    baseVolume: 1,

    clarityAmount: 0,
    demudAmount: 0,
    deEssAmount: 0,
    deEssFrequency: 6500,

    lowGain: 0,
    midGain: 0,
    highGain: 0,
    highPass: 20,
    lowPass: 20000,

    pan: 0,

    reverbMix: 0,
    reverbSeconds: 1.8,

    delayMix: 0,
    delayTime: 0.25,
    delayFeedback: 0.25,

    speed: 1,
    pitchSemitones: 0,

    distortionAmount: 0,
    bitcrusherWarmth: 0,
    bitcrusherVariance: 0.12,
    compressorThreshold: -18,
    compressorRatio: 3,
    outputGain: 0,
};

const HUMAN_SAFE_LIMITS = {
    baseVolume: { min: 0, max: 1.35 },

    clarityAmount: { min: 0, max: 0.85 },
    demudAmount: { min: 0, max: 0.85 },
    deEssAmount: { min: 0, max: 0.85 },
    deEssFrequency: { min: 4000, max: 11000 },

    lowGain: { min: -12, max: 10 },
    midGain: { min: -12, max: 8 },
    highGain: { min: -12, max: 6 },
    highPass: { min: 20, max: 1000 },
    lowPass: { min: 2000, max: 20000 },

    pan: { min: -1, max: 1 },

    reverbMix: { min: 0, max: 0.65 },
    reverbSeconds: { min: 0.15, max: 5 },

    delayMix: { min: 0, max: 0.55 },
    delayTime: { min: 0, max: 1.25 },
    delayFeedback: { min: 0, max: 0.62 },

    speed: { min: 0.8, max: 1.25 },
    pitchSemitones: { min: -7, max: 7 },

    distortionAmount: { min: 0, max: 1 },
    bitcrusherWarmth: { min: 0, max: 0.55 },
    bitcrusherVariance: { min: 0, max: 0.75 },
    compressorThreshold: { min: -48, max: -2 },
    compressorRatio: { min: 1, max: 8 },
    outputGain: { min: -18, max: 6 },
};

const VISUALIZER_3D_STORAGE_KEY = "audiomasterlab.audio.visualizer3d.v1";

const DEFAULT_VISUALIZER_3D_SETTINGS = {
    enabled: false,
    model: "radial-bars",
};

const VISUALIZER_3D_MODE_OPTIONS = [
    {
        value: "radial-bars",
        label: "Radial bars",
    },
    {
        value: "sphere-dots",
        label: "Sphere dots",
    },
    {
        value: "terrain-grid",
        label: "Terrain grid",
    },
];

function readPersistedVisualizer3DSettings() {
    if (typeof window === "undefined" || !window.localStorage) {
        return DEFAULT_VISUALIZER_3D_SETTINGS;
    }

    try {
        const raw = window.localStorage.getItem(VISUALIZER_3D_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};

        return {
            ...DEFAULT_VISUALIZER_3D_SETTINGS,
            ...(parsed || {}),
            model: VISUALIZER_3D_MODE_OPTIONS.some(
                (option) => option.value === parsed?.model
            )
                ? parsed.model
                : DEFAULT_VISUALIZER_3D_SETTINGS.model,
            enabled: Boolean(parsed?.enabled),
        };
    } catch {
        return DEFAULT_VISUALIZER_3D_SETTINGS;
    }
}

function persistVisualizer3DSettings(settings) {
    if (typeof window === "undefined" || !window.localStorage) {
        return;
    }

    try {
        window.localStorage.setItem(
            VISUALIZER_3D_STORAGE_KEY,
            JSON.stringify({
                ...DEFAULT_VISUALIZER_3D_SETTINGS,
                ...(settings || {}),
            })
        );
    } catch {
        // Ignore storage failures.
    }
}

const MIXER_PRESETS = [
    {
        key: "flat",
        label: "Clean default",
        shortLabel: "Clean",
        description:
            "Neutral playback with the safe limiter ranges active. Best starting point before manual edits.",
        settings: DEFAULT_SETTINGS,
    },
    {
        key: "halftime-85",
        label: "85% halftime bounce",
        shortLabel: "85% halftime",
        description:
            "Safe 0.85x halftime feel with light pitch drop, body, and room. It will never go below 0.80x.",
        settings: {
            ...DEFAULT_SETTINGS,
            speed: 0.85,
            pitchSemitones: -2,
            lowGain: 2,
            midGain: -1.5,
            highGain: 1,
            lowPass: 16000,
            reverbMix: 0.18,
            reverbSeconds: 2.4,
            delayMix: 0.08,
            delayTime: 0.33,
            delayFeedback: 0.18,
            distortionAmount: 0.08,
            bitcrusherWarmth: 0.04,
            bitcrusherVariance: 0.16,
            compressorThreshold: -20,
            compressorRatio: 3,
            outputGain: -2,
        },
    },
    {
        key: "slowed-reverb",
        label: "Slowed + reverb",
        shortLabel: "Slowed reverb",
        description:
            "Classic slowed/reverb sound without unsafe speed, harsh treble, or excessive wet mix.",
        settings: {
            ...DEFAULT_SETTINGS,
            speed: 0.88,
            pitchSemitones: -1.5,
            lowGain: 2.5,
            midGain: -2,
            highGain: 0.75,
            highPass: 30,
            lowPass: 14500,
            reverbMix: 0.38,
            reverbSeconds: 3.2,
            delayMix: 0.11,
            delayTime: 0.42,
            delayFeedback: 0.24,
            distortionAmount: 0.12,
            bitcrusherWarmth: 0.08,
            bitcrusherVariance: 0.2,
            compressorThreshold: -22,
            compressorRatio: 3.5,
            outputGain: -2.5,
        },
    },
    {
        key: "dream-room",
        label: "Dream room",
        shortLabel: "Dream",
        description:
            "More atmosphere than the slowed preset, with a safer low-pass and controlled high gain.",
        settings: {
            ...DEFAULT_SETTINGS,
            speed: 0.92,
            pitchSemitones: -1,
            lowGain: 1.5,
            midGain: -1,
            highGain: 1.25,
            highPass: 42,
            lowPass: 13200,
            reverbMix: 0.48,
            reverbSeconds: 4.2,
            delayMix: 0.16,
            delayTime: 0.5,
            delayFeedback: 0.32,
            distortionAmount: 0.1,
            bitcrusherWarmth: 0.1,
            bitcrusherVariance: 0.22,
            compressorThreshold: -24,
            compressorRatio: 3.2,
            outputGain: -3,
        },
    },
    {
        key: "warm-master",
        label: "Warm safe master",
        shortLabel: "Warm",
        description:
            "Gentle mastering preset for fuller lows, less mud, and controlled final output.",
        settings: {
            ...DEFAULT_SETTINGS,
            clarityAmount: 0.25,
            demudAmount: 0.35,
            deEssAmount: 0.2,
            lowGain: 1.5,
            midGain: -1,
            highGain: 1.5,
            highPass: 28,
            lowPass: 19000,
            distortionAmount: 0.14,
            bitcrusherWarmth: 0.08,
            bitcrusherVariance: 0.16,
            compressorThreshold: -18,
            compressorRatio: 3.5,
            outputGain: -1,
        },
    },
    {
        key: "warm-bit-color",
        label: "Warm slight bit color",
        shortLabel: "Warm bit",
        description:
            "Adds a soft WaveShaper edge, gentle compression, and a warm bitcrusher color that stays subtle instead of harsh.",
        settings: {
            ...DEFAULT_SETTINGS,
            clarityAmount: 0.22,
            demudAmount: 0.18,
            lowGain: 1,
            midGain: -0.5,
            highGain: 1,
            highPass: 28,
            lowPass: 18500,
            distortionAmount: 0.16,
            bitcrusherWarmth: 0.22,
            bitcrusherVariance: 0.28,
            compressorThreshold: -24,
            compressorRatio: 3,
            outputGain: -2,
        },
    },
    {
        key: "soft-distortion-glue",
        label: "Soft distortion glue",
        shortLabel: "Soft drive",
        description:
            "More obvious soft distortion with compressor control, but still gain-staged for safe browser playback.",
        settings: {
            ...DEFAULT_SETTINGS,
            clarityAmount: 0.18,
            demudAmount: 0.16,
            lowGain: 0.75,
            midGain: -0.25,
            highGain: 0.75,
            highPass: 32,
            lowPass: 17600,
            distortionAmount: 0.34,
            bitcrusherWarmth: 0.1,
            bitcrusherVariance: 0.18,
            compressorThreshold: -26,
            compressorRatio: 3.8,
            outputGain: -3,
        },
    },
    {
        key: "vocal-clarity",
        label: "Vocal clarity",
        shortLabel: "Vocal",
        description:
            "Brings speech and vocals forward while keeping sibilance and high EQ in a safer range.",
        settings: {
            ...DEFAULT_SETTINGS,
            clarityAmount: 0.5,
            demudAmount: 0.5,
            deEssAmount: 0.48,
            deEssFrequency: 7200,
            lowGain: -1,
            midGain: 1.5,
            highGain: 2.5,
            highPass: 85,
            lowPass: 18000,
            compressorThreshold: -21,
            compressorRatio: 3,
            outputGain: -1.5,
        },
    },
    {
        key: "bass-safe",
        label: "Bass-safe boost",
        shortLabel: "Bass safe",
        description:
            "Adds bass weight without letting low EQ or output gain run into easy clipping territory.",
        settings: {
            ...DEFAULT_SETTINGS,
            demudAmount: 0.22,
            lowGain: 4,
            midGain: -1,
            highGain: 0.5,
            highPass: 35,
            lowPass: 18000,
            distortionAmount: 0.1,
            bitcrusherWarmth: 0.06,
            bitcrusherVariance: 0.14,
            compressorThreshold: -20,
            compressorRatio: 4.2,
            outputGain: -2,
        },
    },
    {
        key: "phone-speaker",
        label: "Phone speaker safe",
        shortLabel: "Phone",
        description:
            "Cuts deep lows and adds controlled presence so small speakers stay more readable.",
        settings: {
            ...DEFAULT_SETTINGS,
            clarityAmount: 0.42,
            demudAmount: 0.42,
            deEssAmount: 0.32,
            lowGain: -2,
            midGain: 1.5,
            highGain: 2.25,
            highPass: 120,
            lowPass: 15000,
            compressorThreshold: -20,
            compressorRatio: 4,
            outputGain: -2,
        },
    },
    {
        key: "night-energy",
        label: "Night energy",
        shortLabel: "Energy",
        description:
            "Small speed and pitch lift for energy, still inside human-safe playback and gain limits.",
        settings: {
            ...DEFAULT_SETTINGS,
            speed: 1.1,
            pitchSemitones: 1.5,
            clarityAmount: 0.28,
            lowGain: 0.5,
            midGain: 0.5,
            highGain: 1.75,
            highPass: 35,
            lowPass: 19000,
            reverbMix: 0.08,
            reverbSeconds: 1.4,
            distortionAmount: 0.18,
            bitcrusherWarmth: 0.1,
            bitcrusherVariance: 0.18,
            compressorThreshold: -18,
            compressorRatio: 3,
            outputGain: -1.5,
        },
    },
    {
        key: "wide-clean",
        label: "Wide clean space",
        shortLabel: "Wide clean",
        description:
            "A wider, polished mix with light pan-safe space, controlled air, and no risky treble boost.",
        settings: {
            ...DEFAULT_SETTINGS,
            clarityAmount: 0.34,
            demudAmount: 0.24,
            deEssAmount: 0.25,
            lowGain: 0.75,
            midGain: -0.75,
            highGain: 2,
            highPass: 32,
            lowPass: 17500,
            pan: 0,
            reverbMix: 0.22,
            reverbSeconds: 2.2,
            delayMix: 0.07,
            delayTime: 0.28,
            delayFeedback: 0.16,
            compressorThreshold: -19,
            compressorRatio: 3.2,
            outputGain: -1.5,
        },
    },
];



const STREAMING_MANIFEST_EXTENSIONS = [".m3u8", ".mpd", ".ism", ".f4m"];

const MEDIA_EXTENSION_HINTS = [
    ".mp3",
    ".wav",
    ".wave",
    ".ogg",
    ".oga",
    ".opus",
    ".webm",
    ".m4a",
    ".mp4",
    ".m4v",
    ".mov",
    ".qt",
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

const STORAGE_KEYS = {
    settings: "audiomasterlab.audio.settings.v4",
    activePresetKey: "audiomasterlab.audio.activePresetKey.v4",
    repeatEnabled: "audiomasterlab.audio.repeatEnabled.v4",
    playlist: "audiomasterlab.audio.playlist.v4",
    activePlaylistIndex: "audiomasterlab.audio.activePlaylistIndex.v4",
    directLink: "audiomasterlab.audio.directLink.v4",
    playlistLinkDraft: "audiomasterlab.audio.playlistLinkDraft.v4",
    lastMedia: "audiomasterlab.audio.lastMedia.v4",
    lastSession: "audiomasterlab.audio.lastSession.v4",
    carPlaySafeMode: "audiomasterlab.audio.carPlaySafeMode.v4",
};

const COOKIE_NAMES = {
    settingsSummary: "aml_audio_settings",
    sessionSummary: "aml_audio_session",
    playlistSummary: "aml_audio_playlist",
};

const MAX_PERSISTED_CURRENT_AUDIO_BYTES = 6 * 1024 * 1024;
const MAX_PERSISTED_PLAYLIST_FILE_BYTES = 3 * 1024 * 1024;
const MAX_COOKIE_VALUE_LENGTH = 3200;

const PLAYLIST_FILE_DB_NAME = "audiomasterlab-playlist-files-v1";
const PLAYLIST_FILE_DB_VERSION = 1;
const PLAYLIST_FILE_STORE_NAME = "uploadedPlaylistFiles";
const PLAYLIST_FILE_INDEXEDDB_SAVE_LIMIT = 250 * 1024 * 1024;

const PLAYLIST_RECOVERY_SETTINGS = {
    fetchTimeoutMs: 24000,
    autoplayDelayMs: 140,
    retryDelaysMs: [0, 350, 900],
    decodeRetryDelaysMs: [0, 180],
    fetchCacheModes: ["no-store", "reload", "default"],
};

const IPHONE_KEEP_ALIVE_GAIN = 0.0000004;
const STREAM_FINAL_CEILING_GAIN = 0.94;
const STREAM_EFFECT_SMOOTH_SECONDS = 0.09;
const IOS_STREAM_EFFECT_SMOOTH_SECONDS = 0.24;
const PLAYLIST_DRAG_MIME = "application/x-audiomasterlab-playlist-index";

const SCRAPEWEBSITE_ARCHIVE_PROXY_URL = "https://scrapewebsite.pages.dev/api/archiveproxy";
const COMMUNITY_FEED_POST_URL = "https://scrapewebsite.pages.dev/api/community/posts";
const COMMUNITY_LISTENING_URL = "https://scrapewebsite.pages.dev/api/community/listening";
const COMMUNITY_LISTENING_SESSION_STORAGE_KEY =
    "audiomasterlab.community.listening.session.v1";
const COMMUNITY_LISTENING_USER_NAME_STORAGE_KEY =
    "audiomasterlab.community.userName.v1";
const COMMUNITY_LISTENING_HEARTBEAT_INTERVAL_MS = 45000;

function isArchiveMediaHost(hostname = "") {
    const host = String(hostname || "").toLowerCase();

    return (
        host === "archive.org" ||
        host === "www.archive.org" ||
        /^ia\d+\.us\.archive\.org$/.test(host)
    );
}

function isScrapeWebsiteArchiveProxyUrl(urlValue) {
    try {
        const parsed = new URL(urlValue);

        return (
            parsed.origin === "https://scrapewebsite.pages.dev" &&
            parsed.pathname === "/api/archiveproxy"
        );
    } catch {
        return false;
    }
}

function getScrapeWebsiteArchiveProxyTargetUrl(urlValue) {
    try {
        const parsed = new URL(urlValue);

        if (
            parsed.origin !== "https://scrapewebsite.pages.dev" ||
            parsed.pathname !== "/api/archiveproxy"
        ) {
            return "";
        }

        const targetUrl = parsed.searchParams.get("url") || "";

        if (!targetUrl) {
            return "";
        }

        const decodedTargetUrl = decodeURIComponent(targetUrl);
        const targetParsed = new URL(decodedTargetUrl);

        if (
            targetParsed.protocol !== "https:" ||
            !isArchiveMediaHost(targetParsed.hostname)
        ) {
            return "";
        }

        return targetParsed.toString();
    } catch {
        return "";
    }
}

function getCanonicalArchiveMediaUrl(urlValue) {
    return getScrapeWebsiteArchiveProxyTargetUrl(urlValue) || urlValue;
}

function isPlaceholderProxyTitle(value) {
    const title = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\.[a-z0-9]{2,6}$/i, "");

    return (
        !title ||
        title === "archiveproxy" ||
        title === "archive proxy" ||
        title === "api/archiveproxy" ||
        title === "scrapewebsite archive proxy" ||
        title === "direct media link"
    );
}

function cleanMediaFileTitle(value) {
    const title = String(value || "")
        .replace(/[?#].*$/g, "")
        .split("/")
        .filter(Boolean)
        .pop();

    if (!title) {
        return "";
    }

    try {
        return decodeURIComponent(title).replace(/\+/g, " ").trim();
    } catch {
        return title.replace(/\+/g, " ").trim();
    }
}

function shouldFallbackToScrapeWebsiteProxy(urlValue) {
    if (!urlValue || isScrapeWebsiteArchiveProxyUrl(urlValue)) {
        return false;
    }

    if (
        String(urlValue).startsWith("blob:") ||
        String(urlValue).startsWith("data:")
    ) {
        return false;
    }

    try {
        const parsed = new URL(urlValue);

        return parsed.protocol === "https:" && isArchiveMediaHost(parsed.hostname);
    } catch {
        return false;
    }
}

function buildScrapeWebsiteArchiveProxyUrl(urlValue) {
    if (!shouldFallbackToScrapeWebsiteProxy(urlValue)) {
        return urlValue;
    }

    return `${SCRAPEWEBSITE_ARCHIVE_PROXY_URL}?url=${encodeURIComponent(urlValue)}`;
}

function buildMediaFetchCandidates(cleanUrl) {
    const candidates = [
        {
            url: cleanUrl,
            label: "direct media URL",
            usingProxy: false,
        },
    ];

    const proxyUrl = buildScrapeWebsiteArchiveProxyUrl(cleanUrl);

    if (proxyUrl && proxyUrl !== cleanUrl) {
        candidates.push({
            url: proxyUrl,
            label: "scrapewebsite Archive proxy",
            usingProxy: true,
        });
    }

    return candidates;
}

function storageAvailable() {
    if (typeof window === "undefined" || !window.localStorage) return false;

    try {
        const testKey = "__audiomasterlab_storage_test__";
        window.localStorage.setItem(testKey, "1");
        window.localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}

function readStorageValue(key, fallback = null) {
    if (!storageAvailable()) return fallback;

    try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : raw;
    } catch {
        return fallback;
    }
}

function writeStorageValue(key, value) {
    if (!storageAvailable()) return false;

    try {
        window.localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

function removeStorageValue(key) {
    if (!storageAvailable()) return false;

    try {
        window.localStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

function readStorageJson(key, fallback) {
    const raw = readStorageValue(key, "");

    if (!raw) return fallback;

    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function writeStorageJson(key, value) {
    try {
        return writeStorageValue(key, JSON.stringify(value));
    } catch {
        return false;
    }
}

function encodeCookie(value) {
    try {
        return encodeURIComponent(JSON.stringify(value));
    } catch {
        return "";
    }
}

function decodeCookie(value, fallback = null) {
    try {
        return JSON.parse(decodeURIComponent(value));
    } catch {
        return fallback;
    }
}

function setCookieJson(name, value, days = 365) {
    if (typeof document === "undefined") return false;

    const encoded = encodeCookie(value);

    if (!encoded || encoded.length > MAX_COOKIE_VALUE_LENGTH) return false;

    const maxAge = Math.max(1, Math.floor(days * 24 * 60 * 60));
    const secure = typeof window !== "undefined" && window.location?.protocol === "https:";

    document.cookie = `${name}=${encoded}; Max-Age=${maxAge}; Path=/; SameSite=Lax${
        secure ? "; Secure" : ""
    }`;

    return true;
}

function getCookieJson(name, fallback = null) {
    if (typeof document === "undefined") return fallback;

    const parts = String(document.cookie || "")
        .split(";")
        .map((part) => part.trim());

    const match = parts.find((part) => part.startsWith(`${name}=`));

    if (!match) return fallback;

    return decodeCookie(match.slice(name.length + 1), fallback);
}

function deleteCookie(name) {
    if (typeof document === "undefined") return;

    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function arrayBufferToBase64(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    let binary = "";

    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(String(base64 || ""));
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
}

function arrayBufferToDataUrl(arrayBuffer, mimeType = "application/octet-stream") {
    return `data:${mimeType || "application/octet-stream"};base64,${arrayBufferToBase64(
        arrayBuffer
    )}`;
}

function dataUrlToBlob(dataUrl, fallbackType = "application/octet-stream") {
    const value = String(dataUrl || "");
    const commaIndex = value.indexOf(",");

    if (commaIndex < 0) {
        throw new Error("Saved audio data is not a valid data URL.");
    }

    const header = value.slice(0, commaIndex);
    const base64 = value.slice(commaIndex + 1);
    const mimeMatch = header.match(/^data:([^;]+);base64$/i);
    const mimeType = mimeMatch?.[1] || fallbackType;
    const arrayBuffer = base64ToArrayBuffer(base64);

    return new Blob([arrayBuffer], { type: mimeType });
}

function dataUrlToFile(dataUrl, fileName = "saved-audio-file", fallbackType = "audio/mpeg") {
    const blob = dataUrlToBlob(dataUrl, fallbackType);

    try {
        return new File([blob], fileName, {
            type: blob.type || fallbackType,
            lastModified: Date.now(),
        });
    } catch {
        blob.name = fileName;
        blob.lastModified = Date.now();
        return blob;
    }
}

function getStoredItemSizeEstimate(value) {
    try {
        return new Blob([typeof value === "string" ? value : JSON.stringify(value)]).size;
    } catch {
        return 0;
    }
}

function readPersistedSettings() {
    const stored = readStorageJson(STORAGE_KEYS.settings, null);

    if (stored) {
        return normalizeSettings(stored);
    }

    const cookieSummary = getCookieJson(COOKIE_NAMES.settingsSummary, null);

    if (cookieSummary?.settings) {
        return normalizeSettings(cookieSummary.settings);
    }

    return DEFAULT_SETTINGS;
}

function readPersistedPresetKey() {
    return (
        readStorageValue(STORAGE_KEYS.activePresetKey, "") ||
        getCookieJson(COOKIE_NAMES.settingsSummary, {})?.activePresetKey ||
        "flat"
    );
}

function readPersistedRepeatEnabled() {
    const stored = readStorageValue(STORAGE_KEYS.repeatEnabled, "");

    if (stored === "true") return true;
    if (stored === "false") return false;

    return Boolean(getCookieJson(COOKIE_NAMES.sessionSummary, {})?.repeatEnabled);
}

function readPersistedCarPlaySafeMode() {
    const stored = readStorageValue(STORAGE_KEYS.carPlaySafeMode, "");

    if (stored === "true") return true;
    if (stored === "false") return false;

    // Default this on for iPhone/iPad because wired CarPlay and USB audio-route
    // changes are more sensitive to WebAudio graph rebuilds and wet effect jumps.
    return isIOSAudioDevice();
}

function readPersistedDirectLink() {
    return readStorageValue(STORAGE_KEYS.directLink, "");
}

function readPersistedPlaylistLinkDraft() {
    return readStorageValue(STORAGE_KEYS.playlistLinkDraft, "");
}

function playlistFileBlobStorageAvailable() {
    return typeof window !== "undefined" && Boolean(window.indexedDB);
}

function buildPlaylistFileStorageKey(item) {
    const id = String(item?.id || makePlaylistId()).replace(/[^a-z0-9._-]/gi, "_");

    return `playlist-file-${id}`;
}

function openPlaylistFileDatabase() {
    if (!playlistFileBlobStorageAvailable()) {
        return Promise.reject(new Error("IndexedDB is not available in this browser."));
    }

    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(
            PLAYLIST_FILE_DB_NAME,
            PLAYLIST_FILE_DB_VERSION
        );

        request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(PLAYLIST_FILE_STORE_NAME)) {
                database.createObjectStore(PLAYLIST_FILE_STORE_NAME, { keyPath: "id" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not open playlist file storage."));
        request.onblocked = () => reject(new Error("Playlist file storage is blocked by another browser tab."));
    });
}

function runPlaylistFileStoreTransaction(mode, callback) {
    return openPlaylistFileDatabase().then(
        (database) =>
            new Promise((resolve, reject) => {
                let settled = false;

                try {
                    const transaction = database.transaction(PLAYLIST_FILE_STORE_NAME, mode);
                    const store = transaction.objectStore(PLAYLIST_FILE_STORE_NAME);
                    const request = callback(store);

                    if (request && "onsuccess" in request) {
                        request.onsuccess = () => {
                            settled = true;
                            resolve(request.result);
                        };
                        request.onerror = () => {
                            settled = true;
                            reject(request.error || transaction.error || new Error("Playlist file storage request failed."));
                        };
                    }

                    transaction.oncomplete = () => {
                        database.close();

                        if (!settled) {
                            resolve(true);
                        }
                    };
                    transaction.onerror = () => {
                        database.close();

                        if (!settled) {
                            reject(transaction.error || new Error("Playlist file storage transaction failed."));
                        }
                    };
                    transaction.onabort = () => {
                        database.close();

                        if (!settled) {
                            reject(transaction.error || new Error("Playlist file storage transaction aborted."));
                        }
                    };
                } catch (error) {
                    try {
                        database.close();
                    } catch {
                        // Safe to ignore close errors.
                    }

                    reject(error);
                }
            })
    );
}

async function putPlaylistFileBlob(storageKey, file) {
    if (!storageKey || !file || !playlistFileBlobStorageAvailable()) {
        return false;
    }

    const size = Number(file.size || 0);

    if (size > PLAYLIST_FILE_INDEXEDDB_SAVE_LIMIT) {
        return false;
    }

    try {
        await runPlaylistFileStoreTransaction("readwrite", (store) =>
            store.put({
                id: storageKey,
                blob: file,
                name: file.name || "uploaded-playlist-file",
                type: file.type || "application/octet-stream",
                size,
                lastModified: file.lastModified || Date.now(),
                savedAt: new Date().toISOString(),
            })
        );

        return true;
    } catch {
        return false;
    }
}

async function getPlaylistFileBlob(storageKey) {
    if (!storageKey || !playlistFileBlobStorageAvailable()) {
        return null;
    }

    try {
        const record = await runPlaylistFileStoreTransaction("readonly", (store) =>
            store.get(storageKey)
        );

        if (!record?.blob) {
            return null;
        }

        const type = record.type || record.blob.type || "application/octet-stream";
        const name = record.name || "uploaded-playlist-file";
        const lastModified = record.lastModified || Date.now();

        try {
            return new File([record.blob], name, { type, lastModified });
        } catch {
            const blob = new Blob([record.blob], { type });
            blob.name = name;
            blob.lastModified = lastModified;
            return blob;
        }
    } catch {
        return null;
    }
}

async function deletePlaylistFileBlob(storageKey) {
    if (!storageKey || !playlistFileBlobStorageAvailable()) {
        return false;
    }

    try {
        await runPlaylistFileStoreTransaction("readwrite", (store) => store.delete(storageKey));
        return true;
    } catch {
        return false;
    }
}

async function clearPlaylistFileBlobs() {
    if (!playlistFileBlobStorageAvailable()) {
        return false;
    }

    try {
        await runPlaylistFileStoreTransaction("readwrite", (store) => store.clear());
        return true;
    } catch {
        return false;
    }
}

async function restorePlaylistItemFileFromBrowserStorage(item) {
    if (!item || item.kind !== "file") {
        return item;
    }

    if (item.file) {
        return {
            ...item,
            needsReselect: false,
        };
    }

    let restoredFile = null;

    if (item.indexedDbFileKey) {
        restoredFile = await getPlaylistFileBlob(item.indexedDbFileKey);
    }

    if (!restoredFile && item.dataUrl) {
        try {
            restoredFile = dataUrlToFile(
                item.dataUrl,
                item.title || "saved-playlist-audio",
                item.type || "audio/mpeg"
            );
        } catch {
            restoredFile = null;
        }
    }

    if (!restoredFile) {
        return item;
    }

    return {
        ...item,
        file: restoredFile,
        size: item.size || restoredFile.size || 0,
        type: item.type || restoredFile.type || "unknown MIME type",
        needsReselect: false,
        restoredFromStorage: true,
        storageNote: item.indexedDbFileKey
            ? "Uploaded file restored from browser IndexedDB after refresh."
            : "Uploaded file restored from localStorage after refresh.",
    };
}

async function hydratePlaylistFilesFromBrowserStorage(playlist) {
    if (!Array.isArray(playlist) || !playlist.length) {
        return {
            playlist: Array.isArray(playlist) ? playlist : [],
            restoredCount: 0,
            missingCount: 0,
        };
    }

    let restoredCount = 0;
    let missingCount = 0;

    const hydrated = await Promise.all(
        playlist.map(async (item) => {
            if (item?.kind !== "file" || item.file || (!item.indexedDbFileKey && !item.dataUrl)) {
                return item;
            }

            const restored = await restorePlaylistItemFileFromBrowserStorage(item);

            if (restored?.file) {
                restoredCount += 1;
                return restored;
            }

            missingCount += 1;
            return restored;
        })
    );

    return {
        playlist: hydrated,
        restoredCount,
        missingCount,
    };
}

function sanitizePersistedPlaylistItem(item) {
    if (!item || typeof item !== "object") return null;

    if (item.kind === "url" && item.url) {
        try {
            const cleanUrl = validateDirectMediaUrl(item.url);
            const canonicalArchiveUrl = getCanonicalArchiveMediaUrl(cleanUrl);
            const archiveFileName =
                item.archiveFileName ||
                item.archiveFile ||
                item.fileName ||
                cleanMediaFileTitle(canonicalArchiveUrl);
            const title = normalizePlaylistUrlTitle(
                item.title,
                cleanUrl,
                archiveFileName
            );

            return {
                id: item.id || makePlaylistId(),
                kind: "url",
                title,
                url: cleanUrl,
                size: 0,
                type: "direct media URL",
                addedAt: item.addedAt || new Date().toISOString(),
                restoredFromStorage: true,
                archiveFileName: archiveFileName || "",
                archiveServeUrl: item.archiveServeUrl || "",
                archiveDownloadUrl: item.archiveDownloadUrl || "",
                directArchiveUrl:
                    item.directArchiveUrl ||
                    item.directServeUrl ||
                    item.archiveOriginalUrl ||
                    canonicalArchiveUrl ||
                    "",
                proxiedArchiveUrl:
                    item.proxiedArchiveUrl ||
                    (isScrapeWebsiteArchiveProxyUrl(cleanUrl) ? cleanUrl : ""),
                archiveIdentifier:
                    item.archiveIdentifier ||
                    getArchiveIdentifierFromMediaUrl(
                        item.directArchiveUrl ||
                        item.directServeUrl ||
                        item.archiveOriginalUrl ||
                        canonicalArchiveUrl ||
                        cleanUrl
                    ),
                archiveArtworkUrl:
                    item.archiveArtworkUrl ||
                    buildArchiveArtworkUrl(
                        item.archiveIdentifier ||
                        getArchiveIdentifierFromMediaUrl(
                            item.directArchiveUrl ||
                            item.directServeUrl ||
                            item.archiveOriginalUrl ||
                            canonicalArchiveUrl ||
                            cleanUrl
                        )
                    ),
                artworkUrl: getPlaylistItemArtworkSource(item),
            };
        } catch {
            return null;
        }
    }

    if (item.kind === "file") {
        let restoredFile = null;

        if (item.dataUrl) {
            try {
                restoredFile = dataUrlToFile(
                    item.dataUrl,
                    item.title || "saved-audio-file",
                    item.type || "audio/mpeg"
                );
            } catch {
                restoredFile = null;
            }
        }

        const indexedDbFileKey = item.indexedDbFileKey || item.fileStorageKey || "";
        const canRestoreLater = Boolean(restoredFile || indexedDbFileKey);

        return {
            id: item.id || makePlaylistId(),
            kind: "file",
            title: item.title || "Saved local file",
            file: restoredFile,
            dataUrl: item.dataUrl || "",
            indexedDbFileKey,
            persistedIndexedDb: Boolean(item.persistedIndexedDb || indexedDbFileKey),
            size: item.size || restoredFile?.size || 0,
            type: item.type || restoredFile?.type || "unknown MIME type",
            addedAt: item.addedAt || new Date().toISOString(),
            persistedDataUrl: Boolean(item.dataUrl),
            restoredFromStorage: true,
            needsReselect: !canRestoreLater,
            storageNote: indexedDbFileKey && !restoredFile
                ? "Uploaded file is saved in browser IndexedDB and will be restored after the page loads."
                : item.storageNote || "",
            artworkUrl: getPlaylistItemArtworkSource(item),
        };
    }

    return null;
}

function createCommunityListeningSessionId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readPersistedCommunityListeningSessionId() {
    const existing = readStorageValue(COMMUNITY_LISTENING_SESSION_STORAGE_KEY, "");

    if (existing) {
        return existing;
    }

    const sessionId = createCommunityListeningSessionId();

    writeStorageValue(COMMUNITY_LISTENING_SESSION_STORAGE_KEY, sessionId);
    return sessionId;
}

function readPersistedCommunityListeningUserName() {
    return (
        readStorageValue(
            COMMUNITY_LISTENING_USER_NAME_STORAGE_KEY,
            "AudioMasterLab listener"
        ) || "AudioMasterLab listener"
    );
}

function sanitizeCommunityListeningText(value, fallback = "") {
    return String(value || fallback || "")
        .replace(/\s+/g, " ")
        .trim();
}

function sanitizeCommunityListeningSeconds(value, fallback = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return Math.max(0, number);
}

function readPersistedPlaylist() {
    const stored = readStorageJson(STORAGE_KEYS.playlist, []);

    if (!Array.isArray(stored)) return [];

    return stored.map(sanitizePersistedPlaylistItem).filter(Boolean);
}

function serializePlaylistItemForStorage(item) {
    if (!item || typeof item !== "object") return null;

    if (item.kind === "url" && item.url) {
        const canonicalArchiveUrl = getCanonicalArchiveMediaUrl(item.url);
        const archiveFileName =
            item.archiveFileName ||
            item.archiveFile ||
            item.fileName ||
            cleanMediaFileTitle(canonicalArchiveUrl);
        const title = normalizePlaylistUrlTitle(
            item.title,
            item.url,
            archiveFileName
        );

        return {
            id: item.id,
            kind: "url",
            title,
            url: item.url,
            size: 0,
            type: "direct media URL",
            addedAt: item.addedAt,
            archiveFileName: archiveFileName || "",
            archiveServeUrl: item.archiveServeUrl || "",
            archiveDownloadUrl: item.archiveDownloadUrl || "",
            directArchiveUrl:
                item.directArchiveUrl ||
                item.directServeUrl ||
                item.archiveOriginalUrl ||
                canonicalArchiveUrl ||
                "",
            proxiedArchiveUrl:
                item.proxiedArchiveUrl ||
                (isScrapeWebsiteArchiveProxyUrl(item.url) ? item.url : ""),
            archiveIdentifier:
                item.archiveIdentifier ||
                getArchiveIdentifierFromMediaUrl(
                    item.directArchiveUrl ||
                    item.directServeUrl ||
                    item.archiveOriginalUrl ||
                    canonicalArchiveUrl ||
                    item.url
                ),
            archiveArtworkUrl:
                item.archiveArtworkUrl ||
                buildArchiveArtworkUrl(
                    item.archiveIdentifier ||
                    getArchiveIdentifierFromMediaUrl(
                        item.directArchiveUrl ||
                        item.directServeUrl ||
                        item.archiveOriginalUrl ||
                        canonicalArchiveUrl ||
                        item.url
                    )
                ),
            artworkUrl: getPlaylistItemArtworkSource(item),
        };
    }

    if (item.kind === "file") {
        const indexedDbFileKey = item.indexedDbFileKey || item.fileStorageKey || "";

        // Important for multiple uploaded files:
        // When IndexedDB has the real File/Blob, keep localStorage small by storing
        // only metadata plus the IndexedDB key. Storing every small file as a data URL
        // in the playlist JSON can overflow localStorage and prevent the whole playlist
        // from restoring after refresh.
        const shouldStoreDataUrl = Boolean(item.dataUrl && !indexedDbFileKey);
        const persistedDataUrl = shouldStoreDataUrl;
        const persistedIndexedDb = Boolean(item.persistedIndexedDb || indexedDbFileKey);

        return {
            id: item.id,
            kind: "file",
            title: item.title,
            size: item.size || item.file?.size || 0,
            type: item.type || item.file?.type || "unknown MIME type",
            addedAt: item.addedAt,
            dataUrl: shouldStoreDataUrl ? item.dataUrl : "",
            indexedDbFileKey,
            persistedIndexedDb,
            persistedDataUrl,
            needsReselect: !persistedDataUrl && !indexedDbFileKey,
            storageNote: item.storageNote || "",
            artworkUrl: getPlaylistItemArtworkSource(item),
        };
    }

    return null;
}

function serializePlaylistForStorage(playlist) {
    return Array.isArray(playlist)
        ? playlist.map(serializePlaylistItemForStorage).filter(Boolean)
        : [];
}

async function attachPersistedFileData(item, file, maxBytes = MAX_PERSISTED_PLAYLIST_FILE_BYTES) {
    if (!file || !item) {
        return {
            ...(item || {}),
            dataUrl: "",
            indexedDbFileKey: item?.indexedDbFileKey || "",
            persistedIndexedDb: false,
            persistedDataUrl: false,
            needsReselect: true,
            storageNote: "File metadata saved. Re-select the file after refresh if needed.",
        };
    }

    const indexedDbFileKey = item.indexedDbFileKey || buildPlaylistFileStorageKey(item);
    const indexedDbSaved = await putPlaylistFileBlob(indexedDbFileKey, file);
    let dataUrl = "";
    let dataUrlSaved = false;

    // Save every uploaded playlist file to IndexedDB first. Only use localStorage
    // data URLs as a fallback when IndexedDB did not accept the blob. This keeps
    // multiple uploaded files from overflowing localStorage and wiping out the
    // persisted playlist metadata on refresh.
    if (!indexedDbSaved && file.size <= maxBytes) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            dataUrl = arrayBufferToDataUrl(
                arrayBuffer,
                file.type || "application/octet-stream"
            );
            dataUrlSaved = true;
        } catch {
            dataUrl = "";
            dataUrlSaved = false;
        }
    }

    if (indexedDbSaved || dataUrlSaved) {
        return {
            ...item,
            file,
            dataUrl,
            indexedDbFileKey: indexedDbSaved ? indexedDbFileKey : "",
            persistedIndexedDb: indexedDbSaved,
            persistedDataUrl: dataUrlSaved,
            needsReselect: false,
            storageNote: indexedDbSaved
                ? `Uploaded file saved in browser IndexedDB for refresh restore (${getReadableBytes(file.size)}).`
                : `Uploaded file saved in localStorage fallback for refresh restore (${getReadableBytes(file.size)}).`,
        };
    }

    return {
        ...item,
        file,
        dataUrl: "",
        indexedDbFileKey: "",
        persistedIndexedDb: false,
        persistedDataUrl: false,
        needsReselect: false,
        storageNote: `This uploaded file is available in this browser tab, but the browser would not save it for refresh restore (${getReadableBytes(file.size)}).`,
    };
}

function persistCurrentFileSnapshot({ file, arrayBuffer, metadata }) {
    if (!file || !arrayBuffer) return false;

    const payloadBase = {
        kind: "file",
        title: file.name || metadata?.name || "Saved local audio",
        type: file.type || metadata?.contentType || "application/octet-stream",
        size: file.size || arrayBuffer.byteLength,
        savedAt: new Date().toISOString(),
    };

    if (arrayBuffer.byteLength > MAX_PERSISTED_CURRENT_AUDIO_BYTES) {
        writeStorageJson(STORAGE_KEYS.lastMedia, {
            ...payloadBase,
            dataUrl: "",
            needsReselect: true,
            note: `File metadata saved, but ${getReadableBytes(
                arrayBuffer.byteLength
            )} is too large for localStorage auto-restore.`,
        });
        return false;
    }

    const dataUrl = arrayBufferToDataUrl(arrayBuffer, payloadBase.type);
    const saved = writeStorageJson(STORAGE_KEYS.lastMedia, {
        ...payloadBase,
        dataUrl,
        needsReselect: false,
    });

    return saved;
}

function persistCurrentUrlSnapshot(urlValue, preferredTitle = "") {
    if (!urlValue) return false;

    const title = normalizePlaylistUrlTitle(preferredTitle, urlValue);

    return writeStorageJson(STORAGE_KEYS.lastMedia, {
        kind: "url",
        title,
        url: urlValue,
        savedAt: new Date().toISOString(),
        directArchiveUrl: getCanonicalArchiveMediaUrl(urlValue),
        proxiedArchiveUrl: isScrapeWebsiteArchiveProxyUrl(urlValue) ? urlValue : "",
    });
}

function readPersistedLastMedia() {
    return readStorageJson(STORAGE_KEYS.lastMedia, null);
}

function persistSettingsToBrowser(settings, activePresetKey) {
    const normalized = normalizeSettings(settings);

    writeStorageJson(STORAGE_KEYS.settings, normalized);
    writeStorageValue(STORAGE_KEYS.activePresetKey, activePresetKey || "flat");

    setCookieJson(COOKIE_NAMES.settingsSummary, {
        activePresetKey: activePresetKey || "flat",
        settings: {
            baseVolume: normalized.baseVolume,
            speed: normalized.speed,
            pitchSemitones: normalized.pitchSemitones,
            outputGain: normalized.outputGain,
        },
        updatedAt: new Date().toISOString(),
    });
}

function persistCarPlaySafeModeToBrowser(enabled) {
    writeStorageValue(STORAGE_KEYS.carPlaySafeMode, enabled ? "true" : "false");
}

function persistSessionToBrowser({
                                     repeatEnabled,
                                     directLink,
                                     playlistLink,
                                     activePlaylistIndex,
                                     playlistLength,
                                     hasMedia,
                                     sourceKind,
                                 }) {
    writeStorageValue(STORAGE_KEYS.repeatEnabled, repeatEnabled ? "true" : "false");
    writeStorageValue(STORAGE_KEYS.activePlaylistIndex, String(activePlaylistIndex ?? -1));
    writeStorageValue(STORAGE_KEYS.directLink, directLink || "");
    writeStorageValue(STORAGE_KEYS.playlistLinkDraft, playlistLink || "");

    const summary = {
        repeatEnabled: Boolean(repeatEnabled),
        activePlaylistIndex: Number(activePlaylistIndex ?? -1),
        playlistLength: Number(playlistLength || 0),
        hasMedia: Boolean(hasMedia),
        sourceKind: sourceKind || "",
        updatedAt: new Date().toISOString(),
    };

    writeStorageJson(STORAGE_KEYS.lastSession, summary);
    setCookieJson(COOKIE_NAMES.sessionSummary, summary);
}

function persistPlaylistToBrowser(playlist) {
    const serializable = serializePlaylistForStorage(playlist);
    const saved = writeStorageJson(STORAGE_KEYS.playlist, serializable);

    setCookieJson(COOKIE_NAMES.playlistSummary, {
        count: serializable.length,
        urlCount: serializable.filter((item) => item.kind === "url").length,
        savedFileCount: serializable.filter(
            (item) =>
                item.kind === "file" &&
                Boolean(item.indexedDbFileKey || item.dataUrl)
        ).length,
        indexedDbFileCount: serializable.filter(
            (item) => item.kind === "file" && Boolean(item.indexedDbFileKey)
        ).length,
        localStorageFileCount: serializable.filter(
            (item) =>
                item.kind === "file" &&
                Boolean(item.dataUrl) &&
                !item.indexedDbFileKey
        ).length,
        placeholderFileCount: serializable.filter(
            (item) =>
                item.kind === "file" &&
                !item.indexedDbFileKey &&
                !item.dataUrl
        ).length,
        updatedAt: new Date().toISOString(),
    });

    return saved;
}

function clearPersistedBrowserSession() {
    Object.values(STORAGE_KEYS).forEach(removeStorageValue);
    Object.values(COOKIE_NAMES).forEach(deleteCookie);
    clearPlaylistFileBlobs();
}

function buildPersistenceInfo() {
    const playlist = readStorageJson(STORAGE_KEYS.playlist, []);
    const lastMedia = readPersistedLastMedia();
    const settings = readStorageJson(STORAGE_KEYS.settings, null);

    return {
        localStorageEnabled: storageAvailable(),
        settingsSaved: Boolean(settings),
        playlistCount: Array.isArray(playlist) ? playlist.length : 0,
        savedPlaylistFiles: Array.isArray(playlist)
            ? playlist.filter(
                (item) =>
                    item.kind === "file" &&
                    Boolean(item.indexedDbFileKey || item.dataUrl)
            ).length
            : 0,
        savedIndexedDbPlaylistFiles: Array.isArray(playlist)
            ? playlist.filter(
                (item) => item.kind === "file" && Boolean(item.indexedDbFileKey)
            ).length
            : 0,
        placeholderPlaylistFiles: Array.isArray(playlist)
            ? playlist.filter(
                (item) =>
                    item.kind === "file" &&
                    !item.indexedDbFileKey &&
                    !item.dataUrl
            ).length
            : 0,
        hasSavedCurrentAudio: Boolean(lastMedia?.dataUrl || lastMedia?.url),
        carPlaySafeMode: readPersistedCarPlaySafeMode(),
        lastMediaKind: lastMedia?.kind || "",
        lastMediaTitle: lastMedia?.title || "",
        storageBytes: getStoredItemSizeEstimate({
            settings,
            playlist,
            lastMedia,
        }),
    };
}


function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function numberOrDefault(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function sleep(ms) {
    const safeMs = Math.max(0, Number(ms) || 0);

    if (!safeMs) {
        return Promise.resolve();
    }

    return new Promise((resolve) => window.setTimeout(resolve, safeMs));
}

function limitSettingValue(key, value, fallback = DEFAULT_SETTINGS[key]) {
    const limit = HUMAN_SAFE_LIMITS[key];
    const safeNumber = numberOrDefault(value, fallback);

    if (!limit) {
        return safeNumber;
    }

    return clamp(safeNumber, limit.min, limit.max);
}

function getMixerPreset(key) {
    return MIXER_PRESETS.find((preset) => preset.key === key) || MIXER_PRESETS[0];
}

function normalizeSettings(value) {
    const merged = {
        ...DEFAULT_SETTINGS,
        ...(value || {}),
    };

    return {
        baseVolume: limitSettingValue("baseVolume", merged.baseVolume),

        clarityAmount: limitSettingValue("clarityAmount", merged.clarityAmount),
        demudAmount: limitSettingValue("demudAmount", merged.demudAmount),
        deEssAmount: limitSettingValue("deEssAmount", merged.deEssAmount),
        deEssFrequency: limitSettingValue("deEssFrequency", merged.deEssFrequency),

        lowGain: limitSettingValue("lowGain", merged.lowGain),
        midGain: limitSettingValue("midGain", merged.midGain),
        highGain: limitSettingValue("highGain", merged.highGain),
        highPass: limitSettingValue("highPass", merged.highPass),
        lowPass: limitSettingValue("lowPass", merged.lowPass),

        pan: limitSettingValue("pan", merged.pan),

        reverbMix: limitSettingValue("reverbMix", merged.reverbMix),
        reverbSeconds: limitSettingValue("reverbSeconds", merged.reverbSeconds),

        delayMix: limitSettingValue("delayMix", merged.delayMix),
        delayTime: limitSettingValue("delayTime", merged.delayTime),
        delayFeedback: limitSettingValue("delayFeedback", merged.delayFeedback),

        speed: limitSettingValue("speed", merged.speed),
        pitchSemitones: limitSettingValue("pitchSemitones", merged.pitchSemitones),

        distortionAmount: limitSettingValue("distortionAmount", merged.distortionAmount),
        bitcrusherWarmth: limitSettingValue("bitcrusherWarmth", merged.bitcrusherWarmth),
        bitcrusherVariance: limitSettingValue(
            "bitcrusherVariance",
            merged.bitcrusherVariance
        ),
        compressorThreshold: limitSettingValue(
            "compressorThreshold",
            merged.compressorThreshold
        ),
        compressorRatio: limitSettingValue("compressorRatio", merged.compressorRatio),
        outputGain: limitSettingValue("outputGain", merged.outputGain),
    };
}

function dbToGain(db) {
    return Math.pow(10, db / 20);
}

function createSoftDistortionCurve(amount = 0) {
    const drive = clamp(numberOrDefault(amount, 0), 0, 1);
    const sampleCount = 2048;
    const curve = new Float32Array(sampleCount);

    if (drive <= 0.001) {
        for (let index = 0; index < sampleCount; index += 1) {
            curve[index] = (index * 2) / sampleCount - 1;
        }

        return curve;
    }

    const k = 1 + drive * 18;
    const wet = clamp(drive * 0.42, 0, 0.42);

    for (let index = 0; index < sampleCount; index += 1) {
        const x = (index * 2) / sampleCount - 1;
        const shaped = ((1 + k) * x) / (1 + k * Math.abs(x));
        const warmSaturation = Math.tanh(x * (1.04 + drive * 1.65));
        const colored = shaped * 0.56 + warmSaturation * 0.44;

        curve[index] = clamp(x * (1 - wet) + colored * wet, -0.985, 0.985);
    }

    return curve;
}

function createWarmBitcrusherCurve(warmth = 0, variance = 0.12) {
    const warmAmount = clamp(numberOrDefault(warmth, 0), 0, 0.55);
    const varianceAmount = clamp(numberOrDefault(variance, 0.12), 0, 0.75);
    const sampleCount = 2048;
    const curve = new Float32Array(sampleCount);

    if (warmAmount <= 0.001) {
        for (let index = 0; index < sampleCount; index += 1) {
            curve[index] = (index * 2) / sampleCount - 1;
        }

        return curve;
    }

    const bitDepth = clamp(16 - warmAmount * 3.2 - varianceAmount * 0.9, 12, 16);
    const quantizeStep = 2 / Math.pow(2, bitDepth);
    const wet = clamp(warmAmount * 0.42, 0, 0.22);

    for (let index = 0; index < sampleCount; index += 1) {
        const x = (index * 2) / sampleCount - 1;
        const movingStep = quantizeStep * (1 + Math.sin(index * 0.041) * varianceAmount * 0.08);
        const quantized = Math.round(x / movingStep) * movingStep;
        const rounded = Math.tanh(quantized * (1.03 + warmAmount * 0.45));

        curve[index] = clamp(x * (1 - wet) + rounded * wet, -0.985, 0.985);
    }

    return curve;
}

function applyWaveShaperCurve(node, curve) {
    if (!node) return;

    node.curve = curve;
    node.oversample = "2x";
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getReadableBytes(size) {
    const bytes = Number(size);

    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
        units.length - 1,
        Math.floor(Math.log(bytes) / Math.log(1024))
    );

    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${
        units[index]
    }`;
}

function getAudioContextClass() {
    return window.AudioContext || window.webkitAudioContext;
}

function getOfflineAudioContextClass() {
    return window.OfflineAudioContext || window.webkitOfflineAudioContext;
}

function isIOSAudioDevice() {
    if (typeof navigator === "undefined") {
        return false;
    }

    const platform = navigator.platform || "";
    const userAgent = navigator.userAgent || "";
    const touchCapableMac =
        platform === "MacIntel" &&
        typeof navigator.maxTouchPoints === "number" &&
        navigator.maxTouchPoints > 1;

    return /iPhone|iPad|iPod/i.test(userAgent) || touchCapableMac;
}

async function unlockMobileAudioContext(context) {
    if (!context) return false;

    let unlocked = false;

    try {
        if (context.state !== "running") {
            await context.resume();
        }

        unlocked = context.state === "running";
    } catch {
        unlocked = false;
    }

    try {
        const sampleRate = context.sampleRate || 44100;
        const unlockBuffer = context.createBuffer(1, 1, sampleRate);
        const unlockSource = context.createBufferSource();
        const unlockGain = context.createGain();

        unlockGain.gain.value = 0.00001;
        unlockSource.buffer = unlockBuffer;

        unlockSource.connect(unlockGain);
        unlockGain.connect(context.destination);

        unlockSource.start(0);

        unlockSource.onended = () => {
            try {
                unlockSource.disconnect();
                unlockGain.disconnect();
            } catch {
                // Safe to ignore cleanup issues.
            }
        };

        if (context.state !== "running") {
            await context.resume();
        }

        unlocked = context.state === "running" || unlocked;
    } catch {
        // Some browsers do not need the silent unlock source.
    }

    return unlocked || context.state === "running";
}

async function unlockOutputAudioElement(audioElement) {
    if (!audioElement) return false;

    try {
        audioElement.muted = false;
        audioElement.volume = 1;
        audioElement.playsInline = true;
        audioElement.autoplay = false;

        const playPromise = audioElement.play();

        if (playPromise && typeof playPromise.then === "function") {
            await playPromise;
        }

        return true;
    } catch {
        return false;
    }
}

function buildMobileAudioHint() {
    if (!isIOSAudioDevice()) {
        return "Make sure your device volume is up and then tap Play again.";
    }

    return "On iPhone, turn the side volume up, make sure the browser is not routed to AirPods, Bluetooth, CarPlay, or AirPlay, and tap Play again. Web apps cannot force speaker output; iOS plays through the currently selected output.";
}

function setAudioParam(param, value, time, rampSeconds = 0) {
    if (!param) return;

    const safeTime = Number.isFinite(time) ? time : 0;
    const safeRamp = Math.max(0, Number(rampSeconds) || 0);

    try {
        if (
            safeRamp > 0 &&
            typeof param.cancelScheduledValues === "function" &&
            typeof param.setValueAtTime === "function" &&
            typeof param.linearRampToValueAtTime === "function"
        ) {
            const currentValue = Number.isFinite(param.value) ? param.value : value;

            param.cancelScheduledValues(safeTime);
            param.setValueAtTime(currentValue, safeTime);
            param.linearRampToValueAtTime(value, safeTime + safeRamp);
            return;
        }

        param.setValueAtTime(value, safeTime);
    } catch {
        try {
            param.value = value;
        } catch {
            // Some AudioParams can become unavailable during iOS route changes.
        }
    }
}

function getCarPlaySafeSettings(rawSettings) {
    const settings = normalizeSettings(rawSettings);

    return {
        ...settings,
        baseVolume: Math.min(settings.baseVolume, 1),
        pan: 0,
        reverbMix: Math.min(settings.reverbMix, 0.24),
        reverbSeconds: Math.min(settings.reverbSeconds, 2.8),
        delayMix: Math.min(settings.delayMix, 0.14),
        delayFeedback: Math.min(settings.delayFeedback, 0.28),
        highPass: Math.max(settings.highPass, 28),
        lowPass: Math.min(settings.lowPass, 18000),
        distortionAmount: Math.min(settings.distortionAmount, 0.18),
        bitcrusherWarmth: Math.min(settings.bitcrusherWarmth, 0.18),
        bitcrusherVariance: Math.min(settings.bitcrusherVariance, 0.28),
        compressorThreshold: Math.min(settings.compressorThreshold, -18),
        compressorRatio: Math.max(settings.compressorRatio, 2.8),
        outputGain: Math.min(settings.outputGain, -1),
    };
}

function buildCarPlaySafeModeLabel(enabled) {
    return enabled
        ? "CarPlay / USB safe mode is ON. The player keeps the same unlocked iOS audio route alive, smooths effect changes, centers pan, and caps wet effects/output so wired CarPlay does not hear effects jumping in and out."
        : "CarPlay / USB safe mode is OFF. Full effects stay live, but wired iPhone/CarPlay route changes may be less stable.";
}

function semitonesToCents(semitones) {
    return clamp(numberOrDefault(semitones, 0), -24, 24) * 100;
}

function getEffectivePlaybackRate(settings) {
    const safeSettings = normalizeSettings(settings);
    const detuneCents = semitonesToCents(safeSettings.pitchSemitones);

    return safeSettings.speed * Math.pow(2, detuneCents / 1200);
}

function getLowerName(value) {
    return String(value || "").trim().toLowerCase();
}

function getFileExtension(fileName) {
    const cleanName = String(fileName || "").split("?")[0].split("#")[0];
    const lastDot = cleanName.lastIndexOf(".");

    if (lastDot < 0) {
        return "";
    }

    return cleanName.slice(lastDot).toLowerCase();
}

function getUrlPathname(urlValue) {
    try {
        const parsed = new URL(urlValue);
        return parsed.pathname || "";
    } catch {
        return String(urlValue || "");
    }
}

function hasAnyExtension(value, extensions) {
    const lower = getLowerName(getUrlPathname(value).split("?")[0].split("#")[0]);
    return extensions.some((extension) => lower.endsWith(extension));
}

function isStreamingManifestUrl(urlValue) {
    return hasAnyExtension(urlValue, STREAMING_MANIFEST_EXTENSIONS);
}

function isLikelyMediaUrl(urlValue) {
    const lower = getLowerName(urlValue);

    if (
        lower.startsWith("blob:") ||
        lower.startsWith("data:audio/") ||
        lower.startsWith("data:video/")
    ) {
        return true;
    }

    return hasAnyExtension(urlValue, MEDIA_EXTENSION_HINTS);
}

function isAppleMobileDevice() {
    if (typeof navigator === "undefined") {
        return false;
    }

    const platform = navigator.platform || "";
    const userAgent = navigator.userAgent || "";
    const touchCapableMac =
        platform === "MacIntel" &&
        typeof navigator.maxTouchPoints === "number" &&
        navigator.maxTouchPoints > 1;

    return /iPhone|iPad|iPod/i.test(userAgent) || touchCapableMac;
}

function isLikelySupportedPickedFile(file) {
    if (!file) return false;

    const type = String(file.type || "").toLowerCase();

    if (type.startsWith("audio/") || type.startsWith("video/")) {
        return true;
    }

    return MEDIA_EXTENSION_HINTS.includes(getFileExtension(file.name));
}

function buildPickedFileInfo(file, sourceLabel = "Upload media file") {
    const pieces = [];

    if (sourceLabel) pieces.push(sourceLabel);
    pieces.push(file?.type || "unknown MIME type");
    pieces.push(getReadableBytes(file?.size || 0));

    if (file?.lastModified) {
        try {
            pieces.push(`modified ${new Date(file.lastModified).toLocaleDateString()}`);
        } catch {
            // Ignore date formatting issues.
        }
    }

    return pieces.join(" • ");
}

function buildPickedFileWarning(file) {
    if (!file) return "";

    if (file.size === 0) {
        return "The selected file is empty. If this came from iPhone Files, iCloud Drive, Google Drive, Proton Drive, Dropbox, or another cloud provider, open the file in that app first so it downloads locally, then select it again with Upload media file.";
    }

    if (!isLikelySupportedPickedFile(file)) {
        return "This selected file does not look like a common browser-decodable audio/video file. You can still try it, but MP3, WAV, M4A, MP4, MOV, WebM, OGG/Opus, AAC, CAF, and FLAC usually work best.";
    }

    return "";
}

function validateDirectMediaUrl(urlValue) {
    const cleanUrl = String(urlValue || "").trim();

    if (!cleanUrl) {
        throw new Error("Paste a direct media URL first.");
    }

    if (isStreamingManifestUrl(cleanUrl)) {
        throw new Error(
            "This looks like an HLS/DASH streaming manifest. Use a direct decodable media file such as .mp3, .wav, .m4a, .mp4, .mov, .webm, or .ogg."
        );
    }

    if (cleanUrl.startsWith("blob:") || cleanUrl.startsWith("data:")) {
        return cleanUrl;
    }

    let parsed;

    try {
        parsed = new URL(cleanUrl);
    } catch {
        throw new Error("The media link is not a valid URL.");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error(
            "Only http, https, blob, and data media URLs can be loaded in this browser tool."
        );
    }

    return cleanUrl;
}

function getByteString(bytes, start, end) {
    let value = "";

    for (let i = start; i < end && i < bytes.length; i += 1) {
        value += String.fromCharCode(bytes[i]);
    }

    return value;
}

function describeMediaBytes(arrayBuffer) {
    const bytes = new Uint8Array(
        arrayBuffer.slice(0, Math.min(arrayBuffer.byteLength, 64))
    );

    if (bytes.length < 4) {
        return "unknown/empty";
    }

    const first4 = getByteString(bytes, 0, 4);
    const first3 = getByteString(bytes, 0, 3);
    const ftyp = getByteString(bytes, 4, 8);
    const brand = getByteString(bytes, 8, 12);

    if (first3 === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) {
        return "mp3";
    }

    if (first4 === "RIFF" && getByteString(bytes, 8, 12) === "WAVE") {
        return "wav";
    }

    if (first4 === "OggS") {
        return "ogg/opus";
    }

    if (
        bytes[0] === 0x1a &&
        bytes[1] === 0x45 &&
        bytes[2] === 0xdf &&
        bytes[3] === 0xa3
    ) {
        return "webm/ebml";
    }

    if (ftyp === "ftyp") {
        const mp4Brands = [
            "M4A ",
            "M4B ",
            "M4P ",
            "isom",
            "iso2",
            "mp41",
            "mp42",
            "avc1",
            "dash",
            "MSNV",
            "qt  ",
        ];

        if (mp4Brands.includes(brand)) {
            return "mp4/m4a/mov container";
        }

        return `mp4-like container (${brand.trim() || "unknown brand"})`;
    }

    if (first4 === "fLaC") {
        return "flac";
    }

    if (
        first4.trim().startsWith("<") ||
        getByteString(bytes, 0, 16).toLowerCase().includes("<!doctype")
    ) {
        return "html";
    }

    return "unknown media bytes";
}

function buildDecodeFailureMessage(error, metadata, byteDescription) {
    const name = metadata?.name ? ` "${metadata.name}"` : "";
    const contentType = metadata?.contentType
        ? ` Content-Type: ${metadata.contentType}.`
        : "";
    const detected = byteDescription ? ` Detected bytes: ${byteDescription}.` : "";
    const providerHint = metadata?.providerHint
        ? ` Source: ${metadata.providerHint}.`
        : "";

    if (byteDescription === "html") {
        return `The link/file returned HTML instead of raw media${name}.${contentType}${providerHint} Use a direct .mp3, .wav, .m4a, .mp4, .mov, .webm, or .ogg file URL.`;
    }

    return `Could not decode audio${name}.${contentType}${detected}${providerHint} The browser may not support this codec/container, the file may be encrypted/DRM-protected, the cloud file may not be downloaded locally yet, or the URL may not be a direct media file. ${
        error?.message || ""
    }`.trim();
}

function normalizeRecoverableMediaUrl(urlValue) {
    const cleanUrl = validateDirectMediaUrl(urlValue);

    if (cleanUrl.startsWith("blob:") || cleanUrl.startsWith("data:")) {
        return cleanUrl;
    }

    try {
        const parsed = new URL(cleanUrl);

        // URL.toString() safely escapes spaces and special path characters that
        // commonly appear in Archive.org and direct download links.
        return parsed.toString();
    } catch {
        return cleanUrl;
    }
}

function isAbortLikeError(error) {
    const message = String(error?.message || error || "").toLowerCase();
    return error?.name === "AbortError" || message.includes("abort");
}

function isCorsLikeError(error) {
    const message = String(error?.message || error || "").toLowerCase();

    return (
        message.includes("failed to fetch") ||
        message.includes("networkerror") ||
        message.includes("cors") ||
        message.includes("cross-origin")
    );
}

async function fetchWithTimeout(urlValue, fetchOptions, timeoutMs) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    let timeoutId = null;

    if (controller) {
        timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    }

    try {
        return await fetch(urlValue, {
            ...fetchOptions,
            signal: controller?.signal,
        });
    } finally {
        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }
    }
}

function buildFetchFailureMessage(urlValue, lastError, attempts) {
    const reason = lastError?.message || String(lastError || "unknown error");

    if (isAbortLikeError(lastError)) {
        return `The media URL timed out after ${attempts} attempt${
            attempts === 1 ? "" : "s"
        }. The server may be slow or refusing range/full-file downloads: ${urlValue}`;
    }

    if (isCorsLikeError(lastError)) {
        return `The browser could not fetch this media URL after ${attempts} attempt${
            attempts === 1 ? "" : "s"
        }. It is probably CORS-blocked, not a direct file, offline, or requires authentication: ${urlValue}`;
    }

    return `The browser could not load this media URL after ${attempts} attempt${
        attempts === 1 ? "" : "s"
    }: ${reason}`;
}

async function fetchDirectMediaArrayBuffer(urlValue, options = {}) {
    const cleanUrl = normalizeRecoverableMediaUrl(urlValue);
    const fetchCandidates = buildMediaFetchCandidates(cleanUrl);
    const retryDelays = Array.isArray(options.retryDelaysMs)
        ? options.retryDelaysMs
        : PLAYLIST_RECOVERY_SETTINGS.retryDelaysMs;
    const cacheModes = Array.isArray(options.cacheModes)
        ? options.cacheModes
        : PLAYLIST_RECOVERY_SETTINGS.fetchCacheModes;
    const timeoutMs = Number(options.timeoutMs) || PLAYLIST_RECOVERY_SETTINGS.fetchTimeoutMs;

    let lastError = null;
    let attempts = 0;
    let usedProxyFallback = false;
    let lastFetchUrl = cleanUrl;
    let lastFetchLabel = "direct media URL";

    for (const candidate of fetchCandidates) {
        // Try the original URL once. If it fails and this is an Archive.org URL,
        // immediately fall back to the scrapewebsite Pages Function proxy.
        const candidateRetryDelays = candidate.usingProxy ? retryDelays : [0];

        for (
            let attemptIndex = 0;
            attemptIndex < candidateRetryDelays.length;
            attemptIndex += 1
        ) {
            const delay = candidateRetryDelays[attemptIndex];

            if (delay) {
                await sleep(delay);
            }

            const cacheMode =
                cacheModes[Math.min(attemptIndex, cacheModes.length - 1)] || "no-store";
            attempts += 1;
            lastFetchUrl = candidate.url;
            lastFetchLabel = candidate.label;
            usedProxyFallback = usedProxyFallback || candidate.usingProxy;

            try {
                const response = await fetchWithTimeout(
                    candidate.url,
                    {
                        method: "GET",
                        mode: "cors",
                        credentials: "omit",
                        cache: cacheMode,
                        redirect: "follow",
                    },
                    timeoutMs
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const contentType = response.headers.get("content-type") || "";

                if (contentType.toLowerCase().includes("text/html")) {
                    throw new Error(
                        "The URL returned an HTML page instead of a direct media file."
                    );
                }

                const arrayBuffer = await response.arrayBuffer();

                if (!arrayBuffer || arrayBuffer.byteLength < 8) {
                    throw new Error(
                        "The downloaded media file is empty or too small to decode."
                    );
                }

                return {
                    arrayBuffer,
                    metadata: {
                        name: cleanUrl,
                        fetchUrl: candidate.url,
                        fetchLabel: candidate.label,
                        sourceType: "url",
                        contentType,
                        byteLength: arrayBuffer.byteLength,
                        likelyMedia: isLikelyMediaUrl(cleanUrl),
                        fetchAttempts: attempts,
                        fetchCacheMode: cacheMode,
                        usedProxyFallback: candidate.usingProxy,
                        providerHint: candidate.usingProxy
                            ? "Loaded through the scrapewebsite Cloudflare Pages Archive proxy after the direct URL failed."
                            : "",
                    },
                };
            } catch (error) {
                lastError = error;

                // Direct Archive URL failed once. Move to the proxy candidate instead
                // of wasting all retries on a browser-CORS-blocked direct request.
                if (!candidate.usingProxy && fetchCandidates.length > 1) {
                    break;
                }
            }
        }
    }

    const fallbackNote = usedProxyFallback
        ? ` Last attempted through ${lastFetchLabel}: ${lastFetchUrl}.`
        : "";

    throw new Error(
        `${buildFetchFailureMessage(cleanUrl, lastError, attempts)}${fallbackNote}`
    );
}

async function readFileMediaArrayBuffer(file, sourceLabel = "Upload media file") {
    if (!file) {
        throw new Error("No file was selected.");
    }

    const arrayBuffer = await file.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength < 8) {
        throw new Error(
            "The selected file is empty or too small to decode. If it came from iPhone Files, On My iPhone, iCloud Drive, Google Drive, Proton Drive, Dropbox, or another cloud provider, open the file in that app first so it downloads locally, then select it again with Upload media file."
        );
    }

    return {
        arrayBuffer,
        metadata: {
            name: file.name,
            sourceType: "file",
            contentType: file.type || "",
            byteLength: file.size || arrayBuffer.byteLength,
            likelyMedia: isLikelySupportedPickedFile(file),
            providerHint: sourceLabel,
        },
    };
}

async function decodeAudioBufferFromArrayBuffer(arrayBuffer, metadata) {
    const AudioContextClass = getAudioContextClass();

    if (!AudioContextClass) {
        throw new Error("This browser does not support the Web Audio API.");
    }

    const byteDescription = describeMediaBytes(arrayBuffer);

    if (byteDescription === "html") {
        throw new Error(buildDecodeFailureMessage(null, metadata, byteDescription));
    }

    const decodeContext = new AudioContextClass();

    try {
        return await decodeContext.decodeAudioData(arrayBuffer.slice(0));
    } catch (error) {
        throw new Error(buildDecodeFailureMessage(error, metadata, byteDescription));
    } finally {
        decodeContext.close().catch(() => {});
    }
}

async function decodeAudioBufferWithRecovery(arrayBuffer, metadata, options = {}) {
    const retryDelays = Array.isArray(options.retryDelaysMs)
        ? options.retryDelaysMs
        : PLAYLIST_RECOVERY_SETTINGS.decodeRetryDelaysMs;

    let lastError = null;

    for (let attemptIndex = 0; attemptIndex < retryDelays.length; attemptIndex += 1) {
        const delay = retryDelays[attemptIndex];

        if (delay) {
            await sleep(delay);
        }

        try {
            return await decodeAudioBufferFromArrayBuffer(arrayBuffer, {
                ...(metadata || {}),
                decodeAttempt: attemptIndex + 1,
            });
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("The browser could not decode this media source.");
}

function getMediaDisplayTitle(
    inputFile,
    sourceKind,
    sourceUrl,
    preferredTitle = ""
) {
    if (inputFile?.name) {
        return inputFile.name;
    }

    if (sourceKind === "url" && sourceUrl) {
        return normalizePlaylistUrlTitle(preferredTitle, sourceUrl);
    }

    return "Decoded audio buffer";
}

function buildAbsoluteMediaAssetUrl(assetPath) {
    const cleanPath = String(assetPath || "").trim();

    if (!cleanPath) {
        return "";
    }

    if (/^(https?:|data:|blob:)/i.test(cleanPath)) {
        return cleanPath;
    }

    if (typeof window === "undefined" || !window.location?.origin) {
        return cleanPath;
    }

    try {
        return new URL(cleanPath, window.location.origin).toString();
    } catch {
        return cleanPath;
    }
}

function getArchiveIdentifierFromMediaUrl(urlValue) {
    const cleanUrl = getCanonicalArchiveMediaUrl(urlValue);

    if (!cleanUrl) {
        return "";
    }

    try {
        const parsed = new URL(cleanUrl);
        const host = parsed.hostname.toLowerCase();
        const parts = parsed.pathname.split("/").filter(Boolean);

        if (!isArchiveMediaHost(host) || !parts.length) {
            return "";
        }

        if (
            (host === "archive.org" || host === "www.archive.org") &&
            ["download", "serve", "details"].includes(parts[0]) &&
            parts[1]
        ) {
            return parts[1];
        }

        if (/^ia\d+\.us\.archive\.org$/.test(host)) {
            return parts[0] || "";
        }

        return "";
    } catch {
        return "";
    }
}

function buildArchiveArtworkUrl(identifier) {
    const cleanIdentifier = String(identifier || "").trim();

    if (!cleanIdentifier) {
        return "";
    }

    return `https://archive.org/services/img/${encodeURIComponent(cleanIdentifier)}`;
}

function inferPlaylistItemArtworkSource(item) {
    if (!item || typeof item !== "object") {
        return "";
    }

    const archiveIdentifier =
        item.archiveIdentifier ||
        getArchiveIdentifierFromMediaUrl(item.directArchiveUrl) ||
        getArchiveIdentifierFromMediaUrl(item.archiveServeUrl) ||
        getArchiveIdentifierFromMediaUrl(item.archiveDownloadUrl) ||
        getArchiveIdentifierFromMediaUrl(item.proxiedArchiveUrl) ||
        getArchiveIdentifierFromMediaUrl(item.url);

    return buildArchiveArtworkUrl(archiveIdentifier);
}

function getPlaylistItemArtworkSource(item) {
    if (!item || typeof item !== "object") {
        return "";
    }

    const candidates = [
        item.artworkUrl,
        item.archiveArtworkUrl,
        item.artwork,
        item.coverUrl,
        item.cover,
        item.imageUrl,
        item.image,
        item.thumbnailUrl,
        item.thumbnail,
        item.posterUrl,
        item.poster,
    ];

    return String(candidates.find(Boolean) || inferPlaylistItemArtworkSource(item) || "").trim();
}

function createGeneratedMediaSessionArtwork(title, size = 512) {
    if (typeof document === "undefined") {
        return "";
    }

    try {
        const canvas = document.createElement("canvas");
        const safeSize = Math.max(128, Math.min(1024, Number(size) || 512));
        const safeTitle = String(title || "AudioMaster Lab").trim() || "AudioMaster Lab";

        canvas.width = safeSize;
        canvas.height = safeSize;

        const context = canvas.getContext("2d");

        if (!context) {
            return "";
        }

        const gradient = context.createLinearGradient(0, 0, safeSize, safeSize);
        gradient.addColorStop(0, "#070a13");
        gradient.addColorStop(0.42, "#12314a");
        gradient.addColorStop(1, "#2d1b55");

        context.fillStyle = gradient;
        context.fillRect(0, 0, safeSize, safeSize);

        context.save();
        context.globalAlpha = 0.22;
        context.strokeStyle = "#67e8f9";
        context.lineWidth = Math.max(2, safeSize * 0.012);

        for (let i = 0; i < 9; i += 1) {
            const y = safeSize * (0.18 + i * 0.075);
            context.beginPath();

            for (let x = -20; x <= safeSize + 20; x += 18) {
                const wave = Math.sin((x / safeSize) * Math.PI * 3 + i) * safeSize * 0.026;
                const nextY = y + wave;

                if (x <= -20) {
                    context.moveTo(x, nextY);
                } else {
                    context.lineTo(x, nextY);
                }
            }

            context.stroke();
        }

        context.restore();

        context.fillStyle = "rgba(255,255,255,0.94)";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = `900 ${Math.floor(safeSize * 0.095)}px system-ui, -apple-system, Segoe UI, sans-serif`;
        context.fillText("AudioMaster", safeSize / 2, safeSize * 0.34);

        context.font = `800 ${Math.floor(safeSize * 0.062)}px system-ui, -apple-system, Segoe UI, sans-serif`;
        context.fillStyle = "rgba(103,232,249,0.95)";
        context.fillText("LAB", safeSize / 2, safeSize * 0.44);

        context.fillStyle = "rgba(255,255,255,0.88)";
        context.font = `700 ${Math.floor(safeSize * 0.045)}px system-ui, -apple-system, Segoe UI, sans-serif`;

        const words = safeTitle.replace(/\.[a-z0-9]{2,6}$/i, "").split(/\s+/).filter(Boolean);
        const lines = [];
        let line = "";
        const maxWidth = safeSize * 0.78;

        words.forEach((word) => {
            const nextLine = line ? `${line} ${word}` : word;

            if (context.measureText(nextLine).width <= maxWidth || !line) {
                line = nextLine;
            } else {
                lines.push(line);
                line = word;
            }
        });

        if (line) {
            lines.push(line);
        }

        lines.slice(0, 3).forEach((lineText, index) => {
            context.fillText(lineText, safeSize / 2, safeSize * (0.62 + index * 0.07));
        });

        return canvas.toDataURL("image/png");
    } catch {
        return "";
    }
}

function getMediaSessionArtwork(title, activeItem) {
    const itemArtwork = buildAbsoluteMediaAssetUrl(getPlaylistItemArtworkSource(activeItem));
    const generated512 = createGeneratedMediaSessionArtwork(title, 512);
    const generated192 = createGeneratedMediaSessionArtwork(title, 192);

    return [
        itemArtwork
            ? {
                src: itemArtwork,
                sizes: "512x512",
                type: itemArtwork.startsWith("data:image/")
                    ? itemArtwork.slice(5, itemArtwork.indexOf(";") > 0 ? itemArtwork.indexOf(";") : undefined)
                    : "image/png",
            }
            : null,
        generated512
            ? {
                src: generated512,
                sizes: "512x512",
                type: "image/png",
            }
            : null,
        generated192
            ? {
                src: generated192,
                sizes: "192x192",
                type: "image/png",
            }
            : null,
        {
            src: buildAbsoluteMediaAssetUrl("/logo512.png"),
            sizes: "512x512",
            type: "image/png",
        },
        {
            src: buildAbsoluteMediaAssetUrl("/social-preview.png"),
            sizes: "512x512",
            type: "image/png",
        },
        {
            src: buildAbsoluteMediaAssetUrl("/logo192.png"),
            sizes: "192x192",
            type: "image/png",
        },
    ].filter((artwork) => artwork?.src);
}

function getPlayerDisplayArtworkSource(title, activeItem) {
    return (
        buildAbsoluteMediaAssetUrl(getPlaylistItemArtworkSource(activeItem)) ||
        createGeneratedMediaSessionArtwork(title, 512) ||
        buildAbsoluteMediaAssetUrl("/logo512.png") ||
        buildAbsoluteMediaAssetUrl("/social-preview.png") ||
        ""
    );
}

function drawRoundedCanvasRect(context, x, y, width, height, radius) {
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

function wrapCanvasText(context, text, maxWidth) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";

    words.forEach((word) => {
        const nextLine = line ? `${line} ${word}` : word;
        const nextWidth = context.measureText(nextLine).width;

        if (nextWidth <= maxWidth || !line) {
            line = nextLine;
        } else {
            lines.push(line);
            line = word;
        }
    });

    if (line) {
        lines.push(line);
    }

    return lines.length ? lines : [String(text || "")];
}

function drawCanvasLabel(context, text, canvasWidth, canvasHeight) {
    const paddingFromBorder = 18;
    const x = paddingFromBorder;
    const y = paddingFromBorder;
    const maxWidth = Math.max(120, canvasWidth - paddingFromBorder * 2);

    let fontSize = 12;
    context.font = `800 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;

    while (fontSize > 9 && context.measureText(text).width > maxWidth - 24) {
        fontSize -= 1;
        context.font = `800 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
    }

    let lines = [text];

    if (context.measureText(text).width > maxWidth - 24) {
        lines = wrapCanvasText(context, text, maxWidth - 24);
    }

    const lineHeight = fontSize + 4;
    const textWidths = lines.map((line) => context.measureText(line).width);
    const labelWidth = Math.min(maxWidth, Math.max(...textWidths, 1) + 24);
    const labelHeight = Math.min(
        canvasHeight - paddingFromBorder * 2,
        lines.length * lineHeight + 12
    );

    context.save();

    context.fillStyle = "rgba(7,10,19,0.78)";
    context.strokeStyle = "rgba(103,232,249,0.22)";
    context.lineWidth = 1;

    context.shadowColor = "rgba(0,0,0,0.42)";
    context.shadowBlur = 18;
    context.shadowOffsetY = 8;

    drawRoundedCanvasRect(context, x, y, labelWidth, labelHeight, 12);
    context.fill();

    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    context.stroke();

    context.fillStyle = "rgba(255,255,255,0.9)";
    context.shadowColor = "rgba(103,232,249,0.28)";
    context.shadowBlur = 8;
    context.font = `800 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;

    lines.forEach((line, index) => {
        const textY = y + 18 + index * lineHeight;

        if (textY < y + labelHeight - 2) {
            context.fillText(line, x + 12, textY);
        }
    });

    context.restore();
}

function createImpulseResponse(context, seconds, decay = 2.8) {
    const safeSeconds = clamp(numberOrDefault(seconds, 1.8), 0.15, 6);
    const sampleRate = context.sampleRate || 44100;
    const length = Math.max(1, Math.floor(sampleRate * safeSeconds));
    const impulse = context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const data = impulse.getChannelData(channel);

        for (let i = 0; i < length; i += 1) {
            const progress = i / length;
            const envelope = Math.pow(1 - progress, decay);
            data[i] = (Math.random() * 2 - 1) * envelope;
        }
    }

    return impulse;
}

function createPannerStage(context) {
    if (context.createStereoPanner) {
        const panner = context.createStereoPanner();

        return {
            kind: "stereo",
            node: panner,
        };
    }

    const panner = context.createPanner();

    panner.panningModel = "equalpower";
    panner.distanceModel = "linear";
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 0;

    return {
        kind: "3d",
        node: panner,
    };
}

function applyPanner(nodes, pan, currentTime) {
    if (!nodes?.pannerNode) return;

    const safePan = clamp(numberOrDefault(pan, 0), -1, 1);

    if (nodes.pannerKind === "stereo" && nodes.pannerNode.pan) {
        setAudioParam(nodes.pannerNode.pan, safePan, currentTime);
        return;
    }

    const x = safePan;
    const y = 0;
    const z = 1 - Math.abs(safePan) * 0.2;

    if (nodes.pannerNode.positionX) {
        setAudioParam(nodes.pannerNode.positionX, x, currentTime);
        setAudioParam(nodes.pannerNode.positionY, y, currentTime);
        setAudioParam(nodes.pannerNode.positionZ, z, currentTime);
    } else if (nodes.pannerNode.setPosition) {
        nodes.pannerNode.setPosition(x, y, z);
    }
}

function applySourcePlaybackSettings(source, settings, currentTime) {
    if (!source) return;

    const safeSettings = normalizeSettings(settings);
    const detuneCents = semitonesToCents(safeSettings.pitchSemitones);
    const effectiveRate = getEffectivePlaybackRate(safeSettings);

    if (source.detune) {
        setAudioParam(source.playbackRate, safeSettings.speed, currentTime);
        setAudioParam(source.detune, detuneCents, currentTime);
    } else {
        setAudioParam(source.playbackRate, effectiveRate, currentTime);
    }
}

function applySettingsToNodes(nodes, rawSettings, currentTime) {
    if (!nodes) return;

    const settings = nodes.carPlaySafeMode
        ? getCarPlaySafeSettings(rawSettings)
        : normalizeSettings(rawSettings);
    const smoothingSeconds =
        nodes.carPlaySafeMode || isIOSAudioDevice()
            ? IOS_STREAM_EFFECT_SMOOTH_SECONDS
            : STREAM_EFFECT_SMOOTH_SECONDS;

    setAudioParam(
        nodes.baseVolumeGain.gain,
        settings.baseVolume,
        currentTime,
        smoothingSeconds
    );

    setAudioParam(
        nodes.demudHighPass.frequency,
        35 + settings.demudAmount * 95,
        currentTime,
        smoothingSeconds
    );
    setAudioParam(nodes.demudHighPass.Q, 0.7, currentTime, smoothingSeconds);

    setAudioParam(nodes.demudCut.frequency, 260, currentTime, smoothingSeconds);
    setAudioParam(nodes.demudCut.Q, 1.05 + settings.demudAmount * 0.6, currentTime, smoothingSeconds);
    setAudioParam(nodes.demudCut.gain, -9 * settings.demudAmount, currentTime, smoothingSeconds);

    setAudioParam(nodes.clarityBodyCut.frequency, 430, currentTime, smoothingSeconds);
    setAudioParam(nodes.clarityBodyCut.Q, 0.9, currentTime, smoothingSeconds);
    setAudioParam(nodes.clarityBodyCut.gain, -2.5 * settings.clarityAmount, currentTime, smoothingSeconds);

    setAudioParam(nodes.clarityPresence.frequency, 3200, currentTime, smoothingSeconds);
    setAudioParam(nodes.clarityPresence.Q, 0.85, currentTime, smoothingSeconds);
    setAudioParam(nodes.clarityPresence.gain, 4.5 * settings.clarityAmount, currentTime, smoothingSeconds);

    setAudioParam(nodes.clarityAir.frequency, 9500, currentTime, smoothingSeconds);
    setAudioParam(nodes.clarityAir.Q, 0.7, currentTime, smoothingSeconds);
    setAudioParam(nodes.clarityAir.gain, 5 * settings.clarityAmount, currentTime, smoothingSeconds);

    setAudioParam(nodes.deEsserCut.frequency, settings.deEssFrequency, currentTime, smoothingSeconds);
    setAudioParam(nodes.deEsserCut.Q, 3.5 + settings.deEssAmount * 4, currentTime, smoothingSeconds);
    setAudioParam(nodes.deEsserCut.gain, -11 * settings.deEssAmount, currentTime, smoothingSeconds);

    setAudioParam(nodes.highPass.frequency, settings.highPass, currentTime, smoothingSeconds);
    setAudioParam(nodes.highPass.Q, 0.7, currentTime, smoothingSeconds);

    setAudioParam(nodes.lowShelf.frequency, 120, currentTime, smoothingSeconds);
    setAudioParam(nodes.lowShelf.gain, settings.lowGain, currentTime, smoothingSeconds);

    setAudioParam(nodes.midPeak.frequency, 1000, currentTime, smoothingSeconds);
    setAudioParam(nodes.midPeak.Q, 1.1, currentTime, smoothingSeconds);
    setAudioParam(nodes.midPeak.gain, settings.midGain, currentTime, smoothingSeconds);

    setAudioParam(nodes.highShelf.frequency, 8500, currentTime, smoothingSeconds);
    setAudioParam(nodes.highShelf.gain, settings.highGain, currentTime, smoothingSeconds);

    setAudioParam(nodes.lowPass.frequency, settings.lowPass, currentTime, smoothingSeconds);
    setAudioParam(nodes.lowPass.Q, 0.7, currentTime, smoothingSeconds);

    applyWaveShaperCurve(
        nodes.distortionNode,
        createSoftDistortionCurve(settings.distortionAmount)
    );
    applyWaveShaperCurve(
        nodes.bitcrusherNode,
        createWarmBitcrusherCurve(settings.bitcrusherWarmth, settings.bitcrusherVariance)
    );

    setAudioParam(nodes.compressor.threshold, settings.compressorThreshold, currentTime, smoothingSeconds);
    setAudioParam(nodes.compressor.knee, 14, currentTime, smoothingSeconds);
    setAudioParam(nodes.compressor.ratio, settings.compressorRatio, currentTime, smoothingSeconds);
    setAudioParam(nodes.compressor.attack, 0.012, currentTime, smoothingSeconds);
    setAudioParam(nodes.compressor.release, 0.28, currentTime, smoothingSeconds);

    setAudioParam(nodes.dryGain.gain, 1, currentTime, smoothingSeconds);

    if (nodes.context) {
        const impulseKey = `${Math.round(settings.reverbSeconds * 1000)}`;

        if (nodes.reverbImpulseKey !== impulseKey) {
            nodes.convolver.buffer = createImpulseResponse(
                nodes.context,
                settings.reverbSeconds
            );
            nodes.reverbImpulseKey = impulseKey;
        }
    }

    setAudioParam(nodes.reverbSendGain.gain, settings.reverbMix, currentTime, smoothingSeconds);
    setAudioParam(nodes.reverbReturnGain.gain, 0.55, currentTime, smoothingSeconds);

    setAudioParam(nodes.delayNode.delayTime, settings.delayTime, currentTime, smoothingSeconds);
    setAudioParam(nodes.delaySendGain.gain, settings.delayMix, currentTime, smoothingSeconds);
    setAudioParam(nodes.delayFeedbackGain.gain, settings.delayFeedback, currentTime, smoothingSeconds);
    setAudioParam(nodes.delayReturnGain.gain, 0.75, currentTime, smoothingSeconds);

    applyPanner(nodes, settings.pan, currentTime);

    setAudioParam(nodes.masterGain.gain, dbToGain(settings.outputGain), currentTime, smoothingSeconds);

    if (nodes.finalLimiter) {
        setAudioParam(nodes.finalLimiter.threshold, -5, currentTime, smoothingSeconds);
        setAudioParam(nodes.finalLimiter.knee, 18, currentTime, smoothingSeconds);
        setAudioParam(nodes.finalLimiter.ratio, 10, currentTime, smoothingSeconds);
        setAudioParam(nodes.finalLimiter.attack, 0.003, currentTime, smoothingSeconds);
        setAudioParam(nodes.finalLimiter.release, 0.18, currentTime, smoothingSeconds);
    }

    if (nodes.streamSafetyGain) {
        setAudioParam(
            nodes.streamSafetyGain.gain,
            STREAM_FINAL_CEILING_GAIN,
            currentTime,
            smoothingSeconds
        );
    }
}

function createProcessingGraph(context, destination, rawSettings, options = {}) {
    const carPlaySafeMode = Boolean(options.carPlaySafeMode);
    const settings = carPlaySafeMode
        ? getCarPlaySafeSettings(rawSettings)
        : normalizeSettings(rawSettings);

    const baseVolumeGain = context.createGain();

    const demudHighPass = context.createBiquadFilter();
    demudHighPass.type = "highpass";

    const demudCut = context.createBiquadFilter();
    demudCut.type = "peaking";

    const clarityBodyCut = context.createBiquadFilter();
    clarityBodyCut.type = "peaking";

    const clarityPresence = context.createBiquadFilter();
    clarityPresence.type = "peaking";

    const clarityAir = context.createBiquadFilter();
    clarityAir.type = "highshelf";

    const deEsserCut = context.createBiquadFilter();
    deEsserCut.type = "peaking";

    const highPass = context.createBiquadFilter();
    highPass.type = "highpass";

    const lowShelf = context.createBiquadFilter();
    lowShelf.type = "lowshelf";

    const midPeak = context.createBiquadFilter();
    midPeak.type = "peaking";

    const highShelf = context.createBiquadFilter();
    highShelf.type = "highshelf";

    const lowPass = context.createBiquadFilter();
    lowPass.type = "lowpass";

    const distortionNode = context.createWaveShaper();
    const bitcrusherNode = context.createWaveShaper();
    const compressor = context.createDynamicsCompressor();

    const dryGain = context.createGain();

    const reverbSendGain = context.createGain();
    const convolver = context.createConvolver();
    const reverbReturnGain = context.createGain();

    const delaySendGain = context.createGain();
    const delayNode = context.createDelay(4);
    const delayFeedbackGain = context.createGain();
    const delayReturnGain = context.createGain();

    const pannerInputGain = context.createGain();
    const pannerStage = createPannerStage(context);

    const masterGain = context.createGain();
    const finalLimiter = context.createDynamicsCompressor();
    const streamSafetyGain = context.createGain();

    const nodes = {
        context,

        baseVolumeGain,

        demudHighPass,
        demudCut,

        clarityBodyCut,
        clarityPresence,
        clarityAir,

        deEsserCut,

        highPass,
        lowShelf,
        midPeak,
        highShelf,
        lowPass,

        distortionNode,
        bitcrusherNode,
        compressor,

        dryGain,

        reverbSendGain,
        convolver,
        reverbReturnGain,
        reverbImpulseKey: "",

        delaySendGain,
        delayNode,
        delayFeedbackGain,
        delayReturnGain,

        pannerInputGain,
        pannerNode: pannerStage.node,
        pannerKind: pannerStage.kind,

        masterGain,
        finalLimiter,
        streamSafetyGain,

        carPlaySafeMode,
    };

    convolver.normalize = true;

    baseVolumeGain
        .connect(demudHighPass)
        .connect(demudCut)
        .connect(clarityBodyCut)
        .connect(clarityPresence)
        .connect(clarityAir)
        .connect(deEsserCut)
        .connect(highPass)
        .connect(lowShelf)
        .connect(midPeak)
        .connect(highShelf)
        .connect(lowPass)
        .connect(distortionNode)
        .connect(bitcrusherNode)
        .connect(compressor);

    compressor.connect(dryGain);
    dryGain.connect(pannerInputGain);

    compressor.connect(reverbSendGain);
    reverbSendGain.connect(convolver);
    convolver.connect(reverbReturnGain);
    reverbReturnGain.connect(pannerInputGain);

    compressor.connect(delaySendGain);
    delaySendGain.connect(delayNode);
    delayNode.connect(delayFeedbackGain);
    delayFeedbackGain.connect(delayNode);
    delayNode.connect(delayReturnGain);
    delayReturnGain.connect(pannerInputGain);

    pannerInputGain.connect(pannerStage.node);
    pannerStage.node.connect(masterGain);
    masterGain.connect(finalLimiter);
    finalLimiter.connect(streamSafetyGain);
    streamSafetyGain.connect(destination);

    applySettingsToNodes(nodes, settings, context.currentTime || 0);

    return nodes;
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

    let offset = 0;

    writeString(offset, "RIFF");
    offset += 4;

    view.setUint32(offset, 36 + dataSize, true);
    offset += 4;

    writeString(offset, "WAVE");
    offset += 4;

    writeString(offset, "fmt ");
    offset += 4;

    view.setUint32(offset, 16, true);
    offset += 4;

    view.setUint16(offset, 1, true);
    offset += 2;

    view.setUint16(offset, numberOfChannels, true);
    offset += 2;

    view.setUint32(offset, sampleRate, true);
    offset += 4;

    view.setUint32(offset, byteRate, true);
    offset += 4;

    view.setUint16(offset, blockAlign, true);
    offset += 2;

    view.setUint16(offset, 16, true);
    offset += 2;

    writeString(offset, "data");
    offset += 4;

    view.setUint32(offset, dataSize, true);
    offset += 4;

    const channelData = [];

    for (let channel = 0; channel < numberOfChannels; channel += 1) {
        channelData.push(audioBuffer.getChannelData(channel));
    }

    for (let i = 0; i < length; i += 1) {
        for (let channel = 0; channel < numberOfChannels; channel += 1) {
            const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            view.setInt16(offset, intSample, true);
            offset += 2;
        }
    }

    return new Blob([view], { type: "audio/wav" });
}

function getDownloadName(sourceKind, file) {
    if (sourceKind === "file" && file?.name) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        return `${cleanName}-mixed.wav`;
    }

    return "rendered-audio-mix.wav";
}


function makePlaylistId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildPlaylistItemFromFile(file) {
    return {
        id: makePlaylistId(),
        kind: "file",
        title: file?.name || "Untitled audio file",
        file,
        dataUrl: "",
        indexedDbFileKey: "",
        persistedIndexedDb: false,
        persistedDataUrl: false,
        needsReselect: false,
        storageNote: "",
        size: file?.size || 0,
        type: file?.type || "unknown MIME type",
        addedAt: new Date().toISOString(),
    };
}

function getPlaylistUrlTitle(urlValue, fallbackTitle = "Direct media link") {
    const canonicalUrl = getCanonicalArchiveMediaUrl(urlValue);

    try {
        const parsed = new URL(canonicalUrl);
        const lastPart = cleanMediaFileTitle(parsed.pathname);

        if (lastPart && !isPlaceholderProxyTitle(lastPart)) {
            return lastPart;
        }

        return parsed.hostname || fallbackTitle;
    } catch {
        const cleanTitle = cleanMediaFileTitle(canonicalUrl || urlValue);

        if (cleanTitle && !isPlaceholderProxyTitle(cleanTitle)) {
            return cleanTitle.slice(0, 120);
        }

        return String(fallbackTitle || "Direct media link").slice(0, 120);
    }
}

function normalizePlaylistUrlTitle(titleValue, urlValue, archiveFileName = "") {
    const archiveTitle = cleanMediaFileTitle(archiveFileName);
    const currentTitle = String(titleValue || "").trim();

    if (currentTitle && !isPlaceholderProxyTitle(currentTitle)) {
        return currentTitle;
    }

    if (archiveTitle && !isPlaceholderProxyTitle(archiveTitle)) {
        return archiveTitle;
    }

    return getPlaylistUrlTitle(urlValue);
}

function buildPlaylistItemFromUrl(urlValue) {
    const cleanUrl = validateDirectMediaUrl(urlValue);
    const canonicalArchiveUrl = getCanonicalArchiveMediaUrl(cleanUrl);
    const archiveFileName = cleanMediaFileTitle(canonicalArchiveUrl);
    const title = normalizePlaylistUrlTitle("", cleanUrl, archiveFileName);
    const archiveIdentifier = getArchiveIdentifierFromMediaUrl(canonicalArchiveUrl);
    const archiveArtworkUrl = buildArchiveArtworkUrl(archiveIdentifier);

    return {
        id: makePlaylistId(),
        kind: "url",
        title,
        url: cleanUrl,
        size: 0,
        type: "direct media URL",
        addedAt: new Date().toISOString(),
        archiveFileName: archiveFileName || "",
        directArchiveUrl: canonicalArchiveUrl || "",
        proxiedArchiveUrl: isScrapeWebsiteArchiveProxyUrl(cleanUrl) ? cleanUrl : "",
        archiveIdentifier,
        archiveArtworkUrl,
        artworkUrl: archiveArtworkUrl,
    };
}

function splitPlaylistLinks(value) {
    return String(value || "")
        .split(/[\n,]+/)
        .map((link) => link.trim())
        .filter(Boolean);
}

function getPlaylistItemMeta(item) {
    if (!item) {
        return "Unknown playlist item";
    }

    const health = item.lastError
        ? ` • skipped last time: ${String(item.lastError).slice(0, 90)}`
        : item.loadState === "preloading"
            ? " • preloading now"
            : item.loadState === "preloaded" || item.preloadedAt
                ? ` • preloaded${item.preloadedViaProxy ? " through proxy fallback" : ""}`
                : item.loadState === "loading"
                    ? " • loading now"
                    : item.lastLoadedAt
                        ? " • last load OK"
                        : "";

    if (item.kind === "url") {
        try {
            const canonicalUrl = getCanonicalArchiveMediaUrl(item.url);
            const parsed = new URL(canonicalUrl);
            const proxyLabel = isScrapeWebsiteArchiveProxyUrl(item.url)
                ? " • via archive proxy"
                : "";

            return `Direct media URL • ${parsed.hostname}${proxyLabel} • saved across refreshes${health}`;
        } catch {
            return `Direct media URL • saved across refreshes${health}`;
        }
    }

    const baseMeta = `${item.type || "unknown MIME type"} • ${getReadableBytes(
        item.size
    )}`;

    if (item.persistedDataUrl || item.dataUrl) {
        return `${baseMeta} • saved in localStorage${health}`;
    }

    if (item.needsReselect || !item.file) {
        return `${baseMeta} • remembered placeholder, reselect file after refresh${health}`;
    }

    return `${baseMeta} • available this session${health}`;
}

function getPlaylistStatusLabel(repeatEnabled, playlistLength, activeIndex) {
    if (repeatEnabled) {
        return "Repeat is ON. The loaded song will restart when it ends.";
    }

    if (playlistLength > 0 && activeIndex >= 0) {
        return isIOSAudioDevice()
            ? "Repeat is OFF. After one Start playlist tap, Safari/iOS auto-next stays on the same unlocked audio session, advances to the next song, skips broken links/files, and wraps back to the first playable track."
            : "Repeat is OFF. The playlist will advance to the next song, skip broken links/files, and wrap back to the first playable track.";
    }

    if (playlistLength > 0) {
        return "Repeat is OFF. Press Start playlist to begin at track 1 and keep moving through the queue.";
    }

    return "Repeat is OFF. Add playlist tracks to enable automatic next-track playback.";
}

function getPlaylistPreloadCacheKey(item) {
    if (!item || typeof item !== "object") {
        return "";
    }

    if (item.id) {
        return String(item.id);
    }

    if (item.kind === "url" && item.url) {
        return `url:${item.url}`;
    }

    return `${item.kind || "item"}:${item.title || ""}:${item.addedAt || ""}`;
}

function getPlaylistPreloadSourceLabel(metadata = {}) {
    if (metadata.usedProxyFallback) {
        return "preloaded through scrapewebsite proxy fallback";
    }

    if (metadata.fetchLabel) {
        return `preloaded through ${metadata.fetchLabel}`;
    }

    return "preloaded directly";
}

function StoragePersistencePanel({ storageInfo, onClearSavedSession }) {
    const savedAudioLabel = storageInfo?.hasSavedCurrentAudio
        ? `Saved current ${storageInfo.lastMediaKind || "media"}`
        : "No saved current audio";

    return (
        <GlassCard>
            <Stack spacing={1.7}>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.4}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", md: "center" }}
                >
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.4 }}>
                            Saved browser session
                        </Typography>

                        <Typography sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>
                            Settings, preset choice, repeat mode, direct links, playlist metadata,
                            and small uploaded audio files are saved with localStorage. Cookies keep
                            a small backup summary for quick restore hints.
                        </Typography>
                    </Box>

                    <Button
                        variant="outlined"
                        onClick={onClearSavedSession}
                        sx={{
                            alignSelf: { xs: "stretch", md: "center" },
                            borderRadius: 999,
                            color: "#fff",
                            borderColor: "rgba(255,255,255,0.18)",
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                        }}
                    >
                        Clear saved session
                    </Button>
                </Stack>

                <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Chip
                        label={
                            storageInfo?.localStorageEnabled
                                ? "localStorage ready"
                                : "localStorage blocked"
                        }
                        sx={{
                            color: "#fff",
                            fontWeight: 850,
                            background: storageInfo?.localStorageEnabled
                                ? "rgba(103,232,249,0.12)"
                                : "rgba(248,113,113,0.13)",
                            border: storageInfo?.localStorageEnabled
                                ? "1px solid rgba(103,232,249,0.22)"
                                : "1px solid rgba(248,113,113,0.25)",
                        }}
                    />

                    <Chip
                        label={storageInfo?.settingsSaved ? "settings saved" : "default settings"}
                        sx={{
                            color: "#fff",
                            fontWeight: 850,
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    />

                    <Chip
                        label={`${storageInfo?.playlistCount || 0} playlist item${
                            storageInfo?.playlistCount === 1 ? "" : "s"
                        } saved`}
                        sx={{
                            color: "#fff",
                            fontWeight: 850,
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    />

                    <Chip
                        label={`${storageInfo?.savedPlaylistFiles || 0} file${
                            storageInfo?.savedPlaylistFiles === 1 ? "" : "s"
                        } stored as audio`}
                        sx={{
                            color: "#fff",
                            fontWeight: 850,
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    />

                    <Chip
                        label={`${storageInfo?.placeholderPlaylistFiles || 0} large file placeholder${
                            storageInfo?.placeholderPlaylistFiles === 1 ? "" : "s"
                        }`}
                        sx={{
                            color: "#fff",
                            fontWeight: 850,
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    />

                    <Chip
                        label={savedAudioLabel}
                        sx={{
                            color: "#fff",
                            fontWeight: 850,
                            background: "rgba(167,139,250,0.1)",
                            border: "1px solid rgba(167,139,250,0.2)",
                        }}
                    />
                </Stack>

                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.54)", lineHeight: 1.6 }}>
                    Current stored estimate: {getReadableBytes(storageInfo?.storageBytes || 0)}.
                    Browsers usually limit localStorage to a few MB, so large uploaded files are
                    remembered by name and size but must be selected again after refresh.
                </Typography>
            </Stack>
        </GlassCard>
    );
}

export default function Audio() {
    const objectUrlRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioBufferRef = useRef(null);
    const lastDecodedArrayBufferRef = useRef(null);
    const lastDecodedMetadataRef = useRef(null);
    const activeSourceRef = useRef(null);
    const liveNodesRef = useRef(null);
    const analyserRef = useRef(null);
    const monitorMuteGainRef = useRef(null);
    const outputAudioRef = useRef(null);
    const mediaStreamDestinationRef = useRef(null);
    const iPhoneSilentKeepAliveRef = useRef(null);
    const carPlayRecoveryTimerRef = useRef(null);
    const lastCarPlayRecoveryReasonRef = useRef("");
    const carPlaySafeModeRef = useRef(readPersistedCarPlaySafeMode());

    const waveformCanvasRef = useRef(null);
    const frequencyCanvasRef = useRef(null);
    const visualizer3dCanvasRef = useRef(null);
    const visualizerFrameRef = useRef(null);
    const waveformDataRef = useRef(null);
    const frequencyDataRef = useRef(null);
    const visualizer3dSettingsRef = useRef(DEFAULT_VISUALIZER_3D_SETTINGS);

    const timerRef = useRef(null);

    const startedAtContextTimeRef = useRef(0);
    const startedOffsetRef = useRef(0);
    const currentEffectiveRateRef = useRef(getEffectivePlaybackRate(DEFAULT_SETTINGS));
    const manualStopRef = useRef(false);
    const playingRef = useRef(false);
    const scrubbingRef = useRef(false);
    const wasPlayingBeforeScrubRef = useRef(false);
    const mutedRef = useRef(false);
    const latestSettingsRef = useRef(DEFAULT_SETTINGS);
    const repeatEnabledRef = useRef(false);
    const playlistRef = useRef([]);
    const activePlaylistIndexRef = useRef(-1);
    const playlistLoadTokenRef = useRef(0);
    const playlistAdvanceTokenRef = useRef(0);
    const playlistPreloadCacheRef = useRef(new Map());
    const playlistPreloadTokenRef = useRef(0);
    const playlistDragIndexRef = useRef(-1);
    const playlistDragOverIndexRef = useRef(-1);
    const lastPlaylistAutoStartRef = useRef({ index: -1, reason: "" });
    const communityListeningSessionIdRef = useRef(
        readPersistedCommunityListeningSessionId()
    );
    const communityListeningHeartbeatTimerRef = useRef(null);
    const lastCommunityListeningBeatAtRef = useRef(0);

    // Media Session / lock-screen refs keep hardware, CarPlay, Bluetooth,
    // and lock-screen controls wired to the latest React state without stale
    // closures after playlist, duration, or title changes.
    const mediaTitleRef = useRef("AudioMaster Lab player");
    const mediaDurationRef = useRef(0);
    const mediaPositionRef = useRef(0);
    const lastMediaSessionSeekAtRef = useRef(0);
    const pendingMediaSessionSeekRef = useRef(null);
    const browserScrubResumeIntentRef = useRef(false);
    const lastBrowserScrubChangeAtRef = useRef(0);
    const mediaSessionFastSeekCommitTimerRef = useRef(null);
    const lastMediaSessionPositionPushAtRef = useRef(0);
    const lastMediaSessionPositionSnapshotRef = useRef({
        duration: 0,
        position: 0,
        playbackRate: 1,
    });
    const lastMediaSessionMetadataKeyRef = useRef("");
    const hasMediaRef = useRef(false);
    const lastMediaSessionActionRef = useRef("");
    const outputElementActionGuardRef = useRef(false);
    const lastOutputElementPlayEventAtRef = useRef(0);
    const mediaSessionPlayRestartTokenRef = useRef(0);
    const lastMediaSessionPlayRestartAtRef = useRef(0);
    const lastMediaSessionPauseAtRef = useRef(0);
    const pauseActionInFlightRef = useRef(false);
    const ignoreOutputPauseUntilRef = useRef(0);
    const ignoreOutputPlayUntilRef = useRef(0);
    const pauseReleaseTimerRef = useRef(null);
    const iPhonePauseSquelchUntilRef = useRef(0);
    const iPhonePauseSerialRef = useRef(0);
    const mediaSessionActionQueueRef = useRef(Promise.resolve());
    const mediaSessionActionSerialRef = useRef(0);
    const iPhoneLockScreenOutputArmedRef = useRef(false);
    const lastIPhoneOutputKeepAliveAtRef = useRef(0);
    const iPhoneOutputHeldForLockScreenRestartRef = useRef(false);
    const iPhoneLockScreenLivePauseRef = useRef({
        active: false,
        source: null,
        offset: 0,
        contextTime: 0,
        reason: "",
    });
    const pauseUiQuietUntilRef = useRef(0);
    const pauseUiStatusSettledRef = useRef(false);
    const pauseUiQuietTimerRef = useRef(null);
    const isPauseUiSettlingRef = useRef(false);
    const playlistFilesHydratedRef = useRef(false);
    const carPlayRouteDisconnectGuardUntilRef = useRef(0);
    const carPlayRouteDisengagedBySystemRef = useRef(false);
    const lastCarPlayRoutePauseReasonRef = useRef("");

    const [sourceUrl, setSourceUrl] = useState("");
    const [sourceKind, setSourceKind] = useState("");
    const [inputFile, setInputFile] = useState(null);
    const [directLink, setDirectLink] = useState(() => readPersistedDirectLink());
    const [playlistLink, setPlaylistLink] = useState(() => readPersistedPlaylistLinkDraft());
    const [settings, setSettings] = useState(() => readPersistedSettings());
    const [visualizer3dSettings, setVisualizer3dSettings] = useState(() =>
        readPersistedVisualizer3DSettings()
    );
    const [status, setStatus] = useState(
        "Upload MP3, WAV, OGG, WebM, M4A, MP4, MOV, or choose a file from iPhone Files, On My iPhone, iCloud Drive, Google Drive, Proton Drive, Dropbox, or another Files provider."
    );
    const [statusTone, setStatusTone] = useState("info");
    const [mixerEnabled, setMixerEnabled] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPreloadingPlaylist, setIsPreloadingPlaylist] = useState(false);
    const [isPostingCommunityPost, setIsPostingCommunityPost] = useState(false);
    const [playlistPreloadSummary, setPlaylistPreloadSummary] = useState("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [bufferReady, setBufferReady] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [mediaInfo, setMediaInfo] = useState("");
    const [playlist, setPlaylist] = useState(() => readPersistedPlaylist());
    const [playlistDragState, setPlaylistDragState] = useState({
        fromIndex: -1,
        overIndex: -1,
    });
    const [activePlaylistIndex, setActivePlaylistIndex] = useState(() => {
        const storedIndex = Number(readStorageValue(STORAGE_KEYS.activePlaylistIndex, "-1"));
        return Number.isFinite(storedIndex) ? storedIndex : -1;
    });
    const [repeatEnabled, setRepeatEnabled] = useState(() => readPersistedRepeatEnabled());
    const [activePresetKey, setActivePresetKey] = useState(() => readPersistedPresetKey());
    const [carPlaySafeMode, setCarPlaySafeMode] = useState(() =>
        readPersistedCarPlaySafeMode()
    );
    const [carPlayOutputStatus, setCarPlayOutputStatus] = useState(() =>
        buildCarPlaySafeModeLabel(readPersistedCarPlaySafeMode())
    );
    const [storageInfo, setStorageInfo] = useState(() => buildPersistenceInfo());

    const isPlayingStateRef = useRef(isPlaying);
    const statusMessageRef = useRef(status);
    const statusToneRef = useRef(statusTone);
    const carPlayOutputStatusValueRef = useRef(carPlayOutputStatus);

    const settingsView = normalizeSettings(settings);
    const selectedVisualizer3DMode =
        VISUALIZER_3D_MODE_OPTIONS.find(
            (option) => option.value === visualizer3dSettings.model
        ) || VISUALIZER_3D_MODE_OPTIONS[0];
    const hasMedia = bufferReady && Boolean(audioBufferRef.current);
    // Keep the visual Play/Pause toggle tied to real playback only. The pause
    // settling flag still disables controls while iOS quiets the route, but it
    // no longer keeps the Pause icon visible after audio has already paused.
    const showPauseForMainControls = Boolean(isPlaying);
    const showPauseForPlaylistControls = Boolean(
        isPlaying && activePlaylistIndex >= 0
    );
    const activePlaylistItem =
        activePlaylistIndex >= 0 ? playlist[activePlaylistIndex] : null;
    const mediaTitle = getMediaDisplayTitle(
        inputFile,
        sourceKind,
        sourceUrl,
        activePlaylistItem?.title
    );
    const activePlaylistArtworkSource = buildAbsoluteMediaAssetUrl(
        getPlaylistItemArtworkSource(activePlaylistItem)
    );
    const playerArtworkSource = useMemo(
        () => getPlayerDisplayArtworkSource(mediaTitle, activePlaylistItem),
        [mediaTitle, activePlaylistItem]
    );

    mediaTitleRef.current = mediaTitle;
    mediaDurationRef.current = Number.isFinite(duration) ? duration : 0;
    visualizer3dSettingsRef.current = visualizer3dSettings;

    // Do not let a stale React render overwrite the newest lock-screen scrub
    // position. Media Session seekto actions can arrive while the page is
    // backgrounded/locked, so the ref is the source of truth until React catches
    // up with the visible slider state.
    {
        const visiblePosition = Number.isFinite(position) ? position : 0;
        const recentLockScreenSeek =
            Date.now() - (lastMediaSessionSeekAtRef.current || 0) < 900;
        const pendingSeekPosition = Number(pendingMediaSessionSeekRef.current);
        const pendingSeekStillDifferent =
            Number.isFinite(pendingSeekPosition) &&
            Math.abs(visiblePosition - pendingSeekPosition) > 0.05;

        if (!recentLockScreenSeek || !pendingSeekStillDifferent) {
            mediaPositionRef.current = visiblePosition;
            if (!pendingSeekStillDifferent) {
                pendingMediaSessionSeekRef.current = null;
            }
        }
    }

    hasMediaRef.current = Boolean(hasMedia);

    const progressValue =
        duration > 0 ? clamp((position / duration) * 100, 0, 100) : 0;

    const effectiveRate = getEffectivePlaybackRate(settingsView);
    const pitchCents = semitonesToCents(settingsView.pitchSemitones);
    const playlistStatusLabel = getPlaylistStatusLabel(
        repeatEnabled,
        playlist.length,
        activePlaylistIndex
    );
    const selectedPreset = getMixerPreset(activePresetKey);
    const selectedPresetDescription =
        activePresetKey === "custom"
            ? "Manual custom safe mix. Your edits still stay inside the human-safe speed, EQ, feedback, and output limits."
            : selectedPreset.description;
    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
        document.title = "Audio Tool | AudioBufferSourceNode Mixer";
    }, []);

    useEffect(() => {
        const normalized = normalizeSettings(settings);

        latestSettingsRef.current = normalized;

        if (liveNodesRef.current && audioContextRef.current) {
            liveNodesRef.current.carPlaySafeMode = Boolean(
                carPlaySafeModeRef.current && isIOSAudioDevice()
            );
            applySettingsToNodes(
                liveNodesRef.current,
                normalized,
                audioContextRef.current.currentTime
            );
        }

        if (activeSourceRef.current && audioContextRef.current) {
            applySourcePlaybackSettings(
                activeSourceRef.current,
                normalized,
                audioContextRef.current.currentTime
            );
        }
    }, [settings]);

    useEffect(() => {
        persistSettingsToBrowser(settings, activePresetKey);
        setStorageInfo(buildPersistenceInfo());
    }, [settings, activePresetKey]);

    useEffect(() => {
        carPlaySafeModeRef.current = carPlaySafeMode;
        persistCarPlaySafeModeToBrowser(carPlaySafeMode);
        setCarPlayOutputStatusIfChanged(buildCarPlaySafeModeLabel(carPlaySafeMode));

        if (liveNodesRef.current && audioContextRef.current) {
            liveNodesRef.current.carPlaySafeMode = Boolean(
                carPlaySafeMode && isIOSAudioDevice()
            );
            applySettingsToNodes(
                liveNodesRef.current,
                latestSettingsRef.current,
                audioContextRef.current.currentTime
            );
        }

        setStorageInfo(buildPersistenceInfo());
    }, [carPlaySafeMode]);

    useEffect(() => {
        persistPlaylistToBrowser(playlist);
        setStorageInfo(buildPersistenceInfo());
    }, [playlist]);

    useEffect(() => {
        persistSessionToBrowser({
            repeatEnabled,
            directLink,
            playlistLink,
            activePlaylistIndex,
            playlistLength: playlist.length,
            hasMedia,
            sourceKind,
        });
        setStorageInfo(buildPersistenceInfo());
    }, [
        repeatEnabled,
        directLink,
        playlistLink,
        activePlaylistIndex,
        playlist.length,
        hasMedia,
        sourceKind,
    ]);

    useEffect(() => {
        playlistRef.current = playlist;

        const activeCacheKeys = new Set(
            playlist.map((item) => getPlaylistPreloadCacheKey(item)).filter(Boolean)
        );

        for (const cacheKey of playlistPreloadCacheRef.current.keys()) {
            if (!activeCacheKeys.has(cacheKey)) {
                playlistPreloadCacheRef.current.delete(cacheKey);
            }
        }
    }, [playlist]);

    useEffect(() => {
        if (playlistFilesHydratedRef.current) {
            return undefined;
        }

        playlistFilesHydratedRef.current = true;
        let cancelled = false;

        async function hydrateUploadedPlaylistFiles() {
            const currentPlaylist = playlistRef.current;

            if (
                !Array.isArray(currentPlaylist) ||
                !currentPlaylist.some(
                    (item) => item?.kind === "file" && !item.file && (item.indexedDbFileKey || item.dataUrl)
                )
            ) {
                return;
            }

            const result = await hydratePlaylistFilesFromBrowserStorage(currentPlaylist);

            if (cancelled || !result.restoredCount) {
                return;
            }

            setPlaylist(result.playlist);
            setInfo(
                `Restored ${result.restoredCount} uploaded playlist file${
                    result.restoredCount === 1 ? "" : "s"
                } from browser storage after refresh.`
            );
            refreshStorageInfo();
        }

        hydrateUploadedPlaylistFiles().catch(() => {
            // Restore is best-effort. Missing files stay visible with their metadata.
        });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        activePlaylistIndexRef.current = activePlaylistIndex;
    }, [activePlaylistIndex]);

    useEffect(() => {
        repeatEnabledRef.current = repeatEnabled;
    }, [repeatEnabled]);

    useEffect(() => {
        clearVisualizerCanvases();

        return () => {
            stopPlayback(false);
            stopVisualizer();
            clearCarPlayRecoveryTimer();
            clearPauseReleaseTimer();
            clearPauseUiQuietTimer();
            clearMediaSessionFastSeekCommitTimer();
            clearMediaSession();
            stopCommunityListeningHeartbeat(true);

            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }

            detachOutputAudioElement();

            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
                audioContextRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        restorePersistedMediaOnBoot();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        installMediaSessionHandlers();
        updateMediaSessionMetadata();
        updateMediaSessionState(playingRef.current ? "playing" : "paused");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        mediaTitle,
        duration,
        activePlaylistIndex,
        playlist.length,
        settings.speed,
        settings.pitchSemitones,
    ]);

    useEffect(() => {
        updateMediaSessionState(isPlaying ? "playing" : "paused");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, position, duration]);

    useEffect(() => {
        if (!isIOSAudioDevice()) {
            return undefined;
        }

        const recoverFromPageEvent = (event) => {
            const eventType = event?.type || "resume";

            if (
                eventType === "focus" ||
                eventType === "pageshow" ||
                (eventType === "visibilitychange" &&
                    typeof document !== "undefined" &&
                    document.visibilityState === "visible")
            ) {
                syncVisiblePlaybackUiWithAudioRoute(eventType);
            }

            if (
                eventType === "visibilitychange" &&
                typeof document !== "undefined" &&
                document.visibilityState !== "visible"
            ) {
                updateMediaSessionState(playingRef.current ? "playing" : "paused");
                return;
            }

            if (shouldTreatAsCarPlayRouteDisengage(eventType)) {
                pauseAfterCarPlayRouteDisengage(`iOS audio route changed after ${eventType}`).catch(() => {});
                return;
            }

            scheduleCarPlayOutputRecovery(`iOS page/audio route event: ${eventType}`, {
                allowAutoResume: false,
            });
        };

        window.addEventListener("focus", recoverFromPageEvent);
        window.addEventListener("pageshow", recoverFromPageEvent);
        document.addEventListener("visibilitychange", recoverFromPageEvent);

        const mediaDevices = navigator.mediaDevices;

        if (mediaDevices?.addEventListener) {
            mediaDevices.addEventListener("devicechange", recoverFromPageEvent);
        }

        return () => {
            window.removeEventListener("focus", recoverFromPageEvent);
            window.removeEventListener("pageshow", recoverFromPageEvent);
            document.removeEventListener("visibilitychange", recoverFromPageEvent);

            if (mediaDevices?.removeEventListener) {
                mediaDevices.removeEventListener("devicechange", recoverFromPageEvent);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const element = outputAudioRef.current;

        if (!element || !isIOSAudioDevice()) {
            return undefined;
        }

        const handleOutputPlay = () => {
            const now = Date.now();

            if (carPlayRouteDisengagedBySystemRef.current && !playingRef.current) {
                iPhoneLockScreenOutputArmedRef.current = false;
                updateMediaSessionState("paused", { forcePosition: true });
                return;
            }

            if (
                outputElementActionGuardRef.current ||
                now < (ignoreOutputPlayUntilRef.current || 0) ||
                isInsideCleanPauseWindow()
            ) {
                // During Pause, the hidden iPhone MediaStream element can emit a
                // synthetic play/playing event while Safari settles the route. Do
                // not convert that event into a real Play action and do not flip
                // Media Session back and forth; that was the one-frame button flash
                // and the no-sound-after-pause race.
                if (isInsideCleanPauseWindow()) {
                    holdIPhonePauseSilence("Ignored hidden iPhone output play event during Pause");
                }
                if (playingRef.current) {
                    updateMediaSessionState("playing", { forcePosition: true });
                }
                return;
            }

            if (now - lastOutputElementPlayEventAtRef.current < 350) {
                return;
            }

            lastOutputElementPlayEventAtRef.current = now;
            iPhoneOutputHeldForLockScreenRestartRef.current = false;
            runMediaSessionAction("iOS lock-screen Play", playFromMediaSession);
        };

        const handleOutputPause = () => {
            if (outputElementActionGuardRef.current || isInsideCleanPauseWindow()) {
                if (playingRef.current) {
                    updateMediaSessionState("playing", { forcePosition: true });
                }
                return;
            }

            const now = Date.now();

            if (now - lastMediaSessionPauseAtRef.current < 1100) {
                updateMediaSessionState(playingRef.current ? "playing" : "paused");
                return;
            }

            if (shouldTreatAsCarPlayRouteDisengage("hidden-output-pause")) {
                pauseAfterCarPlayRouteDisengage("iPhone hidden output paused because the CarPlay / USB route changed").catch(() => {});
                return;
            }

            if (playingRef.current) {
                iPhoneLockScreenOutputArmedRef.current = false;
                runMediaSessionAction("iOS lock-screen Pause", pauseFromMediaSession);
                return;
            }

            // Do not re-play or re-arm the hidden media element from its own pause
            // event while WebAudio is already paused. Re-arming here is what caused
            // the audible flutter/stutter after pressing Pause on the lock screen.
            iPhoneLockScreenOutputArmedRef.current = false;
            updateMediaSessionState("paused", { forcePosition: true });
        };

        const recoverEvents = ["stalled", "suspend", "waiting", "emptied", "abort", "error"];
        const handleRecoverableOutputEvent = (event) => {
            const eventType = event?.type || "output-event";

            if (isInsideCleanPauseWindow()) {
                holdIPhonePauseSilence(`Ignored hidden iOS output element ${eventType} during Pause`);
                return;
            }

            if (shouldTreatAsCarPlayRouteDisengage(`hidden-output-${eventType}`)) {
                pauseAfterCarPlayRouteDisengage(`iPhone output route changed after hidden output ${eventType}`).catch(() => {});
                return;
            }

            if (!playingRef.current && eventType !== "error") {
                return;
            }

            scheduleCarPlayOutputRecovery(`hidden iOS output element ${eventType}`, {
                allowAutoResume: false,
            });
        };

        element.addEventListener("play", handleOutputPlay);
        element.addEventListener("playing", handleOutputPlay);
        element.addEventListener("pause", handleOutputPause);

        recoverEvents.forEach((eventName) => {
            element.addEventListener(eventName, handleRecoverableOutputEvent);
        });

        return () => {
            element.removeEventListener("play", handleOutputPlay);
            element.removeEventListener("playing", handleOutputPlay);
            element.removeEventListener("pause", handleOutputPause);

            recoverEvents.forEach((eventName) => {
                element.removeEventListener(eventName, handleRecoverableOutputEvent);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function setPlayingState(nextValue) {
        const safeValue = Boolean(nextValue);

        if (playingRef.current === safeValue && isPlayingStateRef.current === safeValue) {
            return;
        }

        playingRef.current = safeValue;
        isPlayingStateRef.current = safeValue;
        setIsPlaying((current) => (current === safeValue ? current : safeValue));

        if (safeValue) {
            startCommunityListeningHeartbeat();
        } else {
            stopCommunityListeningHeartbeat(true);
        }
    }

    function syncPlaybackPosition(nextOffset, options = {}) {
        const durationValue = getMediaSessionDuration();
        const safeNumber = numberOrDefault(nextOffset, 0);
        const safeOffset = durationValue > 0
            ? clamp(safeNumber, 0, durationValue)
            : Math.max(0, safeNumber);

        mediaPositionRef.current = safeOffset;

        if (options.commitStartOffset) {
            startedOffsetRef.current = safeOffset;
            startedAtContextTimeRef.current = 0;
        }

        if (options.fromMediaSession) {
            lastMediaSessionSeekAtRef.current = Date.now();
            pendingMediaSessionSeekRef.current = safeOffset;
        }

        if (options.clearPendingMediaSessionSeek) {
            pendingMediaSessionSeekRef.current = null;
        }

        setPosition((current) =>
            Math.abs(Number(current || 0) - safeOffset) < 0.01 ? current : safeOffset
        );

        if (options.forceMediaSession || options.fromMediaSession) {
            updateMediaSessionPositionState({ forcePosition: true });
        }

        return safeOffset;
    }

    function syncVisiblePlaybackUiWithAudioRoute(reason = "visible route sync") {
        const context = audioContextRef.current;
        const hasLiveSource = Boolean(activeSourceRef.current);
        const contextRunning = Boolean(context && context.state === "running");
        const shouldShowPlaying = Boolean(
            playingRef.current && hasLiveSource && contextRunning
        );

        if (!shouldShowPlaying) {
            if (playingRef.current || isPlayingStateRef.current) {
                playingRef.current = false;
                isPlayingStateRef.current = false;
                setIsPlaying(false);
            }

            if (isPauseUiSettlingRef.current) {
                setPauseUiSettlingState(false);
            }

            updateMediaSessionState("paused", {
                forcePosition: true,
                reason,
            });
            return false;
        }

        if (!isPlayingStateRef.current) {
            isPlayingStateRef.current = true;
            setIsPlaying(true);
        }

        updateMediaSessionState("playing", {
            forcePosition: true,
            reason,
        });
        return true;
    }

    function setInfo(message) {
        const safeMessage = String(message || "");

        if (statusMessageRef.current === safeMessage && statusToneRef.current === "info") {
            return;
        }

        statusMessageRef.current = safeMessage;
        statusToneRef.current = "info";
        setStatus(safeMessage);
        setStatusTone((current) => (current === "info" ? current : "info"));
    }

    function setError(message) {
        const safeMessage = String(message || "");

        if (statusMessageRef.current === safeMessage && statusToneRef.current === "error") {
            return;
        }

        statusMessageRef.current = safeMessage;
        statusToneRef.current = "error";
        setStatus(safeMessage);
        setStatusTone((current) => (current === "error" ? current : "error"));
    }

    function setCarPlayOutputStatusIfChanged(message) {
        const safeMessage = String(message || "");

        if (!safeMessage || carPlayOutputStatusValueRef.current === safeMessage) {
            return;
        }

        carPlayOutputStatusValueRef.current = safeMessage;
        setCarPlayOutputStatus(safeMessage);
    }

    function setPauseUiSettlingState(nextValue) {
        const safeValue = Boolean(nextValue);

        if (isPauseUiSettlingRef.current === safeValue) {
            return;
        }

        isPauseUiSettlingRef.current = safeValue;
    }

    function clearPauseUiQuietTimer() {
        if (pauseUiQuietTimerRef.current) {
            window.clearTimeout(pauseUiQuietTimerRef.current);
            pauseUiQuietTimerRef.current = null;
        }
    }

    function beginPauseUiQuietWindow(durationMs = 1400) {
        const now = Date.now();
        const safeDuration = Math.max(450, Number(durationMs) || 1400);

        pauseUiQuietUntilRef.current = Math.max(
            pauseUiQuietUntilRef.current || 0,
            now + safeDuration
        );
        pauseUiStatusSettledRef.current = false;
        setPauseUiSettlingState(true);
        clearPauseUiQuietTimer();

        pauseUiQuietTimerRef.current = window.setTimeout(() => {
            pauseUiQuietTimerRef.current = null;
            pauseUiQuietUntilRef.current = 0;
            pauseUiStatusSettledRef.current = false;
            setPauseUiSettlingState(false);
        }, safeDuration);
    }


    function isInsideCarPlayDisconnectGuard() {
        return Date.now() < (carPlayRouteDisconnectGuardUntilRef.current || 0);
    }

    function armCarPlayDisconnectGuard(durationMs = 3500) {
        carPlayRouteDisconnectGuardUntilRef.current = Math.max(
            carPlayRouteDisconnectGuardUntilRef.current || 0,
            Date.now() + Math.max(900, Number(durationMs) || 3500)
        );
    }

    function shouldTreatAsCarPlayRouteDisengage(eventType = "routechange") {
        if (!isIOSAudioDevice() || !carPlaySafeModeRef.current) {
            return false;
        }

        if (isInsideCleanPauseWindow()) {
            return false;
        }

        const cleanType = String(eventType || "routechange").toLowerCase();
        const element = outputAudioRef.current;
        const context = audioContextRef.current;
        const hadActiveRoute = Boolean(
            playingRef.current ||
            isPlayingStateRef.current ||
            iPhoneLockScreenOutputArmedRef.current ||
            iPhoneOutputHeldForLockScreenRestartRef.current ||
            activeSourceRef.current
        );

        if (!hadActiveRoute) {
            return false;
        }

        const routeLooksInterrupted = Boolean(
            !element ||
            element.paused ||
            element.ended ||
            element.error ||
            !element.srcObject ||
            context?.state === "suspended" ||
            context?.state === "interrupted"
        );

        if (cleanType.includes("devicechange") || cleanType.includes("hidden-output")) {
            return routeLooksInterrupted || playingRef.current;
        }

        if (cleanType.includes("pageshow") || cleanType.includes("focus") || cleanType.includes("visibilitychange")) {
            return routeLooksInterrupted && Boolean(iPhoneLockScreenOutputArmedRef.current || playingRef.current);
        }

        return false;
    }

    async function pauseAfterCarPlayRouteDisengage(reason = "CarPlay / USB audio route disconnected") {
        if (!isIOSAudioDevice()) {
            return false;
        }

        if (isInsideCarPlayDisconnectGuard()) {
            updateMediaSessionState("paused", { forcePosition: true });
            setPlayingState(false);
            return true;
        }

        armCarPlayDisconnectGuard(3800);
        clearCarPlayRecoveryTimer();
        beginCleanPauseWindow(2200);

        carPlayRouteDisengagedBySystemRef.current = true;
        lastCarPlayRoutePauseReasonRef.current = reason;
        iPhoneLockScreenOutputArmedRef.current = false;
        iPhoneOutputHeldForLockScreenRestartRef.current = false;
        manualStopRef.current = true;

        const context = audioContextRef.current;
        const nextOffset = getCurrentOffset();

        try {
            if (context && context.state !== "closed") {
                await fadeMonitorForPause(context, 0.1);
            } else {
                holdIPhonePauseSilence(reason);
            }
        } catch {
            holdIPhonePauseSilence(reason);
        }

        stopActiveSource();
        stopPositionTimer();
        stopVisualizer();

        startedOffsetRef.current = nextOffset;
        startedAtContextTimeRef.current = 0;
        syncPlaybackPosition(nextOffset, {
            forceMediaSession: true,
        });
        setPlayingState(false);
        updateMediaSessionState("paused", { forcePosition: true });

        const element = outputAudioRef.current;

        outputElementActionGuardRef.current = true;

        try {
            if (element) {
                element.volume = 0;
                element.muted = false;
                if (!element.paused) {
                    element.pause();
                }
            }
        } catch {
            // Safe to ignore iOS output element pause issues during route loss.
        } finally {
            window.setTimeout(() => {
                outputElementActionGuardRef.current = false;
            }, 900);
        }

        try {
            if (context && context.state === "running") {
                await context.suspend();
            }
        } catch {
            // iOS may already have interrupted the context.
        }

        setCarPlayOutputStatusIfChanged(
            "CarPlay / USB route disconnected, so playback was paused and will not auto-resume. Tap Play after unlocking the phone to start the stream again."
        );
        setInfo(
            "CarPlay / USB route disconnected. Playback is paused so the phone will not auto-play after the car turns off. Tap Play to resume through the current iPhone output."
        );

        return true;
    }

    function clearCarPlayRecoveryTimer() {
        if (carPlayRecoveryTimerRef.current) {
            window.clearTimeout(carPlayRecoveryTimerRef.current);
            carPlayRecoveryTimerRef.current = null;
        }
    }

    function clearPauseReleaseTimer() {
        if (pauseReleaseTimerRef.current) {
            window.clearTimeout(pauseReleaseTimerRef.current);
            pauseReleaseTimerRef.current = null;
        }
    }

    function clearIPhonePauseGuardsForPlay() {
        if (!isIOSAudioDevice()) {
            return;
        }

        // A real Play action must cancel every pending Pause quiet/squelch guard
        // before any output restore or element.play() call. Otherwise Safari can
        // leave the button in Play while the stream is still volume-squelched.
        iPhonePauseSerialRef.current += 1;
        pauseActionInFlightRef.current = false;
        ignoreOutputPauseUntilRef.current = 0;
        ignoreOutputPlayUntilRef.current = 0;
        iPhonePauseSquelchUntilRef.current = 0;
        pauseUiQuietUntilRef.current = 0;
        pauseUiStatusSettledRef.current = false;
        setPauseUiSettlingState(false);
        outputElementActionGuardRef.current = false;
        carPlayRouteDisengagedBySystemRef.current = false;
        lastCarPlayRoutePauseReasonRef.current = "";
        carPlayRouteDisconnectGuardUntilRef.current = 0;
        clearPauseReleaseTimer();
        clearPauseUiQuietTimer();
        clearCarPlayRecoveryTimer();

        try {
            setIPhoneOutputElementVolumeForPause(1);
            restoreKeepAliveCarrierAfterPlay();
        } catch {
            // Best-effort only; the normal Play path still restores the graph.
        }
    }

    function beginCleanPauseWindow(durationMs = 1400) {
        const now = Date.now();
        const safeDuration = Math.max(450, Number(durationMs) || 1400);

        pauseActionInFlightRef.current = true;
        lastMediaSessionPauseAtRef.current = now;
        ignoreOutputPauseUntilRef.current = now + safeDuration;
        ignoreOutputPlayUntilRef.current = now + safeDuration + 650;
        iPhonePauseSquelchUntilRef.current = now + safeDuration + 450;
        iPhonePauseSerialRef.current += 1;
        beginPauseUiQuietWindow(safeDuration + 650);
        clearCarPlayRecoveryTimer();
        clearPauseReleaseTimer();

        pauseReleaseTimerRef.current = window.setTimeout(() => {
            pauseActionInFlightRef.current = false;
            pauseReleaseTimerRef.current = null;
        }, safeDuration);
    }

    function extendCleanPauseWindow(durationMs = 1100) {
        const now = Date.now();
        const safeDuration = Math.max(350, Number(durationMs) || 1100);

        ignoreOutputPauseUntilRef.current = Math.max(
            ignoreOutputPauseUntilRef.current || 0,
            now + safeDuration
        );
        ignoreOutputPlayUntilRef.current = Math.max(
            ignoreOutputPlayUntilRef.current || 0,
            now + safeDuration + 650
        );
        iPhonePauseSquelchUntilRef.current = Math.max(
            iPhonePauseSquelchUntilRef.current || 0,
            now + safeDuration + 450
        );
        pauseActionInFlightRef.current = true;
        beginPauseUiQuietWindow(safeDuration + 650);
        clearPauseReleaseTimer();

        pauseReleaseTimerRef.current = window.setTimeout(() => {
            pauseActionInFlightRef.current = false;
            pauseReleaseTimerRef.current = null;
        }, safeDuration);
    }

    function isInsideCleanPauseWindow() {
        const now = Date.now();
        return (
            pauseActionInFlightRef.current ||
            now < (ignoreOutputPauseUntilRef.current || 0) ||
            now < (iPhonePauseSquelchUntilRef.current || 0)
        );
    }

    function isIPhonePauseSquelched() {
        return isIOSAudioDevice() && isInsideCleanPauseWindow();
    }

    function setIPhoneOutputElementVolumeForPause(volume = 0) {
        const element = outputAudioRef.current;

        if (!element || !isIOSAudioDevice()) {
            return;
        }

        try {
            element.volume = clamp(numberOrDefault(volume, 0), 0, 1);
            element.muted = false;
            element.defaultMuted = false;
            element.playsInline = true;
            element.autoplay = true;
            element.setAttribute("playsinline", "");
            element.setAttribute("webkit-playsinline", "");
            element.removeAttribute("muted");
        } catch {
            // Safe to ignore iOS element volume issues while locked.
        }
    }

    function silenceKeepAliveCarrierForPause() {
        const keepAlive = iPhoneSilentKeepAliveRef.current;
        const context = audioContextRef.current;

        if (!keepAlive?.gain || !context || context.state === "closed") {
            return;
        }

        try {
            setAudioParam(keepAlive.gain.gain, 0, context.currentTime || 0, 0.025);
        } catch {
            // Safe to ignore.
        }
    }

    function restoreKeepAliveCarrierAfterPlay() {
        const keepAlive = iPhoneSilentKeepAliveRef.current;
        const context = audioContextRef.current;

        if (!keepAlive?.gain || !context || context.state === "closed") {
            return;
        }

        try {
            setAudioParam(keepAlive.gain.gain, IPHONE_KEEP_ALIVE_GAIN, context.currentTime || 0, 0.04);
        } catch {
            // Safe to ignore.
        }
    }

    async function fadeMonitorForPause(context = audioContextRef.current, fadeSeconds = 0.09) {
        if (!context || context.state === "closed") {
            setIPhoneOutputElementVolumeForPause(0);
            return;
        }

        const now = context.currentTime || 0;
        const safeFade = Math.max(0.07, Math.min(0.24, Number(fadeSeconds) || 0.11));

        try {
            if (monitorMuteGainRef.current?.gain) {
                setAudioParam(monitorMuteGainRef.current.gain, 0, now, safeFade);
            }

            if (liveNodesRef.current?.baseVolumeGain?.gain) {
                setAudioParam(liveNodesRef.current.baseVolumeGain.gain, 0, now, safeFade);
            }
        } catch {
            // Best-effort click/stutter prevention before pausing or suspending WebAudio.
        }

        silenceKeepAliveCarrierForPause();
        await sleep(Math.ceil(safeFade * 1000) + 42);
        setIPhoneOutputElementVolumeForPause(0);
    }

    function holdIPhonePauseSilence(reason = "Pause silence guard") {
        if (!isIOSAudioDevice()) {
            return;
        }

        clearCarPlayRecoveryTimer();
        silenceKeepAliveCarrierForPause();
        setIPhoneOutputElementVolumeForPause(0);

        const context = audioContextRef.current;
        const now = context?.currentTime || 0;

        try {
            if (monitorMuteGainRef.current?.gain) {
                setAudioParam(monitorMuteGainRef.current.gain, 0, now, 0);
            }

            if (liveNodesRef.current?.baseVolumeGain?.gain) {
                setAudioParam(liveNodesRef.current.baseVolumeGain.gain, 0, now, 0);
            }
        } catch {
            // Keep pause silence best-effort only.
        }

        // No React/UI status updates here. This function can run many times from
        // hidden iOS media-element events while Pause is settling, so updating
        // state here causes the button/card flash even though the audio is fine.
    }

    function canUseMediaSession() {
        return typeof navigator !== "undefined" && "mediaSession" in navigator;
    }

    function hasMediaSessionTarget() {
        return Boolean(
            hasMediaRef.current ||
            audioBufferRef.current ||
            lastDecodedArrayBufferRef.current ||
            (Array.isArray(playlistRef.current) && playlistRef.current.length > 0)
        );
    }

    function getMediaSessionDuration() {
        const bufferDuration = Number(audioBufferRef.current?.duration);
        const refDuration = Number(mediaDurationRef.current);

        if (Number.isFinite(bufferDuration) && bufferDuration > 0) {
            return bufferDuration;
        }

        if (Number.isFinite(refDuration) && refDuration > 0) {
            return refDuration;
        }

        return 0;
    }

    function getMediaSessionPosition() {
        const mediaDuration = getMediaSessionDuration();
        const refPosition = Number(mediaPositionRef.current);

        if (scrubbingRef.current && Number.isFinite(refPosition)) {
            return mediaDuration
                ? clamp(refPosition, 0, mediaDuration)
                : Math.max(0, refPosition || 0);
        }

        const liveOffset = getCurrentOffset();
        const nextPosition = Number.isFinite(liveOffset) ? liveOffset : refPosition;

        if (!mediaDuration) {
            return Math.max(0, nextPosition || 0);
        }

        return clamp(nextPosition || 0, 0, mediaDuration);
    }

    function getMediaSessionTitle() {
        const activeItem = playlistRef.current?.[activePlaylistIndexRef.current];
        const activeItemTitle = String(activeItem?.title || "").trim();

        if (activeItemTitle && !isPlaceholderProxyTitle(activeItemTitle)) {
            return activeItemTitle;
        }

        const refTitle = String(mediaTitleRef.current || "").trim();

        if (refTitle && refTitle !== "Decoded audio buffer" && !isPlaceholderProxyTitle(refTitle)) {
            return refTitle;
        }

        const metadataName = String(lastDecodedMetadataRef.current?.name || "").trim();
        const metadataTitle = cleanMediaFileTitle(getCanonicalArchiveMediaUrl(metadataName));

        if (metadataTitle && !isPlaceholderProxyTitle(metadataTitle)) {
            return metadataTitle;
        }

        return "AudioMaster Lab player";
    }

    function getMediaSessionAlbum() {
        const list = playlistRef.current;
        const activeIndex = activePlaylistIndexRef.current;

        if (Array.isArray(list) && list.length && activeIndex >= 0) {
            return `AudioMaster Lab Playlist • ${activeIndex + 1} of ${list.length}`;
        }

        return "AudioMaster Lab";
    }

    function getMediaSessionPlaybackRate() {
        const liveRate = Number(currentEffectiveRateRef.current);

        if (Number.isFinite(liveRate) && liveRate > 0) {
            return clamp(liveRate, 0.0625, 16);
        }

        return clamp(getEffectivePlaybackRate(latestSettingsRef.current), 0.0625, 16);
    }

    function updateMediaSessionPositionState(options = {}) {
        if (!canUseMediaSession() || typeof navigator.mediaSession.setPositionState !== "function") {
            return;
        }

        const durationValue = Number(getMediaSessionDuration());

        if (!Number.isFinite(durationValue) || durationValue <= 0) {
            try {
                navigator.mediaSession.setPositionState();
            } catch {
                // Position state is best-effort only.
            }
            return;
        }

        const positionValue = clamp(
            Number(getMediaSessionPosition()) || 0,
            0,
            durationValue
        );
        const playbackRateValue = getMediaSessionPlaybackRate();
        const now = Date.now();
        const lastSnapshot = lastMediaSessionPositionSnapshotRef.current || {};
        const positionChangedEnough = Math.abs(
            Number(lastSnapshot.position || 0) - positionValue
        ) >= 0.33;
        const durationChangedEnough = Math.abs(
            Number(lastSnapshot.duration || 0) - durationValue
        ) >= 0.05;
        const rateChangedEnough = Math.abs(
            Number(lastSnapshot.playbackRate || 1) - playbackRateValue
        ) >= 0.01;

        if (
            !options.forcePosition &&
            now - (lastMediaSessionPositionPushAtRef.current || 0) < 350 &&
            !positionChangedEnough &&
            !durationChangedEnough &&
            !rateChangedEnough
        ) {
            return;
        }

        lastMediaSessionPositionPushAtRef.current = now;
        lastMediaSessionPositionSnapshotRef.current = {
            duration: durationValue,
            position: positionValue,
            playbackRate: playbackRateValue,
        };

        try {
            navigator.mediaSession.setPositionState({
                duration: durationValue,
                playbackRate: playbackRateValue,
                position: positionValue,
            });
        } catch {
            // Safari can reject position updates while switching audio routes.
        }
    }

    function updateMediaSessionMetadata() {
        if (!canUseMediaSession()) {
            return;
        }

        try {
            if (typeof window === "undefined" || typeof window.MediaMetadata !== "function") {
                updateMediaSessionPositionState({ forcePosition: true });
                return;
            }

            const title = getMediaSessionTitle();
            const activeItem = playlistRef.current?.[activePlaylistIndexRef.current];
            const metadataKey = JSON.stringify({
                title,
                album: getMediaSessionAlbum(),
                artwork: getPlaylistItemArtworkSource(activeItem),
                duration: Number(getMediaSessionDuration()) || 0,
                playbackRate: Number(getMediaSessionPlaybackRate()) || 1,
                pitchSemitones: Number(latestSettingsRef.current?.pitchSemitones) || 0,
                activePlaylistIndex: activePlaylistIndexRef.current,
            });

            if (lastMediaSessionMetadataKeyRef.current !== metadataKey) {
                navigator.mediaSession.metadata = new window.MediaMetadata({
                    title,
                    artist: "AudioMaster Lab",
                    album: getMediaSessionAlbum(),
                    artwork: getMediaSessionArtwork(title, activeItem),
                });
                lastMediaSessionMetadataKeyRef.current = metadataKey;
            }

            updateMediaSessionPositionState({ forcePosition: true });
        } catch {
            // MediaMetadata is not available in every Safari/WebView version.
        }
    }

    function updateMediaSessionState(nextState = "none", options = {}) {
        if (!canUseMediaSession()) {
            return;
        }

        const safeState = hasMediaSessionTarget() ? nextState : "none";

        try {
            navigator.mediaSession.playbackState = safeState;
        } catch {
            // playbackState is not supported in every browser.
        }

        if (safeState === "none") {
            try {
                if (typeof navigator.mediaSession.setPositionState === "function") {
                    navigator.mediaSession.setPositionState();
                }
            } catch {
                // Position state clearing is best-effort only.
            }
            return;
        }

        updateMediaSessionPositionState(options);
    }

    function clearMediaSession() {
        if (!canUseMediaSession()) {
            return;
        }

        try {
            navigator.mediaSession.playbackState = "none";
            navigator.mediaSession.metadata = null;
            lastMediaSessionMetadataKeyRef.current = "";
        } catch {
            // Safe to ignore.
        }
    }

    async function unlockOutputElementForAppAction(element = outputAudioRef.current) {
        if (isIPhonePauseSquelched()) {
            holdIPhonePauseSilence("Blocked hidden iPhone element play() during Pause");
            return false;
        }

        outputElementActionGuardRef.current = true;

        try {
            return await unlockOutputAudioElement(element);
        } finally {
            window.setTimeout(() => {
                outputElementActionGuardRef.current = false;
            }, 80);
        }
    }

    function isIPhoneOutputRouteArmed() {
        if (!isIOSAudioDevice()) {
            return true;
        }

        const context = audioContextRef.current;
        const element = outputAudioRef.current;
        const stream = mediaStreamDestinationRef.current?.stream || null;

        return Boolean(
            context &&
            context.state === "running" &&
            element &&
            stream &&
            element.srcObject === stream &&
            !element.paused &&
            !element.ended &&
            !element.muted &&
            Number(element.volume) > 0
        );
    }

    async function keepIPhoneOutputElementAliveForLockScreen(reason = "iPhone lock-screen output keep-alive", options = {}) {
        if (!isIOSAudioDevice()) {
            return true;
        }

        if (!options.allowDuringPause && isInsideCleanPauseWindow()) {
            return false;
        }

        const now = Date.now();

        if (now - lastIPhoneOutputKeepAliveAtRef.current < 220 && isIPhoneOutputRouteArmed()) {
            return true;
        }

        lastIPhoneOutputKeepAliveAtRef.current = now;

        try {
            const { context } = ensureLiveGraph();

            if (!context || context.state === "closed") {
                iPhoneLockScreenOutputArmedRef.current = false;
                return false;
            }

            if (context.state !== "running") {
                await context.resume();
            }

            ensureIPhoneSilentKeepAlive(context, mediaStreamDestinationRef.current);
            attachOutputElementToCurrentStream(outputAudioRef.current);

            if (!isIPhoneOutputRouteArmed()) {
                await unlockOutputElementForAppAction(outputAudioRef.current);
            }

            const armed = isIPhoneOutputRouteArmed();
            iPhoneLockScreenOutputArmedRef.current = armed;

            if (armed && carPlaySafeModeRef.current) {
                setCarPlayOutputStatusIfChanged(
                    `${reason}: hidden iPhone stream is still alive, so lock-screen Play can restart the WebAudio effects graph without needing the page unlocked.`
                );
            }

            return armed;
        } catch {
            iPhoneLockScreenOutputArmedRef.current = false;
            return false;
        }
    }

    function pauseOutputElementForAppAction(options = {}) {
        const element = outputAudioRef.current;

        if (!element || !isIOSAudioDevice()) {
            return;
        }

        const shouldKeepAlive = options.keepAlive !== false;

        if (shouldKeepAlive) {
            keepIPhoneOutputElementAliveForLockScreen(
                options.reason || "Paused WebAudio while keeping iPhone lock-screen output armed"
            ).catch(() => {
                iPhoneLockScreenOutputArmedRef.current = false;
            });
            return;
        }

        outputElementActionGuardRef.current = true;

        try {
            if (!element.paused) {
                element.pause();
            }

            iPhoneLockScreenOutputArmedRef.current = false;
        } catch {
            // Safe to ignore iOS media element pause issues.
        } finally {
            window.setTimeout(() => {
                outputElementActionGuardRef.current = false;
            }, 80);
        }
    }

    function forceRestoreAudibleWebAudioOutput(context = audioContextRef.current, nodes = liveNodesRef.current, options = {}) {
        if (!options.allowDuringPause && isIPhonePauseSquelched()) {
            holdIPhonePauseSilence("Blocked output-volume restore during Pause");
            return 0;
        }

        const safeSettings = normalizeSettings(latestSettingsRef.current);
        const safeBaseVolume = Math.max(
            0.01,
            nodes?.carPlaySafeMode ? Math.min(safeSettings.baseVolume, 1) : safeSettings.baseVolume
        );
        const now = context?.currentTime || 0;

        mutedRef.current = false;
        setIsMuted(false);

        try {
            if (monitorMuteGainRef.current?.gain) {
                setAudioParam(monitorMuteGainRef.current.gain, 1, now, 0.015);
            }
        } catch {
            // Best-effort lock-screen output recovery.
        }

        try {
            if (nodes?.baseVolumeGain?.gain) {
                setAudioParam(nodes.baseVolumeGain.gain, safeBaseVolume, now, 0.015);
            }
        } catch {
            // Best-effort lock-screen output recovery.
        }

        const element = outputAudioRef.current;

        if (element && isIOSAudioDevice()) {
            try {
                restoreKeepAliveCarrierAfterPlay();
                element.muted = false;
                element.defaultMuted = false;
                element.volume = 1;
                element.playsInline = true;
                element.autoplay = true;
                element.preload = "auto";
                element.removeAttribute("muted");
                element.setAttribute("playsinline", "");
                element.setAttribute("webkit-playsinline", "");
            } catch {
                // Some iOS/WebView builds can reject element mutations while locked.
            }
        }

        applySettingsToNodes(nodes, safeSettings, now);
        applyMonitorMute(false);

        return safeBaseVolume;
    }

    function getSafeAudibleBaseVolume(nodes = liveNodesRef.current) {
        const safeSettings = normalizeSettings(latestSettingsRef.current);

        return Math.max(
            0.01,
            nodes?.carPlaySafeMode
                ? Math.min(safeSettings.baseVolume, 1)
                : safeSettings.baseVolume
        );
    }

    function prepareOutputForGlitchlessSourceStart(context = audioContextRef.current, nodes = liveNodesRef.current) {
        const now = context?.currentTime || 0;

        try {
            if (monitorMuteGainRef.current?.gain) {
                setAudioParam(monitorMuteGainRef.current.gain, 0, now, 0);
            }
        } catch {
            // Start pre-silence is best-effort only.
        }

        try {
            if (nodes?.baseVolumeGain?.gain) {
                setAudioParam(nodes.baseVolumeGain.gain, 0, now, 0);
            }
        } catch {
            // Start pre-silence is best-effort only.
        }
    }

    function releaseOutputAfterGlitchlessSourceStart(context = audioContextRef.current, nodes = liveNodesRef.current, options = {}) {
        if (!context || !nodes) {
            return;
        }

        const now = context.currentTime || 0;
        const rampSeconds = Math.max(0.025, Number(options.rampSeconds) || 0.07);
        const safeBaseVolume = getSafeAudibleBaseVolume(nodes);

        try {
            if (monitorMuteGainRef.current?.gain) {
                setAudioParam(
                    monitorMuteGainRef.current.gain,
                    mutedRef.current ? 0 : 1,
                    now,
                    rampSeconds
                );
            }
        } catch {
            // Start ramp is best-effort only.
        }

        try {
            if (nodes.baseVolumeGain?.gain) {
                setAudioParam(
                    nodes.baseVolumeGain.gain,
                    safeBaseVolume,
                    now,
                    rampSeconds
                );
            }
        } catch {
            // Start ramp is best-effort only.
        }
    }

    function attachOutputElementToCurrentStream(element = outputAudioRef.current, forcedStream = null) {
        if (!element || !isIOSAudioDevice()) {
            return false;
        }

        const stream = forcedStream || mediaStreamDestinationRef.current?.stream || null;

        if (!stream) {
            return false;
        }

        try {
            const needsStreamRebind =
                element.srcObject !== stream ||
                element.ended ||
                element.networkState === element.NETWORK_NO_SOURCE;

            if (needsStreamRebind) {
                try {
                    element.pause();
                } catch {
                    // Safe to ignore pause during iOS stream rebind.
                }

                element.srcObject = stream;

                try {
                    element.load();
                } catch {
                    // Some iOS builds do not like load() on MediaStream-backed audio.
                }
            }

            const insidePause = isInsideCleanPauseWindow();

            element.muted = false;
            element.defaultMuted = false;
            element.volume = insidePause ? 0 : 1;
            element.playsInline = true;
            element.autoplay = true;
            element.preload = "auto";
            element.controls = false;
            element.setAttribute("playsinline", "");
            element.setAttribute("webkit-playsinline", "");
            element.removeAttribute("muted");

            if (!isInsideCleanPauseWindow()) {
                forceRestoreAudibleWebAudioOutput(audioContextRef.current, liveNodesRef.current);
            }

            return true;
        } catch {
            return false;
        }
    }

    async function restartIPhoneOutputStreamForLockScreenPlay(reason = "Lock-screen Play") {
        if (!isIOSAudioDevice()) {
            return true;
        }

        clearIPhonePauseGuardsForPlay();

        const restartToken = mediaSessionPlayRestartTokenRef.current + 1;

        mediaSessionPlayRestartTokenRef.current = restartToken;
        lastMediaSessionPlayRestartAtRef.current = Date.now();

        const { context } = ensureLiveGraph();

        if (!context || context.state === "closed") {
            iPhoneLockScreenOutputArmedRef.current = false;
            throw new Error("The iPhone audio context is closed. Tap the page Play button once to rebuild it.");
        }

        const element = outputAudioRef.current;
        const attempts = [0, 60, 160];

        for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex += 1) {
            const delayMs = attempts[attemptIndex];

            if (delayMs) {
                await sleep(delayMs);
            }

            if (mediaSessionPlayRestartTokenRef.current !== restartToken) {
                return false;
            }

            try {
                if (context.state !== "running") {
                    await context.resume();
                }
            } catch {
                // Safari can reject resume while the app is backgrounded. The next
                // pass still tries to use the already-unlocked media element route.
            }

            ensureIPhoneSilentKeepAlive(context, mediaStreamDestinationRef.current);
            attachOutputElementToCurrentStream(
                element,
                mediaStreamDestinationRef.current?.stream || null
            );
            forceRestoreAudibleWebAudioOutput(context, liveNodesRef.current);

            if (!isIPhoneOutputRouteArmed()) {
                await unlockOutputElementForAppAction(element);
                forceRestoreAudibleWebAudioOutput(context, liveNodesRef.current);
            }

            if (context.state !== "running") {
                try {
                    await context.resume();
                } catch {
                    // Best effort. The final armed check below decides whether playback can start.
                }
            }

            const armed = isIPhoneOutputRouteArmed();
            iPhoneLockScreenOutputArmedRef.current = armed;

            if (armed) {
                iPhoneOutputHeldForLockScreenRestartRef.current = false;
                setCarPlayOutputStatusIfChanged(
                    `${reason} re-armed the hidden iPhone media stream and Media Session can restart the WebAudio source from the saved position.`
                );
                return true;
            }
        }

        iPhoneLockScreenOutputArmedRef.current = false;
        setCarPlayOutputStatusIfChanged(
            `${reason}: the hidden iPhone stream could not prove it was armed, so the player will still try the single hidden iPhone media-element route instead of failing before sound can start.`
        );
        return false;
    }

    async function confirmIPhoneOutputAfterSourceStart(context, options = {}) {
        if (!isIOSAudioDevice()) {
            return true;
        }

        const element = outputAudioRef.current;

        if (!context || context.state === "closed" || !element) {
            iPhoneLockScreenOutputArmedRef.current = false;
            return false;
        }

        const delays = options.fromMediaSession || options.forceIPhoneOutputPostStart
            ? [0, 70, 180, 320]
            : [0, 90];

        for (const delayMs of delays) {
            if (delayMs) {
                await sleep(delayMs);
            }

            try {
                if (context.state !== "running") {
                    await context.resume();
                }
            } catch {
                // Safari may reject resume from a background lock-screen action.
                // The MediaStream-backed audio element can still keep the route alive.
            }

            ensureIPhoneSilentKeepAlive(context, mediaStreamDestinationRef.current);
            attachOutputElementToCurrentStream(
                element,
                mediaStreamDestinationRef.current?.stream || null
            );

            try {
                element.muted = false;
                element.defaultMuted = false;
                element.volume = 1;
                element.playsInline = true;
                element.autoplay = true;
                element.removeAttribute("muted");
            } catch {
                // Safe to ignore unsupported element mutations.
            }

            releaseOutputAfterGlitchlessSourceStart(context, liveNodesRef.current, {
                rampSeconds: options.fromMediaSession || options.forceIPhoneOutputPostStart
                    ? 0.09
                    : 0.06,
            });

            if (
                element.paused ||
                element.ended ||
                options.fromMediaSession ||
                options.outputAlreadyRestarted ||
                options.forceIPhoneOutputPostStart
            ) {
                try {
                    await unlockOutputElementForAppAction(element);
                } catch {
                    // The armed check below decides whether this was fatal.
                }
            }

            const armed = isIPhoneOutputRouteArmed();
            iPhoneLockScreenOutputArmedRef.current = armed;

            if (armed) {
                iPhoneOutputHeldForLockScreenRestartRef.current = false;
                return true;
            }
        }

        iPhoneLockScreenOutputArmedRef.current = false;
        return false;
    }

    async function pauseLiveWebAudioForLockScreen(reason = "Lock-screen Pause") {
        if (!isIOSAudioDevice()) {
            return false;
        }

        const context = audioContextRef.current;
        const source = activeSourceRef.current;

        if (!context || context.state === "closed" || !source || !playingRef.current) {
            return false;
        }

        if (pauseActionInFlightRef.current) {
            updateMediaSessionState("paused", { forcePosition: true });
            return true;
        }

        beginCleanPauseWindow(2300);
        const pauseSerial = iPhonePauseSerialRef.current;
        outputElementActionGuardRef.current = true;
        holdIPhonePauseSilence(`${reason} started`);

        const nextOffset = getCurrentOffset();

        // Lock-screen Pause must be a one-way quiet fade. It must not play(),
        // load(), rebind, or keep-alive the hidden media element during the pause
        // command. Those operations restart the MediaStream route for a split
        // second on iOS and sound like stutter or duplicated audio.
        try {
            await fadeMonitorForPause(context, 0.14);
            holdIPhonePauseSilence(`${reason} fade completed`);
        } catch {
            // Best-effort click/stutter prevention before suspending WebAudio.
        }

        startedOffsetRef.current = nextOffset;
        startedAtContextTimeRef.current = context.currentTime || 0;
        iPhoneLockScreenLivePauseRef.current = {
            active: true,
            source,
            offset: nextOffset,
            contextTime: context.currentTime || 0,
            reason,
        };

        stopPositionTimer();
        stopVisualizer();
        syncPlaybackPosition(nextOffset, {
            forceMediaSession: true,
        });
        setPlayingState(false);
        updateMediaSessionState("paused", { forcePosition: true });

        try {
            if (context.state === "running") {
                holdIPhonePauseSilence(`${reason} before AudioContext suspend`);
                await context.suspend();
                holdIPhonePauseSilence(`${reason} after AudioContext suspend`);
            }
        } catch {
            iPhoneLockScreenLivePauseRef.current = {
                active: false,
                source: null,
                offset: 0,
                contextTime: 0,
                reason: "",
            };
            return false;
        } finally {
            window.setTimeout(() => {
                outputElementActionGuardRef.current = false;
            }, 900);
        }

        window.setTimeout(() => {
            if (iPhonePauseSerialRef.current === pauseSerial && !playingRef.current) {
                holdIPhonePauseSilence(`${reason} post-pause guard`);
            }
        }, 260);

        return true;
    }

    async function resumeLiveWebAudioFromLockScreen(reason = "Lock-screen Play") {
        if (!isIOSAudioDevice()) {
            return false;
        }

        const held = iPhoneLockScreenLivePauseRef.current;
        const context = audioContextRef.current;
        const source = activeSourceRef.current;

        if (!held?.active || !context || context.state === "closed" || !source) {
            return false;
        }

        try {
            clearIPhonePauseGuardsForPlay();
            attachOutputElementToCurrentStream(
                outputAudioRef.current,
                mediaStreamDestinationRef.current?.stream || null
            );
            setIPhoneOutputElementVolumeForPause(1);
            restoreKeepAliveCarrierAfterPlay();

            try {
                await unlockOutputElementForAppAction(outputAudioRef.current);
            } catch {
                // Media Session Play usually grants enough permission to resume
                // the already-started AudioContext even if element.play() is noisy.
            }

            if (context.state !== "running") {
                await context.resume();
            }

            pauseActionInFlightRef.current = false;
            ignoreOutputPauseUntilRef.current = 0;
            clearPauseReleaseTimer();
            forceRestoreAudibleWebAudioOutput(context, liveNodesRef.current);

            startedOffsetRef.current = clamp(
                numberOrDefault(held.offset, startedOffsetRef.current),
                0,
                audioBufferRef.current?.duration || Number.MAX_SAFE_INTEGER
            );
            startedAtContextTimeRef.current = context.currentTime || 0;
            manualStopRef.current = false;
            iPhoneLockScreenLivePauseRef.current = {
                active: false,
                source: null,
                offset: 0,
                contextTime: 0,
                reason: "",
            };

            setPlayingState(true);
            updateMediaSessionMetadata();
            updateMediaSessionState("playing", { forcePosition: true });
            startPositionTimer();
            startVisualizer();

            confirmIPhoneOutputAfterSourceStart(context, {
                fromMediaSession: true,
                outputAlreadyRestarted: true,
                forceIPhoneOutputPostStart: true,
            }).catch(() => {
                // The single hidden iPhone media-element route remains attached
                // sink if the hidden element cannot prove it is playing while locked.
            });

            setCarPlayOutputStatusIfChanged(
                `${reason}: resumed the same suspended WebAudio source and restored monitor/base volume. This avoids the iOS locked-screen bug where a newly-created WebAudio source advances time but does not become audible.`
            );

            return true;
        } catch {
            iPhoneLockScreenLivePauseRef.current = {
                active: false,
                source: null,
                offset: 0,
                contextTime: 0,
                reason: "",
            };
            return false;
        }
    }

    async function runMediaSessionAction(actionLabel, action) {
        const serial = mediaSessionActionSerialRef.current + 1;
        mediaSessionActionSerialRef.current = serial;
        lastMediaSessionActionRef.current = actionLabel || "lock-screen control";

        const run = async () => {
            try {
                updateMediaSessionMetadata();

                const result = await action();

                if (mediaSessionActionSerialRef.current === serial) {
                    updateMediaSessionMetadata();
                    updateMediaSessionState(playingRef.current ? "playing" : "paused", {
                        forcePosition: true,
                    });
                }

                return result;
            } catch (error) {
                if (mediaSessionActionSerialRef.current === serial) {
                    updateMediaSessionState(playingRef.current ? "playing" : "paused", {
                        forcePosition: true,
                    });
                    setError(
                        `${actionLabel || "Lock-screen control"} failed. ${
                            error?.message || "Tap the page Play button once to re-arm browser audio."
                        }`
                    );
                }
                return false;
            }
        };

        const queued = mediaSessionActionQueueRef.current
            .catch(() => {})
            .then(run);

        mediaSessionActionQueueRef.current = queued.catch(() => {});

        return queued;
    }

    async function playFromMediaSession() {
        const isIPhoneLockScreenPlay = isIOSAudioDevice();
        const shouldRestartAfterLockScreenStop = Boolean(
            iPhoneOutputHeldForLockScreenRestartRef.current
        );
        let outputAlreadyRestarted = false;

        if (isIPhoneLockScreenPlay) {
            const resumedHeldSource = await resumeLiveWebAudioFromLockScreen(
                "Lock-screen Play"
            );

            if (resumedHeldSource) {
                return true;
            }

            const { context, nodes } = ensureLiveGraph();
            clearIPhonePauseGuardsForPlay();
            forceRestoreAudibleWebAudioOutput(context, nodes);
            outputAlreadyRestarted = await restartIPhoneOutputStreamForLockScreenPlay(
                "Lock-screen Play"
            );
            forceRestoreAudibleWebAudioOutput(context, nodes);
        }

        if (playingRef.current && activeSourceRef.current) {
            forceRestoreAudibleWebAudioOutput(audioContextRef.current, liveNodesRef.current);
            updateMediaSessionState("playing", { forcePosition: true });
            return true;
        }

        if (audioBufferRef.current) {
            const mediaDuration = getMediaSessionDuration();
            const mediaPosition = getMediaSessionPosition();
            const shouldRestartFromBeginning =
                shouldRestartAfterLockScreenStop ||
                startedOffsetRef.current <= 0.01 ||
                (mediaDuration > 0 && mediaPosition >= Math.max(0, mediaDuration - 0.25));

            return startBufferPlayback(shouldRestartFromBeginning, {
                fromMediaSession: true,
                preserveUnlockedOutput: true,
                outputAlreadyRestarted,
                forceIPhoneOutputPostStart: true,
            });
        }

        const list = playlistRef.current;
        const activeIndex = activePlaylistIndexRef.current;

        if (Array.isArray(list) && list.length) {
            const startIndex = activeIndex >= 0 ? activeIndex : 0;

            return loadNextPlayablePlaylistItem(startIndex, {
                autoplay: true,
                reason: "Lock-screen play request",
                preserveUnlockedOutput: true,
                fromMediaSession: true,
                outputAlreadyRestarted,
                forceIPhoneOutputPostStart: true,
            });
        }

        setError("Load a media source or playlist before using lock-screen Play.");
        updateMediaSessionState("paused", { forcePosition: true });
        return false;
    }

    async function pauseFromMediaSession() {
        lastMediaSessionPauseAtRef.current = Date.now();

        if (playingRef.current) {
            if (isIOSAudioDevice()) {
                const heldLiveSource = await pauseLiveWebAudioForLockScreen(
                    "Lock-screen Pause"
                );

                if (heldLiveSource) {
                    return true;
                }
            }

            await pausePlayback({
                reason: "Lock-screen Pause",
                fromMediaSession: true,
            });

            return true;
        }

        if (isIOSAudioDevice()) {
            extendCleanPauseWindow(900);
        }

        updateMediaSessionState("paused", { forcePosition: true });
        return true;
    }

    async function stopFromMediaSession() {
        const keepIOSOutputAvailableForRestart = isIOSAudioDevice();

        if (audioBufferRef.current || playingRef.current) {
            stopPlayback(true, {
                fromMediaSessionStop: true,
                stopIPhoneOutputStream: !keepIOSOutputAvailableForRestart,
                keepIPhoneOutputStreamAlive: keepIOSOutputAvailableForRestart,
            });
        }

        if (keepIOSOutputAvailableForRestart) {
            forceRestoreAudibleWebAudioOutput(audioContextRef.current, liveNodesRef.current);
            const held = await keepIPhoneOutputElementAliveForLockScreen(
                "Lock-screen Stop reset the song but kept the iPhone lock-screen audio route alive for restart",
                { allowDuringPause: true }
            );
            forceRestoreAudibleWebAudioOutput(audioContextRef.current, liveNodesRef.current);

            iPhoneOutputHeldForLockScreenRestartRef.current = held;
            iPhoneLockScreenOutputArmedRef.current = held;
            updateMediaSessionState("paused", { forcePosition: true });
            setInfo(
                held
                    ? "Lock-screen Stop reset WebAudio to the beginning, restored the hidden output volume path, and kept the iPhone stream alive silently so lock-screen Play can restart without unlocking the phone."
                    : "Lock-screen Stop reset WebAudio to the beginning. iOS did not keep the hidden output route alive, so open the page once and press Play if lock-screen Play cannot restart."
            );
            return true;
        }

        updateMediaSessionState("paused", { forcePosition: true });
        setInfo("Lock-screen Stop stopped playback and reset the track position.");
        return true;
    }

    async function nextTrackFromMediaSession() {
        const list = playlistRef.current;
        const isIPhoneLockScreenAction = isIOSAudioDevice();
        let outputAlreadyRestarted = false;

        if (isIPhoneLockScreenAction) {
            const { context, nodes } = ensureLiveGraph();
            forceRestoreAudibleWebAudioOutput(context, nodes);
            outputAlreadyRestarted = await restartIPhoneOutputStreamForLockScreenPlay(
                "Lock-screen Next"
            );
            forceRestoreAudibleWebAudioOutput(context, nodes);
        }

        if (!Array.isArray(list) || !list.length) {
            if (isIPhoneLockScreenAction) {
                await keepIPhoneOutputElementAliveForLockScreen(
                    "Lock-screen Next found no playlist but kept the iPhone stream alive"
                );
                forceRestoreAudibleWebAudioOutput(audioContextRef.current, liveNodesRef.current);
            }

            setInfo("No playlist is loaded, so lock-screen Next has no track to skip to. It no longer seeks forward by 10 seconds.");
            return true;
        }

        const currentIndex = activePlaylistIndexRef.current;
        const nextIndex = getNextPlaylistIndex(currentIndex, list);

        return loadNextPlayablePlaylistItem(nextIndex, {
            autoplay: true,
            reason: "Lock-screen next-track request",
            preserveUnlockedOutput: true,
            fromMediaSession: true,
            outputAlreadyRestarted,
            forceIPhoneOutputPostStart: true,
        });
    }

    async function previousTrackFromMediaSession() {
        const list = playlistRef.current;
        const wasPlaying = playingRef.current;
        const isIPhoneLockScreenAction = isIOSAudioDevice();
        let outputAlreadyRestarted = false;

        if (isIPhoneLockScreenAction) {
            const { context, nodes } = ensureLiveGraph();
            forceRestoreAudibleWebAudioOutput(context, nodes);
            outputAlreadyRestarted = await restartIPhoneOutputStreamForLockScreenPlay(
                "Lock-screen Previous"
            );
            forceRestoreAudibleWebAudioOutput(context, nodes);
        }

        if (!Array.isArray(list) || !list.length) {
            await seekTo(0, wasPlaying, {
                fromMediaSession: true,
                preserveUnlockedOutput: true,
                outputAlreadyRestarted,
                forceIPhoneOutputPostStart: true,
            });
            setInfo("No playlist is loaded, so lock-screen Previous restarted the current media from the beginning. It no longer seeks backward by 10 seconds.");
            return true;
        }

        const currentIndex = activePlaylistIndexRef.current;
        const previousIndex = getPreviousPlaylistIndex(currentIndex, list);

        return loadNextPlayablePlaylistItem(previousIndex, {
            autoplay: true,
            reason: "Lock-screen previous-track request",
            preserveUnlockedOutput: true,
            fromMediaSession: true,
            outputAlreadyRestarted,
            forceIPhoneOutputPostStart: true,
        });
    }

    async function seekToFromMediaSession(details = {}) {
        const durationValue = getMediaSessionDuration();

        if (!durationValue) {
            updateMediaSessionState(playingRef.current ? "playing" : "paused", {
                forcePosition: true,
            });
            return true;
        }

        const requestedSeekTime = Number(details.seekTime);
        const fallbackSeekTime = Number(mediaPositionRef.current || startedOffsetRef.current || 0);
        const nextSeekTime = clamp(
            Number.isFinite(requestedSeekTime) ? requestedSeekTime : fallbackSeekTime,
            0,
            durationValue
        );
        const wasPlaying = Boolean(
            playingRef.current ||
            isPlayingStateRef.current ||
            wasPlayingBeforeScrubRef.current
        );
        const isFastSeek = Boolean(details.fastSeek);
        let outputAlreadyRestarted = false;

        lastMediaSessionSeekAtRef.current = Date.now();
        pendingMediaSessionSeekRef.current = nextSeekTime;
        scrubbingRef.current = true;
        setIsScrubbing(true);
        syncPlaybackPosition(nextSeekTime, {
            fromMediaSession: true,
            forceMediaSession: true,
        });
        updateMediaSessionState(wasPlaying ? "playing" : "paused", {
            forcePosition: true,
        });

        if (isFastSeek) {
            const alreadyFastSeeking = Boolean(mediaSessionFastSeekCommitTimerRef.current);

            clearMediaSessionFastSeekCommitTimer();

            if (!alreadyFastSeeking) {
                wasPlayingBeforeScrubRef.current = wasPlaying;
            }

            if (wasPlaying && activeSourceRef.current) {
                manualStopRef.current = true;
                stopActiveSource();
                stopPositionTimer();
                stopVisualizer();

                if (isIOSAudioDevice()) {
                    keepIPhoneOutputElementAliveForLockScreen(
                        "Lock-screen fast scrub is preserving the iPhone output route"
                    ).catch(() => {
                        iPhoneLockScreenOutputArmedRef.current = false;
                    });
                }
            }

            startedOffsetRef.current = nextSeekTime;
            startedAtContextTimeRef.current = 0;
            mediaSessionFastSeekCommitTimerRef.current = window.setTimeout(() => {
                mediaSessionFastSeekCommitTimerRef.current = null;
                if (pendingMediaSessionSeekRef.current !== null && scrubbingRef.current) {
                    seekToFromMediaSession({
                        seekTime: pendingMediaSessionSeekRef.current,
                        fastSeek: false,
                    }).catch(() => {});
                }
            }, 420);

            return true;
        }

        clearMediaSessionFastSeekCommitTimer();

        if (isIOSAudioDevice() && wasPlaying) {
            try {
                const { context, nodes } = ensureLiveGraph();
                forceRestoreAudibleWebAudioOutput(context, nodes);
                outputAlreadyRestarted = await restartIPhoneOutputStreamForLockScreenPlay(
                    "Lock-screen Scrub"
                );
                forceRestoreAudibleWebAudioOutput(context, nodes);
            } catch {
                outputAlreadyRestarted = false;
            }
        }

        try {
            await seekTo(nextSeekTime, wasPlaying, {
                fromMediaSession: true,
                preserveUnlockedOutput: isIOSAudioDevice(),
                outputAlreadyRestarted,
                forceIPhoneOutputPostStart: isIOSAudioDevice() && wasPlaying,
                keepPlayingUiDuringSeek: wasPlaying,
                quietStatus: true,
            });
        } finally {
            scrubbingRef.current = false;
            setIsScrubbing(false);
            wasPlayingBeforeScrubRef.current = false;
            pendingMediaSessionSeekRef.current = null;
        }

        syncPlaybackPosition(nextSeekTime, {
            fromMediaSession: true,
            forceMediaSession: true,
            clearPendingMediaSessionSeek: true,
        });
        updateMediaSessionState(wasPlaying ? "playing" : "paused", {
            forcePosition: true,
        });
        return true;
    }

    function installMediaSessionHandlers() {
        if (!canUseMediaSession() || typeof navigator.mediaSession.setActionHandler !== "function") {
            return;
        }

        const safeSetAction = (action, handler) => {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch {
                // Older Safari builds may not support every action.
            }
        };

        const safeClearAction = (action) => {
            try {
                navigator.mediaSession.setActionHandler(action, null);
            } catch {
                // Older Safari builds may not support clearing every action.
            }
        };

        // Keep real previous/next track buttons by clearing 10-second skip
        // actions, but publish duration/position and install seekto so the lock
        // screen / CarPlay scrubber can seek through the current song.
        ["seekbackward", "seekforward"].forEach(safeClearAction);
        updateMediaSessionPositionState({ forcePosition: true });

        safeSetAction("play", () => {
            return runMediaSessionAction("Lock-screen Play", playFromMediaSession);
        });

        safeSetAction("pause", () => {
            return runMediaSessionAction("Lock-screen Pause", pauseFromMediaSession);
        });

        safeSetAction("stop", () => {
            return runMediaSessionAction("Lock-screen Stop", stopFromMediaSession);
        });

        safeSetAction("seekto", (details) => {
            return runMediaSessionAction("Lock-screen Scrub", () =>
                seekToFromMediaSession(details)
            );
        });

        // Real track controls only. Do not install seekbackward/seekforward.
        safeSetAction("nexttrack", () => {
            return runMediaSessionAction("Lock-screen Next Track", nextTrackFromMediaSession);
        });

        safeSetAction("previoustrack", () => {
            return runMediaSessionAction("Lock-screen Previous Track", previousTrackFromMediaSession);
        });
    }

    function toggleCarPlaySafeMode() {
        setCarPlaySafeMode((current) => {
            const nextValue = !current;

            carPlaySafeModeRef.current = nextValue;
            setInfo(buildCarPlaySafeModeLabel(nextValue));

            if (nextValue && isIOSAudioDevice()) {
                scheduleCarPlayOutputRecovery("CarPlay / USB safe mode enabled", {
                    forcePlay: playingRef.current,
                });
            }

            return nextValue;
        });
    }

    function scheduleCarPlayOutputRecovery(reason, options = {}) {
        if (!isIOSAudioDevice()) {
            return;
        }

        if (carPlayRouteDisengagedBySystemRef.current && !options.forcePlay) {
            updateMediaSessionState("paused", { forcePosition: true });
            return;
        }

        if (!options.forcePlay && shouldTreatAsCarPlayRouteDisengage(reason || "route recovery")) {
            pauseAfterCarPlayRouteDisengage(reason || "CarPlay / USB route disconnected").catch(() => {});
            return;
        }

        if (!options.forcePlay && isInsideCleanPauseWindow()) {
            return;
        }

        clearCarPlayRecoveryTimer();
        lastCarPlayRecoveryReasonRef.current = reason || "iOS audio route recovery";

        if (carPlaySafeModeRef.current) {
            setCarPlayOutputStatusIfChanged(
                `CarPlay / USB safe mode is watching the iOS audio route. Last event: ${
                    reason || "route recovery"
                }.`
            );
        }

        carPlayRecoveryTimerRef.current = window.setTimeout(() => {
            carPlayRecoveryTimerRef.current = null;
            recoverCarPlayOutput(reason, options).catch(() => {});
        }, 120);
    }

    async function recoverCarPlayOutput(reason, options = {}) {
        if (!isIOSAudioDevice()) {
            return false;
        }

        if (carPlayRouteDisengagedBySystemRef.current && !options.forcePlay) {
            updateMediaSessionState("paused", { forcePosition: true });
            setPlayingState(false);
            setCarPlayOutputStatusIfChanged(
                "CarPlay / USB route is disconnected. Playback will stay paused until you press Play again."
            );
            return false;
        }

        if (!options.forcePlay && shouldTreatAsCarPlayRouteDisengage(reason || "route recovery")) {
            await pauseAfterCarPlayRouteDisengage(reason || "CarPlay / USB route disconnected during recovery");
            return false;
        }

        if (!options.forcePlay && isInsideCleanPauseWindow()) {
            holdIPhonePauseSilence(reason || "Blocked route recovery during Pause");
            return false;
        }

        const context = audioContextRef.current;
        const element = outputAudioRef.current;
        const shouldForcePlay = Boolean(options.forcePlay);

        try {
            if (context && context.state !== "closed") {
                if (mediaStreamDestinationRef.current) {
                    ensureIPhoneSilentKeepAlive(context, mediaStreamDestinationRef.current);
                }

                if (context.state !== "running") {
                    await context.resume();
                }
            }

            if (element && (playingRef.current || shouldForcePlay || iPhoneLockScreenOutputArmedRef.current)) {
                await keepIPhoneOutputElementAliveForLockScreen(
                    reason || "iOS audio route recovery",
                    { allowDuringPause: shouldForcePlay || playingRef.current }
                );
            }

            if (
                playingRef.current &&
                !activeSourceRef.current &&
                audioBufferRef.current &&
                context?.state === "running"
            ) {
                await startBufferPlayback(false, {
                    fromRouteRecovery: true,
                    preserveUnlockedOutput: true,
                });
            }

            updateMediaSessionMetadata();
            updateMediaSessionState(playingRef.current ? "playing" : "paused");

            setCarPlayOutputStatusIfChanged(
                carPlaySafeModeRef.current
                    ? `CarPlay / USB safe mode recovered the iOS output route${
                        reason ? ` after ${reason}` : ""
                    }.`
                    : buildCarPlaySafeModeLabel(false)
            );

            return true;
        } catch (error) {
            setCarPlayOutputStatusIfChanged(
                `CarPlay / USB output recovery needs one more tap on Play. ${
                    error?.message || buildMobileAudioHint()
                }`
            );
            return false;
        }
    }

    function refreshStorageInfo() {
        setStorageInfo(buildPersistenceInfo());
    }

    function clearSavedBrowserSession() {
        clearPersistedBrowserSession();
        refreshStorageInfo();
        setInfo("Saved audio/session data cleared from localStorage, cookies, and browser IndexedDB uploaded-file storage. Current in-memory playback remains until you clear media or refresh.");
    }

    async function restorePersistedMediaOnBoot() {
        const savedMedia = readPersistedLastMedia();

        if (!savedMedia) {
            if (playlistRef.current.length || readPersistedDirectLink()) {
                setInfo("Restored saved settings, playlist, repeat mode, and direct-link drafts from localStorage/cookies.");
            }

            return;
        }

        if (savedMedia.kind === "file" && savedMedia.dataUrl) {
            try {
                setIsLoading(true);
                resetDecodedState();
                clearObjectUrl();

                const restoredFile = dataUrlToFile(
                    savedMedia.dataUrl,
                    savedMedia.title || "saved-audio-file",
                    savedMedia.type || "audio/mpeg"
                );
                const objectUrl = URL.createObjectURL(restoredFile);
                const arrayBuffer = await restoredFile.arrayBuffer();

                objectUrlRef.current = objectUrl;

                setInputFile(restoredFile);
                setSourceKind("file");
                setSourceUrl(objectUrl);
                setActivePlaylistIndex(-1);
                activePlaylistIndexRef.current = -1;

                const metadata = {
                    name: restoredFile.name || savedMedia.title,
                    sourceType: "localStorage",
                    contentType: restoredFile.type || savedMedia.type,
                    byteLength: restoredFile.size || arrayBuffer.byteLength,
                    providerHint: "localStorage saved audio",
                };

                const decodedBuffer = await prepareDecodedBuffer(arrayBuffer, metadata);

                setInfo(
                    `Restored saved local audio "${savedMedia.title}" from localStorage. Browser decoded ${formatTime(
                        decodedBuffer.duration
                    )}.`
                );
            } catch (error) {
                setError(
                    error?.message ||
                    "Saved local audio could not be restored from localStorage. Upload it again."
                );
            } finally {
                setIsLoading(false);
                refreshStorageInfo();
            }

            return;
        }

        if (savedMedia.kind === "url" && savedMedia.url) {
            try {
                setIsLoading(true);
                resetDecodedState();
                clearObjectUrl();

                const cleanLink = validateDirectMediaUrl(savedMedia.url);

                setInputFile(null);
                setSourceKind("url");
                setSourceUrl(cleanLink);
                setDirectLink(cleanLink);
                setActivePlaylistIndex(-1);
                activePlaylistIndexRef.current = -1;

                const { arrayBuffer, metadata } = await fetchDirectMediaArrayBuffer(cleanLink);
                const decodedBuffer = await prepareDecodedBuffer(arrayBuffer, metadata);

                setInfo(
                    `Restored saved direct media link "${savedMedia.title}". Browser decoded ${formatTime(
                        decodedBuffer.duration
                    )}.`
                );
            } catch (error) {
                setDirectLink(savedMedia.url || "");
                setError(
                    error?.message ||
                    "Saved direct media link could not be decoded automatically. Tap Load direct link to try again."
                );
            } finally {
                setIsLoading(false);
                refreshStorageInfo();
            }

            return;
        }

        if (savedMedia.kind === "file" && savedMedia.needsReselect) {
            setInfo(
                `Remembered "${savedMedia.title}", but it was too large for localStorage audio restore. Re-upload that file to play it again.`
            );
        }
    }

    function clearObjectUrl() {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }

    function stopIPhoneSilentKeepAlive() {
        const keepAlive = iPhoneSilentKeepAliveRef.current;

        if (!keepAlive) {
            return;
        }

        try {
            keepAlive.oscillator?.stop();
        } catch {
            // Safe to ignore.
        }

        try {
            keepAlive.oscillator?.disconnect();
        } catch {
            // Safe to ignore.
        }

        try {
            keepAlive.gain?.disconnect();
        } catch {
            // Safe to ignore.
        }

        iPhoneSilentKeepAliveRef.current = null;
    }

    function ensureIPhoneSilentKeepAlive(context, destinationNode) {
        if (!isIOSAudioDevice() || !context || !destinationNode) {
            return false;
        }

        const existing = iPhoneSilentKeepAliveRef.current;

        if (existing?.context === context) {
            return true;
        }

        stopIPhoneSilentKeepAlive();

        try {
            const oscillator = context.createOscillator();
            const gain = context.createGain();

            oscillator.type = "sine";
            // A completely silent WebAudio stream is easy for iOS/Safari to
            // suspend while the phone is locked. Use an ultra-low, practically
            // inaudible carrier only to keep the MediaStream route warm. Keep
            // this gain extremely low so it cannot muddy the real stream.
            oscillator.frequency.value = 14;
            gain.gain.value = isInsideCleanPauseWindow() ? 0 : IPHONE_KEEP_ALIVE_GAIN;

            oscillator.connect(gain);
            gain.connect(destinationNode);
            oscillator.start();

            iPhoneSilentKeepAliveRef.current = {
                context,
                oscillator,
                gain,
            };

            return true;
        } catch {
            iPhoneSilentKeepAliveRef.current = null;
            return false;
        }
    }

    function detachOutputAudioElement() {
        iPhoneLockScreenOutputArmedRef.current = false;
        stopIPhoneSilentKeepAlive();
        clearCarPlayRecoveryTimer();

        if (outputAudioRef.current) {
            try {
                outputAudioRef.current.pause();
                outputAudioRef.current.srcObject = null;
                outputAudioRef.current.removeAttribute("src");
                outputAudioRef.current.load();
            } catch {
                // Safe to ignore.
            }
        }

        mediaStreamDestinationRef.current = null;
    }

    function prepareCanvas(canvas) {
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = rect.width || 640;
        const height = rect.height || 180;

        const desiredWidth = Math.floor(width * dpr);
        const desiredHeight = Math.floor(height * dpr);

        if (canvas.width !== desiredWidth || canvas.height !== desiredHeight) {
            canvas.width = desiredWidth;
            canvas.height = desiredHeight;
        }

        const context = canvas.getContext("2d");

        if (!context) return null;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        return {
            context,
            width,
            height,
        };
    }

    function clearCanvas(canvas, background = "rgba(7,10,19,0.96)") {
        const prepared = prepareCanvas(canvas);

        if (!prepared) return;

        const { context, width, height } = prepared;

        context.clearRect(0, 0, width, height);
        context.fillStyle = background;
        context.fillRect(0, 0, width, height);
    }

    function clearVisualizerCanvases() {
        clearCanvas(waveformCanvasRef.current);
        clearCanvas(frequencyCanvasRef.current);
        clearCanvas(visualizer3dCanvasRef.current);
    }

    function getVisualizerFrequencyValue(dataArray, ratio) {
        if (!dataArray?.length) return 0;

        const safeRatio = clamp(numberOrDefault(ratio, 0), 0, 1);
        const index = Math.min(
            dataArray.length - 1,
            Math.max(0, Math.floor(safeRatio * (dataArray.length - 1)))
        );

        return (dataArray[index] || 0) / 255;
    }

    function drawWaveform(analyser) {
        const prepared = prepareCanvas(waveformCanvasRef.current);

        if (!prepared) return;

        const { context, width, height } = prepared;
        const bufferLength = analyser.frequencyBinCount;

        if (!waveformDataRef.current || waveformDataRef.current.length !== bufferLength) {
            waveformDataRef.current = new Uint8Array(bufferLength);
        }

        const dataArray = waveformDataRef.current;

        analyser.getByteTimeDomainData(dataArray);

        context.clearRect(0, 0, width, height);

        const gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "rgba(7,10,19,0.98)");
        gradient.addColorStop(1, "rgba(17,24,39,0.96)");

        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);

        context.strokeStyle = "rgba(103,232,249,0.14)";
        context.lineWidth = 1;

        for (let y = 0; y < height; y += 30) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(width, y);
            context.stroke();
        }

        context.strokeStyle = "rgba(167,139,250,0.14)";

        for (let x = 0; x < width; x += 58) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, height);
            context.stroke();
        }

        context.lineWidth = 2.5;
        context.strokeStyle = "#67e8f9";
        context.shadowColor = "rgba(103,232,249,0.65)";
        context.shadowBlur = 14;
        context.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i += 1) {
            const v = dataArray[i] / 128.0;
            const y = v * (height / 2);

            if (i === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }

            x += sliceWidth;
        }

        context.lineTo(width, height / 2);
        context.stroke();
        context.shadowBlur = 0;

        drawCanvasLabel(context, "Processed waveform", width, height);
    }

    function drawFrequencyBars(analyser) {
        const prepared = prepareCanvas(frequencyCanvasRef.current);

        if (!prepared) return;

        const { context, width, height } = prepared;
        const bufferLength = analyser.frequencyBinCount;

        if (!frequencyDataRef.current || frequencyDataRef.current.length !== bufferLength) {
            frequencyDataRef.current = new Uint8Array(bufferLength);
        }

        const dataArray = frequencyDataRef.current;

        analyser.getByteFrequencyData(dataArray);

        context.clearRect(0, 0, width, height);

        const gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "rgba(7,10,19,0.98)");
        gradient.addColorStop(1, "rgba(17,24,39,0.96)");

        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);

        const usableBars = Math.floor(bufferLength * 0.58);
        const barWidth = Math.max(2, (width / usableBars) * 0.86);
        const gap = Math.max(1, barWidth * 0.22);

        let x = 0;

        for (let i = 0; i < usableBars; i += 1) {
            const value = dataArray[i];
            const normalized = value / 255;
            const barHeight = Math.max(2, normalized * height * 0.92);

            const barGradient = context.createLinearGradient(
                0,
                height - barHeight,
                0,
                height
            );

            barGradient.addColorStop(0, "rgba(103,232,249,0.98)");
            barGradient.addColorStop(0.55, "rgba(167,139,250,0.86)");
            barGradient.addColorStop(1, "rgba(59,130,246,0.68)");

            context.fillStyle = barGradient;
            context.fillRect(x, height - barHeight, barWidth, barHeight);

            x += barWidth + gap;

            if (x > width) break;
        }

        drawCanvasLabel(context, "Processed frequency spectrum", width, height);
    }

    function draw3DVisualizer(analyser) {
        const visualSettings = visualizer3dSettingsRef.current;

        if (!visualSettings?.enabled) return;

        const prepared = prepareCanvas(visualizer3dCanvasRef.current);

        if (!prepared) return;

        const { context, width, height } = prepared;
        const bufferLength = analyser.frequencyBinCount;

        if (!frequencyDataRef.current || frequencyDataRef.current.length !== bufferLength) {
            frequencyDataRef.current = new Uint8Array(bufferLength);
        }

        const dataArray = frequencyDataRef.current;
        const now = performance.now() * 0.001;
        const centerX = width / 2;
        const centerY = height / 2;
        const selectedModel =
            VISUALIZER_3D_MODE_OPTIONS.find(
                (option) => option.value === visualSettings.model
            ) || VISUALIZER_3D_MODE_OPTIONS[0];

        analyser.getByteFrequencyData(dataArray);

        const bass = getVisualizerFrequencyValue(dataArray, 0.04);
        const mids = getVisualizerFrequencyValue(dataArray, 0.22);

        context.clearRect(0, 0, width, height);

        const background = context.createRadialGradient(
            centerX,
            height * 0.24,
            20,
            centerX,
            centerY,
            Math.max(width, height) * 0.72
        );

        background.addColorStop(0, "rgba(103,232,249,0.2)");
        background.addColorStop(0.42, "rgba(15,23,42,0.98)");
        background.addColorStop(1, "rgba(7,10,19,1)");
        context.fillStyle = background;
        context.fillRect(0, 0, width, height);

        if (visualSettings.model === "sphere-dots") {
            const count = 96;
            const radius = Math.min(width, height) * (0.24 + bass * 0.08);

            for (let index = 0; index < count; index += 1) {
                const ratio = index / Math.max(1, count - 1);
                const y = 1 - ratio * 2;
                const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
                const angle = index * Math.PI * (3 - Math.sqrt(5)) + now * 0.55;
                const value = getVisualizerFrequencyValue(dataArray, ratio);
                const depth = Math.sin(angle + now * 0.8) * 0.5 + 0.5;
                const projectedRadius = radius * (0.62 + depth * 0.5 + value * 0.22);
                const x = centerX + Math.cos(angle) * ringRadius * projectedRadius;
                const dotY = centerY + y * radius * 0.78 + Math.sin(now + index) * value * 18;
                const size = 2.5 + value * 12 + depth * 3;

                context.beginPath();
                context.fillStyle =
                    index % 2 === 0
                        ? `rgba(103,232,249,${0.38 + value * 0.55})`
                        : `rgba(167,139,250,${0.34 + value * 0.55})`;
                context.shadowColor = "rgba(103,232,249,0.35)";
                context.shadowBlur = 10 + value * 16;
                context.arc(x, dotY, size, 0, Math.PI * 2);
                context.fill();
            }
        } else if (visualSettings.model === "terrain-grid") {
            const rows = 18;
            const cols = 46;
            const horizon = height * 0.28;
            const ground = height * 0.88;

            context.lineWidth = 1.2;

            for (let row = 0; row < rows; row += 1) {
                const depth = row / Math.max(1, rows - 1);
                const y = horizon + depth * depth * (ground - horizon);
                const perspective = 0.24 + depth * 0.9;

                context.beginPath();
                for (let col = 0; col < cols; col += 1) {
                    const ratio = col / Math.max(1, cols - 1);
                    const value = getVisualizerFrequencyValue(dataArray, ratio);
                    const x = centerX + (ratio - 0.5) * width * perspective;
                    const lift = value * (78 * (1 - depth * 0.35));
                    const wave = Math.sin(now * 2 + row * 0.7 + col * 0.24) * 6 * mids;
                    const pointY = y - lift + wave;

                    if (col === 0) context.moveTo(x, pointY);
                    else context.lineTo(x, pointY);
                }

                context.strokeStyle =
                    row % 2 === 0 ? "rgba(103,232,249,0.5)" : "rgba(167,139,250,0.42)";
                context.stroke();
            }
        } else {
            const count = 84;
            const baseRadius = Math.min(width, height) * (0.22 + bass * 0.08);

            for (let index = 0; index < count; index += 1) {
                const ratio = index / count;
                const angle = ratio * Math.PI * 2 + now * 0.35;
                const value = getVisualizerFrequencyValue(dataArray, ratio);
                const barLength = 18 + value * Math.min(width, height) * 0.28;
                const depth = Math.sin(angle + now) * 0.5 + 0.5;
                const radius = baseRadius * (0.72 + depth * 0.52);
                const startX = centerX + Math.cos(angle) * radius;
                const startY = centerY + Math.sin(angle) * radius * 0.52;
                const endX = centerX + Math.cos(angle) * (radius + barLength);
                const endY = centerY + Math.sin(angle) * (radius + barLength) * 0.52;

                context.beginPath();
                context.lineWidth = 2 + value * 7 + depth * 2;
                context.strokeStyle =
                    index % 2 === 0
                        ? `rgba(103,232,249,${0.35 + value * 0.55})`
                        : `rgba(167,139,250,${0.3 + value * 0.55})`;
                context.shadowColor = "rgba(103,232,249,0.34)";
                context.shadowBlur = 8 + value * 18;
                context.moveTo(startX, startY);
                context.lineTo(endX, endY);
                context.stroke();
            }
        }

        context.shadowBlur = 0;
        drawCanvasLabel(
            context,
            `3D ${selectedModel.label} visualizer`,
            width,
            height
        );
    }

    function drawVisualizers() {
        const analyser = analyserRef.current;

        if (!analyser || !playingRef.current) {
            visualizerFrameRef.current = null;
            return;
        }

        drawWaveform(analyser);
        drawFrequencyBars(analyser);
        draw3DVisualizer(analyser);

        visualizerFrameRef.current = window.requestAnimationFrame(drawVisualizers);
    }

    function startVisualizer() {
        if (visualizerFrameRef.current) return;
        drawVisualizers();
    }

    function stopVisualizer() {
        if (visualizerFrameRef.current) {
            window.cancelAnimationFrame(visualizerFrameRef.current);
            visualizerFrameRef.current = null;
        }
    }

    function applyMonitorMute(nextMuted) {
        mutedRef.current = nextMuted;

        const context = audioContextRef.current;
        const monitorGain = monitorMuteGainRef.current;

        if (!context || !monitorGain) return;

        if (isIPhonePauseSquelched()) {
            setAudioParam(monitorGain.gain, 0, context.currentTime);
            return;
        }

        setAudioParam(monitorGain.gain, nextMuted ? 0 : 1, context.currentTime);
    }

    function toggleMute() {
        const nextMuted = !mutedRef.current;

        applyMonitorMute(nextMuted);
        setIsMuted(nextMuted);

        setInfo(
            nextMuted
                ? "Preview muted. Rendering still uses all processing."
                : "Preview unmuted."
        );
    }

    function stopPositionTimer() {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }

    function clearMediaSessionFastSeekCommitTimer() {
        if (mediaSessionFastSeekCommitTimerRef.current) {
            window.clearTimeout(mediaSessionFastSeekCommitTimerRef.current);
            mediaSessionFastSeekCommitTimerRef.current = null;
        }
    }

    function getCurrentOffset() {
        const context = audioContextRef.current;
        const buffer = audioBufferRef.current;

        if (!buffer) {
            return 0;
        }

        if (!context || !playingRef.current || !activeSourceRef.current) {
            const stableOffset = Number.isFinite(mediaPositionRef.current)
                ? mediaPositionRef.current
                : startedOffsetRef.current;

            return clamp(stableOffset, 0, buffer.duration);
        }

        const elapsedContextSeconds =
            context.currentTime - startedAtContextTimeRef.current;

        const playbackSeconds = elapsedContextSeconds * currentEffectiveRateRef.current;
        const nextOffset = startedOffsetRef.current + playbackSeconds;

        return clamp(nextOffset, 0, buffer.duration);
    }

    function startPositionTimer() {
        stopPositionTimer();

        timerRef.current = window.setInterval(() => {
            const buffer = audioBufferRef.current;

            if (!buffer || scrubbingRef.current) {
                return;
            }

            const nextOffset = getCurrentOffset();

            syncPlaybackPosition(nextOffset);
            updateMediaSessionPositionState();

            if (nextOffset >= buffer.duration) {
                startedOffsetRef.current = 0;
                startedAtContextTimeRef.current = 0;
                syncPlaybackPosition(0, {
                    commitStartOffset: true,
                    forceMediaSession: true,
                });
                setPlayingState(false);
                updateMediaSessionState("paused", { forcePosition: true });
                stopPositionTimer();
                stopVisualizer();
            }
        }, 120);
    }

    function stopActiveSource() {
        const source = activeSourceRef.current;

        if (!source) return;

        try {
            source.onended = null;
            source.stop();
        } catch {
            // Safe to ignore.
        }

        try {
            source.disconnect();
        } catch {
            // Safe to ignore.
        }

        activeSourceRef.current = null;
        iPhoneLockScreenLivePauseRef.current = {
            active: false,
            source: null,
            offset: 0,
            contextTime: 0,
            reason: "",
        };
    }

    function stopPlayback(resetToBeginning = true, options = {}) {
        manualStopRef.current = true;
        stopActiveSource();
        stopPositionTimer();
        stopVisualizer();
        setPlayingState(false);

        const shouldKeepIPhoneOutputStreamAlive = Boolean(
            options.keepIPhoneOutputStreamAlive ||
            options.keepIPhoneLockScreenRestart ||
            options.preserveUnlockedOutput
        );
        const shouldStopIPhoneOutputStream = Boolean(
            (options.stopIPhoneOutputStream ||
                options.fromMediaSessionStop ||
                options.fromLockScreenStop) &&
            !shouldKeepIPhoneOutputStreamAlive
        );

        if (resetToBeginning) {
            pauseOutputElementForAppAction({
                keepAlive: shouldKeepIPhoneOutputStreamAlive || !shouldStopIPhoneOutputStream,
                reason: shouldKeepIPhoneOutputStreamAlive
                    ? "Stopped WebAudio while keeping the hidden iPhone Media Session output alive for lock-screen restart"
                    : shouldStopIPhoneOutputStream
                        ? "Lock-screen Stop paused the hidden iPhone media stream and reset WebAudio to the beginning"
                        : "Stopped WebAudio while keeping iPhone lock-screen output armed",
            });
            startedOffsetRef.current = 0;
            startedAtContextTimeRef.current = 0;
            setPosition(0);

            if (shouldKeepIPhoneOutputStreamAlive && isIOSAudioDevice()) {
                iPhoneOutputHeldForLockScreenRestartRef.current = true;
            }
        } else if (shouldStopIPhoneOutputStream) {
            pauseOutputElementForAppAction({
                keepAlive: false,
                reason: "Lock-screen Stop paused the hidden iPhone media stream",
            });
        }

        updateMediaSessionState("paused", { forcePosition: true });
    }

    function resetDecodedState() {
        const preserveCarPlayOutput = Boolean(
            carPlaySafeModeRef.current && isIOSAudioDevice() && outputAudioRef.current?.srcObject
        );

        stopPlayback(true);
        stopVisualizer();
        clearVisualizerCanvases();

        if (!preserveCarPlayOutput) {
            detachOutputAudioElement();

            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
                audioContextRef.current = null;
            }
        }

        audioBufferRef.current = null;
        lastDecodedArrayBufferRef.current = null;
        lastDecodedMetadataRef.current = null;
        activeSourceRef.current = null;

        if (!preserveCarPlayOutput) {
            liveNodesRef.current = null;
            analyserRef.current = null;
            monitorMuteGainRef.current = null;
        } else if (liveNodesRef.current && audioContextRef.current) {
            liveNodesRef.current.carPlaySafeMode = true;
            applySettingsToNodes(
                liveNodesRef.current,
                latestSettingsRef.current,
                audioContextRef.current.currentTime
            );
        }

        waveformDataRef.current = null;
        frequencyDataRef.current = null;

        startedOffsetRef.current = 0;
        startedAtContextTimeRef.current = 0;
        currentEffectiveRateRef.current = getEffectivePlaybackRate(
            latestSettingsRef.current
        );

        scrubbingRef.current = false;
        wasPlayingBeforeScrubRef.current = false;

        setIsScrubbing(false);
        mediaDurationRef.current = 0;
        mediaPositionRef.current = 0;
        lastMediaSessionPositionSnapshotRef.current = {
            duration: 0,
            position: 0,
            playbackRate: 1,
        };
        setBufferReady(false);
        setPosition(0);
        setDuration(0);
        setMixerEnabled(false);
        setMediaInfo("");
    }

    function shouldPreserveIPhonePlaylistOutput(options = {}) {
        return Boolean(
            isIOSAudioDevice() &&
            (carPlaySafeModeRef.current ||
                options.fromAutoAdvance ||
                options.fromPlaybackEnded ||
                options.fromRouteRecovery ||
                options.fromMediaSession ||
                options.preserveUnlockedOutput)
        );
    }

    function resetDecodedStateForPlaylistLoad(options = {}) {
        const preserveUnlockedOutput = shouldPreserveIPhonePlaylistOutput(options);

        if (!preserveUnlockedOutput) {
            resetDecodedState();
            return;
        }

        // iPhone/Safari requires audio playback to remain tied to the user-unlocked
        // media element. For automatic next-track playback, do not detach the hidden
        // audio element, close the AudioContext, or rebuild the MediaStream output.
        // Only clear the current decoded buffer/source and keep the unlocked output
        // graph alive for the next playlist track.
        manualStopRef.current = true;
        stopActiveSource();
        stopPositionTimer();
        stopVisualizer();
        clearVisualizerCanvases();

        audioBufferRef.current = null;
        lastDecodedArrayBufferRef.current = null;
        lastDecodedMetadataRef.current = null;
        activeSourceRef.current = null;
        waveformDataRef.current = null;
        frequencyDataRef.current = null;

        startedOffsetRef.current = 0;
        startedAtContextTimeRef.current = 0;
        currentEffectiveRateRef.current = getEffectivePlaybackRate(
            latestSettingsRef.current
        );

        if (isIOSAudioDevice()) {
            try {
                const { context } = ensureLiveGraph();
                ensureIPhoneSilentKeepAlive(context, mediaStreamDestinationRef.current);
                attachOutputElementToCurrentStream(
                    outputAudioRef.current,
                    mediaStreamDestinationRef.current?.stream || null
                );
                forceRestoreAudibleWebAudioOutput(context, liveNodesRef.current);
                keepIPhoneOutputElementAliveForLockScreen(
                    "Keeping the iPhone lock-screen route alive while the next playlist item loads"
                ).catch(() => {
                    // The single hidden iPhone media-element route remains attached.
                });
                updateMediaSessionState("playing", { forcePosition: true });
            } catch {
                // Do not block playlist loading if iOS route preservation fails.
            }
        }

        scrubbingRef.current = false;
        wasPlayingBeforeScrubRef.current = false;

        setIsScrubbing(false);
        setBufferReady(false);
        setPosition(0);
        setDuration(0);
        setMixerEnabled(false);
        setMediaInfo("");
    }

    function isUnlockedIPhoneOutputStillPlaying() {
        const element = outputAudioRef.current;

        return Boolean(
            isIOSAudioDevice() &&
            element &&
            element.srcObject &&
            !element.paused &&
            !element.ended
        );
    }

    async function prepareDecodedBuffer(arrayBuffer, metadata) {
        const decodedBuffer = await decodeAudioBufferWithRecovery(
            arrayBuffer,
            metadata
        );

        const byteDescription = describeMediaBytes(arrayBuffer);

        audioBufferRef.current = decodedBuffer;
        lastDecodedArrayBufferRef.current = arrayBuffer;
        lastDecodedMetadataRef.current = metadata;

        startedOffsetRef.current = 0;
        startedAtContextTimeRef.current = 0;
        currentEffectiveRateRef.current = getEffectivePlaybackRate(
            latestSettingsRef.current
        );

        mediaDurationRef.current = decodedBuffer.duration;
        mediaPositionRef.current = 0;
        lastMediaSessionPositionSnapshotRef.current = {
            duration: decodedBuffer.duration,
            position: 0,
            playbackRate: getMediaSessionPlaybackRate(),
        };

        setBufferReady(true);
        setPosition(0);
        setDuration(decodedBuffer.duration);
        setMixerEnabled(false);
        setMediaInfo(
            `${byteDescription} • ${decodedBuffer.numberOfChannels} channel(s) • ${decodedBuffer.sampleRate} Hz • ${formatTime(decodedBuffer.duration)}`
        );

        updateMediaSessionMetadata();
        updateMediaSessionState(playingRef.current ? "playing" : "paused", {
            forcePosition: true,
        });

        return decodedBuffer;
    }

    async function handleFileSelect(file, sourceLabel = "Upload media file") {
        if (!file) return;

        const isApplePick = isAppleMobileDevice();
        const finalSourceLabel = isApplePick
            ? "Upload media file / iPhone Files picker"
            : sourceLabel;

        const pickedInfo = buildPickedFileInfo(file, finalSourceLabel);
        const pickedWarning = buildPickedFileWarning(file);

        try {
            setIsLoading(true);
            resetDecodedStateForPlaylistLoad();
            clearObjectUrl();

            const objectUrl = URL.createObjectURL(file);

            objectUrlRef.current = objectUrl;

            setInputFile(file);
            setSourceKind("file");
            setSourceUrl(objectUrl);
            setActivePlaylistIndex(-1);
            activePlaylistIndexRef.current = -1;

            if (pickedWarning) {
                setStatus(pickedWarning);
                setStatusTone("info");
            }

            const { arrayBuffer, metadata } = await readFileMediaArrayBuffer(
                file,
                finalSourceLabel
            );

            const savedCurrentAudio = persistCurrentFileSnapshot({
                file,
                arrayBuffer,
                metadata,
            });

            const decodedBuffer = await prepareDecodedBuffer(arrayBuffer, metadata);
            refreshStorageInfo();

            setInfo(
                `Loaded ${file.name}. Browser decoded ${formatTime(
                    decodedBuffer.duration
                )}. Source: ${pickedInfo}. ${
                    savedCurrentAudio
                        ? "This small audio file was saved in localStorage for refresh restore."
                        : "File metadata was saved, but the file is too large for localStorage audio restore."
                }`
            );
        } catch (error) {
            setError(error?.message || "Could not decode this media file.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleLoadDirectLink() {
        try {
            setIsLoading(true);
            resetDecodedState();
            clearObjectUrl();

            const cleanLink = validateDirectMediaUrl(directLink);

            setInputFile(null);
            setSourceKind("url");
            setSourceUrl(cleanLink);
            setActivePlaylistIndex(-1);
            activePlaylistIndexRef.current = -1;

            persistCurrentUrlSnapshot(cleanLink);

            const { arrayBuffer, metadata } = await fetchDirectMediaArrayBuffer(cleanLink);
            const decodedBuffer = await prepareDecodedBuffer(arrayBuffer, metadata);
            refreshStorageInfo();

            setInfo(
                `Loaded direct media link. Browser decoded ${formatTime(
                    decodedBuffer.duration
                )}. This link was saved in localStorage/cookies for refresh restore.`
            );
        } catch (error) {
            setError(error?.message || "Could not load that direct media link.");
        } finally {
            setIsLoading(false);
        }
    }
    async function loadDirectUrlFromRoute(urlValue) {
        try {
            setIsLoading(true);
            resetDecodedState();
            clearObjectUrl();

            const cleanLink = validateDirectMediaUrl(urlValue);

            setInputFile(null);
            setSourceKind("url");
            setSourceUrl(cleanLink);
            setDirectLink(cleanLink);
            setActivePlaylistIndex(-1);
            activePlaylistIndexRef.current = -1;

            persistCurrentUrlSnapshot(cleanLink);

            const { arrayBuffer, metadata } = await fetchDirectMediaArrayBuffer(cleanLink);
            const decodedBuffer = await prepareDecodedBuffer(arrayBuffer, metadata);

            refreshStorageInfo();

            setInfo(
                `Loaded Archive audio link. Browser decoded ${formatTime(
                    decodedBuffer.duration
                )}.`
            );
        } catch (error) {
            setDirectLink(urlValue || "");
            setError(error?.message || "Could not load the Archive audio link.");
        } finally {
            setIsLoading(false);
        }
    }
    useEffect(() => {
        const routeUrl = searchParams.get("url");

        if (!routeUrl) return;

        loadDirectUrlFromRoute(routeUrl);

        // Clean the URL after loading so refresh restore uses localStorage.
        setSearchParams({}, { replace: true });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    function handleClearMedia() {
        resetDecodedState();
        clearObjectUrl();

        setInputFile(null);
        setSourceUrl("");
        setSourceKind("");
        setDirectLink("");
        setActivePlaylistIndex(-1);
        activePlaylistIndexRef.current = -1;
        removeStorageValue(STORAGE_KEYS.lastMedia);
        refreshStorageInfo();

        setInfo(
            "Media cleared. Saved current-audio restore was removed. Playlist, settings, cookies, and direct-link drafts stay saved unless you clear saved session data."
        );
    }

    async function addFilesToPlaylist(files) {
        const pickedFiles = Array.from(files || []).filter(Boolean);

        if (!pickedFiles.length) {
            return;
        }

        const supportedFiles = pickedFiles.filter((file) =>
            isLikelySupportedPickedFile(file)
        );
        const skippedCount = pickedFiles.length - supportedFiles.length;

        if (!supportedFiles.length) {
            setError(
                "No supported audio/video files were selected. Try MP3, WAV, M4A, MP4, MOV, WebM, OGG/Opus, AAC, CAF, or FLAC."
            );
            return;
        }

        setIsLoading(true);

        try {
            const nextItems = await Promise.all(
                supportedFiles.map((file) =>
                    attachPersistedFileData(
                        buildPlaylistItemFromFile(file),
                        file,
                        MAX_PERSISTED_PLAYLIST_FILE_BYTES
                    )
                )
            );

            setPlaylist((current) => {
                const mergedPlaylist = [...current, ...nextItems];

                // Persist the merged metadata immediately so a quick refresh after
                // uploading multiple files still restores every uploaded item.
                persistPlaylistToBrowser(mergedPlaylist);
                return mergedPlaylist;
            });

            const indexedDbSavedCount = nextItems.filter((item) => item.persistedIndexedDb).length;
            const localStorageSavedCount = nextItems.filter(
                (item) => item.persistedDataUrl && !item.persistedIndexedDb
            ).length;
            const sessionOnlyCount = nextItems.length - indexedDbSavedCount - localStorageSavedCount;

            setInfo(
                `Added ${nextItems.length} uploaded file(s) to the playlist${
                    skippedCount ? ` and skipped ${skippedCount} unsupported file(s)` : ""
                }. ${indexedDbSavedCount} file(s) were saved in browser IndexedDB for refresh restore, ${localStorageSavedCount} small file(s) used localStorage fallback, and ${sessionOnlyCount} file(s) are available in this tab only.`
            );
        } catch (error) {
            setError(error?.message || "Could not add files to the playlist.");
        } finally {
            setIsLoading(false);
            refreshStorageInfo();
        }
    }

    function addDirectLinksToPlaylist() {
        const links = splitPlaylistLinks(playlistLink);

        if (!links.length) {
            setError("Paste at least one direct media URL before adding links to the playlist.");
            return;
        }

        const nextItems = [];
        const rejectedLinks = [];

        links.forEach((link) => {
            try {
                nextItems.push(buildPlaylistItemFromUrl(link));
            } catch (error) {
                rejectedLinks.push({
                    link,
                    reason: error?.message || "Invalid media URL",
                });
            }
        });

        if (!nextItems.length) {
            setError(
                "No direct media links were added. Use direct .mp3, .wav, .m4a, .mp4, .mov, .webm, .ogg, .aac, .caf, or .flac URLs that the browser can fetch."
            );
            return;
        }

        setPlaylist((current) => [...current, ...nextItems]);
        setPlaylistLink("");

        setInfo(
            `Added ${nextItems.length} direct media link(s) to the playlist${
                rejectedLinks.length ? ` and skipped ${rejectedLinks.length} invalid link(s)` : ""
            }.`
        );
    }

    async function addCurrentMediaToPlaylist() {
        if (sourceKind === "file" && inputFile) {
            setIsLoading(true);

            try {
                const nextItem = await attachPersistedFileData(
                    buildPlaylistItemFromFile(inputFile),
                    inputFile,
                    MAX_PERSISTED_PLAYLIST_FILE_BYTES
                );

                setPlaylist((current) => {
                    const mergedPlaylist = [...current, nextItem];

                    persistPlaylistToBrowser(mergedPlaylist);
                    return mergedPlaylist;
                });

                setInfo(
                    `Added the currently loaded file "${inputFile.name}" to the playlist. ${
                        nextItem.persistedIndexedDb
                            ? "It was saved in browser IndexedDB so it can stay loaded after refresh."
                            : nextItem.persistedDataUrl
                                ? "It was saved in localStorage for refresh restore."
                                : "It is available in this tab only because browser storage would not save the uploaded file."
                    }`
                );
            } catch (error) {
                setError(error?.message || "The currently loaded file could not be added.");
            } finally {
                setIsLoading(false);
                refreshStorageInfo();
            }

            return;
        }

        if (sourceKind === "url" && sourceUrl) {
            try {
                const nextItem = buildPlaylistItemFromUrl(sourceUrl);

                setPlaylist((current) => [...current, nextItem]);
                setInfo(
                    `Added the currently loaded direct link "${nextItem.title}" to the playlist. Direct links restore automatically after refresh.`
                );
            } catch (error) {
                setError(error?.message || "The currently loaded link could not be added.");
            } finally {
                refreshStorageInfo();
            }

            return;
        }

        setError("Load a file or direct media link first, then add the loaded source to the playlist.");
    }

    function buildCurrentCommunityPostPayload() {
        const activeItem = playlistRef.current?.[activePlaylistIndexRef.current] || activePlaylistItem;
        const playlistAudioUrl =
            activeItem?.kind === "url" && activeItem?.url ? activeItem.url : "";
        const loadedAudioUrl = sourceKind === "url" && sourceUrl ? sourceUrl : "";
        const audioUrl = playlistAudioUrl || loadedAudioUrl;

        if (!audioUrl) {
            throw new Error(
                "Load a direct media link or a URL-based playlist track before posting to the community feed. Local uploaded files need an upload backend before other users can play them."
            );
        }

        if (/^(blob:|data:)/i.test(audioUrl)) {
            throw new Error(
                "This source is only available inside your browser tab. Use a direct media URL or upload the file to the backend before posting it to the community feed."
            );
        }

        const canonicalAudioUrl = getCanonicalArchiveMediaUrl(audioUrl);
        const communityAudioUrl = buildScrapeWebsiteArchiveProxyUrl(
            canonicalAudioUrl || audioUrl
        );
        const isCommunityArchiveProxyUrl =
            isScrapeWebsiteArchiveProxyUrl(communityAudioUrl);
        const usesArchiveProxy =
            isCommunityArchiveProxyUrl || communityAudioUrl !== audioUrl;
        const title = normalizePlaylistUrlTitle(
            activeItem?.title || mediaTitle,
            audioUrl,
            activeItem?.archiveFileName || cleanMediaFileTitle(canonicalAudioUrl)
        );
        const artworkUrl = buildAbsoluteMediaAssetUrl(
            getPlaylistItemArtworkSource(activeItem)
        );

        return {
            userName: readPersistedCommunityListeningUserName(),
            title: title || "Community audio post",
            artist: "",
            audioUrl: communityAudioUrl,
            originalUrl: canonicalAudioUrl || audioUrl,
            directArchiveUrl: canonicalAudioUrl || "",
            proxiedArchiveUrl: isCommunityArchiveProxyUrl ? communityAudioUrl : "",
            usesArchiveProxy,
            artworkUrl,
            caption: `Listening to ${title || "this track"} on AudioMasterLab.`,
            duration: Number.isFinite(duration) ? duration : 0,
            sourceKind: "url",
            playlistItemId: activeItem?.id || "",
            postedFrom: "audio-page",
            createdAt: new Date().toISOString(),
        };
    }

    function buildCurrentCommunityListeningPayload(options = {}) {
        const communityPayload = buildCurrentCommunityPostPayload();
        const bufferDuration = audioBufferRef.current?.duration || 0;
        const durationCandidates = [
            duration,
            communityPayload.duration,
            bufferDuration,
        ]
            .map((value) => sanitizeCommunityListeningSeconds(value, 0))
            .filter((value) => value > 0);
        const durationSeconds = durationCandidates.length
            ? Math.max(...durationCandidates)
            : 0;
        const positionSeconds = sanitizeCommunityListeningSeconds(
            options.positionSeconds,
            sanitizeCommunityListeningSeconds(getCurrentOffset(), 0)
        );
        const isHeartbeatPlaying =
            typeof options.isPlaying === "boolean"
                ? options.isPlaying
                : Boolean(playingRef.current);

        return {
            session_id: communityListeningSessionIdRef.current,
            user_name: sanitizeCommunityListeningText(
                communityPayload.userName,
                readPersistedCommunityListeningUserName()
            ),
            track_title: sanitizeCommunityListeningText(
                communityPayload.title,
                "Unknown track"
            ),
            artist: sanitizeCommunityListeningText(communityPayload.artist, ""),
            audio_url: sanitizeCommunityListeningText(communityPayload.audioUrl, ""),
            artwork_url: sanitizeCommunityListeningText(
                communityPayload.artworkUrl,
                ""
            ),
            position_seconds: positionSeconds,
            duration_seconds: durationSeconds,
            is_playing: isHeartbeatPlaying ? 1 : 0,
        };
    }

    async function postCommunityListeningHeartbeat(options = {}) {
        const now = Date.now();

        if (
            !options.force &&
            now - lastCommunityListeningBeatAtRef.current < 4500
        ) {
            return null;
        }

        let payload;

        try {
            payload = buildCurrentCommunityListeningPayload(options);
        } catch {
            return null;
        }

        if (!payload.audio_url || /^(blob:|data:)/i.test(payload.audio_url)) {
            return null;
        }

        lastCommunityListeningBeatAtRef.current = now;

        try {
            const response = await fetch(COMMUNITY_LISTENING_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
                keepalive: Boolean(options.keepalive),
                cache: "no-store",
            });

            if (!response.ok) {
                return null;
            }

            return response.json().catch(() => ({ ok: true }));
        } catch {
            return null;
        }
    }

    function startCommunityListeningHeartbeat() {
        if (typeof window === "undefined") {
            return;
        }

        if (communityListeningHeartbeatTimerRef.current) {
            window.clearInterval(communityListeningHeartbeatTimerRef.current);
            communityListeningHeartbeatTimerRef.current = null;
        }

        postCommunityListeningHeartbeat({
            force: true,
            isPlaying: true,
        });

        communityListeningHeartbeatTimerRef.current = window.setInterval(() => {
            postCommunityListeningHeartbeat({
                isPlaying: true,
            });
        }, COMMUNITY_LISTENING_HEARTBEAT_INTERVAL_MS);
    }

    function stopCommunityListeningHeartbeat(sendStop = true) {
        if (
            typeof window !== "undefined" &&
            communityListeningHeartbeatTimerRef.current
        ) {
            window.clearInterval(communityListeningHeartbeatTimerRef.current);
            communityListeningHeartbeatTimerRef.current = null;
        }

        if (sendStop) {
            postCommunityListeningHeartbeat({
                force: true,
                keepalive: true,
                isPlaying: false,
            });
        }
    }

    async function postCurrentMediaToCommunityFeed() {
        if (isPostingCommunityPost || isRendering || isLoading) {
            return;
        }

        let payload;

        try {
            payload = buildCurrentCommunityPostPayload();
        } catch (error) {
            setError(error?.message || "Could not prepare this community post.");
            return;
        }

        try {
            setIsPostingCommunityPost(true);
            setInfo(`Posting "${payload.title}" to the community feed...`);

            const response = await fetch(COMMUNITY_FEED_POST_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => null);

            if (!response.ok || result?.ok === false) {
                throw new Error(
                    result?.error ||
                    result?.message ||
                    `Community feed backend returned HTTP ${response.status}.`
                );
            }

            setInfo(
                `Posted "${payload.title}" to the community feed${
                    payload.usesArchiveProxy
                        ? " through the scrapewebsite Archive proxy so feed playback avoids Archive.org CORS."
                        : "."
                }`
            );
        } catch (error) {
            setError(
                error?.message ||
                "Could not post this track to the community feed. Make sure /api/community/posts is deployed in your Cloudflare Pages Functions backend."
            );
        } finally {
            setIsPostingCommunityPost(false);
        }
    }

    function normalizePlaylistIndex(index, list = playlistRef.current) {
        if (!Array.isArray(list) || !list.length) return -1;

        const number = Number(index);
        const safeIndex = Number.isFinite(number) ? Math.trunc(number) : 0;

        return ((safeIndex % list.length) + list.length) % list.length;
    }

    function getNextPlaylistIndex(currentIndex, list = playlistRef.current) {
        if (!Array.isArray(list) || !list.length) return -1;

        if (currentIndex < 0 || currentIndex >= list.length) {
            return 0;
        }

        return normalizePlaylistIndex(currentIndex + 1, list);
    }

    function getPreviousPlaylistIndex(currentIndex, list = playlistRef.current) {
        if (!Array.isArray(list) || !list.length) return -1;

        if (currentIndex < 0 || currentIndex >= list.length) {
            return normalizePlaylistIndex(list.length - 1, list);
        }

        return normalizePlaylistIndex(currentIndex - 1, list);
    }

    function updatePlaylistItemAt(index, patch) {
        setPlaylist((current) => {
            if (!Array.isArray(current) || index < 0 || index >= current.length) {
                return current;
            }

            const nextPatch = typeof patch === "function" ? patch(current[index]) : patch;

            if (!nextPatch || typeof nextPatch !== "object") {
                return current;
            }

            return current.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                        ...item,
                        ...nextPatch,
                    }
                    : item
            );
        });
    }

    function markPlaylistItemLoading(index) {
        updatePlaylistItemAt(index, {
            loadState: "loading",
            lastError: "",
            lastTriedAt: new Date().toISOString(),
        });
    }

    function markPlaylistItemLoaded(index) {
        updatePlaylistItemAt(index, (item) => ({
            loadState: "ready",
            lastError: "",
            lastLoadedAt: new Date().toISOString(),
            playCount: Number(item?.playCount || 0) + 1,
        }));
    }

    function markPlaylistItemFailed(index, error) {
        const message =
            error?.message ||
            error?.toString?.() ||
            "This playlist item could not be loaded by the browser.";

        updatePlaylistItemAt(index, (item) => ({
            loadState: "failed",
            lastError: message,
            failedAttempts: Number(item?.failedAttempts || 0) + 1,
            lastFailedAt: new Date().toISOString(),
        }));
    }

    function markPlaylistItemPreloading(index) {
        updatePlaylistItemAt(index, {
            loadState: "preloading",
            lastError: "",
            lastPreloadTriedAt: new Date().toISOString(),
        });
    }

    function markPlaylistItemPreloaded(index, preloadedItem) {
        updatePlaylistItemAt(index, (item) => ({
            loadState: "preloaded",
            lastError: "",
            preloadedAt: new Date().toISOString(),
            preloadedViaProxy: Boolean(preloadedItem?.metadata?.usedProxyFallback),
            preloadByteLength: preloadedItem?.arrayBuffer?.byteLength || item?.preloadByteLength || 0,
            preloadDuration: preloadedItem?.decodedBuffer?.duration || item?.preloadDuration || 0,
        }));
    }

    function getCachedPlaylistPreload(item) {
        const cacheKey = getPlaylistPreloadCacheKey(item);

        if (!cacheKey) {
            return null;
        }

        const cached = playlistPreloadCacheRef.current.get(cacheKey);

        if (!cached?.decodedBuffer) {
            return null;
        }

        return cached;
    }

    function installPreloadedPlaylistBuffer(preloadedItem) {
        if (!preloadedItem?.decodedBuffer) {
            throw new Error("This playlist preload cache entry is missing its decoded audio buffer.");
        }

        const decodedBuffer = preloadedItem.decodedBuffer;
        const arrayBuffer = preloadedItem.arrayBuffer || null;
        const metadata = preloadedItem.metadata || {};
        const byteDescription =
            preloadedItem.byteDescription ||
            (arrayBuffer ? describeMediaBytes(arrayBuffer) : "preloaded audio");

        audioBufferRef.current = decodedBuffer;
        lastDecodedArrayBufferRef.current = arrayBuffer;
        lastDecodedMetadataRef.current = metadata;

        startedOffsetRef.current = 0;
        startedAtContextTimeRef.current = 0;
        currentEffectiveRateRef.current = getEffectivePlaybackRate(
            latestSettingsRef.current
        );

        setBufferReady(true);
        setPosition(0);
        setDuration(decodedBuffer.duration);
        setMixerEnabled(false);
        setMediaInfo(
            `${byteDescription} • ${decodedBuffer.numberOfChannels} channel(s) • ${decodedBuffer.sampleRate} Hz • ${formatTime(decodedBuffer.duration)} • playlist preload cache`
        );

        return decodedBuffer;
    }

    async function buildPreloadedPlaylistItem(item, index) {
        if (!item) {
            throw new Error("That playlist item no longer exists.");
        }

        if (item.kind === "url") {
            const cleanLink = validateDirectMediaUrl(item.url);

            const { arrayBuffer, metadata } = await fetchDirectMediaArrayBuffer(cleanLink, {
                retryDelaysMs: PLAYLIST_RECOVERY_SETTINGS.retryDelaysMs,
                cacheModes: PLAYLIST_RECOVERY_SETTINGS.fetchCacheModes,
            });

            const decodedBuffer = await decodeAudioBufferWithRecovery(arrayBuffer, metadata);

            return {
                id: item.id,
                index,
                kind: "url",
                title: normalizePlaylistUrlTitle(item.title, cleanLink, item.archiveFileName),
                cleanLink,
                arrayBuffer,
                metadata,
                decodedBuffer,
                byteDescription: describeMediaBytes(arrayBuffer),
                cachedAt: new Date().toISOString(),
            };
        }

        let playlistFile = item.file;

        if (!playlistFile && item.indexedDbFileKey) {
            playlistFile = await getPlaylistFileBlob(item.indexedDbFileKey);
        }

        if (!playlistFile && item.dataUrl) {
            playlistFile = dataUrlToFile(
                item.dataUrl,
                item.title || "saved-playlist-audio",
                item.type || "audio/mpeg"
            );
        }

        if (!playlistFile) {
            throw new Error(
                "The uploaded playlist file is not available in browser storage. Re-select it from your device, or make sure this site has permission/quota to keep uploaded files in IndexedDB."
            );
        }

        const { arrayBuffer, metadata } = await readFileMediaArrayBuffer(
            playlistFile,
            item.persistedDataUrl || item.dataUrl
                ? "Playlist preload restored from localStorage"
                : "Playlist preload file"
        );

        const decodedBuffer = await decodeAudioBufferWithRecovery(arrayBuffer, metadata);

        return {
            id: item.id,
            index,
            kind: "file",
            title: item.title || playlistFile.name || "Playlist file",
            playlistFile,
            arrayBuffer,
            metadata,
            decodedBuffer,
            byteDescription: describeMediaBytes(arrayBuffer),
            cachedAt: new Date().toISOString(),
        };
    }

    async function preloadPlaylist() {
        const list = playlistRef.current;

        if (!Array.isArray(list) || !list.length) {
            setError("Add uploaded files or direct media links to the playlist before preloading.");
            return false;
        }

        const preloadToken = playlistPreloadTokenRef.current + 1;
        playlistPreloadTokenRef.current = preloadToken;

        let preloadedCount = 0;
        let cachedCount = 0;
        let failedCount = 0;
        let proxyFallbackCount = 0;

        setIsPreloadingPlaylist(true);
        setIsLoading(true);
        setPlaylistPreloadSummary("");
        setInfo(
            `Preloading ${list.length} playlist item${list.length === 1 ? "" : "s"}. Each direct Archive link gets one normal attempt, then the scrapewebsite proxy fallback is tried automatically.`
        );

        try {
            for (let index = 0; index < list.length; index += 1) {
                if (playlistPreloadTokenRef.current !== preloadToken) {
                    return false;
                }

                const currentList = playlistRef.current;
                const item = currentList[index];

                if (!item) {
                    continue;
                }

                const cacheKey = getPlaylistPreloadCacheKey(item);

                if (cacheKey && playlistPreloadCacheRef.current.has(cacheKey)) {
                    cachedCount += 1;
                    continue;
                }

                markPlaylistItemPreloading(index);
                setPlaylistPreloadSummary(
                    `Preloading ${index + 1} of ${currentList.length}: "${item.title}".`
                );

                try {
                    const preloadedItem = await buildPreloadedPlaylistItem(item, index);

                    if (playlistPreloadTokenRef.current !== preloadToken) {
                        return false;
                    }

                    if (cacheKey) {
                        playlistPreloadCacheRef.current.set(cacheKey, preloadedItem);
                    }

                    if (preloadedItem.metadata?.usedProxyFallback) {
                        proxyFallbackCount += 1;
                    }

                    preloadedCount += 1;
                    markPlaylistItemPreloaded(index, preloadedItem);
                } catch (error) {
                    failedCount += 1;
                    markPlaylistItemFailed(index, error);
                }
            }

            const summary = `Playlist preload finished: ${preloadedCount} newly preloaded, ${cachedCount} already cached, ${failedCount} failed, ${proxyFallbackCount} loaded through scrapewebsite proxy fallback.`;

            setPlaylistPreloadSummary(summary);

            if (preloadedCount + cachedCount > 0) {
                setInfo(`${summary} Press Start playlist to play from the decoded preload cache instead of loading each song one by one.`);
                return true;
            }

            setError(`${summary} No playable playlist items were preloaded.`);
            return false;
        } finally {
            if (playlistPreloadTokenRef.current === preloadToken) {
                setIsPreloadingPlaylist(false);
                setIsLoading(false);
                refreshStorageInfo();
            }
        }
    }

    function getPlaylistFailureMessage(item, error) {
        const title = item?.title ? `"${item.title}"` : "that playlist item";
        const reason = error?.message || error?.toString?.() || "unknown browser decode error";

        if (item?.kind === "file" && (item.needsReselect || (!item.file && !item.dataUrl))) {
            return `${title} needs to be selected again because the full local file was not stored after refresh.`;
        }

        return `${title} could not load after recovery attempts: ${reason}`;
    }

    async function loadNextPlayablePlaylistItem(
        startIndex = 0,
        {
            autoplay = true,
            reason = "playlist advance",
            fromPlaybackEnded = false,
            preserveUnlockedOutput = false,
            fromMediaSession = false,
            outputAlreadyRestarted = false,
            forceIPhoneOutputPostStart = false,
        } = {}
    ) {
        const list = playlistRef.current;

        if (!Array.isArray(list) || !list.length) {
            setError("Add uploaded files or direct media links to the playlist first.");
            return false;
        }

        const advanceToken = playlistAdvanceTokenRef.current + 1;
        playlistAdvanceTokenRef.current = advanceToken;

        const firstIndex = normalizePlaylistIndex(startIndex, list);
        const failures = [];

        for (let step = 0; step < list.length; step += 1) {
            if (playlistAdvanceTokenRef.current !== advanceToken) {
                return false;
            }

            const index = normalizePlaylistIndex(firstIndex + step, playlistRef.current);
            const item = playlistRef.current[index];

            if (!item) continue;

            if (step > 0) {
                setInfo(
                    `Skipping unavailable track(s). Trying playlist item ${index + 1} of ${
                        playlistRef.current.length
                    }: "${item.title}".`
                );
            } else if (reason) {
                setInfo(
                    `${reason}. Trying playlist item ${index + 1} of ${
                        playlistRef.current.length
                    }: "${item.title}".`
                );
            }

            const loaded = await loadPlaylistItem(index, autoplay, {
                suppressAutoSkip: true,
                fromAutoAdvance: true,
                fromPlaybackEnded,
                preserveUnlockedOutput,
                fromMediaSession,
                outputAlreadyRestarted,
                forceIPhoneOutputPostStart,
                attemptNumber: step + 1,
                maxAttempts: list.length,
            });

            if (loaded) {
                if (failures.length) {
                    setInfo(
                        `Skipped ${failures.length} unavailable playlist item${
                            failures.length === 1 ? "" : "s"
                        } and loaded "${playlistRef.current[index]?.title || item.title}".`
                    );
                }

                return true;
            }

            failures.push(item.title || `Track ${index + 1}`);
        }

        setActivePlaylistIndex(-1);
        activePlaylistIndexRef.current = -1;
        setError(
            `No playable playlist items were found after checking ${failures.length || list.length} track${
                (failures.length || list.length) === 1 ? "" : "s"
            }. Every item failed after retry/recovery attempts. Broken direct links can be CORS-blocked, not direct media files, offline, or unsupported codecs. Large remembered local files need to be selected again.`
        );

        return false;
    }

    async function loadPlaylistItem(index, autoplay = false, options = {}) {
        const list = playlistRef.current;
        const safeIndex = normalizePlaylistIndex(index, list);
        const item = safeIndex >= 0 ? list[safeIndex] : null;

        if (!item) {
            setError("That playlist item is no longer available.");
            return false;
        }

        const loadToken = playlistLoadTokenRef.current + 1;
        playlistLoadTokenRef.current = loadToken;

        const shouldSuppressAutoSkip = Boolean(options.suppressAutoSkip);
        const shouldAutoSkip = autoplay && !shouldSuppressAutoSkip;

        markPlaylistItemLoading(safeIndex);

        const ensureStillCurrentLoad = () => playlistLoadTokenRef.current === loadToken;

        async function finishSuccessfulLoad(decodedBuffer, extraInfo = "") {
            if (!ensureStillCurrentLoad()) {
                return false;
            }

            markPlaylistItemLoaded(safeIndex);
            setPlaylist((current) => {
                if (!Array.isArray(current) || !current[safeIndex]) {
                    return current;
                }

                const currentItem = current[safeIndex];
                const nextDuration = Number(decodedBuffer.duration) || 0;

                if (Math.abs(Number(currentItem.duration || 0) - nextDuration) < 0.05) {
                    return current;
                }

                return current.map((playlistItem, playlistItemIndex) =>
                    playlistItemIndex === safeIndex
                        ? {
                            ...playlistItem,
                            duration: nextDuration,
                            durationLabel: formatTime(nextDuration),
                        }
                        : playlistItem
                );
            });
            mediaDurationRef.current = Number(decodedBuffer.duration) || 0;
            mediaPositionRef.current = 0;
            updateMediaSessionMetadata();
            updateMediaSessionState(autoplay ? "playing" : "paused", {
                forcePosition: true,
            });
            refreshStorageInfo();

            const loadMessage = `Loaded playlist item ${safeIndex + 1} of ${
                playlistRef.current.length
            }: "${item.title}". Browser decoded ${formatTime(decodedBuffer.duration)}.${
                extraInfo ? ` ${extraInfo}` : ""
            }`;

            setInfo(loadMessage);

            if (autoplay) {
                lastPlaylistAutoStartRef.current = {
                    index: safeIndex,
                    reason: options.fromAutoAdvance ? "auto-advance" : "manual playlist play",
                };

                const startDelayMs = isIOSAudioDevice() && (
                    options.fromPlaybackEnded ||
                    options.fromMediaSession ||
                    options.fromAutoAdvance ||
                    options.preserveUnlockedOutput
                )
                    ? 0
                    : PLAYLIST_RECOVERY_SETTINGS.autoplayDelayMs;

                window.setTimeout(() => {
                    if (playlistLoadTokenRef.current === loadToken) {
                        startBufferPlayback(true, {
                            fromAutoAdvance: Boolean(options.fromAutoAdvance),
                            fromPlaybackEnded: Boolean(options.fromPlaybackEnded),
                            fromMediaSession: Boolean(options.fromMediaSession),
                            preserveUnlockedOutput: Boolean(options.preserveUnlockedOutput),
                            outputAlreadyRestarted: Boolean(options.outputAlreadyRestarted),
                            forceIPhoneOutputPostStart: Boolean(options.forceIPhoneOutputPostStart),
                        }).then((started) => {
                            if (!started && playlistLoadTokenRef.current === loadToken) {
                                markPlaylistItemFailed(
                                    safeIndex,
                                    new Error("Playback could not start after this track loaded.")
                                );
                                loadNextPlayablePlaylistItem(safeIndex + 1, {
                                    autoplay: true,
                                    reason: "Loaded track could not start, so recovery is moving to the next item",
                                    fromPlaybackEnded: Boolean(options.fromPlaybackEnded),
                                    fromMediaSession: Boolean(options.fromMediaSession),
                                    preserveUnlockedOutput: Boolean(options.preserveUnlockedOutput),
                                    outputAlreadyRestarted: Boolean(options.outputAlreadyRestarted),
                                    forceIPhoneOutputPostStart: Boolean(options.forceIPhoneOutputPostStart),
                                });
                            }
                        });
                    }
                }, startDelayMs);
            }

            return true;
        }

        try {
            setIsLoading(true);
            resetDecodedStateForPlaylistLoad({
                fromAutoAdvance: Boolean(options.fromAutoAdvance),
                fromPlaybackEnded: Boolean(options.fromPlaybackEnded),
                fromMediaSession: Boolean(options.fromMediaSession),
                preserveUnlockedOutput: Boolean(options.preserveUnlockedOutput),
            });
            clearObjectUrl();

            if (item.kind === "url") {
                const cleanLink = validateDirectMediaUrl(item.url);

                setInputFile(null);
                setSourceKind("url");
                setSourceUrl(cleanLink);
                setDirectLink(cleanLink);
                setActivePlaylistIndex(safeIndex);
                activePlaylistIndexRef.current = safeIndex;

                persistCurrentUrlSnapshot(cleanLink, item.title);

                const cachedPreload = getCachedPlaylistPreload(item);

                if (cachedPreload) {
                    const decodedBuffer = installPreloadedPlaylistBuffer(cachedPreload);
                    const preloadInfo = getPlaylistPreloadSourceLabel(cachedPreload.metadata);

                    return await finishSuccessfulLoad(
                        decodedBuffer,
                        `Loaded from playlist preload cache (${preloadInfo}). Direct media links are restored automatically after refresh.`
                    );
                }

                const { arrayBuffer, metadata } = await fetchDirectMediaArrayBuffer(cleanLink, {
                    retryDelaysMs: PLAYLIST_RECOVERY_SETTINGS.retryDelaysMs,
                    cacheModes: PLAYLIST_RECOVERY_SETTINGS.fetchCacheModes,
                });
                const decodedBuffer = await prepareDecodedBuffer(arrayBuffer, metadata);
                const retryInfo = metadata.fetchAttempts > 1
                    ? `Recovery needed ${metadata.fetchAttempts} fetch attempts before decode.`
                    : "";

                return await finishSuccessfulLoad(
                    decodedBuffer,
                    `Direct media links are restored automatically after refresh. ${retryInfo}`.trim()
                );
            }

            let playlistFile = item.file;

            if (!playlistFile && item.indexedDbFileKey) {
                playlistFile = await getPlaylistFileBlob(item.indexedDbFileKey);
            }

            if (!playlistFile && item.dataUrl) {
                try {
                    playlistFile = dataUrlToFile(
                        item.dataUrl,
                        item.title || "saved-playlist-audio",
                        item.type || "audio/mpeg"
                    );
                } catch {
                    playlistFile = null;
                }
            }

            if (!playlistFile) {
                throw new Error(
                    "The uploaded playlist file is not available in browser storage. Re-select it from your device, or make sure this site has permission/quota to keep uploaded files in IndexedDB."
                );
            }

            if (!item.file) {
                setPlaylist((current) =>
                    current.map((playlistItem, playlistItemIndex) =>
                        playlistItemIndex === safeIndex
                            ? {
                                ...playlistItem,
                                file: playlistFile,
                                needsReselect: false,
                                restoredFromStorage: true,
                                storageNote: playlistItem.indexedDbFileKey
                                    ? "Uploaded file restored from browser IndexedDB after refresh."
                                    : playlistItem.storageNote || "Uploaded file restored from browser storage after refresh.",
                            }
                            : playlistItem
                    )
                );
            }

            const pickedInfo = buildPickedFileInfo(playlistFile, "Playlist file");
            const pickedWarning = buildPickedFileWarning(playlistFile);

            const objectUrl = URL.createObjectURL(playlistFile);

            objectUrlRef.current = objectUrl;

            setInputFile(playlistFile);
            setSourceKind("file");
            setSourceUrl(objectUrl);
            setActivePlaylistIndex(safeIndex);
            activePlaylistIndexRef.current = safeIndex;

            if (pickedWarning) {
                setStatus(pickedWarning);
                setStatusTone("info");
            }

            const cachedPreload = getCachedPlaylistPreload(item);

            if (cachedPreload) {
                const decodedBuffer = installPreloadedPlaylistBuffer(cachedPreload);

                return await finishSuccessfulLoad(
                    decodedBuffer,
                    `Loaded from playlist preload cache. Source: ${pickedInfo}. ${
                        item.persistedDataUrl || item.dataUrl
                            ? "This playlist file was restored from localStorage."
                            : "This playlist file is available for this browser session."
                    }`
                );
            }

            const { arrayBuffer, metadata } = await readFileMediaArrayBuffer(
                playlistFile,
                item.persistedIndexedDb || item.indexedDbFileKey
                    ? "Playlist file restored from browser IndexedDB"
                    : item.persistedDataUrl || item.dataUrl
                        ? "Playlist file restored from localStorage"
                        : "Playlist file"
            );

            persistCurrentFileSnapshot({
                file: playlistFile,
                arrayBuffer,
                metadata,
            });

            const decodedBuffer = await prepareDecodedBuffer(arrayBuffer, metadata);

            return await finishSuccessfulLoad(
                decodedBuffer,
                `Source: ${pickedInfo}. ${
                    item.persistedDataUrl || item.dataUrl
                        ? "This playlist file was restored from localStorage."
                        : "This playlist file is available for this browser session."
                }`
            );
        } catch (error) {
            if (!ensureStillCurrentLoad()) {
                return false;
            }

            markPlaylistItemFailed(safeIndex, error);

            const failureMessage = getPlaylistFailureMessage(item, error);

            if (shouldAutoSkip && playlistRef.current.length > 1) {
                setInfo(`${failureMessage} Skipping to the next playlist item.`);
                return loadNextPlayablePlaylistItem(safeIndex + 1, {
                    autoplay,
                    reason: "Previous playlist item failed",
                    fromPlaybackEnded: Boolean(options.fromPlaybackEnded),
                    fromMediaSession: Boolean(options.fromMediaSession),
                    preserveUnlockedOutput: Boolean(options.preserveUnlockedOutput),
                    outputAlreadyRestarted: Boolean(options.outputAlreadyRestarted),
                    forceIPhoneOutputPostStart: Boolean(options.forceIPhoneOutputPostStart),
                });
            }

            setError(failureMessage);
            return false;
        } finally {
            if (ensureStillCurrentLoad()) {
                setIsLoading(false);
                refreshStorageInfo();
            }
        }
    }

    function getReorderedActivePlaylistIndex(currentActiveIndex, fromIndex, toIndex) {
        if (currentActiveIndex < 0 || fromIndex === toIndex) {
            return currentActiveIndex;
        }

        if (currentActiveIndex === fromIndex) {
            return toIndex;
        }

        if (fromIndex < currentActiveIndex && toIndex >= currentActiveIndex) {
            return currentActiveIndex - 1;
        }

        if (fromIndex > currentActiveIndex && toIndex <= currentActiveIndex) {
            return currentActiveIndex + 1;
        }

        return currentActiveIndex;
    }

    function reorderPlaylistItems(fromIndex, toIndex) {
        const safeFromIndex = Number(fromIndex);
        const safeToIndex = Number(toIndex);

        if (
            !Number.isInteger(safeFromIndex) ||
            !Number.isInteger(safeToIndex) ||
            safeFromIndex === safeToIndex
        ) {
            return false;
        }

        setPlaylist((current) => {
            if (
                safeFromIndex < 0 ||
                safeFromIndex >= current.length ||
                safeToIndex < 0 ||
                safeToIndex >= current.length ||
                current.length < 2
            ) {
                return current;
            }

            const nextPlaylist = [...current];
            const [movedItem] = nextPlaylist.splice(safeFromIndex, 1);
            nextPlaylist.splice(safeToIndex, 0, movedItem);

            const nextActiveIndex = getReorderedActivePlaylistIndex(
                activePlaylistIndexRef.current,
                safeFromIndex,
                safeToIndex
            );

            setActivePlaylistIndex(nextActiveIndex);
            activePlaylistIndexRef.current = nextActiveIndex;

            setInfo(
                `Moved "${movedItem?.title || "playlist item"}" to position ${
                    safeToIndex + 1
                }.`
            );

            return nextPlaylist;
        });

        return true;
    }

    function resetPlaylistDragState() {
        playlistDragIndexRef.current = -1;
        playlistDragOverIndexRef.current = -1;
        setPlaylistDragState({
            fromIndex: -1,
            overIndex: -1,
        });
    }

    function handlePlaylistDragStart(event, index) {
        if (isRendering || isLoading || isPreloadingPlaylist || playlistRef.current.length < 2) {
            event.preventDefault();
            resetPlaylistDragState();
            return;
        }

        playlistDragIndexRef.current = index;
        playlistDragOverIndexRef.current = index;
        setPlaylistDragState({
            fromIndex: index,
            overIndex: index,
        });

        try {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(PLAYLIST_DRAG_MIME, String(index));
            event.dataTransfer.setData("text/plain", String(index));
        } catch {
            // Some mobile browsers expose a limited DataTransfer implementation.
        }
    }

    function handlePlaylistDragOver(event, index) {
        const fromIndex = playlistDragIndexRef.current;

        if (fromIndex < 0 || fromIndex === index) {
            return;
        }

        event.preventDefault();

        try {
            event.dataTransfer.dropEffect = "move";
        } catch {
            // Safe to ignore.
        }

        if (playlistDragOverIndexRef.current !== index) {
            playlistDragOverIndexRef.current = index;
            setPlaylistDragState({
                fromIndex,
                overIndex: index,
            });
        }
    }

    function handlePlaylistDrop(event, index) {
        event.preventDefault();

        let fromIndex = playlistDragIndexRef.current;

        try {
            const transferred = Number(event.dataTransfer.getData(PLAYLIST_DRAG_MIME));

            if (Number.isInteger(transferred)) {
                fromIndex = transferred;
            }
        } catch {
            // Fall back to the ref set by the handle drag start.
        }

        reorderPlaylistItems(fromIndex, index);
        resetPlaylistDragState();
    }

    function handlePlaylistDragEnd() {
        resetPlaylistDragState();
    }

    function removePlaylistItem(id) {
        const currentIndex = activePlaylistIndexRef.current;
        const removedItem = playlistRef.current.find((item) => item.id === id);

        if (id) {
            playlistPreloadCacheRef.current.delete(String(id));
        }

        if (removedItem?.indexedDbFileKey) {
            deletePlaylistFileBlob(removedItem.indexedDbFileKey);
        }

        setPlaylist((current) => {
            const removedIndex = current.findIndex((item) => item.id === id);
            const nextPlaylist = current.filter((item) => item.id !== id);

            if (removedIndex === currentIndex) {
                const nextIndex = nextPlaylist.length
                    ? normalizePlaylistIndex(removedIndex, nextPlaylist)
                    : -1;

                setActivePlaylistIndex(nextIndex);
                activePlaylistIndexRef.current = nextIndex;
            } else if (removedIndex >= 0 && removedIndex < currentIndex) {
                setActivePlaylistIndex(currentIndex - 1);
                activePlaylistIndexRef.current = currentIndex - 1;
            }

            return nextPlaylist;
        });
    }

    function clearPlaylist() {
        playlistAdvanceTokenRef.current += 1;
        playlistLoadTokenRef.current += 1;
        playlistPreloadTokenRef.current += 1;
        playlistPreloadCacheRef.current.clear();
        clearPlaylistFileBlobs();
        setIsPreloadingPlaylist(false);
        setPlaylistPreloadSummary("");
        setPlaylist([]);
        setActivePlaylistIndex(-1);
        activePlaylistIndexRef.current = -1;
        setInfo("Playlist cleared. The currently loaded buffer stays loaded until you clear media.");
    }

    function toggleRepeat() {
        setRepeatEnabled((current) => {
            const nextValue = !current;

            repeatEnabledRef.current = nextValue;

            setInfo(
                nextValue
                    ? "Repeat turned on. The current song will restart automatically when it ends."
                    : "Repeat turned off. The player will advance to the next playlist item and skip broken tracks."
            );

            return nextValue;
        });
    }

    async function primeIPhonePlaylistOutputFromGesture() {
        if (!isIOSAudioDevice()) {
            return true;
        }

        try {
            const { context } = ensureLiveGraph();

            ensureIPhoneSilentKeepAlive(
                context,
                mediaStreamDestinationRef.current
            );

            const contextUnlocked = await unlockMobileAudioContext(context);
            const elementUnlocked = await unlockOutputElementForAppAction(outputAudioRef.current);

            if (!contextUnlocked || context.state !== "running" || !elementUnlocked) {
                throw new Error(buildMobileAudioHint());
            }

            setInfo(
                "iPhone/Safari playlist output is unlocked. The queue can auto-advance on this same audio session after this first Start playlist tap."
            );

            return true;
        } catch (error) {
            setError(
                `Safari/iOS blocked the playlist audio unlock. Tap Start playlist again after the page is focused. ${
                    error?.message || buildMobileAudioHint()
                }`
            );
            return false;
        }
    }

    async function playPreviousPlaylistItem() {
        const list = playlistRef.current;

        if (!list.length) {
            setError("Add uploaded files or direct media links to the playlist first.");
            return;
        }

        const primed = await primeIPhonePlaylistOutputFromGesture();

        if (!primed) {
            return;
        }

        const currentIndex = activePlaylistIndexRef.current;
        const previousIndex = getPreviousPlaylistIndex(currentIndex, list);

        loadNextPlayablePlaylistItem(previousIndex, {
            autoplay: true,
            reason: "Manual previous-track request",
            preserveUnlockedOutput: isIOSAudioDevice(),
        });
    }

    async function playNextPlaylistItem() {
        const list = playlistRef.current;

        if (!list.length) {
            setError("Add uploaded files or direct media links to the playlist first.");
            return;
        }

        const primed = await primeIPhonePlaylistOutputFromGesture();

        if (!primed) {
            return;
        }

        const currentIndex = activePlaylistIndexRef.current;
        const nextIndex = getNextPlaylistIndex(currentIndex, list);

        loadNextPlayablePlaylistItem(nextIndex, {
            autoplay: true,
            reason: "Manual next-track request",
            preserveUnlockedOutput: isIOSAudioDevice(),
        });
    }

    async function playPlaylistFromStart() {
        const list = playlistRef.current;

        if (!list.length) {
            setError("Add uploaded files or direct media links to the playlist first.");
            return false;
        }

        return loadNextPlayablePlaylistItem(0, {
            autoplay: true,
            reason: "Starting playlist from track 1",
            preserveUnlockedOutput: isIOSAudioDevice(),
        });
    }

    async function handlePlaylistPrimaryPlay() {
        if (isPauseUiSettlingRef.current) {
            return;
        }

        if (playingRef.current && activePlaylistIndexRef.current >= 0) {
            await pausePlayback({ reason: "Playlist pause button" });
            return;
        }

        const primed = await primeIPhonePlaylistOutputFromGesture();

        if (!primed) {
            return;
        }

        await playPlaylistFromStart();
    }

    async function handlePlaybackEnded() {
        if (manualStopRef.current) return;

        activeSourceRef.current = null;
        startedOffsetRef.current = 0;
        startedAtContextTimeRef.current = 0;

        const list = playlistRef.current;
        const canContinueAfterEnded = Boolean(
            repeatEnabledRef.current || (Array.isArray(list) && list.length > 0)
        );

        setPosition(0);
        setPlayingState(false);
        updateMediaSessionState(
            isIOSAudioDevice() && canContinueAfterEnded ? "playing" : "paused"
        );
        stopPositionTimer();
        stopVisualizer();

        if (isIOSAudioDevice() && canContinueAfterEnded) {
            try {
                const { context } = ensureLiveGraph();
                ensureIPhoneSilentKeepAlive(context, mediaStreamDestinationRef.current);
                attachOutputElementToCurrentStream(
                    outputAudioRef.current,
                    mediaStreamDestinationRef.current?.stream || null
                );
                forceRestoreAudibleWebAudioOutput(context, liveNodesRef.current);
            } catch {
                // Continue to the next playlist item even if route re-arm is best-effort.
            }
        }

        if (repeatEnabledRef.current) {
            setInfo("Repeat is on. Restarting the current song.");
            window.setTimeout(() => {
                startBufferPlayback(true, {
                    fromPlaybackEnded: true,
                    preserveUnlockedOutput: true,
                    outputAlreadyRestarted: isIOSAudioDevice(),
                    forceIPhoneOutputPostStart: isIOSAudioDevice(),
                }).then((started) => {
                    if (!started) {
                        setError("Repeat restart failed. Tap Start playlist to recover playback.");
                    }
                });
            }, isIOSAudioDevice() ? 0 : PLAYLIST_RECOVERY_SETTINGS.autoplayDelayMs);
            return;
        }

        const currentIndex = activePlaylistIndexRef.current;

        if (list.length > 0) {
            const nextIndex = getNextPlaylistIndex(currentIndex, list);

            await loadNextPlayablePlaylistItem(nextIndex, {
                autoplay: true,
                fromPlaybackEnded: true,
                preserveUnlockedOutput: true,
                outputAlreadyRestarted: isIOSAudioDevice(),
                forceIPhoneOutputPostStart: isIOSAudioDevice(),
                reason:
                    nextIndex === 0 && currentIndex >= list.length - 1
                        ? "Repeat is off. End reached, wrapping to the first playable playlist track"
                        : "Repeat is off. Moving to the next playlist track",
            });
            return;
        }

        setInfo("Playback ended. Repeat is off and there are no playlist tracks to continue with.");
    }


    function connectOutputStage(context, monitorMuteGain) {
        if (isIOSAudioDevice() && context.createMediaStreamDestination) {
            const mediaStreamDestination = context.createMediaStreamDestination();

            // IMPORTANT: keep one audible iPhone route only.
            // Do not also connect this same monitor path to context.destination on iOS.
            // Feeding both context.destination and the hidden MediaStream-backed <audio>
            // element makes the mix sound doubled, comb-filtered, muddy, and stuttery
            // when lock-screen controls are used.
            monitorMuteGain.connect(mediaStreamDestination);
            mediaStreamDestinationRef.current = mediaStreamDestination;

            attachOutputElementToCurrentStream(
                outputAudioRef.current,
                mediaStreamDestination.stream
            );

            ensureIPhoneSilentKeepAlive(context, mediaStreamDestination);

            if (carPlaySafeModeRef.current) {
                setCarPlayOutputStatusIfChanged(
                    "CarPlay / USB safe output path is armed with one hidden iOS media-element route. Direct WebAudio hardware output is not duplicated."
                );
            }

            return;
        }

        monitorMuteGain.connect(context.destination);
    }

    function ensureLiveGraph() {
        const AudioContextClass = getAudioContextClass();

        if (!AudioContextClass) {
            throw new Error("This browser does not support the Web Audio API.");
        }

        if (!audioContextRef.current || audioContextRef.current.state === "closed") {
            audioContextRef.current = new AudioContextClass({
                latencyHint:
                    carPlaySafeModeRef.current && isIOSAudioDevice()
                        ? "playback"
                        : "interactive",
            });
            liveNodesRef.current = null;
            analyserRef.current = null;
            monitorMuteGainRef.current = null;
            mediaStreamDestinationRef.current = null;
            iPhoneSilentKeepAliveRef.current = null;
        }

        const context = audioContextRef.current;

        if (!liveNodesRef.current) {
            const analyser = context.createAnalyser();

            analyser.fftSize = 2048;
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;
            analyser.smoothingTimeConstant = 0.86;

            const monitorMuteGain = context.createGain();

            setAudioParam(
                monitorMuteGain.gain,
                mutedRef.current ? 0 : 1,
                context.currentTime
            );

            analyser.connect(monitorMuteGain);
            connectOutputStage(context, monitorMuteGain);

            const nodes = createProcessingGraph(
                context,
                analyser,
                latestSettingsRef.current,
                {
                    carPlaySafeMode: Boolean(carPlaySafeModeRef.current && isIOSAudioDevice()),
                }
            );

            analyserRef.current = analyser;
            monitorMuteGainRef.current = monitorMuteGain;
            liveNodesRef.current = nodes;
        }

        applySettingsToNodes(
            liveNodesRef.current,
            latestSettingsRef.current,
            context.currentTime
        );

        applyMonitorMute(mutedRef.current);

        return {
            context,
            nodes: liveNodesRef.current,
        };
    }

    async function startBufferPlayback(resetToBeginning = false, options = {}) {
        const buffer = audioBufferRef.current;

        if (!buffer) {
            setError("Load and decode a media source before playback.");
            return false;
        }

        try {
            const { context, nodes } = ensureLiveGraph();
            if (isIOSAudioDevice()) {
                clearIPhonePauseGuardsForPlay();
            }
            forceRestoreAudibleWebAudioOutput(context, nodes, { allowDuringPause: true });
            const unlocked = await unlockMobileAudioContext(context);

            if (isIOSAudioDevice()) {
                ensureIPhoneSilentKeepAlive(
                    context,
                    mediaStreamDestinationRef.current
                );

                const preserveUnlockedOutput = shouldPreserveIPhonePlaylistOutput(options);
                attachOutputElementToCurrentStream(outputAudioRef.current);

                let elementUnlocked = isIPhoneOutputRouteArmed();

                if (!elementUnlocked && !options.outputAlreadyRestarted) {
                    elementUnlocked = await unlockOutputElementForAppAction(outputAudioRef.current);
                }

                if (!elementUnlocked && options.outputAlreadyRestarted) {
                    elementUnlocked = await keepIPhoneOutputElementAliveForLockScreen(
                        "Lock-screen Play output verification"
                    );
                }

                if (!elementUnlocked && preserveUnlockedOutput) {
                    elementUnlocked = isUnlockedIPhoneOutputStillPlaying();
                }

                const singleIPhoneRouteReady = Boolean(
                    elementUnlocked ||
                    isIPhoneOutputRouteArmed() ||
                    isUnlockedIPhoneOutputStillPlaying()
                );

                if (!singleIPhoneRouteReady) {
                    iPhoneLockScreenOutputArmedRef.current = false;
                    throw new Error(
                        `The iPhone audio output route is not armed, so the WebAudio source was not started silently. ${buildMobileAudioHint()}`
                    );
                }

                iPhoneLockScreenOutputArmedRef.current = singleIPhoneRouteReady;
            }

            if (!unlocked || context.state !== "running") {
                throw new Error(
                    `The browser has not unlocked audio output yet. ${buildMobileAudioHint()}`
                );
            }

            manualStopRef.current = false;
            stopActiveSource();

            let safeOffset = resetToBeginning ? 0 : startedOffsetRef.current;

            safeOffset = clamp(safeOffset, 0, buffer.duration);

            if (safeOffset >= buffer.duration) {
                safeOffset = 0;
            }

            const source = context.createBufferSource();

            source.buffer = buffer;

            applySourcePlaybackSettings(
                source,
                latestSettingsRef.current,
                context.currentTime
            );

            source.connect(nodes.baseVolumeGain);

            activeSourceRef.current = source;
            startedOffsetRef.current = safeOffset;
            startedAtContextTimeRef.current = context.currentTime;
            mediaPositionRef.current = safeOffset;
            mediaDurationRef.current = Number(buffer.duration) || mediaDurationRef.current;
            currentEffectiveRateRef.current = getEffectivePlaybackRate(
                latestSettingsRef.current
            );

            prepareOutputForGlitchlessSourceStart(context, nodes);

            source.onended = () => {
                const runEndedHandler = () => {
                    handlePlaybackEnded().catch((error) => {
                        setError(
                            error?.message ||
                            "Playback ended, but the next playlist step could not be started."
                        );
                    });
                };

                // iPhone/Safari can fire the WebAudio ended callback while the hidden
                // MediaStream audio element is still settling. A tiny delay keeps the
                // unlocked output element alive and lets auto-next start on the same
                // user-unlocked playback path.
                if (isIOSAudioDevice()) {
                    window.setTimeout(runEndedHandler, 35);
                    return;
                }

                runEndedHandler();
            };

            source.start(0, safeOffset);
            releaseOutputAfterGlitchlessSourceStart(context, nodes, {
                rampSeconds: options.fromMediaSession || options.forceIPhoneOutputPostStart
                    ? 0.09
                    : 0.06,
            });

            if (isIOSAudioDevice()) {
                const outputConfirmed = await confirmIPhoneOutputAfterSourceStart(context, {
                    fromMediaSession: Boolean(options.fromMediaSession),
                    outputAlreadyRestarted: Boolean(options.outputAlreadyRestarted),
                    forceIPhoneOutputPostStart: Boolean(options.forceIPhoneOutputPostStart),
                });

                if (!outputConfirmed) {
                    const singleIPhoneRouteStillReady = Boolean(
                        isIPhoneOutputRouteArmed() || isUnlockedIPhoneOutputStillPlaying()
                    );

                    if (!singleIPhoneRouteStillReady) {
                        stopActiveSource();
                        setPlayingState(false);
                        updateMediaSessionState("paused", { forcePosition: true });
                        throw new Error(
                            `The iPhone Media Session duration advanced, but the audible output route was not playing. ${buildMobileAudioHint()}`
                        );
                    }

                    setCarPlayOutputStatusIfChanged(
                        "The hidden iPhone stream is still attached as the single output route. AudioMaster Lab did not duplicate the stream through direct WebAudio hardware output."
                    );
                }
            }

            setMixerEnabled(true);
            setPlayingState(true);
            updateMediaSessionMetadata();
            updateMediaSessionState("playing", { forcePosition: true });
            startPositionTimer();
            startVisualizer();

            if (isIOSAudioDevice() && carPlaySafeModeRef.current) {
                setCarPlayOutputStatusIfChanged(
                    "CarPlay / USB safe mode is active: one persistent iOS output route, smoothed effect changes, centered pan, capped wet effects, and Media Session controls are armed."
                );
            }

            if (!options.quietStatus) {
                setInfo(
                    isIOSAudioDevice()
                        ? `${repeatEnabledRef.current ? "Repeat is on. " : "Repeat is off. Auto-next is armed. "}${
                            carPlaySafeModeRef.current
                                ? "CarPlay / USB safe mode is active. "
                                : ""
                        }Playing through the hidden iPhone media element output path with lock-screen scrubbing armed. Pause hard-squelches the hidden stream volume and keep-alive carrier; lock-screen Stop resets WebAudio but keeps the hidden route attached, and lock-screen Play turns the single route back up after starting the audible source.`
                        : `${repeatEnabledRef.current ? "Repeat is on. " : "Repeat is off. Auto-next is armed. "}Playing through full WebAudio graph with visualizer, WaveShaper distortion, warm bitcrusher, panning, delay, and convolution reverb.`
                );
            }

            return true;
        } catch (error) {
            setError(
                `Could not start playback. ${
                    error?.message || "The browser blocked the audio graph."
                } ${buildMobileAudioHint()}`
            );
            return false;
        }
    }

    async function pausePlayback(options = {}) {
        if (!playingRef.current) return false;

        const context = audioContextRef.current;
        const isIPhone = isIOSAudioDevice();

        if (isIPhone && pauseActionInFlightRef.current) {
            extendCleanPauseWindow(options.fromMediaSession ? 1600 : 1200);
            holdIPhonePauseSilence(options.reason || "Repeated Pause ignored");
            updateMediaSessionState("paused", { forcePosition: true });
            return true;
        }

        if (isIPhone) {
            beginCleanPauseWindow(options.fromMediaSession ? 2300 : 1850);
            outputElementActionGuardRef.current = true;
            holdIPhonePauseSilence(options.reason || "Pause started");
        }

        const nextOffset = getCurrentOffset();

        if (context && context.state !== "closed") {
            await fadeMonitorForPause(
                context,
                isIPhone
                    ? options.fromMediaSession ? 0.14 : 0.12
                    : 0.08
            );

            if (isIPhone) {
                holdIPhonePauseSilence(`${options.reason || "Pause"} fade completed`);
            }
        }

        manualStopRef.current = true;
        stopActiveSource();

        startedOffsetRef.current = nextOffset;
        startedAtContextTimeRef.current = 0;
        syncPlaybackPosition(nextOffset, {
            forceMediaSession: true,
        });

        setPlayingState(false);
        updateMediaSessionState("paused", { forcePosition: true });
        stopPositionTimer();
        stopVisualizer();

        if (isIPhone) {
            // Do not call element.play(), element.load(), or a keep-alive re-arm
            // during Pause. Play will re-arm the hidden MediaStream route when the
            // user actually asks to resume, which avoids pause-clicks and flutter.
            iPhoneLockScreenOutputArmedRef.current = false;
            holdIPhonePauseSilence(`${options.reason || "Pause"} held silent`);
            const pauseSerial = iPhonePauseSerialRef.current;
            window.setTimeout(() => {
                if (iPhonePauseSerialRef.current === pauseSerial && !playingRef.current) {
                    holdIPhonePauseSilence(`${options.reason || "Pause"} post-pause guard`);
                }
                outputElementActionGuardRef.current = false;
            }, options.fromMediaSession ? 1150 : 850);
        } else {
            pauseOutputElementForAppAction({
                keepAlive: false,
                reason: "Paused WebAudio preview",
            });
        }

        if (!isIPhone) {
            setInfo("Playback paused. Press Play to resume from this position.");
        }

        return true;
    }

    async function handlePlayPause() {
        if (isPauseUiSettlingRef.current) {
            return;
        }

        if (playingRef.current) {
            await pausePlayback({ reason: "Main pause button" });
            return;
        }

        const outputAlreadyRestarted = isIOSAudioDevice()
            ? await restartIPhoneOutputStreamForLockScreenPlay("Page Play")
            : false;

        await startBufferPlayback(false, {
            preserveUnlockedOutput: isIOSAudioDevice(),
            outputAlreadyRestarted,
            forceIPhoneOutputPostStart: isIOSAudioDevice(),
        });
    }

    async function restartPlayback() {
        stopPlayback(true);
        await startBufferPlayback(true);
    }

    async function seekTo(seconds, shouldResume, options = {}) {
        const buffer = audioBufferRef.current;

        if (!buffer) return false;

        const nextOffset = clamp(numberOrDefault(seconds, 0), 0, buffer.duration);
        const shouldResumeAfterSeek = Boolean(shouldResume && nextOffset < buffer.duration);

        if (options.fromMediaSession) {
            lastMediaSessionSeekAtRef.current = Date.now();
            pendingMediaSessionSeekRef.current = nextOffset;
        }

        manualStopRef.current = true;
        stopActiveSource();
        stopPositionTimer();
        stopVisualizer();

        startedOffsetRef.current = nextOffset;
        startedAtContextTimeRef.current = 0;
        syncPlaybackPosition(nextOffset, {
            fromMediaSession: Boolean(options.fromMediaSession),
            forceMediaSession: true,
            commitStartOffset: true,
        });

        if (!shouldResumeAfterSeek || !options.keepPlayingUiDuringSeek) {
            setPlayingState(false);
        }

        updateMediaSessionState(shouldResumeAfterSeek ? "playing" : "paused", {
            forcePosition: true,
        });

        if (shouldResumeAfterSeek) {
            await startBufferPlayback(false, {
                fromMediaSession: Boolean(options.fromMediaSession),
                preserveUnlockedOutput: Boolean(options.preserveUnlockedOutput),
                outputAlreadyRestarted: Boolean(options.outputAlreadyRestarted),
                forceIPhoneOutputPostStart: Boolean(options.forceIPhoneOutputPostStart),
                quietStatus: Boolean(options.quietStatus),
            });
            syncPlaybackPosition(nextOffset, {
                fromMediaSession: Boolean(options.fromMediaSession),
                forceMediaSession: true,
                commitStartOffset: true,
                clearPendingMediaSessionSeek: true,
            });
            updateMediaSessionState("playing", { forcePosition: true });
            if (!options.fromMediaSession && !options.quietStatus) {
                setInfo(`Scrubbed to ${formatTime(nextOffset)} and resumed playback.`);
            }
        } else {
            setPlayingState(false);
            syncPlaybackPosition(nextOffset, {
                fromMediaSession: Boolean(options.fromMediaSession),
                forceMediaSession: true,
                commitStartOffset: true,
                clearPendingMediaSessionSeek: true,
            });
            updateMediaSessionState("paused", { forcePosition: true });
            if (!options.fromMediaSession && !options.quietStatus) {
                setInfo(`Scrubbed to ${formatTime(nextOffset)}.`);
            }
        }

        return true;
    }

    function handleScrubStart() {
        if (!hasMedia || isRendering || isLoading) return;
        if (scrubbingRef.current) return;

        const currentOffset = getCurrentOffset();
        const shouldKeepPlayingUi = Boolean(
            playingRef.current || isPlayingStateRef.current
        );

        wasPlayingBeforeScrubRef.current = shouldKeepPlayingUi;
        browserScrubResumeIntentRef.current = shouldKeepPlayingUi;
        scrubbingRef.current = true;

        manualStopRef.current = true;
        stopActiveSource();
        stopPositionTimer();
        stopVisualizer();

        startedOffsetRef.current = currentOffset;
        startedAtContextTimeRef.current = 0;
        syncPlaybackPosition(currentOffset, {
            forceMediaSession: true,
        });

        setIsScrubbing(true);

        if (shouldKeepPlayingUi) {
            playingRef.current = true;
            isPlayingStateRef.current = true;
            setIsPlaying((current) => (current ? current : true));
            updateMediaSessionState("playing", { forcePosition: true });
            return;
        }

        setPlayingState(false);
        updateMediaSessionState("paused", { forcePosition: true });
    }

    function handleScrubChange(_, nextValue) {
        const buffer = audioBufferRef.current;

        if (!buffer) return;

        if (!scrubbingRef.current) {
            handleScrubStart();
        }

        const cleanValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
        const nextOffset = clamp(numberOrDefault(cleanValue, 0), 0, buffer.duration);

        scrubbingRef.current = true;
        lastBrowserScrubChangeAtRef.current = Date.now();
        setIsScrubbing(true);
        syncPlaybackPosition(nextOffset, {
            forceMediaSession: true,
            commitStartOffset: true,
        });

        updateMediaSessionState(
            browserScrubResumeIntentRef.current ? "playing" : "paused",
            { forcePosition: true }
        );
    }

    async function handleScrubCommit(_, nextValue) {
        const buffer = audioBufferRef.current;

        if (!buffer) return;

        const shouldResume = Boolean(
            wasPlayingBeforeScrubRef.current ||
            browserScrubResumeIntentRef.current ||
            playingRef.current ||
            isPlayingStateRef.current
        );
        const cleanValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
        const nextOffset = clamp(numberOrDefault(cleanValue, 0), 0, buffer.duration);
        let outputAlreadyRestarted = false;

        if (isIOSAudioDevice() && shouldResume) {
            try {
                const { context, nodes } = ensureLiveGraph();
                releaseOutputAfterGlitchlessSourceStart(context, nodes, {
                    rampSeconds: 0.05,
                });
                outputAlreadyRestarted = isIPhoneOutputRouteArmed();
            } catch {
                outputAlreadyRestarted = false;
            }
        }

        scrubbingRef.current = false;
        wasPlayingBeforeScrubRef.current = false;
        browserScrubResumeIntentRef.current = false;

        setIsScrubbing(false);

        await seekTo(nextOffset, shouldResume, {
            preserveUnlockedOutput: isIOSAudioDevice(),
            outputAlreadyRestarted,
            forceIPhoneOutputPostStart: isIOSAudioDevice() && shouldResume,
            keepPlayingUiDuringSeek: shouldResume,
            quietStatus: true,
        });

        syncPlaybackPosition(nextOffset, {
            forceMediaSession: true,
            commitStartOffset: true,
            clearPendingMediaSessionSeek: true,
        });
        updateMediaSessionState(shouldResume ? "playing" : "paused", {
            forcePosition: true,
        });
    }

    function handleScrubKeyDown(event) {
        const key = event?.key || "";
        const isScrubKey = [
            "ArrowLeft",
            "ArrowRight",
            "Home",
            "End",
            "PageDown",
            "PageUp",
        ].includes(key);

        if (isScrubKey && !scrubbingRef.current) {
            handleScrubStart();
        }
    }

    function updateSetting(key, value) {
        const cleanValue = Number(value);

        if (!Number.isFinite(cleanValue)) return;

        setActivePresetKey("custom");

        setSettings((previous) => {
            const nextSettings = normalizeSettings({
                ...previous,
                [key]: cleanValue,
            });

            latestSettingsRef.current = nextSettings;

            const isSourceRateControl =
                key === "speed" || key === "pitchSemitones";

            if (
                isSourceRateControl &&
                playingRef.current &&
                activeSourceRef.current &&
                audioContextRef.current
            ) {
                const context = audioContextRef.current;
                const currentOffset = getCurrentOffset();

                startedOffsetRef.current = currentOffset;
                startedAtContextTimeRef.current = context.currentTime;
                currentEffectiveRateRef.current =
                    getEffectivePlaybackRate(nextSettings);

                applySourcePlaybackSettings(
                    activeSourceRef.current,
                    nextSettings,
                    context.currentTime
                );

                syncPlaybackPosition(currentOffset, {
                    forceMediaSession: true,
                });
            } else if (isSourceRateControl) {
                currentEffectiveRateRef.current =
                    getEffectivePlaybackRate(nextSettings);
                syncPlaybackPosition(startedOffsetRef.current || mediaPositionRef.current || 0, {
                    forceMediaSession: true,
                });
            }

            if (liveNodesRef.current && audioContextRef.current) {
                applySettingsToNodes(
                    liveNodesRef.current,
                    nextSettings,
                    audioContextRef.current.currentTime
                );
            }

            if (isSourceRateControl) {
                updateMediaSessionMetadata();
                updateMediaSessionState(playingRef.current ? "playing" : "paused", {
                    forcePosition: true,
                });
            }

            return nextSettings;
        });
    }

    function updateVisualizer3DSetting(key, value) {
        setVisualizer3dSettings((previous) => {
            const next = {
                ...DEFAULT_VISUALIZER_3D_SETTINGS,
                ...previous,
                [key]: key === "enabled" ? Boolean(value) : value,
            };

            if (
                key === "model" &&
                !VISUALIZER_3D_MODE_OPTIONS.some((option) => option.value === next.model)
            ) {
                next.model = DEFAULT_VISUALIZER_3D_SETTINGS.model;
            }

            visualizer3dSettingsRef.current = next;
            persistVisualizer3DSettings(next);

            if (!next.enabled) {
                clearCanvas(visualizer3dCanvasRef.current);
            } else if (playingRef.current) {
                startVisualizer();
            }

            return next;
        });
    }

    function applyMixerPreset(presetKey) {
        const preset = getMixerPreset(presetKey);
        const nextSettings = normalizeSettings(preset.settings);
        const currentOffset = playingRef.current ? getCurrentOffset() : position;

        latestSettingsRef.current = nextSettings;
        currentEffectiveRateRef.current = getEffectivePlaybackRate(nextSettings);

        if (playingRef.current && activeSourceRef.current && audioContextRef.current) {
            const context = audioContextRef.current;

            startedOffsetRef.current = currentOffset;
            startedAtContextTimeRef.current = context.currentTime;

            applySourcePlaybackSettings(
                activeSourceRef.current,
                nextSettings,
                context.currentTime
            );

            syncPlaybackPosition(currentOffset, {
                forceMediaSession: true,
            });
        } else {
            syncPlaybackPosition(currentOffset, {
                forceMediaSession: true,
            });
        }

        setSettings(nextSettings);
        setActivePresetKey(preset.key);

        if (liveNodesRef.current && audioContextRef.current) {
            applySettingsToNodes(
                liveNodesRef.current,
                nextSettings,
                audioContextRef.current.currentTime
            );
        }

        updateMediaSessionMetadata();
        updateMediaSessionState(playingRef.current ? "playing" : "paused", {
            forcePosition: true,
        });
        setInfo(`Applied preset: ${preset.label}. ${preset.description}`);
    }

    function resetMixer() {
        const currentOffset = playingRef.current ? getCurrentOffset() : position;

        latestSettingsRef.current = DEFAULT_SETTINGS;
        currentEffectiveRateRef.current = getEffectivePlaybackRate(DEFAULT_SETTINGS);

        if (playingRef.current && activeSourceRef.current && audioContextRef.current) {
            const context = audioContextRef.current;

            startedOffsetRef.current = currentOffset;
            startedAtContextTimeRef.current = context.currentTime;

            applySourcePlaybackSettings(
                activeSourceRef.current,
                DEFAULT_SETTINGS,
                context.currentTime
            );

            syncPlaybackPosition(currentOffset, {
                forceMediaSession: true,
            });
        } else {
            syncPlaybackPosition(currentOffset, {
                forceMediaSession: true,
            });
        }

        setSettings(DEFAULT_SETTINGS);
        setActivePresetKey("flat");

        if (liveNodesRef.current && audioContextRef.current) {
            applySettingsToNodes(
                liveNodesRef.current,
                DEFAULT_SETTINGS,
                audioContextRef.current.currentTime
            );
        }

        updateMediaSessionMetadata();
        updateMediaSessionState(playingRef.current ? "playing" : "paused", {
            forcePosition: true,
        });
        setInfo("Mixer settings reset. Visualizer remains connected to the processed signal.");
    }

    async function loadSourceArrayBuffer() {
        if (lastDecodedArrayBufferRef.current) {
            return {
                arrayBuffer: lastDecodedArrayBufferRef.current,
                metadata: lastDecodedMetadataRef.current || {},
            };
        }

        if (sourceKind === "file" && inputFile) {
            const sourceLabel = isAppleMobileDevice()
                ? "Upload media file / iPhone Files picker"
                : "Upload media file";

            return readFileMediaArrayBuffer(inputFile, sourceLabel);
        }

        if (sourceKind === "url" && sourceUrl) {
            return fetchDirectMediaArrayBuffer(sourceUrl);
        }

        throw new Error("No media source loaded.");
    }

    async function renderMixedFile() {
        if (!sourceUrl && !inputFile) {
            setError("Load a media file or direct media link before rendering.");
            return;
        }

        setIsRendering(true);
        setInfo(
            "Rendering with ClarityChain, Demudder, De-Esser, panning, delay, reverb, speed, pitch, EQ, compression, and gain..."
        );

        try {
            let decodedBuffer = audioBufferRef.current;

            if (!decodedBuffer) {
                const { arrayBuffer, metadata } = await loadSourceArrayBuffer();

                decodedBuffer = await decodeAudioBufferWithRecovery(
                    arrayBuffer,
                    metadata
                );
                audioBufferRef.current = decodedBuffer;
            }

            const renderSettings = normalizeSettings(latestSettingsRef.current);
            const renderEffectiveRate = getEffectivePlaybackRate(renderSettings);
            const delayTail = renderSettings.delayMix > 0 ? 2 : 0;
            const reverbTail =
                renderSettings.reverbMix > 0 ? renderSettings.reverbSeconds : 0;

            const offlineLength = Math.max(
                1,
                Math.ceil(
                    decodedBuffer.length / renderEffectiveRate +
                    decodedBuffer.sampleRate * Math.max(delayTail, reverbTail)
                )
            );

            const OfflineAudioContextClass = getOfflineAudioContextClass();

            if (!OfflineAudioContextClass) {
                throw new Error("This browser does not support OfflineAudioContext.");
            }

            const offlineContext = new OfflineAudioContextClass(
                decodedBuffer.numberOfChannels,
                offlineLength,
                decodedBuffer.sampleRate
            );

            const source = offlineContext.createBufferSource();

            source.buffer = decodedBuffer;

            applySourcePlaybackSettings(
                source,
                renderSettings,
                offlineContext.currentTime || 0
            );

            const offlineNodes = createProcessingGraph(
                offlineContext,
                offlineContext.destination,
                renderSettings
            );

            source.connect(offlineNodes.baseVolumeGain);
            source.start(0);

            const renderedBuffer = await offlineContext.startRendering();
            const wavBlob = audioBufferToWavBlob(renderedBuffer);

            const downloadUrl = URL.createObjectURL(wavBlob);
            const anchor = document.createElement("a");

            anchor.href = downloadUrl;
            anchor.download = getDownloadName(sourceKind, inputFile);

            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();

            setTimeout(() => {
                URL.revokeObjectURL(downloadUrl);
            }, 1000);

            setInfo(
                "Rendered WAV downloaded with panning, delay, convolution reverb, and all mixer effects baked in."
            );
        } catch (error) {
            setError(error?.message || "Render failed.");
        } finally {
            setIsRendering(false);
        }
    }

    return (
        <PageShell>
            <Box
                component="audio"
                ref={outputAudioRef}
                playsInline
                preload="auto"
                controls={false}
                controlsList="nodownload noplaybackrate"
                sx={{
                    position: "fixed",
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents: "none",
                    left: -9999,
                    top: -9999,
                }}
            />

            <Helmet>
                <title>Audio Tool | WebAudio Mixer, Visualizer & WAV Renderer</title>
                <link rel="canonical" href="https://audiomasterlab.com/audio" />
                <meta
                    name="description"
                    content="Use AudioMaster Lab's WebAudio tool to import files from desktop, iPhone Files, On My iPhone, iCloud Drive, Google Drive, Proton Drive, and Dropbox, decode audio files, preview a live processing graph, visualize waveform and frequency spectrum, apply effects, and export WAV."
                />
                <meta
                    name="keywords"
                    content="WebAudio mixer, audio visualizer, waveform visualizer, frequency spectrum, online audio mastering, WAV renderer, EQ, compressor, de-esser, delay, reverb, iPhone audio file picker, iCloud Drive audio, Proton Drive audio"
                />
                <link rel="canonical" href="https://audiomasterlab.com/audio" />

                <meta
                    property="og:title"
                    content="AudioMaster Lab Audio Tool | WebAudio Mixer & WAV Renderer"
                />
                <meta
                    property="og:description"
                    content="Process audio in the browser with the upload media button, iPhone Files support, WebAudio effects, waveform and frequency visualizers, EQ, compression, delay, reverb, and WAV export."
                />
                <meta property="og:url" content="https://audiomasterlab.com/audio" />
                <meta
                    property="og:image"
                    content="https://audiomasterlab.com/social-preview.png"
                />

                <meta
                    name="twitter:title"
                    content="AudioMaster Lab Audio Tool | WebAudio Mixer & WAV Renderer"
                />
                <meta
                    name="twitter:description"
                    content="Master audio in the browser with the upload media button, iPhone Files import, WebAudio effects, visualizers, and WAV export."
                />
                <meta
                    name="twitter:image"
                    content="https://audiomasterlab.com/social-preview.png"
                />

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebApplication",
                        name: "AudioMaster Lab Audio Tool",
                        applicationCategory: "MultimediaApplication",
                        operatingSystem: "Web Browser",
                        url: "https://audiomasterlab.com/audio",
                        description:
                            "A browser-based WebAudio mixer and renderer with upload media file support for desktop files, iPhone Files, On My iPhone, iCloud Drive, Google Drive, Proton Drive, Dropbox, waveform visualization, frequency spectrum visualization, EQ, compression, panning, delay, reverb, de-essing, and WAV export.",
                        featureList: [
                            "Audio file decoding",
                            "Upload media file button",
                            "iPhone Files picker support",
                            "On My iPhone import",
                            "iCloud Drive, Google Drive, Proton Drive, and Dropbox import",
                            "Live WebAudio graph",
                            "Waveform visualizer",
                            "Frequency spectrum visualizer",
                            "Base volume control",
                            "Stereo panning",
                            "Convolution reverb",
                            "Delay and feedback",
                            "EQ filters",
                            "Compression",
                            "De-essing",
                            "WAV export",
                            "Local file playlists",
                            "Direct media URL playlists",
                            "Repeat current song toggle",
                            "Automatic next-track playback",
                            "CarPlay and wired iPhone USB safe output mode",
                            "Media Session lock-screen and car-control metadata",
                        ],
                    })}
                </script>
            </Helmet>

            <Stack spacing={4}>
                <SectionTitle
                    eyebrow="Audio tool"
                    title="Advanced WebAudio mixer, playlist player, visualizer, and renderer"
                    description="Decode audio/video containers into an AudioBuffer, create playlists from uploaded files or direct media URLs, use a large playlist play button, toggle repeat on or off for the current song, auto-play the next playlist track, visualize the processed signal, scrub the full duration, add effects, render the processed result to WAV, and restore saved browser sessions with localStorage and cookies, and use the CarPlay / USB safe mode for more stable wired iPhone playback."
                />

                <StoragePersistencePanel
                    storageInfo={storageInfo}
                    onClearSavedSession={clearSavedBrowserSession}
                />

                <GlassCard>
                    <Stack spacing={2.75}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: 2,
                                flexWrap: "wrap",
                                minWidth: 0,
                            }}
                        >
                            <Box sx={{ minWidth: 0, flex: "1 1 520px" }}>
                                <Stack
                                    direction="row"
                                    spacing={1.25}
                                    alignItems="center"
                                    sx={{ minWidth: 0, mb: 0.75 }}
                                >
                                    <Box
                                        sx={{
                                            width: 42,
                                            height: 42,
                                            flex: "0 0 auto",
                                            borderRadius: 3,
                                            display: "grid",
                                            placeItems: "center",
                                            background:
                                                "linear-gradient(135deg, rgba(103,232,249,0.2), rgba(167,139,250,0.18))",
                                            border: "1px solid rgba(255,255,255,0.12)",
                                            color: "#67e8f9",
                                        }}
                                    >
                                        <GraphicEqRoundedIcon />
                                    </Box>

                                    <Typography
                                        variant="h5"
                                        sx={{
                                            fontWeight: 950,
                                            lineHeight: 1.15,
                                            whiteSpace: "normal",
                                            overflow: "visible",
                                            textOverflow: "unset",
                                            wordBreak: "break-word",
                                            minWidth: 0,
                                        }}
                                    >
                                        Live full-width visualizer
                                    </Typography>
                                </Stack>

                                <Typography
                                    sx={{
                                        color: "rgba(255,255,255,0.62)",
                                        lineHeight: 1.65,
                                        maxWidth: 980,
                                    }}
                                >
                                    This reads from the final processed AnalyserNode after
                                    ClarityChain, Demudder, De-Esser, EQ, WaveShaper distortion,
                                    warm bitcrusher, delay, reverb, panning, compression, and gain.
                                </Typography>
                            </Box>

                            <Stack
                                direction="row"
                                spacing={1}
                                sx={{
                                    flex: "0 1 auto",
                                    flexWrap: "wrap",
                                    justifyContent: { xs: "flex-start", md: "flex-end" },
                                }}
                            >
                                <Button
                                    type="button"
                                    variant={visualizer3dSettings.enabled ? "contained" : "outlined"}
                                    onClick={() =>
                                        updateVisualizer3DSetting(
                                            "enabled",
                                            !visualizer3dSettings.enabled
                                        )
                                    }
                                    sx={{
                                        borderRadius: 999,
                                        px: 1.6,
                                        py: 0.7,
                                        color: visualizer3dSettings.enabled ? "#06111e" : "#fff",
                                        borderColor: "rgba(103,232,249,0.28)",
                                        background: visualizer3dSettings.enabled
                                            ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                            : "rgba(255,255,255,0.04)",
                                        fontSize: 12,
                                        fontWeight: 950,
                                    }}
                                >
                                    {visualizer3dSettings.enabled ? "3D on" : "3D off"}
                                </Button>

                                {visualizer3dSettings.enabled && (
                                    <FormControl
                                        size="small"
                                        sx={{
                                            minWidth: 170,
                                            "& .MuiInputLabel-root": {
                                                color: "rgba(255,255,255,0.66)",
                                            },
                                            "& .MuiOutlinedInput-root": {
                                                color: "#fff",
                                                borderRadius: 999,
                                                background: "rgba(7,10,19,0.72)",
                                                fontSize: 12,
                                                fontWeight: 850,
                                                "& fieldset": {
                                                    borderColor: "rgba(103,232,249,0.24)",
                                                },
                                            },
                                            "& .MuiSvgIcon-root": {
                                                color: "#67e8f9",
                                            },
                                        }}
                                    >
                                        <InputLabel id="visualizer-3d-model-label">
                                            Model
                                        </InputLabel>
                                        <Select
                                            labelId="visualizer-3d-model-label"
                                            value={visualizer3dSettings.model}
                                            label="Model"
                                            onChange={(event) =>
                                                updateVisualizer3DSetting(
                                                    "model",
                                                    event.target.value
                                                )
                                            }
                                        >
                                            {VISUALIZER_3D_MODE_OPTIONS.map((mode) => (
                                                <MenuItem key={mode.value} value={mode.value}>
                                                    {mode.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}

                                <Box
                                    sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.75,
                                        px: 1.4,
                                        py: 0.8,
                                        borderRadius: 999,
                                        background: "rgba(103,232,249,0.09)",
                                        border: "1px solid rgba(103,232,249,0.18)",
                                        color: "#67e8f9",
                                        fontSize: 12,
                                        fontWeight: 900,
                                        letterSpacing: 0.3,
                                    }}
                                >
                                    <EqualizerRoundedIcon sx={{ fontSize: 18 }} />
                                    processed analyser
                                </Box>

                                <Box
                                    sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.75,
                                        px: 1.4,
                                        py: 0.8,
                                        borderRadius: 999,
                                        background: "rgba(167,139,250,0.09)",
                                        border: "1px solid rgba(167,139,250,0.18)",
                                        color: "#c4b5fd",
                                        fontSize: 12,
                                        fontWeight: 900,
                                        letterSpacing: 0.3,
                                    }}
                                >
                                    <TuneRoundedIcon sx={{ fontSize: 18 }} />
                                    live graph
                                </Box>

                                <Box
                                    sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.75,
                                        px: 1.4,
                                        py: 0.8,
                                        borderRadius: 999,
                                        background: repeatEnabled
                                            ? "rgba(103,232,249,0.15)"
                                            : "rgba(255,255,255,0.07)",
                                        border: repeatEnabled
                                            ? "1px solid rgba(103,232,249,0.28)"
                                            : "1px solid rgba(255,255,255,0.12)",
                                        color: repeatEnabled ? "#67e8f9" : "rgba(255,255,255,0.7)",
                                        fontSize: 12,
                                        fontWeight: 900,
                                        letterSpacing: 0.3,
                                    }}
                                >
                                    <RepeatRoundedIcon sx={{ fontSize: 18 }} />
                                    {repeatEnabled ? "repeat on" : "repeat off"}
                                </Box>
                            </Stack>
                        </Box>

                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                                gap: 2,
                            }}
                        >
                            <Box
                                component="canvas"
                                ref={waveformCanvasRef}
                                sx={{
                                    width: "100%",
                                    height: { xs: 180, md: 230 },
                                    display: "block",
                                    borderRadius: 4,
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    background: "rgba(7,10,19,0.96)",
                                }}
                            />

                            <Box
                                component="canvas"
                                ref={frequencyCanvasRef}
                                sx={{
                                    width: "100%",
                                    height: { xs: 180, md: 230 },
                                    display: "block",
                                    borderRadius: 4,
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    background: "rgba(7,10,19,0.96)",
                                }}
                            />
                        </Box>

                        {visualizer3dSettings.enabled && (
                            <Box
                                component="canvas"
                                ref={visualizer3dCanvasRef}
                                sx={{
                                    width: "100%",
                                    height: { xs: 240, md: 340 },
                                    display: "block",
                                    borderRadius: 4,
                                    border: "1px solid rgba(103,232,249,0.14)",
                                    background:
                                        "radial-gradient(circle at 50% 18%, rgba(103,232,249,0.12), transparent 38%), rgba(7,10,19,0.98)",
                                }}
                            />
                        )}
                    </Stack>
                </GlassCard>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", lg: "0.82fr 1.18fr" },
                        gap: 3,
                        alignItems: "start",
                    }}
                >
                    <Stack spacing={3}>
                        <MediaInputForm
                            fileName={inputFile?.name || ""}
                            linkValue={directLink}
                            onLinkChange={setDirectLink}
                            onFileSelect={(file) => handleFileSelect(file, "Upload media file")}
                            onLoadLink={handleLoadDirectLink}
                            onClear={handleClearMedia}
                            disabled={isRendering || isLoading}
                        />

                        <GlassCard>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Stack direction="row" alignItems="center" spacing={1.1}>
                                        <QueueMusicRoundedIcon sx={{ color: "#67e8f9" }} />

                                        <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                            Playlist player: uploads and direct links
                                        </Typography>
                                    </Stack>

                                    <Typography sx={{ color: "rgba(255,255,255,0.62)", mt: 0.75 }}>
                                        Add uploaded files, paste direct media URLs, preload the queue, start
                                        from track 1 with one large button, repeat the current song, or let
                                        playback auto-skip bad items and continue when repeat is off. On iPhone,
                                        auto-next preserves the unlocked hidden audio output so the next track can
                                        start when the current track finishes.
                                    </Typography>
                                </Box>

                                <Button
                                    fullWidth
                                    size="large"
                                    variant="contained"
                                    startIcon={
                                        showPauseForPlaylistControls ? (
                                            <PauseRoundedIcon />
                                        ) : (
                                            <PlayArrowRoundedIcon />
                                        )
                                    }
                                    onClick={handlePlaylistPrimaryPlay}
                                    disabled={!playlist.length || isRendering || isLoading || isPreloadingPlaylist}
                                    sx={{
                                        borderRadius: 5,
                                        py: { xs: 1.9, md: 2.35 },
                                        px: 2.25,
                                        fontSize: { xs: 17, md: 20 },
                                        fontWeight: 1000,
                                        letterSpacing: 0.2,
                                        color: "#06111e",
                                        background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                        boxShadow:
                                            "0 24px 70px rgba(103,232,249,0.26), inset 0 1px 0 rgba(255,255,255,0.25)",
                                        "&:hover": {
                                            background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                            filter: "brightness(1.05)",
                                            transform: "translateY(-1px)",
                                        },
                                    }}
                                >
                                    {showPauseForPlaylistControls
                                        ? "Pause playlist"
                                        : "Start playlist"}
                                </Button>

                                <Button
                                    fullWidth
                                    size="large"
                                    variant="outlined"
                                    startIcon={
                                        isPreloadingPlaylist ? (
                                            <LinearProgress
                                                sx={{
                                                    width: 28,
                                                    height: 6,
                                                    borderRadius: 999,
                                                    background: "rgba(255,255,255,0.16)",
                                                    "& .MuiLinearProgress-bar": {
                                                        background: "#67e8f9",
                                                    },
                                                }}
                                            />
                                        ) : (
                                            <QueueMusicRoundedIcon />
                                        )
                                    }
                                    onClick={preloadPlaylist}
                                    disabled={!playlist.length || isRendering || isLoading || isPreloadingPlaylist}
                                    sx={{
                                        borderRadius: 5,
                                        py: { xs: 1.35, md: 1.55 },
                                        px: 2.25,
                                        fontWeight: 950,
                                        color: "#fff",
                                        borderColor: "rgba(103,232,249,0.34)",
                                        background: "rgba(103,232,249,0.07)",
                                        "&:hover": {
                                            borderColor: "rgba(103,232,249,0.62)",
                                            background: "rgba(103,232,249,0.12)",
                                        },
                                    }}
                                >
                                    {isPreloadingPlaylist
                                        ? "Preloading playlist..."
                                        : "Preload playlist direct + proxy fallback"}
                                </Button>

                                {playlistPreloadSummary && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: "rgba(255,255,255,0.64)",
                                            lineHeight: 1.55,
                                            mt: -0.5,
                                        }}
                                    >
                                        {playlistPreloadSummary}
                                    </Typography>
                                )}


                                <Box
                                    sx={{
                                        borderRadius: 4,
                                        p: 1.6,
                                        background: carPlaySafeMode
                                            ? "rgba(103,232,249,0.1)"
                                            : "rgba(255,255,255,0.045)",
                                        border: carPlaySafeMode
                                            ? "1px solid rgba(103,232,249,0.24)"
                                            : "1px solid rgba(255,255,255,0.08)",
                                    }}
                                >
                                    <Stack spacing={1.15}>
                                        <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            alignItems={{ xs: "stretch", sm: "center" }}
                                            justifyContent="space-between"
                                            spacing={1}
                                        >
                                            <Box>
                                                <Typography sx={{ fontWeight: 950, color: "#fff" }}>
                                                    CarPlay / USB safe mode
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.55 }}
                                                >
                                                    Best for wired iPhone CarPlay where effects or route output can jump.
                                                </Typography>
                                            </Box>

                                            <Button
                                                variant={carPlaySafeMode ? "contained" : "outlined"}
                                                onClick={toggleCarPlaySafeMode}
                                                disabled={isRendering || isLoading}
                                                sx={{
                                                    borderRadius: 999,
                                                    color: carPlaySafeMode ? "#06111e" : "#fff",
                                                    borderColor: "rgba(255,255,255,0.18)",
                                                    fontWeight: 950,
                                                    background: carPlaySafeMode
                                                        ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                        : "transparent",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {carPlaySafeMode ? "Safe mode ON" : "Safe mode OFF"}
                                            </Button>
                                        </Stack>

                                        <Typography sx={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.65 }}>
                                            {carPlayOutputStatus}
                                        </Typography>
                                    </Stack>
                                </Box>

                                <Button
                                    component="label"
                                    variant="contained"
                                    startIcon={<PlaylistAddRoundedIcon />}
                                    disabled={isRendering || isLoading}
                                    sx={{
                                        borderRadius: 999,
                                        py: 1.35,
                                        fontWeight: 950,
                                        color: "#06111e",
                                        background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                        boxShadow: "0 18px 46px rgba(103,232,249,0.18)",
                                        "&:hover": {
                                            background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                            filter: "brightness(1.04)",
                                        },
                                    }}
                                >
                                    Add uploaded files to playlist
                                    <input
                                        hidden
                                        multiple
                                        type="file"
                                        accept="audio/*,video/*,.mp3,.wav,.ogg,.oga,.opus,.webm,.m4a,.mp4,.mov,.aac,.flac,.aif,.aiff"
                                        onChange={(event) => {
                                            addFilesToPlaylist(event.target.files);
                                            event.target.value = "";
                                        }}
                                    />
                                </Button>

                                <Box
                                    sx={{
                                        borderRadius: 4,
                                        p: 1.5,
                                        background: "rgba(255,255,255,0.045)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                    }}
                                >
                                    <Stack spacing={1.25}>
                                        <TextField
                                            fullWidth
                                            multiline
                                            minRows={2}
                                            value={playlistLink}
                                            onChange={(event) => setPlaylistLink(event.target.value)}
                                            disabled={isRendering || isLoading}
                                            placeholder="Paste direct media URL(s), one per line or comma-separated: .mp3, .wav, .m4a, .mp4, .mov, .webm, .ogg..."
                                            label="Direct file links for playlist"
                                            variant="outlined"
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    color: "#fff",
                                                    borderRadius: 3,
                                                    background: "rgba(7,10,19,0.48)",
                                                    "& fieldset": {
                                                        borderColor: "rgba(255,255,255,0.16)",
                                                    },
                                                    "&:hover fieldset": {
                                                        borderColor: "rgba(103,232,249,0.35)",
                                                    },
                                                    "&.Mui-focused fieldset": {
                                                        borderColor: "#67e8f9",
                                                    },
                                                },
                                                "& .MuiInputLabel-root": {
                                                    color: "rgba(255,255,255,0.68)",
                                                },
                                                "& .MuiInputLabel-root.Mui-focused": {
                                                    color: "#67e8f9",
                                                },
                                            }}
                                        />

                                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                startIcon={<PlaylistAddRoundedIcon />}
                                                onClick={addDirectLinksToPlaylist}
                                                disabled={isRendering || isLoading}
                                                sx={{
                                                    borderRadius: 999,
                                                    py: 1.15,
                                                    color: "#fff",
                                                    borderColor: "rgba(255,255,255,0.18)",
                                                    fontWeight: 950,
                                                }}
                                            >
                                                Add direct link(s)
                                            </Button>

                                            <Button
                                                fullWidth
                                                variant="text"
                                                onClick={addCurrentMediaToPlaylist}
                                                disabled={isRendering || isLoading || (!hasMedia && !sourceUrl)}
                                                sx={{
                                                    color: "rgba(255,255,255,0.78)",
                                                    fontWeight: 950,
                                                }}
                                            >
                                                Add loaded source
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Box>

                                <Button
                                    variant={repeatEnabled ? "contained" : "outlined"}
                                    startIcon={<RepeatRoundedIcon />}
                                    onClick={toggleRepeat}
                                    disabled={isRendering || isLoading}
                                    sx={{
                                        borderRadius: 4,
                                        py: 1.25,
                                        color: repeatEnabled ? "#06111e" : "#fff",
                                        borderColor: "rgba(255,255,255,0.18)",
                                        fontWeight: 950,
                                        background: repeatEnabled
                                            ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                            : "transparent",
                                    }}
                                >
                                    {repeatEnabled
                                        ? "Repeat current song: ON"
                                        : "Repeat current song: OFF"}
                                </Button>

                                <Box
                                    sx={{
                                        borderRadius: 4,
                                        p: 2,
                                        background: repeatEnabled
                                            ? "rgba(103,232,249,0.1)"
                                            : "rgba(255,255,255,0.055)",
                                        border: repeatEnabled
                                            ? "1px solid rgba(103,232,249,0.2)"
                                            : "1px solid rgba(255,255,255,0.08)",
                                    }}
                                >
                                    <Typography sx={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.7 }}>
                                        {playlistStatusLabel}
                                    </Typography>
                                </Box>

                                {activePlaylistItem && (
                                    <Box
                                        sx={{
                                            borderRadius: 4,
                                            p: 1.6,
                                            background: "rgba(103,232,249,0.08)",
                                            border: "1px solid rgba(103,232,249,0.16)",
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: "#67e8f9",
                                                fontWeight: 950,
                                                textTransform: "uppercase",
                                                letterSpacing: 0.8,
                                            }}
                                        >
                                            Active playlist track
                                        </Typography>

                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            spacing={1.15}
                                            sx={{ mt: 0.8, minWidth: 0 }}
                                        >
                                            {activePlaylistArtworkSource ? (
                                                <Box
                                                    component="img"
                                                    src={activePlaylistArtworkSource}
                                                    alt=""
                                                    sx={{
                                                        width: 46,
                                                        height: 46,
                                                        borderRadius: 2.25,
                                                        objectFit: "cover",
                                                        flex: "0 0 auto",
                                                        border: "1px solid rgba(255,255,255,0.16)",
                                                        background: "rgba(255,255,255,0.08)",
                                                    }}
                                                />
                                            ) : (
                                                <Box
                                                    sx={{
                                                        width: 46,
                                                        height: 46,
                                                        borderRadius: 2.25,
                                                        display: "grid",
                                                        placeItems: "center",
                                                        flex: "0 0 auto",
                                                        color: "#67e8f9",
                                                        background:
                                                            "linear-gradient(135deg, rgba(103,232,249,0.18), rgba(167,139,250,0.14))",
                                                        border: "1px solid rgba(255,255,255,0.12)",
                                                    }}
                                                >
                                                    <AudioFileRoundedIcon sx={{ fontSize: 23 }} />
                                                </Box>
                                            )}

                                            <Typography
                                                sx={{
                                                    color: "#fff",
                                                    fontWeight: 900,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    minWidth: 0,
                                                }}
                                                title={activePlaylistItem.title}
                                            >
                                                {activePlaylistIndex + 1}. {activePlaylistItem.title}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                )}

                                {!playlist.length ? (
                                    <Box
                                        sx={{
                                            borderRadius: 4,
                                            p: 3,
                                            textAlign: "center",
                                            border: "1px dashed rgba(255,255,255,0.18)",
                                            color: "rgba(255,255,255,0.62)",
                                        }}
                                    >
                                        No playlist items yet. Add uploaded files or paste direct file links above.
                                    </Box>
                                ) : (
                                    <Stack spacing={1.1}>
                                        {playlist.map((item, index) => {
                                            const active = index === activePlaylistIndex;
                                            const isDragSource =
                                                playlistDragState.fromIndex === index;
                                            const isDropTarget =
                                                playlistDragState.overIndex === index &&
                                                playlistDragState.fromIndex !== index;
                                            const itemArtworkSource = buildAbsoluteMediaAssetUrl(
                                                getPlaylistItemArtworkSource(item)
                                            );

                                            return (
                                                <Box
                                                    key={item.id}
                                                    onDragOver={(event) => handlePlaylistDragOver(event, index)}
                                                    onDrop={(event) => handlePlaylistDrop(event, index)}
                                                    sx={{
                                                        display: "grid",
                                                        gridTemplateColumns: {
                                                            xs: "46px minmax(0, 1fr)",
                                                            sm: "46px minmax(0, 1fr) auto auto 44px",
                                                        },
                                                        gap: 1,
                                                        alignItems: "center",
                                                        borderRadius: 3,
                                                        p: 1.25,
                                                        transform: isDragSource
                                                            ? "scale(0.985)"
                                                            : isDropTarget
                                                                ? "translateY(-2px)"
                                                                : "none",
                                                        transition:
                                                            "transform 150ms ease, border-color 150ms ease, background 150ms ease, box-shadow 150ms ease",
                                                        background: active
                                                            ? "rgba(103,232,249,0.14)"
                                                            : isDropTarget
                                                                ? "rgba(167,139,250,0.13)"
                                                                : "rgba(255,255,255,0.06)",
                                                        border: active
                                                            ? "1px solid rgba(103,232,249,0.3)"
                                                            : isDropTarget
                                                                ? "1px solid rgba(167,139,250,0.45)"
                                                                : "1px solid rgba(255,255,255,0.08)",
                                                        boxShadow: isDropTarget
                                                            ? "0 18px 36px rgba(167,139,250,0.15)"
                                                            : "none",
                                                        opacity: isDragSource ? 0.72 : 1,
                                                    }}
                                                >
                                                    {itemArtworkSource ? (
                                                        <Box
                                                            component="img"
                                                            src={itemArtworkSource}
                                                            alt=""
                                                            sx={{
                                                                width: 46,
                                                                height: 46,
                                                                borderRadius: 2.25,
                                                                objectFit: "cover",
                                                                border: "1px solid rgba(255,255,255,0.12)",
                                                                background: "rgba(255,255,255,0.08)",
                                                            }}
                                                        />
                                                    ) : (
                                                        <Box
                                                            sx={{
                                                                width: 46,
                                                                height: 46,
                                                                borderRadius: 2.25,
                                                                display: "grid",
                                                                placeItems: "center",
                                                                color: "#67e8f9",
                                                                background:
                                                                    "linear-gradient(135deg, rgba(103,232,249,0.16), rgba(167,139,250,0.12))",
                                                                border: "1px solid rgba(255,255,255,0.12)",
                                                            }}
                                                        >
                                                            <AudioFileRoundedIcon sx={{ fontSize: 22 }} />
                                                        </Box>
                                                    )}

                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography
                                                            sx={{
                                                                fontWeight: 900,
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                            title={item.title}
                                                        >
                                                            {index + 1}. {item.title}
                                                        </Typography>

                                                        <Typography
                                                            variant="caption"
                                                            sx={{ color: "rgba(255,255,255,0.55)" }}
                                                        >
                                                            {getPlaylistItemMeta(item)}
                                                        </Typography>
                                                    </Box>

                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => loadPlaylistItem(index, true)}
                                                        disabled={isRendering || isLoading || isPreloadingPlaylist}
                                                        sx={{
                                                            borderRadius: 999,
                                                            color: "#fff",
                                                            borderColor: "rgba(255,255,255,0.18)",
                                                            fontWeight: 900,
                                                            gridColumn: {
                                                                xs: "1 / span 2",
                                                                sm: "auto",
                                                            },
                                                        }}
                                                    >
                                                        Play
                                                    </Button>

                                                    <Button
                                                        size="small"
                                                        onClick={() => removePlaylistItem(item.id)}
                                                        disabled={isRendering || isLoading || isPreloadingPlaylist}
                                                        sx={{
                                                            minWidth: 42,
                                                            color: "rgba(255,255,255,0.68)",
                                                            justifySelf: {
                                                                xs: "end",
                                                                sm: "auto",
                                                            },
                                                            gridColumn: {
                                                                xs: "1 / span 2",
                                                                sm: "auto",
                                                            },
                                                        }}
                                                    >
                                                        <DeleteRoundedIcon fontSize="small" />
                                                    </Button>

                                                    <Button
                                                        size="small"
                                                        draggable={
                                                            !isRendering &&
                                                            !isLoading &&
                                                            !isPreloadingPlaylist &&
                                                            playlist.length > 1
                                                        }
                                                        onDragStart={(event) =>
                                                            handlePlaylistDragStart(event, index)
                                                        }
                                                        onDragEnd={handlePlaylistDragEnd}
                                                        disabled={
                                                            isRendering ||
                                                            isLoading ||
                                                            isPreloadingPlaylist ||
                                                            playlist.length < 2
                                                        }
                                                        aria-label={`Drag ${item.title} to reorder playlist`}
                                                        title="Drag from here to reorder"
                                                        sx={{
                                                            minWidth: 42,
                                                            width: 42,
                                                            height: 42,
                                                            borderRadius: 2.5,
                                                            color: "rgba(255,255,255,0.72)",
                                                            cursor: playlist.length > 1 ? "grab" : "default",
                                                            justifySelf: "end",
                                                            gridColumn: {
                                                                xs: "2",
                                                                sm: "auto",
                                                            },
                                                            touchAction: "none",
                                                            userSelect: "none",
                                                            border: "1px solid rgba(255,255,255,0.12)",
                                                            background: "rgba(255,255,255,0.045)",
                                                            "&:active": {
                                                                cursor: "grabbing",
                                                            },
                                                            "&:hover": {
                                                                color: "#fff",
                                                                borderColor: "rgba(167,139,250,0.42)",
                                                                background: "rgba(167,139,250,0.12)",
                                                            },
                                                        }}
                                                    >
                                                        <DragIndicatorRoundedIcon fontSize="small" />
                                                    </Button>
                                                </Box>
                                            );
                                        })}

                                        <Stack direction="row" flexWrap="wrap" gap={1}>
                                            <Button
                                                variant="outlined"
                                                startIcon={<SkipPreviousRoundedIcon />}
                                                onClick={playPreviousPlaylistItem}
                                                disabled={isRendering || isLoading}
                                                sx={{
                                                    borderRadius: 999,
                                                    color: "#fff",
                                                    borderColor: "rgba(255,255,255,0.18)",
                                                    fontWeight: 900,
                                                }}
                                            >
                                                Play previous
                                            </Button>

                                            <Button
                                                variant="outlined"
                                                startIcon={<SkipNextRoundedIcon />}
                                                onClick={playNextPlaylistItem}
                                                disabled={isRendering || isLoading}
                                                sx={{
                                                    borderRadius: 999,
                                                    color: "#fff",
                                                    borderColor: "rgba(255,255,255,0.18)",
                                                    fontWeight: 900,
                                                }}
                                            >
                                                Play next
                                            </Button>

                                            <Button
                                                variant="text"
                                                onClick={clearPlaylist}
                                                disabled={isRendering || isLoading}
                                                sx={{
                                                    color: "rgba(255,255,255,0.72)",
                                                    fontWeight: 900,
                                                }}
                                            >
                                                Clear playlist
                                            </Button>
                                        </Stack>
                                    </Stack>
                                )}
                            </Stack>
                        </GlassCard>

                        <GlassCard>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.5 }}>
                                        Buffer player
                                    </Typography>
                                    <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
                                        Playback uses fresh AudioBufferSourceNodes so scrubbing,
                                        speed, pitch, panning, delay, and reverb stay stable.
                                    </Typography>
                                </Box>

                                {!hasMedia && (
                                    <Box
                                        sx={{
                                            borderRadius: 4,
                                            p: 3,
                                            textAlign: "center",
                                            border: "1px dashed rgba(255,255,255,0.18)",
                                            color: "rgba(255,255,255,0.62)",
                                        }}
                                    >
                                        {isLoading
                                            ? "Loading, sniffing, and decoding media..."
                                            : "No decoded media loaded yet."}
                                    </Box>
                                )}

                                {hasMedia && (
                                    <Box
                                        sx={{
                                            borderRadius: 4,
                                            p: 2.5,
                                            background:
                                                "linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
                                            border: "1px solid rgba(255,255,255,0.11)",
                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                                        }}
                                    >
                                        <Stack spacing={1.75}>
                                            <Box
                                                sx={{
                                                    display: "grid",
                                                    gridTemplateColumns: {
                                                        xs: "1fr",
                                                        md: "minmax(0, 1fr) 330px",
                                                    },
                                                    gap: 2,
                                                    alignItems: "center",
                                                }}
                                            >
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        spacing={1.15}
                                                        sx={{ mb: 0.9, minWidth: 0 }}
                                                    >
                                                        {playerArtworkSource ? (
                                                            <Box
                                                                component="img"
                                                                src={playerArtworkSource}
                                                                alt=""
                                                                sx={{
                                                                    width: 58,
                                                                    height: 58,
                                                                    borderRadius: 3,
                                                                    objectFit: "cover",
                                                                    flex: "0 0 auto",
                                                                    border: "1px solid rgba(255,255,255,0.14)",
                                                                    background: "rgba(255,255,255,0.08)",
                                                                    boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
                                                                }}
                                                            />
                                                        ) : (
                                                            <Box
                                                                sx={{
                                                                    width: 58,
                                                                    height: 58,
                                                                    borderRadius: 3,
                                                                    display: "grid",
                                                                    placeItems: "center",
                                                                    flex: "0 0 auto",
                                                                    color: "#67e8f9",
                                                                    background:
                                                                        "linear-gradient(135deg, rgba(103,232,249,0.18), rgba(167,139,250,0.14))",
                                                                    border: "1px solid rgba(255,255,255,0.11)",
                                                                }}
                                                            >
                                                                <AudioFileRoundedIcon sx={{ fontSize: 26 }} />
                                                            </Box>
                                                        )}

                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: "rgba(255,255,255,0.5)",
                                                                    fontWeight: 900,
                                                                    textTransform: "uppercase",
                                                                    letterSpacing: 0.8,
                                                                    display: "block",
                                                                    mb: 0.15,
                                                                }}
                                                            >
                                                                Current audio
                                                            </Typography>

                                                            <Typography
                                                                sx={{
                                                                    color: "rgba(255,255,255,0.94)",
                                                                    fontWeight: 950,
                                                                    lineHeight: 1.25,
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    whiteSpace: "nowrap",
                                                                }}
                                                                title={mediaTitle}
                                                            >
                                                                {mediaTitle}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>

                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        justifyContent="space-between"
                                                        spacing={1.5}
                                                        sx={{ minWidth: 0 }}
                                                    >
                                                        <Typography
                                                            sx={{
                                                                fontWeight: 900,
                                                                color: "rgba(255,255,255,0.82)",
                                                            }}
                                                        >
                                                            {isScrubbing
                                                                ? "Scrubbing"
                                                                : isPlaying
                                                                    ? isMuted
                                                                        ? "Playing muted preview"
                                                                        : "Playing processed buffer"
                                                                    : "Ready"}
                                                        </Typography>

                                                        <Typography
                                                            sx={{
                                                                color: "#67e8f9",
                                                                fontWeight: 950,
                                                                flex: "0 0 auto",
                                                                fontVariantNumeric: "tabular-nums",
                                                            }}
                                                        >
                                                            {formatTime(position)} / {formatTime(duration)}
                                                        </Typography>
                                                    </Stack>

                                                    {mediaInfo && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: "rgba(255,255,255,0.6)",
                                                                display: "block",
                                                                lineHeight: 1.5,
                                                                mt: 0.4,
                                                            }}
                                                        >
                                                            {mediaInfo}
                                                        </Typography>
                                                    )}
                                                </Box>

                                                <Box
                                                    sx={{
                                                        borderRadius: 3.5,
                                                        px: 1.75,
                                                        py: 1.35,
                                                        background:
                                                            "linear-gradient(135deg, rgba(7,10,19,0.76), rgba(15,23,42,0.56))",
                                                        border: "1px solid rgba(255,255,255,0.11)",
                                                        boxShadow:
                                                            "0 14px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
                                                    }}
                                                >
                                                    <Stack spacing={0.8}>
                                                        <Stack
                                                            direction="row"
                                                            alignItems="center"
                                                            justifyContent="space-between"
                                                            spacing={1}
                                                        >
                                                            <Stack
                                                                direction="row"
                                                                alignItems="center"
                                                                spacing={0.8}
                                                            >
                                                                <VolumeUpRoundedIcon
                                                                    sx={{
                                                                        fontSize: 19,
                                                                        color: "#67e8f9",
                                                                    }}
                                                                />
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        color: "rgba(255,255,255,0.86)",
                                                                        fontWeight: 950,
                                                                        textTransform: "uppercase",
                                                                        letterSpacing: 0.8,
                                                                    }}
                                                                >
                                                                    Base volume
                                                                </Typography>
                                                            </Stack>

                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: "#67e8f9",
                                                                    fontWeight: 950,
                                                                    fontVariantNumeric: "tabular-nums",
                                                                }}
                                                            >
                                                                {settingsView.baseVolume.toFixed(2)}x
                                                            </Typography>
                                                        </Stack>

                                                        <Stack direction="row" alignItems="center" spacing={1.15}>
                                                            <VolumeDownRoundedIcon
                                                                sx={{
                                                                    fontSize: 18,
                                                                    color: "rgba(255,255,255,0.5)",
                                                                    flex: "0 0 auto",
                                                                }}
                                                            />

                                                            <Slider
                                                                value={settingsView.baseVolume}
                                                                min={0}
                                                                max={HUMAN_SAFE_LIMITS.baseVolume.max}
                                                                step={0.01}
                                                                aria-label="Safe base volume"
                                                                disabled={isRendering || isLoading || isPreloadingPlaylist}
                                                                onChange={(_, value) =>
                                                                    updateSetting(
                                                                        "baseVolume",
                                                                        Array.isArray(value) ? value[0] : value
                                                                    )
                                                                }
                                                                valueLabelDisplay="auto"
                                                                valueLabelFormat={(value) =>
                                                                    `${Number(value).toFixed(2)}x`
                                                                }
                                                                sx={{
                                                                    color: "#67e8f9",
                                                                    py: 0,
                                                                    "& .MuiSlider-thumb": {
                                                                        width: 16,
                                                                        height: 16,
                                                                        boxShadow:
                                                                            "0 0 0 7px rgba(103,232,249,0.08)",
                                                                    },
                                                                    "& .MuiSlider-rail": {
                                                                        color: "rgba(255,255,255,0.18)",
                                                                    },
                                                                    "& .MuiSlider-track": {
                                                                        border: "none",
                                                                    },
                                                                }}
                                                            />

                                                            <VolumeUpRoundedIcon
                                                                sx={{
                                                                    fontSize: 18,
                                                                    color: "rgba(255,255,255,0.68)",
                                                                    flex: "0 0 auto",
                                                                }}
                                                            />
                                                        </Stack>
                                                    </Stack>
                                                </Box>
                                            </Box>

                                            <Slider
                                                value={clamp(position, 0, duration || 0)}
                                                min={0}
                                                max={duration || 0}
                                                step={0.01}
                                                disabled={!hasMedia || isRendering || isLoading}
                                                onPointerDown={handleScrubStart}
                                                onMouseDown={handleScrubStart}
                                                onTouchStart={handleScrubStart}
                                                onKeyDown={handleScrubKeyDown}
                                                onChange={handleScrubChange}
                                                onChangeCommitted={handleScrubCommit}
                                                valueLabelDisplay="auto"
                                                valueLabelFormat={(value) => formatTime(value)}
                                                sx={{
                                                    color: "#67e8f9",
                                                    "& .MuiSlider-thumb": {
                                                        boxShadow: "0 0 0 8px rgba(103,232,249,0.08)",
                                                    },
                                                    "& .MuiSlider-rail": {
                                                        color: "rgba(255,255,255,0.18)",
                                                    },
                                                }}
                                            />

                                            <LinearProgress
                                                variant="determinate"
                                                value={progressValue}
                                                sx={{
                                                    height: 10,
                                                    borderRadius: 999,
                                                    background: "rgba(255,255,255,0.12)",
                                                    "& .MuiLinearProgress-bar": {
                                                        background:
                                                            "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                    },
                                                }}
                                            />

                                            <Typography
                                                variant="caption"
                                                sx={{ color: "rgba(255,255,255,0.58)" }}
                                            >
                                                pan = {settingsView.pan.toFixed(2)} | delay ={" "}
                                                {settingsView.delayMix.toFixed(2)} | reverb ={" "}
                                                {settingsView.reverbMix.toFixed(2)} | playbackRate ={" "}
                                                {settingsView.speed.toFixed(2)}x | detune ={" "}
                                                {pitchCents.toFixed(0)} cents | effective rate ={" "}
                                                {effectiveRate.toFixed(2)}x
                                            </Typography>
                                        </Stack>
                                    </Box>
                                )}

                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                    <Button
                                        fullWidth
                                        size="large"
                                        variant="contained"
                                        startIcon={
                                            showPauseForMainControls ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />
                                        }
                                        onClick={handlePlayPause}
                                        disabled={!hasMedia || isRendering || isLoading}
                                        sx={{
                                            borderRadius: 4,
                                            py: 1.35,
                                            fontWeight: 950,
                                            color: "#06111e",
                                            background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                        }}
                                    >
                                        {showPauseForMainControls ? "Pause playback" : "Play processed audio"}
                                    </Button>

                                    <Button
                                        fullWidth
                                        size="large"
                                        variant="outlined"
                                        startIcon={<RestartAltRoundedIcon />}
                                        onClick={restartPlayback}
                                        disabled={!hasMedia || isRendering || isLoading}
                                        sx={{
                                            borderRadius: 4,
                                            py: 1.35,
                                            color: "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 950,
                                        }}
                                    >
                                        Restart
                                    </Button>
                                    <Button
                                        fullWidth
                                        size="large"
                                        variant={repeatEnabled ? "contained" : "outlined"}
                                        startIcon={<RepeatRoundedIcon />}
                                        onClick={toggleRepeat}
                                        disabled={!hasMedia || isRendering || isLoading}
                                        sx={{
                                            borderRadius: 4,
                                            py: 1.35,
                                            color: repeatEnabled ? "#06111e" : "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 950,
                                            background: repeatEnabled
                                                ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                : "transparent",
                                        }}
                                    >
                                        {repeatEnabled ? "Repeat on" : "Repeat off"}
                                    </Button>

                                    <Button
                                        fullWidth
                                        size="large"
                                        variant="outlined"
                                        startIcon={<SkipPreviousRoundedIcon />}
                                        onClick={playPreviousPlaylistItem}
                                        disabled={!playlist.length || isRendering || isLoading}
                                        sx={{
                                            borderRadius: 4,
                                            py: 1.35,
                                            color: "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 950,
                                        }}
                                    >
                                        Previous track
                                    </Button>

                                    <Button
                                        fullWidth
                                        size="large"
                                        variant="outlined"
                                        startIcon={<SkipNextRoundedIcon />}
                                        onClick={playNextPlaylistItem}
                                        disabled={!playlist.length || isRendering || isLoading}
                                        sx={{
                                            borderRadius: 4,
                                            py: 1.35,
                                            color: "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 950,
                                        }}
                                    >
                                        Next track
                                    </Button>
                                </Stack>

                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                    <Button
                                        fullWidth
                                        size="large"
                                        variant={isMuted ? "contained" : "outlined"}
                                        startIcon={
                                            isMuted ? (
                                                <VolumeUpRoundedIcon />
                                            ) : (
                                                <VolumeOffRoundedIcon />
                                            )
                                        }
                                        onClick={toggleMute}
                                        disabled={isRendering || isLoading}
                                        sx={{
                                            borderRadius: 4,
                                            py: 1.25,
                                            color: isMuted ? "#06111e" : "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 950,
                                            background: isMuted
                                                ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                : "transparent",
                                        }}
                                    >
                                        {isMuted ? "Unmute preview" : "Mute preview"}
                                    </Button>

                                    <Button
                                        fullWidth
                                        variant="text"
                                        onClick={() => stopPlayback(true)}
                                        disabled={!hasMedia || isRendering || isLoading}
                                        sx={{
                                            color: "rgba(255,255,255,0.72)",
                                            fontWeight: 900,
                                        }}
                                    >
                                        Stop and reset position
                                    </Button>
                                </Stack>

                                <Button
                                    fullWidth
                                    size="large"
                                    variant="contained"
                                    startIcon={<PlaylistAddRoundedIcon />}
                                    onClick={postCurrentMediaToCommunityFeed}
                                    disabled={
                                        !hasMedia ||
                                        isRendering ||
                                        isLoading ||
                                        isPostingCommunityPost
                                    }
                                    sx={{
                                        borderRadius: 4,
                                        py: 1.25,
                                        color: "#06111e",
                                        fontWeight: 950,
                                        background:
                                            "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                    }}
                                >
                                    {isPostingCommunityPost
                                        ? "Posting to community feed..."
                                        : "Add post to community feed"}
                                </Button>

                                <StatusBanner status={status} tone={statusTone} />

                                {(isRendering || isLoading) && (
                                    <LinearProgress
                                        sx={{
                                            borderRadius: 999,
                                            background: "rgba(255,255,255,0.12)",
                                            "& .MuiLinearProgress-bar": {
                                                background:
                                                    "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                            },
                                        }}
                                    />
                                )}
                            </Stack>
                        </GlassCard>
                    </Stack>

                    <GlassCard>
                        <Stack spacing={3}>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.5 }}>
                                    WebAudio mixer
                                </Typography>
                                <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
                                    Processing controls feed the same graph used for preview,
                                    visualization, and WAV export. Base volume is inside the Buffer
                                    player panel beside the duration readout.
                                </Typography>
                            </Box>

                            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 4,
                                    border: "1px solid rgba(103,232,249,0.18)",
                                    background:
                                        "linear-gradient(135deg, rgba(103,232,249,0.08), rgba(167,139,250,0.08))",
                                }}
                            >
                                <Stack spacing={2}>
                                    <Stack
                                        direction={{ xs: "column", md: "row" }}
                                        spacing={2}
                                        alignItems={{ xs: "stretch", md: "center" }}
                                    >
                                        <FormControl
                                            fullWidth
                                            disabled={isRendering || isLoading}
                                            sx={{
                                                "& .MuiInputLabel-root": {
                                                    color: "rgba(255,255,255,0.72)",
                                                },
                                                "& .MuiOutlinedInput-root": {
                                                    color: "#fff",
                                                    borderRadius: 3,
                                                    background: "rgba(7,10,19,0.66)",
                                                    "& fieldset": {
                                                        borderColor: "rgba(255,255,255,0.18)",
                                                    },
                                                    "&:hover fieldset": {
                                                        borderColor: "rgba(103,232,249,0.5)",
                                                    },
                                                },
                                                "& .MuiSvgIcon-root": {
                                                    color: "#67e8f9",
                                                },
                                            }}
                                        >
                                            <InputLabel id="mixer-preset-label">
                                                Mixer preset
                                            </InputLabel>
                                            <Select
                                                labelId="mixer-preset-label"
                                                id="mixer-preset-select"
                                                value={activePresetKey}
                                                label="Mixer preset"
                                                onChange={(event) =>
                                                    applyMixerPreset(event.target.value)
                                                }
                                                inputProps={{
                                                    "aria-label": "Choose a safe mixer preset",
                                                }}
                                            >
                                                {activePresetKey === "custom" && (
                                                    <MenuItem value="custom" disabled>
                                                        Custom safe mix
                                                    </MenuItem>
                                                )}

                                                {MIXER_PRESETS.map((preset) => (
                                                    <MenuItem key={preset.key} value={preset.key}>
                                                        {preset.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            flexWrap="wrap"
                                            useFlexGap
                                            aria-label="Preset safety limits"
                                        >
                                            <Chip
                                                size="small"
                                                label="Min speed 0.80x"
                                                sx={{
                                                    color: "#67e8f9",
                                                    borderColor: "rgba(103,232,249,0.35)",
                                                    fontWeight: 900,
                                                }}
                                                variant="outlined"
                                            />
                                            <Chip
                                                size="small"
                                                label="High EQ max +6 dB"
                                                sx={{
                                                    color: "#a78bfa",
                                                    borderColor: "rgba(167,139,250,0.35)",
                                                    fontWeight: 900,
                                                }}
                                                variant="outlined"
                                            />
                                            <Chip
                                                size="small"
                                                label="Output max +6 dB"
                                                sx={{
                                                    color: "#fff",
                                                    borderColor: "rgba(255,255,255,0.22)",
                                                    fontWeight: 900,
                                                }}
                                                variant="outlined"
                                            />
                                        </Stack>
                                    </Stack>

                                    <Typography
                                        variant="body2"
                                        sx={{ color: "rgba(255,255,255,0.68)", lineHeight: 1.65 }}
                                    >
                                        {selectedPresetDescription}
                                    </Typography>

                                    <Box
                                        role="list"
                                        aria-label="Quick mixer preset buttons"
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "1fr 1fr",
                                                lg: "repeat(4, 1fr)",
                                            },
                                            gap: 1,
                                        }}
                                    >
                                        {MIXER_PRESETS.map((preset) => {
                                            const selected = activePresetKey === preset.key;

                                            return (
                                                <Box key={preset.key} role="listitem">
                                                    <Button
                                                        type="button"
                                                        variant={selected ? "contained" : "outlined"}
                                                        aria-pressed={selected}
                                                        onClick={() => applyMixerPreset(preset.key)}
                                                        disabled={isRendering || isLoading}
                                                        fullWidth
                                                        sx={{
                                                            justifyContent: "flex-start",
                                                            borderRadius: 3,
                                                            px: 1.4,
                                                            py: 1,
                                                            color: selected ? "#06111e" : "#fff",
                                                            borderColor: "rgba(255,255,255,0.16)",
                                                            fontWeight: 950,
                                                            background: selected
                                                                ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                                : "rgba(255,255,255,0.03)",
                                                            textAlign: "left",
                                                        }}
                                                    >
                                                        {preset.shortLabel || preset.label}
                                                    </Button>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Stack>
                            </Box>

                            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                    gap: 2.5,
                                }}
                            >
                                <ControlSlider
                                    label="Stereo pan"
                                    value={settingsView.pan}
                                    min={-1}
                                    max={1}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("pan", value)}
                                />

                                <ControlSlider
                                    label="Convolution reverb"
                                    value={settingsView.reverbMix}
                                    min={HUMAN_SAFE_LIMITS.reverbMix.min}
                                    max={HUMAN_SAFE_LIMITS.reverbMix.max}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("reverbMix", value)}
                                />

                                <ControlSlider
                                    label="Reverb size"
                                    value={settingsView.reverbSeconds}
                                    min={HUMAN_SAFE_LIMITS.reverbSeconds.min}
                                    max={HUMAN_SAFE_LIMITS.reverbSeconds.max}
                                    step={0.05}
                                    unit=" sec"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("reverbSeconds", value)}
                                />

                                <ControlSlider
                                    label="Delay mix"
                                    value={settingsView.delayMix}
                                    min={HUMAN_SAFE_LIMITS.delayMix.min}
                                    max={HUMAN_SAFE_LIMITS.delayMix.max}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("delayMix", value)}
                                />

                                <ControlSlider
                                    label="Delay time"
                                    value={settingsView.delayTime}
                                    min={HUMAN_SAFE_LIMITS.delayTime.min}
                                    max={HUMAN_SAFE_LIMITS.delayTime.max}
                                    step={0.01}
                                    unit=" sec"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("delayTime", value)}
                                />

                                <ControlSlider
                                    label="Delay feedback"
                                    value={settingsView.delayFeedback}
                                    min={HUMAN_SAFE_LIMITS.delayFeedback.min}
                                    max={HUMAN_SAFE_LIMITS.delayFeedback.max}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("delayFeedback", value)}
                                />

                                <ControlSlider
                                    label="ClarityChain"
                                    value={settingsView.clarityAmount}
                                    min={HUMAN_SAFE_LIMITS.clarityAmount.min}
                                    max={HUMAN_SAFE_LIMITS.clarityAmount.max}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("clarityAmount", value)}
                                />

                                <ControlSlider
                                    label="Demudder"
                                    value={settingsView.demudAmount}
                                    min={HUMAN_SAFE_LIMITS.demudAmount.min}
                                    max={HUMAN_SAFE_LIMITS.demudAmount.max}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("demudAmount", value)}
                                />

                                <ControlSlider
                                    label="De-esser"
                                    value={settingsView.deEssAmount}
                                    min={HUMAN_SAFE_LIMITS.deEssAmount.min}
                                    max={HUMAN_SAFE_LIMITS.deEssAmount.max}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("deEssAmount", value)}
                                />

                                <ControlSlider
                                    label="De-ess frequency"
                                    value={settingsView.deEssFrequency}
                                    min={4000}
                                    max={11000}
                                    step={100}
                                    unit=" Hz"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("deEssFrequency", value)}
                                />

                                <ControlSlider
                                    label="Low EQ"
                                    value={settingsView.lowGain}
                                    min={HUMAN_SAFE_LIMITS.lowGain.min}
                                    max={HUMAN_SAFE_LIMITS.lowGain.max}
                                    step={0.5}
                                    unit=" dB"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("lowGain", value)}
                                />

                                <ControlSlider
                                    label="Mid EQ"
                                    value={settingsView.midGain}
                                    min={HUMAN_SAFE_LIMITS.midGain.min}
                                    max={HUMAN_SAFE_LIMITS.midGain.max}
                                    step={0.5}
                                    unit=" dB"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("midGain", value)}
                                />

                                <ControlSlider
                                    label="High EQ"
                                    value={settingsView.highGain}
                                    min={HUMAN_SAFE_LIMITS.highGain.min}
                                    max={HUMAN_SAFE_LIMITS.highGain.max}
                                    step={0.5}
                                    unit=" dB"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("highGain", value)}
                                />

                                <ControlSlider
                                    label="High-pass filter"
                                    value={settingsView.highPass}
                                    min={20}
                                    max={1000}
                                    step={5}
                                    unit=" Hz"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("highPass", value)}
                                />

                                <ControlSlider
                                    label="Low-pass filter"
                                    value={settingsView.lowPass}
                                    min={2000}
                                    max={20000}
                                    step={100}
                                    unit=" Hz"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("lowPass", value)}
                                />

                                <ControlSlider
                                    label="Speed playbackRate"
                                    value={settingsView.speed}
                                    min={HUMAN_SAFE_LIMITS.speed.min}
                                    max={HUMAN_SAFE_LIMITS.speed.max}
                                    step={0.01}
                                    unit="x"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("speed", value)}
                                />

                                <ControlSlider
                                    label="Pitch detune"
                                    value={settingsView.pitchSemitones}
                                    min={HUMAN_SAFE_LIMITS.pitchSemitones.min}
                                    max={HUMAN_SAFE_LIMITS.pitchSemitones.max}
                                    step={0.1}
                                    unit=" st"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("pitchSemitones", value)}
                                />

                                <ControlSlider
                                    label="WaveShaper distortion"
                                    value={settingsView.distortionAmount}
                                    min={HUMAN_SAFE_LIMITS.distortionAmount.min}
                                    max={HUMAN_SAFE_LIMITS.distortionAmount.max}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("distortionAmount", value)}
                                />

                                <ControlSlider
                                    label="Warm bitcrusher"
                                    value={settingsView.bitcrusherWarmth}
                                    min={HUMAN_SAFE_LIMITS.bitcrusherWarmth.min}
                                    max={HUMAN_SAFE_LIMITS.bitcrusherWarmth.max}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("bitcrusherWarmth", value)}
                                />

                                <ControlSlider
                                    label="Bitcrusher variance"
                                    value={settingsView.bitcrusherVariance}
                                    min={HUMAN_SAFE_LIMITS.bitcrusherVariance.min}
                                    max={HUMAN_SAFE_LIMITS.bitcrusherVariance.max}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) =>
                                        updateSetting("bitcrusherVariance", value)
                                    }
                                />

                                <ControlSlider
                                    label="Compressor threshold"
                                    value={settingsView.compressorThreshold}
                                    min={HUMAN_SAFE_LIMITS.compressorThreshold.min}
                                    max={HUMAN_SAFE_LIMITS.compressorThreshold.max}
                                    step={1}
                                    unit=" dB"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) =>
                                        updateSetting("compressorThreshold", value)
                                    }
                                />

                                <ControlSlider
                                    label="Compressor ratio"
                                    value={settingsView.compressorRatio}
                                    min={HUMAN_SAFE_LIMITS.compressorRatio.min}
                                    max={HUMAN_SAFE_LIMITS.compressorRatio.max}
                                    step={0.5}
                                    unit=":1"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("compressorRatio", value)}
                                />

                                <ControlSlider
                                    label="Output gain"
                                    value={settingsView.outputGain}
                                    min={HUMAN_SAFE_LIMITS.outputGain.min}
                                    max={HUMAN_SAFE_LIMITS.outputGain.max}
                                    step={0.5}
                                    unit=" dB"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("outputGain", value)}
                                />
                            </Box>

                            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                            <RenderButton
                                onClick={renderMixedFile}
                                disabled={!hasMedia || isRendering || isLoading}
                                rendering={isRendering}
                            />

                            <Button
                                variant="outlined"
                                onClick={resetMixer}
                                disabled={isRendering || isLoading}
                                sx={{
                                    borderRadius: 4,
                                    py: 1.2,
                                    color: "#fff",
                                    borderColor: "rgba(255,255,255,0.18)",
                                    fontWeight: 950,
                                }}
                            >
                                Reset mixer settings
                            </Button>

                            <Typography
                                variant="caption"
                                sx={{ color: "rgba(255,255,255,0.52)", lineHeight: 1.6 }}
                            >
                                Best support: MP3, WAV, OGG/Opus, WebM audio/video,
                                M4A, MP4, MOV, AAC, CAF, and browser-supported containers.
                                Mixer knobs are clamped to human-safe ranges: speed cannot go
                                below 0.80x, high EQ cannot exceed +6 dB, and output gain cannot
                                exceed +6 dB. iPhone files from iCloud Drive, Google Drive, Proton
                                Drive, Dropbox, and other providers may need to be downloaded
                                locally first. HLS/DASH manifests, DRM streams, and normal
                                streaming pages are not direct decodable files.
                            </Typography>

                            {mixerEnabled && (
                                <Typography
                                    variant="caption"
                                    sx={{ color: "#67e8f9", fontWeight: 800 }}
                                >
                                    Live buffer mixer active. The visualizer is reading from the
                                    processed AnalyserNode.
                                </Typography>
                            )}
                        </Stack>
                    </GlassCard>
                </Box>
            </Stack>
        </PageShell>
    );
}
