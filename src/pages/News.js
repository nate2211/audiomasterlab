import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Helmet } from "react-helmet-async";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardMedia,
    Chip,
    CircularProgress,
    Container,
    Divider,
    Grid,
    Link,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import {
    ArticleRounded,
    AutoAwesomeRounded,
    CheckCircleRounded,
    ChatBubbleRounded,
    ErrorOutlineRounded,
    MusicNoteRounded,
    OpenInNewRounded,
    PlayCircleRounded,
    RefreshRounded,
    ScheduleRounded,
    ThumbUpAltRounded,
    VisibilityRounded,
    WarningAmberRounded,
    WhatshotRounded,
} from "@mui/icons-material";

const SCRAPE_API_ROOT =
    process.env.REACT_APP_SCRAPE_API_ROOT ||
    "https://scrapewebsite.pages.dev/api";

const SITE_ROOT = "https://audiomasterlab.com";
const PAGE_URL = `${SITE_ROOT}/news`;
const FALLBACK_IMAGE = `${SITE_ROOT}/social-preview.png`;
const NEWS_BOOTSTRAP_ID = "audiomasterlab-news-bootstrap";

const MAX_HYPEBEAST_ARTICLES = 15;
const MAX_WORDPRESS_ARTICLES = 48;
const MAX_TRADITIONS_ARTICLES = 36;
const SOURCE_REQUEST_TIMEOUT_MS = 14000;
const MAX_YOUTUBE_FEED_ITEMS_PER_CHANNEL = 10;
const MAX_YOUTUBE_NEWS_CARDS = 36;
const MAX_LATEST_YOUTUBE_EMBEDS = 24;
const MAX_YOUTUBE_STATS_IDS = 50;
const EMBED_REQUEST_CONCURRENCY = 6;

const HYPEBEAST_SOURCES = [
    // Keep this as one source so the page makes exactly one Hypebeast API call.
    { label: "Hypebeast", feed: "main", mode: "rss" },
];

const WORDPRESS_READER_SOURCES = [
    { id: "music-news", label: "WordPress Music News", tag: "music-news" },
    { id: "new-music", label: "WordPress New Music", tag: "new-music" },
    {
        id: "music-reviews",
        label: "WordPress Music Reviews",
        tag: "music-reviews",
    },
    {
        id: "album-reviews",
        label: "WordPress Album Reviews",
        tag: "album-reviews",
    },
    { id: "indie-music", label: "WordPress Indie Music", tag: "indie-music" },
    { id: "live-music", label: "WordPress Live Music", tag: "live-music" },
    { id: "hip-hop", label: "WordPress Hip-Hop", tag: "hip-hop" },
    {
        id: "electronic-music",
        label: "WordPress Electronic Music",
        tag: "electronic-music",
    },
];

const YOUTUBE_CHANNEL_FEEDS = [
    {
        label: "YouTube Music",
        channelId: "UC-9-kyTW8ZkZNDHQJ6FgpwQ",
    },
    {
        label: "NPR Music",
        channelId: "UC4eYXhJI4-7wSWc8UNRwD4A",
    },
    {
        label: "Taylor Swift",
        channelId: "UCqECaJ8Gagnn7YCbPEzWH6g",
    },
    {
        label: "The Weeknd",
        channelId: "UC0WP5P-ufpRfjbNrmOWwLBQ",
    },
    {
        label: "Drake",
        channelId: "UCByOQJjav0CUDwxCk-jVNRQ",
    },
    {
        label: "Dua Lipa",
        channelId: "UC-J-KZfRV8c13fOCkhXdLiQ",
    },
    {
        label: "COLORS",
        channelId: "UC2Qw1dzXDBAZPwS7zm37g8g",
    },
    {
        label: "Lyrical Lemonade",
        channelId: "UCtylTUUVIGY_i5afsQYeBZA",
    },
];

const FEATURED_OEMBEDS = [
    {
        type: "youtube",
        label: "Featured YouTube Discovery",
        sourceUrl: "https://www.youtube.com/watch?v=ox1Eemj8FDo",
    },
    {
        type: "youtube",
        label: "YouTube Music Classic",
        sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    {
        type: "spotify",
        label: "Today's Top Hits",
        sourceUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    },
    {
        type: "spotify",
        label: "RapCaviar",
        sourceUrl: "https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd",
    },
    {
        type: "spotify",
        label: "New Music Friday",
        sourceUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4JAvHpjipBk",
    },
    {
        type: "spotify",
        label: "Featured Spotify Track",
        sourceUrl: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    },
    {
        type: "soundcloud",
        label: "SoundCloud Electronic Preview",
        sourceUrl: "https://soundcloud.com/forss/flickermood",
    },
    {
        type: "soundcloud",
        label: "ODESZA SoundCloud Station",
        sourceUrl: "https://soundcloud.com/odesza",
    },
    {
        type: "soundcloud",
        label: "Flume SoundCloud Station",
        sourceUrl: "https://soundcloud.com/flume",
    },
    {
        type: "soundcloud",
        label: "Skrillex SoundCloud Station",
        sourceUrl: "https://soundcloud.com/skrillex",
    },
    {
        type: "soundcloud",
        label: "Disclosure SoundCloud Station",
        sourceUrl: "https://soundcloud.com/disclosure",
    },
    {
        type: "soundcloud",
        label: "Major Lazer SoundCloud Station",
        sourceUrl: "https://soundcloud.com/majorlazer",
    },
];

const MUSIC_KEYWORDS = [
    "music",
    "album",
    "song",
    "single",
    "track",
    "artist",
    "singer",
    "rapper",
    "producer",
    "band",
    "concert",
    "festival",
    "tour",
    "record",
    "vinyl",
    "playlist",
    "hip hop",
    "hip-hop",
    "rap",
    "r&b",
    "rock",
    "pop",
    "jazz",
    "electronic",
    "dance",
    "dj",
    "audio",
    "soundcloud",
    "spotify",
    "youtube",
];

function isReactSnapRun() {
    return (
        typeof navigator !== "undefined" &&
        navigator.userAgent.includes("ReactSnap")
    );
}

function useExternalMediaAfterHydration() {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        if (!isReactSnapRun()) {
            setEnabled(true);
        }
    }, []);

    return enabled;
}

function safeJsonForHtml(value) {
    return JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}

function sanitizeSnapshotImage(value) {
    const image = String(value || "");
    return image.startsWith("data:") ? FALLBACK_IMAGE : image;
}

function sanitizeSnapshotItem(item) {
    if (!item || typeof item !== "object") return item;

    return {
        ...item,
        image: sanitizeSnapshotImage(item.image),
        thumbnail: sanitizeSnapshotImage(item.thumbnail),
        thumbnail_url: sanitizeSnapshotImage(item.thumbnail_url),
        imageCandidates: Array.isArray(item.imageCandidates)
            ? item.imageCandidates.map(sanitizeSnapshotImage)
            : [],
    };
}

function makeNewsSnapshot({
                              hypebeastArticles,
                              wordpressArticles,
                              traditionsArticles,
                              videos,
                              embeds,
                              statuses,
                              generatedAt,
                          }) {
    return {
        version: 6,
        generatedAt,
        hypebeastArticles: hypebeastArticles.map(sanitizeSnapshotItem),
        wordpressArticles: wordpressArticles.map(sanitizeSnapshotItem),
        traditionsArticles: traditionsArticles.map(sanitizeSnapshotItem),
        videos: videos.map(sanitizeSnapshotItem),
        embeds: embeds.map(sanitizeSnapshotItem),
        statuses,
    };
}

function readEmbeddedNewsSnapshot() {
    if (typeof document === "undefined") return null;

    const node = document.getElementById(NEWS_BOOTSTRAP_ID);
    const text = node?.textContent?.trim();

    if (!text) return null;

    try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
        console.warn("Could not read embedded news state:", error);
        return null;
    }
}

function buildProxyUrl(proxyName, targetUrl) {
    return `${SCRAPE_API_ROOT}/${proxyName}?url=${encodeURIComponent(targetUrl)}`;
}

function buildHypebeastFeedUrl(feedKey) {
    const target = new URL(`${SCRAPE_API_ROOT}/hypebeastproxy`);
    target.searchParams.set("feed", feedKey);
    target.searchParams.set("limit", String(MAX_HYPEBEAST_ARTICLES));
    target.searchParams.set("per_page", String(MAX_HYPEBEAST_ARTICLES));
    return target.toString();
}

function buildWordPressPhotonCandidates(imageUrl) {
    const normalized = normalizeImageUrl(imageUrl, SITE_ROOT);
    if (!normalized || normalized === FALLBACK_IMAGE) return [];

    try {
        const source = new URL(normalized);
        const host = source.hostname.toLowerCase();

        if (host === "i0.wp.com" || host === "i1.wp.com" || host === "i2.wp.com") {
            return [normalized];
        }

        const isWordPressMedia =
            host.endsWith(".wordpress.com") ||
            source.pathname.toLowerCase().includes("/wp-content/uploads/");

        if (!isWordPressMedia) return [];

        const sourcePath = `${source.hostname}${source.pathname}`;
        const query = new URLSearchParams({
            ssl: "1",
            w: "1200",
            quality: "85",
        }).toString();

        return [
            `https://i0.wp.com/${sourcePath}?${query}`,
            `https://i1.wp.com/${sourcePath}?${query}`,
            `https://i2.wp.com/${sourcePath}?${query}`,
        ];
    } catch {
        return [];
    }
}

function buildWordPressReaderTarget(tag) {
    const target = new URL(
        `https://public-api.wordpress.com/rest/v1.1/read/tags/${encodeURIComponent(
            tag,
        )}/posts/`,
    );

    target.searchParams.set("number", "30");
    target.searchParams.set("order", "DESC");

    return target.toString();
}

function buildTraditionsProxyUrl({
                                     perPage = 100,
                                     search = "",
                                     categories = "",
                                     tags = "",
                                 } = {}) {
    const target = new URL(`${SCRAPE_API_ROOT}/traditionsofthesunproxy`);

    target.searchParams.set("endpoint", "posts");
    target.searchParams.set(
        "per_page",
        String(Math.min(100, Math.max(1, Number(perPage) || 100))),
    );
    target.searchParams.set("page", "1");
    target.searchParams.set("status", "publish");
    target.searchParams.set("order", "desc");
    target.searchParams.set("orderby", "date");
    target.searchParams.set("_embed", "1");

    if (search) target.searchParams.set("search", search);
    if (categories) target.searchParams.set("categories", String(categories));
    if (tags) target.searchParams.set("tags", String(tags));

    return target.toString();
}

