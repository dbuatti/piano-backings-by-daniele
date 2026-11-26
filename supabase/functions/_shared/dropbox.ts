// @ts-nocheck
// Dropbox helpers shared by the request pipeline: token refresh, folder lookup and
// the Order Summary.txt upload. The summary is written once when the request is
// created and rewritten (same path, mode "overwrite") once payment lands, so the
// folder always ends up with a single, payment-complete Order Summary.txt.

export const SUMMARY_FILE_NAME = 'Order Summary.txt';

export interface DropboxConfig {
  appKey?: string | null;
  appSecret?: string | null;
  refreshToken?: string | null;
  parentFolder?: string | null;
  logicTemplatePath?: string | null;
}

export function dropboxConfigFromEnv(): DropboxConfig {
  return {
    appKey: Deno.env.get('DROPBOX_APP_KEY'),
    appSecret: Deno.env.get('DROPBOX_APP_SECRET'),
    refreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN'),
    parentFolder: Deno.env.get('DROPBOX_PARENT_FOLDER') || '/Move over to NAS/PIANO BACKING TRACKS',
    logicTemplatePath:
      Deno.env.get('LOGIC_TEMPLATE_PATH') ||
      '/Move over to NAS/PIANO BACKING TRACKS/00. TEMPLATE/X from Y prepared for Z.logicx',
  };
}

export const hasDropboxCredentials = (config: DropboxConfig): boolean =>
  !!(config.appKey && config.appSecret && config.refreshToken);

export async function getDropboxAccessToken(config: DropboxConfig): Promise<string> {
  const response = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken as string,
      client_id: config.appKey as string,
      client_secret: config.appSecret as string,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Dropbox token refresh failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

/** Upload (or overwrite) a text file. Returns the Dropbox path written. */
export async function uploadDropboxText(
  accessToken: string,
  path: string,
  content: string,
  mode: 'add' | 'overwrite' = 'add',
): Promise<string> {
  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({ path, mode, autorename: true, mute: false }),
    },
    body: new TextEncoder().encode(content),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dropbox upload failed (${response.status}) for ${path}: ${errorText}`);
  }
  return path;
}

/**
 * Resolve a request's Dropbox folder and write Order Summary.txt into it.
 * `dropbox_folder_id` holds Dropbox's opaque `id:…`, so we ask for its
 * `path_display` first. Never throws — callers log and move on, because a
 * missing summary must not fail the order or the payment webhook.
 */
export async function writeOrderSummary(
  supabaseAdmin: any,
  requestId: string,
  content: string,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  const config = dropboxConfigFromEnv();
  if (!hasDropboxCredentials(config)) {
    return { ok: false, error: 'Dropbox credentials are not configured' };
  }

  try {
    const accessToken = await getDropboxAccessToken(config);

    const { data: row, error } = await supabaseAdmin
      .from('backing_requests')
      .select('dropbox_folder_id')
      .eq('id', requestId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!row?.dropbox_folder_id) {
      return { ok: false, error: 'Request has no Dropbox folder yet' };
    }

    // `dropbox_folder_id` is normally Dropbox's opaque `id:…`; older rows may hold
    // a path. Resolve the id to its `path_display` so we can write a real path.
    let folderPath: string = row.dropbox_folder_id;
    if (!folderPath.startsWith('/')) {
      const metaResponse = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath.startsWith('id:') ? folderPath : `id:${folderPath}` }),
      });
      if (metaResponse.ok) {
        const meta = await metaResponse.json();
        if (meta.path_display) folderPath = meta.path_display;
      }
    }

    const path = `${folderPath}/${SUMMARY_FILE_NAME}`;
    await uploadDropboxText(accessToken, path, content, 'overwrite');
    return { ok: true, path };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}