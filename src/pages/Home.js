import React, { useEffect } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import {
    FeatureCard,
    HeroPanel,
    PageShell,
    SectionTitle,
} from "../components/Components.js";
import {Helmet} from "react-helmet-async";

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
                    content="AudioMaster Lab lets you master audio directly in the browser with WebAudio effects, waveform visualization, frequency spectrum analysis, EQ, compression, speed control, and WAV export."
                />
                <meta
                    name="keywords"
                    content="AudioMaster Lab, browser audio mastering, WebAudio tool, online audio mixer, waveform visualizer, frequency spectrum, WAV export, audio editor"
                />
                <link rel="canonical" href="https://audiomasterlab.com/" />

                <meta
                    property="og:title"
                    content="AudioMaster Lab | Browser WebAudio Mastering Tool"
                />
                <meta
                    property="og:description"
                    content="Upload media, preview it through live WebAudio filters, visualize the waveform and spectrum, and export a processed WAV file."
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
                    content="Browser-based audio mastering with WebAudio effects, visualizers, and WAV export."
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
                            "AudioMaster Lab is a browser-based WebAudio mastering tool for previewing, visualizing, processing, and exporting audio.",
                        offers: {
                            "@type": "Offer",
                            price: "0",
                            priceCurrency: "USD",
                        },
                        featureList: [
                            "WebAudio mastering",
                            "Waveform visualization",
                            "Frequency spectrum visualization",
                            "EQ filters",
                            "Compression",
                            "Panning",
                            "Delay",
                            "Convolution reverb",
                            "De-essing",
                            "WAV export",
                        ],
                    })}
                </script>
            </Helmet>
            <Stack spacing={7}>
                <HeroPanel
                    eyebrow="React + Material UI + WebAudio"
                    title="Master audio directly in the browser."
                    description="Upload a media file, preview it through live WebAudio filters, adjust the sound with a clean mixer, and render a processed file with your settings baked in."
                    primaryLabel="Open Audio Tool"
                    primaryTo="/audio"
                    secondaryLabel="Learn More"
                    secondaryTo="/"
                    chips={[
                        "File upload",
                        "Direct media links",
                        "EQ filters",
                        "Speed control",
                        "Compression",
                        "WAV export",
                    ]}
                />

                <Box>
                    <SectionTitle
                        eyebrow="Features"
                        title="A real frontend audio tool"
                        description="This is built as a practical React app, not just a mockup. The Audio page creates a live WebAudio graph and uses an OfflineAudioContext to render a downloadable mixed file."
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
                            icon={<GraphicEqRoundedIcon />}
                            title="Live mixer"
                            description="Preview uploaded media through EQ, high-pass, low-pass, compression, gain, and speed controls."
                        />

                        <FeatureCard
                            icon={<SpeedRoundedIcon />}
                            title="Playback speed"
                            description="Slow down or speed up audio and render the exported file with that same speed setting."
                        />

                        <FeatureCard
                            icon={<FileDownloadRoundedIcon />}
                            title="Rendered export"
                            description="Export a processed WAV file with your WebAudio settings applied directly to the audio."
                        />

                        <FeatureCard
                            icon={<SecurityRoundedIcon />}
                            title="Browser-first"
                            description="Uploaded files can be processed locally in the browser without needing a backend server."
                        />
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
                                Start testing the audio engine.
                            </Typography>
                            <Typography sx={{ color: "rgba(255,255,255,0.68)" }}>
                                Use a local MP3, WAV, OGG, MP4, or WebM file for the most
                                reliable results. Direct media links need CORS access.
                            </Typography>
                        </Box>

                        <Button
                            component={RouterLink}
                            to="/audio"
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
                            Launch Audio Tool
                        </Button>
                    </Stack>
                </Box>
            </Stack>
        </PageShell>
    );
}