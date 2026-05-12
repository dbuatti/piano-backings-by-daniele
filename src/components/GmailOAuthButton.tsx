"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { initiateOAuth } from '@/utils/gmailOAuth';

const GmailOAuthButton: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleInitiate = () => {
    setIsLoading(true);
    try {
      initiateOAuth();
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      toast({
        title: "Error",
        description: "Failed to initiate Gmail OAuth. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleInitiate} 
      disabled={isLoading}
      className="bg-blue-500 hover:bg-blue-600"
    >
      {isLoading ? 'Redirecting...' : 'Connect Gmail Account'}
    </Button>
  );
};

export default GmailOAuthButton;