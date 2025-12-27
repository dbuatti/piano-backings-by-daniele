"use client";

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  History,
  FormInput,
  ShieldCheck,
  Chrome,
  Mail
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string; // Optional dynamic redirect after sign-in
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ isOpen, onClose, redirectPath = '/user-dashboard' }) => {
  const navigate = useNavigate();

  // Listen for auth changes: close overlay and redirect on successful sign-in
  React.useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        onClose();
        navigate(redirectPath);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [onClose, navigate, redirectPath]);

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

          <h2 className="text-xl font-bold tracking-tight mb-6">Track Your Order Securely</h2>

          {/* Integrated Supabase Auth UI (replaces manual Google button but keeps style) */}
          <div className="relative z-10">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#1C0357',
                      brandAccent: '#D1AAF2',
                    },
                  },
                },
                style: {
                  button: { borderRadius: '9999px', height: '48px', fontWeight: 'bold' },
                  container: { width: '100%' },
                },
              }}
              providers={['google']}
              redirectTo={`${window.location.origin}${redirectPath}`}
              onlyThirdPartyProviders={true} // Only show Google button here
              view="sign_in" // Start with sign-in (magic link available)
              magicLink={true}
            />
          </div>
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
            {/* Full Auth UI for email/password/magic link/signup */}
            <div className="bg-white rounded-2xl p-6 shadow-inner border border-gray-100">
              <DialogHeader className="text-center mb-4 hidden">
                <DialogTitle className="text-xl font-bold text-[#1C0357]">Sign In / Sign Up</DialogTitle>
              </DialogHeader>
              <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                providers={[]} // No social here to avoid duplication
                redirectTo={`${window.location.origin}${redirectPath}`}
                magicLink={true}
                localization={{
                  variables: {
                    sign_in: { button_label: 'Sign In' },
                    sign_up: { button_label: 'Sign Up' },
                    magic_link: { button_label: 'Send Magic Link' },
                  },
                }}
              />
            </div>

            <button
              onClick={onClose}
              className="text-xs text-gray-400 font-bold hover:text-gray-600 transition-colors py-2 text-center"
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