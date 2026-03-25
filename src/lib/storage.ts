import { Campaign } from "./types";

const CAMPAIGNS_KEY = "linkedin_amplifier_campaigns";
const AUTH_KEY = "linkedin_amplifier_auth";

export function getCampaigns(): Campaign[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(CAMPAIGNS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveCampaign(campaign: Campaign): void {
  const campaigns = getCampaigns();
  const index = campaigns.findIndex((c) => c.id === campaign.id);
  if (index >= 0) {
    campaigns[index] = campaign;
  } else {
    campaigns.unshift(campaign);
  }
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
}

export function getCampaign(id: string): Campaign | null {
  return getCampaigns().find((c) => c.id === id) || null;
}

export function deleteCampaign(id: string): void {
  const campaigns = getCampaigns().filter((c) => c.id !== id);
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(AUTH_KEY) === "true";
}

export function setAuthenticated(value: boolean): void {
  if (value) {
    sessionStorage.setItem(AUTH_KEY, "true");
  } else {
    sessionStorage.removeItem(AUTH_KEY);
  }
}

// Track copied items per user (per browser)
const COPIED_KEY = "linkedin_amplifier_copied";

interface CopiedItems {
  [campaignId: string]: {
    posts: number[];
    comments: number[];
  };
}

export function getCopiedItems(): CopiedItems {
  if (typeof window === "undefined") return {};
  const data = localStorage.getItem(COPIED_KEY);
  return data ? JSON.parse(data) : {};
}

export function markCopied(
  campaignId: string,
  type: "posts" | "comments",
  index: number
): void {
  const copied = getCopiedItems();
  if (!copied[campaignId]) {
    copied[campaignId] = { posts: [], comments: [] };
  }
  if (!copied[campaignId][type].includes(index)) {
    copied[campaignId][type].push(index);
  }
  localStorage.setItem(COPIED_KEY, JSON.stringify(copied));
}
