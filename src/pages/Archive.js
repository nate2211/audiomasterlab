// src/pages/ArchiveAudioBrowser.js

import React, { useMemo, useState } from "react";
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
import { useNavigate } from "react-router-dom";
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
    const safeQuery = sanitizeArchiveQuery(query);

    const collectionQuery = selectedCollections
        .map((collection) => `collection:${collection}`)
        .join(" OR ");

    return [
        "mediatype:audio",
        `(${collectionQuery} OR licenseurl:*)`,
        `(${safeQuery})`,
    ].join(" AND ");
}

async function fetchJson(url) {
    const response = await fetch(url, {
        method: "GET",
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

async function searchArchiveItems(query, selectedCollections, cursor = "") {
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

    return fetchJson(`https://archive.org/services/search/v1/scrape?${params}`);
}

async function fetchArchiveMetadata(identifier) {
    return fetchJson(
        `https://archive.org/metadata/${encodeURIComponent(identifier)}`
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

function getPlayableFiles(identifier, files, allowZipInternalPaths) {
    return files
        .filter((file) => file?.name)
        .filter((file) => isAudioFile(file.name))
        .filter((file) => !isSkipFile(file.name))
        .filter((file) => !hasBlockedTerm(file.name))
        .filter((file) => allowZipInternalPaths || !isZipInternalPath(file.name))
        .slice(0, 10)
        .map((file) => {
            const downloadUrl = buildDownloadUrl(identifier, file.name);
            const serveUrl = buildServeUrl(identifier, file.name);

            return {
                name: file.name,
                format: file.format || "",
                size: file.size || "",
                length: file.length || "",
                source: file.source || "",
                url: serveUrl,          // main player source
                serveUrl,
                downloadUrl,
                zipInternal: isZipInternalPath(file.name),
            };
        });
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

async function buildArchiveResultFromMetadata({
                                                  identifier,
                                                  forcedFiles = [],
                                                  selectedCollections,
                                                  allowZipInternalPaths,
                                              }) {
    const metadataData = await fetchArchiveMetadata(identifier);
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

    if (!rightsSafer) {
        return null;
    }

    const playableFiles = forcedFiles.length
        ? forcedFiles
        : getPlayableFiles(identifier, metadataFiles, allowZipInternalPaths);

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
        downloads: "",
        detailsUrl: buildDetailsUrl(identifier),
        files: playableFiles,
    };
}

async function loadDirectArchiveAudioLinks({
                                               query,
                                               selectedCollections,
                                               allowZipInternalPaths,
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

            grouped.get(target.identifier).forcedFiles.push({
                name: target.fileName,
                format: "",
                size: "",
                length: "",
                source: "direct archive url",
                url: target.serveUrl,
                serveUrl: target.serveUrl,
                downloadUrl: target.downloadUrl,
                originalUrl: target.originalUrl,
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
            });

            if (result) {
                results.push(result);
            }
        } catch {
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
                               }) {
    const safeQuery = sanitizeArchiveQuery(getArchiveSearchTextFromInput(query));

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

    const searchData = await searchArchiveItems(
        safeQuery,
        selectedCollections,
        cursor
    );

    const items = Array.isArray(searchData.items) ? searchData.items : [];
    const results = [];

    for (const item of items.slice(0, 24)) {
        if (!item.identifier || hasBlockedTerm(item.identifier)) {
            continue;
        }

        try {
            const metadataData = await fetchArchiveMetadata(item.identifier);
            const metadata = metadataData.metadata || {};
            const files = Array.isArray(metadataData.files) ? metadataData.files : [];

            if (!looksRightsSafer(item, metadata, selectedCollections)) {
                continue;
            }

            const playableFiles = getPlayableFiles(
                item.identifier,
                files,
                allowZipInternalPaths
            );

            if (!playableFiles.length) {
                continue;
            }

            results.push({
                identifier: item.identifier,
                title: metadata.title || item.title || item.identifier,
                creator: metadata.creator || item.creator || "",
                date: metadata.date || item.date || "",
                description: normalizeText(metadata.description || item.description || "")
                    .replace(/<[^>]*>/g, "")
                    .slice(0, 260),
                collection: Array.from(new Set(getItemCollections(item, metadata))),
                license: getLicense(metadata),
                downloads: item.downloads || "",
                detailsUrl: buildDetailsUrl(item.identifier),
                files: playableFiles,
            });
        } catch {
            // Some Archive items have incomplete metadata or temporary errors.
            // Skip those so one bad item does not break the whole browser.
        }
    }

    return {
        cursor: searchData.cursor || "",
        results,
    };
}

export default function ArchiveAudioBrowser() {
    const [query, setQuery] = useState("old radio");
    const [results, setResults] = useState([]);
    const [nextCursor, setNextCursor] = useState("");
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [selectedCollections, setSelectedCollections] = useState(
        DEFAULT_SELECTED_COLLECTIONS
    );

    const [allowZipInternalPaths, setAllowZipInternalPaths] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState("");

    const totalPlayableFiles = useMemo(() => {
        return results.reduce((total, item) => total + item.files.length, 0);
    }, [results]);

    const selectedCollectionSet = useMemo(() => {
        return new Set(selectedCollections);
    }, [selectedCollections]);

    function toggleCollection(collectionId) {
        setSelectedCollections((current) => {
            if (current.includes(collectionId)) {
                return current.filter((id) => id !== collectionId);
            }

            return [...current, collectionId];
        });
    }

    function resetCollections() {
        setSelectedCollections(DEFAULT_SELECTED_COLLECTIONS);
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

        navigate(`/audio?url=${encodeURIComponent(selectedUrl)}`);
    }
    async function runSearch(loadMore = false) {
        try {
            setLoading(true);
            setError("");
            setCopiedUrl("");
            setStatus(
                loadMore
                    ? "Loading more safe Archive audio..."
                    : "Searching safe Archive audio..."
            );

            const directData = await loadDirectArchiveAudioLinks({
                query,
                selectedCollections,
                allowZipInternalPaths,
            });

            const data =
                directData ||
                (await searchSafeAudio({
                    query,
                    cursor: loadMore ? nextCursor : "",
                    selectedCollections,
                    allowZipInternalPaths,
                }));

            setNextCursor(data.cursor || "");

            setResults((current) =>
                loadMore && !data.directLinkMode
                    ? [...current, ...data.results]
                    : data.results
            );

            setStatus(
                data.directLinkMode
                    ? `Loaded ${data.results.length} rights-filtered direct Archive item(s).`
                    : data.results.length
                        ? `Found ${data.results.length} Archive item(s) with playable audio.`
                        : "No safe playable audio files found for that query."
            );
        } catch (err) {
            setError(err?.message || "Archive search failed.");
            setStatus("");
        } finally {
            setLoading(false);
        }
    }

    function clearResults() {
        setResults([]);
        setNextCursor("");
        setStatus("Results cleared.");
        setError("");
        setCopiedUrl("");
    }

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1240, mx: "auto" }}>
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
                    <CardContent>
                        <Stack spacing={2.5}>
                            <TextField
                                label="Search safe Archive audio"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="old radio, public domain jazz, speeches, librivox, live concert..."
                                fullWidth
                                helperText="Avoid leaked, unreleased, bootleg, full album, discography, or commercial artist discovery searches."
                            />

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                <Button
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
                                    onClick={() => runSearch(false)}
                                >
                                    Search Archive Audio
                                </Button>

                                <Button
                                    variant="outlined"
                                    size="large"
                                    disabled={loading || !nextCursor}
                                    onClick={() => runSearch(true)}
                                >
                                    Load More
                                </Button>

                                <Button
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

                                    <Button size="small" onClick={resetCollections}>
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
                                        checked={allowZipInternalPaths}
                                        onChange={(event) =>
                                            setAllowZipInternalPaths(event.target.checked)
                                        }
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
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip label={`${results.length} item(s)`} color="primary" />
                        <Chip label={`${totalPlayableFiles} playable file(s)`} />
                        <Chip label={`Next cursor: ${nextCursor ? "available" : "none"}`} />
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
                                        </Box>

                                        <Button
                                            href={item.detailsUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            endIcon={<OpenInNewRoundedIcon />}
                                        >
                                            Archive page
                                        </Button>
                                    </Stack>

                                    {item.description && (
                                        <Typography variant="body2" color="text.secondary">
                                            {item.description}
                                        </Typography>
                                    )}

                                    <Typography variant="caption" color="text.secondary">
                                        License / rights:{" "}
                                        {item.license || "Not listed — verify before reuse."}
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
                                                            size="small"
                                                            variant="text"
                                                            startIcon={<ContentCopyRoundedIcon />}
                                                            onClick={() => copyText(file.serveUrl || file.url)}
                                                        >
                                                            Copy serve link
                                                        </Button>

                                                        <Button
                                                            size="small"
                                                            variant="text"
                                                            startIcon={<ContentCopyRoundedIcon />}
                                                            onClick={() => copyText(file.downloadUrl || file.url)}
                                                        >
                                                            Copy download link
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            onClick={() => sendArchiveFileToAudioPage(file)}
                                                            startIcon={<AudiotrackRoundedIcon />}
                                                        >
                                                            Load in Audio Page
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
                                            onClick={() => setQuery(suggestion)}
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