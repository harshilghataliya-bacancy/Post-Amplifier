import { NextResponse } from "next/server";
import { getActiveCampaign } from "@/lib/db";

export async function GET() {
  try {
    const campaign = await getActiveCampaign();
    if (!campaign) {
      return NextResponse.json({ error: "No active campaign" }, { status: 404 });
    }
    return NextResponse.json(campaign);
  } catch {
    return NextResponse.json({ error: "Failed to fetch active campaign" }, { status: 500 });
  }
}
