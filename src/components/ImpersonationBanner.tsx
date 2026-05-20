"use client";

import React, { useState, useEffect } from 'react';
import { getImpersonatedUser, clearImpersonatedUser } from '@/utils/impersonation';
import { EyeOff, User, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ImpersonationBanner: React.FC = () => {
  const [impersonatedUser, setImpersonatedUser] = useState(getImpersonatedUser());

  useEffect(() => {
    const handleImpersonationChange = () => {
      setImpersonatedUser(getImpersonatedUser());
    };

    window.addEventListener('impersonation_change', handleImpersonationChange);
    return () => {
      window.removeEventListener('impersonation_change', handleImpersonationChange);
    };
  }, []);

  if (!impersonatedUser) return null;

  const handleStopImpersonating = () => {
    clearImpersonatedUser();
    window.location.reload();
  };

  return (
    <div className="bg-amber-500 text-white py-2 px-4 text-center font-bold text-sm flex items-center justify-center gap-4 z-[100] relative shadow-md animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 animate-pulse" />
        <span>
          Viewing as: <strong className="underline">{impersonatedUser.name}</strong> ({impersonatedUser.email})
        </span>
      </div>
      <Button 
        onClick={handleStopImpersonating}
        size="sm"
        variant="secondary"
        className="bg-white text-amber-600 hover:bg-amber-50 font-black rounded-full h-8 px-4 flex items-center gap-1.5 shadow-sm"
      >
        <EyeOff size={14} />
        Stop Impersonating
      </Button>
    </div>
  );
};

export default ImpersonationBanner;