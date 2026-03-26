"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Campaign } from "@/lib/types";
import { getActiveCampaign, saveCampaign, getCopiedItems, markCopied } from "@/lib/storage";

export default function CommentPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedComments, setCopiedComments] = useState<number[]>([]);
  const [generating, setGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const c = getActiveCampaign();
    setCampaign(c);
    if (c) {
      const allCopied = getCopiedItems();
      if (allCopied[c.id]) {
        setCopiedComments(allCopied[c.id].comments);
      }
    }
    setMounted(true);
  }, []);

  const getUnusedComment = useCallback((): { item: string; index: number } | null => {
    if (!campaign) return null;
    const usedSet = new Set(copiedComments);
    for (let i = 0; i < campaign.comments.length; i++) {
      if (!usedSet.has(i)) return { item: campaign.comments[i], index: i };
    }
    return null;
  }, [campaign, copiedComments]);

  const hasComments = campaign ? (campaign.campaignType || "both") !== "posts" : false;

  const autoGenerate = useCallback(async () => {
    if (!campaign || generating || (campaign.campaignType || "both") === "posts") return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainPost: campaign.mainPost,
          postGoal: campaign.postGoal,
          numberOfVariations: 0,
          numberOfComments: 50,
          existingPosts: campaign.posts,
          existingComments: campaign.comments,
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      const updated: Campaign = {
        ...campaign,
        comments: [...campaign.comments, ...(data.comments || [])],
      };
      saveCampaign(updated);
      setCampaign(updated);
    } catch (err) {
      console.error("Auto-generate failed:", err);
    } finally {
      setGenerating(false);
    }
  }, [campaign, generating]);

  useEffect(() => {
    if (!campaign || generating) return;
    const unusedCount = campaign.comments.length - copiedComments.length;
    if (unusedCount <= 5) autoGenerate();
  }, [campaign, copiedComments, autoGenerate, generating]);

  const handleCopy = async (text: string, index: number) => {
    if (!campaign) return;
    await navigator.clipboard.writeText(text);
    markCopied(campaign.id, "comments", index);
    setCopiedComments((prev) => [...new Set([...prev, index])]);
    setCopied(true);
    setTimeout(() => {
      const url = campaign.sourceUrl || "https://www.linkedin.com/feed/";
      window.open(url, "_blank");
      setCopied(false);
    }, 800);
  };

  const unusedComment = getUnusedComment();
  const remaining = campaign ? campaign.comments.length - copiedComments.length : 0;

  // Render post text with clickable URLs
  const renderPostText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        urlRegex.lastIndex = 0;
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#0a66c2] hover:underline font-medium">
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-[var(--background)] noise-bg ambient-bg flex flex-col">
      {/* Minimal header */}
      <header className="bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)] animate-slide-down">
        <div className="max-w-2xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--ink)] rounded-xl flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/>
              </svg>
            </div>
            <h1 className="text-[15px] font-semibold text-[var(--ink)]" style={{ fontFamily: 'var(--font-serif)' }}>Post Amplifier</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className={`w-full max-w-2xl mx-auto transition-all duration-500 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>

          {/* No campaign */}
          {!campaign ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
              <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6 text-[var(--ink-faint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-[18px] font-semibold text-[var(--ink)] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                No active campaign
              </h3>
              <p className="text-[13px] text-[var(--ink-faint)] max-w-xs mx-auto">
                Your admin hasn&apos;t published a campaign yet. Check back soon.
              </p>
            </div>

          /* Comments not available */
          ) : !hasComments ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6 text-[var(--ink-faint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-[18px] font-semibold text-[var(--ink)] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                Comments not available
              </h3>
              <p className="text-[13px] text-[var(--ink-faint)] mb-5">
                This campaign is set up for posts only.
              </p>
              <Link href="/post" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[var(--ink)] text-white rounded-xl text-[13px] font-medium hover:opacity-90 transition-all">
                Go to Posts
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

          ) : (
            <>
              {/* How it works — inline numbered strip */}
              <div className="flex items-center gap-6 mb-6 px-1">
                {[
                  "Tap to copy your comment",
                  "The source post opens automatically",
                  "Paste your comment and submit",
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5 flex-1">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--ink)]/[0.06] flex items-center justify-center text-[10px] font-bold text-[var(--ink-muted)]">
                      {i + 1}
                    </span>
                    <p className="text-[11px] text-[var(--ink-faint)] leading-tight">{step}</p>
                  </div>
                ))}
              </div>

              {/* Source Post — LinkedIn-style card */}
              <div className="bg-white rounded-lg border border-[#e0e0e0] mb-4 overflow-hidden" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                {/* Post header */}
                <div className="px-4 pt-3 pb-0">
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0a66c2] to-[#004182] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/>
                        </svg>
                      </div>
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#5f9b41] rounded-full border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#000000e6] leading-tight">Source Post</p>
                      <p className="text-[12px] text-[#00000099] leading-tight mt-0.5">{campaign.postGoal}</p>
                    </div>
                  </div>
                </div>

                {/* Post content */}
                <div className="px-4 pt-3 pb-3">
                  <div className="text-[14px] text-[#000000e6] whitespace-pre-wrap leading-[1.5]">
                    {renderPostText(campaign.mainPost)}
                  </div>
                </div>

                {/* Action bar */}
                <div className="px-2 py-1 border-t border-[#e0e0e0] flex items-center justify-around">
                  {/* Like */}
                  <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-md hover:bg-[#00000008] cursor-default transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#666666" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                    </svg>
                    <span className="text-[12px] font-semibold text-[#666666]">Like</span>
                  </div>
                  {/* Comment */}
                  <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-md hover:bg-[#00000008] cursor-default transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#666666" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    <span className="text-[12px] font-semibold text-[#666666]">Comment</span>
                  </div>
                  {/* Repost */}
                  <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-md hover:bg-[#00000008] cursor-default transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#666666" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 1l4 4-4 4" />
                      <path d="M3 11V9a4 4 0 014-4h14" />
                      <path d="M7 23l-4-4 4-4" />
                      <path d="M21 13v2a4 4 0 01-4 4H3" />
                    </svg>
                    <span className="text-[12px] font-semibold text-[#666666]">Repost</span>
                  </div>
                  {/* Send */}
                  <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-md hover:bg-[#00000008] cursor-default transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#666666" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    <span className="text-[12px] font-semibold text-[#666666]">Send</span>
                  </div>
                </div>
              </div>

              {/* Comment card */}
              {generating && !unusedComment ? (
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--linkedin-surface)] flex items-center justify-center mx-auto mb-5">
                    <svg className="animate-spin w-6 h-6 text-[var(--linkedin)]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                  <h3 className="text-[18px] font-semibold text-[var(--ink)] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                    Generating fresh comments...
                  </h3>
                  <p className="text-[13px] text-[var(--ink-faint)]">
                    Creating 50 new unique comments for you.
                  </p>
                </div>
              ) : unusedComment ? (
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] relative overflow-hidden shadow-[0_2px_24px_-4px_rgba(12,20,38,0.06)]">
                  {/* Top accent */}
                  <div className="h-[3px] bg-gradient-to-r from-[var(--linkedin)] via-[var(--linkedin)]/50 to-transparent" />

                  <div className="p-8">
                    {/* Label row */}
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                      <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--ink-faint)]">
                        Your unique comment
                      </p>
                    </div>

                    {/* Comment content */}
                    <p className="text-[15px] text-[var(--ink)] whitespace-pre-wrap leading-[1.85] mb-8">
                      {unusedComment.item}
                    </p>

                    {/* CTA */}
                    <button
                      onClick={() => handleCopy(unusedComment.item, unusedComment.index)}
                      disabled={copied}
                      className={`w-full py-4 rounded-xl text-[14px] font-semibold transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer ${
                        copied
                          ? "bg-[var(--success)] text-white scale-[0.98]"
                          : "bg-[var(--ink)] text-white hover:bg-[var(--linkedin-dark)] active:scale-[0.98]"
                      }`}
                    >
                      {copied ? (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Copied! Opening source post...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy & Comment on LinkedIn
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Subtle footer note */}
              <p className="text-center text-[11px] text-[var(--ink-faint)]/60 mt-5">
                Each employee receives a unique comment. Refresh to get the next one after commenting.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
