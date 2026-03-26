const AUTH_KEY = "linkedin_amplifier_auth";
const COPIED_KEY = "linkedin_amplifier_copied";

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
