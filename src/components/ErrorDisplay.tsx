import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface ErrorDisplayProps {
  error: any;
  title?: string;
}

const ErrorDisplay = ({ error, title = "Error Details" }: ErrorDisplayProps) => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    const errorText = JSON.stringify(error, null, 2);
    navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-red-300 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-800 flex items-center justify-between">
          <span>{title}</span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={copyToClipboard}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Error
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap break-words text-sm bg-red-100 p-4 rounded-lg max-h-60 overflow-y-auto">
          {JSON.stringify(error, null, 2)}
        </pre>
        <div className="mt-4 text-sm text-red-700">
          <p className="font-medium">Error Summary:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            {error.message && (
              <li><span className="font-medium">Message:</span> {error.message}</li>
            )}
            {error.error && (
              <li><span className="font-medium">Error:</span> {error.error}</li>
            )}
            {error.status && (
              <li><span className="font-medium">Status:</span> {error.status}</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorDisplay;