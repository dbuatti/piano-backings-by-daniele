"use client";

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Lock, Edit, UserPlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Import supabase

interface AccountPromptCardProps {
  onDismiss?: () => void;
}

const AccountPromptCard: React.FC<AccountPromptCardProps> = ({ onDismiss }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true); // To prevent flickering

  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsSignedIn(!!session);
      setLoadingAuth(false);
    };

    checkAuthStatus();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  if (loadingAuth) {
    return null; // Or a loading spinner if preferred, while auth status is being checked
  }

  if (isSignedIn) {
    return null; // Don't show the card if the user is signed in
  }

  return (
    <Card className="shadow-lg mb-6 bg-[#1C0357] text-white border-[#1C0357] relative">
      {onDismiss && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 text-white/70 hover:bg-white/20 hover:text-white"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      )}
      <CardContent className="p-6 text-center">
        <h3 className="text-2xl font-bold mb-4 flex items-center justify-center">
          <UserPlus className="mr-3 h-6 w-6" />
          Why Create an Account?
        </h3>
        <p className="text-lg mb-6 max-w-2xl mx-auto opacity-90">
          Enhance your experience with Piano Backings by Daniele.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="flex flex-col items-center">
            <Eye className="h-10 w-10 mb-3 text-[#F538BC]" />
            <h4 className="text-lg font-semibold mb-1">Track Your Orders</h4>
            <p className="text-sm opacity-80">View the status of all your requests in one convenient dashboard.</p>
          </div>
          <div className="flex flex-col items-center">
            <Lock className="h-10 w-10 mb-3 text-[#F538BC]" />
            <h4 className="text-lg font-semibold mb-1">Secure Access</h4>
            <p className="text-sm opacity-80">Download your tracks anytime, from any device, with a secure login.</p>
          </div>
          <div className="flex flex-col items-center">
            <Edit className="h-10 w-10 mb-3 text-[#F538BC]" />
            <h4 className="text-lg font-semibold mb-1">Manage Requests</h4>
            <p className="text-sm opacity-80">Easily review and update your order details after submission.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/login">
            <Button size="lg" className="bg-white text-[#1C0357] hover:bg-gray-200 text-base px-6 py-3">
              Create Your Free Account
            </Button>
          </Link>
          <Link to="/form-page"> {/* Changed to navigate to /form-page */}
            <Button 
              variant="ghost" 
              size="lg" 
              className="bg-transparent border border-white text-white hover:bg-white/10 text-base px-6 py-3"
            >
              Order Track Anonymously
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountPromptCard;