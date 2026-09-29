import React, { lazy } from 'react';

type Loader = () => Promise<{ default: React.ComponentType }>;

export type PreloadableComponent = React.FC & { preload: () => Promise<unknown> };

/**
 * React.lazy, plus `preload()`. Once preloaded the component renders straight away
 * instead of suspending, so prerendered HTML isn't swapped for a loading spinner
 * while the app starts, and the build-time renderer can use renderToString.
 */
export function lazyWithPreload(loader: Loader): PreloadableComponent {
  let Loaded: React.ComponentType | undefined;
  const load = () => loader().then((m) => (Loaded = m.default));
  const Lazy = lazy(() => load().then(() => ({ default: Loaded! })));
  const Component: React.FC = () => (Loaded ? <Loaded /> : <Lazy />);
  return Object.assign(Component, { preload: load });
}
