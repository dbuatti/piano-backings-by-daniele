"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/useAdmin';

const UnreadIssueReportsNotice: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isAuthLoading } = useAdmin();

  // Fetch unread reports count
  const { data: unreadCount, isLoading: isLoadingCount } = useQuery<number, Error>({
    queryKey: ['unreadIssueReportsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('issue_reports')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: isAdmin, // Only run if user is admin
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  if (isAuthLoading || !isAdmin || isLoadingCount || unreadCount === 0) {
    return null; // Don't render if not admin, loading, or no unread reports
  }

  return (
    <Button
      onClick={() => navigate('/admin?tab=issue-reports')} // Updated navigation
      className={cn(
        "fixed bottom-24 right-6 rounded-full p-4 shadow-lg bg-red-600 hover:bg-red-700 text-white z-50",
        unreadCount > 0 && "animate-pulse-slow" // Apply pulsing animation if unread
      )}
      size="icon"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          variant="default" 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-yellow-400 text-red-900 text-xs font-bold"
        >
          {unreadCount}
        </Badge>
      )}
      <span className="sr-only">Unread Issue Reports</span>
    </Button>
  );
};

export default UnreadIssueReportsNotice;