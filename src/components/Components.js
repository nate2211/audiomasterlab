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
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
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
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import SubtitlesRoundedIcon from "@mui/icons-material/SubtitlesRounded";
import AudioFileRoundedIcon from "@mui/icons-material/AudioFileRounded";
import ThreeDRotationRoundedIcon from "@mui/icons-material/ThreeDRotationRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import NewspaperRoundedIcon from "@mui/icons-material/NewspaperRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";

const TOP_LEVEL_NAV_ITEMS = [
    {
        label: "Home",
        path: "/",
        Icon: HomeRoundedIcon,
    },
    {
        label: "Audio Tool",
        path: "/audio",
        Icon: GraphicEqRoundedIcon,
    },
    {
        label: "YouTube",
        path: "/youtube",
        Icon: YouTubeIcon,
    },
    {
        label: "Archive",
        path: "/archive",
        Icon: AudioFileRoundedIcon,
    },
];

const TOOLS_NAV_ITEMS = [
    {
        label: "Recorder",
        path: "/recorder",
        Icon: MicRoundedIcon,
    },
    {
        label: "Editor",
        path: "/editor",
        Icon: TimelineRoundedIcon,
    },
    {
        label: "Transcribe",
        path: "/transcribe",
        Icon: SubtitlesRoundedIcon,
    },
    {
        label: "Visualizer",
        path: "/visualizer",
        Icon: ThreeDRotationRoundedIcon,
    },
        {
        label: "File Share",
        path: "/share",
        Icon: ShareRoundedIcon,
    },
];

const INFO_NAV_ITEMS = [
    {
        label: "News",
        path: "/news",
        Icon: NewspaperRoundedIcon,
    },
    {
        label: "Community",
        path: "/community",
        Icon: PeopleRoundedIcon,
    },
];

function pathIsActive(pathname, path) {
    if (path === "/") {
        return pathname === "/";
    }

    return pathname === path || pathname.startsWith(`${path}/`);
}

export function NavBar() {
    const location = useLocation();

    const [toolsAnchorEl, setToolsAnchorEl] = React.useState(null);
    const [infoAnchorEl, setInfoAnchorEl] = React.useState(null);

    const toolsOpen = Boolean(toolsAnchorEl);
    const infoOpen = Boolean(infoAnchorEl);

    const toolsButtonId = "audiomasterlab-tools-button";
    const toolsMenuId = "audiomasterlab-tools-menu";
    const infoButtonId = "audiomasterlab-info-button";
    const infoMenuId = "audiomasterlab-info-menu";

    const closeToolsMenu = React.useCallback(() => {
        setToolsAnchorEl(null);
    }, []);

    const closeInfoMenu = React.useCallback(() => {
        setInfoAnchorEl(null);
    }, []);

    const closeAllMenus = React.useCallback(() => {
        setToolsAnchorEl(null);
        setInfoAnchorEl(null);
    }, []);

    const toggleToolsMenu = React.useCallback((event) => {
        const nextAnchor = event.currentTarget;

        setInfoAnchorEl(null);
        setToolsAnchorEl((currentAnchor) =>
            currentAnchor ? null : nextAnchor
        );
    }, []);

    const toggleInfoMenu = React.useCallback((event) => {
        const nextAnchor = event.currentTarget;

        setToolsAnchorEl(null);
        setInfoAnchorEl((currentAnchor) =>
            currentAnchor ? null : nextAnchor
        );
    }, []);

    React.useEffect(() => {
        closeAllMenus();
    }, [location.pathname, closeAllMenus]);

    React.useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }

        const handleOrientationChange = () => {
            closeAllMenus();
        };

        window.addEventListener(
            "orientationchange",
            handleOrientationChange
        );

        return () => {
            window.removeEventListener(
                "orientationchange",
                handleOrientationChange
            );
        };
    }, [closeAllMenus]);

    const toolsActive = TOOLS_NAV_ITEMS.some((item) =>
        pathIsActive(location.pathname, item.path)
    );

    const infoActive = INFO_NAV_ITEMS.some((item) =>
        pathIsActive(location.pathname, item.path)
    );

    const navButtonSx = (active) => ({
        flex: "0 0 auto",
        minWidth: { xs: 44, sm: 64 },
        minHeight: 44,
        px: { xs: 1.25, sm: 2.2 },
        borderRadius: 999,
        color: active ? "#08111f" : "rgba(255,255,255,0.78)",
        background: active
            ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
            : "transparent",
        fontWeight: 900,
        whiteSpace: "nowrap",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        WebkitTouchCallout: "none",
        userSelect: "none",
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
        "&:focus-visible": {
            outline: "3px solid rgba(103,232,249,0.52)",
            outlineOffset: 2,
        },
        "@media (hover: none)": {
            "&:hover": {
                background: active
                    ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                    : "transparent",
            },
            "&:active": {
                background: active
                    ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                    : "rgba(255,255,255,0.12)",
            },
        },
    });

    const dropdownButtonSx = (active, open) => ({
        ...navButtonSx(active),
        "& .MuiButton-endIcon": {
            ml: { xs: 0.2, sm: 0.7 },
        },
        "& .MuiButton-endIcon svg": {
            transition: "transform 160ms ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
        },
    });

    const menuPaperSx = {
        mt: 1,
        minWidth: 224,
        maxWidth: "calc(100vw - 16px)",
        borderRadius: 4,
        overflow: "hidden",
        color: "#fff",
        background:
            "linear-gradient(135deg, rgba(13,18,36,0.99), rgba(18,25,52,0.98))",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 22px 70px rgba(0,0,0,0.42)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        transformOrigin: "top right",
        overscrollBehavior: "contain",
    };

    const menuItemSx = (active) => ({
        gap: 1,
        minHeight: 48,
        mx: 0.25,
        my: 0.2,
        py: 1.15,
        px: 1.5,
        borderRadius: 3,
        color: active ? "#06111e" : "rgba(255,255,255,0.84)",
        background: active
            ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
            : "transparent",
        fontWeight: 900,
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        WebkitTouchCallout: "none",
        userSelect: "none",
        "&:hover": {
            background: active
                ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                : "rgba(255,255,255,0.08)",
        },
        "&:focus-visible": {
            outline: "2px solid rgba(103,232,249,0.72)",
            outlineOffset: -2,
        },
        "& .MuiListItemIcon-root": {
            minWidth: 34,
            color: active ? "#06111e" : "rgba(255,255,255,0.72)",
        },
        "@media (hover: none)": {
            "&:hover": {
                background: active
                    ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                    : "transparent",
            },
            "&:active": {
                background: active
                    ? "linear-gradient(135deg, #67e8f9, #a78bfa)"
                    : "rgba(255,255,255,0.12)",
            },
        },
    });

    const handleMenuListKeyDown = (closeMenu) => (event) => {
        if (event.key === "Tab" || event.key === "Escape") {
            closeMenu();
        }
    };

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                background:
                    "linear-gradient(90deg, rgba(8,11,24,0.96), rgba(14,20,42,0.94))",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                zIndex: (theme) => theme.zIndex.appBar,
            }}
        >
            <Toolbar
                disableGutters
                sx={{
                    minHeight: 76,
                    px: { xs: 1, sm: 2 },
                }}
            >
                <Container
                    maxWidth="xl"
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: { xs: 1, sm: 2 },
                        px: { xs: 0, sm: 1 },
                        minWidth: 0,
                    }}
                >
                    <Stack
                        component={RouterLink}
                        to="/"
                        direction="row"
                        spacing={1.4}
                        alignItems="center"
                        aria-label="AudioMaster Lab home"
                        onClick={closeAllMenus}
                        sx={{
                            minWidth: 0,
                            flex: "0 0 auto",
                            textDecoration: "none",
                            color: "inherit",
                            touchAction: "manipulation",
                            WebkitTapHighlightColor: "transparent",
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
                                boxShadow:
                                    "0 16px 44px rgba(103,232,249,0.22)",
                                color: "#06111e",
                            }}
                        >
                            <AudiotrackRoundedIcon />
                        </Box>

                        <Box
                            sx={{
                                minWidth: 0,
                                display: { xs: "none", sm: "block" },
                            }}
                        >
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
                                sx={{
                                    color: "rgba(255,255,255,0.62)",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                WebAudio mastering + playlists
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack
                        component="nav"
                        aria-label="Primary navigation"
                        direction="row"
                        spacing={{ xs: 0.45, sm: 1 }}
                        sx={{
                            minWidth: 0,
                            maxWidth: "100%",
                            overflowX: "auto",
                            overflowY: "hidden",
                            pb: 0.25,
                            pr: 0.25,
                            scrollBehavior: "smooth",
                            WebkitOverflowScrolling: "touch",
                            overscrollBehaviorX: "contain",
                            scrollbarWidth: "none",
                            "&::-webkit-scrollbar": {
                                display: "none",
                            },
                        }}
                    >
                        {TOP_LEVEL_NAV_ITEMS.map((item) => {
                            const active = pathIsActive(
                                location.pathname,
                                item.path
                            );
                            const ItemIcon = item.Icon;

                            return (
                                <Button
                                    key={item.path}
                                    component={RouterLink}
                                    to={item.path}
                                    type="button"
                                    aria-current={active ? "page" : undefined}
                                    aria-label={item.label}
                                    startIcon={
                                        <ItemIcon fontSize="small" />
                                    }
                                    variant={active ? "contained" : "text"}
                                    onClick={closeAllMenus}
                                    sx={navButtonSx(active)}
                                >
                                    {item.label}
                                </Button>
                            );
                        })}

                        <Button
                            id={toolsButtonId}
                            type="button"
                            aria-label="Open tools navigation menu"
                            aria-controls={toolsOpen ? toolsMenuId : undefined}
                            aria-haspopup="menu"
                            aria-expanded={toolsOpen ? "true" : undefined}
                            startIcon={
                                <TuneRoundedIcon fontSize="small" />
                            }
                            endIcon={
                                <KeyboardArrowDownRoundedIcon fontSize="small" />
                            }
                            variant={toolsActive ? "contained" : "text"}
                            onClick={toggleToolsMenu}
                            onKeyDown={(event) => {
                                if (
                                    event.key === "ArrowDown" &&
                                    !toolsOpen
                                ) {
                                    event.preventDefault();
                                    toggleToolsMenu(event);
                                }

                                if (event.key === "Escape") {
                                    closeToolsMenu();
                                }
                            }}
                            sx={dropdownButtonSx(
                                toolsActive,
                                toolsOpen
                            )}
                        >
                            Tools
                        </Button>

                        <Menu
                            id={toolsMenuId}
                            anchorEl={toolsAnchorEl}
                            open={toolsOpen}
                            onClose={closeToolsMenu}
                            keepMounted
                            disableScrollLock
                            marginThreshold={8}
                            transitionDuration={{
                                enter: 140,
                                exit: 100,
                            }}
                            anchorOrigin={{
                                vertical: "bottom",
                                horizontal: "right",
                            }}
                            transformOrigin={{
                                vertical: "top",
                                horizontal: "right",
                            }}
                            MenuListProps={{
                                "aria-labelledby": toolsButtonId,
                                autoFocusItem: false,
                                onKeyDown:
                                    handleMenuListKeyDown(
                                        closeToolsMenu
                                    ),
                                sx: {
                                    p: 0.65,
                                    touchAction: "manipulation",
                                },
                            }}
                            PaperProps={{
                                elevation: 0,
                                sx: menuPaperSx,
                            }}
                        >
                            {TOOLS_NAV_ITEMS.map((item) => {
                                const active = pathIsActive(
                                    location.pathname,
                                    item.path
                                );
                                const ItemIcon = item.Icon;

                                return (
                                    <MenuItem
                                        key={item.path}
                                        component={RouterLink}
                                        to={item.path}
                                        aria-current={
                                            active ? "page" : undefined
                                        }
                                        onClick={closeAllMenus}
                                        sx={menuItemSx(active)}
                                    >
                                        <ListItemIcon>
                                            <ItemIcon fontSize="small" />
                                        </ListItemIcon>

                                        <ListItemText
                                            primary={item.label}
                                            primaryTypographyProps={{
                                                fontWeight: 900,
                                            }}
                                        />
                                    </MenuItem>
                                );
                            })}
                        </Menu>

                        <Button
                            id={infoButtonId}
                            type="button"
                            aria-label="Open information navigation menu"
                            aria-controls={infoOpen ? infoMenuId : undefined}
                            aria-haspopup="menu"
                            aria-expanded={infoOpen ? "true" : undefined}
                            startIcon={
                                <InfoRoundedIcon fontSize="small" />
                            }
                            endIcon={
                                <KeyboardArrowDownRoundedIcon fontSize="small" />
                            }
                            variant={infoActive ? "contained" : "text"}
                            onClick={toggleInfoMenu}
                            onKeyDown={(event) => {
                                if (
                                    event.key === "ArrowDown" &&
                                    !infoOpen
                                ) {
                                    event.preventDefault();
                                    toggleInfoMenu(event);
                                }

                                if (event.key === "Escape") {
                                    closeInfoMenu();
                                }
                            }}
                            sx={dropdownButtonSx(
                                infoActive,
                                infoOpen
                            )}
                        >
                            Info
                        </Button>

                        <Menu
                            id={infoMenuId}
                            anchorEl={infoAnchorEl}
                            open={infoOpen}
                            onClose={closeInfoMenu}
                            keepMounted
                            disableScrollLock
                            marginThreshold={8}
                            transitionDuration={{
                                enter: 140,
                                exit: 100,
                            }}
                            anchorOrigin={{
                                vertical: "bottom",
                                horizontal: "right",
                            }}
                            transformOrigin={{
                                vertical: "top",
                                horizontal: "right",
                            }}
                            MenuListProps={{
                                "aria-labelledby": infoButtonId,
                                autoFocusItem: false,
                                onKeyDown:
                                    handleMenuListKeyDown(
                                        closeInfoMenu
                                    ),
                                sx: {
                                    p: 0.65,
                                    touchAction: "manipulation",
                                },
                            }}
                            PaperProps={{
                                elevation: 0,
                                sx: menuPaperSx,
                            }}
                        >
                            {INFO_NAV_ITEMS.map((item) => {
                                const active = pathIsActive(
                                    location.pathname,
                                    item.path
                                );
                                const ItemIcon = item.Icon;

                                return (
                                    <MenuItem
                                        key={item.path}
                                        component={RouterLink}
                                        to={item.path}
                                        aria-current={
                                            active ? "page" : undefined
                                        }
                                        onClick={closeAllMenus}
                                        sx={menuItemSx(active)}
                                    >
                                        <ListItemIcon>
                                            <ItemIcon fontSize="small" />
                                        </ListItemIcon>

                                        <ListItemText
                                            primary={item.label}
                                            primaryTypographyProps={{
                                                fontWeight: 900,
                                            }}
                                        />
                                    </MenuItem>
                                );
                            })}
                        </Menu>
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
