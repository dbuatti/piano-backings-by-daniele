import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"; // Added TooltipProvider
import CalendarComponent from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay } from 'date-fns';
import { Calendar, Eye, Music, Upload, User, Check, Clock, X } from 'lucide-react';
import { getSafeBackingTypes } from '@/utils/helpers';

interface RequestsCalendarProps {
  requests: any[];
  filteredRequests: any[];
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  uploadTrack: (id: string) => void;
}

const RequestsCalendar: React.FC<RequestsCalendarProps> = ({
  requests,
  filteredRequests,
  selectedDate,
  setSelectedDate,
  uploadTrack,
}) => {

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'full-song': return 'default';
      case 'audition-cut': return 'secondary';
      case 'note-bash': return 'outline';
      default: return 'default';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><Check className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-yellow-500 text-yellow-900"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const handleDateChange = (value: Date | [Date, Date] | null) => {
    if (value instanceof Date) {
      setSelectedDate(value);
    } else if (value === null) {
      setSelectedDate(null);
    }
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    
    const requestsForDate = requests.filter(request => 
      request.delivery_date && isSameDay(new Date(request.delivery_date), date)
    );
    
    if (requestsForDate.length === 0) return null;
    
    return (
      <div className="flex flex-wrap justify-center gap-1 mt-1">
        {requestsForDate.slice(0, 3).map((request, index) => (
          <div 
            key={index} 
            className={`w-2 h-2 rounded-full ${
              request.status === 'completed' ? 'bg-green-500' :
              request.status === 'in-progress' ? 'bg-yellow-500' :
              request.status === 'cancelled' ? 'bg-red-500' : 'bg-[#1C0357]'
            }`}
          />
        ))}
        {requestsForDate.length > 3 && (
          <div className="text-xs">+{requestsForDate.length - 3}</div>
        )}
      </div>
    );
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return '';
    
    const requestsForDate = requests.filter(request => 
      request.delivery_date && isSameDay(new Date(request.delivery_date), date)
    );
    
    if (requestsForDate.length === 0) return '';
    
    return 'bg-[#D1AAF2]/30 hover:bg-[#D1AAF2]/50';
  };

  return (
    <Card className="shadow-lg mb-6 bg-white">
      <CardHeader>
        <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-between">
          <span className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Delivery Calendar
          </span>
          {selectedDate && (
            <Button 
              variant="outline" 
              onClick={() => setSelectedDate(null)}
              className="text-sm"
              size="sm"
            >
              Clear Date Selection
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-2/3">
            <CalendarComponent
              onChange={handleDateChange}
              value={selectedDate}
              tileContent={tileContent}
              tileClassName={tileClassName}
              className="border rounded-lg p-4 w-full"
            />
          </div>
          <div className="lg:w-1/3">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg text-[#1C0357]">
                  {selectedDate 
                    ? `Requests for ${format(selectedDate, 'MMMM d, yyyy')}` 
                    : 'Select a date to view requests'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {filteredRequests.length > 0 ? (
                      filteredRequests.map((request) => {
                        const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);

                        return (
                          <div 
                            key={request.id} 
                            className="border rounded-lg p-4 hover:bg-[#D1AAF2]/20 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-bold">{request.song_title}</h3>
                                <p className="text-sm text-gray-600 flex items-center mt-1">
                                  <User className="w-3 h-3 mr-1" />
                                  {request.name || request.email}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center">
                                  <Music className="w-3 h-3 mr-1" />
                                  {request.musical_or_artist}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {normalizedBackingTypes.length > 0 ? normalizedBackingTypes.map((type: string, index: number) => (
                                  <Badge key={index} variant={getBadgeVariant(type)} className="capitalize">
                                    {type.replace('-', ' ')}
                                  </Badge>
                                )) : <Badge variant="outline">Not specified</Badge>}
                              </div>
                            </div>
                            <div className="mt-3 flex justify-between items-center">
                              <div className="flex items-center text-sm">
                                <Calendar className="w-3 h-3 mr-1 text-gray-500" />
                                <span>
                                  {request.delivery_date ? format(new Date(request.delivery_date), 'MMM dd, yyyy') : 'Not specified'}
                                </span>
                              </div>
                              {getStatusBadge(request.status || 'pending')}
                            </div>
                            <div className="mt-3 flex justify-end space-x-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={() => uploadTrack(request.id)}>
                                      <Upload className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Upload Track</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link to={`/track/${request.id}`}>
                                      <Button variant="outline" size="sm">
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Client Page</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-gray-500 py-4">
                        No requests scheduled for this date
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    Select a date on the calendar to view requests
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestsCalendar;