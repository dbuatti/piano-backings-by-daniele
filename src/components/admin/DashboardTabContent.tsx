import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast'; // Updated import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import ErrorDisplay from '@/components/ErrorDisplay';

interface DashboardStats {
  total_requests: number;
  pending_requests: number;
  completed_requests: number;
  total_revenue: number;
}

const DashboardTabContent: React.FC = () => {
  const { data: stats, isLoading, isError, error } = useQuery<DashboardStats, Error>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) throw error;
      return data[0]; // rpc returns an array, we expect one object
    },
    staleTime: 60 * 1000, // 1 minute
  });

  useEffect(() => {
    if (isError) {
      showError(`Error fetching data: ${error.message}`); // Updated toast call
    }
  }, [isError, error]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-[#1C0357]" />
        <p className="ml-3 text-gray-600">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="shadow-lg bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.total_revenue?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              Based on completed and paid requests
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-lg bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_requests || 0}</div>
            <p className="text-xs text-muted-foreground">
              All requests ever submitted
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-lg bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_requests || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your action
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-lg bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completed_requests || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>
      </div>
      {isError && <ErrorDisplay error={error} title="Failed to Load Dashboard Stats" />}
    </div>
  );
};

export default DashboardTabContent;