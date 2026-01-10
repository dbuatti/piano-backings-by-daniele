import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, UploadCloud, FileText, FileAudio, XCircle } from 'lucide-react'; // Import FileText, FileAudio, XCircle

interface FileInputProps {
  id: string;
  label: string;
  icon: LucideIcon;
  accept?: string;
  onChange: (file: File | null) => void;
  required?: boolean;
  className?: string;
  note?: string;
  error?: string;
  disabled?: boolean;
  autocomplete?: string; // New prop for autocomplete
}

const FileInput: React.FC<FileInputProps> = ({
  id,
  label,
  icon: Icon,
  accept,
  onChange,
  required = false,
  className,
  note,
  error,
  disabled = false,
  autocomplete = "off", // Default autocomplete to "off" for file inputs
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement> | FileList) => {
    if (disabled) return;
    const selectedFile = (event instanceof FileList) ? event[0] : event.target.files?.[0] || null;
    
    setFile(selectedFile);
    onChange(selectedFile);
  };

  const handleButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleClearFile = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (disabled) return;
    setFile(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the input value
    }
  };

  // Drag and drop handlers
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileChange(files);
    }
  };

  const getFileIcon = (file: File | null) => {
    if (!file) return UploadCloud;
    if (file.type.startsWith('audio/')) return FileAudio;
    if (file.type.includes('pdf')) return FileText;
    return Icon;
  };

  const CurrentFileIcon = getFileIcon(file);

  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="flex items-center text-sm mb-1 font-medium text-[#1C0357]">
        <Icon className="mr-1" size={14} />
        {label} {required && <span className="text-red-500 font-bold ml-1">*</span>}
      </label>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md text-sm transition-colors duration-200",
          isDragging ? "border-[#F538BC] bg-[#F538BC]/10" : "border-gray-300 hover:border-gray-400",
          file ? "border-green-500 bg-green-50" : "bg-white", // Success state when file is present
          error && "border-red-500 bg-red-50", // Error state
          disabled && "bg-gray-100 cursor-not-allowed opacity-70 border-gray-200 hover:border-gray-200"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          id={id}
          name={id}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
          disabled={disabled}
          autoComplete={autocomplete}
        />
        
        {file && !disabled && (
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClearFile}
            className="absolute top-2 right-2 h-6 w-6 text-red-500 hover:bg-red-100"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}

        <CurrentFileIcon className={cn("h-8 w-8 mb-2", file ? "text-green-600" : isDragging ? "text-[#F538BC]" : "text-gray-400")} />
        
        <p className="text-gray-700 mb-2 text-center">
          <span className="font-semibold">Drag & drop your file here</span> or
        </p>
        <Button
          type="button"
          onClick={handleButtonClick}
          variant="outline"
          className="py-1 px-3 h-auto text-sm font-semibold bg-[#D1AAF2] text-[#1C0357] hover:bg-[#D1AAF2]/80"
          disabled={disabled}
        >
          Browse files
        </Button>
        <p className={cn("mt-2 truncate max-w-full", file ? "text-green-700 font-semibold" : "text-gray-500")}>
          {file ? file.name : 'No file chosen'}
        </p>
      </div>
      {note && <p className="text-xs text-gray-500 mt-1">{note}</p>}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default FileInput;