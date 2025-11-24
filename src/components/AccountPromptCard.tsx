"use client";

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Lock, Edit, UserPlus, X, Key, Loader2, Chrome } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AccountPromptCardProps {
  onDismiss?: () => void;
  isHolidayModeActive: boolean;
  isLoadingHolidayMode: boolean;
}

const AccountPromptCard: React.FC<AccountPromptCardProps> = ({ onDismiss, isHolidayModeActive, isLoadingHolidayMode }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);
  const { toast } = useToast();

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

  const handleGoogleSignIn = async () => {
    setIsSigningInWithGoogle(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/user-dashboard`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      toast({
        title: "Sign In Error",
        description: `Failed to sign in with Google: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSigningInWithGoogle(false);
    }
  };

  if (loadingAuth) {
    return null;
  }

  if (isSignedIn) {
    return null;
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
        {/* New Google Sign-in Button */}
        <Button
          onClick={handleGoogleSignIn}
          disabled={isSigningInWithGoogle || isHolidayModeActive || isLoadingHolidayMode}
          className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-3 mb-6 w-full flex items-center justify-center"
        >
          {isSigningInWithGoogle ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing In...
            </>
          ) : (
            <>
              <Chrome className="mr-2 h-5 w-5" /> Sign In with Google
            </>
          )}
        </Button>

        <h3 className="text-2xl font-bold mb-4 flex items-center justify-center">
          <Key className="mr-3 h-6 w-6" />
          Track Your Order Securely
        </h3>
        <p className="text-lg mb-6 max-w-2xl mx-auto opacity-90">
          Don't lose track of your request! By signing in or creating an account, you can:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="flex flex-col items-center">
            <Eye className="h-10 w-10 mb-3 text-[#F538BC]" />
            <h4 className="text-lg font-semibold mb-1">View Status</h4>
            <p className="text-sm opacity-80">Always know if your request went through and its progress.</p>
          </div>
          <div className="flex flex-col items-center">
            <Lock className="h-10 w-10 mb-3 text-[#F538BC]" />
            <h4 className="text-lg font-semibold mb-1">Manage Orders</h4>
            <p className="text-sm opacity-80">View and download all past and current orders in your "My Tracks."</p>
          </div>
          <div className="flex flex-col items-center">
            <UserPlus className="h-10 w-10 mb-3 text-[#F538BC]" />
            <h4 className="text-lg font-semibold mb-1">Pre-fill Forms</h4>
            <p className="text-sm opacity-80">Save your name and email for future quick requests.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {/* Changed button text */}
          <Link to="/login">
            <Button size="lg" className="bg-white text-[#1C0357] hover:bg-gray-200 text-base px-6 py-3">
              Sign In with Email
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="lg" 
            className="bg-transparent border border-white text-white hover:bg-white/10 text-base px-6 py-3"
            onClick={onDismiss}
            disabled={isHolidayModeActive || isLoadingHolidayMode}
          >
            {isLoadingHolidayMode ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
              </>
            ) : (
              'Continue Anonymously'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountPromptCard;