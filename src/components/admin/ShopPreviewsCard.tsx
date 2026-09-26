import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Music } from 'lucide-react';
import { generateProductPreview } from '@/utils/audioPreview';
import { getErrorMessage } from '@/lib/utils';

interface MissingPreview {
  id: string;
  title: string;
  sourceUrl: string | null;
}

interface ProductRow {
  id: string;
  title: string;
  product_type: string | null;
  product_files: { track_urls: { url: string | null }[] | null } | { track_urls: { url: string | null }[] | null }[] | null;
}

const firstTrackUrl = (files: ProductRow['product_files']) => {
  const row = Array.isArray(files) ? files[0] : files;
  return row?.track_urls?.find(t => t?.url)?.url || null;
};

// Shop previews are short clips made from each product's first track, so the full
// paid file is never exposed. New or re-uploaded tracks show up here until generated.
const ShopPreviewsCard: React.FC = () => {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [failures, setFailures] = useState<{ title: string; reason: string }[]>([]);

  const { data: missing = [], isLoading } = useQuery<MissingPreview[]>({
    queryKey: ['productsMissingPreviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, product_type, product_files(track_urls)')
        .is('preview_url', null)
        .order('title');
      if (error) throw error;
      return ((data || []) as unknown as ProductRow[])
        .filter(p => p.product_type !== 'credit_pack')
        .map(p => ({ id: p.id, title: p.title, sourceUrl: firstTrackUrl(p.product_files) }));
    },
    refetchInterval: isRunning ? false : 30_000,
  });

  const generatable = missing.filter(p => p.sourceUrl);
  const withoutAudio = missing.filter(p => !p.sourceUrl);

  if (isLoading || missing.length === 0) return null;

  const generateAll = async () => {
    setIsRunning(true);
    setFailures([]);
    const failed: { title: string; reason: string }[] = [];
    for (let i = 0; i < generatable.length; i++) {
      const product = generatable[i];
      setProgress(`${i + 1} / ${generatable.length}: ${product.title}`);
      try {
        await generateProductPreview(product.id, product.sourceUrl!);
      } catch (err) {
        failed.push({ title: product.title, reason: getErrorMessage(err) });
      }
    }
    setFailures(failed);
    setProgress('');
    setIsRunning(false);
    queryClient.invalidateQueries({ queryKey: ['productsMissingPreviews'] });
    queryClient.invalidateQueries({ queryKey: ['shopProducts'] });
  };

  return (
    <Card className="border-2 border-[#F538BC]/30 shadow-sm rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-black text-[#1C0357] flex items-center gap-2">
          <Music className="h-5 w-5 text-[#F538BC]" /> Shop previews needed ({missing.length})
        </CardTitle>
        <CardDescription>
          The shop plays a 15-second clip instead of the full paid track. Generating runs in this browser tab,
          so keep it open until it finishes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {generatable.length > 0 && (
          <Button onClick={generateAll} disabled={isRunning} className="bg-[#1C0357] hover:bg-[#2D0B8C] font-bold rounded-lg">
            {isRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {progress}</> : `Generate ${generatable.length} preview${generatable.length === 1 ? '' : 's'}`}
          </Button>
        )}
        {withoutAudio.length > 0 && (
          <p className="text-xs text-gray-500">
            No uploaded audio to make a clip from (only a download link): {withoutAudio.map(p => p.title).join(', ')}.
          </p>
        )}
        {failures.length > 0 && (
          <ul className="text-xs text-red-600 space-y-1">
            {failures.map(f => <li key={f.title}><strong>{f.title}:</strong> {f.reason}</li>)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default ShopPreviewsCard;
