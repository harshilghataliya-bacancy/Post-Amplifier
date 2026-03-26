import { supabase } from "./supabase";

export interface DBCampaign {
  id: string;
  main_post: string;
  post_goal: string;
  source_url: string;
  linkedin_url: string;
  campaign_type: "posts" | "comments" | "both";
  posts: string[];
  comments: string[];
  published: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBMetric {
  id: string;
  campaign_id: string;
  type: "post_copy" | "comment_copy";
  item_index: number;
  copied_at: string;
  user_fingerprint: string;
}

// ── Campaigns ──

export async function getAllCampaigns(): Promise<DBCampaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getActiveCampaign(): Promise<DBCampaign | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data || null;
}

export async function getCampaignById(id: string): Promise<DBCampaign | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function createCampaign(
  campaign: Omit<DBCampaign, "id" | "created_at" | "updated_at">
): Promise<DBCampaign> {
  const { data, error } = await supabase
    .from("campaigns")
    .insert(campaign)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCampaign(
  id: string,
  updates: Partial<DBCampaign>
): Promise<DBCampaign> {
  const { data, error } = await supabase
    .from("campaigns")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function publishCampaign(id: string): Promise<DBCampaign> {
  // Deactivate all other campaigns first
  await supabase
    .from("campaigns")
    .update({ is_active: false, published: false })
    .neq("id", id);

  // Activate this one
  const { data, error } = await supabase
    .from("campaigns")
    .update({ is_active: true, published: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw error;
}

// ── Metrics ──

export async function logCopyEvent(
  campaignId: string,
  type: "post_copy" | "comment_copy",
  itemIndex: number,
  fingerprint?: string
): Promise<void> {
  await supabase.from("campaign_metrics").insert({
    campaign_id: campaignId,
    type,
    item_index: itemIndex,
    user_fingerprint: fingerprint || "",
  });
}

export async function getCampaignMetrics(campaignId: string) {
  const { data, error } = await supabase
    .from("campaign_metrics")
    .select("type, user_fingerprint")
    .eq("campaign_id", campaignId);
  if (error) throw error;

  const metrics = data || [];
  const postCopies = metrics.filter((m) => m.type === "post_copy").length;
  const commentCopies = metrics.filter((m) => m.type === "comment_copy").length;
  const uniqueUsers = new Set(metrics.map((m) => m.user_fingerprint).filter(Boolean)).size;

  return { postCopies, commentCopies, totalCopies: postCopies + commentCopies, uniqueUsers };
}
