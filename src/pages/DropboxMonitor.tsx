import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Loader2, RefreshCw, CheckCircle, XCircle, FolderOpen, FileAudio } from 'lucide-react';
import { format } from 'date-fns';

interface DropboxFile {
  name: string;
  path_display: string;
  id: string;
  client_modified: string;
  size: number;
}

const DropboxMonitor: React.FC = () => {
  const [files, setFiles] = useState<DropboxFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingFileId, setProcessingFileId] = useState<string | null>(null);

  const fetchDropboxFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-dropbox-files');
      if (error) throw error;
      setFiles(data.files || []);
    } catch (error: any) {
      console.error('Error fetching Dropbox files:', error);
      showError(`Error fetching Dropbox files: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessFile = async (file: DropboxFile) => {
    setProcessingFileId(file.id);
    try {
      const { data, error } = await supabase.functions.invoke('process-dropbox-file', {
        body: JSON.stringify({ filePath: file.path_display }),
      });
      if (error) throw error;
      showSuccess(`File processed successfully! File ${file.name} has been moved to 'processed'.`);
      fetchDropboxFiles(); // Refresh the list
    } catch (error: any) {
      console.error('Error processing file:', error);
      showError(`Error processing file: ${error.message}`);
    } finally {
      setProcessingFileId(null);
    }
  };

  useEffect(() => {
    fetchDropboxFiles();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-4xl mx-auto shadow-lg bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold text-[#1C0357] flex items-center">
              <FolderOpen className="mr-2 h-5 w-5" />
              Dropbox Monitor (New Backings)
            </CardTitle>
            <Button onClick={fetchDropboxFiles} disabled={loading} variant="outline">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              This page displays new audio files uploaded to your designated Dropbox folder (e.g., `/New Backings`).
              You can process these files to move them to a 'processed' subfolder.
            </p>

            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-[#1C0357]" />
                <p className="ml-3 text-gray-600">Loading Dropbox files...</p>
              </div>
            ) : files.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No new files found in Dropbox.</p>
            ) : (
              <div className="space-y-4">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-md bg-gray-50">
                    <div className="flex items-center">
                      <FileAudio className="mr-3 h-6 w-6 text-[#1C0357]" />
                      <div>
                        <p className="font-medium text-[#1C0357]">{file.name}</p>
                        <p className="text-sm text-gray-600">
                          Size: {(file.size / (1024 * 1024)).toFixed(2)} MB | Modified: {format(new Date(file.client_modified), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleProcessFile(file)}
                      disabled={processingFileId === file.id}
                      className="bg-[#F538BC] hover:bg-[#F538BC]/90 text-white"
                    >
                      {processingFileId === file.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Process File
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DropboxMonitor;