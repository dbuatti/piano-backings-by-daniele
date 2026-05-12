"use client";

import React from 'react';
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onValueChange(item.id)}
            className={cn(
              "flex flex-col items-center justify-center cursor-pointer p-6 rounded-3xl border-2 text-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#F538BC] focus-visible:ring-offset-2",
              value === item.id 
                ? "border-[#1C0357] bg-[#1C0357]/5 shadow-inner" 
                : "border-gray-100 bg-white hover:border-[#D1AAF2] hover:bg-gray-50/50"
            )}
          >
            <item.icon className={cn(
              "h-6 w-6 mb-2 transition-colors",
              value === item.id ? "text-[#F538BC]" : "text-gray-400"
            )} />
            <span className="font-black block text-[#1C0357]">{item.label}</span>
            <span className="text-xs font-bold text-[#F538BC]">{item.price}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TierSelection;