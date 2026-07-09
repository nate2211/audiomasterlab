import { createSlice } from "@reduxjs/toolkit";

const isoNow = () => new Date().toISOString();

function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function positiveNumber(value, fallback = 0) {
    return Math.max(0, finiteNumber(value, fallback));
}

const initialState = {
    playback: {
        isPlaying: false,
        isLoading: false,
        isReady: false,
        isBuffering: false,
        isRecovering: false,
        isScrubbing: false,
        mainButtonMode: "play",
        playlistButtonMode: "play",
        playPauseButtonMode: "play",
        lastAction: "",
        lastError: "",
        lastUpdatedAt: "",
        updatedAt: "",
    },
    source: {
        sourceKind: "",
        sourceUrl: "",
        mediaTitle: "",
        activePlaylistIndex: -1,
        activePlaylistItemId: "",
        activePlaylistTitle: "",
    },
    position: {
        currentTime: 0,
        duration: 0,
        bufferedEnd: 0,
        playbackRate: 1,
        lastPositionUpdateAt: "",
        updatedAt: "",
    },
    scrub: {
        isScrubbing: false,
        value: 0,
        scrubValue: 0,
        startedAt: "",
        lastCommittedAt: "",
        committedAt: "",
        shouldResumeAfterScrub: false,
        lastSource: "",
    },
    playlist: {
        items: [],
        activePlaylistIndex: -1,
        playingPlaylistItemId: "",
        repeatEnabled: false,
        playlistLength: 0,
        length: 0,
        lastSavedAt: "",
        updatedAt: "",
    },
    settings: {
        activePresetKey: "flat",
        baseVolume: 1,
        speed: 1,
        pitchSemitones: 0,
        outputGain: 0,
        muted: false,
    },
    controls: {
        mediaSessionReady: false,
        lockScreenReady: false,
        lastMediaSessionAction: "",
        lastMediaSessionActionAt: "",
        backgroundCheckpointAt: "",
        foregroundRepairAt: "",
        selfHealAt: "",
        controlsHealthyAt: "",
        volumeSyncedAt: "",
        updatedAt: "",
    },
    carResume: {
        carPlaySafeMode: false,
        smartCarResumeEnabled: false,
        smartCarResumeIntentAvailable: false,
        inFlight: false,
        wakeId: 0,
        attemptsForWake: 0,
        lastManualPauseAt: "",
        lastRouteWakeAt: "",
        lastStartGuardAt: "",
        lastResult: "",
    },
    persistence: {
        localStorageEnabled: false,
        dexieReady: false,
        hydrated: false,
        lastHydratedAt: "",
        lastSessionSavedAt: "",
        lastPlaylistSavedAt: "",
        lastSettingsSavedAt: "",
        lastPersistenceError: "",
        lastError: "",
    },
    cache: {
        supported: false,
        cacheSupported: false,
        active: false,
        activeCaching: false,
        offlineItems: 0,
        playlistCacheCount: 0,
        bytes: 0,
        playlistCacheBytes: 0,
        cacheProgress: 0,
        message: "",
        cacheMessage: "",
        updatedAt: "",
    },
    pwa: {
        serviceWorkerSupported:
            typeof navigator !== "undefined" && "serviceWorker" in navigator,
        serviceWorkerRegistered: false,
        serviceWorkerReady: false,
        offlineReady: false,
        updateAvailable: false,
        updateServiceWorkerAvailable: false,
        installSupported: false,
        installPromptReady: false,
        installed: false,
        updateServiceWorker: null,
        lastMessage: "",
        message: "",
        lastUpdatedAt: "",
        updatedAt: "",
    },
    workbox: {
        supported:
            typeof navigator !== "undefined" && "serviceWorker" in navigator,
        registered: false,
        ready: false,
        updateAvailable: false,
        updateServiceWorker: null,
        message: "",
        updatedAt: "",
    },
    native: {},
};

function updateButtonModes(state) {
    const mainMode = state.playback.isPlaying ? "pause" : "play";
    const playlistMode =
        state.playback.isPlaying && state.playlist.activePlaylistIndex >= 0
            ? "pause"
            : "play";

    state.playback.mainButtonMode = mainMode;
    state.playback.playPauseButtonMode = mainMode;
    state.playback.playlistButtonMode = playlistMode;
}

function applyPosition(state, payload = {}) {
    state.position.currentTime = positiveNumber(payload.currentTime, state.position.currentTime);
    state.position.duration = positiveNumber(payload.duration, state.position.duration);
    state.position.bufferedEnd = positiveNumber(payload.bufferedEnd, state.position.bufferedEnd);
    state.position.playbackRate = finiteNumber(payload.playbackRate, state.position.playbackRate);
    state.position.lastPositionUpdateAt = isoNow();
    state.position.updatedAt = isoNow();
}

function applySource(state, payload = {}) {
    state.source = {
        ...state.source,
        sourceKind: String(payload.sourceKind || state.source.sourceKind || ""),
        sourceUrl: String(payload.sourceUrl || payload.url || state.source.sourceUrl || ""),
        mediaTitle: String(payload.mediaTitle || payload.title || state.source.mediaTitle || ""),
        activePlaylistIndex: Number.isFinite(Number(payload.activePlaylistIndex))
            ? Number(payload.activePlaylistIndex)
            : state.source.activePlaylistIndex,
        activePlaylistItemId: String(payload.activePlaylistItemId || state.source.activePlaylistItemId || ""),
        activePlaylistTitle: String(payload.activePlaylistTitle || state.source.activePlaylistTitle || ""),
    };

    state.playlist.activePlaylistIndex = state.source.activePlaylistIndex;
    state.playlist.playingPlaylistItemId = state.source.activePlaylistItemId;
    state.playlist.updatedAt = isoNow();
    updateButtonModes(state);
}

function applyPlaylist(state, payload = {}) {
    const items = Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload)
            ? payload
            : state.playlist.items;

    state.playlist = {
        ...state.playlist,
        ...(Array.isArray(payload) ? {} : payload),
        items,
        length: items.length,
        playlistLength: items.length,
        activePlaylistIndex: Number.isFinite(Number(payload.activePlaylistIndex))
            ? Number(payload.activePlaylistIndex)
            : state.playlist.activePlaylistIndex,
        repeatEnabled: typeof payload.repeatEnabled === "boolean"
            ? payload.repeatEnabled
            : state.playlist.repeatEnabled,
        lastSavedAt: payload.lastSavedAt || state.playlist.lastSavedAt,
        updatedAt: isoNow(),
    };

    updateButtonModes(state);
}

const audioPlayerSlice = createSlice({
    name: "audioPlayer",
    initialState,
    reducers: {
        hydrateAudioState(state, action) {
            const payload = action.payload || {};

            if (payload.playback) {
                state.playback = {
                    ...state.playback,
                    ...payload.playback,
                    updatedAt: isoNow(),
                    lastUpdatedAt: isoNow(),
                };
            }

            if (payload.source) applySource(state, payload.source);
            if (payload.position) applyPosition(state, payload.position);
            if (payload.playlist) applyPlaylist(state, payload.playlist);
            if (payload.settings) state.settings = { ...state.settings, ...payload.settings };
            if (payload.controls) state.controls = { ...state.controls, ...payload.controls, updatedAt: isoNow() };
            if (payload.scrub) state.scrub = { ...state.scrub, ...payload.scrub };
            if (payload.carResume) state.carResume = { ...state.carResume, ...payload.carResume };
            if (payload.cache) state.cache = { ...state.cache, ...payload.cache, updatedAt: isoNow() };
            if (payload.pwa) state.pwa = { ...state.pwa, ...payload.pwa, updatedAt: isoNow(), lastUpdatedAt: isoNow() };
            if (payload.workbox) state.workbox = { ...state.workbox, ...payload.workbox, updatedAt: isoNow() };

            state.persistence.hydrated = true;
            state.persistence.lastHydratedAt = isoNow();
            updateButtonModes(state);
        },

        setPlaybackSnapshot(state, action) {
            const payload = action.payload || {};

            state.playback = {
                ...state.playback,
                ...payload,
                isPlaying: Boolean(payload.isPlaying),
                isLoading: Boolean(payload.isLoading),
                isScrubbing: Boolean(payload.isScrubbing),
                updatedAt: isoNow(),
                lastUpdatedAt: isoNow(),
            };

            state.scrub.isScrubbing = state.playback.isScrubbing;
            updateButtonModes(state);
        },

        // Backward-compatible alias used by the first-step slice.
        setPlaybackState(state, action) {
            const payload = action.payload || {};

            state.playback = {
                ...state.playback,
                ...payload,
                updatedAt: isoNow(),
                lastUpdatedAt: isoNow(),
            };

            if (Object.prototype.hasOwnProperty.call(payload, "isPlaying")) {
                state.playback.isPlaying = Boolean(payload.isPlaying);
            }

            if (Object.prototype.hasOwnProperty.call(payload, "isScrubbing")) {
                state.scrub.isScrubbing = Boolean(payload.isScrubbing);
            }

            updateButtonModes(state);
        },

        setPlaying(state, action) {
            const nextValue = Boolean(action.payload);

            state.playback.isPlaying = nextValue;
            state.playback.isLoading = false;
            state.playback.isBuffering = false;
            state.playback.isReady = state.playback.isReady || nextValue;
            state.playback.lastAction = nextValue ? "play" : "pause";
            state.playback.updatedAt = isoNow();
            state.playback.lastUpdatedAt = isoNow();

            if (!nextValue) {
                state.carResume.inFlight = false;
            }

            updateButtonModes(state);
        },

        setLoading(state, action) {
            state.playback.isLoading = Boolean(action.payload);
            state.playback.lastAction = Boolean(action.payload) ? "loading" : state.playback.lastAction;
            state.playback.updatedAt = isoNow();
            state.playback.lastUpdatedAt = isoNow();
        },

        setPlaybackError(state, action) {
            state.playback.lastError = String(action.payload || "");
            state.playback.isLoading = false;
            state.playback.isBuffering = false;
            state.playback.isRecovering = false;
            state.playback.updatedAt = isoNow();
            state.playback.lastUpdatedAt = isoNow();
            updateButtonModes(state);
        },

        clearPlaybackError(state) {
            state.playback.lastError = "";
            state.playback.updatedAt = isoNow();
            state.playback.lastUpdatedAt = isoNow();
        },

        setSourceSnapshot(state, action) {
            applySource(state, action.payload || {});
        },

        // Backward-compatible alias used by the first-step slice.
        setMediaSource(state, action) {
            applySource(state, action.payload || {});
        },

        setPositionSnapshot(state, action) {
            applyPosition(state, action.payload || {});
        },

        // Backward-compatible alias used by the first-step slice.
        setPositionState(state, action) {
            applyPosition(state, action.payload || {});
        },

        setCurrentTime(state, action) {
            state.position.currentTime = positiveNumber(action.payload, state.position.currentTime);
            state.position.lastPositionUpdateAt = isoNow();
            state.position.updatedAt = isoNow();
        },

        setDuration(state, action) {
            state.position.duration = positiveNumber(action.payload, state.position.duration);
            state.position.lastPositionUpdateAt = isoNow();
            state.position.updatedAt = isoNow();
        },

        startScrub(state, action) {
            const payload = action.payload || {};
            const nextValue = positiveNumber(payload.value ?? payload.scrubValue, state.position.currentTime);

            state.scrub.isScrubbing = true;
            state.scrub.value = nextValue;
            state.scrub.scrubValue = nextValue;
            state.scrub.startedAt = isoNow();
            state.scrub.shouldResumeAfterScrub = Boolean(payload.shouldResumeAfterScrub);
            state.scrub.lastSource = String(payload.source || "browser-slider");
            state.playback.isScrubbing = true;
            state.playback.lastAction = "scrub-start";
            state.playback.updatedAt = isoNow();
            state.playback.lastUpdatedAt = isoNow();
            updateButtonModes(state);
        },

        updateScrubValue(state, action) {
            const nextValue = positiveNumber(action.payload, state.scrub.value);
            state.scrub.value = nextValue;
            state.scrub.scrubValue = nextValue;
            state.position.currentTime = nextValue;
            state.position.lastPositionUpdateAt = isoNow();
            state.position.updatedAt = isoNow();
        },

        commitScrub(state, action) {
            const payload = action.payload || {};
            const nextValue = positiveNumber(payload.currentTime ?? payload.value ?? payload.scrubValue, state.scrub.value);

            state.scrub.isScrubbing = false;
            state.scrub.value = nextValue;
            state.scrub.scrubValue = nextValue;
            state.scrub.committedAt = isoNow();
            state.scrub.lastCommittedAt = isoNow();
            state.scrub.shouldResumeAfterScrub = Boolean(payload.shouldResumeAfterScrub);
            state.scrub.lastSource = String(payload.source || state.scrub.lastSource || "browser-slider");
            state.position.currentTime = nextValue;
            state.position.lastPositionUpdateAt = isoNow();
            state.position.updatedAt = isoNow();
            state.playback.isScrubbing = false;
            state.playback.lastAction = "scrub-commit";
            state.playback.updatedAt = isoNow();
            state.playback.lastUpdatedAt = isoNow();
            updateButtonModes(state);
        },

        cancelScrub(state) {
            state.scrub.isScrubbing = false;
            state.scrub.shouldResumeAfterScrub = false;
            state.playback.isScrubbing = false;
            state.playback.lastAction = "scrub-cancel";
            state.playback.updatedAt = isoNow();
            state.playback.lastUpdatedAt = isoNow();
            updateButtonModes(state);
        },

        setPlaylistSnapshot(state, action) {
            applyPlaylist(state, action.payload || {});
        },

        // Backward-compatible alias.
        setPlaylist(state, action) {
            applyPlaylist(state, action.payload || []);
        },

        setActivePlaylistIndex(state, action) {
            state.playlist.activePlaylistIndex = finiteNumber(action.payload, -1);
            state.source.activePlaylistIndex = state.playlist.activePlaylistIndex;
            state.playlist.updatedAt = isoNow();
            updateButtonModes(state);
        },

        setRepeatEnabled(state, action) {
            state.playlist.repeatEnabled = Boolean(action.payload);
            state.playlist.updatedAt = isoNow();
        },

        setSettingsSummary(state, action) {
            state.settings = {
                ...state.settings,
                ...(action.payload || {}),
            };
            state.persistence.lastSettingsSavedAt = isoNow();
        },

        setVolumeSummary(state, action) {
            state.settings.baseVolume = positiveNumber(action.payload, state.settings.baseVolume);
            state.controls.volumeSyncedAt = isoNow();
        },

        setControlHealth(state, action) {
            state.controls = {
                ...state.controls,
                ...(action.payload || {}),
                controlsHealthyAt: isoNow(),
                updatedAt: isoNow(),
            };
        },

        markMediaSessionAction(state, action) {
            const payload = action.payload || {};
            state.controls.lastMediaSessionAction = String(payload.action || "");
            state.controls.lastMediaSessionActionAt = isoNow();
            state.controls.mediaSessionReady = true;
            state.controls.lockScreenReady = true;
            state.controls.updatedAt = isoNow();
        },

        markBackgroundCheckpoint(state) {
            state.controls.backgroundCheckpointAt = isoNow();
            state.controls.updatedAt = isoNow();
        },

        // Backward-compatible alias.
        checkpointBackgroundControls(state) {
            state.controls.backgroundCheckpointAt = isoNow();
            state.controls.updatedAt = isoNow();
        },

        markForegroundRepair(state, action) {
            state.controls.foregroundRepairAt = isoNow();
            state.controls.updatedAt = isoNow();
            state.playback.isRecovering = Boolean(action.payload?.isRecovering);
            state.playback.lastAction = String(action.payload?.reason || "foreground-repair");
            state.playback.updatedAt = isoNow();
            state.playback.lastUpdatedAt = isoNow();
            updateButtonModes(state);
        },

        markSelfHeal(state, action) {
            state.controls.selfHealAt = isoNow();
            state.playback.lastAction = String(action.payload?.reason || "control-self-heal");
            state.playback.updatedAt = isoNow();
            state.playback.lastUpdatedAt = isoNow();
        },

        setCarResumeState(state, action) {
            state.carResume = {
                ...state.carResume,
                ...(action.payload || {}),
            };
        },

        beginSmartCarResume(state, action) {
            const payload = action.payload || {};
            const wakeId = Number(payload.wakeId);

            state.carResume.inFlight = true;
            state.carResume.wakeId = Number.isFinite(wakeId) ? wakeId : state.carResume.wakeId + 1;
            state.carResume.attemptsForWake = Number.isFinite(Number(payload.attemptsForWake))
                ? Number(payload.attemptsForWake)
                : state.carResume.attemptsForWake + 1;
            state.carResume.lastRouteWakeAt = payload.reason ? isoNow() : state.carResume.lastRouteWakeAt;
            state.carResume.lastResult = "smart-car-resume-started";
        },

        finishSmartCarResume(state, action) {
            const payload = action.payload || {};
            state.carResume.inFlight = false;
            state.carResume.lastResult = String(payload.result || "smart-car-resume-finished");
            state.carResume.lastStartGuardAt = isoNow();

            if (payload.clearIntent) {
                state.carResume.smartCarResumeIntentAvailable = false;
            }
        },

        markManualPause(state) {
            state.carResume.lastManualPauseAt = isoNow();
            state.carResume.inFlight = false;
            state.playback.isPlaying = false;
            state.playback.lastAction = "manual-pause";
            state.playback.updatedAt = isoNow();
            state.playback.lastUpdatedAt = isoNow();
            updateButtonModes(state);
        },

        setPersistenceState(state, action) {
            state.persistence = {
                ...state.persistence,
                ...(action.payload || {}),
            };
        },

        markDexieReady(state) {
            state.persistence.dexieReady = true;
            state.persistence.lastError = "";
            state.persistence.lastPersistenceError = "";
        },

        markSessionSaved(state) {
            state.persistence.lastSessionSavedAt = isoNow();
            state.persistence.lastError = "";
            state.persistence.lastPersistenceError = "";
        },

        markPlaylistSaved(state) {
            state.persistence.lastPlaylistSavedAt = isoNow();
            state.persistence.lastError = "";
            state.persistence.lastPersistenceError = "";
        },

        markPersistenceError(state, action) {
            const message = String(action.payload || "Audio persistence failed.");
            state.persistence.lastError = message;
            state.persistence.lastPersistenceError = message;
        },

        setCacheStatus(state, action) {
            state.cache = {
                ...state.cache,
                ...(action.payload || {}),
                updatedAt: isoNow(),
            };

            if (Object.prototype.hasOwnProperty.call(action.payload || {}, "offlineItems")) {
                state.cache.playlistCacheCount = action.payload.offlineItems;
            }

            if (Object.prototype.hasOwnProperty.call(action.payload || {}, "bytes")) {
                state.cache.playlistCacheBytes = action.payload.bytes;
            }

            if (Object.prototype.hasOwnProperty.call(action.payload || {}, "message")) {
                state.cache.cacheMessage = action.payload.message;
            }
        },

        setWorkboxStatus(state, action) {
            state.workbox = {
                ...state.workbox,
                ...(action.payload || {}),
                updatedAt: isoNow(),
            };
        },

        setPwaStatus(state, action) {
            state.pwa = {
                ...state.pwa,
                ...(action.payload || {}),
                updatedAt: isoNow(),
                lastUpdatedAt: isoNow(),
            };
        },

        markWorkboxUpdateAvailable(state, action) {
            const payload = action.payload || {};
            state.workbox.updateAvailable = true;
            state.workbox.updateServiceWorker = payload.updateServiceWorker || null;
            state.workbox.message = String(payload.message || "A new service worker version is ready.");
            state.workbox.updatedAt = isoNow();
        },

        markPwaUpdateReady(state, action) {
            const payload = action.payload || {};
            state.pwa.updateAvailable = true;
            state.pwa.updateServiceWorkerAvailable = Boolean(payload.updateServiceWorkerAvailable);
            state.pwa.lastMessage = String(payload.lastMessage || "A new app version is ready.");
            state.pwa.message = state.pwa.lastMessage;
            state.pwa.updatedAt = isoNow();
            state.pwa.lastUpdatedAt = isoNow();
        },

        clearPwaUpdateReady(state) {
            state.pwa.updateAvailable = false;
            state.pwa.updateServiceWorkerAvailable = false;
            state.pwa.lastMessage = "";
            state.pwa.message = "";
            state.pwa.updatedAt = isoNow();
            state.pwa.lastUpdatedAt = isoNow();
        },

        setInstallPromptReady(state, action) {
            state.pwa.installPromptReady = Boolean(action.payload);
            state.pwa.installSupported = true;
            state.pwa.updatedAt = isoNow();
            state.pwa.lastUpdatedAt = isoNow();
        },

        markInstalled(state) {
            state.pwa.installed = true;
            state.pwa.installPromptReady = false;
            state.pwa.updatedAt = isoNow();
            state.pwa.lastUpdatedAt = isoNow();
        },

        setNativeMediaSnapshot(state, action) {
            state.native = {
                ...state.native,
                ...(action.payload || {}),
            };
        },

        resetAudioReduxState() {
            return {
                ...initialState,
                pwa: {
                    ...initialState.pwa,
                    serviceWorkerSupported:
                        typeof navigator !== "undefined" && "serviceWorker" in navigator,
                },
                workbox: {
                    ...initialState.workbox,
                    supported:
                        typeof navigator !== "undefined" && "serviceWorker" in navigator,
                },
            };
        },

        resetAudioControlState() {
            return {
                ...initialState,
                pwa: {
                    ...initialState.pwa,
                    serviceWorkerSupported:
                        typeof navigator !== "undefined" && "serviceWorker" in navigator,
                },
                workbox: {
                    ...initialState.workbox,
                    supported:
                        typeof navigator !== "undefined" && "serviceWorker" in navigator,
                },
            };
        },
    },
});

export const audioPlayerActions = audioPlayerSlice.actions;

export const selectAudioPlayer = (state) => state.audioPlayer;
export const selectAudioPlayback = (state) => state.audioPlayer.playback;
export const selectAudioPosition = (state) => state.audioPlayer.position;
export const selectAudioPlaylist = (state) => state.audioPlayer.playlist;
export const selectAudioSettingsSummary = (state) => state.audioPlayer.settings;
export const selectAudioCarResume = (state) => state.audioPlayer.carResume;
export const selectAudioControls = (state) => state.audioPlayer.controls;
export const selectAudioCache = (state) => state.audioPlayer.cache;
export const selectAudioPwa = (state) => state.audioPlayer.pwa;
export const selectAudioWorkbox = (state) => state.audioPlayer.workbox;

export const selectMainPlayButtonShowsPause = (state) =>
    Boolean(state.audioPlayer.playback.isPlaying);

export const selectPlaylistPlayButtonShowsPause = (state) =>
    Boolean(
        state.audioPlayer.playback.isPlaying &&
        state.audioPlayer.playlist.activePlaylistIndex >= 0
    );

export const selectPlaylistItemShowsPause = (index) => (state) =>
    Boolean(
        state.audioPlayer.playback.isPlaying &&
        state.audioPlayer.playlist.activePlaylistIndex === index
    );

export default audioPlayerSlice.reducer;
