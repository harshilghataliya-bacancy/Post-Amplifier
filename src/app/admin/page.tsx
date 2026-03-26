"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Campaign } from "@/lib/types";
import {
  isAuthenticated,
  setAuthenticated,
  getActiveCampaign,
  saveCampaign,
  getCampaigns,
} from "@/lib/storage";

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);

  const [mainPost, setMainPost] = useState("");
  const [postGoal, setPostGoal] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [campaignType, setCampaignType] = useState<"posts" | "comments" | "both">("posts");
  const [variations, setVariations] = useState(50);
  const [commentCount, setCommentCount] = useState(30);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);

  // Load existing active campaign on mount
  const loadActiveCampaign = useCallback(() => {
    const active = getActiveCampaign();
    if (active) {
      setCurrentCampaign(active);
      setMainPost(active.mainPost);
      setPostGoal(active.postGoal);
      setSourceUrl(active.sourceUrl || "");
      setCampaignType(active.campaignType || "both");
    }
  }, []);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setLoading(false);
    loadActiveCampaign();
  }, [loadActiveCampaign]);

  const handleLogin = async () => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (data.success) {
      setAuthenticated(true);
      setAuthed(true);
      setLoginError("");
    } else {
      setLoginError("Invalid password");
    }
  };

  const handleGenerate = async () => {
    if (!mainPost.trim() || !postGoal.trim()) return;
    setGenerating(true);
    setProgress("Generating content... This may take a minute.");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainPost: mainPost.trim(),
          postGoal: postGoal.trim(),
          numberOfVariations: campaignType === "comments" ? 0 : variations,
          numberOfComments: campaignType === "posts" ? 0 : commentCount,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const data = await res.json();

      // Remove all existing campaigns and create new one
      const allCampaigns = getCampaigns();
      allCampaigns.forEach((c) => {
        localStorage.removeItem(`linkedin_amplifier_campaigns`);
      });

      const campaign: Campaign = {
        id: crypto.randomUUID(),
        mainPost: mainPost.trim(),
        postGoal: postGoal.trim(),
        sourceUrl: sourceUrl.trim(),
        campaignType,
        posts: data.posts || [],
        comments: data.comments || [],
        createdAt: new Date().toISOString(),
        published: false,
      };

      // Clear all campaigns and save only this one
      localStorage.setItem("linkedin_amplifier_campaigns", JSON.stringify([campaign]));
      setCurrentCampaign(campaign);
      setProgress(
        `Generated ${data.posts.length} posts and ${data.comments.length} comments`
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Generation failed";
      setProgress(`Error: ${message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateMore = async (type: "posts" | "comments") => {
    if (!currentCampaign) return;
    setGenerating(true);
    const isPosts = type === "posts";
    setProgress(`Generating more ${type}...`);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainPost: currentCampaign.mainPost,
          postGoal: currentCampaign.postGoal,
          numberOfVariations: isPosts ? variations : 0,
          numberOfComments: isPosts ? 0 : commentCount,
          existingPosts: currentCampaign.posts,
          existingComments: currentCampaign.comments,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();

      const updated: Campaign = {
        ...currentCampaign,
        posts: [...currentCampaign.posts, ...(data.posts || [])],
        comments: [...currentCampaign.comments, ...(data.comments || [])],
      };

      saveCampaign(updated);
      setCurrentCampaign(updated);

      if (isPosts) {
        setProgress(`+${data.posts?.length || 0} posts. Total: ${updated.posts.length} posts`);
      } else {
        setProgress(`+${data.comments?.length || 0} comments. Total: ${updated.comments.length} comments`);
      }
    } catch {
      setProgress(`Error generating more ${type}.`);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddContentType = async (type: "posts" | "comments") => {
    if (!currentCampaign) return;
    setGenerating(true);
    const isPosts = type === "posts";
    setProgress(`Adding ${type} to campaign...`);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainPost: currentCampaign.mainPost,
          postGoal: currentCampaign.postGoal,
          numberOfVariations: isPosts ? variations : 0,
          numberOfComments: isPosts ? 0 : commentCount,
          existingPosts: currentCampaign.posts,
          existingComments: currentCampaign.comments,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();

      const newType: "posts" | "comments" | "both" =
        (currentCampaign.campaignType || "both") === "both" ? "both"
        : isPosts ? (currentCampaign.campaignType === "comments" ? "both" : "posts")
        : (currentCampaign.campaignType === "posts" ? "both" : "comments");

      const updated: Campaign = {
        ...currentCampaign,
        campaignType: newType,
        sourceUrl: !isPosts && sourceUrl.trim() ? sourceUrl.trim() : currentCampaign.sourceUrl,
        posts: [...currentCampaign.posts, ...(data.posts || [])],
        comments: [...currentCampaign.comments, ...(data.comments || [])],
      };

      saveCampaign(updated);
      setCurrentCampaign(updated);
      setCampaignType(newType);

      if (isPosts) {
        setProgress(`Added ${data.posts?.length || 0} posts. Campaign now has posts & comments.`);
      } else {
        setProgress(`Added ${data.comments?.length || 0} comments. Campaign now has posts & comments.`);
      }
    } catch {
      setProgress(`Error adding ${type}.`);
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = () => {
    if (!currentCampaign) return;
    const updated = { ...currentCampaign, published: true };
    // Write directly to ensure data is saved correctly
    localStorage.setItem("linkedin_amplifier_campaigns", JSON.stringify([updated]));
    setCurrentCampaign(updated);
    setProgress("Campaign is now live!");
  };

  const handleNewCampaign = () => {
    setCurrentCampaign(null);
    setMainPost("");
    setPostGoal("");
    setSourceUrl("");
    setCampaignType("posts");
    setVariations(50);
    setCommentCount(30);
    setProgress("");
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setAuthed(false);
  };

  if (loading) return null;

  // ── Login Screen ──
  if (!authed) {
    return (
      <div className="min-h-screen flex noise-bg">
        {/* Left: Decorative panel */}
        <div className="hidden lg:flex lg:w-[480px] bg-[var(--ink)] relative overflow-hidden flex-col justify-between p-12">
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-8 backdrop-blur-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/>
              </svg>
            </div>
            <h1 className="text-[42px] leading-[1.1] text-white/90 mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
              Post<br />Amplifier
            </h1>
            <p className="text-[13px] text-white/40 leading-relaxed max-w-[280px]">
              Generate hundreds of unique LinkedIn posts and comments for your entire team.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[var(--ink)] bg-white/10 backdrop-blur-sm" />
              ))}
            </div>
            <p className="text-[12px] text-white/30">300+ employees ready</p>
          </div>
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-[var(--linkedin)] rounded-full opacity-10 blur-[80px]" />
        </div>

        {/* Right: Login form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm animate-fade-up">
            <div className="mb-8">
              <div className="lg:hidden flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-[var(--ink)] rounded-xl flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/>
                  </svg>
                </div>
              </div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--ink-faint)] mb-2">Admin Access</p>
              <h2 className="text-3xl text-[var(--ink)]" style={{ fontFamily: 'var(--font-serif)' }}>
                Welcome back
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="input-editorial w-full focus-ring"
                />
              </div>
              {loginError && (
                <div className="flex items-center gap-2 text-[13px] text-[var(--danger)] bg-[var(--danger-surface)] px-3 py-2 rounded-lg animate-scale-in">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {loginError}
                </div>
              )}
              <button onClick={handleLogin} className="btn-primary w-full focus-ring">
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="min-h-screen bg-[var(--background)] noise-bg">
      {/* Header */}
      <header className="bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)] sticky top-0 z-10 animate-slide-down">
        <div className="max-w-[1200px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--ink)] rounded-xl flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-[var(--ink)]">Admin Dashboard</h1>
              <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-[var(--ink-faint)]">
                Single Campaign Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/post")}
              className="px-3 py-1.5 text-[12px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-elevated)] rounded-lg transition-all"
            >
              Employee View
            </button>
            <div className="w-px h-4 bg-[var(--border)]" />
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-[12px] font-medium text-[var(--danger)] hover:bg-[var(--danger-surface)] rounded-lg transition-all"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_420px] gap-6 animate-fade-up">
          {/* Form */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-7">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--linkedin-surface)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--linkedin)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--ink)]">
                    {currentCampaign ? "Active Campaign" : "New Campaign"}
                  </h2>
                  <p className="text-[11px] text-[var(--ink-faint)]">
                    {currentCampaign ? `${currentCampaign.posts.length} posts · ${currentCampaign.comments.length} comments` : "Create posts and comments from a source post"}
                  </p>
                </div>
              </div>
              {currentCampaign && (
                <button
                  onClick={handleNewCampaign}
                  className="px-3 py-1.5 text-[11px] font-medium text-[var(--danger)] border border-[var(--danger)]/20 rounded-lg hover:bg-[var(--danger-surface)] transition-all"
                >
                  Replace Campaign
                </button>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">
                  Main LinkedIn Post
                </label>
                <textarea
                  value={mainPost}
                  onChange={(e) => setMainPost(e.target.value)}
                  placeholder="Paste the original post that will be used as the base for all variations..."
                  className="input-editorial w-full resize-none focus-ring"
                  rows={7}
                  disabled={!!currentCampaign}
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">
                  Post Goal
                </label>
                <select
                  value={postGoal}
                  onChange={(e) => setPostGoal(e.target.value)}
                  className="input-editorial w-full focus-ring cursor-pointer"
                  disabled={!!currentCampaign}
                >
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

              <div>
                <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">
                  Campaign Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "posts", label: "Posts Only" },
                    { value: "comments", label: "Comments Only" },
                    { value: "both", label: "Both" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCampaignType(opt.value)}
                      disabled={!!currentCampaign}
                      className={`py-2.5 px-3 rounded-xl text-[12px] font-medium border transition-all ${
                        campaignType === opt.value
                          ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                          : "bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-strong)]"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {(campaignType === "comments" || campaignType === "both") && (
                <div>
                  <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">
                    Source Post URL
                  </label>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/posts/... (LinkedIn post URL)"
                    className="input-editorial w-full focus-ring"
                    disabled={!!currentCampaign}
                  />
                  <p className="text-[11px] text-[var(--ink-faint)] mt-1">
                    Used to redirect employees to comment on the original post
                  </p>
                </div>
              )}

              <div className={`grid gap-4 ${campaignType === "both" ? "grid-cols-2" : "grid-cols-1"}`}>
                {(campaignType === "posts" || campaignType === "both") && (
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">
                      No. of Posts
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={variations}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setVariations(val === '' ? 0 : parseInt(val));
                      }}
                      onBlur={() => setVariations(Math.max(5, Math.min(100, variations || 50)))}
                      className="input-editorial w-full focus-ring"
                    />
                  </div>
                )}
                {(campaignType === "comments" || campaignType === "both") && (
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">
                      No. of Comments
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={commentCount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setCommentCount(val === '' ? 0 : parseInt(val));
                      }}
                      onBlur={() => setCommentCount(Math.max(5, Math.min(200, commentCount || 30)))}
                      className="input-editorial w-full focus-ring"
                    />
                  </div>
                )}
              </div>

              {!currentCampaign && (
                <button
                  onClick={handleGenerate}
                  disabled={generating || !mainPost.trim() || !postGoal}
                  className={`btn-primary w-full flex items-center justify-center gap-2.5 focus-ring ${generating ? 'animate-pulse-glow' : ''}`}
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Content
                    </>
                  )}
                </button>
              )}

              {progress && (
                <div className={`flex items-center gap-2 text-[13px] px-4 py-3 rounded-xl animate-scale-in ${
                  progress.startsWith("Error")
                    ? "bg-[var(--danger-surface)] text-[var(--danger)]"
                    : "bg-[var(--success-surface)] text-[var(--success)]"
                }`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    {progress.startsWith("Error") ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    )}
                  </svg>
                  {progress}
                </div>
              )}
            </div>
          </div>

          {/* Preview panel */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 self-start sticky top-20">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--ink-faint)] mb-5">Preview</p>

            {currentCampaign ? (
              <div className="space-y-5 animate-fade-up">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentCampaign.published ? 'bg-[var(--success)]' : 'bg-[var(--accent-warm)]'}`} />
                  <span className={`text-[11px] font-semibold tracking-[0.1em] uppercase ${
                    currentCampaign.published ? 'text-[var(--success)]' : 'text-[var(--accent-warm)]'
                  }`}>
                    {currentCampaign.published ? "Live" : "Draft"}
                  </span>
                </div>

                {/* Main post quote */}
                <div className="relative pl-4 border-l-2 border-[var(--linkedin)]">
                  <p className="text-[12px] text-[var(--ink-muted)] leading-relaxed line-clamp-4">
                    {currentCampaign.mainPost}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--surface-elevated)] rounded-xl p-4 text-center border border-[var(--border)]">
                    <p className="text-[28px] font-semibold text-[var(--ink)] leading-none mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
                      {currentCampaign.posts.length}
                    </p>
                    <p className="text-[11px] text-[var(--ink-faint)] font-medium uppercase tracking-wide">Posts</p>
                  </div>
                  <div className="bg-[var(--surface-elevated)] rounded-xl p-4 text-center border border-[var(--border)]">
                    <p className="text-[28px] font-semibold text-[var(--ink)] leading-none mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
                      {currentCampaign.comments.length}
                    </p>
                    <p className="text-[11px] text-[var(--ink-faint)] font-medium uppercase tracking-wide">Comments</p>
                  </div>
                </div>

                {/* Samples */}
                <div>
                  <p className="text-[11px] font-medium text-[var(--ink-faint)] mb-2 uppercase tracking-wide">Sample output</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {currentCampaign.posts.slice(0, 3).map((post, i) => (
                      <div key={i} className="bg-[var(--surface-elevated)] rounded-lg p-2.5 text-[11px] text-[var(--ink-muted)] leading-relaxed border border-[var(--border)]">
                        {post.substring(0, 120)}...
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <div className={`grid gap-2 ${(currentCampaign.campaignType || "both") === "both" ? "grid-cols-2" : "grid-cols-1"}`}>
                    {((currentCampaign.campaignType || "both") === "posts" || (currentCampaign.campaignType || "both") === "both") && (
                      <button
                        onClick={() => handleGenerateMore("posts")}
                        disabled={generating}
                        className="py-2.5 border border-[var(--border)] text-[var(--ink-muted)] rounded-xl text-[12px] font-medium hover:border-[var(--linkedin)] hover:text-[var(--linkedin)] transition-all disabled:opacity-50"
                      >
                        + {variations} Posts
                      </button>
                    )}
                    {((currentCampaign.campaignType || "both") === "comments" || (currentCampaign.campaignType || "both") === "both") && (
                      <button
                        onClick={() => handleGenerateMore("comments")}
                        disabled={generating}
                        className="py-2.5 border border-[var(--border)] text-[var(--ink-muted)] rounded-xl text-[12px] font-medium hover:border-[var(--linkedin)] hover:text-[var(--linkedin)] transition-all disabled:opacity-50"
                      >
                        + {commentCount} Comments
                      </button>
                    )}
                  </div>
                  {/* Add missing content type */}
                  {(currentCampaign.campaignType || "both") === "posts" && (
                    <div className="border border-dashed border-[var(--linkedin)]/40 rounded-xl p-3 bg-[var(--linkedin-surface)]/30">
                      <p className="text-[11px] text-[var(--ink-muted)] mb-2 text-center">No comments yet. Want to add?</p>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={sourceUrl}
                          onChange={(e) => setSourceUrl(e.target.value)}
                          placeholder="Source post URL..."
                          className="input-editorial flex-1 !py-2 !text-[11px]"
                        />
                        <button
                          onClick={() => handleAddContentType("comments")}
                          disabled={generating}
                          className="shrink-0 py-2 px-3 bg-[var(--linkedin)] text-white rounded-lg text-[11px] font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Add {commentCount} Comments
                        </button>
                      </div>
                    </div>
                  )}
                  {(currentCampaign.campaignType || "both") === "comments" && (
                    <button
                      onClick={() => handleAddContentType("posts")}
                      disabled={generating}
                      className="w-full py-2.5 border border-dashed border-[var(--linkedin)]/40 bg-[var(--linkedin-surface)]/30 text-[var(--linkedin)] rounded-xl text-[12px] font-medium hover:bg-[var(--linkedin-surface)] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add {variations} Posts to Campaign
                    </button>
                  )}
                  {!currentCampaign.published && (
                    <button
                      onClick={handlePublish}
                      className="py-2.5 w-full bg-[var(--success)] text-white rounded-xl text-[12px] font-medium hover:opacity-90 transition-all"
                    >
                      Publish Campaign
                    </button>
                  )}
                  {currentCampaign.published && (
                    <div className="py-2.5 bg-[var(--success-surface)] text-[var(--success)] rounded-xl text-[12px] font-medium text-center flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Campaign is Live
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-[var(--ink-faint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-[13px] text-[var(--ink-faint)]">Generate content<br />to see a preview</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
