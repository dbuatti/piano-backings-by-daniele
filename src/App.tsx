"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import FormPage from './pages/FormPage';
import UserDashboard from './pages/UserDashboard';
import Shop from './pages/Shop';
import Login from './pages/Login';
import GmailOAuthCallback from './pages/GmailOAuthCallback';
import AdminDashboard from './pages/AdminDashboard';
import RequestDetails from './pages/RequestDetails';
import EditRequest from './pages/EditRequest';
import EmailGenerator from './pages/EmailGenerator';
import ClientTrackView from './pages/ClientTrackView';
import PurchaseConfirmation from './pages/PurchaseConfirmation';
import AboutServices from './pages/AboutServices'; // Import new page
import NotFound from './pages/NotFound';
import TestDropboxFunction from './pages/TestDropboxFunction';
import TestDropboxCredentials from './pages/TestDropboxCredentials';
import TestBackings from './pages/TestBackings';
import TestEmail from './pages/TestEmail';
import TestEmailNotification from './pages/TestEmailNotification';
import { Toaster } from "@/components/ui/toaster";
import UnreadIssueReportsNotice from './components/UnreadIssueReportsNotice';
import HolidayModeBanner from './components/HolidayModeBanner';
import Footer from './components/Footer';


function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <HolidayModeBanner />
        <UnreadIssueReportsNotice />
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/form-page" element={<FormPage />} />
            <Route path="/user-dashboard" element={<UserDashboard />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/about" element={<AboutServices />} /> {/* New Route */}
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
        </div>
        <Footer />
      </div>
      <Toaster />
    </Router>
  );
}

export default App;