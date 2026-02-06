import { NextResponse } from "next/server";
import { loadRunState } from "../../../../../../services/pipeline/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const run = await loadRunState(runId);
  return NextResponse.json({ run });
}

