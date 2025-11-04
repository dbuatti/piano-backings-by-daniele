import React, { useState } from 'react'; // Removed useEffect
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, CheckCircle, User as UserIcon, Mail, Music } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface BackingRequest {
  id: string;
  song_title: string;
  musical_or_artist: string;
  email: string;
  name: string;
  user_id: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
}

const RequestOwnershipTabContent: React.FC = () => {
  const [requestId, setRequestId] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch request details
  const { data: request, isLoading: isLoadingRequest, error: requestError } = useQuery<BackingRequest, Error>({
    queryKey: ['requestDetails', requestId],
    queryFn: async () => {
      if (!requestId) throw new Error('Request ID is required.');
      const { data, error } = await supabase
        .from('backing_requests')
        .select('id, song_title, musical_or_artist, email, name, user_id')
        .eq('id', requestId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!requestId,
    retry: false,
  });

  // Search for user by email
  const { data: targetUser, isLoading: isLoadingUser, error: userError } = useQuery<UserProfile, Error>({
    queryKey: ['userByEmail', targetEmail],
    queryFn: async () => {
      if (!targetEmail) throw new Error('Email is required.');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('email', targetEmail)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!targetEmail && targetEmail.includes('@'), // Only enable if email is valid
    retry: false,
  });

  // Mutation to update request ownership
  const assignOwnershipMutation = useMutation<void, Error, { requestId: string; userId: string }>({
    mutationFn: async ({ requestId, userId }) => {
      const { error } = await supabase
        .from('backing_requests')
        .update({ user_id: userId })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Ownership Assigned",
        description: "Request successfully assigned to the target user.",
      });
      queryClient.invalidateQueries({ queryKey: ['requestDetails', requestId] });
      queryClient.invalidateQueries({ queryKey: ['userByEmail', targetEmail] });
      setRequestId('');
      setTargetEmail('');
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: `Failed to assign ownership: ${err.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAssignOwnership = () => {
    if (request?.id && targetUser?.id) {
      assignOwnershipMutation.mutate({ requestId: request.id, userId: targetUser.id });
    } else {
      toast({
        title: "Missing Information",
        description: "Please ensure both a valid request and target user are selected.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-[#1C0357] flex items-center">
          <UserIcon className="mr-2" />
          Assign Request Ownership
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Request ID Input */}
          <div>
            <Label htmlFor="requestId" className="flex items-center text-sm mb-1">
              Request ID
            </Label>
            <Input
              id="requestId"
              type="text"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              placeholder="Enter Request ID"
              className="pl-8 py-2 text-sm"
            />
            <Music className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            {isLoadingRequest && <p className="text-sm text-gray-500 mt-1">Loading request...</p>}
            {requestError && <p className="text-sm text-red-500 mt-1">Error: {requestError.message}</p>}
            {request && (
              <div className="mt-2 p-3 border rounded-md bg-blue-50">
                <p className="font-medium text-[#1C0357]">{request.song_title} by {request.musical_or_artist}</p>
                <p className="text-sm text-gray-600">Current Owner: {request.name || 'Guest'} ({request.email})</p>
                {request.user_id && <p className="text-xs text-gray-500">User ID: {request.user_id}</p>}
              </div>
            )}
          </div>

          {/* Target User Email Input */}
          <div>
            <Label htmlFor="targetEmail" className="flex items-center text-sm mb-1">
              Target User Email
            </Label>
            <Input
              id="targetEmail"
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="Enter target user's email"
              className="pl-8 py-2 text-sm"
            />
            <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            {isLoadingUser && <p className="text-sm text-gray-500 mt-1">Searching for user...</p>}
            {userError && <p className="text-sm text-red-500 mt-1">Error: {userError.message}</p>}
            {targetUser && (
              <div className="mt-2 p-3 border rounded-md bg-green-50">
                <p className="font-medium text-[#1C0357]">User Found: {targetUser.name} ({targetUser.email})</p>
                <p className="text-xs text-gray-500">User ID: {targetUser.id}</p>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleAssignOwnership}
          disabled={!request || !targetUser || assignOwnershipMutation.isPending}
          className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90"
        >
          {assignOwnershipMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" /> Assign Ownership
            </>
          )}
        </Button>

        {assignOwnershipMutation.isError && (
          <div className="mt-4 p-3 border border-red-300 bg-red-50 text-red-800 rounded-md flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" />
            <span>{assignOwnershipMutation.error?.message || 'An unknown error occurred.'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestOwnershipTabContent;