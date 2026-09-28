"use client";

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

const ReportIssueDialog = lazy(() => import('./ReportIssueDialog'));

const ReportIssueButton: React.FC<{ className?: string }> = ({ className }) => {
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

  // Lives in the footer (it used to float over the page and covered Buy buttons).
  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className={className ?? "inline-flex items-center gap-1.5 hover:text-white transition-colors uppercase"}
      >
        <MessageSquare className="h-3 w-3" aria-hidden="true" />
        Report an issue
      </button>

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