import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionGlobalConfig } from "framer-motion";
import App from "./App.tsx";
import { preloadNotFound, preloadRoute } from "./routes";
import "./globals.css";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider, hydrate, type DehydratedState } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Public pages arrive prerendered (scripts/prerender-seo.mjs) with the data they were
// rendered from, so the first client render matches the static HTML.
const prerendered = document.getElementById("__PBD_STATE__");
if (prerendered?.textContent) {
  try {
    hydrate(queryClient, JSON.parse(prerendered.textContent) as DehydratedState);
  } catch {
    // Stale or malformed: the page simply fetches its data as usual.
  }
}

// The served HTML carries the page's tags for crawlers that don't run JavaScript.
// Helmet only updates tags it created, so hand these over to it to avoid duplicate
// canonicals/descriptions once the app navigates.
document.head
  .querySelectorAll(
    'link[rel="canonical"], meta[name="description"], meta[name="robots"], meta[property^="og:"]:not([property^="og:image:"]):not([property="og:locale"]), meta[name^="twitter:"]',
  )
  .forEach((el) => el.remove());

const root = document.getElementById("root")!;
const hasPrerenderedContent = root.hasChildNodes();

const render = () => {
  // If something re-runs this bundle in the same page (a browser extension, a framed
  // copy), a second React root would fight the first for #root and lazy pages would
  // read contexts from the other copy ("No QueryClient set", Helmet crashing on
  // `.add`). The DOM is shared by both copies, so mark it and only mount once.
  if (root.dataset.appMounted) return;
  root.dataset.appMounted = "true";

  // Prerendered content is already on screen: don't fade it out and back in when
  // the app takes over. Entrance animations resume for anything that mounts later.
  if (hasPrerenderedContent) {
    MotionGlobalConfig.skipAnimations = true;
    setTimeout(() => {
      MotionGlobalConfig.skipAnimations = false;
    }, 100);
  }

  createRoot(root).render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Analytics />
      </QueryClientProvider>
    </HelmetProvider>
  );
};

if (hasPrerenderedContent) {
  // Load the page's code first so the static HTML isn't replaced by a spinner.
  const isNotFound = document.documentElement.dataset.page === "not-found";
  (isNotFound ? preloadNotFound() : preloadRoute(window.location.pathname)).then(render, render);
} else {
  render();
}
