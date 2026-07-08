"use client";

import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Zap } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AdditionalServicesProps {
  selectedServices: string[];
  onToggleService: (serviceId: string) => void;
}

const paidServices = [
  { id: 'rush-order', label: 'Rush Order (24h)', price: '+$15' },
  { id: 'complex-songs', label: 'Complex Score (Sondheim, JRB, Guettel)', price: '+$10' },
  { id: 'additional-edits', label: 'Additional Edits', price: '+$5' },
  { id: 'exclusive-ownership', label: 'Exclusive Ownership', price: '+$40' }
];

const freeOptions = [
  { id: 'asap', label: 'As soon as humanly possible', price: 'Free' }
];

const AdditionalServices: React.FC<AdditionalServicesProps> = ({
  selectedServices,
  onToggleService
}) => {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#1C0357] flex items-center gap-2">
          <Zap size={20} /> Additional Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {paidServices.map((service) => {
            const isSelected = selectedServices.includes(service.id);
            return (
              <label 
                key={service.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  isSelected 
                    ? "border-[#1C0357] bg-[#1C0357]/5" 
                    : "border-gray-100 hover:border-gray-200 bg-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={isSelected} 
                    onCheckedChange={() => onToggleService(service.id)}
                  />
                  <span className="font-bold text-sm">{service.label}</span>
                </div>
                <span className="text-xs font-black text-[#F538BC]">{service.price}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Timing Preferences</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {freeOptions.map((service) => {
            const isSelected = selectedServices.includes(service.id);
            return (
              <label 
                key={service.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all",
                  isSelected 
                    ? "border-[#1C0357] bg-[#1C0357]/5" 
                    : "border-gray-200 hover:border-gray-300 bg-gray-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={isSelected} 
                    onCheckedChange={() => onToggleService(service.id)}
                  />
                  <span className="font-bold text-sm">{service.label}</span>
                </div>
                <span className="text-xs font-black text-green-600">{service.price}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdditionalServices;