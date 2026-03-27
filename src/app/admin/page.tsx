"use client";

import { useState } from "react";
import { useAdmin } from "./layout";

export default function AdminCampaignPage() {
  const { activeCampaign, campaigns, loadCampaigns, generating, setGenerating } = useAdmin();

  const [mainPost, setMainPost] = useState("");
  const [postGoal, setPostGoal] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const campaignType = "both" as const;
  const [variations, setVariations] = useState(50);
  const [commentCount, setCommentCount] = useState(30);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showFullPost, setShowFullPost] = useState(false);

  const handleGenerate = async () => {
    if (!mainPost.trim() || !postGoal.trim()) return;
    setGenerating(true);

    try {
      const createRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          main_post: mainPost.trim(),
          post_goal: postGoal.trim(),
          source_url: linkedinUrl.trim(),
          linkedin_url: linkedinUrl.trim(),
          campaign_type: campaignType,
        }),
      });
      if (!createRes.ok) throw new Error("Failed to create campaign");
      const campaign = await createRes.json();

      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainPost: mainPost.trim(),
          postGoal: postGoal.trim(),
          numberOfVariations: variations,
          numberOfComments: commentCount,
        }),
      });
      if (!genRes.ok) throw new Error("Generation failed");
      const genData = await genRes.json();

      await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: genData.posts || [], comments: genData.comments || [] }),
      });

      // Auto-publish the new campaign
      await fetch(`/api/campaigns/${campaign.id}/publish`, { method: "POST" });

      setShowNewForm(false);
      resetForm();
      await loadCampaigns();
    } catch (error: unknown) {
      // Generation failed
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateMore = async (type: "posts" | "comments") => {
    if (!activeCampaign) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainPost: activeCampaign.main_post,
          postGoal: activeCampaign.post_goal,
          numberOfVariations: type === "posts" ? variations : 0,
          numberOfComments: type === "comments" ? commentCount : 0,
          existingPosts: activeCampaign.posts,
          existingComments: activeCampaign.comments,
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      await fetch(`/api/campaigns/${activeCampaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posts: [...activeCampaign.posts, ...(data.posts || [])],
          comments: [...activeCampaign.comments, ...(data.comments || [])],
        }),
      });
      await loadCampaigns();
    } catch {
      // Failed to generate more
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setMainPost("");
    setPostGoal("");
    setLinkedinUrl("");
  };

  // ── Generating overlay ──
  const GeneratingOverlay = () => generating ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 backdrop-blur-sm animate-fade-up">
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] px-10 py-8 text-center shadow-2xl max-w-sm w-full mx-4">
        <div className="w-12 h-12 mx-auto mb-5 relative">
          <div className="absolute inset-0 rounded-full border-[3px] border-[var(--border)]" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[var(--linkedin)] animate-spin" />
        </div>
        <p className="text-[15px] font-semibold text-[var(--ink)] mb-1.5">Generating content</p>
        <p className="text-[12px] text-[var(--ink-faint)] leading-relaxed">Creating posts and comments for your campaign. This may take a moment.</p>
      </div>
    </div>
  ) : null;

  // ── New Campaign Form view ──
  if (showNewForm) {
    return (
      <div className="space-y-6">
        <GeneratingOverlay />
        <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border)]/60 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[var(--ink)]">New Campaign</h2>
            <button onClick={() => setShowNewForm(false)} className="text-[12px] text-[var(--ink-faint)] hover:text-[var(--ink)] transition-all cursor-pointer">
              Cancel
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Post content */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-2 tracking-[0.08em] uppercase">Post Content</label>
              <textarea
                value={mainPost}
                onChange={(e) => setMainPost(e.target.value)}
                placeholder="Paste the original LinkedIn post content here..."
                className="input-editorial w-full resize-none focus-ring"
                rows={5}
              />
            </div>

            {/* Post Goal */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-2 tracking-[0.08em] uppercase">Post Goal</label>
              <select value={postGoal} onChange={(e) => setPostGoal(e.target.value)} className="input-editorial w-full focus-ring cursor-pointer">
                <option value="">Select goal...</option>
                <option value="Hiring">Hiring</option>
                <option value="Branding">Branding</option>
                <option value="Product Launch">Product Launch</option>
                <option value="Thought Leadership">Thought Leadership</option>
                <option value="Event Promotion">Event Promotion</option>
                <option value="Company Culture">Company Culture</option>
                <option value="Industry Insights">Industry Insights</option>
                <option value="Engagement">General Engagement</option>
              </select>
            </div>

            {/* LinkedIn Source URL */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-2 tracking-[0.08em] uppercase">LinkedIn Post URL</label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/posts/..."
                className="input-editorial w-full focus-ring"
              />
              <p className="text-[10px] text-[var(--ink-faint)] mt-1.5">Employees will be redirected here to post comments</p>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-2 tracking-[0.08em] uppercase">Posts to Generate</label>
                <input type="text" inputMode="numeric" value={variations} onChange={(e) => setVariations(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} className="input-editorial w-full focus-ring" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-2 tracking-[0.08em] uppercase">Comments to Generate</label>
                <input type="text" inputMode="numeric" value={commentCount} onChange={(e) => setCommentCount(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} className="input-editorial w-full focus-ring" />
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleGenerate}
              disabled={generating || !mainPost.trim() || !postGoal}
              className={`btn-primary w-full flex items-center justify-center gap-2.5 focus-ring cursor-pointer ${generating ? "animate-pulse-glow" : ""}`}
            >
              {generating ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Generate &amp; Publish Campaign
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ── No active campaign ──
  if (!activeCampaign) {
    return (
      <div className="bg-[var(--surface)] rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-[var(--ink-faint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-[20px] font-semibold text-[var(--ink)] mb-2">No active campaign</h3>
        <p className="text-[13px] text-[var(--ink-faint)] mb-6 max-w-sm mx-auto">
          Create your first campaign to start generating unique posts and comments for your team.
        </p>
        <button
          onClick={() => setShowNewForm(true)}
          className="btn-primary inline-flex items-center gap-2 focus-ring cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Create Campaign
        </button>
      </div>
    );
  }

  // ── Active Campaign Dashboard ──
  const truncated = activeCampaign.main_post.split("\n").slice(0, 4).join("\n").substring(0, 300);
  const isTruncated = activeCampaign.main_post.length > 300 || activeCampaign.main_post.split("\n").length > 4;

  return (
    <div className="space-y-6">
      <GeneratingOverlay />
      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Posts", value: activeCampaign.posts.length, accent: "var(--linkedin)" },
          { label: "Comments", value: activeCampaign.comments.length, accent: "var(--accent-warm)" },
          { label: "Total Copies", value: activeCampaign.metrics.totalCopies, accent: "var(--success)" },
          { label: "Unique Users", value: activeCampaign.metrics.uniqueUsers, accent: "var(--ink)" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="relative bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 overflow-hidden animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(to right, ${stat.accent}, transparent)` }} />
            <p className="text-[32px] font-bold text-[var(--ink)] leading-none mb-1.5 tracking-[-0.02em]">
              {stat.value}
            </p>
            <p className="text-[10px] font-semibold text-[var(--ink-faint)] uppercase tracking-[0.12em]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Current campaign card */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        {/* Header row */}
        <div className="px-6 py-4 border-b border-[var(--border)]/60 flex items-center justify-between">
          <span className="text-[14px] font-semibold text-[var(--ink)]">{activeCampaign.post_goal}</span>
          <button
            onClick={() => setShowNewForm(true)}
            className="px-3.5 py-2 text-[11px] font-semibold text-[var(--linkedin)] bg-[var(--linkedin-surface)] rounded-xl hover:bg-[var(--linkedin)]/10 transition-all border border-[var(--linkedin)]/10 cursor-pointer"
          >
            + New Campaign
          </button>
        </div>

        {/* Source post */}
        <div className="px-6 py-5">
          <p className="text-[10px] font-semibold text-[var(--ink-faint)] uppercase tracking-[0.15em] mb-3">Source Post</p>
          <p className="text-[13px] text-[var(--ink-muted)] leading-[1.8] whitespace-pre-wrap">
            {showFullPost ? activeCampaign.main_post : truncated}
            {isTruncated && !showFullPost && "..."}
          </p>
          {isTruncated && (
            <button onClick={() => setShowFullPost(!showFullPost)} className="text-[12px] text-[var(--linkedin)] font-medium mt-2 hover:underline cursor-pointer">
              {showFullPost ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-[var(--border)]/40 flex flex-wrap gap-2.5">
          <button
            onClick={() => handleGenerateMore("posts")}
            disabled={generating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium border border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--linkedin)] hover:text-[var(--linkedin)] hover:bg-[var(--linkedin-surface)]/50 transition-all disabled:opacity-40 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            More Posts
          </button>
          <button
            onClick={() => handleGenerateMore("comments")}
            disabled={generating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium border border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--accent-warm)] hover:text-[var(--accent-warm)] hover:bg-[var(--accent-warm-surface)]/50 transition-all disabled:opacity-40 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            More Comments
          </button>
        </div>
      </div>
    </div>
  );
}
