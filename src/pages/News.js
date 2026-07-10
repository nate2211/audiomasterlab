import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    ErrorOutlineRounded,
    MusicNoteRounded,
    OpenInNewRounded,
    PlayCircleRounded,
    RefreshRounded,
    RssFeedRounded,
    WarningAmberRounded,
    WhatshotRounded,
} from "@mui/icons-material";

const SCRAPE_API_ROOT =
    process.env.REACT_APP_SCRAPE_API_ROOT || "https://scrapewebsite.pages.dev/api";

const SITE_ROOT = "https://audiomasterlab.com";
const PAGE_URL = `${SITE_ROOT}/news`;
const FALLBACK_IMAGE = `${SITE_ROOT}/social-preview.png`;
const NPR_FALLBACK_IMAGE =
    "https://media.npr.org/images/podcasts/primary/npr_generic_image_300.jpg?s=600";
const MAX_DATA_IMAGE_CHARS = 1400000;

const NEWS_BOOTSTRAP_ID = "audiomasterlab-news-bootstrap";

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
        imageViaProxy: sanitizeSnapshotImage(item.imageViaProxy),
        thumbnail: sanitizeSnapshotImage(item.thumbnail),
        thumbnail_url: sanitizeSnapshotImage(item.thumbnail_url),
    };
}

function makeNewsSnapshot({
                              rssArticles,
                              hypebeastArticles,
                              videos,
                              embeds,
                              statuses,
                              generatedAt,
                          }) {
    return {
        version: 1,
        generatedAt,
        rssArticles: rssArticles.map(sanitizeSnapshotItem),
        hypebeastArticles: hypebeastArticles.map(sanitizeSnapshotItem),
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
        console.warn("Could not read embedded AudioMaster Lab news state:", error);
        return null;
    }
}

