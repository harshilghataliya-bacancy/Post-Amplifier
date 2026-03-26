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
  const [sidebarHover, setSidebarHover] = useState(false);

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
        {/* Left panel — dark branding */}
        <div className="hidden lg:flex lg:w-[440px] bg-[var(--ink)] relative overflow-hidden flex-col justify-between p-12">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative z-10">
            <div className="w-11 h-11 bg-white/[0.08] rounded-xl flex items-center justify-center mb-10 border border-white/[0.06]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/>
              </svg>
            </div>
            <h1 className="text-[38px] leading-[1.08] text-white/90 mb-3 tracking-[-0.02em]" style={{ fontFamily: 'var(--font-serif)' }}>
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

        {/* Right panel — login */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-[340px] animate-fade-up">
            <div className="mb-10">
              <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-[var(--ink-faint)] mb-3">Admin Access</p>
              <h2 className="text-[28px] text-[var(--ink)] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-serif)' }}>Welcome back</h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-2 tracking-[0.08em] uppercase">Password</label>
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

  // ── Authenticated Shell ──
  const navItems = [
    {
      label: "Campaign",
      href: "/admin",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: "History",
      href: "/admin/history",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <AdminContext.Provider value={{ campaigns, activeCampaign, loadCampaigns, generating, setGenerating, progress, setProgress }}>
      <div className="min-h-screen flex bg-[var(--background)]">
        {/* ── Sidebar ── */}
        <aside
          className="fixed left-0 top-0 bottom-0 z-30 bg-[var(--ink)] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
          style={{ width: sidebarHover ? 200 : 64 }}
          onMouseEnter={() => setSidebarHover(true)}
          onMouseLeave={() => setSidebarHover(false)}
        >
          {/* Texture */}
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          {/* Logo */}
          <div className="relative z-10 flex items-center h-16 px-[18px] border-b border-white/[0.06]">
            <div className="w-7 h-7 bg-white/[0.08] rounded-lg flex items-center justify-center shrink-0 border border-white/[0.04]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/>
              </svg>
            </div>
            <span
              className="ml-3 text-[13px] font-semibold text-white/80 whitespace-nowrap transition-opacity duration-200"
              style={{ opacity: sidebarHover ? 1 : 0 }}
            >
              Amplifier
            </span>
          </div>

          {/* Navigation */}
          <nav className="relative z-10 flex-1 py-4 px-2.5 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 rounded-xl h-11 transition-all duration-200 group relative ${
                    isActive
                      ? "bg-white/[0.08] text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                  }`}
                  style={{ paddingLeft: 14 }}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--linkedin)] rounded-r-full" />
                  )}
                  <span className="shrink-0">{item.icon}</span>
                  <span
                    className="text-[12px] font-medium whitespace-nowrap transition-opacity duration-200"
                    style={{ opacity: sidebarHover ? 1 : 0 }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="relative z-10 p-2.5 space-y-1 border-t border-white/[0.06]">
            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center gap-3 rounded-xl h-10 text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-200"
              style={{ paddingLeft: 14 }}
            >
              <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-[12px] font-medium whitespace-nowrap transition-opacity duration-200" style={{ opacity: sidebarHover ? 1 : 0 }}>
                Employee View
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-xl h-10 text-white/30 hover:text-red-400/80 hover:bg-red-500/[0.06] transition-all duration-200"
              style={{ paddingLeft: 14 }}
            >
              <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-[12px] font-medium whitespace-nowrap transition-opacity duration-200" style={{ opacity: sidebarHover ? 1 : 0 }}>
                Sign out
              </span>
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 ml-16 min-h-screen noise-bg">
          {/* Top bar */}
          <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-8 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]/60">
            <div>
              <h1 className="text-[18px] font-semibold text-[var(--ink)] tracking-[-0.01em]" style={{ fontFamily: 'var(--font-serif)' }}>
                {pathname === "/admin" ? "Campaign" : "History"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {activeCampaign && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--success-surface)] border border-[var(--success)]/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                  <span className="text-[11px] font-medium text-[var(--success)]">Live</span>
                </div>
              )}
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
                <button onClick={() => setProgress("")} className="ml-2 text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          )}

          {/* Page content */}
          <div className="p-8 animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </AdminContext.Provider>
  );
}
