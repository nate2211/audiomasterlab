import Dexie from "dexie";

export const AUDIO_DEXIE_DATABASE_NAME = "audiomasterlab-audio-v1";
export const AUDIO_DEXIE_LATEST_SESSION_ID = "latest";
export const AUDIO_DEXIE_LATEST_SETTINGS_ID = "latest";
export const AUDIO_DEXIE_DEFAULT_PLAYLIST_ID = "default";
export const AUDIO_MEDIA_CACHE_NAME = "audiomasterlab-audio-media-cache-v1";

export const audioDexie = new Dexie(AUDIO_DEXIE_DATABASE_NAME);

audioDexie.version(1).stores({
    sessions: "id, updatedAt, isPlaying, sourceKind, activePlaylistIndex",
    settings: "id, updatedAt, activePresetKey",
    playlists: "id, updatedAt, name, activePlaylistIndex, length",
    playlistItems: "id, playlistId, order, kind, title, url, addedAt",
    trackBlobs: "id, playlistItemId, title, size, type, savedAt",
    exports: "id, createdAt, title, type, size",
    controls: "id, updatedAt",
});

// Version 2 only adds cachedMedia. It keeps the existing v1 stores untouched,
// so projects that already created audiomasterlab-audio-v1 upgrade safely.
audioDexie.version(2).stores({
    sessions: "id, updatedAt, isPlaying, sourceKind, activePlaylistIndex",
    settings: "id, updatedAt, activePresetKey",
    playlists: "id, updatedAt, name, activePlaylistIndex, length",
    playlistItems: "id, playlistId, order, kind, title, url, offlineCacheId, cachedAt, addedAt",
    trackBlobs: "id, playlistItemId, title, size, type, savedAt",
    exports: "id, createdAt, title, type, size",
    controls: "id, updatedAt",
    cachedMedia: "id, url, playlistItemId, cacheKey, size, type, cachedAt",
});

function nowIso() {
    return new Date().toISOString();
}

function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function sanitizePlaylistItemForDexie(item, order = 0, playlistId = AUDIO_DEXIE_DEFAULT_PLAYLIST_ID) {
    const id =
        item?.id ||
        item?.playlistItemId ||
        `${playlistId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return {
        id: String(id),
        playlistId,
        order,
        kind: String(item?.kind || ""),
        title: String(item?.title || item?.name || "Untitled audio"),
        url: String(item?.url || item?.sourceUrl || ""),
        size: safeNumber(item?.size, 0),
        type: String(item?.type || ""),
        addedAt: item?.addedAt || nowIso(),
        active: Boolean(item?.active),
        archiveIdentifier: String(item?.archiveIdentifier || ""),
        artworkUrl: String(item?.artworkUrl || item?.archiveArtworkUrl || ""),
        sourceKind: String(item?.sourceKind || item?.kind || ""),
        duration: safeNumber(item?.duration, 0),
        durationLabel: String(item?.durationLabel || ""),
        indexedDbFileKey: String(item?.indexedDbFileKey || ""),
        dataUrl: String(item?.dataUrl || ""),
        offlineAvailable: Boolean(item?.offlineAvailable),
        offlineCacheId: String(item?.offlineCacheId || ""),
        cachedAt: String(item?.cachedAt || ""),
        cachedSize: safeNumber(item?.cachedSize, 0),
        updatedAt: nowIso(),
    };
}

export async function openAudioDexie() {
    if (!audioDexie.isOpen()) {
        await audioDexie.open();
    }

    return audioDexie;
}

export async function saveAudioSessionSnapshot(snapshot = {}) {
    const record = {
        id: AUDIO_DEXIE_LATEST_SESSION_ID,
        ...snapshot,
        currentPosition: safeNumber(snapshot.currentPosition, 0),
        duration: safeNumber(snapshot.duration, 0),
        activePlaylistIndex: safeNumber(snapshot.activePlaylistIndex, -1),
        playlistLength: safeNumber(snapshot.playlistLength, 0),
        isPlaying: Boolean(snapshot.isPlaying),
        updatedAt: nowIso(),
    };

    await audioDexie.sessions.put(record);
    return record;
}

export async function getLatestAudioSessionSnapshot() {
    return (await audioDexie.sessions.get(AUDIO_DEXIE_LATEST_SESSION_ID)) || null;
}

export async function saveAudioSettingsSnapshot(settings = {}) {
    const record = {
        id: AUDIO_DEXIE_LATEST_SETTINGS_ID,
        ...settings,
        activePresetKey: String(settings.activePresetKey || "flat"),
        updatedAt: nowIso(),
    };

    await audioDexie.settings.put(record);
    return record;
}

export async function getAudioSettingsSnapshot() {
    return (await audioDexie.settings.get(AUDIO_DEXIE_LATEST_SETTINGS_ID)) || null;
}

export async function saveAudioControlSnapshot(controlSnapshot = {}) {
    const record = {
        id: String(controlSnapshot.id || "latest-controls"),
        ...controlSnapshot,
        updatedAt: nowIso(),
    };

    await audioDexie.controls.put(record);
    return record;
}

export async function getAudioControlSnapshot(id = "latest-controls") {
    return (await audioDexie.controls.get(id)) || null;
}

export async function saveAudioPlaylistSnapshot(
    playlist = [],
    {
        playlistId = AUDIO_DEXIE_DEFAULT_PLAYLIST_ID,
        name = "AudioMasterLab playlist",
        activePlaylistIndex = -1,
        repeatEnabled = false,
    } = {}
) {
    const safePlaylist = Array.isArray(playlist) ? playlist : [];
    const updatedAt = nowIso();

    const playlistRecord = {
        id: playlistId,
        name,
        activePlaylistIndex: safeNumber(activePlaylistIndex, -1),
        repeatEnabled: Boolean(repeatEnabled),
        length: safePlaylist.length,
        updatedAt,
    };

    const itemRecords = safePlaylist.map((item, index) =>
        sanitizePlaylistItemForDexie(item, index, playlistId)
    );

    await audioDexie.transaction("rw", audioDexie.playlists, audioDexie.playlistItems, async () => {
        await audioDexie.playlists.put(playlistRecord);
        await audioDexie.playlistItems.where("playlistId").equals(playlistId).delete();

        if (itemRecords.length) {
            await audioDexie.playlistItems.bulkPut(itemRecords);
        }
    });

    return {
        playlist: playlistRecord,
        items: itemRecords,
    };
}

export async function getAudioPlaylistSnapshot(playlistId = AUDIO_DEXIE_DEFAULT_PLAYLIST_ID) {
    const playlist = await audioDexie.playlists.get(playlistId);

    if (!playlist) {
        return {
            playlist: null,
            items: [],
        };
    }

    const items = await audioDexie.playlistItems
        .where("playlistId")
        .equals(playlistId)
        .sortBy("order");

    return {
        playlist,
        items,
    };
}

export async function savePlaylistItemBlob({
                                               playlistItemId,
                                               blob,
                                               title = "Saved audio",
                                               type = "",
                                           } = {}) {
    if (!playlistItemId || !blob) {
        return null;
    }

    const id = String(playlistItemId);
    const record = {
        id,
        playlistItemId: id,
        blob,
        title: String(title || "Saved audio"),
        type: String(type || blob.type || "application/octet-stream"),
        size: safeNumber(blob.size, 0),
        savedAt: nowIso(),
    };

    await audioDexie.trackBlobs.put(record);
    return record;
}

export async function getPlaylistItemBlob(playlistItemId) {
    if (!playlistItemId) {
        return null;
    }

    return (await audioDexie.trackBlobs.get(String(playlistItemId))) || null;
}

export async function deletePlaylistItemBlob(playlistItemId) {
    if (!playlistItemId) {
        return false;
    }

    await audioDexie.trackBlobs.delete(String(playlistItemId));
    return true;
}

export async function saveAudioExportRecord(exportRecord = {}) {
    const id =
        exportRecord.id ||
        `export-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const record = {
        id,
        title: String(exportRecord.title || "Audio export"),
        type: String(exportRecord.type || ""),
        size: safeNumber(exportRecord.size, 0),
        url: String(exportRecord.url || ""),
        createdAt: exportRecord.createdAt || nowIso(),
    };

    await audioDexie.exports.put(record);
    return record;
}

export async function listAudioExportRecords(limit = 50) {
    return audioDexie.exports
        .orderBy("createdAt")
        .reverse()
        .limit(Math.max(1, Number(limit) || 50))
        .toArray();
}

export function canUseCacheStorage() {
    return typeof window !== "undefined" && "caches" in window;
}

export function makeOfflineCacheId(item = {}) {
    const raw = item.id || item.playlistItemId || item.url || item.title || `${Date.now()}-${Math.random()}`;
    return String(raw).replace(/[^a-z0-9._-]/gi, "_").slice(0, 180);
}

async function openAudioMediaCache() {
    if (!canUseCacheStorage()) {
        throw new Error("CacheStorage is not available in this browser.");
    }

    return window.caches.open(AUDIO_MEDIA_CACHE_NAME);
}

export async function cacheUrlPlaylistItem(item = {}, { signal } = {}) {
    if (!item || item.kind !== "url" || !item.url) {
        return {
            ok: false,
            item,
            reason: "Only direct URL playlist items can be cached.",
        };
    }

    const id = makeOfflineCacheId(item);
    const cacheKey = `/__audiomasterlab_cached_audio__/${id}`;
    const response = await fetch(item.url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "reload",
        signal,
    });

    if (!response || (!response.ok && response.type !== "opaque")) {
        throw new Error(`Could not download "${item.title || item.url}".`);
    }

    const blob = await response.clone().blob();

    if (!blob || blob.size <= 0) {
        throw new Error(`Downloaded media was empty for "${item.title || item.url}".`);
    }

    const cache = await openAudioMediaCache();

    await cache.put(
        cacheKey,
        new Response(blob, {
            headers: {
                "Content-Type": blob.type || item.type || "application/octet-stream",
                "X-AudioMasterLab-Source-Url": item.url,
                "X-AudioMasterLab-Title": item.title || "Cached audio",
            },
        })
    );

    const record = {
        id,
        url: item.url,
        playlistItemId: String(item.id || ""),
        cacheKey,
        size: blob.size,
        type: blob.type || item.type || "application/octet-stream",
        cachedAt: nowIso(),
    };

    await audioDexie.cachedMedia.put(record);

    return {
        ok: true,
        record,
        item: {
            ...item,
            offlineAvailable: true,
            offlineCacheId: id,
            cachedAt: record.cachedAt,
            cachedSize: record.size,
        },
    };
}

export async function getCachedRecordForItem(item = {}) {
    const offlineCacheId = item.offlineCacheId || makeOfflineCacheId(item);

    if (offlineCacheId) {
        const byId = await audioDexie.cachedMedia.get(String(offlineCacheId));
        if (byId) return byId;
    }

    if (item.url) {
        return (
            (await audioDexie.cachedMedia.where("url").equals(String(item.url)).first()) ||
            null
        );
    }

    return null;
}

export async function getCachedPlayableUrlForItem(item = {}) {
    const record = await getCachedRecordForItem(item);

    if (!record || !record.cacheKey || !canUseCacheStorage()) {
        return "";
    }

    const cache = await openAudioMediaCache();
    const response = await cache.match(record.cacheKey);

    if (!response) {
        return "";
    }

    const blob = await response.blob();

    if (!blob || blob.size <= 0) {
        return "";
    }

    return URL.createObjectURL(blob);
}

export function releaseCachedPlayableUrl(urlValue) {
    if (String(urlValue || "").startsWith("blob:")) {
        try {
            URL.revokeObjectURL(urlValue);
        } catch {
            // Ignore revoke failures.
        }
    }
}

export async function hydratePlaylistOfflineFlags(playlist = []) {
    const safePlaylist = Array.isArray(playlist) ? playlist : [];

    return Promise.all(
        safePlaylist.map(async (item) => {
            if (!item || item.kind !== "url" || !item.url) {
                return item;
            }

            const record = await getCachedRecordForItem(item);

            if (!record) {
                return item;
            }

            return {
                ...item,
                offlineAvailable: true,
                offlineCacheId: record.id,
                cachedAt: record.cachedAt,
                cachedSize: record.size,
            };
        })
    );
}

export async function getAudioCacheSummary() {
    if (!audioDexie.cachedMedia) {
        return {
            count: 0,
            bytes: 0,
            records: [],
        };
    }

    const records = await audioDexie.cachedMedia.toArray();
    const bytes = records.reduce((total, record) => total + Number(record.size || 0), 0);

    return {
        count: records.length,
        bytes,
        records,
    };
}

export async function clearAudioCache() {
    if (canUseCacheStorage()) {
        await window.caches.delete(AUDIO_MEDIA_CACHE_NAME);
    }

    if (audioDexie.cachedMedia) {
        await audioDexie.cachedMedia.clear();
    }

    return true;
}

export async function clearAudioDexieDatabase() {
    await audioDexie.transaction(
        "rw",
        audioDexie.sessions,
        audioDexie.settings,
        audioDexie.playlists,
        audioDexie.playlistItems,
        audioDexie.trackBlobs,
        audioDexie.exports,
        audioDexie.controls,
        audioDexie.cachedMedia,
        async () => {
            await Promise.all([
                audioDexie.sessions.clear(),
                audioDexie.settings.clear(),
                audioDexie.playlists.clear(),
                audioDexie.playlistItems.clear(),
                audioDexie.trackBlobs.clear(),
                audioDexie.exports.clear(),
                audioDexie.controls.clear(),
                audioDexie.cachedMedia.clear(),
            ]);
        }
    );

    if (canUseCacheStorage()) {
        await window.caches.delete(AUDIO_MEDIA_CACHE_NAME);
    }

    return true;
}

export default audioDexie;
