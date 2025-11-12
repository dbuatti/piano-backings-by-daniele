import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Send } from "lucide-react";
import Header from "@/components/Header";
import { showSuccess, showError } from "@/utils/toast";
import { supabase, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useHolidayMode } from "@/hooks/useHolidayMode";
import HolidayModeBanner from "@/components/HolidayModeBanner";
import AccountPromptCard from "@/components/AccountPromptCard";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  song_title: z.string().min(1, { message: "Song title is required." }),
  musical_or_artist: z.string().min(1, { message: "Musical/Artist is required." }),
  backing_type: z.array(z.string()).min(1, { message: "Please select at least one backing type." }),
  delivery_date: z.date().optional(),
  special_requests: z.string().optional(),
  youtube_link: z.string().url({ message: "Invalid YouTube link." }).optional().or(z.literal('')),
  additional_links: z.string().optional(),
  is_paid: z.boolean().default(false).optional(),
  track_purpose: z.string().optional(),
  additional_services: z.array(z.string()).optional(),
  sheet_music_url: z.string().url({ message: "Invalid sheet music URL." }).optional().or(z.literal('')),
  song_key: z.string().optional(),
  track_type: z.string().optional(),
  category: z.string().optional(),
});

const FormPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const { isHolidayModeActive, holidayModeReturnDate } = useHolidayMode();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      song_title: "",
      musical_or_artist: "",
      backing_type: [],
      delivery_date: undefined,
      special_requests: "",
      youtube_link: "",
      additional_links: "",
      is_paid: false,
      track_purpose: "",
      additional_services: [],
      sheet_music_url: "",
      song_key: "",
      track_type: "",
      category: "",
    },
  });

  useEffect(() => {
    const fetchUser = async () => {
      setLoadingUser(true);
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        form.setValue("name", session.user.user_metadata.full_name || "");
        form.setValue("email", session.user.email || "");
      }
      setLoadingUser(false);
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        form.setValue("name", session.user.user_metadata.full_name || "");
        form.setValue("email", session.user.email || "");
      } else {
        form.reset({
          name: "",
          email: "",
          song_title: "",
          musical_or_artist: "",
          backing_type: [],
          delivery_date: undefined,
          special_requests: "",
          youtube_link: "",
          additional_links: "",
          is_paid: false,
          track_purpose: "",
          additional_services: [],
          sheet_music_url: "",
          song_key: "",
          track_type: "",
          category: "",
        });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isHolidayModeActive) {
      showError(`Holiday Mode Active: New requests cannot be submitted while holiday mode is active. We expect to return by ${holidayModeReturnDate ? format(holidayModeReturnDate, 'PPP') : 'a later date'}.`);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("backing_requests")
        .insert([
          {
            user_id: user?.id || null,
            name: values.name,
            email: values.email,
            song_title: values.song_title,
            musical_or_artist: values.musical_or_artist,
            backing_type: values.backing_type,
            delivery_date: values.delivery_date?.toISOString().split('T')[0],
            special_requests: values.special_requests,
            youtube_link: values.youtube_link,
            additional_links: values.additional_links,
            is_paid: values.is_paid,
            track_purpose: values.track_purpose,
            additional_services: values.additional_services,
            sheet_music_url: values.sheet_music_url,
            song_key: values.song_key,
            track_type: values.track_type,
            category: values.category,
          },
        ])
        .select();

      if (error) throw error;

      showSuccess("Request submitted successfully! We'll be in touch soon.");
      form.reset();
    } catch (error: any) {
      console.error("Error submitting form:", error);
      showError(`Submission failed: ${error.message}`);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-[#1C0357]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <HolidayModeBanner />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold text-[#1C0357] mb-6 text-center">Request a Backing Track</h1>
          <p className="text-gray-700 mb-8 text-center">
            Fill out the form below to request a custom backing track. We'll get back to you with a quote and estimated delivery time.
          </p>

          {!user && (
            <div className="mb-8">
              <AccountPromptCard
                title="Already have an account?"
                description="Log in to pre-fill your details and manage your requests."
                buttonText="Log In with Google"
                redirectPath="/form-page"
              />
              <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-400">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input id="name" {...form.register("name")} disabled={!!user} />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Your Email</Label>
                <Input id="email" type="email" {...form.register("email")} disabled={!!user} />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="song_title">Song Title</Label>
                <Input id="song_title" {...form.register("song_title")} />
                {form.formState.errors.song_title && (
                  <p className="text-red-500 text-sm">{form.formState.errors.song_title.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="musical_or_artist">Musical / Artist</Label>
                <Input id="musical_or_artist" {...form.register("musical_or_artist")} />
                {form.formState.errors.musical_or_artist && (
                  <p className="text-red-500 text-sm">{form.formState.errors.musical_or_artist.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Backing Type</Label>
              <div className="flex flex-wrap gap-4">
                {["Full Song", "Audition Cut", "Note Bash"].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={form.watch("backing_type").includes(type)}
                      onCheckedChange={(checked) => {
                        const currentTypes = form.getValues("backing_type");
                        if (checked) {
                          form.setValue("backing_type", [...currentTypes, type]);
                        } else {
                          form.setValue(
                            "backing_type",
                            currentTypes.filter((t) => t !== type)
                          );
                        }
                      }}
                    />
                    <Label htmlFor={type}>{type}</Label>
                  </div>
                ))}
              </div>
              {form.formState.errors.backing_type && (
                <p className="text-red-500 text-sm">{form.formState.errors.backing_type.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_date">Preferred Delivery Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("delivery_date") && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("delivery_date") ? (
                        format(form.watch("delivery_date")!, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch("delivery_date")}
                      onSelect={(date) => form.setValue("delivery_date", date!)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="song_key">Song Key (Optional)</Label>
                <Input id="song_key" {...form.register("song_key")} placeholder="e.g., C Major, A Minor" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="track_type">Track Type (Optional)</Label>
                <Select onValueChange={(value) => form.setValue("track_type", value)} value={form.watch("track_type")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select track type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Quick Reference</SelectItem>
                    <SelectItem value="one-take">One-Take Recording</SelectItem>
                    <SelectItem value="polished">Polished Backing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Select onValueChange={(value) => form.setValue("category", value)} value={form.watch("category")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="musical-theatre">Musical Theatre</SelectItem>
                    <SelectItem value="pop">Pop</SelectItem>
                    <SelectItem value="jazz">Jazz</SelectItem>
                    <SelectItem value="classical">Classical</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="track_purpose">Track Purpose (Optional)</Label>
              <Select onValueChange={(value) => form.setValue("track_purpose", value)} value={form.watch("track_purpose")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="audition">Audition</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="recording">Recording</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Additional Services (Optional)</Label>
              <div className="flex flex-wrap gap-4">
                {["Vocal Guide", "Sheet Music Transcription", "Custom Arrangement"].map((service) => (
                  <div key={service} className="flex items-center space-x-2">
                    <Checkbox
                      id={service}
                      checked={form.watch("additional_services")?.includes(service)}
                      onCheckedChange={(checked) => {
                        const currentServices = form.getValues("additional_services") || [];
                        if (checked) {
                          form.setValue("additional_services", [...currentServices, service]);
                        } else {
                          form.setValue(
                            "additional_services",
                            currentServices.filter((s) => s !== service)
                          );
                        }
                      }}
                    />
                    <Label htmlFor={service}>{service}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube_link">YouTube Link (Optional)</Label>
              <Input id="youtube_link" {...form.register("youtube_link")} placeholder="Link to a reference video" />
              {form.formState.errors.youtube_link && (
                <p className="text-red-500 text-sm">{form.formState.errors.youtube_link.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet_music_url">Sheet Music Link (Optional)</Label>
              <Input id="sheet_music_url" {...form.register("sheet_music_url")} placeholder="Link to sheet music (e.g., PDF)" />
              {form.formState.errors.sheet_music_url && (
                <p className="text-red-500 text-sm">{form.formState.errors.sheet_music_url.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_links">Additional Links (Optional)</Label>
              <Textarea
                id="additional_links"
                {...form.register("additional_links")}
                placeholder="Any other links (e.g., Spotify, Apple Music) - one per line"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_requests">Special Requests (Optional)</Label>
              <Textarea
                id="special_requests"
                {...form.register("special_requests")}
                placeholder="Any specific instructions or details for your track"
                rows={5}
              />
            </div>

            <Button type="submit" className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90 text-white" disabled={form.formState.isSubmitting || isHolidayModeActive}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FormPage;