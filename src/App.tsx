"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import FormPage from './pages/FormPage';
import UserDashboard from './pages/UserDashboard'; // Import the new UserDashboard
import Shop from './pages/Shop'; // Assuming a Shop page exists
import Login from './pages/Login'; // Import the Login component
import GmailOAuthCallback from './pages/GmailOAuthCallback'; // Import GmailOAuthCallback
import AdminDashboard from './pages/AdminDashboard'; // Import AdminDashboard
import RequestDetails from './pages/RequestDetails'; // Import RequestDetails
import EditRequest from './pages/EditRequest'; // Import EditRequest
import EmailGenerator from './pages/EmailGenerator'; // Import EmailGenerator
import ClientTrackView from './pages/ClientTrackView'; // Import ClientTrackView
import PurchaseConfirmation from './pages/PurchaseConfirmation'; // Import PurchaseConfirmation
import NotFound from './pages/NotFound'; // Import NotFound
import TestDropboxFunction from './pages/TestDropboxFunction'; // Import TestDropboxFunction
import TestDropboxCredentials from './pages/TestDropboxCredentials'; // Import TestDropboxCredentials
import TestBackings from './pages/TestBackings'; // Import TestBackings
import TestEmail from './pages/TestEmail'; // Import TestEmail
import TestEmailNotification from './pages/TestEmailNotification'; // Import TestEmailNotification
import { Toaster } from "@/components/ui/toaster";
import UnreadIssueReportsNotice from './components/UnreadIssueReportsNotice'; // Import UnreadIssueReportsNotice
import HolidayModeBanner from './components/HolidayModeBanner'; // Import HolidayModeBanner


function App() {
  return (
    <Router>
      <HolidayModeBanner />
      <UnreadIssueReportsNotice />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/form-page" element={<FormPage />} />
        <Route path="/user-dashboard" element={<UserDashboard />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/login" element={<Login />} /> {/* Added Login route */}
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
        <Route path="*" element={<NotFound />} /> {/* Catch-all route for 404 */}
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;