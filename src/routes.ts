import { lazyWithPreload } from './lib/lazy-with-preload';

// The landing page stays in the main bundle; every other route loads on demand.
export const FormPage = lazyWithPreload(() => import('./pages/FormPage'));
export const Shop = lazyWithPreload(() => import('./pages/Shop'));
export const SongPage = lazyWithPreload(() => import('./pages/SongPage'));
export const Pricing = lazyWithPreload(() => import('./pages/Pricing'));
export const AboutServices = lazyWithPreload(() => import('./pages/AboutServices'));
export const Login = lazyWithPreload(() => import('./pages/Login'));
export const NotFound = lazyWithPreload(() => import('./pages/NotFound'));
export const Terms = lazyWithPreload(() => import('./pages/Terms'));
export const Privacy = lazyWithPreload(() => import('./pages/Privacy'));

export const UserDashboard = lazyWithPreload(() => import('./pages/UserDashboard'));
export const GmailOAuthCallback = lazyWithPreload(() => import('./pages/GmailOAuthCallback'));
export const AdminDashboard = lazyWithPreload(() => import('./pages/AdminDashboard'));
export const ClientTrackView = lazyWithPreload(() => import('./pages/ClientTrackView'));
export const PurchaseConfirmation = lazyWithPreload(() => import('./pages/PurchaseConfirmation'));

// Public pages whose HTML is prerendered at build time (scripts/prerender-seo.mjs).
// Their code is loaded before the first render so it replaces the static HTML
// seamlessly.
export const preloadRoute = (pathname: string): Promise<unknown> => {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return Promise.resolve();
  if (path === '/shop') return Shop.preload();
  if (/^\/shop\/[^/]+$/.test(path)) return SongPage.preload();
  const page = ({
    '/form-page': FormPage,
    '/pricing': Pricing,
    '/about': AboutServices,
    '/terms': Terms,
    '/privacy': Privacy,
  } as Record<string, { preload: () => Promise<unknown> }>)[path];
  return page ? page.preload() : Promise.resolve();
};

export const preloadNotFound = () => NotFound.preload();
