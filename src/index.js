import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error(
        'AudioMaster Lab could not start because <div id="root"></div> is missing.'
    );
}

const application = <App />;

/*
 * During react-snap:
 *   public/index.html has an empty root, so createRoot renders the page.
 *
 * After deployment:
 *   react-snap has populated the root with static HTML, so hydrateRoot
 *   preserves that HTML and attaches React functionality to it.
 */
if (rootElement.hasChildNodes()) {
    hydrateRoot(rootElement, application, {
        onRecoverableError(error) {
            console.warn(
                "AudioMaster Lab recovered from a hydration mismatch:",
                error
            );
        },
    });
} else {
    createRoot(rootElement).render(application);
}

reportWebVitals();