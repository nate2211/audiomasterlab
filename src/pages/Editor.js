import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
    Chip,
    Divider,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import { Helmet } from "react-helmet-async";

import {
    buildDefaultParams,
    clamp,
    EditorHelpPanel,
    EditorStatusBanner,
    EffectInspector,
    EffectToolbox,
    formatTime,
    getEffectDefinition,
    getReadableBytes,
    MediaLoaderPanel,
    ProjectActions,
    TimelineEditor,
    TransportControls,
    WaveformViewer,
} from "../components/Editor-Components.js";
import { PageShell, SectionTitle } from "../components/Components.js";

const INITIAL_STATUS =
    "Upload an audio or video file, draw blocks on the timeline, preview the edit, then render or apply the edited WAV.";

const AUTOSAVE_KEY = "audiomasterlab-editor-autosave-v3";
const MAX_HISTORY = 80;
const MIN_BLOCK_LENGTH = 0.05;

function getAudioContextClass() {
    if (typeof window === "undefined") return null;
    return window.AudioContext || window.webkitAudioContext || null;
}

function getOfflineAudioContextClass() {
    if (typeof window === "undefined") return null;
    return window.OfflineAudioContext || window.webkitOfflineAudioContext || null;
}

function createId() {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }

    return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeNumber(value, fallback) {
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? nextValue : fallback;
}

function dbToGain(db) {
    return Math.pow(10, safeNumber(db, 0) / 20);
}

function cloneBlocks(blocks) {
    return blocks.map((block) => ({
        ...block,
        params: { ...(block.params || {}) },
    }));
}

function blocksEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function makeDistortionCurve(drive = 420) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const amount = clamp(safeNumber(drive, 420), 0, 1200);

    for (let i = 0; i < samples; i += 1) {
        const x = (i * 2) / samples - 1;
        const k = amount || 1;
        curve[i] =
            ((3 + k) * x * 20 * (Math.PI / 180)) /
            (Math.PI + k * Math.abs(x));
    }

    return curve;
}

function createImpulseResponse(context, seconds = 3.8, decay = 4.2) {
    const safeSeconds = clamp(safeNumber(seconds, 3.8), 0.2, 8);
    const safeDecay = clamp(safeNumber(decay, 4.2), 0.5, 8);
    const sampleRate = context.sampleRate || 44100;
    const length = Math.max(1, Math.floor(sampleRate * safeSeconds));
    const impulse = context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const data = impulse.getChannelData(channel);

        for (let i = 0; i < length; i += 1) {
            const progress = i / length;
            const envelope = Math.pow(1 - progress, safeDecay);
            data[i] = (Math.random() * 2 - 1) * envelope;
        }
    }

    return impulse;
}

function getBlockMix(block) {
    const params = block.params || {};

    if (block.type === "silence") {
        return clamp(safeNumber(params.amount, 1), 0, 1);
    }

    if (params.mix === undefined) {
        return 1;
    }

    return clamp(safeNumber(params.mix, 1), 0, 1.5);
}

function getDryDuckAmount(block) {
    const params = block.params || {};

    if (block.type === "silence") {
        return clamp(safeNumber(params.amount, 1), 0, 1);
    }

    if (block.type === "delay" || block.type === "reverb") {
        if (params.dryDuck !== undefined) {
            return clamp(safeNumber(params.dryDuck, 0.25), 0, 1);
        }

        return clamp(getBlockMix(block) * 0.18, 0, 0.4);
    }

    return clamp(getBlockMix(block), 0, 1);
}

function scheduleDryDuck(param, block, playbackOffset) {
    const start = block.start - playbackOffset;
    const end = block.end - playbackOffset;

    if (end <= 0 || end <= start) return;

    const duckAmount = getDryDuckAmount(block);
    const duckLevel = clamp(1 - duckAmount, 0, 1);
    const attack = 0.008;
    const release = 0.018;

    const t0 = Math.max(0, start);
    const t1 = Math.max(t0 + 0.02, end);

    try {
        param.cancelScheduledValues(Math.max(0, t0 - 0.004));
        param.setValueAtTime(1, Math.max(0, t0 - 0.004));
        param.linearRampToValueAtTime(duckLevel, t0 + attack);
        param.setValueAtTime(duckLevel, Math.max(t0 + attack, t1 - release));
        param.linearRampToValueAtTime(1, t1);
    } catch {
        param.value = 1;
    }
}

function makeFadeCurve(type, curveStrength, localOffset, blockDuration, remaining) {
    const steps = 256;
    const curve = new Float32Array(steps);
    const safeCurve = clamp(safeNumber(curveStrength, 1), 0.25, 4);
    const safeDuration = Math.max(0.001, blockDuration);
    const safeRemaining = Math.max(0.001, remaining);

    for (let i = 0; i < steps; i += 1) {
        const localTime =
            localOffset + (i / Math.max(1, steps - 1)) * safeRemaining;
        const progress = clamp(localTime / safeDuration, 0, 1);

        if (type === "fadeout") {
            curve[i] = Math.pow(1 - progress, safeCurve);
        } else {
            curve[i] = Math.pow(progress, safeCurve);
        }
    }

    return curve;
}

