import React from "react";
import { Helmet } from "react-helmet-async";
import { Link as RouterLink } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Divider,
    Link,
    Stack,
    Typography,
} from "@mui/material";

const SITE_NAME = "AudioMaster Lab";
const SITE_URL = "https://audiomasterlab.com";
const CONTACT_EMAIL = "cloudcordvoice@protonmail.com";

const pageLinks = [
    { label: "Help", to: "/help" },
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
    { label: "Privacy", to: "/privacy" },
    { label: "Terms", to: "/terms" },
    { label: "Copyright", to: "/copyright" },
];

function PageFrame({
                       title,
                       eyebrow,
                       description,
                       canonical,
                       children,
                       maxWidth = "lg",
                   }) {
    const url = `${SITE_URL}${canonical}`;

    return (
        <>
            <Helmet>
                <title>{title}</title>
                <meta name="description" content={description} />
                <link rel="canonical" href={url} />

                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={SITE_NAME} />
                <meta property="og:title" content={`${title} | ${SITE_NAME}`} />
                <meta property="og:description" content={description} />
                <meta property="og:url" content={url} />

                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content={`${title} | ${SITE_NAME}`} />
                <meta name="twitter:description" content={description} />
            </Helmet>

            <Box
                component="main"
                sx={{
                    minHeight: "100vh",
                    py: { xs: 5, md: 8 },
                    background:
                        "radial-gradient(circle at top left, rgba(103,232,249,0.12), transparent 32rem), #070a13",
                    color: "#f8fafc",
                }}
            >
                <Container maxWidth={maxWidth}>
                    <Stack spacing={4}>
                        <Box>
                            <Typography
                                sx={{
                                    color: "#67e8f9",
                                    fontWeight: 950,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    fontSize: 13,
                                    mb: 1.25,
                                }}
                            >
                                {eyebrow}
                            </Typography>

                            <Typography
                                component="h1"
                                sx={{
                                    fontSize: { xs: 36, md: 56 },
                                    lineHeight: 1.02,
                                    fontWeight: 950,
                                    letterSpacing: "-0.05em",
                                    maxWidth: 900,
                                }}
                            >
                                {title}
                            </Typography>

                            <Typography
                                sx={{
                                    color: "#cbd5e1",
                                    fontSize: { xs: 17, md: 20 },
                                    lineHeight: 1.75,
                                    mt: 2,
                                    maxWidth: 900,
                                }}
                            >
                                {description}
                            </Typography>
                        </Box>

                        <Card
                            elevation={0}
                            sx={{
                                borderRadius: 5,
                                background: "rgba(255,255,255,0.065)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                color: "#f8fafc",
                            }}
                        >
                            <CardContent sx={{ p: { xs: 2.25, md: 3.25 } }}>
                                <Stack
                                    direction="row"
                                    flexWrap="wrap"
                                    gap={1}
                                    aria-label={`${SITE_NAME} policy navigation`}
                                >
                                    {pageLinks.map((item) => (
                                        <Button
                                            key={item.to}
                                            component={RouterLink}
                                            to={item.to}
                                            variant={canonical === item.to ? "contained" : "outlined"}
                                            sx={{
                                                borderRadius: 999,
                                                textTransform: "none",
                                                fontWeight: 850,
                                            }}
                                        >
                                            {item.label}
                                        </Button>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>

                        {children}
                    </Stack>
                </Container>
            </Box>
        </>
    );
}

function PolicyCard({ title, children }) {
    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: 5,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#f8fafc",
            }}
        >
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Typography
                    component="h2"
                    sx={{
                        fontSize: { xs: 24, md: 32 },
                        fontWeight: 950,
                        letterSpacing: "-0.035em",
                        mb: 1.5,
                    }}
                >
                    {title}
                </Typography>

                <Box
                    sx={{
                        color: "#cbd5e1",
                        fontSize: 16.5,
                        lineHeight: 1.8,
                        "& p": { mt: 0, mb: 1.75 },
                        "& ul": { pl: 3, mb: 1.75 },
                        "& li": { mb: 0.8 },
                        "& strong": { color: "#ffffff" },
                        "& a": { color: "#67e8f9", fontWeight: 800 },
                    }}
                >
                    {children}
                </Box>
            </CardContent>
        </Card>
    );
}

function SimpleList({ items }) {
    return (
        <Box component="ul">
            {items.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </Box>
    );
}

export function Help() {
    return (
        <PageFrame
            title="Help Center"
            eyebrow="Support"
            canonical="/help"
            description="Learn how to use AudioMaster Lab for browser-based audio editing, recording, waveform viewing, WebAudio effects, transcription, and WAV export."
        >
            <PolicyCard title="Getting started">
                <p>
                    AudioMaster Lab is a browser-based audio workspace. You can use it
                    to upload your own audio, record microphone input, preview waveform
                    visuals, adjust effects, and export processed files from supported
                    browser tools.
                </p>

                <SimpleList
                    items={[
                        "Use Audio to apply quick whole-track controls such as EQ, compression, panning, delay, reverb, speed, and output gain.",
                        "Use Recorder to capture microphone audio, view the waveform, play it back, and export supported formats.",
                        "Use Editor for timeline-style work where effects are placed on specific sections of the audio.",
                        "Use Transcribe to create text from an uploaded audio file when your browser and device support the required model runtime.",
                    ]}
                />
            </PolicyCard>

            <PolicyCard title="Recommended workflow">
                <SimpleList
                    items={[
                        "Start with audio you own, created yourself, licensed, public domain, or have permission to edit.",
                        "Upload or record the audio in the browser.",
                        "Preview the waveform and listen before applying strong effects.",
                        "Use subtle EQ and compression first, then add creative effects such as reverb or delay.",
                        "Export a test file and compare it with the original before publishing anywhere.",
                    ]}
                />
            </PolicyCard>

            <PolicyCard title="Troubleshooting">
                <SimpleList
                    items={[
                        "If audio does not play, tap or click Play again because browsers often require user interaction before starting audio.",
                        "If a file does not load, try a smaller WAV, MP3, M4A, WebM, or OGG file supported by your browser.",
                        "If export is slow, close other tabs and try a shorter file first.",
                        "If transcription fails, try a shorter file, reduce file size, or refresh the page before trying again.",
                        "If mobile audio is quiet, check device volume, Bluetooth routing, AirPlay, and browser permissions.",
                    ]}
                />
            </PolicyCard>

            <Alert
                severity="info"
                sx={{
                    borderRadius: 4,
                    background: "rgba(103,232,249,0.12)",
                    color: "#e0f2fe",
                    border: "1px solid rgba(103,232,249,0.25)",
                    "& .MuiAlert-icon": { color: "#67e8f9" },
                }}
            >
                AudioMaster Lab is intended for original, licensed, public-domain,
                Creative Commons, or otherwise authorized audio. Do not use the tools
                to violate copyright or platform terms.
            </Alert>
        </PageFrame>
    );
}

export function About() {
    return (
        <PageFrame
            title="About AudioMaster Lab"
            eyebrow="About"
            canonical="/about"
            description="AudioMaster Lab is a browser-first audio tool built for creators who want simple editing, recording, visualization, and WebAudio processing without installing desktop software."
        >
            <PolicyCard title="What AudioMaster Lab does">
                <p>
                    AudioMaster Lab provides browser-based audio tools for creators,
                    students, podcasters, musicians, and editors who want a fast way to
                    inspect and process sound. The app focuses on WebAudio features such
                    as waveform visualization, effect controls, recording, timeline
                    editing, and local export workflows.
                </p>

                <p>
                    The goal is to make audio editing easier to understand. Instead of
                    hiding everything behind complex studio menus, AudioMaster Lab uses
                    readable controls, visual feedback, and guided pages that explain
                    what each tool does.
                </p>
            </PolicyCard>

            <PolicyCard title="Content and audio use">
                <p>
                    AudioMaster Lab is built for lawful audio workflows. Users should
                    work with recordings they created, own, licensed, received permission
                    to edit, or audio that is clearly public domain or Creative Commons
                    with compatible terms.
                </p>

                <SimpleList
                    items={[
                        "Original recordings",
                        "Voice notes and podcasts you created",
                        "Public-domain audio",
                        "Creative Commons audio with compatible licensing",
                        "Educational audio files you have permission to process",
                    ]}
                />
            </PolicyCard>

            <PolicyCard title="Browser-first approach">
                <p>
                    Many editing and preview features run directly in the browser using
                    web platform APIs. Some advanced features, such as transcription
                    models or third-party embedded content, may require additional
                    downloads, remote resources, or browser support.
                </p>
            </PolicyCard>
        </PageFrame>
    );
}

export function Contact() {
    return (
        <PageFrame
            title="Contact"
            eyebrow="Contact"
            canonical="/contact"
            description="Contact AudioMaster Lab for support, copyright questions, privacy requests, bug reports, and general site feedback."
        >
            <PolicyCard title="Contact AudioMaster Lab">
                <p>
                    For support, privacy questions, copyright requests, bug reports, or
                    general feedback, contact the AudioMaster Lab team by email.
                </p>

                <Button
                    component="a"
                    href={`mailto:${CONTACT_EMAIL}`}
                    variant="contained"
                    sx={{
                        borderRadius: 999,
                        textTransform: "none",
                        fontWeight: 950,
                        mt: 1,
                    }}
                >
                    Email {CONTACT_EMAIL}
                </Button>

                <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.12)" }} />

                <Typography component="h2" sx={{ color: "#fff", fontWeight: 950, mb: 1 }}>
                    What to include
                </Typography>

                <SimpleList
                    items={[
                        "The page or tool you were using",
                        "Your browser and device type",
                        "A short description of the issue",
                        "Screenshots only if they do not include private information",
                        "For copyright requests, include the work, URL, ownership details, and your contact information",
                    ]}
                />
            </PolicyCard>

            <PolicyCard title="Response notes">
                <p>
                    AudioMaster Lab cannot guarantee support for every browser, device,
                    file type, or third-party media source. Reports are reviewed to
                    improve stability, accessibility, documentation, and policy
                    compliance.
                </p>
            </PolicyCard>
        </PageFrame>
    );
}

export function Privacy() {
    return (
        <PageFrame
            title="Privacy Policy"
            eyebrow="Privacy"
            canonical="/privacy"
            description="Read the AudioMaster Lab privacy policy, including browser storage, cookies, audio processing, analytics, advertising, and contact information."
        >
            <PolicyCard title="Overview">
                <p>
                    This Privacy Policy explains how AudioMaster Lab handles information
                    when you use the website and browser-based audio tools. The site is
                    designed to keep many audio workflows local to your browser whenever
                    possible.
                </p>

                <p>
                    Last updated: July 2, 2026.
                </p>
            </PolicyCard>

            <PolicyCard title="Audio files and local processing">
                <p>
                    AudioMaster Lab may allow you to upload, record, preview, edit,
                    visualize, and export audio inside your browser. Browser-based audio
                    processing may use local memory, temporary object URLs, WebAudio APIs,
                    and local browser features.
                </p>

                <p>
                    Unless a specific feature clearly says it uses a remote service, your
                    uploaded audio is intended to be processed locally in your browser.
                    You should not upload private, sensitive, copyrighted, or confidential
                    audio unless you understand the feature you are using.
                </p>
            </PolicyCard>

            <PolicyCard title="Browser storage and cookies">
                <p>
                    AudioMaster Lab may use browser storage such as localStorage,
                    sessionStorage, and cookies to remember settings, saved queries,
                    interface preferences, playlists, tool states, or similar app
                    functionality.
                </p>

                <SimpleList
                    items={[
                        "Local settings may be stored on your device.",
                        "Saved preferences may remain until you clear browser data.",
                        "Some browser storage may be used to improve navigation and tool behavior.",
                        "You can clear site data using your browser settings.",
                    ]}
                />
            </PolicyCard>

            <PolicyCard title="Advertising and third-party vendors">
                <p>
                    AudioMaster Lab may display advertising from Google AdSense or other
                    advertising partners. Third-party vendors, including Google, may use
                    cookies or similar technologies to serve ads based on prior visits to
                    this website or other websites.
                </p>

                <p>
                    Google may use advertising cookies to serve personalized or
                    non-personalized ads. Users can manage Google ad personalization
                    through Google ad settings and browser privacy controls.
                </p>
            </PolicyCard>

            <PolicyCard title="Analytics and diagnostics">
                <p>
                    AudioMaster Lab may use analytics or diagnostic tools to understand
                    site performance, page usage, browser compatibility, and errors.
                    Analytics information is used to improve the website and does not
                    replace your browser privacy controls.
                </p>
            </PolicyCard>

            <PolicyCard title="Third-party services and links">
                <p>
                    Some pages may link to or embed third-party services. Third-party
                    websites and services have their own privacy policies, terms, cookies,
                    and data practices. AudioMaster Lab is not responsible for the privacy
                    practices of third-party websites.
                </p>
            </PolicyCard>

            <PolicyCard title="Your choices">
                <SimpleList
                    items={[
                        "Clear cookies and site data in your browser.",
                        "Use browser privacy settings to limit storage or third-party cookies.",
                        "Do not upload audio that you do not want processed by browser tools.",
                        "Contact AudioMaster Lab for privacy-related questions.",
                    ]}
                />

                <p>
                    Privacy questions can be sent to{" "}
                    <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>.
                </p>
            </PolicyCard>
        </PageFrame>
    );
}

export function Terms() {
    return (
        <PageFrame
            title="Terms of Use"
            eyebrow="Terms"
            canonical="/terms"
            description="Read the AudioMaster Lab terms of use for acceptable use, audio rights, browser tools, third-party services, disclaimers, and limitations."
        >
            <PolicyCard title="Acceptance of terms">
                <p>
                    By using AudioMaster Lab, you agree to use the site responsibly and
                    only for lawful audio workflows. If you do not agree with these
                    terms, do not use the website.
                </p>

                <p>
                    Last updated: July 2, 2026.
                </p>
            </PolicyCard>

            <PolicyCard title="Acceptable use">
                <p>
                    You may use AudioMaster Lab for audio you own, created, licensed, or
                    otherwise have permission to process. You are responsible for making
                    sure your use of the site and exported files is lawful.
                </p>

                <SimpleList
                    items={[
                        "Do not use the site to infringe copyrights or other intellectual property rights.",
                        "Do not use the site to bypass access controls, digital rights management, or platform restrictions.",
                        "Do not upload or process content you are not allowed to use.",
                        "Do not use the site to distribute harmful, illegal, deceptive, or abusive content.",
                        "Do not interfere with the site, abuse APIs, scrape excessively, or attempt to disrupt service.",
                    ]}
                />
            </PolicyCard>

            <PolicyCard title="No professional guarantee">
                <p>
                    AudioMaster Lab is provided as a browser-based creative and
                    educational tool. It is not a replacement for professional audio
                    engineering, legal advice, copyright advice, or accessibility review.
                    Results depend on your browser, device, file type, and settings.
                </p>
            </PolicyCard>

            <PolicyCard title="Third-party content and services">
                <p>
                    Some features may interact with third-party services, embedded
                    content, browser APIs, external models, or external resources. Your
                    use of those services may be governed by their own terms and
                    policies.
                </p>
            </PolicyCard>

            <PolicyCard title="Changes and availability">
                <p>
                    AudioMaster Lab may change, remove, or update tools, pages, features,
                    policies, or supported formats at any time. The site may not always be
                    available and may not work on every browser or device.
                </p>
            </PolicyCard>

            <PolicyCard title="Contact">
                <p>
                    Questions about these terms can be sent to{" "}
                    <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>.
                </p>
            </PolicyCard>
        </PageFrame>
    );
}

export function Copyright() {
    return (
        <PageFrame
            title="Copyright Policy"
            eyebrow="Copyright"
            canonical="/copyright"
            description="AudioMaster Lab is intended for lawful audio workflows. Read the copyright policy and learn how to report suspected infringement."
        >
            <PolicyCard title="Lawful audio use">
                <p>
                    AudioMaster Lab is intended for original audio, licensed audio,
                    public-domain audio, Creative Commons audio with compatible terms, and
                    other content you have permission to edit or process.
                </p>

                <p>
                    Users are responsible for making sure they have the rights required
                    to upload, edit, transform, export, publish, or share any audio they
                    use with AudioMaster Lab.
                </p>
            </PolicyCard>

            <PolicyCard title="Prohibited copyright misuse">
                <SimpleList
                    items={[
                        "Do not use AudioMaster Lab to infringe copyrights.",
                        "Do not use the tools to distribute unauthorized copies of copyrighted music, recordings, podcasts, or other media.",
                        "Do not use the site to bypass platform restrictions or digital rights management.",
                        "Do not submit copyright-protected content unless you have the right to use it.",
                    ]}
                />
            </PolicyCard>

            <PolicyCard title="Copyright removal requests">
                <p>
                    If you believe content on AudioMaster Lab infringes your copyright,
                    contact us with enough information to review the request.
                </p>

                <SimpleList
                    items={[
                        "Your name and contact information",
                        "A description of the copyrighted work",
                        "The specific AudioMaster Lab URL or location involved",
                        "A statement that you believe the use is unauthorized",
                        "A statement that the information you provided is accurate",
                        "Your physical or electronic signature",
                    ]}
                />

                <p>
                    Send copyright requests to{" "}
                    <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>.
                </p>
            </PolicyCard>

            <PolicyCard title="Repeat infringement">
                <p>
                    AudioMaster Lab may restrict or remove access to features when there
                    is evidence of repeated copyright misuse, abuse, unlawful activity, or
                    policy violations.
                </p>
            </PolicyCard>
        </PageFrame>
    );
}