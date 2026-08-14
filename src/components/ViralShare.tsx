import React, { useState } from 'react';
import { Share2, Check, Copy, Twitter, Linkedin, MessageCircle } from 'lucide-react';

interface ViralShareProps {
  conversionPair?: { from: string; to: string };
}

export const ViralShare: React.FC<ViralShareProps> = ({ conversionPair }) => {
  const [copied, setCopied] = useState(false);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://convert-x.com';
  const shareText = conversionPair
    ? `Fast ${conversionPair.from.toUpperCase()} to ${conversionPair.to.toUpperCase()} vector & image file conversions with zero file retention on Convert-X!`
    : 'Fast, secure image, vector, and CAD file conversions with zero-retention privacy on Convert-X!';

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(siteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Convert-X File Converter',
          text: shareText,
          url: siteUrl,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(siteUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${siteUrl}`)}`;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#2563EB]" />
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Share Convert-X
            </h4>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            Enjoying fast zero-retention conversions? Recommend Convert-X to your teammates.
          </p>
        </div>

        {/* Share buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm"
            title="Copy website link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              onClick={handleNativeShare}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          )}

          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors"
            title="Share on Twitter / X"
          >
            <Twitter className="w-3.5 h-3.5" />
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            title="Share via WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>

          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
            title="Share on LinkedIn"
          >
            <Linkedin className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
