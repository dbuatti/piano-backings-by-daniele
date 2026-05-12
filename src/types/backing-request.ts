"use client";

export interface TrackInfo {
  url: string;
  caption: string | boolean | null | undefined;
}

export type RequestStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export interface BackingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  song_key: string | null;
  different_key: string | null;
  key_for_track: string | null;
  youtube_link: string | null;
  voice_memo: string | null;
  sheet_music_url: string | null;
  sheet_music_urls?: TrackInfo[];
  voice_memo_urls?: TrackInfo[];
  track_purpose: string | null;
  backing_type: string[] | string | null;
  delivery_date: string | null;
  additional_services: string[] | null;
  special_requests: string | null;
  category: string | null;
  track_type: string | null;
  additional_links: string | null;
  status: RequestStatus;
  is_paid: boolean;
  track_urls?: TrackInfo[];
  shared_link?: string | null;
  dropbox_folder_id?: string | null;
  uploaded_platforms?: string | { youtube: boolean; tiktok: boolean; facebook: boolean; instagram: boolean; gumroad: boolean; } | null;
  cost?: number | null;
  final_price?: number | null;
  estimated_cost_low?: number | null;
  estimated_cost_high?: number | null;
  internal_notes?: string | null;
  user_id?: string | null;
  guest_access_token?: string | null;
  stripe_session_id?: string | null;
}