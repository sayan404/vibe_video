import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
  TopicResearchInputSchema,
  runTopicResearch,
  type TopicResearchInput,
  type TopicResearchOutput
} from "../gemini/research.js";
import {
  runStoryboardEngine,
  StoryboardOutputSchema,
  type StoryboardOutput
} from "../nanobanana/storyboard.js";
import { runManimCodeGenerator } from "../gemini/manimGenerator.js";
import {
  runManimRenderExecutor,
  type RenderMetadata
} from "./render.js";
import {
  runVideoCritique,
  VideoCritiqueOutputSchema,
  type VideoCritiqueOutput
} from "../critique/critique.js";
import { runIterationEngine, type IterationOutput } from "../iteration/refine.js";
import { runRepairEngine } from "../iteration/repair.js";

export const PipelineRunInputSchema = TopicResearchInputSchema;
export type PipelineRunInput = TopicResearchInput;

export type ExportPhaseId =
  | "phase1_research"
  | "phase2_storyboard"
  | "phase3_manim_codegen"
  | "phase4_manim_render"
  | "phase5_video_critique"
  | "phase6_iteration"
  | "phase7_export";

export type PhaseStatus = "pending" | "running" | "success" | "error";

export const PhaseRecordSchema = z
  .object({
    status: z.enum(["pending", "running", "success", "error"]),
    startedAt: z.string().optional(),
    finishedAt: z.string().optional(),
    error: z
      .object({
        message: z.string().min(1),
        details: z.unknown().optional()
      })
      .strict()
      .optional()
  })
  .strict();

export type PhaseRecord = z.infer<typeof PhaseRecordSchema>;

export const PipelineRunStateSchema = z
  .object({
    runId: z.string().min(1),
    createdAt: z.string().min(1),
    input: PipelineRunInputSchema,
    phases: z.record(z.string(), PhaseRecordSchema),
    artifacts: z
      .object({
        researchJson: z.string().optional(),
        storyboardJson: z.string().optional(),
        manimCodePath: z.string().optional(),
        renderMetadataJson: z.string().optional(),
        renderedVideoPath: z.string().optional(),
        critiqueJson: z.string().optional(),
        iterationJson: z.string().optional(),
        finalManimCodePath: z.string().optional(),
        voiceoverScriptPath: z.string().optional(),
        readmePath: z.string().optional()
      })
      .strict()
  })
  .strict();

export type PipelineRunState = z.infer<typeof PipelineRunStateSchema>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const RUNS_DIR = path.join(REPO_ROOT, "runs");

function nowIso(): string {
  return new Date().toISOString();
}

function initialPhases(): Record<ExportPhaseId, PhaseRecord> {
  return {
    phase1_research: { status: "pending" },
    phase2_storyboard: { status: "pending" },
    phase3_manim_codegen: { status: "pending" },
    phase4_manim_render: { status: "pending" },
    phase5_video_critique: { status: "pending" },
    phase6_iteration: { status: "pending" },
    phase7_export: { status: "pending" }
  };
}

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

function runDir(runId: string): string {
  return path.join(RUNS_DIR, runId);
}

function statePath(runId: string): string {
  return path.join(runDir(runId), "state.json");
}

async function readJson<T>(p: string): Promise<T> {
  const text = await readFile(p, "utf-8");
  return JSON.parse(text) as T;
}

async function writeJson(p: string, obj: unknown): Promise<void> {
  await writeFile(p, JSON.stringify(obj, null, 2), "utf-8");
}

export async function createRun(rawInput: unknown): Promise<PipelineRunState> {
  const input = PipelineRunInputSchema.parse(rawInput);
  const runId = randomUUID();
  await ensureDir(runDir(runId));

  const state: PipelineRunState = {
    runId,
    createdAt: nowIso(),
    input,
    phases: initialPhases(),
    artifacts: {}
  };

  await writeJson(statePath(runId), state);
  return state;
}

export async function loadRunState(runId: string): Promise<PipelineRunState> {
  const raw = await readJson<unknown>(statePath(runId));
  return PipelineRunStateSchema.parse(raw);
}

async function saveRunState(runId: string, state: PipelineRunState): Promise<void> {
  await writeJson(statePath(runId), state);
}

async function setPhase(
  runId: string,
  phase: ExportPhaseId,
  patch: Partial<PhaseRecord>
): Promise<void> {
  const state = await loadRunState(runId);
  state.phases[phase] = { ...(state.phases[phase] ?? { status: "pending" }), ...patch };
  // If a phase is restarted/rerun, ensure we don't keep a stale finishedAt.
  if (patch.status === "running") {
    state.phases[phase]!.finishedAt = undefined;
  }
  await saveRunState(runId, state);
}

