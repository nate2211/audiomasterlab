import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
    Chip,
    LinearProgress,
    Stack,
    Typography,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
    GlassCard,
    PageShell,
    SectionTitle,
    StatusBanner,
} from "../components/Components.js";

const COMMUNITY_FEED_URL = "https://scrapewebsite.pages.dev/api/community/feed";
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

function getPostsFromFeedResponse(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.posts)) {
        return data.posts;
    }

    if (Array.isArray(data?.results)) {
        return data.results;
    }

    if (Array.isArray(data?.items)) {
        return data.items;
    }

    return [];
}

export default function Community() {
    const navigate = useNavigate();
    const audioRef = useRef(null);
    const [posts, setPosts] = useState([]);
    const [status, setStatus] = useState("Loading community feed...");
    const [statusTone, setStatusTone] = useState("info");
    const [isLoading, setIsLoading] = useState(false);
    const [activePostId, setActivePostId] = useState("");
    const [isPlaying, setIsPlaying] = useState(false);

    const activePost = useMemo(
        () => posts.find((post) => post.id === activePostId) || null,
        [activePostId, posts]
    );

    async function loadCommunityFeed() {
        try {
            setIsLoading(true);
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
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadCommunityFeed();
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

    function addPostToAudioPlaylist(post) {
        if (!post?.audioUrl) {
            setStatus("This post does not have a playable URL to add.");
            setStatusTone("error");
            return;
        }

        const playlist = safeReadPlaylist();
        const alreadyExists = playlist.some(
            (item) =>
                item?.kind === "url" &&
                String(item.url || "") === String(post.audioUrl || "")
        );

        if (alreadyExists) {
            setStatus(`"${post.title}" is already in your Audio page playlist.`);
            setStatusTone("info");
            return;
        }

        const nextItem = {
            id: makePlaylistId(),
            kind: "url",
            title: post.title,
            url: post.audioUrl,
            size: 0,
            type: "direct media URL",
            addedAt: new Date().toISOString(),
            archiveFileName: cleanTitleFromUrl(post.originalUrl || post.audioUrl),
            directArchiveUrl: post.originalUrl || "",
            proxiedArchiveUrl: isScrapeWebsiteArchiveProxyUrl(post.audioUrl)
                ? post.audioUrl
                : "",
            artworkUrl: post.artworkUrl || "",
        };

        const saved = safeWritePlaylist([...playlist, nextItem]);

        if (!saved) {
            setStatus("Could not save this track to the browser playlist.");
            setStatusTone("error");
            return;
        }

        setStatus(`Added "${post.title}" to the Audio page playlist.`);
        setStatusTone("info");
    }

    function openInAudio(post) {
        if (!post?.audioUrl) {
            return;
        }

        navigate(`/audio?url=${encodeURIComponent(post.audioUrl)}`);
    }

    return (
        <PageShell>
            <Helmet>
                <title>Community Feed | AudioMaster Lab</title>
                <meta
                    name="description"
                    content="Browse AudioMasterLab community audio posts, preview shared tracks, and add community tracks to your browser playlist."
                />
                <link rel="canonical" href="https://audiomasterlab.com/community" />
            </Helmet>

            <Stack spacing={3}>
                <SectionTitle
                    eyebrow="Community"
                    title="Community Feed"
                    description="Browse tracks posted from AudioMasterLab, preview them through the browser, and add playable links to your Audio page playlist."
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
                                eyebrow="Shared tracks"
                                title="Shared Tracks"
                                description="Feed data loads from scrapewebsite.pages.dev/api/community/feed."
                            />

                            <Button
                                variant="outlined"
                                startIcon={<RefreshRoundedIcon />}
                                onClick={loadCommunityFeed}
                                disabled={isLoading}
                                sx={{
                                    borderRadius: 3,
                                    color: "#fff",
                                    borderColor: "rgba(255,255,255,0.18)",
                                    fontWeight: 900,
                                }}
                            >
                                Refresh feed
                            </Button>
                        </Stack>

                        <StatusBanner status={status} tone={statusTone} />

                        {isLoading && (
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

                {!posts.length && !isLoading ? (
                    <GlassCard>
                        <Stack spacing={1.5} sx={{ textAlign: "center", py: 3 }}>
                            <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                No community posts yet
                            </Typography>
                            <Typography sx={{ color: "rgba(255,255,255,0.72)" }}>
                                Go to the Audio page, load a direct media track, then use
                                Add post to community feed.
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
                                        <Stack
                                            direction="row"
                                            spacing={1.5}
                                            alignItems="center"
                                        >
                                            <Box
                                                sx={{
                                                    width: 72,
                                                    height: 72,
                                                    borderRadius: 2,
                                                    flex: "0 0 auto",
                                                    overflow: "hidden",
                                                    background:
                                                        "linear-gradient(135deg, rgba(103,232,249,0.24), rgba(167,139,250,0.28))",
                                                    border:
                                                        "1px solid rgba(255,255,255,0.12)",
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
                                                        background:
                                                            "rgba(255,255,255,0.08)",
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

                                        <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            spacing={1}
                                        >
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
                                                {playingThisPost
                                                    ? "Stop preview"
                                                    : "Preview"}
                                            </Button>

                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                startIcon={<QueueMusicRoundedIcon />}
                                                onClick={() =>
                                                    addPostToAudioPlaylist(post)
                                                }
                                                sx={{
                                                    borderRadius: 3,
                                                    color: "#fff",
                                                    borderColor:
                                                        "rgba(255,255,255,0.18)",
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
            </Stack>
        </PageShell>
    );
}
