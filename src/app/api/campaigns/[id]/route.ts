import { NextRequest, NextResponse } from "next/server";
import { getCampaignById, updateCampaign, deleteCampaign, getCampaignMetrics } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    const metrics = await getCampaignMetrics(id);
    return NextResponse.json({ ...campaign, metrics });
  } catch {
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    const body = await request.json();
    const updated = await updateCampaign(id, body);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    await deleteCampaign(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
