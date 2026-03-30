"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, PlusCircle, MinusCircle, FileAudio, UploadCloud, FileText, Key, Link as LinkIcon } from 'lucide-react';
import FileInput from '../FileInput';
import { TrackInfo } from '@/utils/helpers';
import { cn } from '@/lib/utils';

export interface ProductFormValues {
  title: string;
  description: string;
  price: string;
  currency: string;
  image_url: string;
  track_urls: TrackInfo[];
  is_active: boolean;
  artist_name: string;
  category: string;
  vocal_ranges: string[];
  sheet_music_url: string;
  key_signature: string;
  show_sheet_music_url: boolean;
  show_key_signature: boolean;
  track_type: string;
  master_download_link: string;
}

interface ProductFormProps {
  initialValues: ProductFormValues;
  onSubmit: (values: ProductFormValues, imageFile: File | null, sheetMusicFile: File | null) => Promise<void>;
  isSubmitting: boolean;
  submitLabel?: string;
}

const ProductForm: React.FC<ProductFormProps> = ({ initialValues, onSubmit, isSubmitting, submitLabel = "Save Product" }) => {
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sheetMusicFile, setSheetMusicFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleVocalRangeChange = (range: string, checked: boolean) => {
    setValues(prev => ({
      ...prev,
      vocal_ranges: checked 
        ? [...prev.vocal_ranges, range] 
        : prev.vocal_ranges.filter(r => r !== range)
    }));
  };

  const handleTrackChange = (index: number, field: keyof TrackInfo | 'file', value: any) => {
    setValues(prev => {
      const newTracks = [...prev.track_urls];
      newTracks[index] = { ...newTracks[index], [field]: value };
      if (field === 'file' && value) newTracks[index].url = null;
      if (field === 'url' && value) newTracks[index].file = null;
      return { ...prev, track_urls: newTracks };
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!values.title) newErrors.title = "Title is required";
    if (!values.price) newErrors.price = "Price is required";
    if (!values.artist_name) newErrors.artist_name = "Artist is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>Product Title</Label>
            <Input name="title" value={values.title} onChange={handleInputChange} className={errors.title ? "border-red-500" : ""} />
          </div>
          <div>
            <Label>Artist Name</Label>
            <Input name="artist_name" value={values.artist_name} onChange={handleInputChange} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea name="description" value={values.description} onChange={handleInputChange} rows={4} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Price</Label>
              <Input name="price" type="number" value={values.price} onChange={handleInputChange} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={values.currency} onValueChange={(v) => setValues(p => ({ ...p, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={values.category} onValueChange={(v) => setValues(p => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full-song">Full Song</SelectItem>
                <SelectItem value="audition-cut">Audition Cut</SelectItem>
                <SelectItem value="note-bash">Note Bash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Track Type</Label>
            <Select value={values.track_type} onValueChange={(v) => setValues(p => ({ ...p, track_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="polished">Polished</SelectItem>
                <SelectItem value="one-take">One-Take</SelectItem>
                <SelectItem value="quick">Quick Ref</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <Label className="text-lg font-bold mb-4 block">Tracks & Media</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileInput 
            id="img" label="Cover Image" icon={UploadCloud} accept="image/*" 
            onChange={(f) => setImageFile(f ? f[0] : null)} 
          />
          <FileInput 
            id="pdf" label="Sheet Music PDF" icon={FileText} accept=".pdf" 
            onChange={(f) => setSheetMusicFile(f ? f[0] : null)} 
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="font-bold">Audio Tracks</Label>
          <Button variant="outline" size="sm" onClick={() => setValues(p => ({ ...p, track_urls: [...p.track_urls, { url: null, caption: '', selected: true, file: null }] }))}>
            <PlusCircle className="w-4 h-4 mr-2" /> Add Track
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {values.track_urls.map((track, i) => (
            <Card key={i} className="p-4 space-y-3 bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-gray-400">Track {i + 1}</span>
                <Button variant="ghost" size="sm" onClick={() => setValues(p => ({ ...p, track_urls: p.track_urls.filter((_, idx) => idx !== i) }))}>
                  <MinusCircle className="w-4 h-4 text-red-500" />
                </Button>
              </div>
              <Input placeholder="Caption (e.g. Full Mix)" value={track.caption as string} onChange={(e) => handleTrackChange(i, 'caption', e.target.value)} />
              <Input type="file" accept="audio/*" onChange={(e) => handleTrackChange(i, 'file', e.target.files ? e.target.files[0] : null)} />
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <Button onClick={() => validate() && onSubmit(values, imageFile, sheetMusicFile)} disabled={isSubmitting} className="bg-[#1C0357]">
          {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <PlusCircle className="mr-2" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};

export default ProductForm;