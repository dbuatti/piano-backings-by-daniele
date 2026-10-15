import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FileAudio, AlertCircle, Clock, DollarSign, TrendingUp } from 'lucide-react';
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
  // When given, the KPIs become shortcuts into the list underneath instead of
  // read-only numbers — clicking "In Progress" filters to those requests.
  onFilterStatus?: (status: 'all' | 'in-progress') => void;
  activeStatus?: string;
  onOpenFeedback?: () => void;
}

const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ElementType;
  border: string;
  valueClass: string;
  iconClass: string;
  onClick?: () => void;
  active?: boolean;
  title?: string;
}> = ({ label, value, sub, icon: Icon, border, valueClass, iconClass, onClick, active, title }) => {
  const body = (
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">{label}</p>
        <p className={cn('text-3xl font-black mt-1', valueClass)}>{value}</p>
        {sub}
      </div>
      <div className={cn('h-12 w-12 rounded-2xl flex items-center justify-center', iconClass)}>
        <Icon size={24} />
      </div>
    </CardContent>
  );

  const cardClass = cn(
    'shadow-lg border-l-4 bg-white rounded-2xl',
    border,
    onClick && 'transition hover:shadow-xl hover:-translate-y-0.5',
    active && 'ring-2 ring-offset-1 ring-[#1C0357]/30'
  );

  if (!onClick) return <Card className={cardClass}>{body}</Card>;

  return (
    <button type="button" onClick={onClick} title={title} className="text-left">
      <Card className={cardClass}>{body}</Card>
    </button>
  );
};

const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({
  requests,
  totalIssueReports,
  unreadIssueReports,
  onFilterStatus,
  activeStatus,
  onOpenFeedback,
}) => {
  const totalRequests = requests.length;
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
      <StatCard
        label="Total Requests"
        value={totalRequests}
        icon={FileAudio}
        border="border-[#1C0357]"
        valueClass="text-[#1C0357]"
        iconClass="bg-[#1C0357]/5 text-[#1C0357]"
        onClick={onFilterStatus ? () => onFilterStatus('all') : undefined}
        active={!!onFilterStatus && (!activeStatus || activeStatus === 'all')}
        title={onFilterStatus ? 'Show every request' : undefined}
      />

      <StatCard
        label="Total Revenue"
        value={`$${totalRevenue.toFixed(0)}`}
        sub={
          <p className="text-[10px] font-bold text-gray-400 mt-1 flex items-center">
            <TrendingUp size={10} className="mr-1" /> ${pendingRevenue.toFixed(0)} pending
          </p>
        }
        icon={DollarSign}
        border="border-green-500"
        valueClass="text-green-600"
        iconClass="bg-green-50 text-green-600"
      />

      <StatCard
        label="In Progress"
        value={inProgressRequests}
        icon={Clock}
        border="border-yellow-500"
        valueClass="text-yellow-600"
        iconClass="bg-yellow-50 text-yellow-600"
        onClick={onFilterStatus ? () => onFilterStatus('in-progress') : undefined}
        active={!!onFilterStatus && activeStatus === 'in-progress'}
        title={onFilterStatus ? 'Show only the requests in progress' : undefined}
      />

      <StatCard
        label="Issue Reports"
        value={
          <>
            {unreadIssueReports}
            <span className="text-lg text-gray-400">/{totalIssueReports}</span>
          </>
        }
        sub={
          <p className="text-[10px] font-bold text-gray-400 mt-1">
            {unreadIssueReports > 0 ? 'unread — click to open Feedback' : 'all read'}
          </p>
        }
        icon={AlertCircle}
        border="border-red-500"
        valueClass="text-red-600"
        iconClass={unreadIssueReports > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}
        onClick={onOpenFeedback}
        title={onOpenFeedback ? 'Open Settings → Feedback' : undefined}
      />
    </div>
  );
};

export default AdminStatsCards;
