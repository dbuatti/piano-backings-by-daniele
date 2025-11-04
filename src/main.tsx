import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { HelmetProvider } from "react-helmet-async"; // Import HelmetProvider

createRoot(document.getElementById("root")!).render(
  <HelmetProvider> {/* Wrap App with HelmetProvider */}
    <App />
  </HelmetProvider>
);