function formatGeneratedAt(value) {
    const date = new Date(value || 0);

    if (Number.isNaN(date.getTime())) {
        return "recently";
    }

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

const NPR_FEEDS = [
    {
        label: "NPR Music",
        url: "https://feeds.npr.org/1039/rss.xml",
    },
];

const HYPEBEAST_SOURCES = [
    { label: "Hypebeast Main", feed: "main", mode: "rss" },
    { label: "Hypebeast Music", feed: "music", mode: "html" },
    { label: "Hypebeast Fashion", feed: "fashion", mode: "html" },
    { label: "Hypebeast Footwear", feed: "footwear", mode: "html" },
    { label: "Hypebeast Art", feed: "art", mode: "html" },
    { label: "Hypebeast Design", feed: "design", mode: "html" },
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
];

const FEATURED_OEMBEDS = [
    {
        type: "youtube",
        label: "Featured YouTube Video",
        sourceUrl: "https://www.youtube.com/watch?v=ox1Eemj8FDo",
    },
    {
        type: "spotify",
        label: "Spotify Album Preview",
        sourceUrl: "https://open.spotify.com/album/0fSfkmx0tdPqFYkJuNX74a",
    },
    {
        type: "spotify",
        label: "Spotify Playlist Preview",
        sourceUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    },
    {
        type: "soundcloud",
        label: "SoundCloud Track Preview",
        sourceUrl: "https://soundcloud.com/forss/flickermood",
    },
];

function buildProxyUrl(proxyName, targetUrl) {
    return `${SCRAPE_API_ROOT}/${proxyName}?url=${encodeURIComponent(targetUrl)}`;
}

function buildProxyImageUrl(imageUrl) {
    if (!imageUrl || imageUrl.startsWith("data:")) return imageUrl || "";
    return buildProxyUrl("nprimageproxy", imageUrl);
}

function buildHypebeastFeedUrl(feedKey) {
    return `${SCRAPE_API_ROOT}/hypebeastproxy?feed=${encodeURIComponent(feedKey)}`;
}

function buildYoutubeFeedTarget(channelId) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(
        channelId
    )}`;
}

function buildYoutubeOembedTarget(videoUrl) {
    const target = new URL("https://www.youtube.com/oembed");
    target.searchParams.set("format", "json");
    target.searchParams.set("url", videoUrl);
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
            .replace(/<[^>]+>/g, " ")
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
    const value = String(text || "").trim().slice(0, 400).toLowerCase();

    return (
        value.startsWith("<!doctype html") ||
        value.startsWith("<html") ||
        value.includes("<head") ||
        value.includes("<body")
    );
}

function isDataImageUrl(value) {
    const text = String(value || "").trim();
    return /^data:image\/(png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/i.test(
        text
    );
}

function isTrackingPixel(value) {
    const text = String(value || "").toLowerCase();
    return (
        text.includes("tracking") ||
        text.includes("npr-rss-pixel") ||
        text.includes("pixel.png") ||
        text.includes("spacer.gif")
    );
}

function isUsableImageUrl(value) {
    const text = String(value || "").trim();

    if (!text) return false;
    if (text.startsWith("blob:")) return false;

    if (isDataImageUrl(text)) {
        return text.length <= MAX_DATA_IMAGE_CHARS;
    }

    if (text.startsWith("data:")) return false;
    if (isTrackingPixel(text)) return false;
    if (text.length > 2600) return false;

    try {
        const url = new URL(text, window.location.origin);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

function normalizeImageUrl(value, baseUrl = "https://www.npr.org") {
    const text = decodeHtml(String(value || "").trim());

    if (!text) return "";

    if (isDataImageUrl(text)) {
        return text.length <= MAX_DATA_IMAGE_CHARS ? text : "";
    }

    if (!isUsableImageUrl(text)) return "";

    try {
        const url = new URL(text, baseUrl);
        return url.toString();
    } catch {
        return "";
    }
}

function getFirstLocalNameTag(node, localName) {
    const wanted = String(localName || "").toLowerCase();
    const elements = Array.from(node.getElementsByTagName("*"));

    return (
        elements.find((element) => {
            const local = element.localName || element.nodeName.split(":").pop() || "";
            return local.toLowerCase() === wanted;
        }) || null
    );
}

function getAllLocalNameTags(node, localName) {
    const wanted = String(localName || "").toLowerCase();
    const elements = Array.from(node.getElementsByTagName("*"));

    return elements.filter((element) => {
        const local = element.localName || element.nodeName.split(":").pop() || "";
        return local.toLowerCase() === wanted;
    });
}

function textOf(node, selector) {
    return decodeHtml(node.querySelector(selector)?.textContent?.trim() || "");
}

function attrOf(node, selector, attrName) {
    return decodeHtml(node.querySelector(selector)?.getAttribute(attrName) || "");
}

function localTextOf(node, localName) {
    return decodeHtml(getFirstLocalNameTag(node, localName)?.textContent?.trim() || "");
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

function parseHtml(htmlText) {
    const parser = new DOMParser();
    return parser.parseFromString(String(htmlText || ""), "text/html");
}

function absoluteUrl(value, baseUrl = "https://hypebeast.com") {
    if (!value) return "";

    try {
        return new URL(value, baseUrl).toString();
    } catch {
        return "";
    }
}

function getBestSrcFromSrcset(srcset, baseUrl = "https://www.npr.org") {
    const candidates = String(srcset || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const parts = entry.split(/\s+/);
            const src = parts[0] || "";
            const width = Number((parts[1] || "").replace(/[^\d.]/g, "")) || 0;
            return {
                src: normalizeImageUrl(src, baseUrl),
                width,
            };
        })
        .filter((entry) => entry.src)
        .sort((a, b) => a.width - b.width);

    return candidates[candidates.length - 1]?.src || candidates[0]?.src || "";
}

function getBestImageFromImg(img, baseUrl = "https://hypebeast.com") {
    if (!img) return "";

    const direct =
        img.getAttribute("src") ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-lazy-src") ||
        img.getAttribute("data-original") ||
        img.getAttribute("data-hi-res-src") ||
        img.currentSrc ||
        "";

    const srcset =
        img.getAttribute("srcset") ||
        img.getAttribute("data-srcset") ||
        img.closest("picture")?.querySelector("source[srcset]")?.getAttribute("srcset") ||
        img.closest("picture")?.querySelector("source[data-srcset]")?.getAttribute("data-srcset") ||
        "";

    return (
        normalizeImageUrl(direct, baseUrl) ||
        normalizeImageUrl(getBestSrcFromSrcset(srcset, baseUrl), baseUrl)
    );
}

function extractInlineBase64Image(value) {
    const text = String(value || "");

    const match = text.match(
        /data:image\/(?:png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/=]+/i
    );

    if (!match?.[0]) return "";

    const image = match[0].trim();
    return isUsableImageUrl(image) ? image : "";
}

function removeBase64ImageText(value) {
    return String(value || "")
        .replace(/data:image\/(?:png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/=]+/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

function cleanFeedDescription(value) {
    return stripHtml(
        removeBase64ImageText(
            String(value || "")
                .replace(/<img[\s\S]*?>/gi, " ")
                .replace(/<picture[\s\S]*?<\/picture>/gi, " ")
                .replace(/<source[\s\S]*?>/gi, " ")
        )
    );
}

function extractImageFromHtml(html, baseUrl = "https://www.npr.org") {
    const raw = String(html || "");

    const inlineBase64 = extractInlineBase64Image(raw);
    if (inlineBase64) return inlineBase64;

    const doc = parseHtml(raw);

    const metaSelectors = [
        'meta[property="og:image"]',
        'meta[property="og:image:url"]',
        'meta[name="og:image"]',
        'meta[name="twitter:image"]',
        'meta[name="twitter:image:src"]',
        'meta[property="twitter:image"]',
    ];

    for (const selector of metaSelectors) {
        const image = normalizeImageUrl(doc.querySelector(selector)?.getAttribute("content"), baseUrl);
        if (image) return image;
    }

    const imageCandidates = Array.from(doc.querySelectorAll("picture img, article img, main img, img"))
        .map((img) => getBestImageFromImg(img, baseUrl))
        .filter((image) => image && !isTrackingPixel(image));

    if (imageCandidates.length) return imageCandidates[0];

    const looseImageMatch = raw.match(
        /(https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|webp|gif|avif)(?:\?[^\s"'<>]*)?)/i
    );

    return normalizeImageUrl(looseImageMatch?.[1], baseUrl);
}

function getImageAttrFromLocalTags(node, localName, baseUrl = "https://www.npr.org") {
    const tags = getAllLocalNameTags(node, localName);

    for (const tag of tags) {
        const raw =
            tag.getAttribute("url") ||
            tag.getAttribute("href") ||
            tag.getAttribute("src") ||
            tag.getAttribute("data-src") ||
            "";

        const image = normalizeImageUrl(raw, baseUrl);
        if (image && !isTrackingPixel(image)) return image;
    }

    return "";
}

function extractRssImage(item, contentHtml, rawDescription, link = "") {
    const baseUrl = link || "https://www.npr.org";

    const contentImage = extractImageFromHtml(contentHtml, baseUrl);
    if (contentImage) return contentImage;

    const descriptionImage = extractImageFromHtml(rawDescription, baseUrl);
    if (descriptionImage) return descriptionImage;

    const mediaThumbnail =
        normalizeImageUrl(attrOf(item, "media\\:thumbnail", "url"), baseUrl) ||
        normalizeImageUrl(getFirstLocalNameTag(item, "thumbnail")?.getAttribute("url"), baseUrl) ||
        "";

    if (mediaThumbnail && !isTrackingPixel(mediaThumbnail)) return mediaThumbnail;

    const mediaContentImages = getAllLocalNameTags(item, "content")
        .map((element) => {
            const url = normalizeImageUrl(element.getAttribute("url"), baseUrl);
            const medium = element.getAttribute("medium") || "";
            const type = element.getAttribute("type") || "";

            if (
                url &&
                !isTrackingPixel(url) &&
                (medium.toLowerCase() === "image" ||
                    type.toLowerCase().startsWith("image/") ||
                    /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(url))
            ) {
                return url;
            }

            return "";
        })
        .filter(Boolean);

    if (mediaContentImages[0]) return mediaContentImages[0];

    const enclosureImage =
        Array.from(item.querySelectorAll("enclosure"))
            .map((element) => {
                const url = normalizeImageUrl(element.getAttribute("url"), baseUrl);
                const type = element.getAttribute("type") || "";

                if (
                    url &&
                    !isTrackingPixel(url) &&
                    (type.toLowerCase().startsWith("image/") ||
                        /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(url))
                ) {
                    return url;
                }

                return "";
            })
            .filter(Boolean)[0] || "";

    if (enclosureImage) return enclosureImage;

    const nprImage =
        getImageAttrFromLocalTags(item, "image", baseUrl) ||
        getImageAttrFromLocalTags(item, "thumbnail", baseUrl) ||
        "";

    return nprImage || NPR_FALLBACK_IMAGE;
}

function parseRssFeed(xmlText, sourceLabel) {
    const doc = parseXml(xmlText);
    const items = Array.from(doc.querySelectorAll("item"));

    return items.slice(0, 18).map((item, index) => {
        const title = textOf(item, "title") || "Untitled music story";
        const link = textOf(item, "link") || textOf(item, "guid");
        const rawDescription = textOf(item, "description");
        const contentHtml =
            localTextOf(item, "encoded") ||
            textOf(item, "content\\:encoded") ||
            rawDescription ||
            "";

        const description =
            cleanFeedDescription(rawDescription || contentHtml).slice(0, 280) ||
            "Open the source to read the full story.";

        const image = extractRssImage(item, contentHtml, rawDescription, link);

        return {
            id: `${sourceLabel}-rss-${index}-${textOf(item, "guid") || link || title}`,
            source: sourceLabel,
            type: "article",
            title: cleanFeedDescription(title) || "Untitled music story",
            link,
            publishedAt: textOf(item, "pubDate") || textOf(item, "updated"),
            description,
            image,
            imageViaProxy:
                sourceLabel.toLowerCase().includes("npr") && image && !image.startsWith("data:")
                    ? buildProxyImageUrl(image)
                    : image,
            creator: localTextOf(item, "creator"),
        };
    });
}

function isBadHypebeastTitle(title) {
    const value = String(title || "").trim();

    return (
        !value ||
        value.length < 8 ||
        /^hypebeast article$/i.test(value) ||
        /^hypebeaset article$/i.test(value) ||
        /^hypebeast story$/i.test(value) ||
        /^hypebeast$/i.test(value) ||
        /^article$/i.test(value) ||
        /^story$/i.test(value) ||
        /^read more$/i.test(value) ||
        /^view post$/i.test(value) ||
        /^latest$/i.test(value) ||
        /^music$/i.test(value) ||
        /^fashion$/i.test(value) ||
        /^footwear$/i.test(value) ||
        /^art$/i.test(value) ||
        /^design$/i.test(value)
    );
}

function isBadHypebeastCard(item) {
    const title = String(item?.title || "").trim();
    const link = String(item?.link || "").trim();
    const image = String(item?.image || "").trim();

    if (isBadHypebeastTitle(title)) return true;
    if (!link || !/^https:\/\/(www\.)?hypebeast\.com\/\d{4}\/\d{1,2}\//i.test(link)) {
        return true;
    }
    if (!image || image === FALLBACK_IMAGE || isTrackingPixel(image)) return true;

    return false;
}

function parseHypebeastHtml(htmlText, sourceLabel) {
    if (isReactShellHtml(htmlText)) {
        throw new Error(`${sourceLabel} returned the React app shell instead of Hypebeast data.`);
    }

    const doc = parseHtml(htmlText);
    const articleLinkCandidates = Array.from(doc.querySelectorAll('a[href*="/20"]'));

    const seen = new Set();
    const cards = [];

    for (const linkNode of articleLinkCandidates) {
        const href = linkNode.getAttribute("href") || "";
        const link = absoluteUrl(href, "https://hypebeast.com");

        if (!/^https:\/\/(www\.)?hypebeast\.com\/\d{4}\/\d{1,2}\//i.test(link)) {
            continue;
        }

        if (seen.has(link)) continue;
        seen.add(link);

        const container =
            linkNode.closest("article") ||
            linkNode.closest("section") ||
            linkNode.closest("div") ||
            linkNode;

        const title = normalizeText(
            container.querySelector("h1, h2, h3, h4")?.textContent ||
            linkNode.getAttribute("aria-label") ||
            linkNode.textContent
        );

        if (isBadHypebeastTitle(title)) continue;

        const description = normalizeText(container.querySelector("p")?.textContent || "");
        const image =
            getBestImageFromImg(container.querySelector("img"), "https://hypebeast.com") ||
            getBestImageFromImg(linkNode.querySelector("img"), "https://hypebeast.com") ||
            "";

        const timeNode = container.querySelector("time");
        const publishedAt =
            timeNode?.getAttribute("datetime") || timeNode?.textContent?.trim() || "";

        const card = {
            id: `${sourceLabel}-html-${cards.length}-${link}`,
            source: sourceLabel,
            type: "hypebeast",
            title,
            link,
            publishedAt,
            description: description.slice(0, 240) || "Open the source to read the story.",
            image,
        };

        if (isBadHypebeastCard(card)) continue;

        cards.push(card);

        if (cards.length >= 15) break;
    }

    return cards;
}

function parseYoutubeFeed(xmlText, sourceLabel) {
    if (isReactShellHtml(xmlText)) {
        throw new Error(`${sourceLabel} returned the React app shell instead of YouTube XML.`);
    }

    const doc = parseXml(xmlText);
    const entries = Array.from(doc.querySelectorAll("entry"));

    return entries.slice(0, 10).map((entry, index) => {
        const videoId =
            localTextOf(entry, "videoId") ||
            textOf(entry, "yt\\:videoId") ||
            "";

        const link =
            attrOf(entry, "link", "href") ||
            (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");

        const rawDescription =
            localTextOf(entry, "description") ||
            textOf(entry, "media\\:description") ||
            textOf(entry, "summary") ||
            textOf(entry, "content");

        const image =
            normalizeImageUrl(attrOf(entry, "media\\:thumbnail", "url"), "https://www.youtube.com") ||
            normalizeImageUrl(
                getFirstLocalNameTag(entry, "thumbnail")?.getAttribute("url"),
                "https://www.youtube.com"
            ) ||
            (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : FALLBACK_IMAGE);

        return {
            id: `${sourceLabel}-yt-${index}-${videoId || link}`,
            source: sourceLabel,
            type: "video",
            title: cleanFeedDescription(textOf(entry, "title")) || "Untitled video",
            link,
            videoId,
            publishedAt: textOf(entry, "published") || textOf(entry, "updated"),
            description:
                cleanFeedDescription(rawDescription).slice(0, 220) ||
                "Latest music video update.",
            image,
        };
    });
}

async function fetchText(url, signal, acceptHeader) {
    const response = await fetch(url, {
        method: "GET",
        headers: {
            Accept:
                acceptHeader ||
                "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*",
        },
        signal,
    });

    const text = await response.text();

    if (isReactShellHtml(text)) {
        throw new Error(`Proxy route returned the React app shell for ${url}.`);
    }

    if (!response.ok) {
        throw new Error(
            `${response.status} ${response.statusText}: ${text
                .slice(0, 180)
                .replace(/\s+/g, " ")}`
        );
    }

    return text;
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
                text.slice(0, 240).replace(/\s+/g, " ") || "<empty response>"
            }`
        );
    }

    if (!text || text === ".") {
        throw new Error(
            `${url} returned an empty or placeholder response instead of JSON. ` +
            `Content-Type: ${contentType || "<missing>"}`
        );
    }

    if (isHtmlResponse(text)) {
        throw new Error(
            `${url} returned HTML instead of JSON: ${text
                .slice(0, 180)
                .replace(/\s+/g, " ")}`
        );
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(
            `${url} returned invalid JSON. Content-Type: ${
                contentType || "<missing>"
            }. Response preview: ${text.slice(0, 240).replace(/\s+/g, " ")}`
        );
    }
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

