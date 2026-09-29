import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Mail, Send, Star, ExternalLink, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';
import { getErrorMessage } from '@/lib/utils';

// Admin → Clients → Review requests: email past clients a short, personal note asking
// for a Google review, with a link to the review form and to the business.

const SEND_EMAIL_URL = 'https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email';
const SETTINGS_KEY = 'pbd:review-request-settings';
const ASKED_KEY = 'pbd:review-requests-sent';

const DEFAULT_SUBJECT = 'Quick favour, {firstName}?';
const DEFAULT_MESSAGE = `Hi {firstName},

Thanks so much for choosing Piano Backings by Daniele for "{song}". I hope it went brilliantly!

If you have a minute, a short Google review would mean a lot. It helps other singers find the service:
{reviewLink}

And if you ever need another track, everything is here: {businessLink}

Thank you!
Daniele`;

interface Client {
  email: string;
  name: string;
  song: string;
  lastDate: string;
}

interface Settings {
  reviewLink: string;
  businessLink: string;
  subject: string;
  message: string;
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: settings last for this visit only.
  }
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there';

const fill = (template: string, client: Client, settings: Settings) =>
  template
    .replace(/\{firstName\}/g, firstName(client.name))
    .replace(/\{song\}/g, client.song || 'your track')
    .replace(/\{reviewLink\}/g, settings.reviewLink || '[add your Google review link]')
    .replace(/\{businessLink\}/g, settings.businessLink || SITE_URL);

/** Plain text → simple HTML email, with the links clickable. */
const toHtml = (text: string) =>
  escapeHtml(text)
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br/>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>`)
    .join('');

/** Clients with a completed custom track or paid shop order, most recent first. */
const fetchClients = async (): Promise<Client[]> => {
  const [requests, orders] = await Promise.all([
    supabase.from('backing_requests').select('name, email, song_title, created_at, status').eq('status', 'completed'),
    supabase.from('orders').select('customer_email, created_at, status, products ( title )').in('status', ['completed', 'paid']),
  ]);
  if (requests.error) throw requests.error;
  if (orders.error) throw orders.error;

  const byEmail = new Map<string, Client>();
  const add = (email: string | null, name: string, song: string, date: string) => {
    const key = (email || '').trim().toLowerCase();
    if (!key) return;
    const existing = byEmail.get(key);
    if (!existing || existing.lastDate < date) {
      byEmail.set(key, { email: key, name: name || existing?.name || '', song, lastDate: date });
    }
  };
  for (const r of requests.data || []) add(r.email, r.name, r.song_title, r.created_at);
  for (const o of (orders.data || []) as unknown as { customer_email: string; created_at: string; products: { title: string } | null }[]) {
    add(o.customer_email, '', o.products?.title || '', o.created_at);
  }
  return [...byEmail.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
};

const ReviewRequestsTab: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(() =>
    readJson(SETTINGS_KEY, { reviewLink: '', businessLink: SITE_URL, subject: DEFAULT_SUBJECT, message: DEFAULT_MESSAGE }),
  );
  const [asked, setAsked] = useState<Record<string, string>>(() => readJson(ASKED_KEY, {}));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewEmail, setPreviewEmail] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => writeJson(SETTINGS_KEY, settings), [settings]);
  useEffect(() => writeJson(ASKED_KEY, asked), [asked]);

  const { data: clients = [], isLoading, error } = useQuery({ queryKey: ['review-request-clients'], queryFn: fetchClients });

  const previewClient = useMemo(
    () => clients.find((c) => c.email === previewEmail) || clients.find((c) => selected.has(c.email)) || clients[0],
    [clients, previewEmail, selected],
  );

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  const toggle = (email: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email); else next.add(email);
      return next;
    });

  const reviewLinkMissing = !/^https?:\/\//.test(settings.reviewLink.trim());

  const send = async () => {
    if (reviewLinkMissing) {
      toast({ title: 'Add your Google review link first', variant: 'destructive' });
      return;
    }
    const recipients = clients.filter((c) => selected.has(c.email));
    setIsSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    let sent = 0;
    const failed: string[] = [];
    for (const client of recipients) {
      try {
        const response = await fetch(SEND_EMAIL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session && { Authorization: `Bearer ${session.access_token}` }),
          },
          // One email per client, so each is personal and no addresses are shared.
          body: JSON.stringify({
            to: client.email,
            subject: fill(settings.subject, client, settings),
            html: toHtml(fill(settings.message, client, settings)),
            senderEmail: CONTACT_EMAIL,
          }),
        });
        if (!response.ok) {
          // send-email returns { error } with the real reason (e.g. Gmail not connected).
          const detail = await response.json().then((j) => j?.error).catch(() => null);
          throw new Error(detail ? `${response.status}: ${detail}` : `HTTP ${response.status}`);
        }
        sent++;
        setAsked((prev) => ({ ...prev, [client.email]: new Date().toISOString() }));
      } catch (err) {
        failed.push(`${client.email} (${getErrorMessage(err)})`);
      }
    }
    setIsSending(false);
    setSelected(new Set());
    toast({
      title: `Sent ${sent} review request${sent === 1 ? '' : 's'}`,
      description: failed.length ? `Failed: ${failed.join(', ')}` : undefined,
      variant: failed.length ? 'destructive' : undefined,
    });
  };

  const copyForClient = async (client: Client) => {
    try {
      await navigator.clipboard.writeText(`${fill(settings.subject, client, settings)}\n\n${fill(settings.message, client, settings)}`);
      toast({ title: 'Copied', description: `Message for ${client.email} copied to the clipboard.` });
    } catch {
      toast({ title: "Couldn't copy", variant: 'destructive' });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1C0357] font-black">
            <Star className="h-5 w-5 text-[#F538BC]" /> Ask for a Google review
          </CardTitle>
          <CardDescription>
            Personalised emails from {CONTACT_EMAIL}. Placeholders: {'{firstName}'}, {'{song}'}, {'{reviewLink}'}, {'{businessLink}'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="review-link">Google review link</Label>
            <Input
              id="review-link"
              placeholder="https://g.page/r/…/review"
              value={settings.reviewLink}
              onChange={(e) => update({ reviewLink: e.target.value })}
            />
            <p className="mt-1 text-xs text-gray-500">
              In Google Business Profile, choose <strong>Ask for reviews</strong> and copy the link.{' '}
              <a href="https://business.google.com/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">
                Open Business Profile <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
          <div>
            <Label htmlFor="business-link">Business link</Label>
            <Input id="business-link" value={settings.businessLink} onChange={(e) => update({ businessLink: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="review-subject">Subject</Label>
            <Input id="review-subject" value={settings.subject} onChange={(e) => update({ subject: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="review-message">Message</Label>
            <Textarea id="review-message" rows={12} value={settings.message} onChange={(e) => update({ message: e.target.value })} />
            <button type="button" className="mt-1 text-xs underline text-gray-500" onClick={() => update({ subject: DEFAULT_SUBJECT, message: DEFAULT_MESSAGE })}>
              Reset to the default wording
            </button>
          </div>
          {previewClient && (
            <div className="rounded-xl border bg-gray-50 p-4 text-sm">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Preview for {previewClient.email}</p>
              <p className="mt-2 font-bold">{fill(settings.subject, previewClient, settings)}</p>
              <div className="mt-2 space-y-2 [&_a]:underline [&_a]:text-[#1C0357]" dangerouslySetInnerHTML={{ __html: toHtml(fill(settings.message, previewClient, settings)) }} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[#1C0357] font-black">Clients ({clients.length})</CardTitle>
          <CardDescription>People with a completed custom track or a paid shop order, most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected(new Set(clients.filter((c) => !asked[c.email]).map((c) => c.email)))}
            >
              Select everyone not yet asked
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            <Button
              size="sm"
              className="ml-auto bg-[#1C0357] hover:bg-[#2D0B8C] font-black"
              disabled={!selected.size || isSending || reviewLinkMissing}
              onClick={send}
            >
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send to {selected.size}
            </Button>
          </div>
          {reviewLinkMissing && <p className="mb-3 text-xs font-bold text-[#F538BC]">Add your Google review link to enable sending.</p>}

          {isLoading && <p className="text-sm text-gray-500"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading clients…</p>}
          {error && <p className="text-sm text-red-600">Couldn't load clients: {getErrorMessage(error)}</p>}

          <ul className="divide-y max-h-[640px] overflow-y-auto">
            {clients.map((client) => (
              <li key={client.email} className="flex items-center gap-3 py-3">
                <Checkbox checked={selected.has(client.email)} onCheckedChange={() => toggle(client.email)} aria-label={`Select ${client.email}`} />
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setPreviewEmail(client.email)}>
                  <p className="font-bold text-[#1C0357] truncate">{client.name || client.email}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {client.name && `${client.email} · `}{client.song || 'Order'} · {format(new Date(client.lastDate), 'd MMM yyyy')}
                  </p>
                  {asked[client.email] && (
                    <p className="text-[11px] font-bold text-[#F538BC]">Asked {format(new Date(asked[client.email]), 'd MMM yyyy')}</p>
                  )}
                </button>
                <Button variant="ghost" size="icon" title="Copy message" onClick={() => copyForClient(client)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" asChild title="Open in your email app">
                  <a
                    href={`mailto:${client.email}?subject=${encodeURIComponent(fill(settings.subject, client, settings))}&body=${encodeURIComponent(fill(settings.message, client, settings))}`}
                    onClick={() => setAsked((prev) => ({ ...prev, [client.email]: new Date().toISOString() }))}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-gray-400">"Asked" dates and your wording are saved in this browser.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewRequestsTab;
