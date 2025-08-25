import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from 'lucide-react';

interface FileInputProps {
  id: string;
  label: string;
  icon: LucideIcon;
  accept?: string;
  onChange: (file: File | null) => void;
  required?: boolean;
  className?: string;
  note?: string;
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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('No file chosen');

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFileName(file ? file.name : 'No file chosen');
    onChange(file);
  };

  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="flex items-center text-sm mb-1">
        <Icon className="mr-1" size={14} />
        {label} {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex items-center border border-input rounded-md px-3 py-2 text-sm bg-white">
        <input
          id={id}
          name={id}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          ref={fileInputRef}
          required={required}
          className="hidden"
        />
        <Button
          type="button"
          onClick={handleButtonClick}
          variant="outline"
          className="mr-2 py-1 px-3 h-auto text-sm font-semibold bg-[#D1AAF2] text-[#1C0357] hover:bg-[#D1AAF2]/80"
        >
          Choose file
        </Button>
        <span className="text-gray-500 truncate flex-1">{fileName}</span>
      </div>
      {note && <p className="text-xs text-gray-500 mt-1">{note}</p>}
    </div>
  );
};

export default FileInput;