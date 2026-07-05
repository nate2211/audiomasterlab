import React, { useEffect, useRef, useState } from "react";
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

    compressorThreshold: { min: -48, max: -2 },
    compressorRatio: { min: 1, max: 8 },
    outputGain: { min: -18, max: 6 },
};

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
            compressorThreshold: -18,
            compressorRatio: 3.5,
            outputGain: -1,
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

const PLAYLIST_RECOVERY_SETTINGS = {
    fetchTimeoutMs: 24000,
    autoplayDelayMs: 140,
    retryDelaysMs: [0, 350, 900],
    decodeRetryDelaysMs: [0, 180],
    fetchCacheModes: ["no-store", "reload", "default"],
};

const SCRAPEWEBSITE_ARCHIVE_PROXY_URL = "https://scrapewebsite.pages.dev/api/archiveproxy";

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

        return {
            id: item.id || makePlaylistId(),
            kind: "file",
            title: item.title || "Saved local file",
            file: restoredFile,
            dataUrl: item.dataUrl || "",
            size: item.size || restoredFile?.size || 0,
            type: item.type || restoredFile?.type || "unknown MIME type",
            addedAt: item.addedAt || new Date().toISOString(),
            persistedDataUrl: Boolean(item.dataUrl),
            restoredFromStorage: true,
            needsReselect: !restoredFile,
            artworkUrl: getPlaylistItemArtworkSource(item),
        };
    }

    return null;
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
            artworkUrl: getPlaylistItemArtworkSource(item),
        };
    }

    if (item.kind === "file") {
        return {
            id: item.id,
            kind: "file",
            title: item.title,
            size: item.size || item.file?.size || 0,
            type: item.type || item.file?.type || "unknown MIME type",
            addedAt: item.addedAt,
            dataUrl: item.dataUrl || "",
            persistedDataUrl: Boolean(item.dataUrl),
            needsReselect: !item.dataUrl,
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
    if (!file || !item || file.size > maxBytes) {
        return {
            ...item,
            dataUrl: "",
            persistedDataUrl: false,
            needsReselect: true,
            storageNote:
                file && file.size > maxBytes
                    ? `File metadata saved, but the file is too large for localStorage (${getReadableBytes(
                        file.size
                    )}).`
                    : "File metadata saved. Re-select the file after refresh if needed.",
        };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();

        return {
            ...item,
            dataUrl: arrayBufferToDataUrl(
                arrayBuffer,
                file.type || "application/octet-stream"
            ),
            persistedDataUrl: true,
            needsReselect: false,
            storageNote: `Saved small local file in localStorage (${getReadableBytes(
                file.size
            )}).`,
        };
    } catch {
        return {
            ...item,
            dataUrl: "",
            persistedDataUrl: false,
            needsReselect: true,
            storageNote: "Could not save this local file into localStorage.",
        };
    }
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
        savedFileCount: serializable.filter((item) => item.kind === "file" && item.dataUrl)
            .length,
        placeholderFileCount: serializable.filter(
            (item) => item.kind === "file" && !item.dataUrl
        ).length,
        updatedAt: new Date().toISOString(),
    });

    return saved;
}

function clearPersistedBrowserSession() {
    Object.values(STORAGE_KEYS).forEach(removeStorageValue);
    Object.values(COOKIE_NAMES).forEach(deleteCookie);
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
            ? playlist.filter((item) => item.kind === "file" && item.dataUrl).length
            : 0,
        placeholderPlaylistFiles: Array.isArray(playlist)
            ? playlist.filter((item) => item.kind === "file" && !item.dataUrl).length
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

function getPlaylistItemArtworkSource(item) {
    if (!item || typeof item !== "object") {
        return "";
    }

    const candidates = [
        item.artworkUrl,
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

    return String(candidates.find(Boolean) || "").trim();
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
    const smoothingSeconds = nodes.carPlaySafeMode ? 0.18 : 0.045;

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

    setAudioParam(nodes.compressor.threshold, settings.compressorThreshold, currentTime, smoothingSeconds);
    setAudioParam(nodes.compressor.knee, 14, currentTime, smoothingSeconds);
    setAudioParam(nodes.compressor.ratio, settings.compressorRatio, currentTime, smoothingSeconds);
    setAudioParam(nodes.compressor.attack, 0.008, currentTime, smoothingSeconds);
    setAudioParam(nodes.compressor.release, 0.22, currentTime, smoothingSeconds);

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

        carPlaySafeMode,
    };

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
    masterGain.connect(destination);

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
    const visualizerFrameRef = useRef(null);
    const waveformDataRef = useRef(null);
    const frequencyDataRef = useRef(null);

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
    const lastPlaylistAutoStartRef = useRef({ index: -1, reason: "" });

    // Media Session / lock-screen refs keep hardware, CarPlay, Bluetooth,
    // and lock-screen controls wired to the latest React state without stale
    // closures after playlist, duration, or title changes.
    const mediaTitleRef = useRef("AudioMaster Lab player");
    const mediaDurationRef = useRef(0);
    const mediaPositionRef = useRef(0);
    const hasMediaRef = useRef(false);
    const lastMediaSessionActionRef = useRef("");
    const outputElementActionGuardRef = useRef(false);
    const lastOutputElementPlayEventAtRef = useRef(0);
    const mediaSessionPlayRestartTokenRef = useRef(0);
    const lastMediaSessionPlayRestartAtRef = useRef(0);
    const mediaSessionActionQueueRef = useRef(Promise.resolve());
    const mediaSessionActionSerialRef = useRef(0);
    const iPhoneLockScreenOutputArmedRef = useRef(false);
    const lastIPhoneOutputKeepAliveAtRef = useRef(0);
    const iPhoneOutputHeldForLockScreenRestartRef = useRef(false);

    const [sourceUrl, setSourceUrl] = useState("");
    const [sourceKind, setSourceKind] = useState("");
    const [inputFile, setInputFile] = useState(null);
    const [directLink, setDirectLink] = useState(() => readPersistedDirectLink());
    const [playlistLink, setPlaylistLink] = useState(() => readPersistedPlaylistLinkDraft());
    const [settings, setSettings] = useState(() => readPersistedSettings());
    const [status, setStatus] = useState(
        "Upload MP3, WAV, OGG, WebM, M4A, MP4, MOV, or choose a file from iPhone Files, On My iPhone, iCloud Drive, Google Drive, Proton Drive, Dropbox, or another Files provider."
    );
    const [statusTone, setStatusTone] = useState("info");
    const [mixerEnabled, setMixerEnabled] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPreloadingPlaylist, setIsPreloadingPlaylist] = useState(false);
    const [playlistPreloadSummary, setPlaylistPreloadSummary] = useState("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [bufferReady, setBufferReady] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [mediaInfo, setMediaInfo] = useState("");
    const [playlist, setPlaylist] = useState(() => readPersistedPlaylist());
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

    const settingsView = normalizeSettings(settings);
    const hasMedia = bufferReady && Boolean(audioBufferRef.current);
    const activePlaylistItem =
        activePlaylistIndex >= 0 ? playlist[activePlaylistIndex] : null;
    const mediaTitle = getMediaDisplayTitle(
        inputFile,
        sourceKind,
        sourceUrl,
        activePlaylistItem?.title
    );

    mediaTitleRef.current = mediaTitle;
    mediaDurationRef.current = Number.isFinite(duration) ? duration : 0;
    mediaPositionRef.current = Number.isFinite(position) ? position : 0;
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
        setCarPlayOutputStatus(buildCarPlaySafeModeLabel(carPlaySafeMode));

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
            clearMediaSession();

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
    }, [mediaTitle, duration, activePlaylistIndex, playlist.length]);

    useEffect(() => {
        updateMediaSessionState(isPlaying ? "playing" : "paused");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, position, duration]);

    useEffect(() => {
        if (!isIOSAudioDevice()) {
            return undefined;
        }

        const recoverFromPageEvent = (event) => {
            if (
                event?.type === "visibilitychange" &&
                typeof document !== "undefined" &&
                document.visibilityState !== "visible"
            ) {
                updateMediaSessionState(playingRef.current ? "playing" : "paused");
                return;
            }

            scheduleCarPlayOutputRecovery(`iOS page/audio route event: ${event?.type || "resume"}`);
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
            if (outputElementActionGuardRef.current) {
                updateMediaSessionState(playingRef.current ? "playing" : "paused");
                return;
            }

            const now = Date.now();

            if (now - lastOutputElementPlayEventAtRef.current < 350) {
                return;
            }

            lastOutputElementPlayEventAtRef.current = now;
            iPhoneOutputHeldForLockScreenRestartRef.current = false;
            runMediaSessionAction("iOS lock-screen Play", playFromMediaSession);
        };

        const handleOutputPause = () => {
            if (outputElementActionGuardRef.current) {
                updateMediaSessionState(playingRef.current ? "playing" : "paused");
                return;
            }

            if (playingRef.current) {
                iPhoneLockScreenOutputArmedRef.current = false;
                runMediaSessionAction("iOS lock-screen Pause", pauseFromMediaSession);
                return;
            }

            keepIPhoneOutputElementAliveForLockScreen(
                iPhoneOutputHeldForLockScreenRestartRef.current
                    ? "iOS tried to pause the hidden output after lock-screen Stop; re-arming it for restart"
                    : "iOS paused the hidden output element while WebAudio was paused"
            ).catch(() => {
                iPhoneLockScreenOutputArmedRef.current = false;
            });
            updateMediaSessionState("paused");
        };

        const recoverEvents = ["stalled", "suspend", "waiting", "emptied", "abort", "error"];
        const handleRecoverableOutputEvent = (event) => {
            if (!playingRef.current && event.type !== "error") {
                return;
            }

            scheduleCarPlayOutputRecovery(`hidden iOS output element ${event.type}`);
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
        playingRef.current = nextValue;
        setIsPlaying(nextValue);
    }

    function setInfo(message) {
        setStatus(message);
        setStatusTone("info");
    }

    function setError(message) {
        setStatus(message);
        setStatusTone("error");
    }

    function clearCarPlayRecoveryTimer() {
        if (carPlayRecoveryTimerRef.current) {
            window.clearTimeout(carPlayRecoveryTimerRef.current);
            carPlayRecoveryTimerRef.current = null;
        }
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
        const liveOffset = getCurrentOffset();
        const refPosition = Number(mediaPositionRef.current);
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

    function updateMediaSessionMetadata() {
        if (!canUseMediaSession()) {
            return;
        }

        try {
            if (typeof window === "undefined" || typeof window.MediaMetadata !== "function") {
                return;
            }

            const title = getMediaSessionTitle();
            const activeItem = playlistRef.current?.[activePlaylistIndexRef.current];

            navigator.mediaSession.metadata = new window.MediaMetadata({
                title,
                artist: "AudioMaster Lab",
                album: getMediaSessionAlbum(),
                artwork: getMediaSessionArtwork(title, activeItem),
            });
        } catch {
            // MediaMetadata is not available in every Safari/WebView version.
        }
    }

    function updateMediaSessionState(nextState = "none") {
        if (!canUseMediaSession()) {
            return;
        }

        const safeState = hasMediaSessionTarget() ? nextState : "none";

        try {
            navigator.mediaSession.playbackState = safeState;
        } catch {
            // playbackState is not supported in every browser.
        }

        try {
            // Keep lock-screen controls as transport controls only. Publishing
            // Media Session position state can make some mobile lock screens
            // show previous/next 10-second seek buttons instead of real
            // previous-track / next-track buttons.
            if (typeof navigator.mediaSession.setPositionState === "function") {
                navigator.mediaSession.setPositionState();
            }
        } catch {
            // Position state clearing is best-effort only.
        }
    }

    function clearMediaSession() {
        if (!canUseMediaSession()) {
            return;
        }

        try {
            navigator.mediaSession.playbackState = "none";
            navigator.mediaSession.metadata = null;
        } catch {
            // Safe to ignore.
        }
    }

    async function unlockOutputElementForAppAction(element = outputAudioRef.current) {
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

    async function keepIPhoneOutputElementAliveForLockScreen(reason = "iPhone lock-screen output keep-alive") {
        if (!isIOSAudioDevice()) {
            return true;
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
                setCarPlayOutputStatus(
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

    function forceRestoreAudibleWebAudioOutput(context = audioContextRef.current, nodes = liveNodesRef.current) {
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

            element.muted = false;
            element.defaultMuted = false;
            element.volume = 1;
            element.playsInline = true;
            element.autoplay = true;
            element.preload = "auto";
            element.controls = false;
            element.setAttribute("playsinline", "");
            element.setAttribute("webkit-playsinline", "");
            element.removeAttribute("muted");

            forceRestoreAudibleWebAudioOutput(audioContextRef.current, liveNodesRef.current);

            return true;
        } catch {
            return false;
        }
    }

    async function restartIPhoneOutputStreamForLockScreenPlay(reason = "Lock-screen Play") {
        if (!isIOSAudioDevice()) {
            return true;
        }

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
                setCarPlayOutputStatus(
                    `${reason} re-armed the hidden iPhone media stream and Media Session can restart the WebAudio source from the saved position.`
                );
                return true;
            }
        }

        iPhoneLockScreenOutputArmedRef.current = false;
        throw new Error(
            "The hidden iPhone audio element is no longer active. iOS removed the page from its lock-screen audio route. Open the page once and press Play to re-arm it, then lock the phone again."
        );
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

            forceRestoreAudibleWebAudioOutput(context, liveNodesRef.current);

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
                    updateMediaSessionState(playingRef.current ? "playing" : "paused");
                }

                return result;
            } catch (error) {
                if (mediaSessionActionSerialRef.current === serial) {
                    updateMediaSessionState(playingRef.current ? "playing" : "paused");
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
            const { context, nodes } = ensureLiveGraph();
            forceRestoreAudibleWebAudioOutput(context, nodes);
            outputAlreadyRestarted = await restartIPhoneOutputStreamForLockScreenPlay(
                "Lock-screen Play"
            );
            forceRestoreAudibleWebAudioOutput(context, nodes);
        }

        if (playingRef.current && activeSourceRef.current) {
            forceRestoreAudibleWebAudioOutput(audioContextRef.current, liveNodesRef.current);
            updateMediaSessionState("playing");
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
        updateMediaSessionState("paused");
        return false;
    }

    async function pauseFromMediaSession() {
        if (playingRef.current) {
            pausePlayback();

            if (isIOSAudioDevice()) {
                await keepIPhoneOutputElementAliveForLockScreen(
                    "Lock-screen Pause stopped the WebAudio source but kept the hidden iPhone stream alive for Play"
                );
            }

            forceRestoreAudibleWebAudioOutput(audioContextRef.current, liveNodesRef.current);
            return true;
        }

        if (isIOSAudioDevice()) {
            await keepIPhoneOutputElementAliveForLockScreen(
                "Lock-screen Pause kept the hidden iPhone stream alive so Play can restart with volume"
            );
            forceRestoreAudibleWebAudioOutput(audioContextRef.current, liveNodesRef.current);
        }

        updateMediaSessionState("paused");
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
                "Lock-screen Stop reset the song but kept the iPhone lock-screen audio route alive for restart"
            );
            forceRestoreAudibleWebAudioOutput(audioContextRef.current, liveNodesRef.current);

            iPhoneOutputHeldForLockScreenRestartRef.current = held;
            iPhoneLockScreenOutputArmedRef.current = held;
            updateMediaSessionState("paused");
            setInfo(
                held
                    ? "Lock-screen Stop reset WebAudio to the beginning, restored the hidden output volume path, and kept the iPhone stream alive silently so lock-screen Play can restart without unlocking the phone."
                    : "Lock-screen Stop reset WebAudio to the beginning. iOS did not keep the hidden output route alive, so open the page once and press Play if lock-screen Play cannot restart."
            );
            return true;
        }

        updateMediaSessionState("paused");
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

        // Clear all seek-style handlers first. When seekbackward/seekforward
        // are installed, iPhone/Android lock screens commonly show
        // "previous 10 seconds" and "next 10 seconds" instead of real
        // previous-track / next-track transport controls.
        ["seekbackward", "seekforward", "seekto"].forEach(safeClearAction);

        if (isIOSAudioDevice() && typeof navigator.mediaSession.setPositionState === "function") {
            try {
                // Clearing position state helps iOS choose transport controls
                // instead of seek controls on the lock screen.
                navigator.mediaSession.setPositionState();
            } catch {
                // Position state clearing is best-effort only.
            }
        }

        safeSetAction("play", () => {
            return runMediaSessionAction("Lock-screen Play", playFromMediaSession);
        });

        safeSetAction("pause", () => {
            return runMediaSessionAction("Lock-screen Pause", pauseFromMediaSession);
        });

        safeSetAction("stop", () => {
            return runMediaSessionAction("Lock-screen Stop", stopFromMediaSession);
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

        clearCarPlayRecoveryTimer();
        lastCarPlayRecoveryReasonRef.current = reason || "iOS audio route recovery";

        if (carPlaySafeModeRef.current) {
            setCarPlayOutputStatus(
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
                    reason || "iOS audio route recovery"
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

            setCarPlayOutputStatus(
                carPlaySafeModeRef.current
                    ? `CarPlay / USB safe mode recovered the iOS output route${
                        reason ? ` after ${reason}` : ""
                    }.`
                    : buildCarPlaySafeModeLabel(false)
            );

            return true;
        } catch (error) {
            setCarPlayOutputStatus(
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
        setInfo("Saved audio/session data cleared from localStorage and cookies. Current in-memory playback remains until you clear media or refresh.");
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
            oscillator.frequency.value = 18;
            gain.gain.value = 0.0000001;

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

    function drawVisualizers() {
        const analyser = analyserRef.current;

        if (!analyser || !playingRef.current) {
            visualizerFrameRef.current = null;
            return;
        }

        drawWaveform(analyser);
        drawFrequencyBars(analyser);

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

    function getCurrentOffset() {
        const context = audioContextRef.current;
        const buffer = audioBufferRef.current;

        if (!buffer) {
            return 0;
        }

        if (!context || !playingRef.current) {
            return clamp(startedOffsetRef.current, 0, buffer.duration);
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

            setPosition(nextOffset);

            if (nextOffset >= buffer.duration) {
                startedOffsetRef.current = 0;
                startedAtContextTimeRef.current = 0;
                setPosition(0);
                setPlayingState(false);
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

        updateMediaSessionState("paused");
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

        setBufferReady(true);
        setPosition(0);
        setDuration(decodedBuffer.duration);
        setMixerEnabled(false);
        setMediaInfo(
            `${byteDescription} • ${decodedBuffer.numberOfChannels} channel(s) • ${decodedBuffer.sampleRate} Hz • ${formatTime(decodedBuffer.duration)}`
        );

        updateMediaSessionMetadata();
        updateMediaSessionState(playingRef.current ? "playing" : "paused");

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

            setPlaylist((current) => [...current, ...nextItems]);

            const savedCount = nextItems.filter((item) => item.persistedDataUrl).length;
            const placeholderCount = nextItems.length - savedCount;

            setInfo(
                `Added ${nextItems.length} file(s) to the playlist${
                    skippedCount ? ` and skipped ${skippedCount} unsupported file(s)` : ""
                }. ${savedCount} small file(s) were saved in localStorage. ${placeholderCount} larger file(s) were remembered as metadata placeholders.`
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

                setPlaylist((current) => [...current, nextItem]);

                setInfo(
                    `Added the currently loaded file "${inputFile.name}" to the playlist. ${
                        nextItem.persistedDataUrl
                            ? "It was saved in localStorage for refresh restore."
                            : "It was saved as a remembered placeholder because it is too large for localStorage."
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

        if (!playlistFile && item.dataUrl) {
            playlistFile = dataUrlToFile(
                item.dataUrl,
                item.title || "saved-playlist-audio",
                item.type || "audio/mpeg"
            );
        }

        if (!playlistFile) {
            throw new Error(
                "The actual local file is not available in memory. Re-select it from your device, or keep local playlist files under the localStorage save limit."
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
                }, PLAYLIST_RECOVERY_SETTINGS.autoplayDelayMs);
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
                    "The actual local file is not available in memory. Re-select it from your device, or keep local playlist files under the localStorage save limit."
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
                item.persistedDataUrl || item.dataUrl
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

    function removePlaylistItem(id) {
        const currentIndex = activePlaylistIndexRef.current;

        if (id) {
            playlistPreloadCacheRef.current.delete(String(id));
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
        if (playingRef.current && activePlaylistIndexRef.current >= 0) {
            pausePlayback();
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

        setPosition(0);
        setPlayingState(false);
        updateMediaSessionState("paused");
        stopPositionTimer();
        stopVisualizer();

        if (repeatEnabledRef.current) {
            setInfo("Repeat is on. Restarting the current song.");
            window.setTimeout(() => {
                startBufferPlayback(true, {
                    fromPlaybackEnded: true,
                    preserveUnlockedOutput: true,
                }).then((started) => {
                    if (!started) {
                        setError("Repeat restart failed. Tap Start playlist to recover playback.");
                    }
                });
            }, PLAYLIST_RECOVERY_SETTINGS.autoplayDelayMs);
            return;
        }

        const list = playlistRef.current;
        const currentIndex = activePlaylistIndexRef.current;

        if (list.length > 0) {
            const nextIndex = getNextPlaylistIndex(currentIndex, list);

            await loadNextPlayablePlaylistItem(nextIndex, {
                autoplay: true,
                fromPlaybackEnded: true,
                preserveUnlockedOutput: true,
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

            monitorMuteGain.connect(mediaStreamDestination);

            mediaStreamDestinationRef.current = mediaStreamDestination;

            attachOutputElementToCurrentStream(
                outputAudioRef.current,
                mediaStreamDestination.stream
            );

            ensureIPhoneSilentKeepAlive(context, mediaStreamDestination);

            if (carPlaySafeModeRef.current) {
                setCarPlayOutputStatus(
                    "CarPlay / USB safe output path is armed with a persistent hidden iOS media element."
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
            forceRestoreAudibleWebAudioOutput(context, nodes);
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

                if (!elementUnlocked || !isIPhoneOutputRouteArmed()) {
                    iPhoneLockScreenOutputArmedRef.current = false;
                    throw new Error(
                        `The iPhone audio output route is not armed, so the WebAudio source was not started silently. ${buildMobileAudioHint()}`
                    );
                }

                iPhoneLockScreenOutputArmedRef.current = true;
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
            currentEffectiveRateRef.current = getEffectivePlaybackRate(
                latestSettingsRef.current
            );

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
            forceRestoreAudibleWebAudioOutput(context, nodes);

            if (isIOSAudioDevice()) {
                const outputConfirmed = await confirmIPhoneOutputAfterSourceStart(context, {
                    fromMediaSession: Boolean(options.fromMediaSession),
                    outputAlreadyRestarted: Boolean(options.outputAlreadyRestarted),
                    forceIPhoneOutputPostStart: Boolean(options.forceIPhoneOutputPostStart),
                });

                if (!outputConfirmed) {
                    stopActiveSource();
                    setPlayingState(false);
                    updateMediaSessionState("paused");
                    throw new Error(
                        `The iPhone Media Session duration advanced, but the audible output route was not playing. ${buildMobileAudioHint()}`
                    );
                }
            }

            setMixerEnabled(true);
            setPlayingState(true);
            updateMediaSessionMetadata();
            updateMediaSessionState("playing");
            startPositionTimer();
            startVisualizer();

            if (isIOSAudioDevice() && carPlaySafeModeRef.current) {
                setCarPlayOutputStatus(
                    "CarPlay / USB safe mode is active: one persistent iOS output route, smoothed effect changes, centered pan, capped wet effects, and Media Session controls are armed."
                );
            }

            setInfo(
                isIOSAudioDevice()
                    ? `${repeatEnabledRef.current ? "Repeat is on. " : "Repeat is off. Auto-next is armed. "}${
                        carPlaySafeModeRef.current
                            ? "CarPlay / USB safe mode is active. "
                            : ""
                    }Playing through the hidden iPhone media element output path. Pause keeps a near-silent stream alive; lock-screen Stop resets WebAudio but keeps that hidden route armed, and lock-screen Play confirms the route again after starting the audible source.`
                    : `${repeatEnabledRef.current ? "Repeat is on. " : "Repeat is off. Auto-next is armed. "}Playing through full WebAudio graph with visualizer, panning, delay, and convolution reverb.`
            );

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

    function pausePlayback() {
        if (!playingRef.current) return;

        const nextOffset = getCurrentOffset();

        manualStopRef.current = true;
        stopActiveSource();

        startedOffsetRef.current = nextOffset;
        startedAtContextTimeRef.current = 0;

        setPosition(nextOffset);
        setPlayingState(false);
        updateMediaSessionState("paused");
        stopPositionTimer();
        stopVisualizer();
        pauseOutputElementForAppAction({
            keepAlive: true,
            reason: "Paused WebAudio while keeping iPhone lock-screen output armed",
        });
        forceRestoreAudibleWebAudioOutput(audioContextRef.current, liveNodesRef.current);

        setInfo("Playback paused. Press Play to create a new WebAudio source from this position with the output volume path restored.");
    }

    async function handlePlayPause() {
        if (playingRef.current) {
            pausePlayback();
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

        if (!buffer) return;

        const nextOffset = clamp(numberOrDefault(seconds, 0), 0, buffer.duration);

        manualStopRef.current = true;
        stopActiveSource();
        stopPositionTimer();
        stopVisualizer();

        startedOffsetRef.current = nextOffset;
        startedAtContextTimeRef.current = 0;

        setPosition(nextOffset);
        setPlayingState(false);

        if (shouldResume && nextOffset < buffer.duration) {
            await startBufferPlayback(false, {
                fromMediaSession: Boolean(options.fromMediaSession),
                preserveUnlockedOutput: Boolean(options.preserveUnlockedOutput),
                outputAlreadyRestarted: Boolean(options.outputAlreadyRestarted),
                forceIPhoneOutputPostStart: Boolean(options.forceIPhoneOutputPostStart),
            });
            setInfo(`Scrubbed to ${formatTime(nextOffset)} and resumed playback.`);
        } else {
            setInfo(`Scrubbed to ${formatTime(nextOffset)}.`);
        }
    }

    function handleScrubStart() {
        if (!hasMedia || isRendering || isLoading) return;

        const currentOffset = getCurrentOffset();

        wasPlayingBeforeScrubRef.current = playingRef.current;
        scrubbingRef.current = true;

        manualStopRef.current = true;
        stopActiveSource();
        stopPositionTimer();
        stopVisualizer();

        startedOffsetRef.current = currentOffset;
        startedAtContextTimeRef.current = 0;

        setPosition(currentOffset);
        setPlayingState(false);
        setIsScrubbing(true);
    }

    function handleScrubChange(_, nextValue) {
        const buffer = audioBufferRef.current;

        if (!buffer) return;

        const cleanValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
        const nextOffset = clamp(numberOrDefault(cleanValue, 0), 0, buffer.duration);

        scrubbingRef.current = true;
        setIsScrubbing(true);
        setPosition(nextOffset);
    }

    async function handleScrubCommit(_, nextValue) {
        const buffer = audioBufferRef.current;

        if (!buffer) return;

        const shouldResume = wasPlayingBeforeScrubRef.current;
        const cleanValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
        const nextOffset = clamp(numberOrDefault(cleanValue, 0), 0, buffer.duration);

        scrubbingRef.current = false;
        wasPlayingBeforeScrubRef.current = false;

        setIsScrubbing(false);

        await seekTo(nextOffset, shouldResume);
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

                setPosition(currentOffset);
            } else if (isSourceRateControl) {
                currentEffectiveRateRef.current =
                    getEffectivePlaybackRate(nextSettings);
            }

            if (liveNodesRef.current && audioContextRef.current) {
                applySettingsToNodes(
                    liveNodesRef.current,
                    nextSettings,
                    audioContextRef.current.currentTime
                );
            }

            return nextSettings;
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

            setPosition(currentOffset);
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

            setPosition(currentOffset);
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
                                    ClarityChain, Demudder, De-Esser, EQ, delay, reverb, panning,
                                    compression, and gain.
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
                                        isPlaying && activePlaylistIndex >= 0 ? (
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
                                    {isPlaying && activePlaylistIndex >= 0
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

                                        <Typography
                                            sx={{
                                                color: "#fff",
                                                fontWeight: 900,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                            title={activePlaylistItem.title}
                                        >
                                            {activePlaylistIndex + 1}. {activePlaylistItem.title}
                                        </Typography>
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

                                            return (
                                                <Box
                                                    key={item.id}
                                                    sx={{
                                                        display: "grid",
                                                        gridTemplateColumns: "minmax(0, 1fr) auto auto",
                                                        gap: 1,
                                                        alignItems: "center",
                                                        borderRadius: 3,
                                                        p: 1.25,
                                                        background: active
                                                            ? "rgba(103,232,249,0.14)"
                                                            : "rgba(255,255,255,0.06)",
                                                        border: active
                                                            ? "1px solid rgba(103,232,249,0.3)"
                                                            : "1px solid rgba(255,255,255,0.08)",
                                                    }}
                                                >
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
                                                        }}
                                                    >
                                                        <DeleteRoundedIcon fontSize="small" />
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
                                                        <Box
                                                            sx={{
                                                                width: 38,
                                                                height: 38,
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
                                                            <AudioFileRoundedIcon sx={{ fontSize: 22 }} />
                                                        </Box>

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
                                                onMouseDown={handleScrubStart}
                                                onTouchStart={handleScrubStart}
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
                                            isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />
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
                                        {isPlaying ? "Pause playback" : "Play processed audio"}
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
                                                <Button
                                                    key={preset.key}
                                                    role="listitem"
                                                    type="button"
                                                    variant={selected ? "contained" : "outlined"}
                                                    aria-pressed={selected}
                                                    onClick={() => applyMixerPreset(preset.key)}
                                                    disabled={isRendering || isLoading}
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