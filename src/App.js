import React, { Suspense, useEffect, useMemo } from "react";
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
    useLocation,
} from "react-router-dom";
import { StaticRouter } from "react-router";
import { Box, CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { Provider } from "react-redux";

import { audioStore } from "./store/audioStore.js";
import { audioPlayerActions } from "./store/audioPlayerSlice.js";

import YoutubePage from "./pages/Youtube.js";
import { NavBar } from "./components/Components.js";
import Home from "./pages/Home.js";
import Audio from "./pages/Audio.js";
import Editor from "./pages/Editor.js";
import Recorder from "./pages/Recorder.js";
import ArchiveAudioBrowser from "./pages/Archive.js";
import Community from "./pages/Community.js";
import NewsPage from "./pages/News.js";
import Transcribe from "./pages/Transcribe.js";
import Visualizer from "./pages/Visualizer.js";
import {
    Help,
    About,
    Contact,
    Privacy,
    Terms,
    Copyright,
} from "./pages/PolicyPages.js";

const SITE_NAME = "AudioMaster Lab";
const SITE_URL = "https://audiomasterlab.com";
const SOCIAL_IMAGE = `${SITE_URL}/social-preview.png`;

const ROUTE_SEO = {
    "/": {
        title: "Browser Audio Editor, Recorder, Visualizer & WAV Export Tool",
        description:
            "AudioMaster Lab is a browser-based audio workspace for editing, recording, visualizing, mixing, mastering, transcribing, and exporting audio with WebAudio tools.",
        keywords:
            "AudioMaster Lab, browser audio editor, online audio editor, WebAudio editor, audio recorder, waveform editor, audio visualizer, WAV export",
    },
    "/audio": {
        title: "Audio Tools",
        description:
            "Upload audio, build playlists, apply WebAudio mixer presets, slow tracks, add reverb, improve playback, and export browser-rendered audio.",
        keywords:
            "browser audio tools, WebAudio playlist, online audio mixer, slowed reverb, browser audio player, WAV export",
    },
    "/editor": {
        title: "Audio Editor",
        description:
            "AudioMaster Lab Editor is a browser-based WebAudio timeline editor with waveform view, playhead seeking, region effect blocks, autosave, undo, redo, project JSON import/export, destructive apply, and WAV rendering.",
        keywords:
            "AudioMaster Lab editor, WebAudio timeline editor, browser audio editor, waveform editor, effect blocks, WAV export, audio effects, online audio editor",
    },
    "/recorder": {
        title: "Recorder",
        description:
            "Record vocals, microphones, USB audio interfaces, guitar amp line outputs, and instrument takes in the browser with a WebAudio waveform player and export tools.",
        keywords:
            "browser recorder, online audio recorder, WebAudio waveform, WAV recorder, MP3 recorder, Focusrite recorder, guitar amp recorder, audio interface recorder",
    },
    "/youtube": {
        title: "YouTube Audio Tools",
        description:
            "Search, load, and manage embeddable YouTube videos in a browser-based audio workspace with saved queries and playlist-style controls.",
        keywords:
            "YouTube audio tools, YouTube search, embeddable YouTube player, browser audio workspace, video playlist",
    },
    "/news": {
        title: "Music News, New Releases & Video Drops",
        description:
            "Follow music news, new release previews, latest YouTube music videos, Spotify embeds, SoundCloud embeds, NPR stories, and public music updates in AudioMaster Lab.",
        keywords:
            "music news, new music releases, AudioMaster Lab news, NPR music news, YouTube music videos, Spotify embeds, SoundCloud embeds, music articles",
    },
    "/transcribe": {
        title: "Audio Transcribe",
        description:
            "Upload audio, load direct Archive.org media links, choose stronger Whisper models, create browser-based transcripts, and export TXT, SRT, VTT, and JSON.",
        keywords:
            "audio transcribe, browser transcription, Whisper transcription, Archive.org audio transcription, SRT export, VTT export, transcript JSON",
    },
    "/visualizer": {
        title: "3D Audio Visualizer Studio",
        description:
            "Create waveform, spectrum, oscilloscope, and 3D WebAudio visualizations in the browser with animated visualizer tools and FBX-style export options.",
        keywords:
            "audio visualizer, 3D audio visualizer, WebAudio visualizer, spectrum analyzer, waveform visualizer, browser music visualizer, animated FBX export",
    },
    "/archive": {
        title: "Archive Audio Browser",
        description:
            "Search safe public Archive.org audio collections, load direct media links, build playlists, and play browser-supported audio files in AudioMaster Lab.",
        keywords:
            "Archive.org audio browser, public domain audio, Creative Commons audio, direct media links, Archive.org playlist",
    },
    "/community": {
        title: "Community",
        description:
            "Browse and share AudioMaster Lab community posts, tracks, projects, and browser-audio discoveries.",
        keywords:
            "AudioMaster Lab community, music community, shared tracks, browser audio projects",
    },
    "/help": {
        title: "Help",
        description:
            "Learn how to use AudioMaster Lab audio editing, recording, playlist, transcription, Archive.org, YouTube, and visualizer tools.",
        keywords:
            "AudioMaster Lab help, audio editor help, browser audio help, WebAudio tool guide",
    },
    "/about": {
        title: "About",
        description:
            "AudioMaster Lab is a browser-based audio workspace built for editing, recording, visualizing, transcribing, mixing, mastering, and exporting audio.",
        keywords:
            "about AudioMaster Lab, browser audio workspace, WebAudio app",
    },
    "/contact": {
        title: "Contact",
        description:
            "Contact AudioMaster Lab for questions, support, feedback, and browser audio tool requests.",
        keywords:
            "contact AudioMaster Lab, audio tool support, browser audio feedback",
    },
    "/privacy": {
        title: "Privacy Policy",
        description:
            "Read the AudioMaster Lab privacy policy for information about browser-based audio tools, local processing, saved settings, and user data.",
        keywords:
            "AudioMaster Lab privacy policy, browser audio privacy, WebAudio privacy",
    },
    "/terms": {
        title: "Terms",
        description:
            "Read the AudioMaster Lab terms for using the browser-based audio editor, recorder, visualizer, transcription, playlist, and export tools.",
        keywords:
            "AudioMaster Lab terms, browser audio app terms, WebAudio terms",
    },
    "/copyright": {
        title: "Copyright",
        description:
            "Read AudioMaster Lab copyright information and responsible media-use guidance for browser-based audio tools.",
        keywords:
            "AudioMaster Lab copyright, audio copyright, responsible media use",
    },
};

function normalizePathname(pathname) {
    if (!pathname || pathname === "/") {
        return "/";
    }

    const normalized = pathname.replace(/\/+$/, "") || "/";

    return normalized === "/transcripe" ? "/transcribe" : normalized;
}

function canonicalForPath(pathname) {
    const cleanPath = normalizePathname(pathname);
    return cleanPath === "/" ? `${SITE_URL}/` : `${SITE_URL}${cleanPath}`;
}

function getSeoForPath(pathname) {
    const path = normalizePathname(pathname);
    const fallback = ROUTE_SEO["/"];

    return {
        path,
        url: canonicalForPath(path),
        ...(ROUTE_SEO[path] || fallback),
    };
}

function buildBreadcrumbJsonLd(seo) {
    const itemListElement = [
        {
            "@type": "ListItem",
            position: 1,
            name: SITE_NAME,
            item: `${SITE_URL}/`,
        },
    ];

    if (seo.path !== "/") {
        itemListElement.push({
            "@type": "ListItem",
            position: 2,
            name: seo.title,
            item: seo.url,
        });
    }

    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement,
    };
}

function buildSoftwareJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web Browser",
        url: `${SITE_URL}/`,
        image: SOCIAL_IMAGE,
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
            "Archive.org direct media playback",
            "Playlist controls",
            "3D audio visualization",
            "Music news feeds",
            "New release preview cards",
            "YouTube, Spotify, and SoundCloud previews",
        ],
        sameAs: [
            "https://suiteofficelab.com/",
            "https://imagemasterlab.com/",
            "https://musicstudiolab.com/",
            "https://cloud-cord.com/",
        ],
    };
}

function buildWebsiteJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description:
            "Browser-based audio editing, recording, visualization, transcription, playlist, news, and WAV export tools.",
        publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            url: `${SITE_URL}/`,
            logo: {
                "@type": "ImageObject",
                url: SOCIAL_IMAGE,
            },
        },
    };
}

function RouteSeo() {
    const location = useLocation();
    const seo = useMemo(
        () => getSeoForPath(location.pathname),
        [location.pathname]
    );
    const pageTitle = `${seo.title} | ${SITE_NAME}`;

    return (
        <Helmet>
            <html lang="en" />
            <title>{pageTitle}</title>

            <meta name="description" content={seo.description} />
            <meta name="keywords" content={seo.keywords} />
            <meta
                name="robots"
                content="index, follow, max-image-preview:large"
            />
            <meta name="theme-color" content="#070a13" />
            <meta name="application-name" content={SITE_NAME} />

            <link rel="canonical" href={seo.url} />

            <meta property="og:type" content="website" />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={seo.description} />
            <meta property="og:url" content={seo.url} />
            <meta property="og:image" content={SOCIAL_IMAGE} />
            <meta
                property="og:image:alt"
                content={`${SITE_NAME} browser audio tools preview`}
            />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={seo.description} />
            <meta name="twitter:image" content={SOCIAL_IMAGE} />

            <script type="application/ld+json">
                {JSON.stringify(buildWebsiteJsonLd())}
            </script>
            <script type="application/ld+json">
                {JSON.stringify(buildSoftwareJsonLd())}
            </script>
            <script type="application/ld+json">
                {JSON.stringify(buildBreadcrumbJsonLd(seo))}
            </script>
        </Helmet>
    );
}

function PageLoadingFallback() {
    return (
        <Box
            component="main"
            sx={{
                minHeight: "70vh",
                p: { xs: 3, md: 4 },
                color: "#fff",
                display: "grid",
                placeItems: "center",
                textAlign: "center",
            }}
            aria-live="polite"
        >
            Loading AudioMaster Lab page...
        </Box>
    );
}

function NotFoundRedirect() {
    /*
     * On the server, Navigate cannot perform an HTTP redirect itself.
     * Your SSR request handler should return a real 404 or 302 before rendering
     * unknown paths. This remains useful for client-side navigation.
     */
    return <Navigate to="/" replace />;
}

function AppRoutes() {
    return (
        <>
            <RouteSeo />

            <Box sx={{ minHeight: "100vh", background: "#070a13" }}>
                <NavBar />

                <Suspense fallback={<PageLoadingFallback />}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/audio" element={<Audio />} />
                        <Route path="/recorder" element={<Recorder />} />
                        <Route path="/editor" element={<Editor />} />
                        <Route path="/youtube" element={<YoutubePage />} />
                        <Route path="/news" element={<NewsPage />} />
                        <Route path="/transcribe" element={<Transcribe />} />
                        <Route path="/transcripe" element={<Navigate to="/transcribe" replace />} />
                        <Route path="/community" element={<Community />} />
                        <Route path="/visualizer" element={<Visualizer />} />
                        <Route path="/archive" element={<ArchiveAudioBrowser />} />

                        <Route path="/help" element={<Help />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/copyright" element={<Copyright />} />

                        <Route path="*" element={<NotFoundRedirect />} />
                    </Routes>
                </Suspense>
            </Box>
        </>
    );
}

function PwaRegistration() {
    useEffect(() => {
        let registrationController;
        let cancelled = false;

        async function register() {
            try {
                const { registerAudioServiceWorker } = await import(
                    "./pwa/registerAudioServiceWorker.js"
                    );

                if (cancelled) {
                    return;
                }

                registrationController = registerAudioServiceWorker({
                    onRegistered: () => {
                        audioStore.dispatch(
                            audioPlayerActions.setPwaStatus({
                                serviceWorkerSupported: true,
                                serviceWorkerRegistered: true,
                                serviceWorkerReady: false,
                                offlineReady: false,
                                updateAvailable: false,
                                lastMessage:
                                    "AudioMaster Lab service worker registered.",
                            })
                        );
                    },
                    onReady: () => {
                        audioStore.dispatch(
                            audioPlayerActions.setPwaStatus({
                                serviceWorkerSupported: true,
                                serviceWorkerRegistered: true,
                                serviceWorkerReady: true,
                                offlineReady: false,
                                updateAvailable: false,
                                lastMessage:
                                    "AudioMaster Lab is ready for app-shell caching.",
                            })
                        );
                    },
                    onOfflineReady: () => {
                        audioStore.dispatch(
                            audioPlayerActions.setPwaStatus({
                                serviceWorkerSupported: true,
                                serviceWorkerRegistered: true,
                                serviceWorkerReady: true,
                                offlineReady: true,
                                updateAvailable: false,
                                lastMessage:
                                    "AudioMaster Lab app shell is ready offline.",
                            })
                        );
                    },
                    onNeedRefresh: ({ updateServiceWorker } = {}) => {
                        audioStore.dispatch(
                            audioPlayerActions.markPwaUpdateReady({
                                updateServiceWorkerAvailable:
                                    Boolean(updateServiceWorker),
                                lastMessage:
                                    "A fresh AudioMaster Lab version is ready.",
                            })
                        );
                    },
                    onControlling: () => {
                        audioStore.dispatch(
                            audioPlayerActions.setPwaStatus({
                                serviceWorkerSupported: true,
                                serviceWorkerRegistered: true,
                                serviceWorkerReady: true,
                                offlineReady: true,
                                updateAvailable: false,
                                lastMessage:
                                    "AudioMaster Lab is now controlled by the updated service worker.",
                            })
                        );
                    },
                    onError: (error) => {
                        audioStore.dispatch(
                            audioPlayerActions.setPwaStatus({
                                serviceWorkerSupported:
                                    typeof navigator !== "undefined" &&
                                    "serviceWorker" in navigator,
                                serviceWorkerRegistered: false,
                                serviceWorkerReady: false,
                                offlineReady: false,
                                updateAvailable: false,
                                lastMessage:
                                    error?.message ||
                                    "Service worker registration failed.",
                            })
                        );
                    },
                });
            } catch (error) {
                audioStore.dispatch(
                    audioPlayerActions.setPwaStatus({
                        serviceWorkerSupported:
                            typeof navigator !== "undefined" &&
                            "serviceWorker" in navigator,
                        serviceWorkerRegistered: false,
                        serviceWorkerReady: false,
                        offlineReady: false,
                        updateAvailable: false,
                        lastMessage:
                            error?.message ||
                            "Service worker module could not be loaded.",
                    })
                );
            }
        }

        register();

        return () => {
            cancelled = true;

            if (registrationController?.destroy) {
                registrationController.destroy();
            }
        };
    }, []);

    return null;
}

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#67e8f9",
        },
        secondary: {
            main: "#a78bfa",
        },
        background: {
            default: "#070a13",
            paper: "#0d1224",
        },
    },
    typography: {
        fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        button: {
            textTransform: "none",
            fontWeight: 850,
        },
    },
    shape: {
        borderRadius: 18,
    },
});

/**
 * SSR-capable application root.
 *
 * Browser:
 *   <App />
 *
 * Server:
 *   <App
 *       url={new URL(request.url).pathname + new URL(request.url).search}
 *       helmetContext={helmetContext}
 *       store={requestScopedStore}
 *   />
 *
 * IMPORTANT:
 * For production SSR, pass a newly-created Redux store for every request.
 * Reusing the imported audioStore on the server can leak state between users.
 */
export default function App({
                                url = "/",
                                helmetContext,
                                store = audioStore,
                            }) {
    const isBrowser = typeof window !== "undefined";

    const router = isBrowser ? (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    ) : (
        <StaticRouter location={url}>
            <AppRoutes />
        </StaticRouter>
    );

    return (
        <Provider store={store}>
            <HelmetProvider context={helmetContext}>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    {isBrowser ? <PwaRegistration /> : null}
                    {router}
                </ThemeProvider>
            </HelmetProvider>
        </Provider>
    );
}