import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./Index";
import FormPage from "./FormPage";
import TestFunction from "./TestFunction";
import TestBackings from "./TestBackings";
import Login from "./Login";
import AdminDashboard from "./AdminDashboard";
import RequestDetails from "./RequestDetails";
import UserDashboard from "./UserDashboard";
import TestEmail from "./TestEmail";
import NotFound from "./NotFound";
import GmailOAuthCallback from "./GmailOAuthCallback";
import TestDropboxFunction from "./TestDropboxFunction";
import TestDropboxCredentials from "./TestDropboxCredentials";
import DropboxMonitor from "./DropboxMonitor";
import ClientTrackView from "./ClientTrackView";
import EmailGenerator from "./EmailGenerator";
import TestEmailNotification from "./TestEmailNotification";
import DataImporter from "./DataImporter";
import ReportIssueButton from "@/components/ReportIssueButton";
import UnreadIssueReportsNotice from "@/components/UnreadIssueReportsNotice";
import HolidayModeBanner from "@/components/HolidayModeBanner";
import Shop from "./Shop";
import PurchaseConfirmation from "./PurchaseConfirmation";
import EditRequest from "./EditRequest"; // Import the new EditRequest component
import Cart from "./Cart"; // Import the new Cart component

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <HolidayModeBanner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/form-page" element={<FormPage />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/cart" element={<Cart />} /> {/* New Cart Route */}
          <Route path="/purchase-confirmation" element={<PurchaseConfirmation />} />
          <Route path="/test-function" element={<TestFunction />} />
          <Route path="/test-backings" element={<TestBackings />} />
          <Route path="/test-email" element={<TestEmail />} />
          <Route path="/test-dropbox" element={<TestDropboxFunction />} />
          <Route path="/test-dropbox-credentials" element={<TestDropboxCredentials />} />
          <Route path="/dropbox-monitor" element={<DropboxMonitor />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/request/:id" element={<RequestDetails />} />
          <Route path="/admin/request/:id/edit" element={<EditRequest />} /> {/* New Route for editing */}
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