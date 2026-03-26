"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { Campaign } from "@/lib/types";
import { getCampaign, saveCampaign, getCopiedItems, markCopied } from "@/lib/storage";

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "comments">("posts");
  const [copied, setCopied] = useState(false);
  const [copiedItems, setCopiedItems] = useState<{
    posts: number[];
    comments: number[];
  }>({ posts: [], comments: [] });
  const [generating, setGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const c = getCampaign(id);
    setCampaign(c);
    const allCopied = getCopiedItems();
    if (allCopied[id]) {
      setCopiedItems(allCopied[id]);
    }
    setMounted(true);
  }, [id]);

  // Get the first unused item
  const getUnusedItem = useCallback(
    (type: "posts" | "comments"): { item: string; index: number } | null => {
      if (!campaign) return null;
      const source = type === "posts" ? campaign.posts : campaign.comments;
      const usedSet = new Set(copiedItems[type]);

      for (let i = 0; i < source.length; i++) {
        if (!usedSet.has(i)) {
          return { item: source[i], index: i };
        }
      }
      return null; // all used
    },
    [campaign, copiedItems]
  );

  // Auto-generate more when all are used
  const autoGenerate = useCallback(
    async (type: "posts" | "comments") => {
      if (!campaign || generating) return;
      setGenerating(true);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mainPost: campaign.mainPost,
            postGoal: campaign.postGoal,
            numberOfVariations: type === "posts" ? 50 : 0,
            numberOfComments: type === "comments" ? 50 : 0,
            existingPosts: campaign.posts,
            existingComments: campaign.comments,
          }),
        });

        if (!res.ok) throw new Error("Generation failed");
        const data = await res.json();

        const updated: Campaign = {
          ...campaign,
          posts: [...campaign.posts, ...(data.posts || [])],
          comments: [...campaign.comments, ...(data.comments || [])],
        };

        saveCampaign(updated);
        setCampaign(updated);
      } catch (err) {
        console.error("Auto-generate failed:", err);
      } finally {
        setGenerating(false);
      }
    },
    [campaign, generating]
  );

  // Check if we need to auto-generate
  useEffect(() => {
    if (!campaign || generating) return;
    const unused = getUnusedItem(activeTab);
    if (!unused) {
      autoGenerate(activeTab);
    }
  }, [campaign, activeTab, copiedItems, getUnusedItem, autoGenerate, generating]);

  const handleCopy = async (text: string, originalIndex: number) => {
    await navigator.clipboard.writeText(text);
    markCopied(id, activeTab, originalIndex);
    setCopiedItems((prev) => ({
      ...prev,
      [activeTab]: [...new Set([...prev[activeTab], originalIndex])],
    }));
    setCopied(true);

    // Redirect after a short delay
    setTimeout(() => {
      if (activeTab === "posts") {
        // Redirect to LinkedIn create post
        window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank");
      } else {
        // Redirect to source post comment section
        const url = campaign?.sourceUrl;
        if (url) {
          window.open(url, "_blank");
        } else {
          window.open("https://www.linkedin.com/feed/", "_blank");
        }
      }
      setCopied(false);
    }, 800);
  };

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center animate-fade-up">
          <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[var(--ink-faint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[14px] text-[var(--ink-muted)] mb-4">Campaign not found</p>
          <Link href="/" className="text-[13px] font-medium text-[var(--linkedin)] hover:underline">
            Back to campaigns
          </Link>
        </div>
      </div>
    );
  }

  const unusedItem = getUnusedItem(activeTab);
  const totalPosts = campaign.posts.length;
  const totalComments = campaign.comments.length;
  const usedPosts = copiedItems.posts.length;
  const usedComments = copiedItems.comments.length;

  return (
    <div className="min-h-screen bg-[var(--background)] noise-bg">
      {/* Header */}
      <header className="bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)] sticky top-0 z-10 animate-slide-down">
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[14px] font-semibold text-[var(--ink)]">
                {campaign.postGoal}
              </h1>
              <p className="text-[11px] text-[var(--ink-faint)]">
                {totalPosts - usedPosts} posts remaining · {totalComments - usedComments} comments remaining
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className={`flex gap-1 bg-[var(--surface)] rounded-xl p-1 border border-[var(--border)] w-fit mb-8 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>
          {(["posts", "comments"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setCopied(false); }}
              className={`px-6 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab
                  ? "bg-[var(--ink)] text-white shadow-md shadow-black/10"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {tab === "posts" ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              )}
              {tab === "posts" ? "Get a Post" : "Get a Comment"}
            </button>
          ))}
        </div>

        {/* Show source post for comments tab */}
        {activeTab === "comments" && (
          <div className={`mb-8 transition-all duration-500 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--linkedin)] via-[var(--linkedin)]/50 to-transparent" />
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-[var(--ink)] text-white text-[10px] font-semibold tracking-[0.15em] uppercase rounded-md">
                  Source Post
                </span>
              </div>
              <p className="text-[14px] text-[var(--ink)] whitespace-pre-wrap leading-[1.7] pl-4">
                {campaign.mainPost}
              </p>
            </div>
          </div>
        )}

        {/* Content card — single unused item */}
        <div className={`transition-all duration-500 ${mounted ? 'animate-fade-up stagger-2' : 'opacity-0'}`}>
          {generating ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--linkedin-surface)] flex items-center justify-center mx-auto mb-5">
                <svg className="animate-spin w-7 h-7 text-[var(--linkedin)]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold text-[var(--ink)] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                Generating fresh {activeTab}...
              </h3>
              <p className="text-[13px] text-[var(--ink-faint)]">
                All {activeTab} were used. Creating 50 new ones for you.
              </p>
            </div>
          ) : unusedItem ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-8 relative overflow-hidden">
              {/* Decorative top accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--linkedin)] via-[var(--linkedin)]/60 to-transparent" />

              <div className="flex items-center justify-between mb-5">
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--ink-faint)]">
                  {activeTab === "posts" ? "Your unique post" : "Your unique comment"}
                </p>
                <span className="text-[11px] text-[var(--ink-faint)] tabular-nums">
                  {activeTab === "posts" ? totalPosts - usedPosts : totalComments - usedComments} remaining
                </span>
              </div>

              <p className="text-[15px] text-[var(--ink)] whitespace-pre-wrap leading-[1.8] mb-8">
                {unusedItem.item}
              </p>

              <button
                onClick={() => handleCopy(unusedItem.item, unusedItem.index)}
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
                    {activeTab === "posts" ? "Copy & Create Post on LinkedIn" : "Copy & Comment on LinkedIn"}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[var(--ink-faint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[14px] text-[var(--ink-faint)]">
                No {activeTab} available
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className={`mt-8 grid grid-cols-3 gap-4 transition-all duration-500 ${mounted ? 'animate-fade-up stagger-3' : 'opacity-0'}`}>
          {[
            { step: "1", label: activeTab === "posts" ? "Copy your unique post" : "Copy your unique comment", icon: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" },
            { step: "2", label: "Redirected to LinkedIn automatically", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
            { step: "3", label: activeTab === "posts" ? "Paste and publish your post" : "Paste your comment on the post", icon: "M5 13l4 4L19 7" },
          ].map((s) => (
            <div key={s.step} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-center">
              <div className="w-8 h-8 rounded-lg bg-[var(--linkedin-surface)] flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-[var(--linkedin)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
              <p className="text-[11px] text-[var(--ink-muted)] font-medium leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
