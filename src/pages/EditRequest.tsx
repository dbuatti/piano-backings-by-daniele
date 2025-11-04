import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, ArrowLeft, Music, User, Mail, Calendar, Key, Target, Headphones, FileText, Link as LinkIcon } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { getSafeBackingTypes } from '@/utils/helpers';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BackingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  song_key: string | null;
  different_key: string | null;
  key_for_track: string | null;
  youtube_link: string | null;
  voice_memo: string | null;
  sheet_music_url: string | null;
  track_purpose: string | null;
  backing_type: string[] | string | null;
  delivery_date: string | null;
  additional_services: string[] | null;
  special_requests: string | null;
  category: string | null;
  track_type: string | null;
  additional_links: string | null;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  track_urls?: { url: string; caption: string | boolean | null | undefined }[];
  shared_link?: string | null;
  dropbox_folder_id?: string | null;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; } | null;
  cost?: number | null;
}

const keyOptions = [
  { value: 'C Major (0)', label: 'C Major (0)' },
  { value: 'G Major (1♯)', label: 'G Major (1♯)' },
  { value: 'D Major (2♯)', label: 'D Major (2♯)' },
  { value: 'A Major (3♯)', label: 'A Major (3♯)' },
  { value: 'E Major (4♯)', label: 'E Major (4♯)' },
  { value: 'B Major (5♯)', label: 'B Major (5♯)' },
  { value: 'F♯ Major (6♯)', label: 'F♯ Major (6♯)' },
  { value: 'C♯ Major (7♯)', label: 'C♯ Major (7♯)' },
  { value: 'F Major (1♭)', label: 'F Major (1♭)' },
  { value: 'B♭ Major (2♭)', label: 'B♭ Major (2♭)' },
  { value: 'E♭ Major (3♭)', label: 'E♭ Major (3♭)' },
  { value: 'A♭ Major (4♭)', label: 'A♭ Major (4♭)' },
  { value: 'D♭ Major (5♭)', label: 'D♭ Major (5♭)' },
  { value: 'G♭ Major (6♭)', label: 'G♭ Major (6♭)' },
  { value: 'C♭ Major (7♭)', label: 'C♭ Major (7♭)' },
];

const categoryOptions = [
  { value: 'Practice Tracks', label: 'Practice Tracks' },
  { value: 'Audition Tracks', label: 'Audition Tracks' },
  { value: 'Melody Bash Tracks', label: 'Melody Bash Tracks' },
  { value: 'Performance Tracks', label: 'Performance Tracks' },
  { value: 'General', label: 'General' }
];

const trackTypeOptions = [
  { value: 'quick', label: 'Quick Reference' },
  { value: 'one-take', label: 'One-Take Recording' },
  { value: 'polished', label: 'Polished Backing' }
];

const backingTypeOptions = [
  { value: 'full-song', label: 'Full Song Backing' },
  { value: 'audition-cut', label: 'Audition Cut Backing' },
  { value: 'note-bash', label: 'Note/Melody Bash' }
];

const additionalServiceOptions = [
  { value: 'rush-order', label: 'Rush Order' },
  { value: 'complex-songs', label: 'Complex Songs' },
  { value: 'additional-edits', label: 'Additional Edits' },
  { value: 'exclusive-ownership', label: 'Exclusive Ownership' }
];

const EditRequest: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [request, setRequest] = useState<BackingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
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
  }, [navigate, toast, id]);

  const fetchRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('backing_requests')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Ensure backing_type is an array for the form
      const normalizedBackingType = getSafeBackingTypes(data.backing_type);
      const normalizedAdditionalServices = Array.isArray(data.additional_services) ? data.additional_services : [];

      setRequest({
        ...data,
        backing_type: normalizedBackingType,
        additional_services: normalizedAdditionalServices,
        // Format delivery_date for input type="date"
        delivery_date: data.delivery_date ? format(new Date(data.delivery_date), 'yyyy-MM-dd') : null,
      });
    } catch (err: any) {
      console.error('Error fetching request:', err);
      setError(err);
      toast({
        title: "Error",
        description: `Failed to fetch request: ${err.message}`,
        variant: "destructive",
      });
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRequest(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSelectChange = (name: string, value: string) => {
    setRequest(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleCheckboxChange = (field: 'backing_type' | 'additional_services', value: string, checked: boolean) => {
    setRequest(prev => {
      if (!prev) return null;
      const currentArray = Array.isArray(prev[field]) ? (prev[field] as string[]) : [];
      const newArray = checked
        ? [...currentArray, value]
        : currentArray.filter(item => item !== value);
      return { ...prev, [field]: newArray };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    setIsUpdating(true);
    setError(null);

    try {
      const { id, created_at, track_urls, shared_link, dropbox_folder_id, uploaded_platforms, cost, ...updates } = request;
      
      // Ensure backing_type and additional_services are stored as arrays
      const payload = {
        ...updates,
        backing_type: Array.isArray(updates.backing_type) ? updates.backing_type : (updates.backing_type ? [updates.backing_type] : []),
        additional_services: Array.isArray(updates.additional_services) ? updates.additional_services : (updates.additional_services ? [updates.additional_services] : []),
      };

      const { error } = await supabase
        .from('backing_requests')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Request Updated",
        description: "Backing track request has been updated successfully.",
      });
      navigate(`/admin/request/${id}`); // Go back to details page
    } catch (err: any) {
      console.error('Error updating request:', err);
      setError(err);
      toast({
        title: "Error",
        description: `Failed to update request: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
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
          <Loader2 className="h-12 w-12 animate-spin text-[#1C0357]" />
          <p className="ml-4 text-lg text-gray-600">Loading request for editing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
          <ErrorDisplay error={error} title="Failed to Load Request" />
          <Button onClick={() => navigate('/admin')} className="mt-4">Back to Dashboard</Button>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>Request not found.</p>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Button 
            onClick={() => navigate(`/admin/request/${id}`)} 
            variant="outline"
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Details
          </Button>
          <h1 className="text-3xl font-bold text-[#1C0357]">Edit Request</h1>
          <span className="text-lg text-[#1C0357]/90">#{request.id.substring(0, 8)}</span>
        </div>
        
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Music className="mr-2 h-5 w-5" />
              Request Form
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">1</span>
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm mb-1">Name</Label>
                    <Input id="name" name="name" value={request.name || ''} onChange={handleInputChange} placeholder="Client Name" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm mb-1">Email</Label>
                    <Input id="email" name="email" type="email" value={request.email || ''} onChange={handleInputChange} placeholder="Client Email" />
                  </div>
                  <div>
                    <Label htmlFor="song_title" className="text-sm mb-1">Song Title</Label>
                    <Input id="song_title" name="song_title" value={request.song_title || ''} onChange={handleInputChange} placeholder="Song Title" required />
                  </div>
                  <div>
                    <Label htmlFor="musical_or_artist" className="text-sm mb-1">Musical or Artist</Label>
                    <Input id="musical_or_artist" name="musical_or_artist" value={request.musical_or_artist || ''} onChange={handleInputChange} placeholder="Musical or Artist" required />
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-sm mb-1">Category</Label>
                    <Select onValueChange={(value) => handleSelectChange('category', value)} value={request.category || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Track Type */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">2</span>
                  Track Type
                </h2>
                <Select onValueChange={(value) => handleSelectChange('track_type', value)} value={request.track_type || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select track type" />
                  </SelectTrigger>
                  <SelectContent>
                    {trackTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Musical Details */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">3</span>
                  Musical Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="song_key" className="text-sm mb-1">Song Key</Label>
                    <Select onValueChange={(value) => handleSelectChange('song_key', value)} value={request.song_key || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select key" />
                      </SelectTrigger>
                      <SelectContent>
                        {keyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="different_key" className="text-sm mb-1">Different Key Required?</Label>
                    <Select onValueChange={(value) => handleSelectChange('different_key', value)} value={request.different_key || 'No'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="Maybe">Maybe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {request.different_key === 'Yes' && (
                    <div>
                      <Label htmlFor="key_for_track" className="text-sm mb-1">Requested Key</Label>
                      <Select onValueChange={(value) => handleSelectChange('key_for_track', value)} value={request.key_for_track || ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select key" />
                        </SelectTrigger>
                        <SelectContent>
                          {keyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Materials */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">4</span>
                  Materials
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sheet_music_url" className="text-sm mb-1 flex items-center"><FileText className="mr-1 h-4 w-4" /> Sheet Music URL</Label>
                    <Input id="sheet_music_url" name="sheet_music_url" value={request.sheet_music_url || ''} onChange={handleInputChange} placeholder="https://..." />
                  </div>
                  <div>
                    <Label htmlFor="youtube_link" className="text-sm mb-1 flex items-center"><LinkIcon className="mr-1 h-4 w-4" /> YouTube Link</Label>
                    <Input id="youtube_link" name="youtube_link" value={request.youtube_link || ''} onChange={handleInputChange} placeholder="https://www.youtube.com/watch?v=..." />
                  </div>
                  <div>
                    <Label htmlFor="voice_memo" className="text-sm mb-1 flex items-center"><Headphones className="mr-1 h-4 w-4" /> Voice Memo Link</Label>
                    <Input id="voice_memo" name="voice_memo" value={request.voice_memo || ''} onChange={handleInputChange} placeholder="https://..." />
                  </div>
                  <div>
                    <Label htmlFor="additional_links" className="text-sm mb-1 flex items-center"><LinkIcon className="mr-1 h-4 w-4" /> Additional Links</Label>
                    <Input id="additional_links" name="additional_links" value={request.additional_links || ''} onChange={handleInputChange} placeholder="https://..." />
                  </div>
                </div>
              </div>

              {/* Purpose */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">5</span>
                  Purpose
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="track_purpose" className="text-sm mb-1">Track Purpose</Label>
                    <Select onValueChange={(value) => handleSelectChange('track_purpose', value)} value={request.track_purpose || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal-practise">Personal Practise</SelectItem>
                        <SelectItem value="audition-backing">Audition Backing Track</SelectItem>
                        <SelectItem value="melody-bash">Note/melody bash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1">Backing Type(s)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {backingTypeOptions.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`backing_type-${option.value}`}
                            checked={Array.isArray(request.backing_type) && request.backing_type.includes(option.value)}
                            onCheckedChange={(checked) => handleCheckboxChange('backing_type', option.value, checked as boolean)}
                          />
                          <Label htmlFor={`backing_type-${option.value}`}>{option.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Services & Timeline */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">6</span>
                  Additional Services & Timeline
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="delivery_date" className="text-sm mb-1">Delivery Date</Label>
                    <Input id="delivery_date" name="delivery_date" type="date" value={request.delivery_date || ''} onChange={handleInputChange} />
                  </div>
                  <div>
                    <Label className="text-sm mb-1">Additional Services</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {additionalServiceOptions.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`additional_services-${option.value}`}
                            checked={Array.isArray(request.additional_services) && request.additional_services.includes(option.value)}
                            onCheckedChange={(checked) => handleCheckboxChange('additional_services', option.value, checked as boolean)}
                          />
                          <Label htmlFor={`additional_services-${option.value}`}>{option.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="special_requests" className="text-sm mb-1">Special Requests</Label>
                    <Textarea id="special_requests" name="special_requests" value={request.special_requests || ''} onChange={handleInputChange} rows={4} />
                  </div>
                </div>
              </div>

              {/* Status and Payment */}
              <div className="pb-4">
                <h2 className="text-base font-semibold mb-3 text-[#1C0357] flex items-center">
                  <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">7</span>
                  Status & Payment
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status" className="text-sm mb-1">Status</Label>
                    <Select onValueChange={(value) => handleSelectChange('status', value)} value={request.status || 'pending'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 mt-6 md:mt-0">
                    <Checkbox
                      id="is_paid"
                      checked={request.is_paid}
                      onCheckedChange={(checked) => setRequest(prev => prev ? { ...prev, is_paid: checked as boolean } : null)}
                    />
                    <Label htmlFor="is_paid" className="text-sm">Mark as Paid</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => navigate(`/admin/request/${id}`)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default EditRequest;