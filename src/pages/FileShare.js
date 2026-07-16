import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
    Alert, Box, Button, Card, CardContent, Chip, Container, Divider,
    LinearProgress, Paper, Stack, Typography,
} from "@mui/material";
import {
    ContentCopyRounded, DeleteOutlineRounded, DownloadRounded,
    FilePresentRounded, IosShareRounded, LockRounded, UploadFileRounded,
} from "@mui/icons-material";

const DB_NAME = "audiomasterlab-file-share";
const STORE_NAME = "files";
const MAX_LINK_BYTES = 750 * 1024;

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function runStore(mode, operation) {
    const db = await openDatabase();
    try {
        return await new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, mode);
            const request = operation(transaction.objectStore(STORE_NAME));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } finally { db.close(); }
}

const listFiles = () => runStore("readonly", (store) => store.getAll());
const saveFile = (record) => runStore("readwrite", (store) => store.put(record));
const removeFile = (id) => runStore("readwrite", (store) => store.delete(id));

function bytesToBase64Url(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value) {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function safeName(value) {
    return String(value || "shared-file").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180);
}

function formatBytes(value) {
    const bytes = Math.max(0, Number(value) || 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

async function createShareUrl(record) {
    if (record.size > MAX_LINK_BYTES) throw new Error(`Self-contained links support files up to ${formatBytes(MAX_LINK_BYTES)}.`);
    const bytes = new Uint8Array(await record.blob.arrayBuffer());
    const payload = {
        v: 1, n: safeName(record.name), t: record.type || "application/octet-stream",
        s: record.size, d: bytesToBase64Url(bytes),
    };
    const encoded = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
    return `${window.location.origin}/share#download=${encoded}`;
}

function decodeShareHash() {
    const prefix = "#download=";
    if (!window.location.hash.startsWith(prefix)) return null;
    const json = new TextDecoder().decode(base64UrlToBytes(window.location.hash.slice(prefix.length)));
    const payload = JSON.parse(json);
    if (payload.v !== 1 || !payload.d) throw new Error("This share link is invalid or damaged.");
    const bytes = base64UrlToBytes(payload.d);
    return {
        id: crypto.randomUUID(), name: safeName(payload.n), type: payload.t,
        size: bytes.byteLength, createdAt: Date.now(), received: true,
        blob: new Blob([bytes], { type: payload.t || "application/octet-stream" }),
    };
}

function downloadRecord(record) {
    const url = URL.createObjectURL(record.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = safeName(record.name);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function FileShare() {
    const [files, setFiles] = useState([]);
    const [busy, setBusy] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [received, setReceived] = useState(null);

    const refresh = useCallback(async () => {
        try { setFiles((await listFiles()).sort((a, b) => b.createdAt - a.createdAt)); }
        catch { setError("Browser storage is unavailable. Check private-browsing or storage permissions."); }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);
    useEffect(() => {
        try { setReceived(decodeShareHash()); }
        catch (reason) { setError(reason.message || "The shared file could not be opened."); }
    }, []);

    const totalBytes = useMemo(() => files.reduce((sum, file) => sum + (file.size || 0), 0), [files]);

    async function addSelectedFiles(selected) {
        const incoming = Array.from(selected || []);
        if (!incoming.length) return;
        setBusy(true); setError("");
        try {
            for (const file of incoming) {
                await saveFile({ id: crypto.randomUUID(), name: safeName(file.name), type: file.type,
                    size: file.size, createdAt: Date.now(), blob: file });
            }
            await refresh();
            setMessage(`Saved ${incoming.length} file${incoming.length === 1 ? "" : "s"} privately in this browser.`);
        } catch (reason) { setError(reason.message || "The file could not be saved."); }
        finally { setBusy(false); }
    }

    async function share(record) {
        setBusy(true); setError("");
        try {
            const url = await createShareUrl(record);
            if (navigator.share) {
                try { await navigator.share({ title: record.name, text: "Download this file from AudioMaster Lab", url }); setMessage("Share link opened in your device share sheet."); return; }
                catch (reason) { if (reason?.name === "AbortError") return; }
            }
            await navigator.clipboard.writeText(url);
            setMessage("Self-contained download link copied. Anyone with the complete link can download the file.");
        } catch (reason) { setError(reason.message || "A share link could not be created."); }
        finally { setBusy(false); }
    }

    async function keepReceived() {
        if (!received) return;
        await saveFile(received); await refresh();
        setMessage("Shared file saved to this browser.");
    }

    return <Container component="main" maxWidth="lg" sx={{py:{xs:4,md:7},pb:18}}>
        <Helmet><title>Private Browser File Share | AudioMaster Lab</title><meta name="description" content="Store files in browser storage and create self-contained download links for friends without uploading to a server." /><link rel="canonical" href="https://audiomasterlab.com/share" /></Helmet>
        <Stack spacing={3}>
            <Box><Chip icon={<LockRounded />} label="Local-first · no account" color="primary" variant="outlined" />
                <Typography component="h1" variant="h2" sx={{mt:2,fontWeight:950,fontSize:{xs:"2.35rem",md:"4rem"},letterSpacing:"-.05em"}}>Browser File Share</Typography>
                <Typography color="text.secondary" sx={{mt:1,maxWidth:760,fontSize:{md:"1.15rem"}}}>Keep files in private IndexedDB storage, download them anytime, or create a self-contained link for a friend. Link data stays after the <code>#</code> fragment and is not sent to the web server.</Typography>
            </Box>
            {error && <Alert severity="error" onClose={()=>setError("")}>{error}</Alert>}
            {message && <Alert severity="success" onClose={()=>setMessage("")}>{message}</Alert>}
            {busy && <LinearProgress />}
            {received && <Card sx={{border:"1px solid rgba(103,232,249,.4)",background:"linear-gradient(135deg,rgba(14,116,144,.24),rgba(15,23,42,.9))"}}><CardContent><Stack spacing={2}><Typography variant="h5" fontWeight={900}>A friend shared a file with you</Typography><Typography>{received.name} · {formatBytes(received.size)}</Typography><Stack direction={{xs:"column",sm:"row"}} spacing={1}><Button variant="contained" startIcon={<DownloadRounded />} onClick={()=>downloadRecord(received)}>Download file</Button><Button variant="outlined" startIcon={<FilePresentRounded />} onClick={keepReceived}>Keep in browser</Button></Stack></Stack></CardContent></Card>}
            <Paper onDragEnter={(e)=>{e.preventDefault();setDragging(true)}} onDragOver={(e)=>e.preventDefault()} onDragLeave={()=>setDragging(false)} onDrop={(e)=>{e.preventDefault();setDragging(false);addSelectedFiles(e.dataTransfer.files)}} sx={{p:{xs:3,md:6},textAlign:"center",border:"2px dashed",borderColor:dragging?"primary.main":"rgba(148,163,184,.35)",bgcolor:dragging?"rgba(103,232,249,.08)":"rgba(15,23,42,.72)"}}>
                <UploadFileRounded color="primary" sx={{fontSize:58}} /><Typography variant="h5" fontWeight={900}>Drop files into private browser storage</Typography><Typography color="text.secondary" sx={{my:2}}>Files remain on this device unless you deliberately create and send a link.</Typography><Button component="label" variant="contained" startIcon={<UploadFileRounded />}>Choose files<input hidden multiple type="file" onChange={(e)=>addSelectedFiles(e.target.files)} /></Button>
            </Paper>
            <Stack direction={{xs:"column",sm:"row"}} justifyContent="space-between"><Typography variant="h4" fontWeight={900}>Saved files</Typography><Typography color="text.secondary">{files.length} files · {formatBytes(totalBytes)}</Typography></Stack>
            {!files.length ? <Alert severity="info">No files are stored in this browser yet.</Alert> : files.map((file)=><Card key={file.id} variant="outlined"><CardContent><Stack direction={{xs:"column",md:"row"}} alignItems={{md:"center"}} spacing={2}><FilePresentRounded color="primary" /><Box sx={{flex:1,minWidth:0}}><Typography fontWeight={900} noWrap>{file.name}</Typography><Typography variant="body2" color="text.secondary">{formatBytes(file.size)} · {file.type || "Unknown type"} · {new Date(file.createdAt).toLocaleString()}</Typography></Box><Stack direction="row" spacing={1} flexWrap="wrap"><Button startIcon={<DownloadRounded />} onClick={()=>downloadRecord(file)}>Download</Button><Button variant="contained" startIcon={navigator.share?<IosShareRounded />:<ContentCopyRounded />} disabled={file.size>MAX_LINK_BYTES} onClick={()=>share(file)}>Share link</Button><Button color="error" startIcon={<DeleteOutlineRounded />} onClick={async()=>{await removeFile(file.id);refresh()}}>Delete</Button></Stack>{file.size>MAX_LINK_BYTES && <Typography variant="caption" color="warning.main">Too large for a self-contained link</Typography>}</Stack></CardContent></Card>)}
            <Divider /><Alert severity="warning">Self-contained links are limited to {formatBytes(MAX_LINK_BYTES)} because browsers and messaging apps limit URL length. Anyone possessing the full link can download its file. Larger files stay local and require a configured upload service for cross-device sharing.</Alert>
        </Stack>
    </Container>;
}
