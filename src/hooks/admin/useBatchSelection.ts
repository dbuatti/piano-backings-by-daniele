import { useState, useEffect } from 'react';
import { calculateRequestCost } from '@/utils/pricing';

interface BackingRequest {
  id: string;
  cost?: number;
  // Add other fields as necessary for calculateRequestCost
}

export const useBatchSelection = (filteredRequests: BackingRequest[]) => {
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  const handleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length && filteredRequests.length > 0) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map(req => req.id));
    }
  };

  const handleSelectRequest = (id: string) => {
    setSelectedRequests(prev => 
      prev.includes(id) 
        ? prev.filter(reqId => reqId !== id)
        : [...prev, id]
    );
  };

  useEffect(() => {
    const selected = filteredRequests.filter(req => selectedRequests.includes(req.id));
    let calculatedTotal = 0;
    
    selected.forEach(req => {
      calculatedTotal += calculateRequestCost(req).totalCost;
    });
    
    setTotalCost(calculatedTotal);
  }, [selectedRequests, filteredRequests]);

  return {
    selectedRequests, setSelectedRequests,
    totalCost,
    handleSelectAll,
    handleSelectRequest,
  };
};