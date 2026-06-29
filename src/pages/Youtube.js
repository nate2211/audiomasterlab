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
    IconButton,
    LinearProgress,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
    Slider,
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

import { Helmet } from "react-helmet-async";

const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

const SEARCH_PAGE_SIZE = 50;

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
        id: video.id,
        title: snippet.title || "Untitled video",
        channelTitle: snippet.channelTitle || "Unknown channel",
        thumbnail:
            thumbnails.medium?.url ||
            thumbnails.default?.url ||
            `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
        highThumbnail:
            thumbnails.high?.url ||
            thumbnails.standard?.url ||
            thumbnails.medium?.url ||
            `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
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
    const safeGroups = (groups || []).map((group) => Array.isArray(group) ? group : []);
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

export default function YoutubePage() {
    const playerRef = useRef(null);
    const playerContainerRef = useRef(null);
    const playerShellRef = useRef(null);
    const loadMoreSentinelRef = useRef(null);
    const wakeLockRef = useRef(null);

    const playlistRef = useRef([]);
    const selectedVideoRef = useRef(null);
    const activePlaylistIndexRef = useRef(-1);
    const playbackModeRef = useRef("browse");
    const repeatVideoRef = useRef(false);
    const loopPlaylistRef = useRef(true);
    const nextPageTokenRef = useRef("");
    const loadingMoreRef = useRef(false);
    const queryRef = useRef("");
    const keepAwakeWantedRef = useRef(false);

    const [query, setQuery] = useState("");
    const [urlInput, setUrlInput] = useState("");

    const [videos, setVideos] = useState([]);
    const [nextPageToken, setNextPageToken] = useState("");
    const [totalResults, setTotalResults] = useState(0);

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
        "Search YouTube or paste a YouTube link. Browse mode plays search results. Playlist mode plays your saved queue."
    );

    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
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

    const playerMainColumn = Math.min(86, Math.max(45, playerColumnPercent));
    const playerSideColumn = Math.max(14, 100 - playerMainColumn);
    const playerWideLayout = theaterMode || playerMainColumn >= 74 || playerHeight >= 650;

    const selectedVideoInPlaylist = useMemo(() => {
        if (!selectedVideo?.id) return false;
        return playlist.some((item) => item.id === selectedVideo.id);
    }, [playlist, selectedVideo]);

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
        queryRef.current = query;
    }, [query]);

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
        if (!autoLoadMore) return;

        const node = loadMoreSentinelRef.current;

        if (!node) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.some((entry) => entry.isIntersecting);

                if (
                    visible &&
                    nextPageTokenRef.current &&
                    !loadingMoreRef.current &&
                    queryRef.current.trim()
                ) {
                    handleLoadMore();
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
    }, [autoLoadMore, videos.length, nextPageToken]);

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

    async function requestScreenWakeLock() {
        if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
            keepAwakeWantedRef.current = false;
            wakeLockRef.current = null;
            setKeepAwakeEnabled(false);
            setStatus("No dim mode is not supported in this browser. On iPhone, try Safari and keep the tab visible.");
            return false;
        }

        if (document.visibilityState !== "visible") {
            setStatus("No dim mode can only start while this tab is visible.");
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
            setStatus("No dim mode is on. Keep this tab visible and your phone should stay awake while YouTube plays.");

            lock.addEventListener("release", () => {
                if (wakeLockRef.current === lock) {
                    wakeLockRef.current = null;
                }

                setKeepAwakeEnabled(false);

                if (keepAwakeWantedRef.current && document.visibilityState === "visible") {
                    setStatus("No dim mode was released by the browser or system. Tap the toggle again if the screen starts dimming.");
                }
            });

            return true;
        } catch (error) {
            wakeLockRef.current = null;
            keepAwakeWantedRef.current = false;
            setKeepAwakeEnabled(false);
            setStatus(
                `No dim mode could not start: ${error?.name || "Error"}${
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
            setStatus("No dim mode is off. Your phone may dim or auto-lock normally.");
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

        if (!video.embeddable) {
            setStatus("This video is marked as not embeddable, so it may not play here.");
        } else if (mode === "playlist") {
            setStatus(`Playing playlist item ${playlistIndex + 1}: ${video.title}`);
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

        setStatus("Video finished. Browse mode is active, so choose another result or switch to playlist playback.");
    }

    async function handleSearch() {
        const cleanQuery = query.trim();

        if (!cleanQuery) {
            setStatus("Type a YouTube search first.");
            return;
        }

        try {
            setLoading(true);
            setStatus("Searching YouTube...");
            const result = await fetchYoutubeVideosBySearch(cleanQuery);

            setVideos(result.videos);
            setNextPageToken(result.nextPageToken);
            nextPageTokenRef.current = result.nextPageToken;
            setTotalResults(result.totalResults || 0);

            setStatus(
                result.videos.length
                    ? `Found ${result.videos.length} videos. Scroll down to keep loading more results.`
                    : "No videos found."
            );
        } catch (error) {
            setStatus(error?.message || "YouTube search failed.");
        } finally {
            setLoading(false);
        }
    }

    async function handleLoadMore() {
        const cleanQuery = queryRef.current.trim();
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
            loadVideo(video, { mode: "browse" });
        } catch (error) {
            const fallback = buildFallbackVideo(videoId);

            setVideos((current) => uniqueVideosById([fallback, ...current]));
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

            if (!result.videos.length) {
                setStatus("No videos were found for that auto playlist query.");
                return;
            }

            const nextPlaylist = result.videos.map((video) => ({
                ...video,
                playlistId: makePlaylistId(),
            }));

            setVideos((current) => uniqueVideosById([...result.videos, ...current]));
            setPlaylist(nextPlaylist);
            playlistRef.current = nextPlaylist;

            setPlaybackMode("playlist");
            playbackModeRef.current = "playlist";

            setActivePlaylistIndex(0);
            activePlaylistIndexRef.current = 0;

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
        if (!videos.length) {
            setStatus("Search or load videos first.");
            return;
        }

        setPlaylist((current) => {
            const existingIds = new Set(current.map((item) => item.id));
            const nextItems = videos
                .filter((video) => video?.id && !existingIds.has(video.id))
                .map((video) => ({
                    ...video,
                    playlistId: makePlaylistId(),
                }));

            setStatus(`Added ${nextItems.length} visible result(s) to the playlist.`);
            return [...current, ...nextItems];
        });
    }

    function removePlaylistItem(playlistId) {
        const currentIndex = activePlaylistIndexRef.current;

        setPlaylist((current) => {
            const removedIndex = current.findIndex(
                (item) => item.playlistId === playlistId
            );

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
            setStatus("Select a YouTube result first.");
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

        const index =
            activePlaylistIndexRef.current >= 0
                ? activePlaylistIndexRef.current
                : 0;

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
                    background: active
                        ? "rgba(103,232,249,0.14)"
                        : "rgba(255,255,255,0.055)",
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
                            Type one search to build a playlist from that topic, artist, or song
                            style. Use the vertical bar character <strong>|</strong> to mix
                            results from multiple searches into one playlist.
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
                            The auto playlist button searches each part, mixes the returned videos
                            together in alternating order, saves them to your local playlist, switches
                            to playlist playback, and starts playing the first item. Browse results can
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
                    content="Browse YouTube results with endless loading, create manual or auto YouTube playlists from one query or multiple pipe-delimited queries, keep the screen awake with No Dim mode, and choose whether AudioMaster Lab plays browsing results or your playlist through the official YouTube embed player."
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
                        <Box>
                            <Chip
                                icon={<YouTubeIcon />}
                                label="YouTube browsing + auto playlists"
                                sx={{
                                    mb: 2,
                                    color: "#fff",
                                    background: "rgba(239,68,68,0.16)",
                                    border: "1px solid rgba(239,68,68,0.25)",
                                    fontWeight: 900,
                                }}
                            />

                            <Typography
                                variant="h2"
                                sx={{
                                    fontWeight: 950,
                                    letterSpacing: "-0.06em",
                                    fontSize: { xs: "2.4rem", md: "4.2rem" },
                                }}
                            >
                                Browse YouTube or auto-build your queue
                            </Typography>

                            <Typography
                                sx={{
                                    color: "rgba(255,255,255,0.68)",
                                    maxWidth: 940,
                                    mt: 1.5,
                                    lineHeight: 1.75,
                                }}
                            >
                                Search YouTube, scroll to load more results, save videos into a
                                local playlist, or auto-build a mixed playlist from your query.
                                Turn on No Dim mode to request a screen wake lock so phones stay
                                awake while this tab remains visible. Videos play through the
                                official YouTube embed player only.
                            </Typography>
                        </Box>

                        <Card
                            elevation={0}
                            sx={{
                                borderRadius: 5,
                                background: "rgba(255,255,255,0.065)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#fff",
                            }}
                        >
                            <CardContent sx={{ p: { xs: 2.5, md: 3.2 } }}>
                                <Stack spacing={2.5}>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: { xs: "1fr", lg: "1fr auto" },
                                            gap: 1.5,
                                            alignItems: "center",
                                            p: 1.5,
                                            borderRadius: 4,
                                            background: keepAwakeEnabled
                                                ? "linear-gradient(135deg, rgba(103,232,249,0.13), rgba(167,139,250,0.12))"
                                                : "rgba(255,255,255,0.045)",
                                            border: keepAwakeEnabled
                                                ? "1px solid rgba(103,232,249,0.24)"
                                                : "1px solid rgba(255,255,255,0.09)",
                                        }}
                                    >
                                        <Box>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.7 }}>
                                                <LightModeRoundedIcon
                                                    sx={{
                                                        color: keepAwakeEnabled
                                                            ? "#67e8f9"
                                                            : "rgba(255,255,255,0.54)",
                                                    }}
                                                />
                                                <Typography sx={{ fontWeight: 950 }}>
                                                    No Dim mode
                                                </Typography>
                                            </Stack>

                                            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.6 }}>
                                                Keeps the screen awake while this page stays open and visible. It cannot
                                                override a manual lock button press, backgrounded apps, low-power mode, or
                                                YouTube/iOS lock-screen playback rules.
                                            </Typography>
                                        </Box>

                                        <Stack direction="row" alignItems="center" spacing={1.2} justifyContent={{ xs: "space-between", lg: "flex-end" }}>
                                            <Typography sx={{ fontWeight: 900, color: keepAwakeSupported ? "#fff" : "rgba(255,255,255,0.52)" }}>
                                                {keepAwakeSupported
                                                    ? keepAwakeEnabled
                                                        ? "Screen awake"
                                                        : "Keep screen on"
                                                    : "Not supported"}
                                            </Typography>

                                            <Switch
                                                checked={keepAwakeEnabled}
                                                disabled={!keepAwakeSupported}
                                                onChange={toggleScreenWakeLock}
                                            />
                                        </Stack>
                                    </Box>

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
                                            placeholder="music videos, mastering tutorials, podcasts, live sets..."
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
                                            disabled={loading || loadingMore}
                                            onClick={handleSearch}
                                            sx={{
                                                minWidth: { xs: "100%", md: 170 },
                                                borderRadius: 3,
                                                fontWeight: 950,
                                                color: "#06111e",
                                                background:
                                                    "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                            }}
                                        >
                                            Search
                                        </Button>
                                    </Stack>

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
                                                Use <strong>|</strong> to mix multiple searches. Example:
                                                Playboi Carti | Trippie Redd. Browse videos can still be played
                                                directly with Play now without saving them.
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
                                                    background:
                                                        "linear-gradient(135deg, #67e8f9, #a78bfa)",
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
                                                    const cleanValue = Array.isArray(nextValue)
                                                        ? nextValue[0]
                                                        : nextValue;

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
                                                    const cleanValue = Array.isArray(nextValue)
                                                        ? nextValue[0]
                                                        : nextValue;

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

                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: { xs: "1fr", lg: "1fr auto" },
                                            gap: 1.5,
                                            alignItems: "center",
                                            p: 1.5,
                                            borderRadius: 4,
                                            background: keepAwakeEnabled
                                                ? "linear-gradient(135deg, rgba(103,232,249,0.13), rgba(167,139,250,0.12))"
                                                : "rgba(255,255,255,0.045)",
                                            border: keepAwakeEnabled
                                                ? "1px solid rgba(103,232,249,0.24)"
                                                : "1px solid rgba(255,255,255,0.09)",
                                        }}
                                    >
                                        <Box>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.7 }}>
                                                <LightModeRoundedIcon
                                                    sx={{
                                                        color: keepAwakeEnabled
                                                            ? "#67e8f9"
                                                            : "rgba(255,255,255,0.54)",
                                                    }}
                                                />
                                                <Typography sx={{ fontWeight: 950 }}>
                                                    No Dim mode
                                                </Typography>
                                            </Stack>

                                            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.6 }}>
                                                Keeps the screen awake while this page stays open and visible. It cannot
                                                override a manual lock button press, backgrounded apps, low-power mode, or
                                                YouTube/iOS lock-screen playback rules.
                                            </Typography>
                                        </Box>

                                        <Stack direction="row" alignItems="center" spacing={1.2} justifyContent={{ xs: "space-between", lg: "flex-end" }}>
                                            <Typography sx={{ fontWeight: 900, color: keepAwakeSupported ? "#fff" : "rgba(255,255,255,0.52)" }}>
                                                {keepAwakeSupported
                                                    ? keepAwakeEnabled
                                                        ? "Screen awake"
                                                        : "Keep screen on"
                                                    : "Not supported"}
                                            </Typography>

                                            <Switch
                                                checked={keepAwakeEnabled}
                                                disabled={!keepAwakeSupported}
                                                onChange={toggleScreenWakeLock}
                                            />
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
                                            <RepeatRoundedIcon
                                                sx={{
                                                    color: repeatVideo
                                                        ? "#67e8f9"
                                                        : "rgba(255,255,255,0.45)",
                                                }}
                                            />
                                            <Typography sx={{ fontWeight: 900 }}>
                                                Repeat current video
                                            </Typography>
                                            <Switch
                                                checked={repeatVideo}
                                                onChange={(event) =>
                                                    setRepeatVideo(event.target.checked)
                                                }
                                            />
                                        </Stack>

                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <QueueMusicRoundedIcon
                                                sx={{
                                                    color: loopPlaylist
                                                        ? "#67e8f9"
                                                        : "rgba(255,255,255,0.45)",
                                                }}
                                            />
                                            <Typography sx={{ fontWeight: 900 }}>
                                                Loop playlist
                                            </Typography>
                                            <Switch
                                                checked={loopPlaylist}
                                                onChange={(event) =>
                                                    setLoopPlaylist(event.target.checked)
                                                }
                                            />
                                        </Stack>

                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <ViewListRoundedIcon
                                                sx={{
                                                    color: autoLoadMore
                                                        ? "#67e8f9"
                                                        : "rgba(255,255,255,0.45)",
                                                }}
                                            />
                                            <Typography sx={{ fontWeight: 900 }}>
                                                Endless browse loading
                                            </Typography>
                                            <Switch
                                                checked={autoLoadMore}
                                                onChange={(event) =>
                                                    setAutoLoadMore(event.target.checked)
                                                }
                                            />
                                        </Stack>

                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <LightModeRoundedIcon
                                                sx={{
                                                    color: keepAwakeEnabled
                                                        ? "#67e8f9"
                                                        : "rgba(255,255,255,0.45)",
                                                }}
                                            />
                                            <Typography sx={{ fontWeight: 900 }}>
                                                No dim / screen awake
                                            </Typography>
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

                                    {(loading || loadingMore || autoPlaylistLoading) && <LinearProgress />}
                                </Stack>
                            </CardContent>
                        </Card>

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

                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 1,
                                            flexWrap: "wrap",
                                            px: 2,
                                            py: 1.2,
                                            background: "rgba(255,255,255,0.045)",
                                            borderTop: "1px solid rgba(255,255,255,0.08)",
                                        }}
                                    >
                                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 850 }}>
                                            Player: {playerBoxSize.width || "auto"}px × {Math.round(playerHeight)}px
                                        </Typography>

                                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 850 }}>
                                            Layout: {playerWideLayout ? "wide/theater" : "split"} • panels resize automatically
                                        </Typography>
                                    </Box>
                                </Card>

                                <Card
                                    elevation={0}
                                    sx={{
                                        borderRadius: 5,
                                        background: "rgba(255,255,255,0.065)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        color: "#fff",
                                    }}
                                >
                                    <CardContent sx={{ p: { xs: 2.5, md: 3.2 } }}>
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
                                                        Now playing
                                                    </Typography>
                                                    <Typography
                                                        sx={{
                                                            color: "rgba(255,255,255,0.58)",
                                                            mt: 0.5,
                                                        }}
                                                    >
                                                        Mode: {playbackMode === "playlist" ? "Playlist" : "Browse"}
                                                    </Typography>
                                                </Box>

                                                <Stack direction="row" spacing={1}>
                                                    <Chip
                                                        icon={<RadioButtonCheckedRoundedIcon />}
                                                        label={repeatVideo ? "Repeat video on" : "Repeat video off"}
                                                        sx={{
                                                            color: "#fff",
                                                            background: repeatVideo
                                                                ? "rgba(103,232,249,0.14)"
                                                                : "rgba(255,255,255,0.08)",
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

                                                        <Typography
                                                            sx={{
                                                                color: "rgba(255,255,255,0.62)",
                                                                mt: 0.75,
                                                            }}
                                                        >
                                                            {selectedVideo.channelTitle}
                                                            {selectedVideo.duration
                                                                ? ` • ${selectedVideo.duration}`
                                                                : ""}
                                                            {selectedVideo.viewCount
                                                                ? ` • ${formatCount(selectedVideo.viewCount)} views`
                                                                : ""}
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
                                                                {selectedVideoInPlaylist
                                                                    ? "Already queued"
                                                                    : "Add to playlist"}
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
                                    </CardContent>
                                </Card>
                            </Stack>

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        xl: playerWideLayout || playerMainColumn <= 58 ? "1fr 1fr" : "1fr",
                                    },
                                    gap: 3,
                                }}
                            >
                                <Card
                                    elevation={0}
                                    sx={{
                                        borderRadius: 5,
                                        background: "rgba(255,255,255,0.065)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        color: "#fff",
                                    }}
                                >
                                    <CardContent sx={{ p: { xs: 2.5, md: 3.2 } }}>
                                        <Stack spacing={2}>
                                            <Stack
                                                direction="row"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                spacing={2}
                                            >
                                                <Box>
                                                    <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                                        Browse results
                                                    </Typography>
                                                    <Typography
                                                        sx={{
                                                            color: "rgba(255,255,255,0.58)",
                                                            mt: 0.5,
                                                        }}
                                                    >
                                                        {videos.length
                                                            ? `${videos.length} loaded${
                                                                totalResults ? ` / ${totalResults} possible` : ""
                                                            }`
                                                            : "Search results appear here"}
                                                    </Typography>
                                                </Box>

                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<PlaylistAddRoundedIcon />}
                                                    onClick={addAllVisibleToPlaylist}
                                                    disabled={!videos.length}
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

                                            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                                            {!videos.length ? (
                                                <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
                                                    Search YouTube or load a direct YouTube link.
                                                </Typography>
                                            ) : (
                                                <Stack spacing={1.2}>
                                                    {videos.map((video) => renderVideoCard(video, "browse"))}

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
                                                                <Typography>Loading more results...</Typography>
                                                            </Stack>
                                                        ) : nextPageToken ? (
                                                            <Button
                                                                variant="text"
                                                                onClick={handleLoadMore}
                                                                sx={{
                                                                    color: "#67e8f9",
                                                                    fontWeight: 900,
                                                                }}
                                                            >
                                                                Load more results
                                                            </Button>
                                                        ) : (
                                                            <Typography>
                                                                End of loaded YouTube result pages.
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Stack>
                                            )}
                                        </Stack>
                                    </CardContent>
                                </Card>

                                <Card
                                    elevation={0}
                                    sx={{
                                        borderRadius: 5,
                                        background: "rgba(255,255,255,0.065)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        color: "#fff",
                                    }}
                                >
                                    <CardContent sx={{ p: { xs: 2.5, md: 3.2 } }}>
                                        <Stack spacing={2}>
                                            <Stack
                                                direction="row"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                spacing={2}
                                            >
                                                <Box>
                                                    <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                                        Your playlist
                                                    </Typography>
                                                    <Typography
                                                        sx={{
                                                            color: "rgba(255,255,255,0.58)",
                                                            mt: 0.5,
                                                        }}
                                                    >
                                                        {playlist.length
                                                            ? `${playlist.length} video(s) queued`
                                                            : "Add videos from browse results"}
                                                    </Typography>
                                                </Box>

                                                <Stack direction="row" spacing={1}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<PlayArrowRoundedIcon />}
                                                        onClick={switchToPlaylistPlayback}
                                                        disabled={!playlist.length}
                                                        sx={{
                                                            borderRadius: 999,
                                                            color: "#fff",
                                                            borderColor: "rgba(255,255,255,0.18)",
                                                            fontWeight: 900,
                                                        }}
                                                    >
                                                        Play queue
                                                    </Button>

                                                    <Button
                                                        size="small"
                                                        variant="text"
                                                        onClick={clearPlaylist}
                                                        disabled={!playlist.length}
                                                        sx={{
                                                            borderRadius: 999,
                                                            color: "rgba(255,255,255,0.72)",
                                                            fontWeight: 900,
                                                        }}
                                                    >
                                                        Clear
                                                    </Button>
                                                </Stack>
                                            </Stack>

                                            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

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
                                                    No playlist items yet. Add videos from the browse column.
                                                </Box>
                                            ) : (
                                                <Stack spacing={1.2}>
                                                    {playlist.map((video, index) =>
                                                        renderVideoCard(video, "playlist", index)
                                                    )}
                                                </Stack>
                                            )}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Box>
                        </Box>
                    </Stack>
                </Container>
            </Box>
        </>
    );
}
