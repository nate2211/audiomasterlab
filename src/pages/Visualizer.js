import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Slider,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";

import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ThreeDRotationRoundedIcon from "@mui/icons-material/ThreeDRotationRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";

import { GlassCard, PageShell, SectionTitle } from "../components/Components.js";

const FFT_OPTIONS = [512, 1024, 2048, 4096, 8192, 16384];

const VISUAL_MODES = [
    {
        value: "bars3d",
        label: "3D Radial Bars",
        description: "Circular frequency tower for spectrum research.",
    },
    {
        value: "terrain",
        label: "Spectral Terrain",
        description: "Rolling 3D frequency history surface.",
    },
    {
        value: "sphere",
        label: "Reactive Sphere",
        description: "Frequency-driven particle sphere.",
    },
];

const STORAGE_KEY = "audiomasterlab_visualizer_settings_v1";

const DEFAULT_SETTINGS = {
    mode: "bars3d",
    fftSize: 4096,
    smoothing: 0.82,
    sensitivity: 1.35,
    gain: 1,
    barCount: 128,
    terrainDepth: 42,
    rotation: 0.55,
    quality: 1.5,
    showWaveform: true,
    showSpectrum: true,
    mirrorWaveform: true,
};

function isReactSnapRun() {
    return (
        typeof navigator !== "undefined" &&
        navigator.userAgent.includes("ReactSnap")
    );
}

function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);

    return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function loadSavedSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_SETTINGS;

        return {
            ...DEFAULT_SETTINGS,
            ...JSON.parse(raw),
        };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function prepareCanvas(canvas, heightFallback = 240) {
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, rect.width || 960);
    const height = Math.max(120, rect.height || heightFallback);

    const targetWidth = Math.floor(width * dpr);
    const targetHeight = Math.floor(height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
    }

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { context, width, height };
}

function normalizeFrequencyValue(value, sensitivity) {
    return clamp((Number(value || 0) / 255) * sensitivity, 0, 1.8);
}

function getAverageEnergy(dataArray) {
    if (!dataArray?.length) return 0;

    let sum = 0;

    for (let i = 0; i < dataArray.length; i += 1) {
        sum += dataArray[i] || 0;
    }

    return sum / dataArray.length / 255;
}

function getBandEnergy(dataArray, fromPercent, toPercent) {
    if (!dataArray?.length) return 0;

    const from = Math.floor(dataArray.length * clamp(fromPercent, 0, 1));
    const to = Math.max(
        from + 1,
        Math.floor(dataArray.length * clamp(toPercent, 0, 1))
    );

    let sum = 0;

    for (let i = from; i < to; i += 1) {
        sum += dataArray[i] || 0;
    }

    return sum / (to - from) / 255;
}

function drawEmptyCanvas(canvas, label) {
    const prepared = prepareCanvas(canvas, 240);
    if (!prepared) return;

    const { context, width, height } = prepared;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(7,10,19,0.98)";
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(255,255,255,0.68)";
    context.font = "800 15px system-ui, -apple-system, Segoe UI, sans-serif";
    context.fillText(label, 22, 38);

    context.strokeStyle = "rgba(103,232,249,0.12)";
    context.lineWidth = 1;

    for (let x = 0; x < width; x += 42) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
    }

    for (let y = 0; y < height; y += 36) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
    }
}

function getReadableFileNameFromUrl(url) {
    try {
        const parsed = new URL(url);
        const rawName = parsed.pathname.split("/").filter(Boolean).pop();

        if (!rawName) return "remote media link";

        return decodeURIComponent(rawName);
    } catch {
        return "remote media link";
    }
}

function getExportBin(frame, ratio) {
    if (!frame?.bins?.length) return 0;

    const safeRatio = clamp(Number(ratio), 0, 1);
    const index = Math.min(
        frame.bins.length - 1,
        Math.max(0, Math.floor(safeRatio * (frame.bins.length - 1)))
    );

    return frame.bins[index] || 0;
}

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function makeSafeExportName(fileName, extension) {
    const base =
        fileName
            ?.replace(/\.[^.]+$/, "")
            ?.replace(/[^a-z0-9_-]+/gi, "-")
            ?.replace(/-+/g, "-")
            ?.replace(/^-|-$/g, "")
            ?.toLowerCase() || "audiomasterlab-visualizer";

    return `${base}-animated-visualizer.${extension}`;
}

function makeIdleExportFrames(settings, frameCount = 96) {
    const binCount = clamp(Math.floor(settings.barCount), 32, 256);

    return Array.from({ length: frameCount }, (_, frameIndex) => {
        const bins = Array.from({ length: binCount }, (_, binIndex) => {
            const waveA = Math.sin(frameIndex * 0.18 + binIndex * 0.22);
            const waveB = Math.sin(frameIndex * 0.07 + binIndex * 0.05);
            const waveC = Math.sin(frameIndex * 0.035 + binIndex * 0.42);
            const mixed = waveA * 0.45 + waveB * 0.35 + waveC * 0.2;

            return clamp(Math.floor((mixed * 0.5 + 0.5) * 180), 0, 255);
        });

        return {
            time: frameIndex / 24,
            bins,
        };
    });
}

function createExporterBlob(output) {
    if (output instanceof Blob) {
        return output;
    }

    if (output instanceof ArrayBuffer) {
        return new Blob([output], { type: "application/octet-stream" });
    }

    if (output instanceof Uint8Array) {
        return new Blob([output], { type: "application/octet-stream" });
    }

    if (ArrayBuffer.isView(output)) {
        return new Blob([output.buffer], { type: "application/octet-stream" });
    }

    if (typeof output === "string") {
        return new Blob([output], { type: "application/octet-stream" });
    }

    return new Blob([JSON.stringify(output, null, 2)], {
        type: "application/octet-stream",
    });
}

function buildAnimatedVisualizerScene(THREE, frames, settings, sourceName) {
    const scene = new THREE.Scene();
    scene.name = "AudioMasterLab_Animated_Visualizer_Export";

    const root = new THREE.Group();
    root.name = "AudioMasterLab_Visualizer_Rig";
    scene.add(root);

    const ambient = new THREE.AmbientLight(0xffffff, 0.72);
    ambient.name = "AML_Ambient_Light";
    scene.add(ambient);

    const key = new THREE.PointLight(0x67e8f9, 1.8, 24);
    key.name = "AML_Cyan_Key_Light";
    key.position.set(4, 6, 6);
    scene.add(key);

    const fill = new THREE.PointLight(0xa78bfa, 1.4, 24);
    fill.name = "AML_Purple_Fill_Light";
    fill.position.set(-5, 4, -5);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 100);
    camera.name = "AML_Export_Camera";
    camera.position.set(0, 4.8, 10);
    camera.lookAt(0, 0, 0);
    scene.add(camera);

    const fps = 24;
    const safeFrames = frames?.length >= 2 ? frames : makeIdleExportFrames(settings);
    const times = safeFrames.map((_, index) => index / fps);
    const duration = Math.max(1 / fps, (safeFrames.length - 1) / fps);

    const exportCount = clamp(Math.floor(settings.barCount), 32, 128);
    const tracks = [];

    if (settings.mode === "sphere") {
        const geometry = new THREE.SphereGeometry(0.065, 10, 10);

        for (let i = 0; i < exportCount; i += 1) {
            const ratio = i / Math.max(1, exportCount - 1);
            const y = 1 - ratio * 2;
            const radius = Math.sqrt(Math.max(0, 1 - y * y));
            const theta = i * Math.PI * (3 - Math.sqrt(5));

            const base = new THREE.Vector3(
                Math.cos(theta) * radius * 3,
                y * 3,
                Math.sin(theta) * radius * 3
            );

            const material = new THREE.MeshStandardMaterial({
                color: i % 2 === 0 ? 0x67e8f9 : 0xa78bfa,
                emissive: i % 2 === 0 ? 0x123d4a : 0x221641,
                roughness: 0.35,
                metalness: 0.25,
            });

            const mesh = new THREE.Mesh(geometry.clone(), material);
            mesh.name = `AML_Reactive_Sphere_Point_${String(i).padStart(3, "0")}`;
            mesh.position.copy(base);
            root.add(mesh);

            const scaleValues = [];
            const positionValues = [];

            safeFrames.forEach((frame) => {
                const amp = normalizeFrequencyValue(getExportBin(frame, ratio), settings.sensitivity);
                const expansion = 1 + amp * 0.78;

                positionValues.push(base.x * expansion, base.y * expansion, base.z * expansion);
                scaleValues.push(1 + amp * 2.4, 1 + amp * 2.4, 1 + amp * 2.4);
            });

            tracks.push(new THREE.VectorKeyframeTrack(`${mesh.name}.scale`, times, scaleValues));
            tracks.push(
                new THREE.VectorKeyframeTrack(`${mesh.name}.position`, times, positionValues)
            );
        }
    } else if (settings.mode === "terrain") {
        const depth = clamp(Math.floor(settings.terrainDepth), 12, 64);
        const exportWidth = clamp(Math.floor(exportCount / 2), 32, 96);
        const geometry = new THREE.BoxGeometry(0.09, 1, 0.09);

        for (let z = 0; z < depth; z += 1) {
            for (let x = 0; x < exportWidth; x += 1) {
                const ratio = x / Math.max(1, exportWidth - 1);
                const xpos = -4.8 + ratio * 9.6;
                const zpos = -3.2 + (z / Math.max(1, depth - 1)) * 6.4;
                const meshIndex = z * exportWidth + x;

                const material = new THREE.MeshStandardMaterial({
                    color: meshIndex % 2 === 0 ? 0x67e8f9 : 0xa78bfa,
                    emissive: meshIndex % 2 === 0 ? 0x123d4a : 0x221641,
                    roughness: 0.5,
                    metalness: 0.12,
                });

                const mesh = new THREE.Mesh(geometry.clone(), material);
                mesh.name = `AML_Terrain_Node_${String(meshIndex).padStart(4, "0")}`;
                mesh.position.set(xpos, -1.8, zpos);
                root.add(mesh);

                const scaleValues = [];
                const positionValues = [];

                safeFrames.forEach((_, frameIndex) => {
                    const historyIndex = Math.max(0, frameIndex - z);
                    const frame = safeFrames[historyIndex] || safeFrames[0];
                    const amp = normalizeFrequencyValue(getExportBin(frame, ratio), settings.sensitivity);
                    const scaleY = 0.06 + amp * 3.3;
                    const ypos = -1.8 + scaleY / 2;

                    scaleValues.push(1, scaleY, 1);
                    positionValues.push(xpos, ypos, zpos);
                });

                tracks.push(new THREE.VectorKeyframeTrack(`${mesh.name}.scale`, times, scaleValues));
                tracks.push(
                    new THREE.VectorKeyframeTrack(`${mesh.name}.position`, times, positionValues)
                );
            }
        }
    } else {
        const barGeometry = new THREE.BoxGeometry(0.12, 1, 0.12);

        for (let i = 0; i < exportCount; i += 1) {
            const ratio = i / Math.max(1, exportCount - 1);
            const angle = ratio * Math.PI * 2;
            const radius = 4.2;
            const baseX = Math.cos(angle) * radius;
            const baseZ = Math.sin(angle) * radius;

            const material = new THREE.MeshStandardMaterial({
                color: i % 2 === 0 ? 0x67e8f9 : 0xa78bfa,
                emissive: i % 2 === 0 ? 0x123d4a : 0x221641,
                roughness: 0.42,
                metalness: 0.25,
            });

            const mesh = new THREE.Mesh(barGeometry.clone(), material);
            mesh.name = `AML_Frequency_Bar_${String(i).padStart(3, "0")}`;
            mesh.position.set(baseX, -1.75, baseZ);
            mesh.lookAt(0, -1.75, 0);

            root.add(mesh);

            const scaleValues = [];
            const positionValues = [];

            safeFrames.forEach((frame) => {
                const amp = normalizeFrequencyValue(getExportBin(frame, ratio), settings.sensitivity);
                const scaleY = 0.08 + amp * 5.2;
                const y = -1.8 + scaleY / 2;

                scaleValues.push(1, scaleY, 1);
                positionValues.push(baseX, y, baseZ);
            });

            tracks.push(new THREE.VectorKeyframeTrack(`${mesh.name}.scale`, times, scaleValues));
            tracks.push(
                new THREE.VectorKeyframeTrack(`${mesh.name}.position`, times, positionValues)
            );
        }
    }

    const rootRotationValues = [];

    safeFrames.forEach((frame, index) => {
        const bass = normalizeFrequencyValue(getExportBin(frame, 0.04), settings.sensitivity);
        rootRotationValues.push(0, index * 0.025 * settings.rotation + bass * 0.12, 0);
    });

    tracks.push(
        new THREE.VectorKeyframeTrack(`${root.name}.rotation`, times, rootRotationValues)
    );

    const clip = new THREE.AnimationClip(
        "AudioMasterLab_Audio_Reactive_Animation",
        duration,
        tracks
    );

    scene.animations = [clip];

    scene.userData = {
        app: "AudioMaster Lab",
        source: sourceName || "uploaded audio",
        type: "audio-reactive animated FBX visualizer",
        fps,
        frames: safeFrames.length,
        mode: settings.mode,
    };

    return {
        scene,
        animations: [clip],
        fps,
    };
}

