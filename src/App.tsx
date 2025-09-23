import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import FormPage from "./pages/FormPage";
import TestFunction from "./pages/TestFunction";
import TestBackings from "./pages/TestBackings";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import RequestDetails from "./pages/RequestDetails";
import UserDashboard from "./pages/UserDashboard";
import TestEmail from "./pages/TestEmail";
import NotFound from "./pages/NotFound";
import GmailOAuthCallback from "./pages/GmailOAuthCallback";
import TestDropboxFunction from "./pages/TestDropboxFunction";
import TestDropboxCredentials from "./pages/TestDropboxCredentials";
import DropboxMonitor from "./pages/DropboxMonitor";
import ClientTrackView from "./pages/ClientTrackView";
import EmailGenerator from "./pages/EmailGenerator";
import TestEmailNotification from "./pages/TestEmailNotification";
import DataImporter from "./pages/DataImporter";
import ReportIssueButton from "./components/ReportIssueButton";
import UnreadIssueReportsNotice from "./components/UnreadIssueReportsNotice";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/form-page" element={<FormPage />} />
          <Route path="/test-function" element={<TestFunction />} />
          <Route path="/test-backings" element={<TestBackings />} />
          <Route path="/test-email" element={<TestEmail />} />
          <Route path="/test-dropbox" element={<TestDropboxFunction />} />
          <Route path="/test-dropbox-credentials" element={<TestDropboxCredentials />} />
          <Route path="/dropbox-monitor" element={<DropboxMonitor />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/request/:id" element={<RequestDetails />} />
          <Route path="/user-dashboard" element={<UserDashboard />} />
          <Route path="/track/:id" element={<ClientTrackView />} />
          <Route path="/gmail-oauth-callback" element={<GmailOAuthCallback />} />
          <Route path="/email-generator" element={<EmailGenerator />} />
          <Route path="/email-generator/:id" element={<EmailGenerator />} />
          <Route path="/test-email-notification" element={<TestEmailNotification />} />
          <Route path="/data-importer" element={<DataImporter />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ReportIssueButton />
        <UnreadIssueReportsNotice />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;