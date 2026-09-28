import { defineConfig, loadEnv } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { normaliseSiteUrl } from "./shared/site-url.mjs";

export default defineConfig(({ mode }) => {
  // Strip any trailing slash from VITE_SITE_URL before Vite reads it (process.env
  // outranks .env files), so %VITE_SITE_URL%/ in index.html, import.meta.env and the
  // prerender script all see one form and never produce "//" URLs.
  process.env.VITE_SITE_URL = normaliseSiteUrl(loadEnv(mode, process.cwd(), '').VITE_SITE_URL);

  return {
    // Removed 'root: path.resolve(__dirname, './')' to allow Vite to default to public/index.html
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      dyadComponentTagger(),
      react(),
      {
        // Writes dist/seo/*.html (page-specific titles, canonicals, structured data)
        // after every production build, however the build is invoked.
        name: 'prerender-seo',
        apply: 'build',
        async closeBundle() {
          await import('./scripts/prerender-seo.mjs');
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          // Split rarely-changing vendor code into its own long-cacheable chunks
          // so app deploys don't force visitors to re-download it.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return;
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|@remix-run)[\\/]/.test(id)) return 'react-vendor';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion';
          },
        },
      },
    },
  };
});
