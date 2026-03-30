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
      <DialogContent className="max-w-lg p-0 rounded-2xl bg-white shadow-xl border-none overflow-hidden">
        {/* Consistent Header structure to prevent focus loops during state swaps */}
        <DialogHeader className={showEmailAuth ? "p-6 text-center" : "sr-only"}>
          <DialogTitle className="text-2xl font-bold text-[#1C0357]">
            {showEmailAuth ? "Sign In with Email" : "Authentication Options"}
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm">
            {showEmailAuth ? "Enter your email to sign in or create an account." : "Choose how you want to sign in or continue."}
          </DialogDescription>
        </DialogHeader>

        {!showEmailAuth ? (
          <div className="flex flex-col items-center">
            <div className="w-full bg-[#1C0357] text-white p-8 pb-16 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff33 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
              <div className="relative z-10 flex flex-col items-center space-y-6">
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full max-w-xs bg-white text-[#1C0357] py-3 px-6 rounded-full flex items-center justify-center space-x-2 font-semibold shadow-md hover:bg-gray-100 transition-colors"
                >
                  <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google icon" className="w-5 h-5" />
                  <span>Sign In with Google</span>
                </button>
                <h2 className="text-2xl font-bold mt-8">Track Your Order Securely</h2>
              </div>
            </div>

            <div className="w-full p-8 pt-12 bg-white -mt-8 relative z-20">
              <p className="text-gray-700 text-center mb-8">
                Don't lose track of your request! By signing in or creating an account, you can:
              </p>

              <div className="space-y-6 mb-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#F0EBFB] rounded-lg flex items-center justify-center">
                    <ShieldCheck className="text-[#1C0357]" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-[#1C0357]">View Status</h3>
                    <p className="text-gray-600 text-sm">Always know if your request went through and its progress.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#F0EBFB] rounded-lg flex items-center justify-center">
                    <History className="text-[#1C0357]" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-[#1C0357]">Manage Orders</h3>
                    <p className="text-gray-600 text-sm">View and download all past and current orders in your 'My Tracks'.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#F0EBFB] rounded-lg flex items-center justify-center">
                    <ClipboardList className="text-[#1C0357]" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-[#1C0357]">Pre-fill Forms</h3>
                    <p className="text-gray-600 text-sm">Save your name and email for future quick requests.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowEmailAuth(true)}
                className="w-full bg-[#1C0357] text-white py-3 px-6 rounded-full flex items-center justify-center space-x-2 font-semibold shadow-md hover:bg-[#2a067a] transition-colors mb-4"
              >
                <Mail className="w-5 h-5" />
                <span>Sign In with Email</span>
              </button>

              <button
                onClick={handleContinueAnonymously}
                className="w-full text-gray-500 text-sm hover:underline"
              >
                Continue Anonymously
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 pt-0">
            <button onClick={() => setShowEmailAuth(false)} className="mb-4 text-gray-500 hover:text-gray-700 flex items-center space-x-2">
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={[]}
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