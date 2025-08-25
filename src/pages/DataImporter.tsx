import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { calculateRequestCost } from '@/utils/pricing';

interface ParsedRequest {
  email: string;
  name?: string;
  song_title: string;
  musical_or_artist: string;
  sheet_music_url?: string;
  voice_memo?: string;
  youtube_link?: string;
  track_purpose?: string;
  delivery_date?: string;
  special_requests?: string;
  backing_type?: string;
  additional_services?: string[];
  track_type?: string;
  song_key?: string;
  different_key?: string;
  key_for_track?: string;
  cost?: number;
}

const DataImporter = () => {
  const { toast } = useToast();
  const [rawData, setRawData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);

  const parseSheetData = (data: string): ParsedRequest[] => {
    const lines = data.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('No data found. Please paste header and at least one row.');
    }

    const rawHeaders = lines[0].split('\t').map(h => h.trim());
    const headersMap: { [key: string]: string } = {
      'Email Address': 'email',
      'Name': 'name',
      'Song Title': 'song_title',
      'Musical or artist': 'musical_or_artist',
      'Please upload your sheet music as a PDF': 'sheet_music_url',
      'Voice Memo (optional)': 'voice_memo',
      'YouTube URL for tempo reference': 'youtube_link',
      'Is there anything else you\'d like to add?': 'special_requests',
      'Additional links?': 'additional_links', // Temporary field for combining
      'When do you need your track for?': 'delivery_date',
      'This track is for...': 'track_purpose',
      'What do you need?': 'backing_type',
      'Which type of backing track do you need?': 'backing_type_alt', // Alternative for backing_type
      'Additional Services': 'additional_services',
      'What key is your song in? (Don\'t worry if you\'re unsure)': 'song_key',
      'Do you require it in a different key?': 'different_key',
      'Which key?': 'key_for_track', // Added key_for_track
      'Which type of backing track do you need? (Rough Cut)': 'track_type', // Assuming this is the header for track_type
    };

    const mappedHeaders = rawHeaders.map(h => headersMap[h] || h); // Map known headers to internal names

    const records: ParsedRequest[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t').map(v => v.trim());
      const record: Record<string, string> = {};
      mappedHeaders.forEach((header, index) => {
        record[header] = values[index] || '';
      });

      // Helper to extract first URL from a comma-separated string
      const getFirstUrl = (urlField: string) => {
        const urls = record[urlField]?.split(',').map(u => u.trim()).filter(Boolean);
        return urls && urls.length > 0 ? urls[0] : undefined;
      };

      // Helper to map free-text to enum values
      const mapTrackPurpose = (text: string) => {
        if (!text) return undefined;
        const lowerText = text.toLowerCase();
        if (lowerText.includes('audition')) return 'audition-backing';
        if (lowerText.includes('practise') || lowerText.includes('practice')) return 'personal-practise';
        if (lowerText.includes('melody bash') || lowerText.includes('note bash')) return 'melody-bash';
        return undefined;
      };

      const mapBackingType = (text: string) => {
        if (!text) return undefined;
        const lowerText = text.toLowerCase();
        if (lowerText.includes('full song')) return 'full-song';
        if (lowerText.includes('audition cut')) return 'audition-cut';
        if (lowerText.includes('note/melody bash')) return 'note-bash';
        return undefined;
      };

      const mapTrackType = (text: string) => {
        if (!text) return undefined;
        const lowerText = text.toLowerCase();
        if (lowerText.includes('quick reference')) return 'quick';
        if (lowerText.includes('one-take recording')) return 'one-take';
        if (lowerText.includes('polished & accurate backing')) return 'polished';
        return undefined;
      };

      const mapAdditionalServices = (text: string) => {
        if (!text) return [];
        const services: string[] = [];
        const lowerText = text.toLowerCase();
        if (lowerText.includes('rush order')) services.push('rush-order');
        if (lowerText.includes('complex songs')) services.push('complex-songs');
        if (lowerText.includes('additional edits') || lowerText.includes('revisions')) services.push('additional-edits');
        if (lowerText.includes('exclusive ownership')) services.push('exclusive-ownership');
        return services;
      };

      // Combine special requests and additional links
      let specialRequests = record['special_requests'] || '';
      const additionalLinks = record['additional_links'] || '';
      if (additionalLinks && !specialRequests.includes(additionalLinks)) {
        specialRequests = specialRequests ? `${specialRequests}\nAdditional Links: ${additionalLinks}` : `Additional Links: ${additionalLinks}`;
      }

      // Robust date parsing
      let deliveryDate: string | undefined;
      const rawDeliveryDate = record['delivery_date'];
      if (rawDeliveryDate) {
        const parsedDate = new Date(rawDeliveryDate);
        if (!isNaN(parsedDate.getTime())) { // Check if date is valid
          deliveryDate = parsedDate.toISOString().split('T')[0];
        } else {
          console.warn(`Invalid delivery date found: "${rawDeliveryDate}". Setting to undefined.`);
        }
      }

      // Determine backing_type and track_type more robustly
      const backingType = mapBackingType(record['backing_type'] || record['backing_type_alt']);
      const trackType = mapTrackType(record['track_type']); // Use the specific track_type column if present

      const parsedRequest: ParsedRequest = {
        email: record['email'] || 'unknown@example.com', // Default email
        name: record['name'] || undefined,
        song_title: record['song_title'] || 'Unknown Song', // Default song title
        musical_or_artist: record['musical_or_artist'] || 'Unknown Artist', // Default artist
        sheet_music_url: getFirstUrl('sheet_music_url'),
        voice_memo: getFirstUrl('voice_memo'),
        youtube_link: record['youtube_link'] || undefined,
        track_purpose: mapTrackPurpose(record['track_purpose']),
        delivery_date: deliveryDate,
        special_requests: specialRequests || undefined,
        backing_type: backingType,
        additional_services: mapAdditionalServices(record['additional_services']),
        track_type: trackType,
        song_key: record['song_key'] || undefined,
        different_key: record['different_key'] || undefined,
        key_for_track: record['key_for_track'] || undefined,
      };
      
      // Calculate cost using the utility function
      parsedRequest.cost = calculateRequestCost(parsedRequest);

      records.push(parsedRequest);
    }
    return records;
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportResults([]);
    setImportErrors([]);
    setError(null);

    try {
      const requestsToImport = parseSheetData(rawData);
      const results: any[] = [];
      const errors: any[] = [];

      for (const req of requestsToImport) {
        try {
          // Ensure required fields are present and not default placeholders
          if (!req.email || req.email === 'unknown@example.com' || 
              !req.song_title || req.song_title === 'Unknown Song' || 
              !req.musical_or_artist || req.musical_or_artist === 'Unknown Artist') {
            throw new Error('Missing required fields (email, song_title, musical_or_artist)');
          }

          const { data, error: insertError } = await supabase
            .from('backing_requests')
            .insert([
              {
                email: req.email,
                name: req.name,
                song_title: req.song_title,
                musical_or_artist: req.musical_or_artist,
                sheet_music_url: req.sheet_music_url,
                voice_memo: req.voice_memo,
                youtube_link: req.youtube_link,
                track_purpose: req.track_purpose,
                delivery_date: req.delivery_date,
                special_requests: req.special_requests,
                backing_type: req.backing_type,
                additional_services: req.additional_services,
                track_type: req.track_type,
                song_key: req.song_key,
                different_key: req.different_key,
                key_for_track: req.key_for_track,
                cost: req.cost,
                status: 'completed', // Assuming past orders are completed
                is_paid: true, // Assuming past orders are paid
                // Use delivery_date for created_at if valid, otherwise current date
                created_at: req.delivery_date ? new Date(req.delivery_date).toISOString() : new Date().toISOString(),
              }
            ])
            .select();

          if (insertError) {
            throw insertError;
          }
          results.push({ status: 'success', data: data[0] });
        } catch (itemError: any) {
          console.error('Error importing single request:', itemError);
          errors.push({ status: 'failed', request: req, error: itemError.message });
        }
      }

      setImportResults(results);
      setImportErrors(errors);

      if (errors.length === 0) {
        toast({
          title: "Import Successful",
          description: `${results.length} requests imported successfully.`,
        });
      } else if (results.length > 0) {
        toast({
          title: "Partial Import Success",
          description: `${results.length} requests imported, but ${errors.length} failed. See details below.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import Failed",
          description: `All ${errors.length} requests failed to import. See details below.`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Overall import error:', err);
      setError(err);
      toast({
        title: "Import Error",
        description: `An error occurred during import: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Data Importer</h1>
          <p className="text-xl md:text-2xl font-light text-[#1C0357]/90">Import past orders from Google Sheets</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Import Backing Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="mb-4">
                Paste the raw data from your Google Sheet below. Make sure to include the header row.
                The data should be tab-separated (which is usually the default when copying from Google Sheets).
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Important:</strong> This tool will attempt to map your sheet columns to the app's database fields.
                It assumes past orders are `completed` and `paid`.
              </p>
              
              <Label htmlFor="raw-data" className="text-sm font-medium">Paste Google Sheet Data Here</Label>
              <Textarea
                id="raw-data"
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                rows={15}
                placeholder="Paste your tab-separated Google Sheet data here, including headers..."
                className="mt-2 font-mono text-sm"
                disabled={isImporting}
              />
              
              <Button 
                onClick={handleImport}
                disabled={isImporting || !rawData.trim()}
                className="mt-4 bg-[#1C0357] hover:bg-[#1C0357]/90 text-white h-12 px-6 w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing Data...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Start Import
                  </>
                )}
              </Button>
            </div>
            
            {error && (
              <div className="mt-6">
                <ErrorDisplay error={error} title="Overall Import Error" />
              </div>
            )}

            {importResults.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-2 text-[#1C0357] flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                  Successfully Imported ({importResults.length})
                </h3>
                <div className="bg-green-50 p-4 rounded-lg max-h-60 overflow-y-auto border border-green-200">
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {importResults.map((res, index) => (
                      <li key={index}>
                        <strong>{res.data.song_title}</strong> by {res.data.name} ({res.data.email})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {importErrors.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-2 text-[#1C0357] flex items-center">
                  <XCircle className="mr-2 h-5 w-5 text-red-600" />
                  Failed to Import ({importErrors.length})
                </h3>
                <div className="bg-red-50 p-4 rounded-lg max-h-60 overflow-y-auto border border-red-200">
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {importErrors.map((err, index) => (
                      <li key={index}>
                        <strong>{err.request.song_title || 'Unknown Song'}</strong> for {err.request.email || 'Unknown Email'}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default DataImporter;