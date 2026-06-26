import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
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
    "Upload an audio or video file, draw blocks on the timeline, preview the edit, then render the edited WAV.";

function getAudioContextClass() {
    return window.AudioContext || window.webkitAudioContext;
}

function getOfflineAudioContextClass() {
    return window.OfflineAudioContext || window.webkitOfflineAudioContext;
}

function createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeNumber(value, fallback) {
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? nextValue : fallback;
}

function dbToGain(db) {
    return Math.pow(10, safeNumber(db, 0) / 20);
}

function makeDistortionCurve(drive = 50) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const amount = safeNumber(drive, 50);

    for (let i = 0; i < samples; i += 1) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
    }

    return curve;
}

function createImpulseResponse(context, seconds = 2, decay = 3) {
    const safeSeconds = clamp(safeNumber(seconds, 2), 0.15, 8);
    const safeDecay = clamp(safeNumber(decay, 3), 0.5, 8);
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

function createReversedRegionBuffer(context, sourceBuffer, startSeconds, endSeconds) {
    const sampleRate = sourceBuffer.sampleRate;
    const startSample = clamp(Math.floor(startSeconds * sampleRate), 0, sourceBuffer.length - 1);
    const endSample = clamp(Math.floor(endSeconds * sampleRate), startSample + 1, sourceBuffer.length);
    const length = Math.max(1, endSample - startSample);
    const channels = sourceBuffer.numberOfChannels;
    const output = context.createBuffer(channels, length, sampleRate);

    for (let channel = 0; channel < channels; channel += 1) {
        const inputData = sourceBuffer.getChannelData(channel);
        const outputData = output.getChannelData(channel);

        for (let i = 0; i < length; i += 1) {
            outputData[i] = inputData[endSample - 1 - i] || 0;
        }
    }

    return output;
}

function scheduleDryDuck(param, block, playbackOffset) {
    const params = block.params || {};
    const mix =
        block.type === "silence"
            ? safeNumber(params.amount, 1)
            : params.mix === undefined
                ? 1
                : safeNumber(params.mix, 1);

    let duckAmount = clamp(mix, 0, 1);

    if (block.type === "delay" || block.type === "reverb") {
        duckAmount = clamp(mix * 0.18, 0, 0.4);
    }

    const start = block.start - playbackOffset;
    const end = block.end - playbackOffset;

    if (end <= 0 || end <= start) return;

    const attack = 0.008;
    const release = 0.018;
    const t0 = Math.max(0, start);
    const t1 = Math.max(t0 + 0.02, end);
    const duckLevel = clamp(1 - duckAmount, 0, 1);

    try {
        param.setValueAtTime(1, Math.max(0, t0 - 0.002));
        param.linearRampToValueAtTime(duckLevel, t0 + attack);
        param.setValueAtTime(duckLevel, Math.max(t0 + attack, t1 - release));
        param.linearRampToValueAtTime(1, t1);
    } catch {
        param.value = 1;
    }
}

function connectInsertEffect({ context, source, block }) {
    const params = block.params || {};
    let lastNode = source;

    if (block.type === "gain" || block.type === "reverse") {
        const gain = context.createGain();
        gain.gain.value = dbToGain(params.gainDb || 0);

        lastNode.connect(gain);
        return gain;
    }

    if (block.type === "fade") {
        const gain = context.createGain();
        const startGain = clamp(safeNumber(params.startGain, 0), 0, 2);
        const endGain = clamp(safeNumber(params.endGain, 1), 0, 2);
        const length = Math.max(0.02, block.end - block.start);

        gain.gain.setValueAtTime(startGain, 0);
        gain.gain.linearRampToValueAtTime(endGain, length);

        lastNode.connect(gain);
        return gain;
    }

    if (block.type === "highpass" || block.type === "lowpass" || block.type === "peakingeq") {
        const filter = context.createBiquadFilter();

        if (block.type === "highpass") {
            filter.type = "highpass";
            filter.frequency.value = safeNumber(params.frequency, 650);
            filter.Q.value = safeNumber(params.q, 1.2);
        }

        if (block.type === "lowpass") {
            filter.type = "lowpass";
            filter.frequency.value = safeNumber(params.frequency, 2200);
            filter.Q.value = safeNumber(params.q, 1);
        }

        if (block.type === "peakingeq") {
            filter.type = "peaking";
            filter.frequency.value = safeNumber(params.frequency, 3200);
            filter.Q.value = safeNumber(params.q, 2.5);
            filter.gain.value = safeNumber(params.gainDb, 14);
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
        waveShaper.curve = makeDistortionCurve(params.drive || 55);
        waveShaper.oversample = "4x";

        tone.type = "lowpass";
        tone.frequency.value = safeNumber(params.tone, 5200);
        tone.Q.value = 0.7;

        postGain.gain.value = 0.72;

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
        compressor.release.value = safeNumber(params.release, 0.32);
        compressor.knee.value = 8;

        makeup.gain.value = dbToGain(params.makeupDb || 8);

        lastNode.connect(compressor);
        compressor.connect(makeup);

        return makeup;
    }

    if (block.type === "pan") {
        if (context.createStereoPanner) {
            const panner = context.createStereoPanner();
            panner.pan.value = clamp(safeNumber(params.pan, 0.9), -1, 1);

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

    delayNode.delayTime.value = safeNumber(params.delayTime, 0.32);
    feedback.gain.value = clamp(safeNumber(params.feedback, 0.68), 0, 0.92);

    tone.type = "lowpass";
    tone.frequency.value = 5500;

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
        safeNumber(params.decay, 3)
    );

    tone.type = "lowpass";
    tone.frequency.value = 7500;

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
    const blockEnd = clamp(block.end, blockStart + 0.01, audioBuffer.duration);
    const blockDuration = blockEnd - blockStart;

    const alreadyInsideBlock = playbackOffset > blockStart;
    const localOffset = alreadyInsideBlock ? playbackOffset - blockStart : 0;
    const remaining = blockDuration - localOffset;

    if (remaining <= 0) return;

    const relativeStart = Math.max(0, blockStart - playbackOffset);
    const params = block.params || {};
    const source = context.createBufferSource();

    if (block.type === "reverse") {
        source.buffer = createReversedRegionBuffer(context, audioBuffer, blockStart, blockEnd);
        source.start(relativeStart, localOffset, remaining);
    } else {
        source.buffer = audioBuffer;
        source.start(relativeStart, blockStart + localOffset, remaining);
    }

    sources.push(source);

    let processedNode;

    if (block.type === "delay") {
        processedNode = connectDelaySend({ context, source, block });
    } else if (block.type === "reverb") {
        processedNode = connectReverbSend({ context, source, block });
    } else {
        processedNode = connectInsertEffect({ context, source, block });
    }

    const wetGain = context.createGain();

    if (block.type === "delay" || block.type === "reverb") {
        wetGain.gain.value = clamp(safeNumber(params.mix, 1), 0, 1.5);
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
            const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
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
                max = Math.max(max, Math.abs(data[sample]));
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

function normalizeImportedBlocks(value, duration) {
    if (!Array.isArray(value)) return [];

    return value
        .map((block) => {
            const effect = getEffectDefinition(block.type);
            const start = clamp(safeNumber(block.start, 0), 0, duration);
            const end = clamp(safeNumber(block.end, start + 0.5), start + 0.05, duration);

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
            tail = Math.max(tail, safeNumber(params.delayTime, 0.32) * 6);
        }

        if (block.type === "reverb") {
            tail = Math.max(tail, safeNumber(params.seconds, 3.8));
        }
    });

    return clamp(tail, 0, 8);
}

export default function Editor() {
    const audioContextRef = useRef(null);
    const activeSourcesRef = useRef([]);
    const timerRef = useRef(null);
    const startedAtRef = useRef(0);
    const startedOffsetRef = useRef(0);
    const audioBufferRef = useRef(null);

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

    const selectedBlock = useMemo(() => {
        return blocks.find((block) => block.id === selectedBlockId) || null;
    }, [blocks, selectedBlockId]);

    const hasAudio = Boolean(audioBufferRef.current);

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

    function setInfo(message) {
        setStatus(message);
        setStatusTone("info");
    }

    function setError(message) {
        setStatus(message);
        setStatusTone("error");
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
                // Safe cleanup.
            }

            try {
                source.disconnect();
            } catch {
                // Safe cleanup.
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
                blocks,
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
                blocks.length
                    ? "Previewing region-based timeline edits. Dry audio is ducked/replaced inside blocks."
                    : "Previewing original audio. Draw blocks to edit the audio."
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
            setInfo(
                `Loaded ${file.name}. Use Silence, Reverse, Fade, Gain, filters, Distortion, Delay, Reverb, Compressor, or Pan blocks to edit it.`
            );
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
        setSelectedBlockId("");
        setInfo(INITIAL_STATUS);
    }

    function handleCreateBlock(block) {
        const finalBlock = {
            ...block,
            id: createId(),
            params: {
                ...buildDefaultParams(block.type),
                ...(block.params || {}),
            },
        };

        setBlocks((current) => [...current, finalBlock]);
        setSelectedBlockId(finalBlock.id);
        setInfo(`${getEffectDefinition(finalBlock.type).label} block added. Press Play to hear the edit.`);
    }

    function handleUpdateBlock(blockId, patch) {
        setBlocks((current) =>
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
                    Math.min(duration, nextBlock.start + 0.05),
                    duration
                );

                return nextBlock;
            })
        );
    }

    function handleDeleteBlock(blockId) {
        setBlocks((current) => current.filter((block) => block.id !== blockId));

        if (selectedBlockId === blockId) {
            setSelectedBlockId("");
        }

        setInfo("Deleted selected edit block.");
    }

    function handleDuplicateBlock(blockId) {
        const block = blocks.find((item) => item.id === blockId);

        if (!block) return;

        const blockLength = block.end - block.start;
        const nextStart = clamp(block.start + 0.35, 0, Math.max(0, duration - blockLength));
        const nextEnd = clamp(nextStart + blockLength, nextStart + 0.05, duration);

        const copy = {
            ...block,
            id: createId(),
            start: nextStart,
            end: nextEnd,
            params: { ...block.params },
        };

        setBlocks((current) => [...current, copy]);
        setSelectedBlockId(copy.id);
        setInfo("Duplicated selected edit block.");
    }

    async function handleRender() {
        const buffer = audioBufferRef.current;
        const OfflineAudioContextClass = getOfflineAudioContextClass();

        if (!buffer) {
            setError("Upload audio before rendering.");
            return;
        }

        if (!OfflineAudioContextClass) {
            setError("This browser does not support OfflineAudioContext rendering.");
            return;
        }

        try {
            setRendering(true);
            setRenderProgress(12);
            stopPlayback(false);

            const tailSeconds = getRenderTailSeconds(blocks);
            const renderLength = buffer.length + Math.floor(buffer.sampleRate * tailSeconds);

            const offlineContext = new OfflineAudioContextClass(
                buffer.numberOfChannels,
                renderLength,
                buffer.sampleRate
            );

            setRenderProgress(32);

            const graph = createEditorGraph({
                context: offlineContext,
                audioBuffer: buffer,
                blocks,
                destination: offlineContext.destination,
                offset: 0,
            });

            graph.drySource.start(0, 0);

            setRenderProgress(48);

            const renderedBuffer = await offlineContext.startRendering();

            setRenderProgress(78);

            const wavBlob = audioBufferToWavBlob(renderedBuffer);
            const baseName = getDownloadBaseName(fileName);

            downloadBlob(wavBlob, `${baseName}-timeline-edited.wav`);

            setRenderProgress(100);
            setInfo(
                `Rendered ${blocks.length} timeline edit block${
                    blocks.length === 1 ? "" : "s"
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

    function handleExportProject() {
        const project = {
            app: "AudioMaster Lab",
            type: "timeline-region-edit-project",
            version: 2,
            exportedAt: new Date().toISOString(),
            sourceFileName: fileName,
            duration,
            blocks,
        };

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

            setBlocks(nextBlocks);
            setSelectedBlockId(nextBlocks[0]?.id || "");
            setInfo(`Imported ${nextBlocks.length} timeline edit block(s) from project JSON.`);
        } catch (error) {
            setError(error?.message || "Could not import this project JSON.");
        }
    }

    return (
        <PageShell>
            <Helmet>
                <title>Audio Editor</title>
                <meta
                    name="description"
                    content="AudioMaster Lab Editor is a browser-based WebAudio timeline editor with full waveform view, playhead seeking, real region edits, drawable effect blocks, editable parameters, project JSON import/export, and WAV rendering."
                />
                <meta
                    name="keywords"
                    content="AudioMaster Lab editor, WebAudio timeline editor, browser audio editor, waveform editor, effect blocks, WAV export"
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
                    description="Load audio, view the complete waveform, move the playhead, draw edit blocks, change parameters per block, preview the WebAudio result, and export an edited WAV file."
                />

                <EditorStatusBanner
                    status={status}
                    tone={statusTone}
                    progress={rendering ? renderProgress : undefined}
                />

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", lg: "320px minmax(0, 1fr)" },
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
                            onSelectTool={setSelectedTool}
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
                            onExportProject={handleExportProject}
                            onImportProject={handleImportProject}
                            onClearBlocks={() => {
                                setBlocks([]);
                                setSelectedBlockId("");
                                setInfo("Cleared all timeline edit blocks.");
                            }}
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

                        <Typography sx={{ color: "rgba(255,255,255,0.56)", lineHeight: 1.7 }}>
                            The editor is still frontend-only, but the audio path now behaves
                            like a real non-destructive region editor: the original track is
                            lowered or muted during a block, then a processed copy of that
                            same audio range is played over it. Rendering uses the same graph
                            inside OfflineAudioContext, so the downloaded WAV matches preview.
                        </Typography>
                    </Stack>
                </Box>
            </Stack>
        </PageShell>
    );
}