import { NextRequest, NextResponse } from "next/server";
import { getCampaignById, publishCampaign } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    const published = await publishCampaign(id);
    return NextResponse.json(published);
  } catch {
    return NextResponse.json({ error: "Failed to publish campaign" }, { status: 500 });
  }
}
