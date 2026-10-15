import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, Loader2, Upload } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn, getErrorMessage } from '@/lib/utils';

// The sheet music a request already has, shared by every view that shows it.
export type SheetFile = { url: string; caption: string };

export type RequestSheetInfo = {
  id: string;
  sheet_music_url: string | null;
  sheet_music_urls: { url?: string; caption?: string | boolean | null }[] | null;
};

const captionOf = (caption: string | boolean | null | undefined, fallback: string) =>
  typeof caption === 'string' && caption.trim() ? caption : fallback;

export function sheetFilesOf(info: RequestSheetInfo | null | undefined): SheetFile[] {
  const list = (info?.sheet_music_urls ?? [])
    .filter((f) => f?.url)
    .map((f, i) => ({ url: f.url!, caption: captionOf(f.caption, `Sheet music ${i + 1}`) }));
  if (list.length === 0 && info?.sheet_music_url) {
    list.push({ url: info.sheet_music_url, caption: 'Sheet music' });
  }
  return list;
}

export function useRequestSheet(requestId: string | null, enabled = true) {
  return useQuery<RequestSheetInfo | null, Error>({
    queryKey: ['request_info', requestId],
    enabled: enabled && !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backing_requests')
        .select('id, sheet_music_url, sheet_music_urls')
        .eq('id', requestId!)
        .maybeSingle();
      if (error) throw error;
      return (data as RequestSheetInfo) ?? null;
    },
  });
}

const MAX_BYTES = 25 * 1024 * 1024;

// Drop a PDF onto the box and it is attached to the request. The newest file is
// previewed; earlier ones stay on the request and are listed underneath.
export default function SheetMusicDrop({
  requestId,
  compact = false,
  className,
}: {
  requestId: string;
  compact?: boolean;
  className?: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: info, isLoading } = useRequestSheet(requestId);
  const files = sheetFilesOf(info);
  const latest = files[files.length - 1];
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const attach = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      toast({ title: 'That isn’t a PDF', description: 'Drop the sheet music as a .pdf file.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: 'That PDF is too large', description: 'Keep it under 25 MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const safe = file.name.replace(/[^\w.-]+/g, '_');
      const path = `${requestId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from('sheet-music')
        .upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (upErr) throw upErr;
      const url = supabase.storage.from('sheet-music').getPublicUrl(path).data.publicUrl;
      const next = [...files.map((f) => ({ url: f.url, caption: f.caption })), { url, caption: file.name }];
      const { error: saveErr } = await supabase
        .from('backing_requests')
        .update({ sheet_music_url: url, sheet_music_urls: next })
        .eq('id', requestId);
      if (saveErr) throw saveErr;
      await queryClient.invalidateQueries({ queryKey: ['request_info', requestId] });
      toast({ title: 'Sheet music attached', description: file.name });
    } catch (e) {
      toast({ title: "Couldn't attach the PDF", description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void attach(file);
  };

  const previewH = compact ? 'h-40' : 'h-72';

  return (
    <div className={cn('space-y-2', className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!over) setOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
        }}
        onDrop={onDrop}
        className={cn(
          'relative overflow-hidden rounded-xl border-2 border-dashed transition-colors',
          over ? 'border-[#F538BC] bg-pink-50' : 'border-gray-200 bg-gray-50',
        )}
      >
        {isLoading ? (
          <div className={cn('flex items-center justify-center text-gray-400', previewH)}>
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : latest ? (
          <iframe
            key={latest.url}
            src={`${latest.url}#toolbar=0&navpanes=0&view=FitH`}
            title={latest.caption}
            className={cn('block w-full bg-white', previewH)}
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn('flex w-full flex-col items-center justify-center gap-1.5 px-4 text-center', previewH)}
          >
            <FileText className="h-6 w-6 text-gray-300" />
            <span className="text-xs font-medium text-gray-600">Drop the sheet music PDF here</span>
            <span className="text-[11px] text-gray-400">or click to choose a file</span>
          </button>
        )}

        {(over || uploading) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-white/85 backdrop-blur-[1px]">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#1C0357]" />
            ) : (
              <Upload className="h-5 w-5 text-[#F538BC]" />
            )}
            <span className="text-xs font-semibold text-[#1C0357]">
              {uploading ? 'Attaching…' : 'Let go to attach it'}
            </span>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void attach(file);
            e.target.value = '';
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
        <span className="min-w-0 truncate">
          {latest ? (
            <>
              <FileText className="mr-1 inline h-3 w-3 align-[-2px]" />
              {latest.caption}
              {files.length > 1 && <span className="text-gray-400"> · {files.length} files</span>}
            </>
          ) : (
            'No sheet music yet'
          )}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {latest && (
            <a href={latest.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1C0357] hover:underline">
              Open <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {latest && (
            <button type="button" onClick={() => inputRef.current?.click()} className="text-[#1C0357] hover:underline">
              Add another
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
