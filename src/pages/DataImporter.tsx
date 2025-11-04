import { useState } from 'react'; // Removed React
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Loader2, UploadCloud, CheckCircle, XCircle } from 'lucide-react';

const DataImporter = () => {
  const [jsonData, setJsonData] = useState('');
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    setLoading(true);
    setImportResult(null);
    try {
      const records = JSON.parse(jsonData);
      if (!Array.isArray(records)) {
        throw new Error("JSON data must be an array of records.");
      }

      const { data, error } = await supabase.functions.invoke('import-backing-requests', {
        body: { records },
      });

      if (error) {
        throw new Error(error.message);
      }

      setImportResult(data);
      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.success} records, ${data.failed} failed.`,
        variant: data.failed > 0 ? "destructive" : "default",
      });

    } catch (err: any) {
      console.error("Import error:", err);
      toast({
        title: "Import Failed",
        description: err.message,
        variant: "destructive",
      });
      setImportResult({ success: 0, failed: 0, errors: [err.message] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <CardHeader className="bg-[#1C0357] text-white">
            <CardTitle className="text-2xl flex items-center">
              <UploadCloud className="mr-2" />
              Import Backing Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="jsonData" className="text-lg">JSON Data</Label>
                <Textarea
                  id="jsonData"
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  placeholder='[{"name": "John Doe", "email": "john@example.com", ...}]'
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>
              <Button onClick={handleImport} disabled={loading || !jsonData} className="w-full bg-[#F538BC] hover:bg-[#F538BC]/90">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" /> Import Data
                  </>
                )}
              </Button>

              {importResult && (
                <div className="mt-6 p-4 border rounded-md bg-gray-50">
                  <h3 className="text-xl font-semibold mb-3 text-[#1C0357]">Import Summary</h3>
                  <p className="flex items-center text-green-600 font-medium">
                    <CheckCircle className="mr-2 h-5 w-5" /> Successfully Imported: {importResult.success}
                  </p>
                  <p className="flex items-center text-red-600 font-medium mt-2">
                    <XCircle className="mr-2 h-5 w-5" /> Failed: {importResult.failed}
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-red-700 mb-2">Errors:</h4>
                      <ul className="list-disc pl-5 text-sm text-red-600 max-h-40 overflow-y-auto">
                        {importResult.errors.map((err, index) => (
                          <li key={index}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default DataImporter;