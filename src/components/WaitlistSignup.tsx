import React, { useState } from 'react';
import { BellRing, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** "Tell me when orders reopen" signup, shown while custom orders are closed. */
const WaitlistSignup: React.FC<{ className?: string; source?: string }> = ({ className, source = 'orders-closed' }) => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('saving');
    const { error: rpcError } = await supabase.rpc('join_waitlist', { p_email: email, p_name: null, p_source: source });
    if (rpcError) {
      setError(rpcError.message.includes('valid email') ? 'Please enter a valid email address.' : "Sorry, that didn't work. Please try again.");
      setState('error');
      return;
    }
    setState('done');
  };

  if (state === 'done') {
    return (
      <p role="status" className={cn('flex items-center justify-center gap-2 font-bold text-[#1C0357]', className)}>
        <Check className="h-5 w-5 text-[#F538BC]" /> You're on the list. I'll email you as soon as orders reopen.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={cn('w-full max-w-md', className)}>
      <label htmlFor="waitlist-email" className="flex items-center gap-2 text-sm font-black text-[#1C0357]">
        <BellRing className="h-4 w-4 text-[#F538BC]" /> Tell me when orders reopen
      </label>
      <div className="mt-2 flex gap-2">
        <Input
          id="waitlist-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white"
        />
        <Button type="submit" disabled={state === 'saving'} className="bg-[#F538BC] hover:bg-[#F538BC]/90 font-black text-white shrink-0">
          {state === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Notify me'}
        </Button>
      </div>
      {state === 'error' && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </form>
  );
};

export default WaitlistSignup;