async function writeArtifact(runId: string, relPath: string, data: string): Promise<string> {
  const abs = path.join(runDir(runId), relPath);
  await ensureDir(path.dirname(abs));
  await writeFile(abs, data, "utf-8");
  return abs.replaceAll("\\", "/");
}

async function writeArtifactJson(runId: string, relPath: string, obj: unknown): Promise<string> {
  const abs = path.join(runDir(runId), relPath);
  await ensureDir(path.dirname(abs));
  await writeJson(abs, obj);
  return abs.replaceAll("\\", "/");
}

async function listRuns(): Promise<string[]> {
  await ensureDir(RUNS_DIR);
  const entries = await readdir(RUNS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export async function listRunStates(): Promise<PipelineRunState[]> {
  const ids = await listRuns();
  const states: PipelineRunState[] = [];
  for (const id of ids) {
    try {
      states.push(await loadRunState(id));
    } catch {
      // ignore broken runs
    }
  }
  // newest first
  states.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return states;
}

async function findLatestFileRecursive(rootDir: string, ext: string): Promise<string | null> {
  type Best = { p: string; mtimeMs: number };

  async function walk(dir: string): Promise<Best | null> {
    let best: Best | null = null;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        const childBest = await walk(p);
        if (childBest && (!best || childBest.mtimeMs > best.mtimeMs)) best = childBest;
      } else if (ent.isFile() && p.toLowerCase().endsWith(ext.toLowerCase())) {
        const s = await stat(p);
        const m = s.mtimeMs;
        if (!best || m > best.mtimeMs) best = { p, mtimeMs: m };
      }
    }
    return best;
  }

  try {
    const best = await walk(rootDir);
    if (!best) return null;
    return best.p.replaceAll("\\", "/");
  } catch {
    return null;
  }
}

function buildVoiceoverScript(storyboard: StoryboardOutput): string {
  return storyboard
    .map((f) => `Frame ${f.frameId}: ${f.sceneTitle}\n${f.voiceoverScript}\n`)
    .join("\n");
}

function buildRunReadme(state: PipelineRunState): string {
  return `# VV Run ${state.runId}

Created: ${state.createdAt}

## Input

- Topic: ${state.input.topic}
- Target audience: ${state.input.targetAudience}
- Desired duration (minutes): ${state.input.desiredDurationMinutes}

## Artifacts

- Research JSON: ${state.artifacts.researchJson ?? "(not generated)"}
- Storyboard JSON: ${state.artifacts.storyboardJson ?? "(not generated)"}
- Manim code (initial): ${state.artifacts.manimCodePath ?? "(not generated)"}
- Render metadata: ${state.artifacts.renderMetadataJson ?? "(not generated)"}
- Rendered video: ${state.artifacts.renderedVideoPath ?? "(not generated)"}
- Critique report: ${state.artifacts.critiqueJson ?? "(not generated)"}
- Iteration output: ${state.artifacts.iterationJson ?? "(not generated)"}
- Final Manim code: ${state.artifacts.finalManimCodePath ?? "(not generated)"}
- Voiceover script: ${state.artifacts.voiceoverScriptPath ?? "(not generated)"}

## Phase statuses

${Object.keys(state.phases)
      .map((k) => {
        const v = state.phases[k]!;
        return `- ${k}: ${v.status}${v.error ? ` (${v.error.message})` : ""}`;
      })
      .join("\n")}
`;
}

// -------------------------
// Phase runners
// -------------------------

async function phase1(runId: string): Promise<TopicResearchOutput> {
  const state = await loadRunState(runId);
  const out = await runTopicResearch(state.input);
  const p = await writeArtifactJson(runId, "phase1.research.json", out);
  const next = await loadRunState(runId);
  next.artifacts.researchJson = p;
  await saveRunState(runId, next);
  return out;
}

async function phase2(runId: string): Promise<StoryboardOutput> {
  const state = await loadRunState(runId);
  if (!state.artifacts.researchJson) throw new Error("Missing Phase 1 output (researchJson).");
  const research = await readJson<unknown>(state.artifacts.researchJson);
  const imagesDir = path.join(runDir(runId), "storyboard_images");
  const out = await runStoryboardEngine(research, { imageOutputDir: imagesDir });
  const p = await writeArtifactJson(runId, "phase2.storyboard.json", out);
  const next = await loadRunState(runId);
  next.artifacts.storyboardJson = p;
  await saveRunState(runId, next);
  return out;
}

