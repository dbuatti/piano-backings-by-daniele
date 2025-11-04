import React, { useState, useEffect, useCallback } from 'react';
import CalendarComponent, { Value } from 'react-calendar'; // Import Value type
import 'react-calendar/dist/Calendar.css'; // Default calendar styles
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Music, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BackingRequest {
  id: string;
  created_at: string;
  song_title: string;
  musical_or_artist: string;
  delivery_date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

interface RequestsCalendarProps {
  onSelectRequest: (requestId: string) => void;
}

const RequestsCalendar: React.FC<RequestsCalendarProps> = ({ onSelectRequest }) => {
  const [selectedDate, setSelectedDate] = useState<Value>(new Date());
  const [requests, setRequests] = useState<BackingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('backing_requests')
        .select('id, created_at, song_title, musical_or_artist, delivery_date, status')
        .order('delivery_date', { ascending: true });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error('Error fetching requests for calendar:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: `Failed to load requests for calendar: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleDateChange = (value: Value) => { // Use Value type here
    setSelectedDate(value);
  };

  const getRequestsForDate = (date: Date) => {
    return requests.filter(req => {
      if (!req.delivery_date) return false;
      const deliveryDate = parseISO(req.delivery_date);
      return isSameDay(deliveryDate, date);
    });
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dayRequests = getRequestsForDate(date);
      if (dayRequests.length > 0) {
        const pendingCount = dayRequests.filter(r => r.status === 'pending' || r.status === 'in-progress').length;
        const completedCount = dayRequests.filter(r => r.status === 'completed').length;

        return (
          <div className="flex flex-col items-center justify-center text-xs mt-1">
            {pendingCount > 0 && (
              <span className="bg-yellow-500 text-white rounded-full h-4 w-4 flex items-center justify-center leading-none">
                {pendingCount}
              </span>
            )}
            {completedCount > 0 && (
              <span className="bg-green-500 text-white rounded-full h-4 w-4 flex items-center justify-center leading-none mt-0.5">
                {completedCount}
              </span>
            )}
          </div>
        );
      }
    }
    return null;
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dayRequests = getRequestsForDate(date);
      if (dayRequests.length > 0) {
        const hasPending = dayRequests.some(r => r.status === 'pending' || r.status === 'in-progress');
        const hasCompleted = dayRequests.some(r => r.status === 'completed');

        if (hasPending && hasCompleted) return 'has-both-requests';
        if (hasPending) return 'has-pending-requests';
        if (hasCompleted) return 'has-completed-requests';
      }
    }
    return null;
  };

  const selectedDayRequests = Array.isArray(selectedDate) || selectedDate === null
    ? []
    : getRequestsForDate(selectedDate as Date);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-[#1C0357] flex items-center">
          <CalendarIcon className="mr-2" />
          Delivery Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-[#1C0357]" />
            <p className="ml-4 text-lg text-gray-600">Loading calendar...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <AlertCircle className="mx-auto h-12 w-12 mb-4" />
            <p>Error loading calendar: {error}</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <CalendarComponent
                onChange={handleDateChange}
                value={selectedDate}
                tileContent={tileContent}
                tileClassName={tileClassName}
                className="react-calendar-custom"
              />
            </div>
            <div className="flex-1 lg:max-h-[400px] overflow-y-auto p-4 border rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold text-[#1C0357] mb-4 flex items-center">
                <Music className="mr-2 h-5 w-5" />
                Requests for {Array.isArray(selectedDate) || selectedDate === null ? 'Selected Date' : format(selectedDate as Date, 'MMM dd, yyyy')}
              </h3>
              {selectedDayRequests.length === 0 ? (
                <p className="text-gray-600">No requests scheduled for this date.</p>
              ) : (
                <ul className="space-y-3">
                  {selectedDayRequests.map(req => (
                    <li key={req.id} className="p-3 border rounded-md bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-800">{req.song_title}</span>
                        <Badge
                          className={cn(
                            req.status === 'completed' && 'bg-green-500',
                            (req.status === 'pending' || req.status === 'in-progress') && 'bg-yellow-500 text-yellow-900',
                            req.status === 'cancelled' && 'bg-red-500'
                          )}
                        >
                          {req.status.replace('-', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{req.musical_or_artist}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => onSelectRequest(req.id)}
                      >
                        View Details
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestsCalendar;