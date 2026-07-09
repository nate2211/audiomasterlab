import { configureStore } from "@reduxjs/toolkit";

import audioPlayerReducer from "./audioPlayerSlice.js";

export const audioStore = configureStore({
    reducer: {
        audioPlayer: audioPlayerReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActionPaths: ["payload.error", "payload.updateServiceWorker"],
                ignoredPaths: ["audioPlayer.native", "audioPlayer.workbox.updateServiceWorker"],
            },
        }),
    devTools: process.env.NODE_ENV !== "production",
});

export const getAudioReduxState = () => audioStore.getState().audioPlayer;

export default audioStore;
