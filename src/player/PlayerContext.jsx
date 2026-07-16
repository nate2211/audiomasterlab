import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "audiomasterlab.global-player.v1";
const PlayerContext = createContext(null);

const emptyTrack = { url: "", title: "Nothing playing", artist: "AudioMaster Lab", artwork: "" };
const readSession = () => {
    try { return { ...emptyTrack, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
    catch { return emptyTrack; }
};

export function PlayerProvider({ children }) {
    const audioRef = useRef(null);
    const [track, setTrack] = useState(readSession);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(1);
    const [queue, setQueue] = useState([]);

    const publishMetadata = useCallback((value) => {
        if (!("mediaSession" in navigator) || !value?.url) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: value.title || "AudioMaster Lab",
            artist: value.artist || "AudioMaster Lab",
            album: value.album || "Browser Audio Player",
            artwork: value.artwork ? [{ src: value.artwork, sizes: "512x512" }] : [],
        });
    }, []);

    const play = useCallback(async () => {
        if (!audioRef.current?.src) return;
        try { await audioRef.current.play(); } catch { /* browser awaits a user gesture */ }
    }, []);
    const pause = useCallback(() => audioRef.current?.pause(), []);
    const toggle = useCallback(() => playing ? pause() : play(), [playing, pause, play]);
    const seek = useCallback((seconds) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = Math.max(0, Math.min(Number(seconds) || 0, duration || Infinity));
    }, [duration]);
    const setVolume = useCallback((value) => {
        const next = Math.max(0, Math.min(1, Number(value)));
        if (audioRef.current) audioRef.current.volume = next;
        setVolumeState(next);
    }, []);
    const playTrack = useCallback((nextTrack, nextQueue) => {
        if (!nextTrack?.url) return;
        setTrack({ ...emptyTrack, ...nextTrack });
        if (Array.isArray(nextQueue)) setQueue(nextQueue);
        requestAnimationFrame(() => play());
    }, [play]);
    const playRelative = useCallback((direction) => {
        const index = queue.findIndex((item) => item.url === track.url);
        const next = queue[index + direction];
        if (next) playTrack(next);
    }, [queue, track.url, playTrack]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(track));
        publishMetadata(track);
    }, [track, publishMetadata]);

    useEffect(() => {
        const media = navigator.mediaSession;
        if (!media) return;
        const actions = {
            play, pause,
            previoustrack: () => playRelative(-1),
            nexttrack: () => playRelative(1),
            seekbackward: ({ seekOffset = 10 }) => seek((audioRef.current?.currentTime || 0) - seekOffset),
            seekforward: ({ seekOffset = 10 }) => seek((audioRef.current?.currentTime || 0) + seekOffset),
            seekto: ({ seekTime }) => seek(seekTime),
        };
        Object.entries(actions).forEach(([name, handler]) => { try { media.setActionHandler(name, handler); } catch {} });
        return () => Object.keys(actions).forEach((name) => { try { media.setActionHandler(name, null); } catch {} });
    }, [pause, play, playRelative, seek]);

    const previous = useCallback(() => playRelative(-1), [playRelative]);
    const next = useCallback(() => playRelative(1), [playRelative]);
    const value = useMemo(() => ({ track, playing, currentTime, duration, volume, queue, playTrack, play, pause, toggle, seek, setVolume, previous, next }),
        [track, playing, currentTime, duration, volume, queue, playTrack, play, pause, toggle, seek, setVolume, previous, next]);

    return <PlayerContext.Provider value={value}>
        {children}
        <audio ref={audioRef} src={track.url || undefined} preload="metadata"
            onPlay={() => { setPlaying(true); if (navigator.mediaSession) navigator.mediaSession.playbackState = "playing"; }}
            onPause={() => { setPlaying(false); if (navigator.mediaSession) navigator.mediaSession.playbackState = "paused"; }}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
            onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
            onEnded={() => playRelative(1)} />
    </PlayerContext.Provider>;
}

export function usePlayer() {
    const value = useContext(PlayerContext);
    if (!value) throw new Error("usePlayer must be used inside PlayerProvider");
    return value;
}
