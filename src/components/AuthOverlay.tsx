"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Mail, 
  UserPlus, 
  History, 
  FormInput, 
  ShieldCheck,
  Chrome
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthOverlay = ({ isOpen, onClose }: AuthOverlayProps) => {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/form'
      }
    });
  };

  const handleEmailSignIn = () => {
    navigate('/auth');
  };

  const benefits = [
    {
      title: "View Status",
      description: "Always know if your request went through and its progress.",
      icon: ShieldCheck
    },
    {
      title: "Manage Orders",
      description: "View and download all past and current orders in your 'My Tracks'.",
      icon: History
    },
    {
      title: "Pre-fill Forms",
      description: "Save your name and email for future quick requests.",
      icon: FormInput
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none rounded-3xl bg-[#FDFCF7]">
        <div className="bg-[#1C0357] p-8 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:20px_20px]"></div>
          </div>
          
          <Button 
            onClick={handleGoogleSignIn}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 h-12 rounded-full font-bold shadow-lg flex items-center justify-center gap-3 mb-4 transition-transform active:scale-95"
          >
            <Chrome className="w-5 h-5 text-[#4285F4]" />
            Sign In with Google
          </Button>
          
          <h2 className="text-xl font-bold tracking-tight">Track Your Order Securely</h2>
        </div>

        <div className="p-8">
          <p className="text-gray-600 text-sm font-medium mb-6 leading-relaxed">
            Don't lose track of your request! By signing in or creating an account, you can:
          </p>

          <div className="space-y-6 mb-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#D1AAF2]/20 flex items-center justify-center text-[#1C0357]">
                  <benefit.icon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1C0357]">{benefit.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleEmailSignIn}
              variant="outline"
              className="w-full border-2 border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357] hover:text-white h-12 rounded-full font-bold transition-all"
            >
              <Mail className="w-4 h-4 mr-2" />
              Sign In with Email
            </Button>
            
            <button 
              onClick={onClose}
              className="text-xs text-gray-400 font-bold hover:text-gray-600 transition-colors py-2"
            >
              Continue Anonymously
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthOverlay;