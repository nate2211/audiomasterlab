import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Drawer,
    Alert,
    IconButton,
    LinearProgress,
    Slider,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";

import YouTubeIcon from "@mui/icons-material/YouTube";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PlaylistAddRoundedIcon from "@mui/icons-material/PlaylistAddRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import OpenWithRoundedIcon from "@mui/icons-material/OpenWithRounded";
import RecommendRoundedIcon from "@mui/icons-material/RecommendRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ClearAllRoundedIcon from "@mui/icons-material/ClearAllRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import PictureInPictureAltRoundedIcon from "@mui/icons-material/PictureInPictureAltRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import KeyboardRoundedIcon from "@mui/icons-material/KeyboardRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";

import { Helmet } from "react-helmet-async";

const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

const SEARCH_PAGE_SIZE = 50;
const RECOMMENDED_PAGE_SIZE = 50;
const DEFAULT_RECOMMENDED_REGION = "US";
const SAVED_RECOMMENDATION_QUERIES_COOKIE = "aml_youtube_saved_queries";
const SAVED_RECOMMENDATIONS_TOGGLE_COOKIE = "aml_youtube_use_saved_query_recommendations";
const MAX_SAVED_RECOMMENDATION_QUERIES = 18;
const SAVED_RECOMMENDED_PER_QUERY = 10;
const ORGANIC_INTERESTS_TOGGLE_COOKIE = "aml_youtube_use_local_interest_discovery";
const INTEREST_PROFILE_KEY = "aml_youtube_interest_profile_v2";
const MAX_INTEREST_QUERIES = 24;
const ORGANIC_INTEREST_SEARCH_LIMIT = 8;
const PLAYLIST_PAGE_SIZE = 50;
const PLAYLIST_MAX_PAGES = 4;
const YOUTUBE_LOCAL_SESSION_KEY = "aml_youtube_local_session_v3";
const MAX_LOCAL_PLAYLIST_ITEMS = 300;
const YOUTUBE_SEARCH_HISTORY_KEY = "aml_youtube_search_history_v1";
const MAX_SEARCH_HISTORY_ITEMS = 12;
const BROWSE_RENDER_BATCH_SIZE = 80;
const PLAYER_TRANSITION_MS = 260;
const PLAYER_PROGRESS_POLL_MS = 750;
const DEFAULT_PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];


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

function setCookieValue(name, value, maxAgeDays = 365) {
    if (typeof document === "undefined") return;

    const maxAgeSeconds = Math.max(1, maxAgeDays) * 24 * 60 * 60;

    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
}

function deleteCookieValue(name) {
    if (typeof document === "undefined") return;

    document.cookie = `${encodeURIComponent(name)}=; max-age=0; path=/; SameSite=Lax`;
}

function readBooleanCookie(name, fallback = false) {
    const value = getCookieValue(name);

    if (!value) return fallback;

    return value === "1" || value.toLowerCase() === "true";
}

function normalizeSavedRecommendationQueries(values) {
    const output = [];
    const seen = new Set();

    (Array.isArray(values) ? values : [values]).forEach((value) => {
        splitAutoPlaylistQueries(value).forEach((part) => {
            const clean = part.replace(/\s+/g, " ").trim();
            const key = clean.toLowerCase();

            if (!clean || seen.has(key)) return;

            seen.add(key);
            output.push(clean.slice(0, 100));
        });
    });

    return output.slice(0, MAX_SAVED_RECOMMENDATION_QUERIES);
}

function readSavedRecommendationQueries() {
    const raw = getCookieValue(SAVED_RECOMMENDATION_QUERIES_COOKIE);

    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        return normalizeSavedRecommendationQueries(Array.isArray(parsed) ? parsed : []);
    } catch {
        return normalizeSavedRecommendationQueries(raw.split("|"));
    }
}

function writeSavedRecommendationQueries(queries) {
    const cleanQueries = normalizeSavedRecommendationQueries(queries);
    setCookieValue(SAVED_RECOMMENDATION_QUERIES_COOKIE, JSON.stringify(cleanQueries), 365);
    return cleanQueries;
}

function mergeSavedRecommendationQueries(existing, incoming) {
    const incomingQueries = normalizeSavedRecommendationQueries(incoming);
    const existingQueries = normalizeSavedRecommendationQueries(existing);

    return normalizeSavedRecommendationQueries([...incomingQueries, ...existingQueries]);
}

function shuffleArray(values) {
    const output = [...values];

    for (let index = output.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
    }

    return output;
}

