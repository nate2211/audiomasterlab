import React from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error(
        'AudioMaster Lab could not start because <div id="root"></div> is missing.'
    );
}

const application = <App />;

createRoot(rootElement).render(application);
