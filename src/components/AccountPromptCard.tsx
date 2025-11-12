import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client'; // Import supabase
import { showError } from '@/utils/toast'; // Import showError for error handling
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface AccountPromptCardProps {
  title: string;
  description: string;
  buttonText: string;
  redirectPath: string;
  onAction?: () => void;
}

const AccountPromptCard: React.FC<AccountPromptCardProps> = ({
  title,
  description,
  buttonText,
  redirectPath,
  onAction,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handleAction = async () => {
    if (onAction) {
      onAction();
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + redirectPath,
        },
      });

      if (error) {
        showError(`Error: ${error.message}`); // Updated toast call
      }
    } catch (error: any) {
      showError(`Error: ${error.message}`); // Updated toast call
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-[#1C0357]">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleAction} className="w-full bg-[#F538BC] hover:bg-[#F538BC]/90 text-white" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            buttonText
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AccountPromptCard;