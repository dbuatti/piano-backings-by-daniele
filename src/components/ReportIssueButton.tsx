"use client";

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Loader2, Send } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Zod schema for form validation
const issueReportSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  issue_description: z.string().min(10, { message: "Description must be at least 10 characters." }),
});

type IssueReportFormValues = z.infer<typeof issueReportSchema>;

const ReportIssueButton: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize react-hook-form
  const form = useForm<IssueReportFormValues>({
    resolver: zodResolver(issueReportSchema),
    defaultValues: {
      email: '',
      issue_description: '',
    },
  });

  // Fetch user session to pre-fill email and get user_id
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);
        form.setValue('email', session.user.email || '');
      } else {
        setUserEmail('');
        setUserId(null);
        form.setValue('email', '');
      }
    };
    fetchUser();
  }, [form, dialogOpen]); // Refetch when dialog opens to ensure latest session

  // Mutation for submitting the issue report
  const submitIssueMutation = useMutation({
    mutationFn: async (values: IssueReportFormValues) => {
      const { data, error } = await supabase
        .from('issue_reports')
        .insert({
          user_id: userId, // Will be null if anonymous
          email: values.email,
          issue_description: values.issue_description,
          page_url: location.pathname + location.search,
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Issue Reported",
        description: "Thank you for your feedback! We'll look into it.",
      });
      setDialogOpen(false);
      form.reset(); // Reset form fields
      queryClient.invalidateQueries({ queryKey: ['unreadIssueReportsCount'] }); // Invalidate unread count
      queryClient.invalidateQueries({ queryKey: ['allIssueReports'] }); // Invalidate all reports for admin dashboard
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to submit report: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: IssueReportFormValues) => {
    submitIssueMutation.mutate(values);
  };

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        className="fixed bottom-6 right-6 rounded-full p-4 shadow-lg bg-[#F538BC] hover:bg-[#F538BC]/90 text-white z-50"
        size="icon"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="sr-only">Report Issue</span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Report an Issue or Give Feedback
            </DialogTitle>
            <DialogDescription>
              Found a bug or have a suggestion? Let us know!
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                {...form.register("email")}
                className="col-span-3"
                placeholder="your.email@example.com"
                disabled={!!userEmail} // Disable if pre-filled by logged-in user
              />
              {form.formState.errors.email && (
                <p className="col-span-4 text-right text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="issue_description" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="issue_description"
                {...form.register("issue_description")}
                className="col-span-3 min-h-[100px]"
                placeholder="Describe the issue or your feedback here..."
              />
              {form.formState.errors.issue_description && (
                <p className="col-span-4 text-right text-sm text-red-500">
                  {form.formState.errors.issue_description.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="page_url" className="text-right">
                Page URL
              </Label>
              <Input
                id="page_url"
                value={location.pathname + location.search}
                className="col-span-3 text-xs text-gray-500"
                readOnly
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitIssueMutation.isPending} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
                {submitIssueMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Report
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportIssueButton;