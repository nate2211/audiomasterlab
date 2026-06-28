import React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
    AppBar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Divider,
    Paper,
    Slider,
    Stack,
    TextField,
    Toolbar,
    Typography,
} from "@mui/material";

import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import AudiotrackRoundedIcon from "@mui/icons-material/AudiotrackRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";

export function NavBar() {
    const location = useLocation();

    const navItems = [
        {
            label: "Home",
            path: "/",
            icon: <HomeRoundedIcon fontSize="small" />,
        },
        {
            label: "Audio Tool",
            path: "/audio",
            icon: <GraphicEqRoundedIcon fontSize="small" />,
        },
        {
            label: "YouTube",
            path: "/youtube",
            icon: <YouTubeIcon fontSize="small" />,
        },
        {
            label: "Editor",
            path: "/editor",
            icon: <TimelineRoundedIcon fontSize="small" />,
        },
    ];

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                background:
                    "linear-gradient(90deg, rgba(8,11,24,0.96), rgba(14,20,42,0.94))",
                backdropFilter: "blur(14px)",
                zIndex: 50,
            }}
        >
            <Toolbar sx={{ minHeight: 76 }}>
                <Container
                    maxWidth="xl"
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        px: { xs: 1, sm: 2 },
                    }}
                >
                    <Stack
                        component={RouterLink}
                        to="/"
                        direction="row"
                        spacing={1.4}
                        alignItems="center"
                        sx={{
                            minWidth: 0,
                            textDecoration: "none",
                            color: "inherit",
                        }}
                    >
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
                                flex: "0 0 auto",
                                borderRadius: "14px",
                                display: "grid",
                                placeItems: "center",
                                background:
                                    "linear-gradient(135deg, rgba(103,232,249,0.95), rgba(167,139,250,0.95))",
                                boxShadow: "0 16px 44px rgba(103,232,249,0.22)",
                                color: "#06111e",
                            }}
                        >
                            <AudiotrackRoundedIcon />
                        </Box>

                        <Box sx={{ minWidth: 0, display: { xs: "none", sm: "block" } }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 900,
                                    lineHeight: 1,
                                    letterSpacing: "-0.03em",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                AudioMaster Lab
                            </Typography>

                            <Typography
                                variant="caption"
                                sx={{ color: "rgba(255,255,255,0.62)" }}
                            >
                                WebAudio mastering + playlists
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack
                        direction="row"
                        spacing={{ xs: 0.5, sm: 1 }}
                        sx={{
                            overflowX: "auto",
                            maxWidth: "100%",
                            pb: 0.2,
                            "&::-webkit-scrollbar": {
                                height: 0,
                            },
                        }}
                    >
                        {navItems.map((item) => {
                            const active = location.pathname === item.path;

                            return (
                                <Button
                                    key={item.path}
                                    component={RouterLink}
                                    to={item.path}
                                    startIcon={item.icon}
                                    variant={active ? "contained" : "text"}
                                    sx={{
                                        flex: "0 0 auto",
                                        borderRadius: 999,
                                        color: active ? "#08111f" : "rgba(255,255,255,0.78)",
                                        background: active
                                            ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                            : "transparent",
                                        fontWeight: 900,
                                        px: { xs: 1.35, sm: 2.2 },
                                        minWidth: { xs: "auto", sm: 64 },
                                        "& .MuiButton-startIcon": {
                                            mr: { xs: 0, sm: 0.8 },
                                        },
                                        "& .MuiButton-startIcon + *": {
                                            display: { xs: "none", sm: "inline" },
                                        },
                                        "&:hover": {
                                            background: active
                                                ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                                                : "rgba(255,255,255,0.08)",
                                        },
                                    }}
                                >
                                    {item.label}
                                </Button>
                            );
                        })}
                    </Stack>
                </Container>
            </Toolbar>
        </AppBar>
    );
}

export function PageShell({ children }) {
    return (
        <Box
            component="main"
            sx={{
                minHeight: "100vh",
                background:
                    "radial-gradient(circle at top left, rgba(103,232,249,0.16), transparent 30%), radial-gradient(circle at top right, rgba(167,139,250,0.14), transparent 34%), #070a13",
                color: "#fff",
                pb: 8,
            }}
        >
            <Container maxWidth="xl" sx={{ pt: { xs: 4, md: 7 } }}>
                {children}
            </Container>
        </Box>
    );
}

export function HeroPanel({
                              eyebrow,
                              title,
                              description,
                              primaryLabel,
                              primaryTo,
                              secondaryLabel,
                              secondaryTo,
                              chips = [],
                          }) {
    return (
        <Paper
            elevation={0}
            sx={{
                overflow: "hidden",
                borderRadius: { xs: 4, md: 7 },
                border: "1px solid rgba(255,255,255,0.1)",
                background:
                    "linear-gradient(135deg, rgba(13,18,36,0.94), rgba(18,25,52,0.78))",
                position: "relative",
            }}
        >
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.48,
                    background:
                        "radial-gradient(circle at 22% 20%, rgba(103,232,249,0.36), transparent 28%), radial-gradient(circle at 78% 18%, rgba(167,139,250,0.34), transparent 28%)",
                }}
            />

            <Box
                sx={{
                    position: "relative",
                    p: { xs: 3, md: 7 },
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr" },
                    gap: 4,
                    alignItems: "center",
                }}
            >
                <Box>
                    <Chip
                        icon={<AutoAwesomeRoundedIcon />}
                        label={eyebrow}
                        sx={{
                            mb: 2.5,
                            color: "#dffaff",
                            background: "rgba(103,232,249,0.12)",
                            border: "1px solid rgba(103,232,249,0.24)",
                            fontWeight: 800,
                        }}
                    />

                    <Typography
                        variant="h1"
                        sx={{
                            maxWidth: 900,
                            fontWeight: 950,
                            fontSize: { xs: "2.55rem", md: "4.8rem" },
                            lineHeight: 0.94,
                            letterSpacing: "-0.075em",
                            mb: 2.5,
                        }}
                    >
                        {title}
                    </Typography>

                    <Typography
                        variant="h6"
                        sx={{
                            maxWidth: 760,
                            color: "rgba(255,255,255,0.72)",
                            lineHeight: 1.65,
                            fontWeight: 500,
                            mb: 3.5,
                        }}
                    >
                        {description}
                    </Typography>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        {primaryLabel && primaryTo && (
                            <Button
                                component={RouterLink}
                                to={primaryTo}
                                size="large"
                                variant="contained"
                                startIcon={<TuneRoundedIcon />}
                                sx={{
                                    borderRadius: 999,
                                    px: 3,
                                    py: 1.35,
                                    fontWeight: 900,
                                    color: "#06111e",
                                    background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                                    boxShadow: "0 18px 46px rgba(103,232,249,0.25)",
                                }}
                            >
                                {primaryLabel}
                            </Button>
                        )}

                        {secondaryLabel && secondaryTo && (
                            <Button
                                component={RouterLink}
                                to={secondaryTo}
                                size="large"
                                variant="outlined"
                                sx={{
                                    borderRadius: 999,
                                    px: 3,
                                    py: 1.35,
                                    fontWeight: 900,
                                    color: "#fff",
                                    borderColor: "rgba(255,255,255,0.22)",
                                }}
                            >
                                {secondaryLabel}
                            </Button>
                        )}
                    </Stack>
                </Box>

                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 5,
                        background: "rgba(255,255,255,0.075)",
                        border: "1px solid rgba(255,255,255,0.11)",
                        backdropFilter: "blur(14px)",
                    }}
                >
                    <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                        <Stack spacing={2}>
                            <Typography variant="h6" sx={{ fontWeight: 900 }}>
                                Built for browser audio processing
                            </Typography>

                            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                            <Stack direction="row" flexWrap="wrap" gap={1}>
                                {chips.map((chip) => (
                                    <Chip
                                        key={chip}
                                        label={chip}
                                        sx={{
                                            color: "#fff",
                                            background: "rgba(255,255,255,0.09)",
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            fontWeight: 700,
                                        }}
                                    />
                                ))}
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            </Box>
        </Paper>
    );
}

export function GlassCard({ children, sx }) {
    return (
        <Card
            elevation={0}
            sx={{
                height: "100%",
                borderRadius: 5,
                background: "rgba(255,255,255,0.065)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(14px)",
                color: "#fff",
                ...sx,
            }}
        >
            <CardContent sx={{ p: { xs: 2.5, md: 3.2 } }}>{children}</CardContent>
        </Card>
    );
}

export function SectionTitle({ eyebrow, title, description }) {
    return (
        <Box sx={{ mb: 3 }}>
            {eyebrow && (
                <Typography
                    variant="overline"
                    sx={{
                        color: "#67e8f9",
                        fontWeight: 950,
                        letterSpacing: "0.18em",
                    }}
                >
                    {eyebrow}
                </Typography>
            )}

            <Typography
                variant="h3"
                sx={{
                    fontWeight: 950,
                    letterSpacing: "-0.055em",
                    fontSize: { xs: "2rem", md: "3rem" },
                    mb: 1,
                }}
            >
                {title}
            </Typography>

            {description && (
                <Typography sx={{ color: "rgba(255,255,255,0.68)", maxWidth: 760 }}>
                    {description}
                </Typography>
            )}
        </Box>
    );
}

export function FeatureCard({ icon, title, description }) {
    return (
        <GlassCard>
            <Stack spacing={1.6}>
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 3,
                        display: "grid",
                        placeItems: "center",
                        color: "#06111e",
                        background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                    }}
                >
                    {icon}
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {title}
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.68)", lineHeight: 1.7 }}>
                    {description}
                </Typography>
            </Stack>
        </GlassCard>
    );
}

export function MediaInputForm({
                                   fileName,
                                   linkValue,
                                   onLinkChange,
                                   onFileSelect,
                                   onLoadLink,
                                   onClear,
                                   disabled,
                                   multiple = false,
                                   uploadLabel = "Upload media file",
                                   helperText = "Upload an audio/video file or load a direct media URL that allows browser access.",
                               }) {
    return (
        <GlassCard>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 950, mb: 0.5 }}>
                        Media input
                    </Typography>

                    <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
                        {helperText}
                    </Typography>
                </Box>

                <Button
                    component="label"
                    variant="contained"
                    size="large"
                    startIcon={<CloudUploadRoundedIcon />}
                    disabled={disabled}
                    sx={{
                        width: "100%",
                        borderRadius: 999,
                        py: 1.55,
                        px: 2.5,
                        fontWeight: 950,
                        color: "#06111e",
                        background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                        boxShadow: "0 18px 46px rgba(103,232,249,0.18)",
                        cursor: disabled ? "not-allowed" : "pointer",
                        "&:hover": {
                            background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                            filter: "brightness(1.04)",
                        },
                    }}
                >
                    {uploadLabel}
                    <input
                        hidden
                        multiple={multiple}
                        type="file"
                        accept="audio/*,video/*,.mp3,.wav,.ogg,.oga,.opus,.webm,.m4a,.mp4,.mov,.aac,.flac,.aif,.aiff"
                        onChange={(event) => {
                            if (multiple) {
                                const files = Array.from(event.target.files || []);

                                if (files.length) {
                                    onFileSelect(files);
                                }
                            } else {
                                const file = event.target.files?.[0];

                                if (file) {
                                    onFileSelect(file);
                                }
                            }

                            event.target.value = "";
                        }}
                    />
                </Button>

                {fileName && (
                    <Chip
                        label={`Loaded file: ${fileName}`}
                        sx={{
                            justifyContent: "flex-start",
                            color: "#fff",
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            fontWeight: 700,
                        }}
                    />
                )}

                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                    <TextField
                        fullWidth
                        value={linkValue}
                        onChange={(event) => onLinkChange(event.target.value)}
                        disabled={disabled}
                        placeholder="https://example.com/audio.mp3"
                        label="Direct media link"
                        variant="filled"
                        InputLabelProps={{ sx: { color: "rgba(255,255,255,0.62)" } }}
                        InputProps={{
                            sx: {
                                color: "#fff",
                                borderRadius: 3,
                                background: "rgba(255,255,255,0.08)",
                                "&:before": {
                                    borderBottomColor: "rgba(255,255,255,0.14)",
                                },
                                "&:after": {
                                    borderBottomColor: "#67e8f9",
                                },
                            },
                        }}
                    />

                    <Button
                        variant="outlined"
                        onClick={onLoadLink}
                        disabled={disabled || !linkValue.trim()}
                        sx={{
                            minWidth: { xs: "100%", md: 150 },
                            borderRadius: 3,
                            color: "#fff",
                            borderColor: "rgba(255,255,255,0.18)",
                            fontWeight: 900,
                        }}
                    >
                        Load Link
                    </Button>
                </Stack>

                <Button
                    variant="text"
                    onClick={onClear}
                    disabled={disabled}
                    sx={{
                        alignSelf: "flex-start",
                        color: "rgba(255,255,255,0.72)",
                        fontWeight: 800,
                    }}
                >
                    Clear media
                </Button>
            </Stack>
        </GlassCard>
    );
}

export function ControlSlider({
                                  label,
                                  value,
                                  min,
                                  max,
                                  step,
                                  unit = "",
                                  onChange,
                                  disabled,
                              }) {
    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.7 }}>
                <Typography sx={{ fontWeight: 850 }}>{label}</Typography>

                <Typography sx={{ color: "#67e8f9", fontWeight: 900 }}>
                    {Number(value).toFixed(step < 1 ? 2 : 0)}
                    {unit}
                </Typography>
            </Stack>

            <Slider
                value={value}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                onChange={(_, nextValue) => {
                    const cleanValue = Array.isArray(nextValue)
                        ? nextValue[0]
                        : nextValue;

                    onChange(cleanValue);
                }}
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
        </Box>
    );
}

export function StatusBanner({ status, tone = "info" }) {
    const isError = tone === "error";

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 4,
                p: 2,
                color: "#fff",
                background: isError
                    ? "rgba(248,113,113,0.12)"
                    : "rgba(103,232,249,0.1)",
                border: isError
                    ? "1px solid rgba(248,113,113,0.24)"
                    : "1px solid rgba(103,232,249,0.18)",
            }}
        >
            <Typography sx={{ color: "rgba(255,255,255,0.82)", lineHeight: 1.7 }}>
                {status}
            </Typography>
        </Paper>
    );
}

export function RenderButton({
                                 onClick,
                                 disabled,
                                 loading,
                                 label = "Render processed WAV",
                             }) {
    return (
        <Button
            variant="contained"
            size="large"
            startIcon={
                loading ? (
                    <CircularProgress size={18} sx={{ color: "#06111e" }} />
                ) : (
                    <FileDownloadRoundedIcon />
                )
            }
            onClick={onClick}
            disabled={disabled || loading}
            sx={{
                width: "100%",
                borderRadius: 999,
                py: 1.45,
                fontWeight: 950,
                color: "#06111e",
                background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                boxShadow: "0 18px 46px rgba(103,232,249,0.18)",
                "&:hover": {
                    background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
                    filter: "brightness(1.04)",
                },
            }}
        >
            {loading ? "Rendering..." : label}
        </Button>
    );
}