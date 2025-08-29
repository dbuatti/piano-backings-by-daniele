import { useState, useEffect } from 'react';
import { isSameDay } from 'date-fns';
import { getSafeBackingTypes } from '@/utils/helpers';

interface BackingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  backing_type: string | string[];
  delivery_date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  track_url?: string;
  shared_link?: string;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; };
  cost?: number;
}

export const useRequestFilters = (allRequests: BackingRequest[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [backingTypeFilter, setBackingTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'pricing'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filteredRequests, setFilteredRequests] = useState<BackingRequest[]>([]);

  useEffect(() => {
    let result = [...allRequests];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(request => 
        request.name?.toLowerCase().includes(term) ||
        request.email?.toLowerCase().includes(term) ||
        request.song_title?.toLowerCase().includes(term) ||
        request.musical_or_artist?.toLowerCase().includes(term)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(request => request.status === statusFilter);
    }
    
    if (backingTypeFilter !== 'all') {
      result = result.filter(request => 
        getSafeBackingTypes(request.backing_type).includes(backingTypeFilter)
      );
    }
    
    if (viewMode === 'calendar' && selectedDate) {
      result = result.filter(request => 
        request.delivery_date && isSameDay(new Date(request.delivery_date), selectedDate)
      );
    }
    
    setFilteredRequests(result);
  }, [searchTerm, statusFilter, backingTypeFilter, allRequests, viewMode, selectedDate]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setBackingTypeFilter('all');
    setSelectedDate(null);
  };

  return {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    backingTypeFilter, setBackingTypeFilter,
    viewMode, setViewMode,
    selectedDate, setSelectedDate,
    filteredRequests,
    clearFilters,
  };
};