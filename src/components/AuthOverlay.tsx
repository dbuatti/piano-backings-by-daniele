"use client";

import React, { useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShieldCheck, History, ClipboardList, Mail, ArrowLeft } from 'lucide-react';
import VisuallyHidden from '@/components/VisuallyHidden';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ isOpen, onClose, redirectPath }) => {
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  
  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectPath || '/user-dashboard'}`,
      },
    });
  };

  const handleContinueAnonymously = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 rounded-[32px] bg-white shadow-2xl border-none overflow-hidden relative">
        {/* Absolute positioned Back Button - Only visible when in email auth view */}
        {showEmailAuth && (
          <button 
            onClick={() => setShowEmailAuth(false)} 
            className="absolute top-6 left-6 text-gray-400 hover:text-[#1C0357] flex items-center space-x-1.5 font-bold text-xs transition-colors z-50"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        )}

        {/* Consistent Header structure to prevent focus loops during state swaps */}
        <DialogHeader className={showEmailAuth ? "p-8 pb-4 text-center" : "sr-only"}>
          <DialogTitle className="text-3xl font-black text-[#1C0357] tracking-tight">
            {showEmailAuth ? "Sign In" : "Authentication Options"}
          </DialogTitle>
          <DialogDescription className="text-gray-500 font-medium text-sm mt-1">
            {showEmailAuth ? "Enter your details to access your account." : "Choose how you want to sign in or continue."}
          </DialogDescription>
        </DialogHeader>

        {!showEmailAuth ? (
          <div className="flex flex-col items-center">
            <div className="w-full bg-[#1C0357] text-white p-8 pb-16 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff33 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
              <div className="relative z-10 flex flex-col items-center space-y-6">
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full max-w-xs bg-white text-[#1C0357] py-3.5 px-6 rounded-2xl flex items-center justify-center space-x-3 font-black shadow-lg hover:bg-gray-50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google icon" className="w-5 h-5" />
                  <span>Sign In with Google</span>
                </button>
                <h2 className="text-3xl font-black tracking-tight text-center">Track Your Order Securely</h2>
              </div>
            </div>

            <div className="w-full p-8 pt-12 bg-white -mt-8 relative z-20 rounded-t-[32px]">
              <p className="text-gray-600 text-center font-medium mb-8">
                Don't lose track of your request! By signing in or creating an account, you can:
              </p>

              <div className="space-y-6 mb-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#D1AAF2]/20 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="text-[#1C0357]" size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-[#1C0357]">View Status</h3>
                    <p className="text-gray-500 text-sm font-medium">Always know if your request went through and its progress.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#D1AAF2]/20 rounded-xl flex items-center justify-center">
                    <History className="text-[#1C0357]" size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-[#1C0357]">Manage Orders</h3>
                    <p className="text-gray-500 text-sm font-medium">View and download all past and current orders in your 'My Tracks'.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#D1AAF2]/20 rounded-xl flex items-center justify-center">
                    <ClipboardList className="text-[#1C0357]" size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-[#1C0357]">Pre-fill Forms</h3>
                    <p className="text-gray-500 text-sm font-medium">Save your name and email for future quick requests.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowEmailAuth(true)}
                className="w-full bg-[#1C0357] text-white py-4 px-6 rounded-2xl flex items-center justify-center space-x-2 font-black shadow-lg hover:bg-[#2a067a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 mb-4"
              >
                <Mail className="w-5 h-5" />
                <span>Sign In with Email</span>
              </button>

              <button
                onClick={handleContinueAnonymously}
                className="w-full text-gray-400 text-sm font-bold hover:text-gray-600 transition-colors"
              >
                Continue Anonymously
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 pt-0">
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
                    link_text: 'Already have an account? Sign In',
                  },
                  sign_up: {
                    email_label: 'Email Address',
                    password_label: 'Create a Password',
                    email_input_placeholder: 'Your email address',
                    password_input_placeholder: 'Your password',
                    button_label: 'Sign Up',
                    link_text: 'Don\'t have an account? Sign Up',
                  },
                },
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthOverlay;