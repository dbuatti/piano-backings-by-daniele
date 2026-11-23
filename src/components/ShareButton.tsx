"use client";

import { 
  Facebook, 
  Mail, 
  MessageCircle, 
  X, 
  Copy, 
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
}

const shareUrl = (platform: string, url: string, title?: string, desc?: string): string => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title || '');
  const encodedDesc = encodeURIComponent(desc || '');

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'x':
      return `https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
    case 'email':
      return `mailto:?subject=${encodedTitle}&body=${encodedDesc ? `${encodedDesc}%0A%0A` : ''}${encodedUrl}`;
    case 'sms':
      return `sms:?body=${encodedTitle}%20${encodedUrl}`;
    default:
      return url;
  }
};

export const ShareButton: React.FC<ShareButtonProps> = ({ url, title, description }) => {
  const shares = [
    { platform: 'facebook', Icon: Facebook, label: 'Facebook', color: 'text-blue-600' },
    { platform: 'x', Icon: X, label: 'X / Twitter', color: 'text-black' },
    { platform: 'email', Icon: Mail, label: 'Email', color: 'text-gray-600' },
    { platform: 'sms', Icon: MessageCircle, label: 'Text message', color: 'text-green-600' },
    { platform: 'copy', Icon: Copy, label: 'Copy link', color: 'text-gray-600' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mr-2">Share this track:</span>
      {shares.map((share) => {
        if (share.platform === 'copy') {
          return (
            <button
              key={share.platform}
              onClick={() => {
                navigator.clipboard.writeText(url);
              }}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border border-[#1C0357]/20 bg-white hover:bg-[#1C0357]/5 transition-colors",
                share.color
              )}
              aria-label={`Copy link to ${title}`}
              title="Copy link"
            >
              <share.Icon size={16} />
            </button>
          );
        }
        return (
          <a
            key={share.platform}
            href={shareUrl(share.platform, url, title, description)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full border border-[#1C0357]/20 bg-white hover:bg-[#F538BC]/10 transition-colors",
              share.color
            )}
            aria-label={`Share on ${share.label}`}
            title={`Share on ${share.label}`}
          >
            <share.Icon size={16} />
            <ExternalLink size={10} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        );
      })}
    </div>
  );
};

export default ShareButton;
