import { NextResponse } from "next/server";
import { runAll } from "../../../../../../../services/pipeline/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  // Start the generation process in the background
  runAll(runId).catch(err => {
    console.error(`[API/runAll] Background generation failed for ${runId}:`, err);
  });

  return NextResponse.json({
    ok: true,
    message: "Generation started in background",
    runId
  });
}

