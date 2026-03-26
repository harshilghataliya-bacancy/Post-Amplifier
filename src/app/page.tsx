"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getActiveCampaign } from "@/lib/storage";

export default function HomePage() {
  const [hasActive, setHasActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setHasActive(!!getActiveCampaign());
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] noise-bg flex flex-col">
      {/* Header */}
      <header className="bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)] animate-slide-down">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="relative">
            <div className="w-11 h-11 bg-[var(--ink)] rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1 4.98 2.12 4.98 3.5zM.35 8.35h4.29v13.65H.35V8.35zM8.51 8.35h4.11v1.87h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.57v7.56h-4.29v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53v6.82H8.51V8.35z" fill="white"/>
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--linkedin)] rounded-full border-2 border-[var(--surface)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--ink)]" style={{ fontFamily: 'var(--font-serif)' }}>
              Post Amplifier
            </h1>
            <p className="text-[11px] font-medium tracking-widest uppercase text-[var(--ink-faint)]">
              Team Content Hub
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className={`w-full max-w-2xl transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {!hasActive ? (
            <div className="text-center py-20 animate-fade-up">
              <div className="w-20 h-20 bg-[var(--surface)] rounded-2xl border border-[var(--border)] flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[var(--ink-faint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-2xl text-[var(--ink)] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                No active campaign
              </h2>
              <p className="text-[14px] text-[var(--ink-faint)] max-w-xs mx-auto">
                Ask your admin to publish a campaign to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-up">
              <div className="text-center">
                <h2
                  className="text-4xl leading-[1.1] tracking-tight text-[var(--ink)] mb-3"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Amplify on LinkedIn
                </h2>
                <p className="text-[15px] text-[var(--ink-muted)]">
                  Choose an action below to get your unique content.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Get a Post */}
                <Link
                  href="/post"
                  className="group bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-8 card-hover relative overflow-hidden text-center"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--linkedin)] via-[var(--linkedin)]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-14 h-14 rounded-2xl bg-[var(--ink)] flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-[18px] font-semibold text-[var(--ink)] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                    Get a Post
                  </h3>
                  <p className="text-[13px] text-[var(--ink-faint)] leading-relaxed">
                    Copy a unique post and share it on your LinkedIn profile
                  </p>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--linkedin)] opacity-0 group-hover:opacity-100 transition-all">
                    Get your post
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>

                {/* Get a Comment */}
                <Link
                  href="/comment"
                  className="group bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-8 card-hover relative overflow-hidden text-center"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--linkedin)] via-[var(--linkedin)]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-14 h-14 rounded-2xl bg-[var(--ink)] flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-[18px] font-semibold text-[var(--ink)] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                    Get a Comment
                  </h3>
                  <p className="text-[13px] text-[var(--ink-faint)] leading-relaxed">
                    Copy a unique comment and post it on the source LinkedIn post
                  </p>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--linkedin)] opacity-0 group-hover:opacity-100 transition-all">
                    Get your comment
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-2xl mx-auto px-6 py-6 w-full">
        <p className="text-[11px] text-[var(--ink-faint)] tracking-wide text-center">
          LinkedIn Post Amplifier &middot; Internal Tool
        </p>
      </footer>
    </div>
  );
}
