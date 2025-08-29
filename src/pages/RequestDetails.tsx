import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Music, 
  User, 
  Mail, 
  Link as LinkIcon, 
  FileText, 
  Headphones, 
  Target, 
  Key, 
  Folder,
  RefreshCw,
  AlertCircle,
  Search, // Added Search icon
  UserPlus // Added UserPlus icon
} from 'lucide-react';
import { getSafeBackingTypes } from '@/utils/helpers'; // Import from new utility
import { Input } from '@/components/ui/input'; // Import Input component
import { Label } from '@/components/ui/label'; // Import Label component
import ErrorDisplay from '@/components/ErrorDisplay'; // Import ErrorDisplay component

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

const RequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTriggeringDropbox, setIsTriggeringDropbox] = useState(false);

  // State for ownership management
  const [searchUserEmail, setSearchUserEmail] = useState('');
  const [foundUsersForAssignment, setFoundUsersForAssignment] = useState<UserProfile[]>([]);
  const [currentOwnerProfile, setCurrentOwnerProfile] = useState<UserProfile | null>(null);
  const [assigningUser, setAssigningUser] = useState(false);
  const [ownershipError, setOwnershipError] = useState<any>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }
      
      // Check if user is admin using their email from the session
      const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
      if (adminEmails.includes(session.user.email)) {
        setIsAdmin(true);
        fetchRequest();
      } else {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/');
      }
    };
    
    checkAdminAccess();
  }, [navigate, toast]);

  const fetchRequest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('backing_requests')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setRequest(data);
      
      // Fetch current owner profile if user_id is set
      if (data.user_id) {
        await fetchCurrentOwnerProfile(data.user_id);
      } else {
        setCurrentOwnerProfile(null);
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch request: ${error.message}`,
        variant: "destructive",
      });
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentOwnerProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      
      setCurrentOwnerProfile(profileData as UserProfile);
    } catch (error: any) {
      console.error('Error fetching current owner profile:', error);
      setCurrentOwnerProfile(null);
    }
  };

  const triggerDropboxAutomation = async () => {
    setIsTriggeringDropbox(true);
    
    try {
      // Get the session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to trigger this function');
      }
      
      // Prepare the form data to match what the function expects
      const formData = {
        email: request.email,
        name: request.name,
        songTitle: request.song_title,
        musicalOrArtist: request.musical_or_artist,
        songKey: request.song_key,
        differentKey: request.different_key,
        keyForTrack: request.key_for_track,
        youtubeLink: request.youtube_link,
        additionalLinks: request.additional_links, // Include the new field
        voiceMemo: request.voice_memo,
        sheetMusicUrl: request.sheet_music_url,
        trackPurpose: request.track_purpose,
        backingType: request.backing_type,
        deliveryDate: request.delivery_date,
        additionalServices: request.additional_services,
        specialRequests: request.special_requests,
        category: request.category,
        trackType: request.track_type
      };
      
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ formData })
        }
      );
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Dropbox automation triggered successfully.",
        });
        
        // Refresh the request data to show updated information
        fetchRequest();
      } else {
        throw new Error(result.error || 'Failed to trigger Dropbox automation');
      }
    } catch (error: any) {
      console.error('Error triggering Dropbox automation:', error);
      toast({
        title: "Error",
        description: `Failed to trigger Dropbox automation: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTriggeringDropbox(false);
    }
  };

  // Ownership Management Functions
  const handleSearchUsersForAssignment = async () => {
    setAssigningUser(true);
    setOwnershipError(null);
    setFoundUsersForAssignment([]);

    if (!searchUserEmail.trim()) {
      toast({
        title: "Search Term Required",
        description: "Please enter an email address to search for users.",
        variant: "destructive",
      });
      setAssigningUser(false);
      return;
    }

    try {
      const { data: authUsers, error: authError } = await supabase.rpc('get_users_by_email', {
        p_email: searchUserEmail.toLowerCase()
      });

      if (authError) {
        console.error('Error searching auth users:', authError);
        throw new Error(`Failed to search users: ${authError.message}`);
      }

      if (authUsers && authUsers.length > 0) {
        const profiles: UserProfile[] = authUsers.map((user: any) => ({
          id: user.id,
          email: user.email,
          first_name: user.raw_user_meta_data?.first_name,
          last_name: user.raw_user_meta_data?.last_name,
        }));
        setFoundUsersForAssignment(profiles);
      } else {
        toast({
          title: "No Users Found",
          description: `No registered users found with email containing "${searchUserEmail}".`,
        });
      }
    } catch (err: any) {
      console.error('Error searching users for assignment:', err);
      setOwnershipError(err);
      toast({
        title: "Error",
        description: `Failed to search for users: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setAssigningUser(false);
    }
  };

  const handleAssignOwner = async (userIdToAssign: string, userEmailToAssign: string) => {
    setAssigningUser(true);
    setOwnershipError(null);
    try {
      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ user_id: userIdToAssign, email: userEmailToAssign }) // Also update email to match owner
        .eq('id', id);

      if (updateError) {
        console.error('Error assigning owner:', updateError);
        throw new Error(`Failed to assign owner: ${updateError.message}`);
      }

      toast({
        title: "Owner Assigned",
        description: `Request successfully linked to ${userEmailToAssign}.`,
      });
      setFoundUsersForAssignment([]); // Clear search results
      setSearchUserEmail('');
      fetchRequest(); // Re-fetch request to update owner display
    } catch (err: any) {
      console.error('Error assigning owner:', err);
      setOwnershipError(err);
      toast({
        title: "Error",
        description: `Failed to assign owner: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setAssigningUser(false);
    }
  };

  const handleUnlinkOwner = async () => {
    setAssigningUser(true);
    setOwnershipError(null);
    try {
      const { error: updateError } = await supabase
        .from('backing_requests')
        .update({ user_id: null })
        .eq('id', id);

      if (updateError) {
        console.error('Error unlinking owner:', updateError);
        throw new Error(`Failed to unlink owner: ${updateError.message}`);
      }

      toast({
        title: "Owner Unlinked",
        description: "Request successfully unlinked from its owner.",
      });
      fetchRequest(); // Re-fetch request to update owner display
    } catch (err: any) {
      console.error('Error unlinking owner:', err);
      setOwnershipError(err);
      toast({
        title: "Error",
        description: `Failed to unlink owner: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setAssigningUser(false);
    }
  };


  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>Request not found</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-yellow-500 text-yellow-900"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/admin')} 
            variant="outline"
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-[#1C0357]">Request Details</h1>
          <p className="text-lg text-[#1C0357]/90">Viewing request #{request.id.substring(0, 8)}</p>
        </div>
        
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-between">
              <span>Request Information</span>
              {getStatusBadge(request.status || 'pending')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Folder className="mr-1 h-4 w-4" /> Request ID
                    </p>
                    <p className="font-medium">{request.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Calendar className="mr-1 h-4 w-4" /> Submitted
                    </p>
                    <p className="font-medium">{format(new Date(request.created_at), 'MMMM dd, yyyy HH:mm')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <User className="mr-1 h-4 w-4" /> Name
                    </p>
                    <p className="font-medium">{request.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Mail className="mr-1 h-4 w-4" /> Email
                    </p>
                    <p className="font-medium">{request.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Folder className="mr-1 h-4 w-4" /> Category
                    </p>
                    <p className="font-medium">{request.category || 'Not specified'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Music className="mr-2 h-5 w-5" />
                  Track Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Music className="mr-1 h-4 w-4" /> Song Title
                    </p>
                    <p className="font-medium">{request.song_title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Target className="mr-1 h-4 w-4" /> Musical/Artist
                    </p>
                    <p className="font-medium">{request.musical_or_artist}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Headphones className="mr-1 h-4 w-4" /> Backing Type
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {normalizedBackingTypes.length > 0 ? normalizedBackingTypes.map((type: string, index: number) => (
                        <Badge key={index} className="capitalize">
                          {type.replace('-', ' ')}
                        </Badge>
                      )) : <Badge className="capitalize">Not specified</Badge>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Target className="mr-1 h-4 w-4" /> Track Purpose
                    </p>
                    <p className="font-medium capitalize">
                      {request.track_purpose?.replace('-', ' ') || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Calendar className="mr-1 h-4 w-4" /> Delivery Date
                    </p>
                    <p className="font-medium">
                      {request.delivery_date 
                        ? format(new Date(request.delivery_date), 'MMMM dd, yyyy') 
                        : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* New Section: Manage Track Ownership */}
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <UserPlus className="mr-2 h-5 w-5" />
              Manage Track Ownership
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {ownershipError && (
              <div className="mb-4">
                <ErrorDisplay error={ownershipError} title="Ownership Management Error" />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2 text-[#1C0357]">Current Owner</h3>
                {request.user_id && currentOwnerProfile ? (
                  <div className="flex items-center justify-between p-3 border rounded-md bg-green-50 border-green-300">
                    <div className="flex items-center">
                      <User className="mr-2 h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">{currentOwnerProfile.email}</span>
                      {currentOwnerProfile.first_name && <span className="ml-2 text-xs text-gray-600">({currentOwnerProfile.first_name} {currentOwnerProfile.last_name})</span>}
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleUnlinkOwner} 
                      disabled={assigningUser}
                    >
                      {assigningUser ? 'Unlinking...' : 'Unlink Owner'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">This track is not currently linked to a registered user.</p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-lg mb-2 text-[#1C0357]">Assign New Owner</h3>
                <Label htmlFor="search-user-email" className="text-sm mb-1">Search User by Email</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="search-user-email"
                    type="email"
                    placeholder="Enter user email to search"
                    value={searchUserEmail}
                    onChange={(e) => setSearchUserEmail(e.target.value)}
                    className="flex-1"
                    disabled={assigningUser}
                  />
                  <Button onClick={handleSearchUsersForAssignment} disabled={assigningUser}>
                    {assigningUser ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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

                {foundUsersForAssignment.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700">Select User to Assign:</h4>
                    {foundUsersForAssignment.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 border rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4 text-gray-600" />
                          <span className="font-medium text-sm">{user.email}</span>
                          {user.first_name && <span className="ml-2 text-xs text-gray-500">({user.first_name} {user.last_name})</span>}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleAssignOwner(user.id, user.email)} 
                          disabled={assigningUser}
                        >
                          Assign
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Key className="mr-2 h-5 w-5" />
              Musical Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Key className="mr-2 h-5 w-5" />
                  Key Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Song Key</p>
                    <p className="font-medium">{request.song_key || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Different Key Required</p>
                    <p className="font-medium">{request.different_key || 'No'}</p>
                  </div>
                  {request.different_key === 'Yes' && (
                    <div>
                      <p className="text-sm text-gray-500">Requested Key</p>
                      <p className="font-medium">{request.key_for_track || 'Not specified'}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <LinkIcon className="mr-2 h-5 w-5" />
                  References
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <LinkIcon className="mr-1 h-4 w-4" /> YouTube Link
                    </p>
                    {request.youtube_link ? (
                      <a 
                        href={request.youtube_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {request.youtube_link}
                      </a>
                    ) : (
                      <p className="font-medium">Not provided</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Music className="mr-1 h-4 w-4" /> Voice Memo
                    </p>
                    {request.voice_memo ? (
                      <a 
                        href={request.voice_memo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {request.voice_memo}
                      </a>
                    ) : (
                      <p className="font-medium">Not provided</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <FileText className="mr-1 h-4 w-4" /> Sheet Music
                    </p>
                    {request.sheet_music_url ? (
                      <a 
                        href={request.sheet_music_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        View Sheet Music
                      </a>
                    ) : (
                      <p className="font-medium">Not provided</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <LinkIcon className="mr-1 h-4 w-4" /> Additional Links
                    </p>
                    {request.additional_links ? (
                      <a 
                        href={request.additional_links} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {request.additional_links}
                      </a>
                    ) : (
                      <p className="font-medium">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Folder className="mr-2 h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Headphones className="mr-2 h-5 w-5" />
                  Additional Services
                </h3>
                {request.additional_services && request.additional_services.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {request.additional_services.map((service: string, index: number) => (
                      <Badge key={index} variant="secondary" className="capitalize">
                        {service.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No additional services requested</p>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Special Requests
                </h3>
                <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {request.special_requests || 'No special requests provided'}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Dropbox Automation
                </h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="mb-3">
                    If the Dropbox folder was not created during the initial request, you can manually trigger the automation process here.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={triggerDropboxAutomation}
                      disabled={isTriggeringDropbox}
                      className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                    >
                      {isTriggeringDropbox ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Triggering...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Trigger Dropbox Automation
                        </>
                      )}
                    </Button>
                    {request.dropbox_folder_id && (
                      <Badge variant="default" className="bg-green-500">
                        Folder Created
                      </Badge>
                    )}
                  </div>
                  {request.dropbox_folder_id && (
                    <p className="mt-3 text-sm text-gray-600">
                      <span className="font-medium">Folder ID:</span> {request.dropbox_folder_id}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-4">
          <Button 
            onClick={() => navigate('/admin')} 
            variant="outline"
          >
            Back to Dashboard
          </Button>
          <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90">
            Edit Request
          </Button>
        </div>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default RequestDetails;