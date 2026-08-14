"use client";

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Index from './pages/Index';
import FormPage from './pages/FormPage';
import Shop from './pages/Shop';
import Pricing from './pages/Pricing';
import AboutServices from './pages/AboutServices';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import { Toaster } from "@/components/ui/toaster";
import UnreadIssueReportsNotice from './components/UnreadIssueReportsNotice';
import HolidayModeBanner from './components/HolidayModeBanner';
import ReportIssueButton from './components/ReportIssueButton';
import ImpersonationBanner from './components/ImpersonationBanner';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import BackToTop from './components/BackToTop';

const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const GmailOAuthCallback = lazy(() => import('./pages/GmailOAuthCallback'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ClientTrackView = lazy(() => import('./pages/ClientTrackView'));
const PurchaseConfirmation = lazy(() => import('./pages/PurchaseConfirmation'));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#FDFCF7]">
    <div className="h-12 w-12 border-4 border-[#1C0357]/20 border-t-[#1C0357] rounded-full animate-spin" />
  </div>
);

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

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        <ImpersonationBanner />
        <HolidayModeBanner />
        <UnreadIssueReportsNotice />
        <div className="flex-grow">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/form-page" element={<FormPage />} />
              <Route path="/user-dashboard" element={<UserDashboard />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop/:id" element={<Shop />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<AboutServices />} />
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
        </div>
        <ReportIssueButton />
        <Footer />
      </div>
      <BackToTop />
      <Toaster />
    </Router>
  );
}

export default App;