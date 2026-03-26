"use client";

import { useEffect, useState, useCallback } from "react";
import { Campaign } from "@/lib/types";
import { getCopiedItems, markCopied } from "@/lib/storage";

export default function EmployeePage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedPosts, setCopiedPosts] = useState<number[]>([]);
  const [copiedComments, setCopiedComments] = useState<number[]>([]);
  const [copiedType, setCopiedType] = useState<"post" | "comment" | null>(null);
  const [showFullPost, setShowFullPost] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetch("/api/campaigns/active")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && !data.error) {
          setCampaign(data);
          const allCopied = getCopiedItems();
          if (allCopied[data.id]) {
            setCopiedPosts(allCopied[data.id].posts || []);
            setCopiedComments(allCopied[data.id].comments || []);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setMounted(true);
      });
  }, []);

  const getUnusedPost = useCallback((): { item: string; index: number } | null => {
    if (!campaign) return null;
    const usedSet = new Set(copiedPosts);
    for (let i = 0; i < campaign.posts.length; i++) {
      if (!usedSet.has(i)) return { item: campaign.posts[i], index: i };
    }
    return null;
  }, [campaign, copiedPosts]);

  const getUnusedComment = useCallback((): { item: string; index: number } | null => {
    if (!campaign) return null;
    const usedSet = new Set(copiedComments);
    for (let i = 0; i < campaign.comments.length; i++) {
      if (!usedSet.has(i)) return { item: campaign.comments[i], index: i };
    }
    return null;
  }, [campaign, copiedComments]);

  const handleCopyPost = async (text: string, index: number) => {
    if (!campaign) return;
    await navigator.clipboard.writeText(text);
    markCopied(campaign.id, "posts", index);
    setCopiedPosts((prev) => [...new Set([...prev, index])]);
    setCopiedType("post");
    fetch("/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaign.id, type: "post_copy", itemIndex: index }),
    }).catch(() => {});
    setTimeout(() => {
      window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank");
      setCopiedType(null);
    }, 800);
  };

  const handleCopyComment = async (text: string, index: number) => {
    if (!campaign) return;
    await navigator.clipboard.writeText(text);
    markCopied(campaign.id, "comments", index);
    setCopiedComments((prev) => [...new Set([...prev, index])]);
    setCopiedType("comment");
    fetch("/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaign.id, type: "comment_copy", itemIndex: index }),
    }).catch(() => {});
    setTimeout(() => {
      const url = campaign.source_url || "https://www.linkedin.com/feed/";
      window.open(url, "_blank");
      setCopiedType(null);
    }, 800);
  };

  const unusedPost = getUnusedPost();
  const unusedComment = getUnusedComment();
  const hasPosts = campaign ? campaign.campaign_type !== "comments" : false;
  const hasComments = campaign ? campaign.campaign_type !== "posts" : false;

  const truncatedPost = campaign
    ? campaign.main_post.split("\n").slice(0, 3).join("\n").substring(0, 200)
    : "";
  const isPostTruncated = campaign
    ? campaign.main_post.length > 200 || campaign.main_post.split("\n").length > 3
    : false;

  const renderPostText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        urlRegex.lastIndex = 0;
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#0a66c2] hover:underline">
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[var(--background)] noise-bg ambient-bg flex flex-col">
      <header className="bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)] animate-slide-down">
        <div className="max-w-4xl mx-auto px-6 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--ink)] rounded-xl flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/>
            </svg>
          </div>
          <h1 className="text-[15px] font-semibold text-[var(--ink)]" style={{ fontFamily: 'var(--font-serif)' }}>Post Amplifier</h1>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className={`w-full max-w-4xl mx-auto transition-all duration-500 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>

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
          ) : (
            <>
              {/* Source Post (truncated) */}
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 mb-6 relative overflow-hidden">
                <div className="h-[3px] bg-gradient-to-r from-[var(--linkedin)] via-[var(--linkedin)]/50 to-transparent absolute top-0 left-0 right-0" />
                <div className="flex items-center gap-2 mb-3 pt-1">
                  <span className="px-2 py-0.5 bg-[var(--ink)] text-white text-[10px] font-semibold tracking-[0.15em] uppercase rounded-md">Source Post</span>
                  <span className="text-[11px] text-[var(--ink-faint)]">{campaign.post_goal}</span>
                </div>
                <p className="text-[13px] text-[var(--ink)] whitespace-pre-wrap leading-[1.7]">
                  {showFullPost ? renderPostText(campaign.main_post) : renderPostText(truncatedPost)}
                  {isPostTruncated && !showFullPost && "..."}
                </p>
                {isPostTruncated && (
                  <button onClick={() => setShowFullPost(!showFullPost)} className="text-[12px] text-[var(--linkedin)] font-medium mt-2 hover:underline cursor-pointer">
                    {showFullPost ? "Show less" : "Show more"}
                  </button>
                )}
              </div>

              {/* Two columns: Post + Comment */}
              <div className={`grid gap-6 ${hasPosts && hasComments ? "md:grid-cols-2" : "grid-cols-1"}`}>

                {hasPosts && (
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] relative overflow-hidden shadow-[0_2px_24px_-4px_rgba(12,20,38,0.06)]">
                    <div className="h-[3px] bg-gradient-to-r from-[var(--linkedin)] via-[var(--linkedin)]/50 to-transparent" />
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                        <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--ink-faint)]">Your unique post</p>
                      </div>
                      {unusedPost ? (
                        <>
                          <div className="relative pl-4 border-l-2 border-[var(--linkedin)]/20 mb-6">
                            <p className="text-[14px] text-[var(--ink)] whitespace-pre-wrap leading-[1.8]">{unusedPost.item}</p>
                          </div>
                          <button
                            onClick={() => handleCopyPost(unusedPost.item, unusedPost.index)}
                            disabled={copiedType === "post"}
                            className={`w-full py-3.5 rounded-xl text-[13px] font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                              copiedType === "post" ? "bg-[var(--success)] text-white scale-[0.98]" : "bg-[var(--ink)] text-white hover:bg-[var(--linkedin-dark)] active:scale-[0.98]"
                            }`}
                          >
                            {copiedType === "post" ? (
                              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Copied! Opening LinkedIn...</>
                            ) : (
                              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy &amp; Post on LinkedIn</>
                            )}
                          </button>
                        </>
                      ) : (
                        <p className="text-[13px] text-[var(--ink-faint)] text-center py-8">All posts used. Refresh for more.</p>
                      )}
                    </div>
                  </div>
                )}

                {hasComments && (
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] relative overflow-hidden shadow-[0_2px_24px_-4px_rgba(12,20,38,0.06)]">
                    <div className="h-[3px] bg-gradient-to-r from-[var(--accent-warm)] via-[var(--accent-warm)]/50 to-transparent" />
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                        <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--ink-faint)]">Your unique comment</p>
                      </div>
                      {unusedComment ? (
                        <>
                          <p className="text-[14px] text-[var(--ink)] whitespace-pre-wrap leading-[1.8] mb-6">{unusedComment.item}</p>
                          <button
                            onClick={() => handleCopyComment(unusedComment.item, unusedComment.index)}
                            disabled={copiedType === "comment"}
                            className={`w-full py-3.5 rounded-xl text-[13px] font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                              copiedType === "comment" ? "bg-[var(--success)] text-white scale-[0.98]" : "bg-[var(--ink)] text-white hover:bg-[var(--linkedin-dark)] active:scale-[0.98]"
                            }`}
                          >
                            {copiedType === "comment" ? (
                              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Copied! Opening source post...</>
                            ) : (
                              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy &amp; Comment on LinkedIn</>
                            )}
                          </button>
                        </>
                      ) : (
                        <p className="text-[13px] text-[var(--ink-faint)] text-center py-8">All comments used. Refresh for more.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-center text-[11px] text-[var(--ink-faint)]/60 mt-5">
                Each employee receives unique content. Refresh after posting to get the next one.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
