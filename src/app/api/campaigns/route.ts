import { NextRequest, NextResponse } from "next/server";
import { getAllCampaigns, createCampaign, getCampaignMetrics } from "@/lib/db";

export async function GET() {
  try {
    const campaigns = await getAllCampaigns();
    const campaignsWithMetrics = await Promise.all(
      campaigns.map(async (c) => {
        const metrics = await getCampaignMetrics(c.id);
        return { ...c, metrics };
      })
    );
    return NextResponse.json(campaignsWithMetrics);
  } catch {
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { main_post, post_goal, source_url, linkedin_url, campaign_type } = body;

    if (!main_post) {
      return NextResponse.json({ error: "main_post is required" }, { status: 400 });
    }

    const campaign = await createCampaign({
      main_post,
      post_goal: post_goal ?? "",
      source_url: source_url ?? "",
      linkedin_url: linkedin_url ?? "",
      campaign_type: campaign_type ?? "both",
      posts: [],
      comments: [],
      published: false,
      is_active: false,
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