function connectInsertEffect({
                                 context,
                                 source,
                                 block,
                                 relativeStart,
                                 localOffset,
                                 blockDuration,
                                 remaining,
                             }) {
    const params = block.params || {};
    let lastNode = source;

    if (block.type === "gain") {
        const gain = context.createGain();
        gain.gain.value = dbToGain(params.gainDb || 0);
        lastNode.connect(gain);
        return gain;
    }

    if (block.type === "fadein" || block.type === "fadeout") {
        const gain = context.createGain();
        const fadeCurve = makeFadeCurve(
            block.type,
            params.curve || 1,
            localOffset,
            blockDuration,
            remaining
        );

        try {
            gain.gain.setValueCurveAtTime(
                fadeCurve,
                Math.max(0, relativeStart),
                Math.max(0.02, remaining)
            );
        } catch {
            gain.gain.value = block.type === "fadeout" ? 1 : 0;
        }

        lastNode.connect(gain);
        return gain;
    }

    if (
        block.type === "highpass" ||
        block.type === "lowpass" ||
        block.type === "peakingeq"
    ) {
        const filter = context.createBiquadFilter();

        if (block.type === "highpass") {
            filter.type = "highpass";
            filter.frequency.value = safeNumber(params.frequency, 950);
            filter.Q.value = safeNumber(params.q, 2.2);
        }

        if (block.type === "lowpass") {
            filter.type = "lowpass";
            filter.frequency.value = safeNumber(params.frequency, 1450);
            filter.Q.value = safeNumber(params.q, 1.8);
        }

        if (block.type === "peakingeq") {
            filter.type = "peaking";
            filter.frequency.value = safeNumber(params.frequency, 3200);
            filter.Q.value = safeNumber(params.q, 5);
            filter.gain.value = safeNumber(params.gainDb, 18);
        }

        lastNode.connect(filter);
        return filter;
    }

    if (block.type === "distortion") {
        const preGain = context.createGain();
        const waveShaper = context.createWaveShaper();
        const tone = context.createBiquadFilter();
        const postGain = context.createGain();

        preGain.gain.value = 1.6;

        waveShaper.curve = makeDistortionCurve(params.drive || 420);
        waveShaper.oversample = "4x";

        tone.type = "lowpass";
        tone.frequency.value = safeNumber(params.tone, 6800);
        tone.Q.value = 0.7;

        postGain.gain.value = dbToGain(params.outputDb ?? -3);

        lastNode.connect(preGain);
        preGain.connect(waveShaper);
        waveShaper.connect(tone);
        tone.connect(postGain);

        return postGain;
    }

    if (block.type === "compressor") {
        const compressor = context.createDynamicsCompressor();
        const makeup = context.createGain();

        compressor.threshold.value = safeNumber(params.threshold, -38);
        compressor.ratio.value = safeNumber(params.ratio, 14);
        compressor.attack.value = safeNumber(params.attack, 0.003);
        compressor.release.value = safeNumber(params.release, 0.38);
        compressor.knee.value = 8;

        makeup.gain.value = dbToGain(params.makeupDb || 9);

        lastNode.connect(compressor);
        compressor.connect(makeup);

        return makeup;
    }

    if (block.type === "pan") {
        if (context.createStereoPanner) {
            const panner = context.createStereoPanner();
            panner.pan.value = clamp(safeNumber(params.pan, 0.85), -1, 1);
            lastNode.connect(panner);
            return panner;
        }

        const fallback = context.createGain();
        fallback.gain.value = 1;
        lastNode.connect(fallback);
        return fallback;
    }

    return lastNode;
}

function connectDelaySend({ context, source, block }) {
    const params = block.params || {};
    const delayNode = context.createDelay(4);
    const feedback = context.createGain();
    const tone = context.createBiquadFilter();

    delayNode.delayTime.value = clamp(safeNumber(params.delayTime, 0.36), 0.02, 2);
    feedback.gain.value = clamp(safeNumber(params.feedback, 0.62), 0, 0.92);

    tone.type = "lowpass";
    tone.frequency.value = 5500;
    tone.Q.value = 0.7;

    source.connect(delayNode);
    delayNode.connect(feedback);
    feedback.connect(tone);
    tone.connect(delayNode);

    return delayNode;
}

function connectReverbSend({ context, source, block }) {
    const params = block.params || {};
    const convolver = context.createConvolver();
    const tone = context.createBiquadFilter();

    convolver.buffer = createImpulseResponse(
        context,
        safeNumber(params.seconds, 3.8),
        safeNumber(params.decay, 4.2)
    );

    tone.type = "lowpass";
    tone.frequency.value = 7500;
    tone.Q.value = 0.7;

    source.connect(convolver);
    convolver.connect(tone);

    return tone;
}

function startTimelineBlockSource({
                                      context,
                                      audioBuffer,
                                      block,
                                      playbackOffset,
                                      master,
                                      sources,
                                  }) {
    if (block.type === "silence") return;

    const blockStart = clamp(block.start, 0, audioBuffer.duration);
    const blockEnd = clamp(block.end, blockStart + MIN_BLOCK_LENGTH, audioBuffer.duration);
    const blockDuration = blockEnd - blockStart;

    const alreadyInsideBlock = playbackOffset > blockStart;
    const localOffset = alreadyInsideBlock ? playbackOffset - blockStart : 0;
    const remaining = blockDuration - localOffset;

    if (remaining <= 0) return;

    const relativeStart = Math.max(0, blockStart - playbackOffset);
    const params = block.params || {};
    const source = context.createBufferSource();

    source.buffer = audioBuffer;
    source.start(relativeStart, blockStart + localOffset, remaining);

    sources.push(source);

    let processedNode;

    if (block.type === "delay") {
        processedNode = connectDelaySend({ context, source, block });
    } else if (block.type === "reverb") {
        processedNode = connectReverbSend({ context, source, block });
    } else {
        processedNode = connectInsertEffect({
            context,
            source,
            block,
            relativeStart,
            localOffset,
            blockDuration,
            remaining,
        });
    }

    const wetGain = context.createGain();

    if (block.type === "delay" || block.type === "reverb") {
        wetGain.gain.value = clamp(safeNumber(params.mix, 0.95), 0, 1.5);
    } else {
        wetGain.gain.value = clamp(safeNumber(params.mix, 1), 0, 1);
    }

    processedNode.connect(wetGain);
    wetGain.connect(master);
}

function createEditorGraph({
                               context,
                               audioBuffer,
                               blocks,
                               destination,
                               offset = 0,
                               monitorGain = 1,
                           }) {
    const sources = [];

    const drySource = context.createBufferSource();
    drySource.buffer = audioBuffer;

    const dryGain = context.createGain();
    dryGain.gain.setValueAtTime(1, 0);

    blocks.forEach((block) => {
        scheduleDryDuck(dryGain.gain, block, offset);
    });

    const master = context.createGain();
    master.gain.value = monitorGain;

    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -1.2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;

    drySource.connect(dryGain);
    dryGain.connect(master);

    sources.push(drySource);

    blocks.forEach((block) => {
        startTimelineBlockSource({
            context,
            audioBuffer,
            block,
            playbackOffset: offset,
            master,
            sources,
        });
    });

    master.connect(limiter);
    limiter.connect(destination);

    return {
        drySource,
        sources,
        master,
        limiter,
    };
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
            const sample = Math.max(-1, Math.min(1, channelData[channel][i] || 0));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;

            view.setInt16(offset, intSample, true);
            offset += 2;
        }
    }

    return new Blob([view], { type: "audio/wav" });
}

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildWaveformPeaks(audioBuffer, peakCount = 2600) {
    if (!audioBuffer) return [];

    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const samplesPerPeak = Math.max(1, Math.floor(length / peakCount));
    const peaks = [];

    for (let i = 0; i < peakCount; i += 1) {
        const start = i * samplesPerPeak;
        const end = Math.min(length, start + samplesPerPeak);
        let max = 0;

        for (let channel = 0; channel < channels; channel += 1) {
            const data = audioBuffer.getChannelData(channel);

            for (let sample = start; sample < end; sample += 1) {
                max = Math.max(max, Math.abs(data[sample] || 0));
            }
        }

        peaks.push(max);
    }

    const highest = Math.max(...peaks, 0.001);

    return peaks.map((value) => value / highest);
}

async function decodeFileToAudioBuffer(file) {
    const AudioContextClass = getAudioContextClass();

    if (!AudioContextClass) {
        throw new Error("This browser does not support the Web Audio API.");
    }

    const arrayBuffer = await file.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength < 8) {
        throw new Error("The selected file is empty or too small to decode.");
    }

    const context = new AudioContextClass();

    try {
        return await context.decodeAudioData(arrayBuffer.slice(0));
    } finally {
        context.close().catch(() => {});
    }
}

function getDownloadBaseName(fileName) {
    if (!fileName) return "audiomaster-editor-render";
    return fileName.replace(/\.[^/.]+$/, "") || "audiomaster-editor-render";
}

function migrateEffectType(block) {
    if (block?.type === "fade") {
        const startGain = safeNumber(block.params?.startGain, 0);
        const endGain = safeNumber(block.params?.endGain, 1);
        return startGain > endGain ? "fadeout" : "fadein";
    }

    return block?.type;
}

function normalizeImportedBlocks(value, duration) {
    if (!Array.isArray(value)) return [];

    return value
        .map((block) => {
            const migratedType = migrateEffectType(block);
            const effect = getEffectDefinition(migratedType);
            const start = clamp(safeNumber(block.start, 0), 0, duration);
            const end = clamp(
                safeNumber(block.end, start + 0.5),
                start + MIN_BLOCK_LENGTH,
                duration
            );

            return {
                id: createId(),
                type: effect.id,
                start,
                end,
                params: {
                    ...buildDefaultParams(effect.id),
                    ...(block.params || {}),
                },
            };
        })
        .filter((block) => block.end > block.start);
}

function getRenderTailSeconds(blocks) {
    let tail = 0;

    blocks.forEach((block) => {
        const params = block.params || {};

        if (block.type === "delay") {
            const delayTime = safeNumber(params.delayTime, 0.36);
            const feedback = safeNumber(params.feedback, 0.62);
            tail = Math.max(tail, delayTime * (feedback > 0.75 ? 10 : 7));
        }

        if (block.type === "reverb") {
            tail = Math.max(tail, safeNumber(params.seconds, 3.8));
        }
    });

    return clamp(tail, 0, 8);
}

function buildProjectPayload({ fileName, duration, blocks, selectedTool }) {
    return {
        app: "AudioMaster Lab",
        type: "timeline-region-edit-project",
        version: 3,
        exportedAt: new Date().toISOString(),
        sourceFileName: fileName,
        duration,
        selectedTool,
        blocks,
    };
}

function readAutosavedProject() {
    try {
        const raw = window.localStorage.getItem(AUTOSAVE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

async function renderEditedBuffer({
                                      sourceBuffer,
                                      blocks,
                                      onProgress,
                                  }) {
    const OfflineAudioContextClass = getOfflineAudioContextClass();

    if (!OfflineAudioContextClass) {
        throw new Error("This browser does not support OfflineAudioContext rendering.");
    }

    onProgress?.(18);

    const tailSeconds = getRenderTailSeconds(blocks);
    const renderLength =
        sourceBuffer.length + Math.floor(sourceBuffer.sampleRate * tailSeconds);

    const offlineContext = new OfflineAudioContextClass(
        sourceBuffer.numberOfChannels,
        renderLength,
        sourceBuffer.sampleRate
    );

    onProgress?.(34);

    const graph = createEditorGraph({
        context: offlineContext,
        audioBuffer: sourceBuffer,
        blocks,
        destination: offlineContext.destination,
        offset: 0,
    });

    graph.drySource.start(0, 0);

    onProgress?.(52);

    const renderedBuffer = await offlineContext.startRendering();

    onProgress?.(82);

    return renderedBuffer;
}

function EditorWorkflowPanel({
                                 hasAudio,
                                 fileName,
                                 blocks,
                                 selectedTool,
                                 canUndo,
                                 canRedo,
                                 onUndo,
                                 onRedo,
                                 onJumpToSelection,
                             }) {
    const selectedToolDefinition = getEffectDefinition(selectedTool);

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 5,
                p: { xs: 2, md: 2.4 },
                color: "#fff",
                background:
                    "linear-gradient(135deg, rgba(103,232,249,0.09), rgba(167,139,250,0.08))",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(12px)",
            }}
        >
            <Stack spacing={1.6}>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.2}
                    alignItems={{ xs: "stretch", md: "center" }}
                    justifyContent="space-between"
                >
                    <Box>
                        <Typography sx={{ fontWeight: 950, fontSize: 18 }}>
                            Fast workflow
                        </Typography>

                        <Typography sx={{ color: "rgba(255,255,255,0.64)", lineHeight: 1.65 }}>
                            1. Upload media. 2. Pick an effect. 3. Drag on the timeline.
                            4. Preview. 5. Render WAV or apply the render back into the editor.
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                            label={hasAudio ? `Loaded: ${fileName}` : "No media loaded"}
                            sx={{
                                color: "#fff",
                                fontWeight: 850,
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.08)",
                            }}
                        />

                        <Chip
                            label={`Tool: ${selectedToolDefinition.label}`}
                            sx={{
                                color: "#06111e",
                                fontWeight: 950,
                                background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                            }}
                        />

                        <Chip
                            label={`${blocks.length} block${blocks.length === 1 ? "" : "s"}`}
                            sx={{
                                color: "#fff",
                                fontWeight: 850,
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.08)",
                            }}
                        />
                    </Stack>
                </Stack>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                >
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                            variant="outlined"
                            disabled={!canUndo}
                            onClick={onUndo}
                            sx={{
                                borderRadius: 999,
                                color: "#fff",
                                borderColor: "rgba(255,255,255,0.18)",
                                fontWeight: 900,
                            }}
                        >
                            Undo
                        </Button>

                        <Button
                            variant="outlined"
                            disabled={!canRedo}
                            onClick={onRedo}
                            sx={{
                                borderRadius: 999,
                                color: "#fff",
                                borderColor: "rgba(255,255,255,0.18)",
                                fontWeight: 900,
                            }}
                        >
                            Redo
                        </Button>

                        <Button
                            variant="text"
                            disabled={!blocks.length}
                            onClick={onJumpToSelection}
                            sx={{
                                borderRadius: 999,
                                color: "rgba(255,255,255,0.78)",
                                fontWeight: 900,
                            }}
                        >
                            Jump to selected block
                        </Button>
                    </Stack>

                    <Typography
                        sx={{
                            color: "rgba(255,255,255,0.55)",
                            fontSize: 13,
                            lineHeight: 1.6,
                        }}
                    >
                        Shortcuts: Space play/pause • Delete remove block • Ctrl/Cmd+Z undo •
                        Ctrl/Cmd+S save project
                    </Typography>
                </Stack>
            </Stack>
        </Paper>
    );
}

