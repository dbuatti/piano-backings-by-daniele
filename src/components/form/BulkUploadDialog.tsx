"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Files, Music, Layers } from 'lucide-react';

interface BulkUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileCount: number;
  onConfirmDifferent: () => void;
  onConfirmSame: () => void;
}

const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({
  isOpen,
  onClose,
  fileCount,
  onConfirmDifferent,
  onConfirmSame,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md rounded-[32px] border-none shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 bg-[#D1AAF2]/20 rounded-3xl flex items-center justify-center text-[#1C0357]">
              <Files size={32} />
            </div>
          </div>
          <AlertDialogTitle className="text-2xl font-black text-[#1C0357] text-center tracking-tight">
            Multiple PDFs Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-gray-600 font-medium pt-2">
            You've uploaded <span className="text-[#F538BC] font-black">{fileCount} files</span>. 
            How would you like to organize them?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid gap-4 py-6">
          <button
            onClick={onConfirmDifferent}
            className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-[#1C0357] hover:bg-[#1C0357]/5 transition-all text-left group"
          >
            <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#1C0357] group-hover:text-white transition-colors">
              <Music size={20} />
            </div>
            <div>
              <p className="font-black text-[#1C0357]">Different Songs</p>
              <p className="text-xs text-gray-500 font-medium">Create {fileCount} separate song slots.</p>
            </div>
          </button>

          <button
            onClick={onConfirmSame}
            className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-[#F538BC] hover:bg-[#F538BC]/5 transition-all text-left group"
          >
            <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#F538BC] group-hover:text-white transition-colors">
              <Layers size={20} />
            </div>
            <div>
              <p className="font-black text-[#1C0357]">Same Song</p>
              <p className="text-xs text-gray-500 font-medium">Attach all {fileCount} files to one song slot.</p>
            </div>
          </button>
        </div>

        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel className="rounded-full border-none text-gray-400 hover:text-gray-600 font-bold">
            Cancel Upload
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BulkUploadDialog;