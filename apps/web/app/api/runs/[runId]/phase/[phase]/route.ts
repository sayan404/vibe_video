import { NextResponse } from "next/server";
import { runPhase } from "../../../../../../../../services/pipeline/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ runId: string; phase: string }> }
) {
  const { runId, phase } = await params;
  const run = await runPhase(runId, phase as any);
  return NextResponse.json({ run });
}

