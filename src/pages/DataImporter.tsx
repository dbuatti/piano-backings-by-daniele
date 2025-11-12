import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Loader2, UploadCloud } from 'lucide-react';

const DataImporter: React.FC = () => {
  const [csvData, setCsvData] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: any[] } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCsvData(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const parseCsv = (csv: string) => {
    const lines = csv.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: { [key: string]: any } = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      return obj;
    });
    return data;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setResults(null);
    const parsedData = parseCsv(csvData);
    let successCount = 0;
    const errors: any[] = [];

    for (const row of parsedData) {
      try {
        const { data, error } = await supabase
          .from('backing_requests')
          .insert([
            {
              name: row.name,
              email: row.email,
              song_title: row.song_title,
              musical_or_artist: row.musical_or_artist,
              backing_type: row.backing_type ? row.backing_type.split(';') : [],
              delivery_date: row.delivery_date || null,
              status: row.status || 'pending',
              is_paid: row.is_paid === 'TRUE' || row.is_paid === 'true',
              special_requests: row.special_requests || null,
              youtube_link: row.youtube_link || null,
              additional_links: row.additional_links || null,
              track_purpose: row.track_purpose || null,
              additional_services: row.additional_services ? row.additional_services.split(';') : [],
              sheet_music_url: row.sheet_music_url || null,
              song_key: row.song_key || null,
              track_type: row.track_type || null,
              category: row.category || null,
            }
          ])
          .select();

        if (error) throw error;
        successCount++;
      } catch (error: any) {
        console.error("Error importing row:", row, error);
        errors.push({ row, error: error.message });
      }
    }

    setLoading(false);
    setResults({ success: successCount, errors });

    if (errors.length > 0) {
      showError(`Import failed: ${errors.length} records failed.`);
    } else {
      showSuccess(`Data imported successfully! ${successCount} records added, ${errors.length} failed.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-3xl mx-auto shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-[#1C0357] flex items-center">
              <UploadCloud className="mr-2 h-5 w-5" />
              Data Importer (CSV)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-700">
              Upload backing track requests from a CSV file. Ensure your CSV has the following headers:
              <code className="block bg-gray-100 p-2 mt-2 rounded text-sm">
                name,email,song_title,musical_or_artist,backing_type,delivery_date,status,is_paid,special_requests,youtube_link,additional_links,track_purpose,additional_services,sheet_music_url,song_key,track_type,category
              </code>
              <span className="block text-xs text-gray-500 mt-1">
                For `backing_type` and `additional_services`, use semicolons (`;`) to separate multiple values (e.g., `Full Song;Audition Cut`). `is_paid` should be `TRUE` or `FALSE`.
              </span>
            </p>

            <div className="space-y-2">
              <Label htmlFor="csv-file">Upload CSV File</Label>
              <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv-data">Or Paste CSV Data</Label>
              <Textarea
                id="csv-data"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="Paste your CSV data here..."
                rows={10}
                className="font-mono text-sm"
                disabled={loading}
              />
            </div>

            <Button onClick={handleSubmit} className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white" disabled={loading || !csvData.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Data"
              )}
            </Button>

            {results && (
              <div className="mt-6 p-4 border rounded-md bg-gray-50">
                <h3 className="text-lg font-semibold text-[#1C0357] mb-2">Import Results:</h3>
                <p className="text-sm">Successfully imported: <span className="font-bold text-green-600">{results.success}</span> records.</p>
                {results.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-red-600">Errors ({results.errors.length}):</p>
                    <ul className="list-disc list-inside text-sm text-red-500 max-h-40 overflow-y-auto">
                      {results.errors.map((err, index) => (
                        <li key={index}>Row: {JSON.stringify(err.row)} - Error: {err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataImporter;