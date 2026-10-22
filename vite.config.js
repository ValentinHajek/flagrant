import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base relative : le même build marche en local et sous /flagrant/ sur GitHub Pages.
export default defineConfig({ base: "./", plugins: [react(), tailwindcss()] });
