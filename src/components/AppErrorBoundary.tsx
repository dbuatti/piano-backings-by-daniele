import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

const CHUNK_RELOAD_KEY = 'pbd:chunk-reload-at';

// After a deploy, tabs left open still reference the old hashed chunk names,
// so lazy routes fail to load. A single reload fetches the new build.
const isChunkLoadError = (error: Error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i
    .test(`${error.name} ${error.message}`);

const tryReloadForChunkError = (): boolean => {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    // Guard against a reload loop if the chunk is genuinely missing.
    if (Date.now() - last < 10_000) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
};

interface Props {
  children: React.ReactNode;
  // Changing this value (e.g. the current pathname) clears the error state.
  resetKey?: string;
}

interface State {
  error: Error | null;
}

class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (isChunkLoadError(error) && tryReloadForChunkError()) return;
    console.error('Unhandled render error:', error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main
        role="alert"
        className="min-h-[70vh] flex items-center justify-center px-4 pt-24 pb-12 bg-[#FDFCF7]"
      >
        <div className="text-center max-w-md">
          <AlertTriangle className="mx-auto h-12 w-12 text-[#F538BC] mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-black text-[#1C0357] mb-3">Something went wrong</h1>
          <p className="text-gray-600 mb-8">
            This page hit an unexpected error. Reloading usually fixes it. If it keeps
            happening, please use the "Report an Issue" button so Daniele can take a look.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => window.location.reload()}
              className="bg-[#1C0357] hover:bg-[#2D0B8C] text-white font-bold rounded-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload page
            </Button>
            <Button asChild variant="outline" className="rounded-full font-bold">
              <a href="/">
                <Home className="mr-2 h-4 w-4" />
                Return to Home
              </a>
            </Button>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-8 text-left text-xs bg-red-50 text-red-800 p-4 rounded-lg overflow-auto max-h-60">
              {error.stack || error.message}
            </pre>
          )}
        </div>
      </main>
    );
  }
}

export default AppErrorBoundary;
