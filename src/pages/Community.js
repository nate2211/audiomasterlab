import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
    Chip,
    Collapse,
    LinearProgress,
    Stack,
    Typography,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
    GlassCard,
    PageShell,
    SectionTitle,
    StatusBanner,
} from "../components/Components.js";

const COMMUNITY_FEED_URL = "https://scrapewebsite.pages.dev/api/community/feed";
const COMMUNITY_LISTENING_URL =
    "https://scrapewebsite.pages.dev/api/community/listening";
const SCRAPEWEBSITE_ARCHIVE_PROXY_URL =
    "https://scrapewebsite.pages.dev/api/archiveproxy";
const AUDIO_PLAYLIST_STORAGE_KEY = "audiomasterlab.audio.playlist.v4";

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

function shouldProxyArchiveUrl(urlValue) {
    if (!urlValue || isScrapeWebsiteArchiveProxyUrl(urlValue)) {
        return false;
    }

    try {
        const parsed = new URL(urlValue);

        return parsed.protocol === "https:" && isArchiveMediaHost(parsed.hostname);
    } catch {
        return false;
    }
}

function buildArchiveProxyUrl(urlValue) {
    const canonicalUrl = getCanonicalArchiveMediaUrl(urlValue);

    if (!shouldProxyArchiveUrl(canonicalUrl)) {
        return urlValue;
    }

    return `${SCRAPEWEBSITE_ARCHIVE_PROXY_URL}?url=${encodeURIComponent(
        canonicalUrl
    )}`;
}

function cleanTitleFromUrl(urlValue) {
    try {
        const parsed = new URL(getCanonicalArchiveMediaUrl(urlValue));
        const lastPathPart = parsed.pathname.split("/").filter(Boolean).pop() || "";

        return decodeURIComponent(lastPathPart)
            .replace(/\+/g, " ")
            .replace(/\.[a-z0-9]{2,6}$/i, "")
            .trim();
    } catch {
        return "";
    }
}

function formatDate(value) {
    if (!value) return "Recently";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Recently";
    }

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

function formatDuration(seconds) {
    const value = Number(seconds);

    if (!Number.isFinite(value) || value <= 0) {
        return "";
    }

    const wholeSeconds = Math.max(0, Math.floor(value));
    const minutes = Math.floor(wholeSeconds / 60);
    const remainingSeconds = wholeSeconds % 60;

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function makePlaylistId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeReadPlaylist() {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(AUDIO_PLAYLIST_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function safeWritePlaylist(playlist) {
    if (typeof window === "undefined") {
        return false;
    }

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

function normalizePost(rawPost) {
    const rawAudioUrl =
        rawPost?.audio_url ||
        rawPost?.audioUrl ||
        rawPost?.url ||
        rawPost?.source_url ||
        rawPost?.sourceUrl ||
        "";
    const originalUrl =
        rawPost?.original_url ||
        rawPost?.originalUrl ||
        rawPost?.direct_archive_url ||
        rawPost?.directArchiveUrl ||
        getCanonicalArchiveMediaUrl(rawAudioUrl);
    const audioUrl = buildArchiveProxyUrl(rawAudioUrl || originalUrl);
    const title =
        rawPost?.title ||
        rawPost?.track_title ||
        rawPost?.trackTitle ||
        cleanTitleFromUrl(originalUrl || audioUrl) ||
        "Community track";

    return {
        id:
            rawPost?.id ||
            rawPost?.post_id ||
            rawPost?.postId ||
            `${title}-${rawAudioUrl}-${rawPost?.created_at || rawPost?.createdAt || ""}`,
        userName:
            rawPost?.user_name ||
            rawPost?.userName ||
            rawPost?.username ||
            "AudioMasterLab listener",
        title,
        artist: rawPost?.artist || "",
        caption: rawPost?.caption || rawPost?.description || "",
        audioUrl,
        originalUrl: originalUrl || rawAudioUrl,
        artworkUrl:
            rawPost?.artwork_url ||
            rawPost?.artworkUrl ||
            rawPost?.image_url ||
            rawPost?.imageUrl ||
            "",
        duration: rawPost?.duration || rawPost?.duration_seconds || 0,
        createdAt: rawPost?.created_at || rawPost?.createdAt || "",
        usesArchiveProxy: isScrapeWebsiteArchiveProxyUrl(audioUrl),
    };
}

function normalizeListener(rawListener) {
    const rawAudioUrl =
        rawListener?.audio_url ||
        rawListener?.audioUrl ||
        rawListener?.url ||
        "";
    const audioUrl = buildArchiveProxyUrl(rawAudioUrl);
    const title =
        rawListener?.track_title ||
        rawListener?.trackTitle ||
        rawListener?.title ||
        cleanTitleFromUrl(audioUrl) ||
        "Unknown track";

    return {
        id:
            rawListener?.session_id ||
            rawListener?.sessionId ||
            `${rawListener?.user_name || "listener"}-${title}`,
        userName:
            rawListener?.user_name ||
            rawListener?.userName ||
            rawListener?.username ||
            "AudioMasterLab listener",
        title,
        artist: rawListener?.artist || "",
        audioUrl,
        originalUrl: getCanonicalArchiveMediaUrl(rawAudioUrl),
        artworkUrl:
            rawListener?.artwork_url ||
            rawListener?.artworkUrl ||
            rawListener?.image_url ||
            "",
        position: Number(
            rawListener?.position_seconds ||
            rawListener?.positionSeconds ||
            rawListener?.currentTime ||
            0
        ),
        duration: Number(
            rawListener?.duration_seconds ||
            rawListener?.durationSeconds ||
            rawListener?.duration ||
            0
        ),
        isPlaying:
            rawListener?.is_playing === 1 ||
            rawListener?.is_playing === true ||
            rawListener?.isPlaying === true,
        updatedAt: rawListener?.updated_at || rawListener?.updatedAt || "",
    };
}

function getPostsFromFeedResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.posts)) return data.posts;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.items)) return data.items;

    return [];
}

function getListenersFromResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.listeners)) return data.listeners;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.items)) return data.items;

    return [];
}

function CollapsibleCommunitySection({
                                         eyebrow,
                                         title,
                                         description,
                                         countLabel,
                                         open,
                                         onToggle,
                                         children,
                                     }) {
    return (
        <Box
            sx={{
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.045)",
                boxShadow: "0 22px 70px rgba(0,0,0,0.22)",
                overflow: "hidden",
            }}
        >
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
                sx={{ p: { xs: 2, sm: 2.5 } }}
            >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <SectionTitle
                        eyebrow={eyebrow}
                        title={title}
                        description={description}
                    />

                    {countLabel && (
                        <Chip
                            size="small"
                            label={countLabel}
                            sx={{
                                mt: 1.25,
                                color: "#dbeafe",
                                background: "rgba(255,255,255,0.08)",
                                fontWeight: 800,
                            }}
                        />
                    )}
                </Box>

                <Button
                    variant="outlined"
                    startIcon={
                        open ? (
                            <KeyboardArrowDownRoundedIcon />
                        ) : (
                            <KeyboardArrowRightRoundedIcon />
                        )
                    }
                    onClick={onToggle}
                    aria-expanded={open}
                    sx={{
                        borderRadius: 3,
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.18)",
                        fontWeight: 900,
                        alignSelf: { xs: "stretch", sm: "center" },
                    }}
                >
                    {open ? "Collapse" : "Expand"}
                </Button>
            </Stack>

            <Collapse in={open} timeout="auto" unmountOnExit>
                <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: { xs: 2, sm: 2.5 } }}>
                    {children}
                </Box>
            </Collapse>
        </Box>
    );
}

export default function Community() {
    const navigate = useNavigate();
    const audioRef = useRef(null);
    const [posts, setPosts] = useState([]);
    const [listeners, setListeners] = useState([]);
    const [status, setStatus] = useState("Loading community feed...");
    const [statusTone, setStatusTone] = useState("info");
    const [isLoadingFeed, setIsLoadingFeed] = useState(false);
    const [isLoadingListeners, setIsLoadingListeners] = useState(false);
    const [activePostId, setActivePostId] = useState("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [listeningOpen, setListeningOpen] = useState(true);
    const [sharedTracksOpen, setSharedTracksOpen] = useState(true);

    const activePost = useMemo(
        () => posts.find((post) => post.id === activePostId) || null,
        [activePostId, posts]
    );

    const listenerCountLabel = listeners.length === 1
        ? "1 live listener"
        : `${listeners.length} live listeners`;
    const postCountLabel = posts.length === 1
        ? "1 shared track"
        : `${posts.length} shared tracks`;

    async function loadCommunityFeed() {
        try {
            setIsLoadingFeed(true);
            setStatus("Loading community feed...");
            setStatusTone("info");

            const response = await fetch(COMMUNITY_FEED_URL, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
                cache: "no-store",
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || data?.ok === false) {
                throw new Error(
                    data?.error ||
                    data?.message ||
                    `Community feed returned HTTP ${response.status}.`
                );
            }

            const nextPosts = getPostsFromFeedResponse(data)
                .map(normalizePost)
                .filter((post) => post.audioUrl);

            setPosts(nextPosts);
            setStatus(
                nextPosts.length
                    ? `Loaded ${nextPosts.length} community post${
                        nextPosts.length === 1 ? "" : "s"
                    }.`
                    : "No community posts yet. Post a direct media track from the Audio page to start the feed."
            );
            setStatusTone("info");
        } catch (error) {
            setStatus(
                error?.message ||
                "Could not load the community feed. Make sure /api/community/feed is deployed and returns JSON."
            );
            setStatusTone("error");
        } finally {
            setIsLoadingFeed(false);
        }
    }

    async function loadLiveListeners({ quiet = false } = {}) {
        try {
            setIsLoadingListeners(true);

            const response = await fetch(`${COMMUNITY_LISTENING_URL}?limit=25`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
                cache: "no-store",
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || data?.ok === false) {
                throw new Error(
                    data?.error ||
                    data?.message ||
                    `Live listeners returned HTTP ${response.status}.`
                );
            }

            const nextListeners = getListenersFromResponse(data)
                .map(normalizeListener)
                .filter((listener) => listener.isPlaying);

            setListeners(nextListeners);

            if (!quiet) {
                setStatus(
                    nextListeners.length
                        ? `Loaded ${nextListeners.length} live listener${
                            nextListeners.length === 1 ? "" : "s"
                        }.`
                        : "No live listeners right now."
                );
                setStatusTone("info");
            }
        } catch (error) {
            if (!quiet) {
                setStatus(
                    error?.message ||
                    "Could not load live listeners. Make sure /api/community/listening is deployed."
                );
                setStatusTone("error");
            }
        } finally {
            setIsLoadingListeners(false);
        }
    }

    async function refreshEverything() {
        await Promise.all([
            loadCommunityFeed(),
            loadLiveListeners({ quiet: true }),
        ]);
    }

    useEffect(() => {
        refreshEverything();

        const interval = window.setInterval(() => {
            loadLiveListeners({ quiet: true });
        }, 10000);

        return () => window.clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function stopPreview() {
        const audio = audioRef.current;

        if (audio) {
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
        }

        setActivePostId("");
        setIsPlaying(false);
    }

    async function playPreview(post) {
        if (!post?.audioUrl) {
            setStatus("This community post does not have a playable audio URL.");
            setStatusTone("error");
            return;
        }

        try {
            const audio = audioRef.current || new Audio();
            audioRef.current = audio;

            if (activePostId === post.id && !audio.paused) {
                audio.pause();
                setIsPlaying(false);
                return;
            }

            audio.crossOrigin = "anonymous";
            audio.pause();
            audio.src = post.audioUrl;
            audio.onended = () => setIsPlaying(false);
            audio.onerror = () => {
                setStatus(
                    "Preview could not play. If this is an old Archive post, repost it so the feed stores the archiveproxy URL."
                );
                setStatusTone("error");
                setIsPlaying(false);
            };

            await audio.play();
            setActivePostId(post.id);
            setIsPlaying(true);
            setStatus(`Playing preview: ${post.title}`);
            setStatusTone("info");
        } catch (error) {
            setStatus(
                error?.message ||
                "The browser blocked preview playback. Tap the play button again while the page is focused."
            );
            setStatusTone("error");
            setIsPlaying(false);
        }
    }

    function addTrackToAudioPlaylist(track) {
        if (!track?.audioUrl) {
            setStatus("This track does not have a playable URL to add.");
            setStatusTone("error");
            return;
        }

        const playlist = safeReadPlaylist();
        const alreadyExists = playlist.some(
            (item) =>
                item?.kind === "url" &&
                String(item.url || "") === String(track.audioUrl || "")
        );

        if (alreadyExists) {
            setStatus(`"${track.title}" is already in your Audio page playlist.`);
            setStatusTone("info");
            return;
        }

        const nextItem = {
            id: makePlaylistId(),
            kind: "url",
            title: track.title,
            url: track.audioUrl,
            size: 0,
            type: "direct media URL",
            addedAt: new Date().toISOString(),
            archiveFileName: cleanTitleFromUrl(track.originalUrl || track.audioUrl),
            directArchiveUrl: track.originalUrl || "",
            proxiedArchiveUrl: isScrapeWebsiteArchiveProxyUrl(track.audioUrl)
                ? track.audioUrl
                : "",
            artworkUrl: track.artworkUrl || "",
        };

        const saved = safeWritePlaylist([...playlist, nextItem]);

        if (!saved) {
            setStatus("Could not save this track to the browser playlist.");
            setStatusTone("error");
            return;
        }

        setStatus(`Added "${track.title}" to the Audio page playlist.`);
        setStatusTone("info");
    }

    function openInAudio(track) {
        if (!track?.audioUrl) {
            return;
        }

        navigate(`/audio?url=${encodeURIComponent(track.audioUrl)}`);
    }

    return (
        <PageShell>
            <Helmet>
                <title>Community Feed | AudioMaster Lab</title>
                <meta
                    name="description"
                    content="Browse AudioMasterLab community audio posts, see live listeners, preview shared tracks, and add community tracks to your browser playlist."
                />
                <link rel="canonical" href="https://audiomasterlab.com/community" />
            </Helmet>

            <Stack spacing={3}>
                <SectionTitle
                    eyebrow="Community"
                    title="Community Feed"
                    description="See live listeners, browse shared tracks, preview audio, and add community songs to your Audio page playlist."
                />

                <GlassCard>
                    <Stack spacing={2}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            alignItems={{ xs: "stretch", sm: "center" }}
                            justifyContent="space-between"
                        >
                            <SectionTitle
                                eyebrow="Controls"
                                title="Community Status"
                                description="Refresh the community feed and live listener data without cluttering the page."
                            />

                            <Button
                                variant="outlined"
                                startIcon={<RefreshRoundedIcon />}
                                onClick={refreshEverything}
                                disabled={isLoadingFeed || isLoadingListeners}
                                sx={{
                                    borderRadius: 3,
                                    color: "#fff",
                                    borderColor: "rgba(255,255,255,0.18)",
                                    fontWeight: 900,
                                }}
                            >
                                Refresh
                            </Button>
                        </Stack>

                        <StatusBanner status={status} tone={statusTone} />

                        {(isLoadingFeed || isLoadingListeners) && (
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

                <CollapsibleCommunitySection
                    eyebrow="Live now"
                    title="Listening Now"
                    description="Live listening data refreshes from scrapewebsite.pages.dev/api/community/listening."
                    countLabel={listenerCountLabel}
                    open={listeningOpen}
                    onToggle={() => setListeningOpen((value) => !value)}
                >
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                md: "repeat(2, minmax(0, 1fr))",
                            },
                            gap: 2,
                        }}
                    >
                        {listeners.length ? (
                            listeners.map((listener) => {
                                const progress =
                                    listener.duration > 0
                                        ? Math.min(
                                            100,
                                            Math.max(
                                                0,
                                                (listener.position / listener.duration) * 100
                                            )
                                        )
                                        : 0;

                                return (
                                    <GlassCard key={listener.id}>
                                        <Stack spacing={2}>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Box
                                                    sx={{
                                                        width: 64,
                                                        height: 64,
                                                        borderRadius: 2,
                                                        overflow: "hidden",
                                                        background:
                                                            "linear-gradient(135deg, rgba(103,232,249,0.24), rgba(167,139,250,0.28))",
                                                        border: "1px solid rgba(255,255,255,0.12)",
                                                        display: "grid",
                                                        placeItems: "center",
                                                        flex: "0 0 auto",
                                                    }}
                                                >
                                                    {listener.artworkUrl ? (
                                                        <Box
                                                            component="img"
                                                            src={listener.artworkUrl}
                                                            alt=""
                                                            loading="lazy"
                                                            sx={{
                                                                width: "100%",
                                                                height: "100%",
                                                                objectFit: "cover",
                                                            }}
                                                        />
                                                    ) : (
                                                        <GraphicEqRoundedIcon
                                                            sx={{
                                                                color: "rgba(255,255,255,0.82)",
                                                                fontSize: 34,
                                                            }}
                                                        />
                                                    )}
                                                </Box>

                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography
                                                        variant="h6"
                                                        title={listener.title}
                                                        sx={{
                                                            fontWeight: 950,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {listener.title}
                                                    </Typography>

                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: "rgba(255,255,255,0.68)",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {listener.userName} is listening now
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            <Box>
                                                <LinearProgress
                                                    variant={listener.duration > 0 ? "determinate" : "indeterminate"}
                                                    value={progress}
                                                    sx={{
                                                        height: 8,
                                                        borderRadius: 999,
                                                        background: "rgba(255,255,255,0.1)",
                                                        "& .MuiLinearProgress-bar": {
                                                            background:
                                                                "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                        },
                                                    }}
                                                />

                                                <Stack
                                                    direction="row"
                                                    justifyContent="space-between"
                                                    sx={{
                                                        mt: 0.75,
                                                        color: "rgba(255,255,255,0.58)",
                                                    }}
                                                >
                                                    <Typography variant="caption">
                                                        {formatDuration(listener.position) || "0:00"}
                                                    </Typography>
                                                    <Typography variant="caption">
                                                        {formatDuration(listener.duration)}
                                                    </Typography>
                                                </Stack>
                                            </Box>

                                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                                <Chip
                                                    size="small"
                                                    icon={<PersonRoundedIcon />}
                                                    label={listener.userName}
                                                    sx={{
                                                        color: "#dbeafe",
                                                        background: "rgba(255,255,255,0.08)",
                                                        "& .MuiChip-icon": {
                                                            color: "#dbeafe",
                                                        },
                                                    }}
                                                />
                                                <Chip
                                                    size="small"
                                                    label="Live"
                                                    sx={{
                                                        color: "#06111e",
                                                        fontWeight: 900,
                                                        background:
                                                            "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                    }}
                                                />
                                            </Stack>

                                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    startIcon={<QueueMusicRoundedIcon />}
                                                    onClick={() => addTrackToAudioPlaylist(listener)}
                                                    sx={{
                                                        borderRadius: 3,
                                                        color: "#fff",
                                                        borderColor: "rgba(255,255,255,0.18)",
                                                        fontWeight: 900,
                                                    }}
                                                >
                                                    Add playlist
                                                </Button>

                                                <Button
                                                    fullWidth
                                                    variant="text"
                                                    startIcon={<OpenInNewRoundedIcon />}
                                                    onClick={() => openInAudio(listener)}
                                                    sx={{
                                                        borderRadius: 3,
                                                        color: "rgba(255,255,255,0.78)",
                                                        fontWeight: 900,
                                                    }}
                                                >
                                                    Open audio
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </GlassCard>
                                );
                            })
                        ) : (
                            <GlassCard>
                                <Stack spacing={1.5} sx={{ textAlign: "center", py: 3 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                        No live listeners right now
                                    </Typography>
                                    <Typography sx={{ color: "rgba(255,255,255,0.72)" }}>
                                        When someone plays audio and the Audio page sends heartbeats,
                                        they will appear here automatically.
                                    </Typography>
                                </Stack>
                            </GlassCard>
                        )}
                    </Box>
                </CollapsibleCommunitySection>

                <CollapsibleCommunitySection
                    eyebrow="Shared tracks"
                    title="Shared Tracks"
                    description="Saved community posts load from scrapewebsite.pages.dev/api/community/feed."
                    countLabel={postCountLabel}
                    open={sharedTracksOpen}
                    onToggle={() => setSharedTracksOpen((value) => !value)}
                >

                    {!posts.length && !isLoadingFeed ? (
                        <GlassCard>
                            <Stack spacing={1.5} sx={{ textAlign: "center", py: 3 }}>
                                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                    No community posts yet
                                </Typography>
                                <Typography sx={{ color: "rgba(255,255,255,0.72)" }}>
                                    Go to the Audio page, load a direct media track, then use Add post
                                    to community feed.
                                </Typography>
                            </Stack>
                        </GlassCard>
                    ) : (
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    md: "repeat(2, minmax(0, 1fr))",
                                },
                                gap: 2,
                            }}
                        >
                            {posts.map((post) => {
                                const active = activePost?.id === post.id;
                                const playingThisPost = active && isPlaying;
                                const durationLabel = formatDuration(post.duration);

                                return (
                                    <GlassCard key={post.id}>
                                        <Stack spacing={2}>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Box
                                                    sx={{
                                                        width: 72,
                                                        height: 72,
                                                        borderRadius: 2,
                                                        flex: "0 0 auto",
                                                        overflow: "hidden",
                                                        background:
                                                            "linear-gradient(135deg, rgba(103,232,249,0.24), rgba(167,139,250,0.28))",
                                                        border: "1px solid rgba(255,255,255,0.12)",
                                                        display: "grid",
                                                        placeItems: "center",
                                                    }}
                                                >
                                                    {post.artworkUrl ? (
                                                        <Box
                                                            component="img"
                                                            src={post.artworkUrl}
                                                            alt=""
                                                            loading="lazy"
                                                            sx={{
                                                                width: "100%",
                                                                height: "100%",
                                                                objectFit: "cover",
                                                            }}
                                                        />
                                                    ) : (
                                                        <QueueMusicRoundedIcon
                                                            sx={{
                                                                color: "rgba(255,255,255,0.82)",
                                                                fontSize: 34,
                                                            }}
                                                        />
                                                    )}
                                                </Box>

                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography
                                                        variant="h6"
                                                        title={post.title}
                                                        sx={{
                                                            fontWeight: 950,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {post.title}
                                                    </Typography>

                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: "rgba(255,255,255,0.68)",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        Posted by {post.userName}
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            {post.caption && (
                                                <Typography
                                                    sx={{
                                                        color: "rgba(255,255,255,0.78)",
                                                        overflowWrap: "anywhere",
                                                    }}
                                                >
                                                    {post.caption}
                                                </Typography>
                                            )}

                                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                                <Chip
                                                    size="small"
                                                    label={formatDate(post.createdAt)}
                                                    sx={{
                                                        color: "#dbeafe",
                                                        background: "rgba(255,255,255,0.08)",
                                                    }}
                                                />
                                                {durationLabel && (
                                                    <Chip
                                                        size="small"
                                                        label={durationLabel}
                                                        sx={{
                                                            color: "#dbeafe",
                                                            background: "rgba(255,255,255,0.08)",
                                                        }}
                                                    />
                                                )}
                                                {post.usesArchiveProxy && (
                                                    <Chip
                                                        size="small"
                                                        label="Archive proxy"
                                                        sx={{
                                                            color: "#06111e",
                                                            fontWeight: 900,
                                                            background:
                                                                "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                        }}
                                                    />
                                                )}
                                            </Stack>

                                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    startIcon={
                                                        playingThisPost ? (
                                                            <StopRoundedIcon />
                                                        ) : (
                                                            <PlayArrowRoundedIcon />
                                                        )
                                                    }
                                                    onClick={() =>
                                                        playingThisPost
                                                            ? stopPreview()
                                                            : playPreview(post)
                                                    }
                                                    sx={{
                                                        borderRadius: 3,
                                                        color: "#06111e",
                                                        fontWeight: 950,
                                                        background:
                                                            "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                    }}
                                                >
                                                    {playingThisPost ? "Stop preview" : "Preview"}
                                                </Button>

                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    startIcon={<QueueMusicRoundedIcon />}
                                                    onClick={() => addTrackToAudioPlaylist(post)}
                                                    sx={{
                                                        borderRadius: 3,
                                                        color: "#fff",
                                                        borderColor: "rgba(255,255,255,0.18)",
                                                        fontWeight: 900,
                                                    }}
                                                >
                                                    Add playlist
                                                </Button>

                                                <Button
                                                    fullWidth
                                                    variant="text"
                                                    startIcon={<OpenInNewRoundedIcon />}
                                                    onClick={() => openInAudio(post)}
                                                    sx={{
                                                        borderRadius: 3,
                                                        color: "rgba(255,255,255,0.78)",
                                                        fontWeight: 900,
                                                    }}
                                                >
                                                    Open audio
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </GlassCard>
                                );
                            })}
                        </Box>
                    )}
                </CollapsibleCommunitySection>
            </Stack>
        </PageShell>
    );
}