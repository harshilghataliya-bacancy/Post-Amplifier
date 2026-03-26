import { NextRequest, NextResponse } from "next/server";
import { logCopyEvent } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { campaignId, type, itemIndex, fingerprint } = await request.json();

    if (!campaignId || !type || itemIndex === undefined) {
      return NextResponse.json(
        { error: "campaignId, type, and itemIndex are required" },
        { status: 400 }
      );
    }

    await logCopyEvent(campaignId, type, itemIndex, fingerprint);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to log metric" }, { status: 500 });
  }
}
