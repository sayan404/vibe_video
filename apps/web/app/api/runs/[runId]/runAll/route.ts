import { NextResponse } from "next/server";
import { runAll } from "../../../../../../../services/pipeline/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const run = await runAll(runId);
  return NextResponse.json({ run });
}