function buildYoutubeFeedTarget(channelId) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(
        channelId,
    )}`;
}

function buildYoutubeOembedTarget(videoUrl) {
    const target = new URL("https://www.youtube.com/oembed");
    target.searchParams.set("format", "json");
    target.searchParams.set("url", videoUrl);
    target.searchParams.set("maxwidth", "1280");
    target.searchParams.set("maxheight", "720");
    return target.toString();
}

function buildSpotifyOembedTarget(spotifyUrl) {
    const target = new URL("https://open.spotify.com/oembed");
    target.searchParams.set("url", spotifyUrl);
    return target.toString();
}

function buildSoundCloudOembedTarget(soundCloudUrl) {
    const target = new URL("https://soundcloud.com/oembed");
    target.searchParams.set("format", "json");
    target.searchParams.set("url", soundCloudUrl);
    target.searchParams.set("maxwidth", "100%");
    target.searchParams.set("maxheight", "450");
    target.searchParams.set("color", "ff5500");
    target.searchParams.set("auto_play", "false");
    target.searchParams.set("show_comments", "false");
    return target.toString();
}

function getOembedTarget(item) {
    if (item.type === "youtube") {
        return {
            proxyName: "youtubeoembedproxy",
            targetUrl: buildYoutubeOembedTarget(item.sourceUrl),
        };
    }

    if (item.type === "spotify") {
        return {
            proxyName: "spotifyoembedproxy",
            targetUrl: buildSpotifyOembedTarget(item.sourceUrl),
        };
    }

    if (item.type === "soundcloud") {
        return {
            proxyName: "soundcloudoembedproxy",
            targetUrl: buildSoundCloudOembedTarget(item.sourceUrl),
        };
    }

    throw new Error(`Unsupported oEmbed type: ${item.type}`);
}

function decodeHtml(value) {
    const text = String(value || "");

    if (typeof document === "undefined") {
        return text
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#039;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&nbsp;/g, " ");
    }

    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
}

function stripHtml(value) {
    return decodeHtml(
        String(value || "")
            .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " "),
    )
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeText(value) {
    return stripHtml(value).replace(/\s+/g, " ").trim();
}

function isReactShellHtml(text) {
    const value = String(text || "").toLowerCase();

    return (
        value.includes('<div id="root"></div>') ||
        value.includes("you need to enable javascript to run this app") ||
        value.includes("<title>react app</title>") ||
        value.includes("/static/js/main")
    );
}

function isHtmlResponse(text) {
    const value = String(text || "")
        .trim()
        .slice(0, 400)
        .toLowerCase();

    return (
        value.startsWith("<!doctype html") ||
        value.startsWith("<html") ||
        value.includes("<head") ||
        value.includes("<body")
    );
}

function normalizeImageUrl(value, baseUrl = SITE_ROOT) {
    const text = decodeHtml(String(value || "").trim());

    if (!text || text.startsWith("data:") || text.startsWith("blob:")) {
        return "";
    }

    try {
        const url = new URL(text, baseUrl);

        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return "";
        }

        if (url.protocol === "http:") {
            url.protocol = "https:";
        }

        return url.toString();
    } catch {
        return "";
    }
}

function isTrackingPixel(value) {
    const text = String(value || "").toLowerCase();
    return (
        !text ||
        text.includes("tracking") ||
        text.includes("pixel.png") ||
        text.includes("spacer.gif") ||
        text.includes("1x1")
    );
}

function getBestSrcFromSrcset(srcset, baseUrl = SITE_ROOT) {
    const candidates = String(srcset || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const parts = entry.split(/\s+/);
            return {
                src: normalizeImageUrl(parts[0], baseUrl),
                width: Number(String(parts[1] || "").replace(/[^\d.]/g, "")) || 0,
            };
        })
        .filter((entry) => entry.src && !isTrackingPixel(entry.src))
        .sort((a, b) => a.width - b.width);

    return candidates[candidates.length - 1]?.src || "";
}

function getBestImageFromImg(img, baseUrl = SITE_ROOT) {
    if (!img) return "";

    const srcset =
        img.getAttribute("srcset") ||
        img.getAttribute("data-srcset") ||
        img
            .closest("picture")
            ?.querySelector("source[srcset]")
            ?.getAttribute("srcset") ||
        img
            .closest("picture")
            ?.querySelector("source[data-srcset]")
            ?.getAttribute("data-srcset") ||
        "";
    const direct =
        img.getAttribute("src") ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-lazy-src") ||
        img.getAttribute("data-original") ||
        img.getAttribute("data-orig-file") ||
        img.getAttribute("data-large-file") ||
        "";

    const image =
        getBestSrcFromSrcset(srcset, baseUrl) || normalizeImageUrl(direct, baseUrl);

    return image && !isTrackingPixel(image) ? image : "";
}

function uniqueImageUrls(values, baseUrl = SITE_ROOT) {
    const seen = new Set();

    return values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => normalizeImageUrl(value, baseUrl))
        .filter((value) => {
            if (!value || isTrackingPixel(value) || seen.has(value)) return false;
            seen.add(value);
            return true;
        });
}

function extractImagesFromHtml(html, baseUrl = SITE_ROOT) {
    const raw = String(html || "");
    if (!raw) return [];

    const doc = parseHtml(raw);
    const images = [];
    const metaSelectors = [
        'meta[property="og:image"]',
        'meta[property="og:image:url"]',
        'meta[name="twitter:image"]',
        'meta[name="twitter:image:src"]',
    ];

    for (const selector of metaSelectors) {
        images.push(
            normalizeImageUrl(
                doc.querySelector(selector)?.getAttribute("content"),
                baseUrl,
            ),
        );
    }

    for (const img of Array.from(
        doc.querySelectorAll("picture img, article img, main img, img"),
    )) {
        images.push(getBestImageFromImg(img, baseUrl));
    }

    return uniqueImageUrls(images, baseUrl);
}

function buildDisplayImageCandidates(
    values,
    baseUrl = SITE_ROOT,
    useWordPressCdn = true,
) {
    const directImages = uniqueImageUrls(values, baseUrl);
    const cdnImages = useWordPressCdn
        ? directImages.flatMap(buildWordPressPhotonCandidates)
        : [];

    return [...new Set([...cdnImages, ...directImages, FALLBACK_IMAGE])];
}

function parseHtml(htmlText) {
    const parser = new DOMParser();
    return parser.parseFromString(String(htmlText || ""), "text/html");
}

function extractImageFromHtml(html, baseUrl = SITE_ROOT) {
    return extractImagesFromHtml(html, baseUrl)[0] || "";
}

function toTimestamp(value) {
    const timestamp = new Date(value || 0).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDate(value) {
    if (!value) return "Recently";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

function formatGeneratedAt(value) {
    const date = new Date(value || 0);

    if (Number.isNaN(date.getTime())) return "recently";

    return new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short",
    }).format(date);
}

function formatMetric(value) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) return "";

    return new Intl.NumberFormat("en-US", {
        notation: number >= 1000 ? "compact" : "standard",
        maximumFractionDigits: 1,
    }).format(number);
}

function formatDuration(isoDuration) {
    const match = String(isoDuration || "").match(
        /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
    );

    if (!match) return "";

    const days = Number(match[1] || 0);
    const hours = Number(match[2] || 0) + days * 24;
    const minutes = Number(match[3] || 0);
    const seconds = Number(match[4] || 0);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function absoluteUrl(value, baseUrl = SITE_ROOT) {
    if (!value) return "";

    try {
        return new URL(value, baseUrl).toString();
    } catch {
        return "";
    }
}

function fetchText(url, signal, acceptHeader) {
    return fetch(url, {
        method: "GET",
        headers: {
            Accept:
                acceptHeader ||
                "application/atom+xml, application/xml, text/xml, text/html, */*",
        },
        signal,
        cache: "no-store",
    }).then(async (response) => {
        const text = await response.text();

        if (isReactShellHtml(text)) {
            throw new Error(`Proxy route returned the React app shell for ${url}.`);
        }

        if (!response.ok) {
            throw new Error(
                `${response.status} ${response.statusText}: ${text
                    .slice(0, 220)
                    .replace(/\s+/g, " ")}`,
            );
        }

        return text;
    });
}

async function fetchJson(url, signal) {
    const response = await fetch(url, {
        method: "GET",
        headers: {
            Accept: "application/json",
        },
        signal,
        cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();
    const text = rawText.replace(/^\uFEFF/, "").trim();

    if (isReactShellHtml(text)) {
        throw new Error(`JSON proxy returned the React app shell: ${url}`);
    }

    if (!response.ok) {
        throw new Error(
            `${url} returned HTTP ${response.status} ${response.statusText}: ${
                text.slice(0, 260).replace(/\s+/g, " ") || "<empty response>"
            }`,
        );
    }

    if (!text || text === ".") {
        throw new Error(
            `${url} returned an empty response. Content-Type: ${
                contentType || "<missing>"
            }`,
        );
    }

    if (isHtmlResponse(text)) {
        throw new Error(
            `${url} returned HTML instead of JSON: ${text
                .slice(0, 180)
                .replace(/\s+/g, " ")}`,
        );
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(
            `${url} returned invalid JSON. Content-Type: ${
                contentType || "<missing>"
            }. Preview: ${text.slice(0, 240).replace(/\s+/g, " ")}`,
        );
    }
}

async function runWithRequestTimeout(parentSignal, timeoutMs, operation) {
    const controller = new AbortController();
    let timedOut = false;
    const abortFromParent = () => controller.abort();

    if (parentSignal?.aborted) {
        controller.abort();
    } else if (parentSignal) {
        parentSignal.addEventListener("abort", abortFromParent, { once: true });
    }

    const timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);

    try {
        return await operation(controller.signal);
    } catch (error) {
        if (timedOut && !parentSignal?.aborted) {
            throw new Error(`Request timed out after ${timeoutMs}ms.`);
        }

        throw error;
    } finally {
        window.clearTimeout(timeoutId);
        parentSignal?.removeEventListener("abort", abortFromParent);
    }
}

function fetchJsonWithTimeout(
    url,
    signal,
    timeoutMs = SOURCE_REQUEST_TIMEOUT_MS,
) {
    return runWithRequestTimeout(signal, timeoutMs, (requestSignal) =>
        fetchJson(url, requestSignal),
    );
}

function fetchTextWithTimeout(
    url,
    signal,
    acceptHeader,
    timeoutMs = SOURCE_REQUEST_TIMEOUT_MS,
) {
    return runWithRequestTimeout(signal, timeoutMs, (requestSignal) =>
        fetchText(url, requestSignal, acceptHeader),
    );
}

function getPayloadPosts(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.posts)) return payload.posts;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
}

function getWordPressRenderedText(value) {
    if (value && typeof value === "object" && "rendered" in value) {
        return normalizeText(value.rendered);
    }

    return normalizeText(value);
}

function getWordPressHtml(value) {
    if (value && typeof value === "object" && "rendered" in value) {
        return String(value.rendered || "");
    }

    return String(value || "");
}

function getWordPressTaxonomyText(post) {
    const words = [];

    for (const collection of [post?.tags, post?.categories]) {
        if (!collection) continue;

        if (Array.isArray(collection)) {
            for (const entry of collection) {
                if (typeof entry === "string" || typeof entry === "number") {
                    words.push(String(entry));
                } else if (entry && typeof entry === "object") {
                    words.push(entry.name || entry.slug || "");
                }
            }
        } else if (typeof collection === "object") {
            for (const [key, entry] of Object.entries(collection)) {
                words.push(key);
                if (entry && typeof entry === "object") {
                    words.push(entry.name || entry.slug || "");
                }
            }
        }
    }

    const embeddedTerms = post?._embedded?.["wp:term"];
    if (Array.isArray(embeddedTerms)) {
        for (const group of embeddedTerms) {
            for (const term of Array.isArray(group) ? group : []) {
                words.push(term?.name || term?.slug || "");
            }
        }
    }

    if (Array.isArray(post?.class_list)) words.push(...post.class_list);

    return normalizeText(words.join(" "));
}

function isMusicRelevantText(value) {
    const haystack = ` ${normalizeText(value).toLowerCase()} `;
    return MUSIC_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function getWordPressImageCandidates(post, baseUrl) {
    const embeddedMedia = post?._embedded?.["wp:featuredmedia"]?.[0];
    const attachmentImages =
        post?.attachments && typeof post.attachments === "object"
            ? Object.values(post.attachments).flatMap((attachment) => [
                attachment?.URL,
                attachment?.url,
                attachment?.guid,
                attachment?.thumbnails?.large,
                attachment?.thumbnails?.medium,
            ])
            : [];
    const featuredImage = post?.featured_image;
    const featuredImageValues =
        featuredImage && typeof featuredImage === "object"
            ? [featuredImage.URL, featuredImage.url, featuredImage.source_url]
            : [featuredImage];
    const directCandidates = [
        ...featuredImageValues,
        post?.featuredImage,
        post?.canonical_image?.URI,
        post?.canonical_image?.url,
        post?.jetpack_featured_media_url,
        post?.better_featured_image?.source_url,
        post?.post_thumbnail?.URL,
        post?.post_thumbnail?.url,
        post?.post_thumbnail?.guid,
        post?.post_thumbnail?.meta?.large,
        post?.post_thumbnail?.meta?.medium,
        embeddedMedia?.media_details?.sizes?.full?.source_url,
        embeddedMedia?.media_details?.sizes?.large?.source_url,
        embeddedMedia?.media_details?.sizes?.medium_large?.source_url,
        embeddedMedia?.media_details?.sizes?.medium?.source_url,
        embeddedMedia?.source_url,
        ...attachmentImages,
    ];
    const contentHtml =
        getWordPressHtml(post?.content) || getWordPressHtml(post?.excerpt);
    const htmlCandidates = extractImagesFromHtml(contentHtml, baseUrl);
    const directImages = uniqueImageUrls(
        [...directCandidates, ...htmlCandidates],
        baseUrl,
    );
    const cdnImages = directImages.flatMap(buildWordPressPhotonCandidates);

    return [...new Set([...cdnImages, ...directImages, FALLBACK_IMAGE])];
}

function getWordPressFeaturedImage(post, baseUrl) {
    return getWordPressImageCandidates(post, baseUrl)[0] || FALLBACK_IMAGE;
}

function parseWordPressPosts(payload, source) {
    const posts = getPayloadPosts(payload);

    return posts
        .map((post, index) => {
            const title =
                getWordPressRenderedText(post?.title) ||
                getWordPressRenderedText(post?.name) ||
                "Untitled music story";
            const contentText = getWordPressRenderedText(post?.content);
            const excerptText = getWordPressRenderedText(post?.excerpt);
            const description =
                excerptText.slice(0, 300) ||
                contentText.slice(0, 300) ||
                "Open the source to read the complete music article.";
            const link = absoluteUrl(
                post?.link || post?.URL || post?.short_URL,
                source.baseUrl,
            );
            const publishedAt =
                post?.date_gmt ||
                post?.date ||
                post?.modified_gmt ||
                post?.modified ||
                "";
            const author =
                post?._embedded?.author?.[0]?.name ||
                post?.author?.name ||
                post?.author_name ||
                source.label;
            const sourceName = post?.site_name || post?.site?.name || source.label;
            const taxonomyText = getWordPressTaxonomyText(post);
            const relevanceText = `${title} ${description} ${contentText.slice(
                0,
                1200,
            )} ${taxonomyText}`;

            return {
                id: `wordpress-${source.id}-${post?.ID || post?.id || index}-${
                    link || title
                }`,
                source: sourceName,
                sourceGroup: source.group,
                sourceId: source.id,
                type: source.group === "traditions" ? "traditions" : "wordpress",
                title,
                link,
                publishedAt,
                modifiedAt: post?.modified_gmt || post?.modified || "",
                description,
                image: getWordPressFeaturedImage(post, link || source.baseUrl),
                imageCandidates: getWordPressImageCandidates(
                    post,
                    link || source.baseUrl,
                ),
                creator: author,
                taxonomyText,
                musicRelevant: source.forceMusic || isMusicRelevantText(relevanceText),
                likeCount: post?.like_count,
                commentCount:
                    post?.discussion?.comment_count ||
                    post?.comment_count ||
                    post?.comments?.length,
            };
        })
        .filter((item) => item.title && item.link && item.musicRelevant);
}

function dedupeArticles(items, limit) {
    const seenLinks = new Set();
    const seenTitles = new Set();

    return items
        .filter((item) => {
            const linkKey = String(item.link || "")
                .replace(/\/$/, "")
                .toLowerCase();
            const titleKey = normalizeText(item.title).toLowerCase();

            if (!linkKey || seenLinks.has(linkKey)) return false;
            if (titleKey && seenTitles.has(titleKey)) return false;

            seenLinks.add(linkKey);
            if (titleKey) seenTitles.add(titleKey);
            return true;
        })
        .sort((a, b) => toTimestamp(b.publishedAt) - toTimestamp(a.publishedAt))
        .slice(0, limit);
}

function getFirstLocalNameTag(node, localName) {
    const wanted = String(localName || "").toLowerCase();
    const elements = Array.from(node.getElementsByTagName("*"));

    return (
        elements.find((element) => {
            const local =
                element.localName || element.nodeName.split(":").pop() || "";
            return local.toLowerCase() === wanted;
        }) || null
    );
}

function localTextOf(node, localName) {
    return decodeHtml(
        getFirstLocalNameTag(node, localName)?.textContent?.trim() || "",
    );
}

function textOf(node, selector) {
    return decodeHtml(node.querySelector(selector)?.textContent?.trim() || "");
}

function attrOf(node, selector, attrName) {
    return decodeHtml(node.querySelector(selector)?.getAttribute(attrName) || "");
}

function parseXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(xmlText || ""), "application/xml");
    const parserError = doc.querySelector("parsererror");

    if (parserError) {
        throw new Error("Invalid XML returned from upstream feed.");
    }

    return doc;
}

function parseRssArticles(xmlText, source) {
    const doc = parseXml(xmlText);
    const items = Array.from(doc.querySelectorAll("item"));

    return items
        .slice(0, 30)
        .map((item, index) => {
            const title = normalizeText(textOf(item, "title")) || "Untitled story";
            const link = absoluteUrl(
                textOf(item, "link") || textOf(item, "guid"),
                source.baseUrl,
            );
            const rawDescription = textOf(item, "description");
            const contentHtml =
                localTextOf(item, "encoded") ||
                textOf(item, "content\\:encoded") ||
                rawDescription;
            const description =
                normalizeText(rawDescription || contentHtml).slice(0, 300) ||
                "Open the source to read the complete story.";
            const mediaThumbnail = normalizeImageUrl(
                getFirstLocalNameTag(item, "thumbnail")?.getAttribute("url"),
                link || source.baseUrl,
            );
            const mediaContent = Array.from(item.getElementsByTagName("*")).find(
                (node) => {
                    const local = (
                        node.localName ||
                        node.nodeName.split(":").pop() ||
                        ""
                    ).toLowerCase();
                    const type = String(node.getAttribute?.("type") || "").toLowerCase();

                    return (
                        local === "content" &&
                        (type.startsWith("image/") ||
                            node.getAttribute?.("medium") === "image")
                    );
                },
            );
            const enclosure = Array.from(item.querySelectorAll("enclosure")).find(
                (node) =>
                    String(node.getAttribute("type") || "")
                        .toLowerCase()
                        .startsWith("image/"),
            );
            const directImages = uniqueImageUrls(
                [
                    ...extractImagesFromHtml(contentHtml, link || source.baseUrl),
                    ...extractImagesFromHtml(rawDescription, link || source.baseUrl),
                    mediaThumbnail,
                    mediaContent?.getAttribute("url"),
                    enclosure?.getAttribute("url"),
                ],
                link || source.baseUrl,
            );
            const relevanceText = `${title} ${description}`;

            return {
                id: `${source.id}-rss-${index}-${link || title}`,
                source: source.label,
                sourceGroup: source.group,
                sourceId: source.id,
                type: source.group === "traditions" ? "traditions" : source.group,
                title,
                link,
                publishedAt:
                    textOf(item, "pubDate") ||
                    textOf(item, "dc\\:date") ||
                    textOf(item, "updated"),
                description,
                image: directImages[0] || FALLBACK_IMAGE,
                imageCandidates: buildDisplayImageCandidates(
                    directImages,
                    link || source.baseUrl,
                    source.group !== "hypebeast",
                ),
                creator: localTextOf(item, "creator") || source.label,
                musicRelevant: source.forceMusic || isMusicRelevantText(relevanceText),
            };
        })
        .filter((item) => item.title && item.link && item.musicRelevant);
}

function isBadHypebeastTitle(title) {
    const value = String(title || "").trim();

    return (
        !value ||
        value.length < 8 ||
        /^hypebeast article$/i.test(value) ||
        /^hypebeast story$/i.test(value) ||
        /^hypebeast$/i.test(value) ||
        /^article$/i.test(value) ||
        /^story$/i.test(value) ||
        /^read more$/i.test(value) ||
        /^view post$/i.test(value) ||
        /^latest$/i.test(value)
    );
}

function isBadHypebeastCard(item) {
    const title = String(item?.title || "").trim();
    const link = String(item?.link || "").trim();

    return (
        isBadHypebeastTitle(title) ||
        !/^https:\/\/(www\.)?hypebeast\.com\/\d{4}\/\d{1,2}\//i.test(link)
    );
}

function parseHypebeastHtml(htmlText, sourceLabel) {
    if (isReactShellHtml(htmlText)) {
        throw new Error(`${sourceLabel} returned the React app shell.`);
    }

    const doc = parseHtml(htmlText);
    const articleLinkCandidates = Array.from(
        doc.querySelectorAll('a[href*="/20"]'),
    );
    const seen = new Set();
    const cards = [];

    for (const linkNode of articleLinkCandidates) {
        const link = absoluteUrl(
            linkNode.getAttribute("href"),
            "https://hypebeast.com",
        );

        if (
            !/^https:\/\/(www\.)?hypebeast\.com\/\d{4}\/\d{1,2}\//i.test(link) ||
            seen.has(link)
        ) {
            continue;
        }

        seen.add(link);

        const container =
            linkNode.closest("article") ||
            linkNode.closest("section") ||
            linkNode.closest("div") ||
            linkNode;
        const title = normalizeText(
            container.querySelector("h1, h2, h3, h4")?.textContent ||
            linkNode.getAttribute("aria-label") ||
            linkNode.textContent,
        );

        if (isBadHypebeastTitle(title)) continue;

        const description = normalizeText(
            container.querySelector("p")?.textContent || "",
        );
        const image =
            getBestImageFromImg(
                container.querySelector("img"),
                "https://hypebeast.com",
            ) ||
            getBestImageFromImg(
                linkNode.querySelector("img"),
                "https://hypebeast.com",
            );
        const timeNode = container.querySelector("time");
        const card = {
            id: `${sourceLabel}-html-${cards.length}-${link}`,
            source: sourceLabel,
            sourceGroup: "hypebeast",
            type: "hypebeast",
            title,
            link,
            publishedAt:
                timeNode?.getAttribute("datetime") ||
                timeNode?.textContent?.trim() ||
                "",
            description:
                description.slice(0, 260) || "Open Hypebeast to read the story.",
            image: image || FALLBACK_IMAGE,
            imageCandidates: buildDisplayImageCandidates(
                [image],
                "https://hypebeast.com",
                false,
            ),
            creator: "Hypebeast",
        };

        if (!isBadHypebeastCard(card)) cards.push(card);
        if (cards.length >= MAX_HYPEBEAST_ARTICLES) break;
    }

    return cards;
}

function parseYoutubeFeed(xmlText, sourceLabel) {
    if (isReactShellHtml(xmlText)) {
        throw new Error(
            `${sourceLabel} returned the React app shell instead of YouTube XML.`,
        );
    }

    const doc = parseXml(xmlText);
    const entries = Array.from(doc.querySelectorAll("entry"));

    return entries
        .slice(0, MAX_YOUTUBE_FEED_ITEMS_PER_CHANNEL)
        .map((entry, index) => {
            const videoId =
                localTextOf(entry, "videoId") || textOf(entry, "yt\\:videoId") || "";
            const channelId =
                localTextOf(entry, "channelId") ||
                textOf(entry, "yt\\:channelId") ||
                "";
            const link =
                attrOf(entry, "link", "href") ||
                (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");
            const thumbnail =
                normalizeImageUrl(
                    getFirstLocalNameTag(entry, "thumbnail")?.getAttribute("url"),
                    "https://www.youtube.com",
                ) ||
                (videoId
                    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
                    : FALLBACK_IMAGE);
            const statisticsNode = getFirstLocalNameTag(entry, "statistics");
            const communityNode = getFirstLocalNameTag(entry, "community");
            const starRatingNode = communityNode
                ? getFirstLocalNameTag(communityNode, "starRating")
                : null;
            const description =
                normalizeText(
                    localTextOf(entry, "description") ||
                    textOf(entry, "media\\:description") ||
                    textOf(entry, "summary"),
                ).slice(0, 240) || "Latest music video update.";

            return {
                id: `${sourceLabel}-youtube-${index}-${videoId || link}`,
                source: sourceLabel,
                type: "video",
                title: normalizeText(textOf(entry, "title")) || "Untitled video",
                link,
                videoId,
                channelId,
                channelTitle:
                    textOf(entry, "author name") ||
                    localTextOf(entry, "name") ||
                    sourceLabel,
                publishedAt: textOf(entry, "published") || textOf(entry, "updated"),
                description,
                image: thumbnail,
                viewCount:
                    statisticsNode?.getAttribute("views") ||
                    statisticsNode?.getAttribute("viewCount") ||
                    "",
                averageRating: starRatingNode?.getAttribute("average") || "",
                ratingCount: starRatingNode?.getAttribute("count") || "",
            };
        })
        .filter((item) => item.videoId && item.link);
}

function getYoutubeVideoId(inputUrl) {
    try {
        const url = new URL(inputUrl);
        const host = url.hostname.toLowerCase();

        if (host === "youtu.be") {
            return url.pathname.split("/").filter(Boolean)[0] || "";
        }

        if (url.pathname === "/watch") {
            return url.searchParams.get("v") || "";
        }

        if (url.pathname.startsWith("/shorts/")) {
            return url.pathname.split("/").filter(Boolean)[1] || "";
        }

        if (url.pathname.startsWith("/embed/")) {
            return url.pathname.split("/").filter(Boolean)[1] || "";
        }

        return "";
    } catch {
        return "";
    }
}

function parseSpotifyUrl(inputUrl) {
    try {
        const url = new URL(inputUrl);
        const parts = url.pathname.split("/").filter(Boolean);
        const type = parts[0] || "";
        const id = parts[1] || "";
        const allowedTypes = new Set([
            "album",
            "track",
            "playlist",
            "artist",
            "episode",
            "show",
        ]);

        if (!allowedTypes.has(type) || !id) return null;
        return { type, id };
    } catch {
        return null;
    }
}

function getEmbedPlatform(item) {
    return String(item?.platform || item?.type || "").toLowerCase();
}

function getAllowedIframeSrcFromHtml(html) {
    if (!html) return "";

    const doc = parseHtml(String(html));
    const iframe = doc.querySelector("iframe");

    if (!iframe) return "";

    const src = iframe.getAttribute("src") || "";

    try {
        const url = new URL(src);
        const host = url.hostname.toLowerCase();
        const allowed =
            host === "www.youtube.com" ||
            host === "youtube.com" ||
            host === "www.youtube-nocookie.com" ||
            host === "open.spotify.com" ||
            host === "w.soundcloud.com" ||
            host === "soundcloud.com";

        return allowed ? url.toString() : "";
    } catch {
        return "";
    }
}

function isRenderableEmbedCard(item) {
    if (!item || typeof item !== "object") return false;

    const platform = getEmbedPlatform(item);

    if (!["youtube", "spotify", "soundcloud"].includes(platform)) {
        return false;
    }

    return Boolean(getAllowedIframeSrcFromHtml(item.html));
}

function buildManualEmbedCard(item, reason) {
    if (item.type === "youtube") {
        const videoId = item.videoId || getYoutubeVideoId(item.sourceUrl);

        if (!videoId) return null;

        return {
            card: {
                ...item,
                platform: "youtube",
                type: "youtube",
                title: item.title || item.label,
                author_name: item.channelTitle || "YouTube",
                provider_name: "YouTube",
                thumbnail_url:
                    item.image || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                videoId,
                html: `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
            },
            status: {
                label: item.label,
                kind: "YouTube embed",
                state: "fallback",
                message: reason || "Used the privacy-enhanced YouTube player fallback.",
            },
        };
    }

    if (item.type === "spotify") {
        const spotify = parseSpotifyUrl(item.sourceUrl);

        if (!spotify) return null;

        return {
            card: {
                ...item,
                platform: "spotify",
                type: "spotify",
                title: item.title || item.label,
                author_name: "Spotify",
                provider_name: "Spotify",
                thumbnail_url: item.image || FALLBACK_IMAGE,
                html: `<iframe src="https://open.spotify.com/embed/${spotify.type}/${spotify.id}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`,
            },
            status: {
                label: item.label,
                kind: "Spotify embed",
                state: "fallback",
                message: reason || "Used the Spotify player fallback.",
            },
        };
    }

    if (item.type === "soundcloud") {
        const playerUrl = new URL("https://w.soundcloud.com/player/");
        playerUrl.searchParams.set("url", item.sourceUrl);
        playerUrl.searchParams.set("color", "#ff5500");
        playerUrl.searchParams.set("auto_play", "false");
        playerUrl.searchParams.set("hide_related", "false");
        playerUrl.searchParams.set("show_comments", "false");
        playerUrl.searchParams.set("show_user", "true");
        playerUrl.searchParams.set("show_reposts", "false");
        playerUrl.searchParams.set("show_teaser", "true");
        playerUrl.searchParams.set("visual", "true");

        return {
            card: {
                ...item,
                platform: "soundcloud",
                type: "soundcloud",
                title: item.title || item.label,
                author_name: item.author_name || "SoundCloud",
                provider_name: "SoundCloud",
                thumbnail_url: item.thumbnail_url || item.image || FALLBACK_IMAGE,
                html: `<iframe src="${playerUrl.toString()}" allow="autoplay"></iframe>`,
                soundcloudValidated: false,
            },
            status: {
                label: item.label,
                kind: "SoundCloud player",
                state: "fallback",
                message:
                    reason ||
                    "SoundCloud oEmbed metadata was unavailable; the click-to-load official widget fallback remains available.",
            },
        };
    }

    return null;
}

