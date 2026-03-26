"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CampaignWithMetrics } from "@/lib/types";
import { isAuthenticated, setAuthenticated } from "@/lib/storage";

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);

  // Campaign data from Supabase
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<CampaignWithMetrics | null>(null);

  // New campaign form
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [mainPost, setMainPost] = useState("");
  const [postGoal, setPostGoal] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [campaignType, setCampaignType] = useState<"posts" | "comments" | "both">("both");
  const [variations, setVariations] = useState(50);
  const [commentCount, setCommentCount] = useState(30);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
        const active = data.find((c: CampaignWithMetrics) => c.is_active);
        setActiveCampaign(active || null);
        if (!active) setShowNewForm(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed) loadCampaigns();
  }, [authed, loadCampaigns]);

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

  const handleFetchUrl = async () => {
    if (!linkedinUrl.trim()) return;
    setFetchingUrl(true);
    try {
      const res = await fetch("/api/fetch-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkedinUrl.trim() }),
      });
      const data = await res.json();
      if (data.text && !data.text.toLowerCase().includes("sign in or join now")) {
        setMainPost(data.text);
        setSourceUrl(linkedinUrl.trim());
        setProgress(`Fetched via ${data.method}`);
      } else {
        setSourceUrl(linkedinUrl.trim());
        setProgress("LinkedIn blocked auto-fetch. Please paste the post content below.");
      }
    } catch {
      setProgress("Failed to fetch. Please paste manually.");
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleGenerate = async () => {
    if (!mainPost.trim() || !postGoal.trim()) return;
    setGenerating(true);
    setProgress("Generating content...");

    try {
      // 1. Create campaign in Supabase
      const createRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          main_post: mainPost.trim(),
          post_goal: postGoal.trim(),
          source_url: sourceUrl.trim(),
          linkedin_url: linkedinUrl.trim(),
          campaign_type: campaignType,
        }),
      });
      if (!createRes.ok) throw new Error("Failed to create campaign");
      const campaign = await createRes.json();

      // 2. Generate content
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainPost: mainPost.trim(),
          postGoal: postGoal.trim(),
          numberOfVariations: campaignType === "comments" ? 0 : variations,
          numberOfComments: campaignType === "posts" ? 0 : commentCount,
        }),
      });
      if (!genRes.ok) throw new Error("Generation failed");
      const genData = await genRes.json();

      // 3. Update campaign with generated content
      await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posts: genData.posts || [],
          comments: genData.comments || [],
        }),
      });

      setProgress(`Generated ${(genData.posts || []).length} posts and ${(genData.comments || []).length} comments`);
      setShowNewForm(false);
      resetForm();
      await loadCampaigns();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Generation failed";
      setProgress(`Error: ${message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await fetch(`/api/campaigns/${id}/publish`, { method: "POST" });
      await loadCampaigns();
      setProgress("Campaign is now live!");
    } catch {
      setProgress("Failed to publish");
    }
  };

  const handleGenerateMore = async (type: "posts" | "comments") => {
    if (!activeCampaign) return;
    setGenerating(true);
    setProgress(`Generating more ${type}...`);

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

      setProgress(`+${type === "posts" ? (data.posts?.length || 0) : (data.comments?.length || 0)} ${type}`);
      await loadCampaigns();
    } catch {
      setProgress(`Error generating more ${type}.`);
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setLinkedinUrl("");
    setMainPost("");
    setPostGoal("");
    setSourceUrl("");
    setCampaignType("both");
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setAuthed(false);
  };

  const previousCampaigns = campaigns.filter((c) => !c.is_active);

  if (loading) return null;

  // ── Login Screen ──
  if (!authed) {
    return (
      <div className="min-h-screen flex noise-bg">
        <div className="hidden lg:flex lg:w-[480px] bg-[var(--ink)] relative overflow-hidden flex-col justify-between p-12">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-8 backdrop-blur-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/>
              </svg>
            </div>
            <h1 className="text-[42px] leading-[1.1] text-white/90 mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Post<br />Amplifier</h1>
            <p className="text-[13px] text-white/40 leading-relaxed max-w-[280px]">Generate hundreds of unique LinkedIn posts and comments for your entire team.</p>
          </div>
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-[var(--linkedin)] rounded-full opacity-10 blur-[80px]" />
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm animate-fade-up">
            <div className="mb-8">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--ink-faint)] mb-2">Admin Access</p>
              <h2 className="text-3xl text-[var(--ink)]" style={{ fontFamily: 'var(--font-serif)' }}>Welcome back</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">Password</label>
                <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} className="input-editorial w-full focus-ring" />
              </div>
              {loginError && (
                <div className="flex items-center gap-2 text-[13px] text-[var(--danger)] bg-[var(--danger-surface)] px-3 py-2 rounded-lg animate-scale-in">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  {loginError}
                </div>
              )}
              <button onClick={handleLogin} className="btn-primary w-full focus-ring">Sign in</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="min-h-screen bg-[var(--background)] noise-bg">
      <header className="bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)] sticky top-0 z-10 animate-slide-down">
        <div className="max-w-[1100px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--ink)] rounded-xl flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/></svg>
            </div>
            <h1 className="text-[15px] font-semibold text-[var(--ink)]">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/")} className="px-3 py-1.5 text-[12px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-elevated)] rounded-lg transition-all">Employee View</button>
            <div className="w-px h-4 bg-[var(--border)]" />
            <button onClick={handleLogout} className="px-3 py-1.5 text-[12px] font-medium text-[var(--danger)] hover:bg-[var(--danger-surface)] rounded-lg transition-all">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-8 space-y-6 animate-fade-up">

        {/* Active Campaign */}
        {activeCampaign && (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[var(--success)]">Live Campaign</span>
              </div>
              <button onClick={() => { setShowNewForm(true); }} className="px-3 py-1.5 text-[11px] font-medium text-[var(--ink-muted)] border border-[var(--border)] rounded-lg hover:border-[var(--border-strong)] transition-all">
                + New Campaign
              </button>
            </div>

            {/* Source post preview */}
            <div className="relative pl-4 border-l-2 border-[var(--linkedin)] mb-5">
              <p className="text-[12px] text-[var(--ink-muted)] leading-relaxed line-clamp-3">{activeCampaign.main_post}</p>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: "Posts", value: activeCampaign.posts.length },
                { label: "Comments", value: activeCampaign.comments.length },
                { label: "Total Copies", value: activeCampaign.metrics.totalCopies },
                { label: "Unique Users", value: activeCampaign.metrics.uniqueUsers },
              ].map((stat) => (
                <div key={stat.label} className="bg-[var(--surface-elevated)] rounded-xl p-3 text-center border border-[var(--border)]">
                  <p className="text-[22px] font-semibold text-[var(--ink)] leading-none mb-1" style={{ fontFamily: 'var(--font-serif)' }}>{stat.value}</p>
                  <p className="text-[10px] text-[var(--ink-faint)] font-medium uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {(activeCampaign.campaign_type === "posts" || activeCampaign.campaign_type === "both") && (
                <button onClick={() => handleGenerateMore("posts")} disabled={generating} className="flex-1 py-2.5 border border-[var(--border)] text-[var(--ink-muted)] rounded-xl text-[12px] font-medium hover:border-[var(--linkedin)] hover:text-[var(--linkedin)] transition-all disabled:opacity-50">
                  + More Posts
                </button>
              )}
              {(activeCampaign.campaign_type === "comments" || activeCampaign.campaign_type === "both") && (
                <button onClick={() => handleGenerateMore("comments")} disabled={generating} className="flex-1 py-2.5 border border-[var(--border)] text-[var(--ink-muted)] rounded-xl text-[12px] font-medium hover:border-[var(--linkedin)] hover:text-[var(--linkedin)] transition-all disabled:opacity-50">
                  + More Comments
                </button>
              )}
            </div>
          </div>
        )}

        {/* New Campaign Form */}
        {(showNewForm || !activeCampaign) && (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-semibold text-[var(--ink)]">New Campaign</h2>
              {activeCampaign && (
                <button onClick={() => setShowNewForm(false)} className="text-[12px] text-[var(--ink-faint)] hover:text-[var(--ink)] transition-all">Cancel</button>
              )}
            </div>

            <div className="space-y-4">
              {/* LinkedIn URL */}
              <div>
                <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">LinkedIn Post URL</label>
                <div className="flex gap-2">
                  <input type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://www.linkedin.com/posts/..." className="input-editorial flex-1 focus-ring" />
                  <button onClick={handleFetchUrl} disabled={fetchingUrl || !linkedinUrl.trim()} className="px-4 py-2 bg-[var(--linkedin)] text-white rounded-xl text-[12px] font-medium hover:opacity-90 transition-all disabled:opacity-50 shrink-0">
                    {fetchingUrl ? "Fetching..." : "Fetch Post"}
                  </button>
                </div>
              </div>

              {/* Main post text */}
              <div>
                <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">Post Content</label>
                <textarea value={mainPost} onChange={(e) => setMainPost(e.target.value)} placeholder="Paste or fetch the original LinkedIn post..." className="input-editorial w-full resize-none focus-ring" rows={5} />
              </div>

              {/* Goal + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">Post Goal</label>
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
                <div>
                  <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">Campaign Type</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([ { value: "posts", label: "Posts" }, { value: "comments", label: "Comments" }, { value: "both", label: "Both" } ] as const).map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setCampaignType(opt.value)}
                        className={`py-2 px-2 rounded-lg text-[11px] font-medium border transition-all ${campaignType === opt.value ? "bg-[var(--ink)] text-white border-[var(--ink)]" : "bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-strong)]"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Source URL for comments */}
              {(campaignType === "comments" || campaignType === "both") && !sourceUrl && (
                <div>
                  <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">Source Post URL (for comments redirect)</label>
                  <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://www.linkedin.com/posts/..." className="input-editorial w-full focus-ring" />
                </div>
              )}

              {/* Counts */}
              <div className="grid grid-cols-2 gap-4">
                {campaignType !== "comments" && (
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">Posts to Generate</label>
                    <input type="text" inputMode="numeric" value={variations} onChange={(e) => setVariations(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} className="input-editorial w-full focus-ring" />
                  </div>
                )}
                {campaignType !== "posts" && (
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 tracking-wide uppercase">Comments to Generate</label>
                    <input type="text" inputMode="numeric" value={commentCount} onChange={(e) => setCommentCount(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} className="input-editorial w-full focus-ring" />
                  </div>
                )}
              </div>

              <button onClick={handleGenerate} disabled={generating || !mainPost.trim() || !postGoal}
                className={`btn-primary w-full flex items-center justify-center gap-2.5 focus-ring ${generating ? 'animate-pulse-glow' : ''}`}>
                {generating ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Generating...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Generate &amp; Create Campaign</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Progress message */}
        {progress && (
          <div className={`flex items-center gap-2 text-[13px] px-4 py-3 rounded-xl animate-scale-in ${
            progress.startsWith("Error") ? "bg-[var(--danger-surface)] text-[var(--danger)]" : "bg-[var(--success-surface)] text-[var(--success)]"
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

        {/* Draft campaigns (unpublished) */}
        {campaigns.filter((c) => !c.is_active && !c.published).length > 0 && (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--ink-faint)] mb-4">Draft Campaigns</p>
            <div className="space-y-3">
              {campaigns.filter((c) => !c.is_active && !c.published).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border)]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--ink)] truncate">{c.post_goal || "No goal"}</p>
                    <p className="text-[11px] text-[var(--ink-faint)]">{c.posts.length} posts, {c.comments.length} comments</p>
                  </div>
                  <button onClick={() => handlePublish(c.id)} className="px-3 py-1.5 bg-[var(--success)] text-white rounded-lg text-[11px] font-medium hover:opacity-90 transition-all">
                    Publish
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous Campaigns */}
        {previousCampaigns.filter((c) => c.published).length > 0 && (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--ink-faint)] mb-4">Previous Campaigns</p>
            <div className="space-y-3">
              {previousCampaigns.filter((c) => c.published).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border)]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--ink)] truncate">{c.post_goal}</p>
                    <p className="text-[11px] text-[var(--ink-faint)]">
                      {c.posts.length} posts, {c.comments.length} comments · {c.metrics.totalCopies} copies · {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => handlePublish(c.id)} className="px-3 py-1.5 border border-[var(--border)] text-[var(--ink-muted)] rounded-lg text-[11px] font-medium hover:border-[var(--linkedin)] hover:text-[var(--linkedin)] transition-all">
                    Reactivate
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
