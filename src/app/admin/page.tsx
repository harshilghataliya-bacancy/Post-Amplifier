"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Campaign } from "@/lib/types";
import {
  isAuthenticated,
  setAuthenticated,
  getCampaigns,
  saveCampaign,
  deleteCampaign,
} from "@/lib/storage";

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);

  const [mainPost, setMainPost] = useState("");
  const [postGoal, setPostGoal] = useState("");
  const [variations, setVariations] = useState(50);
  const [commentCount, setCommentCount] = useState(30);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");

  const loadCampaigns = useCallback(() => {
    setCampaigns(getCampaigns());
  }, []);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setLoading(false);
    loadCampaigns();
  }, [loadCampaigns]);

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
          numberOfVariations: variations,
          numberOfComments: commentCount,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const data = await res.json();

      const campaign: Campaign = {
        id: crypto.randomUUID(),
        mainPost: mainPost.trim(),
        postGoal: postGoal.trim(),
        posts: data.posts,
        comments: data.comments,
        createdAt: new Date().toISOString(),
        published: false,
      };

      saveCampaign(campaign);
      setCurrentCampaign(campaign);
      loadCampaigns();
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
      loadCampaigns();

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

  const handlePublish = () => {
    if (!currentCampaign) return;
    const updated = { ...currentCampaign, published: true };
    saveCampaign(updated);
    loadCampaigns();
    // Auto-clear form after publish
    setCurrentCampaign(null);
    setMainPost("");
    setPostGoal("");
    setVariations(50);
    setCommentCount(30);
    setProgress("");
  };

  const handleUnpublish = (id: string) => {
    const campaign = campaigns.find((c) => c.id === id);
    if (!campaign) return;
    saveCampaign({ ...campaign, published: false });
    loadCampaigns();
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    deleteCampaign(id);
    loadCampaigns();
    if (currentCampaign?.id === id) setCurrentCampaign(null);
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
          {/* Grid pattern */}
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
            <h1
              className="text-[42px] leading-[1.1] text-white/90 mb-4"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Post<br />
              Amplifier
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

          {/* Decorative gradient orb */}
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
              <h2
                className="text-3xl text-[var(--ink)]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
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
              <button
                onClick={handleLogin}
                className="btn-primary w-full focus-ring"
              >
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
              <h1 className="text-[15px] font-semibold text-[var(--ink)]">
                Admin Dashboard
              </h1>
              <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-[var(--ink-faint)]">
                Content Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/")}
              className="px-3 py-1.5 text-[12px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-elevated)] rounded-lg transition-all"
            >
              Public Page
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
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-[var(--surface)] rounded-xl p-1 w-fit border border-[var(--border)] animate-fade-up">
          {(["create", "manage"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200 ${
                activeTab === tab
                  ? "bg-[var(--ink)] text-white shadow-md shadow-black/10"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {tab === "create" ? "Create Campaign" : `Manage (${campaigns.length})`}
            </button>
          ))}
        </div>

        {activeTab === "create" && (
          <div className="grid lg:grid-cols-[1fr_420px] gap-6 animate-fade-up stagger-2">
            {/* Form */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[var(--linkedin-surface)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--linkedin)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--ink)]">New Campaign</h2>
                  <p className="text-[11px] text-[var(--ink-faint)]">Create posts and comments from a source post</p>
                </div>
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

                <div className="grid grid-cols-2 gap-4">
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
                    <p className="text-[11px] text-[var(--ink-faint)] mt-1">
                      1 API call
                    </p>
                  </div>
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
                    <p className="text-[11px] text-[var(--ink-faint)] mt-1">
                      1 API call
                    </p>
                  </div>
                </div>

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
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleGenerateMore("posts")}
                        disabled={generating}
                        className="py-2.5 border border-[var(--border)] text-[var(--ink-muted)] rounded-xl text-[12px] font-medium hover:border-[var(--linkedin)] hover:text-[var(--linkedin)] transition-all disabled:opacity-50"
                      >
                        + {variations} Posts
                      </button>
                      <button
                        onClick={() => handleGenerateMore("comments")}
                        disabled={generating}
                        className="py-2.5 border border-[var(--border)] text-[var(--ink-muted)] rounded-xl text-[12px] font-medium hover:border-[var(--linkedin)] hover:text-[var(--linkedin)] transition-all disabled:opacity-50"
                      >
                        + {commentCount} Comments
                      </button>
                    </div>
                    {!currentCampaign.published ? (
                      <button
                        onClick={handlePublish}
                        className="py-2.5 w-full bg-[var(--success)] text-white rounded-xl text-[12px] font-medium hover:opacity-90 transition-all"
                      >
                        Publish
                      </button>
                    ) : (
                      <div className="py-2.5 bg-[var(--success-surface)] text-[var(--success)] rounded-xl text-[12px] font-medium text-center flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Published
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
        )}

        {activeTab === "manage" && (
          <div className="space-y-3 animate-fade-up stagger-2">
            {campaigns.length === 0 ? (
              <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                <p className="text-[14px] text-[var(--ink-faint)]">No campaigns yet. Create one to get started.</p>
              </div>
            ) : (
              campaigns.map((campaign, i) => (
                <div
                  key={campaign.id}
                  className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 flex items-center gap-5 hover:border-[var(--border-strong)] transition-colors"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {/* Status indicator */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${campaign.published ? 'bg-[var(--success)]' : 'bg-[var(--accent-warm)]'}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className={`text-[10px] font-semibold tracking-[0.15em] uppercase px-2 py-0.5 rounded-md ${
                        campaign.published
                          ? "bg-[var(--success-surface)] text-[var(--success)]"
                          : "bg-[var(--accent-warm-surface)] text-[var(--accent-warm)]"
                      }`}>
                        {campaign.published ? "Live" : "Draft"}
                      </span>
                      <span className="text-[11px] text-[var(--ink-faint)] font-medium">{campaign.postGoal}</span>
                      <span className="text-[11px] text-[var(--ink-faint)]">&middot;</span>
                      <span className="text-[11px] text-[var(--ink-faint)] tabular-nums">
                        {new Date(campaign.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[13px] text-[var(--ink)] truncate">{campaign.mainPost}</p>
                    <p className="text-[11px] text-[var(--ink-faint)] mt-1">
                      {campaign.posts.length} posts &middot; {campaign.comments.length} comments
                    </p>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setCurrentCampaign(campaign);
                        setMainPost(campaign.mainPost);
                        setPostGoal(campaign.postGoal);
                        setActiveTab("create");
                      }}
                      className="px-3 py-1.5 text-[11px] font-medium text-[var(--ink-muted)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-elevated)] transition-all"
                    >
                      Edit
                    </button>
                    {campaign.published ? (
                      <button
                        onClick={() => handleUnpublish(campaign.id)}
                        className="px-3 py-1.5 text-[11px] font-medium text-[var(--accent-warm)] border border-[var(--accent-warm)]/30 rounded-lg hover:bg-[var(--accent-warm-surface)] transition-all"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          saveCampaign({ ...campaign, published: true });
                          loadCampaigns();
                        }}
                        className="px-3 py-1.5 text-[11px] font-medium text-[var(--success)] border border-[var(--success)]/30 rounded-lg hover:bg-[var(--success-surface)] transition-all"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="px-3 py-1.5 text-[11px] font-medium text-[var(--danger)] border border-[var(--danger)]/20 rounded-lg hover:bg-[var(--danger-surface)] transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
