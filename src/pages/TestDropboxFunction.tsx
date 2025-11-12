import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Loader2, Cloud, UploadCloud, DownloadCloud } from 'lucide-react';

const TestDropboxFunction: React.FC = () => {
  const [filePath, setFilePath] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPath, setUploadPath] = useState('/test-uploads/my-test-file.txt');

  const handleReadFile = async () => {
    setLoading(true);
    setFileContent('');
    try {
      const { data, error } = await supabase.functions.invoke('read-dropbox-file', {
        body: JSON.stringify({ filePath }),
      });

      if (error) throw error;

      setFileContent(data.content);
      showSuccess("File read successfully!");
    } catch (error: any) {
      console.error('Error reading file:', error);
      showError(`Failed to read file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadFile(event.target.files[0]);
      setUploadPath(`/test-uploads/${event.target.files[0].name}`); // Suggest a path
    } else {
      setUploadFile(null);
    }
  };

  const handleUploadFile = async () => {
    if (!uploadFile) {
      showError("Please select a file to upload.");
      return;
    }
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsArrayBuffer(uploadFile);
      reader.onloadend = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        const { data, error } = await supabase.functions.invoke('upload-dropbox-file', {
          body: JSON.stringify({
            filePath: uploadPath,
            fileContentBase64: base64,
          }),
        });

        if (error) throw error;

        showSuccess("File uploaded successfully to Dropbox!");
        console.log('Upload response:', data);
      };
    } catch (error: any) {
      console.error('Error uploading file:', error);
      showError(`Failed to upload file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-[#1C0357] mb-6 text-center">Test Dropbox Functions</h1>

          <div className="space-y-6">
            {/* Read File Section */}
            <div className="border p-4 rounded-md bg-gray-50">
              <h2 className="text-xl font-semibold text-[#1C0357] mb-4 flex items-center">
                <DownloadCloud className="mr-2 h-5 w-5" /> Read File
              </h2>
              <div className="space-y-2 mb-4">
                <Label htmlFor="read-file-path">Dropbox File Path</Label>
                <Input
                  id="read-file-path"
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="/path/to/your/file.txt"
                  disabled={loading}
                />
              </div>
              <Button onClick={handleReadFile} disabled={loading || !filePath.trim()} className="w-full bg-[#F538BC] hover:bg-[#F538BC]/90 text-white">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reading...
                  </>
                ) : (
                  "Read File"
                )}
              </Button>
              {fileContent && (
                <div className="mt-4 p-3 bg-white border rounded-md text-sm font-mono overflow-x-auto">
                  <h3 className="font-semibold mb-2">File Content:</h3>
                  <pre>{fileContent}</pre>
                </div>
              )}
            </div>

            {/* Upload File Section */}
            <div className="border p-4 rounded-md bg-gray-50">
              <h2 className="text-xl font-semibold text-[#1C0357] mb-4 flex items-center">
                <UploadCloud className="mr-2 h-5 w-5" /> Upload File
              </h2>
              <div className="space-y-2 mb-4">
                <Label htmlFor="upload-file-input">Select File</Label>
                <Input
                  id="upload-file-input"
                  type="file"
                  onChange={handleUploadFileChange}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2 mb-4">
                <Label htmlFor="upload-file-path">Target Dropbox Path</Label>
                <Input
                  id="upload-file-path"
                  type="text"
                  value={uploadPath}
                  onChange={(e) => setUploadPath(e.target.value)}
                  placeholder="/path/to/upload/file.txt"
                  disabled={loading}
                />
              </div>
              <Button onClick={handleUploadFile} disabled={loading || !uploadFile || !uploadPath.trim()} className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload File to Dropbox"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestDropboxFunction;