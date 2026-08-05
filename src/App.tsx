"use client";

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
const RequestDetails = lazy(() => import('./pages/RequestDetails'));
const EditRequest = lazy(() => import('./pages/EditRequest'));
const EmailGenerator = lazy(() => import('./pages/EmailGenerator'));
const ClientTrackView = lazy(() => import('./pages/ClientTrackView'));
const PurchaseConfirmation = lazy(() => import('./pages/PurchaseConfirmation'));
const TestDropboxFunction = lazy(() => import('./pages/TestDropboxFunction'));
const TestDropboxCredentials = lazy(() => import('./pages/TestDropboxCredentials'));
const TestBackings = lazy(() => import('./pages/TestBackings'));
const TestEmail = lazy(() => import('./pages/TestEmail'));
const TestEmailNotification = lazy(() => import('./pages/TestEmailNotification'));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#FDFCF7]">
    <div className="h-12 w-12 border-4 border-[#1C0357]/20 border-t-[#1C0357] rounded-full animate-spin" />
  </div>
);

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
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/request/:id" element={<RequestDetails />} />
              <Route path="/admin/request/:id/edit" element={<EditRequest />} />
              <Route path="/email-generator/:id?" element={<EmailGenerator />} />
              <Route path="/track/:id" element={<ClientTrackView />} />
              <Route path="/purchase-confirmation" element={<PurchaseConfirmation />} />
              <Route path="/test-dropbox" element={<TestDropboxFunction />} />
              <Route path="/test-dropbox-credentials" element={<TestDropboxCredentials />} />
              <Route path="/test-backings" element={<TestBackings />} />
              <Route path="/test-email" element={<TestEmail />} />
              <Route path="/test-email-notification" element={<TestEmailNotification />} />
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