function makePlaylistId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extractVideoId(value) {
    const clean = String(value || "").trim();

    try {
        const url = new URL(clean);
        const host = url.hostname.toLowerCase();

        if (host === "youtu.be") {
            return url.pathname.replace("/", "").slice(0, 11);
        }

        if (
            host === "youtube.com" ||
            host === "www.youtube.com" ||
            host.endsWith(".youtube.com")
        ) {
            const watchId = url.searchParams.get("v");

            if (watchId) {
                return watchId.slice(0, 11);
            }

            const embedMatch = url.pathname.match(/\/embed\/([^/?#]+)/);

            if (embedMatch?.[1]) {
                return embedMatch[1].slice(0, 11);
            }

            const shortsMatch = url.pathname.match(/\/shorts\/([^/?#]+)/);

            if (shortsMatch?.[1]) {
                return shortsMatch[1].slice(0, 11);
            }

            const liveMatch = url.pathname.match(/\/live\/([^/?#]+)/);

            if (liveMatch?.[1]) {
                return liveMatch[1].slice(0, 11);
            }
        }
    } catch {
        // Not a URL, maybe already an 11-character video ID.
    }

    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
        return clean;
    }

    return "";
}


function parseYouTubeTime(value) {
    if (!value) return 0;

    const raw = String(value).toLowerCase().trim();

    if (/^\d+$/.test(raw)) {
        return Number(raw);
    }

    const hours = Number(raw.match(/(\d+)h/)?.[1] || 0);
    const minutes = Number(raw.match(/(\d+)m/)?.[1] || 0);
    const seconds = Number(raw.match(/(\d+)s/)?.[1] || 0);

    return hours * 3600 + minutes * 60 + seconds;
}

function parseYouTubeInput(value) {
    const clean = String(value || "").trim();

    if (!clean) {
        return { type: "empty" };
    }

    const urls = clean.match(/https?:\/\/[^\s]+/gi) || [];

    if (urls.length > 1) {
        return {
            type: "videoList",
            videoIds: urls.map(extractVideoId).filter(Boolean),
            rawUrls: urls,
        };
    }

    try {
        const url = new URL(clean);
        const host = url.hostname.toLowerCase().replace(/^www\./, "");
        const isYouTube =
            host === "youtube.com" ||
            host === "m.youtube.com" ||
            host === "music.youtube.com" ||
            host === "youtu.be" ||
            host.endsWith(".youtube.com");

        if (!isYouTube) {
            return { type: "search", query: clean };
        }

        const playlistId = url.searchParams.get("list") || "";
        const videoId = extractVideoId(clean);
        const startSeconds = parseYouTubeTime(
            url.searchParams.get("t") || url.searchParams.get("start") || ""
        );

        if (playlistId && videoId) {
            return { type: "videoInPlaylist", videoId, playlistId, startSeconds };
        }

        if (playlistId) {
            return { type: "playlist", playlistId };
        }

        if (videoId) {
            return { type: "video", videoId, startSeconds };
        }

        return { type: "search", query: clean };
    } catch {
        const videoId = extractVideoId(clean);

        if (videoId) {
            return { type: "video", videoId, startSeconds: 0 };
        }

        return { type: "search", query: clean };
    }
}

function readInterestProfile() {
    if (typeof window === "undefined" || !window.localStorage) return {};

    try {
        const parsed = JSON.parse(window.localStorage.getItem(INTEREST_PROFILE_KEY) || "{}");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function writeInterestProfile(profile) {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
        window.localStorage.setItem(INTEREST_PROFILE_KEY, JSON.stringify(profile || {}));
    } catch {
        // localStorage can fail in private browsing or restricted contexts.
    }
}

function clearLocalInterestProfile() {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
        window.localStorage.removeItem(INTEREST_PROFILE_KEY);
    } catch {
        // Safe cleanup.
    }
}

function normalizeInterestTopic(topic) {
    const withoutControlCharacters = String(topic || "")
        .split("")
        .map((character) => (character.charCodeAt(0) < 32 ? " " : character))
        .join("");

    return withoutControlCharacters
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 96);
}

function addInterestSignal(topic, weight = 1) {
    const clean = normalizeInterestTopic(topic);
    const key = clean.toLowerCase();

    if (!clean || key.length < 2) return;

    const profile = readInterestProfile();
    const current = profile[key] || {
        label: clean,
        score: 0,
        lastUsed: 0,
    };

    profile[key] = {
        label: current.label || clean,
        score: Math.min(100, Number(current.score || 0) + weight),
        lastUsed: Date.now(),
    };

    writeInterestProfile(profile);
}

function getTopInterestQueries(limit = MAX_INTEREST_QUERIES) {
    const profile = readInterestProfile();

    return Object.entries(profile)
        .map(([topic, data]) => ({
            topic,
            label: normalizeInterestTopic(data?.label || topic),
            score: Number(data?.score || 0),
            lastUsed: Number(data?.lastUsed || 0),
        }))
        .filter((item) => item.label && item.score > 0)
        .sort((a, b) => b.score - a.score || b.lastUsed - a.lastUsed)
        .slice(0, limit)
        .map((item) => item.label);
}

function rememberVideoInterest(video, sourceQuery = "") {
    const cleanSource = String(sourceQuery || "").trim();

    if (cleanSource && cleanSource.toLowerCase() !== "direct link") {
        splitAutoPlaylistQueries(cleanSource).forEach((part) => addInterestSignal(part, 3));
    }

    if (video?.channelTitle) {
        addInterestSignal(video.channelTitle, 1.1);
    }

    if (video?.title) {
        const titleWords = video.title
            .replace(/&amp;/gi, " ")
            .replace(/[^\w\s]/g, " ")
            .split(/\s+/)
            .map((word) => word.trim())
            .filter((word) => word.length > 3 && !/^\d+$/.test(word))
            .slice(0, 5);

        titleWords.forEach((word) => addInterestSignal(word, 0.25));
    }
}

function formatYoutubeDuration(value) {
    if (!value) return "";

    const match = String(value).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

    if (!match) return value;

    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatCount(value) {
    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0) {
        return "";
    }

    if (number >= 1_000_000_000) {
        return `${(number / 1_000_000_000).toFixed(1)}B`;
    }

    if (number >= 1_000_000) {
        return `${(number / 1_000_000).toFixed(1)}M`;
    }

    if (number >= 1_000) {
        return `${(number / 1_000).toFixed(1)}K`;
    }

    return String(number);
}

function buildYoutubeWatchUrl(videoId) {
    const cleanId = String(videoId || "").trim();

    return cleanId ? `https://www.youtube.com/watch?v=${cleanId}` : "";
}

function buildYoutubeEmbedUrl(videoId, startSeconds = 0, autoplay = false) {
    const cleanId = String(videoId || "").trim();

    if (!cleanId) return "";

    const url = new URL(`https://www.youtube.com/embed/${cleanId}`);

    url.searchParams.set("enablejsapi", "1");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("controls", "1");
    url.searchParams.set("rel", "0");
    url.searchParams.set("modestbranding", "1");

    if (typeof window !== "undefined" && window.location?.origin) {
        url.searchParams.set("origin", window.location.origin);
    }

    if (Number(startSeconds) > 0) {
        url.searchParams.set("start", String(Math.floor(Number(startSeconds))));
    }

    if (autoplay) {
        url.searchParams.set("autoplay", "1");
    }

    return url.toString();
}

function buildFallbackVideo(videoId, title = "") {
    return {
        id: videoId,
        title: title || `YouTube video ${videoId}`,
        channelTitle: "Loaded from link",
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        highThumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: "",
        viewCount: "",
        likeCount: "",
        publishedAt: "",
        description: "",
        embeddable: true,
    };
}

function normalizeVideo(video) {
    const snippet = video.snippet || {};
    const statistics = video.statistics || {};
    const contentDetails = video.contentDetails || {};
    const status = video.status || {};
    const thumbnails = snippet.thumbnails || {};

    return {
        id: typeof video.id === "string" ? video.id : video.id?.videoId,
        title: snippet.title || "Untitled video",
        channelTitle: snippet.channelTitle || "Unknown channel",
        thumbnail:
            thumbnails.medium?.url ||
            thumbnails.default?.url ||
            `https://i.ytimg.com/vi/${typeof video.id === "string" ? video.id : video.id?.videoId}/mqdefault.jpg`,
        highThumbnail:
            thumbnails.high?.url ||
            thumbnails.standard?.url ||
            thumbnails.medium?.url ||
            `https://i.ytimg.com/vi/${typeof video.id === "string" ? video.id : video.id?.videoId}/hqdefault.jpg`,
        duration: formatYoutubeDuration(contentDetails.duration),
        viewCount: statistics.viewCount || "",
        likeCount: statistics.likeCount || "",
        publishedAt: snippet.publishedAt || "",
        description: snippet.description || "",
        embeddable: status.embeddable !== false,
    };
}

function uniqueVideosById(videos) {
    const seen = new Set();
    const output = [];

    videos.forEach((video) => {
        if (!video?.id || seen.has(video.id)) return;

        seen.add(video.id);
        output.push(video);
    });

    return output;
}

function safeReadLocalStorageJson(key, fallback) {
    if (typeof window === "undefined" || !window.localStorage) return fallback;

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return fallback;

        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function safeWriteLocalStorageJson(key, value) {
    if (typeof window === "undefined" || !window.localStorage) return false;

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function normalizeSearchHistory(values) {
    const output = [];
    const seen = new Set();

    (Array.isArray(values) ? values : []).forEach((value) => {
        const clean = String(value || "").replace(/\s+/g, " ").trim().slice(0, 120);
        const key = clean.toLowerCase();

        if (!clean || seen.has(key)) return;

        seen.add(key);
        output.push(clean);
    });

    return output.slice(0, MAX_SEARCH_HISTORY_ITEMS);
}

function readSearchHistory() {
    return normalizeSearchHistory(
        safeReadLocalStorageJson(YOUTUBE_SEARCH_HISTORY_KEY, [])
    );
}

function writeSearchHistory(values) {
    const cleanHistory = normalizeSearchHistory(values);
    safeWriteLocalStorageJson(YOUTUBE_SEARCH_HISTORY_KEY, cleanHistory);
    return cleanHistory;
}

function addSearchHistoryItem(query, currentHistory = readSearchHistory()) {
    const clean = String(query || "").replace(/\s+/g, " ").trim();

    if (!clean || /^https?:\/\//i.test(clean)) {
        return normalizeSearchHistory(currentHistory);
    }

    return writeSearchHistory([clean, ...currentHistory]);
}

function parseDurationLabelToSeconds(value) {
    const clean = String(value || "").trim();

    if (!clean) return 0;

    const parts = clean.split(":").map((part) => Number(part));

    if (parts.some((part) => !Number.isFinite(part))) {
        return 0;
    }

    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }

    return parts[0] || 0;
}

function videoMatchesDurationFilter(video, filter) {
    if (!filter || filter === "any") return true;

    const seconds = parseDurationLabelToSeconds(video?.duration);

    if (!seconds) return true;
    if (filter === "short") return seconds < 4 * 60;
    if (filter === "medium") return seconds >= 4 * 60 && seconds <= 20 * 60;
    if (filter === "long") return seconds > 20 * 60;

    return true;
}

function videoMatchesUploadFilter(video, filter) {
    if (!filter || filter === "any") return true;

    const publishedAt = Date.parse(video?.publishedAt || "");

    if (!Number.isFinite(publishedAt)) return true;

    const ageDays = (Date.now() - publishedAt) / (24 * 60 * 60 * 1000);

    if (filter === "week") return ageDays <= 7;
    if (filter === "month") return ageDays <= 31;
    if (filter === "year") return ageDays <= 366;

    return true;
}

function formatPlayerTime(seconds) {
    const cleanSeconds = Math.max(0, Math.floor(Number(seconds || 0)));
    const hours = Math.floor(cleanSeconds / 3600);
    const minutes = Math.floor((cleanSeconds % 3600) / 60);
    const remainingSeconds = cleanSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function normalizeStoredVideo(video) {
    if (!video?.id) return null;

    const cleanId = String(video.id || "").trim().slice(0, 32);

    if (!cleanId) return null;

    return {
        id: cleanId,
        title: String(video.title || `YouTube video ${cleanId}`).slice(0, 220),
        channelTitle: String(video.channelTitle || "Unknown channel").slice(0, 160),
        thumbnail:
            video.thumbnail ||
            `https://i.ytimg.com/vi/${cleanId}/mqdefault.jpg`,
        highThumbnail:
            video.highThumbnail ||
            video.thumbnail ||
            `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
        duration: String(video.duration || "").slice(0, 32),
        viewCount: String(video.viewCount || "").slice(0, 32),
        likeCount: String(video.likeCount || "").slice(0, 32),
        publishedAt: String(video.publishedAt || "").slice(0, 64),
        description: String(video.description || "").slice(0, 600),
        embeddable: video.embeddable !== false,
        playlistId: video.playlistId || makePlaylistId(),
    };
}

function normalizeStoredPlaylist(playlist) {
    return uniqueVideosById(
        (Array.isArray(playlist) ? playlist : [])
            .slice(0, MAX_LOCAL_PLAYLIST_ITEMS)
            .map((video) => normalizeStoredVideo(video))
            .filter(Boolean)
    ).map((video) => ({
        ...video,
        playlistId: video.playlistId || makePlaylistId(),
    }));
}

function readYoutubeLocalSession() {
    const session = safeReadLocalStorageJson(YOUTUBE_LOCAL_SESSION_KEY, {});
    const playlist = normalizeStoredPlaylist(session?.playlist);
    const selectedVideo = normalizeStoredVideo(session?.selectedVideo);
    const playbackMode = session?.playbackMode === "playlist" ? "playlist" : "browse";
    const activePlaylistIndex = Number.isInteger(session?.activePlaylistIndex)
        ? Math.min(Math.max(session.activePlaylistIndex, -1), playlist.length - 1)
        : -1;

    return {
        query: String(session?.query || "").slice(0, 500),
        activeQuery: String(session?.activeQuery || "").slice(0, 500),
        selectedVideo,
        playlist,
        playbackMode,
        activePlaylistIndex,
        playbackPositionSeconds: Math.max(0, Number(session?.playbackPositionSeconds || 0)),
        savedAt: Number(session?.savedAt || 0),
    };
}

function writeYoutubeLocalSession({
                                      query,
                                      activeQuery,
                                      selectedVideo,
                                      playlist,
                                      playbackMode,
                                      activePlaylistIndex,
                                      playbackPositionSeconds,
                                  }) {
    const cleanPlaylist = normalizeStoredPlaylist(playlist);

    return safeWriteLocalStorageJson(YOUTUBE_LOCAL_SESSION_KEY, {
        query: String(query || "").slice(0, 500),
        activeQuery: String(activeQuery || "").slice(0, 500),
        selectedVideo: normalizeStoredVideo(selectedVideo),
        playlist: cleanPlaylist,
        playbackMode: playbackMode === "playlist" ? "playlist" : "browse",
        activePlaylistIndex: Number.isInteger(activePlaylistIndex)
            ? Math.min(Math.max(activePlaylistIndex, -1), cleanPlaylist.length - 1)
            : -1,
        playbackPositionSeconds: Math.max(0, Number(playbackPositionSeconds || 0)),
        savedAt: Date.now(),
    });
}

function splitAutoPlaylistQueries(value) {
    return String(value || "")
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);
}

function interleaveVideoGroups(groups, maxTotal = 60) {
    const output = [];
    const seen = new Set();
    const safeGroups = (groups || []).map((group) => (Array.isArray(group) ? group : []));
    const longest = safeGroups.reduce((max, group) => Math.max(max, group.length), 0);

    for (let index = 0; index < longest; index += 1) {
        for (const group of safeGroups) {
            const video = group[index];

            if (!video?.id || seen.has(video.id)) {
                continue;
            }

            seen.add(video.id);
            output.push(video);

            if (output.length >= maxTotal) {
                return output;
            }
        }
    }

    return output;
}

async function fetchYoutubeVideoDetails(videoIds) {
    if (!YOUTUBE_API_KEY) {
        throw new Error("Missing REACT_APP_YOUTUBE_API_KEY in your .env file.");
    }

    const ids = Array.from(new Set(videoIds || [])).filter(Boolean);

    if (!ids.length) {
        return [];
    }

    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");

    videosUrl.searchParams.set("part", "snippet,contentDetails,statistics,status");
    videosUrl.searchParams.set("id", ids.join(","));
    videosUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const videosResponse = await fetch(videosUrl.toString());

    if (!videosResponse.ok) {
        throw new Error(`YouTube video lookup failed: ${videosResponse.status}`);
    }

    const videosData = await videosResponse.json();

    return (videosData.items || []).map(normalizeVideo);
}

async function fetchYoutubeVideosBySearch(query, pageToken = "") {
    if (!YOUTUBE_API_KEY) {
        throw new Error("Missing REACT_APP_YOUTUBE_API_KEY in your .env file.");
    }

    const cleanQuery = String(query || "").trim();

    if (!cleanQuery) {
        throw new Error("Type a YouTube search first.");
    }

    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");

    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", String(SEARCH_PAGE_SIZE));
    searchUrl.searchParams.set("q", cleanQuery);
    searchUrl.searchParams.set("order", "relevance");
    searchUrl.searchParams.set("safeSearch", "none");
    searchUrl.searchParams.set("videoEmbeddable", "true");
    searchUrl.searchParams.set("key", YOUTUBE_API_KEY);

    if (pageToken) {
        searchUrl.searchParams.set("pageToken", pageToken);
    }

    const searchResponse = await fetch(searchUrl.toString());

    if (!searchResponse.ok) {
        throw new Error(`YouTube search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const ids = (searchData.items || [])
        .map((item) => item.id?.videoId)
        .filter(Boolean);

    const detailedVideos = await fetchYoutubeVideoDetails(ids);

    return {
        videos: detailedVideos,
        nextPageToken: searchData.nextPageToken || "",
        prevPageToken: searchData.prevPageToken || "",
        totalResults: searchData.pageInfo?.totalResults || 0,
        resultsPerPage: searchData.pageInfo?.resultsPerPage || 0,
    };
}

async function fetchYoutubeRecommendedVideos(pageToken = "") {
    if (!YOUTUBE_API_KEY) {
        throw new Error("Missing REACT_APP_YOUTUBE_API_KEY in your .env file.");
    }

    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");

    videosUrl.searchParams.set("part", "snippet,contentDetails,statistics,status");
    videosUrl.searchParams.set("chart", "mostPopular");
    videosUrl.searchParams.set("regionCode", DEFAULT_RECOMMENDED_REGION);
    videosUrl.searchParams.set("maxResults", String(RECOMMENDED_PAGE_SIZE));
    videosUrl.searchParams.set("key", YOUTUBE_API_KEY);

    if (pageToken) {
        videosUrl.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(videosUrl.toString());

    if (!response.ok) {
        throw new Error(`YouTube recommended video feed failed: ${response.status}`);
    }

    const data = await response.json();

    return {
        videos: (data.items || []).map(normalizeVideo),
        nextPageToken: data.nextPageToken || "",
        prevPageToken: data.prevPageToken || "",
        totalResults: data.pageInfo?.totalResults || 0,
    };
}



async function fetchYoutubePlaylistItems(playlistId, pageToken = "") {
    if (!YOUTUBE_API_KEY) {
        throw new Error("Missing REACT_APP_YOUTUBE_API_KEY in your .env file.");
    }

    const cleanPlaylistId = String(playlistId || "").trim();

    if (!cleanPlaylistId) {
        throw new Error("Paste a valid YouTube playlist link or playlist ID.");
    }

    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");

    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", cleanPlaylistId);
    url.searchParams.set("maxResults", String(PLAYLIST_PAGE_SIZE));
    url.searchParams.set("key", YOUTUBE_API_KEY);

    if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
        throw new Error(`YouTube playlist lookup failed: ${response.status}`);
    }

    const data = await response.json();
    const ids = (data.items || [])
        .map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
        .filter(Boolean);

    const videos = await fetchYoutubeVideoDetails(ids);

    return {
        videos,
        nextPageToken: data.nextPageToken || "",
        totalResults: data.pageInfo?.totalResults || 0,
    };
}

async function fetchYoutubePlaylistVideos(playlistId, maxPages = PLAYLIST_MAX_PAGES) {
    const videos = [];
    let pageToken = "";
    let totalResults = 0;

    for (let page = 0; page < maxPages; page += 1) {
        const result = await fetchYoutubePlaylistItems(playlistId, pageToken);
        videos.push(...result.videos);
        totalResults = result.totalResults || totalResults;
        pageToken = result.nextPageToken || "";

        if (!pageToken) {
            break;
        }
    }

    return {
        videos: uniqueVideosById(videos),
        nextPageToken: pageToken,
        totalResults: totalResults || videos.length,
    };
}

async function fetchOrganicInterestFeed(pageToken = "", append = false) {
    const interestQueries = getTopInterestQueries(ORGANIC_INTEREST_SEARCH_LIMIT);

    if (!interestQueries.length) {
        return fetchYoutubeRecommendedVideos(pageToken);
    }

    const popular = await fetchYoutubeRecommendedVideos(pageToken);

    if (append) {
        return {
            ...popular,
            queryParts: interestQueries,
            source: "popular-append",
        };
    }

    const groups = await Promise.all(
        interestQueries.map(async (interest) => {
            const result = await fetchYoutubeVideosBySearch(interest, "");
            return shuffleArray(result.videos).slice(0, 8);
        })
    );

    const mixedInterestVideos = interleaveVideoGroups(groups, 42);
    const videos = uniqueVideosById([
        ...mixedInterestVideos,
        ...popular.videos,
    ]).slice(0, RECOMMENDED_PAGE_SIZE);

    return {
        videos,
        nextPageToken: popular.nextPageToken || "",
        prevPageToken: popular.prevPageToken || "",
        totalResults: videos.length,
        queryParts: interestQueries,
        source: "local-interest-profile",
    };
}

async function fetchYoutubeRecommendedVideosFromSavedQueries(savedQueries, perQueryLimit = SAVED_RECOMMENDED_PER_QUERY) {
    const cleanQueries = normalizeSavedRecommendationQueries(savedQueries);

    if (!cleanQueries.length) {
        throw new Error("No saved recommendation queries yet. Search YouTube first, then turn this on again.");
    }

    const shuffledQueries = shuffleArray(cleanQueries);
    const groups = await Promise.all(
        shuffledQueries.map(async (savedQuery) => {
            const result = await fetchYoutubeVideosBySearch(savedQuery, "");
            return shuffleArray(result.videos).slice(0, perQueryLimit);
        })
    );
    const videos = interleaveVideoGroups(groups, RECOMMENDED_PAGE_SIZE);

    return {
        videos,
        nextPageToken: "",
        prevPageToken: "",
        totalResults: videos.length,
        queryParts: shuffledQueries,
    };
}

async function fetchAutoPlaylistVideos(rawQuery, perQueryLimit = 12) {
    const queryParts = splitAutoPlaylistQueries(rawQuery);

    if (!queryParts.length) {
        throw new Error("Type a query first. Use | to mix multiple searches, like Playboi Carti | Trippie Redd.");
    }

    const results = await Promise.all(
        queryParts.map(async (queryPart) => {
            const result = await fetchYoutubeVideosBySearch(`${queryPart} music`, "");
            return result.videos.slice(0, perQueryLimit);
        })
    );

    return {
        queryParts,
        videos: interleaveVideoGroups(results, Math.max(1, perQueryLimit * queryParts.length)),
    };
}

export default function YoutubePage() {
    const playerRef = useRef(null);
    const playerContainerRef = useRef(null);
    const playerMountNodeRef = useRef(null);
    const playerShellRef = useRef(null);
    const loadMoreSentinelRef = useRef(null);
    const wakeLockRef = useRef(null);
    const initialLocalSessionRef = useRef(readYoutubeLocalSession());
    const restoredVideoCueRequestedRef = useRef(false);
    const playerReadyRef = useRef(false);
    const pendingPlayerCommandRef = useRef(null);
    const playerTransitionTimerRef = useRef(null);
    const playerProgressTimerRef = useRef(null);
    const draggedPlaylistIndexRef = useRef(-1);

    const videosRef = useRef(
        uniqueVideosById([
            ...(initialLocalSessionRef.current.selectedVideo ? [initialLocalSessionRef.current.selectedVideo] : []),
            ...(initialLocalSessionRef.current.playlist || []),
        ])
    );
    const recommendedVideosRef = useRef([]);
    const playlistRef = useRef(initialLocalSessionRef.current.playlist || []);
    const selectedVideoRef = useRef(initialLocalSessionRef.current.selectedVideo || null);
    const activePlaylistIndexRef = useRef(initialLocalSessionRef.current.activePlaylistIndex);
    const playbackModeRef = useRef(initialLocalSessionRef.current.playbackMode || "browse");
    const repeatVideoRef = useRef(false);
    const loopPlaylistRef = useRef(true);
    const nextPageTokenRef = useRef("");
    const recommendedNextPageTokenRef = useRef("");
    const useSavedQueryRecommendationsRef = useRef(
        readBooleanCookie(SAVED_RECOMMENDATIONS_TOGGLE_COOKIE, false)
    );
    const savedRecommendationQueriesRef = useRef(readSavedRecommendationQueries());
    const loadingMoreRef = useRef(false);
    const activeQueryRef = useRef(initialLocalSessionRef.current.activeQuery || "");
    const keepAwakeWantedRef = useRef(false);
    const useInterestDiscoveryRef = useRef(
        readBooleanCookie(ORGANIC_INTERESTS_TOGGLE_COOKIE, true)
    );

    const [query, setQuery] = useState(() => initialLocalSessionRef.current.query || "");
    const [activeQuery, setActiveQuery] = useState(() => initialLocalSessionRef.current.activeQuery || "");
    // The old separate URL field is intentionally replaced by one smart input.

    const [videos, setVideos] = useState(() => videosRef.current);
    const [recommendedVideos, setRecommendedVideos] = useState([]);
    const [nextPageToken, setNextPageToken] = useState("");
    const [recommendedNextPageToken, setRecommendedNextPageToken] = useState("");
    const [totalResults, setTotalResults] = useState(0);
    const [recommendedTotalResults, setRecommendedTotalResults] = useState(0);
    const [useSavedQueryRecommendations, setUseSavedQueryRecommendations] = useState(() =>
        readBooleanCookie(SAVED_RECOMMENDATIONS_TOGGLE_COOKIE, false)
    );
    const [savedRecommendationQueries, setSavedRecommendationQueries] = useState(() =>
        readSavedRecommendationQueries()
    );
    const [useInterestDiscovery, setUseInterestDiscovery] = useState(() =>
        readBooleanCookie(ORGANIC_INTERESTS_TOGGLE_COOKIE, true)
    );
    const [interestQueries, setInterestQueries] = useState(() => getTopInterestQueries(16));
    const [settingsOpen, setSettingsOpen] = useState(false);

    const [selectedVideo, setSelectedVideo] = useState(() => initialLocalSessionRef.current.selectedVideo || null);
    const [playlist, setPlaylist] = useState(() => initialLocalSessionRef.current.playlist || []);
    const [activePlaylistIndex, setActivePlaylistIndex] = useState(() => initialLocalSessionRef.current.activePlaylistIndex);

    const [playbackMode, setPlaybackMode] = useState(() => initialLocalSessionRef.current.playbackMode || "browse");
    const [repeatVideo, setRepeatVideo] = useState(false);
    const [loopPlaylist, setLoopPlaylist] = useState(true);
    const [autoLoadMore, setAutoLoadMore] = useState(true);
    const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(false);
    const [keepAwakeSupported, setKeepAwakeSupported] = useState(false);
    const [playerIframeReady, setPlayerIframeReady] = useState(false);
    const [playerTransitioning, setPlayerTransitioning] = useState(false);
    const [playerChromeVisible, setPlayerChromeVisible] = useState(false);
    const [playerControlsOpen, setPlayerControlsOpen] = useState(false);
    const [isPlayerPlaying, setIsPlayerPlaying] = useState(false);
    const [playerCurrentTime, setPlayerCurrentTime] = useState(() => initialLocalSessionRef.current.playbackPositionSeconds || 0);
    const [playerDuration, setPlayerDuration] = useState(0);
    const [playerVolume, setPlayerVolume] = useState(80);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [availablePlaybackRates, setAvailablePlaybackRates] = useState(DEFAULT_PLAYBACK_RATES);
    const [browseDurationFilter, setBrowseDurationFilter] = useState("any");
    const [browseUploadFilter, setBrowseUploadFilter] = useState("any");
    const [browseRenderLimit, setBrowseRenderLimit] = useState(BROWSE_RENDER_BATCH_SIZE);
    const [searchHistory, setSearchHistory] = useState(() => readSearchHistory());

    const [status, setStatus] = useState(() =>
        initialLocalSessionRef.current.selectedVideo || initialLocalSessionRef.current.playlist.length
            ? "Restored your last query, current video, and playlist from this browser's localStorage."
            : "Search YouTube, or leave the search empty to browse real YouTube recommended videos from the official API."
    );

    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [recommendedLoading, setRecommendedLoading] = useState(false);
    const [autoPlaylistLoading, setAutoPlaylistLoading] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [autoPlaylistLimit, setAutoPlaylistLimit] = useState(12);

    const [playerHeight, setPlayerHeight] = useState(460);
    const [playerColumnPercent, setPlayerColumnPercent] = useState(58);
    const [playerBoxSize, setPlayerBoxSize] = useState({
        width: 0,
        height: 460,
    });
    const [theaterMode, setTheaterMode] = useState(false);

    const [, setExpandedSections] = useState({
        player: true,
        browse: true,
        playlist: false,
        controls: false,
        nowPlaying: false,
    });

    const playerMainColumn = Math.min(86, Math.max(45, playerColumnPercent));
    const playerSideColumn = Math.max(14, 100 - playerMainColumn);
    const playerWideLayout = theaterMode || playerMainColumn >= 74 || playerHeight >= 650;
    const showingRecommendations = !activeQuery.trim();
    const savedQueryRecommendationsReady =
        useSavedQueryRecommendations && savedRecommendationQueries.length > 0;
    const organicInterestReady =
        useInterestDiscovery && !savedQueryRecommendationsReady && interestQueries.length > 0;
    const browseVideos = showingRecommendations ? recommendedVideos : videos;
    const browseNextPageToken = showingRecommendations ? recommendedNextPageToken : nextPageToken;
    const browseTitle = showingRecommendations
        ? savedQueryRecommendationsReady
            ? "Discover from saved searches"
            : organicInterestReady
                ? "Discover from your interests"
                : "Discover popular videos"
        : "Browse results";
    const browseSubtitle = showingRecommendations
        ? recommendedVideos.length
            ? savedQueryRecommendationsReady
                ? `${recommendedVideos.length} videos mixed from ${savedRecommendationQueries.length} saved quer${savedRecommendationQueries.length === 1 ? "y" : "ies"}`
                : organicInterestReady
                    ? `${recommendedVideos.length} videos mixed from local interests and YouTube popular videos`
                    : `${recommendedVideos.length} real YouTube videos loaded${recommendedTotalResults ? ` / ${recommendedTotalResults} possible` : ""}`
            : savedQueryRecommendationsReady
                ? "Saved-query recommendations appear here when there is no active search"
                : organicInterestReady
                    ? "Local interest discovery appears here when there is no active search"
                    : "Real YouTube videos appear here when there is no search query"
        : videos.length
            ? `${videos.length} loaded${totalResults ? ` / ${totalResults} possible` : ""}`
            : "Search results appear here";
    const filteredBrowseVideos = useMemo(() => {
        return browseVideos.filter((video) => (
            videoMatchesDurationFilter(video, browseDurationFilter) &&
            videoMatchesUploadFilter(video, browseUploadFilter)
        ));
    }, [browseVideos, browseDurationFilter, browseUploadFilter]);
    const visibleBrowseVideos = useMemo(() => (
        filteredBrowseVideos.slice(0, browseRenderLimit)
    ), [filteredBrowseVideos, browseRenderLimit]);
    const hasMoreRenderedBrowseVideos = visibleBrowseVideos.length < filteredBrowseVideos.length;
    const playerProgressPercent = playerDuration > 0
        ? Math.min(100, Math.max(0, (playerCurrentTime / playerDuration) * 100))
        : 0;

    const selectedVideoInPlaylist = useMemo(() => {
        if (!selectedVideo?.id) return false;
        return playlist.some((item) => item.id === selectedVideo.id);
    }, [playlist, selectedVideo]);

    useEffect(() => {
        writeYoutubeLocalSession({
            query,
            activeQuery,
            selectedVideo,
            playlist,
            playbackMode,
            activePlaylistIndex,
            playbackPositionSeconds: selectedVideo ? playerCurrentTime : 0,
        });
    }, [query, activeQuery, selectedVideo, playlist, playbackMode, activePlaylistIndex, playerCurrentTime]);

    useEffect(() => {
        videosRef.current = videos;
    }, [videos]);

    useEffect(() => {
        recommendedVideosRef.current = recommendedVideos;
    }, [recommendedVideos]);

    useEffect(() => {
        useSavedQueryRecommendationsRef.current = useSavedQueryRecommendations;
        setCookieValue(
            SAVED_RECOMMENDATIONS_TOGGLE_COOKIE,
            useSavedQueryRecommendations ? "1" : "0",
            365
        );
    }, [useSavedQueryRecommendations]);

    useEffect(() => {
        savedRecommendationQueriesRef.current = savedRecommendationQueries;
    }, [savedRecommendationQueries]);

    useEffect(() => {
        useInterestDiscoveryRef.current = useInterestDiscovery;
        setCookieValue(
            ORGANIC_INTERESTS_TOGGLE_COOKIE,
            useInterestDiscovery ? "1" : "0",
            365
        );
    }, [useInterestDiscovery]);

    useEffect(() => {
        playlistRef.current = playlist;
    }, [playlist]);

    useEffect(() => {
        selectedVideoRef.current = selectedVideo;
    }, [selectedVideo]);

    useEffect(() => {
        activePlaylistIndexRef.current = activePlaylistIndex;
    }, [activePlaylistIndex]);

    useEffect(() => {
        playbackModeRef.current = playbackMode;
    }, [playbackMode]);

    useEffect(() => {
        repeatVideoRef.current = repeatVideo;
    }, [repeatVideo]);

    useEffect(() => {
        loopPlaylistRef.current = loopPlaylist;
    }, [loopPlaylist]);

    useEffect(() => {
        nextPageTokenRef.current = nextPageToken;
    }, [nextPageToken]);

    useEffect(() => {
        recommendedNextPageTokenRef.current = recommendedNextPageToken;
    }, [recommendedNextPageToken]);

    useEffect(() => {
        activeQueryRef.current = activeQuery;
    }, [activeQuery]);

    useEffect(() => {
        setBrowseRenderLimit(BROWSE_RENDER_BATCH_SIZE);
    }, [activeQuery, showingRecommendations, browseDurationFilter, browseUploadFilter]);

    useEffect(() => {
        return () => {
            if (playerTransitionTimerRef.current) {
                window.clearTimeout(playerTransitionTimerRef.current);
            }

            if (playerProgressTimerRef.current) {
                window.clearInterval(playerProgressTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        function handleGlobalKeyboard(event) {
            const target = event.target;
            const tagName = String(target?.tagName || "").toLowerCase();
            const isTyping =
                tagName === "input" ||
                tagName === "textarea" ||
                target?.isContentEditable ||
                target?.getAttribute?.("role") === "textbox";

            if (isTyping || event.altKey || event.ctrlKey || event.metaKey) return;

            const key = event.key.toLowerCase();

            if (event.code === "Space" || key === "k") {
                event.preventDefault();
                togglePlayerPlayback();
                return;
            }

            if (key === "j") {
                event.preventDefault();
                seekPlayerBy(-5);
                return;
            }

            if (key === "l") {
                event.preventDefault();
                seekPlayerBy(5);
                return;
            }

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                playPreviousVideoFromCurrentContext();
                return;
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                playNextVideoFromCurrentContext();
            }
        }

        window.addEventListener("keydown", handleGlobalKeyboard);

        return () => {
            window.removeEventListener("keydown", handleGlobalKeyboard);
        };
    }, [playerCurrentTime, playerDuration, playbackMode, selectedVideo, activePlaylistIndex]);

    useEffect(() => {
        function cueRestoredVideo() {
            const restoredVideo = selectedVideoRef.current;

            if (!restoredVideo?.id || restoredVideoCueRequestedRef.current) return;

            restoredVideoCueRequestedRef.current = true;
            createOrLoadPlayer(
                restoredVideo.id,
                false,
                initialLocalSessionRef.current.playbackPositionSeconds || 0
            );
            setStatus(
                `Restored ${restoredVideo.title || "your last YouTube video"}. Press play to continue from the saved session.`
            );
        }

        window.onYouTubeIframeAPIReady = () => {
            setStatus("YouTube player API is ready.");
            cueRestoredVideo();
            flushPendingPlayerCommand();
        };

        if (!window.YT) {
            const script = document.createElement("script");

            script.src = "https://www.youtube.com/iframe_api";
            script.async = true;
            document.body.appendChild(script);
        } else if (window.YT?.Player) {
            cueRestoredVideo();
            flushPendingPlayerCommand();
        }

        return () => {
            destroyCurrentYoutubePlayer(false);
        };
    }, []);

    useEffect(() => {
        const node = playerShellRef.current;

        if (!node || typeof ResizeObserver === "undefined") {
            return undefined;
        }

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];

            if (!entry) return;

            const rect = entry.contentRect;

            setPlayerBoxSize({
                width: Math.round(rect.width),
                height: Math.round(rect.height),
            });
        });

        observer.observe(node);

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        const player = playerRef.current;

        if (!isUsableYoutubePlayer(player) || typeof player.setSize !== "function") return;

        const width = Math.max(320, playerBoxSize.width || 720);
        const height = Math.max(280, playerHeight || 460);

        try {
            player.setSize(width, height);
        } catch {
            // Some embedded states ignore setSize until ready.
        }
    }, [playerBoxSize.width, playerHeight]);

    useEffect(() => {
        if (recommendedVideosRef.current.length) return;
        loadRecommendedVideos(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!autoLoadMore) return undefined;

        const node = loadMoreSentinelRef.current;

        if (!node) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.some((entry) => entry.isIntersecting);

                if (visible && !loadingMoreRef.current) {
                    if (activeQueryRef.current.trim() && nextPageTokenRef.current) {
                        handleLoadMore();
                        return;
                    }

                    if (!activeQueryRef.current.trim() && recommendedNextPageTokenRef.current) {
                        loadRecommendedVideos(true);
                    }
                }
            },
            {
                root: null,
                rootMargin: "700px",
                threshold: 0,
            }
        );

        observer.observe(node);

        return () => {
            observer.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoLoadMore, activeQuery, videos.length, recommendedVideos.length, nextPageToken, recommendedNextPageToken]);

    useEffect(() => {
        setKeepAwakeSupported(typeof navigator !== "undefined" && "wakeLock" in navigator);
    }, []);

    useEffect(() => {
        async function handleVisibilityChange() {
            if (
                document.visibilityState === "visible" &&
                keepAwakeWantedRef.current &&
                !wakeLockRef.current
            ) {
                await requestScreenWakeLock();
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return () => {
            keepAwakeWantedRef.current = false;

            try {
                wakeLockRef.current?.release?.();
            } catch {
                // Safe cleanup.
            }
        };
    }, []);

    function renderPanel(section, icon, title, subtitle, children) {
        return (
            <Card
                id={`${section}-panel`}
                component="section"
                aria-label={title}
                elevation={0}
                sx={{
                    borderRadius: 5,
                    overflow: "hidden",
                    background: "rgba(15,23,42,0.72)",
                    border: "1px solid rgba(148,163,184,0.16)",
                    color: "#fff",
                    boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
                }}
            >
                <CardContent sx={{ p: { xs: 2.5, md: 3.2 } }}>
                    <Stack spacing={2.2}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Box
                                sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 3,
                                    display: "grid",
                                    placeItems: "center",
                                    background: "rgba(103,232,249,0.12)",
                                    border: "1px solid rgba(103,232,249,0.18)",
                                    color: "#67e8f9",
                                    flexShrink: 0,
                                }}
                            >
                                {icon}
                            </Box>

                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 950, fontSize: { xs: "1rem", md: "1.12rem" } }}>
                                    {title}
                                </Typography>
                                {subtitle && (
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "rgba(255,255,255,0.58)", mt: 0.2 }}
                                    >
                                        {subtitle}
                                    </Typography>
                                )}
                            </Box>
                        </Stack>

                        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                        {children}
                    </Stack>
                </CardContent>
            </Card>
        );
    }

    function refreshInterestQueries() {
        setInterestQueries(getTopInterestQueries(16));
    }

    async function toggleInterestDiscovery(event) {
        const enabled = event.target.checked;

        setUseInterestDiscovery(enabled);
        useInterestDiscoveryRef.current = enabled;
        setCookieValue(ORGANIC_INTERESTS_TOGGLE_COOKIE, enabled ? "1" : "0", 365);

        if (!activeQueryRef.current.trim()) {
            setRecommendedVideos([]);
            recommendedVideosRef.current = [];
            setRecommendedNextPageToken("");
            recommendedNextPageTokenRef.current = "";
            setRecommendedTotalResults(0);
            await loadRecommendedVideos(false);
            return;
        }

        setStatus(
            enabled
                ? "Local interest discovery is on. Clear the search to discover videos from this browser's interests."
                : "Local interest discovery is off. Clear the search to use saved searches or YouTube popular videos."
        );
    }

    function clearInterestDiscoveryProfile() {
        clearLocalInterestProfile();
        setInterestQueries([]);

        if (!activeQueryRef.current.trim() && useInterestDiscoveryRef.current && !useSavedQueryRecommendationsRef.current) {
            setRecommendedVideos([]);
            recommendedVideosRef.current = [];
            setRecommendedNextPageToken("");
            recommendedNextPageTokenRef.current = "";
            setRecommendedTotalResults(0);
        }

        setStatus("Local interest discovery was cleared from this browser.");
    }

    async function requestScreenWakeLock() {
        if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
            keepAwakeWantedRef.current = false;
            wakeLockRef.current = null;
            setKeepAwakeEnabled(false);
            setStatus("No Dim mode is not supported in this browser. On iPhone, keep the tab visible and use Safari when possible.");
            return false;
        }

        if (document.visibilityState !== "visible") {
            setStatus("No Dim mode can only start while this tab is visible.");
            return false;
        }

        if (wakeLockRef.current) {
            setKeepAwakeEnabled(true);
            return true;
        }

        try {
            const lock = await navigator.wakeLock.request("screen");

            wakeLockRef.current = lock;
            keepAwakeWantedRef.current = true;
            setKeepAwakeEnabled(true);
            setStatus("No Dim mode is on. Keep this tab visible and your phone should stay awake while YouTube plays.");

            lock.addEventListener("release", () => {
                if (wakeLockRef.current === lock) {
                    wakeLockRef.current = null;
                }

                setKeepAwakeEnabled(false);

                if (keepAwakeWantedRef.current && document.visibilityState === "visible") {
                    setStatus("No Dim mode was released by the browser or system. Tap the toggle again if the screen starts dimming.");
                }
            });

            return true;
        } catch (error) {
            wakeLockRef.current = null;
            keepAwakeWantedRef.current = false;
            setKeepAwakeEnabled(false);
            setStatus(
                `No Dim mode could not start: ${error?.name || "Error"}${
                    error?.message ? ` - ${error.message}` : ""
                }`
            );
            return false;
        }
    }

    async function releaseScreenWakeLock(showMessage = true) {
        keepAwakeWantedRef.current = false;

        try {
            await wakeLockRef.current?.release?.();
        } catch {
            // Safe cleanup.
        }

        wakeLockRef.current = null;
        setKeepAwakeEnabled(false);

        if (showMessage) {
            setStatus("No Dim mode is off. Your phone may dim or auto-lock normally.");
        }
    }

    async function toggleScreenWakeLock() {
        if (wakeLockRef.current || keepAwakeEnabled) {
            await releaseScreenWakeLock(true);
            return;
        }

        keepAwakeWantedRef.current = true;
        await requestScreenWakeLock();
    }

    function applyIframePlaybackPermissions(player) {
        try {
            const iframe = player?.getIframe?.();

            if (!iframe) return;

            iframe.setAttribute(
                "allow",
                "autoplay; encrypted-media; fullscreen; picture-in-picture"
            );
            iframe.setAttribute("allowfullscreen", "true");
            iframe.setAttribute("webkitallowfullscreen", "true");
            iframe.setAttribute("mozallowfullscreen", "true");
        } catch {
            // Some embedded states do not expose the iframe immediately.
        }
    }

    function startPlayerResize(event) {
        event.preventDefault();

        const startX = event.clientX;
        const startY = event.clientY;
        const startColumn = playerMainColumn;
        const startHeight = playerHeight;

        function handlePointerMove(moveEvent) {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            const nextColumn = Math.min(86, Math.max(45, startColumn + deltaX / 12));
            const nextHeight = Math.min(900, Math.max(300, startHeight + deltaY));

            setPlayerColumnPercent(nextColumn);
            setPlayerHeight(nextHeight);
        }

        function handlePointerUp() {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
            window.removeEventListener("blur", handlePointerUp);
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
        window.addEventListener("blur", handlePointerUp);
    }

    function resetPlayerSize() {
        setTheaterMode(false);
        setPlayerColumnPercent(58);
        setPlayerHeight(460);
        setStatus("YouTube player size reset.");
    }

    function isUsableYoutubePlayer(player) {
        if (
            !player ||
            typeof player.loadVideoById !== "function" ||
            typeof player.cueVideoById !== "function" ||
            typeof player.getIframe !== "function"
        ) {
            return false;
        }

        try {
            const iframe = player.getIframe();
            return Boolean(iframe && iframe.isConnected);
        } catch {
            return false;
        }
    }

    function ensurePlayerMountNode(forceNew = false) {
        const wrapper = playerContainerRef.current;

        if (!wrapper) return null;

        const existingMount = playerMountNodeRef.current;

        if (!forceNew && existingMount?.isConnected) {
            return existingMount;
        }

        // This wrapper is intentionally an empty host owned by the YouTube API.
        // React placeholders are rendered as siblings, so clearing this host will
        // not remove the visible fallback iframe or break the next render.
        wrapper.innerHTML = "";

        const mountNode = document.createElement("div");
        mountNode.style.width = "100%";
        mountNode.style.height = "100%";
        mountNode.style.display = "block";
        mountNode.setAttribute("data-aml-youtube-player-mount", "true");

        wrapper.appendChild(mountNode);
        playerMountNodeRef.current = mountNode;

        return mountNode;
    }

    function destroyCurrentYoutubePlayer(resetMount = false) {
        const player = playerRef.current;

        try {
            if (player && typeof player.destroy === "function") {
                player.destroy();
            }
        } catch {
            // A stale YouTube iframe can throw while being destroyed after tab visibility changes.
        } finally {
            playerRef.current = null;
            playerReadyRef.current = false;
            setPlayerIframeReady(false);
            setIsPlayerPlaying(false);
        }

        if (resetMount && playerContainerRef.current) {
            ensurePlayerMountNode(true);
        }
    }

    function refreshPlayerSnapshot(player = playerRef.current) {
        if (!isUsableYoutubePlayer(player)) return;

        try {
            if (typeof player.getCurrentTime === "function") {
                setPlayerCurrentTime(Number(player.getCurrentTime() || 0));
            }

            if (typeof player.getDuration === "function") {
                setPlayerDuration(Number(player.getDuration() || 0));
            }

            if (typeof player.getVolume === "function") {
                setPlayerVolume(Number(player.getVolume() || 0));
            }

            if (typeof player.getPlaybackRate === "function") {
                setPlaybackRate(Number(player.getPlaybackRate() || 1));
            }

            if (typeof player.getAvailablePlaybackRates === "function") {
                const rates = player.getAvailablePlaybackRates();

                if (Array.isArray(rates) && rates.length) {
                    setAvailablePlaybackRates(rates);
                }
            }

            if (typeof player.getPlayerState === "function" && window.YT?.PlayerState) {
                setIsPlayerPlaying(player.getPlayerState() === window.YT.PlayerState.PLAYING);
            }
        } catch {
            // Ignore transient YouTube API reads while an iframe swaps videos.
        }
    }

    function startPlayerProgressPolling(player = playerRef.current) {
        if (playerProgressTimerRef.current) {
            window.clearInterval(playerProgressTimerRef.current);
        }

        refreshPlayerSnapshot(player);
        playerProgressTimerRef.current = window.setInterval(() => {
            refreshPlayerSnapshot(playerRef.current);
        }, PLAYER_PROGRESS_POLL_MS);
    }

    function togglePlayerPlayback() {
        const player = playerRef.current;

        if (!isUsableYoutubePlayer(player)) {
            if (selectedVideoRef.current?.id) {
                createOrLoadPlayer(selectedVideoRef.current.id, true, playerCurrentTime);
            } else {
                setStatus("Select a YouTube video first, then use keyboard playback controls.");
            }

            return;
        }

        try {
            const state = typeof player.getPlayerState === "function"
                ? player.getPlayerState()
                : null;

            if (state === window.YT?.PlayerState?.PLAYING) {
                player.pauseVideo();
                setIsPlayerPlaying(false);
                setStatus("Paused YouTube playback.");
            } else {
                player.playVideo();
                setIsPlayerPlaying(true);
                setStatus("Playing YouTube video.");
            }
        } catch {
            setStatus("The YouTube player did not accept the play/pause command. Tap the embedded player once and try again.");
        }
    }

    function seekPlayerTo(seconds) {
        const player = playerRef.current;

        if (!isUsableYoutubePlayer(player)) return;

        const nextTime = Math.min(
            Math.max(0, Number(seconds || 0)),
            playerDuration || Number.MAX_SAFE_INTEGER
        );

        try {
            player.seekTo(nextTime, true);
            setPlayerCurrentTime(nextTime);
        } catch {
            setStatus("The YouTube player could not seek right now.");
        }
    }

    function seekPlayerBy(deltaSeconds) {
        seekPlayerTo((playerCurrentTime || 0) + Number(deltaSeconds || 0));
    }

    function setYoutubePlayerVolume(nextVolume) {
        const cleanVolume = Math.min(100, Math.max(0, Number(nextVolume || 0)));
        const player = playerRef.current;

        setPlayerVolume(cleanVolume);

        if (!isUsableYoutubePlayer(player)) return;

        try {
            player.setVolume(cleanVolume);

            if (cleanVolume > 0 && typeof player.unMute === "function") {
                player.unMute();
            }
        } catch {
            setStatus("The YouTube player could not update volume right now.");
        }
    }

    function setYoutubePlaybackRate(rate) {
        const cleanRate = Number(rate || 1);
        const player = playerRef.current;

        setPlaybackRate(cleanRate);

        if (!isUsableYoutubePlayer(player)) return;

        try {
            player.setPlaybackRate(cleanRate);
            setStatus(`Playback speed set to ${cleanRate}x.`);
        } catch {
            setStatus("This embedded YouTube video does not support that playback speed.");
        }
    }

    async function togglePictureInPicture() {
        const player = playerRef.current;

        if (document.pictureInPictureElement) {
            try {
                await document.exitPictureInPicture();
                setStatus("Picture-in-picture closed.");
            } catch {
                setStatus("Could not close picture-in-picture from this tab.");
            }

            return;
        }

        try {
            const iframe = isUsableYoutubePlayer(player) ? player.getIframe() : null;

            if (iframe && typeof iframe.requestPictureInPicture === "function") {
                await iframe.requestPictureInPicture();
                setStatus("Picture-in-picture opened.");
                return;
            }
        } catch {
            // Fall through to the practical browser limitation message below.
        }

        setStatus("Browser PiP is not exposed for this YouTube iframe. Use the YouTube player's built-in mini-player/PiP controls when available.");
    }

    function togglePlayerControls() {
        setPlayerControlsOpen((current) => {
            const nextOpen = !current;
            setStatus(nextOpen ? "Custom player controls opened." : "Custom player controls hidden.");
            return nextOpen;
        });
    }

    function showPlayerChrome() {
        setPlayerChromeVisible(true);
    }

    function hidePlayerChrome() {
        setPlayerChromeVisible(false);
        setPlayerControlsOpen(false);
    }

    function handlePlayerShellBlur(event) {
        if (event.currentTarget.contains(event.relatedTarget)) {
            return;
        }

        hidePlayerChrome();
    }

    function runYoutubePlayerCommand(player, videoId, shouldPlay = true, startSeconds = 0) {
        if (!isUsableYoutubePlayer(player)) {
            throw new Error("The current YouTube iframe player is stale and must be rebuilt.");
        }

        const cleanVideoId = String(videoId || "").trim();
        const cleanStartSeconds = Math.max(0, Number(startSeconds || 0));
        const commandPayload = cleanStartSeconds > 0
            ? { videoId: cleanVideoId, startSeconds: cleanStartSeconds }
            : cleanVideoId;

        applyIframePlaybackPermissions(player);
        setPlayerIframeReady(true);

        try {
            if (typeof player.setVolume === "function") {
                player.setVolume(playerVolume);
            }

            if (typeof player.setPlaybackRate === "function") {
                player.setPlaybackRate(playbackRate);
            }
        } catch {
            // Volume/rate can fail during early iframe setup; polling will recover state.
        }

        if (shouldPlay) {
            player.loadVideoById(commandPayload);
        } else {
            player.cueVideoById(commandPayload);
        }
    }

    function flushPendingPlayerCommand() {
        const pendingCommand = pendingPlayerCommandRef.current;

        if (!pendingCommand) return;

        pendingPlayerCommandRef.current = null;
        createOrLoadPlayer(
            pendingCommand.videoId,
            pendingCommand.shouldPlay,
            pendingCommand.startSeconds
        );
    }

    function createOrLoadPlayer(videoId, shouldPlay = true, startSeconds = 0) {
        const cleanVideoId = String(videoId || "").trim();
        const cleanStartSeconds = Math.max(0, Number(startSeconds || 0));

        if (!cleanVideoId) {
            setStatus("Select or paste a valid YouTube video before starting playback.");
            return;
        }

        if (!window.YT || !window.YT.Player) {
            pendingPlayerCommandRef.current = {
                videoId: cleanVideoId,
                shouldPlay,
                startSeconds: cleanStartSeconds,
            };
            setStatus("YouTube player is still loading. Playback will start when the iframe API is ready.");
            return;
        }

        const currentPlayer = playerRef.current;

        if (currentPlayer && !isUsableYoutubePlayer(currentPlayer)) {
            destroyCurrentYoutubePlayer(true);
        }

        if (isUsableYoutubePlayer(playerRef.current)) {
            try {
                runYoutubePlayerCommand(playerRef.current, cleanVideoId, shouldPlay, cleanStartSeconds);
                return;
            } catch {
                destroyCurrentYoutubePlayer(true);
            }
        }

        if (!playerContainerRef.current) {
            pendingPlayerCommandRef.current = {
                videoId: cleanVideoId,
                shouldPlay,
                startSeconds: cleanStartSeconds,
            };
            setStatus("The YouTube player container is not ready yet. Playback will retry automatically.");
            return;
        }

        const mountNode = ensurePlayerMountNode(true);

        if (!mountNode) {
            pendingPlayerCommandRef.current = {
                videoId: cleanVideoId,
                shouldPlay,
                startSeconds: cleanStartSeconds,
            };
            setStatus("The YouTube player mount node is not ready yet. Playback will retry automatically.");
            return;
        }

        try {
            playerReadyRef.current = false;
            setPlayerIframeReady(false);

            playerRef.current = new window.YT.Player(mountNode, {
                width: "100%",
                height: String(playerHeight),
                videoId: cleanVideoId,
                playerVars: {
                    playsinline: 1,
                    controls: 1,
                    rel: 0,
                    modestbranding: 1,
                    enablejsapi: 1,
                    origin: window.location.origin,
                },
                events: {
                    onReady: (event) => {
                        playerRef.current = event.target;
                        playerReadyRef.current = true;
                        setPlayerIframeReady(true);
                        applyIframePlaybackPermissions(event.target);
                        startPlayerProgressPolling(event.target);

                        try {
                            runYoutubePlayerCommand(
                                event.target,
                                cleanVideoId,
                                shouldPlay,
                                cleanStartSeconds
                            );
                        } catch {
                            setStatus("The YouTube iframe loaded, but playback could not start. Tap the video once, then try again.");
                        }
                    },
                    onStateChange: (event) => {
                        refreshPlayerSnapshot(event.target);

                        if (event.data === window.YT.PlayerState.PLAYING) {
                            setIsPlayerPlaying(true);
                        }

                        if (
                            event.data === window.YT.PlayerState.PAUSED ||
                            event.data === window.YT.PlayerState.CUED
                        ) {
                            setIsPlayerPlaying(false);
                        }

                        if (event.data === window.YT.PlayerState.ENDED) {
                            setIsPlayerPlaying(false);
                            handleVideoEnded(event.target);
                        }
                    },
                    onError: () => {
                        setPlayerIframeReady(false);
                        setStatus("YouTube could not play this video in the embedded player. Try another video or open it on YouTube.");
                    },
                    onAutoplayBlocked: () => {
                        setStatus("Playback was blocked by the browser. Tap Play on the YouTube player once, then try again.");
                    },
                },
            });
        } catch {
            destroyCurrentYoutubePlayer(true);
            pendingPlayerCommandRef.current = {
                videoId: cleanVideoId,
                shouldPlay,
                startSeconds: cleanStartSeconds,
            };
            setStatus("The YouTube iframe had to be rebuilt. Click Play again if it does not start automatically.");
        }
    }

    function loadVideo(video, options = {}) {
        if (!video?.id) return;

        const mode = options.mode || playbackModeRef.current;
        const playlistIndex =
            typeof options.playlistIndex === "number"
                ? options.playlistIndex
                : activePlaylistIndexRef.current;

        setSelectedVideo(video);
        selectedVideoRef.current = video;
        setPlaybackMode(mode);
        playbackModeRef.current = mode;

        if (mode === "playlist") {
            setActivePlaylistIndex(playlistIndex);
            activePlaylistIndexRef.current = playlistIndex;
        } else {
            setActivePlaylistIndex(-1);
            activePlaylistIndexRef.current = -1;
        }

        setExpandedSections((current) => ({
            ...current,
            player: true,
            nowPlaying: true,
        }));

        rememberVideoInterest(video, options.sourceQuery || activeQueryRef.current);
        refreshInterestQueries();

        if (!video.embeddable) {
            setStatus("This video is marked as not embeddable, so it may not play here.");
        } else if (mode === "playlist") {
            setStatus(`Playing playlist item ${playlistIndex + 1}: ${video.title}`);
        } else if (showingRecommendations) {
            setStatus(`Playing recommended YouTube video: ${video.title}`);
        } else {
            setStatus(`Browsing YouTube: ${video.title}`);
        }

        if (playerTransitionTimerRef.current) {
            window.clearTimeout(playerTransitionTimerRef.current);
        }

        setPlayerTransitioning(true);
        playerTransitionTimerRef.current = window.setTimeout(() => {
            createOrLoadPlayer(video.id, true, Number(options.startSeconds || 0));
            playerTransitionTimerRef.current = window.setTimeout(() => {
                setPlayerTransitioning(false);
            }, PLAYER_TRANSITION_MS);
        }, PLAYER_TRANSITION_MS);
    }

    function handleVideoEnded(player) {
        if (repeatVideoRef.current) {
            setStatus("Repeat video is on. Restarting this YouTube video.");
            player.seekTo(0);
            player.playVideo();
            return;
        }

        if (playbackModeRef.current === "playlist") {
            playNextPlaylistVideo(true);
            return;
        }

        playNextBrowseVideoFromCurrentList();
    }

    function playNextBrowseVideoFromCurrentList() {
        const list = activeQueryRef.current.trim() ? videosRef.current : recommendedVideosRef.current;
        const currentId = selectedVideoRef.current?.id;

        if (!list.length) {
            setStatus("Video finished. No browse videos are loaded yet.");
            return;
        }

        const currentIndex = list.findIndex((video) => video.id === currentId);
        const nextIndex = currentIndex >= 0 && currentIndex < list.length - 1 ? currentIndex + 1 : 0;

        loadVideo(list[nextIndex], {
            mode: "browse",
        });
    }

    async function loadRecommendedVideos(append = false) {
        if (loadingMoreRef.current && append) return;

        const savedQueries = savedRecommendationQueriesRef.current;
        const interestQueriesSnapshot = getTopInterestQueries(ORGANIC_INTEREST_SEARCH_LIMIT);
        const useSavedFeed = useSavedQueryRecommendationsRef.current && savedQueries.length > 0;
        const useOrganicInterestFeed =
            !useSavedFeed && useInterestDiscoveryRef.current && interestQueriesSnapshot.length > 0;

        try {
            loadingMoreRef.current = append;
            setRecommendedLoading(!append);
            setLoadingMore(append);
            setStatus(
                useSavedFeed
                    ? append
                        ? "Loading more saved-search recommendations..."
                        : "Loading Discover from saved searches..."
                    : useOrganicInterestFeed
                        ? append
                            ? "Loading more YouTube popular videos for Discover..."
                            : "Building Discover from local interests and YouTube popular videos..."
                        : append
                            ? "Loading more popular YouTube videos..."
                            : "Loading YouTube popular videos..."
            );

            const pageToken = append ? recommendedNextPageTokenRef.current : "";
            const result = useSavedFeed
                ? await fetchYoutubeRecommendedVideosFromSavedQueries(savedQueries)
                : useOrganicInterestFeed
                    ? await fetchOrganicInterestFeed(pageToken, append)
                    : await fetchYoutubeRecommendedVideos(pageToken);
            const nextVideos = append
                ? uniqueVideosById([...recommendedVideosRef.current, ...result.videos])
                : result.videos;

            setRecommendedVideos(nextVideos);
            recommendedVideosRef.current = nextVideos;
            setRecommendedNextPageToken(useSavedFeed ? "" : result.nextPageToken);
            recommendedNextPageTokenRef.current = useSavedFeed ? "" : result.nextPageToken;
            setRecommendedTotalResults(result.totalResults || nextVideos.length || 0);
            setActiveQuery("");
            activeQueryRef.current = "";

            setStatus(
                result.videos.length
                    ? useSavedFeed
                        ? `Loaded ${result.videos.length} Discover videos from saved quer${savedQueries.length === 1 ? "y" : "ies"}: ${savedQueries.slice(0, 4).join(" + ")}${savedQueries.length > 4 ? " + more" : ""}.`
                        : useOrganicInterestFeed
                            ? `Loaded ${result.videos.length} Discover videos from local interests: ${interestQueriesSnapshot.slice(0, 4).join(" + ")}${interestQueriesSnapshot.length > 4 ? " + more" : ""}.`
                            : append
                                ? `Loaded ${result.videos.length} more popular videos from YouTube.`
                                : `Loaded ${result.videos.length} popular videos from YouTube. These come from the official API, not hardcoded placeholders.`
                    : useSavedFeed
                        ? "No videos were returned from your saved recommendation queries. Try saving a broader search."
                        : useOrganicInterestFeed
                            ? "No videos were returned from your local interest feed. Try searching or playing a few broader topics."
                            : "No recommended videos were returned from YouTube."
            );
        } catch (error) {
            if (useSavedQueryRecommendationsRef.current && !savedQueries.length) {
                setStatus("Saved-query recommendations are on, but no searches are saved yet. Search YouTube once to save a query, or turn the toggle off for the popular feed.");
            } else {
                setStatus(error?.message || "Could not load recommended YouTube videos.");
            }
        } finally {
            loadingMoreRef.current = false;
            setRecommendedLoading(false);
            setLoadingMore(false);
        }
    }

    function rememberRecommendationQueries(rawValue) {
        const nextQueries = mergeSavedRecommendationQueries(
            savedRecommendationQueriesRef.current,
            rawValue
        );

        writeSavedRecommendationQueries(nextQueries);
        savedRecommendationQueriesRef.current = nextQueries;
        setSavedRecommendationQueries(nextQueries);

        return nextQueries;
    }

    function clearSavedRecommendationQueries() {
        deleteCookieValue(SAVED_RECOMMENDATION_QUERIES_COOKIE);
        savedRecommendationQueriesRef.current = [];
        setSavedRecommendationQueries([]);

        if (useSavedQueryRecommendationsRef.current) {
            setRecommendedVideos([]);
            recommendedVideosRef.current = [];
            setRecommendedNextPageToken("");
            recommendedNextPageTokenRef.current = "";
            setRecommendedTotalResults(0);
        }

        setStatus("Saved recommendation queries were cleared from this site's cookie.");
    }

    async function toggleSavedQueryRecommendations(event) {
        const enabled = event.target.checked;

        setUseSavedQueryRecommendations(enabled);
        useSavedQueryRecommendationsRef.current = enabled;
        setCookieValue(SAVED_RECOMMENDATIONS_TOGGLE_COOKIE, enabled ? "1" : "0", 365);
        setRecommendedVideos([]);
        recommendedVideosRef.current = [];
        setRecommendedNextPageToken("");
        recommendedNextPageTokenRef.current = "";
        setRecommendedTotalResults(0);

        if (enabled && !savedRecommendationQueriesRef.current.length) {
            setStatus("Saved-query recommendations are on, but no searches are saved yet. Search once to save a query.");
            return;
        }

        if (!activeQueryRef.current.trim()) {
            await loadRecommendedVideos(false);
            return;
        }

        setStatus(
            enabled
                ? "Saved-query recommendations are on. Clear the search to see videos selected from saved cookie queries."
                : "Saved-query recommendations are off. Clear the search to use YouTube's popular recommendation feed."
        );
    }

    async function handleSearch(submittedQuery = query) {
        const cleanQuery = String(submittedQuery || "").trim();

        if (!cleanQuery) {
            setActiveQuery("");
            activeQueryRef.current = "";

            if (!recommendedVideosRef.current.length) {
                await loadRecommendedVideos(false);
            } else {
                setStatus("Search is empty. Showing real recommended YouTube videos in the Browse container.");
            }

            return;
        }

        try {
            setLoading(true);
            setStatus("Searching YouTube...");
            const result = await fetchYoutubeVideosBySearch(cleanQuery);
            rememberRecommendationQueries(cleanQuery);
            setSearchHistory((current) => addSearchHistoryItem(cleanQuery, current));
            addInterestSignal(cleanQuery, 3);
            refreshInterestQueries();

            setVideos(result.videos);
            videosRef.current = result.videos;
            setActiveQuery(cleanQuery);
            activeQueryRef.current = cleanQuery;
            setNextPageToken(result.nextPageToken);
            nextPageTokenRef.current = result.nextPageToken;
            setTotalResults(result.totalResults || 0);
            setExpandedSections((current) => ({ ...current, browse: true }));

            setStatus(
                result.videos.length
                    ? `Found ${result.videos.length} videos for "${cleanQuery}". Scroll down to keep loading more results.`
                    : `No videos found for "${cleanQuery}".`
            );
        } catch (error) {
            setStatus(error?.message || "YouTube search failed.");
        } finally {
            setLoading(false);
        }
    }

    async function handleLoadMore() {
        const cleanQuery = activeQueryRef.current.trim();
        const token = nextPageTokenRef.current;

        if (!cleanQuery || !token || loadingMoreRef.current) {
            return;
        }

        try {
            loadingMoreRef.current = true;
            setLoadingMore(true);
            setStatus("Loading more YouTube results...");

            const result = await fetchYoutubeVideosBySearch(cleanQuery, token);

            setVideos((current) => uniqueVideosById([...current, ...result.videos]));
            videosRef.current = uniqueVideosById([...videosRef.current, ...result.videos]);
            setNextPageToken(result.nextPageToken);
            nextPageTokenRef.current = result.nextPageToken;
            setTotalResults(result.totalResults || totalResults);

            setStatus(
                result.nextPageToken
                    ? `Loaded ${result.videos.length} more videos. Keep scrolling for more.`
                    : "Loaded the last available page for this search."
            );
        } catch (error) {
            setStatus(error?.message || "Could not load more YouTube results.");
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }

    async function loadMoreCurrentBrowse() {
        if (showingRecommendations) {
            await loadRecommendedVideos(true);
            return;
        }

        await handleLoadMore();
    }


    async function loadVideoById(videoId, startSeconds = 0) {
        if (!videoId) {
            setStatus("Paste a valid YouTube video URL or 11-character video ID.");
            return;
        }

        try {
            setLoading(true);
            setStatus("Loading YouTube video from the smart input...");

            const details = await fetchYoutubeVideoDetails([videoId]);
            const video = details[0] || buildFallbackVideo(videoId);

            setVideos((current) => uniqueVideosById([video, ...current]));
            videosRef.current = uniqueVideosById([video, ...videosRef.current]);
            setActiveQuery("Direct link");
            activeQueryRef.current = "Direct link";

            loadVideo(video, {
                mode: "browse",
                startSeconds,
                sourceQuery: "",
            });
        } catch (error) {
            const fallback = buildFallbackVideo(videoId);

            setVideos((current) => uniqueVideosById([fallback, ...current]));
            videosRef.current = uniqueVideosById([fallback, ...videosRef.current]);
            setActiveQuery("Direct link");
            activeQueryRef.current = "Direct link";

            loadVideo(fallback, {
                mode: "browse",
                startSeconds,
                sourceQuery: "",
            });

            setStatus(
                `Loaded a basic YouTube embed from the smart input. Metadata lookup failed: ${
                    error?.message || "unknown error"
                }`
            );
        } finally {
            setLoading(false);
        }
    }

    async function loadMultipleVideoLinks(videoIds) {
        const cleanIds = Array.from(new Set(videoIds || [])).filter(Boolean);

        if (!cleanIds.length) {
            setStatus("No valid YouTube video links were found in that paste.");
            return;
        }

        try {
            setLoading(true);
            setStatus(`Loading ${cleanIds.length} pasted YouTube link${cleanIds.length === 1 ? "" : "s"}...`);

            const details = await fetchYoutubeVideoDetails(cleanIds);
            const foundIds = new Set(details.map((video) => video.id));
            const fallbacks = cleanIds
                .filter((id) => !foundIds.has(id))
                .map((id) => buildFallbackVideo(id));
            const nextVideos = uniqueVideosById([...details, ...fallbacks]);
            const nextPlaylist = nextVideos.map((video) => ({
                ...video,
                playlistId: makePlaylistId(),
            }));

            setVideos((current) => uniqueVideosById([...nextVideos, ...current]));
            videosRef.current = uniqueVideosById([...nextVideos, ...videosRef.current]);
            setPlaylist((current) => [...current, ...nextPlaylist]);
            playlistRef.current = [...playlistRef.current, ...nextPlaylist];
            setPlaybackMode("playlist");
            playbackModeRef.current = "playlist";
            setActiveQuery("Pasted links");
            activeQueryRef.current = "Pasted links";
            setExpandedSections((current) => ({
                ...current,
                player: true,
                browse: true,
                playlist: true,
            }));

            if (nextPlaylist[0]) {
                loadVideo(nextPlaylist[0], {
                    mode: "playlist",
                    playlistIndex: Math.max(0, playlistRef.current.length - nextPlaylist.length),
                    sourceQuery: "",
                });
            }

            setStatus(`Loaded ${nextVideos.length} pasted YouTube video${nextVideos.length === 1 ? "" : "s"} and added them to your playlist.`);
        } catch (error) {
            setStatus(error?.message || "Could not load pasted YouTube links.");
        } finally {
            setLoading(false);
        }
    }

    async function loadYouTubePlaylist(playlistId, autoplay = true) {
        try {
            setLoading(true);
            setStatus("Loading YouTube playlist from the smart input...");

            const result = await fetchYoutubePlaylistVideos(playlistId);
            const nextPlaylist = result.videos.map((video) => ({
                ...video,
                playlistId: makePlaylistId(),
            }));

            setPlaylist(nextPlaylist);
            playlistRef.current = nextPlaylist;
            setVideos((current) => uniqueVideosById([...result.videos, ...current]));
            videosRef.current = uniqueVideosById([...result.videos, ...videosRef.current]);
            setPlaybackMode("playlist");
            playbackModeRef.current = "playlist";
            setActiveQuery("YouTube playlist");
            activeQueryRef.current = "YouTube playlist";

            setExpandedSections((current) => ({
                ...current,
                player: true,
                browse: true,
                playlist: true,
                controls: false,
            }));

            if (autoplay && nextPlaylist[0]) {
                loadVideo(nextPlaylist[0], {
                    mode: "playlist",
                    playlistIndex: 0,
                    sourceQuery: "",
                });
            }

            setStatus(
                result.nextPageToken
                    ? `Loaded the first ${nextPlaylist.length} embeddable videos from that YouTube playlist. Large playlists are capped for speed.`
                    : `Loaded ${nextPlaylist.length} videos from that YouTube playlist.`
            );
        } catch (error) {
            setStatus(error?.message || "Could not load that YouTube playlist.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSmartSubmit() {
        const parsed = parseYouTubeInput(query);

        if (parsed.type === "empty") {
            clearSearchAndShowRecommended();
            return;
        }

        if (parsed.type === "search") {
            await handleSearch();
            return;
        }

        if (parsed.type === "video") {
            await loadVideoById(parsed.videoId, parsed.startSeconds);
            return;
        }

        if (parsed.type === "videoList") {
            await loadMultipleVideoLinks(parsed.videoIds);
            return;
        }

        if (parsed.type === "playlist") {
            await loadYouTubePlaylist(parsed.playlistId);
            return;
        }

        if (parsed.type === "videoInPlaylist") {
            await loadVideoById(parsed.videoId, parsed.startSeconds);
            await loadYouTubePlaylist(parsed.playlistId, false);
        }
    }

    async function createAutoPlaylistFromQuery() {
        const cleanQuery = query.trim();

        if (!cleanQuery) {
            setStatus("Type a query first. Use | to mix multiple searches, like Playboi Carti | Trippie Redd.");
            setHelpOpen(true);
            return;
        }

        try {
            setAutoPlaylistLoading(true);
            setStatus("Building auto playlist from your query...");

            const result = await fetchAutoPlaylistVideos(cleanQuery, autoPlaylistLimit);
            rememberRecommendationQueries(result.queryParts);
            setSearchHistory((current) => addSearchHistoryItem(cleanQuery, current));
            result.queryParts.forEach((part) => addInterestSignal(part, 3));
            refreshInterestQueries();

            if (!result.videos.length) {
                setStatus("No videos were found for that auto playlist query.");
                return;
            }

            const nextPlaylist = result.videos.map((video) => ({
                ...video,
                playlistId: makePlaylistId(),
            }));

            setVideos((current) => uniqueVideosById([...result.videos, ...current]));
            videosRef.current = uniqueVideosById([...result.videos, ...videosRef.current]);
            setPlaylist(nextPlaylist);
            playlistRef.current = nextPlaylist;

            setPlaybackMode("playlist");
            playbackModeRef.current = "playlist";

            setActivePlaylistIndex(0);
            activePlaylistIndexRef.current = 0;

            setExpandedSections((current) => ({
                ...current,
                player: true,
                playlist: true,
                controls: true,
            }));

            setStatus(
                result.queryParts.length > 1
                    ? `Created an auto playlist mixing ${result.queryParts.join(" + ")}. Playing the first video now.`
                    : `Created an auto playlist for ${result.queryParts[0]}. Playing the first video now.`
            );

            loadVideo(nextPlaylist[0], {
                mode: "playlist",
                playlistIndex: 0,
            });
        } catch (error) {
            setStatus(error?.message || "Could not create auto playlist.");
        } finally {
            setAutoPlaylistLoading(false);
        }
    }

    function clearSearchAndShowRecommended() {
        setQuery("");
        setActiveQuery("");
        activeQueryRef.current = "";

        if (!recommendedVideosRef.current.length) {
            loadRecommendedVideos(false);
        } else {
            setStatus(
                useSavedQueryRecommendationsRef.current && savedRecommendationQueriesRef.current.length
                    ? "Search cleared. Showing recommended videos selected from saved cookie queries inside Browse videos."
                    : "Search cleared. Showing real recommended YouTube videos inside Browse videos."
            );
        }
    }

    function addVideoToPlaylist(video) {
        if (!video?.id) return;

        rememberVideoInterest(video, activeQueryRef.current);
        refreshInterestQueries();

        setPlaylist((current) => {
            if (current.some((item) => item.id === video.id)) {
                setStatus("That video is already in the playlist.");
                return current;
            }

            const nextItem = {
                ...video,
                playlistId: makePlaylistId(),
            };

            setStatus(`Added to playlist: ${video.title}`);
            return [...current, nextItem];
        });
    }

    function runHistorySearch(historyQuery) {
        setQuery(historyQuery);
        handleSearch(historyQuery);
    }

    function addAllVisibleToPlaylist() {
        if (!visibleBrowseVideos.length) {
            setStatus("Search, load, or browse recommended videos first.");
            return;
        }

        setPlaylist((current) => {
            const existingIds = new Set(current.map((item) => item.id));
            const nextItems = visibleBrowseVideos
                .filter((video) => video?.id && !existingIds.has(video.id))
                .map((video) => ({
                    ...video,
                    playlistId: makePlaylistId(),
                }));

            setStatus(`Added ${nextItems.length} visible filtered video(s) to the playlist.`);
            return [...current, ...nextItems];
        });
    }

    function removePlaylistItem(playlistId) {
        const currentIndex = activePlaylistIndexRef.current;

        setPlaylist((current) => {
            const removedIndex = current.findIndex((item) => item.playlistId === playlistId);
            const nextList = current.filter((item) => item.playlistId !== playlistId);

            if (removedIndex === currentIndex) {
                setActivePlaylistIndex(-1);
                activePlaylistIndexRef.current = -1;
            } else if (removedIndex >= 0 && removedIndex < currentIndex) {
                setActivePlaylistIndex(currentIndex - 1);
                activePlaylistIndexRef.current = currentIndex - 1;
            }

            return nextList;
        });
    }

    function movePlaylistItem(fromIndex, toIndex) {
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

        setPlaylist((current) => {
            if (fromIndex >= current.length || toIndex >= current.length) return current;

            const nextList = [...current];
            const [movedItem] = nextList.splice(fromIndex, 1);
            nextList.splice(toIndex, 0, movedItem);

            const activeId = selectedVideoRef.current?.playlistId || selectedVideoRef.current?.id;
            const nextActiveIndex = nextList.findIndex((item) => (
                item.playlistId === activeId || item.id === selectedVideoRef.current?.id
            ));

            if (nextActiveIndex >= 0) {
                setActivePlaylistIndex(nextActiveIndex);
                activePlaylistIndexRef.current = nextActiveIndex;
            }

            setStatus(`Moved playlist item to position ${toIndex + 1}.`);
            return nextList;
        });
    }

    function handlePlaylistDragStart(event, index) {
        draggedPlaylistIndexRef.current = index;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
    }

    function handlePlaylistDrop(event, index) {
        event.preventDefault();

        const fromIndex = Number(event.dataTransfer.getData("text/plain"));
        const dragIndex = Number.isFinite(fromIndex) ? fromIndex : draggedPlaylistIndexRef.current;

        movePlaylistItem(dragIndex, index);
        draggedPlaylistIndexRef.current = -1;
    }

    function clearPlaylist() {
        setPlaylist([]);
        setActivePlaylistIndex(-1);
        activePlaylistIndexRef.current = -1;
        setStatus("Playlist cleared.");
    }

    function playPlaylistItem(index) {
        const item = playlistRef.current[index];

        if (!item) {
            setStatus("That playlist item is not available.");
            return;
        }

        loadVideo(item, {
            mode: "playlist",
            playlistIndex: index,
        });
    }

    function playPreviousPlaylistVideo() {
        const list = playlistRef.current;

        if (!list.length) {
            setStatus("Playlist is empty. Add YouTube videos to playlist first.");
            return;
        }

        const currentIndex = activePlaylistIndexRef.current;
        const previousIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1;

        playPlaylistItem(previousIndex);
    }

    function playNextPlaylistVideo(fromEndedEvent = false) {
        const list = playlistRef.current;

        if (!list.length) {
            setStatus("Playlist is empty. Add YouTube videos to playlist first.");
            return;
        }

        const currentIndex = activePlaylistIndexRef.current;
        let nextIndex = 0;

        if (currentIndex >= 0 && currentIndex < list.length - 1) {
            nextIndex = currentIndex + 1;
        } else if (currentIndex >= list.length - 1) {
            if (!loopPlaylistRef.current && fromEndedEvent) {
                setStatus("Playlist finished. Playlist looping is off.");
                return;
            }

            nextIndex = 0;
        }

        playPlaylistItem(nextIndex);
    }

    function playPreviousBrowseVideoFromCurrentList() {
        const list = activeQueryRef.current.trim() ? videosRef.current : recommendedVideosRef.current;
        const currentId = selectedVideoRef.current?.id;

        if (!list.length) {
            setStatus("No browse videos are loaded yet.");
            return;
        }

        const currentIndex = list.findIndex((video) => video.id === currentId);
        const previousIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1;

        loadVideo(list[previousIndex], {
            mode: "browse",
        });
    }

    function playNextVideoFromCurrentContext() {
        if (playbackModeRef.current === "playlist") {
            playNextPlaylistVideo(false);
            return;
        }

        playNextBrowseVideoFromCurrentList();
    }

    function playPreviousVideoFromCurrentContext() {
        if (playbackModeRef.current === "playlist") {
            playPreviousPlaylistVideo();
            return;
        }

        playPreviousBrowseVideoFromCurrentList();
    }

    function playSelectedAsBrowse() {
        const video = selectedVideoRef.current;

        if (!video) {
            setStatus("Select a YouTube result or recommended video first.");
            return;
        }

        loadVideo(video, {
            mode: "browse",
        });
    }

    function switchToPlaylistPlayback() {
        const list = playlistRef.current;

        if (!list.length) {
            setStatus("Add videos to the playlist before switching to playlist playback.");
            return;
        }

        const index = activePlaylistIndexRef.current >= 0 ? activePlaylistIndexRef.current : 0;

        playPlaylistItem(index);
    }

    function openSelectedOnYouTube() {
        const video = selectedVideoRef.current;
        const link = buildYoutubeWatchUrl(video?.id);

        if (!link) return;

        window.open(link, "_blank", "noopener,noreferrer");
    }

    async function copySelectedVideoLink() {
        const video = selectedVideoRef.current;
        const link = buildYoutubeWatchUrl(video?.id);

        if (!link) {
            setStatus("Select a YouTube video first, then copy its link.");
            return;
        }

        try {
            if (!navigator?.clipboard?.writeText) {
                throw new Error("Clipboard API unavailable");
            }

            await navigator.clipboard.writeText(link);
            setStatus("Copied the current YouTube video link.");
        } catch {
            setStatus(`Copy this YouTube link: ${link}`);
        }
    }

    function renderVideoCard(video, source = "browse", index = -1) {
        const active = selectedVideo?.id === video.id;
        const inPlaylist = playlist.some((item) => item.id === video.id);

        return (
            <Box
                key={`${source}-${video.playlistId || video.id}`}
                role="button"
                tabIndex={0}
                draggable={source === "playlist"}
                onDragStart={(event) => {
                    if (source === "playlist") {
                        handlePlaylistDragStart(event, index);
                    }
                }}
                onDragOver={(event) => {
                    if (source === "playlist") {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                    }
                }}
                onDrop={(event) => {
                    if (source === "playlist") {
                        handlePlaylistDrop(event, index);
                    }
                }}
                sx={{
                    display: "grid",
                    gridTemplateColumns: "112px minmax(0, 1fr)",
                    gap: 1.5,
                    p: 1.2,
                    borderRadius: 3,
                    cursor: "pointer",
                    background: active ? "rgba(103,232,249,0.14)" : "rgba(255,255,255,0.055)",
                    border: active
                        ? "1px solid rgba(103,232,249,0.3)"
                        : "1px solid rgba(255,255,255,0.08)",
                }}
                onClick={() =>
                    source === "playlist"
                        ? playPlaylistItem(index)
                        : loadVideo(video, { mode: "browse" })
                }
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        source === "playlist"
                            ? playPlaylistItem(index)
                            : loadVideo(video, { mode: "browse" });
                    }
                }}
            >
                <Box sx={{ position: "relative", width: 112, height: 64 }}>
                    <Box
                        component="img"
                        src={video.thumbnail}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        sx={{
                            width: 112,
                            height: 64,
                            borderRadius: 2,
                            objectFit: "cover",
                            background: "#000",
                        }}
                    />

                    {source === "playlist" && (
                        <Tooltip title="Drag to reorder playlist">
                            <Box
                                sx={{
                                    position: "absolute",
                                    left: 5,
                                    top: 5,
                                    width: 24,
                                    height: 24,
                                    borderRadius: 2,
                                    display: "grid",
                                    placeItems: "center",
                                    color: "#fff",
                                    background: "rgba(0,0,0,0.58)",
                                    border: "1px solid rgba(255,255,255,0.18)",
                                }}
                            >
                                <DragIndicatorRoundedIcon fontSize="small" />
                            </Box>
                        </Tooltip>
                    )}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontWeight: 900,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                        }}
                    >
                        {source === "playlist" ? `${index + 1}. ` : ""}
                        {video.title}
                    </Typography>

                    <Typography
                        variant="caption"
                        sx={{
                            color: "rgba(255,255,255,0.58)",
                            display: "block",
                            mt: 0.35,
                        }}
                    >
                        {video.channelTitle}
                        {video.duration ? ` • ${video.duration}` : ""}
                        {video.viewCount ? ` • ${formatCount(video.viewCount)} views` : ""}
                    </Typography>

                    {!video.embeddable && (
                        <Typography
                            variant="caption"
                            sx={{
                                display: "block",
                                color: "#fca5a5",
                                mt: 0.5,
                            }}
                        >
                            May not be embeddable
                        </Typography>
                    )}

                    <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1 }}>
                        {source === "browse" && (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PlayArrowRoundedIcon />}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    loadVideo(video, { mode: "browse" });
                                }}
                                sx={{
                                    borderRadius: 999,
                                    color: "#fff",
                                    borderColor: "rgba(255,255,255,0.18)",
                                    fontWeight: 900,
                                }}
                            >
                                Play now
                            </Button>
                        )}

                        {source === "browse" && (
                            <Button
                                size="small"
                                variant={inPlaylist ? "contained" : "outlined"}
                                startIcon={<PlaylistAddRoundedIcon />}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    addVideoToPlaylist(video);
                                }}
                                sx={{
                                    borderRadius: 999,
                                    color: inPlaylist ? "#06111e" : "#fff",
                                    borderColor: "rgba(255,255,255,0.18)",
                                    fontWeight: 900,
                                    background: inPlaylist
                                        ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                        : "transparent",
                                }}
                            >
                                {inPlaylist ? "Saved" : "Add"}
                            </Button>
                        )}

                        {source === "playlist" && (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PlayArrowRoundedIcon />}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    playPlaylistItem(index);
                                }}
                                sx={{
                                    borderRadius: 999,
                                    color: "#fff",
                                    borderColor: "rgba(255,255,255,0.18)",
                                    fontWeight: 900,
                                }}
                            >
                                Play
                            </Button>
                        )}

                        {source === "playlist" && (
                            <Tooltip title="Remove from playlist">
                                <IconButton
                                    aria-label="Remove video from playlist"
                                    size="small"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        removePlaylistItem(video.playlistId);
                                    }}
                                    sx={{
                                        color: "rgba(255,255,255,0.72)",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                    }}
                                >
                                    <DeleteRoundedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Box>
            </Box>
        );
    }

    return (
        <>
            <Dialog
                open={helpOpen}
                onClose={() => setHelpOpen(false)}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        borderRadius: 5,
                        background:
                            "linear-gradient(135deg, rgba(13,18,36,0.98), rgba(18,25,52,0.96))",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#fff",
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 950, letterSpacing: "-0.03em" }}>
                    Auto playlist query help
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={2}>
                        <Typography sx={{ color: "rgba(255,255,255,0.76)", lineHeight: 1.75 }}>
                            Type one search to build a playlist from that topic, artist, or song style.
                            Use the vertical bar character <strong>|</strong> to mix results from multiple
                            searches into one playlist.
                        </Typography>

                        <Box
                            sx={{
                                borderRadius: 4,
                                p: 2,
                                background: "rgba(103,232,249,0.1)",
                                border: "1px solid rgba(103,232,249,0.18)",
                            }}
                        >
                            <Typography sx={{ fontWeight: 950, mb: 0.75 }}>
                                Examples
                            </Typography>

                            <Typography sx={{ color: "rgba(255,255,255,0.74)", lineHeight: 1.8 }}>
                                Playboi Carti | Trippie Redd
                                <br />
                                Future | Young Thug | Lil Uzi Vert
                                <br />
                                jazz fusion | city pop | vaporwave
                                <br />
                                type beat dark trap | rage beat | underground rap
                            </Typography>
                        </Box>

                        <Typography sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.75 }}>
                            The auto playlist button searches each part, mixes the returned videos together
                            in alternating order, saves them to your local playlist, switches to playlist
                            playback, and starts playing the first item. Browse and recommended videos can
                            still be played immediately with Play now without adding them to the playlist.
                        </Typography>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        onClick={() => setHelpOpen(false)}
                        variant="contained"
                        sx={{
                            borderRadius: 999,
                            color: "#06111e",
                            fontWeight: 950,
                            background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                        }}
                    >
                        Got it
                    </Button>
                </DialogActions>
            </Dialog>


            <Drawer
                anchor="right"
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: "100%", sm: 430 },
                        background: "linear-gradient(180deg, #0f172a, #070a13)",
                        color: "#fff",
                        borderLeft: "1px solid rgba(255,255,255,0.12)",
                        p: 2.2,
                    },
                }}
            >
                <Stack spacing={2.2} role="region" aria-label="YouTube browser settings">
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: "-0.035em" }}>
                                Settings
                            </Typography>
                            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.62)", mt: 0.4 }}>
                                Advanced controls are here so the main page stays easier to use.
                            </Typography>
                        </Box>

                        <IconButton
                            aria-label="Close settings"
                            onClick={() => setSettingsOpen(false)}
                            sx={{ color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
                        >
                            <DeleteRoundedIcon />
                        </IconButton>
                    </Stack>

                    <Alert
                        severity="info"
                        icon={<AutoAwesomeRoundedIcon />}
                        sx={{
                            borderRadius: 3,
                            background: "rgba(103,232,249,0.1)",
                            color: "#dff9ff",
                            border: "1px solid rgba(103,232,249,0.18)",
                            "& .MuiAlert-icon": { color: "#67e8f9" },
                        }}
                    >
                        The smart input accepts searches, YouTube videos, Shorts, Live links, Music YouTube links,
                        playlist links, and multiple pasted video links.
                    </Alert>

                    <Box sx={{ p: 2, borderRadius: 4, background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <Stack spacing={1.4}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <ShuffleRoundedIcon sx={{ color: "#67e8f9" }} />
                                <Typography sx={{ fontWeight: 950 }}>Auto playlist</Typography>
                            </Stack>

                            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.6 }}>
                                Use the main smart input to type one search or mix searches with |, then build a playlist from those terms.
                            </Typography>

                            <TextField
                                value={autoPlaylistLimit}
                                onChange={(event) => {
                                    const nextValue = Number(event.target.value);
                                    if (Number.isFinite(nextValue)) {
                                        setAutoPlaylistLimit(Math.min(25, Math.max(3, nextValue)));
                                    }
                                }}
                                label="Videos per query"
                                type="number"
                                variant="filled"
                                disabled={autoPlaylistLoading}
                                InputLabelProps={{ sx: { color: "rgba(255,255,255,0.62)" } }}
                                inputProps={{ min: 3, max: 25, step: 1, "aria-label": "Videos per query for auto playlist" }}
                                InputProps={{
                                    sx: {
                                        color: "#fff",
                                        borderRadius: 3,
                                        background: "rgba(255,255,255,0.08)",
                                    },
                                }}
                            />

                            <Stack direction="row" flexWrap="wrap" gap={1}>
                                <Button
                                    variant="contained"
                                    startIcon={
                                        autoPlaylistLoading ? (
                                            <CircularProgress size={18} sx={{ color: "#06111e" }} />
                                        ) : (
                                            <ShuffleRoundedIcon />
                                        )
                                    }
                                    onClick={createAutoPlaylistFromQuery}
                                    disabled={autoPlaylistLoading || loading || loadingMore}
                                    sx={{
                                        borderRadius: 999,
                                        minHeight: 44,
                                        fontWeight: 950,
                                        color: "#06111e",
                                        background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                    }}
                                >
                                    Build auto playlist
                                </Button>

                                <Button
                                    variant="outlined"
                                    startIcon={<HelpOutlineRoundedIcon />}
                                    onClick={() => setHelpOpen(true)}
                                    sx={{ borderRadius: 999, minHeight: 44, color: "#fff", borderColor: "rgba(255,255,255,0.18)", fontWeight: 900 }}
                                >
                                    Help
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>

                    <Box sx={{ p: 2, borderRadius: 4, background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <Stack spacing={1.4}>
                            <Typography sx={{ fontWeight: 950 }}>Saved search discovery</Typography>
                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.62)" }}>
                                Optional cookie-based feed using only searches from this site.
                            </Typography>

                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                <Typography sx={{ fontWeight: 900 }}>
                                    {useSavedQueryRecommendations ? "Saved search feed on" : "Saved search feed off"}
                                </Typography>
                                <Switch
                                    checked={useSavedQueryRecommendations}
                                    onChange={toggleSavedQueryRecommendations}
                                    inputProps={{ "aria-label": "Toggle saved search recommendations from settings" }}
                                />
                            </Stack>

                            <Stack direction="row" flexWrap="wrap" gap={0.75}>
                                {savedRecommendationQueries.length ? (
                                    savedRecommendationQueries.slice(0, 10).map((savedQuery) => (
                                        <Chip key={savedQuery} size="small" label={savedQuery} sx={{ color: "#fff", background: "rgba(255,255,255,0.08)" }} />
                                    ))
                                ) : (
                                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.58)" }}>
                                        No saved searches yet.
                                    </Typography>
                                )}
                            </Stack>

                            <Stack direction="row" flexWrap="wrap" gap={1}>
                                <Button
                                    variant="outlined"
                                    disabled={!savedRecommendationQueries.length || recommendedLoading}
                                    onClick={() => loadRecommendedVideos(false)}
                                    sx={{ borderRadius: 999, color: "#fff", borderColor: "rgba(255,255,255,0.18)", fontWeight: 900 }}
                                >
                                    Refresh feed
                                </Button>

                                <Button
                                    variant="text"
                                    disabled={!savedRecommendationQueries.length}
                                    onClick={clearSavedRecommendationQueries}
                                    sx={{ borderRadius: 999, color: "rgba(255,255,255,0.72)", fontWeight: 900 }}
                                >
                                    Clear saved
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>

                    <Box sx={{ p: 2, borderRadius: 4, background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <Stack spacing={1.4}>
                            <Typography sx={{ fontWeight: 950 }}>Discover privacy</Typography>

                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                <Box>
                                    <Typography sx={{ fontWeight: 900 }}>Local interest discovery</Typography>
                                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.62)" }}>
                                        Uses only this browser. No cross-site cookie reading.
                                    </Typography>
                                </Box>
                                <Switch
                                    checked={useInterestDiscovery}
                                    onChange={toggleInterestDiscovery}
                                    inputProps={{ "aria-label": "Toggle local interest discovery from settings" }}
                                />
                            </Stack>

                            <Stack direction="row" flexWrap="wrap" gap={0.75}>
                                {interestQueries.length ? (
                                    interestQueries.slice(0, 10).map((interest) => (
                                        <Chip key={interest} size="small" label={interest} sx={{ color: "#fff", background: "rgba(255,255,255,0.08)" }} />
                                    ))
                                ) : (
                                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.58)" }}>
                                        No local interests stored yet.
                                    </Typography>
                                )}
                            </Stack>

                            <Button
                                variant="outlined"
                                startIcon={<ClearAllRoundedIcon />}
                                disabled={!interestQueries.length}
                                onClick={clearInterestDiscoveryProfile}
                                sx={{ borderRadius: 999, color: "#fff", borderColor: "rgba(255,255,255,0.18)", fontWeight: 900 }}
                            >
                                Clear local interests
                            </Button>
                        </Stack>
                    </Box>

                    <Box sx={{ p: 2, borderRadius: 4, background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <Stack spacing={1.4}>
                            <Typography sx={{ fontWeight: 950 }}>Playback</Typography>

                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography sx={{ fontWeight: 900 }}>Repeat current video</Typography>
                                <Switch checked={repeatVideo} onChange={(event) => setRepeatVideo(event.target.checked)} inputProps={{ "aria-label": "Toggle repeat video from settings" }} />
                            </Stack>

                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography sx={{ fontWeight: 900 }}>Loop playlist</Typography>
                                <Switch checked={loopPlaylist} onChange={(event) => setLoopPlaylist(event.target.checked)} inputProps={{ "aria-label": "Toggle playlist loop from settings" }} />
                            </Stack>

                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography sx={{ fontWeight: 900 }}>Endless loading</Typography>
                                <Switch checked={autoLoadMore} onChange={(event) => setAutoLoadMore(event.target.checked)} inputProps={{ "aria-label": "Toggle endless loading from settings" }} />
                            </Stack>

                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography sx={{ fontWeight: 900 }}>No Dim / screen awake</Typography>
                                <Switch checked={keepAwakeEnabled} disabled={!keepAwakeSupported} onChange={toggleScreenWakeLock} inputProps={{ "aria-label": "Toggle no dim mode from settings" }} />
                            </Stack>

                            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                            <Stack direction="row" flexWrap="wrap" gap={1}>
                                <Button
                                    variant="outlined"
                                    startIcon={<RepeatRoundedIcon />}
                                    onClick={playSelectedAsBrowse}
                                    disabled={!selectedVideo}
                                    sx={{ borderRadius: 999, color: "#fff", borderColor: "rgba(255,255,255,0.18)", fontWeight: 900 }}
                                >
                                    Browse mode
                                </Button>

                                <Button
                                    variant="outlined"
                                    startIcon={<QueueMusicRoundedIcon />}
                                    onClick={switchToPlaylistPlayback}
                                    disabled={!playlist.length}
                                    sx={{ borderRadius: 999, color: "#fff", borderColor: "rgba(255,255,255,0.18)", fontWeight: 900 }}
                                >
                                    Playlist mode
                                </Button>

                                <Button
                                    variant="outlined"
                                    startIcon={<SkipPreviousRoundedIcon />}
                                    onClick={playPreviousVideoFromCurrentContext}
                                    sx={{ borderRadius: 999, color: "#fff", borderColor: "rgba(255,255,255,0.18)", fontWeight: 900 }}
                                >
                                    Previous
                                </Button>

                                <Button
                                    variant="outlined"
                                    startIcon={<SkipNextRoundedIcon />}
                                    onClick={playNextVideoFromCurrentContext}
                                    sx={{ borderRadius: 999, color: "#fff", borderColor: "rgba(255,255,255,0.18)", fontWeight: 900 }}
                                >
                                    Next
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>

                    <Box sx={{ p: 2, borderRadius: 4, background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <Stack spacing={1.4}>
                            <Typography sx={{ fontWeight: 950 }}>Player size</Typography>
                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.62)" }}>
                                Width {Math.round(playerMainColumn)}% • Height {Math.round(playerHeight)}px
                            </Typography>
                            <Slider value={playerMainColumn} min={45} max={86} step={1} onChange={(_, nextValue) => setPlayerColumnPercent(Array.isArray(nextValue) ? nextValue[0] : nextValue)} />
                            <Slider value={playerHeight} min={300} max={900} step={10} onChange={(_, nextValue) => setPlayerHeight(Array.isArray(nextValue) ? nextValue[0] : nextValue)} />
                            <Button variant="outlined" onClick={resetPlayerSize} sx={{ borderRadius: 999, color: "#fff", borderColor: "rgba(255,255,255,0.18)", fontWeight: 900 }}>
                                Reset player size
                            </Button>
                        </Stack>
                    </Box>
                </Stack>
            </Drawer>

            <Helmet>
                <title>YouTube Audio Tools | AudioMaster Lab</title>
                <meta
                    name="description"
                    content="Search, load, and manage embeddable YouTube videos in a browser-based audio workspace with saved queries and playlist-style controls."
                />
                <link rel="canonical" href="https://audiomasterlab.com/youtube" />

                <meta property="og:title" content="YouTube Audio Tools | AudioMaster Lab" />
                <meta
                    property="og:description"
                    content="Search YouTube, load embeddable videos, save queries, and manage playback from AudioMaster Lab."
                />
                <meta property="og:url" content="https://audiomasterlab.com/youtube" />
            </Helmet>

            <Box
                component="main"
                sx={{
                    minHeight: "100vh",
                    color: "#fff",
                    background:
                        "radial-gradient(circle at top left, rgba(239,68,68,0.16), transparent 30%), radial-gradient(circle at top right, rgba(103,232,249,0.14), transparent 34%), #070a13",
                    py: { xs: 4, md: 7 },
                }}
            >
                <Container maxWidth="xl">
                    <Box
                        aria-live="polite"
                        aria-atomic="true"
                        sx={{
                            position: "absolute",
                            width: 1,
                            height: 1,
                            p: 0,
                            m: -1,
                            overflow: "hidden",
                            clip: "rect(0 0 0 0)",
                            whiteSpace: "nowrap",
                            border: 0,
                        }}
                    >
                        {status}
                    </Box>

                    <Stack spacing={3}>
                        <Card
                            elevation={0}
                            sx={{
                                borderRadius: 5,
                                background: "rgba(15,23,42,0.72)",
                                border: "1px solid rgba(148,163,184,0.16)",
                                color: "#fff",
                            }}
                        >
                            <CardContent sx={{ p: { xs: 2.5, md: 3.2 } }}>
                                <Stack spacing={2}>
                                    <Stack direction="row" flexWrap="wrap" spacing={1} alignItems="center">
                                        <Chip
                                            icon={<YouTubeIcon />}
                                            label="YouTube browser"
                                            sx={{
                                                color: "#fff",
                                                background: "rgba(239,68,68,0.16)",
                                                border: "1px solid rgba(239,68,68,0.25)",
                                                fontWeight: 900,
                                            }}
                                        />
                                        <Chip
                                            icon={<RecommendRoundedIcon />}
                                            label="Empty search shows real YouTube recommendations"
                                            sx={{
                                                color: "#fff",
                                                background: "rgba(103,232,249,0.12)",
                                                border: "1px solid rgba(103,232,249,0.22)",
                                                fontWeight: 900,
                                            }}
                                        />
                                        <Chip
                                            label="Saved-query recommendations default off"
                                            sx={{
                                                color: "#fff",
                                                background: "rgba(167,139,250,0.12)",
                                                border: "1px solid rgba(167,139,250,0.22)",
                                                fontWeight: 900,
                                            }}
                                        />
                                        <Chip
                                            icon={<KeyboardRoundedIcon />}
                                            label="Space/K play, J/L seek, arrows change video"
                                            sx={{
                                                color: "#fff",
                                                background: "rgba(255,255,255,0.08)",
                                                border: "1px solid rgba(255,255,255,0.12)",
                                                fontWeight: 900,
                                            }}
                                        />
                                    </Stack>

                                    <Typography
                                        variant="h3"
                                        sx={{
                                            fontWeight: 950,
                                            letterSpacing: "-0.055em",
                                            fontSize: { xs: "2rem", md: "3.4rem" },
                                        }}
                                    >
                                        Search YouTube, paste a link, or build a playlist.
                                    </Typography>

                                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                                        <TextField
                                            fullWidth
                                            value={query}
                                            onChange={(event) => setQuery(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                    handleSmartSubmit();
                                                }
                                            }}
                                            label="Search YouTube or paste a link"
                                            placeholder="Search music, paste a YouTube link, shorts link, playlist link, or multiple video links..."
                                            variant="filled"
                                            InputLabelProps={{
                                                sx: { color: "rgba(255,255,255,0.62)" },
                                            }}
                                            InputProps={{
                                                sx: {
                                                    color: "#fff",
                                                    borderRadius: 3,
                                                    background: "rgba(255,255,255,0.08)",
                                                },
                                            }}
                                        />

                                        <Button
                                            variant="contained"
                                            startIcon={<SearchRoundedIcon />}
                                            disabled={loading || loadingMore || recommendedLoading}
                                            onClick={handleSmartSubmit}
                                            sx={{
                                                minWidth: { xs: "100%", md: 170 },
                                                borderRadius: 3,
                                                fontWeight: 950,
                                                color: "#06111e",
                                                background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                            }}
                                        >
                                            {query.trim() ? "Go" : "Discover"}
                                        </Button>

                                        <Button
                                            variant="outlined"
                                            onClick={clearSearchAndShowRecommended}
                                            sx={{
                                                minWidth: { xs: "100%", md: 145 },
                                                borderRadius: 3,
                                                color: "#fff",
                                                borderColor: "rgba(255,255,255,0.18)",
                                                fontWeight: 950,
                                            }}
                                        >
                                            Clear
                                        </Button>

                                        <Button
                                            variant="outlined"
                                            startIcon={<SettingsRoundedIcon />}
                                            onClick={() => setSettingsOpen(true)}
                                            sx={{
                                                minWidth: { xs: "100%", md: 150 },
                                                borderRadius: 3,
                                                color: "#fff",
                                                borderColor: "rgba(255,255,255,0.18)",
                                                fontWeight: 950,
                                            }}
                                        >
                                            Settings
                                        </Button>
                                    </Stack>

                                    {searchHistory.length > 0 && (
                                        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>
                                            <Chip
                                                icon={<HistoryRoundedIcon />}
                                                label="Recent searches"
                                                sx={{
                                                    color: "#fff",
                                                    background: "rgba(255,255,255,0.08)",
                                                    border: "1px solid rgba(255,255,255,0.1)",
                                                    fontWeight: 900,
                                                }}
                                            />

                                            {searchHistory.slice(0, 8).map((historyQuery) => (
                                                <Chip
                                                    key={historyQuery}
                                                    label={historyQuery}
                                                    onClick={() => runHistorySearch(historyQuery)}
                                                    sx={{
                                                        color: "#fff",
                                                        background: "rgba(103,232,249,0.1)",
                                                        border: "1px solid rgba(103,232,249,0.18)",
                                                        fontWeight: 850,
                                                        maxWidth: 220,
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>

                        {(loading || loadingMore || autoPlaylistLoading || recommendedLoading) && <LinearProgress />}

                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    lg: playerWideLayout
                                        ? "1fr"
                                        : `minmax(0, ${playerMainColumn}fr) minmax(360px, ${playerSideColumn}fr)`,
                                },
                                gap: 3,
                                alignItems: "start",
                            }}
                        >
                            <Stack spacing={3}>
                                {renderPanel(
                                    "player",
                                    <YouTubeIcon />,
                                    "Resizable official YouTube player",
                                    `Player: ${playerBoxSize.width || "auto"}px × ${Math.round(playerHeight)}px • ${playerWideLayout ? "wide/theater layout" : "split layout"}`,
                                    <Card
                                        elevation={0}
                                        onMouseEnter={showPlayerChrome}
                                        onMouseLeave={hidePlayerChrome}
                                        onPointerDown={showPlayerChrome}
                                        onFocus={showPlayerChrome}
                                        onBlur={handlePlayerShellBlur}
                                        sx={{
                                            borderRadius: 5,
                                            background: "rgba(0,0,0,0.24)",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            overflow: "hidden",
                                            position: "relative",
                                            pb: "18px",
                                        }}
                                    >
                                        <Box
                                            ref={playerShellRef}
                                            sx={{
                                                width: "100%",
                                                height: playerHeight,
                                                minHeight: 300,
                                                maxHeight: 900,
                                                display: "grid",
                                                placeItems: "center",
                                                background: "#000",
                                                position: "relative",
                                                "& iframe": {
                                                    width: "100% !important",
                                                    height: "100% !important",
                                                    display: "block",
                                                },
                                            }}
                                        >
                                            <Box
                                                ref={playerContainerRef}
                                                sx={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    width: "100%",
                                                    height: "100%",
                                                    zIndex: 2,
                                                    background: "transparent",
                                                    opacity: playerTransitioning ? 0.18 : 1,
                                                    transition: `opacity ${PLAYER_TRANSITION_MS}ms ease`,
                                                    "& iframe": {
                                                        width: "100% !important",
                                                        height: "100% !important",
                                                        display: "block",
                                                        border: 0,
                                                    },
                                                }}
                                            />

                                            {!selectedVideo && (
                                                <Box
                                                    sx={{
                                                        position: "absolute",
                                                        inset: 0,
                                                        display: "grid",
                                                        placeItems: "center",
                                                        zIndex: 1,
                                                        pointerEvents: "none",
                                                    }}
                                                >
                                                    <Typography sx={{ color: "rgba(255,255,255,0.58)", textAlign: "center", px: 2 }}>
                                                        Select a YouTube video or start playlist playback.
                                                    </Typography>
                                                </Box>
                                            )}

                                            {selectedVideo?.id && !playerIframeReady && (
                                                <Box
                                                    component="iframe"
                                                    key={`fallback-youtube-iframe-${selectedVideo.id}`}
                                                    title={selectedVideo.title || "Current YouTube video"}
                                                    src={buildYoutubeEmbedUrl(selectedVideo.id, 0, false)}
                                                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                                                    allowFullScreen
                                                    sx={{
                                                        position: "absolute",
                                                        inset: 0,
                                                        width: "100%",
                                                        height: "100%",
                                                        border: 0,
                                                        zIndex: 1,
                                                        background: "#000",
                                                        opacity: playerTransitioning ? 0.18 : 1,
                                                        transition: `opacity ${PLAYER_TRANSITION_MS}ms ease`,
                                                    }}
                                                />
                                            )}

                                            {selectedVideo?.id && (
                                                <Box
                                                    sx={{
                                                        position: "absolute",
                                                        left: 12,
                                                        right: { xs: 12, sm: 66 },
                                                        bottom: 58,
                                                        zIndex: 5,
                                                        borderRadius: 3,
                                                        p: { xs: 1, md: 1.15 },
                                                        background: "linear-gradient(180deg, rgba(2,6,23,0.82), rgba(2,6,23,0.64))",
                                                        border: "1px solid rgba(255,255,255,0.14)",
                                                        boxShadow: "0 16px 40px rgba(0,0,0,0.36)",
                                                        backdropFilter: "blur(12px)",
                                                        opacity: playerControlsOpen ? 1 : 0,
                                                        pointerEvents: playerControlsOpen ? "auto" : "none",
                                                        transform: playerControlsOpen ? "translateY(0)" : "translateY(calc(100% + 90px))",
                                                        transition: "opacity 220ms ease, transform 260ms ease",
                                                    }}
                                                >
                                                    <Stack spacing={0.8}>
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <Tooltip title={isPlayerPlaying ? "Pause (Space or K)" : "Play (Space or K)"}>
                                                                <IconButton
                                                                    aria-label={isPlayerPlaying ? "Pause YouTube video" : "Play YouTube video"}
                                                                    size="small"
                                                                    onClick={togglePlayerPlayback}
                                                                    sx={{ color: "#fff", border: "1px solid rgba(255,255,255,0.16)" }}
                                                                >
                                                                    {isPlayerPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
                                                                </IconButton>
                                                            </Tooltip>

                                                            <Tooltip title="Previous video (Left arrow)">
                                                                <IconButton
                                                                    aria-label="Previous video"
                                                                    size="small"
                                                                    onClick={playPreviousVideoFromCurrentContext}
                                                                    sx={{ color: "#fff", border: "1px solid rgba(255,255,255,0.16)" }}
                                                                >
                                                                    <SkipPreviousRoundedIcon />
                                                                </IconButton>
                                                            </Tooltip>

                                                            <Tooltip title="Next video (Right arrow)">
                                                                <IconButton
                                                                    aria-label="Next video"
                                                                    size="small"
                                                                    onClick={playNextVideoFromCurrentContext}
                                                                    sx={{ color: "#fff", border: "1px solid rgba(255,255,255,0.16)" }}
                                                                >
                                                                    <SkipNextRoundedIcon />
                                                                </IconButton>
                                                            </Tooltip>

                                                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.78)", minWidth: 92, fontWeight: 850 }}>
                                                                {formatPlayerTime(playerCurrentTime)} / {formatPlayerTime(playerDuration)}
                                                            </Typography>

                                                            <Slider
                                                                size="small"
                                                                aria-label="YouTube playback position"
                                                                value={playerProgressPercent}
                                                                min={0}
                                                                max={100}
                                                                step={0.1}
                                                                onChange={(_, nextValue) => {
                                                                    const percent = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                                                                    const nextTime = playerDuration ? (percent / 100) * playerDuration : 0;
                                                                    setPlayerCurrentTime(nextTime);
                                                                }}
                                                                onChangeCommitted={(_, nextValue) => {
                                                                    const percent = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                                                                    seekPlayerTo(playerDuration ? (percent / 100) * playerDuration : 0);
                                                                }}
                                                                sx={{ color: "#67e8f9", flex: 1, minWidth: 90 }}
                                                            />

                                                            <Tooltip title="Picture-in-picture">
                                                                <IconButton
                                                                    aria-label="Toggle picture in picture"
                                                                    size="small"
                                                                    onClick={togglePictureInPicture}
                                                                    sx={{ color: "#fff", border: "1px solid rgba(255,255,255,0.16)" }}
                                                                >
                                                                    <PictureInPictureAltRoundedIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Stack>

                                                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                                            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: { xs: "100%", sm: 190 }, flex: { xs: "1 1 100%", sm: "0 0 190px" } }}>
                                                                <VolumeUpRoundedIcon fontSize="small" sx={{ color: "rgba(255,255,255,0.76)" }} />
                                                                <Slider
                                                                    size="small"
                                                                    aria-label="YouTube volume"
                                                                    value={playerVolume}
                                                                    min={0}
                                                                    max={100}
                                                                    step={1}
                                                                    onChange={(_, nextValue) => {
                                                                        const value = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                                                                        setYoutubePlayerVolume(value);
                                                                    }}
                                                                    sx={{ color: "#a78bfa" }}
                                                                />
                                                            </Stack>

                                                            <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                                                                <SpeedRoundedIcon fontSize="small" sx={{ color: "rgba(255,255,255,0.76)" }} />
                                                                {availablePlaybackRates.map((rate) => (
                                                                    <Button
                                                                        key={rate}
                                                                        size="small"
                                                                        variant={Number(playbackRate) === Number(rate) ? "contained" : "outlined"}
                                                                        onClick={() => setYoutubePlaybackRate(rate)}
                                                                        sx={{
                                                                            minWidth: 44,
                                                                            px: 1,
                                                                            py: 0.2,
                                                                            borderRadius: 999,
                                                                            color: Number(playbackRate) === Number(rate) ? "#06111e" : "#fff",
                                                                            borderColor: "rgba(255,255,255,0.18)",
                                                                            background: Number(playbackRate) === Number(rate)
                                                                                ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                                                : "transparent",
                                                                            fontWeight: 950,
                                                                        }}
                                                                    >
                                                                        {rate}x
                                                                    </Button>
                                                                ))}
                                                            </Stack>
                                                        </Stack>
                                                    </Stack>
                                                </Box>
                                            )}

                                            <Tooltip title="Drag to resize the video window">
                                                <Box
                                                    onPointerDown={startPlayerResize}
                                                    sx={{
                                                        position: "absolute",
                                                        right: 12,
                                                        bottom: 12,
                                                        width: 42,
                                                        height: 42,
                                                        borderRadius: 3,
                                                        display: "grid",
                                                        placeItems: "center",
                                                        color: "#06111e",
                                                        background:
                                                            "linear-gradient(135deg, rgba(103,232,249,0.95), rgba(167,139,250,0.95))",
                                                        boxShadow: "0 12px 30px rgba(0,0,0,0.38)",
                                                        cursor: "nwse-resize",
                                                        zIndex: 4,
                                                        userSelect: "none",
                                                        touchAction: "none",
                                                        opacity: playerChromeVisible ? 1 : 0,
                                                        pointerEvents: playerChromeVisible ? "auto" : "none",
                                                        transition: "opacity 180ms ease",
                                                    }}
                                                >
                                                    <OpenWithRoundedIcon />
                                                </Box>
                                            </Tooltip>
                                        </Box>

                                        {selectedVideo?.id && (
                                            <Tooltip title={playerControlsOpen ? "Hide custom controls" : "Show custom controls"}>
                                                <IconButton
                                                    onClick={togglePlayerControls}
                                                    aria-expanded={playerControlsOpen}
                                                    aria-label={playerControlsOpen ? "Hide custom player controls" : "Show custom player controls"}
                                                    sx={{
                                                        position: "absolute",
                                                        left: "50%",
                                                        bottom: -18,
                                                        transform: "translateX(-50%)",
                                                        zIndex: 7,
                                                        width: 74,
                                                        height: 38,
                                                        borderRadius: "999px 999px 0 0",
                                                        color: "#06111e",
                                                        background: "linear-gradient(135deg, rgba(103,232,249,0.98), rgba(167,139,250,0.98))",
                                                        boxShadow: "0 -10px 28px rgba(0,0,0,0.42)",
                                                        border: "1px solid rgba(255,255,255,0.26)",
                                                        borderBottom: 0,
                                                        opacity: playerChromeVisible || playerControlsOpen ? 1 : 0,
                                                        pointerEvents: playerChromeVisible || playerControlsOpen ? "auto" : "none",
                                                        transition: "opacity 180ms ease, background 160ms ease",
                                                        "& svg": {
                                                            fontSize: 24,
                                                            transform: playerControlsOpen ? "translateY(-4px)" : "translateY(-5px)",
                                                        },
                                                        "&:hover": {
                                                            background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                        },
                                                    }}
                                                >
                                                    {playerControlsOpen ? <KeyboardArrowDownRoundedIcon /> : <KeyboardArrowUpRoundedIcon />}
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Card>
                                )}

                                {renderPanel(
                                    "nowPlaying",
                                    <RadioButtonCheckedRoundedIcon />,
                                    "Now playing",
                                    `Mode: ${playbackMode === "playlist" ? "Playlist" : "Browse"} • ${playlist.length} queued`,
                                    <Stack spacing={2}>
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            spacing={2}
                                            flexWrap="wrap"
                                        >
                                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                                <Chip
                                                    icon={<RadioButtonCheckedRoundedIcon />}
                                                    label={repeatVideo ? "Repeat video on" : "Repeat video off"}
                                                    sx={{
                                                        color: "#fff",
                                                        background: repeatVideo ? "rgba(103,232,249,0.14)" : "rgba(255,255,255,0.08)",
                                                        border: "1px solid rgba(255,255,255,0.1)",
                                                        fontWeight: 850,
                                                    }}
                                                />

                                                <Chip
                                                    label={`${playlist.length} queued`}
                                                    sx={{
                                                        color: "#fff",
                                                        background: "rgba(255,255,255,0.08)",
                                                        border: "1px solid rgba(255,255,255,0.1)",
                                                        fontWeight: 850,
                                                    }}
                                                />
                                            </Stack>
                                        </Stack>

                                        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                                        {!selectedVideo ? (
                                            <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
                                                Nothing is selected yet.
                                            </Typography>
                                        ) : (
                                            <Box
                                                sx={{
                                                    display: "grid",
                                                    gridTemplateColumns: { xs: "1fr", md: "180px minmax(0, 1fr)" },
                                                    gap: 2,
                                                    alignItems: "start",
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={selectedVideo.highThumbnail || selectedVideo.thumbnail}
                                                    alt=""
                                                    sx={{
                                                        width: "100%",
                                                        borderRadius: 4,
                                                        background: "#000",
                                                        border: "1px solid rgba(255,255,255,0.1)",
                                                    }}
                                                />

                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 950 }}>
                                                        {selectedVideo.title}
                                                    </Typography>

                                                    <Stack
                                                        direction={{ xs: "column", sm: "row" }}
                                                        spacing={1}
                                                        alignItems={{ xs: "stretch", sm: "center" }}
                                                        sx={{ mt: 0.75 }}
                                                    >
                                                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                                                            <LinkRoundedIcon sx={{ color: "#67e8f9", flexShrink: 0 }} fontSize="small" />
                                                            <Typography
                                                                component="a"
                                                                href={buildYoutubeWatchUrl(selectedVideo.id)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                variant="body2"
                                                                sx={{
                                                                    color: "#67e8f9",
                                                                    wordBreak: "break-all",
                                                                    textDecoration: "none",
                                                                    userSelect: "all",
                                                                    minWidth: 0,
                                                                    '&:hover': { textDecoration: "underline" },
                                                                }}
                                                            >
                                                                {buildYoutubeWatchUrl(selectedVideo.id)}
                                                            </Typography>
                                                        </Stack>

                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<ContentCopyRoundedIcon />}
                                                            onClick={copySelectedVideoLink}
                                                            sx={{
                                                                borderRadius: 999,
                                                                color: "#fff",
                                                                borderColor: "rgba(255,255,255,0.18)",
                                                                fontWeight: 900,
                                                                alignSelf: { xs: "flex-start", sm: "center" },
                                                            }}
                                                        >
                                                            Copy link
                                                        </Button>
                                                    </Stack>

                                                    <Typography sx={{ color: "rgba(255,255,255,0.62)", mt: 0.75 }}>
                                                        {selectedVideo.channelTitle}
                                                        {selectedVideo.duration ? ` • ${selectedVideo.duration}` : ""}
                                                        {selectedVideo.viewCount ? ` • ${formatCount(selectedVideo.viewCount)} views` : ""}
                                                    </Typography>

                                                    {selectedVideo.description && (
                                                        <Typography
                                                            sx={{
                                                                color: "rgba(255,255,255,0.52)",
                                                                mt: 1,
                                                                display: "-webkit-box",
                                                                overflow: "hidden",
                                                                WebkitLineClamp: 3,
                                                                WebkitBoxOrient: "vertical",
                                                                lineHeight: 1.6,
                                                            }}
                                                        >
                                                            {selectedVideo.description}
                                                        </Typography>
                                                    )}

                                                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<PlaylistAddRoundedIcon />}
                                                            onClick={() => addVideoToPlaylist(selectedVideo)}
                                                            disabled={selectedVideoInPlaylist}
                                                            sx={{
                                                                borderRadius: 999,
                                                                color: "#fff",
                                                                borderColor: "rgba(255,255,255,0.18)",
                                                                fontWeight: 900,
                                                            }}
                                                        >
                                                            {selectedVideoInPlaylist ? "Already queued" : "Add to playlist"}
                                                        </Button>

                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<OpenInNewRoundedIcon />}
                                                            onClick={openSelectedOnYouTube}
                                                            sx={{
                                                                borderRadius: 999,
                                                                color: "#fff",
                                                                borderColor: "rgba(255,255,255,0.18)",
                                                                fontWeight: 900,
                                                            }}
                                                        >
                                                            Open on YouTube
                                                        </Button>
                                                    </Stack>
                                                </Box>
                                            </Box>
                                        )}
                                    </Stack>
                                )}
                            </Stack>

                            <Stack spacing={3}>
                                {renderPanel(
                                    "browse",
                                    showingRecommendations ? <RecommendRoundedIcon /> : <TravelExploreRoundedIcon />,
                                    browseTitle,
                                    showingRecommendations
                                        ? savedQueryRecommendationsReady
                                            ? "No query is active, so Discover is mixing real videos from saved searches."
                                            : organicInterestReady
                                                ? "No query is active, so Discover is mixing local interests with real YouTube videos."
                                                : "No query is active, so Discover shows real popular videos from YouTube."
                                        : `Active query: ${activeQuery}`,
                                    <Stack spacing={2}>
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            spacing={2}
                                            flexWrap="wrap"
                                        >
                                            <Box>
                                                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                                    {browseTitle}
                                                </Typography>
                                                <Typography sx={{ color: "rgba(255,255,255,0.58)", mt: 0.5 }}>
                                                    {browseSubtitle}
                                                </Typography>
                                            </Box>

                                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                                {showingRecommendations && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<RecommendRoundedIcon />}
                                                        onClick={() => loadRecommendedVideos(false)}
                                                        disabled={recommendedLoading}
                                                        sx={{
                                                            borderRadius: 999,
                                                            color: "#fff",
                                                            borderColor: "rgba(255,255,255,0.18)",
                                                            fontWeight: 900,
                                                        }}
                                                    >
                                                        {savedQueryRecommendationsReady ? "Refresh saved feed" : "Refresh recommended"}
                                                    </Button>
                                                )}

                                                {!showingRecommendations && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={clearSearchAndShowRecommended}
                                                        sx={{
                                                            borderRadius: 999,
                                                            color: "#fff",
                                                            borderColor: "rgba(255,255,255,0.18)",
                                                            fontWeight: 900,
                                                        }}
                                                    >
                                                        Show recommended
                                                    </Button>
                                                )}

                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<PlaylistAddRoundedIcon />}
                                                    onClick={addAllVisibleToPlaylist}
                                                    disabled={!visibleBrowseVideos.length}
                                                    sx={{
                                                        borderRadius: 999,
                                                        color: "#fff",
                                                        borderColor: "rgba(255,255,255,0.18)",
                                                        fontWeight: 900,
                                                    }}
                                                >
                                                    Add visible
                                                </Button>
                                            </Stack>
                                        </Stack>

                                        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                                        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>
                                            <Chip
                                                icon={<AccessTimeRoundedIcon />}
                                                label="Duration"
                                                sx={{ color: "#fff", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 900 }}
                                            />
                                            {[
                                                ["any", "Any"],
                                                ["short", "Short"],
                                                ["medium", "Medium"],
                                                ["long", "Long"],
                                            ].map(([value, label]) => (
                                                <Chip
                                                    key={value}
                                                    label={label}
                                                    onClick={() => setBrowseDurationFilter(value)}
                                                    sx={{
                                                        color: browseDurationFilter === value ? "#06111e" : "#fff",
                                                        background: browseDurationFilter === value
                                                            ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                            : "rgba(255,255,255,0.06)",
                                                        border: "1px solid rgba(255,255,255,0.12)",
                                                        fontWeight: 900,
                                                    }}
                                                />
                                            ))}

                                            <Chip
                                                icon={<CalendarMonthRoundedIcon />}
                                                label="Upload"
                                                sx={{ color: "#fff", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 900, ml: { xs: 0, md: 1 } }}
                                            />
                                            {[
                                                ["any", "Any"],
                                                ["week", "Week"],
                                                ["month", "Month"],
                                                ["year", "Year"],
                                            ].map(([value, label]) => (
                                                <Chip
                                                    key={value}
                                                    label={label}
                                                    onClick={() => setBrowseUploadFilter(value)}
                                                    sx={{
                                                        color: browseUploadFilter === value ? "#06111e" : "#fff",
                                                        background: browseUploadFilter === value
                                                            ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                            : "rgba(255,255,255,0.06)",
                                                        border: "1px solid rgba(255,255,255,0.12)",
                                                        fontWeight: 900,
                                                    }}
                                                />
                                            ))}

                                            {filteredBrowseVideos.length !== browseVideos.length && (
                                                <Chip
                                                    label={`${filteredBrowseVideos.length} match filters`}
                                                    sx={{ color: "#67e8f9", background: "rgba(103,232,249,0.1)", border: "1px solid rgba(103,232,249,0.18)", fontWeight: 900 }}
                                                />
                                            )}
                                        </Stack>

                                        {!filteredBrowseVideos.length ? (
                                            <Box
                                                sx={{
                                                    minHeight: 140,
                                                    borderRadius: 4,
                                                    display: "grid",
                                                    placeItems: "center",
                                                    textAlign: "center",
                                                    border: "1px dashed rgba(255,255,255,0.16)",
                                                    color: "rgba(255,255,255,0.62)",
                                                    p: 2,
                                                }}
                                            >
                                                <Stack spacing={1.5} alignItems="center">
                                                    {recommendedLoading ? <CircularProgress size={26} /> : <RecommendRoundedIcon />}
                                                    <Typography>
                                                        {showingRecommendations
                                                            ? savedQueryRecommendationsReady
                                                                ? "Loading videos from saved cookie queries, or press Refresh saved feed."
                                                                : browseVideos.length
                                                                    ? "No loaded videos match those filters. Clear filters or load more results."
                                                                    : "Loading recommended videos from YouTube, or press Refresh recommended."
                                                            : "Search YouTube or load a direct YouTube link."}
                                                    </Typography>
                                                </Stack>
                                            </Box>
                                        ) : (
                                            <Stack spacing={1.2}>
                                                {visibleBrowseVideos.map((video) => renderVideoCard(video, "browse"))}

                                                {hasMoreRenderedBrowseVideos && (
                                                    <Button
                                                        variant="outlined"
                                                        onClick={() => setBrowseRenderLimit((current) => current + BROWSE_RENDER_BATCH_SIZE)}
                                                        sx={{
                                                            borderRadius: 999,
                                                            color: "#fff",
                                                            borderColor: "rgba(255,255,255,0.18)",
                                                            fontWeight: 900,
                                                        }}
                                                    >
                                                        Render {Math.min(BROWSE_RENDER_BATCH_SIZE, filteredBrowseVideos.length - visibleBrowseVideos.length)} more filtered videos
                                                    </Button>
                                                )}

                                                <Box
                                                    ref={loadMoreSentinelRef}
                                                    sx={{
                                                        minHeight: 64,
                                                        display: "grid",
                                                        placeItems: "center",
                                                        borderRadius: 3,
                                                        border: "1px dashed rgba(255,255,255,0.15)",
                                                        color: "rgba(255,255,255,0.58)",
                                                    }}
                                                >
                                                    {loadingMore ? (
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <CircularProgress size={18} />
                                                            <Typography>Loading more videos...</Typography>
                                                        </Stack>
                                                    ) : browseNextPageToken ? (
                                                        <Button
                                                            variant="text"
                                                            onClick={loadMoreCurrentBrowse}
                                                            sx={{ color: "#67e8f9", fontWeight: 900 }}
                                                        >
                                                            Load more {showingRecommendations ? "recommended videos" : "results"}
                                                        </Button>
                                                    ) : (
                                                        <Typography>
                                                            End of loaded YouTube pages.
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Stack>
                                        )}
                                    </Stack>
                                )}

                                {renderPanel(
                                    "playlist",
                                    <QueueMusicRoundedIcon />,
                                    "Your playlist",
                                    `${playlist.length} saved video${playlist.length === 1 ? "" : "s"}`,
                                    <Stack spacing={2}>
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            spacing={2}
                                            flexWrap="wrap"
                                        >
                                            <Box>
                                                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                                    Your playlist
                                                </Typography>
                                                <Typography sx={{ color: "rgba(255,255,255,0.58)", mt: 0.5 }}>
                                                    {playlist.length ? `${playlist.length} saved video(s)` : "Add videos from Browse or Recommended"}
                                                </Typography>
                                            </Box>

                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<DeleteRoundedIcon />}
                                                onClick={clearPlaylist}
                                                disabled={!playlist.length}
                                                sx={{
                                                    borderRadius: 999,
                                                    color: "#fff",
                                                    borderColor: "rgba(255,255,255,0.18)",
                                                    fontWeight: 900,
                                                }}
                                            >
                                                Clear
                                            </Button>
                                        </Stack>

                                        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                                        {!playlist.length ? (
                                            <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
                                                Your playlist is empty. Add videos from the Browse container or create an auto playlist.
                                            </Typography>
                                        ) : (
                                            <Stack spacing={1.2}>
                                                {playlist.map((video, index) => renderVideoCard(video, "playlist", index))}
                                            </Stack>
                                        )}
                                    </Stack>
                                )}
                            </Stack>
                        </Box>
                    </Stack>
                </Container>
            </Box>
        </>
    );
}
