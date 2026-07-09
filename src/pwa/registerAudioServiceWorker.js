import { Workbox } from "workbox-window";

let activeWorkbox = null;
let activeController = null;

function noop() {}

function canUseServiceWorker() {
    return (
        typeof window !== "undefined" &&
        typeof navigator !== "undefined" &&
        "serviceWorker" in navigator &&
        (
            window.location.protocol === "https:" ||
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1"
        )
    );
}

export function getActiveAudioWorkbox() {
    return activeWorkbox;
}

export function registerAudioServiceWorker({
                                               serviceWorkerUrl = "/sw.js",
                                               enabled = process.env.NODE_ENV === "production",
                                               allowLocalhost = true,
                                               onRegistered = noop,
                                               onReady = noop,
                                               onNeedRefresh = noop,
                                               onControlling = noop,
                                               onError = noop,
                                           } = {}) {
    if (activeController) return activeController;

    if (!canUseServiceWorker()) {
        onError(new Error("Service workers are not available in this browser context."));
        return null;
    }

    const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

    if (!enabled && !(allowLocalhost && isLocalhost)) {
        return { workbox: null, updateServiceWorker: () => false, destroy: noop };
    }

    try {
        const wb = new Workbox(serviceWorkerUrl);
        activeWorkbox = wb;

        const updateServiceWorker = () => {
            try {
                wb.messageSkipWaiting();
                return true;
            } catch (error) {
                onError(error);
                return false;
            }
        };

        wb.addEventListener("registered", (event) => {
            onRegistered({ event, registration: event?.registration, workbox: wb });
        });
        wb.addEventListener("activated", (event) => {
            onReady({ event, workbox: wb });
        });
        wb.addEventListener("waiting", (event) => {
            onNeedRefresh({ event, workbox: wb, updateServiceWorker });
        });
        wb.addEventListener("externalwaiting", (event) => {
            onNeedRefresh({ event, workbox: wb, updateServiceWorker, external: true });
        });
        wb.addEventListener("controlling", (event) => {
            onControlling({ event, workbox: wb });
        });

        wb.register().catch(onError);

        activeController = {
            workbox: wb,
            updateServiceWorker,
            destroy: () => {
                if (activeWorkbox === wb) {
                    activeWorkbox = null;
                    activeController = null;
                }
            },
        };
        return activeController;
    } catch (error) {
        onError(error);
        return null;
    }
}

export default registerAudioServiceWorker;
