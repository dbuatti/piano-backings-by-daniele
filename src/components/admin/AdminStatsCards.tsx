import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FileAudio, AlertCircle, Clock, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackingRequest {
  id: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  cost?: number | null;
}

interface AdminStatsCardsProps {
  requests: BackingRequest[];
  totalIssueReports: number;
  unreadIssueReports: number;
}

const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({
  requests,
  totalIssueReports,
  unreadIssueReports,
}) => {
  const totalRequests = requests.length;
  const completedRequests = requests.filter(r => r.status === 'completed').length;
  const inProgressRequests = requests.filter(r => r.status === 'in-progress').length;
  
  // Calculate revenue
  const totalRevenue = requests
    .filter(r => r.is_paid)
    .reduce((sum, r) => sum + (r.cost || 0), 0);
    
  const pendingRevenue = requests
    .filter(r => !r.is_paid && r.status !== 'cancelled')
    .reduce((sum, r) => sum + (r.cost || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Requests Card */}
      <Card className="shadow-lg border-l-4 border-[#1C0357] bg-white">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Total Requests</p>
            <p className="text-3xl font-black text-[#1C0357] mt-1">{totalRequests}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#1C0357]/5 flex items-center justify-center text-[#1C0357]">
            <FileAudio size={24} />
          </div>
        </CardContent>
      </Card>

      {/* Revenue Card */}
      <Card className="shadow-lg border-l-4 border-green-500 bg-white">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Total Revenue</p>
            <p className="text-3xl font-black text-green-600 mt-1">${totalRevenue.toFixed(0)}</p>
            <p className="text-[10px] font-bold text-gray-400 mt-1 flex items-center">
              <TrendingUp size={10} className="mr-1" /> ${pendingRevenue.toFixed(0)} pending
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
            <DollarSign size={24} />
          </div>
        </CardContent>
      </Card>

      {/* In Progress Card */}
      <Card className="shadow-lg border-l-4 border-yellow-500 bg-white">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">In Progress</p>
            <p className="text-3xl font-black text-yellow-600 mt-1">{inProgressRequests}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-600">
            <Clock size={24} />
          </div>
        </CardContent>
      </Card>

      {/* Issue Reports Card */}
      <Card className="shadow-lg border-l-4 border-red-500 bg-white">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Issue Reports</p>
            <p className="text-3xl font-black text-red-600 mt-1">
              {unreadIssueReports}
              <span className="text-sm font-bold text-gray-400 ml-1">/{totalIssueReports}</span>
            </p>
          </div>
          <div className={cn(
            "h-12 w-12 rounded-2xl flex items-center justify-center",
            unreadIssueReports > 0 ? "bg-red-50 text-red-600 animate-pulse" : "bg-gray-50 text-gray-400"
          )}>
            <AlertCircle size={24} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStatsCards;