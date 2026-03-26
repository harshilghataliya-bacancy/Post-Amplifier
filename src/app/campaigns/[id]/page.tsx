"use client";

import { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { Campaign } from "@/lib/types";
import { getCampaign, getCopiedItems, markCopied } from "@/lib/storage";

const ITEMS_PER_PAGE = 20;

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "comments">("posts");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedItems, setCopiedItems] = useState<{
    posts: number[];
    comments: number[];
  }>({ posts: [], comments: [] });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const c = getCampaign(id);
    setCampaign(c);
    const copied = getCopiedItems();
    if (copied[id]) {
      setCopiedItems(copied[id]);
    }
    setMounted(true);
  }, [id]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
    setCopiedIndex(null);
  }, [activeTab]);

  const items = useMemo(() => {
    if (!campaign) return [];
    const source = activeTab === "posts" ? campaign.posts : campaign.comments;
    const usedSet = new Set(copiedItems[activeTab]);

    const indexed = source.map((item, i) => ({ item, originalIndex: i }));

    const unused = indexed.filter((x) => !usedSet.has(x.originalIndex));
    const used = indexed.filter((x) => usedSet.has(x.originalIndex));

    // If all are used, shuffle used items so they get a fresh order
    if (unused.length === 0 && used.length > 0) {
      for (let i = used.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [used[i], used[j]] = [used[j], used[i]];
      }
      return used;
    }

    // Otherwise show unused first, then used
    return [...unused, ...used];
  }, [campaign, activeTab, copiedItems]);

  const handleCopy = async (
    text: string,
    originalIndex: number,
    displayIndex: number
  ) => {
    await navigator.clipboard.writeText(text);
    markCopied(id, activeTab, originalIndex);
    setCopiedItems((prev) => ({
      ...prev,
      [activeTab]: [...new Set([...prev[activeTab], originalIndex])],
    }));
    setCopiedIndex(displayIndex);
    setTimeout(() => setCopiedIndex(null), 2000);
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

  const usedCount = copiedItems[activeTab].length;
  const totalCount =
    activeTab === "posts" ? campaign.posts.length : campaign.comments.length;
  const usedPercent = totalCount ? (usedCount / totalCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-[var(--background)] noise-bg">
      {/* Header */}
      <header className="bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)] sticky top-0 z-10 animate-slide-down">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center gap-4">
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
              <div className="flex items-center gap-2">
                <h1 className="text-[14px] font-semibold text-[var(--ink)]">
                  {campaign.postGoal}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--linkedin-surface)] text-[var(--linkedin)] text-[10px] font-semibold tracking-wide uppercase rounded-md">
                  {campaign.posts.length + campaign.comments.length} items
                </span>
              </div>
              <p className="text-[11px] text-[var(--ink-faint)]">
                Created {new Date(campaign.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Main Post — Editorial pull-quote style */}
        <div className={`mb-10 transition-all duration-500 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-8 relative overflow-hidden">
            {/* Decorative accent */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--linkedin)] via-[var(--linkedin)]/50 to-transparent" />
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-[var(--linkedin)] via-[var(--linkedin)]/20 to-transparent" />

            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 bg-[var(--ink)] text-white text-[10px] font-semibold tracking-[0.15em] uppercase rounded-md">
                Source Post
              </span>
              <span className="text-[11px] text-[var(--ink-faint)]">{campaign.postGoal}</span>
            </div>

            <p
              className="text-[16px] text-[var(--ink)] whitespace-pre-wrap leading-[1.8]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {campaign.mainPost}
            </p>
          </div>
        </div>

        {/* Controls bar */}
        <div className={`flex flex-col gap-4 mb-6 transition-all duration-500 ${mounted ? 'animate-fade-up stagger-2' : 'opacity-0'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Tabs */}
            <div className="flex gap-1 bg-[var(--surface)] rounded-xl p-1 border border-[var(--border)] w-fit">
              {(["posts", "comments"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-[10px] text-[13px] font-medium transition-all duration-200 flex items-center gap-2 ${
                    activeTab === tab
                      ? "bg-[var(--ink)] text-white shadow-md shadow-black/10"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {tab === "posts" ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} ({tab === "posts" ? campaign.posts.length : campaign.comments.length})
                </button>
              ))}
            </div>
          </div>

          {/* Usage progress */}
          <div className="flex items-center gap-3">
            <div className="h-1 flex-1 max-w-[240px] bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${usedPercent}%`,
                  background: usedPercent > 80 ? 'var(--accent-warm)' : 'var(--linkedin)',
                }}
              />
            </div>
            <span className="text-[11px] font-medium text-[var(--ink-faint)] tabular-nums">
              {usedCount} of {totalCount} used ({Math.round(usedPercent)}%)
            </span>
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-2.5">
          {items.slice(0, visibleCount).map(({ item, originalIndex }, displayIndex) => {
            const isUsed = copiedItems[activeTab].includes(originalIndex);
            const isCopied = copiedIndex === displayIndex;

            return (
              <div
                key={originalIndex}
                className={`group bg-[var(--surface)] rounded-xl border p-5 transition-all duration-200 ${
                  mounted ? 'animate-fade-up' : 'opacity-0'
                } ${
                  isUsed
                    ? "border-[var(--border)] opacity-50"
                    : "border-[var(--border)] hover:border-[var(--border-strong)] hover:shadow-sm"
                }`}
                style={{ animationDelay: `${Math.min(displayIndex * 0.03, 0.3)}s` }}
              >
                <div className="flex items-start gap-4">
                  {/* Number indicator */}
                  <span className="text-[11px] font-medium text-[var(--ink-faint)] tabular-nums mt-0.5 shrink-0 w-6 text-right">
                    {displayIndex + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    {isUsed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.1em] uppercase px-1.5 py-0.5 bg-[var(--surface-elevated)] text-[var(--ink-faint)] rounded mb-2 border border-[var(--border)]">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Used
                      </span>
                    )}
                    <p className="text-[13px] text-[var(--ink)] whitespace-pre-wrap leading-[1.7]">
                      {item}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopy(item, originalIndex, displayIndex)}
                    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                      isCopied
                        ? "bg-[var(--success-surface)] text-[var(--success)] scale-95"
                        : "bg-[var(--surface-elevated)] text-[var(--ink-muted)] border border-[var(--border)] hover:border-[var(--linkedin)] hover:text-[var(--linkedin)] hover:bg-[var(--linkedin-surface)] active:scale-95"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load more */}
        {visibleCount < items.length && (
          <div className="text-center mt-8">
            <button
              onClick={() => setVisibleCount((v) => v + ITEMS_PER_PAGE)}
              className="px-8 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] font-medium text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink)] transition-all card-hover"
            >
              Load {Math.min(ITEMS_PER_PAGE, items.length - visibleCount)} more
              <span className="text-[var(--ink-faint)] ml-1.5">
                ({items.length - visibleCount} remaining)
              </span>
            </button>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--ink-faint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-[14px] text-[var(--ink-faint)]">
              No {activeTab} available
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-8 mt-auto">
        <div className="editorial-divider mb-6" />
        <p className="text-[11px] text-[var(--ink-faint)] tracking-wide">
          LinkedIn Post Amplifier &middot; Internal Tool
        </p>
      </footer>
    </div>
  );
}
