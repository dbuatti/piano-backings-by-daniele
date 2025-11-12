import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { showError } from "@/utils/toast";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail } from 'lucide-react';

interface GmailOAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
  buttonText?: string;
  redirectPath?: string; // Optional redirect path
}

const GmailOAuthButton: React.FC<GmailOAuthButtonProps> = ({
  onSuccess,
  onError,
  buttonText = "Connect Gmail",
  redirectPath = "/admin", // Default redirect to admin dashboard
}) => {
  const [loading, setLoading] = useState(false);