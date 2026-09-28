import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

// The served HTML carries the page's tags for crawlers that don't run JavaScript.
// Helmet only updates tags it created, so hand these over to it to avoid duplicate
// canonicals/descriptions once the app navigates.
document.head
  .querySelectorAll(
    'link[rel="canonical"], meta[name="description"], meta[name="robots"], meta[property^="og:"]:not([property^="og:image:"]):not([property="og:locale"]), meta[name^="twitter:"]',
  )
  .forEach((el) => el.remove());

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <App />
      <Analytics />
    </QueryClientProvider>
  </HelmetProvider>
);