export default function Editor() {
    const audioContextRef = useRef(null);
    const activeSourcesRef = useRef([]);
    const timerRef = useRef(null);
    const startedAtRef = useRef(0);
    const startedOffsetRef = useRef(0);
    const audioBufferRef = useRef(null);
    const blocksRef = useRef([]);
    const undoStackRef = useRef([]);
    const redoStackRef = useRef([]);
    const updateHistoryAtRef = useRef(0);

    const [fileName, setFileName] = useState("");
    const [fileInfo, setFileInfo] = useState("");
    const [status, setStatus] = useState(INITIAL_STATUS);
    const [statusTone, setStatusTone] = useState("info");
    const [loading, setLoading] = useState(false);
    const [rendering, setRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);

    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [blocks, setBlocks] = useState([]);
    const [selectedTool, setSelectedTool] = useState("silence");
    const [selectedBlockId, setSelectedBlockId] = useState("");
    const [peaks, setPeaks] = useState([]);
    const [historyVersion, setHistoryVersion] = useState(0);

    const selectedBlock = useMemo(() => {
        return blocks.find((block) => block.id === selectedBlockId) || null;
    }, [blocks, selectedBlockId]);

    const hasAudio = Boolean(audioBufferRef.current) && duration > 0;
    const canUndo = undoStackRef.current.length > 0;
    const canRedo = redoStackRef.current.length > 0;

    useEffect(() => {
        blocksRef.current = blocks;
    }, [blocks]);

    useEffect(() => {
        document.title = "Audio Editor | AudioMaster Lab";

        return () => {
            stopPlayback(false);

            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
                audioContextRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!fileName || !duration) return;

        try {
            const payload = buildProjectPayload({
                fileName,
                duration,
                blocks,
                selectedTool,
            });

            window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
        } catch {
            // Autosave should never break the editor.
        }
    }, [fileName, duration, blocks, selectedTool]);

    useEffect(() => {
        if (!selectedBlockId) return;

        const stillExists = blocks.some((block) => block.id === selectedBlockId);

        if (!stillExists) {
            setSelectedBlockId("");
        }
    }, [blocks, selectedBlockId]);

    useEffect(() => {
        function isTypingTarget(target) {
            const tagName = target?.tagName?.toLowerCase();
            return (
                tagName === "input" ||
                tagName === "textarea" ||
                target?.isContentEditable
            );
        }

        function handleKeyDown(event) {
            if (isTypingTarget(event.target)) return;

            const meta = event.ctrlKey || event.metaKey;
            const key = event.key.toLowerCase();

            if (event.code === "Space") {
                event.preventDefault();
                handlePlayPause();
                return;
            }

            if ((event.key === "Delete" || event.key === "Backspace") && selectedBlockId) {
                event.preventDefault();
                handleDeleteBlock(selectedBlockId);
                return;
            }

            if (meta && key === "z" && event.shiftKey) {
                event.preventDefault();
                handleRedo();
                return;
            }

            if (meta && key === "z") {
                event.preventDefault();
                handleUndo();
                return;
            }

            if (meta && key === "y") {
                event.preventDefault();
                handleRedo();
                return;
            }

            if (meta && key === "s") {
                event.preventDefault();

                if (blocksRef.current.length) {
                    handleExportProject();
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBlockId, playing, position, duration, fileName]);

    function setInfo(message) {
        setStatus(message);
        setStatusTone("info");
    }

    function setError(message) {
        setStatus(message);
        setStatusTone("error");
    }

    function markHistoryChanged() {
        setHistoryVersion((value) => value + 1);
    }

    function pushUndoSnapshot(snapshot = blocksRef.current) {
        undoStackRef.current = [...undoStackRef.current, cloneBlocks(snapshot)].slice(
            -MAX_HISTORY
        );
        redoStackRef.current = [];
        markHistoryChanged();
    }

    function commitBlocks(updater, options = {}) {
        const { track = true, reason = "edit" } = options;
        const current = blocksRef.current;
        const next =
            typeof updater === "function"
                ? updater(cloneBlocks(current))
                : cloneBlocks(updater || []);

        if (blocksEqual(current, next)) return;

        let shouldTrack = track;

        if (reason === "continuous-update") {
            const now = Date.now();

            if (now - updateHistoryAtRef.current < 700) {
                shouldTrack = false;
            } else {
                updateHistoryAtRef.current = now;
            }
        }

        if (shouldTrack) {
            pushUndoSnapshot(current);
        }

        blocksRef.current = next;
        setBlocks(next);
    }

    function handleUndo() {
        const previous = undoStackRef.current.pop();

        if (!previous) return;

        redoStackRef.current = [...redoStackRef.current, cloneBlocks(blocksRef.current)].slice(
            -MAX_HISTORY
        );

        blocksRef.current = cloneBlocks(previous);
        setBlocks(cloneBlocks(previous));
        markHistoryChanged();
        setInfo("Undo complete.");
    }

    function handleRedo() {
        const next = redoStackRef.current.pop();

        if (!next) return;

        undoStackRef.current = [...undoStackRef.current, cloneBlocks(blocksRef.current)].slice(
            -MAX_HISTORY
        );

        blocksRef.current = cloneBlocks(next);
        setBlocks(cloneBlocks(next));
        markHistoryChanged();
        setInfo("Redo complete.");
    }

    function stopTimer() {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }

    function stopActiveSources() {
        activeSourcesRef.current.forEach((source) => {
            try {
                source.onended = null;
                source.stop();
            } catch {
                // Source may have already ended.
            }

            try {
                source.disconnect();
            } catch {
                // Source may have already disconnected.
            }
        });

        activeSourcesRef.current = [];
    }

    function getCurrentPosition() {
        const buffer = audioBufferRef.current;

        if (!buffer) return 0;

        if (!playing || !audioContextRef.current) {
            return clamp(startedOffsetRef.current, 0, buffer.duration);
        }

        const elapsed = audioContextRef.current.currentTime - startedAtRef.current;
        return clamp(startedOffsetRef.current + elapsed, 0, buffer.duration);
    }

    function startTimer() {
        stopTimer();

        timerRef.current = window.setInterval(() => {
            const buffer = audioBufferRef.current;

            if (!buffer) return;

            const nextPosition = getCurrentPosition();

            setPosition(nextPosition);

            if (nextPosition >= buffer.duration) {
                stopPlayback(true);
            }
        }, 80);
    }

    async function ensureAudioContext() {
        const AudioContextClass = getAudioContextClass();

        if (!AudioContextClass) {
            throw new Error("This browser does not support the Web Audio API.");
        }

        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContextClass();
        }

        if (audioContextRef.current.state !== "running") {
            await audioContextRef.current.resume();
        }

        return audioContextRef.current;
    }

    function stopPlayback(resetPosition = true) {
        stopActiveSources();
        stopTimer();
        setPlaying(false);

        if (resetPosition) {
            startedOffsetRef.current = 0;
            startedAtRef.current = 0;
            setPosition(0);
        }
    }

    async function startPlayback(fromPosition = position) {
        const buffer = audioBufferRef.current;

        if (!buffer) {
            setError("Upload audio before pressing play.");
            return;
        }

        try {
            stopActiveSources();

            const context = await ensureAudioContext();
            const safeOffset = clamp(fromPosition, 0, Math.max(0, buffer.duration - 0.02));

            const graph = createEditorGraph({
                context,
                audioBuffer: buffer,
                blocks: blocksRef.current,
                destination: context.destination,
                offset: safeOffset,
            });

            activeSourcesRef.current = graph.sources;
            startedAtRef.current = context.currentTime;
            startedOffsetRef.current = safeOffset;

            graph.drySource.onended = () => {
                const nextPosition = getCurrentPosition();

                if (nextPosition >= buffer.duration - 0.05) {
                    stopPlayback(true);
                }
            };

            graph.drySource.start(0, safeOffset);

            setPlaying(true);
            setPosition(safeOffset);
            startTimer();

            setInfo(
                blocksRef.current.length
                    ? "Previewing your timeline edit. Blocks replace, duck, mute, fade, or send effects on the selected regions."
                    : "Previewing the original audio. Pick a tool and drag on the timeline to edit."
            );
        } catch (error) {
            setError(error?.message || "Could not start playback.");
        }
    }

    function handlePlayPause() {
        if (playing) {
            const nextPosition = getCurrentPosition();

            stopActiveSources();
            stopTimer();

            startedOffsetRef.current = nextPosition;
            setPosition(nextPosition);
            setPlaying(false);
            setInfo(`Paused at ${formatTime(nextPosition)}.`);
            return;
        }

        startPlayback(position);
    }

    function handleSeek(nextPosition) {
        const safePosition = clamp(nextPosition, 0, duration || 0);
        const wasPlaying = playing;

        if (wasPlaying) {
            stopActiveSources();
            stopTimer();
        }

        startedOffsetRef.current = safePosition;
        setPosition(safePosition);

        if (wasPlaying) {
            startPlayback(safePosition);
        }
    }

    async function handleFileSelect(file) {
        try {
            setLoading(true);
            stopPlayback(true);
            setBlocks([]);
            blocksRef.current = [];
            undoStackRef.current = [];
            redoStackRef.current = [];
            markHistoryChanged();

            setSelectedBlockId("");
            setPosition(0);
            setDuration(0);
            audioBufferRef.current = null;
            setPeaks([]);

            const decoded = await decodeFileToAudioBuffer(file);

            audioBufferRef.current = decoded;
            setPeaks(buildWaveformPeaks(decoded, 2600));

            setFileName(file.name);
            setDuration(decoded.duration);
            setFileInfo(
                `${decoded.numberOfChannels} channel(s) • ${decoded.sampleRate} Hz • ${formatTime(
                    decoded.duration
                )} • ${getReadableBytes(file.size)}`
            );

            const autosave = readAutosavedProject();
            const canRestore =
                autosave?.sourceFileName === file.name &&
                Math.abs(safeNumber(autosave.duration, 0) - decoded.duration) < 0.75;

            if (canRestore) {
                const restoredBlocks = normalizeImportedBlocks(autosave.blocks, decoded.duration);

                blocksRef.current = restoredBlocks;
                setBlocks(restoredBlocks);
                setSelectedBlockId(restoredBlocks[0]?.id || "");
                setSelectedTool(autosave.selectedTool || "silence");

                setInfo(
                    `Loaded ${file.name} and restored ${restoredBlocks.length} autosaved edit block${
                        restoredBlocks.length === 1 ? "" : "s"
                    }.`
                );
            } else {
                setInfo(
                    `Loaded ${file.name}. Pick an effect, drag on the timeline, preview, then render or apply the edit.`
                );
            }
        } catch (error) {
            setError(error?.message || "Could not decode this file.");
        } finally {
            setLoading(false);
        }
    }

    function handleClear() {
        stopPlayback(true);
        audioBufferRef.current = null;
        setPeaks([]);
        setFileName("");
        setFileInfo("");
        setDuration(0);
        setPosition(0);
        setBlocks([]);
        blocksRef.current = [];
        undoStackRef.current = [];
        redoStackRef.current = [];
        markHistoryChanged();
        setSelectedBlockId("");
        setInfo(INITIAL_STATUS);

        try {
            window.localStorage.removeItem(AUTOSAVE_KEY);
        } catch {
            // Ignore storage errors.
        }
    }

    function handleCreateBlock(block) {
        const effect = getEffectDefinition(block.type);

        const finalBlock = {
            ...block,
            id: createId(),
            type: effect.id,
            start: clamp(block.start, 0, duration),
            end: clamp(block.end, block.start + MIN_BLOCK_LENGTH, duration),
            params: {
                ...buildDefaultParams(effect.id),
                ...(block.params || {}),
            },
        };

        commitBlocks((current) => [...current, finalBlock], {
            track: true,
            reason: "create",
        });

        setSelectedBlockId(finalBlock.id);
        setInfo(`${effect.label} block added. Press Play to hear it.`);
    }

    function handleUpdateBlock(blockId, patch) {
        commitBlocks(
            (current) =>
                current.map((block) => {
                    if (block.id !== blockId) return block;

                    const nextBlock = {
                        ...block,
                        ...patch,
                        params: patch.params ? patch.params : block.params,
                    };

                    nextBlock.start = clamp(nextBlock.start, 0, duration);
                    nextBlock.end = clamp(
                        nextBlock.end,
                        Math.min(duration, nextBlock.start + MIN_BLOCK_LENGTH),
                        duration
                    );

                    return nextBlock;
                }),
            {
                track: true,
                reason: "continuous-update",
            }
        );
    }

    function handleDeleteBlock(blockId) {
        commitBlocks((current) => current.filter((block) => block.id !== blockId), {
            track: true,
            reason: "delete",
        });

        if (selectedBlockId === blockId) {
            setSelectedBlockId("");
        }

        setInfo("Deleted selected edit block.");
    }

    function handleDuplicateBlock(blockId) {
        const block = blocksRef.current.find((item) => item.id === blockId);

        if (!block) return;

        const blockLength = block.end - block.start;
        const nextStart = clamp(block.start + 0.35, 0, Math.max(0, duration - blockLength));
        const nextEnd = clamp(nextStart + blockLength, nextStart + MIN_BLOCK_LENGTH, duration);

        const copy = {
            ...block,
            id: createId(),
            start: nextStart,
            end: nextEnd,
            params: { ...block.params },
        };

        commitBlocks((current) => [...current, copy], {
            track: true,
            reason: "duplicate",
        });

        setSelectedBlockId(copy.id);
        setInfo("Duplicated selected edit block.");
    }

    async function handleRender() {
        const buffer = audioBufferRef.current;

        if (!buffer) {
            setError("Upload audio before rendering.");
            return;
        }

        try {
            setRendering(true);
            setRenderProgress(8);
            stopPlayback(false);

            const renderedBuffer = await renderEditedBuffer({
                sourceBuffer: buffer,
                blocks: blocksRef.current,
                onProgress: setRenderProgress,
            });

            const wavBlob = audioBufferToWavBlob(renderedBuffer);
            const baseName = getDownloadBaseName(fileName);

            downloadBlob(wavBlob, `${baseName}-timeline-edited.wav`);

            setRenderProgress(100);
            setInfo(
                `Rendered ${blocksRef.current.length} timeline edit block${
                    blocksRef.current.length === 1 ? "" : "s"
                } into a WAV file.`
            );
        } catch (error) {
            setError(error?.message || "Could not render edited audio.");
        } finally {
            window.setTimeout(() => {
                setRendering(false);
                setRenderProgress(0);
            }, 500);
        }
    }

    async function handleApplyToEditor() {
        const buffer = audioBufferRef.current;

        if (!buffer) {
            setError("Upload audio before applying the render.");
            return;
        }

        if (!blocksRef.current.length) {
            setError("Add at least one timeline block before applying the render.");
            return;
        }

        try {
            setRendering(true);
            setRenderProgress(8);
            stopPlayback(true);

            const renderedBuffer = await renderEditedBuffer({
                sourceBuffer: buffer,
                blocks: blocksRef.current,
                onProgress: setRenderProgress,
            });

            pushUndoSnapshot(blocksRef.current);

            audioBufferRef.current = renderedBuffer;
            setPeaks(buildWaveformPeaks(renderedBuffer, 2600));
            setDuration(renderedBuffer.duration);
            setPosition(0);
            startedOffsetRef.current = 0;
            startedAtRef.current = 0;

            blocksRef.current = [];
            setBlocks([]);
            setSelectedBlockId("");

            const nextName = `${getDownloadBaseName(fileName)}-applied.wav`;
            setFileName(nextName);
            setFileInfo(
                `${renderedBuffer.numberOfChannels} channel(s) • ${
                    renderedBuffer.sampleRate
                } Hz • ${formatTime(renderedBuffer.duration)} • rendered in browser`
            );

            setRenderProgress(100);
            setInfo(
                "Applied the timeline render back into the editor. The waveform is now destructively changed and ready for more edits."
            );
        } catch (error) {
            setError(error?.message || "Could not apply render to editor.");
        } finally {
            window.setTimeout(() => {
                setRendering(false);
                setRenderProgress(0);
            }, 500);
        }
    }

    function handleExportProject() {
        const project = buildProjectPayload({
            fileName,
            duration,
            blocks: blocksRef.current,
            selectedTool,
        });

        const blob = new Blob([JSON.stringify(project, null, 2)], {
            type: "application/json",
        });

        downloadBlob(blob, `${getDownloadBaseName(fileName)}-project.json`);
        setInfo("Saved timeline project JSON.");
    }

    async function handleImportProject(file) {
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const nextBlocks = normalizeImportedBlocks(
                parsed.blocks,
                duration || parsed.duration || 0
            );

            commitBlocks(nextBlocks, {
                track: true,
                reason: "import",
            });

            setSelectedBlockId(nextBlocks[0]?.id || "");

            if (parsed.selectedTool) {
                setSelectedTool(getEffectDefinition(parsed.selectedTool).id);
            }

            setInfo(`Imported ${nextBlocks.length} timeline edit block(s) from project JSON.`);
        } catch (error) {
            setError(error?.message || "Could not import this project JSON.");
        }
    }

    function handleClearBlocks() {
        commitBlocks([], {
            track: true,
            reason: "clear",
        });

        setSelectedBlockId("");
        setInfo("Cleared all timeline edit blocks.");
    }

    function handleJumpToSelection() {
        const block =
            blocksRef.current.find((item) => item.id === selectedBlockId) ||
            blocksRef.current[0];

        if (!block) return;

        setSelectedBlockId(block.id);
        handleSeek(block.start);
        setInfo(`Jumped to ${getEffectDefinition(block.type).label} at ${formatTime(block.start)}.`);
    }

    return (
        <PageShell>
            <Helmet>
                <title>Audio Editor | AudioMaster Lab</title>
                <link rel="canonical" href="https://audiomasterlab.com/editor" />
                <meta
                    name="description"
                    content="AudioMaster Lab Editor is a browser-based WebAudio timeline editor with full waveform view, playhead seeking, region effect blocks, autosave, undo and redo, project JSON import/export, destructive apply, and WAV rendering."
                />
                <meta
                    name="keywords"
                    content="AudioMaster Lab editor, WebAudio timeline editor, browser audio editor, waveform editor, effect blocks, WAV export, audio effects, online audio editor"
                />
                <link rel="canonical" href="https://audiomasterlab.com/editor" />

                <meta property="og:title" content="Audio Editor | AudioMaster Lab" />
                <meta
                    property="og:description"
                    content="Draw real region edit blocks on a full waveform timeline and render edited audio as WAV directly in the browser."
                />
                <meta property="og:url" content="https://audiomasterlab.com/editor" />
                <meta
                    property="og:image"
                    content="https://audiomasterlab.com/social-preview.png"
                />
            </Helmet>

            <Stack spacing={4}>
                <SectionTitle
                    eyebrow="Timeline editor"
                    title="Real region-based audio editing"
                    description="Load audio or video, view the waveform, move the playhead, draw effect blocks, edit parameters, preview the WebAudio graph, apply destructive edits, and export a WAV file."
                />

                <EditorStatusBanner
                    status={status}
                    tone={statusTone}
                    progress={rendering ? renderProgress : undefined}
                />

                <EditorWorkflowPanel
                    hasAudio={hasAudio}
                    fileName={fileName}
                    blocks={blocks}
                    selectedTool={selectedTool}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onJumpToSelection={handleJumpToSelection}
                    key={historyVersion}
                />

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", lg: "330px minmax(0, 1fr)" },
                        gap: 2.5,
                        alignItems: "start",
                    }}
                >
                    <Stack spacing={2.5}>
                        <MediaLoaderPanel
                            fileName={fileName}
                            mediaInfo={fileInfo}
                            loading={loading}
                            onFileSelect={handleFileSelect}
                            onClear={handleClear}
                        />

                        <EffectToolbox
                            selectedTool={selectedTool}
                            onSelectTool={(tool) => {
                                setSelectedTool(tool);
                                setInfo(`${getEffectDefinition(tool).label} armed. Drag on the timeline to create a block.`);
                            }}
                            disabled={!hasAudio}
                        />

                        <EffectInspector
                            selectedBlock={selectedBlock}
                            duration={duration}
                            onUpdateBlock={handleUpdateBlock}
                            onDeleteBlock={handleDeleteBlock}
                            onDuplicateBlock={handleDuplicateBlock}
                        />

                        <ProjectActions
                            disabled={!hasAudio}
                            rendering={rendering}
                            blocks={blocks}
                            onRender={handleRender}
                            onApplyToEditor={handleApplyToEditor}
                            onExportProject={handleExportProject}
                            onImportProject={handleImportProject}
                            onClearBlocks={handleClearBlocks}
                        />

                        <EditorHelpPanel />
                    </Stack>

                    <Stack spacing={2.5}>
                        <TransportControls
                            disabled={!hasAudio || loading || rendering}
                            playing={playing}
                            position={position}
                            duration={duration}
                            onPlayPause={handlePlayPause}
                            onStop={() => stopPlayback(true)}
                            onRestart={() => {
                                handleSeek(0);

                                if (!playing) {
                                    startPlayback(0);
                                }
                            }}
                            onSeek={handleSeek}
                        />

                        <WaveformViewer
                            peaks={peaks}
                            duration={duration}
                            position={position}
                            blocks={blocks}
                            selectedBlockId={selectedBlockId}
                            onSeek={handleSeek}
                        />

                        <TimelineEditor
                            duration={duration}
                            position={position}
                            blocks={blocks}
                            selectedBlockId={selectedBlockId}
                            selectedTool={selectedTool}
                            onCreateBlock={handleCreateBlock}
                            onSelectBlock={setSelectedBlockId}
                            onUpdateBlock={handleUpdateBlock}
                            onSeek={handleSeek}
                            disabled={!hasAudio || loading || rendering}
                        />

                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 5,
                                p: { xs: 2, md: 2.4 },
                                background: "rgba(255,255,255,0.055)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#fff",
                            }}
                        >
                            <Stack spacing={1.4}>
                                <Typography sx={{ fontWeight: 950 }}>
                                    Browser-only editing path
                                </Typography>

                                <Typography
                                    sx={{
                                        color: "rgba(255,255,255,0.62)",
                                        lineHeight: 1.75,
                                    }}
                                >
                                    This editor stays frontend-only. Preview and export use the
                                    same WebAudio graph: the dry source is ducked or muted inside
                                    each block, a processed copy of the selected region is layered
                                    over it, and send effects keep their delay/reverb tails. The
                                    Apply button renders that graph into a new AudioBuffer, redraws
                                    the waveform, clears the blocks, and lets users keep editing the
                                    rendered result.
                                </Typography>

                                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                                <Stack direction="row" flexWrap="wrap" gap={1}>
                                    {[
                                        "Autosave",
                                        "Undo / redo",
                                        "Keyboard shortcuts",
                                        "Apply render",
                                        "WAV export",
                                        "JSON projects",
                                        "Mobile-friendly layout",
                                    ].map((label) => (
                                        <Chip
                                            key={label}
                                            label={label}
                                            sx={{
                                                color: "#fff",
                                                background: "rgba(255,255,255,0.08)",
                                                border: "1px solid rgba(255,255,255,0.08)",
                                                fontWeight: 800,
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Stack>
                        </Paper>
                    </Stack>
                </Box>
            </Stack>
        </PageShell>
    );
}