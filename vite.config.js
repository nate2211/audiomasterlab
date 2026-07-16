import { defineConfig, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [
        react({
            include: /\.[jt]sx?$/,
        }),
        {
            name: "audiomasterlab-js-as-jsx",
            enforce: "pre",
            async transform(source, id) {
                if (!/\/src\/.*\.js$/.test(id)) return null;
                return transformWithEsbuild(source, id, {
                    loader: "jsx",
                    jsx: "automatic",
                    sourcemap: true,
                });
            },
        },
    ],
    esbuild: {
        loader: "jsx",
        include: /src\/.*\.jsx?$/,
        exclude: [],
    },
    optimizeDeps: {
        entries: ["index.html"],
        esbuildOptions: {
            loader: {
                ".js": "jsx",
            },
        },
    },
    build: { outDir: "dist", sourcemap: true },
    server: { port: 3000 },
});
