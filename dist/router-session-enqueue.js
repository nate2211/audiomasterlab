(function () {
    "use strict";

    const ROUTER_QUEUE_ENDPOINT = "https://scrapewebsite.pages.dev/api/router/router";
    const ROUTER_ID = "main";

    const SESSION_KEY = "audiomasterlab.routerSessionId.v3";

    const MAX_BODY_CHARS = 24000;
    const MAX_PAYLOAD_CHARS = 56000;

    const ROUTER_BATCH_MAX = 8;
    const ROUTER_BUFFER_MAX = 80;
    const ROUTER_SEND_INTERVAL_MS = 900;
    const ROUTER_REQUEST_TIMEOUT_MS = 4500;
    const ROUTER_MAX_BACKOFF_MS = 30000;

    const CAPTURE_REQUEST_BODIES = true;
    const CAPTURE_THIRD_PARTY_BODIES = false;

    const LOG_PREFIX = "[RouterSession]";

    if (window.__AudioMasterLabRouterSessionPatchedV3) {
        console.warn(`${LOG_PREFIX} already enabled`);
        return;
    }

    window.__AudioMasterLabRouterSessionPatchedV3 = true;

    const nativeFetchForRouter =
        typeof window.fetch === "function" ? window.fetch.bind(window) : null;

    const SENSITIVE_KEY_RE =
        /(authorization|cookie|set-cookie|token|access_token|refresh_token|id_token|secret|client_secret|password|passwd|pwd|api[-_]?key|x[-_]?api[-_]?key|session|csrf|xsrf|jwt|bearer|oauth|signature|sig|code)/i;

    const BLOCKED_HEADERS = new Set([
        "authorization",
        "cookie",
        "set-cookie",
        "host",
        "connection",
        "content-length",
        "transfer-encoding",
        "proxy-authorization",
        "sec-fetch-dest",
        "sec-fetch-mode",
        "sec-fetch-site",
        "sec-fetch-user",
    ]);

    let routerBuffer = [];
    let routerFlushTimer = null;
    let routerSending = false;
    let routerBackoffUntil = 0;
    let routerConsecutiveFailures = 0;
    let routerDroppedCount = 0;

    function safeRandomId() {
        try {
            if (crypto && typeof crypto.randomUUID === "function") {
                return crypto.randomUUID();
            }
        } catch {}

        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function getSessionId() {
        try {
            let id = localStorage.getItem(SESSION_KEY);

            if (!id) {
                id = safeRandomId();
                localStorage.setItem(SESSION_KEY, id);
            }

            return id;
        } catch {
            return safeRandomId();
        }
    }

    const sessionId = getSessionId();

    function toAbsoluteUrl(value) {
        try {
            return new URL(String(value || ""), location.href).toString();
        } catch {
            return "";
        }
    }

    function sameEndpoint(urlA, urlB) {
        try {
            const a = new URL(urlA);
            const b = new URL(urlB);

            return a.origin === b.origin && a.pathname === b.pathname;
        } catch {
            return false;
        }
    }

    function shouldSkipUrl(url) {
        const absoluteUrl = toAbsoluteUrl(url);

        if (!absoluteUrl) return true;

        let parsed;

        try {
            parsed = new URL(absoluteUrl);
        } catch {
            return true;
        }

        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return true;
        }

        if (sameEndpoint(absoluteUrl, ROUTER_QUEUE_ENDPOINT)) {
            return true;
        }

        if (parsed.pathname.includes("/api/router/router")) {
            return true;
        }

        return false;
    }

    function sanitizeUrl(url) {
        const absoluteUrl = toAbsoluteUrl(url);

        if (!absoluteUrl) return "";

        try {
            const parsed = new URL(absoluteUrl);

            for (const key of Array.from(parsed.searchParams.keys())) {
                if (SENSITIVE_KEY_RE.test(key)) {
                    parsed.searchParams.set(key, "[redacted]");
                }
            }

            return parsed.toString();
        } catch {
            return "";
        }
    }

    function cleanHeaders(headers) {
        const out = {};

        function addHeader(key, value) {
            const normalizedKey = String(key || "").toLowerCase();

            if (!normalizedKey) return;
            if (BLOCKED_HEADERS.has(normalizedKey)) return;
            if (SENSITIVE_KEY_RE.test(normalizedKey)) return;

            out[normalizedKey] = String(value || "");
        }

        try {
            if (headers && typeof headers.forEach === "function") {
                headers.forEach((value, key) => addHeader(key, value));
            } else if (headers && typeof headers === "object") {
                Object.entries(headers).forEach(([key, value]) => {
                    addHeader(key, value);
                });
            }
        } catch {}

        return out;
    }

    function redactObject(value, depth = 0) {
        if (depth > 8) return "[max-depth]";

        if (Array.isArray(value)) {
            return value.map((item) => redactObject(item, depth + 1));
        }

        if (value && typeof value === "object") {
            const out = {};

            for (const [key, val] of Object.entries(value)) {
                if (SENSITIVE_KEY_RE.test(key)) {
                    out[key] = "[redacted]";
                } else {
                    out[key] = redactObject(val, depth + 1);
                }
            }

            return out;
        }

        return value;
    }

    function redactFormBody(text) {
        try {
            const params = new URLSearchParams(text);

            for (const key of Array.from(params.keys())) {
                if (SENSITIVE_KEY_RE.test(key)) {
                    params.set(key, "[redacted]");
                }
            }

            return params.toString();
        } catch {
            return text;
        }
    }

    function redactJsonBody(text) {
        try {
            const parsed = JSON.parse(text);
            return JSON.stringify(redactObject(parsed));
        } catch {
            return text;
        }
    }

    function truncateText(text) {
        const value = String(text || "");

        if (value.length <= MAX_BODY_CHARS) {
            return value;
        }

        return `${value.slice(0, MAX_BODY_CHARS)}\n...[truncated]`;
    }

    function sanitizeBodyByContentType(text, contentType) {
        const type = String(contentType || "").toLowerCase();
        let safeText = String(text || "");

        if (type.includes("application/json")) {
            safeText = redactJsonBody(safeText);
        } else if (type.includes("application/x-www-form-urlencoded")) {
            safeText = redactFormBody(safeText);
        }

        return truncateText(safeText);
    }

    function isTextLikeContentType(contentType) {
        const type = String(contentType || "").toLowerCase();

        return (
            type.includes("application/json") ||
            type.includes("text/") ||
            type.includes("application/x-www-form-urlencoded") ||
            type.includes("application/xml") ||
            type.includes("text/xml")
        );
    }

    function isThirdPartyUrl(url) {
        try {
            return new URL(url).origin !== location.origin;
        } catch {
            return true;
        }
    }

    function payloadSizeChars(payload) {
        try {
            return JSON.stringify(payload).length;
        } catch {
            return MAX_PAYLOAD_CHARS + 1;
        }
    }

    function trimRouterBuffer() {
        while (routerBuffer.length > ROUTER_BUFFER_MAX) {
            routerBuffer.shift();
            routerDroppedCount += 1;
        }
    }

    function getRetryDelayMs(response) {
        try {
            const retryAfter = response && response.headers
                ? response.headers.get("Retry-After")
                : null;

            if (retryAfter) {
                const seconds = Number(retryAfter);

                if (Number.isFinite(seconds) && seconds > 0) {
                    return Math.min(seconds * 1000, ROUTER_MAX_BACKOFF_MS);
                }
            }
        } catch {}

        return Math.min(
            ROUTER_MAX_BACKOFF_MS,
            1000 * Math.pow(2, Math.max(1, routerConsecutiveFailures))
        );
    }

    function scheduleRouterFlush(delay = ROUTER_SEND_INTERVAL_MS) {
        if (routerFlushTimer) return;

        const safeDelay = Math.max(50, Math.min(delay, ROUTER_MAX_BACKOFF_MS));

        routerFlushTimer = setTimeout(() => {
            routerFlushTimer = null;
            flushRouterBuffer();
        }, safeDelay);
    }

    function makeRouterPayload(batch, createdFrom) {
        return {
            routerId: ROUTER_ID,
            sessionId,
            pageUrl: sanitizeUrl(location.href),
            createdFrom,
            capturedAt: new Date().toISOString(),
            droppedBeforeSend: routerDroppedCount,
            jobs: batch,
        };
    }

    async function postRouterBatch(batch) {
        if (!nativeFetchForRouter) {
            return true;
        }

        if (!batch.length) {
            return true;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => {
            try {
                controller.abort();
            } catch {}
        }, ROUTER_REQUEST_TIMEOUT_MS);

        try {
            const payload = makeRouterPayload(batch, "browser-session-batch");
            let body = JSON.stringify(payload);

            if (body.length > MAX_PAYLOAD_CHARS) {
                const smallerPayload = makeRouterPayload(
                    batch.map((job) => ({
                        ...job,
                        body: job.body ? "[dropped-payload-too-large]" : null,
                        meta: {
                            ...(job.meta || {}),
                            bodyCaptured: false,
                            bodyDroppedReason: "payload-too-large",
                        },
                    })),
                    "browser-session-batch-trimmed"
                );

                body = JSON.stringify(smallerPayload);
            }

            if (body.length > MAX_PAYLOAD_CHARS) {
                routerDroppedCount += batch.length;
                clearTimeout(timeout);
                return true;
            }

            const response = await nativeFetchForRouter(ROUTER_QUEUE_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                keepalive: body.length < MAX_PAYLOAD_CHARS,
                body,
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (
                response.ok ||
                response.status === 202 ||
                response.status === 204
            ) {
                routerConsecutiveFailures = 0;
                routerBackoffUntil = 0;
                return true;
            }

            if (
                response.status === 408 ||
                response.status === 425 ||
                response.status === 429 ||
                response.status === 500 ||
                response.status === 502 ||
                response.status === 503 ||
                response.status === 504
            ) {
                routerConsecutiveFailures += 1;
                routerBackoffUntil = Date.now() + getRetryDelayMs(response);
                return false;
            }

            routerConsecutiveFailures = 0;
            routerBackoffUntil = 0;
            routerDroppedCount += batch.length;
            return true;
        } catch {
            clearTimeout(timeout);

            routerConsecutiveFailures += 1;
            routerBackoffUntil =
                Date.now() +
                Math.min(
                    ROUTER_MAX_BACKOFF_MS,
                    1000 * Math.pow(2, Math.max(1, routerConsecutiveFailures))
                );

            return false;
        }
    }

    async function flushRouterBuffer() {
        if (routerSending) return;
        if (!routerBuffer.length) return;

        const now = Date.now();

        if (routerBackoffUntil && now < routerBackoffUntil) {
            scheduleRouterFlush(routerBackoffUntil - now);
            return;
        }

        if (navigator && navigator.onLine === false) {
            scheduleRouterFlush(5000);
            return;
        }

        routerSending = true;

        try {
            const batch = routerBuffer.splice(0, ROUTER_BATCH_MAX);
            const sent = await postRouterBatch(batch);

            if (!sent) {
                routerBuffer = batch.concat(routerBuffer);
                trimRouterBuffer();
            }
        } finally {
            routerSending = false;
        }

        if (routerBuffer.length) {
            scheduleRouterFlush();
        }
    }

    function buildSafeJob(job) {
        const url = sanitizeUrl(job.url);
        const method = String(job.method || "GET").toUpperCase();

        if (!url || shouldSkipUrl(url)) {
            return null;
        }

        return {
            url,
            method,
            headers: cleanHeaders(job.headers || {}),
            body: job.body || null,
            capturedAt: new Date().toISOString(),
            meta: {
                destinationOrigin: (() => {
                    try {
                        return new URL(url).origin;
                    } catch {
                        return "";
                    }
                })(),
                pageOrigin: location.origin,
                thirdParty: isThirdPartyUrl(url),
                bodyCaptured: Boolean(job.body),
            },
        };
    }

    function enqueueRouterJob(job) {
        try {
            const safeJob = buildSafeJob(job);

            if (!safeJob) {
                return;
            }

            routerBuffer.push(safeJob);
            trimRouterBuffer();
            scheduleRouterFlush();
        } catch {
            // Never let router logging break the app.
        }
    }

    async function readFetchBodySafely(request) {
        if (!CAPTURE_REQUEST_BODIES) return null;

        const method = String(request.method || "GET").toUpperCase();

        if (method === "GET" || method === "HEAD") {
            return null;
        }

        if (isThirdPartyUrl(request.url) && !CAPTURE_THIRD_PARTY_BODIES) {
            return null;
        }

        const contentType = request.headers.get("content-type") || "";

        if (!isTextLikeContentType(contentType)) {
            return null;
        }

        try {
            const clone = request.clone();
            const text = await clone.text();

            return sanitizeBodyByContentType(text, contentType);
        } catch {
            return null;
        }
    }

    async function mirrorFetch(input, init) {
        try {
            const request = new Request(input, init);

            if (shouldSkipUrl(request.url)) {
                return;
            }

            const body = await readFetchBodySafely(request);

            enqueueRouterJob({
                url: request.url,
                method: request.method || "GET",
                headers: request.headers,
                body,
            });
        } catch {
            // Mirror failures should never affect app fetches.
        }
    }

    const nativeFetch = window.fetch;

    if (typeof nativeFetch === "function") {
        window.fetch = function patchedFetch(input, init) {
            mirrorFetch(input, init);
            return nativeFetch.apply(this, arguments);
        };
    }

    const NativeXHR = window.XMLHttpRequest;

    if (NativeXHR && NativeXHR.prototype) {
        const nativeOpen = NativeXHR.prototype.open;
        const nativeSetRequestHeader = NativeXHR.prototype.setRequestHeader;
        const nativeSend = NativeXHR.prototype.send;

        NativeXHR.prototype.open = function patchedOpen(method, url) {
            this.__routerMirrorState = {
                method: String(method || "GET").toUpperCase(),
                url: toAbsoluteUrl(url),
                headers: {},
            };

            return nativeOpen.apply(this, arguments);
        };

        NativeXHR.prototype.setRequestHeader = function patchedSetRequestHeader(key, value) {
            try {
                if (!this.__routerMirrorState) {
                    this.__routerMirrorState = {
                        method: "GET",
                        url: "",
                        headers: {},
                    };
                }

                this.__routerMirrorState.headers[String(key || "")] = String(value || "");
            } catch {}

            return nativeSetRequestHeader.apply(this, arguments);
        };

        NativeXHR.prototype.send = function patchedSend(body) {
            try {
                const state = this.__routerMirrorState || {};
                const absoluteUrl = toAbsoluteUrl(state.url);

                if (!shouldSkipUrl(absoluteUrl)) {
                    let safeBody = null;
                    const method = String(state.method || "GET").toUpperCase();
                    const headers = state.headers || {};
                    const contentType =
                        headers["Content-Type"] ||
                        headers["content-type"] ||
                        "";

                    if (
                        CAPTURE_REQUEST_BODIES &&
                        method !== "GET" &&
                        method !== "HEAD" &&
                        typeof body === "string" &&
                        isTextLikeContentType(contentType) &&
                        (!isThirdPartyUrl(absoluteUrl) || CAPTURE_THIRD_PARTY_BODIES)
                    ) {
                        safeBody = sanitizeBodyByContentType(body, contentType);
                    }

                    enqueueRouterJob({
                        url: absoluteUrl,
                        method,
                        headers,
                        body: safeBody,
                    });
                }
            } catch {
                // Mirror failures should never affect app XHRs.
            }

            return nativeSend.apply(this, arguments);
        };
    }

    function flushWithBeacon() {
        try {
            if (!routerBuffer.length) return;
            if (!navigator.sendBeacon) return;

            const batch = routerBuffer.splice(0, ROUTER_BATCH_MAX);

            const payload = makeRouterPayload(
                batch.map((job) => ({
                    ...job,
                    body: job.body ? "[dropped-pagehide]" : null,
                    meta: {
                        ...(job.meta || {}),
                        bodyCaptured: false,
                        bodyDroppedReason: job.body ? "pagehide" : undefined,
                    },
                })),
                "browser-session-pagehide"
            );

            const body = JSON.stringify(payload);

            if (body.length < MAX_PAYLOAD_CHARS) {
                navigator.sendBeacon(
                    ROUTER_QUEUE_ENDPOINT,
                    new Blob([body], {
                        type: "application/json",
                    })
                );
            }
        } catch {
            // Do nothing during unload/pagehide.
        }
    }

    window.addEventListener("pagehide", flushWithBeacon);
    window.addEventListener("online", () => scheduleRouterFlush(100));
    window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            flushWithBeacon();
        } else {
            scheduleRouterFlush(100);
        }
    });

    console.log(`${LOG_PREFIX} browser request enqueue enabled`, {
        endpoint: ROUTER_QUEUE_ENDPOINT,
        routerId: ROUTER_ID,
        sessionId,
        batchMax: ROUTER_BATCH_MAX,
        bufferMax: ROUTER_BUFFER_MAX,
        captureBodies: CAPTURE_REQUEST_BODIES,
        captureThirdPartyBodies: CAPTURE_THIRD_PARTY_BODIES,
    });
})();