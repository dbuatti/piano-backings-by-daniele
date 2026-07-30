// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOTION_VERSION = '2022-06-28';

function notionHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

async function notionFetch(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: { ...notionHeaders(token), ...(init.headers || {}) },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  if (!res.ok) {
    const msg = json?.message || text || `Notion ${res.status}`;
    throw new Error(`Notion ${path} ${res.status}: ${msg}`);
  }
  return json;
}

// Build a set of candidate property values keyed by the names we expect in Notion.
// Mapped specifically to "The Plan" database columns:
//   Title (title), Project (select), Date (date), Dollars (number),
//   Status (status), Type (multi_select), Details (rich_text), Request ID (rich_text)
function tierLabel(tier: string | undefined): string | null {
  if (!tier) return null;
  return ({
    'note-bash': 'Note Bash',
    'audition-ready': 'Audition Ready',
    'full-song': 'Full Song',
    'quick': 'Quick',
    'one-take': 'One Take',
  } as Record<string, string>)[String(tier)] || String(tier);
}

function mapStatusToNotion(status: any): string | null {
  if (!status) return null;
  const s = String(status).toLowerCase();
  if (['delivered', 'completed', 'done', 'complete'].some(x => s.includes(x))) return 'Done';
  if (['in_progress', 'in-progress', 'working', 'recording', 'mixing'].some(x => s.includes(x))) return 'In progress';
  return 'Not started';
}

function buildRequestCandidates(row: any) {
  const tier = tierLabel(row.track_type);
  const summaryLines: string[] = [];
  if (row.id) summaryLines.push(`Request ID: ${row.id}`);
  if (row.email) summaryLines.push(`Email: ${row.email}`);
  if (row.name) summaryLines.push(`Client: ${row.name}`);
  if (row.musical_or_artist) summaryLines.push(`From: ${row.musical_or_artist}`);
  if (tier) summaryLines.push(`Tier: ${tier}`);
  if (row.song_key) summaryLines.push(`Key: ${row.song_key}`);
  if (row.different_key === 'Yes' && row.key_for_track) summaryLines.push(`Transposed to: ${row.key_for_track}`);
  if (Array.isArray(row.additional_services) && row.additional_services.length) summaryLines.push(`Add-ons: ${row.additional_services.join(', ')}`);
  if (row.special_requests) summaryLines.push(`Notes: ${String(row.special_requests).slice(0, 500)}`);
  if (row.youtube_link) summaryLines.push(`YouTube: ${row.youtube_link}`);
  const detailsText = summaryLines.join('\n').slice(0, 2000);

  return {
    'Request ID': { rich_text: [{ text: { content: String(row.id || '') } }] },
    'Project': { select: { name: 'Piano Backings' } },
    'Date': row.delivery_date
      ? { date: { start: String(row.delivery_date).slice(0, 10) } }
      : (row.created_at ? { date: { start: String(row.created_at).slice(0, 10) } } : null),
    // Dollars is the AUD money column. For a request we record revenue (positive).
    'Dollars': row.final_price != null
      ? { number: Number(row.final_price) }
      : (row.cost != null ? { number: Number(row.cost) } : null),
    'Status': { status: { name: mapStatusToNotion(row.status) || 'Not started' } },
    'Type': tier ? { multi_select: [{ name: tier }] } : null,
    'Details': detailsText ? { rich_text: [{ text: { content: detailsText } }] } : null,
  };
}

function buildProductCandidates(row: any) {
  return {
    'Product ID': { rich_text: [{ text: { content: String(row.id) } }] },
    'Title': { rich_text: [{ text: { content: String(row.name || row.title || '') } }] },
    'Price': row.price != null ? { number: Number(row.price) } : null,
    'Tier': row.type ? { select: { name: String(row.type) } } : null,
    'Category': row.category ? { select: { name: String(row.category) } } : null,
    'Active': { checkbox: row.is_active !== false },
    'Master Download': row.master_download_link ? { url: String(row.master_download_link) } : null,
    'Created At': row.created_at ? { date: { start: String(row.created_at).slice(0, 10) } } : null,
  };
}

// Prune candidates to only properties that exist in the target Notion DB, and coerce type mismatches.
function pruneCandidates(candidates: Record<string, any>, dbSchema: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [name, value] of Object.entries(candidates)) {
    if (value == null) continue;
    const schema = dbSchema[name];
    if (!schema) continue; // property doesn't exist in Notion DB — skip
    const type = schema.type;
    // Notion's create/update property payload must match its type.
    // Our candidate objects are keyed by the *Notion* property type (e.g. { number: ... }).
    if (!(type in value)) continue;
    out[name] = value;
  }
  return out;
}

async function findExistingPage(token: string, databaseId: string, idPropName: string, idValue: string) {
  const res = await notionFetch(token, `/databases/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: { property: idPropName, rich_text: { equals: idValue } },
      page_size: 1,
    }),
  });
  return res?.results?.[0]?.id || null;
}

async function getDbSchema(token: string, databaseId: string) {
  const db = await notionFetch(token, `/databases/${databaseId}`);
  return db?.properties || {};
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const token = Deno.env.get('NOTION_TOKEN');
  const requestsDbId = Deno.env.get('NOTION_REQUESTS_DATABASE_ID');
  const productsDbId = Deno.env.get('NOTION_PRODUCTS_DATABASE_ID');

  if (!token) {
    return new Response(JSON.stringify({ error: 'NOTION_TOKEN not set' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const type = payload.type || 'request';
  const id = payload.id;
  const skipLookup = payload.skipDbLookup === true; // when caller passes a full row
  let row = skipLookup ? payload.row : null;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  if (!row) {
    const table = type === 'product' ? 'products' : 'backing_requests';
    const { data, error } = await supabaseAdmin.from(table).select('*').eq('id', id).single();
    if (error) {
      return new Response(JSON.stringify({ error: `Row lookup failed: ${error.message}` }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    row = data;
  }

  const databaseId = type === 'product' ? productsDbId : requestsDbId;
  if (!databaseId) {
    return new Response(JSON.stringify({ error: `No Notion DB id configured for ${type}` }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const schema = await getDbSchema(token, databaseId);
    const candidates = type === 'product'
      ? buildProductCandidates(row)
      : buildRequestCandidates(row);
    const properties = pruneCandidates(candidates, schema);

    // Determine page title property (Notion "title" type) — fall back to first title prop in schema
    const titlePropName = Object.keys(schema).find((n) => schema[n].type === 'title');
    const titleText = type === 'product'
      ? String(row.name || row.title || row.id)
      : `${row.song_title || 'Untitled'}${row.musical_or_artist ? ` (from ${row.musical_or_artist})` : ''}`;

    if (titlePropName) {
      properties[titlePropName] = { title: [{ text: { content: titleText.slice(0, 2000) } }] };
    }

    // Find existing page by stored notion_page_id or by id property match
    let pageId = row.notion_page_id || null;
    if (!pageId) {
      const idPropName = type === 'product' ? 'Product ID' : 'Request ID';
      if (schema[idPropName]) {
        try {
          pageId = await findExistingPage(token, databaseId, idPropName, String(row.id));
        } catch (e) {
          console.warn('[sync-to-notion] find existing failed:', e.message);
        }
      }
    }

    const table = type === 'product' ? 'products' : 'backing_requests';

    if (pageId) {
      const updated = await notionFetch(token, `/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties }),
      });
      await supabaseAdmin.from(table).update({
        notion_page_id: updated.id,
        notion_synced_at: new Date().toISOString(),
        notion_sync_error: null,
      }).eq('id', id);
      return new Response(JSON.stringify({ message: 'updated', pageId: updated.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const created = await notionFetch(token, `/pages`, {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });
    await supabaseAdmin.from(table).update({
      notion_page_id: created.id,
      notion_synced_at: new Date().toISOString(),
      notion_sync_error: null,
    }).eq('id', id);
    return new Response(JSON.stringify({ message: 'created', pageId: created.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[sync-to-notion] error:', err.message);
    const t = type === 'product' ? 'products' : 'backing_requests';
    await supabaseAdmin.from(t).update({
      notion_sync_error: err.message,
      notion_synced_at: new Date().toISOString(),
    }).eq('id', id).then(() => {}, () => {});
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});