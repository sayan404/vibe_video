import { NextResponse } from "next/server";
import { createRun, listRunStates } from "../../../../../services/pipeline/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const runs = await listRunStates();
  return NextResponse.json({ runs });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const run = await createRun(body);
  return NextResponse.json({ run }, { status: 201 });
}

