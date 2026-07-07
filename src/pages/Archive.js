// src/pages/ArchiveAudioBrowser.js

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    CircularProgress,
    Divider,
    FormControlLabel,
    Grid,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AudiotrackRoundedIcon from "@mui/icons-material/AudiotrackRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import PlaylistAddRoundedIcon from "@mui/icons-material/PlaylistAddRounded";
import {Helmet} from "react-helmet-async";
const AUDIO_EXTENSIONS = [
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

const IMAGE_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
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

const BLOCKED_TERMS = [

];

const SAFE_COLLECTION_OPTIONS = [
    {
        id: "opensource_audio",
        label: "Open Source Audio",
        description: "User-shared audio and Creative Commons-style uploads.",
    },
    {
        id: "etree",
        label: "Etree Live Music",
        description: "Live recordings from artists that allow taping/sharing.",
    },
    {
        id: "oldtimeradio",
        label: "Old Time Radio",
        description: "Classic radio shows and historic radio recordings.",
    },
    {
        id: "librivoxaudio",
        label: "LibriVox",
        description: "Public-domain audiobook recordings.",
    },
    {
        id: "audio_bookspoetry",
        label: "Books & Poetry",
        description: "Readings, poetry, and spoken-word collections.",
    },
    {
        id: "podcasts",
        label: "Podcasts",
        description: "Podcast audio hosted on Archive.org.",
    },
    {
        id: "folksoundomy",
        label: "Folksonomy Audio",
        description: "Tagged audio collections with broad public discovery.",
    },

    // Music-heavy Archive.org collections
    {
        id: "audio_music",
        label: "Music, Arts & Culture",
        description: "Broad Archive music and arts audio. Use with license filtering because rights can vary.",
    },
    {
        id: "netlabels",
        label: "Netlabels",
        description: "Independent netlabel releases, often Creative Commons or free-to-share music.",
    },
    {
        id: "freemusicarchive",
        label: "Free Music Archive",
        description: "Music imported from Free Music Archive, including many Creative Commons-style releases.",
    },
    {
        id: "78rpm",
        label: "78 RPMs & Cylinder Recordings",
        description: "Historic shellac/cylinder recordings for preservation and research.",
    },
    {
        id: "georgeblood",
        label: "Great 78 Project",
        description: "Large historic 78 RPM preservation collection for old music discovery and research.",
    },
    {
        id: "GratefulDead",
        label: "Grateful Dead",
        description: "Live Grateful Dead recordings from Archive’s live music archive.",
    },
    {
        id: "ektoplazm",
        label: "Ektoplazm",
        description: "Electronic, psytrance, ambient, downtempo, and experimental free music releases.",
    },
    {
        id: "monotonik",
        label: "Monotonik",
        description: "Classic netlabel collection with electronic, IDM, ambient, and tracker-era releases.",
    },
    {
        id: "kahvi",
        label: "Kahvi Collective",
        description: "Electronic, ambient, IDM, chill, and melodic netlabel music.",
    },
    {
        id: "petitejolie",
        label: "Petite&Jolie",
        description: "Netlabel music with electronic, cute-pop, toytronica, and experimental releases.",
    },
    {
        id: "blocsonic",
        label: "BlocSonic",
        description: "Independent music label releases including hip-hop, electronic, and alternative projects.",
    },
    {
        id: "comfortstand",
        label: "Comfort Stand",
        description: "Eclectic netlabel releases, experimental music, compilations, and independent audio.",
    },
    {
        id: "camomille",
        label: "Camomille Music",
        description: "Ambient, electronic, acoustic, and experimental netlabel music.",
    },
    {
        id: "thinner",
        label: "Thinner",
        description: "Minimal techno, dub techno, ambient, and electronic netlabel releases.",
    },
    {
        id: "aerotone",
        label: "Aerotone",
        description: "Indie, folk, acoustic, ambient, and soft electronic netlabel music.",
    },
    {
        id: "testtube",
        label: "Test Tube",
        description: "Experimental, electronic, ambient, and independent netlabel releases.",
    },
    {
        id: "proc-records",
        label: "Proc-Records",
        description: "Independent netlabel music, experimental releases, and underground electronic audio.",
    },
    {
        id: "bumpfoot",
        label: "Bump Foot",
        description: "Japanese netlabel with electronic, techno, ambient, house, and experimental music.",
    },
    {
        id: "clinicalarchives",
        label: "Clinical Archives",
        description: "Avant-garde, jazz, experimental, electronic, and independent music releases.",
    },
    {
        id: "miasmah",
        label: "Miasmah",
        description: "Ambient, experimental, modern classical, and atmospheric music releases.",
    },
    {
        id: "basic_sounds",
        label: "Basic Sounds",
        description: "Electronic, ambient, minimal, and independent music releases.",
    },
    {
        id: "phlow",
        label: "Phlow",
        description: "Creative Commons music, netaudio, electronic, indie, and music culture releases.",
    },

    // Radio, broadcast, and mixed audio collections
    {
        id: "audio_tech",
        label: "Computers, Technology & Science",
        description: "Tech talks, science audio, radio/technical recordings, and educational audio.",
    },
    {
        id: "audio_news",
        label: "News & Public Affairs",
        description: "Historic news, speeches, interviews, and documentary-style audio.",
    },
    {
        id: "radio",
        label: "Radio News Archive",
        description: "Historic radio news recordings and broadcast archives.",
    },
    {
        id: "radioprograms",
        label: "Radio Programs",
        description: "Radio shows, airchecks, public broadcasts, and archived radio programs.",
    },
    {
        id: "fmradioarchive",
        label: "FM Radio Archive",
        description: "FM/TV station broadcasts, live radio recordings, concerts, and airchecks.",
    },
    {
        id: "dlarc",
        label: "Amateur Radio & Communications",
        description: "Ham radio, radio history, communications podcasts, broadcasts, and related media.",
    },

    // Spoken word / educational / cultural audio
    {
        id: "audio_religion",
        label: "Spirituality & Religion",
        description: "Religious, spiritual, lecture, sermon, and philosophy audio.",
    },
    {
        id: "audio_foreign",
        label: "Non-English Audio",
        description: "Audio uploads in languages other than English.",
    },
];

const DEFAULT_SELECTED_COLLECTIONS = ["opensource_audio"];

const AUDIO_PLAYLIST_STORAGE_KEY = "audiomasterlab.audio.playlist.v4";
const SCRAPEWEBSITE_ARCHIVE_PROXY_URL = "https://scrapewebsite.pages.dev/api/archiveproxy";
const ARCHIVE_PROXY_STORAGE_KEY = "audiomasterlab.archive.useProxy.v1";
const ARCHIVE_BROWSER_STORAGE_KEY = "audiomasterlab.archive.browser.session.v2";
const ARCHIVE_BROWSER_MAX_SAVED_RESULTS = 120;

function makeArchivePlaylistId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readAudioPlaylistFromStorage() {
    if (typeof window === "undefined" || !window.localStorage) return [];

    try {
        const raw = window.localStorage.getItem(AUDIO_PLAYLIST_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeAudioPlaylistToStorage(playlist) {
    if (typeof window === "undefined" || !window.localStorage) return false;

    try {
        window.localStorage.setItem(
            AUDIO_PLAYLIST_STORAGE_KEY,
            JSON.stringify(playlist)
        );
        return true;
    } catch {
        return false;
    }
}

function readArchiveProxySetting() {
    if (typeof window === "undefined" || !window.localStorage) return false;

    try {
        return window.localStorage.getItem(ARCHIVE_PROXY_STORAGE_KEY) === "true";
    } catch {
        return false;
    }
}

function writeArchiveProxySetting(value) {
    if (typeof window === "undefined" || !window.localStorage) return false;

    try {
        window.localStorage.setItem(
            ARCHIVE_PROXY_STORAGE_KEY,
            value ? "true" : "false"
        );
        return true;
    } catch {
        return false;
    }
}

function getDefaultArchiveBrowserSession() {
    const useArchiveProxy = readArchiveProxySetting();

    return {
        query: "old radio",
        selectedCollections: DEFAULT_SELECTED_COLLECTIONS,
        allowZipInternalPaths: false,
        useArchiveProxy,
        results: [],
        nextCursor: "",
        status: "",
        error: "",
        loading: false,
        lastSearchSignature: "",
        lastSubmittedSearch: {
            query: "",
            selectedCollections: DEFAULT_SELECTED_COLLECTIONS,
            allowZipInternalPaths: false,
            useArchiveProxy,
            cursor: "",
            signature: "",
        },
        activeSearch: null,
        savedAt: "",
    };
}

function sanitizeSavedArchiveBrowserSession(value) {
    const fallback = getDefaultArchiveBrowserSession();
    const parsed = value && typeof value === "object" ? value : {};
    const selectedCollections = Array.isArray(parsed.selectedCollections)
        ? parsed.selectedCollections.filter(Boolean)
        : fallback.selectedCollections;
    const lastSubmittedSearch =
        parsed.lastSubmittedSearch && typeof parsed.lastSubmittedSearch === "object"
            ? parsed.lastSubmittedSearch
            : fallback.lastSubmittedSearch;

    return {
        ...fallback,
        query: String(parsed.query || fallback.query),
        selectedCollections: selectedCollections.length
            ? selectedCollections
            : fallback.selectedCollections,
        allowZipInternalPaths: Boolean(parsed.allowZipInternalPaths),
        useArchiveProxy: Boolean(parsed.useArchiveProxy),
        results: dedupeArchiveResults(
            Array.isArray(parsed.results) ? parsed.results : []
        ).slice(0, ARCHIVE_BROWSER_MAX_SAVED_RESULTS),
        nextCursor: String(parsed.nextCursor || ""),
        status: String(parsed.status || ""),
        error: String(parsed.error || ""),
        loading: Boolean(parsed.loading),
        lastSearchSignature: String(parsed.lastSearchSignature || ""),
        lastSubmittedSearch: {
            query: String(lastSubmittedSearch.query || ""),
            selectedCollections: Array.isArray(lastSubmittedSearch.selectedCollections)
                ? lastSubmittedSearch.selectedCollections.filter(Boolean)
                : fallback.selectedCollections,
            allowZipInternalPaths: Boolean(lastSubmittedSearch.allowZipInternalPaths),
            useArchiveProxy: Boolean(lastSubmittedSearch.useArchiveProxy),
            cursor: String(lastSubmittedSearch.cursor || ""),
            signature: String(lastSubmittedSearch.signature || ""),
        },
        activeSearch:
            parsed.activeSearch && typeof parsed.activeSearch === "object"
                ? {
                    isLoadMore: Boolean(parsed.activeSearch.isLoadMore),
                    keepExistingResults: Boolean(
                        parsed.activeSearch.keepExistingResults
                    ),
                    safeQuery: String(parsed.activeSearch.safeQuery || ""),
                    routeLabel: String(parsed.activeSearch.routeLabel || ""),
                    startedAt: String(parsed.activeSearch.startedAt || ""),
                }
                : null,
        savedAt: String(parsed.savedAt || ""),
    };
}

function readArchiveBrowserSession() {
    if (typeof window === "undefined" || !window.localStorage) {
        return getDefaultArchiveBrowserSession();
    }

    try {
        const raw = window.localStorage.getItem(ARCHIVE_BROWSER_STORAGE_KEY);

        return sanitizeSavedArchiveBrowserSession(raw ? JSON.parse(raw) : {});
    } catch {
        return getDefaultArchiveBrowserSession();
    }
}

function writeArchiveBrowserSession(session) {
    if (typeof window === "undefined" || !window.localStorage) return false;

    try {
        const safeSession = sanitizeSavedArchiveBrowserSession({
            ...session,
            savedAt: new Date().toISOString(),
        });

        window.localStorage.setItem(
            ARCHIVE_BROWSER_STORAGE_KEY,
            JSON.stringify(safeSession)
        );
        return true;
    } catch {
        return false;
    }
}

function clearArchiveBrowserSession() {
    if (typeof window === "undefined" || !window.localStorage) return false;

    try {
        window.localStorage.removeItem(ARCHIVE_BROWSER_STORAGE_KEY);
        return true;
    } catch {
        return false;
    }
}

function shouldUseArchiveProxyForUrl(url, useArchiveProxy) {
    if (!useArchiveProxy) return false;

    try {
        const parsedUrl = new URL(url);

        return parsedUrl.protocol === "https:" && isArchiveHost(parsedUrl.hostname);
    } catch {
        return false;
    }
}

function buildArchiveProxyUrl(url, useArchiveProxy) {
    if (!shouldUseArchiveProxyForUrl(url, useArchiveProxy)) {
        return url;
    }

    return `${SCRAPEWEBSITE_ARCHIVE_PROXY_URL}?url=${encodeURIComponent(url)}`;
}

function getArchiveAudioPlaylistTitle(file) {
    const name = file?.name || "";

    if (name) return name;

    const url = file?.serveUrl || file?.url || file?.downloadUrl || "";

    try {
        const parsed = new URL(url);
        const lastPart = parsed.pathname.split("/").filter(Boolean).pop();

        return decodeURIComponent(lastPart || "Archive audio");
    } catch {
        return "Archive audio";
    }
}
function normalizeText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function hasBlockedTerm(value) {
    const lower = String(value || "").toLowerCase();

    return BLOCKED_TERMS.some((term) => lower.includes(term));
}

function sanitizeArchiveQuery(value) {
    return normalizeText(value)
        .replace(/[^\w\s'"@:./-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);
}

function cleanArchiveRequestText(value) {
    return normalizeText(getArchiveSearchTextFromInput(value))
        .replace(/https?:\/\/\S+/gi, " ")
        .replace(/\b(?:AND|OR|NOT)\b/gi, " ")
        .replace(/\b(?:mediatype|collection|title|creator|subject|description|identifier|date|licenseurl):\s*"[^"]*"/gi, " ")
        .replace(/\b(?:mediatype|collection|title|creator|subject|description|identifier|date|licenseurl):[^\s)]+/gi, " ")
        .replace(/[()[\]{}<>]/g, " ")
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

function getSterileArchiveQuery(value) {
    return sanitizeArchiveQuery(cleanArchiveRequestText(value))
        .replace(/[:/]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function escapeArchivePhrase(value) {
    return String(value || "")
        .replace(/[\\"]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function escapeArchiveToken(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .trim();
}

function normalizeArray(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value.map(String).filter(Boolean);
    }

    return [String(value)].filter(Boolean);
}

function getLowerFileName(name = "") {
    return String(name || "").toLowerCase().split("?")[0].split("#")[0];
}

function isAudioFile(name = "") {
    const lower = getLowerFileName(name);

    return AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function isImageFile(name = "") {
    const lower = getLowerFileName(name);

    return IMAGE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function isSkipFile(name = "") {
    const lower = getLowerFileName(name);

    return ARCHIVE_SKIP_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function isZipInternalPath(name = "") {
    return /\.(zip|rar|7z|tar|gz)\//i.test(String(name || ""));
}

function encodeArchivePath(path) {
    return String(path || "")
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/");
}

function buildDownloadUrl(identifier, fileName) {
    return `https://archive.org/download/${encodeURIComponent(
        identifier
    )}/${encodeArchivePath(fileName)}`;
}

function buildDetailsUrl(identifier) {
    return `https://archive.org/details/${encodeURIComponent(identifier)}`;
}

function getLicense(metadata = {}) {
    return (
        metadata.licenseurl ||
        metadata.rights ||
        metadata.usage ||
        metadata.license ||
        ""
    );
}

function getItemCollections(item = {}, metadata = {}) {
    return [
        ...normalizeArray(item.collection),
        ...normalizeArray(metadata.collection),
    ];
}

function itemHasSelectedSafeCollection(item = {}, metadata = {}, selected = []) {
    const collections = getItemCollections(item, metadata);

    return collections.some((collection) => selected.includes(collection));
}

function getMetadataText(item = {}, metadata = {}) {
    return [
        item.identifier,
        item.title,
        item.creator,
        item.subject,
        item.description,
        metadata.identifier,
        metadata.title,
        metadata.creator,
        metadata.subject,
        metadata.description,
        metadata.collection,
    ]
        .flat()
        .map(String)
        .join(" ");
}
function buildServeUrl(identifier, fileName) {
    return `https://archive.org/serve/${encodeURIComponent(
        identifier
    )}/${encodeArchivePath(fileName)}`;
}

function buildArchiveImageServiceUrl(identifier) {
    return `https://archive.org/services/img/${encodeURIComponent(identifier)}`;
}

function isArchiveWaveformImage(file = {}) {
    const lowerName = getLowerFileName(file.name);
    const format = String(file.format || "").toLowerCase();
    const source = String(file.source || "").toLowerCase();
    const combined = `${lowerName} ${format} ${source}`;

    return (
        /(^|[\s_.\-/])(spectrogram|spectrograph|spectrum|spectral|sonogram|waveform|waveforms|frequency|freq|oscilloscope)([\s_.\-/]|$)/i.test(combined) ||
        /_spectrogram\.(png|jpg|jpeg|webp|gif)$/i.test(lowerName) ||
        /_waveform\.(png|jpg|jpeg|webp|gif)$/i.test(lowerName)
    );
}

function getArchiveImageScore(file = {}) {
    if (isArchiveWaveformImage(file)) return -10000;

    const lowerName = getLowerFileName(file.name);
    const format = String(file.format || "").toLowerCase();
    let score = 10;

    if (/\b(cover|front|folder|artwork|album|poster)\b/i.test(lowerName)) score += 120;
    if (lowerName.includes("__ia_thumb")) score += 95;
    if (format.includes("item tile")) score += 90;
    if (format.includes("jpeg thumb") || format.includes("thumbnail")) score += 85;
    if (/\b(thumb|image|scan|jacket|sleeve)\b/i.test(lowerName)) score += 70;
    if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) score += 12;
    if (lowerName.endsWith(".webp")) score += 10;
    if (lowerName.endsWith(".png")) score += 4;
    if (lowerName.endsWith(".gif")) score -= 20;

    const size = Number(file.size);
    if (Number.isFinite(size) && size > 0) {
        if (size < 1500) score -= 45;
        if (size > 5000) score += 8;
        if (size > 25000) score += 6;
        if (size > 2500000) score -= 12;
    }

    return score;
}

function getArchiveItemImages(
    identifier,
    metadata = {},
    files = [],
    useArchiveProxy = false
) {
    const title = metadata.title || identifier || "Archive item";
    const serviceImageUrl = buildArchiveImageServiceUrl(identifier);

    const metadataImages = (Array.isArray(files) ? files : [])
        .filter((file) => file?.name)
        .filter((file) => isImageFile(file.name))
        .filter((file) => !hasBlockedTerm(file.name))
        .filter((file) => !isZipInternalPath(file.name))
        .filter((file) => !isArchiveWaveformImage(file))
        .map((file) => {
            const directUrl = buildDownloadUrl(identifier, file.name);
            const imageUrl = buildArchiveProxyUrl(directUrl, useArchiveProxy);

            return {
                name: file.name,
                format: file.format || "",
                size: file.size || "",
                source: file.source || "archive metadata",
                url: imageUrl,
                imageUrl,
                directUrl,
                proxied: Boolean(useArchiveProxy),
                alt: `${title} artwork from Archive.org`,
                score: getArchiveImageScore(file),
            };
        })
        .filter((image) => image.score > -1000)
        .sort((a, b) => b.score - a.score);

    if (metadataImages.length) {
        return dedupeArchiveImages(metadataImages).slice(0, 1);
    }

    const serviceImage = {
        name: "Archive item thumbnail",
        format: "Archive thumbnail fallback",
        size: "",
        source: "archive services image",
        url: buildArchiveProxyUrl(serviceImageUrl, useArchiveProxy),
        imageUrl: buildArchiveProxyUrl(serviceImageUrl, useArchiveProxy),
        directUrl: serviceImageUrl,
        proxied: Boolean(useArchiveProxy),
        alt: `${title} Archive.org thumbnail`,
        score: 1,
    };

    return dedupeArchiveImages([serviceImage]).slice(0, 1);
}

function looksRightsSafer(item = {}, metadata = {}, selectedCollections = []) {
    const combined = getMetadataText(item, metadata);

    if (hasBlockedTerm(combined)) {
        return false;
    }

    const hasSafeCollection = itemHasSelectedSafeCollection(
        item,
        metadata,
        selectedCollections
    );

    const hasLicense = Boolean(getLicense(metadata));

    return hasSafeCollection || hasLicense;
}

function buildArchiveSearchQuery(query, selectedCollections) {
    const safeQuery = getSterileArchiveQuery(query);
    const tokens = getArchiveQueryTokens(safeQuery);
    const phrase = escapeArchivePhrase(safeQuery);

    const collectionQuery = selectedCollections
        .map((collection) => `collection:${collection}`)
        .join(" OR ");

    const fields = [
        "title",
        "creator",
        "subject",
        "description",
        "identifier",
    ];

    const phraseClause = phrase
        ? fields
            .map((field) => `${field}:"${phrase}"`)
            .join(" OR ")
        : "";

    const tokenClause = tokens.length
        ? tokens
            .map((token) => {
                const safeToken = escapeArchiveToken(token);

                if (!safeToken) return "";

                return `(${fields
                    .map((field) => `${field}:${safeToken}`)
                    .join(" OR ")})`;
            })
            .filter(Boolean)
            .join(" AND ")
        : "";

    const queryClause = [phraseClause && `(${phraseClause})`, tokenClause && `(${tokenClause})`]
        .filter(Boolean)
        .join(" OR ");

    // Build a sterile Archive request from only the current input.
    // Do not send loose raw text, previous query terms, old cursors, or user-pasted
    // Archive/Google operators into the next request.
    return [
        "mediatype:audio",
        `(${collectionQuery})`,
        `(${queryClause || safeQuery})`,
    ].join(" AND ");
}

async function fetchJson(url, options = {}) {
    const requestUrl = buildArchiveProxyUrl(url, Boolean(options.useArchiveProxy));

    const response = await fetch(requestUrl, {
        method: "GET",
        signal: options.signal,
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        let extra = "";

        try {
            const data = await response.json();
            extra = data?.error ? `: ${data.error}` : "";
        } catch {
            extra = "";
        }

        throw new Error(`Request failed with HTTP ${response.status}${extra}`);
    }

    return response.json();
}

async function searchArchiveItems(
    query,
    selectedCollections,
    cursor = "",
    signal,
    useArchiveProxy = false
) {
    const archiveQuery = buildArchiveSearchQuery(query, selectedCollections);

    const params = new URLSearchParams({
        q: archiveQuery,
        fields:
            "identifier,title,creator,collection,date,licenseurl,downloads,description,subject",
        sorts: "downloads desc,identifier",
        count: "100",
    });

    if (cursor) {
        params.set("cursor", cursor);
    }

    return fetchJson(`https://archive.org/services/search/v1/scrape?${params}`, {
        signal,
        useArchiveProxy,
    });
}

async function fetchArchiveMetadata(identifier, signal, useArchiveProxy = false) {
    return fetchJson(
        `https://archive.org/metadata/${encodeURIComponent(identifier)}`,
        { signal, useArchiveProxy }
    );
}
function formatSize(value) {
    const bytes = Number(value);

    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "";
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

function formatFileLabel(file = {}) {
    const pieces = [];

    if (file.format) pieces.push(file.format);
    if (file.length) pieces.push(file.length);
    if (file.size) pieces.push(formatSize(file.size));

    return pieces.filter(Boolean).join(" • ") || "audio file";
}

function getPlayableFiles(
    identifier,
    files,
    allowZipInternalPaths,
    useArchiveProxy = false
) {
    const playableFiles = (Array.isArray(files) ? files : [])
        .filter((file) => file?.name)
        .filter((file) => isAudioFile(file.name))
        .filter((file) => !isSkipFile(file.name))
        .filter((file) => !hasBlockedTerm(file.name))
        .filter((file) => allowZipInternalPaths || !isZipInternalPath(file.name))
        .map((file) => {
            const directDownloadUrl = buildDownloadUrl(identifier, file.name);
            const directServeUrl = buildServeUrl(identifier, file.name);
            const downloadUrl = buildArchiveProxyUrl(
                directDownloadUrl,
                useArchiveProxy
            );
            const serveUrl = buildArchiveProxyUrl(directServeUrl, useArchiveProxy);

            return {
                name: file.name,
                format: file.format || "",
                size: file.size || "",
                length: file.length || "",
                source: file.source || "",
                url: serveUrl,          // main player source
                serveUrl,
                downloadUrl,
                directServeUrl,
                directDownloadUrl,
                proxied: Boolean(useArchiveProxy),
                zipInternal: isZipInternalPath(file.name),
            };
        });

    // Important: do not slice this list.
    // Archive items/collections can contain more than 20 playable files, and
    // cutting here was the main reason only part of a collection appeared.
    return dedupeArchiveFiles(playableFiles);
}

function mergeForcedAndMetadataPlayableFiles(forcedFiles = [], metadataFiles = []) {
    // Pasted direct audio URLs should appear first, but the rest of the Archive
    // item's playable files should still load underneath them.
    return dedupeArchiveFiles([
        ...(Array.isArray(forcedFiles) ? forcedFiles : []),
        ...(Array.isArray(metadataFiles) ? metadataFiles : []),
    ]);
}
function stripUrlPunctuation(value) {
    return String(value || "").replace(/[),.;\]]+$/g, "");
}

function decodeArchivePathPart(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function splitJoinedUrls(value) {
    return String(value || "")
        .replace(/(https?:\/\/)/gi, " $1")
        .replace(/\s+/g, " ")
        .trim();
}

function extractUrls(value) {
    const text = splitJoinedUrls(value);
    const matches = text.match(/https?:\/\/[^\s<>"']+/gi);

    return matches ? matches.map(stripUrlPunctuation) : [];
}
function isArchiveHost(host = "") {
    const lower = String(host || "").toLowerCase();

    return (
        lower === "archive.org" ||
        lower === "www.archive.org" ||
        /^ia\d+\.us\.archive\.org$/.test(lower)
    );
}

function normalizeAdvancedSearchQuery(value) {
    return sanitizeArchiveQuery(
        normalizeText(value)
            // Remove Google-style site operators if someone pastes a Google/Bing query.
            .replace(/\(?\s*site:archive\.org\s*\)?/gi, " ")
            .replace(/-site:[^\s)]+/gi, " ")

            // These terms are not useful once we already force mediatype:audio.
            .replace(/\bofficial\s+audio\b/gi, " ")
            .replace(/\bdownload\b/gi, " ")
            .replace(/\bstream\b/gi, " ")
            .replace(/\blisten\b/gi, " ")
            .replace(/\baudio\b/gi, " ")

            // Keep the human query words.
            .replace(/\bOR\b/gi, " ")
            .replace(/\bAND\b/gi, " ")
            .replace(/[()"]/g, " ")
    );
}

function parseArchiveTarget(rawUrl) {
    try {
        const url = new URL(rawUrl);
        const host = url.hostname.toLowerCase();

        if (!isArchiveHost(host)) {
            return null;
        }

        const parts = url.pathname
            .split("/")
            .filter(Boolean)
            .map(decodeArchivePathPart);

        // archive.org/advancedsearch.php?q=...
        if (
            (host === "archive.org" || host === "www.archive.org") &&
            parts[0] === "advancedsearch.php"
        ) {
            const q = normalizeAdvancedSearchQuery(url.searchParams.get("q") || "");

            if (!q) return null;

            return {
                type: "advancedSearch",
                query: q,
                originalUrl: rawUrl,
            };
        }

        let identifier = "";
        let fileName = "";

        // archive.org/details/IDENTIFIER
        if (
            (host === "archive.org" || host === "www.archive.org") &&
            parts[0] === "details" &&
            parts[1]
        ) {
            identifier = parts[1];

            return {
                type: "item",
                identifier,
                originalUrl: rawUrl,
                detailsUrl: buildDetailsUrl(identifier),
            };
        }

        // archive.org/download/IDENTIFIER/file.mp3
        // archive.org/serve/IDENTIFIER/file.mp3
        if (
            (host === "archive.org" || host === "www.archive.org") &&
            (parts[0] === "download" || parts[0] === "serve") &&
            parts.length >= 2
        ) {
            identifier = parts[1];
            fileName = parts.slice(2).join("/");
        }

        // ia801607.us.archive.org/35/items/IDENTIFIER/file.ext
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

        // If it is a direct playable audio file, load that exact file.
        if (fileName && isAudioFile(fileName) && !isSkipFile(fileName)) {
            return {
                type: "audioFile",
                identifier,
                fileName,
                originalUrl: rawUrl,
                serveUrl: buildServeUrl(identifier, fileName),
                downloadUrl: buildDownloadUrl(identifier, fileName),
                detailsUrl: buildDetailsUrl(identifier),
                zipInternal: isZipInternalPath(fileName),
            };
        }

        // If it is a .gif/.jpg/.xml/etc inside an Archive item, use it as an item pointer.
        return {
            type: "item",
            identifier,
            originalUrl: rawUrl,
            detailsUrl: buildDetailsUrl(identifier),
        };
    } catch {
        return null;
    }
}

function extractArchiveTargets(value) {
    const seen = new Set();

    return extractUrls(value)
        .map(parseArchiveTarget)
        .filter(Boolean)
        .filter((target) => {
            const key =
                target.type === "advancedSearch"
                    ? `search:${target.query}`
                    : `${target.type}:${target.identifier}:${target.fileName || ""}`;

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });
}

function getArchiveSearchTextFromInput(value) {
    const advancedSearchTarget = extractArchiveTargets(value).find(
        (target) => target.type === "advancedSearch"
    );

    if (advancedSearchTarget?.query) {
        return advancedSearchTarget.query;
    }

    return value;
}

const ARCHIVE_QUERY_STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "archive",
    "archives",
    "audio",
    "by",
    "cc",
    "commons",
    "creative",
    "domain",
    "download",
    "downloads",
    "for",
    "from",
    "in",
    "listen",
    "mediatype",
    "music",
    "of",
    "official",
    "on",
    "or",
    "public",
    "safe",
    "stream",
    "the",
    "to",
    "with",
]);

function getArchiveQueryTokens(value) {
    const safeQuery = getSterileArchiveQuery(value)
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, " ");

    const rawTokens = safeQuery
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token.length >= 2);

    const meaningfulTokens = rawTokens.filter(
        (token) => !ARCHIVE_QUERY_STOP_WORDS.has(token)
    );

    return Array.from(new Set(meaningfulTokens.length ? meaningfulTokens : rawTokens))
        .slice(0, 10);
}

function getArchiveCandidateSearchText(item = {}, metadata = {}, files = []) {
    return [
        item.identifier,
        item.title,
        item.creator,
        item.subject,
        item.description,
        item.collection,
        metadata.identifier,
        metadata.title,
        metadata.creator,
        metadata.subject,
        metadata.description,
        metadata.collection,
        metadata.licenseurl,
        metadata.rights,
        metadata.usage,
        metadata.license,
        ...files.map((file) => file?.name || ""),
        ...files.map((file) => file?.format || ""),
    ]
        .flat()
        .map(String)
        .join(" ")
        .toLowerCase();
}

function getArchiveHighSignalSearchText(item = {}, metadata = {}, files = []) {
    return [
        item.identifier,
        item.title,
        item.creator,
        item.subject,
        metadata.identifier,
        metadata.title,
        metadata.creator,
        metadata.subject,
        ...files.map((file) => file?.name || ""),
    ]
        .flat()
        .map(String)
        .join(" ")
        .toLowerCase();
}

function tokenAppearsInText(text, token) {
    const escaped = String(token || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (!escaped) return false;

    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(
        String(text || "")
    );
}

function archiveItemMatchesActiveQuery({
                                           query,
                                           queryTokens,
                                           item,
                                           metadata,
                                           files,
                                       }) {
    const tokens = Array.isArray(queryTokens) && queryTokens.length
        ? queryTokens
        : getArchiveQueryTokens(query);

    if (!tokens.length) {
        return true;
    }

    const highSignalHaystack = getArchiveHighSignalSearchText(item, metadata, files);
    const fullHaystack = getArchiveCandidateSearchText(item, metadata, files);

    const highSignalMatchedCount = tokens.reduce((count, token) => {
        return tokenAppearsInText(highSignalHaystack, token) ? count + 1 : count;
    }, 0);

    const fullMatchedCount = tokens.reduce((count, token) => {
        return tokenAppearsInText(fullHaystack, token) ? count + 1 : count;
    }, 0);

    if (tokens.length === 1) {
        // A single-word query like "yeat" should match the current query in
        // title/creator/subject/identifier/file name, not only a stale broad
        // description from an older or unrelated Archive item.
        return highSignalMatchedCount === 1;
    }

    // For multi-word searches, require all current tokens somewhere, with at
    // least one high-signal hit. This keeps searches clean without rejecting
    // every item that has imperfect user-supplied metadata.
    return fullMatchedCount === tokens.length && highSignalMatchedCount >= 1;
}

function isAbortError(error) {
    return (
        error?.name === "AbortError" ||
        error?.code === 20 ||
        String(error?.message || "").toLowerCase().includes("abort")
    );
}

function createAbortError() {
    try {
        return new DOMException("Search aborted", "AbortError");
    } catch {
        const error = new Error("Search aborted");
        error.name = "AbortError";
        return error;
    }
}

function throwIfSearchAborted(signal) {
    if (signal?.aborted) {
        throw createAbortError();
    }
}

function isBadArchiveCursorError(error) {
    const message = String(error?.message || error || "").toLowerCase();

    return message.includes("bad cursor");
}

async function buildArchiveResultFromMetadata({
                                                  identifier,
                                                  forcedFiles = [],
                                                  selectedCollections,
                                                  allowZipInternalPaths,
                                                  signal,
                                                  useArchiveProxy = false,
                                                  allowDirectUrlResult = false,
                                              }) {
    const metadataData = await fetchArchiveMetadata(
        identifier,
        signal,
        useArchiveProxy
    );
    const metadata = metadataData.metadata || {};
    const metadataFiles = Array.isArray(metadataData.files)
        ? metadataData.files
        : [];

    const itemLike = {
        identifier,
        title: metadata.title || identifier,
        creator: metadata.creator || "",
        collection: metadata.collection || [],
        description: metadata.description || "",
        subject: metadata.subject || "",
    };

    const rightsSafer = looksRightsSafer(
        itemLike,
        metadata,
        selectedCollections
    );

    // Normal search remains rights/collection filtered. Direct URL mode can still
    // show the exact item the user pasted, but the UI labels it as not verified.
    if (!rightsSafer && !allowDirectUrlResult) {
        return null;
    }

    const metadataPlayableFiles = getPlayableFiles(
        identifier,
        metadataFiles,
        allowZipInternalPaths,
        useArchiveProxy
    );

    const playableFiles = forcedFiles.length
        ? mergeForcedAndMetadataPlayableFiles(forcedFiles, metadataPlayableFiles)
        : metadataPlayableFiles;

    if (!playableFiles.length) {
        return null;
    }

    return {
        identifier,
        title: metadata.title || identifier,
        creator: metadata.creator || "",
        date: metadata.date || "",
        description: normalizeText(metadata.description || "")
            .replace(/<[^>]*>/g, "")
            .slice(0, 260),
        collection: Array.from(new Set(getItemCollections(itemLike, metadata))),
        license: getLicense(metadata),
        rightsVerified: rightsSafer,
        directUrlResult: Boolean(allowDirectUrlResult),
        downloads: "",
        detailsUrl: buildDetailsUrl(identifier),
        images: getArchiveItemImages(
            identifier,
            metadata,
            metadataFiles,
            useArchiveProxy
        ),
        files: playableFiles,
    };
}

async function loadDirectArchiveAudioLinks({
                                               query,
                                               selectedCollections,
                                               allowZipInternalPaths,
                                               signal,
                                               useArchiveProxy = false,
                                               onResult = null,
                                           }) {
    const targets = extractArchiveTargets(query);

    const directTargets = targets.filter(
        (target) => target.type === "audioFile" || target.type === "item"
    );

    if (!directTargets.length) {
        return null;
    }

    const grouped = new Map();

    for (const target of directTargets) {
        if (!grouped.has(target.identifier)) {
            grouped.set(target.identifier, {
                identifier: target.identifier,
                forcedFiles: [],
            });
        }

        if (target.type === "audioFile") {
            if (!allowZipInternalPaths && target.zipInternal) {
                continue;
            }

            const serveUrl = buildArchiveProxyUrl(
                target.serveUrl,
                useArchiveProxy
            );
            const downloadUrl = buildArchiveProxyUrl(
                target.downloadUrl,
                useArchiveProxy
            );

            grouped.get(target.identifier).forcedFiles.push({
                name: target.fileName,
                format: "",
                size: "",
                length: "",
                source: "direct archive url",
                url: serveUrl,
                serveUrl,
                downloadUrl,
                directServeUrl: target.serveUrl,
                directDownloadUrl: target.downloadUrl,
                originalUrl: target.originalUrl,
                proxied: Boolean(useArchiveProxy),
                zipInternal: target.zipInternal,
            });
        }
    }

    const results = [];

    for (const group of grouped.values()) {
        try {
            const result = await buildArchiveResultFromMetadata({
                identifier: group.identifier,
                forcedFiles: group.forcedFiles,
                selectedCollections,
                allowZipInternalPaths,
                signal,
                useArchiveProxy,
                allowDirectUrlResult: true,
            });
            if (result) {
                results.push(result);

                if (typeof onResult === "function") {
                    onResult(result, {
                        accepted: results.length,
                        inspected: results.length,
                        totalCandidates: grouped.size,
                        cursorReset: false,
                    });
                }
            }
        } catch (err) {
            if (isAbortError(err)) {
                throw err;
            }

            // Skip bad Archive items so one broken URL does not crash the page.
        }
    }

    return {
        cursor: "",
        results,
        directLinkMode: true,
    };
}
async function searchSafeAudio({
                                   query,
                                   cursor = "",
                                   selectedCollections,
                                   allowZipInternalPaths,
                                   signal,
                                   useArchiveProxy = false,
                                   onResult = null,
                               }) {
    const safeQuery = getSterileArchiveQuery(query);
    const queryTokens = getArchiveQueryTokens(safeQuery);

    if (!safeQuery) {
        throw new Error("Type a search query first.");
    }

    if (hasBlockedTerm(safeQuery)) {
        throw new Error(
            "This search looks like leaked, unreleased, bootleg, or commercial music discovery. Try public-domain audio, Creative Commons music, podcasts, old radio, speeches, LibriVox, or etree live recordings."
        );
    }

    if (!selectedCollections.length) {
        throw new Error("Choose at least one safe Archive collection.");
    }

    let searchData;
    let cursorReset = false;

    try {
        searchData = await searchArchiveItems(
            safeQuery,
            selectedCollections,
            cursor,
            signal,
            useArchiveProxy
        );
    } catch (err) {
        if (cursor && isBadArchiveCursorError(err)) {
            // Archive.org cursors are tied to the exact search/sort and can expire or
            // reject on the next request. Do not crash the UI or leak old results.
            cursorReset = true;
            searchData = await searchArchiveItems(
                safeQuery,
                selectedCollections,
                "",
                signal,
                useArchiveProxy
            );
        } else {
            throw err;
        }
    }

    throwIfSearchAborted(signal);

    const items = Array.isArray(searchData.items) ? searchData.items : [];
    const results = [];
    const seenIdentifiers = new Set();

    // Inspect more than we display because the extra query verification can remove broad matches.
    for (const item of items.slice(0, 100)) {
        if (!item.identifier || hasBlockedTerm(item.identifier)) {
            continue;
        }

        if (seenIdentifiers.has(item.identifier)) {
            continue;
        }

        seenIdentifiers.add(item.identifier);

        try {
            throwIfSearchAborted(signal);

            const metadataData = await fetchArchiveMetadata(
                item.identifier,
                signal,
                useArchiveProxy
            );

            throwIfSearchAborted(signal);

            const metadata = metadataData.metadata || {};
            const files = Array.isArray(metadataData.files) ? metadataData.files : [];

            if (!archiveItemMatchesActiveQuery({
                query: safeQuery,
                queryTokens,
                item,
                metadata,
                files,
            })) {
                continue;
            }

            if (!looksRightsSafer(item, metadata, selectedCollections)) {
                continue;
            }

            const playableFiles = getPlayableFiles(
                item.identifier,
                files,
                allowZipInternalPaths,
                useArchiveProxy
            );

            if (!playableFiles.length) {
                continue;
            }

            const nextResult = {
                identifier: item.identifier,
                title: metadata.title || item.title || item.identifier,
                creator: metadata.creator || item.creator || "",
                date: metadata.date || item.date || "",
                description: normalizeText(metadata.description || item.description || "")
                    .replace(/<[^>]*>/g, "")
                    .slice(0, 260),
                collection: Array.from(new Set(getItemCollections(item, metadata))),
                license: getLicense(metadata),
                rightsVerified: true,
                directUrlResult: false,
                downloads: item.downloads || "",
                detailsUrl: buildDetailsUrl(item.identifier),
                images: getArchiveItemImages(
                    item.identifier,
                    metadata,
                    files,
                    useArchiveProxy
                ),
                files: playableFiles,
            };

            results.push(nextResult);

            if (typeof onResult === "function") {
                onResult(nextResult, {
                    accepted: results.length,
                    inspected: seenIdentifiers.size,
                    totalCandidates: items.length,
                    cursorReset,
                });
            }

            // Do not stop at 50. The Archive scrape page already caps the
            // request batch, and every returned item may contain multiple files.
        } catch (err) {
            if (isAbortError(err)) {
                throw err;
            }

            // Some Archive items have incomplete metadata or temporary errors.
            // Skip those so one bad item does not break the whole browser.
        }
    }

    return {
        cursor: cursorReset ? "" : searchData.cursor || "",
        cursorReset,
        results: dedupeArchiveResults(results),
    };
}

function buildSearchSignature(
    query,
    selectedCollections,
    allowZipInternalPaths,
    useArchiveProxy = false
) {
    return JSON.stringify({
        query: getSterileArchiveQuery(query),
        collections: [...selectedCollections].sort(),
        allowZipInternalPaths: Boolean(allowZipInternalPaths),
        useArchiveProxy: Boolean(useArchiveProxy),
    });
}

function makeArchiveResultKey(item = {}) {
    return String(item?.identifier || item?.detailsUrl || item?.title || "");
}

function makeArchiveFileKey(file = {}) {
    return String(file?.serveUrl || file?.url || file?.downloadUrl || file?.name || "");
}

function makeArchiveImageKey(image = {}) {
    return String(image?.imageUrl || image?.url || image?.directUrl || image?.name || "");
}

function dedupeArchiveImages(images = []) {
    const seen = new Set();
    const uniqueImages = [];

    for (const image of Array.isArray(images) ? images : []) {
        const key = makeArchiveImageKey(image);

        if (!key || seen.has(key)) {
            continue;
        }

        seen.add(key);
        uniqueImages.push(image);
    }

    return uniqueImages;
}

function dedupeArchiveFiles(files = []) {
    const seen = new Set();
    const uniqueFiles = [];

    for (const file of Array.isArray(files) ? files : []) {
        const key = makeArchiveFileKey(file);

        if (!key || seen.has(key)) {
            continue;
        }

        seen.add(key);
        uniqueFiles.push(file);
    }

    return uniqueFiles;
}

function dedupeArchiveResults(items = []) {
    const seen = new Set();
    const uniqueItems = [];

    for (const item of Array.isArray(items) ? items : []) {
        const key = makeArchiveResultKey(item);

        if (!key || seen.has(key)) {
            continue;
        }

        seen.add(key);
        uniqueItems.push({
            ...item,
            images: dedupeArchiveImages(item.images),
            files: dedupeArchiveFiles(item.files),
        });
    }

    return uniqueItems;
}

function stampArchiveResults(items = [], searchSignature = "") {
    return dedupeArchiveResults(items).map((item) => ({
        ...item,
        searchSignature,
        images: dedupeArchiveImages(item.images).map((image) => ({
            ...image,
            searchSignature,
        })),
        files: dedupeArchiveFiles(item.files).map((file) => ({
            ...file,
            searchSignature,
        })),
    }));
}

function mergeArchiveResults(current = [], incoming = []) {
    return dedupeArchiveResults([...current, ...incoming]);
}

export default function ArchiveAudioBrowser() {
    const restoredSessionRef = useRef(null);

    if (restoredSessionRef.current === null) {
        restoredSessionRef.current = readArchiveBrowserSession();
    }

    const restoredSession = restoredSessionRef.current;

    const [query, setQuery] = useState(restoredSession.query || "old radio");
    const [results, setResults] = useState(restoredSession.results || []);
    const [nextCursor, setNextCursor] = useState(restoredSession.nextCursor || "");
    const [status, setStatus] = useState(
        restoredSession.loading
            ? "Restored a search that was fetching before refresh. Continuing from saved results..."
            : restoredSession.status || ""
    );
    const [error, setError] = useState(restoredSession.error || "");
    const [loading, setLoading] = useState(false);
    const [selectedCollections, setSelectedCollections] = useState(
        restoredSession.selectedCollections || DEFAULT_SELECTED_COLLECTIONS
    );
    const [allowZipInternalPaths, setAllowZipInternalPaths] = useState(
        Boolean(restoredSession.allowZipInternalPaths)
    );
    const [useArchiveProxy, setUseArchiveProxy] = useState(
        Boolean(restoredSession.useArchiveProxy)
    );
    const [copiedUrl, setCopiedUrl] = useState("");
    const [activeSearch, setActiveSearch] = useState(null);

    const searchRunRef = useRef(0);
    const abortControllerRef = useRef(null);
    const latestSearchInputRef = useRef({
        query: restoredSession.query || "old radio",
        selectedCollections:
            restoredSession.selectedCollections || DEFAULT_SELECTED_COLLECTIONS,
        allowZipInternalPaths: Boolean(restoredSession.allowZipInternalPaths),
        useArchiveProxy: Boolean(restoredSession.useArchiveProxy),
    });
    const browserSessionRef = useRef(restoredSession);
    const shouldResumeRestoredSearchRef = useRef(Boolean(restoredSession.loading));

    const lastSubmittedSearchRef = useRef({
        ...(restoredSession.lastSubmittedSearch || {}),
        query: restoredSession.lastSubmittedSearch?.query || "",
        selectedCollections:
            restoredSession.lastSubmittedSearch?.selectedCollections ||
            restoredSession.selectedCollections ||
            DEFAULT_SELECTED_COLLECTIONS,
        allowZipInternalPaths: Boolean(
            restoredSession.lastSubmittedSearch?.allowZipInternalPaths
        ),
        useArchiveProxy: Boolean(restoredSession.lastSubmittedSearch?.useArchiveProxy),
        cursor: restoredSession.lastSubmittedSearch?.cursor || "",
        signature: restoredSession.lastSubmittedSearch?.signature || "",
    });

    const [lastSearchSignature, setLastSearchSignature] = useState(
        restoredSession.lastSearchSignature || ""
    );

    const currentSearchSignature = useMemo(() => {
        return buildSearchSignature(
            query,
            selectedCollections,
            allowZipInternalPaths,
            useArchiveProxy
        );
    }, [query, selectedCollections, allowZipInternalPaths, useArchiveProxy]);

    const hasUnsubmittedSearchChanges = useMemo(() => {
        return Boolean(
            lastSearchSignature && currentSearchSignature !== lastSearchSignature
        );
    }, [currentSearchSignature, lastSearchSignature]);

    const totalPlayableFiles = useMemo(() => {
        return results.reduce((total, item) => {
            return total + (Array.isArray(item.files) ? item.files.length : 0);
        }, 0);
    }, [results]);

    const selectedCollectionSet = useMemo(() => {
        return new Set(selectedCollections);
    }, [selectedCollections]);

    useEffect(() => {
        latestSearchInputRef.current = {
            query,
            selectedCollections: [...selectedCollections],
            allowZipInternalPaths,
            useArchiveProxy,
        };
    }, [query, selectedCollections, allowZipInternalPaths, useArchiveProxy]);

    useEffect(() => {
        const snapshot = {
            query,
            selectedCollections: [...selectedCollections],
            allowZipInternalPaths,
            useArchiveProxy,
            results,
            nextCursor,
            status,
            error,
            loading,
            lastSearchSignature,
            lastSubmittedSearch: lastSubmittedSearchRef.current,
            activeSearch,
        };

        browserSessionRef.current = snapshot;
        writeArchiveBrowserSession(snapshot);
    }, [
        query,
        selectedCollections,
        allowZipInternalPaths,
        useArchiveProxy,
        results,
        nextCursor,
        status,
        error,
        loading,
        lastSearchSignature,
        activeSearch,
    ]);

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    useEffect(() => {
        if (!shouldResumeRestoredSearchRef.current) {
            return;
        }

        shouldResumeRestoredSearchRef.current = false;

        const restoredActiveSearch = restoredSessionRef.current?.activeSearch || {};
        const shouldLoadMore = Boolean(restoredActiveSearch.isLoadMore);

        window.setTimeout(() => {
            runSearch(shouldLoadMore, { keepExistingResults: true });
        }, 0);
    }, []);

    function saveBrowserSnapshot(overrides = {}) {
        const latestInput = latestSearchInputRef.current;
        const snapshot = {
            ...browserSessionRef.current,
            query: latestInput.query,
            selectedCollections: [...(latestInput.selectedCollections || [])],
            allowZipInternalPaths: Boolean(latestInput.allowZipInternalPaths),
            useArchiveProxy: Boolean(latestInput.useArchiveProxy),
            lastSubmittedSearch: lastSubmittedSearchRef.current,
            ...overrides,
        };

        browserSessionRef.current = snapshot;
        writeArchiveBrowserSession(snapshot);
    }

    function stopActiveSearchAndClearResults(nextStatus = "") {
        abortControllerRef.current?.abort();
        searchRunRef.current += 1;

        const latestInput = latestSearchInputRef.current;

        lastSubmittedSearchRef.current = {
            query: "",
            selectedCollections: [...(latestInput.selectedCollections || [])],
            allowZipInternalPaths: Boolean(latestInput.allowZipInternalPaths),
            useArchiveProxy: Boolean(latestInput.useArchiveProxy),
            cursor: "",
            signature: "",
        };

        setLoading(false);
        setResults([]);
        setNextCursor("");
        setLastSearchSignature("");
        setCopiedUrl("");
        setActiveSearch(null);
        clearArchiveBrowserSession();

        setStatus(nextStatus || "");
    }

    function stopActiveSearchAndKeepResults(nextStatus = "") {
        abortControllerRef.current?.abort();
        searchRunRef.current += 1;

        setLoading(false);
        setNextCursor("");
        setCopiedUrl("");
        setActiveSearch(null);
        setStatus(nextStatus || "");
    }

    function handleQueryChange(event) {
        const nextQuery = event.target.value;

        setQuery(nextQuery);
        setError("");
        stopActiveSearchAndKeepResults(
            nextQuery.trim()
                ? "New query typed. Press Search Archive Audio when ready."
                : ""
        );
    }

    function toggleCollection(collectionId) {
        const nextSelected = selectedCollections.includes(collectionId)
            ? selectedCollections.filter((id) => id !== collectionId)
            : [...selectedCollections, collectionId];

        setSelectedCollections(nextSelected);
        stopActiveSearchAndKeepResults(
            "Collection filters changed. Press Search Archive Audio when ready."
        );
    }

    function resetCollections() {
        setSelectedCollections(DEFAULT_SELECTED_COLLECTIONS);
        stopActiveSearchAndKeepResults(
            "Collection filters reset. Press Search Archive Audio when ready."
        );
    }

    function handleAllowZipInternalPathsChange(event) {
        setAllowZipInternalPaths(event.target.checked);
        stopActiveSearchAndKeepResults(
            "ZIP-internal path setting changed. Press Search Archive Audio when ready."
        );
    }

    function handleArchiveProxyChange(event) {
        const enabled = event.target.checked;

        setUseArchiveProxy(enabled);
        writeArchiveProxySetting(enabled);
        stopActiveSearchAndKeepResults(
            enabled
                ? "Archive proxy enabled. Press Search Archive Audio when ready."
                : "Archive proxy disabled. Press Search Archive Audio when ready."
        );
    }

    function createPlaylistItemFromArchiveFile(file) {
        const selectedUrl = file?.serveUrl || file?.url || file?.downloadUrl;

        if (!selectedUrl) {
            return null;
        }

        return {
            id: makeArchivePlaylistId(),
            kind: "url",
            title: getArchiveAudioPlaylistTitle(file),
            url: selectedUrl,
            size: 0,
            type: "direct media URL",
            addedAt: new Date().toISOString(),
            source: "archive.org",
            archiveFileName: file?.name || "",
            archiveServeUrl: file?.serveUrl || "",
            archiveDownloadUrl: file?.downloadUrl || "",
        };
    }

    function addArchiveFileToAudioPlaylist(file) {
        const selectedUrl = file?.serveUrl || file?.url || file?.downloadUrl;

        if (!selectedUrl) {
            setError("No playable Archive audio link was found for this file.");
            return;
        }

        try {
            const playlist = readAudioPlaylistFromStorage();

            const alreadyExists = playlist.some(
                (item) => item?.kind === "url" && item?.url === selectedUrl
            );

            if (alreadyExists) {
                setStatus("That Archive song is already in your Audio playlist.");
                setError("");
                return;
            }

            const nextItem = createPlaylistItemFromArchiveFile(file);

            if (!nextItem) {
                setError("No playable Archive audio link was found for this file.");
                return;
            }

            const saved = writeAudioPlaylistToStorage([...playlist, nextItem]);

            if (!saved) {
                setError("Could not save to playlist. Browser storage may be blocked.");
                return;
            }

            setError("");
            setStatus("Added Archive song to your Audio playlist without leaving this page.");
        } catch {
            setError("Could not add this Archive song to your Audio playlist.");
        }
    }

    function addArchiveFilesToAudioPlaylist(files = [], label = "Archive files") {
        const playableFiles = dedupeArchiveFiles(files).filter(
            (file) => file?.serveUrl || file?.url || file?.downloadUrl
        );

        if (!playableFiles.length) {
            setError("No playable Archive audio links were found.");
            return;
        }

        try {
            const playlist = readAudioPlaylistFromStorage();
            const existingUrls = new Set(
                playlist
                    .filter((item) => item?.kind === "url" && item?.url)
                    .map((item) => item.url)
            );

            const newItems = playableFiles
                .filter((file) => {
                    const selectedUrl = file?.serveUrl || file?.url || file?.downloadUrl;
                    return selectedUrl && !existingUrls.has(selectedUrl);
                })
                .map(createPlaylistItemFromArchiveFile)
                .filter(Boolean);

            if (!newItems.length) {
                setStatus(`All ${playableFiles.length} ${label} are already in your Audio playlist.`);
                setError("");
                return;
            }

            const saved = writeAudioPlaylistToStorage([...playlist, ...newItems]);

            if (!saved) {
                setError("Could not save to playlist. Browser storage may be blocked.");
                return;
            }

            setError("");
            setStatus(`Added ${newItems.length} ${label} to your Audio playlist.`);
        } catch {
            setError(`Could not add ${label} to your Audio playlist.`);
        }
    }

    function addAllVisibleArchiveFilesToPlaylist() {
        const files = results.flatMap((item) =>
            Array.isArray(item.files) ? item.files : []
        );

        addArchiveFilesToAudioPlaylist(files, "visible Archive file(s)");
    }

    async function copyText(value) {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedUrl(value);
            window.setTimeout(() => setCopiedUrl(""), 1400);
        } catch {
            setError("Could not copy to clipboard in this browser.");
        }
    }

    function sendArchiveFileToAudioPage(file) {
        const selectedUrl = file?.serveUrl || file?.url || file?.downloadUrl;

        if (!selectedUrl) {
            setError("No playable Archive audio link was found for this file.");
            return;
        }

        const title = file?.name || "Archive audio";

        try {
            window.localStorage.setItem(
                "audiomasterlab.audio.lastMedia.v4",
                JSON.stringify({
                    kind: "url",
                    title,
                    url: selectedUrl,
                    savedAt: new Date().toISOString(),
                })
            );

            window.localStorage.setItem(
                "audiomasterlab.audio.directLink.v4",
                selectedUrl
            );
        } catch {
            // Query param still works even if localStorage is blocked.
        }


        setError("");
        setStatus("Saved this Archive audio link for the Audio page without leaving or refreshing this page.");
    }

    async function runSearch(loadMore = false, options = {}) {
        const isLoadMore = Boolean(loadMore);
        const keepExistingResults = Boolean(options.keepExistingResults);
        const submittedSearch = lastSubmittedSearchRef.current;
        const visibleSignature = buildSearchSignature(
            query,
            selectedCollections,
            allowZipInternalPaths,
            useArchiveProxy
        );

        if (isLoadMore && submittedSearch.signature !== visibleSignature) {
            setNextCursor("");
            setError("");
            setStatus(
                "Search input changed. Press Search Archive Audio to start a fresh search instead of reusing an old cursor."
            );
            return;
        }

        const searchSource = isLoadMore
            ? submittedSearch
            : {
                query,
                selectedCollections: [...selectedCollections],
                allowZipInternalPaths,
                useArchiveProxy,
                cursor: "",
                signature: visibleSignature,
            };

        const queryForRequest = searchSource.query;
        const collectionsForRequest = [...searchSource.selectedCollections];
        const allowZipForRequest = Boolean(searchSource.allowZipInternalPaths);
        const proxyForRequest = Boolean(searchSource.useArchiveProxy);
        const cursorForRequest = isLoadMore
            ? searchSource.cursor || nextCursor || ""
            : "";

        const safeQuery = getSterileArchiveQuery(queryForRequest);
        const requestSignature = buildSearchSignature(
            queryForRequest,
            collectionsForRequest,
            allowZipForRequest,
            proxyForRequest
        );
        const archiveRouteLabel = proxyForRequest
            ? " through the AudioMasterLab proxy"
            : " directly from Archive.org";

        if (!safeQuery) {
            setError("Type a search query first.");
            setStatus("");
            return;
        }

        if (!collectionsForRequest.length) {
            setError("Choose at least one safe Archive collection.");
            setStatus("");
            return;
        }

        const searchId = searchRunRef.current + 1;
        searchRunRef.current = searchId;

        abortControllerRef.current?.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const activeSearchSnapshot = {
            isLoadMore,
            keepExistingResults,
            safeQuery,
            routeLabel: archiveRouteLabel,
            startedAt: new Date().toISOString(),
        };

        lastSubmittedSearchRef.current = {
            query: queryForRequest,
            selectedCollections: collectionsForRequest,
            allowZipInternalPaths: allowZipForRequest,
            useArchiveProxy: proxyForRequest,
            cursor: cursorForRequest,
            signature: requestSignature,
        };

        try {
            setLoading(true);
            setActiveSearch(activeSearchSnapshot);
            setLastSearchSignature(requestSignature);
            setError("");
            setCopiedUrl("");

            if (!isLoadMore && !keepExistingResults) {
                setResults([]);
                setNextCursor("");
            }

            setStatus(
                isLoadMore
                    ? `Loading more results for "${safeQuery}"${archiveRouteLabel}...`
                    : `Searching Archive audio for "${safeQuery}"${archiveRouteLabel}...`
            );

            const handleIncrementalResult = (result, progress = {}) => {
                if (controller.signal.aborted || searchId !== searchRunRef.current) {
                    return;
                }

                const stampedResult = stampArchiveResults(
                    [result],
                    requestSignature
                );

                if (!stampedResult.length) {
                    return;
                }

                const progressStatus = `Loaded ${progress.accepted || 1} Archive item(s) for "${safeQuery}"${archiveRouteLabel}; inspected ${progress.inspected || 0} of ${progress.totalCandidates || 0} candidates.`;

                setResults((current) => {
                    const nextResults = mergeArchiveResults(current, stampedResult);

                    saveBrowserSnapshot({
                        results: nextResults,
                        nextCursor,
                        status: progressStatus,
                        error: "",
                        loading: true,
                        lastSearchSignature: requestSignature,
                        lastSubmittedSearch: lastSubmittedSearchRef.current,
                        activeSearch: activeSearchSnapshot,
                    });

                    return nextResults;
                });

                setStatus(progressStatus);
            };

            const directData = !isLoadMore
                ? await loadDirectArchiveAudioLinks({
                    query: queryForRequest,
                    selectedCollections: collectionsForRequest,
                    allowZipInternalPaths: allowZipForRequest,
                    signal: controller.signal,
                    useArchiveProxy: proxyForRequest,
                    onResult: handleIncrementalResult,
                })
                : null;

            const data =
                directData?.results?.length
                    ? directData
                    : await searchSafeAudio({
                        query: queryForRequest,
                        cursor: cursorForRequest,
                        selectedCollections: collectionsForRequest,
                        allowZipInternalPaths: allowZipForRequest,
                        signal: controller.signal,
                        useArchiveProxy: proxyForRequest,
                        onResult: handleIncrementalResult,
                    });

            // Ignore stale results from an older search.
            if (controller.signal.aborted || searchId !== searchRunRef.current) {
                return;
            }

            if (!isLoadMore) {
                const latestInput = latestSearchInputRef.current;
                const latestSignature = buildSearchSignature(
                    latestInput.query,
                    latestInput.selectedCollections,
                    latestInput.allowZipInternalPaths,
                    latestInput.useArchiveProxy
                );

                if (requestSignature !== latestSignature) {
                    return;
                }
            }

            const incomingResults = stampArchiveResults(
                Array.isArray(data.results) ? data.results : [],
                requestSignature
            );
            const nextCursorValue = data.cursorReset ? "" : data.cursor || "";

            lastSubmittedSearchRef.current = {
                query: queryForRequest,
                selectedCollections: collectionsForRequest,
                allowZipInternalPaths: allowZipForRequest,
                useArchiveProxy: proxyForRequest,
                cursor: nextCursorValue,
                signature: requestSignature,
            };

            setLastSearchSignature(requestSignature);
            setNextCursor(nextCursorValue);

            setResults((current) => {
                if (data.directLinkMode && !isLoadMore && !keepExistingResults) {
                    return incomingResults;
                }

                if (isLoadMore || keepExistingResults || !data.directLinkMode) {
                    return mergeArchiveResults(current, incomingResults);
                }

                return incomingResults;
            });

            setStatus(
                data.cursorReset
                    ? `Archive reset an expired cursor for "${safeQuery}". Results stayed on the current query; press Search Archive Audio for a fresh first page.`
                    : data.directLinkMode
                        ? `Loaded ${incomingResults.length} direct Archive item(s)${archiveRouteLabel}, including all playable files found in each item.`
                        : incomingResults.length
                            ? isLoadMore
                                ? `Added ${incomingResults.length} more Archive item(s)${archiveRouteLabel}.`
                                : `Found ${incomingResults.length} Archive item(s) with playable audio${archiveRouteLabel}.`
                            : `No safe playable audio files found for "${safeQuery}"${archiveRouteLabel}.`
            );
        } catch (err) {
            if (isAbortError(err)) {
                return;
            }

            if (searchId !== searchRunRef.current) {
                return;
            }

            if (isLoadMore && isBadArchiveCursorError(err)) {
                lastSubmittedSearchRef.current = {
                    ...lastSubmittedSearchRef.current,
                    cursor: "",
                };
                setNextCursor("");
                setError("");
                setStatus(
                    "Archive rejected the saved cursor, so Load More was reset. Your current results are still valid; press Search Archive Audio to run a fresh first page."
                );
                return;
            }

            setError(err?.message || "Archive search failed.");
            setStatus("");

            if (!isLoadMore && !keepExistingResults) {
                setResults([]);
                setNextCursor("");
            }
        } finally {
            if (searchId === searchRunRef.current) {
                setLoading(false);
                setActiveSearch(null);

                if (abortControllerRef.current === controller) {
                    abortControllerRef.current = null;
                }
            }
        }
    }

    function clearResults() {
        stopActiveSearchAndClearResults("Results cleared.");
        setError("");

        lastSubmittedSearchRef.current = {
            query: "",
            selectedCollections: [...selectedCollections],
            allowZipInternalPaths,
            useArchiveProxy,
            cursor: "",
            signature: "",
        };
    }

    function preventPageRefresh(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
    }

    function handleSearchSubmit(event) {
        preventPageRefresh(event);
        runSearch(false);
    }

    function handleSearchButtonClick(event) {
        preventPageRefresh(event);
        runSearch(false);
    }

    function handleLoadMoreButtonClick(event) {
        preventPageRefresh(event);
        runSearch(true);
    }

    return (
        <Box
            component="main"
            sx={{ p: { xs: 2, md: 4 }, maxWidth: 1240, mx: "auto" }}
            onSubmit={preventPageRefresh}
        >
            <Helmet>
                <title>Archive Audio Browser | AudioMaster Lab</title>
                <meta
                    name="description"
                    content="Search safe public Archive.org audio collections, load direct media links, build playlists, and play browser-supported audio files."
                />
                <link rel="canonical" href="https://audiomasterlab.com/archive" />

                <meta property="og:title" content="Archive Audio Browser | AudioMaster Lab" />
                <meta
                    property="og:description"
                    content="Search safe public Archive.org audio collections and add playable direct media links to your AudioMaster Lab playlist."
                />
                <meta property="og:url" content="https://audiomasterlab.com/archive" />
            </Helmet>
            <Stack spacing={3}>
                <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <LibraryMusicRoundedIcon color="primary" />
                        <Typography variant="h3" sx={{ fontWeight: 950 }}>
                            Archive Audio Browser
                        </Typography>
                    </Stack>

                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ maxWidth: 860, mt: 1 }}
                    >
                        Frontend-only Archive.org audio search for public-domain,
                        Creative Commons-style, live taping, podcasts, speeches, old radio,
                        LibriVox, and your own rights-safe uploads.
                    </Typography>
                </Box>

                <Alert severity="info">
                    This page uses Archive.org public JSON endpoints from the browser. It
                    does not bypass CORS, scrape blocked websites, or verify copyright for
                    you. Archive metadata can be user supplied, so always check rights
                    before reusing or redistributing audio.
                </Alert>

                <Card
                    sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 4,
                    }}
                >
                    <CardContent
                        component="form"
                        noValidate
                        onSubmit={handleSearchSubmit}
                    >
                        <Stack spacing={2.5}>
                            <TextField
                                label="Search safe Archive audio"
                                value={query}
                                onChange={handleQueryChange}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        preventPageRefresh(event);
                                        runSearch(false);
                                    }
                                }}
                                placeholder="old radio, public domain jazz, speeches, librivox, live concert..."
                                fullWidth
                                helperText="Avoid leaked, unreleased, bootleg, full album, discography, or commercial artist discovery searches."
                                inputProps={{
                                    enterKeyHint: "search",
                                    autoComplete: "off",
                                }}
                            />

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                <Button
                                    type="button"
                                    variant="contained"
                                    size="large"
                                    startIcon={
                                        loading ? (
                                            <CircularProgress size={18} color="inherit" />
                                        ) : (
                                            <SearchRoundedIcon />
                                        )
                                    }
                                    disabled={loading}
                                    onClick={handleSearchButtonClick}
                                >
                                    Search Archive Audio
                                </Button>

                                <Button
                                    type="button"
                                    variant="outlined"
                                    size="large"
                                    disabled={loading || !nextCursor || hasUnsubmittedSearchChanges}
                                    onClick={handleLoadMoreButtonClick}
                                >
                                    Load More
                                </Button>

                                <Button
                                    type="button"
                                    variant="text"
                                    size="large"
                                    startIcon={<RestartAltRoundedIcon />}
                                    disabled={loading}
                                    onClick={clearResults}
                                >
                                    Clear
                                </Button>
                            </Stack>

                            <Divider />

                            <Box>
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={1}
                                    justifyContent="space-between"
                                    alignItems={{ xs: "flex-start", sm: "center" }}
                                    sx={{ mb: 1 }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                                        Safe collection filters
                                    </Typography>

                                    <Button type="button" size="small" onClick={resetCollections}>
                                        Reset collections
                                    </Button>
                                </Stack>

                                <Grid container spacing={1}>
                                    {SAFE_COLLECTION_OPTIONS.map((collection) => {
                                        const checked = selectedCollectionSet.has(collection.id);

                                        return (
                                            <Grid item xs={12} sm={6} md={4} key={collection.id}>
                                                <Card
                                                    variant="outlined"
                                                    sx={{
                                                        borderRadius: 3,
                                                        height: "100%",
                                                        opacity: checked ? 1 : 0.68,
                                                    }}
                                                >
                                                    <CardContent sx={{ py: 1.5 }}>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    checked={checked}
                                                                    onChange={() => toggleCollection(collection.id)}
                                                                />
                                                            }
                                                            label={
                                                                <Box>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{ fontWeight: 900 }}
                                                                    >
                                                                        {collection.label}
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                    >
                                                                        {collection.id}
                                                                    </Typography>
                                                                </Box>
                                                            }
                                                        />

                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{ display: "block", mt: 0.5 }}
                                                        >
                                                            {collection.description}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </Box>

                            <Divider />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={useArchiveProxy}
                                        onChange={handleArchiveProxyChange}
                                    />
                                }
                                label="Use scrapewebsite Archive proxy for search, metadata, and playable audio links"
                            />

                            <Alert severity={useArchiveProxy ? "warning" : "info"}>
                                {useArchiveProxy
                                    ? `Proxy mode is on. Archive search JSON, metadata JSON, and audio URLs are routed through ${SCRAPEWEBSITE_ARCHIVE_PROXY_URL}. This can help with CORS, Range requests, Safari/iPhone playback, and Archive links that fail directly, but it may be slower and it does not verify rights or bypass copyright limits.`
                                    : "Proxy mode is off. Searches and audio links use Archive.org directly. Turn this on only when direct Archive results or playback are failing."}
                            </Alert>

                            <Divider />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={allowZipInternalPaths}
                                        onChange={handleAllowZipInternalPathsChange}
                                    />
                                }
                                label="Allow Archive ZIP-internal audio paths when metadata exposes them"
                            />

                            <Alert severity={allowZipInternalPaths ? "warning" : "success"}>
                                {allowZipInternalPaths
                                    ? "ZIP-internal paths are allowed only when Archive metadata exposes them. Do not use this to crawl leaked or bootleg archives."
                                    : "ZIP-internal audio paths are hidden by default. This is safer for a public app."}
                            </Alert>
                        </Stack>
                    </CardContent>
                </Card>

                {status && <Alert severity="success">{status}</Alert>}
                {error && <Alert severity="error">{error}</Alert>}
                {copiedUrl && <Alert severity="info">Copied direct audio link.</Alert>}

                {!!results.length && (
                    <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        alignItems="center"
                    >
                        <Chip label={`${results.length} item(s)`} color="primary" />
                        <Chip label={`${totalPlayableFiles} playable file(s)`} />
                        <Chip label={`Proxy: ${useArchiveProxy ? "on" : "off"}`} />
                        <Chip label={`Next cursor: ${nextCursor ? "available" : "none"}`} />
                        <Button
                            type="button"
                            size="small"
                            variant="outlined"
                            startIcon={<PlaylistAddRoundedIcon />}
                            onClick={addAllVisibleArchiveFilesToPlaylist}
                        >
                            Add all visible files to playlist
                        </Button>
                    </Stack>
                )}

                <Stack spacing={2}>
                    {results.map((item) => (
                        <Card
                            key={item.identifier}
                            variant="outlined"
                            sx={{
                                borderRadius: 4,
                                overflow: "hidden",
                            }}
                        >
                            <CardContent>
                                <Stack spacing={1.5}>
                                    <Stack
                                        direction={{ xs: "column", md: "row" }}
                                        spacing={1}
                                        justifyContent="space-between"
                                        alignItems={{ xs: "flex-start", md: "center" }}
                                    >
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 950 }}>
                                                {item.title}
                                            </Typography>

                                            <Typography variant="body2" color="text.secondary">
                                                {item.creator || "Unknown creator"}
                                                {item.date ? ` • ${item.date}` : ""}
                                                {item.downloads ? ` • ${item.downloads} downloads` : ""}
                                            </Typography>

                                            <Typography variant="caption" color="text.secondary">
                                                Loaded {Array.isArray(item.files) ? item.files.length : 0} playable file(s) from this Archive item.
                                            </Typography>
                                        </Box>

                                        <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            spacing={1}
                                            alignItems={{ xs: "stretch", sm: "center" }}
                                        >
                                            <Button
                                                type="button"
                                                size="small"
                                                variant="outlined"
                                                startIcon={<PlaylistAddRoundedIcon />}
                                                disabled={!Array.isArray(item.files) || !item.files.length}
                                                onClick={() =>
                                                    addArchiveFilesToAudioPlaylist(
                                                        item.files,
                                                        `file(s) from "${item.title || item.identifier}"`
                                                    )
                                                }
                                            >
                                                Add all item files
                                            </Button>

                                            <Button
                                                href={item.detailsUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                endIcon={<OpenInNewRoundedIcon />}
                                            >
                                                Archive page
                                            </Button>
                                        </Stack>
                                    </Stack>

                                    {!!item.images?.[0] && (
                                        <Card
                                            variant="outlined"
                                            sx={{
                                                borderRadius: 3,
                                                bgcolor: "background.default",
                                                overflow: "hidden",
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src={item.images[0].imageUrl || item.images[0].url}
                                                alt={item.images[0].alt || `${item.title} Archive thumbnail`}
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                                onError={(event) => {
                                                    event.currentTarget.style.display = "none";
                                                }}
                                                sx={{
                                                    width: "100%",
                                                    height: { xs: 220, sm: 280 },
                                                    objectFit: "contain",
                                                    objectPosition: "center",
                                                    display: "block",
                                                    bgcolor: "background.paper",
                                                }}
                                            />

                                            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                                                <Stack
                                                    direction={{ xs: "column", sm: "row" }}
                                                    spacing={1}
                                                    justifyContent="space-between"
                                                    alignItems={{ xs: "flex-start", sm: "center" }}
                                                >
                                                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                                        Archive thumbnail
                                                    </Typography>

                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ wordBreak: "break-word" }}
                                                    >
                                                        {item.images[0].name || "Archive item thumbnail"}
                                                        {item.images[0].proxied ? " • proxied" : ""}
                                                    </Typography>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {item.description && (
                                        <Typography variant="body2" color="text.secondary">
                                            {item.description}
                                        </Typography>
                                    )}

                                    <Typography
                                        variant="caption"
                                        color={item.rightsVerified === false ? "warning.main" : "text.secondary"}
                                    >
                                        License / rights:{" "}
                                        {item.license ||
                                            (item.directUrlResult
                                                ? "Direct URL result — rights were not verified by AudioMaster Lab. Only use audio you own or have permission to use."
                                                : "Not listed — verify before reuse.")}
                                    </Typography>

                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {item.collection.slice(0, 8).map((collection) => (
                                            <Chip key={collection} label={collection} size="small" />
                                        ))}
                                    </Stack>

                                    <Divider />

                                    <Stack spacing={1.5}>
                                        {item.files.map((file) => (
                                            <Box
                                                key={file.url}
                                                sx={{
                                                    p: 1.5,
                                                    border: "1px solid",
                                                    borderColor: file.zipInternal
                                                        ? "warning.main"
                                                        : "divider",
                                                    borderRadius: 3,
                                                    bgcolor: "background.default",
                                                }}
                                            >
                                                <Stack spacing={1}>
                                                    <Stack
                                                        direction={{ xs: "column", sm: "row" }}
                                                        spacing={1}
                                                        justifyContent="space-between"
                                                        alignItems={{ xs: "flex-start", sm: "center" }}
                                                    >
                                                        <Stack
                                                            direction="row"
                                                            spacing={1}
                                                            alignItems="center"
                                                            sx={{ minWidth: 0 }}
                                                        >
                                                            <AudiotrackRoundedIcon fontSize="small" />

                                                            <Box sx={{ minWidth: 0 }}>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        fontWeight: 900,
                                                                        wordBreak: "break-word",
                                                                    }}
                                                                >
                                                                    {file.name}
                                                                </Typography>

                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {formatFileLabel(file)}
                                                                    {file.zipInternal
                                                                        ? " • ZIP-internal path"
                                                                        : ""}
                                                                    {file.proxied
                                                                        ? " • proxied"
                                                                        : ""}
                                                                </Typography>
                                                            </Box>
                                                        </Stack>
                                                    </Stack>

                                                    <audio
                                                        controls
                                                        preload="none"
                                                        src={file.url}
                                                        style={{
                                                            width: "100%",
                                                            display: "block",
                                                        }}
                                                    />

                                                    <Stack
                                                        direction={{ xs: "column", sm: "row" }}
                                                        spacing={1}
                                                    >
                                                        <Button
                                                            href={file.serveUrl || file.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            size="small"
                                                            variant="outlined"
                                                            endIcon={<OpenInNewRoundedIcon />}
                                                        >
                                                            Open serve link
                                                        </Button>

                                                        <Button
                                                            href={file.downloadUrl || file.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            size="small"
                                                            variant="outlined"
                                                            endIcon={<OpenInNewRoundedIcon />}
                                                        >
                                                            Open download link
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            size="small"
                                                            variant="text"
                                                            startIcon={<ContentCopyRoundedIcon />}
                                                            onClick={() => copyText(file.serveUrl || file.url)}
                                                        >
                                                            Copy serve link
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            size="small"
                                                            variant="text"
                                                            startIcon={<ContentCopyRoundedIcon />}
                                                            onClick={() => copyText(file.downloadUrl || file.url)}
                                                        >
                                                            Copy download link
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="small"
                                                            variant="contained"
                                                            onClick={() => sendArchiveFileToAudioPage(file)}
                                                            startIcon={<AudiotrackRoundedIcon />}
                                                        >
                                                            Save for Audio Page
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => addArchiveFileToAudioPlaylist(file)}
                                                            startIcon={<PlaylistAddRoundedIcon />}
                                                        >
                                                            Add song to playlist
                                                        </Button>
                                                    </Stack>
                                                </Stack>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>

                {!results.length && !loading && (
                    <Card variant="outlined" sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Stack spacing={1}>
                                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                                    Try searches like:
                                </Typography>

                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {[
                                        "old radio",
                                        "public domain jazz",
                                        "librivox sherlock",
                                        "speeches",
                                        "etree live",
                                        "creative commons music",
                                        "history podcast",
                                    ].map((suggestion) => (
                                        <Chip
                                            key={suggestion}
                                            label={suggestion}
                                            onClick={() => {
                                                setQuery(suggestion);
                                                setError("");
                                                stopActiveSearchAndKeepResults(
                                                    "Suggestion selected. Press Search Archive Audio when ready."
                                                );
                                            }}
                                            clickable
                                        />
                                    ))}
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                )}
            </Stack>
        </Box>
    );
}
