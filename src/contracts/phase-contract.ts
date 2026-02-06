/**
 * Shared TypeScript contract types for the pipeline phases.
 *
 * IMPORTANT:
 * - JS/TS orchestrates all phases and AI calls
 * - Python is ONLY used to execute the Manim render phase (`manim_render`)
 * - Gemini 3 is ONLY used for: `reason`, `critique`, `refine`
 * - Nano Banana is ONLY used for: `storyboard_generate`
 *
 * Canonical JSON Schemas: `src/contracts/schemas/pipeline-contract.schema.json`
 */

export const SCHEMA_VERSION = "1.0.0" as const;
export type SchemaVersion = typeof SCHEMA_VERSION;

export type PhaseId =
  | "ingest_normalize"
  | "reason"
  | "critique"
  | "refine"
  | "storyboard_generate"
  | "manim_codegen"
  | "manim_render";

export interface TraceContext {
  runId: string; // uuid
  traceId: string; // uuid
  attempt: number; // >= 1
  startedAt: string; // ISO date-time
}

export type PhaseStatus = "success" | "error";

export interface PhaseError {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}

export interface ArtifactRef {
  uri: string;
  mimeType: string;
  sha256?: string;
  bytes?: number;
  generatedByPhase?: PhaseId;
}

export interface PhaseInputEnvelope<P extends PhaseId, I> {
  schemaVersion: SchemaVersion;
  phase: P;
  trace: TraceContext;
  input: I;
}

export type PhaseOutputEnvelope<P extends PhaseId, O> =
  | {
    schemaVersion: SchemaVersion;
    phase: P;
    trace: TraceContext;
    status: "success";
    output: O;
  }
  | {
    schemaVersion: SchemaVersion;
    phase: P;
    trace: TraceContext;
    status: "error";
    error: PhaseError;
  };

// ----------------------------
// Domain payloads
// ----------------------------

export interface RawUserRequest {
  text: string;
  locale?: string; // default: "en-US"
  project?: {
    title?: string;
    targetDurationSec?: number;
    targetResolution?: { width: number; height: number };
  };
}

export interface NormalizedRequest {
  goal: string;
  audience?: string;
  tone?: string;
  constraints: {
    maxDurationSec?: number;
    mustFollowGlobalRules: true;
  };
  assumptions: string[];
}

export interface ReasonDraft {
  outline: string[];
  scenes: Array<{
    id: string;
    title: string;
    intent: string;
    mathNotes?: string[];
  }>;
  /**
   * High-level rationale bullets only (no hidden chain-of-thought).
   */
  reasoningSummary: string[];
  assumptions: string[];
}

export interface CritiqueReport {
  summary: string;
  issues: Array<{
    id: string;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    recommendation: string;
    locationHint?: string;
  }>;
}

export interface RefinedSpec {
  title: string;
  narrationScript: string;
  onScreenText?: string[];
  visualStyleGuide: string;
  storyboardRequirements: {
    aspectRatio: string;
    frameCount: number;
    notes?: string;
  };
  shotList: Array<{
    id: string;
    startSec: number;
    endSec: number;
    intent: string;
    manimIntent?: string;
  }>;
  assets: Array<{
    id: string;
    type: "image" | "svg" | "audio" | "font" | "other";
    description: string;
    sourceHint?: string;
  }>;
}

export interface Storyboard {
  styleNotes?: string;
  frames: Array<{
    id: string;
    index: number;
    startSec: number;
    endSec: number;
    prompt: string;
    negativePrompt?: string;
    notes?: string;
    image?: ArtifactRef;
  }>;
}

export interface ManimCodegenResult {
  pythonSource: string;
  entryScene: string;
  renderConfig: {
    fps: number;
    quality: "low" | "medium" | "high" | "ultra";
    resolution: { width: number; height: number };
  };
}

export interface ManimRenderResult {
  video: ArtifactRef;
  logs: ArtifactRef;
  metadata: {
    renderedAt: string; // ISO date-time
    durationSec: number;
  };
}

// ----------------------------
// Per-phase inputs/outputs
// ----------------------------

export type IngestNormalizeInput = PhaseInputEnvelope<
  "ingest_normalize",
  RawUserRequest
>;
export type IngestNormalizeOutput = PhaseOutputEnvelope<
  "ingest_normalize",
  NormalizedRequest
>;

export type ReasonInput = PhaseInputEnvelope<"reason", NormalizedRequest>;
export type ReasonOutput = PhaseOutputEnvelope<"reason", ReasonDraft>;

export type CritiqueInput = PhaseInputEnvelope<
  "critique",
  { request: NormalizedRequest; draft: ReasonDraft }
>;
export type CritiqueOutput = PhaseOutputEnvelope<"critique", CritiqueReport>;

export type RefineInput = PhaseInputEnvelope<
  "refine",
  { request: NormalizedRequest; draft: ReasonDraft; critique: CritiqueReport }
>;
export type RefineOutput = PhaseOutputEnvelope<"refine", RefinedSpec>;

export type StoryboardGenerateInput = PhaseInputEnvelope<
  "storyboard_generate",
  RefinedSpec
>;
export type StoryboardGenerateOutput = PhaseOutputEnvelope<
  "storyboard_generate",
  Storyboard
>;

export type ManimCodegenInput = PhaseInputEnvelope<
  "manim_codegen",
  { spec: RefinedSpec; storyboard: Storyboard }
>;
export type ManimCodegenOutput = PhaseOutputEnvelope<
  "manim_codegen",
  ManimCodegenResult
>;

export type ManimRenderInput = PhaseInputEnvelope<
  "manim_render",
  ManimCodegenResult
>;
export type ManimRenderOutput = PhaseOutputEnvelope<
  "manim_render",
  ManimRenderResult
>;

export type AnyPhaseInput =
  | IngestNormalizeInput
  | ReasonInput
  | CritiqueInput
  | RefineInput
  | StoryboardGenerateInput
  | ManimCodegenInput
  | ManimRenderInput;

export type AnyPhaseOutput =
  | IngestNormalizeOutput
  | ReasonOutput
  | CritiqueOutput
  | RefineOutput
  | StoryboardGenerateOutput
  | ManimCodegenOutput
  | ManimRenderOutput;

export type AnyPipelineMessage = AnyPhaseInput | AnyPhaseOutput;

// ----------------------------
// Optional helper maps (types only)
// ----------------------------

export interface PhaseInputById {
  ingest_normalize: IngestNormalizeInput;
  reason: ReasonInput;
  critique: CritiqueInput;
  refine: RefineInput;
  storyboard_generate: StoryboardGenerateInput;
  manim_codegen: ManimCodegenInput;
  manim_render: ManimRenderInput;
}

export interface PhaseOutputById {
  ingest_normalize: IngestNormalizeOutput;
  reason: ReasonOutput;
  critique: CritiqueOutput;
  refine: RefineOutput;
  storyboard_generate: StoryboardGenerateOutput;
  manim_codegen: ManimCodegenOutput;
  manim_render: ManimRenderOutput;
}

