import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  artist: z.string().min(1, { message: "Artist is required." }),
  url: z.string().url({ message: "Invalid URL." }),
});

const TestBackings: React.FC = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      artist: "",
      url: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { data, error } = await supabase
        .from('backing_tracks')
        .insert([
          { title: values.title, artist: values.artist, url: values.url }
        ])
        .select();

      if (error) throw error;

      showSuccess("Backing track added! The track has been successfully added to the database.");
      form.reset();
    } catch (error: any) {
      console.error("Error adding backing track:", error);
      showError(`Error adding track: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-[#1C0357] mb-6 text-center">Add Test Backing Track</h1>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist">Artist</Label>
              <Input id="artist" {...form.register("artist")} />
              {form.formState.errors.artist && (
                <p className="text-red-500 text-sm">{form.formState.errors.artist.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input id="url" {...form.register("url")} />
              {form.formState.errors.url && (
                <p className="text-red-500 text-sm">{form.formState.errors.url.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Track"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TestBackings;