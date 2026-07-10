import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error('AudioMaster Lab could not find the "#root" element.');
}

const application = <App />;

/*
 * During the react-snap build, CRA initially loads an empty root, so createRoot
 * renders the page. After deployment, each generated route already contains
 * React HTML, so hydrateRoot attaches events without replacing that HTML.
 */
if (rootElement.hasChildNodes()) {
    hydrateRoot(rootElement, application);
} else {
    createRoot(rootElement).render(application);
}

reportWebVitals();