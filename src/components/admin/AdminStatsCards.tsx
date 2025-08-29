import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FileAudio, Clock, DollarSign, Check } from 'lucide-react';
import { calculateRequestCost } from '@/utils/pricing';

interface AdminStatsCardsProps {
  requests: any[];
}

const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({ requests }) => {
  const totalRequests = requests.length;
  const inProgressRequests = requests.filter(r => r.status === 'in-progress').length;
  const completedRequests = requests.filter(r => r.status === 'completed').length;
  const pendingRevenue = requests
    .filter(r => r.status !== 'completed' && r.status !== 'cancelled' && !r.is_paid)
    .reduce((sum, req) => sum + calculateRequestCost(req), 0);

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
              <FileAudio className="h-8 w-8 text-[#1C0357]" />
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
              <Clock className="h-8 w-8 text-yellow-600" />
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
              <DollarSign className="h-8 w-8 text-[#1C0357]" />
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
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStatsCards;