import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { calculateRequestCost } from '@/utils/pricing';
import { cn } from '@/lib/utils'; // Import cn for conditional classNames

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
  backing_type?: string[];
  additional_services?: string[];
  track_type?: string;
  song_key?: string;
  different_key?: string;
  key_for_track?: string;
  cost?: number;
  additional_links?: string;
  created_at?: string; // Added created_at for explicit import date
}

const DataImporter = () => {
  const { toast } = useToast();
  const [rawData, setRawData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);

  // Robust CSV line parser
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let inQuote = false;
    let currentField = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuote && nextChar === '"') { // Handle escaped double quote ("")
          currentField += '"';
          i++; // Skip the next quote
        } else {
          inQuote = !inQuote;
        }
      } else if (char === ',' && !inQuote) {
        result.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    result.push(currentField.trim()); // Add the last field
    return result;
  };

  const parseSheetData = (data: string): ParsedRequest[] => {
    const lines = data.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('No data found. Please paste header and at least one row.');
    }

    const rawHeaders = parseCSVLine(lines[0]);
    const headersMap: { [key: string]: string } = {
      'Email Address': 'email',
      'Email': 'email', // Alternative
      'Name': 'name',
      'Client Name': 'name', // Alternative
      'Song Title': 'song_title',
      'Musical or artist': 'musical_or_artist',
      'Musical/Artist': 'musical_or_artist', // Alternative
      'Sheet Music URL': 'sheet_music_url', // Explicit URL field
      'Please upload your sheet music as a PDF': 'sheet_music_url', // Old form field
      'Voice Memo URL': 'voice_memo', // Explicit URL field
      'Voice Memo (optional)': 'voice_memo', // Old form field
      'YouTube URL for tempo reference': 'youtube_link',
      'YouTube Link': 'youtube_link', // Alternative
      'Is there anything else you\'d like to add?': 'special_requests',
      'Special Requests': 'special_requests', // Alternative
      'Additional links?': 'additional_links',
      'Additional Links': 'additional_links', // Alternative
      'When do you need your track for?': 'delivery_date',
      'Delivery Date': 'delivery_date', // Alternative
      'This track is for...': 'track_purpose',
      'Track Purpose': 'track_purpose', // Alternative
      'What do you need?': 'backing_type', // Old form field
      'Backing Type': 'backing_type', // Alternative
      'Which type of backing track do you need?': 'backing_type_alt', // Alternative for backing_type
      'Additional Services': 'additional_services',
      'What key is your song in? (Don\'t worry if you\'re unsure)': 'song_key',
      'Song Key': 'song_key', // Alternative
      'Do you require it in a different key?': 'different_key',
      'Different Key': 'different_key', // Alternative
      'Which key?': 'key_for_track',
      'Key for Track': 'key_for_track', // Alternative
      'Which type of backing track do you need? (Rough Cut)': 'track_type', // Old form field
      'Track Type': 'track_type', // Alternative
      'Order Date': 'created_at', // Explicit created_at field
    };

    const mappedHeaders = rawHeaders.map(h => headersMap[h.trim()] || h.trim());

    // Validate essential headers
    const requiredHeaders = ['email', 'song_title', 'musical_or_artist'];
    const missingHeaders = requiredHeaders.filter(rh => !mappedHeaders.includes(rh));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}. Please ensure your sheet includes these columns.`);
    }

    const records: ParsedRequest[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const record: Record<string, string> = {};

      mappedHeaders.forEach((header, index) => {
        record[header] = values[index] !== undefined ? values[index] : '';
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

      const mapListField = (text: string): string[] => {
        if (!text) return [];
        return text.split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
      };

      const mapBackingType = (text: string): string[] => {
        const types = mapListField(text);
        const mappedTypes: string[] = [];
        if (types.includes('full song') || types.includes('full-song')) mappedTypes.push('full-song');
        if (types.includes('audition cut') || types.includes('audition-cut')) mappedTypes.push('audition-cut');
        if (types.includes('note/melody bash') || types.includes('note-bash')) mappedTypes.push('note-bash');
        return mappedTypes;
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
        const services = mapListField(text);
        const mappedServices: string[] = [];
        if (services.includes('rush order') || services.includes('rush-order')) mappedServices.push('rush-order');
        if (services.includes('complex songs') || services.includes('complex-songs')) mappedServices.push('complex-songs');
        if (services.includes('additional edits') || services.includes('revisions') || services.includes('additional-edits')) mappedServices.push('additional-edits');
        if (services.includes('exclusive ownership') || services.includes('exclusive-ownership')) mappedServices.push('exclusive-ownership');
        return mappedServices;
      };

      const specialRequests = record['special_requests'] || undefined;
      const additionalLinks = record['additional_links'] || undefined;

      // Robust date parsing for delivery_date and created_at
      const parseDateString = (dateStr: string | undefined): string | undefined => {
        if (!dateStr) return undefined;
        const parsedDate = new Date(dateStr);
        return !isNaN(parsedDate.getTime()) ? parsedDate.toISOString().split('T')[0] : undefined;
      };

      const deliveryDate = parseDateString(record['delivery_date']);
      const createdAt = parseDateString(record['created_at']);

      const backingType = mapBackingType(record['backing_type'] || record['backing_type_alt']);
      const trackType = mapTrackType(record['track_type']);

      const parsedRequest: ParsedRequest = {
        email: record['email'] || 'unknown@example.com',
        name: record['name'] || undefined,
        song_title: record['song_title'] || 'Unknown Song',
        musical_or_artist: record['musical_or_artist'] || 'Unknown Artist',
        sheet_music_url: getFirstUrl('sheet_music_url'),
        voice_memo: getFirstUrl('voice_memo'),
        youtube_link: record['youtube_link'] || undefined,
        track_purpose: mapTrackPurpose(record['track_purpose']),
        delivery_date: deliveryDate,
        special_requests: specialRequests,
        backing_type: backingType,
        additional_services: mapAdditionalServices(record['additional_services']),
        track_type: trackType,
        song_key: record['song_key'] || undefined,
        different_key: record['different_key'] || undefined,
        key_for_track: record['key_for_track'] || undefined,
        additional_links: additionalLinks,
        created_at: createdAt, // Use parsed created_at
      };
      
      // Calculate cost using the utility function
      parsedRequest.cost = calculateRequestCost(parsedRequest).totalCost;

      records.push(parsedRequest);
    }
    return records;
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportResults([]);
    setImportErrors([]);
    setError(null);

    if (!rawData.trim()) {
      setError(new Error('No data provided. Please paste your Google Sheet data into the text area.'));
      setIsImporting(false);
      return;
    }

    let requestsToImport: ParsedRequest[] = [];
    try {
      requestsToImport = parseSheetData(rawData);
      if (requestsToImport.length === 0) {
        setError(new Error('No valid requests found after parsing. Please check your data format.'));
        setIsImporting(false);
        return;
      }
    } catch (parseError: any) {
      setError(new Error(`Data parsing failed: ${parseError.message}`));
      setIsImporting(false);
      return;
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const req of requestsToImport) {
      try {
        // Ensure required fields are present and not default placeholders
        if (!req.email || req.email === 'unknown@example.com' || 
            !req.song_title || req.song_title === 'Unknown Song' || 
            !req.musical_or_artist || req.musical_or_artist === 'Unknown Artist') {
          throw new Error('Missing essential fields (email, song_title, musical_or_artist) for this row.');
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
              created_at: req.created_at || new Date().toISOString(), // Use imported created_at or current date
              additional_links: req.additional_links,
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
    setIsImporting(false);
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-[#1C0357] flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            Import Backing Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-bold text-[#1C0357] mb-2 flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              How to Import Data
            </h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
              <li>Open your Google Sheet containing past backing requests.</li>
              <li>Select all the data, including the header row.</li>
              <li>Copy the selected data (Ctrl+C or Cmd+C).</li>
              <li>Paste the raw data into the text area below.</li>
              <li>Click "Start Import".</li>
            </ol>
            <p className="mt-4 text-sm text-gray-600">
              <strong>Important:</strong> This tool assumes past orders are `completed` and `paid`.
              Ensure your sheet has columns like "Email Address", "Song Title", "Musical or artist", etc.
            </p>
            <div className="mt-4 p-3 bg-white border rounded-md font-mono text-xs text-gray-800 overflow-x-auto">
              <p className="font-bold mb-1">Example CSV Format:</p>
              <pre className="whitespace-pre-wrap">
                Email Address,Name,Song Title,Musical or artist,Order Date,Delivery Date,What do you need?,Additional Services,Track Type,Song Key,Special Requests,YouTube Link,Additional Links
                client1@example.com,John Doe,Song A,Artist X,2023-01-10,2023-01-15,"full-song, audition-cut",rush-order,polished,C Major (0),"Please be accurate",https://youtube.com/a,https://dropbox.com/a
                client2@example.com,Jane Smith,Song B,Musical Y,2023-02-15,2023-02-20,note-bash,complex-songs,one-take,G Major (1♯),"No special notes",https://youtube.com/b,
              </pre>
            </div>
          </div>
            
          <Label htmlFor="raw-data" className="text-sm font-medium">Paste Google Sheet Data Here</Label>
          <Textarea
            id="raw-data"
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            rows={15}
            placeholder="Paste your comma-separated Google Sheet data here, including headers..."
            className={cn(
              "mt-2 font-mono text-sm",
              rawData.trim() === '' ? "border-gray-300" : "border-[#1C0357]",
              isImporting && "opacity-70 cursor-not-allowed"
            )}
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
          
          {error && (
            <div className="mt-6">
              <ErrorDisplay error={error} title="Import Error" />
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
                      <strong>{res.data.song_title}</strong> by {res.data.name || 'N/A'} ({res.data.email})
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
          {importResults.length === 0 && importErrors.length === 0 && !isImporting && rawData.trim() && !error && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center">
              <AlertTriangle className="mr-3 h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                No valid requests were found in the provided data. Please check the format and ensure all required columns are present.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default DataImporter;