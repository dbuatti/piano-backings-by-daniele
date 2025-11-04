import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Bell } from 'lucide-react'; // Removed AlertCircle, Loader2
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UnreadIssueReportsNoticeProps {
  isAdmin: boolean;
}

const UnreadIssueReportsNotice: React.FC<UnreadIssueReportsNoticeProps> = ({ isAdmin }) => {
  const { data: unreadCount, isLoading, isError } = useQuery<number, Error>({
    queryKey: ['unreadIssueReportsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('issue_reports')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      if (error) throw error;
      return count;
    },
    enabled: isAdmin, // Only fetch if user is admin
    refetchInterval: 60000, // Refetch every minute
  });

  if (!isAdmin || isLoading || isError || (unreadCount ?? 0) === 0) { // Added nullish coalescing operator
    return null;
  }

  return (
    <Link
      to="/admin?tab=issue-reports"
      className={cn(
        "fixed bottom-24 right-6 rounded-full p-4 shadow-lg bg-red-600 hover:bg-red-700 text-white z-50",
        (unreadCount ?? 0) > 0 && "animate-pulse-slow" // Apply pulsing animation if unread // Added nullish coalescing operator
      )}
      title={`You have ${unreadCount} unread issue report${(unreadCount ?? 0) > 1 ? 's' : ''}`}
    >
      <Bell className="h-5 w-5" />
      {(unreadCount ?? 0) > 0 && ( // Added nullish coalescing operator
        <Badge
          variant="default"
          className="absolute -top-1 -right-1 bg-white text-red-600 rounded-full px-2 py-1 text-xs font-bold"
        >
          {unreadCount}
        </Badge>
      )}
    </Link>
  );
};

export default UnreadIssueReportsNotice;