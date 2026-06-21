import React, { useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    Divider,
    LinearProgress,
    Slider,
    Stack,
    Typography,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import VolumeDownRoundedIcon from "@mui/icons-material/VolumeDownRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import EqualizerRoundedIcon from "@mui/icons-material/EqualizerRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import AudioFileRoundedIcon from "@mui/icons-material/AudioFileRounded";
import {
    GlassCard,
    MediaInputForm,
    PageShell,
    RenderButton,
    SectionTitle,
    StatusBanner,
    ControlSlider,
} from "../components/Components.js";
import {Helmet} from "react-helmet-async";

const DEFAULT_SETTINGS = {
    baseVolume: 1,

    clarityAmount: 0,
    demudAmount: 0,
    deEssAmount: 0,
    deEssFrequency: 6500,

    lowGain: 0,
    midGain: 0,
    highGain: 0,
    highPass: 20,
    lowPass: 20000,

    pan: 0,

    reverbMix: 0,
    reverbSeconds: 1.8,

    delayMix: 0,
    delayTime: 0.25,
    delayFeedback: 0.25,

    speed: 1,
    pitchSemitones: 0,

    compressorThreshold: -18,
    compressorRatio: 3,
    outputGain: 0,
};

const STREAMING_MANIFEST_EXTENSIONS = [".m3u8", ".mpd", ".ism", ".f4m"];

const MEDIA_EXTENSION_HINTS = [
    ".mp3",
    ".wav",
    ".wave",
    ".ogg",
    ".oga",
    ".opus",
    ".webm",
    ".m4a",
    ".mp4",
    ".m4v",
    ".aac",
    ".caf",
    ".flac",
];

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function numberOrDefault(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function normalizeSettings(value) {
    const merged = {
        ...DEFAULT_SETTINGS,
        ...(value || {}),
    };

    return {
        baseVolume: clamp(numberOrDefault(merged.baseVolume, 1), 0, 2),

        clarityAmount: clamp(numberOrDefault(merged.clarityAmount, 0), 0, 1),
        demudAmount: clamp(numberOrDefault(merged.demudAmount, 0), 0, 1),
        deEssAmount: clamp(numberOrDefault(merged.deEssAmount, 0), 0, 1),
        deEssFrequency: clamp(
            numberOrDefault(merged.deEssFrequency, 6500),
            4000,
            11000
        ),

        lowGain: clamp(numberOrDefault(merged.lowGain, 0), -18, 18),
        midGain: clamp(numberOrDefault(merged.midGain, 0), -18, 18),
        highGain: clamp(numberOrDefault(merged.highGain, 0), -18, 18),
        highPass: clamp(numberOrDefault(merged.highPass, 20), 20, 1000),
        lowPass: clamp(numberOrDefault(merged.lowPass, 20000), 2000, 20000),

        pan: clamp(numberOrDefault(merged.pan, 0), -1, 1),

        reverbMix: clamp(numberOrDefault(merged.reverbMix, 0), 0, 1),
        reverbSeconds: clamp(numberOrDefault(merged.reverbSeconds, 1.8), 0.15, 6),

        delayMix: clamp(numberOrDefault(merged.delayMix, 0), 0, 1),
        delayTime: clamp(numberOrDefault(merged.delayTime, 0.25), 0, 2),
        delayFeedback: clamp(numberOrDefault(merged.delayFeedback, 0.25), 0, 0.88),

        speed: clamp(numberOrDefault(merged.speed, 1), 0.25, 4),
        pitchSemitones: clamp(numberOrDefault(merged.pitchSemitones, 0), -24, 24),

        compressorThreshold: clamp(
            numberOrDefault(merged.compressorThreshold, -18),
            -60,
            0
        ),
        compressorRatio: clamp(numberOrDefault(merged.compressorRatio, 3), 1, 20),
        outputGain: clamp(numberOrDefault(merged.outputGain, 0), -24, 12),
    };
}

function dbToGain(db) {
    return Math.pow(10, db / 20);
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getAudioContextClass() {
    return window.AudioContext || window.webkitAudioContext;
}

function getOfflineAudioContextClass() {
    return window.OfflineAudioContext || window.webkitOfflineAudioContext;
}

function setAudioParam(param, value, time) {
    if (!param) return;

    try {
        param.setValueAtTime(value, time);
    } catch {
        param.value = value;
    }
}

function semitonesToCents(semitones) {
    return clamp(numberOrDefault(semitones, 0), -24, 24) * 100;
}

function getEffectivePlaybackRate(settings) {
    const safeSettings = normalizeSettings(settings);
    const detuneCents = semitonesToCents(safeSettings.pitchSemitones);

    return safeSettings.speed * Math.pow(2, detuneCents / 1200);
}

function getLowerName(value) {
    return String(value || "").trim().toLowerCase();
}

function getUrlPathname(urlValue) {
    try {
        const parsed = new URL(urlValue);
        return parsed.pathname || "";
    } catch {
        return String(urlValue || "");
    }
}

function hasAnyExtension(value, extensions) {
    const lower = getLowerName(getUrlPathname(value).split("?")[0].split("#")[0]);
    return extensions.some((extension) => lower.endsWith(extension));
}

function isStreamingManifestUrl(urlValue) {
    return hasAnyExtension(urlValue, STREAMING_MANIFEST_EXTENSIONS);
}

function isLikelyMediaUrl(urlValue) {
    const lower = getLowerName(urlValue);

    if (
        lower.startsWith("blob:") ||
        lower.startsWith("data:audio/") ||
        lower.startsWith("data:video/")
    ) {
        return true;
    }

    return hasAnyExtension(urlValue, MEDIA_EXTENSION_HINTS);
}

function validateDirectMediaUrl(urlValue) {
    const cleanUrl = String(urlValue || "").trim();

    if (!cleanUrl) {
        throw new Error("Paste a direct media URL first.");
    }

    if (isStreamingManifestUrl(cleanUrl)) {
        throw new Error(
            "This looks like an HLS/DASH streaming manifest. Use a direct decodable media file such as .mp3, .wav, .m4a, .mp4, .webm, or .ogg."
        );
    }

    if (cleanUrl.startsWith("blob:") || cleanUrl.startsWith("data:")) {
        return cleanUrl;
    }

    let parsed;

    try {
        parsed = new URL(cleanUrl);
    } catch {
        throw new Error("The media link is not a valid URL.");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error(
            "Only http, https, blob, and data media URLs can be loaded in this browser tool."
        );
    }

    return cleanUrl;
}

function getByteString(bytes, start, end) {
    let value = "";

    for (let i = start; i < end && i < bytes.length; i += 1) {
        value += String.fromCharCode(bytes[i]);
    }

    return value;
}

function describeMediaBytes(arrayBuffer) {
    const bytes = new Uint8Array(
        arrayBuffer.slice(0, Math.min(arrayBuffer.byteLength, 64))
    );

    if (bytes.length < 4) {
        return "unknown/empty";
    }

    const first4 = getByteString(bytes, 0, 4);
    const first3 = getByteString(bytes, 0, 3);
    const ftyp = getByteString(bytes, 4, 8);
    const brand = getByteString(bytes, 8, 12);

    if (first3 === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) {
        return "mp3";
    }

    if (first4 === "RIFF" && getByteString(bytes, 8, 12) === "WAVE") {
        return "wav";
    }

    if (first4 === "OggS") {
        return "ogg/opus";
    }

    if (
        bytes[0] === 0x1a &&
        bytes[1] === 0x45 &&
        bytes[2] === 0xdf &&
        bytes[3] === 0xa3
    ) {
        return "webm/ebml";
    }

    if (ftyp === "ftyp") {
        const mp4Brands = [
            "M4A ",
            "M4B ",
            "M4P ",
            "isom",
            "iso2",
            "mp41",
            "mp42",
            "avc1",
            "dash",
            "MSNV",
            "qt  ",
        ];

        if (mp4Brands.includes(brand)) {
            return "mp4/m4a container";
        }

        return `mp4-like container (${brand.trim() || "unknown brand"})`;
    }

    if (first4 === "fLaC") {
        return "flac";
    }

    if (
        first4.trim().startsWith("<") ||
        getByteString(bytes, 0, 16).toLowerCase().includes("<!doctype")
    ) {
        return "html";
    }

    return "unknown media bytes";
}

function buildDecodeFailureMessage(error, metadata, byteDescription) {
    const name = metadata?.name ? ` "${metadata.name}"` : "";
    const contentType = metadata?.contentType
        ? ` Content-Type: ${metadata.contentType}.`
        : "";
    const detected = byteDescription ? ` Detected bytes: ${byteDescription}.` : "";

    if (byteDescription === "html") {
        return `The link/file returned HTML instead of raw media${name}.${contentType} Use a direct .mp3, .wav, .m4a, .mp4, .webm, or .ogg file URL.`;
    }

    return `Could not decode audio${name}.${contentType}${detected} The browser may not support this codec/container, the file may be encrypted/DRM-protected, or the URL may not be a direct media file. ${
        error?.message || ""
    }`.trim();
}

async function fetchDirectMediaArrayBuffer(urlValue) {
    const cleanUrl = validateDirectMediaUrl(urlValue);

    try {
        const response = await fetch(cleanUrl, {
            method: "GET",
            mode: "cors",
            credentials: "omit",
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "";

        if (contentType.toLowerCase().includes("text/html")) {
            throw new Error(
                "The URL returned an HTML page instead of a direct media file."
            );
        }

        const arrayBuffer = await response.arrayBuffer();

        if (!arrayBuffer || arrayBuffer.byteLength < 8) {
            throw new Error("The downloaded media file is empty or too small to decode.");
        }

        return {
            arrayBuffer,
            metadata: {
                name: cleanUrl,
                sourceType: "url",
                contentType,
                byteLength: arrayBuffer.byteLength,
                likelyMedia: isLikelyMediaUrl(cleanUrl),
            },
        };
    } catch (error) {
        if (String(error?.message || "").toLowerCase().includes("failed to fetch")) {
            throw new Error(
                "The browser could not fetch this media URL. It may be blocked by CORS, not be a direct file, or require authentication."
            );
        }

        throw error;
    }
}

async function readFileMediaArrayBuffer(file) {
    if (!file) {
        throw new Error("No file was selected.");
    }

    const arrayBuffer = await file.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength < 8) {
        throw new Error("The selected file is empty or too small to decode.");
    }

    return {
        arrayBuffer,
        metadata: {
            name: file.name,
            sourceType: "file",
            contentType: file.type || "",
            byteLength: file.size || arrayBuffer.byteLength,
            likelyMedia: true,
        },
    };
}

async function decodeAudioBufferFromArrayBuffer(arrayBuffer, metadata) {
    const AudioContextClass = getAudioContextClass();

    if (!AudioContextClass) {
        throw new Error("This browser does not support the Web Audio API.");
    }

    const byteDescription = describeMediaBytes(arrayBuffer);

    if (byteDescription === "html") {
        throw new Error(buildDecodeFailureMessage(null, metadata, byteDescription));
    }

    const decodeContext = new AudioContextClass();

    try {
        return await decodeContext.decodeAudioData(arrayBuffer.slice(0));
    } catch (error) {
        throw new Error(buildDecodeFailureMessage(error, metadata, byteDescription));
    } finally {
        decodeContext.close().catch(() => {});
    }
}

function getMediaDisplayTitle(inputFile, sourceKind, sourceUrl) {
    if (inputFile?.name) {
        return inputFile.name;
    }

    if (sourceKind === "url" && sourceUrl) {
        try {
            const parsed = new URL(sourceUrl);
            const lastPart = parsed.pathname.split("/").filter(Boolean).pop();

            if (lastPart) {
                return decodeURIComponent(lastPart);
            }

            return parsed.hostname;
        } catch {
            return sourceUrl;
        }
    }

    return "Decoded audio buffer";
}

function drawRoundedCanvasRect(context, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);

    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.quadraticCurveTo(
        x + width,
        y + height,
        x + width - safeRadius,
        y + height
    );
    context.lineTo(x + safeRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
    context.closePath();
}

function wrapCanvasText(context, text, maxWidth) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";

    words.forEach((word) => {
        const nextLine = line ? `${line} ${word}` : word;
        const nextWidth = context.measureText(nextLine).width;

        if (nextWidth <= maxWidth || !line) {
            line = nextLine;
        } else {
            lines.push(line);
            line = word;
        }
    });

    if (line) {
        lines.push(line);
    }

    return lines.length ? lines : [String(text || "")];
}

function drawCanvasLabel(context, text, canvasWidth, canvasHeight) {
    const paddingFromBorder = 18;
    const x = paddingFromBorder;
    const y = paddingFromBorder;
    const maxWidth = Math.max(120, canvasWidth - paddingFromBorder * 2);

    let fontSize = 12;
    context.font = `800 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;

    while (
        fontSize > 9 &&
        context.measureText(text).width > maxWidth - 24
        ) {
        fontSize -= 1;
        context.font = `800 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
    }

    let lines = [text];

    if (context.measureText(text).width > maxWidth - 24) {
        lines = wrapCanvasText(context, text, maxWidth - 24);
    }

    const lineHeight = fontSize + 4;
    const textWidths = lines.map((line) => context.measureText(line).width);
    const labelWidth = Math.min(maxWidth, Math.max(...textWidths, 1) + 24);
    const labelHeight = Math.min(
        canvasHeight - paddingFromBorder * 2,
        lines.length * lineHeight + 12
    );

    context.save();

    context.fillStyle = "rgba(7,10,19,0.78)";
    context.strokeStyle = "rgba(103,232,249,0.22)";
    context.lineWidth = 1;

    context.shadowColor = "rgba(0,0,0,0.42)";
    context.shadowBlur = 18;
    context.shadowOffsetY = 8;

    drawRoundedCanvasRect(context, x, y, labelWidth, labelHeight, 12);
    context.fill();

    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    context.stroke();

    context.fillStyle = "rgba(255,255,255,0.9)";
    context.shadowColor = "rgba(103,232,249,0.28)";
    context.shadowBlur = 8;
    context.font = `800 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;

    lines.forEach((line, index) => {
        const textY = y + 18 + index * lineHeight;

        if (textY < y + labelHeight - 2) {
            context.fillText(line, x + 12, textY);
        }
    });

    context.restore();
}

function createImpulseResponse(context, seconds, decay = 2.8) {
    const safeSeconds = clamp(numberOrDefault(seconds, 1.8), 0.15, 6);
    const sampleRate = context.sampleRate || 44100;
    const length = Math.max(1, Math.floor(sampleRate * safeSeconds));
    const impulse = context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const data = impulse.getChannelData(channel);

        for (let i = 0; i < length; i += 1) {
            const progress = i / length;
            const envelope = Math.pow(1 - progress, decay);
            data[i] = (Math.random() * 2 - 1) * envelope;
        }
    }

    return impulse;
}

function createPannerStage(context) {
    if (context.createStereoPanner) {
        const panner = context.createStereoPanner();

        return {
            kind: "stereo",
            node: panner,
        };
    }

    const panner = context.createPanner();
    panner.panningModel = "equalpower";
    panner.distanceModel = "linear";
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 0;

    return {
        kind: "3d",
        node: panner,
    };
}

function applyPanner(nodes, pan, currentTime) {
    if (!nodes?.pannerNode) return;

    const safePan = clamp(numberOrDefault(pan, 0), -1, 1);

    if (nodes.pannerKind === "stereo" && nodes.pannerNode.pan) {
        setAudioParam(nodes.pannerNode.pan, safePan, currentTime);
        return;
    }

    const x = safePan;
    const y = 0;
    const z = 1 - Math.abs(safePan) * 0.2;

    if (nodes.pannerNode.positionX) {
        setAudioParam(nodes.pannerNode.positionX, x, currentTime);
        setAudioParam(nodes.pannerNode.positionY, y, currentTime);
        setAudioParam(nodes.pannerNode.positionZ, z, currentTime);
    } else if (nodes.pannerNode.setPosition) {
        nodes.pannerNode.setPosition(x, y, z);
    }
}

function applySourcePlaybackSettings(source, settings, currentTime) {
    if (!source) return;

    const safeSettings = normalizeSettings(settings);
    const detuneCents = semitonesToCents(safeSettings.pitchSemitones);
    const effectiveRate = getEffectivePlaybackRate(safeSettings);

    if (source.detune) {
        setAudioParam(source.playbackRate, safeSettings.speed, currentTime);
        setAudioParam(source.detune, detuneCents, currentTime);
    } else {
        setAudioParam(source.playbackRate, effectiveRate, currentTime);
    }
}

function applySettingsToNodes(nodes, rawSettings, currentTime) {
    if (!nodes) return;

    const settings = normalizeSettings(rawSettings);

    setAudioParam(nodes.baseVolumeGain.gain, settings.baseVolume, currentTime);

    setAudioParam(
        nodes.demudHighPass.frequency,
        35 + settings.demudAmount * 95,
        currentTime
    );
    setAudioParam(nodes.demudHighPass.Q, 0.7, currentTime);

    setAudioParam(nodes.demudCut.frequency, 260, currentTime);
    setAudioParam(nodes.demudCut.Q, 1.05 + settings.demudAmount * 0.6, currentTime);
    setAudioParam(nodes.demudCut.gain, -9 * settings.demudAmount, currentTime);

    setAudioParam(nodes.clarityBodyCut.frequency, 430, currentTime);
    setAudioParam(nodes.clarityBodyCut.Q, 0.9, currentTime);
    setAudioParam(nodes.clarityBodyCut.gain, -2.5 * settings.clarityAmount, currentTime);

    setAudioParam(nodes.clarityPresence.frequency, 3200, currentTime);
    setAudioParam(nodes.clarityPresence.Q, 0.85, currentTime);
    setAudioParam(nodes.clarityPresence.gain, 4.5 * settings.clarityAmount, currentTime);

    setAudioParam(nodes.clarityAir.frequency, 9500, currentTime);
    setAudioParam(nodes.clarityAir.Q, 0.7, currentTime);
    setAudioParam(nodes.clarityAir.gain, 5 * settings.clarityAmount, currentTime);

    setAudioParam(nodes.deEsserCut.frequency, settings.deEssFrequency, currentTime);
    setAudioParam(nodes.deEsserCut.Q, 3.5 + settings.deEssAmount * 4, currentTime);
    setAudioParam(nodes.deEsserCut.gain, -11 * settings.deEssAmount, currentTime);

    setAudioParam(nodes.highPass.frequency, settings.highPass, currentTime);
    setAudioParam(nodes.highPass.Q, 0.7, currentTime);

    setAudioParam(nodes.lowShelf.frequency, 120, currentTime);
    setAudioParam(nodes.lowShelf.gain, settings.lowGain, currentTime);

    setAudioParam(nodes.midPeak.frequency, 1000, currentTime);
    setAudioParam(nodes.midPeak.Q, 1.1, currentTime);
    setAudioParam(nodes.midPeak.gain, settings.midGain, currentTime);

    setAudioParam(nodes.highShelf.frequency, 8500, currentTime);
    setAudioParam(nodes.highShelf.gain, settings.highGain, currentTime);

    setAudioParam(nodes.lowPass.frequency, settings.lowPass, currentTime);
    setAudioParam(nodes.lowPass.Q, 0.7, currentTime);

    setAudioParam(nodes.compressor.threshold, settings.compressorThreshold, currentTime);
    setAudioParam(nodes.compressor.knee, 14, currentTime);
    setAudioParam(nodes.compressor.ratio, settings.compressorRatio, currentTime);
    setAudioParam(nodes.compressor.attack, 0.008, currentTime);
    setAudioParam(nodes.compressor.release, 0.22, currentTime);

    setAudioParam(nodes.dryGain.gain, 1, currentTime);

    if (nodes.context) {
        const impulseKey = `${Math.round(settings.reverbSeconds * 1000)}`;

        if (nodes.reverbImpulseKey !== impulseKey) {
            nodes.convolver.buffer = createImpulseResponse(
                nodes.context,
                settings.reverbSeconds
            );
            nodes.reverbImpulseKey = impulseKey;
        }
    }

    setAudioParam(nodes.reverbSendGain.gain, settings.reverbMix, currentTime);
    setAudioParam(nodes.reverbReturnGain.gain, 0.55, currentTime);

    setAudioParam(nodes.delayNode.delayTime, settings.delayTime, currentTime);
    setAudioParam(nodes.delaySendGain.gain, settings.delayMix, currentTime);
    setAudioParam(nodes.delayFeedbackGain.gain, settings.delayFeedback, currentTime);
    setAudioParam(nodes.delayReturnGain.gain, 0.75, currentTime);

    applyPanner(nodes, settings.pan, currentTime);

    setAudioParam(nodes.masterGain.gain, dbToGain(settings.outputGain), currentTime);
}

function createProcessingGraph(context, destination, rawSettings) {
    const settings = normalizeSettings(rawSettings);

    const baseVolumeGain = context.createGain();

    const demudHighPass = context.createBiquadFilter();
    demudHighPass.type = "highpass";

    const demudCut = context.createBiquadFilter();
    demudCut.type = "peaking";

    const clarityBodyCut = context.createBiquadFilter();
    clarityBodyCut.type = "peaking";

    const clarityPresence = context.createBiquadFilter();
    clarityPresence.type = "peaking";

    const clarityAir = context.createBiquadFilter();
    clarityAir.type = "highshelf";

    const deEsserCut = context.createBiquadFilter();
    deEsserCut.type = "peaking";

    const highPass = context.createBiquadFilter();
    highPass.type = "highpass";

    const lowShelf = context.createBiquadFilter();
    lowShelf.type = "lowshelf";

    const midPeak = context.createBiquadFilter();
    midPeak.type = "peaking";

    const highShelf = context.createBiquadFilter();
    highShelf.type = "highshelf";

    const lowPass = context.createBiquadFilter();
    lowPass.type = "lowpass";

    const compressor = context.createDynamicsCompressor();

    const dryGain = context.createGain();

    const reverbSendGain = context.createGain();
    const convolver = context.createConvolver();
    const reverbReturnGain = context.createGain();

    const delaySendGain = context.createGain();
    const delayNode = context.createDelay(4);
    const delayFeedbackGain = context.createGain();
    const delayReturnGain = context.createGain();

    const pannerInputGain = context.createGain();
    const pannerStage = createPannerStage(context);

    const masterGain = context.createGain();

    const nodes = {
        context,

        baseVolumeGain,

        demudHighPass,
        demudCut,

        clarityBodyCut,
        clarityPresence,
        clarityAir,

        deEsserCut,

        highPass,
        lowShelf,
        midPeak,
        highShelf,
        lowPass,

        compressor,

        dryGain,

        reverbSendGain,
        convolver,
        reverbReturnGain,
        reverbImpulseKey: "",

        delaySendGain,
        delayNode,
        delayFeedbackGain,
        delayReturnGain,

        pannerInputGain,
        pannerNode: pannerStage.node,
        pannerKind: pannerStage.kind,

        masterGain,
    };

    baseVolumeGain
        .connect(demudHighPass)
        .connect(demudCut)
        .connect(clarityBodyCut)
        .connect(clarityPresence)
        .connect(clarityAir)
        .connect(deEsserCut)
        .connect(highPass)
        .connect(lowShelf)
        .connect(midPeak)
        .connect(highShelf)
        .connect(lowPass)
        .connect(compressor);

    compressor.connect(dryGain);
    dryGain.connect(pannerInputGain);

    compressor.connect(reverbSendGain);
    reverbSendGain.connect(convolver);
    convolver.connect(reverbReturnGain);
    reverbReturnGain.connect(pannerInputGain);

    compressor.connect(delaySendGain);
    delaySendGain.connect(delayNode);
    delayNode.connect(delayFeedbackGain);
    delayFeedbackGain.connect(delayNode);
    delayNode.connect(delayReturnGain);
    delayReturnGain.connect(pannerInputGain);

    pannerInputGain.connect(pannerStage.node);
    pannerStage.node.connect(masterGain);
    masterGain.connect(destination);

    applySettingsToNodes(nodes, settings, context.currentTime || 0);

    return nodes;
}

function audioBufferToWavBlob(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeString(offset, value) {
        for (let i = 0; i < value.length; i += 1) {
            view.setUint8(offset + i, value.charCodeAt(i));
        }
    }

    let offset = 0;

    writeString(offset, "RIFF");
    offset += 4;

    view.setUint32(offset, 36 + dataSize, true);
    offset += 4;

    writeString(offset, "WAVE");
    offset += 4;

    writeString(offset, "fmt ");
    offset += 4;

    view.setUint32(offset, 16, true);
    offset += 4;

    view.setUint16(offset, 1, true);
    offset += 2;

    view.setUint16(offset, numberOfChannels, true);
    offset += 2;

    view.setUint32(offset, sampleRate, true);
    offset += 4;

    view.setUint32(offset, byteRate, true);
    offset += 4;

    view.setUint16(offset, blockAlign, true);
    offset += 2;

    view.setUint16(offset, 16, true);
    offset += 2;

    writeString(offset, "data");
    offset += 4;

    view.setUint32(offset, dataSize, true);
    offset += 4;

    const channelData = [];

    for (let channel = 0; channel < numberOfChannels; channel += 1) {
        channelData.push(audioBuffer.getChannelData(channel));
    }

    for (let i = 0; i < length; i += 1) {
        for (let channel = 0; channel < numberOfChannels; channel += 1) {
            const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            view.setInt16(offset, intSample, true);
            offset += 2;
        }
    }

    return new Blob([view], { type: "audio/wav" });
}

function getDownloadName(sourceKind, file) {
    if (sourceKind === "file" && file?.name) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        return `${cleanName}-mixed.wav`;
    }

    return "rendered-audio-mix.wav";
}

export default function Audio() {
    const objectUrlRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioBufferRef = useRef(null);
    const lastDecodedArrayBufferRef = useRef(null);
    const lastDecodedMetadataRef = useRef(null);
    const activeSourceRef = useRef(null);
    const liveNodesRef = useRef(null);
    const analyserRef = useRef(null);
    const monitorMuteGainRef = useRef(null);

    const waveformCanvasRef = useRef(null);
    const frequencyCanvasRef = useRef(null);
    const visualizerFrameRef = useRef(null);
    const waveformDataRef = useRef(null);
    const frequencyDataRef = useRef(null);

    const timerRef = useRef(null);

    const startedAtContextTimeRef = useRef(0);
    const startedOffsetRef = useRef(0);
    const currentEffectiveRateRef = useRef(getEffectivePlaybackRate(DEFAULT_SETTINGS));
    const manualStopRef = useRef(false);
    const playingRef = useRef(false);
    const scrubbingRef = useRef(false);
    const wasPlayingBeforeScrubRef = useRef(false);
    const mutedRef = useRef(false);
    const latestSettingsRef = useRef(DEFAULT_SETTINGS);

    const [sourceUrl, setSourceUrl] = useState("");
    const [sourceKind, setSourceKind] = useState("");
    const [inputFile, setInputFile] = useState(null);
    const [directLink, setDirectLink] = useState("");
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [status, setStatus] = useState(
        "Upload MP3, WAV, OGG, WebM, M4A, MP4, or paste a direct media URL to begin."
    );
    const [statusTone, setStatusTone] = useState("info");
    const [mixerEnabled, setMixerEnabled] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [bufferReady, setBufferReady] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [mediaInfo, setMediaInfo] = useState("");

    const settingsView = normalizeSettings(settings);
    const hasMedia = bufferReady && Boolean(audioBufferRef.current);
    const mediaTitle = getMediaDisplayTitle(inputFile, sourceKind, sourceUrl);

    const progressValue =
        duration > 0 ? clamp((position / duration) * 100, 0, 100) : 0;

    const effectiveRate = getEffectivePlaybackRate(settingsView);
    const pitchCents = semitonesToCents(settingsView.pitchSemitones);

    useEffect(() => {
        document.title = "Audio Tool | AudioBufferSourceNode Mixer";
    }, []);

    useEffect(() => {
        const normalized = normalizeSettings(settings);

        latestSettingsRef.current = normalized;

        if (liveNodesRef.current && audioContextRef.current) {
            applySettingsToNodes(
                liveNodesRef.current,
                normalized,
                audioContextRef.current.currentTime
            );
        }

        if (activeSourceRef.current && audioContextRef.current) {
            applySourcePlaybackSettings(
                activeSourceRef.current,
                normalized,
                audioContextRef.current.currentTime
            );
        }
    }, [settings]);

    useEffect(() => {
        clearVisualizerCanvases();

        return () => {
            stopPlayback(false);
            stopVisualizer();

            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }

            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
                audioContextRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function setPlayingState(nextValue) {
        playingRef.current = nextValue;
        setIsPlaying(nextValue);
    }

    function setInfo(message) {
        setStatus(message);
        setStatusTone("info");
    }

    function setError(message) {
        setStatus(message);
        setStatusTone("error");
    }

    function clearObjectUrl() {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }

    function prepareCanvas(canvas) {
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = rect.width || 640;
        const height = rect.height || 180;

        const desiredWidth = Math.floor(width * dpr);
        const desiredHeight = Math.floor(height * dpr);

        if (canvas.width !== desiredWidth || canvas.height !== desiredHeight) {
            canvas.width = desiredWidth;
            canvas.height = desiredHeight;
        }

        const context = canvas.getContext("2d");

        if (!context) return null;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        return {
            context,
            width,
            height,
        };
    }

    function clearCanvas(canvas, background = "rgba(7,10,19,0.96)") {
        const prepared = prepareCanvas(canvas);

        if (!prepared) return;

        const { context, width, height } = prepared;

        context.clearRect(0, 0, width, height);
        context.fillStyle = background;
        context.fillRect(0, 0, width, height);
    }

    function clearVisualizerCanvases() {
        clearCanvas(waveformCanvasRef.current);
        clearCanvas(frequencyCanvasRef.current);
    }

    function drawWaveform(analyser) {
        const prepared = prepareCanvas(waveformCanvasRef.current);

        if (!prepared) return;

        const { context, width, height } = prepared;
        const bufferLength = analyser.frequencyBinCount;

        if (!waveformDataRef.current || waveformDataRef.current.length !== bufferLength) {
            waveformDataRef.current = new Uint8Array(bufferLength);
        }

        const dataArray = waveformDataRef.current;
        analyser.getByteTimeDomainData(dataArray);

        context.clearRect(0, 0, width, height);

        const gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "rgba(7,10,19,0.98)");
        gradient.addColorStop(1, "rgba(17,24,39,0.96)");

        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);

        context.strokeStyle = "rgba(103,232,249,0.14)";
        context.lineWidth = 1;

        for (let y = 0; y < height; y += 30) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(width, y);
            context.stroke();
        }

        context.strokeStyle = "rgba(167,139,250,0.14)";

        for (let x = 0; x < width; x += 58) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, height);
            context.stroke();
        }

        context.lineWidth = 2.5;
        context.strokeStyle = "#67e8f9";
        context.shadowColor = "rgba(103,232,249,0.65)";
        context.shadowBlur = 14;
        context.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i += 1) {
            const v = dataArray[i] / 128.0;
            const y = v * (height / 2);

            if (i === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }

            x += sliceWidth;
        }

        context.lineTo(width, height / 2);
        context.stroke();
        context.shadowBlur = 0;

        drawCanvasLabel(context, "Processed waveform", width, height);
    }

    function drawFrequencyBars(analyser) {
        const prepared = prepareCanvas(frequencyCanvasRef.current);

        if (!prepared) return;

        const { context, width, height } = prepared;
        const bufferLength = analyser.frequencyBinCount;

        if (!frequencyDataRef.current || frequencyDataRef.current.length !== bufferLength) {
            frequencyDataRef.current = new Uint8Array(bufferLength);
        }

        const dataArray = frequencyDataRef.current;
        analyser.getByteFrequencyData(dataArray);

        context.clearRect(0, 0, width, height);

        const gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "rgba(7,10,19,0.98)");
        gradient.addColorStop(1, "rgba(17,24,39,0.96)");

        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);

        const usableBars = Math.floor(bufferLength * 0.58);
        const barWidth = Math.max(2, (width / usableBars) * 0.86);
        const gap = Math.max(1, barWidth * 0.22);

        let x = 0;

        for (let i = 0; i < usableBars; i += 1) {
            const value = dataArray[i];
            const normalized = value / 255;
            const barHeight = Math.max(2, normalized * height * 0.92);

            const barGradient = context.createLinearGradient(
                0,
                height - barHeight,
                0,
                height
            );

            barGradient.addColorStop(0, "rgba(103,232,249,0.98)");
            barGradient.addColorStop(0.55, "rgba(167,139,250,0.86)");
            barGradient.addColorStop(1, "rgba(59,130,246,0.68)");

            context.fillStyle = barGradient;
            context.fillRect(x, height - barHeight, barWidth, barHeight);

            x += barWidth + gap;

            if (x > width) break;
        }

        drawCanvasLabel(context, "Processed frequency spectrum", width, height);
    }

    function drawVisualizers() {
        const analyser = analyserRef.current;

        if (!analyser || !playingRef.current) {
            visualizerFrameRef.current = null;
            return;
        }

        drawWaveform(analyser);
        drawFrequencyBars(analyser);

        visualizerFrameRef.current = window.requestAnimationFrame(drawVisualizers);
    }

    function startVisualizer() {
        if (visualizerFrameRef.current) return;
        drawVisualizers();
    }

    function stopVisualizer() {
        if (visualizerFrameRef.current) {
            window.cancelAnimationFrame(visualizerFrameRef.current);
            visualizerFrameRef.current = null;
        }
    }

    function applyMonitorMute(nextMuted) {
        mutedRef.current = nextMuted;

        const context = audioContextRef.current;
        const monitorGain = monitorMuteGainRef.current;

        if (!context || !monitorGain) return;

        setAudioParam(monitorGain.gain, nextMuted ? 0 : 1, context.currentTime);
    }

    function toggleMute() {
        const nextMuted = !mutedRef.current;

        applyMonitorMute(nextMuted);
        setIsMuted(nextMuted);

        setInfo(
            nextMuted
                ? "Preview muted. Rendering still uses all processing."
                : "Preview unmuted."
        );
    }

    function stopPositionTimer() {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }

    function getCurrentOffset() {
        const context = audioContextRef.current;
        const buffer = audioBufferRef.current;

        if (!buffer) {
            return 0;
        }

        if (!context || !playingRef.current) {
            return clamp(startedOffsetRef.current, 0, buffer.duration);
        }

        const elapsedContextSeconds =
            context.currentTime - startedAtContextTimeRef.current;

        const playbackSeconds = elapsedContextSeconds * currentEffectiveRateRef.current;
        const nextOffset = startedOffsetRef.current + playbackSeconds;

        return clamp(nextOffset, 0, buffer.duration);
    }

    function startPositionTimer() {
        stopPositionTimer();

        timerRef.current = window.setInterval(() => {
            const buffer = audioBufferRef.current;

            if (!buffer || scrubbingRef.current) {
                return;
            }

            const nextOffset = getCurrentOffset();

            setPosition(nextOffset);

            if (nextOffset >= buffer.duration) {
                startedOffsetRef.current = 0;
                startedAtContextTimeRef.current = 0;
                setPosition(0);
                setPlayingState(false);
                stopPositionTimer();
                stopVisualizer();
            }
        }, 120);
    }

    function stopActiveSource() {
        const source = activeSourceRef.current;

        if (!source) return;

        try {
            source.onended = null;
            source.stop();
        } catch {
            // Safe to ignore.
        }

        try {
            source.disconnect();
        } catch {
            // Safe to ignore.
        }

        activeSourceRef.current = null;
    }

    function stopPlayback(resetToBeginning = true) {
        manualStopRef.current = true;
        stopActiveSource();
        stopPositionTimer();
        stopVisualizer();
        setPlayingState(false);

        if (resetToBeginning) {
            startedOffsetRef.current = 0;
            startedAtContextTimeRef.current = 0;
            setPosition(0);
        }
    }

    function resetDecodedState() {
        stopPlayback(true);
        stopVisualizer();
        clearVisualizerCanvases();

        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }

        audioBufferRef.current = null;
        lastDecodedArrayBufferRef.current = null;
        lastDecodedMetadataRef.current = null;
        activeSourceRef.current = null;
        liveNodesRef.current = null;
        analyserRef.current = null;
        monitorMuteGainRef.current = null;
        waveformDataRef.current = null;
        frequencyDataRef.current = null;

        startedOffsetRef.current = 0;
        startedAtContextTimeRef.current = 0;
        currentEffectiveRateRef.current = getEffectivePlaybackRate(
            latestSettingsRef.current
        );

        scrubbingRef.current = false;
        wasPlayingBeforeScrubRef.current = false;

        setIsScrubbing(false);
        setBufferReady(false);
        setPosition(0);
        setDuration(0);
        setMixerEnabled(false);
        setMediaInfo("");
    }

    async function prepareDecodedBuffer(arrayBuffer, metadata) {
        const decodedBuffer = await decodeAudioBufferFromArrayBuffer(
            arrayBuffer,
            metadata
        );

        const byteDescription = describeMediaBytes(arrayBuffer);

        audioBufferRef.current = decodedBuffer;
        lastDecodedArrayBufferRef.current = arrayBuffer;
        lastDecodedMetadataRef.current = metadata;

        startedOffsetRef.current = 0;
        startedAtContextTimeRef.current = 0;
        currentEffectiveRateRef.current = getEffectivePlaybackRate(
            latestSettingsRef.current
        );

        setBufferReady(true);
        setPosition(0);
        setDuration(decodedBuffer.duration);
        setMixerEnabled(false);
        setMediaInfo(
            `${byteDescription} • ${decodedBuffer.numberOfChannels} channel(s) • ${decodedBuffer.sampleRate} Hz • ${formatTime(decodedBuffer.duration)}`
        );

        return decodedBuffer;
    }

    async function handleFileSelect(file) {
        try {
            setIsLoading(true);
            resetDecodedState();
            clearObjectUrl();

            const objectUrl = URL.createObjectURL(file);
            objectUrlRef.current = objectUrl;

            setInputFile(file);
            setSourceKind("file");
            setSourceUrl(objectUrl);

            const { arrayBuffer, metadata } = await readFileMediaArrayBuffer(file);
            const decodedBuffer = await prepareDecodedBuffer(arrayBuffer, metadata);

            setInfo(
                `Loaded ${file.name}. Browser decoded ${formatTime(
                    decodedBuffer.duration
                )}.`
            );
        } catch (error) {
            setError(error?.message || "Could not decode this media file.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleLoadDirectLink() {
        try {
            setIsLoading(true);
            resetDecodedState();
            clearObjectUrl();

            const cleanLink = validateDirectMediaUrl(directLink);

            setInputFile(null);
            setSourceKind("url");
            setSourceUrl(cleanLink);

            const { arrayBuffer, metadata } = await fetchDirectMediaArrayBuffer(cleanLink);
            const decodedBuffer = await prepareDecodedBuffer(arrayBuffer, metadata);

            setInfo(
                `Loaded direct media link. Browser decoded ${formatTime(
                    decodedBuffer.duration
                )}.`
            );
        } catch (error) {
            setError(error?.message || "Could not load that direct media link.");
        } finally {
            setIsLoading(false);
        }
    }

    function handleClearMedia() {
        resetDecodedState();
        clearObjectUrl();

        setInputFile(null);
        setSourceUrl("");
        setSourceKind("");
        setDirectLink("");

        setInfo("Media cleared. Upload a new file or paste a direct media link.");
    }

    function ensureLiveGraph() {
        const AudioContextClass = getAudioContextClass();

        if (!AudioContextClass) {
            throw new Error("This browser does not support the Web Audio API.");
        }

        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContextClass();
        }

        const context = audioContextRef.current;

        if (!liveNodesRef.current) {
            const analyser = context.createAnalyser();
            analyser.fftSize = 2048;
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;
            analyser.smoothingTimeConstant = 0.86;

            const monitorMuteGain = context.createGain();

            setAudioParam(
                monitorMuteGain.gain,
                mutedRef.current ? 0 : 1,
                context.currentTime
            );

            analyser.connect(monitorMuteGain);
            monitorMuteGain.connect(context.destination);

            const nodes = createProcessingGraph(
                context,
                analyser,
                latestSettingsRef.current
            );

            analyserRef.current = analyser;
            monitorMuteGainRef.current = monitorMuteGain;
            liveNodesRef.current = nodes;
        }

        applySettingsToNodes(
            liveNodesRef.current,
            latestSettingsRef.current,
            context.currentTime
        );

        applyMonitorMute(mutedRef.current);

        return {
            context,
            nodes: liveNodesRef.current,
        };
    }

    async function startBufferPlayback(resetToBeginning = false) {
        const buffer = audioBufferRef.current;

        if (!buffer) {
            setError("Load and decode a media source before playback.");
            return;
        }

        try {
            const { context, nodes } = ensureLiveGraph();

            if (context.state !== "running") {
                await context.resume();
            }

            manualStopRef.current = false;
            stopActiveSource();

            let safeOffset = resetToBeginning ? 0 : startedOffsetRef.current;
            safeOffset = clamp(safeOffset, 0, buffer.duration);

            if (safeOffset >= buffer.duration) {
                safeOffset = 0;
            }

            const source = context.createBufferSource();
            source.buffer = buffer;

            applySourcePlaybackSettings(
                source,
                latestSettingsRef.current,
                context.currentTime
            );

            source.connect(nodes.baseVolumeGain);

            activeSourceRef.current = source;
            startedOffsetRef.current = safeOffset;
            startedAtContextTimeRef.current = context.currentTime;
            currentEffectiveRateRef.current = getEffectivePlaybackRate(
                latestSettingsRef.current
            );

            source.onended = () => {
                if (manualStopRef.current) return;

                activeSourceRef.current = null;
                startedOffsetRef.current = 0;
                startedAtContextTimeRef.current = 0;

                setPosition(0);
                setPlayingState(false);
                stopPositionTimer();
                stopVisualizer();
                setInfo("Playback finished. Press Play to create a new buffer source.");
            };

            source.start(0, safeOffset);

            setMixerEnabled(true);
            setPlayingState(true);
            startPositionTimer();
            startVisualizer();

            setInfo(
                "Playing through full WebAudio graph with visualizer, panning, delay, and convolution reverb."
            );
        } catch (error) {
            setError(
                `Could not start playback. ${
                    error?.message || "The browser blocked the audio graph."
                }`
            );
        }
    }

    function pausePlayback() {
        if (!playingRef.current) return;

        const nextOffset = getCurrentOffset();

        manualStopRef.current = true;
        stopActiveSource();

        startedOffsetRef.current = nextOffset;
        startedAtContextTimeRef.current = 0;

        setPosition(nextOffset);
        setPlayingState(false);
        stopPositionTimer();
        stopVisualizer();

        setInfo("Playback paused. Press Play to create a new source from this position.");
    }

    async function handlePlayPause() {
        if (playingRef.current) {
            pausePlayback();
            return;
        }

        await startBufferPlayback(false);
    }

    async function restartPlayback() {
        stopPlayback(true);
        await startBufferPlayback(true);
    }

    async function seekTo(seconds, shouldResume) {
        const buffer = audioBufferRef.current;

        if (!buffer) return;

        const nextOffset = clamp(numberOrDefault(seconds, 0), 0, buffer.duration);

        manualStopRef.current = true;
        stopActiveSource();
        stopPositionTimer();
        stopVisualizer();

        startedOffsetRef.current = nextOffset;
        startedAtContextTimeRef.current = 0;

        setPosition(nextOffset);
        setPlayingState(false);

        if (shouldResume && nextOffset < buffer.duration) {
            await startBufferPlayback(false);
            setInfo(`Scrubbed to ${formatTime(nextOffset)} and resumed playback.`);
        } else {
            setInfo(`Scrubbed to ${formatTime(nextOffset)}.`);
        }
    }

    function handleScrubStart() {
        if (!hasMedia || isRendering || isLoading) return;

        const currentOffset = getCurrentOffset();

        wasPlayingBeforeScrubRef.current = playingRef.current;
        scrubbingRef.current = true;

        manualStopRef.current = true;
        stopActiveSource();
        stopPositionTimer();
        stopVisualizer();

        startedOffsetRef.current = currentOffset;
        startedAtContextTimeRef.current = 0;

        setPosition(currentOffset);
        setPlayingState(false);
        setIsScrubbing(true);
    }

    function handleScrubChange(_, nextValue) {
        const buffer = audioBufferRef.current;

        if (!buffer) return;

        const cleanValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
        const nextOffset = clamp(numberOrDefault(cleanValue, 0), 0, buffer.duration);

        scrubbingRef.current = true;
        setIsScrubbing(true);
        setPosition(nextOffset);
    }

    async function handleScrubCommit(_, nextValue) {
        const buffer = audioBufferRef.current;

        if (!buffer) return;

        const shouldResume = wasPlayingBeforeScrubRef.current;
        const cleanValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
        const nextOffset = clamp(numberOrDefault(cleanValue, 0), 0, buffer.duration);

        scrubbingRef.current = false;
        wasPlayingBeforeScrubRef.current = false;

        setIsScrubbing(false);

        await seekTo(nextOffset, shouldResume);
    }

    function updateSetting(key, value) {
        const cleanValue = Number(value);

        if (!Number.isFinite(cleanValue)) return;

        setSettings((previous) => {
            const nextSettings = normalizeSettings({
                ...previous,
                [key]: cleanValue,
            });

            latestSettingsRef.current = nextSettings;

            const isSourceRateControl =
                key === "speed" || key === "pitchSemitones";

            if (
                isSourceRateControl &&
                playingRef.current &&
                activeSourceRef.current &&
                audioContextRef.current
            ) {
                const context = audioContextRef.current;
                const currentOffset = getCurrentOffset();

                startedOffsetRef.current = currentOffset;
                startedAtContextTimeRef.current = context.currentTime;
                currentEffectiveRateRef.current =
                    getEffectivePlaybackRate(nextSettings);

                applySourcePlaybackSettings(
                    activeSourceRef.current,
                    nextSettings,
                    context.currentTime
                );

                setPosition(currentOffset);
            } else if (isSourceRateControl) {
                currentEffectiveRateRef.current =
                    getEffectivePlaybackRate(nextSettings);
            }

            if (liveNodesRef.current && audioContextRef.current) {
                applySettingsToNodes(
                    liveNodesRef.current,
                    nextSettings,
                    audioContextRef.current.currentTime
                );
            }

            return nextSettings;
        });
    }

    function resetMixer() {
        const currentOffset = playingRef.current ? getCurrentOffset() : position;

        latestSettingsRef.current = DEFAULT_SETTINGS;
        currentEffectiveRateRef.current = getEffectivePlaybackRate(DEFAULT_SETTINGS);

        if (playingRef.current && activeSourceRef.current && audioContextRef.current) {
            const context = audioContextRef.current;

            startedOffsetRef.current = currentOffset;
            startedAtContextTimeRef.current = context.currentTime;

            applySourcePlaybackSettings(
                activeSourceRef.current,
                DEFAULT_SETTINGS,
                context.currentTime
            );

            setPosition(currentOffset);
        }

        setSettings(DEFAULT_SETTINGS);

        if (liveNodesRef.current && audioContextRef.current) {
            applySettingsToNodes(
                liveNodesRef.current,
                DEFAULT_SETTINGS,
                audioContextRef.current.currentTime
            );
        }

        setInfo("Mixer settings reset. Visualizer remains connected to the processed signal.");
    }

    async function loadSourceArrayBuffer() {
        if (lastDecodedArrayBufferRef.current) {
            return {
                arrayBuffer: lastDecodedArrayBufferRef.current,
                metadata: lastDecodedMetadataRef.current || {},
            };
        }

        if (sourceKind === "file" && inputFile) {
            return readFileMediaArrayBuffer(inputFile);
        }

        if (sourceKind === "url" && sourceUrl) {
            return fetchDirectMediaArrayBuffer(sourceUrl);
        }

        throw new Error("No media source loaded.");
    }

    async function renderMixedFile() {
        if (!sourceUrl && !inputFile) {
            setError("Load a media file or direct media link before rendering.");
            return;
        }

        setIsRendering(true);
        setInfo(
            "Rendering with ClarityChain, Demudder, De-Esser, panning, delay, reverb, speed, pitch, EQ, compression, and gain..."
        );

        try {
            let decodedBuffer = audioBufferRef.current;

            if (!decodedBuffer) {
                const { arrayBuffer, metadata } = await loadSourceArrayBuffer();
                decodedBuffer = await decodeAudioBufferFromArrayBuffer(
                    arrayBuffer,
                    metadata
                );
                audioBufferRef.current = decodedBuffer;
            }

            const renderSettings = normalizeSettings(latestSettingsRef.current);
            const renderEffectiveRate = getEffectivePlaybackRate(renderSettings);
            const delayTail = renderSettings.delayMix > 0 ? 2 : 0;
            const reverbTail =
                renderSettings.reverbMix > 0 ? renderSettings.reverbSeconds : 0;

            const offlineLength = Math.max(
                1,
                Math.ceil(
                    decodedBuffer.length / renderEffectiveRate +
                    decodedBuffer.sampleRate * Math.max(delayTail, reverbTail)
                )
            );

            const OfflineAudioContextClass = getOfflineAudioContextClass();

            if (!OfflineAudioContextClass) {
                throw new Error("This browser does not support OfflineAudioContext.");
            }

            const offlineContext = new OfflineAudioContextClass(
                decodedBuffer.numberOfChannels,
                offlineLength,
                decodedBuffer.sampleRate
            );

            const source = offlineContext.createBufferSource();
            source.buffer = decodedBuffer;

            applySourcePlaybackSettings(
                source,
                renderSettings,
                offlineContext.currentTime || 0
            );

            const offlineNodes = createProcessingGraph(
                offlineContext,
                offlineContext.destination,
                renderSettings
            );

            source.connect(offlineNodes.baseVolumeGain);
            source.start(0);

            const renderedBuffer = await offlineContext.startRendering();
            const wavBlob = audioBufferToWavBlob(renderedBuffer);

            const downloadUrl = URL.createObjectURL(wavBlob);
            const anchor = document.createElement("a");

            anchor.href = downloadUrl;
            anchor.download = getDownloadName(sourceKind, inputFile);

            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();

            setTimeout(() => {
                URL.revokeObjectURL(downloadUrl);
            }, 1000);

            setInfo(
                "Rendered WAV downloaded with panning, delay, convolution reverb, and all mixer effects baked in."
            );
        } catch (error) {
            setError(error?.message || "Render failed.");
        } finally {
            setIsRendering(false);
        }
    }

    return (
        <PageShell>
            <Helmet>
                <title>Audio Tool | WebAudio Mixer, Visualizer & WAV Renderer</title>
                <meta
                    name="description"
                    content="Use AudioMaster Lab's WebAudio tool to decode audio files, preview a live processing graph, visualize the waveform and frequency spectrum, apply EQ, compression, panning, delay, convolution reverb, de-essing, and export a processed WAV file."
                />
                <meta
                    name="keywords"
                    content="WebAudio mixer, audio visualizer, waveform visualizer, frequency spectrum, online audio mastering, WAV renderer, EQ, compressor, de-esser, delay, reverb"
                />
                <link rel="canonical" href="https://audiomasterlab.com/audio" />

                <meta
                    property="og:title"
                    content="AudioMaster Lab Audio Tool | WebAudio Mixer & WAV Renderer"
                />
                <meta
                    property="og:description"
                    content="Process audio in the browser with a live WebAudio graph, waveform and frequency visualizers, EQ, compression, panning, delay, reverb, de-essing, and WAV export."
                />
                <meta property="og:url" content="https://audiomasterlab.com/audio" />
                <meta
                    property="og:image"
                    content="https://audiomasterlab.com/social-preview.png"
                />

                <meta
                    name="twitter:title"
                    content="AudioMaster Lab Audio Tool | WebAudio Mixer & WAV Renderer"
                />
                <meta
                    name="twitter:description"
                    content="Master audio in the browser with WebAudio effects, visualizers, and WAV export."
                />
                <meta
                    name="twitter:image"
                    content="https://audiomasterlab.com/social-preview.png"
                />

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebApplication",
                        name: "AudioMaster Lab Audio Tool",
                        applicationCategory: "MultimediaApplication",
                        operatingSystem: "Web Browser",
                        url: "https://audiomasterlab.com/audio",
                        description:
                            "A browser-based WebAudio mixer and renderer with waveform visualization, frequency spectrum visualization, EQ, compression, panning, delay, reverb, de-essing, and WAV export.",
                        featureList: [
                            "Audio file decoding",
                            "Live WebAudio graph",
                            "Waveform visualizer",
                            "Frequency spectrum visualizer",
                            "Base volume control",
                            "Stereo panning",
                            "Convolution reverb",
                            "Delay and feedback",
                            "EQ filters",
                            "Compression",
                            "De-essing",
                            "WAV export",
                        ],
                    })}
                </script>
            </Helmet>
            <Stack spacing={4}>
                <SectionTitle
                    eyebrow="Audio tool"
                    title="Advanced WebAudio mixer, visualizer, and renderer"
                    description="Decode audio/video containers into an AudioBuffer, visualize the processed signal, scrub the full duration, add clarity, demud, de-essing, panning, convolution reverb, delay, EQ, compression, speed, pitch, and render the processed result to WAV."
                />

                <GlassCard>
                    <Stack spacing={2.75}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: 2,
                                flexWrap: "wrap",
                                minWidth: 0,
                            }}
                        >
                            <Box sx={{ minWidth: 0, flex: "1 1 520px" }}>
                                <Stack
                                    direction="row"
                                    spacing={1.25}
                                    alignItems="center"
                                    sx={{ minWidth: 0, mb: 0.75 }}
                                >
                                    <Box
                                        sx={{
                                            width: 42,
                                            height: 42,
                                            flex: "0 0 auto",
                                            borderRadius: 3,
                                            display: "grid",
                                            placeItems: "center",
                                            background:
                                                "linear-gradient(135deg, rgba(103,232,249,0.2), rgba(167,139,250,0.18))",
                                            border: "1px solid rgba(255,255,255,0.12)",
                                            color: "#67e8f9",
                                        }}
                                    >
                                        <GraphicEqRoundedIcon />
                                    </Box>

                                    <Typography
                                        variant="h5"
                                        sx={{
                                            fontWeight: 950,
                                            lineHeight: 1.15,
                                            whiteSpace: "normal",
                                            overflow: "visible",
                                            textOverflow: "unset",
                                            wordBreak: "break-word",
                                            minWidth: 0,
                                        }}
                                    >
                                        Live full-width visualizer
                                    </Typography>
                                </Stack>

                                <Typography
                                    sx={{
                                        color: "rgba(255,255,255,0.62)",
                                        lineHeight: 1.65,
                                        maxWidth: 980,
                                    }}
                                >
                                    This reads from the final processed AnalyserNode after
                                    ClarityChain, Demudder, De-Esser, EQ, delay, reverb, panning,
                                    compression, and gain.
                                </Typography>
                            </Box>

                            <Stack
                                direction="row"
                                spacing={1}
                                sx={{
                                    flex: "0 1 auto",
                                    flexWrap: "wrap",
                                    justifyContent: { xs: "flex-start", md: "flex-end" },
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.75,
                                        px: 1.4,
                                        py: 0.8,
                                        borderRadius: 999,
                                        background: "rgba(103,232,249,0.09)",
                                        border: "1px solid rgba(103,232,249,0.18)",
                                        color: "#67e8f9",
                                        fontSize: 12,
                                        fontWeight: 900,
                                        letterSpacing: 0.3,
                                    }}
                                >
                                    <EqualizerRoundedIcon sx={{ fontSize: 18 }} />
                                    processed analyser
                                </Box>

                                <Box
                                    sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.75,
                                        px: 1.4,
                                        py: 0.8,
                                        borderRadius: 999,
                                        background: "rgba(167,139,250,0.09)",
                                        border: "1px solid rgba(167,139,250,0.18)",
                                        color: "#c4b5fd",
                                        fontSize: 12,
                                        fontWeight: 900,
                                        letterSpacing: 0.3,
                                    }}
                                >
                                    <TuneRoundedIcon sx={{ fontSize: 18 }} />
                                    live graph
                                </Box>
                            </Stack>
                        </Box>

                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                                gap: 2,
                            }}
                        >
                            <Box
                                component="canvas"
                                ref={waveformCanvasRef}
                                sx={{
                                    width: "100%",
                                    height: { xs: 180, md: 230 },
                                    display: "block",
                                    borderRadius: 4,
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    background: "rgba(7,10,19,0.96)",
                                }}
                            />

                            <Box
                                component="canvas"
                                ref={frequencyCanvasRef}
                                sx={{
                                    width: "100%",
                                    height: { xs: 180, md: 230 },
                                    display: "block",
                                    borderRadius: 4,
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    background: "rgba(7,10,19,0.96)",
                                }}
                            />
                        </Box>
                    </Stack>
                </GlassCard>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", lg: "0.82fr 1.18fr" },
                        gap: 3,
                        alignItems: "start",
                    }}
                >
                    <Stack spacing={3}>
                        <MediaInputForm
                            fileName={inputFile?.name || ""}
                            linkValue={directLink}
                            onLinkChange={setDirectLink}
                            onFileSelect={handleFileSelect}
                            onLoadLink={handleLoadDirectLink}
                            onClear={handleClearMedia}
                            disabled={isRendering || isLoading}
                        />

                        <GlassCard>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.5 }}>
                                        Buffer player
                                    </Typography>
                                    <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
                                        Playback uses fresh AudioBufferSourceNodes so scrubbing,
                                        speed, pitch, panning, delay, and reverb stay stable.
                                    </Typography>
                                </Box>

                                {!hasMedia && (
                                    <Box
                                        sx={{
                                            borderRadius: 4,
                                            p: 3,
                                            textAlign: "center",
                                            border: "1px dashed rgba(255,255,255,0.18)",
                                            color: "rgba(255,255,255,0.62)",
                                        }}
                                    >
                                        {isLoading
                                            ? "Loading, sniffing, and decoding media..."
                                            : "No decoded media loaded yet."}
                                    </Box>
                                )}

                                {hasMedia && (
                                    <Box
                                        sx={{
                                            borderRadius: 4,
                                            p: 2.5,
                                            background:
                                                "linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
                                            border: "1px solid rgba(255,255,255,0.11)",
                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                                        }}
                                    >
                                        <Stack spacing={1.75}>
                                            <Box
                                                sx={{
                                                    display: "grid",
                                                    gridTemplateColumns: {
                                                        xs: "1fr",
                                                        md: "minmax(0, 1fr) 330px",
                                                    },
                                                    gap: 2,
                                                    alignItems: "center",
                                                }}
                                            >
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        spacing={1.15}
                                                        sx={{ mb: 0.9, minWidth: 0 }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 38,
                                                                height: 38,
                                                                borderRadius: 3,
                                                                display: "grid",
                                                                placeItems: "center",
                                                                flex: "0 0 auto",
                                                                color: "#67e8f9",
                                                                background:
                                                                    "linear-gradient(135deg, rgba(103,232,249,0.18), rgba(167,139,250,0.14))",
                                                                border: "1px solid rgba(255,255,255,0.11)",
                                                            }}
                                                        >
                                                            <AudioFileRoundedIcon sx={{ fontSize: 22 }} />
                                                        </Box>

                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: "rgba(255,255,255,0.5)",
                                                                    fontWeight: 900,
                                                                    textTransform: "uppercase",
                                                                    letterSpacing: 0.8,
                                                                    display: "block",
                                                                    mb: 0.15,
                                                                }}
                                                            >
                                                                Current audio
                                                            </Typography>

                                                            <Typography
                                                                sx={{
                                                                    color: "rgba(255,255,255,0.94)",
                                                                    fontWeight: 950,
                                                                    lineHeight: 1.25,
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    whiteSpace: "nowrap",
                                                                }}
                                                                title={mediaTitle}
                                                            >
                                                                {mediaTitle}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>

                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        justifyContent="space-between"
                                                        spacing={1.5}
                                                        sx={{ minWidth: 0 }}
                                                    >
                                                        <Typography
                                                            sx={{
                                                                fontWeight: 900,
                                                                color: "rgba(255,255,255,0.82)",
                                                            }}
                                                        >
                                                            {isScrubbing
                                                                ? "Scrubbing"
                                                                : isPlaying
                                                                    ? isMuted
                                                                        ? "Playing muted preview"
                                                                        : "Playing processed buffer"
                                                                    : "Ready"}
                                                        </Typography>

                                                        <Typography
                                                            sx={{
                                                                color: "#67e8f9",
                                                                fontWeight: 950,
                                                                flex: "0 0 auto",
                                                                fontVariantNumeric: "tabular-nums",
                                                            }}
                                                        >
                                                            {formatTime(position)} / {formatTime(duration)}
                                                        </Typography>
                                                    </Stack>

                                                    {mediaInfo && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: "rgba(255,255,255,0.6)",
                                                                display: "block",
                                                                lineHeight: 1.5,
                                                                mt: 0.4,
                                                            }}
                                                        >
                                                            {mediaInfo}
                                                        </Typography>
                                                    )}
                                                </Box>

                                                <Box
                                                    sx={{
                                                        borderRadius: 3.5,
                                                        px: 1.75,
                                                        py: 1.35,
                                                        background:
                                                            "linear-gradient(135deg, rgba(7,10,19,0.76), rgba(15,23,42,0.56))",
                                                        border: "1px solid rgba(255,255,255,0.11)",
                                                        boxShadow:
                                                            "0 14px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
                                                    }}
                                                >
                                                    <Stack spacing={0.8}>
                                                        <Stack
                                                            direction="row"
                                                            alignItems="center"
                                                            justifyContent="space-between"
                                                            spacing={1}
                                                        >
                                                            <Stack direction="row" alignItems="center" spacing={0.8}>
                                                                <VolumeUpRoundedIcon
                                                                    sx={{
                                                                        fontSize: 19,
                                                                        color: "#67e8f9",
                                                                    }}
                                                                />
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        color: "rgba(255,255,255,0.86)",
                                                                        fontWeight: 950,
                                                                        textTransform: "uppercase",
                                                                        letterSpacing: 0.8,
                                                                    }}
                                                                >
                                                                    Base volume
                                                                </Typography>
                                                            </Stack>

                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: "#67e8f9",
                                                                    fontWeight: 950,
                                                                    fontVariantNumeric: "tabular-nums",
                                                                }}
                                                            >
                                                                {settingsView.baseVolume.toFixed(2)}x
                                                            </Typography>
                                                        </Stack>

                                                        <Stack direction="row" alignItems="center" spacing={1.15}>
                                                            <VolumeDownRoundedIcon
                                                                sx={{
                                                                    fontSize: 18,
                                                                    color: "rgba(255,255,255,0.5)",
                                                                    flex: "0 0 auto",
                                                                }}
                                                            />

                                                            <Slider
                                                                value={settingsView.baseVolume}
                                                                min={0}
                                                                max={2}
                                                                step={0.01}
                                                                disabled={isRendering || isLoading}
                                                                onChange={(_, value) =>
                                                                    updateSetting(
                                                                        "baseVolume",
                                                                        Array.isArray(value) ? value[0] : value
                                                                    )
                                                                }
                                                                valueLabelDisplay="auto"
                                                                valueLabelFormat={(value) =>
                                                                    `${Number(value).toFixed(2)}x`
                                                                }
                                                                sx={{
                                                                    color: "#67e8f9",
                                                                    py: 0,
                                                                    "& .MuiSlider-thumb": {
                                                                        width: 16,
                                                                        height: 16,
                                                                        boxShadow:
                                                                            "0 0 0 7px rgba(103,232,249,0.08)",
                                                                    },
                                                                    "& .MuiSlider-rail": {
                                                                        color: "rgba(255,255,255,0.18)",
                                                                    },
                                                                    "& .MuiSlider-track": {
                                                                        border: "none",
                                                                    },
                                                                }}
                                                            />

                                                            <VolumeUpRoundedIcon
                                                                sx={{
                                                                    fontSize: 18,
                                                                    color: "rgba(255,255,255,0.68)",
                                                                    flex: "0 0 auto",
                                                                }}
                                                            />
                                                        </Stack>
                                                    </Stack>
                                                </Box>
                                            </Box>

                                            <Slider
                                                value={clamp(position, 0, duration || 0)}
                                                min={0}
                                                max={duration || 0}
                                                step={0.01}
                                                disabled={!hasMedia || isRendering || isLoading}
                                                onMouseDown={handleScrubStart}
                                                onTouchStart={handleScrubStart}
                                                onChange={handleScrubChange}
                                                onChangeCommitted={handleScrubCommit}
                                                valueLabelDisplay="auto"
                                                valueLabelFormat={(value) => formatTime(value)}
                                                sx={{
                                                    color: "#67e8f9",
                                                    "& .MuiSlider-thumb": {
                                                        boxShadow: "0 0 0 8px rgba(103,232,249,0.08)",
                                                    },
                                                    "& .MuiSlider-rail": {
                                                        color: "rgba(255,255,255,0.18)",
                                                    },
                                                }}
                                            />

                                            <LinearProgress
                                                variant="determinate"
                                                value={progressValue}
                                                sx={{
                                                    height: 10,
                                                    borderRadius: 999,
                                                    background: "rgba(255,255,255,0.12)",
                                                    "& .MuiLinearProgress-bar": {
                                                        background:
                                                            "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                                    },
                                                }}
                                            />

                                            <Typography
                                                variant="caption"
                                                sx={{ color: "rgba(255,255,255,0.58)" }}
                                            >
                                                pan = {settingsView.pan.toFixed(2)} | delay ={" "}
                                                {settingsView.delayMix.toFixed(2)} | reverb ={" "}
                                                {settingsView.reverbMix.toFixed(2)} | playbackRate ={" "}
                                                {settingsView.speed.toFixed(2)}x | detune ={" "}
                                                {pitchCents.toFixed(0)} cents | effective rate ={" "}
                                                {effectiveRate.toFixed(2)}x
                                            </Typography>
                                        </Stack>
                                    </Box>
                                )}

                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                    <Button
                                        fullWidth
                                        size="large"
                                        variant="contained"
                                        startIcon={<PlayArrowRoundedIcon />}
                                        onClick={handlePlayPause}
                                        disabled={!hasMedia || isRendering || isLoading}
                                        sx={{
                                            borderRadius: 4,
                                            py: 1.35,
                                            fontWeight: 950,
                                            color: "#06111e",
                                            background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                        }}
                                    >
                                        {isPlaying ? "Pause playback" : "Play processed audio"}
                                    </Button>

                                    <Button
                                        fullWidth
                                        size="large"
                                        variant="outlined"
                                        startIcon={<RestartAltRoundedIcon />}
                                        onClick={restartPlayback}
                                        disabled={!hasMedia || isRendering || isLoading}
                                        sx={{
                                            borderRadius: 4,
                                            py: 1.35,
                                            color: "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 950,
                                        }}
                                    >
                                        Restart
                                    </Button>
                                </Stack>

                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                    <Button
                                        fullWidth
                                        size="large"
                                        variant={isMuted ? "contained" : "outlined"}
                                        startIcon={
                                            isMuted ? (
                                                <VolumeUpRoundedIcon />
                                            ) : (
                                                <VolumeOffRoundedIcon />
                                            )
                                        }
                                        onClick={toggleMute}
                                        disabled={isRendering || isLoading}
                                        sx={{
                                            borderRadius: 4,
                                            py: 1.25,
                                            color: isMuted ? "#06111e" : "#fff",
                                            borderColor: "rgba(255,255,255,0.18)",
                                            fontWeight: 950,
                                            background: isMuted
                                                ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                : "transparent",
                                        }}
                                    >
                                        {isMuted ? "Unmute preview" : "Mute preview"}
                                    </Button>

                                    <Button
                                        fullWidth
                                        variant="text"
                                        onClick={() => stopPlayback(true)}
                                        disabled={!hasMedia || isRendering || isLoading}
                                        sx={{
                                            color: "rgba(255,255,255,0.72)",
                                            fontWeight: 900,
                                        }}
                                    >
                                        Stop and reset position
                                    </Button>
                                </Stack>

                                <StatusBanner status={status} tone={statusTone} />

                                {(isRendering || isLoading) && (
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
                    </Stack>

                    <GlassCard>
                        <Stack spacing={3}>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.5 }}>
                                    WebAudio mixer
                                </Typography>
                                <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
                                    Processing controls feed the same graph used for preview,
                                    visualization, and WAV export. Base volume is inside the Buffer
                                    player panel beside the duration readout.
                                </Typography>
                            </Box>

                            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                    gap: 2.5,
                                }}
                            >
                                <ControlSlider
                                    label="Stereo pan"
                                    value={settingsView.pan}
                                    min={-1}
                                    max={1}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("pan", value)}
                                />

                                <ControlSlider
                                    label="Convolution reverb"
                                    value={settingsView.reverbMix}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("reverbMix", value)}
                                />

                                <ControlSlider
                                    label="Reverb size"
                                    value={settingsView.reverbSeconds}
                                    min={0.15}
                                    max={6}
                                    step={0.05}
                                    unit=" sec"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("reverbSeconds", value)}
                                />

                                <ControlSlider
                                    label="Delay mix"
                                    value={settingsView.delayMix}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("delayMix", value)}
                                />

                                <ControlSlider
                                    label="Delay time"
                                    value={settingsView.delayTime}
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    unit=" sec"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("delayTime", value)}
                                />

                                <ControlSlider
                                    label="Delay feedback"
                                    value={settingsView.delayFeedback}
                                    min={0}
                                    max={0.88}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("delayFeedback", value)}
                                />

                                <ControlSlider
                                    label="ClarityChain"
                                    value={settingsView.clarityAmount}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("clarityAmount", value)}
                                />

                                <ControlSlider
                                    label="Demudder"
                                    value={settingsView.demudAmount}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("demudAmount", value)}
                                />

                                <ControlSlider
                                    label="De-esser"
                                    value={settingsView.deEssAmount}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    unit=""
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("deEssAmount", value)}
                                />

                                <ControlSlider
                                    label="De-ess frequency"
                                    value={settingsView.deEssFrequency}
                                    min={4000}
                                    max={11000}
                                    step={100}
                                    unit=" Hz"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("deEssFrequency", value)}
                                />

                                <ControlSlider
                                    label="Low EQ"
                                    value={settingsView.lowGain}
                                    min={-18}
                                    max={18}
                                    step={0.5}
                                    unit=" dB"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("lowGain", value)}
                                />

                                <ControlSlider
                                    label="Mid EQ"
                                    value={settingsView.midGain}
                                    min={-18}
                                    max={18}
                                    step={0.5}
                                    unit=" dB"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("midGain", value)}
                                />

                                <ControlSlider
                                    label="High EQ"
                                    value={settingsView.highGain}
                                    min={-18}
                                    max={18}
                                    step={0.5}
                                    unit=" dB"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("highGain", value)}
                                />

                                <ControlSlider
                                    label="High-pass filter"
                                    value={settingsView.highPass}
                                    min={20}
                                    max={1000}
                                    step={5}
                                    unit=" Hz"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("highPass", value)}
                                />

                                <ControlSlider
                                    label="Low-pass filter"
                                    value={settingsView.lowPass}
                                    min={2000}
                                    max={20000}
                                    step={100}
                                    unit=" Hz"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("lowPass", value)}
                                />

                                <ControlSlider
                                    label="Speed playbackRate"
                                    value={settingsView.speed}
                                    min={0.5}
                                    max={2}
                                    step={0.01}
                                    unit="x"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("speed", value)}
                                />

                                <ControlSlider
                                    label="Pitch detune"
                                    value={settingsView.pitchSemitones}
                                    min={-12}
                                    max={12}
                                    step={0.1}
                                    unit=" st"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("pitchSemitones", value)}
                                />

                                <ControlSlider
                                    label="Compressor threshold"
                                    value={settingsView.compressorThreshold}
                                    min={-60}
                                    max={0}
                                    step={1}
                                    unit=" dB"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) =>
                                        updateSetting("compressorThreshold", value)
                                    }
                                />

                                <ControlSlider
                                    label="Compressor ratio"
                                    value={settingsView.compressorRatio}
                                    min={1}
                                    max={20}
                                    step={0.5}
                                    unit=":1"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("compressorRatio", value)}
                                />

                                <ControlSlider
                                    label="Output gain"
                                    value={settingsView.outputGain}
                                    min={-24}
                                    max={12}
                                    step={0.5}
                                    unit=" dB"
                                    disabled={isRendering || isLoading}
                                    onChange={(value) => updateSetting("outputGain", value)}
                                />
                            </Box>

                            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                            <RenderButton
                                onClick={renderMixedFile}
                                disabled={!hasMedia || isRendering || isLoading}
                                rendering={isRendering}
                            />

                            <Button
                                variant="outlined"
                                onClick={resetMixer}
                                disabled={isRendering || isLoading}
                                sx={{
                                    borderRadius: 4,
                                    py: 1.2,
                                    color: "#fff",
                                    borderColor: "rgba(255,255,255,0.18)",
                                    fontWeight: 950,
                                }}
                            >
                                Reset mixer settings
                            </Button>

                            <Typography
                                variant="caption"
                                sx={{ color: "rgba(255,255,255,0.52)", lineHeight: 1.6 }}
                            >
                                Best support: MP3, WAV, OGG/Opus, WebM audio/video, M4A, and MP4
                                with a browser-supported audio codec. HLS/DASH manifests, DRM
                                streams, and normal streaming pages are not direct decodable files.
                            </Typography>

                            {mixerEnabled && (
                                <Typography
                                    variant="caption"
                                    sx={{ color: "#67e8f9", fontWeight: 800 }}
                                >
                                    Live buffer mixer active. The visualizer is reading from the
                                    processed AnalyserNode.
                                </Typography>
                            )}
                        </Stack>
                    </GlassCard>
                </Box>
            </Stack>
        </PageShell>
    );
}