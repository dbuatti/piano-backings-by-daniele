import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Search, User, Link, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import ErrorDisplay from './ErrorDisplay';
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface BackingRequest {
  id: string;
  song_title: string;
  musical_or_artist: string;
  email: string;
  user_id: string | null;
  created_at: string;
}

const RequestOwnershipManager: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [foundUsers, setFoundUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userRequests, setUserRequests] = useState<BackingRequest[]>([]);
  const [selectedRequestsToLink, setSelectedRequestsToLink] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const handleSearchUsers = async () => {
    setLoading(true);
    setError(null);
    setFoundUsers([]);
    setSelectedUser(null);
    setUserRequests([]);
    setSelectedRequestsToLink([]);

    if (!searchTerm.trim()) {
      toast({
        title: "Search Term Required",
        description: "Please enter an email address to search for users.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Search auth.users for the email
      const { data: authUsers, error: authError } = await supabase.rpc('get_users_by_email', {
        p_email: searchTerm.toLowerCase()
      });

      if (authError) {
        console.error('Error searching auth users:', authError);
        throw new Error(`Failed to search users: ${authError.message}`);
      }

      if (authUsers && authUsers.length > 0) {
        // Map auth users to UserProfile format
        const profiles: UserProfile[] = authUsers.map((user: any) => ({
          id: user.id,
          email: user.email,
          first_name: user.raw_user_meta_data?.first_name,
          last_name: user.raw_user_meta_data?.last_name,
        }));
        setFoundUsers(profiles);
      } else {
        toast({
          title: "No Users Found",
          description: `No registered users found with email containing "${searchTerm}".`,
        });
      }
    } catch (err: any) {
      console.error('Error searching users:', err);
      setError(err);
      toast({
        title: "Error",
        description: `Failed to search for users: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setLoading(true);
    setError(null);
    setSelectedRequestsToLink([]);

    try {
      // Fetch all requests associated with this user's email (both linked and unlinked)
      const { data: requestsData, error: requestsError } = await supabase
        .from('backing_requests')
        .select('*')
        .ilike('email', user.email) // Case-insensitive search
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching user requests:', requestsError);
        throw new Error(`Failed to fetch requests for user: ${requestsError.message}`);
      }

      setUserRequests(requestsData || []);
    } catch (err: any) {
      console.error('Error fetching user requests:', err);
      setError(err);
      toast({
        title: "Error",
        description: `Failed to fetch requests for selected user: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRequestToLink = (requestId: string) => {
    setSelectedRequestsToLink(prev =>
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleLinkRequests = async () => {
    setLoading(true);
    setError(null);

    if (!selectedUser) {
      toast({
        title: "No User Selected",
        description: "Please select a user to link requests to.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (selectedRequestsToLink.length === 0) {
      toast({
        title: "No Requests Selected",
        description: "Please select at least one request to link.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ user_id: selectedUser.id })
        .in('id', selectedRequestsToLink);

      if (updateError) {
        console.error('Error linking requests:', updateError);
        throw new Error(`Failed to link requests: ${updateError.message}`);
      }

      toast({
        title: "Requests Linked",
        description: `${selectedRequestsToLink.length} requests have been linked to ${selectedUser.email}.`,
      });

      // Refresh requests for the selected user
      await handleSelectUser(selectedUser);
      setSelectedRequestsToLink([]); // Clear selection after linking
    } catch (err: any) {
      console.error('Error linking requests:', err);
      setError(err);
      toast({
        title: "Error",
        description: `Failed to link requests: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-[#1C0357] flex items-center">
          <User className="mr-2 h-5 w-5" />
          Manage Request Ownership
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Link existing backing track requests to a registered user's account. This is useful for requests submitted by you on behalf of a client, or by a client who later registers.
        </p>

        {error && (
          <div className="mb-4">
            <ErrorDisplay error={error} title="Ownership Management Error" />
          </div>
        )}

        <div className="space-y-6">
          {/* Step 1: Search for User */}
          <div>
            <h3 className="font-semibold text-md text-[#1C0357] mb-2 flex items-center">
              <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs">1</span>
              Find User by Email
            </h3>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter client email to search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
                disabled={loading}
              />
              <Button onClick={handleSearchUsers} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Display Found Users */}
          {foundUsers.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Select User:</h4>
              <div className="space-y-2">
                {foundUsers.map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedUser?.id === user.id ? 'bg-[#D1AAF2]/20 border-[#1C0357]' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="flex items-center">
                      <User className="mr-2 h-4 w-4 text-gray-600" />
                      <span className="font-medium text-sm">{user.email}</span>
                      {user.first_name && <span className="ml-2 text-xs text-gray-500">({user.first_name} {user.last_name})</span>}
                    </div>
                    {selectedUser?.id === user.id && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Requests to Link */}
          {selectedUser && (
            <div>
              <h3 className="font-semibold text-md text-[#1C0357] mb-2 flex items-center">
                <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs">2</span>
                Select Requests for {selectedUser.email}
              </h3>
              {loading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="mr-2 h-6 w-6 animate-spin text-[#1C0357]" />
                  <p className="text-gray-600">Loading requests...</p>
                </div>
              ) : userRequests.length === 0 ? (
                <p className="text-gray-500 text-sm">No requests found for this email address.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                  {userRequests.map(request => (
                    <div
                      key={request.id}
                      className={`flex items-center justify-between p-3 border rounded-md ${
                        selectedRequestsToLink.includes(request.id) ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start">
                        <Checkbox
                          id={`request-${request.id}`}
                          checked={selectedRequestsToLink.includes(request.id)}
                          onCheckedChange={() => handleToggleRequestToLink(request.id)}
                          className="mr-3 mt-1"
                        />
                        <div>
                          <Label htmlFor={`request-${request.id}`} className="font-medium text-sm cursor-pointer">
                            {request.song_title} by {request.musical_or_artist}
                          </Label>
                          <p className="text-xs text-gray-500">
                            Submitted: {format(new Date(request.created_at), 'MMM dd, yyyy')}
                          </p>
                          {request.user_id ? (
                            <p className="text-xs text-green-600 flex items-center">
                              <Link className="h-3 w-3 mr-1" /> Linked to user ID
                            </p>
                          ) : (
                            <p className="text-xs text-yellow-600 flex items-center">
                              <XCircle className="h-3 w-3 mr-1" /> Not linked to user ID
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Link Selected Requests */}
          {selectedUser && selectedRequestsToLink.length > 0 && (
            <div>
              <h3 className="font-semibold text-md text-[#1C0357] mb-2 flex items-center">
                <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs">3</span>
                Confirm Link
              </h3>
              <Button
                onClick={handleLinkRequests}
                disabled={loading || selectedRequestsToLink.length === 0}
                className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white h-10 px-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    Link {selectedRequestsToLink.length} Request(s) to {selectedUser.email}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestOwnershipManager;