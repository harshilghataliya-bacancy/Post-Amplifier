"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Campaign } from "@/lib/types";
import { getActiveCampaign, saveCampaign, getCopiedItems, markCopied } from "@/lib/storage";

export default function PostPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedPosts, setCopiedPosts] = useState<number[]>([]);
  const [generating, setGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const c = getActiveCampaign();
    setCampaign(c);
    if (c) {
      const allCopied = getCopiedItems();
      if (allCopied[c.id]) {
        setCopiedPosts(allCopied[c.id].posts);
      }
    }
    setMounted(true);
  }, []);

  const getUnusedPost = useCallback((): { item: string; index: number } | null => {
    if (!campaign) return null;
    const usedSet = new Set(copiedPosts);
    for (let i = 0; i < campaign.posts.length; i++) {
      if (!usedSet.has(i)) return { item: campaign.posts[i], index: i };
    }
    return null;
  }, [campaign, copiedPosts]);

  const hasPosts = campaign ? (campaign.campaignType || "both") !== "comments" : false;

  const autoGenerate = useCallback(async () => {
    if (!campaign || generating || (campaign.campaignType || "both") === "comments") return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainPost: campaign.mainPost,
          postGoal: campaign.postGoal,
          numberOfVariations: 50,
          numberOfComments: 0,
          existingPosts: campaign.posts,
          existingComments: campaign.comments,
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      const updated: Campaign = {
        ...campaign,
        posts: [...campaign.posts, ...(data.posts || [])],
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
    const unusedCount = campaign.posts.length - copiedPosts.length;
    if (unusedCount <= 5) autoGenerate();
  }, [campaign, copiedPosts, autoGenerate, generating]);

  const handleCopy = async (text: string, index: number) => {
    if (!campaign) return;
    await navigator.clipboard.writeText(text);
    markCopied(campaign.id, "posts", index);
    setCopiedPosts((prev) => [...new Set([...prev, index])]);
    setCopied(true);
    setTimeout(() => {
      window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank");
      setCopied(false);
    }, 800);
  };

  const unusedPost = getUnusedPost();
  const remaining = campaign ? campaign.posts.length - copiedPosts.length : 0;

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

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className={`w-full max-w-2xl transition-all duration-500 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>

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

          /* Posts not available for this campaign type */
          ) : !hasPosts ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6 text-[var(--ink-faint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-[18px] font-semibold text-[var(--ink)] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                Posts not available
              </h3>
              <p className="text-[13px] text-[var(--ink-faint)] mb-5">
                This campaign is set up for comments only.
              </p>
              <Link href="/comment" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[var(--ink)] text-white rounded-xl text-[13px] font-medium hover:opacity-90 transition-all">
                Go to Comments
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

          /* Generating state */
          ) : generating && !unusedPost ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--linkedin-surface)] flex items-center justify-center mx-auto mb-5">
                <svg className="animate-spin w-6 h-6 text-[var(--linkedin)]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <h3 className="text-[18px] font-semibold text-[var(--ink)] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                Generating fresh posts...
              </h3>
              <p className="text-[13px] text-[var(--ink-faint)]">
                Creating 50 new unique posts for you.
              </p>
            </div>

          /* Main content — the post card */
          ) : unusedPost ? (
            <>
              {/* How it works — inline numbered strip */}
              <div className="flex items-center gap-6 mb-6 px-1">
                {[
                  "Tap the button below to copy",
                  "LinkedIn opens automatically",
                  "Paste and publish your post",
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5 flex-1">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--ink)]/[0.06] flex items-center justify-center text-[10px] font-bold text-[var(--ink-muted)]">
                      {i + 1}
                    </span>
                    <p className="text-[11px] text-[var(--ink-faint)] leading-tight">{step}</p>
                  </div>
                ))}
              </div>

              {/* Post card */}
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] relative overflow-hidden shadow-[0_2px_24px_-4px_rgba(12,20,38,0.06)]">
                {/* Top accent */}
                <div className="h-[3px] bg-gradient-to-r from-[var(--linkedin)] via-[var(--linkedin)]/50 to-transparent" />

                <div className="p-8">
                  {/* Label row */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                    <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--ink-faint)]">
                      Your unique post
                    </p>
                  </div>

                  {/* Post content */}
                  <div className="relative pl-5 border-l-2 border-[var(--linkedin)]/20 mb-8">
                    <p className="text-[15px] text-[var(--ink)] whitespace-pre-wrap leading-[1.85]">
                      {unusedPost.item}
                    </p>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handleCopy(unusedPost.item, unusedPost.index)}
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
                        Copied! Opening LinkedIn...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy & Post on LinkedIn
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Subtle footer note */}
              <p className="text-center text-[11px] text-[var(--ink-faint)]/60 mt-5">
                Each employee receives a unique post. Refresh to get the next one after posting.
              </p>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
