import { useEffect, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";

import { audioPlayerActions } from "../store/audioPlayerSlice.js";
import {
    getAudioCacheSummary,
    getAudioPlaylistSnapshot,
    getAudioSettingsSnapshot,
    getLatestAudioSessionSnapshot,
    hydratePlaylistOfflineFlags,
    openAudioDexie,
    saveAudioPlaylistSnapshot,
    saveAudioSessionSnapshot,
    saveAudioSettingsSnapshot,
} from "../storage/AudioDexie.js";

function positiveNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function roundToStep(value, step = 0.25) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return 0;
    }
    return Math.round(number / step) * step;
}

function stableKey(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return String(Date.now());
    }
}

function playlistItemKey(item) {
    if (!item || typeof item !== "object") {
        return "";
    }

    return [
        item.id || "",
        item.url || "",
        item.src || "",
        item.audioUrl || "",
        item.title || "",
        item.artist || "",
        item.album || "",
        item.duration || "",
        item.offlineAvailable ? "offline" : "",
    ].join("::");
}

function useLatestRef(value) {
    const ref = useRef(value);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref;
}

export function useAudioReduxDexieControls({
                                               isPlaying,
                                               isLoading,
                                               isScrubbing,
                                               bufferReady,
                                               sourceKind,
                                               sourceUrl,
                                               mediaTitle,
                                               activePlaylistIndex,
                                               activePlaylistItem,
                                               playlist,
                                               position,
                                               duration,
                                               repeatEnabled,
                                               settings,
                                               activePresetKey,
                                               onHydratePlaylist,
                                               onHydrateSession,
                                           }) {
    const dispatch = useDispatch();
    const onHydratePlaylistRef = useLatestRef(onHydratePlaylist);
    const onHydrateSessionRef = useLatestRef(onHydrateSession);
    const lastSessionSaveAtRef = useRef(0);
    const lastPlaybackDispatchKeyRef = useRef("");
    const lastSourceDispatchKeyRef = useRef("");
    const lastPositionDispatchKeyRef = useRef("");
    const lastPlaylistDispatchKeyRef = useRef("");
    const lastPlaylistSaveKeyRef = useRef("");
    const lastSettingsDispatchKeyRef = useRef("");
    const lastSettingsSaveKeyRef = useRef("");
    const lastLifecycleSaveKeyRef = useRef("");

    const sessionSnapshot = useMemo(
        () => ({
            isPlaying: Boolean(isPlaying),
            sourceKind: String(sourceKind || ""),
            sourceUrl: String(sourceUrl || ""),
            mediaTitle: String(mediaTitle || activePlaylistItem?.title || ""),
            activePlaylistIndex: Number.isFinite(Number(activePlaylistIndex))
                ? Number(activePlaylistIndex)
                : -1,
            activePlaylistItemId: String(activePlaylistItem?.id || ""),
            activePlaylistTitle: String(activePlaylistItem?.title || ""),
            playlistLength: Array.isArray(playlist) ? playlist.length : 0,
            currentPosition: positiveNumber(position, 0),
            duration: positiveNumber(duration, 0),
            repeatEnabled: Boolean(repeatEnabled),
        }),
        [
            isPlaying,
            sourceKind,
            sourceUrl,
            mediaTitle,
            activePlaylistIndex,
            activePlaylistItem?.id,
            activePlaylistItem?.title,
            playlist?.length,
            position,
            duration,
            repeatEnabled,
        ]
    );

    useEffect(() => {
        dispatch(audioPlayerActions.setWorkboxStatus({
            supported: false,
            registered: false,
            ready: false,
            updateAvailable: false,
            message: "Service worker disabled; Vite always serves the current build.",
        }));
    }, [dispatch]);

    useEffect(() => {
        let cancelled = false;

        async function hydrateFromDexie() {
            try {
                await openAudioDexie();
                if (cancelled) return;

                dispatch(audioPlayerActions.markDexieReady());

                const [session, playlistSnapshot, settingsSnapshot, cacheSummary] =
                    await Promise.all([
                        getLatestAudioSessionSnapshot(),
                        getAudioPlaylistSnapshot(),
                        getAudioSettingsSnapshot(),
                        getAudioCacheSummary(),
                    ]);

                if (cancelled) return;

                if (playlistSnapshot?.items?.length) {
                    const items = await hydratePlaylistOfflineFlags(playlistSnapshot.items);
                    if (cancelled) return;

                    dispatch(audioPlayerActions.setPlaylistSnapshot({
                        items,
                        activePlaylistIndex: playlistSnapshot.playlist?.activePlaylistIndex ?? -1,
                        repeatEnabled: Boolean(playlistSnapshot.playlist?.repeatEnabled),
                    }));

                    if (typeof onHydratePlaylistRef.current === "function") {
                        onHydratePlaylistRef.current({
                            items,
                            activePlaylistIndex: playlistSnapshot.playlist?.activePlaylistIndex ?? -1,
                            repeatEnabled: Boolean(playlistSnapshot.playlist?.repeatEnabled),
                        });
                    }
                }

                if (session) {
                    dispatch(audioPlayerActions.hydrateAudioState({
                        playback: {
                            isPlaying: false,
                            isReady: Boolean(session.sourceUrl || session.playlistLength),
                        },
                        source: {
                            sourceKind: session.sourceKind,
                            sourceUrl: session.sourceUrl,
                            mediaTitle: session.mediaTitle,
                            activePlaylistIndex: session.activePlaylistIndex,
                            activePlaylistItemId: session.activePlaylistItemId,
                            activePlaylistTitle: session.activePlaylistTitle,
                        },
                        position: {
                            currentTime: session.currentPosition,
                            duration: session.duration,
                        },
                    }));

                    if (typeof onHydrateSessionRef.current === "function") {
                        onHydrateSessionRef.current(session);
                    }
                }

                if (settingsSnapshot) {
                    dispatch(audioPlayerActions.setSettingsSummary(settingsSnapshot));
                }

                dispatch(audioPlayerActions.setCacheStatus({
                    supported: typeof window !== "undefined" && "caches" in window,
                    offlineItems: cacheSummary.count,
                    bytes: cacheSummary.bytes,
                    message: cacheSummary.count
                        ? `${cacheSummary.count} cached playlist item(s) available.`
                        : "",
                }));
            } catch (error) {
                if (!cancelled) {
                    dispatch(audioPlayerActions.markPersistenceError(
                        error?.message || "Could not hydrate audio controls from Dexie."
                    ));
                }
            }
        }

        hydrateFromDexie();

        return () => {
            cancelled = true;
        };
    }, [dispatch, onHydratePlaylistRef, onHydrateSessionRef]);

    useEffect(() => {
        const snapshot = {
            isPlaying: Boolean(isPlaying),
            isLoading: Boolean(isLoading),
            isReady: Boolean(bufferReady),
            isScrubbing: Boolean(isScrubbing),
        };
        const key = stableKey(snapshot);

        if (lastPlaybackDispatchKeyRef.current === key) {
            return;
        }

        lastPlaybackDispatchKeyRef.current = key;
        dispatch(audioPlayerActions.setPlaybackSnapshot(snapshot));
    }, [dispatch, isPlaying, isLoading, bufferReady, isScrubbing]);

    useEffect(() => {
        const snapshot = {
            sourceKind: String(sourceKind || ""),
            sourceUrl: String(sourceUrl || ""),
            mediaTitle: String(mediaTitle || activePlaylistItem?.title || ""),
            activePlaylistIndex: Number.isFinite(Number(activePlaylistIndex))
                ? Number(activePlaylistIndex)
                : -1,
            activePlaylistItemId: String(activePlaylistItem?.id || ""),
            activePlaylistTitle: String(activePlaylistItem?.title || ""),
        };
        const key = stableKey(snapshot);

        if (lastSourceDispatchKeyRef.current === key) {
            return;
        }

        lastSourceDispatchKeyRef.current = key;
        dispatch(audioPlayerActions.setSourceSnapshot(snapshot));
    }, [
        dispatch,
        sourceKind,
        sourceUrl,
        mediaTitle,
        activePlaylistIndex,
        activePlaylistItem?.id,
        activePlaylistItem?.title,
    ]);

    useEffect(() => {
        const snapshot = {
            currentTime: positiveNumber(position, 0),
            duration: positiveNumber(duration, 0),
            playbackRate: finiteNumber(settings?.speed, 1),
        };

        const dispatchKey = stableKey({
            currentTime: roundToStep(snapshot.currentTime, isScrubbing ? 0.05 : 0.25),
            duration: roundToStep(snapshot.duration, 0.25),
            playbackRate: snapshot.playbackRate,
            isScrubbing: Boolean(isScrubbing),
        });

        if (lastPositionDispatchKeyRef.current !== dispatchKey) {
            lastPositionDispatchKeyRef.current = dispatchKey;
            dispatch(audioPlayerActions.setPositionSnapshot(snapshot));
        }

        const now = Date.now();
        if (now - lastSessionSaveAtRef.current < 850) return;
        lastSessionSaveAtRef.current = now;

        saveAudioSessionSnapshot(sessionSnapshot)
            .then(() => dispatch(audioPlayerActions.markSessionSaved()))
            .catch((error) =>
                dispatch(audioPlayerActions.markPersistenceError(
                    error?.message || "Could not save audio session to Dexie."
                ))
            );
    }, [dispatch, position, duration, settings?.speed, sessionSnapshot, isScrubbing]);

    useEffect(() => {
        const safePlaylist = Array.isArray(playlist) ? playlist : [];
        const snapshot = {
            items: safePlaylist,
            activePlaylistIndex: Number.isFinite(Number(activePlaylistIndex))
                ? Number(activePlaylistIndex)
                : -1,
            repeatEnabled: Boolean(repeatEnabled),
        };
        const key = stableKey({
            ids: safePlaylist.map(playlistItemKey),
            length: safePlaylist.length,
            activePlaylistIndex: snapshot.activePlaylistIndex,
            repeatEnabled: snapshot.repeatEnabled,
        });

        if (lastPlaylistDispatchKeyRef.current !== key) {
            lastPlaylistDispatchKeyRef.current = key;
            dispatch(audioPlayerActions.setPlaylistSnapshot(snapshot));
        }

        if (lastPlaylistSaveKeyRef.current === key) return;
        lastPlaylistSaveKeyRef.current = key;

        saveAudioPlaylistSnapshot(safePlaylist, {
            activePlaylistIndex: snapshot.activePlaylistIndex,
            repeatEnabled: snapshot.repeatEnabled,
        })
            .then(() => dispatch(audioPlayerActions.markPlaylistSaved()))
            .catch((error) =>
                dispatch(audioPlayerActions.markPersistenceError(
                    error?.message || "Could not save playlist to Dexie."
                ))
            );
    }, [dispatch, playlist, activePlaylistIndex, repeatEnabled]);

    useEffect(() => {
        const summary = {
            activePresetKey: String(activePresetKey || "flat"),
            baseVolume: finiteNumber(settings?.baseVolume, 1),
            speed: finiteNumber(settings?.speed, 1),
            pitchSemitones: finiteNumber(settings?.pitchSemitones, 0),
            outputGain: finiteNumber(settings?.outputGain, 0),
        };
        const key = stableKey(summary);

        if (lastSettingsDispatchKeyRef.current !== key) {
            lastSettingsDispatchKeyRef.current = key;
            dispatch(audioPlayerActions.setSettingsSummary(summary));
        }

        if (lastSettingsSaveKeyRef.current === key) return;
        lastSettingsSaveKeyRef.current = key;

        saveAudioSettingsSnapshot(summary).catch((error) =>
            dispatch(audioPlayerActions.markPersistenceError(
                error?.message || "Could not save settings to Dexie."
            ))
        );
    }, [
        dispatch,
        activePresetKey,
        settings?.baseVolume,
        settings?.speed,
        settings?.pitchSemitones,
        settings?.outputGain,
    ]);
    useEffect(() => {
        if (typeof window === "undefined" || typeof document === "undefined") {
            return undefined;
        }

        function saveLifecycleSnapshot(reason) {
            const key = JSON.stringify({
                reason,
                isPlaying: Boolean(sessionSnapshot.isPlaying),
                activePlaylistIndex: sessionSnapshot.activePlaylistIndex,
                sourceUrl: sessionSnapshot.sourceUrl,
                mediaTitle: sessionSnapshot.mediaTitle,
                position: Math.round(Number(sessionSnapshot.currentPosition || 0) * 2) / 2,
                duration: Math.round(Number(sessionSnapshot.duration || 0) * 2) / 2,
            });

            if (lastLifecycleSaveKeyRef.current === key) {
                return;
            }

            lastLifecycleSaveKeyRef.current = key;

            saveAudioSessionSnapshot({
                ...sessionSnapshot,
                reason: `audiomasterlab-background-lifecycle-save:${reason}`,
            })
                .then(() => dispatch(audioPlayerActions.markSessionSaved()))
                .catch((error) =>
                    dispatch(
                        audioPlayerActions.markPersistenceError(
                            error?.message || "Could not save background audio session."
                        )
                    )
                );
        }

        function handleVisibilityChange() {
            if (document.visibilityState === "hidden") {
                dispatch(audioPlayerActions.markBackgroundCheckpoint());
                saveLifecycleSnapshot("visibility-hidden");
                return;
            }

            dispatch(
                audioPlayerActions.markForegroundRepair({
                    isRecovering: false,
                    reason: "visibility-visible",
                })
            );
            saveLifecycleSnapshot("visibility-visible");
        }

        function handlePageHide() {
            dispatch(audioPlayerActions.markBackgroundCheckpoint());
            saveLifecycleSnapshot("pagehide");
        }

        function handlePageShow() {
            dispatch(
                audioPlayerActions.markForegroundRepair({
                    isRecovering: false,
                    reason: "pageshow",
                })
            );
            saveLifecycleSnapshot("pageshow");
        }

        function handleBlur() {
            dispatch(audioPlayerActions.markBackgroundCheckpoint());
            saveLifecycleSnapshot("window-blur");
        }

        function handleFocus() {
            dispatch(
                audioPlayerActions.markForegroundRepair({
                    isRecovering: false,
                    reason: "window-focus",
                })
            );
            saveLifecycleSnapshot("window-focus");
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", handlePageHide);
        window.addEventListener("pageshow", handlePageShow);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("focus", handleFocus);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("pagehide", handlePageHide);
            window.removeEventListener("pageshow", handlePageShow);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("focus", handleFocus);
        };
    }, [dispatch, sessionSnapshot]);

}

export default useAudioReduxDexieControls;
