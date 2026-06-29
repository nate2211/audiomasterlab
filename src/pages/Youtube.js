import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
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
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import OpenWithRoundedIcon from "@mui/icons-material/OpenWithRounded";
import AspectRatioRoundedIcon from "@mui/icons-material/AspectRatioRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RecommendRoundedIcon from "@mui/icons-material/RecommendRounded";

import { Helmet } from "react-helmet-async";

const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

const SEARCH_PAGE_SIZE = 50;
const RECOMMENDED_PAGE_SIZE = 50;
const DEFAULT_RECOMMENDED_REGION = "US";
const SAVED_RECOMMENDATION_QUERIES_COOKIE = "aml_youtube_saved_queries";
const SAVED_RECOMMENDATIONS_TOGGLE_COOKIE = "aml_youtube_use_saved_query_recommendations";
const MAX_SAVED_RECOMMENDATION_QUERIES = 18;
const SAVED_RECOMMENDED_PER_QUERY = 10;


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
    const playerShellRef = useRef(null);
    const loadMoreSentinelRef = useRef(null);
    const wakeLockRef = useRef(null);

    const videosRef = useRef([]);
    const recommendedVideosRef = useRef([]);
    const playlistRef = useRef([]);
    const selectedVideoRef = useRef(null);
    const activePlaylistIndexRef = useRef(-1);
    const playbackModeRef = useRef("browse");
    const repeatVideoRef = useRef(false);
    const loopPlaylistRef = useRef(true);
    const nextPageTokenRef = useRef("");
    const recommendedNextPageTokenRef = useRef("");
    const useSavedQueryRecommendationsRef = useRef(
        readBooleanCookie(SAVED_RECOMMENDATIONS_TOGGLE_COOKIE, false)
    );
    const savedRecommendationQueriesRef = useRef(readSavedRecommendationQueries());
    const loadingMoreRef = useRef(false);
    const activeQueryRef = useRef("");
    const keepAwakeWantedRef = useRef(false);

    const [query, setQuery] = useState("");
    const [activeQuery, setActiveQuery] = useState("");
    const [urlInput, setUrlInput] = useState("");

    const [videos, setVideos] = useState([]);
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

    const [selectedVideo, setSelectedVideo] = useState(null);
    const [playlist, setPlaylist] = useState([]);
    const [activePlaylistIndex, setActivePlaylistIndex] = useState(-1);

    const [playbackMode, setPlaybackMode] = useState("browse");
    const [repeatVideo, setRepeatVideo] = useState(false);
    const [loopPlaylist, setLoopPlaylist] = useState(true);
    const [autoLoadMore, setAutoLoadMore] = useState(true);
    const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(false);
    const [keepAwakeSupported, setKeepAwakeSupported] = useState(false);

    const [status, setStatus] = useState(
        "Search YouTube, or leave the search empty to browse real YouTube recommended videos from the official API."
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

    const [expandedSections, setExpandedSections] = useState({
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
    const browseVideos = showingRecommendations ? recommendedVideos : videos;
    const browseNextPageToken = showingRecommendations ? recommendedNextPageToken : nextPageToken;
    const browseTitle = showingRecommendations
        ? savedQueryRecommendationsReady
            ? "Recommended from saved queries"
            : "Recommended videos"
        : "Browse results";
    const browseSubtitle = showingRecommendations
        ? recommendedVideos.length
            ? savedQueryRecommendationsReady
                ? `${recommendedVideos.length} videos mixed from ${savedRecommendationQueries.length} saved quer${savedRecommendationQueries.length === 1 ? "y" : "ies"}`
                : `${recommendedVideos.length} real YouTube videos loaded${recommendedTotalResults ? ` / ${recommendedTotalResults} possible` : ""}`
            : savedQueryRecommendationsReady
                ? "Saved-query recommendations appear here when there is no active search"
                : "Real YouTube videos appear here when there is no search query"
        : videos.length
            ? `${videos.length} loaded${totalResults ? ` / ${totalResults} possible` : ""}`
            : "Search results appear here";

    const selectedVideoInPlaylist = useMemo(() => {
        if (!selectedVideo?.id) return false;
        return playlist.some((item) => item.id === selectedVideo.id);
    }, [playlist, selectedVideo]);

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
        window.onYouTubeIframeAPIReady = () => {
            setStatus("YouTube player API is ready.");
        };

        if (!window.YT) {
            const script = document.createElement("script");

            script.src = "https://www.youtube.com/iframe_api";
            script.async = true;
            document.body.appendChild(script);
        }

        return () => {
            try {
                playerRef.current?.destroy?.();
            } catch {
                // Safe cleanup.
            }
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

        if (!player?.setSize) return;

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

    function toggleSection(section) {
        setExpandedSections((current) => ({
            ...current,
            [section]: !current[section],
        }));
    }

    function renderPanel(section, icon, title, subtitle, children) {
        return (
            <Accordion
                expanded={!!expandedSections[section]}
                onChange={() => toggleSection(section)}
                disableGutters
                elevation={0}
                sx={{
                    borderRadius: "28px !important",
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.065)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    "&::before": { display: "none" },
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreRoundedIcon sx={{ color: "#fff" }} />}
                    sx={{
                        px: { xs: 2.5, md: 3.2 },
                        py: 1.2,
                        "& .MuiAccordionSummary-content": {
                            alignItems: "center",
                            gap: 1.5,
                        },
                    }}
                >
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
                </AccordionSummary>

                <AccordionDetails sx={{ px: { xs: 2.5, md: 3.2 }, pb: { xs: 2.5, md: 3.2 } }}>
                    {children}
                </AccordionDetails>
            </Accordion>
        );
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
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
    }

    function resetPlayerSize() {
        setTheaterMode(false);
        setPlayerColumnPercent(58);
        setPlayerHeight(460);
        setStatus("YouTube player size reset.");
    }

    function createOrLoadPlayer(videoId, shouldPlay = true) {
        if (!window.YT || !window.YT.Player) {
            setStatus("YouTube player is still loading. Try again in a moment.");
            return;
        }

        if (playerRef.current) {
            applyIframePlaybackPermissions(playerRef.current);

            if (shouldPlay) {
                playerRef.current.loadVideoById(videoId);
            } else {
                playerRef.current.cueVideoById(videoId);
            }

            return;
        }

        if (!playerContainerRef.current) {
            setStatus("The YouTube player container is not ready yet.");
            return;
        }

        playerRef.current = new window.YT.Player(playerContainerRef.current, {
            width: "100%",
            height: String(playerHeight),
            videoId,
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
                    applyIframePlaybackPermissions(event.target);

                    if (shouldPlay) {
                        event.target.playVideo();
                    }
                },
                onStateChange: (event) => {
                    if (event.data === window.YT.PlayerState.ENDED) {
                        handleVideoEnded(event.target);
                    }
                },
                onAutoplayBlocked: () => {
                    setStatus("Playback was blocked by the browser. Tap Play on the YouTube player once, then try again.");
                },
            },
        });
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

        if (!video.embeddable) {
            setStatus("This video is marked as not embeddable, so it may not play here.");
        } else if (mode === "playlist") {
            setStatus(`Playing playlist item ${playlistIndex + 1}: ${video.title}`);
        } else if (showingRecommendations) {
            setStatus(`Playing recommended YouTube video: ${video.title}`);
        } else {
            setStatus(`Browsing YouTube: ${video.title}`);
        }

        createOrLoadPlayer(video.id, true);
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
        const useSavedFeed = useSavedQueryRecommendationsRef.current && savedQueries.length > 0;

        try {
            loadingMoreRef.current = append;
            setRecommendedLoading(!append);
            setLoadingMore(append);
            setStatus(
                useSavedFeed
                    ? append
                        ? "Loading more saved-query recommendations..."
                        : "Loading recommendations from saved search queries..."
                    : append
                        ? "Loading more recommended YouTube videos..."
                        : "Loading real YouTube recommended videos..."
            );

            const pageToken = append ? recommendedNextPageTokenRef.current : "";
            const result = useSavedFeed
                ? await fetchYoutubeRecommendedVideosFromSavedQueries(savedQueries)
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
                        ? `Loaded ${result.videos.length} recommended videos from saved quer${savedQueries.length === 1 ? "y" : "ies"}: ${savedQueries.slice(0, 4).join(" + ")}${savedQueries.length > 4 ? " + more" : ""}.`
                        : append
                            ? `Loaded ${result.videos.length} more recommended videos from YouTube.`
                            : `Loaded ${result.videos.length} recommended videos from YouTube. These come from the official mostPopular feed, not hardcoded placeholders.`
                    : useSavedFeed
                        ? "No videos were returned from your saved recommendation queries. Try saving a broader search."
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

    async function handleSearch() {
        const cleanQuery = query.trim();

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

    async function handleLoadUrl() {
        const videoId = extractVideoId(urlInput);

        if (!videoId) {
            setStatus("Paste a valid YouTube video URL or 11-character video ID.");
            return;
        }

        try {
            setLoading(true);
            setStatus("Loading YouTube link...");

            const details = await fetchYoutubeVideoDetails([videoId]);
            const video = details[0] || buildFallbackVideo(videoId);

            setVideos((current) => uniqueVideosById([video, ...current]));
            videosRef.current = uniqueVideosById([video, ...videosRef.current]);
            setActiveQuery("Direct link");
            activeQueryRef.current = "Direct link";
            loadVideo(video, { mode: "browse" });
        } catch (error) {
            const fallback = buildFallbackVideo(videoId);

            setVideos((current) => uniqueVideosById([fallback, ...current]));
            videosRef.current = uniqueVideosById([fallback, ...videosRef.current]);
            setActiveQuery("Direct link");
            activeQueryRef.current = "Direct link";
            loadVideo(fallback, { mode: "browse" });
            setStatus(
                `Loaded basic YouTube embed from link. Metadata lookup failed: ${
                    error?.message || "unknown error"
                }`
            );
        } finally {
            setLoading(false);
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

    function addAllVisibleToPlaylist() {
        if (!browseVideos.length) {
            setStatus("Search, load, or browse recommended videos first.");
            return;
        }

        setPlaylist((current) => {
            const existingIds = new Set(current.map((item) => item.id));
            const nextItems = browseVideos
                .filter((video) => video?.id && !existingIds.has(video.id))
                .map((video) => ({
                    ...video,
                    playlistId: makePlaylistId(),
                }));

            setStatus(`Added ${nextItems.length} visible video(s) to the playlist.`);
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

        if (!video?.id) return;

        window.open(
            `https://www.youtube.com/watch?v=${video.id}`,
            "_blank",
            "noopener,noreferrer"
        );
    }

    function renderVideoCard(video, source = "browse", index = -1) {
        const active = selectedVideo?.id === video.id;
        const inPlaylist = playlist.some((item) => item.id === video.id);

        return (
            <Box
                key={`${source}-${video.playlistId || video.id}`}
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
            >
                <Box
                    component="img"
                    src={video.thumbnail}
                    alt=""
                    sx={{
                        width: 112,
                        height: 64,
                        borderRadius: 2,
                        objectFit: "cover",
                        background: "#000",
                    }}
                />

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

            <Helmet>
                <title>YouTube Browser</title>
                <meta
                    name="description"
                    content="Browse YouTube results with endless loading, real no-query recommended videos from YouTube, optional saved-query cookie recommendations, collapsible controls, manual playlists, auto playlists, a resizable official YouTube embed player, and optional No Dim mode."
                />
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
                    <Stack spacing={3}>
                        <Card
                            elevation={0}
                            sx={{
                                borderRadius: 5,
                                background: "rgba(255,255,255,0.075)",
                                border: "1px solid rgba(255,255,255,0.12)",
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
                                    </Stack>

                                    <Typography
                                        variant="h3"
                                        sx={{
                                            fontWeight: 950,
                                            letterSpacing: "-0.055em",
                                            fontSize: { xs: "2rem", md: "3.4rem" },
                                        }}
                                    >
                                        Search stays open. Everything else collapses.
                                    </Typography>

                                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                                        <TextField
                                            fullWidth
                                            value={query}
                                            onChange={(event) => setQuery(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                    handleSearch();
                                                }
                                            }}
                                            label="Search YouTube"
                                            placeholder="Leave empty for real YouTube recommended videos, or search music, podcasts, tutorials..."
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
                                            onClick={handleSearch}
                                            sx={{
                                                minWidth: { xs: "100%", md: 170 },
                                                borderRadius: 3,
                                                fontWeight: 950,
                                                color: "#06111e",
                                                background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                            }}
                                        >
                                            {query.trim() ? "Search" : "Recommend"}
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
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>

                        {(loading || loadingMore || autoPlaylistLoading || recommendedLoading) && <LinearProgress />}

                        {renderPanel(
                            "controls",
                            <ViewListRoundedIcon />,
                            "Collapsed tools and playback controls",
                            "Paste links, make auto playlists, resize the player, toggle repeat, loop, endless loading, and No Dim mode.",
                            <Stack spacing={2.5}>
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", md: "1fr auto auto" },
                                        gap: 1.5,
                                        alignItems: "stretch",
                                        p: 1.5,
                                        borderRadius: 4,
                                        background:
                                            "linear-gradient(135deg, rgba(103,232,249,0.09), rgba(167,139,250,0.08))",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                    }}
                                >
                                    <Box>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <AutoAwesomeRoundedIcon sx={{ color: "#67e8f9" }} />
                                            <Typography sx={{ fontWeight: 950 }}>
                                                Auto playlist from query
                                            </Typography>
                                        </Stack>

                                        <Typography
                                            variant="body2"
                                            sx={{ color: "rgba(255,255,255,0.62)", mt: 0.5, lineHeight: 1.6 }}
                                        >
                                            Use <strong>|</strong> to mix multiple searches. Example: Playboi Carti | Trippie Redd.
                                            Browse and recommended videos can still be played directly without saving them.
                                        </Typography>
                                    </Box>

                                    <TextField
                                        value={autoPlaylistLimit}
                                        onChange={(event) => {
                                            const nextValue = Number(event.target.value);
                                            if (Number.isFinite(nextValue)) {
                                                setAutoPlaylistLimit(Math.min(25, Math.max(3, nextValue)));
                                            }
                                        }}
                                        label="Per query"
                                        type="number"
                                        variant="filled"
                                        disabled={autoPlaylistLoading}
                                        InputLabelProps={{
                                            sx: { color: "rgba(255,255,255,0.62)" },
                                        }}
                                        inputProps={{
                                            min: 3,
                                            max: 25,
                                            step: 1,
                                        }}
                                        InputProps={{
                                            sx: {
                                                width: { xs: "100%", md: 132 },
                                                color: "#fff",
                                                borderRadius: 3,
                                                background: "rgba(255,255,255,0.08)",
                                            },
                                        }}
                                    />

                                    <Stack direction="row" spacing={1}>
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
                                                minWidth: { xs: "100%", md: 190 },
                                                borderRadius: 3,
                                                fontWeight: 950,
                                                color: "#06111e",
                                                background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                            }}
                                        >
                                            Auto playlist
                                        </Button>

                                        <Tooltip title="How | mixed queries work">
                                            <IconButton
                                                onClick={() => setHelpOpen(true)}
                                                sx={{
                                                    color: "#fff",
                                                    border: "1px solid rgba(255,255,255,0.14)",
                                                    borderRadius: 3,
                                                }}
                                            >
                                                <HelpOutlineRoundedIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Box>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", lg: "1fr auto" },
                                        gap: 1.5,
                                        alignItems: "center",
                                        p: 1.5,
                                        borderRadius: 4,
                                        background: useSavedQueryRecommendations
                                            ? "linear-gradient(135deg, rgba(103,232,249,0.12), rgba(167,139,250,0.12))"
                                            : "rgba(255,255,255,0.045)",
                                        border: useSavedQueryRecommendations
                                            ? "1px solid rgba(103,232,249,0.24)"
                                            : "1px solid rgba(255,255,255,0.09)",
                                    }}
                                >
                                    <Box>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.7 }}>
                                            <RecommendRoundedIcon
                                                sx={{
                                                    color: useSavedQueryRecommendations
                                                        ? "#67e8f9"
                                                        : "rgba(255,255,255,0.54)",
                                                }}
                                            />
                                            <Typography sx={{ fontWeight: 950 }}>
                                                Saved-query recommendations
                                            </Typography>
                                        </Stack>

                                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.6 }}>
                                            Default off. When turned on, the no-query Recommended videos section uses searches
                                            saved in this site's cookie and mixes real YouTube results from those queries instead
                                            of the general popular feed.
                                        </Typography>

                                        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1.2 }}>
                                            {savedRecommendationQueries.length ? (
                                                savedRecommendationQueries.map((savedQuery) => (
                                                    <Chip
                                                        key={savedQuery}
                                                        size="small"
                                                        label={savedQuery}
                                                        sx={{
                                                            color: "#fff",
                                                            background: "rgba(255,255,255,0.08)",
                                                            border: "1px solid rgba(255,255,255,0.1)",
                                                            fontWeight: 850,
                                                        }}
                                                    />
                                                ))
                                            ) : (
                                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.54)" }}>
                                                    No saved queries yet. Search YouTube once and the query will be saved here.
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Box>

                                    <Stack spacing={1} alignItems={{ xs: "stretch", lg: "flex-end" }}>
                                        <Stack direction="row" alignItems="center" spacing={1.2} justifyContent={{ xs: "space-between", lg: "flex-end" }}>
                                            <Typography sx={{ fontWeight: 900 }}>
                                                {useSavedQueryRecommendations ? "Cookie query feed on" : "Cookie query feed off"}
                                            </Typography>
                                            <Switch
                                                checked={useSavedQueryRecommendations}
                                                onChange={toggleSavedQueryRecommendations}
                                            />
                                        </Stack>

                                        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent={{ xs: "flex-start", lg: "flex-end" }}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                disabled={!savedRecommendationQueries.length || recommendedLoading}
                                                onClick={() => loadRecommendedVideos(false)}
                                                sx={{
                                                    borderRadius: 999,
                                                    color: "#fff",
                                                    borderColor: "rgba(255,255,255,0.18)",
                                                    fontWeight: 900,
                                                }}
                                            >
                                                Refresh feed
                                            </Button>

                                            <Button
                                                size="small"
                                                variant="text"
                                                disabled={!savedRecommendationQueries.length}
                                                onClick={clearSavedRecommendationQueries}
                                                sx={{
                                                    borderRadius: 999,
                                                    color: "rgba(255,255,255,0.72)",
                                                    fontWeight: 900,
                                                }}
                                            >
                                                Clear saved
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Box>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr auto" },
                                        gap: 1.5,
                                        alignItems: "center",
                                        p: 1.5,
                                        borderRadius: 4,
                                        background: "rgba(255,255,255,0.045)",
                                        border: "1px solid rgba(255,255,255,0.09)",
                                    }}
                                >
                                    <Box>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.7 }}>
                                            <AspectRatioRoundedIcon sx={{ color: "#67e8f9" }} />
                                            <Typography sx={{ fontWeight: 950 }}>
                                                Resizable YouTube window
                                            </Typography>
                                        </Stack>

                                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                                            Drag the resize handle on the video corner, or use these controls.
                                            The browse and playlist panels reflow as the video gets wider.
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
                                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.66)", fontWeight: 850 }}>
                                                Window width
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "#67e8f9", fontWeight: 950 }}>
                                                {Math.round(playerMainColumn)}%
                                            </Typography>
                                        </Stack>

                                        <Slider
                                            value={playerMainColumn}
                                            min={45}
                                            max={86}
                                            step={1}
                                            onChange={(_, nextValue) => {
                                                const cleanValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                                                setPlayerColumnPercent(cleanValue);
                                            }}
                                            sx={{
                                                color: "#67e8f9",
                                                "& .MuiSlider-rail": {
                                                    color: "rgba(255,255,255,0.18)",
                                                },
                                            }}
                                        />

                                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4, mt: 1 }}>
                                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.66)", fontWeight: 850 }}>
                                                Video height
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "#67e8f9", fontWeight: 950 }}>
                                                {Math.round(playerHeight)}px
                                            </Typography>
                                        </Stack>

                                        <Slider
                                            value={playerHeight}
                                            min={300}
                                            max={900}
                                            step={10}
                                            onChange={(_, nextValue) => {
                                                const cleanValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                                                setPlayerHeight(cleanValue);
                                            }}
                                            sx={{
                                                color: "#a78bfa",
                                                "& .MuiSlider-rail": {
                                                    color: "rgba(255,255,255,0.18)",
                                                },
                                            }}
                                        />
                                    </Box>

                                    <Stack spacing={1}>
                                        <Button
                                            variant={theaterMode ? "contained" : "outlined"}
                                            onClick={() => setTheaterMode((current) => !current)}
                                            sx={{
                                                borderRadius: 999,
                                                color: theaterMode ? "#06111e" : "#fff",
                                                borderColor: "rgba(255,255,255,0.18)",
                                                fontWeight: 900,
                                                background: theaterMode
                                                    ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                    : "transparent",
                                            }}
                                        >
                                            {theaterMode ? "Theater on" : "Theater mode"}
                                        </Button>

                                        <Button
                                            variant="text"
                                            onClick={resetPlayerSize}
                                            sx={{
                                                borderRadius: 999,
                                                color: "rgba(255,255,255,0.72)",
                                                fontWeight: 900,
                                            }}
                                        >
                                            Reset size
                                        </Button>
                                    </Stack>
                                </Box>

                                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                                    <TextField
                                        fullWidth
                                        value={urlInput}
                                        onChange={(event) => setUrlInput(event.target.value)}
                                        label="Paste YouTube link"
                                        placeholder="https://www.youtube.com/watch?v=..."
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
                                        variant="outlined"
                                        startIcon={<PlayArrowRoundedIcon />}
                                        onClick={handleLoadUrl}
                                        disabled={loading || loadingMore}
                                        sx={{
                                            minWidth: { xs: "100%", md: 170 },
                                            borderRadius: 3,
                                            color: "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 950,
                                        }}
                                    >
                                        Load link
                                    </Button>
                                </Stack>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
                                        gap: 1.5,
                                    }}
                                >
                                    <Button
                                        variant={playbackMode === "browse" ? "contained" : "outlined"}
                                        startIcon={<TravelExploreRoundedIcon />}
                                        onClick={playSelectedAsBrowse}
                                        sx={{
                                            borderRadius: 4,
                                            py: 1.2,
                                            color: playbackMode === "browse" ? "#06111e" : "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 950,
                                            background:
                                                playbackMode === "browse"
                                                    ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                    : "transparent",
                                        }}
                                    >
                                        Browse playback
                                    </Button>

                                    <Button
                                        variant={playbackMode === "playlist" ? "contained" : "outlined"}
                                        startIcon={<QueueMusicRoundedIcon />}
                                        onClick={switchToPlaylistPlayback}
                                        sx={{
                                            borderRadius: 4,
                                            py: 1.2,
                                            color: playbackMode === "playlist" ? "#06111e" : "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 950,
                                            background:
                                                playbackMode === "playlist"
                                                    ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                    : "transparent",
                                        }}
                                    >
                                        Playlist playback
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        startIcon={<SkipNextRoundedIcon />}
                                        onClick={() => playNextPlaylistVideo(false)}
                                        disabled={!playlist.length}
                                        sx={{
                                            borderRadius: 4,
                                            py: 1.2,
                                            color: "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 950,
                                        }}
                                    >
                                        Next in playlist
                                    </Button>
                                </Box>

                                <Stack direction="row" flexWrap="wrap" gap={2}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <RepeatRoundedIcon sx={{ color: repeatVideo ? "#67e8f9" : "rgba(255,255,255,0.45)" }} />
                                        <Typography sx={{ fontWeight: 900 }}>Repeat current video</Typography>
                                        <Switch
                                            checked={repeatVideo}
                                            onChange={(event) => setRepeatVideo(event.target.checked)}
                                        />
                                    </Stack>

                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <QueueMusicRoundedIcon sx={{ color: loopPlaylist ? "#67e8f9" : "rgba(255,255,255,0.45)" }} />
                                        <Typography sx={{ fontWeight: 900 }}>Loop playlist</Typography>
                                        <Switch
                                            checked={loopPlaylist}
                                            onChange={(event) => setLoopPlaylist(event.target.checked)}
                                        />
                                    </Stack>

                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <ViewListRoundedIcon sx={{ color: autoLoadMore ? "#67e8f9" : "rgba(255,255,255,0.45)" }} />
                                        <Typography sx={{ fontWeight: 900 }}>Endless browse loading</Typography>
                                        <Switch
                                            checked={autoLoadMore}
                                            onChange={(event) => setAutoLoadMore(event.target.checked)}
                                        />
                                    </Stack>

                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <LightModeRoundedIcon sx={{ color: keepAwakeEnabled ? "#67e8f9" : "rgba(255,255,255,0.45)" }} />
                                        <Typography sx={{ fontWeight: 900 }}>No Dim / screen awake</Typography>
                                        <Switch
                                            checked={keepAwakeEnabled}
                                            disabled={!keepAwakeSupported}
                                            onChange={toggleScreenWakeLock}
                                        />
                                    </Stack>
                                </Stack>

                                <Box
                                    sx={{
                                        borderRadius: 4,
                                        p: 2,
                                        background: "rgba(103,232,249,0.1)",
                                        border: "1px solid rgba(103,232,249,0.18)",
                                    }}
                                >
                                    <Typography sx={{ color: "rgba(255,255,255,0.82)" }}>
                                        {status}
                                    </Typography>
                                </Box>
                            </Stack>
                        )}

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
                                        sx={{
                                            borderRadius: 5,
                                            background: "rgba(0,0,0,0.24)",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            overflow: "hidden",
                                            position: "relative",
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
                                                    width: "100%",
                                                    height: "100%",
                                                    display: "grid",
                                                    placeItems: "center",
                                                    background: "#000",
                                                }}
                                            >
                                                <Typography sx={{ color: "rgba(255,255,255,0.58)" }}>
                                                    Select a YouTube video or start playlist playback.
                                                </Typography>
                                            </Box>

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
                                                    }}
                                                >
                                                    <OpenWithRoundedIcon />
                                                </Box>
                                            </Tooltip>
                                        </Box>
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
                                            ? "No query is active, so Browse is mixing real videos from saved cookie queries."
                                            : "No query is active, so this same Browse container shows real organic videos from YouTube."
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
                                                    disabled={!browseVideos.length}
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

                                        {!browseVideos.length ? (
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
                                                                : "Loading recommended videos from YouTube, or press Refresh recommended."
                                                            : "Search YouTube or load a direct YouTube link."}
                                                    </Typography>
                                                </Stack>
                                            </Box>
                                        ) : (
                                            <Stack spacing={1.2}>
                                                {browseVideos.map((video) => renderVideoCard(video, "browse"))}

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
