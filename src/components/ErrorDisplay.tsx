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
    navigator.clipboard.writeText(errorText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  // Create a more readable error summary
  const getErrorSummary = () => {
    const summary = [];
    
    if (error.message) {
      summary.push({ label: "Message", value: error.message });
    }
    
    if (error.error) {
      summary.push({ label: "Error", value: error.error });
    }
    
    if (error.status) {
      summary.push({ label: "Status", value: error.status });
    }
    
    return summary;
  };

  const errorSummary = getErrorSummary();

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
        {errorSummary.length > 0 && (
          <div className="mt-4 text-sm text-red-700">
            <p className="font-medium">Error Summary:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {errorSummary.map((item, index) => (
                <li key={index}>
                  <span className="font-medium">{item.label}:</span> {item.value}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ErrorDisplay;