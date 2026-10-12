"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { initiateYouTubeOAuth } from '@/utils/gmailOAuth';

const YouTubeOAuthButton: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleInitiate = () => {
    setIsLoading(true);
    try {
      initiateYouTubeOAuth();
    } catch (error) {
      console.error('Error initiating YouTube OAuth:', error);
      toast({
        title: "Error",
        description: "Failed to start the YouTube connection. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleInitiate}
      disabled={isLoading}
      className="bg-red-600 hover:bg-red-700"
    >
      {isLoading ? 'Redirecting...' : 'Connect YouTube Channel'}
    </Button>
  );
};

export default YouTubeOAuthButton;
