"use client";

import { useState } from "react";
import { useAdmin } from "../layout";
import { CampaignWithMetrics } from "@/lib/types";

type SortKey = "date" | "goal" | "posts" | "comments" | "copies" | "users";
type SortDir = "asc" | "desc";

export default function HistoryPage() {
  const { campaigns } = useAdmin();
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // All non-active campaigns
  const historyCampaigns = campaigns.filter((c) => !c.is_active);

  const sorted = [...historyCampaigns].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "goal": return dir * (a.post_goal || "").localeCompare(b.post_goal || "");
      case "posts": return dir * (a.posts.length - b.posts.length);
      case "comments": return dir * (a.comments.length - b.comments.length);
      case "copies": return dir * (a.metrics.totalCopies - b.metrics.totalCopies);
      case "users": return dir * (a.metrics.uniqueUsers - b.metrics.uniqueUsers);
      default: return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };


  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <svg className="w-3 h-3 text-[var(--ink-faint)]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
    return sortDir === "desc"
      ? <svg className="w-3 h-3 text-[var(--linkedin)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      : <svg className="w-3 h-3 text-[var(--linkedin)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getTypeBadge = (c: CampaignWithMetrics) => {
    const type = c.campaign_type;
    if (type === "both") return { label: "Both", bg: "bg-[var(--surface-elevated)]", text: "text-[var(--ink-muted)]" };
    if (type === "posts") return { label: "Posts", bg: "bg-[var(--linkedin-surface)]", text: "text-[var(--linkedin)]" };
    return { label: "Comments", bg: "bg-[var(--accent-warm-surface)]", text: "text-[var(--accent-warm)]" };
  };

  // Summary stats
  const totalCampaigns = historyCampaigns.length;
  const totalCopies = historyCampaigns.reduce((sum, c) => sum + c.metrics.totalCopies, 0);
  const totalPosts = historyCampaigns.reduce((sum, c) => sum + c.posts.length, 0);

  return (
    <div className="">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Past Campaigns", value: totalCampaigns },
          { label: "Total Content Generated", value: totalPosts },
          { label: "All-Time Copies", value: totalCopies },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] px-5 py-4 animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <p className="text-[28px] font-bold text-[var(--ink)] leading-none mb-1 tracking-[-0.03em]">
              {stat.value}
            </p>
            <p className="text-[10px] font-semibold text-[var(--ink-faint)] uppercase tracking-[0.12em]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
          <svg className="w-8 h-8 text-[var(--ink-faint)]/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[14px] text-[var(--ink-muted)]">No campaign history yet</p>
          <p className="text-[12px] text-[var(--ink-faint)] mt-1">Previous campaigns will appear here after you create and publish new ones.</p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden animate-fade-up" style={{ animationDelay: '120ms' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]/60">
                {[
                  { key: "goal" as SortKey, label: "Campaign", align: "text-left" },
                  { key: "date" as SortKey, label: "Date", align: "text-left" },
                  { key: "posts" as SortKey, label: "Posts", align: "text-right" },
                  { key: "comments" as SortKey, label: "Comments", align: "text-right" },
                  { key: "copies" as SortKey, label: "Copies", align: "text-right" },
                  { key: "users" as SortKey, label: "Users", align: "text-right" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`px-5 py-3.5 ${col.align}`}
                  >
                    <button
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--ink-faint)] hover:text-[var(--ink-muted)] transition-colors cursor-pointer"
                    >
                      {col.label}
                      <SortIcon col={col.key} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, idx) => {
                const badge = getTypeBadge(c);
                return (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--border)]/30 last:border-b-0 hover:bg-[var(--surface-elevated)]/50 transition-colors group"
                    style={{ animationDelay: `${(idx + 2) * 40}ms` }}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-[13px] font-medium text-[var(--ink)] leading-tight">{c.post_goal || "Untitled"}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-[0.05em] uppercase ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                            {c.published && (
                              <span className="text-[10px] text-[var(--ink-faint)]">Published</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[12px] text-[var(--ink-muted)]">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-[14px] font-semibold text-[var(--ink)]">{c.posts.length}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-[14px] font-semibold text-[var(--ink)]">{c.comments.length}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-[14px] font-semibold text-[var(--ink)]">{c.metrics.totalCopies}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-[14px] font-semibold text-[var(--ink)]">{c.metrics.uniqueUsers}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
