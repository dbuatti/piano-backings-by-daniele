import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccess, showError } from "@/utils/toast"; // Updated import
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { generateCompletionEmail, generatePaymentReminderEmail, generateCompletionAndPaymentEmail, generateProductDeliveryEmail, BackingRequest } from "@/utils/emailGenerator";
import { supabase } from '@/integrations/supabase/client';
import { useParams, useLocation, Link } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { 
  Mail, Send, Eye, RefreshCw, Loader2, DollarSign, CheckCircle, Copy, Music, User, Calendar, Headphones, Target, Key, Link as LinkIcon, FileText,
  Clock, XCircle, List, Search, Image // Imported Image icon
} from 'lucide-react';
import { calculateRequestCost } from '@/utils/pricing';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { getSafeBackingTypes } from '@/utils/helpers'; // Import getSafeBackingTypes
// Removed Table imports as the table is being replaced

interface TrackInfo {
  url: string;
  caption: string;
}

// New interface for Product (updated to use track_urls)
export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string | null;
  track_urls?: TrackInfo[] | null; // Changed from track_url to track_urls (array of TrackInfo)
  is_active: boolean;
  vocal_ranges?: string[]; // New field for vocal ranges
}

const EmailGenerator = () => {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailData, setEmailData] = useState({ subject: '', html: '' });
  const [recipientEmails, setRecipientEmails] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [templateType, setTemplateType] = useState<'completion' | 'payment-reminder' | 'completion-payment' | 'product-delivery' | 'custom'>('completion-payment');
  
  const [allRequests, setAllRequests] = useState<BackingRequest[]>([]);
  const [loadingAllRequests, setLoadingAllRequests] = useState(true);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]); // Will now hold at most one ID
  const [displayedRequest, setDisplayedRequest] = useState<BackingRequest | null>(null); // The request whose details are shown
  const [allProducts, setAllProducts] = useState<Product[]>([]); // New state for products
  const [loadingAllProducts, setLoadingAllProducts] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null); // New state for selected product
  const [displayedProduct, setDisplayedProduct] = useState<Product | null>(null); // The product whose details are shown

  const handleGenerateEmail = useCallback(async (selectedTemplateType: 'completion' | 'payment-reminder' | 'completion-payment' | 'product-delivery' | 'custom', itemToUse?: BackingRequest | Product) => {
    setIsGenerating(true);
    try {
      let result;
      
      if (selectedTemplateType === 'product-delivery') {
        const productForGeneration = itemToUse as Product || displayedProduct;
        if (!productForGeneration) {
          throw new Error("No product data available to generate email. Please select a product from the dropdown.");
        }
        // Use recipientEmails as customerEmail for generation on this page
        result = await generateProductDeliveryEmail(productForGeneration, recipientEmails || 'test@example.com');
      } else {
        const requestForGeneration = itemToUse as BackingRequest || displayedRequest;
        if (!requestForGeneration) {
          throw new Error("No request data available to generate email. Please select a request from the dropdown.");
        }
        const requestWithCost: BackingRequest = {
          ...requestForGeneration,
          cost: calculateRequestCost(requestForGeneration).totalCost
        };

        if (selectedTemplateType === 'completion') {
          result = await generateCompletionEmail(requestWithCost);
        } else if (selectedTemplateType === 'payment-reminder') {
          result = await generatePaymentReminderEmail(requestWithCost);
        } else if (selectedTemplateType === 'completion-payment') {
          result = await generateCompletionAndPaymentEmail(requestWithCost);
        } else {
          setEmailData({ subject: '', html: '' });
          showSuccess("Custom Template Selected", "You can now write your custom email."); // Updated toast call
          setIsGenerating(false);
          return;
        }
      }
      
      setEmailData({ subject: result.subject, html: result.html });
      
      showSuccess("Email Generated", "Your email copy has been generated successfully."); // Updated toast call
    } catch (error: any) {
      showError("Error", `Failed to generate email: ${error.message}`); // Updated toast call
    } finally {
      setIsGenerating(false);
    }
  }, [displayedRequest, displayedProduct, templateType, recipientEmails]);

  // Fetch all requests on component mount
  useEffect(() => {
    const fetchAllRequests = async () => {
      setLoadingAllRequests(true);
      try {
        const { data, error } = await supabase
          .from('backing_requests')
          .select('*, track_urls') // Select track_urls to infer email status
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setAllRequests(data || []);
      } catch (error: any) {
        showError("Error", `Failed to fetch all requests: ${error.message}`); // Updated toast call
      } finally {
        setLoadingAllRequests(false);
      }
    };
    fetchAllRequests();

    const fetchAllProducts = async () => {
      setLoadingAllProducts(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setAllProducts(data || []);
      } catch (error: any) {
        showError("Error", `Failed to fetch all products: ${error.message}`); // Updated toast call
      } finally {
        setLoadingAllProducts(false);
      }
    };
    fetchAllProducts();
  }, []);

  // Handle initial load from URL parameter or location state for requests
  useEffect(() => {
    if (allRequests.length > 0) {
      let initialRequest: BackingRequest | null = null;
      if (id) {
        initialRequest = allRequests.find(req => req.id === id) || null;
      } else if (location.state?.request) {
        initialRequest = location.state.request;
      }

      if (initialRequest) {
        setDisplayedRequest(initialRequest);
        setSelectedRequestIds([initialRequest.id!]); // Select only this one
      }
    }
  }, [id, location.state, allRequests]);

  // Update recipient emails and displayed item when selected item changes
  useEffect(() => {
    if (templateType === 'product-delivery') {
      const selected = allProducts.find(prod => prod.id === selectedProductId);
      setDisplayedProduct(selected || null);
      setRecipientEmails(selected ? selected.id : ''); // Use product ID as placeholder for email
      if (selected) {
        handleGenerateEmail(templateType, selected);
      } else {
        setEmailData({ subject: '', html: '' });
      }
    } else {
      const selected = allRequests.filter(req => selectedRequestIds.includes(req.id!));
      setDisplayedRequest(selected.length > 0 ? selected[0] : null);
      setRecipientEmails(selected.map(req => req.email).join(', '));
      if (displayedRequest) {
        handleGenerateEmail(templateType);
      } else if (selected.length > 0 && !id) {
        handleGenerateEmail(templateType, selected[0]);
      } else if (selected.length === 0 && !id) {
        setEmailData({ subject: '', html: '' });
      }
    }
  }, [selectedRequestIds, selectedProductId, allRequests, allProducts, id, templateType, displayedRequest, displayedProduct, handleGenerateEmail]);

  const handleSendEmail = async () => {
    setIsSending(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to send emails');
      }

      if (!recipientEmails.trim()) {
        throw new Error('Recipient email address(es) cannot be empty.');
      }
      if (!emailData.subject.trim()) {
        throw new Error('Email subject cannot be empty.');
      }
      if (!emailData.html.trim()) {
        throw new Error('Email body cannot be empty.');
      }

      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            to: recipientEmails,
            subject: emailData.subject,
            html: emailData.html,
            senderEmail: 'pianobackingsbydaniele@gmail.com'
          }),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to send email: ${response.status} ${response.statusText}`);
      }
      
      showSuccess("Email Sent", `Email sent to ${recipientEmails}`); // Updated toast call
      
      setEmailData({ subject: '', html: '' });
      setRecipientEmails('');
      setShowPreview(false);
      setTemplateType('completion-payment');
      setSelectedRequestIds([]); // Clear selected requests after sending
      setSelectedProductId(null); // Clear selected product after sending
    } catch (err: any) {
      console.error('Error sending email:', err);
      showError("Error", `Failed to send email: ${err.message}`); // Updated toast call
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess("Copied to Clipboard", "Text copied to clipboard successfully."); // Updated toast call
  };

  const getStatusBadge = (status: string | undefined) => { // status can be undefined
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-yellow-500 text-yellow-900"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#1C0357]">Email Generator</h1>
          <p className="text-lg text-[#1C0357]/90">Generate and send emails to clients</p>
        </div>
        
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              Email Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="templateType">Select Template Type</Label>
                <Select onValueChange={(value: 'completion' | 'payment-reminder' | 'completion-payment' | 'product-delivery' | 'custom') => setTemplateType(value)} value={templateType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an email template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completion">Track Completion Email</SelectItem>
                    <SelectItem value="payment-reminder">Payment Reminder Email</SelectItem>
                    <SelectItem value="completion-payment">Completion & Payment Email</SelectItem>
                    <SelectItem value="product-delivery">Product Delivery Email</SelectItem>
                    <SelectItem value="custom">Custom Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {templateType === 'product-delivery' ? (
                <div>
                  <Label htmlFor="product-select">Select Product</Label>
                  <Select onValueChange={(value) => setSelectedProductId(value)} value={selectedProductId || ''}>
                    <SelectTrigger disabled={loadingAllProducts}>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingAllProducts ? (
                        <SelectItem value="loading" disabled>Loading products...</SelectItem>
                      ) : allProducts.length === 0 ? (
                        <SelectItem value="no-products" disabled>No products available</SelectItem>
                      ) : (
                        allProducts.map(product => (
                          <SelectItem key={product.id} value={product.id}>{product.title}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="request-select">Select Request</Label>
                  <Select onValueChange={(value) => setSelectedRequestIds([value])} value={selectedRequestIds[0] || ''}>
                    <SelectTrigger disabled={loadingAllRequests}>
                      <SelectValue placeholder="Select a request" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingAllRequests ? (
                        <SelectItem value="loading" disabled>Loading requests...</SelectItem>
                      ) : allRequests.length === 0 ? (
                        <SelectItem value="no-requests" disabled>No requests available</SelectItem>
                      ) : (
                        allRequests.map(req => (
                          <SelectItem key={req.id} value={req.id}>{req.song_title} ({req.email})</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <Label htmlFor="recipientEmails">Recipient Email(s)</Label>
                <Input
                  id="recipientEmails"
                  name="recipientEmails"
                  type="email"
                  value={recipientEmails}
                  onChange={(e) => setRecipientEmails(e.target.value)}
                  placeholder="client@example.com, another@example.com"
                  disabled={templateType !== 'custom'}
                />
                {templateType !== 'custom' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Email(s) pre-filled from selected {templateType === 'product-delivery' ? 'product' : 'request'}. Edit manually for custom recipients.
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="html">Email Body (HTML)</Label>
                <Textarea
                  id="html"
                  name="html"
                  value={emailData.html}
                  onChange={(e) => setEmailData(prev => ({ ...prev, html: e.target.value }))}
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  onClick={() => handleGenerateEmail(templateType)} 
                  disabled={isGenerating || (templateType !== 'product-delivery' && !displayedRequest) || (templateType === 'product-delivery' && !displayedProduct)}
                  variant="outline"
                >
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {isGenerating ? 'Generating...' : 'Generate Email'}
                </Button>
                <Button onClick={() => setShowPreview(true)} variant="secondary">
                  <Eye className="mr-2 h-4 w-4" /> Preview
                </Button>
                <Button 
                  onClick={handleSendEmail} 
                  disabled={isSending || !emailData.subject || !emailData.html || !recipientEmails}
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                >
                  {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {isSending ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {displayedRequest && templateType !== 'product-delivery' && (
          <Card className="shadow-lg mb-6">
            <CardHeader className="bg-[#D1AAF2]/20">
              <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                <List className="mr-2 h-5 w-5" />
                Selected Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Song Title</p>
                  <p className="font-medium">{displayedRequest.song_title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Musical/Artist</p>
                  <p className="font-medium">{displayedRequest.musical_or_artist}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Client Email</p>
                  <p className="font-medium">{displayedRequest.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(displayedRequest.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  {displayedRequest.is_paid ? (
                    <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Paid</Badge>
                  ) : (
                    <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Unpaid</Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Delivery Date</p>
                  <p className="font-medium">{displayedRequest.delivery_date ? format(new Date(displayedRequest.delivery_date), 'MMM dd, yyyy') : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Calculated Cost</p>
                  <p className="font-medium">A${calculateRequestCost(displayedRequest).totalCost.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" onClick={() => copyToClipboard(window.location.origin + `/track/${displayedRequest.id}`)}>
                  <Copy className="mr-2 h-4 w-4" /> Copy Client Link
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {displayedProduct && templateType === 'product-delivery' && (
          <Card className="shadow-lg mb-6">
            <CardHeader className="bg-[#D1AAF2]/20">
              <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                <Image className="mr-2 h-5 w-5" />
                Selected Product Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Product Title</p>
                  <p className="font-medium">{displayedProduct.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="font-medium">{displayedProduct.currency} {displayedProduct.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-medium line-clamp-3">{displayedProduct.description}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Track URLs</p>
                  {displayedProduct.track_urls && displayedProduct.track_urls.length > 0 ? (
                    <ul className="list-disc pl-4">
                      {displayedProduct.track_urls.map((track, index) => (
                        <li key={index} className="text-sm truncate">
                          <a href={track.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {track.caption || `Track ${index + 1}`}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-gray-500">No tracks available</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl text-[#1C0357] flex items-center">
                <Eye className="mr-2 h-5 w-5" />
                Email Preview
              </DialogTitle>
            </DialogHeader>
            <div className="border rounded-md p-4 bg-gray-50">
              <h3 className="font-semibold text-lg mb-2">Subject: {emailData.subject}</h3>
              <div 
                className="bg-white p-4 rounded-md border overflow-auto" 
                dangerouslySetInnerHTML={{ __html: emailData.html }} 
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowPreview(false)}>Close Preview</Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default EmailGenerator;