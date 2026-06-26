import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Box, CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Helmet, HelmetProvider } from "react-helmet-async";

import { NavBar } from "./components/Components.js";
import Home from "./pages/Home.js";
import Audio from "./pages/Audio.js";
import Editor from "./pages/Editor.js";

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

export default function App() {
  return (
      <HelmetProvider>
        <Helmet
            defaultTitle="AudioMaster Lab"
            titleTemplate="%s | AudioMaster Lab"
        >
          <html lang="en" />
          <meta name="theme-color" content="#070a13" />
          <meta name="application-name" content="AudioMaster Lab" />
          <meta
              name="description"
              content="AudioMaster Lab is a browser-based WebAudio mastering and timeline editing tool with waveform visualization, frequency spectrum analysis, drawable effect blocks, EQ, compression, delay, reverb, panning, de-essing, and WAV export."
          />
          <meta
              name="keywords"
              content="AudioMaster Lab, WebAudio mastering, online audio editor, waveform editor, timeline audio editor, frequency spectrum, WAV export, browser audio mixer"
          />
          <meta property="og:site_name" content="AudioMaster Lab" />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
        </Helmet>

        <ThemeProvider theme={theme}>
          <CssBaseline />

          <BrowserRouter>
            <Box sx={{ minHeight: "100vh", background: "#070a13" }}>
              <NavBar />

              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/audio" element={<Audio />} />
                <Route path="/editor" element={<Editor />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Box>
          </BrowserRouter>
        </ThemeProvider>
      </HelmetProvider>
  );
}