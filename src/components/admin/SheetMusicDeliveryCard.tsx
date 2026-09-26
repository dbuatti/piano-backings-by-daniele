import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { uploadFileToSupabase } from '@/utils/supabase-client';
import { getErrorMessage } from '@/lib/utils';

export interface SheetMusicOrder {
  id: string;
  created_at: string;
  customer_email: string;
  product_id: string | null;
  products?: { title: string } | null;
}

const SEND_EMAIL_URL = 'https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

interface Props {
  orders: SheetMusicOrder[];
  onDelivered: () => void;
}

// Orders that bought the $50 engraved sheet music add-on and are still waiting for it.
const SheetMusicDeliveryCard: React.FC<Props> = ({ orders, onDelivered }) => {
  const { toast } = useToast();
  const [active, setActive] = useState<SheetMusicOrder | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [reuse, setReuse] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  if (orders.length === 0) return null;

  const open = (order: SheetMusicOrder) => {
    setActive(order);
    setFile(null);
    setLink('');
    setReuse(true);
  };

  const deliver = async () => {
    if (!active) return;
    setIsSaving(true);
    try {
      let url = link.trim();
      if (file) {
        const { data, error } = await uploadFileToSupabase(file, `engraved/${active.product_id || 'misc'}/`, 'sheet-music');
        if (error || !data?.path) throw error || new Error('Upload failed');
        url = supabase.storage.from('sheet-music').getPublicUrl(data.path).data.publicUrl;
      }
      if (!url) throw new Error('Upload a PDF or paste a link first.');

      const { error: orderError } = await supabase
        .from('orders')
        .update({ sheet_music_url: url, sheet_music_delivered_at: new Date().toISOString() })
        .eq('id', active.id);
      if (orderError) throw orderError;

      if (reuse && active.product_id) {
        const { error: productError } = await supabase
          .from('product_sheet_music')
          .upsert({ product_id: active.product_id, url, updated_at: new Date().toISOString() });
        if (productError) throw productError;
      }

      const title = active.products?.title || 'your track';
      const { data: { session } } = await supabase.auth.getSession();
      const emailResponse = await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          to: active.customer_email,
          subject: `Your sheet music for "${title}" is ready`,
          html: `<p>Hi there,</p>
            <p>Your custom sheet music for <strong>${escapeHtml(title)}</strong> is ready.</p>
            <p><a href="${url}">Download your sheet music (PDF)</a></p>
            <p>You can also find it any time in your dashboard.</p>
            <p>Happy singing!<br/>Daniele</p>`,
          senderEmail: 'pianobackingsbydaniele@gmail.com',
        }),
      });

      toast({
        title: 'Sheet music delivered',
        description: emailResponse.ok
          ? `Emailed to ${active.customer_email}.`
          : `Saved to the order, but the email failed. Let ${active.customer_email} know manually.`,
        variant: emailResponse.ok ? undefined : 'destructive',
      });
      setActive(null);
      onDelivered();
    } catch (err) {
      toast({ title: 'Delivery failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="border-2 border-[#F538BC]/30 shadow-sm rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-black text-[#1C0357] flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#F538BC]" /> Sheet music to deliver ({orders.length})
          </CardTitle>
          <CardDescription>Customers who added custom sheet music to a shop purchase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {orders.map(order => (
            <div key={order.id} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3">
              <div className="min-w-0">
                <p className="font-bold text-sm text-[#1C0357] truncate">{order.products?.title || 'Shop product'}</p>
                <p className="text-xs text-gray-500 truncate">
                  {order.customer_email} · {format(new Date(order.created_at), 'd MMM yyyy')}
                </p>
              </div>
              <Button size="sm" onClick={() => open(order)} className="bg-[#1C0357] hover:bg-[#2D0B8C] font-bold rounded-lg">
                <Send className="mr-1.5 h-3.5 w-3.5" /> Deliver
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => { if (!o) setActive(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deliver sheet music</DialogTitle>
            <DialogDescription>
              {active?.products?.title} for {active?.customer_email}. The customer is emailed a download link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-music-file">Upload PDF</Label>
              <Input id="sheet-music-file" type="file" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-music-link">…or paste a link (Dropbox, Drive)</Label>
              <Input id="sheet-music-link" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} disabled={!!file} />
            </div>
            {active?.product_id && (
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox checked={reuse} onCheckedChange={(v) => setReuse(v === true)} className="mt-0.5" />
                <span>Use this for future orders of this product, so they're delivered instantly.</span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)} disabled={isSaving}>Cancel</Button>
            <Button onClick={deliver} disabled={isSaving || (!file && !link.trim())} className="bg-[#1C0357] hover:bg-[#2D0B8C]">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deliver & email customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SheetMusicDeliveryCard;
