"use client";

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { MessageSquare } from 'lucide-react';

const ReportIssueDialog = lazy(() => import('./ReportIssueDialog'));

const ReportIssueButton: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  useEffect(() => {
    if (dialogOpen) setHasOpened(true);
  }, [dialogOpen]);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const lastHandledOpenFeedback = useRef<string | null>(null);

  useEffect(() => {
    const openFeedback = searchParams.get('openFeedback');
    if (openFeedback === 'true' && lastHandledOpenFeedback.current !== 'true') {
      lastHandledOpenFeedback.current = 'true';
      setDialogOpen(true);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.delete('openFeedback');
        return params;
      }, { replace: true });
    } else if (openFeedback !== 'true') {
      lastHandledOpenFeedback.current = openFeedback;
    }
  }, [searchParams, setSearchParams]);

  if (location.pathname.startsWith('/admin')) return null;

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        className="fixed bottom-6 right-6 shadow-lg bg-[#F538BC] hover:bg-[#F538BC]/90 text-white z-50 rounded-lg"
      >
        <MessageSquare className="mr-2 h-5 w-5" />
        Report an Issue
      </Button>

      {/* Mounted from the first open onwards, so it keeps its close animation. */}
      {hasOpened && (
        <Suspense fallback={null}>
          <ReportIssueDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </Suspense>
      )}
    </>
  );
};

export default ReportIssueButton;