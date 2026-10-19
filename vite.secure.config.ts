import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {fileURLToPath,URL} from "node:url";
export default defineConfig({root:"secure",publicDir:false,resolve:{alias:{"@":fileURLToPath(new URL("./src",import.meta.url))}},build:{outDir:"../functions/secure-entry",emptyOutDir:true},plugins:[react()]});
