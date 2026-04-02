import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { generateCompletionEmail, generatePaymentReminderEmail, generateCompletionAndPaymentEmail, generateProductDeliveryEmail, BackingRequest } from "@/utils/emailGenerator";
import { supabase } from '@/integrations/supabase/client';
import { useParams, useLocation, Link } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { 
  Mail, Send, Eye, RefreshCw, Loader2, DollarSign, CheckCircle, Copy, Music, User, Calendar, Headphones, Target, Key, Link as LinkIcon, FileText,
  Clock, XCircle, List
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
import { getSafeBackingTypes } from '@/utils/helpers';

interface TrackInfo {
  url: string;
  caption: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string | null;
  track_urls?: TrackInfo[] | null;
  is_active: boolean;
  vocal_ranges?: string[];
}

const EmailGenerator = () => {
  const { toast } = useToast();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailData, setEmailData] = useState({ subject: '', html: '' });
  const [recipientEmails, setRecipientEmails] = useState('');
  const [lastAutoPopulatedEmail, setLastAutoPopulatedEmail] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [templateType, setTemplateType] = useState<'completion' | 'payment-reminder' | 'completion-payment' | 'product-delivery' | 'custom'>('completion-payment');
  
  const [allRequests, setAllRequests] = useState<BackingRequest[]>([]);
  const [loadingAllRequests, setLoadingAllRequests] = useState(true);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingAllProducts, setLoadingAllProducts] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const displayedRequest = useMemo(() => {
    return allRequests.find(req => selectedRequestIds.includes(req.id!)) || null;
  }, [selectedRequestIds, allRequests]);

  const displayedProduct = useMemo(() => {
    return allProducts.find(prod => prod.id === selectedProductId) || null;
  }, [selectedProductId, allProducts]);

  const handleGenerateEmail = useCallback(async (
    selectedTemplateType: 'completion' | 'payment-reminder' | 'completion-payment' | 'product-delivery' | 'custom', 
    itemToUse?: BackingRequest | Product,
    emailToUse?: string
  ) => {
    setIsGenerating(true);
    try {
      let result;
      const currentRecipientEmail = emailToUse !== undefined ? emailToUse : recipientEmails;
      
      if (selectedTemplateType === 'product-delivery') {
        const productForGeneration = itemToUse as Product || displayedProduct;
        if (!productForGeneration) {
          throw new Error("No product data available to generate email.");
        }
        result = await generateProductDeliveryEmail(productForGeneration, currentRecipientEmail || 'test@example.com');
      } else {
        const requestForGeneration = itemToUse as BackingRequest || displayedRequest;
        if (!requestForGeneration) {
          throw new Error("No request data available to generate email.");
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
          setIsGenerating(false);
          return;
        }
      }
      
      setEmailData({ subject: result.subject, html: result.html });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to generate email: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [displayedRequest, displayedProduct, toast, recipientEmails]);

  useEffect(() => {
    const fetchAllRequests = async () => {
      setLoadingAllRequests(true);
      try {
        const { data, error } = await supabase
          .from('backing_requests')
          .select('*, track_urls')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setAllRequests(data || []);
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
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
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setLoadingAllProducts(false);
      }
    };
    fetchAllProducts();
  }, [toast]);

  useEffect(() => {
    if (allRequests.length > 0) {
      let initialRequest: BackingRequest | null = null;
      if (id) {
        initialRequest = allRequests.find(req => req.id === id) || null;
      } else if (location.state?.request) {
        initialRequest = location.state.request;
      }

      if (initialRequest) {
        setSelectedRequestIds([initialRequest.id!]);
      }
    }
  }, [id, location.state, allRequests]);

  useEffect(() => {
    let newAutoPopulatedEmail = '';
    if (templateType === 'product-delivery') {
      newAutoPopulatedEmail = displayedProduct ? displayedProduct.id : '';
    } else {
      newAutoPopulatedEmail = displayedRequest ? displayedRequest.email : '';
    }

    if (recipientEmails === lastAutoPopulatedEmail || recipientEmails === '') {
      setRecipientEmails(newAutoPopulatedEmail);
    }
    setLastAutoPopulatedEmail(newAutoPopulatedEmail);

    if (templateType === 'product-delivery') {
      if (displayedProduct) {
        handleGenerateEmail(templateType, displayedProduct, newAutoPopulatedEmail);
      } else {
        setEmailData({ subject: '', html: '' });
      }
    } else {
      if (displayedRequest) {
        handleGenerateEmail(templateType, displayedRequest, newAutoPopulatedEmail);
      } else if (selectedRequestIds.length === 0 && !id) {
        setEmailData({ subject: '', html: '' });
      }
    }
  }, [selectedRequestIds, selectedProductId, templateType, displayedRequest, displayedProduct]);

  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in to send emails');

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
      if (!response.ok) throw new Error(result.error || 'Failed to send email');
      
      toast({ title: "Email Sent", description: `Email sent to ${recipientEmails}` });
      setEmailData({ subject: '', html: '' });
      setRecipientEmails('');
      setShowPreview(false);
      setSelectedRequestIds([]);
      setSelectedProductId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to Clipboard" });
  };

  const getStatusBadge = (status: string | undefined) => {
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
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1C0357]">Email Generator</h1>
          <p className="text-lg text-[#1C0357]/90">Generate and send emails for backing track requests and product deliveries</p>
        </div>
        
        <div className="mb-6">
          <Label htmlFor="template-type" className="text-lg font-semibold text-[#1C0357] flex items-center mb-2">
            <List className="mr-2 h-5 w-5" />
            Select Template Type
          </Label>
          <Select onValueChange={(value: any) => setTemplateType(value)} value={templateType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an email template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completion">Completion Email (for Requests)</SelectItem>
              <SelectItem value="payment-reminder">Payment Reminder (for Requests)</SelectItem>
              <SelectItem value="completion-payment">Completion & Payment Reminder (for Requests)</SelectItem>
              <SelectItem value="product-delivery">Product Delivery Email (for Shop Products)</SelectItem>
              <SelectItem value="custom">Custom Email</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {templateType !== 'product-delivery' && templateType !== 'custom' && (
          <div className="mb-6">
            <Label htmlFor="select-request" className="text-lg font-semibold text-[#1C0357] flex items-center mb-2">
              <List className="mr-2 h-5 w-5" />
              Select a Request
            </Label>
            <Select
              value={displayedRequest?.id || ''}
              onValueChange={(requestId) => setSelectedRequestIds([requestId])}
              disabled={loadingAllRequests}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingAllRequests ? "Loading requests..." : "Select a request"} />
              </SelectTrigger>
              <SelectContent>
                {allRequests.map((request) => (
                  <SelectItem key={request.id} value={request.id!}>
                    {request.song_title} ({request.name || request.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {templateType === 'product-delivery' && (
          <div className="mb-6">
            <Label htmlFor="select-product" className="text-lg font-semibold text-[#1C0357] flex items-center mb-2">
              <List className="mr-2 h-5 w-5" />
              Select a Product
            </Label>
            <Select
              value={selectedProductId || ''}
              onValueChange={(productId) => setSelectedProductId(productId)}
              disabled={loadingAllProducts}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingAllProducts ? "Loading products..." : "Select a product"} />
              </SelectTrigger>
              <SelectContent>
                {allProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.title} ({product.currency} {product.price.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">
                {templateType === 'product-delivery' ? 'Product Details' : 'Request Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {templateType === 'product-delivery' && displayedProduct ? (
                <div className="space-y-4 text-sm">
                  <div className="font-medium flex items-center">
                    <Music className="mr-2 h-4 w-4 text-gray-600" />
                    Product: <span className="ml-1 font-bold">{displayedProduct.title}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-gray-600" />
                    Price: <span className="ml-1 font-medium">{displayedProduct.currency} {displayedProduct.price.toFixed(2)}</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{displayedProduct.description}</p>
                </div>
              ) : displayedRequest ? (
                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium flex items-center">
                      <Music className="mr-2 h-4 w-4 text-gray-600" />
                      Song: <span className="ml-1 font-bold">{displayedRequest.song_title}</span>
                    </div>
                    {getStatusBadge(displayedRequest.status)}
                  </div>
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4 text-gray-600" />
                    Client: <span className="ml-1 font-medium">{displayedRequest.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-gray-600" />
                    Email: <span className="ml-1 font-medium">{displayedRequest.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-gray-600" />
                    Submitted: <span className="ml-1 font-medium">{displayedRequest.created_at ? format(new Date(displayedRequest.created_at), 'MMM dd, yyyy') : 'N/A'}</span>
                  </div>
                  <div className="pt-4">
                    <Link to={`/admin/request/${displayedRequest.id}`}>
                      <Button variant="outline" className="w-full">
                        <Eye className="mr-2 h-4 w-4" /> View Full Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Select an item to view details.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">Generated Email</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="recipient-emails">Recipient Email(s)</Label>
                  <Input
                    id="recipient-emails"
                    value={recipientEmails}
                    onChange={(e) => setRecipientEmails(e.target.value)}
                    placeholder="client@example.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <div className="mt-1 relative">
                    <Input
                      id="subject"
                      value={emailData.subject}
                      onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Email Subject"
                      className="pr-10"
                    />
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(emailData.subject)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="html-content">Email Body (HTML)</Label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleGenerateEmail(templateType)}
                        disabled={isGenerating || templateType === 'custom' || (!displayedRequest && !displayedProduct)}
                      >
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Generate
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowPreview(true)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    id="html-content"
                    value={emailData.html}
                    onChange={(e) => setEmailData(prev => ({ ...prev, html: e.target.value }))}
                    placeholder="Enter your HTML email content here..."
                    rows={12}
                    className="mt-1 font-mono text-sm"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    onClick={handleSendEmail}
                    disabled={isSending || !recipientEmails.trim() || !emailData.subject.trim() || !emailData.html.trim()}
                    className="bg-[#1C0357] hover:bg-[#1C0357]/90 flex items-center"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSending ? 'Sending...' : 'Send Email'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Eye className="mr-2 h-5 w-5" />
                Email Preview
              </DialogTitle>
            </DialogHeader>
            <div className="border rounded-md p-4 bg-gray-50 min-h-[200px]">
              <h3 className="font-semibold mb-2">Subject: {emailData.subject}</h3>
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: emailData.html }} 
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowPreview(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EmailGenerator;