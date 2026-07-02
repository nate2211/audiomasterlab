import React, { useEffect } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Stack,
    Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import SubtitlesRoundedIcon from "@mui/icons-material/SubtitlesRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import ContactMailRoundedIcon from "@mui/icons-material/ContactMailRounded";
import PrivacyTipRoundedIcon from "@mui/icons-material/PrivacyTipRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import CopyrightRoundedIcon from "@mui/icons-material/CopyrightRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import HeadsetMicRoundedIcon from "@mui/icons-material/HeadsetMicRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";

import {
    FeatureCard,
    HeroPanel,
    PageShell,
    SectionTitle,
} from "../components/Components.js";

const mainTools = [
    {
        title: "Audio mastering tool",
        description:
            "Use whole-track controls for EQ, compression, de-essing, gain, speed, pitch, panning, reverb, delay, and browser-based export.",
        to: "/audio",
        button: "Open Audio Tool",
        icon: <GraphicEqRoundedIcon />,
        chips: ["EQ", "Compression", "Reverb", "WAV export"],
    },
    {
        title: "Timeline editor",
        description:
            "Upload audio, view the waveform, move the playhead, draw effect blocks, edit parameters, save project JSON, and render an edited file.",
        to: "/editor",
        button: "Open Timeline Editor",
        icon: <TimelineRoundedIcon />,
        chips: ["Waveform", "Effect blocks", "Project JSON", "Render"],
    },
    {
        title: "Audio recorder",
        description:
            "Record microphone audio in the browser, monitor input levels, preview the waveform, play back recordings, and export supported files.",
        to: "/recorder",
        button: "Open Recorder",
        icon: <MicRoundedIcon />,
        chips: ["Mic input", "Waveform", "Playback", "Export"],
    },
    {
        title: "Audio transcription",
        description:
            "Upload supported audio and create text output for notes, captions, drafts, and review workflows when the browser can run the model.",
        to: "/transcribe",
        button: "Open Transcribe",
        icon: <SubtitlesRoundedIcon />,
        chips: ["Transcript", "SRT", "Local preview", "Text export"],
    },
];

const policyPages = [
    {
        title: "Help Center",
        description:
            "Learn how to use the editor, recorder, transcription page, waveform tools, effects, browser audio permissions, and export workflow.",
        to: "/help",
        button: "Read Help",
        icon: <HelpOutlineRoundedIcon />,
    },
    {
        title: "About",
        description:
            "Learn what AudioMaster Lab is, who it is for, how the browser-first workflow works, and what types of audio are appropriate to use.",
        to: "/about",
        button: "About AudioMaster Lab",
        icon: <InfoRoundedIcon />,
    },
    {
        title: "Contact",
        description:
            "Find the support contact page for bug reports, accessibility feedback, privacy questions, copyright questions, and general site feedback.",
        to: "/contact",
        button: "Contact",
        icon: <ContactMailRoundedIcon />,
    },
    {
        title: "Privacy Policy",
        description:
            "Review how AudioMaster Lab handles browser storage, cookies, audio processing, advertising disclosures, analytics, and third-party services.",
        to: "/privacy",
        button: "Privacy Policy",
        icon: <PrivacyTipRoundedIcon />,
    },
    {
        title: "Terms of Use",
        description:
            "Read the usage rules for lawful audio workflows, browser tools, third-party services, acceptable use, and limitations.",
        to: "/terms",
        button: "Terms",
        icon: <GavelRoundedIcon />,
    },
    {
        title: "Copyright Policy",
        description:
            "Review the copyright rules for original, licensed, public-domain, Creative Commons, and otherwise authorized audio workflows.",
        to: "/copyright",
        button: "Copyright Policy",
        icon: <CopyrightRoundedIcon />,
    },
];

const relatedSites = [
    {
        title: "SuiteOfficeLab",
        subtitle: "Browser office processors",
        description:
            "Open SuiteOfficeLab for browser-based document, spreadsheet, presentation, and office-file workflows.",
        href: "https://suiteofficelab.com/",
        button: "Open SuiteOfficeLab",
        icon: <ArticleRoundedIcon />,
        chips: ["Documents", "Spreadsheets", "Presentations", "PDF tools"],
    },
    {
        title: "ImageMasterLab",
        subtitle: "Browser image editing",
        description:
            "Use ImageMasterLab for image editing, visual cleanup, creative graphics, and browser-based media design tools.",
        href: "https://imagemasterlab.com/",
        button: "Open ImageMasterLab",
        icon: <ImageRoundedIcon />,
        chips: ["Image editing", "Graphics", "Visual tools", "Browser app"],
    },
    {
        title: "MusicStudioLab",
        subtitle: "Browser music DAW",
        description:
            "Open MusicStudioLab for browser music creation, sequencing, beat-making, virtual studio tools, and DAW-style workflows.",
        href: "https://musicstudiolab.com/",
        button: "Open MusicStudioLab",
        icon: <MusicNoteRoundedIcon />,
        chips: ["Music DAW", "Sequencer", "Beat tools", "Studio workflow"],
    },
    {
        title: "CloudCord Voice",
        subtitle: "Voice calls and technical services",
        description:
            "Visit CloudCord Voice for voice-call support, VoIP setup, technical workflows, cloud services, and remote project help.",
        href: "https://cloud-cord.com/",
        button: "Open CloudCord Voice",
        icon: <HeadsetMicRoundedIcon />,
        chips: ["Voice calls", "VoIP", "Cloud support", "Tech services"],
    },
];

const optionalPages = [
    {
        title: "YouTube player",
        description:
            "Use embedded YouTube playback for lawful listening and discovery. This page should not be used to download, copy, or export copyrighted platform content.",
        to: "/youtube",
        button: "Open YouTube Page",
        icon: <YouTubeIcon />,
    },
    {
        title: "Archive audio browser",
        description:
            "Browse audio sources only when they are public domain, Creative Commons, official, or otherwise authorized for reuse.",
        to: "/archive",
        button: "Open Archive Browser",
        icon: <LibraryMusicRoundedIcon />,
    },
];

function ToolCard({ item, featured = false }) {
    return (
        <Card
            elevation={0}
            sx={{
                height: "100%",
                borderRadius: 6,
                color: "#fff",
                background: featured
                    ? "linear-gradient(135deg, rgba(103,232,249,0.14), rgba(167,139,250,0.12))"
                    : "rgba(255,255,255,0.065)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(14px)",
            }}
        >
            <CardContent sx={{ p: { xs: 2.5, md: 3.25 }, height: "100%" }}>
                <Stack spacing={2.25} sx={{ height: "100%" }}>
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            display: "grid",
                            placeItems: "center",
                            borderRadius: 4,
                            color: "#06111e",
                            background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                            "& svg": {
                                fontSize: 30,
                            },
                        }}
                    >
                        {item.icon}
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <Typography
                            component="h3"
                            sx={{
                                fontSize: { xs: 23, md: 27 },
                                fontWeight: 950,
                                letterSpacing: "-0.04em",
                                mb: 1,
                            }}
                        >
                            {item.title}
                        </Typography>

                        <Typography
                            sx={{
                                color: "rgba(255,255,255,0.72)",
                                lineHeight: 1.7,
                            }}
                        >
                            {item.description}
                        </Typography>
                    </Box>

                    {Array.isArray(item.chips) && item.chips.length > 0 && (
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                            {item.chips.map((chip) => (
                                <Chip
                                    key={chip}
                                    label={chip}
                                    size="small"
                                    sx={{
                                        color: "#dff7ff",
                                        border: "1px solid rgba(103,232,249,0.24)",
                                        background: "rgba(103,232,249,0.08)",
                                        fontWeight: 800,
                                    }}
                                />
                            ))}
                        </Stack>
                    )}

                    <Button
                        component={RouterLink}
                        to={item.to}
                        variant={featured ? "contained" : "outlined"}
                        sx={{
                            alignSelf: "flex-start",
                            borderRadius: 999,
                            px: 2.5,
                            py: 1.1,
                            textTransform: "none",
                            fontWeight: 950,
                            color: featured ? "#06111e" : "#fff",
                            borderColor: "rgba(255,255,255,0.22)",
                            background: featured
                                ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                : "transparent",
                        }}
                    >
                        {item.button}
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
}

function RelatedSiteCard({ item }) {
    return (
        <Card
            elevation={0}
            sx={{
                height: "100%",
                borderRadius: 6,
                color: "#fff",
                background:
                    "linear-gradient(135deg, rgba(255,255,255,0.075), rgba(103,232,249,0.08))",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(14px)",
            }}
        >
            <CardContent sx={{ p: { xs: 2.5, md: 3.25 }, height: "100%" }}>
                <Stack spacing={2.25} sx={{ height: "100%" }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <Box
                            sx={{
                                width: 52,
                                height: 52,
                                display: "grid",
                                placeItems: "center",
                                borderRadius: 4,
                                color: "#06111e",
                                background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                "& svg": {
                                    fontSize: 30,
                                },
                            }}
                        >
                            {item.icon}
                        </Box>

                        <OpenInNewRoundedIcon sx={{ color: "rgba(255,255,255,0.42)" }} />
                    </Stack>

                    <Box sx={{ flex: 1 }}>
                        <Typography
                            sx={{
                                color: "#67e8f9",
                                fontWeight: 900,
                                fontSize: 13,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                mb: 0.75,
                            }}
                        >
                            {item.subtitle}
                        </Typography>

                        <Typography
                            component="h3"
                            sx={{
                                fontSize: { xs: 23, md: 27 },
                                fontWeight: 950,
                                letterSpacing: "-0.04em",
                                mb: 1,
                            }}
                        >
                            {item.title}
                        </Typography>

                        <Typography
                            sx={{
                                color: "rgba(255,255,255,0.72)",
                                lineHeight: 1.7,
                            }}
                        >
                            {item.description}
                        </Typography>
                    </Box>

                    {Array.isArray(item.chips) && item.chips.length > 0 && (
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                            {item.chips.map((chip) => (
                                <Chip
                                    key={chip}
                                    label={chip}
                                    size="small"
                                    sx={{
                                        color: "#dff7ff",
                                        border: "1px solid rgba(103,232,249,0.24)",
                                        background: "rgba(103,232,249,0.08)",
                                        fontWeight: 800,
                                    }}
                                />
                            ))}
                        </Stack>
                    )}

                    <Button
                        component="a"
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        endIcon={<OpenInNewRoundedIcon />}
                        sx={{
                            alignSelf: "flex-start",
                            borderRadius: 999,
                            px: 2.5,
                            py: 1.1,
                            textTransform: "none",
                            fontWeight: 950,
                            color: "#fff",
                            borderColor: "rgba(255,255,255,0.22)",
                        }}
                    >
                        {item.button}
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
}

export default function Home() {
    useEffect(() => {
        document.title =
            "AudioMaster Lab | Browser Audio Editor, Recorder, Visualizer & WAV Export Tool";
    }, []);

    return (
        <PageShell>
            <Helmet>
                <title>Browser Audio Editor, Recorder, Visualizer & WAV Export Tool</title>
                <meta
                    name="description"
                    content="AudioMaster Lab is a browser-based audio workspace for editing, recording, visualizing, mixing, mastering, transcribing, and exporting audio with WebAudio tools."
                />
                <link rel="canonical" href="https://audiomasterlab.com/" />

                <meta
                    property="og:title"
                    content="AudioMaster Lab | Browser Audio Editor, Recorder, Visualizer & WAV Export Tool"
                />
                <meta
                    property="og:description"
                    content="Edit your own audio, record voice, view waveforms, apply WebAudio effects, transcribe supported files, and export browser-rendered audio."
                />
                <meta property="og:url" content="https://audiomasterlab.com/" />
                <meta
                    property="og:image"
                    content="https://audiomasterlab.com/social-preview.png"
                />

                <meta
                    name="twitter:title"
                    content="AudioMaster Lab | Browser Audio Editor, Recorder, Visualizer & WAV Export Tool"
                />
                <meta
                    name="twitter:description"
                    content="Browser-based audio editing, recording, waveform viewing, WebAudio effects, transcription, and WAV export."
                />
                <meta
                    name="twitter:image"
                    content="https://audiomasterlab.com/social-preview.png"
                />

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        name: "AudioMaster Lab",
                        applicationCategory: "MultimediaApplication",
                        operatingSystem: "Web Browser",
                        url: "https://audiomasterlab.com/",
                        description:
                            "AudioMaster Lab is a browser-based audio workspace for editing, recording, visualizing, processing, transcribing, and exporting audio.",
                        offers: {
                            "@type": "Offer",
                            price: "0",
                            priceCurrency: "USD",
                        },
                        featureList: [
                            "Browser audio editing",
                            "Microphone recording",
                            "Waveform visualization",
                            "Frequency spectrum analysis",
                            "Timeline effect blocks",
                            "Editable effect parameters",
                            "EQ filters",
                            "Compression",
                            "Panning",
                            "Delay",
                            "Convolution reverb",
                            "De-essing",
                            "Speed and pitch controls",
                            "Audio transcription",
                            "WAV export",
                            "Project JSON import and export",
                        ],
                        sameAs: [
                            "https://suiteofficelab.com/",
                            "https://imagemasterlab.com/",
                            "https://musicstudiolab.com/",
                            "https://cloud-cord.com/",
                        ],
                    })}
                </script>
            </Helmet>

            <Stack spacing={7}>
                <HeroPanel
                    eyebrow="Browser audio workspace"
                    title="Edit, record, visualize, transcribe, and export audio in the browser."
                    description="AudioMaster Lab is built for original recordings, voice notes, podcasts, public-domain audio, Creative Commons audio, and other media you have permission to process. Use WebAudio tools to preview, shape, and export audio without installing a desktop editor."
                    primaryLabel="Open Timeline Editor"
                    primaryTo="/editor"
                    secondaryLabel="Open Help Center"
                    secondaryTo="/help"
                    chips={[
                        "Browser audio editor",
                        "Microphone recorder",
                        "Waveform viewer",
                        "Timeline effects",
                        "EQ",
                        "Compression",
                        "Reverb",
                        "Transcription",
                        "WAV export",
                        "Privacy policy",
                        "Copyright policy",
                    ]}
                />

                <Box>
                    <SectionTitle
                        eyebrow="Core tools"
                        title="Choose an audio workflow"
                        description="Start with the tool that matches what you want to do: quick mastering, timeline editing, recording, or transcription."
                    />

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                md: "repeat(2, minmax(0, 1fr))",
                            },
                            gap: 2.5,
                        }}
                    >
                        {mainTools.map((item, index) => (
                            <ToolCard key={item.to} item={item} featured={index < 2} />
                        ))}
                    </Box>
                </Box>

                <Box>
                    <SectionTitle
                        eyebrow="Connected browser labs"
                        title="More tools from the lab network"
                        description="Explore related browser-first tools for office files, image editing, music production, and voice-call or technical service workflows."
                    />

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                md: "repeat(2, minmax(0, 1fr))",
                            },
                            gap: 2.5,
                        }}
                    >
                        {relatedSites.map((item) => (
                            <RelatedSiteCard key={item.href} item={item} />
                        ))}
                    </Box>
                </Box>

                <Box>
                    <SectionTitle
                        eyebrow="Why use it"
                        title="A practical frontend audio workstation"
                        description="AudioMaster Lab focuses on understandable controls, browser-native processing, visual feedback, and export workflows for audio you are allowed to use."
                    />

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                md: "repeat(2, minmax(0, 1fr))",
                                lg: "repeat(4, minmax(0, 1fr))",
                            },
                            gap: 2.5,
                        }}
                    >
                        <FeatureCard
                            icon={<TimelineRoundedIcon />}
                            title="Timeline editing"
                            description="Draw effect blocks over specific time ranges, select them, move them, duplicate them, delete them, and change their parameters."
                        />

                        <FeatureCard
                            icon={<TuneRoundedIcon />}
                            title="Readable controls"
                            description="Adjust practical knobs for gain, filters, EQ, delay, reverb, compressor, panning, speed, and pitch."
                        />

                        <FeatureCard
                            icon={<FileDownloadRoundedIcon />}
                            title="Rendered export"
                            description="Export processed audio from supported browser workflows after previewing your edit and settings."
                        />

                        <FeatureCard
                            icon={<SecurityRoundedIcon />}
                            title="Browser-first"
                            description="Many audio workflows can be decoded, edited, previewed, and rendered locally in the browser without a required backend upload."
                        />
                    </Box>
                </Box>

                <Box>
                    <SectionTitle
                        eyebrow="Trust and support"
                        title="Helpful pages for users and AdSense review"
                        description="These pages explain how the site works, how to contact the project, what data may be stored, and what audio users are allowed to process."
                    />

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                md: "repeat(2, minmax(0, 1fr))",
                                lg: "repeat(3, minmax(0, 1fr))",
                            },
                            gap: 2.5,
                        }}
                    >
                        {policyPages.map((item) => (
                            <ToolCard key={item.to} item={item} />
                        ))}
                    </Box>
                </Box>

                <Box>
                    <SectionTitle
                        eyebrow="Optional pages"
                        title="Extra discovery pages"
                        description="These pages can stay in the app, but for AdSense review they should be clearly copyright-safe and should not be the main pages submitted in your sitemap."
                    />

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                md: "repeat(2, minmax(0, 1fr))",
                            },
                            gap: 2.5,
                        }}
                    >
                        {optionalPages.map((item) => (
                            <ToolCard key={item.to} item={item} />
                        ))}
                    </Box>
                </Box>

                <Box
                    sx={{
                        borderRadius: 6,
                        p: { xs: 3, md: 5 },
                        border: "1px solid rgba(255,255,255,0.1)",
                        background:
                            "linear-gradient(135deg, rgba(103,232,249,0.12), rgba(167,139,250,0.1))",
                    }}
                >
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        alignItems={{ xs: "flex-start", md: "center" }}
                        justifyContent="space-between"
                        spacing={3}
                    >
                        <Box>
                            <Typography
                                variant="h4"
                                sx={{ fontWeight: 950, letterSpacing: "-0.045em", mb: 1 }}
                            >
                                Start with audio you are allowed to use.
                            </Typography>

                            <Typography sx={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
                                For the most reliable results, use your own MP3, WAV, OGG,
                                M4A, MP4, MOV, or WebM files. Browser codec support depends
                                on the user’s device, and users are responsible for making
                                sure they have permission to edit or export the audio.
                            </Typography>
                        </Box>

                        <Button
                            component={RouterLink}
                            to="/help"
                            size="large"
                            variant="contained"
                            sx={{
                                borderRadius: 999,
                                px: 3,
                                py: 1.35,
                                fontWeight: 950,
                                color: "#06111e",
                                background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                            }}
                        >
                            Read Help Center
                        </Button>
                    </Stack>
                </Box>
            </Stack>
        </PageShell>
    );
}