"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, Music, Key, Youtube, Mic, FileText, Plus, HelpCircle } from 'lucide-react';
import FileInput from "@/components/FileInput";
import { cn } from "@/lib/utils";

export interface SongData {
  id: string;
  songTitle: string;
  musicalOrArtist: string;
  songKey: string;
  differentKey: string;
  keyForTrack: string;
  youtubeLink: string;
  voiceMemoLink: string;
  sheetMusicFiles: File[];
  voiceMemoFiles: File[];
}

interface SongRequestItemProps {
  index: number;
  data: SongData;
  onChange: (id: string, field: string, value: any) => void;
  onRemove: (id: string) => void;
  isOnlySong: boolean;
  errors?: Record<string, string>;
}

const keyOptions = [
  "C Major (0)", "G Major (1♯)", "D Major (2♯)", "A Major (3♯)", "E Major (4♯)", "B Major (5♯)", "F♯ Major (6♯)", "C♯ Major (7♯)", "F Major (1♭)", "B♭ Major (2♭)", "E♭ Major (3♭)", "A♭ Major (4♭)", "D♭ Major (5♭)", "G♭ Major (6♭)", "C♭ Major (7♭)"
];

const SongRequestItem: React.FC<SongRequestItemProps> = ({
  index,
  data,
  onChange,
  onRemove,
  isOnlySong,
  errors
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "p-6 rounded-3xl border-2 mb-6 relative group",
        isOnlySong ? "bg-white border-gray-100" : "bg-gray-50/50 border-[#D1AAF2]/30 shadow-sm"
      )}
    >
      {!isOnlySong && (
        <div className="absolute -top-3 -left-3 bg-[#1C0357] text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-lg z-10">
          {index + 1}
        </div>
      )}

      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-2">
          <Music className="text-[#F538BC]" size={20} />
          <h3 className="text-lg font-black text-[#1C0357] tracking-tight">
            {data.songTitle || `Song ${index + 1}`}
          </h3>
        </div>
        {!isOnlySong && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(data.id)}
            className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <Trash2 size={18} />
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Song Title</Label>
          <Input
            value={data.songTitle}
            onChange={(e) => onChange(data.id, 'songTitle', e.target.value)}
            placeholder="e.g. Defying Gravity"
            className={cn("h-11 rounded-xl border-gray-200", errors?.songTitle && "border-red-300 bg-red-50")}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Musical or Artist</Label>
          <Input
            value={data.musicalOrArtist}
            onChange={(e) => onChange(data.id, 'musicalOrArtist', e.target.value)}
            placeholder="e.g. Wicked"
            className={cn("h-11 rounded-xl border-gray-200", errors?.musicalOrArtist && "border-red-300 bg-red-50")}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sheet Music Key</Label>
          <Select value={data.songKey || undefined} onValueChange={(v) => onChange(data.id, 'songKey', v)}>
            <SelectTrigger className={cn("h-11 rounded-xl border-gray-200", errors?.songKey && "border-red-300 bg-red-50")}>
              <SelectValue placeholder="Select key" />
            </SelectTrigger>
            <SelectContent>
              {keyOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Transposition</Label>
          <Select value={data.differentKey} onValueChange={(v) => onChange(data.id, 'differentKey', v)}>
            <SelectTrigger className="h-11 rounded-xl border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="No">Keep original key</SelectItem>
              <SelectItem value="Yes">I need a different key</SelectItem>
              <SelectItem value="Maybe">I'm not sure yet</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <AnimatePresence>
        {data.differentKey === 'Yes' && (
          <motion.div
            key="transposition"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="p-4 bg-[#D1AAF2]/10 rounded-2xl border border-[#D1AAF2]/20">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#1C0357] mb-2 block">Requested Key</Label>
              <Select value={data.keyForTrack || undefined} onValueChange={(v) => onChange(data.id, 'keyForTrack', v)}>
                <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white">
                  <SelectValue placeholder="Select target key" />
                </SelectTrigger>
                <SelectContent>
                  {keyOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <FileInput
          id={`sheet-music-${data.id}`}
          label="Sheet Music (PDF)"
          icon={FileText}
          accept=".pdf"
          multiple
          value={data.sheetMusicFiles}
          onChange={(files) => onChange(data.id, 'sheetMusicFiles', files || [])}
          error={errors?.sheetMusicFiles}
          note="Upload the score for this specific song."
        />

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">YouTube Reference</Label>
            <div className="relative">
              <Input
                value={data.youtubeLink}
                onChange={(e) => onChange(data.id, 'youtubeLink', e.target.value)}
                placeholder="https://youtube.com/..."
                className="pl-10 h-11 rounded-xl border-gray-200"
              />
              <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Voice Memo Link</Label>
            <div className="relative">
              <Input
                value={data.voiceMemoLink}
                onChange={(e) => onChange(data.id, 'voiceMemoLink', e.target.value)}
                placeholder="Dropbox, Drive, etc."
                className="pl-10 h-11 rounded-xl border-gray-200"
              />
              <Mic className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SongRequestItem;