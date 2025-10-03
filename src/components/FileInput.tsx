import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, UploadCloud } from 'lucide-react'; // Import UploadCloud icon

interface FileInputProps {
  id: string;
  label: string;
  icon: LucideIcon;
  accept?: string;
  onChange: (file: File | null) => void;
  required?: boolean;
  className?: string;
  note?: string;
  error?: string; // Added error prop
  disabled?: boolean; // Added disabled prop
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
  error, // Destructure error prop
  disabled = false, // Destructure disabled prop with default
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('No file chosen');
  const [isDragging, setIsDragging] = useState(false); // New state for drag-and-drop

  const handleButtonClick = () => {
    if (disabled) return; // Prevent click if disabled
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return; // Prevent change if disabled
    const file = event.target.files?.[0] || null;
    setFileName(file ? file.name : 'No file chosen');
    onChange(file);
  };

  // Drag and drop handlers
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return; // Prevent drag if disabled
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return; // Prevent drag if disabled
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return; // Prevent drop if disabled
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFileName(file.name);
      onChange(file);
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="flex items-center text-sm mb-1">
        <Icon className="mr-1" size={14} />
        {label} {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div
        className={cn(
          "flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md text-sm bg-white transition-colors duration-200",
          isDragging ? "border-[#F538BC] bg-[#F538BC]/10" : "border-gray-300 hover:border-gray-400",
          error && "border-red-500", // Apply error styling
          disabled && "bg-gray-100 cursor-not-allowed opacity-70 border-gray-200 hover:border-gray-200" // Disabled styling
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
          disabled={disabled} // Apply disabled to the actual input
        />
        <UploadCloud className={cn("h-8 w-8 mb-2", isDragging ? "text-[#F538BC]" : "text-gray-400")} />
        <p className="text-gray-700 mb-2 text-center">
          <span className="font-semibold">Drag & drop your file here</span> or
        </p>
        <Button
          type="button"
          onClick={handleButtonClick}
          variant="outline"
          className="py-1 px-3 h-auto text-sm font-semibold bg-[#D1AAF2] text-[#1C0357] hover:bg-[#D1AAF2]/80"
          disabled={disabled} // Apply disabled to the button
        >
          Browse files
        </Button>
        <p className="text-gray-500 mt-2 truncate max-w-full">{fileName}</p>
      </div>
      {note && <p className="text-xs text-gray-500 mt-1">{note}</p>}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>} {/* Display error message */}
    </div>
  );
};

export default FileInput;