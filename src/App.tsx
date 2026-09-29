"use client";

import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import Index from './pages/Index';
import { Toaster } from "@/components/ui/toaster";
import UnreadIssueReportsNotice from './components/UnreadIssueReportsNotice';
import ImpersonationBanner from './components/ImpersonationBanner';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import BackToTop from './components/BackToTop';
import AppErrorBoundary from './components/AppErrorBoundary';
import CartProvider from './components/cart/CartProvider';
import CartDrawer from './components/cart/CartDrawer';
import { CanonicalLink } from './components/Seo';

import {
  FormPage, Shop, SongPage, Pricing, AboutServices, Login, NotFound, Terms, Privacy,
  UserDashboard, GmailOAuthCallback, AdminDashboard, ClientTrackView, PurchaseConfirmation,
} from './routes';

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#FDFCF7]" role="status" aria-live="polite">
    <div className="h-12 w-12 border-4 border-[#1C0357]/20 border-t-[#1C0357] rounded-full animate-spin" aria-hidden="true" />
    <span className="sr-only">Loading…</span>
  </div>
);

// Resets on navigation so one broken page doesn't strand the visitor.
const RouteErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  return <AppErrorBoundary resetKey={pathname}>{children}</AppErrorBoundary>;
};

// --- Bookmark-safe redirects for retired routes ---

const EditRequestRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/admin/request/${id}?mode=edit`} replace />;
};

const EmailGeneratorRedirect = () => {
  const { id } = useParams();
  if (id) return <Navigate to={`/admin/request/${id}?mode=email`} replace />;
  return <Navigate to="/admin?section=requests&mode=email" replace />;
};

const IgRedirect = () => <Navigate to="/admin?section=shop&sub=marketing" replace />;
const IntegrationsRedirect = () => <Navigate to="/admin?section=settings&sub=integrations" replace />;
const DeveloperRedirect = () => <Navigate to="/admin?section=settings&sub=developer" replace />;

// The router is supplied by the caller: BrowserRouter in main.tsx, StaticRouter in
// entry-server.tsx (build-time prerendering).
function App() {
  return (
      <CartProvider>
      <ScrollToTop />
      <CanonicalLink />
      <div className="flex flex-col min-h-screen">
        <ImpersonationBanner />
        <UnreadIssueReportsNotice />
        <div className="flex-grow">
          <RouteErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/form-page" element={<FormPage />} />
                <Route path="/user-dashboard" element={<UserDashboard />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/shop/:slug" element={<SongPage />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/about" element={<AboutServices />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/login" element={<Login />} />
                <Route path="/gmail-oauth-callback" element={<GmailOAuthCallback />} />

                {/* Admin shell — kept routes, render in-shell */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/request/:id" element={<AdminDashboard />} />
                <Route path="/admin/request/:id/edit" element={<EditRequestRedirect />} />

                {/* Retired admin routes — redirects */}
                <Route path="/email-generator" element={<EmailGeneratorRedirect />} />
                <Route path="/email-generator/:id" element={<EmailGeneratorRedirect />} />
                <Route path="/ig" element={<IgRedirect />} />
                <Route path="/test-email" element={<IntegrationsRedirect />} />
                <Route path="/test-email-notification" element={<DeveloperRedirect />} />
                <Route path="/test-backings" element={<DeveloperRedirect />} />
                <Route path="/test-dropbox" element={<DeveloperRedirect />} />
                <Route path="/test-dropbox-credentials" element={<DeveloperRedirect />} />

                {/* Public */}
                <Route path="/track/:id" element={<ClientTrackView />} />
                <Route path="/purchase-confirmation" element={<PurchaseConfirmation />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </RouteErrorBoundary>
        </div>
        <Footer />
      </div>
      <BackToTop />
      <CartDrawer />
      <Toaster />
      </CartProvider>
  );
}

export default App;