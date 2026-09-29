"use client";

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';

interface PublicStats {
  tracksDelivered: number;
}

const fetchPublicStats = async (): Promise<PublicStats> => {
  const res = await fetch('https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/public-stats');
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json();
};

const HeroStats = () => {
  const { data } = useQuery({
    queryKey: ['public-stats'],
    queryFn: fetchPublicStats,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  // Only show real, non-trivial numbers — no placeholder/fake stats.
  if (!data || data.tracksDelivered < 5) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 mt-6 text-[#1C0357]"
    >
      <div className="flex items-center gap-2 font-black">
        <Music className="w-5 h-5 text-[#F538BC]" />
        <span className="text-lg">{data.tracksDelivered}+</span>
        <span className="text-sm text-gray-500 font-bold">tracks delivered</span>
      </div>
    </motion.div>
  );
};

export default HeroStats;
