import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, UploadCloud, FileText, FileAudio, XCircle, Files } from 'lucide-react';

interface FileInputProps {
  id: string;
  label: string;
  icon: LucideIcon;
  accept?: string;
  onChange: (files: File[] | null) => void;
  required?: boolean;
  className?: string;
  note?: string;
  error?: string;
  disabled?: boolean;
  name?: string;
  autocomplete?: string;
  multiple?: boolean; // Added multiple prop
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
  name,
  autocomplete = "off",
  multiple = false, // Default to false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement> | FileList) => {
    if (disabled) return;
    
    let selectedFiles: File[] = [];
    if (event instanceof FileList) {
      selectedFiles = Array.from(event);
    } else if (event.target.files) {
      selectedFiles = Array.from(event.target.files);
    }

    if (multiple) {
      const newFiles = [...files, ...selectedFiles];
      setFiles(newFiles);
      onChange(newFiles);
    } else {
      const newFile = selectedFiles[0] ? [selectedFiles[0]] : [];
      setFiles(newFile);
      onChange(newFile.length > 0 ? newFile : null);
    }
  };

  const handleButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (disabled) return;
    
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onChange(newFiles.length > 0 ? newFiles : null);
    
    if (newFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFileChange(droppedFiles);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('audio/')) return FileAudio;
    if (fileType.includes('pdf')) return FileText;
    return Icon;
  };

  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="flex items-center text-sm mb-1 font-medium text-[#1C0357]">
        <Icon className="mr-1" size={14} />
        {label} {required && <span className="text-red-500 font-bold ml-1">*</span>}
      </label>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl text-sm transition-all duration-200",
          isDragging ? "border-[#F538BC] bg-[#F538BC]/5" : "border-gray-200 hover:border-[#D1AAF2] bg-white",
          files.length > 0 ? "border-green-200 bg-green-50/30" : "",
          error && "border-red-300 bg-red-50",
          disabled && "bg-gray-50 cursor-not-allowed opacity-70"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          id={id}
          name={name || id}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
          disabled={disabled}
          multiple={multiple}
          autoComplete={autocomplete}
        />
        
        {files.length === 0 ? (
          <>
            <UploadCloud className={cn("h-10 w-10 mb-3", isDragging ? "text-[#F538BC]" : "text-gray-300")} />
            <p className="text-gray-600 mb-3 text-center font-medium">
              Drag & drop {multiple ? 'files' : 'a file'} here or
            </p>
            <Button
              type="button"
              onClick={handleButtonClick}
              variant="outline"
              className="bg-white border-gray-200 text-[#1C0357] hover:bg-gray-50 font-bold rounded-lg"
              disabled={disabled}
            >
              Browse Files
            </Button>
          </>
        ) : (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center">
                <Files className="mr-1 h-3 w-3" /> {files.length} File{files.length > 1 ? 's' : ''} Selected
              </span>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleButtonClick}
                className="h-7 text-[10px] font-bold uppercase text-[#1C0357]"
              >
                Add More
              </Button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {files.map((file, index) => {
                const FileIcon = getFileIcon(file.type);
                return (
                  <div key={index} className="flex items-center justify-between p-2 bg-white border border-green-100 rounded-lg group">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-700 truncate">{file.name}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => handleRemoveFile(index, e)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {note && <p className="text-[10px] text-gray-400 mt-1 font-medium">{note}</p>}
      {error && <p className="text-red-500 text-[10px] font-bold uppercase mt-1">{error}</p>}
    </div>
  );
};

export default FileInput;