async function fetchOembedCard(item, signal) {
    const { proxyName, targetUrl } = getOembedTarget(item);
    const proxyUrl = buildProxyUrl(proxyName, targetUrl);

    try {
        const data = await fetchJson(proxyUrl, signal);
        const normalizedHtml =
            data?.html ||
            (data?.iframe_url
                ? `<iframe src="${data.iframe_url}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" allowfullscreen></iframe>`
                : "");
        const card = {
            ...item,
            ...data,
            platform: item.type,
            type: item.type,
            sourceUrl: item.sourceUrl,
            label: item.label,
            html: normalizedHtml,
            upstreamStatus: Number(data?.upstreamStatus || 0),
            proxyFallback: data?.fallback === true,
        };

        if (
            item.type === "soundcloud" &&
            (data?.ok === false ||
                data?.fallback === true ||
                Number(data?.upstreamStatus || 0) >= 400)
        ) {
            return buildManualEmbedCard(
                item,
                data?.reason ||
                data?.message ||
                data?.error ||
                "SoundCloud oEmbed metadata was unavailable.",
            );
        }

        if (!isRenderableEmbedCard(card)) {
            const fallback = buildManualEmbedCard(
                item,
                `${proxyName} did not return a playable iframe.`,
            );

            if (fallback && isRenderableEmbedCard(fallback.card)) return fallback;
            throw new Error(`${proxyName} did not return a safe iframe.`);
        }

        return {
            card,
            status: {
                label: item.label,
                kind: `${item.type} oEmbed`,
                state: data?.fallback === true ? "fallback" : "ok",
                message:
                    data?.fallback === true
                        ? `Loaded a playable fallback through /api/${proxyName}.`
                        : `Loaded metadata through /api/${proxyName}.`,
            },
        };
    } catch (error) {
        if (item.type === "soundcloud") {
            return buildManualEmbedCard(
                item,
                error?.message ||
                "SoundCloud metadata could not be loaded; using the click-to-load official widget.",
            );
        }

        const fallback = buildManualEmbedCard(item, error?.message);

        if (fallback && isRenderableEmbedCard(fallback.card)) return fallback;

        return {
            card: null,
            status: {
                label: item.label,
                kind: `${item.type} oEmbed`,
                state: "failed",
                message: error?.message || `${proxyName} failed.`,
            },
        };
    }
}

async function allSettledWithConcurrency(items, concurrency, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function runWorker() {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;

            try {
                const value = await worker(items[index], index);
                results[index] = { status: "fulfilled", value };
            } catch (reason) {
                results[index] = { status: "rejected", reason };
            }
        }
    }

    const workerCount = Math.max(1, Math.min(concurrency, items.length || 1));
    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
    return results;
}

function dedupeBySourceUrl(items) {
    const seen = new Set();

    return items.filter((item) => {
        const key = String(item.sourceUrl || "").trim();

        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

async function fetchYoutubeStats(videoIds, signal) {
    const ids = Array.from(new Set(videoIds.filter(Boolean))).slice(
        0,
        MAX_YOUTUBE_STATS_IDS,
    );

    if (ids.length === 0) {
        return {
            statsById: {},
            status: {
                label: "YouTube statistics",
                kind: "YouTube Data API",
                state: "fallback",
                message: "No YouTube IDs were available for the statistics request.",
            },
        };
    }

    const target = new URL(`${SCRAPE_API_ROOT}/youtubestatsproxy`);
    target.searchParams.set("ids", ids.join(","));

    try {
        const payload = await fetchJson(target.toString(), signal);
        const rows = Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.videos)
                ? payload.videos
                : [];
        const statsById = {};

        for (const row of rows) {
            const id = row?.id || row?.videoId;
            if (id) statsById[id] = row;
        }

        return {
            statsById,
            status: {
                label: "YouTube statistics",
                kind: "YouTube Data API",
                state: rows.length > 0 ? "ok" : "fallback",
                message:
                    rows.length > 0
                        ? `Loaded statistics for ${rows.length} YouTube videos.`
                        : "The statistics route responded without video records; RSS data remains available.",
            },
        };
    } catch (error) {
        return {
            statsById: {},
            status: {
                label: "YouTube statistics",
                kind: "YouTube Data API",
                state: "fallback",
                message:
                    error?.message ||
                    "YouTube statistics could not be loaded; RSS and embeds remain available.",
            },
        };
    }
}

function hydrateYoutubeItem(item, statsById) {
    const videoId =
        item.videoId || getYoutubeVideoId(item.sourceUrl || item.link);
    const row = statsById?.[videoId];

    if (!row) return { ...item, videoId };

    const snippet = row.snippet || row;
    const statistics = row.statistics || row;
    const contentDetails = row.contentDetails || row;
    const status = row.status || row;
    const thumbnails = snippet?.thumbnails || row?.thumbnails || {};
    const hydratedImage =
        thumbnails?.maxres?.url ||
        thumbnails?.standard?.url ||
        thumbnails?.high?.url ||
        thumbnails?.medium?.url ||
        thumbnails?.default?.url ||
        row?.thumbnail ||
        row?.thumbnail_url ||
        item.image ||
        item.thumbnail_url;

    return {
        ...item,
        videoId,
        title: snippet?.title || row?.title || item.title,
        description:
            normalizeText(snippet?.description || row?.description).slice(0, 300) ||
            item.description,
        channelTitle:
            snippet?.channelTitle || row?.channelTitle || item.channelTitle,
        channelId: snippet?.channelId || row?.channelId || item.channelId,
        publishedAt: snippet?.publishedAt || row?.publishedAt || item.publishedAt,
        image: hydratedImage || item.image,
        thumbnail_url: hydratedImage || item.thumbnail_url,
        viewCount: statistics?.viewCount ?? row?.viewCount ?? item.viewCount,
        likeCount: statistics?.likeCount ?? row?.likeCount ?? item.likeCount,
        commentCount:
            statistics?.commentCount ?? row?.commentCount ?? item.commentCount,
        duration: contentDetails?.duration || row?.duration || item.duration,
        embeddable:
            typeof status?.embeddable === "boolean"
                ? status.embeddable
                : typeof row?.embeddable === "boolean"
                    ? row.embeddable
                    : item.embeddable,
        liveBroadcastContent:
            snippet?.liveBroadcastContent ||
            row?.liveBroadcastContent ||
            item.liveBroadcastContent,
        concurrentViewers: row?.concurrentViewers ?? item.concurrentViewers,
        definition:
            contentDetails?.definition || row?.definition || item.definition,
        caption: contentDetails?.caption || row?.caption || item.caption,
        licensedContent:
            typeof row?.licensedContent === "boolean"
                ? row.licensedContent
                : item.licensedContent,
    };
}

function parseYoutubeMetric(value) {
    const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function getYoutubePopularityScore(item) {
    const views = parseYoutubeMetric(item.viewCount);
    const likes = parseYoutubeMetric(item.likeCount);
    const comments = parseYoutubeMetric(item.commentCount);
    const publishedAt = toTimestamp(item.publishedAt);
    const ageDays = publishedAt
        ? Math.max(0, (Date.now() - publishedAt) / 86400000)
        : 3650;
    const recencyBoost = Math.max(0, 180 - ageDays) * 0.35;

    return (
        Math.log10(views + 1) * 100 +
        Math.log10(likes + 1) * 28 +
        Math.log10(comments + 1) * 12 +
        recencyBoost
    );
}

function sortPopularYoutubeVideos(items) {
    return [...items].sort((a, b) => {
        const popularityDifference =
            getYoutubePopularityScore(b) - getYoutubePopularityScore(a);

        if (Math.abs(popularityDifference) > 0.001) {
            return popularityDifference;
        }

        return toTimestamp(b.publishedAt) - toTimestamp(a.publishedAt);
    });
}

function SourceChip({ icon, label }) {
    return (
        <Chip
            icon={icon}
            label={label}
            size="small"
            variant="outlined"
            sx={{
                borderColor: "rgba(103,232,249,.28)",
                color: "rgba(255,255,255,.86)",
                background:
                    "linear-gradient(135deg, rgba(103,232,249,.12), rgba(167,139,250,.10))",
            }}
        />
    );
}

function ArticleCard({ item }) {
    const externalMediaEnabled = useExternalMediaAfterHydration();
    const imageCandidates = useMemo(() => {
        const values = [
            ...(Array.isArray(item.imageCandidates) ? item.imageCandidates : []),
            item.imageViaProxy,
            item.image,
            FALLBACK_IMAGE,
        ];

        return [...new Set(values.filter(Boolean))];
    }, [item.image, item.imageCandidates, item.imageViaProxy]);
    const [imageIndex, setImageIndex] = useState(0);

    useEffect(() => {
        setImageIndex(0);
    }, [externalMediaEnabled, item.id]);

    const image = externalMediaEnabled
        ? imageCandidates[imageIndex] || FALLBACK_IMAGE
        : FALLBACK_IMAGE;
    const isVideo = item.type === "video";

    return (
        <Card
            component="article"
            id={item.id}
            sx={{
                height: "100%",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,.08)",
                background:
                    "linear-gradient(180deg, rgba(17,24,39,.95), rgba(8,13,26,.98))",
                boxShadow: "0 20px 60px rgba(0,0,0,.28)",
            }}
        >
            <Box sx={{ position: "relative" }}>
                <CardMedia
                    component="img"
                    width="640"
                    height="360"
                    image={image}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => {
                        setImageIndex((currentIndex) =>
                            currentIndex < imageCandidates.length - 1
                                ? currentIndex + 1
                                : currentIndex,
                        );
                    }}
                    sx={{
                        height: 230,
                        objectFit: "cover",
                        background: "#111827",
                    }}
                />

                {isVideo ? (
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            display: "grid",
                            placeItems: "center",
                            background:
                                "radial-gradient(circle, rgba(0,0,0,.05), rgba(0,0,0,.45))",
                        }}
                    >
                        <PlayCircleRounded
                            sx={{
                                fontSize: 58,
                                color: "rgba(255,255,255,.92)",
                                filter: "drop-shadow(0 10px 24px rgba(0,0,0,.55))",
                            }}
                        />
                    </Box>
                ) : null}
            </Box>

            <CardContent>
                <Stack spacing={1.2}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <SourceChip
                            icon={
                                isVideo ? (
                                    <PlayCircleRounded sx={{ fontSize: 16 }} />
                                ) : item.type === "hypebeast" ? (
                                    <WhatshotRounded sx={{ fontSize: 16 }} />
                                ) : item.type === "traditions" ? (
                                    <AutoAwesomeRounded sx={{ fontSize: 16 }} />
                                ) : (
                                    <ArticleRounded sx={{ fontSize: 16 }} />
                                )
                            }
                            label={item.source}
                        />

                        <Chip
                            label={formatDate(item.publishedAt)}
                            size="small"
                            sx={{
                                color: "rgba(255,255,255,.72)",
                                background: "rgba(255,255,255,.06)",
                            }}
                        />
                    </Stack>

                    <Typography
                        variant="h6"
                        component="h3"
                        sx={{ color: "#fff", lineHeight: 1.18, fontWeight: 900 }}
                    >
                        {item.title}
                    </Typography>

                    <Typography
                        variant="body2"
                        sx={{ color: "rgba(255,255,255,.68)", minHeight: 64 }}
                    >
                        {item.description}
                    </Typography>

                    {isVideo ? (
                        <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                            {formatMetric(item.viewCount) ? (
                                <Chip
                                    size="small"
                                    icon={<VisibilityRounded sx={{ fontSize: 15 }} />}
                                    label={`${formatMetric(item.viewCount)} views`}
                                />
                            ) : null}
                            {formatMetric(item.likeCount) ? (
                                <Chip
                                    size="small"
                                    icon={<ThumbUpAltRounded sx={{ fontSize: 15 }} />}
                                    label={`${formatMetric(item.likeCount)} likes`}
                                />
                            ) : null}
                            {formatMetric(item.commentCount) ? (
                                <Chip
                                    size="small"
                                    icon={<ChatBubbleRounded sx={{ fontSize: 15 }} />}
                                    label={`${formatMetric(item.commentCount)} comments`}
                                />
                            ) : null}
                            {formatDuration(item.duration) ? (
                                <Chip
                                    size="small"
                                    icon={<ScheduleRounded sx={{ fontSize: 15 }} />}
                                    label={formatDuration(item.duration)}
                                />
                            ) : null}
                        </Stack>
                    ) : null}

                    {item.link ? (
                        <Button
                            component={Link}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            endIcon={<OpenInNewRounded />}
                            sx={{
                                alignSelf: "flex-start",
                                color: isVideo ? "#a78bfa" : "#67e8f9",
                                fontWeight: 900,
                            }}
                        >
                            {isVideo ? "Watch" : "Read story"}
                        </Button>
                    ) : null}
                </Stack>
            </CardContent>
        </Card>
    );
}

function EmbedCard({ item }) {
    const externalMediaEnabled = useExternalMediaAfterHydration();
    const platform = getEmbedPlatform(item);
    const validatedIframeSrc = externalMediaEnabled
        ? getAllowedIframeSrcFromHtml(item.html)
        : "";
    const [soundCloudPlayerRequested, setSoundCloudPlayerRequested] =
        useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const shouldMountIframe =
        Boolean(validatedIframeSrc) &&
        (platform !== "soundcloud" || soundCloudPlayerRequested);
    const previewImage =
        (!imageFailed && (item.thumbnail_url || item.thumbnail || item.image)) ||
        FALLBACK_IMAGE;

    useEffect(() => {
        setSoundCloudPlayerRequested(false);
        setImageFailed(false);
    }, [item.sourceUrl]);

    return (
        <Card
            sx={{
                height: "100%",
                border: "1px solid rgba(255,255,255,.08)",
                background:
                    "linear-gradient(180deg, rgba(10,18,33,.96), rgba(8,13,26,.98))",
                boxShadow: "0 20px 60px rgba(0,0,0,.28)",
                overflow: "hidden",
            }}
        >
            {shouldMountIframe ? (
                <Box
                    component="iframe"
                    title={item.title || item.label}
                    src={validatedIframeSrc}
                    loading="lazy"
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
                    sx={{
                        width: "100%",
                        height: platform === "youtube" ? 245 : 360,
                        border: 0,
                        display: "block",
                        background: "#050816",
                    }}
                />
            ) : (
                <Box
                    sx={{ position: "relative", minHeight: 245, background: "#050816" }}
                >
                    <CardMedia
                        component="img"
                        width="640"
                        height="360"
                        image={previewImage}
                        alt={item.title || item.label}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={() => setImageFailed(true)}
                        sx={{ height: 245, objectFit: "cover", opacity: 0.9 }}
                    />

                    {platform === "soundcloud" && validatedIframeSrc ? (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                display: "grid",
                                placeItems: "center",
                                p: 2,
                                background:
                                    "linear-gradient(180deg, rgba(5,8,22,.18), rgba(5,8,22,.78))",
                            }}
                        >
                            <Button
                                variant="contained"
                                startIcon={<PlayCircleRounded />}
                                onClick={() => setSoundCloudPlayerRequested(true)}
                                sx={{
                                    fontWeight: 950,
                                    color: "#1b0b00",
                                    background: "linear-gradient(135deg, #ff8a3d, #ff5500)",
                                }}
                            >
                                Load SoundCloud player
                            </Button>
                        </Box>
                    ) : null}
                </Box>
            )}

            <CardContent>
                <Stack spacing={1.1}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <SourceChip
                            icon={
                                platform === "youtube" ? (
                                    <PlayCircleRounded sx={{ fontSize: 16 }} />
                                ) : (
                                    <MusicNoteRounded sx={{ fontSize: 16 }} />
                                )
                            }
                            label={item.label}
                        />
                        <Chip
                            label={item.provider_name || platform}
                            size="small"
                            sx={{
                                color: "rgba(255,255,255,.72)",
                                background: "rgba(255,255,255,.06)",
                            }}
                        />
                        {platform === "youtube" && item.publishedAt ? (
                            <Chip size="small" label={formatDate(item.publishedAt)} />
                        ) : null}
                    </Stack>

                    <Typography
                        variant="h6"
                        sx={{ color: "#fff", fontWeight: 900, lineHeight: 1.2 }}
                    >
                        {item.title || "Music preview"}
                    </Typography>

                    {item.author_name || item.channelTitle ? (
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,.62)" }}>
                            {item.author_name || item.channelTitle}
                        </Typography>
                    ) : null}

                    {platform === "youtube" ? (
                        <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                            {formatMetric(item.viewCount) ? (
                                <Chip
                                    size="small"
                                    icon={<VisibilityRounded sx={{ fontSize: 15 }} />}
                                    label={`${formatMetric(item.viewCount)} views`}
                                />
                            ) : null}
                            {formatMetric(item.likeCount) ? (
                                <Chip
                                    size="small"
                                    icon={<ThumbUpAltRounded sx={{ fontSize: 15 }} />}
                                    label={`${formatMetric(item.likeCount)} likes`}
                                />
                            ) : null}
                            {formatMetric(item.commentCount) ? (
                                <Chip
                                    size="small"
                                    icon={<ChatBubbleRounded sx={{ fontSize: 15 }} />}
                                    label={`${formatMetric(item.commentCount)} comments`}
                                />
                            ) : null}
                            {formatMetric(item.concurrentViewers) ? (
                                <Chip
                                    size="small"
                                    icon={<VisibilityRounded sx={{ fontSize: 15 }} />}
                                    label={`${formatMetric(item.concurrentViewers)} watching`}
                                />
                            ) : null}
                            {formatDuration(item.duration) ? (
                                <Chip
                                    size="small"
                                    icon={<ScheduleRounded sx={{ fontSize: 15 }} />}
                                    label={formatDuration(item.duration)}
                                />
                            ) : null}
                            {item.definition ? (
                                <Chip
                                    size="small"
                                    label={String(item.definition).toUpperCase()}
                                />
                            ) : null}
                        </Stack>
                    ) : null}

                    {platform === "soundcloud" && !soundCloudPlayerRequested ? (
                        <Typography
                            variant="caption"
                            sx={{ color: "rgba(255,255,255,.54)" }}
                        >
                            The player starts only after a click so a removed SoundCloud item
                            cannot create repeated background errors.
                        </Typography>
                    ) : null}

                    {item.sourceUrl ? (
                        <Button
                            component={Link}
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            endIcon={<OpenInNewRounded />}
                            sx={{
                                alignSelf: "flex-start",
                                color: "#67e8f9",
                                fontWeight: 900,
                            }}
                        >
                            Open source
                        </Button>
                    ) : null}
                </Stack>
            </CardContent>
        </Card>
    );
}

function EmptyState({ label }) {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 4,
                border: "1px solid rgba(255,255,255,.08)",
                background: "rgba(255,255,255,.04)",
                color: "rgba(255,255,255,.72)",
            }}
        >
            {label}
        </Paper>
    );
}

function statusIcon(state) {
    if (state === "ok") {
        return <CheckCircleRounded sx={{ fontSize: 17, color: "#22c55e" }} />;
    }

    if (state === "fallback") {
        return <WarningAmberRounded sx={{ fontSize: 17, color: "#f59e0b" }} />;
    }

    return <ErrorOutlineRounded sx={{ fontSize: 17, color: "#ef4444" }} />;
}

function BottomStatusPanel({ statuses, loading, onRefresh }) {
    const failedCount = statuses.filter((item) => item.state === "failed").length;
    const fallbackCount = statuses.filter(
        (item) => item.state === "fallback",
    ).length;
    const okCount = statuses.filter((item) => item.state === "ok").length;

    return (
        <Paper
            component="section"
            aria-labelledby="request-status-heading"
            elevation={12}
            sx={{
                mt: 6,
                p: { xs: 2, md: 2.5 },
                border: "1px solid rgba(255,255,255,.14)",
                background:
                    "linear-gradient(135deg, rgba(7,10,19,.96), rgba(13,18,36,.96))",
                boxShadow: "0 24px 80px rgba(0,0,0,.38)",
            }}
        >
            <Stack spacing={1.5}>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", md: "center" }}
                    spacing={1.5}
                >
                    <Box>
                        <Typography
                            id="request-status-heading"
                            sx={{ color: "#fff", fontWeight: 950 }}
                        >
                            News request status
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,.58)" }}>
                            Reports every Hypebeast, WordPress, YouTube, Spotify, and
                            SoundCloud request.
                        </Typography>
                    </Box>

                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", sm: "center" }}
                    >
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip
                                size="small"
                                label={`${okCount} loaded`}
                                sx={{ color: "#fff" }}
                            />
                            <Chip
                                size="small"
                                label={`${fallbackCount} fallback`}
                                sx={{ color: "#fff" }}
                            />
                            <Chip
                                size="small"
                                label={`${failedCount} failed`}
                                sx={{ color: "#fff" }}
                            />
                        </Stack>

                        <Button
                            variant="outlined"
                            startIcon={
                                loading ? (
                                    <CircularProgress size={16} color="inherit" />
                                ) : (
                                    <RefreshRounded />
                                )
                            }
                            onClick={onRefresh}
                            disabled={loading}
                            sx={{
                                borderColor: "rgba(103,232,249,.38)",
                                color: "#67e8f9",
                                fontWeight: 900,
                            }}
                        >
                            {loading ? "Requesting..." : "Run requests again"}
                        </Button>
                    </Stack>
                </Stack>

                <Box sx={{ maxHeight: 180, overflow: "auto", pr: 0.5 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {statuses.length > 0 ? (
                            statuses.map((item, index) => (
                                <Chip
                                    key={`${item.label}-${index}`}
                                    size="small"
                                    icon={statusIcon(item.state)}
                                    label={`${item.label}: ${item.state}`}
                                    title={item.message}
                                    sx={{
                                        color: "rgba(255,255,255,.86)",
                                        borderColor: "rgba(255,255,255,.12)",
                                        background:
                                            item.state === "ok"
                                                ? "rgba(34,197,94,.10)"
                                                : item.state === "fallback"
                                                    ? "rgba(245,158,11,.12)"
                                                    : "rgba(239,68,68,.12)",
                                        mb: 0.75,
                                    }}
                                    variant="outlined"
                                />
                            ))
                        ) : (
                            <Typography
                                variant="body2"
                                sx={{ color: "rgba(255,255,255,.58)" }}
                            >
                                No requests have completed yet.
                            </Typography>
                        )}
                    </Stack>
                </Box>
            </Stack>
        </Paper>
    );
}

function buildArticleSchema(items) {
    return items.slice(0, 18).map((item) => ({
        "@type": item.type === "video" ? "VideoObject" : "NewsArticle",
        headline: item.title,
        description: item.description,
        url: item.link,
        image: [item.image || FALLBACK_IMAGE],
        datePublished: item.publishedAt
            ? new Date(item.publishedAt).toISOString()
            : undefined,
        author: item.creator
            ? { "@type": "Person", name: item.creator }
            : undefined,
        publisher: {
            "@type": "Organization",
            name: "AudioMaster Lab",
            logo: {
                "@type": "ImageObject",
                url: `${SITE_ROOT}/logo192.png`,
            },
        },
    }));
}

function SeoBlock({
                      hypebeastArticles,
                      wordpressArticles,
                      traditionsArticles,
                      videos,
                  }) {
    const allItems = [
        ...hypebeastArticles,
        ...traditionsArticles,
        ...wordpressArticles,
        ...videos,
    ].filter(Boolean);
    const itemList = allItems.slice(0, 30).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: item.link || `${PAGE_URL}#${item.id}`,
        name: item.title,
        image: item.image || FALLBACK_IMAGE,
    }));
    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": `${PAGE_URL}#webpage`,
                url: PAGE_URL,
                name: "Music News, Articles & Releases | AudioMaster Lab",
                description:
                    "Fresh Hypebeast stories, WordPress music articles, Traditions of the Sun posts, YouTube videos, Spotify previews, and SoundCloud players.",
                isPartOf: {
                    "@type": "WebSite",
                    "@id": `${SITE_ROOT}/#website`,
                    name: "AudioMaster Lab",
                    url: SITE_ROOT,
                },
            },
            {
                "@type": "ItemList",
                name: "AudioMaster Lab WordPress Music News Feed",
                itemListElement: itemList,
            },
            ...buildArticleSchema(allItems),
        ],
    };

    return (
        <Helmet>
            <title>Music News, Articles & Releases | AudioMaster Lab</title>
            <meta
                name="description"
                content="Fresh Hypebeast stories, WordPress music news, Traditions of the Sun articles, YouTube videos, Spotify previews, and SoundCloud embeds from AudioMaster Lab."
            />
            <meta
                name="keywords"
                content="music news, Hypebeast, WordPress music articles, Traditions of the Sun, new music, music reviews, hip-hop, electronic music, YouTube Music, Spotify, SoundCloud"
            />
            <meta
                name="robots"
                content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
            />
            <link rel="canonical" href={PAGE_URL} />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="AudioMaster Lab" />
            <meta
                property="og:title"
                content="Music News, Articles & Releases | AudioMaster Lab"
            />
            <meta
                property="og:description"
                content="WordPress music reporting, new releases, videos, and playable music previews."
            />
            <meta property="og:url" content={PAGE_URL} />
            <meta property="og:image" content={FALLBACK_IMAGE} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta
                name="twitter:title"
                content="Music News, Articles & Releases | AudioMaster Lab"
            />
            <meta name="twitter:image" content={FALLBACK_IMAGE} />
            <script type="application/ld+json">{JSON.stringify(schema)}</script>
        </Helmet>
    );
}

function ArticleSection({
                            id,
                            title,
                            description,
                            items,
                            loading,
                            emptyLabel,
                        }) {
    return (
        <Box component="section" aria-labelledby={id}>
            <Stack sx={{ mb: 2.5 }}>
                <Typography
                    id={id}
                    variant="h2"
                    sx={{
                        fontSize: { xs: 28, md: 34 },
                        fontWeight: 950,
                        letterSpacing: "-.035em",
                    }}
                >
                    {title}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,.62)" }}>
                    {description}
                </Typography>
            </Stack>

            <Divider sx={{ mb: 3, borderColor: "rgba(255,255,255,.08)" }} />

            {loading && items.length === 0 ? (
                <Box sx={{ py: 7, textAlign: "center" }}>
                    <CircularProgress />
                </Box>
            ) : items.length > 0 ? (
                <Grid container spacing={2.5}>
                    {items.map((item) => (
                        <Grid item xs={12} md={6} lg={4} key={item.id}>
                            <ArticleCard item={item} />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <EmptyState label={emptyLabel} />
            )}
        </Box>
    );
}

export default function NewsPage() {
    const initialSnapshot = useMemo(() => readEmbeddedNewsSnapshot(), []);
    const requestControllerRef = useRef(null);

    const [hypebeastArticles, setHypebeastArticles] = useState(
        () => initialSnapshot?.hypebeastArticles || [],
    );
    const [wordpressArticles, setWordpressArticles] = useState(
        () => initialSnapshot?.wordpressArticles || [],
    );
    const [traditionsArticles, setTraditionsArticles] = useState(
        () => initialSnapshot?.traditionsArticles || [],
    );
    const [videos, setVideos] = useState(() => initialSnapshot?.videos || []);
    const [embeds, setEmbeds] = useState(() => initialSnapshot?.embeds || []);
    const [statuses, setStatuses] = useState(
        () => initialSnapshot?.statuses || [],
    );
    const [generatedAt, setGeneratedAt] = useState(
        () => initialSnapshot?.generatedAt || new Date().toISOString(),
    );
    const [loading, setLoading] = useState(() => !initialSnapshot);

    const bootstrapSnapshot = useMemo(
        () =>
            makeNewsSnapshot({
                hypebeastArticles,
                wordpressArticles,
                traditionsArticles,
                videos,
                embeds,
                statuses,
                generatedAt,
            }),
        [
            hypebeastArticles,
            wordpressArticles,
            traditionsArticles,
            videos,
            embeds,
            statuses,
            generatedAt,
        ],
    );

    const loadNews = useCallback(async () => {
        requestControllerRef.current?.abort();

        const controller = new AbortController();
        requestControllerRef.current = controller;

        const { signal } = controller;
        const timeoutId = window.setTimeout(
            () => controller.abort(),
            isReactSnapRun() ? 22000 : 45000,
        );

        setLoading(true);

        try {
            const hypebeastJobs = HYPEBEAST_SOURCES.map(async (source) => {
                const proxyUrl = buildHypebeastFeedUrl(source.feed);
                const responseText = await fetchTextWithTimeout(
                    proxyUrl,
                    signal,
                    source.mode === "rss"
                        ? "application/rss+xml, application/xml, text/xml, text/html, */*"
                        : "text/html, application/xhtml+xml, application/xml, */*",
                );
                const rssSource = {
                    id: `hypebeast-${source.feed}`,
                    label: source.label,
                    group: "hypebeast",
                    baseUrl: "https://hypebeast.com",
                    forceMusic: true,
                };
                const items =
                    source.mode === "rss" && !isHtmlResponse(responseText)
                        ? parseRssArticles(responseText, rssSource)
                            .map((item) => ({ ...item, type: "hypebeast" }))
                            .filter((item) => !isBadHypebeastCard(item))
                        : parseHypebeastHtml(responseText, source.label);

                return { source, items };
            });

            const wordpressSourceJobs = WORDPRESS_READER_SOURCES.map((source) => ({
                ...source,
                group: "wordpress",
                forceMusic: true,
                baseUrl: "https://wordpress.com",
                mode: "json",
                targetUrl: buildWordPressReaderTarget(source.tag),
            }));

            const traditionsSourceJobs = [
                {
                    id: "traditions-latest",
                    label: "Traditions of the Sun · most recent",
                    group: "traditions",
                    forceMusic: false,
                    baseUrl: "https://traditionsofthesun.org",
                    requestUrl: buildTraditionsProxyUrl({ perPage: 100 }),
                },
                {
                    id: "traditions-music-tag",
                    label: "Traditions of the Sun · music tag",
                    group: "traditions",
                    forceMusic: true,
                    baseUrl: "https://traditionsofthesun.org",
                    // Traditions currently exposes its Music tag as WordPress tag 949.
                    requestUrl: buildTraditionsProxyUrl({ perPage: 100, tags: 949 }),
                },
                {
                    id: "traditions-news-category",
                    label: "Traditions of the Sun · news",
                    group: "traditions",
                    forceMusic: false,
                    baseUrl: "https://traditionsofthesun.org",
                    // Traditions currently exposes News as WordPress category 38.
                    requestUrl: buildTraditionsProxyUrl({ perPage: 100, categories: 38 }),
                },
                {
                    id: "traditions-entertainment-category",
                    label: "Traditions of the Sun · entertainment",
                    group: "traditions",
                    forceMusic: false,
                    baseUrl: "https://traditionsofthesun.org",
                    // Traditions currently exposes Entertainment as category 678.
                    requestUrl: buildTraditionsProxyUrl({
                        perPage: 100,
                        categories: 678,
                    }),
                },
            ];

            const wordpressPromise = allSettledWithConcurrency(
                wordpressSourceJobs,
                EMBED_REQUEST_CONCURRENCY,
                async (source) => {
                    const proxyUrl = buildProxyUrl("wordpressproxy", source.targetUrl);
                    const items = parseWordPressPosts(
                        await fetchJsonWithTimeout(proxyUrl, signal),
                        source,
                    );

                    return { source, items };
                },
            );

            const traditionsPromise = allSettledWithConcurrency(
                traditionsSourceJobs,
                EMBED_REQUEST_CONCURRENCY,
                async (source) => {
                    const payload = await fetchJsonWithTimeout(source.requestUrl, signal);
                    const items = parseWordPressPosts(payload, source);

                    return { source, items };
                },
            );

            const videoJobs = YOUTUBE_CHANNEL_FEEDS.map(async (feed) => {
                const targetUrl = buildYoutubeFeedTarget(feed.channelId);
                const proxyUrl = buildProxyUrl("youtuberssproxy", targetUrl);
                const xml = await fetchTextWithTimeout(
                    proxyUrl,
                    signal,
                    "application/atom+xml, application/xml, text/xml, */*",
                );

                return {
                    label: feed.label,
                    items: parseYoutubeFeed(xml, feed.label),
                };
            });

            const nonYoutubeEmbedRequests = FEATURED_OEMBEDS.filter(
                (item) => item.type !== "youtube",
            );
            const nonYoutubeEmbedPromise = allSettledWithConcurrency(
                nonYoutubeEmbedRequests,
                EMBED_REQUEST_CONCURRENCY,
                (item) => fetchOembedCard(item, signal),
            );

            const [
                hypebeastSettled,
                wordpressSettled,
                traditionsSettled,
                videoSettled,
                nonYoutubeEmbedSettled,
            ] = await Promise.all([
                Promise.allSettled(hypebeastJobs),
                wordpressPromise,
                traditionsPromise,
                Promise.allSettled(videoJobs),
                nonYoutubeEmbedPromise,
            ]);

            const nextHypebeastArticles = dedupeArticles(
                hypebeastSettled
                    .filter((result) => result.status === "fulfilled")
                    .flatMap((result) => result.value.items)
                    .filter((item) => !isBadHypebeastCard(item)),
                MAX_HYPEBEAST_ARTICLES,
            );

            const fulfilledWordPress = wordpressSettled
                .filter((result) => result.status === "fulfilled")
                .map((result) => result.value);
            const fulfilledTraditions = traditionsSettled
                .filter((result) => result.status === "fulfilled")
                .map((result) => result.value);
            const nextTraditionsArticles = dedupeArticles(
                fulfilledTraditions.flatMap((entry) => entry.items),
                MAX_TRADITIONS_ARTICLES,
            );
            const nextWordpressArticles = dedupeArticles(
                fulfilledWordPress.flatMap((entry) => entry.items),
                MAX_WORDPRESS_ARTICLES,
            );

            const rawVideos = videoSettled
                .filter((result) => result.status === "fulfilled")
                .flatMap((result) => result.value.items)
                .filter((item) => item.title && item.videoId)
                .filter(
                    (item, index, array) =>
                        array.findIndex((other) => other.videoId === item.videoId) ===
                        index,
                )
                .sort((a, b) => toTimestamp(b.publishedAt) - toTimestamp(a.publishedAt))
                .slice(0, MAX_YOUTUBE_STATS_IDS);

            const fixedYoutubeRequests = FEATURED_OEMBEDS.filter(
                (item) => item.type === "youtube",
            );
            const statsIds = [
                ...rawVideos.map((item) => item.videoId),
                ...fixedYoutubeRequests.map(
                    (item) => item.videoId || getYoutubeVideoId(item.sourceUrl),
                ),
            ];
            const youtubeStatsResult = await fetchYoutubeStats(statsIds, signal);
            const hydratedYoutubeCandidates = rawVideos
                .map((item) => hydrateYoutubeItem(item, youtubeStatsResult.statsById))
                .filter((item) => item.embeddable !== false);
            const nextVideos = sortPopularYoutubeVideos(
                hydratedYoutubeCandidates,
            ).slice(0, MAX_YOUTUBE_NEWS_CARDS);
            const popularYoutubeEmbedRequests = nextVideos
                .slice(0, MAX_LATEST_YOUTUBE_EMBEDS)
                .map((video) => ({
                    type: "youtube",
                    label: `Popular · ${video.source}`,
                    sourceUrl: video.link,
                    videoId: video.videoId,
                    title: video.title,
                    description: video.description,
                    image: video.image,
                    thumbnail_url: video.image,
                    channelTitle: video.channelTitle,
                    publishedAt: video.publishedAt,
                    viewCount: video.viewCount,
                    likeCount: video.likeCount,
                    commentCount: video.commentCount,
                    duration: video.duration,
                    definition: video.definition,
                }));
            const youtubeEmbedRequests = dedupeBySourceUrl([
                ...popularYoutubeEmbedRequests,
                ...fixedYoutubeRequests,
            ]);
            const youtubeEmbedSettled = await allSettledWithConcurrency(
                youtubeEmbedRequests,
                EMBED_REQUEST_CONCURRENCY,
                (item) => fetchOembedCard(item, signal),
            );
            const nextEmbeds = [...nonYoutubeEmbedSettled, ...youtubeEmbedSettled]
                .filter((result) => result.status === "fulfilled")
                .map((result) => result.value.card)
                .filter(Boolean)
                .map((item) =>
                    getEmbedPlatform(item) === "youtube"
                        ? hydrateYoutubeItem(item, youtubeStatsResult.statsById)
                        : item,
                )
                .filter(isRenderableEmbedCard)
                .filter(
                    (item, index, array) =>
                        array.findIndex(
                            (other) =>
                                String(other.sourceUrl || "") === String(item.sourceUrl || ""),
                        ) === index,
                );

            const traditionsSuccessCount = fulfilledTraditions.length;
            const popularYoutubeSuccessCount = youtubeEmbedSettled.filter(
                (result, index) =>
                    index < popularYoutubeEmbedRequests.length &&
                    result.status === "fulfilled",
            ).length;
            const nextStatuses = [
                ...hypebeastSettled.map((result, index) => ({
                    label: HYPEBEAST_SOURCES[index]?.label || "Hypebeast",
                    kind: "Hypebeast",
                    state: result.status === "fulfilled" ? "ok" : "failed",
                    message:
                        result.status === "fulfilled"
                            ? `Loaded ${result.value.items.length} Hypebeast stories.`
                            : result.reason?.message || "Hypebeast request failed.",
                })),
                ...wordpressSettled.map((result, index) => {
                    const source = wordpressSourceJobs[index];

                    return result.status === "fulfilled"
                        ? {
                            label: source.label,
                            kind: "WordPress REST",
                            state: result.value.items.length > 0 ? "ok" : "fallback",
                            message: `Loaded ${result.value.items.length} articles through /api/wordpressproxy.`,
                        }
                        : {
                            label: source.label,
                            kind: "WordPress REST",
                            state: "failed",
                            message: result.reason?.message || "WordPress request failed.",
                        };
                }),
                ...traditionsSettled.map((result, index) => {
                    const source = traditionsSourceJobs[index];

                    return result.status === "fulfilled"
                        ? {
                            label: source.label,
                            kind: "Traditions REST",
                            state: result.value.items.length > 0 ? "ok" : "fallback",
                            message: `Loaded ${result.value.items.length} articles through /api/traditionsofthesunproxy.`,
                        }
                        : {
                            label: source.label,
                            kind: "Traditions REST",
                            state: "failed",
                            message:
                                result.reason?.message ||
                                "Traditions of the Sun proxy request failed.",
                        };
                }),
                {
                    label: "Traditions of the Sun group",
                    kind: "Traditions REST group",
                    state: nextTraditionsArticles.length > 0 ? "ok" : "fallback",
                    message:
                        nextTraditionsArticles.length > 0
                            ? `Rendered ${nextTraditionsArticles.length} newest-first Traditions articles from ${traditionsSuccessCount} successful traditionsofthesunproxy requests.`
                            : "No Traditions request returned usable articles; the page keeps its previous usable Traditions section instead of clearing it.",
                },
                ...videoSettled.map((result, index) => ({
                    label: YOUTUBE_CHANNEL_FEEDS[index]?.label || "YouTube RSS",
                    kind: "YouTube RSS",
                    state: result.status === "fulfilled" ? "ok" : "failed",
                    message:
                        result.status === "fulfilled"
                            ? `Loaded ${result.value.items.length} recent channel videos.`
                            : result.reason?.message || "YouTube feed failed.",
                })),
                youtubeStatsResult.status,
                ...nonYoutubeEmbedSettled.map((result, index) =>
                    result.status === "fulfilled"
                        ? result.value.status
                        : {
                            label: nonYoutubeEmbedRequests[index]?.label || "Media embed",
                            kind: "oEmbed",
                            state: "failed",
                            message: result.reason?.message || "Embed request failed.",
                        },
                ),
                {
                    label: "Popular YouTube music embeds",
                    kind: "YouTube oEmbed group",
                    state:
                        popularYoutubeSuccessCount > 0
                            ? "ok"
                            : popularYoutubeEmbedRequests.length > 0
                                ? "failed"
                                : "fallback",
                    message:
                        popularYoutubeEmbedRequests.length > 0
                            ? `Loaded ${popularYoutubeSuccessCount} of ${popularYoutubeEmbedRequests.length} popularity-ranked music embeds.`
                            : "No popularity-ranked YouTube music embeds were requested.",
                },
                ...youtubeEmbedSettled
                    .slice(popularYoutubeEmbedRequests.length)
                    .map((result, fixedIndex) => {
                        const request = fixedYoutubeRequests[fixedIndex];

                        return result.status === "fulfilled"
                            ? result.value.status
                            : {
                                label: request?.label || "Featured YouTube embed",
                                kind: "YouTube oEmbed",
                                state: "failed",
                                message: result.reason?.message || "YouTube embed failed.",
                            };
                    }),
            ];

            setHypebeastArticles((current) =>
                nextHypebeastArticles.length > 0 ? nextHypebeastArticles : current,
            );
            setWordpressArticles((current) =>
                nextWordpressArticles.length > 0 ? nextWordpressArticles : current,
            );
            setTraditionsArticles((current) =>
                nextTraditionsArticles.length > 0 ? nextTraditionsArticles : current,
            );
            setVideos((current) => (nextVideos.length > 0 ? nextVideos : current));
            setEmbeds((current) => (nextEmbeds.length > 0 ? nextEmbeds : current));
            setStatuses(nextStatuses);
            setGeneratedAt(new Date().toISOString());
        } catch (error) {
            if (error?.name !== "AbortError") {
                setStatuses((current) => [
                    ...current,
                    {
                        label: "News page",
                        kind: "page",
                        state: "failed",
                        message: error?.message || "News page failed to load.",
                    },
                ]);
            }
        } finally {
            window.clearTimeout(timeoutId);

            if (requestControllerRef.current === controller) {
                requestControllerRef.current = null;
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void loadNews();

        return () => {
            requestControllerRef.current?.abort();
            requestControllerRef.current = null;
        };
    }, [loadNews]);

    const youtubeEmbeds = useMemo(
        () => embeds.filter((item) => getEmbedPlatform(item) === "youtube"),
        [embeds],
    );
    const spotifyEmbeds = useMemo(
        () => embeds.filter((item) => getEmbedPlatform(item) === "spotify"),
        [embeds],
    );
    const soundCloudEmbeds = useMemo(
        () => embeds.filter((item) => getEmbedPlatform(item) === "soundcloud"),
        [embeds],
    );

    return (
        <Box
            component="main"
            sx={{
                minHeight: "100vh",
                color: "#fff",
                background:
                    "radial-gradient(circle at top left, rgba(103,232,249,.16), transparent 35%), radial-gradient(circle at top right, rgba(167,139,250,.18), transparent 36%), #070a13",
                pb: 6,
            }}
        >
            <SeoBlock
                hypebeastArticles={hypebeastArticles}
                wordpressArticles={wordpressArticles}
                traditionsArticles={traditionsArticles}
                videos={videos}
            />

            <script
                id={NEWS_BOOTSTRAP_ID}
                type="application/json"
                dangerouslySetInnerHTML={{
                    __html: safeJsonForHtml(bootstrapSnapshot),
                }}
            />

            <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3, md: 5 },
                        mb: 4,
                        border: "1px solid rgba(255,255,255,.10)",
                        background:
                            "linear-gradient(135deg, rgba(13,18,36,.94), rgba(7,10,19,.98))",
                        boxShadow: "0 30px 90px rgba(0,0,0,.35)",
                        overflow: "hidden",
                        position: "relative",
                    }}
                >
                    <Stack spacing={2.5} sx={{ position: "relative", zIndex: 1 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <SourceChip
                                icon={<WhatshotRounded sx={{ fontSize: 16 }} />}
                                label="Hypebeast"
                            />
                            <SourceChip
                                icon={<ArticleRounded sx={{ fontSize: 16 }} />}
                                label="WordPress Music News"
                            />
                            <SourceChip
                                icon={<AutoAwesomeRounded sx={{ fontSize: 16 }} />}
                                label="Traditions of the Sun"
                            />
                            <SourceChip
                                icon={<PlayCircleRounded sx={{ fontSize: 16 }} />}
                                label="YouTube"
                            />
                            <SourceChip
                                icon={<MusicNoteRounded sx={{ fontSize: 16 }} />}
                                label="Spotify"
                            />
                            <SourceChip
                                icon={<MusicNoteRounded sx={{ fontSize: 16 }} />}
                                label="SoundCloud"
                            />
                        </Stack>

                        <Typography
                            variant="h1"
                            sx={{
                                fontWeight: 950,
                                letterSpacing: "-.055em",
                                fontSize: { xs: "2.35rem", md: "4.75rem" },
                                lineHeight: 0.92,
                            }}
                        >
                            Hypebeast, WordPress music news, and release radar.
                        </Typography>

                        <Typography
                            variant="h6"
                            sx={{
                                maxWidth: 1020,
                                color: "rgba(255,255,255,.72)",
                                lineHeight: 1.55,
                            }}
                        >
                            Hypebeast remains the first news section and uses one 15-item API
                            request. WordPress music stories are gathered through
                            `/api/wordpressproxy`. Popular YouTube music videos are ranked
                            with the statistics response, and Traditions of the Sun is
                            hydrated newest-first and placed at the end of the article-news
                            sections.
                        </Typography>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <Button
                                variant="contained"
                                startIcon={
                                    loading ? (
                                        <CircularProgress size={18} color="inherit" />
                                    ) : (
                                        <RefreshRounded />
                                    )
                                }
                                onClick={loadNews}
                                disabled={loading}
                                sx={{
                                    alignSelf: { xs: "stretch", sm: "flex-start" },
                                    fontWeight: 950,
                                    color: "#06111f",
                                    background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                }}
                            >
                                {loading ? "Refreshing..." : "Refresh news"}
                            </Button>

                            <Button
                                component={Link}
                                href="/audio"
                                variant="outlined"
                                sx={{
                                    alignSelf: { xs: "stretch", sm: "flex-start" },
                                    borderColor: "rgba(255,255,255,.18)",
                                    color: "#fff",
                                    fontWeight: 900,
                                }}
                            >
                                Open audio tools
                            </Button>
                        </Stack>

                        <Typography
                            variant="caption"
                            sx={{ color: "rgba(255,255,255,.52)" }}
                        >
                            Feed snapshot generated {formatGeneratedAt(generatedAt)}.
                        </Typography>
                    </Stack>
                </Paper>

                <Stack spacing={5}>
                    <ArticleSection
                        id="hypebeast-heading"
                        title="Hypebeast — latest stories"
                        description="Hypebeast stays at the top of the page. A single Hypebeast API request asks for 15 items, then the frontend filters duplicates and sorts the returned stories newest-first."
                        items={hypebeastArticles}
                        loading={loading}
                        emptyLabel="No Hypebeast stories loaded. Check /api/hypebeastproxy in the request status panel."
                    />

                    <ArticleSection
                        id="wordpress-music-heading"
                        title="WordPress music news network"
                        description="Music news, new releases, reviews, hip-hop, and electronic articles gathered through public WordPress Reader tag endpoints and the shared wordpressproxy."
                        items={wordpressArticles}
                        loading={loading}
                        emptyLabel="No WordPress music articles loaded. Check /api/wordpressproxy and the WordPress Reader tag requests shown in the status panel."
                    />

                    <ArticleSection
                        id="youtube-news-heading"
                        title="Newest YouTube music videos"
                        description="Recent videos from YouTube Music, NPR Music, major artists, COLORS, and Lyrical Lemonade are hydrated with one statistics request and ranked by views, likes, comments, and recency. The same statistics appear inside the YouTube embed cards below."
                        items={videos}
                        loading={loading}
                        emptyLabel="No YouTube music videos loaded. Check /api/youtuberssproxy and /api/youtubestatsproxy."
                    />

                    <ArticleSection
                        id="traditions-heading"
                        title="Traditions of the Sun — music articles and news"
                        description="Traditions is the final article-news section. Its most-recent, music-tag, news, and entertainment responses come through traditionsofthesunproxy, are merged with embedded media, deduplicated, and sorted newest-first; failed refreshes preserve the last usable section."
                        items={traditionsArticles}
                        loading={loading}
                        emptyLabel="No Traditions articles are available yet. Check the traditionsofthesunproxy requests in the status panel."
                    />

                    <Box component="section" aria-labelledby="youtube-embeds-heading">
                        <Typography
                            id="youtube-embeds-heading"
                            variant="h2"
                            sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 950, mb: 1 }}
                        >
                            YouTube music embeds and statistics
                        </Typography>
                        <Typography sx={{ color: "rgba(255,255,255,.62)", mb: 3 }}>
                            The highest-ranked music videos from the expanded channel feeds
                            become privacy-enhanced embeds automatically. Views, likes,
                            comments, duration, live audience, and quality remain in this same
                            container.
                        </Typography>

                        {youtubeEmbeds.length > 0 ? (
                            <Grid container spacing={2.5}>
                                {youtubeEmbeds.map((item) => (
                                    <Grid item xs={12} md={6} lg={4} key={item.sourceUrl}>
                                        <EmbedCard item={item} />
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <EmptyState label="No YouTube embeds loaded." />
                        )}
                    </Box>

                    <Box component="section" aria-labelledby="spotify-heading">
                        <Typography
                            id="spotify-heading"
                            variant="h2"
                            sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 950, mb: 1 }}
                        >
                            Spotify previews
                        </Typography>
                        <Typography sx={{ color: "rgba(255,255,255,.62)", mb: 3 }}>
                            Albums, tracks, and playlists remain playable through Spotify
                            oEmbed with a direct official-player fallback.
                        </Typography>

                        {spotifyEmbeds.length > 0 ? (
                            <Grid container spacing={2.5}>
                                {spotifyEmbeds.map((item) => (
                                    <Grid item xs={12} md={6} lg={4} key={item.sourceUrl}>
                                        <EmbedCard item={item} />
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <EmptyState label="No Spotify embeds loaded." />
                        )}
                    </Box>

                    <Box component="section" aria-labelledby="soundcloud-heading">
                        <Typography
                            id="soundcloud-heading"
                            variant="h2"
                            sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 950, mb: 1 }}
                        >
                            Expanded SoundCloud players
                        </Typography>
                        <Typography sx={{ color: "rgba(255,255,255,.62)", mb: 3 }}>
                            SoundCloud oEmbed metadata is used when available, with a
                            click-to-load official widget fallback for known tracks and artist
                            pages. No SoundCloud iframe mounts during page load, preventing
                            repeated 404, canvas, and AudioContext errors.
                        </Typography>

                        {soundCloudEmbeds.length > 0 ? (
                            <Grid container spacing={2.5}>
                                {soundCloudEmbeds.map((item) => (
                                    <Grid item xs={12} md={6} lg={4} key={item.sourceUrl}>
                                        <EmbedCard item={item} />
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <EmptyState label="No SoundCloud embeds loaded." />
                        )}
                    </Box>
                </Stack>

                <BottomStatusPanel
                    statuses={statuses}
                    loading={loading}
                    onRefresh={loadNews}
                />
            </Container>
        </Box>
    );
}
