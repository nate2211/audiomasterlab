import { useEffect, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";

import { audioPlayerActions } from "../store/audioPlayerSlice.js";
import { registerAudioServiceWorker } from "../pwa/registerAudioServiceWorker.js";
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
            playlist,
            position,
            duration,
            repeatEnabled,
        ]
    );

    useEffect(() => {
        const controller = registerAudioServiceWorker({
            onRegistered: () => {
                dispatch(audioPlayerActions.setWorkboxStatus({
                    supported: true,
                    registered: true,
                    message: "Audio control service worker registered.",
                }));
            },
            onReady: () => {
                dispatch(audioPlayerActions.setWorkboxStatus({
                    supported: true,
                    registered: true,
                    ready: true,
                    message: "Audio control service worker is ready.",
                }));
            },
            onNeedRefresh: ({ updateServiceWorker }) => {
                dispatch(audioPlayerActions.markWorkboxUpdateAvailable({
                    updateServiceWorker,
                    message: "A fresh service worker is ready. Update when playback is stopped.",
                }));
            },
            onControlling: () => {
                dispatch(audioPlayerActions.setWorkboxStatus({
                    supported: true,
                    registered: true,
                    ready: true,
                    updateAvailable: false,
                    message: "Audio control service worker is controlling this page.",
                }));
            },
            onError: (error) => {
                dispatch(audioPlayerActions.setWorkboxStatus({
                    supported: typeof navigator !== "undefined" && "serviceWorker" in navigator,
                    registered: false,
                    ready: false,
                    message: error?.message || "Service worker registration failed.",
                }));
            },
        });

        return () => {
            controller?.destroy?.();
        };
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
        dispatch(audioPlayerActions.setPlaybackSnapshot({
            isPlaying,
            isLoading,
            isReady: bufferReady,
            isScrubbing,
        }));
    }, [dispatch, isPlaying, isLoading, bufferReady, isScrubbing]);

    useEffect(() => {
        dispatch(audioPlayerActions.setSourceSnapshot({
            sourceKind,
            sourceUrl,
            mediaTitle,
            activePlaylistIndex,
            activePlaylistItemId: activePlaylistItem?.id || "",
            activePlaylistTitle: activePlaylistItem?.title || "",
        }));
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
        dispatch(audioPlayerActions.setPositionSnapshot({
            currentTime: position,
            duration,
            playbackRate: Number(settings?.speed || 1),
        }));

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
    }, [dispatch, position, duration, settings?.speed, sessionSnapshot]);

    useEffect(() => {
        const safePlaylist = Array.isArray(playlist) ? playlist : [];
        const key = JSON.stringify({
            ids: safePlaylist.map((item) => item?.id || item?.url || item?.title || ""),
            length: safePlaylist.length,
            activePlaylistIndex,
            repeatEnabled,
        });

        dispatch(audioPlayerActions.setPlaylistSnapshot({
            items: safePlaylist,
            activePlaylistIndex,
            repeatEnabled,
        }));

        if (lastPlaylistSaveKeyRef.current === key) return;
        lastPlaylistSaveKeyRef.current = key;

        saveAudioPlaylistSnapshot(safePlaylist, {
            activePlaylistIndex,
            repeatEnabled,
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
            activePresetKey: activePresetKey || "flat",
            baseVolume: Number(settings?.baseVolume ?? 1),
            speed: Number(settings?.speed ?? 1),
            pitchSemitones: Number(settings?.pitchSemitones ?? 0),
            outputGain: Number(settings?.outputGain ?? 0),
        };
        const key = JSON.stringify(summary);

        dispatch(audioPlayerActions.setSettingsSummary(summary));

        if (lastSettingsSaveKeyRef.current === key) return;
        lastSettingsSaveKeyRef.current = key;

        saveAudioSettingsSnapshot(summary).catch((error) =>
            dispatch(audioPlayerActions.markPersistenceError(
                error?.message || "Could not save settings to Dexie."
            ))
        );
    }, [dispatch, settings, activePresetKey]);
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
