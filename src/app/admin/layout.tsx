"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CampaignWithMetrics } from "@/lib/types";
import { isAuthenticated, setAuthenticated } from "@/lib/storage";

interface AdminContextType {
  campaigns: CampaignWithMetrics[];
  activeCampaign: CampaignWithMetrics | null;
  loadCampaigns: () => Promise<void>;
  generating: boolean;
  setGenerating: (v: boolean) => void;
  progress: string;
  setProgress: (v: string) => void;
}

const AdminContext = createContext<AdminContextType | null>(null);
export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminLayout");
  return ctx;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<CampaignWithMetrics | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
        setActiveCampaign(data.find((c: CampaignWithMetrics) => c.is_active) || null);
      }
    } catch { /* silent */ }
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

  const handleLogout = () => {
    setAuthenticated(false);
    setAuthed(false);
  };

  if (loading) return null;

  // ── Login Gate ──
  if (!authed) {
    return (
      <div className="min-h-screen flex noise-bg">
        <div className="hidden lg:flex lg:w-[440px] bg-[var(--ink)] relative overflow-hidden flex-col justify-between p-12">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative z-10">
            <div className="w-11 h-11 bg-white/[0.08] rounded-xl flex items-center justify-center mb-10 border border-white/[0.06]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/>
              </svg>
            </div>
            <h1 className="text-[38px] leading-[1.08] text-white/90 mb-3 tracking-[-0.02em] font-bold">
              Post<br />Amplifier
            </h1>
            <p className="text-[13px] text-white/30 leading-[1.7] max-w-[260px]">
              Command center for LinkedIn campaign management. Generate, publish, and track engagement across your team.
            </p>
          </div>
          <div className="relative z-10">
            <div className="w-full h-px bg-white/[0.06] mb-6" />
            <p className="text-[11px] text-white/20 tracking-[0.1em] uppercase">Admin Console</p>
          </div>
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-[var(--linkedin)] rounded-full opacity-[0.06] blur-[100px]" />
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-[var(--accent-warm)] rounded-full opacity-[0.04] blur-[80px]" />
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-[340px] animate-fade-up">
            <div className="mb-10">
              <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-[var(--ink-faint)] mb-3">Admin Access</p>
              <h2 className="text-[28px] font-bold text-[var(--ink)] tracking-[-0.02em]">Welcome back</h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-2 tracking-[0.08em] uppercase">Password</label>
                <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} className="input-editorial w-full focus-ring" />
              </div>
              {loginError && (
                <div className="flex items-center gap-2.5 text-[12px] text-[var(--danger)] bg-[var(--danger-surface)] px-3.5 py-2.5 rounded-xl animate-scale-in border border-[var(--danger)]/10">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
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

  // ── Authenticated Shell — Top Navbar ──
  const tabs = [
    { label: "Campaign", href: "/admin" },
    { label: "History", href: "/admin/history" },
  ];

  return (
    <AdminContext.Provider value={{ campaigns, activeCampaign, loadCampaigns, generating, setGenerating, progress, setProgress }}>
      <div className="min-h-screen bg-[var(--background)] noise-bg">
        {/* ── Top Navbar ── */}
        <header className="sticky top-0 z-30 bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)] animate-slide-down">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex items-center justify-between h-14">
              {/* Left: Logo + Brand + Tabs */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-[var(--ink)] rounded-lg flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/>
                    </svg>
                  </div>
                  <span className="text-[14px] font-semibold text-[var(--ink)]">Amplifier</span>
                </div>

                {/* Divider */}
                <div className="w-px h-5 bg-[var(--border)]" />

                {/* Tab navigation */}
                <nav className="flex items-center gap-1">
                  {tabs.map((tab) => {
                    const isActive = pathname === tab.href;
                    return (
                      <button
                        key={tab.href}
                        onClick={() => router.push(tab.href)}
                        className={`relative px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                          isActive
                            ? "text-[var(--ink)] bg-[var(--surface-elevated)]"
                            : "text-[var(--ink-faint)] hover:text-[var(--ink-muted)] hover:bg-[var(--surface-elevated)]/50"
                        }`}
                      >
                        {tab.label}
                        {isActive && (
                          <div className="absolute bottom-[-13px] left-3 right-3 h-[2px] bg-[var(--linkedin)] rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Right: Status + Actions */}
              <div className="flex items-center gap-3">
                {activeCampaign && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--success-surface)] border border-[var(--success)]/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                    <span className="text-[11px] font-medium text-[var(--success)]">Live</span>
                  </div>
                )}
                <button
                  onClick={() => router.push("/")}
                  className="px-3 py-1.5 text-[12px] font-medium text-[var(--ink-faint)] hover:text-[var(--ink-muted)] hover:bg-[var(--surface-elevated)] rounded-lg transition-all cursor-pointer"
                >
                  Employee View
                </button>
                <div className="w-px h-4 bg-[var(--border)]" />
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-[12px] font-medium text-[var(--ink-faint)] hover:text-[var(--danger)] hover:bg-[var(--danger-surface)] rounded-lg transition-all cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Progress toast */}
        {progress && (
          <div className="fixed bottom-6 right-6 z-50 animate-scale-in">
            <div className={`flex items-center gap-2.5 text-[12px] font-medium px-4 py-3 rounded-xl shadow-lg border ${
              progress.startsWith("Error")
                ? "bg-[var(--danger-surface)] text-[var(--danger)] border-[var(--danger)]/10"
                : "bg-[var(--surface)] text-[var(--ink)] border-[var(--border)]"
            }`}>
              {progress.startsWith("Error") ? (
                <svg className="w-4 h-4 shrink-0 text-[var(--danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-4 h-4 shrink-0 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              )}
              {progress}
              <button onClick={() => setProgress("")} className="ml-2 text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors cursor-pointer">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* Page content — centered, max-w-5xl to fill properly */}
        <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-up">
          {children}
        </div>
      </div>
    </AdminContext.Provider>
  );
}