function buildManualEmbedCard(item, reason) {
    if (item.type === "youtube") {
        const videoId = getYoutubeVideoId(item.sourceUrl);

        if (!videoId) return null;

        return {
            card: {
                ...item,
                title: item.label,
                author_name: "YouTube",
                provider_name: "YouTube",
                thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                html: `<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>`,
            },
            status: {
                label: item.label,
                kind: "oEmbed",
                state: "fallback",
                message: reason || "Used manual YouTube embed fallback.",
            },
        };
    }

    if (item.type === "spotify") {
        const spotify = parseSpotifyUrl(item.sourceUrl);

        if (!spotify) return null;

        return {
            card: {
                ...item,
                title: item.label,
                author_name: "Spotify",
                provider_name: "Spotify",
                thumbnail_url: FALLBACK_IMAGE,
                html: `<iframe src="https://open.spotify.com/embed/${spotify.type}/${spotify.id}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`,
            },
            status: {
                label: item.label,
                kind: "oEmbed",
                state: "fallback",
                message: reason || "Used manual Spotify embed fallback.",
            },
        };
    }

    if (item.type === "soundcloud") {
        const playerUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
            item.sourceUrl
        )}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true`;

        return {
            card: {
                ...item,
                title: item.label,
                author_name: "SoundCloud",
                provider_name: "SoundCloud",
                thumbnail_url: FALLBACK_IMAGE,
                html: `<iframe src="${playerUrl}" allow="autoplay"></iframe>`,
            },
            status: {
                label: item.label,
                kind: "oEmbed",
                state: "fallback",
                message:
                    reason ||
                    "soundcloudoembedproxy failed, so the page used the safe SoundCloud player fallback.",
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

        if (data?.ok === false) {
            throw new Error(data?.message || data?.error || `${proxyName} returned ok:false.`);
        }

        return {
            card: {
                ...item,
                ...data,
                sourceUrl: item.sourceUrl,
                label: item.label,
            },
            status: {
                label: item.label,
                kind: "oEmbed",
                state: "ok",
                message: `Loaded through /api/${proxyName}.`,
            },
        };
    } catch (error) {
        const fallback = buildManualEmbedCard(
            item,
            error?.message || `${proxyName} failed.`
        );

        if (fallback) {
            return fallback;
        }

        throw error;
    }
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

function formatDate(value) {
    if (!value) return "Recently";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

function SourceChip({ icon, label }) {
    return (
        <Chip
            icon={icon}
            label={label}
            size="small"
            sx={{
                borderColor: "rgba(103,232,249,.28)",
                color: "rgba(255,255,255,.86)",
                background:
                    "linear-gradient(135deg, rgba(103,232,249,.12), rgba(167,139,250,.10))",
            }}
            variant="outlined"
        />
    );
}

function NewsCard({ item }) {
    const externalMediaEnabled = useExternalMediaAfterHydration();
    const isVideo = item.type === "video";
    const isHypebeast = item.type === "hypebeast";
    const preferredImage = item.imageViaProxy || item.image || FALLBACK_IMAGE;
    const [imgSrc, setImgSrc] = useState(FALLBACK_IMAGE);

    useEffect(() => {
        setImgSrc(externalMediaEnabled ? preferredImage : FALLBACK_IMAGE);
    }, [externalMediaEnabled, preferredImage]);

    const fallbackImage = item.source?.toLowerCase().includes("npr")
        ? NPR_FALLBACK_IMAGE
        : FALLBACK_IMAGE;

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
                    image={imgSrc || fallbackImage}
                    alt={item.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => {
                        if (imgSrc !== item.image && item.image && item.image !== imgSrc) {
                            setImgSrc(item.image);
                            return;
                        }

                        if (imgSrc !== fallbackImage) {
                            setImgSrc(fallbackImage);
                        }
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
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <SourceChip
                            icon={
                                isVideo ? (
                                    <PlayCircleRounded sx={{ fontSize: 16 }} />
                                ) : isHypebeast ? (
                                    <WhatshotRounded sx={{ fontSize: 16 }} />
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
                        sx={{
                            color: "#fff",
                            lineHeight: 1.18,
                            fontWeight: 900,
                        }}
                    >
                        {item.title}
                    </Typography>

                    <Typography
                        variant="body2"
                        sx={{
                            color: "rgba(255,255,255,.68)",
                            minHeight: 64,
                        }}
                    >
                        {item.description}
                    </Typography>

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
    const iframeSrc = externalMediaEnabled
        ? getAllowedIframeSrcFromHtml(item.html)
        : "";
    const previewImage = externalMediaEnabled
        ? item.thumbnail_url || item.thumbnail || FALLBACK_IMAGE
        : FALLBACK_IMAGE;

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
            {iframeSrc ? (
                <Box
                    component="iframe"
                    title={item.title || item.label}
                    src={iframeSrc}
                    loading="lazy"
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
                    sx={{
                        width: "100%",
                        height: item.type === "youtube" ? 245 : 360,
                        border: 0,
                        display: "block",
                        background: "#050816",
                    }}
                />
            ) : (
                <CardMedia
                    component="img"
                    width="640"
                    height="360"
                    image={previewImage}
                    alt={item.title || item.label}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                        if (event.currentTarget.src !== FALLBACK_IMAGE) {
                            event.currentTarget.src = FALLBACK_IMAGE;
                        }
                    }}
                    sx={{
                        objectFit: "cover",
                        background: "#111827",
                    }}
                />
            )}

            <CardContent>
                <Stack spacing={1.1}>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <SourceChip
                            icon={<MusicNoteRounded sx={{ fontSize: 16 }} />}
                            label={item.label}
                        />

                        <Chip
                            label={item.provider_name || item.type}
                            size="small"
                            sx={{
                                color: "rgba(255,255,255,.72)",
                                background: "rgba(255,255,255,.06)",
                            }}
                        />
                    </Stack>

                    <Typography
                        variant="h6"
                        sx={{
                            color: "#fff",
                            fontWeight: 900,
                            lineHeight: 1.2,
                        }}
                    >
                        {item.title || "Music preview"}
                    </Typography>

                    {item.author_name ? (
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,.62)" }}>
                            {item.author_name}
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

function BottomStatusPanel({ statuses, loading }) {
    const failedCount = statuses.filter((item) => item.state === "failed").length;
    const fallbackCount = statuses.filter((item) => item.state === "fallback").length;
    const okCount = statuses.filter((item) => item.state === "ok").length;

    return (
        <Paper
            elevation={12}
            sx={{
                position: "fixed",
                left: { xs: 10, md: 24 },
                right: { xs: 10, md: 24 },
                bottom: { xs: 10, md: 18 },
                zIndex: 1400,
                p: { xs: 1.25, md: 1.6 },
                border: "1px solid rgba(255,255,255,.14)",
                background:
                    "linear-gradient(135deg, rgba(7,10,19,.94), rgba(13,18,36,.94))",
                backdropFilter: "blur(18px)",
                boxShadow: "0 24px 80px rgba(0,0,0,.45)",
            }}
        >
            <Stack spacing={1}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={1}
                >
                    <Typography sx={{ color: "#fff", fontWeight: 950 }}>
                        News API status{" "}
                        {loading ? (
                            <Typography component="span" sx={{ color: "rgba(255,255,255,.62)" }}>
                                — refreshing...
                            </Typography>
                        ) : null}
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip size="small" label={`${okCount} loaded`} sx={{ color: "#fff" }} />
                        <Chip
                            size="small"
                            label={`${fallbackCount} fallback`}
                            sx={{ color: "#fff" }}
                        />
                        <Chip size="small" label={`${failedCount} failed`} sx={{ color: "#fff" }} />
                    </Stack>
                </Stack>

                <Box
                    sx={{
                        maxHeight: 92,
                        overflow: "auto",
                        pr: 0.5,
                    }}
                >
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {statuses.map((item, index) => (
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
                        ))}
                    </Stack>
                </Box>
            </Stack>
        </Paper>
    );
}

function buildArticleSchema(items) {
    return items.slice(0, 12).map((item) => ({
        "@type": item.type === "video" ? "VideoObject" : "NewsArticle",
        headline: item.title,
        description: item.description,
        url: item.link,
        image: item.image && !item.image.startsWith("data:") ? [item.image] : [FALLBACK_IMAGE],
        datePublished: item.publishedAt ? new Date(item.publishedAt).toISOString() : undefined,
        author: item.creator ? { "@type": "Person", name: item.creator } : undefined,
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

function SeoBlock({ articles, hypebeastArticles, videos }) {
    const allItems = [...articles, ...hypebeastArticles, ...videos].filter(Boolean);
    const itemList = allItems.slice(0, 24).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: item.link || `${PAGE_URL}#${item.id}`,
        name: item.title,
        image: item.image && !item.image.startsWith("data:") ? item.image : FALLBACK_IMAGE,
    }));

    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": `${PAGE_URL}#webpage`,
                url: PAGE_URL,
                name: "Music News, Releases & Culture | AudioMaster Lab",
                description:
                    "Fresh music news, NPR Music stories, Hypebeast culture updates, YouTube videos, Spotify embeds, and SoundCloud previews.",
                isPartOf: {
                    "@type": "WebSite",
                    "@id": `${SITE_ROOT}/#website`,
                    name: "AudioMaster Lab",
                    url: SITE_ROOT,
                },
                primaryImageOfPage: {
                    "@type": "ImageObject",
                    url: FALLBACK_IMAGE,
                },
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    {
                        "@type": "ListItem",
                        position: 1,
                        name: "Home",
                        item: SITE_ROOT,
                    },
                    {
                        "@type": "ListItem",
                        position: 2,
                        name: "News",
                        item: PAGE_URL,
                    },
                ],
            },
            {
                "@type": "ItemList",
                name: "AudioMaster Lab Music News Feed",
                itemListElement: itemList,
            },
            ...buildArticleSchema(allItems),
        ],
    };

    return (
        <Helmet>
            <title>Music News, Releases & Culture | AudioMaster Lab</title>
            <meta
                name="description"
                content="Fresh music news, NPR Music stories, Hypebeast culture updates, YouTube videos, Spotify embeds, and SoundCloud previews from AudioMaster Lab."
            />
            <meta
                name="keywords"
                content="music news, AudioMaster Lab, NPR Music, Hypebeast music, YouTube Music, Spotify, SoundCloud, new releases, music culture"
            />
            <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
            <meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
            <meta name="bingbot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
            <link rel="canonical" href={PAGE_URL} />
            <link
                rel="alternate"
                type="application/rss+xml"
                title="NPR Music RSS"
                href="https://feeds.npr.org/1039/rss.xml"
            />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="AudioMaster Lab" />
            <meta property="og:title" content="Music News, Releases & Culture | AudioMaster Lab" />
            <meta
                property="og:description"
                content="Music stories, culture updates, release previews, and platform embeds from AudioMaster Lab."
            />
            <meta property="og:url" content={PAGE_URL} />
            <meta property="og:image" content={FALLBACK_IMAGE} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Music News, Releases & Culture | AudioMaster Lab" />
            <meta
                name="twitter:description"
                content="Fresh music news, culture updates, and release previews."
            />
            <meta name="twitter:image" content={FALLBACK_IMAGE} />
            <script type="application/ld+json">{JSON.stringify(schema)}</script>
        </Helmet>
    );
}

