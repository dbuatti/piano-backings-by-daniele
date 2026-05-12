"use client";

import React from 'react';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mic, Headphones, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";

interface TierSelectionProps {
  value: string;
  onValueChange: (value: string) => void;
}

const tiers = [
  { id: 'note-bash', icon: Mic, label: 'Note Bash', price: '$15' },
  { id: 'audition-ready', icon: Headphones, label: 'Audition Ready', price: '$30' },
  { id: 'full-song', icon: Sparkles, label: 'Full Song', price: '$50' }
];

const TierSelection: React.FC<TierSelectionProps> = ({ value, onValueChange }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#1C0357] flex items-center gap-2">
        <Sparkles size={20} /> Choose Your Tier
      </h2>
      <RadioGroup 
        value={value} 
        onValueChange={onValueChange} 
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {tiers.map((item) => (
          <Label 
            key={item.id} 
            htmlFor={item.id} 
            className={cn(
              "cursor-pointer p-6 rounded-3xl border-2 text-center transition-all hover:border-[#D1AAF2]",
              value === item.id ? "border-[#1C0357] bg-[#1C0357]/5" : "border-gray-100 bg-white"
            )}
          >
            <RadioGroupItem id={item.id} value={item.id} className="sr-only" />
            <item.icon className="h-6 w-6 mx-auto mb-2 text-[#F538BC]" />
            <span className="font-black block">{item.label}</span>
            <span className="text-xs font-bold text-[#F538BC]">{item.price}</span>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
};

export default TierSelection;