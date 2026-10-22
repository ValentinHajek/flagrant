import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base relative : le même build marche en local et sous /flagrant/ sur GitHub Pages.
// En dev, /api est relayé vers le serveur local des fonctions (pnpm dev:api).
export default defineConfig({ base: "./", plugins: [react(), tailwindcss()], server: { proxy: { "/api": "http://localhost:8787" } } });
