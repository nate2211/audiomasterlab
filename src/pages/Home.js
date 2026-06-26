import React, { useEffect } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
    FeatureCard,
    HeroPanel,
    PageShell,
    SectionTitle,
} from "../components/Components.js";
import { Helmet } from "react-helmet-async";

export default function Home() {
    useEffect(() => {
        document.title = "AudioMaster Lab | Browser WebAudio Mastering Tool";
    }, []);

    return (
        <PageShell>
            <Helmet>
                <title>Browser WebAudio Mastering Tool</title>
                <meta
                    name="description"
                    content="AudioMaster Lab lets you master and edit audio directly in the browser with WebAudio effects, waveform visualization, frequency spectrum analysis, timeline effect blocks, EQ, compression, speed control, and WAV export."
                />
                <meta
                    name="keywords"
                    content="AudioMaster Lab, browser audio mastering, WebAudio tool, online audio mixer, waveform editor, timeline audio editor, frequency spectrum, WAV export, audio editor"
                />
                <link rel="canonical" href="https://audiomasterlab.com/" />

                <meta
                    property="og:title"
                    content="AudioMaster Lab | Browser WebAudio Mastering Tool"
                />
                <meta
                    property="og:description"
                    content="Upload media, preview it through live WebAudio filters, draw timeline effect blocks, visualize the waveform and spectrum, and export a processed WAV file."
                />
                <meta property="og:url" content="https://audiomasterlab.com/" />
                <meta
                    property="og:image"
                    content="https://audiomasterlab.com/social-preview.png"
                />

                <meta
                    name="twitter:title"
                    content="AudioMaster Lab | Browser WebAudio Mastering Tool"
                />
                <meta
                    name="twitter:description"
                    content="Browser-based audio mastering and timeline editing with WebAudio effects, visualizers, and WAV export."
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
                            "AudioMaster Lab is a browser-based WebAudio mastering and timeline editing tool for previewing, visualizing, processing, and exporting audio.",
                        offers: {
                            "@type": "Offer",
                            price: "0",
                            priceCurrency: "USD",
                        },
                        featureList: [
                            "WebAudio mastering",
                            "Full waveform visualization",
                            "Frequency spectrum visualization",
                            "Timeline effect blocks",
                            "Editable effect parameters",
                            "EQ filters",
                            "Compression",
                            "Panning",
                            "Delay",
                            "Convolution reverb",
                            "De-essing",
                            "WAV export",
                            "Project JSON import and export",
                        ],
                    })}
                </script>
            </Helmet>

            <Stack spacing={7}>
                <HeroPanel
                    eyebrow="React + Material UI + WebAudio"
                    title="Master and edit audio directly in the browser."
                    description="Upload a media file, preview it through live WebAudio filters, edit the full waveform with timeline effect blocks, adjust parameters, and render a processed WAV file with your settings baked in."
                    primaryLabel="Open Timeline Editor"
                    primaryTo="/editor"
                    secondaryLabel="Open Audio Tool"
                    secondaryTo="/audio"
                    chips={[
                        "File upload",
                        "Full waveform",
                        "Playhead timeline",
                        "Drawable effect blocks",
                        "EQ filters",
                        "Compression",
                        "Delay",
                        "Reverb",
                        "WAV export",
                    ]}
                />

                <Box>
                    <SectionTitle
                        eyebrow="Features"
                        title="A real frontend audio workstation"
                        description="AudioMaster Lab now has both a live mastering tool and a timeline editor. The editor decodes media into an AudioBuffer, draws the full waveform, lets you place effect blocks on a timeline, and uses OfflineAudioContext to render a downloadable WAV."
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
                            title="Timeline editor"
                            description="Draw effect blocks over specific time ranges, select them, move them, duplicate them, delete them, and change their parameters."
                        />

                        <FeatureCard
                            icon={<TuneRoundedIcon />}
                            title="Block parameters"
                            description="Each block has its own settings for gain, filters, EQ, delay, reverb, compressor, or panning."
                        />

                        <FeatureCard
                            icon={<FileDownloadRoundedIcon />}
                            title="Rendered export"
                            description="Export a processed WAV file with timeline effects rendered through an OfflineAudioContext."
                        />

                        <FeatureCard
                            icon={<SecurityRoundedIcon />}
                            title="Browser-first"
                            description="Uploaded files can be decoded, edited, previewed, and rendered locally in the browser without needing a backend server."
                        />
                    </Box>
                </Box>

                <Box>
                    <SectionTitle
                        eyebrow="Tools"
                        title="Choose the workflow"
                        description="Use the mastering page for quick whole-track controls. Use the timeline editor when you want Adobe-style blocks that only affect certain parts of the audio."
                    />

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                            gap: 2.5,
                        }}
                    >
                        <Box
                            sx={{
                                borderRadius: 6,
                                p: { xs: 3, md: 5 },
                                border: "1px solid rgba(255,255,255,0.1)",
                                background:
                                    "linear-gradient(135deg, rgba(103,232,249,0.12), rgba(167,139,250,0.1))",
                            }}
                        >
                            <Stack spacing={2.2}>
                                <GraphicEqRoundedIcon sx={{ color: "#67e8f9", fontSize: 44 }} />

                                <Box>
                                    <Typography
                                        variant="h4"
                                        sx={{
                                            fontWeight: 950,
                                            letterSpacing: "-0.045em",
                                            mb: 1,
                                        }}
                                    >
                                        Mastering tool
                                    </Typography>

                                    <Typography sx={{ color: "rgba(255,255,255,0.68)" }}>
                                        Use one clean mixer for whole-track EQ, compression,
                                        gain, speed, delay, reverb, de-essing, and WAV export.
                                    </Typography>
                                </Box>

                                <Button
                                    component={RouterLink}
                                    to="/audio"
                                    size="large"
                                    variant="outlined"
                                    sx={{
                                        alignSelf: "flex-start",
                                        borderRadius: 999,
                                        px: 3,
                                        py: 1.25,
                                        color: "#fff",
                                        borderColor: "rgba(255,255,255,0.2)",
                                        fontWeight: 950,
                                    }}
                                >
                                    Launch Audio Tool
                                </Button>
                            </Stack>
                        </Box>

                        <Box
                            sx={{
                                borderRadius: 6,
                                p: { xs: 3, md: 5 },
                                border: "1px solid rgba(255,255,255,0.1)",
                                background:
                                    "linear-gradient(135deg, rgba(167,139,250,0.14), rgba(103,232,249,0.1))",
                            }}
                        >
                            <Stack spacing={2.2}>
                                <TimelineRoundedIcon sx={{ color: "#a78bfa", fontSize: 44 }} />

                                <Box>
                                    <Typography
                                        variant="h4"
                                        sx={{
                                            fontWeight: 950,
                                            letterSpacing: "-0.045em",
                                            mb: 1,
                                        }}
                                    >
                                        Timeline editor
                                    </Typography>

                                    <Typography sx={{ color: "rgba(255,255,255,0.68)" }}>
                                        View the full waveform, move the playhead, draw effect
                                        blocks, adjust block parameters, save project JSON, and
                                        render an edited WAV.
                                    </Typography>
                                </Box>

                                <Button
                                    component={RouterLink}
                                    to="/editor"
                                    size="large"
                                    variant="contained"
                                    sx={{
                                        alignSelf: "flex-start",
                                        borderRadius: 999,
                                        px: 3,
                                        py: 1.25,
                                        fontWeight: 950,
                                        color: "#06111e",
                                        background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                    }}
                                >
                                    Launch Timeline Editor
                                </Button>
                            </Stack>
                        </Box>
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
                                Start testing the editor engine.
                            </Typography>
                            <Typography sx={{ color: "rgba(255,255,255,0.68)" }}>
                                Use a local MP3, WAV, OGG, M4A, MP4, MOV, or WebM file for
                                the most reliable results. Browser codec support depends on
                                the user’s device.
                            </Typography>
                        </Box>

                        <Button
                            component={RouterLink}
                            to="/editor"
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
                            Launch Editor
                        </Button>
                    </Stack>
                </Box>
            </Stack>
        </PageShell>
    );
}