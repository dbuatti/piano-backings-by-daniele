import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FileAudio, Clock, DollarSign, Check, MessageSquare, AlertCircle } from 'lucide-react'; // Import new icons
import { calculateRequestCost } from '@/utils/pricing';
import { cn } from '@/lib/utils'; // Import cn for conditional classNames

interface AdminStatsCardsProps {
  requests: any[];
  totalIssueReports: number; // New prop
  unreadIssueReports: number; // New prop
}

const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({ 
  requests, 
  totalIssueReports, 
  unreadIssueReports 
}) => {
  const totalRequests = requests.length;
  const inProgressRequests = requests.filter(r => r.status === 'in-progress').length;
  const completedRequests = requests.filter(r => r.status === 'completed').length;
  const pendingRevenue = requests
    .filter(r => r.status !== 'completed' && r.status !== 'cancelled' && !r.is_paid)
    .reduce((sum, req) => sum + (req.cost !== null ? req.cost : calculateRequestCost(req).totalCost), 0); // Use req.cost if available, else calculate

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 mt-6">
      <Card className="shadow-lg bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 flex items-center">
                <FileAudio className="w-4 h-4 mr-2" />
                Total Requests
              </p>
              <p className="text-2xl font-bold text-[#1C0357] mt-2">{totalRequests}</p>
            </div>
            <div className="p-3 bg-[#D1AAF2]/20 rounded-full">
              <FileAudio className="h-10 w-10 text-[#1C0357]" /> {/* Increased icon size */}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                In Progress
              </p>
              <p className="text-2xl font-bold text-[#1C0357] mt-2">
                {inProgressRequests}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-10 w-10 text-yellow-600" /> {/* Increased icon size */}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Pending Revenue
              </p>
              <p className="text-2xl font-bold text-[#1C0357] mt-2">
                ${pendingRevenue.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-[#1C0357]/10 rounded-full">
              <DollarSign className="h-10 w-10 text-[#1C0357]" /> {/* Increased icon size */}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 flex items-center">
                <Check className="w-4 h-4 mr-2" />
                Completed
              </p>
              <p className="text-2xl font-bold text-[#1C0357] mt-2">
                {completedRequests}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Check className="h-10 w-10 text-green-600" /> {/* Increased icon size */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New cards for Issue Reports */}
      <Card className="shadow-lg bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Total Issue Reports
              </p>
              <p className="text-2xl font-bold text-[#1C0357] mt-2">{totalIssueReports}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <MessageSquare className="h-10 w-10 text-blue-600" /> {/* Increased icon size */}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cn(
        "shadow-lg bg-white",
        unreadIssueReports > 0 && "border-2 border-red-500" // Conditional red border
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Unread Issue Reports
              </p>
              <p className="text-2xl font-bold text-red-600 mt-2">{unreadIssueReports}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-10 w-10 text-red-600" /> {/* Increased icon size */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStatsCards;