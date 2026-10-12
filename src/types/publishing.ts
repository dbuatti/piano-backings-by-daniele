export type PublicationPlatform = "youtube" | "tiktok" | "instagram";

export type PublicationStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "skipped";

export interface PublicationMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  hashtags?: string[];
  privacy?: "private" | "unlisted" | "public";
  [key: string]: unknown;
}

export interface ContentAsset {
  id: string;
  storage_path: string;
  preview_path: string | null;
  mime_type: string;
  title: string | null;
  song_title: string | null;
  show: string | null;
  key: string | null;
  dedication: string | null;
  request_id: string | null;
  duration_seconds: number | null;
  aspect: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Publication {
  id: string;
  asset_id: string;
  platform: PublicationPlatform;
  status: PublicationStatus;
  scheduled_for: string | null;
  approved_at: string | null;
  approved_by: string | null;
  published_at: string | null;
  platform_post_id: string | null;
  url: string | null;
  metadata: PublicationMetadata;
  error: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export interface PublicationWithAsset extends Publication {
  content_assets: ContentAsset | null;
}

export interface PublishingSettings {
  id: number;
  weekly_dow: number;
  weekly_time: string;
  timezone: string;
  auto_schedule: boolean;
  updated_at: string;
}

export const PLATFORM_LABELS: Record<PublicationPlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

export const STATUS_LABELS: Record<PublicationStatus, string> = {
  draft: "Draft",
  pending_approval: "Needs approval",
  approved: "Approved",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  skipped: "Skipped",
};

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