export default function Visualizer() {
    const reactSnapRun = isReactSnapRun();

    const audioRef = useRef(null);
    const objectUrlRef = useRef(null);
    const sourceKindRef = useRef("none");

    const audioContextRef = useRef(null);
    const sourceRef = useRef(null);
    const analyserRef = useRef(null);
    const gainRef = useRef(null);

    const frequencyDataRef = useRef(null);
    const timeDataRef = useRef(null);

    const waveformCanvasRef = useRef(null);
    const spectrumCanvasRef = useRef(null);
    const threeCanvasRef = useRef(null);

    const raf2dRef = useRef(null);
    const exportFramesRef = useRef([]);
    const exportLastCaptureRef = useRef(0);

    const [settings, setSettings] = useState(loadSavedSettings);
    const [audioUrl, setAudioUrl] = useState("");
    const [linkValue, setLinkValue] = useState("");
    const [fileName, setFileName] = useState("");
    const [status, setStatus] = useState(
        "Load an audio file or direct CORS-enabled media link to begin."
    );
    const [statusTone, setStatusTone] = useState("info");
    const [playing, setPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [audioReady, setAudioReady] = useState(false);
    const [exportFrameCount, setExportFrameCount] = useState(0);
    const [exportingFbx, setExportingFbx] = useState(false);

    const selectedMode = useMemo(
        () =>
            VISUAL_MODES.find((mode) => mode.value === settings.mode) ||
            VISUAL_MODES[0],
        [settings.mode]
    );

    function updateSetting(key, value) {
        setSettings((current) => {
            const next = {
                ...current,
                [key]: value,
            };

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {
                // Ignore storage failures.
            }

            return next;
        });
    }

    const clearObjectUrl = useCallback(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }, []);

    function resetExportFrames() {
        exportFramesRef.current = [];
        exportLastCaptureRef.current = 0;
        setExportFrameCount(0);
    }

    const captureExportFrame = useCallback((frequencyData) => {
        const audio = audioRef.current;

        if (!audio || audio.paused || !frequencyData?.length) return;

        const now = performance.now();
        const fps = 24;
        const minDelay = 1000 / fps;

        if (now - exportLastCaptureRef.current < minDelay) return;

        exportLastCaptureRef.current = now;

        const exportBinCount = clamp(Math.floor(settings.barCount), 32, 256);
        const bins = [];

        for (let i = 0; i < exportBinCount; i += 1) {
            const ratio = i / Math.max(1, exportBinCount - 1);
            const sourceIndex = Math.min(
                frequencyData.length - 1,
                Math.max(0, Math.floor(ratio * (frequencyData.length - 1)))
            );

            bins.push(frequencyData[sourceIndex] || 0);
        }

        exportFramesRef.current.push({
            time: audio.currentTime || 0,
            bins,
        });

        const maxFrames = fps * 45;

        if (exportFramesRef.current.length > maxFrames) {
            exportFramesRef.current.splice(
                0,
                exportFramesRef.current.length - maxFrames
            );
        }

        if (exportFramesRef.current.length % 6 === 0) {
            setExportFrameCount(exportFramesRef.current.length);
        }
    }, [settings.barCount]);

    async function exportAnimatedFbx() {
        try {
            setExportingFbx(true);
            setStatus("Building animated FBX visualizer model...");
            setStatusTone("info");

            const [THREE, fbxModule] = await Promise.all([
                import("three"),
                import("@comfyorg/fbx-exporter-three"),
            ]);

            const FBXExporter =
                fbxModule.FBXExporter ||
                fbxModule.default ||
                fbxModule.Exporter ||
                fbxModule.FbxExporter;

            if (!FBXExporter) {
                throw new Error(
                    "FBX exporter was not found. Make sure @comfyorg/fbx-exporter-three is installed."
                );
            }

            const capturedFrames =
                exportFramesRef.current.length >= 2
                    ? exportFramesRef.current
                    : makeIdleExportFrames(settings);

            const { scene, animations, fps } = buildAnimatedVisualizerScene(
                THREE,
                capturedFrames,
                settings,
                fileName
            );

            const exporter = new FBXExporter();

            let output;

            if (typeof exporter.parseSync === "function") {
                output = exporter.parseSync(scene, {
                    preset: "blender",
                    fps,
                    includeAnimations: true,
                    animations,
                    onlyVisible: false,
                    embedTextures: false,
                    version: 7400,
                });
            } else if (typeof exporter.parse === "function") {
                output = exporter.parse(scene, {
                    preset: "blender",
                    fps,
                    includeAnimations: true,
                    animations,
                    onlyVisible: false,
                    embedTextures: false,
                    version: 7400,
                });
            } else {
                throw new Error("The installed FBX exporter does not expose parseSync or parse.");
            }

            const blob = createExporterBlob(output);

            downloadBlob(blob, makeSafeExportName(fileName, "fbx"));

            setStatus(
                `Exported animated FBX with ${capturedFrames.length} captured frame${
                    capturedFrames.length === 1 ? "" : "s"
                }.`
            );
            setStatusTone("info");
            setExportFrameCount(exportFramesRef.current.length);
        } catch (error) {
            setStatus(
                error?.message ||
                "Could not export FBX. Make sure @comfyorg/fbx-exporter-three is installed."
            );
            setStatusTone("error");
        } finally {
            setExportingFbx(false);
        }
    }

    function setLoadedSource({ url, name, isRemote, objectUrl = null }) {
        const audio = audioRef.current;
        if (!audio) return;

        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute("src");
        audio.load();

        if (objectUrlRef.current && objectUrlRef.current !== objectUrl) {
            URL.revokeObjectURL(objectUrlRef.current);
        }

        objectUrlRef.current = objectUrl;
        sourceKindRef.current = isRemote ? "remote" : "local";

        if (isRemote) {
            audio.crossOrigin = "anonymous";
        } else {
            audio.removeAttribute("crossorigin");
        }

        audio.src = url;
        audio.load();

        setAudioUrl(url);
        setFileName(name);
        setPosition(0);
        setDuration(0);
        setPlaying(false);
        setAudioReady(false);
        frequencyDataRef.current = null;
        timeDataRef.current = null;
        resetExportFrames();

        setStatus(`Loaded ${name}. Press Play to start the visualizer.`);
        setStatusTone("info");
    }

    function handleFileSelect(file) {
        if (!file) return;

        const url = URL.createObjectURL(file);

        setLoadedSource({
            url,
            name: file.name || "local audio file",
            isRemote: false,
            objectUrl: url,
        });
    }

    function handleLoadLink() {
        const clean = linkValue.trim();

        if (!clean) return;

        try {
            const parsed = new URL(clean);

            setLoadedSource({
                url: parsed.toString(),
                name: getReadableFileNameFromUrl(parsed.toString()),
                isRemote: true,
                objectUrl: null,
            });
        } catch {
            setStatus("That does not look like a valid media URL.");
            setStatusTone("error");
        }
    }

    function clearVisualizer() {
        const audio = audioRef.current;

        if (audio) {
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
        }

        clearObjectUrl();

        sourceKindRef.current = "none";

        setAudioUrl("");
        setLinkValue("");
        setFileName("");
        setPosition(0);
        setDuration(0);
        setPlaying(false);
        setAudioReady(false);
        frequencyDataRef.current = null;
        timeDataRef.current = null;
        resetExportFrames();

        setStatus("Visualizer cleared. Load another audio file or link.");
        setStatusTone("info");
    }

    async function ensureAudioGraph() {
        const audio = audioRef.current;

        if (!audio) {
            throw new Error("Audio element is not ready.");
        }

        const AudioContextConstructor =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextConstructor) {
            throw new Error("This browser does not support the Web Audio API.");
        }

        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContextConstructor();
        }

        const context = audioContextRef.current;

        if (!sourceRef.current) {
            sourceRef.current = context.createMediaElementSource(audio);
        }

        if (!gainRef.current) {
            gainRef.current = context.createGain();
        }

        if (!analyserRef.current) {
            analyserRef.current = context.createAnalyser();
        }

        const source = sourceRef.current;
        const gain = gainRef.current;
        const analyser = analyserRef.current;

        try {
            source.disconnect();
        } catch {
            // Already disconnected.
        }

        try {
            gain.disconnect();
        } catch {
            // Already disconnected.
        }

        try {
            analyser.disconnect();
        } catch {
            // Already disconnected.
        }

        source.connect(gain);
        gain.connect(analyser);
        analyser.connect(context.destination);

        gain.gain.value = clamp(settings.gain, 0, 2.5);
        analyser.fftSize = Number(settings.fftSize);
        analyser.smoothingTimeConstant = clamp(settings.smoothing, 0, 0.98);

        frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        timeDataRef.current = new Uint8Array(analyser.fftSize);

        if (context.state !== "running") {
            await context.resume();
        }

        return { context, analyser };
    }

    async function togglePlay() {
        const audio = audioRef.current;

        if (!audioUrl || !audio) {
            setStatus("Load audio first.");
            setStatusTone("error");
            return;
        }

        try {
            await ensureAudioGraph();

            if (audio.paused) {
                await audio.play();
                setPlaying(true);
                setAudioReady(true);
                setStatus("Visualizer running. FBX frames are being captured.");
                setStatusTone("info");
            } else {
                audio.pause();
                setPlaying(false);
                setStatus("Visualizer paused. Captured frames are ready for FBX export.");
                setStatusTone("info");
            }
        } catch (error) {
            setStatus(
                error?.message ||
                "Could not start playback. Remote links may need CORS permission."
            );
            setStatusTone("error");
        }
    }

    function stopPlayback() {
        const audio = audioRef.current;

        if (!audio) return;

        audio.pause();
        audio.currentTime = 0;
        setPlaying(false);
        setPosition(0);
        setStatus("Playback stopped. Captured frames remain available for FBX export.");
        setStatusTone("info");
    }

    function restartPlayback() {
        const audio = audioRef.current;

        if (!audio) return;

        audio.currentTime = 0;
        setPosition(0);

        if (!audio.paused) {
            audio.play().catch(() => {});
        }
    }

    useEffect(() => {
        const analyser = analyserRef.current;
        const gain = gainRef.current;

        if (gain) {
            gain.gain.value = clamp(settings.gain, 0, 2.5);
        }

        if (analyser) {
            analyser.fftSize = Number(settings.fftSize);
            analyser.smoothingTimeConstant = clamp(settings.smoothing, 0, 0.98);
            frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
            timeDataRef.current = new Uint8Array(analyser.fftSize);
        }
    }, [settings.fftSize, settings.smoothing, settings.gain]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return undefined;

        function handleLoadedMetadata() {
            setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
            setAudioReady(true);

            if (sourceKindRef.current === "local") {
                setStatus("Local file decoded. Press Play to start the visualizer.");
                setStatusTone("info");
            }
        }

        function handleCanPlay() {
            setAudioReady(true);
        }

        function handleTimeUpdate() {
            setPosition(audio.currentTime || 0);
        }

        function handlePlay() {
            setPlaying(true);
        }

        function handlePause() {
            setPlaying(false);
        }

        function handleEnded() {
            setPlaying(false);
            setPosition(0);
            setStatus("Playback ended. Captured frames remain available for FBX export.");
            setStatusTone("info");
        }

        function handleError() {
            setPlaying(false);

            if (sourceKindRef.current === "remote") {
                setStatus(
                    "The browser could not access this remote media link. Remote files must allow CORS and direct browser playback."
                );
            } else if (sourceKindRef.current === "local") {
                setStatus(
                    "The browser could not decode this local file. The upload URL is fixed, but some browsers reject certain M4A/AAC encodings. Try Chrome or Edge, or export the file as MP3, WAV, or standard AAC M4A."
                );
            } else {
                setStatus("No playable media is loaded yet.");
            }

            setStatusTone("error");
        }

        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("canplay", handleCanPlay);
        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("play", handlePlay);
        audio.addEventListener("pause", handlePause);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);

        return () => {
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("canplay", handleCanPlay);
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("play", handlePlay);
            audio.removeEventListener("pause", handlePause);
            audio.removeEventListener("ended", handleEnded);
            audio.removeEventListener("error", handleError);
        };
    }, []);

    useEffect(() => {
        let disposed = false;

        if (reactSnapRun) {
            drawEmptyCanvas(
                waveformCanvasRef.current,
                "Load audio to display waveform."
            );
            drawEmptyCanvas(
                spectrumCanvasRef.current,
                "Load audio to display spectrum."
            );
            return undefined;
        }

        function scheduleNextFrame() {
            if (!disposed) {
                raf2dRef.current = requestAnimationFrame(draw2d);
            }
        }

        function draw2d() {
            const analyser = analyserRef.current;
            const frequencyData = frequencyDataRef.current;
            const timeData = timeDataRef.current;

            if (!analyser || !frequencyData?.length || !timeData?.length || !audioReady) {
                drawEmptyCanvas(waveformCanvasRef.current, "Load audio to display waveform.");
                drawEmptyCanvas(spectrumCanvasRef.current, "Load audio to display spectrum.");
                scheduleNextFrame();
                return;
            }

            analyser.getByteFrequencyData(frequencyData);
            analyser.getByteTimeDomainData(timeData);
            captureExportFrame(frequencyData);

            if (settings.showWaveform) {
                const prepared = prepareCanvas(waveformCanvasRef.current, 240);

                if (prepared) {
                    const { context, width, height } = prepared;
                    const centerY = height / 2;

                    context.clearRect(0, 0, width, height);

                    const gradient = context.createLinearGradient(0, 0, width, height);
                    gradient.addColorStop(0, "rgba(7,10,19,0.98)");
                    gradient.addColorStop(1, "rgba(14,20,42,0.98)");
                    context.fillStyle = gradient;
                    context.fillRect(0, 0, width, height);

                    context.strokeStyle = "rgba(103,232,249,0.11)";
                    context.lineWidth = 1;

                    for (let x = 0; x <= width; x += 48) {
                        context.beginPath();
                        context.moveTo(x, 0);
                        context.lineTo(x, height);
                        context.stroke();
                    }

                    context.strokeStyle = "rgba(255,255,255,0.11)";
                    context.beginPath();
                    context.moveTo(0, centerY);
                    context.lineTo(width, centerY);
                    context.stroke();

                    context.lineWidth = 2;
                    context.strokeStyle = "rgba(103,232,249,0.94)";
                    context.shadowColor = "rgba(103,232,249,0.55)";
                    context.shadowBlur = 12;

                    context.beginPath();

                    for (let i = 0; i < timeData.length; i += 1) {
                        const value = timeData[i] / 128 - 1;
                        const x = (i / Math.max(1, timeData.length - 1)) * width;
                        const y = centerY + value * centerY * 0.78;

                        if (i === 0) context.moveTo(x, y);
                        else context.lineTo(x, y);
                    }

                    context.stroke();

                    if (settings.mirrorWaveform) {
                        context.strokeStyle = "rgba(167,139,250,0.6)";
                        context.beginPath();

                        for (let i = 0; i < timeData.length; i += 1) {
                            const value = timeData[i] / 128 - 1;
                            const x = (i / Math.max(1, timeData.length - 1)) * width;
                            const y = centerY - value * centerY * 0.78;

                            if (i === 0) context.moveTo(x, y);
                            else context.lineTo(x, y);
                        }

                        context.stroke();
                    }

                    context.shadowBlur = 0;
                    context.fillStyle = "rgba(255,255,255,0.78)";
                    context.font = "850 12px system-ui, -apple-system, Segoe UI, sans-serif";
                    context.fillText("Oscilloscope / time domain", 18, 26);
                }
            } else {
                drawEmptyCanvas(waveformCanvasRef.current, "Waveform panel disabled.");
            }

            if (settings.showSpectrum) {
                const prepared = prepareCanvas(spectrumCanvasRef.current, 240);

                if (prepared) {
                    const { context, width, height } = prepared;
                    const count = Math.min(192, frequencyData.length);
                    const barWidth = width / Math.max(1, count);

                    context.clearRect(0, 0, width, height);
                    context.fillStyle = "rgba(7,10,19,0.98)";
                    context.fillRect(0, 0, width, height);

                    context.strokeStyle = "rgba(255,255,255,0.06)";
                    context.lineWidth = 1;

                    for (let y = 0; y <= height; y += height / 4) {
                        context.beginPath();
                        context.moveTo(0, y);
                        context.lineTo(width, y);
                        context.stroke();
                    }

                    for (let i = 0; i < count; i += 1) {
                        const index = Math.floor(
                            (i / Math.max(1, count - 1)) * (frequencyData.length - 1)
                        );
                        const value = normalizeFrequencyValue(
                            frequencyData[index],
                            settings.sensitivity
                        );
                        const barHeight = Math.max(2, value * height * 0.88);
                        const x = i * barWidth;
                        const y = height - barHeight;

                        const gradient = context.createLinearGradient(0, y, 0, height);
                        gradient.addColorStop(0, "rgba(167,139,250,0.95)");
                        gradient.addColorStop(0.52, "rgba(103,232,249,0.86)");
                        gradient.addColorStop(1, "rgba(34,211,238,0.28)");

                        context.fillStyle = gradient;
                        context.fillRect(x, y, Math.max(1, barWidth * 0.74), barHeight);
                    }

                    const bass = getBandEnergy(frequencyData, 0, 0.08);
                    const mid = getBandEnergy(frequencyData, 0.08, 0.35);
                    const high = getBandEnergy(frequencyData, 0.35, 1);

                    context.fillStyle = "rgba(255,255,255,0.78)";
                    context.font = "850 12px system-ui, -apple-system, Segoe UI, sans-serif";
                    context.fillText(
                        `Frequency spectrum   Bass ${(bass * 100).toFixed(0)}%   Mid ${(
                            mid * 100
                        ).toFixed(0)}%   High ${(high * 100).toFixed(0)}%`,
                        18,
                        26
                    );
                }
            } else {
                drawEmptyCanvas(spectrumCanvasRef.current, "Spectrum panel disabled.");
            }


            scheduleNextFrame();
        }

        scheduleNextFrame();

        return () => {
            disposed = true;

            if (raf2dRef.current !== null) {
                cancelAnimationFrame(raf2dRef.current);
                raf2dRef.current = null;
            }
        };
    }, [
        reactSnapRun,
        audioReady,
        settings.showWaveform,
        settings.showSpectrum,
        settings.mirrorWaveform,
        settings.sensitivity,
        captureExportFrame,
    ]);

    useEffect(() => {
        if (reactSnapRun) {
            return undefined;
        }

        let disposed = false;
        let renderer = null;
        let scene = null;
        let camera = null;
        let group = null;
        let meshes = [];
        let terrainMesh = null;
        let terrainHistory = [];
        let animationClock = 0;

        async function initThree() {
            const canvas = threeCanvasRef.current;
            if (!canvas) return;

            const THREE = await import("three");

            if (disposed) return;

            renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: true,
                powerPreference: "high-performance",
            });

            renderer.setClearColor(0x070a13, 1);
            renderer.setPixelRatio(
                Math.min(window.devicePixelRatio || 1.5, clamp(settings.quality, 0.75, 2.5))
            );

            scene = new THREE.Scene();
            scene.fog = new THREE.Fog(0x070a13, 8, 24);

            camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
            camera.position.set(0, 4.8, 10);

            const ambient = new THREE.AmbientLight(0xffffff, 0.72);
            scene.add(ambient);

            const key = new THREE.PointLight(0x67e8f9, 1.8, 24);
            key.position.set(4, 6, 6);
            scene.add(key);

            const fill = new THREE.PointLight(0xa78bfa, 1.4, 24);
            fill.position.set(-5, 4, -5);
            scene.add(fill);

            group = new THREE.Group();
            scene.add(group);

            const count = clamp(Math.floor(settings.barCount), 32, 256);
            const terrainDepth = clamp(Math.floor(settings.terrainDepth), 12, 96);

            if (settings.mode === "bars3d") {
                const geometry = new THREE.BoxGeometry(0.12, 1, 0.12);

                for (let i = 0; i < count; i += 1) {
                    const angle = (i / count) * Math.PI * 2;
                    const radius = 4.2;

                    const material = new THREE.MeshStandardMaterial({
                        color: 0x67e8f9,
                        emissive: 0x123d4a,
                        roughness: 0.42,
                        metalness: 0.35,
                    });

                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.set(Math.cos(angle) * radius, -1.2, Math.sin(angle) * radius);
                    mesh.lookAt(0, -1.2, 0);
                    mesh.userData.index = i;

                    group.add(mesh);
                    meshes.push(mesh);
                }
            }

            if (settings.mode === "sphere") {
                const geometry = new THREE.SphereGeometry(0.065, 10, 10);

                for (let i = 0; i < count; i += 1) {
                    const y = 1 - (i / Math.max(1, count - 1)) * 2;
                    const radius = Math.sqrt(Math.max(0, 1 - y * y));
                    const theta = i * Math.PI * (3 - Math.sqrt(5));

                    const material = new THREE.MeshStandardMaterial({
                        color: i % 2 === 0 ? 0x67e8f9 : 0xa78bfa,
                        emissive: i % 2 === 0 ? 0x123d4a : 0x221641,
                        roughness: 0.35,
                        metalness: 0.25,
                    });

                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.userData.base = new THREE.Vector3(
                        Math.cos(theta) * radius * 3,
                        y * 3,
                        Math.sin(theta) * radius * 3
                    );
                    mesh.userData.index = i;
                    mesh.position.copy(mesh.userData.base);

                    group.add(mesh);
                    meshes.push(mesh);
                }
            }

            if (settings.mode === "terrain") {
                const widthSegments = count - 1;
                const depthSegments = terrainDepth - 1;
                const geometry = new THREE.PlaneGeometry(10, 7, widthSegments, depthSegments);

                geometry.rotateX(-Math.PI / 2);

                const material = new THREE.MeshStandardMaterial({
                    color: 0x67e8f9,
                    emissive: 0x132f45,
                    wireframe: true,
                    roughness: 0.55,
                    metalness: 0.12,
                });

                terrainMesh = new THREE.Mesh(geometry, material);
                terrainMesh.position.y = -1.8;
                group.add(terrainMesh);

                terrainHistory = Array.from(
                    { length: terrainDepth },
                    () => new Float32Array(count)
                );
            }

            function resizeRenderer() {
                if (!renderer || !camera || !canvas) return;

                const rect = canvas.getBoundingClientRect();
                const width = Math.max(320, rect.width || 960);
                const height = Math.max(240, rect.height || 520);

                renderer.setSize(width, height, false);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }

            function getFrequencyValue(dataArray, ratio) {
                if (!dataArray?.length) return 0;

                const safeRatio = clamp(Number(ratio), 0, 1);
                const index = Math.min(
                    dataArray.length - 1,
                    Math.max(0, Math.floor(safeRatio * (dataArray.length - 1)))
                );

                return dataArray[index] || 0;
            }

            function render() {
                if (!renderer || !scene || !camera || !group) return;

                resizeRenderer();

                const analyser = analyserRef.current;
                const frequencyData = frequencyDataRef.current;

                if (analyser && frequencyData?.length) {
                    analyser.getByteFrequencyData(frequencyData);
                }

                const hasFrequencyData = Boolean(frequencyData?.length);

                const energy = hasFrequencyData ? getAverageEnergy(frequencyData) : 0;
                const bass = hasFrequencyData ? getBandEnergy(frequencyData, 0, 0.08) : 0;
                const mid = hasFrequencyData
                    ? getBandEnergy(frequencyData, 0.08, 0.35)
                    : 0;
                const high = hasFrequencyData
                    ? getBandEnergy(frequencyData, 0.35, 1)
                    : 0;

                animationClock += 0.012 + energy * 0.03;

                group.rotation.y += settings.rotation * 0.004 + bass * 0.008;
                group.rotation.x = Math.sin(animationClock * 0.55) * 0.05;

                camera.position.y = 4.6 + mid * 1.1;
                camera.position.z = 10 - bass * 1.6;
                camera.lookAt(0, 0, 0);

                if (settings.mode === "bars3d") {
                    meshes.forEach((mesh) => {
                        const ratio = mesh.userData.index / Math.max(1, meshes.length - 1);
                        const value = normalizeFrequencyValue(
                            getFrequencyValue(frequencyData, ratio),
                            settings.sensitivity
                        );

                        const scaleY = 0.08 + value * 5.2;
                        mesh.scale.y = scaleY;
                        mesh.position.y = -1.8 + scaleY / 2;
                        mesh.material.emissiveIntensity = 0.35 + value * 1.8;
                    });
                }

                if (settings.mode === "sphere") {
                    meshes.forEach((mesh) => {
                        const ratio = mesh.userData.index / Math.max(1, meshes.length - 1);
                        const value = normalizeFrequencyValue(
                            getFrequencyValue(frequencyData, ratio),
                            settings.sensitivity
                        );

                        const base = mesh.userData.base;
                        const expansion = 1 + value * 0.78 + bass * 0.22;

                        mesh.position.set(
                            base.x * expansion,
                            base.y * expansion,
                            base.z * expansion
                        );
                        mesh.scale.setScalar(1 + value * 2.4);
                        mesh.material.emissiveIntensity = 0.25 + value * 2;
                    });
                }

                if (settings.mode === "terrain" && terrainMesh && terrainHistory.length) {
                    const terrainCount = clamp(Math.floor(settings.barCount), 32, 256);
                    const safeTerrainDepth = clamp(Math.floor(settings.terrainDepth), 12, 96);
                    const row = new Float32Array(terrainCount);

                    for (let x = 0; x < terrainCount; x += 1) {
                        const ratio = x / Math.max(1, terrainCount - 1);
                        row[x] = normalizeFrequencyValue(
                            getFrequencyValue(frequencyData, ratio),
                            settings.sensitivity
                        );
                    }

                    terrainHistory.pop();
                    terrainHistory.unshift(row);

                    const positionAttribute = terrainMesh.geometry.attributes.position;

                    for (let z = 0; z < safeTerrainDepth; z += 1) {
                        for (let x = 0; x < terrainCount; x += 1) {
                            const vertexIndex = z * terrainCount + x;
                            const value = terrainHistory[z]?.[x] || 0;

                            if (vertexIndex < positionAttribute.count) {
                                positionAttribute.setY(vertexIndex, value * 3.3 - 0.2);
                            }
                        }
                    }

                    positionAttribute.needsUpdate = true;
                    terrainMesh.geometry.computeVertexNormals();
                    terrainMesh.material.emissiveIntensity = 0.25 + high * 1.5;
                }

                renderer.render(scene, camera);
            }

            renderer.setAnimationLoop(render);
        }

        void initThree().catch((error) => {
            if (disposed) return;

            console.warn("Visualizer WebGL initialization failed:", error);
            setStatus(
                "The 3D renderer could not initialize, but the audio and 2D visualizer tools remain available."
            );
            setStatusTone("error");
        });

        return () => {
            disposed = true;

            if (renderer) {
                renderer.setAnimationLoop(null);
            }

            meshes.forEach((mesh) => {
                mesh.geometry?.dispose?.();
                mesh.material?.dispose?.();
            });

            if (terrainMesh) {
                terrainMesh.geometry?.dispose?.();
                terrainMesh.material?.dispose?.();
            }

            renderer?.dispose?.();
            renderer?.forceContextLoss?.();

            meshes = [];
            terrainHistory = [];
            terrainMesh = null;
            group = null;
            scene = null;
            camera = null;
            renderer = null;
        };
    }, [
        reactSnapRun,
        settings.mode,
        settings.barCount,
        settings.terrainDepth,
        settings.quality,
        settings.rotation,
        settings.sensitivity,
    ]);

    useEffect(() => {
        return () => {
            clearObjectUrl();

            if (raf2dRef.current !== null) {
                cancelAnimationFrame(raf2dRef.current);
                raf2dRef.current = null;
            }

            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
            }
        };
    }, [clearObjectUrl]);

    return (
        <PageShell>
            <Helmet>
                <title>3D Audio Visualizer Studio</title>
                <link rel="canonical" href="https://audiomasterlab.com/visualizer" />
                <meta
                    name="description"
                    content="AudioMaster Lab 3D visualizer studio for waveform, spectrum, oscilloscope, animated FBX export, and WebAudio frequency research."
                />
                <meta
                    name="keywords"
                    content="audio visualizer, 3D audio visualizer, WebAudio visualizer, spectrum analyzer, waveform visualizer, browser music visualizer, animated FBX export"
                />
            </Helmet>

            <Stack spacing={4}>
                <Box>
                    <Chip
                        icon={<ScienceRoundedIcon />}
                        label="Research visual lab"
                        sx={{
                            mb: 2,
                            color: "#dffaff",
                            background: "rgba(103,232,249,0.12)",
                            border: "1px solid rgba(103,232,249,0.24)",
                            fontWeight: 850,
                        }}
                    />

                    <Typography
                        variant="h1"
                        sx={{
                            fontWeight: 950,
                            letterSpacing: "-0.075em",
                            lineHeight: 0.95,
                            fontSize: { xs: "2.55rem", md: "4.7rem" },
                            maxWidth: 980,
                            mb: 2,
                        }}
                    >
                        Advanced 3D Audio Visualizer Studio
                    </Typography>

                    <Typography
                        variant="h6"
                        sx={{
                            color: "rgba(255,255,255,0.68)",
                            lineHeight: 1.7,
                            maxWidth: 880,
                        }}
                    >
                        Load audio, inspect the waveform, study frequency bands, render a live
                        3D WebGL visualization, and export the captured visual motion as an
                        animated FBX model.
                    </Typography>
                </Box>

                <Alert
                    severity={statusTone === "error" ? "error" : "info"}
                    sx={{
                        borderRadius: 4,
                        color: "#fff",
                        background:
                            statusTone === "error"
                                ? "rgba(248,113,113,0.12)"
                                : "rgba(103,232,249,0.1)",
                        border:
                            statusTone === "error"
                                ? "1px solid rgba(248,113,113,0.24)"
                                : "1px solid rgba(103,232,249,0.18)",
                        "& .MuiAlert-icon": {
                            color: statusTone === "error" ? "#f87171" : "#67e8f9",
                        },
                    }}
                >
                    {status}
                </Alert>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", lg: "0.95fr 1.45fr" },
                        gap: 3,
                        alignItems: "start",
                    }}
                >
                    <Stack spacing={3}>
                        <GlassCard>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.5 }}>
                                        Load audio
                                    </Typography>

                                    <Typography
                                        sx={{ color: "rgba(255,255,255,0.64)", lineHeight: 1.65 }}
                                    >
                                        Upload a local file for best compatibility. Remote links must allow
                                        browser media access and CORS.
                                    </Typography>
                                </Box>

                                <Button
                                    component="label"
                                    variant="contained"
                                    size="large"
                                    startIcon={<CloudUploadRoundedIcon />}
                                    sx={{
                                        borderRadius: 999,
                                        py: 1.45,
                                        fontWeight: 950,
                                        color: "#06111e",
                                        background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                        boxShadow: "0 18px 46px rgba(103,232,249,0.18)",
                                    }}
                                >
                                    Upload audio/video file
                                    <input
                                        hidden
                                        type="file"
                                        accept="audio/*,video/*,.mp3,.wav,.ogg,.oga,.opus,.webm,.m4a,.mp4,.mov,.aac,.flac,.aif,.aiff"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];

                                            if (file) {
                                                handleFileSelect(file);
                                            }

                                            event.target.value = "";
                                        }}
                                    />
                                </Button>

                                {fileName && (
                                    <Chip
                                        label={`Loaded: ${fileName}`}
                                        sx={{
                                            justifyContent: "flex-start",
                                            color: "#fff",
                                            background: "rgba(255,255,255,0.08)",
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            fontWeight: 800,
                                        }}
                                    />
                                )}

                                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                                <TextField
                                    fullWidth
                                    value={linkValue}
                                    onChange={(event) => setLinkValue(event.target.value)}
                                    placeholder="https://example.com/audio.mp3"
                                    label="Direct media link"
                                    variant="filled"
                                    InputLabelProps={{ sx: { color: "rgba(255,255,255,0.62)" } }}
                                    InputProps={{
                                        sx: {
                                            color: "#fff",
                                            borderRadius: 3,
                                            background: "rgba(255,255,255,0.08)",
                                        },
                                    }}
                                />

                                <Button
                                    variant="outlined"
                                    onClick={handleLoadLink}
                                    disabled={!linkValue.trim()}
                                    startIcon={<TravelExploreRoundedIcon />}
                                    sx={{
                                        borderRadius: 3,
                                        color: "#fff",
                                        borderColor: "rgba(255,255,255,0.18)",
                                        fontWeight: 900,
                                    }}
                                >
                                    Load Link
                                </Button>

                                <Button
                                    variant="text"
                                    onClick={clearVisualizer}
                                    sx={{
                                        alignSelf: "flex-start",
                                        color: "rgba(255,255,255,0.72)",
                                        fontWeight: 850,
                                    }}
                                >
                                    Clear visualizer
                                </Button>
                            </Stack>
                        </GlassCard>

                        <GlassCard>
                            <Stack spacing={2.4}>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.5 }}>
                                        Transport
                                    </Typography>

                                    <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
                                        {formatTime(position)} / {formatTime(duration)}
                                    </Typography>
                                </Box>

                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
                                        onClick={togglePlay}
                                        disabled={!audioUrl}
                                        sx={{
                                            borderRadius: 999,
                                            py: 1.25,
                                            fontWeight: 950,
                                            color: "#06111e",
                                            background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                        }}
                                    >
                                        {playing ? "Pause" : "Play"}
                                    </Button>

                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        startIcon={<StopRoundedIcon />}
                                        onClick={stopPlayback}
                                        disabled={!audioUrl}
                                        sx={{
                                            borderRadius: 999,
                                            color: "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 900,
                                        }}
                                    >
                                        Stop
                                    </Button>

                                    <Button
                                        fullWidth
                                        variant="text"
                                        startIcon={<RestartAltRoundedIcon />}
                                        onClick={restartPlayback}
                                        disabled={!audioUrl}
                                        sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 900 }}
                                    >
                                        Restart
                                    </Button>
                                </Stack>

                                <Slider
                                    value={duration > 0 ? clamp(position, 0, duration) : 0}
                                    min={0}
                                    max={Math.max(duration, 0.01)}
                                    step={0.01}
                                    disabled={!audioUrl || !duration}
                                    onChange={(_, value) => {
                                        const next = Array.isArray(value) ? value[0] : value;
                                        const audio = audioRef.current;

                                        if (!audio) return;

                                        audio.currentTime = next;
                                        setPosition(next);
                                    }}
                                    sx={{
                                        color: "#67e8f9",
                                        "& .MuiSlider-rail": {
                                            color: "rgba(255,255,255,0.18)",
                                        },
                                    }}
                                />

                                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<FileDownloadRoundedIcon />}
                                    onClick={exportAnimatedFbx}
                                    disabled={exportingFbx}
                                    sx={{
                                        borderRadius: 4,
                                        py: 1.25,
                                        color: "#fff",
                                        borderColor: "rgba(255,255,255,0.2)",
                                        fontWeight: 950,
                                    }}
                                >
                                    {exportingFbx ? "Exporting FBX..." : "Export Animated FBX"}
                                </Button>

                                <Button
                                    fullWidth
                                    variant="text"
                                    startIcon={<DeleteRoundedIcon />}
                                    onClick={resetExportFrames}
                                    disabled={exportingFbx || !exportFrameCount}
                                    sx={{
                                        color: "rgba(255,255,255,0.72)",
                                        fontWeight: 900,
                                    }}
                                >
                                    Clear Captured FBX Frames
                                </Button>

                                <Typography
                                    sx={{
                                        color: "rgba(255,255,255,0.58)",
                                        fontSize: 13,
                                        lineHeight: 1.55,
                                    }}
                                >
                                    Play audio first to capture real movement. Captured frames:{" "}
                                    <Box component="span" sx={{ color: "#67e8f9", fontWeight: 950 }}>
                                        {exportFrameCount}
                                    </Box>
                                    . If no frames are captured, export uses an idle generated animation.
                                </Typography>
                            </Stack>
                        </GlassCard>

                        <GlassCard>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.5 }}>
                                        Visual engine
                                    </Typography>

                                    <Typography
                                        sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}
                                    >
                                        {selectedMode.description}
                                    </Typography>
                                </Box>

                                <FormControl fullWidth variant="filled">
                                    <InputLabel sx={{ color: "rgba(255,255,255,0.62)" }}>
                                        3D mode
                                    </InputLabel>

                                    <Select
                                        value={settings.mode}
                                        label="3D mode"
                                        onChange={(event) => updateSetting("mode", event.target.value)}
                                        sx={{
                                            color: "#fff",
                                            borderRadius: 3,
                                            background: "rgba(255,255,255,0.08)",
                                        }}
                                    >
                                        {VISUAL_MODES.map((mode) => (
                                            <MenuItem key={mode.value} value={mode.value}>
                                                {mode.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth variant="filled">
                                    <InputLabel sx={{ color: "rgba(255,255,255,0.62)" }}>
                                        FFT size
                                    </InputLabel>

                                    <Select
                                        value={settings.fftSize}
                                        label="FFT size"
                                        onChange={(event) =>
                                            updateSetting("fftSize", Number(event.target.value))
                                        }
                                        sx={{
                                            color: "#fff",
                                            borderRadius: 3,
                                            background: "rgba(255,255,255,0.08)",
                                        }}
                                    >
                                        {FFT_OPTIONS.map((size) => (
                                            <MenuItem key={size} value={size}>
                                                {size}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <ControlRow
                                    label="Sensitivity"
                                    value={settings.sensitivity}
                                    min={0.4}
                                    max={3}
                                    step={0.01}
                                    onChange={(value) => updateSetting("sensitivity", value)}
                                />

                                <ControlRow
                                    label="Smoothing"
                                    value={settings.smoothing}
                                    min={0}
                                    max={0.98}
                                    step={0.01}
                                    onChange={(value) => updateSetting("smoothing", value)}
                                />

                                <ControlRow
                                    label="Output gain"
                                    value={settings.gain}
                                    min={0}
                                    max={2.5}
                                    step={0.01}
                                    onChange={(value) => updateSetting("gain", value)}
                                />

                                <ControlRow
                                    label="3D objects"
                                    value={settings.barCount}
                                    min={32}
                                    max={256}
                                    step={1}
                                    decimals={0}
                                    onChange={(value) => {
                                        updateSetting("barCount", value);
                                        resetExportFrames();
                                    }}
                                />

                                <ControlRow
                                    label="3D rotation"
                                    value={settings.rotation}
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    onChange={(value) => updateSetting("rotation", value)}
                                />

                                <ControlRow
                                    label="Render quality"
                                    value={settings.quality}
                                    min={0.75}
                                    max={2.5}
                                    step={0.05}
                                    onChange={(value) => updateSetting("quality", value)}
                                />

                                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.showWaveform}
                                            onChange={(event) =>
                                                updateSetting("showWaveform", event.target.checked)
                                            }
                                        />
                                    }
                                    label="Show waveform"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.showSpectrum}
                                            onChange={(event) =>
                                                updateSetting("showSpectrum", event.target.checked)
                                            }
                                        />
                                    }
                                    label="Show frequency spectrum"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.mirrorWaveform}
                                            onChange={(event) =>
                                                updateSetting("mirrorWaveform", event.target.checked)
                                            }
                                        />
                                    }
                                    label="Mirror waveform"
                                />
                            </Stack>
                        </GlassCard>
                    </Stack>

                    <Stack spacing={3}>
                        <GlassCard sx={{ overflow: "hidden" }}>
                            <Stack spacing={1.5}>
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    alignItems={{ xs: "flex-start", sm: "center" }}
                                    justifyContent="space-between"
                                    spacing={1}
                                >
                                    <Box>
                                        <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                            3D WebGL stage
                                        </Typography>

                                        <Typography sx={{ color: "rgba(255,255,255,0.62)", fontSize: 13 }}>
                                            {selectedMode.label} · FFT {settings.fftSize} ·{" "}
                                            {settings.barCount} objects
                                        </Typography>
                                    </Box>

                                    <Chip
                                        icon={<ThreeDRotationRoundedIcon />}
                                        label={playing ? "Live + Capturing" : "Idle"}
                                        sx={{
                                            color: "#06111e",
                                            background: playing
                                                ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                : "rgba(255,255,255,0.68)",
                                            fontWeight: 950,
                                        }}
                                    />
                                </Stack>

                                <Box
                                    sx={{
                                        height: { xs: 360, md: 560 },
                                        borderRadius: 4,
                                        overflow: "hidden",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        background:
                                            "radial-gradient(circle at 50% 20%, rgba(103,232,249,0.12), transparent 36%), #070a13",
                                    }}
                                >
                                    <canvas
                                        ref={threeCanvasRef}
                                        style={{ width: "100%", height: "100%", display: "block" }}
                                    />
                                </Box>
                            </Stack>
                        </GlassCard>

                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" },
                                gap: 3,
                            }}
                        >
                            <GlassCard sx={{ overflow: "hidden" }}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <GraphicEqRoundedIcon sx={{ color: "#67e8f9" }} />

                                        <Box>
                                            <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                                Oscilloscope
                                            </Typography>

                                            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                                                Time-domain waveform
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    <Box
                                        sx={{
                                            height: 260,
                                            borderRadius: 4,
                                            overflow: "hidden",
                                            border: "1px solid rgba(255,255,255,0.09)",
                                        }}
                                    >
                                        <canvas
                                            ref={waveformCanvasRef}
                                            style={{ width: "100%", height: "100%", display: "block" }}
                                        />
                                    </Box>
                                </Stack>
                            </GlassCard>

                            <GlassCard sx={{ overflow: "hidden" }}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <TuneRoundedIcon sx={{ color: "#a78bfa" }} />

                                        <Box>
                                            <Typography variant="h5" sx={{ fontWeight: 950 }}>
                                                Spectrum analyzer
                                            </Typography>

                                            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                                                Frequency-domain bars
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    <Box
                                        sx={{
                                            height: 260,
                                            borderRadius: 4,
                                            overflow: "hidden",
                                            border: "1px solid rgba(255,255,255,0.09)",
                                        }}
                                    >
                                        <canvas
                                            ref={spectrumCanvasRef}
                                            style={{ width: "100%", height: "100%", display: "block" }}
                                        />
                                    </Box>
                                </Stack>
                            </GlassCard>
                        </Box>
                    </Stack>
                </Box>

                <GlassCard>
                    <SectionTitle
                        eyebrow="Research uses"
                        title="What this page gives you"
                        description="This page can become your experiment lab for audio-reactive graphics, frequency studies, mastering visualization, waveform testing, animated FBX export, and music-reactive 3D scenes."
                    />

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
                            gap: 2,
                        }}
                    >
                        {[
                            {
                                title: "Frequency research",
                                text: "Study bass, mids, highs, FFT size, smoothing, transient movement, and visual energy response.",
                            },
                            {
                                title: "3D music visuals",
                                text: "Build radial bars, terrain maps, spheres, tunnels, particles, and future video-export visual scenes.",
                            },
                            {
                                title: "Animated FBX export",
                                text: "Record analyser frames while audio plays and export them as a keyframed 3D model for Blender, Unity, Unreal, or Maya.",
                            },
                            {
                                title: "AudioMaster integration",
                                text: "Later you can connect this page to Recorder, Editor, Archive, and YouTube pages as a shared visual output.",
                            },
                        ].map((item) => (
                            <Box
                                key={item.title}
                                sx={{
                                    p: 2.4,
                                    borderRadius: 4,
                                    background: "rgba(255,255,255,0.055)",
                                    border: "1px solid rgba(255,255,255,0.09)",
                                }}
                            >
                                <Typography variant="h6" sx={{ fontWeight: 950, mb: 0.8 }}>
                                    {item.title}
                                </Typography>

                                <Typography sx={{ color: "rgba(255,255,255,0.64)", lineHeight: 1.65 }}>
                                    {item.text}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </GlassCard>
            </Stack>

            <audio ref={audioRef} preload="metadata" />
        </PageShell>
    );
}

function ControlRow({
                        label,
                        value,
                        min,
                        max,
                        step,
                        onChange,
                        decimals = step < 1 ? 2 : 0,
                    }) {
    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                <Typography sx={{ fontWeight: 850 }}>{label}</Typography>

                <Typography sx={{ color: "#67e8f9", fontWeight: 950 }}>
                    {Number(value).toFixed(decimals)}
                </Typography>
            </Stack>

            <Slider
                value={Number(value)}
                min={min}
                max={max}
                step={step}
                onChange={(_, nextValue) => {
                    const clean = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                    onChange(clean);
                }}
                sx={{
                    color: "#67e8f9",
                    "& .MuiSlider-thumb": {
                        boxShadow: "0 0 0 8px rgba(103,232,249,0.09)",
                    },
                    "& .MuiSlider-rail": {
                        color: "rgba(255,255,255,0.18)",
                    },
                }}
            />
        </Box>
    );
}