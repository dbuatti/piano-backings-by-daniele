import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FileText, Music } from 'lucide-react';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function slugify(title: string): string {
  return (
    title
      .replace(/^\s*from\s+/i, '')
      .replace(/[^\w\- ]+/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase() || 'title-card'
  );
}

// Falls back to a styled mini poster when there's no captured snapshot.
function FallbackCard({
  title,
  show,
  keyValue,
}: {
  title?: string | null;
  show?: string | null;
  keyValue?: string | null;
}) {
  return (
    <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#1C0357] via-[#2B0A5E] to-[#4A1285] p-6 text-center text-white">
      <Music className="h-6 w-6 text-[#F538BC]" />
      <p className="text-lg font-black leading-tight">{title || 'Title card'}</p>
      {show && <p className="text-xs text-white/70">{show}</p>}
      {keyValue && (
        <p className="mt-1 text-sm font-bold text-[#F538BC]">Key: {keyValue}</p>
      )}
    </div>
  );
}

export function CardPreview({
  previewPath,
  title,
  show,
  key: keyValue,
  aspect,
  maxWidth = 360,
  enabled = true,
}: {
  previewPath: string | null;
  title?: string | null;
  show?: string | null;
  key?: string | null;
  aspect?: string | null;
  maxWidth?: number;
  enabled?: boolean;
}) {
  const { toast } = useToast();

  const { data: signedUrl } = useQuery({
    queryKey: ['card-preview', previewPath],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('content')
        .createSignedUrl(previewPath as string, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: Boolean(previewPath) && enabled,
  });

  const downloadPdf = useCallback(async () => {
    if (!previewPath) return;
    try {
      const { data: file, error } = await supabase.storage
        .from('content')
        .download(previewPath);
      if (error || !file) throw error || new Error('No preview file.');
      const dataUrl = await blobToDataUrl(file);

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const landscape = aspect === '16:9';
            const doc = new jsPDF({
              orientation: landscape ? 'landscape' : 'portrait',
              format: 'a5',
              unit: 'mm',
            });
            const pw = doc.internal.pageSize.getWidth();
            const ph = doc.internal.pageSize.getHeight();
            const margin = 8;
            const maxW = pw - margin * 2;
            const maxH = ph - margin * 2 - 10;
            const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
            const w = img.naturalWidth * scale;
            const h = img.naturalHeight * scale;

            let x = (pw - w) / 2;
            const y = (ph - (h + 8)) / 2;

            // Portrait cards are often 9:16; square cards are already wide, so
            // nudge the vertical centre so the key line always has room.
            if (aspect === '1:1' || aspect === '9:16') {
              x = (pw - w) / 2;
            }
            doc.addImage(dataUrl, 'PNG', x, y, w, h);
            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.text(
              keyValue ? `Key: ${keyValue}` : 'Key: see card',
              pw / 2,
              ph - 4,
              { align: 'center' }
            );
            doc.save(`${slugify(title || 'title-card')}-preview.pdf`);
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => reject(new Error('Could not load the preview image.'));
        img.src = dataUrl;
      });
    } catch (e) {
      toast({
        title: "Couldn't generate the PDF",
        description: getErrorMessage(e),
        variant: 'destructive',
      });
    }
  }, [previewPath, aspect, keyValue, title, toast]);

  if (!previewPath) {
    return <FallbackCard title={title} show={show} keyValue={keyValue} />;
  }

  return (
    <div className="space-y-2">
      <div
        className="overflow-hidden rounded-lg border border-gray-200 bg-white"
        style={{ maxWidth }}
      >
        {signedUrl ? (
          <img src={signedUrl} alt="Title card preview" className="block h-auto w-full" />
        ) : (
          <FallbackCard title={title} show={show} keyValue={keyValue} />
        )}
      </div>
      <Button size="sm" variant="outline" onClick={downloadPdf}>
        <FileText className="h-3.5 w-3.5" /> Download PDF (A5)
      </Button>
    </div>
  );
}

export default CardPreview;