async function phase3(runId: string): Promise<{ pythonScript: string; savedTo: string }> {
  const state = await loadRunState(runId);
  if (!state.artifacts.storyboardJson) throw new Error("Missing Phase 2 output (storyboardJson).");
  const storyboard = await readJson<unknown>(state.artifacts.storyboardJson);
  const scriptOut = await runManimCodeGenerator(storyboard, {
    outputPath: path.join(runDir(runId), "phase3.manim.py")
  });
  const next = await loadRunState(runId);
  next.artifacts.manimCodePath = scriptOut.savedTo;
  await saveRunState(runId, next);
  return scriptOut;
}

async function phase4(runId: string): Promise<RenderMetadata> {
  const state = await loadRunState(runId);
  const scriptPath = state.artifacts.finalManimCodePath ?? state.artifacts.manimCodePath;
  if (!scriptPath) throw new Error("Missing Phase 3 output (manimCodePath).");

  const mediaDir = path.join(runDir(runId), "media");
  let currentPath = scriptPath;
  let meta: RenderMetadata | null = null;
  const MAX_REPAIRS = 3;

  for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
    try {
      meta = await runManimRenderExecutor(
        { scriptPath: currentPath, sceneName: "StoryboardScene", quality: "low", mediaDir },
        { retries: 0, timeoutMs: 10 * 60 * 1000 }
      );
      break; // Success
    } catch (e) {
      const errMessage = e instanceof Error ? e.message : String(e);
      // Determine if retryable via repair
      if (attempt < MAX_REPAIRS) {
        console.warn(`[Phase4] Render failed (Attempt ${attempt + 1}/${MAX_REPAIRS + 1}). invoking repair...`);
        const brokenCode = await readFile(currentPath, "utf-8");
        const fixed = await runRepairEngine(brokenCode, errMessage);

        const repairFilename = `phase4.repair.${attempt + 1}.py`;
        const repairPath = await writeArtifact(runId, repairFilename, fixed.fixedCode);
        currentPath = repairPath;

        // Update artifacts so we track the latest "best effort" code
        const update = await loadRunState(runId);
        update.artifacts.finalManimCodePath = repairPath;
        await saveRunState(runId, update);
        continue;
      }
      throw e;
    }
  }

  if (!meta) throw new Error("Render failed after repairs.");

  const metaPath = await writeArtifactJson(runId, "phase4.render.json", meta);
  // Prefer the actual scene output MP4 for the current code stage.
  // (We may have older mp4s in the run folder from previous renders.)
  const expectedStage =
    state.artifacts.finalManimCodePath && state.artifacts.finalManimCodePath !== state.artifacts.manimCodePath
      ? "phase6.manim.refined"
      : "phase3.manim";
  const expected = path.join(mediaDir, "videos", expectedStage, "480p15", "StoryboardScene.mp4");
  const expectedPosix = expected.replaceAll("\\", "/");
  const video = (await stat(expected).then(() => expectedPosix).catch(() => null)) ??
    (await findLatestFileRecursive(mediaDir, ".mp4"));

  const next = await loadRunState(runId);
  next.artifacts.renderMetadataJson = metaPath;
  if (video) next.artifacts.renderedVideoPath = video;
  await saveRunState(runId, next);

  return meta;
}

async function phase5(runId: string): Promise<VideoCritiqueOutput> {
  const state = await loadRunState(runId);
  if (!state.artifacts.storyboardJson) throw new Error("Missing Phase 2 output (storyboardJson).");
  if (!state.artifacts.renderMetadataJson)
    throw new Error("Missing Phase 4 output (renderMetadataJson).");

  const manimPath = state.artifacts.finalManimCodePath ?? state.artifacts.manimCodePath;
  if (!manimPath) throw new Error("Missing Manim code path.");
  if (!state.artifacts.renderedVideoPath) throw new Error("Missing Phase 4 rendered video.");

  const storyboard = await readJson<unknown>(state.artifacts.storyboardJson);
  const renderMetadata = await readJson<unknown>(state.artifacts.renderMetadataJson);
  const manimCode = await readFile(manimPath, "utf-8");

  const critique = await runVideoCritique(
    {
      storyboard,
      renderMetadata,
      manimCode,
      videoPath: state.artifacts.renderedVideoPath as string
    },
    { debugPath: path.join(runDir(runId), "phase5.prompt_debug.txt") }
  );
  const critiquePath = await writeArtifactJson(runId, "phase5.critique.json", critique);

  const next = await loadRunState(runId);
  next.artifacts.critiqueJson = critiquePath;
  await saveRunState(runId, next);

  return critique;
}

async function phase6(runId: string): Promise<IterationOutput | null> {
  const state = await loadRunState(runId);
  if (!state.artifacts.critiqueJson) throw new Error("Missing Phase 5 output (critiqueJson).");
  if (!state.artifacts.storyboardJson) throw new Error("Missing Phase 2 output (storyboardJson).");
  const originalPath = state.artifacts.manimCodePath;
  if (!originalPath) throw new Error("Missing Phase 3 output (manimCodePath).");

  const critique = await readJson<unknown>(state.artifacts.critiqueJson);
  const parsedCritique = VideoCritiqueOutputSchema.parse(critique);
  if (parsedCritique.issues.length === 0) {
    // No iteration needed; keep original as final.
    const next = await loadRunState(runId);
    next.artifacts.finalManimCodePath = originalPath;
    await saveRunState(runId, next);
    return null;
  }

  const originalManimCode = await readFile(originalPath, "utf-8");
  const storyboard = await readJson<unknown>(state.artifacts.storyboardJson as string);
  const out = await runIterationEngine(
    {
      originalManimCode,
      critique: parsedCritique,
      storyboard
    },
    {
      includeDiff: false,
      outputPath: path.join(runDir(runId), "phase6.manim.refined.py")
    }
  );

  const iterPath = await writeArtifactJson(runId, "phase6.iteration.json", {
    changeLog: out.changeLog
  });

  const next = await loadRunState(runId);
  next.artifacts.iterationJson = iterPath;
  next.artifacts.finalManimCodePath = path
    .join(runDir(runId), "phase6.manim.refined.py")
    .replaceAll("\\", "/");
  await saveRunState(runId, next);

  return out;
}

async function phase7(runId: string): Promise<void> {
  const state = await loadRunState(runId);
  if (!state.artifacts.storyboardJson) throw new Error("Missing storyboardJson.");

  const storyboard = await readJson<unknown>(state.artifacts.storyboardJson);
  const storyboardParsed = StoryboardOutputSchema.parse(storyboard);
  const voiceover = buildVoiceoverScript(storyboardParsed);
  const voiceoverPath = await writeArtifact(runId, "voiceover.txt", voiceover);

  const next = await loadRunState(runId);
  next.artifacts.voiceoverScriptPath = voiceoverPath;

  const readme = buildRunReadme(next);
  const readmePath = await writeArtifact(runId, "README.md", readme);
  next.artifacts.readmePath = readmePath;

  await saveRunState(runId, next);
}

export async function runPhase(runId: string, phase: ExportPhaseId): Promise<PipelineRunState> {
  await setPhase(runId, phase, { status: "running", startedAt: nowIso(), error: undefined });
  try {
    if (phase === "phase1_research") await phase1(runId);
    else if (phase === "phase2_storyboard") await phase2(runId);
    else if (phase === "phase3_manim_codegen") await phase3(runId);
    else if (phase === "phase4_manim_render") await phase4(runId);
    else if (phase === "phase5_video_critique") await phase5(runId);
    else if (phase === "phase6_iteration") await phase6(runId);
    else if (phase === "phase7_export") await phase7(runId);
    else throw new Error(`Unsupported phase: ${phase}`);

    await setPhase(runId, phase, { status: "success", finishedAt: nowIso() });
  } catch (e) {
    await setPhase(runId, phase, {
      status: "error",
      finishedAt: nowIso(),
      error: { message: e instanceof Error ? e.message : String(e) }
    });
    throw e;
  }

  return await loadRunState(runId);
}

export async function runAll(runId: string): Promise<PipelineRunState> {
  // Run through all phases in order. Each phase persists artifacts.
  await runPhase(runId, "phase1_research");
  await runPhase(runId, "phase2_storyboard");
  await runPhase(runId, "phase3_manim_codegen");
  await runPhase(runId, "phase4_manim_render");
  await runPhase(runId, "phase5_video_critique");
  await runPhase(runId, "phase6_iteration"); // may set finalManimCodePath

  // If iteration produced a new final code path, rerender + re-critique once to produce final video.
  const afterIter = await loadRunState(runId);
  const iterated =
    afterIter.artifacts.finalManimCodePath &&
    afterIter.artifacts.finalManimCodePath !== afterIter.artifacts.manimCodePath;
  if (iterated) {
    await runPhase(runId, "phase4_manim_render");
    await runPhase(runId, "phase5_video_critique");
  }

  await runPhase(runId, "phase7_export");
  return await loadRunState(runId);
}