export default function NewsPage() {
    const initialSnapshot = useMemo(() => readEmbeddedNewsSnapshot(), []);
    const requestControllerRef = useRef(null);

    const [rssArticles, setRssArticles] = useState(
        () => initialSnapshot?.rssArticles || []
    );
    const [hypebeastArticles, setHypebeastArticles] = useState(
        () => initialSnapshot?.hypebeastArticles || []
    );
    const [videos, setVideos] = useState(
        () => initialSnapshot?.videos || []
    );
    const [embeds, setEmbeds] = useState(
        () => initialSnapshot?.embeds || []
    );
    const [statuses, setStatuses] = useState(
        () => initialSnapshot?.statuses || []
    );
    const [generatedAt, setGeneratedAt] = useState(
        () => initialSnapshot?.generatedAt || new Date().toISOString()
    );
    const [loading, setLoading] = useState(() => !initialSnapshot);

    const bootstrapSnapshot = useMemo(
        () =>
            makeNewsSnapshot({
                rssArticles,
                hypebeastArticles,
                videos,
                embeds,
                statuses,
                generatedAt,
            }),
        [
            rssArticles,
            hypebeastArticles,
            videos,
            embeds,
            statuses,
            generatedAt,
        ]
    );

    const loadNews = useCallback(async () => {
        requestControllerRef.current?.abort();

        const controller = new AbortController();
        requestControllerRef.current = controller;

        const { signal } = controller;
        const timeoutId = window.setTimeout(
            () => controller.abort(),
            isReactSnapRun() ? 12000 : 25000
        );

        setLoading(true);

        try {
            const nprJobs = NPR_FEEDS.map(async (feed) => {
                const proxyUrl = buildProxyUrl("nprrssproxy", feed.url);
                const xml = await fetchText(
                    proxyUrl,
                    signal,
                    "application/rss+xml, application/xml, text/xml, */*"
                );

                return {
                    label: feed.label,
                    items: parseRssFeed(xml, feed.label),
                };
            });

            const hypebeastJobs = HYPEBEAST_SOURCES.map(async (source) => {
                const proxyUrl = buildHypebeastFeedUrl(source.feed);
                const text = await fetchText(
                    proxyUrl,
                    signal,
                    source.mode === "rss"
                        ? "application/rss+xml, application/xml, text/xml, text/html, */*"
                        : "text/html, application/xhtml+xml, application/xml, */*"
                );

                const items =
                    source.mode === "rss" && !isHtmlResponse(text)
                        ? parseRssFeed(text, source.label)
                            .map((item) => ({ ...item, type: "hypebeast" }))
                            .filter((item) => !isBadHypebeastCard(item))
                        : parseHypebeastHtml(text, source.label);

                return {
                    label: source.label,
                    items,
                };
            });

            const videoJobs = YOUTUBE_CHANNEL_FEEDS.map(async (feed) => {
                const targetUrl = buildYoutubeFeedTarget(feed.channelId);
                const proxyUrl = buildProxyUrl("youtuberssproxy", targetUrl);
                const xml = await fetchText(
                    proxyUrl,
                    signal,
                    "application/atom+xml, application/xml, text/xml, */*"
                );

                return {
                    label: feed.label,
                    items: parseYoutubeFeed(xml, feed.label),
                };
            });

            const embedJobs = FEATURED_OEMBEDS.map((item) =>
                fetchOembedCard(item, signal)
            );

            const [nprSettled, hypebeastSettled, videoSettled, embedSettled] =
                await Promise.all([
                    Promise.allSettled(nprJobs),
                    Promise.allSettled(hypebeastJobs),
                    Promise.allSettled(videoJobs),
                    Promise.allSettled(embedJobs),
                ]);

            const nextRssArticles = nprSettled
                .filter((result) => result.status === "fulfilled")
                .flatMap((result) => result.value.items)
                .filter((item) => item.title)
                .filter((item, index, array) =>
                    array.findIndex((other) => other.link === item.link) === index
                )
                .sort(
                    (a, b) =>
                        new Date(b.publishedAt || 0) -
                        new Date(a.publishedAt || 0)
                )
                .slice(0, 18);

            const nextHypebeastArticles = hypebeastSettled
                .filter((result) => result.status === "fulfilled")
                .flatMap((result) => result.value.items)
                .filter((item) => item.title)
                .filter((item) => !isBadHypebeastTitle(item.title))
                .filter((item) => !isBadHypebeastCard(item))
                .filter((item, index, array) =>
                    array.findIndex((other) => other.link === item.link) === index
                )
                .sort(
                    (a, b) =>
                        new Date(b.publishedAt || 0) -
                        new Date(a.publishedAt || 0)
                )
                .slice(0, 15);

            const nextVideos = videoSettled
                .filter((result) => result.status === "fulfilled")
                .flatMap((result) => result.value.items)
                .filter((item) => item.title)
                .sort(
                    (a, b) =>
                        new Date(b.publishedAt || 0) -
                        new Date(a.publishedAt || 0)
                )
                .slice(0, 10);

            const nextEmbeds = embedSettled
                .filter((result) => result.status === "fulfilled")
                .map((result) => result.value.card)
                .filter((item) => item.title || item.html || item.thumbnail_url);

            const nextStatuses = [
                ...nprSettled.map((result, index) => ({
                    label: NPR_FEEDS[index]?.label || "NPR RSS",
                    kind: "RSS",
                    state: result.status === "fulfilled" ? "ok" : "failed",
                    message:
                        result.status === "fulfilled"
                            ? "Loaded through nprrssproxy and used RSS content:encoded images."
                            : result.reason?.message || "Failed.",
                })),
                ...hypebeastSettled.map((result, index) => ({
                    label: HYPEBEAST_SOURCES[index]?.label || "Hypebeast",
                    kind: "Hypebeast",
                    state: result.status === "fulfilled" ? "ok" : "failed",
                    message:
                        result.status === "fulfilled"
                            ? "Loaded through hypebeastproxy with empty-card filtering."
                            : result.reason?.message || "Failed.",
                })),
                ...videoSettled.map((result, index) => ({
                    label: YOUTUBE_CHANNEL_FEEDS[index]?.label || "YouTube RSS",
                    kind: "YouTube RSS",
                    state: result.status === "fulfilled" ? "ok" : "failed",
                    message:
                        result.status === "fulfilled"
                            ? "Loaded through youtuberssproxy."
                            : result.reason?.message || "Failed.",
                })),
                ...embedSettled.map((result, index) => {
                    if (result.status === "fulfilled") {
                        return result.value.status;
                    }

                    return {
                        label: FEATURED_OEMBEDS[index]?.label || "oEmbed",
                        kind: "oEmbed",
                        state: "failed",
                        message: result.reason?.message || "Failed.",
                    };
                }),
            ];

            setRssArticles(nextRssArticles);
            setHypebeastArticles(nextHypebeastArticles);
            setVideos(nextVideos);
            setEmbeds(nextEmbeds);
            setStatuses(nextStatuses);
            setGeneratedAt(new Date().toISOString());
        } catch (error) {
            if (error?.name !== "AbortError") {
                setStatuses([
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

    return (
        <Box
            component="main"
            sx={{
                minHeight: "100vh",
                color: "#fff",
                background:
                    "radial-gradient(circle at top left, rgba(103,232,249,.16), transparent 35%), radial-gradient(circle at top right, rgba(167,139,250,.18), transparent 36%), #070a13",
                pb: 18,
            }}
        >
            <SeoBlock
                articles={rssArticles}
                hypebeastArticles={hypebeastArticles}
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
                    <Box
                        sx={{
                            position: "absolute",
                            inset: "auto -120px -160px auto",
                            width: 340,
                            height: 340,
                            borderRadius: "50%",
                            background:
                                "radial-gradient(circle, rgba(103,232,249,.20), transparent 68%)",
                            pointerEvents: "none",
                        }}
                    />

                    <Stack spacing={2.5} sx={{ position: "relative", zIndex: 1 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <SourceChip icon={<WhatshotRounded sx={{ fontSize: 16 }} />} label="Hypebeast" />
                            <SourceChip icon={<RssFeedRounded sx={{ fontSize: 16 }} />} label="RSS" />
                            <SourceChip icon={<PlayCircleRounded sx={{ fontSize: 16 }} />} label="YouTube" />
                            <SourceChip icon={<MusicNoteRounded sx={{ fontSize: 16 }} />} label="Spotify" />
                            <SourceChip icon={<AutoAwesomeRounded sx={{ fontSize: 16 }} />} label="Culture" />
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
                            Music, culture, fashion, and release radar.
                        </Typography>

                        <Typography
                            variant="h6"
                            sx={{
                                maxWidth: 980,
                                color: "rgba(255,255,255,.72)",
                                lineHeight: 1.55,
                            }}
                        >
                            AudioMaster Lab pulls NPR Music RSS, Hypebeast culture feeds,
                            YouTube channel RSS, and platform previews through your
                            scrapewebsite proxy APIs. NPR images are read directly from RSS
                            content, which avoids the NPR article-page 520 errors.
                        </Typography>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <Button
                                variant="contained"
                                startIcon={
                                    loading ? <CircularProgress size={18} color="inherit" /> : <RefreshRounded />
                                }
                                onClick={loadNews}
                                disabled={loading}
                                sx={{
                                    alignSelf: { xs: "stretch", sm: "flex-start" },
                                    fontWeight: 950,
                                    color: "#06111f",
                                    background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                    boxShadow: "0 18px 40px rgba(103,232,249,.18)",
                                }}
                            >
                                {loading ? "Refreshing..." : "Refresh feeds"}
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

                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,.52)" }}>
                            Feed snapshot generated {formatGeneratedAt(generatedAt)}.
                        </Typography>
                    </Stack>
                </Paper>

                <Stack spacing={5}>
                    <Box component="section" aria-labelledby="hypebeast-heading">
                        <Stack sx={{ mb: 2.5 }}>
                            <Typography id="hypebeast-heading" variant="h2" sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 950, letterSpacing: "-.035em" }}>
                                Hypebeast culture and music feed
                            </Typography>

                            <Typography sx={{ color: "rgba(255,255,255,.62)" }}>
                                First 15 valid Hypebeast cards. Empty cards, bad placeholder
                                titles, missing images, and non-article links are hidden.
                            </Typography>
                        </Stack>

                        <Divider sx={{ mb: 3, borderColor: "rgba(255,255,255,.08)" }} />

                        {loading && hypebeastArticles.length === 0 ? (
                            <Box sx={{ py: 7, textAlign: "center" }}>
                                <CircularProgress />
                            </Box>
                        ) : hypebeastArticles.length > 0 ? (
                            <Grid container spacing={2.5}>
                                {hypebeastArticles.map((item) => (
                                    <Grid item xs={12} md={6} lg={4} key={item.id}>
                                        <NewsCard item={item} />
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <EmptyState label="No valid Hypebeast cards loaded. Check /api/hypebeastproxy and make sure it is not returning the React app shell." />
                        )}
                    </Box>

                    <Box component="section" aria-labelledby="npr-heading">
                        <Stack sx={{ mb: 2.5 }}>
                            <Typography id="npr-heading" variant="h2" sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 950, letterSpacing: "-.035em" }}>
                                NPR music stories
                            </Typography>

                            <Typography sx={{ color: "rgba(255,255,255,.62)" }}>
                                NPR images are extracted from RSS `content:encoded` first, then
                                proxied through `/api/nprimageproxy` to avoid broken image loads.
                            </Typography>
                        </Stack>

                        <Divider sx={{ mb: 3, borderColor: "rgba(255,255,255,.08)" }} />

                        {loading && rssArticles.length === 0 ? (
                            <Box sx={{ py: 7, textAlign: "center" }}>
                                <CircularProgress />
                            </Box>
                        ) : rssArticles.length > 0 ? (
                            <Grid container spacing={2.5}>
                                {rssArticles.map((item) => (
                                    <Grid item xs={12} md={6} lg={4} key={item.id}>
                                        <NewsCard item={item} />
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <EmptyState label="No NPR cards loaded yet. Check /api/nprrssproxy." />
                        )}
                    </Box>

                    <Box component="section" aria-labelledby="video-heading">
                        <Stack sx={{ mb: 2.5 }}>
                            <Typography id="video-heading" variant="h2" sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 950, letterSpacing: "-.035em" }}>
                                Latest music videos
                            </Typography>

                            <Typography sx={{ color: "rgba(255,255,255,.62)" }}>
                                YouTube channel RSS cards with parsed media thumbnails.
                            </Typography>
                        </Stack>

                        <Divider sx={{ mb: 3, borderColor: "rgba(255,255,255,.08)" }} />

                        {loading && videos.length === 0 ? (
                            <Box sx={{ py: 7, textAlign: "center" }}>
                                <CircularProgress />
                            </Box>
                        ) : videos.length > 0 ? (
                            <Grid container spacing={2.5}>
                                {videos.map((item) => (
                                    <Grid item xs={12} md={6} lg={4} key={item.id}>
                                        <NewsCard item={item} />
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <EmptyState label="No video cards loaded yet. Check /api/youtuberssproxy." />
                        )}
                    </Box>

                    <Box component="section" aria-labelledby="previews-heading">
                        <Stack sx={{ mb: 2.5 }}>
                            <Typography id="previews-heading" variant="h2" sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 950, letterSpacing: "-.035em" }}>
                                New release and platform previews
                            </Typography>

                            <Typography sx={{ color: "rgba(255,255,255,.62)" }}>
                                YouTube, Spotify, and SoundCloud previews with safe iframe
                                rendering and manual fallback cards.
                            </Typography>
                        </Stack>

                        <Divider sx={{ mb: 3, borderColor: "rgba(255,255,255,.08)" }} />

                        {loading && embeds.length === 0 ? (
                            <Box sx={{ py: 7, textAlign: "center" }}>
                                <CircularProgress />
                            </Box>
                        ) : embeds.length > 0 ? (
                            <Grid container spacing={2.5}>
                                {embeds.map((item, index) => (
                                    <Grid
                                        item
                                        xs={12}
                                        md={6}
                                        lg={4}
                                        key={`${item.type}-${item.sourceUrl}-${index}`}
                                    >
                                        <EmbedCard item={item} />
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <EmptyState label="No embed previews loaded yet. Check the oEmbed proxy routes." />
                        )}
                    </Box>
                </Stack>
            </Container>

            <BottomStatusPanel statuses={statuses} loading={loading} />
        </Box>
    );
}