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

  const autoGenerate = useCallback(async () => {
    if (!campaign || generating) return;
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
    if (!getUnusedPost()) autoGenerate();
  }, [campaign, copiedPosts, getUnusedPost, autoGenerate, generating]);

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

  return (
    <div className="min-h-screen bg-[var(--background)] noise-bg flex flex-col">
      {/* Header */}
      <header className="bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)] animate-slide-down">
        <div className="max-w-3xl mx-auto px-6 py-3.5 flex items-center gap-4">
          <Link
            href="/"
            className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--ink-faint)] hover:text-[var(--ink)] hover:border-[var(--border-strong)] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--ink)] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-[14px] font-semibold text-[var(--ink)]">Get a Post</h1>
              <p className="text-[11px] text-[var(--ink-faint)]">
                {campaign ? `${(campaign.posts.length - copiedPosts.length)} posts remaining` : "Loading..."}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className={`w-full max-w-3xl transition-all duration-500 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>
          {!campaign ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
              <p className="text-[14px] text-[var(--ink-faint)]">No active campaign found.</p>
              <Link href="/" className="text-[13px] font-medium text-[var(--linkedin)] hover:underline mt-3 inline-block">
                Go back
              </Link>
            </div>
          ) : generating ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--linkedin-surface)] flex items-center justify-center mx-auto mb-5">
                <svg className="animate-spin w-7 h-7 text-[var(--linkedin)]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold text-[var(--ink)] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                Generating fresh posts...
              </h3>
              <p className="text-[13px] text-[var(--ink-faint)]">
                All posts were used. Creating 50 new ones for you.
              </p>
            </div>
          ) : unusedPost ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--linkedin)] via-[var(--linkedin)]/60 to-transparent" />

              <div className="flex items-center justify-between mb-5">
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--ink-faint)]">
                  Your unique post
                </p>
                <span className="text-[11px] text-[var(--ink-faint)] tabular-nums">
                  {campaign.posts.length - copiedPosts.length} remaining
                </span>
              </div>

              <p className="text-[15px] text-[var(--ink)] whitespace-pre-wrap leading-[1.8] mb-8">
                {unusedPost.item}
              </p>

              <button
                onClick={() => handleCopy(unusedPost.item, unusedPost.index)}
                disabled={copied}
                className={`w-full py-4 rounded-xl text-[14px] font-semibold transition-all duration-300 flex items-center justify-center gap-2.5 ${
                  copied
                    ? "bg-[var(--success)] text-white scale-[0.98]"
                    : "bg-[var(--ink)] text-white hover:opacity-90 active:scale-[0.98]"
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied! Redirecting to LinkedIn...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy & Create Post on LinkedIn
                  </>
                )}
              </button>
            </div>
          ) : null}

          {/* Steps */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { label: "Copy your unique post", icon: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" },
              { label: "LinkedIn opens automatically", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
              { label: "Paste and publish", icon: "M5 13l4 4L19 7" },
            ].map((s, i) => (
              <div key={i} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-center">
                <div className="w-8 h-8 rounded-lg bg-[var(--linkedin-surface)] flex items-center justify-center mx-auto mb-2">
                  <svg className="w-4 h-4 text-[var(--linkedin)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                  </svg>
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] font-medium leading-relaxed">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
