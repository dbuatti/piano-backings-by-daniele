import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Music } from 'lucide-react';

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
  musicalKey: keyValue,
  maxWidth = 360,
  enabled = true,
}: {
  previewPath: string | null;
  title?: string | null;
  show?: string | null;
  // Named `musicalKey` (not `key`) — `key` is reserved by React and never
  // reaches a component as a prop.
  musicalKey?: string | null;
  aspect?: string | null;
  maxWidth?: number;
  enabled?: boolean;
}) {
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

  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-gray-200 bg-[#1B0057]"
      style={{ maxWidth }}
    >
      {signedUrl ? (
        <img src={signedUrl} alt="Title card preview" className="w-full" />
      ) : (
        <FallbackCard title={title} show={show} keyValue={keyValue} />
      )}
    </div>
  );
}

export default CardPreview;
