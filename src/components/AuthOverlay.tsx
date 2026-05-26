"use client";

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ShieldCheck, History, ClipboardList, Sparkles, X } from 'lucide-react';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ isOpen, onClose, redirectPath }) => {
  const handleContinueAnonymously = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 rounded-[32px] bg-white shadow-2xl border-none overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[550px]">
          
          {/* Left Column: Value Proposition Sidebar (Hidden on mobile) */}
          <div className="hidden md:flex md:col-span-5 bg-[#1C0357] text-white p-8 flex-col justify-between relative overflow-hidden">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff33 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#F538BC]/10 blur-3xl rounded-full"></div>
            
            <div className="relative z-10 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/10">
                <Sparkles size={12} className="text-[#F1E14F]" />
                <span>Premium Accompaniment</span>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight leading-tight">
                  Track Your <br />
                  <span className="text-[#F538BC]">Order Securely</span>
                </h2>
                <p className="text-sm text-purple-200 font-medium">
                  Create an account in seconds to unlock full access to your custom tracks.
                </p>
              </div>

              <div className="space-y-6 pt-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-[#F538BC]">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Real-time Status</h3>
                    <p className="text-xs text-purple-200/80 font-medium">Monitor your track's progress from pending to complete.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-[#F538BC]">
                    <History size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">My Tracks Library</h3>
                    <p className="text-xs text-purple-200/80 font-medium">Access and download all past and current orders anytime.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-[#F538BC]">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Pre-fill Forms</h3>
                    <p className="text-xs text-purple-200/80 font-medium">Save your details to speed up future requests.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 text-xs text-purple-300/60 font-medium">
              © {new Date().getFullYear()} Piano Backings by Daniele
            </div>
          </div>

          {/* Right Column: Unified Authentication Form */}
          <div className="col-span-1 md:col-span-7 p-8 md:p-12 flex flex-col justify-between relative bg-white">
            {/* Close button for mobile */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <X size={20} />
            </button>

            <div className="space-y-6 my-auto">
              <div className="space-y-1.5">
                <h3 className="text-2xl md:text-3xl font-black text-[#1C0357] tracking-tight">
                  Sign In or Sign Up
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  Use Google for instant access, or enter your email details below.
                </p>
              </div>

              <div className="auth-container">
                <Auth
                  supabaseClient={supabase}
                  appearance={{ 
                    theme: ThemeSupa,
                    variables: {
                      default: {
                        colors: {
                          brand: '#1C0357',
                          brandAccent: '#F538BC',
                          brandButtonText: 'white',
                          defaultButtonBackground: 'white',
                          defaultButtonBackgroundHover: '#f9fafb',
                          defaultButtonBorder: '#e5e7eb',
                          inputBackground: 'white',
                          inputBorder: '#e5e7eb',
                          inputBorderFocus: '#1C0357',
                          inputBorderHover: '#D1AAF2',
                        },
                        radii: {
                          borderRadiusButton: '16px',
                          buttonBorderRadius: '16px',
                          inputBorderRadius: '16px',
                        }
                      }
                    }
                  }}
                  providers={['google']}
                  redirectTo={`${window.location.origin}${redirectPath || '/user-dashboard'}`}
                  magicLink={true}
                  localization={{
                    variables: {
                      sign_in: {
                        email_label: 'Email Address',
                        password_label: 'Password',
                        email_input_placeholder: 'Your email address',
                        password_input_placeholder: 'Your password',
                        button_label: 'Sign In',
                        social_provider_text: 'Sign In with {{provider}}',
                        link_text: 'Already have an account? Sign In',
                      },
                      sign_up: {
                        email_label: 'Email Address',
                        password_label: 'Create a Password',
                        email_input_placeholder: 'Your email address',
                        password_input_placeholder: 'Your password',
                        button_label: 'Sign Up',
                        social_provider_text: 'Sign Up with {{provider}}',
                        link_text: 'Don\'t have an account? Sign Up',
                      },
                    },
                  }}
                />
              </div>
            </div>

            <div className="pt-6 text-center border-t border-gray-100 mt-6">
              <button
                onClick={handleContinueAnonymously}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold tracking-wider uppercase transition-colors"
              >
                Continue Anonymously
              </button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthOverlay;