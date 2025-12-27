"use client";

import React, { useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UploadCloud, XCircle, FileText } from 'lucide-react';

interface FileInputProps {
  id: string;
  label: string;
  icon: React.ElementType; // Use React.ElementType for Lucide icons
  accept: string;
  onChange: (file: File | null) => void;
  required?: boolean;
  error?: string;
  file: File | null; // Added file prop
  note?: string; // Added note prop
  disabled?: boolean; // Added disabled prop
}

const FileInput: React.FC<FileInputProps> = ({
  id,
  label,
  icon: Icon,
  accept,
  onChange,
  required,
  error,
  file, // Destructure file prop
  note, // Destructure note prop
  disabled = false, // Destructure disabled prop with default
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onChange(e.target.files[0]);
    } else {
      onChange(null);
    }
  };

  const handleClearFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {note && <p className="text-xs text-gray-500 mt-1">{note}</p>} {/* Render the note here */}
      <div className={cn(
        "relative flex items-center justify-between h-12 rounded-xl border-2 transition-all",
        error ? "border-red-300 bg-red-50" : "border-gray-200 focus-within:border-[#D1AAF2]",
        file ? "pr-12" : "", // Add padding-right when a file is selected
        disabled && "opacity-70 cursor-not-allowed bg-gray-50"
      )}>
        <div className="flex items-center flex-grow">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={18} />
          </div>
          <Input
            id={id}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            disabled={file !== null || disabled} // Disable input if a file is already selected or component is disabled
          />
          <label
            htmlFor={id}
            className={cn(
              "flex-grow pl-10 pr-3 py-2 cursor-pointer text-sm font-medium truncate",
              file ? "text-[#1C0357]" : "text-gray-500",
              disabled && "cursor-not-allowed"
            )}
          >
            {file ? file.name : `Upload ${label.toLowerCase().replace(' (pdf)', '').replace(' (optional)', '')}...`}
          </label>
        </div>
        {file && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClearFile}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-red-500 hover:bg-red-50"
          >
            <XCircle size={18} />
          </Button>
        ) : (
          !file && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-500 hover:bg-gray-100"
            >
              <UploadCloud size={18} />
            </Button>
          )
        )}
      </div>
      {error && <p className="text-red-500 text-[10px] font-bold uppercase">{error}</p>}
    </div>
  );
};

export default FileInput;