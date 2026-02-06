# PHASE CONTRACT (Production-Grade AI System)

This document defines the **strict, non-overlapping phases** of the pipeline, with **explicit input/output JSON Schemas**, and **failure conditions per phase**.

## Global rules (non-negotiable)

1. **JS/TS controls the pipeline and AI calls**
2. **Python is ONLY for Manim rendering**
3. **Gemini 3 is used for reasoning, critique, refinement**
4. **Nano Banana is used ONLY for visual/storyboard generation**
5. **Each phase has a strict input and output schema**
6. **No phase is allowed to skip or merge responsibilities**

## Core contract concepts

### Message envelopes

All phases communicate using a standard envelope:

- **Inputs** use `PhaseInputEnvelope`
- **Outputs** use `PhaseOutputEnvelope` (success or error)

### Schema versioning

- **`schemaVersion`**: `1.0.0`
- Any schema-breaking change requires a new major version.

### Strictness requirements

- Every phase **MUST** validate input against its input schema before executing.
- Every phase **MUST** produce output matching its output schema.
- Phases **MUST NOT** add extra properties unless explicitly allowed.

## Phase list (strict order)

| Phase ID              | Owner        | Allowed model   | Responsibility (only)                                                                   |
| --------------------- | ------------ | --------------- | --------------------------------------------------------------------------------------- |
| `ingest_normalize`    | TS           | none            | Normalize and validate user request into canonical `NormalizedRequest`                  |
| `reason`              | TS (AI call) | **Gemini 3**    | Produce an initial structured draft plan/spec (no critique)                             |
| `critique`            | TS (AI call) | **Gemini 3**    | Identify issues/risks in the draft (no rewriting into final)                            |
| `refine`              | TS (AI call) | **Gemini 3**    | Produce the final structured production spec using draft + critique                     |
| `storyboard_generate` | TS (AI call) | **Nano Banana** | Generate storyboard frames/prompts/images (no reasoning/refinement)                     |
| `manim_codegen`       | TS           | none            | Deterministically convert spec + storyboard into Manim python source text + render plan |
| `manim_render`        | Python       | none            | Execute Manim render from provided script/config; output artifacts/metadata             |

## Shared failure model

All failures MUST conform to:

- **`status`**: `"error"`
- **`error.code`**: stable, machine-readable string
- **`error.retryable`**: whether an automated retry may succeed

### Standard failure codes (recommended)

- `SCHEMA_VALIDATION_FAILED`
- `UNSUPPORTED_SCHEMA_VERSION`
- `UNSUPPORTED_PHASE`
- `MODEL_DISALLOWED`
- `MODEL_OUTPUT_INVALID_JSON`
- `MODEL_OUTPUT_SCHEMA_MISMATCH`
- `TIMEOUT`
- `RATE_LIMITED`
- `TOOL_EXEC_FAILED`
- `RENDER_FAILED`
- `ARTIFACT_IO_FAILED`

## JSON Schema sources

Canonical JSON Schemas live in:

- `src/contracts/schemas/pipeline-contract.schema.json`

The per-phase schemas below are **excerpts** of those canonical definitions.

---

## Phase: `ingest_normalize`

### Responsibility

- Validate/normalize raw user request + pipeline configuration into a canonical `NormalizedRequest`.
- Must not perform reasoning, critique, or creative generation.

### Input schema (`IngestNormalizeInput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "IngestNormalizeInput",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "phase", "trace", "input"],
  "properties": {
    "schemaVersion": { "const": "1.0.0" },
    "phase": { "const": "ingest_normalize" },
    "trace": { "$ref": "#/$defs/TraceContext" },
    "input": { "$ref": "#/$defs/RawUserRequest" }
  },
  "$defs": {
    "TraceContext": {
      "type": "object",
      "additionalProperties": false,
      "required": ["runId", "traceId", "attempt", "startedAt"],
      "properties": {
        "runId": { "type": "string", "format": "uuid" },
        "traceId": { "type": "string", "format": "uuid" },
        "attempt": { "type": "integer", "minimum": 1 },
        "startedAt": { "type": "string", "format": "date-time" }
      }
    },
    "RawUserRequest": {
      "type": "object",
      "additionalProperties": false,
      "required": ["text"],
      "properties": {
        "text": { "type": "string", "minLength": 1 },
        "locale": { "type": "string", "default": "en-US" },
        "project": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "title": { "type": "string" },
            "targetDurationSec": { "type": "number", "minimum": 1 },
            "targetResolution": {
              "type": "object",
              "additionalProperties": false,
              "required": ["width", "height"],
              "properties": {
                "width": { "type": "integer", "minimum": 1 },
                "height": { "type": "integer", "minimum": 1 }
              }
            }
          }
        }
      }
    }
  }
}
```

### Output schema (`IngestNormalizeOutput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "IngestNormalizeOutput",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "phase", "trace", "status"],
  "properties": {
    "schemaVersion": { "const": "1.0.0" },
    "phase": { "const": "ingest_normalize" },
    "trace": { "$ref": "#/$defs/TraceContext" },
    "status": { "enum": ["success", "error"] },
    "output": { "$ref": "#/$defs/NormalizedRequest" },
    "error": { "$ref": "#/$defs/PhaseError" }
  },
  "allOf": [
    {
      "if": { "properties": { "status": { "const": "success" } } },
      "then": { "required": ["output"], "not": { "required": ["error"] } }
    },
    {
      "if": { "properties": { "status": { "const": "error" } } },
      "then": { "required": ["error"], "not": { "required": ["output"] } }
    }
  ],
  "$defs": {
    "TraceContext": {
      "type": "object",
      "additionalProperties": false,
      "required": ["runId", "traceId", "attempt", "startedAt"],
      "properties": {
        "runId": { "type": "string", "format": "uuid" },
        "traceId": { "type": "string", "format": "uuid" },
        "attempt": { "type": "integer", "minimum": 1 },
        "startedAt": { "type": "string", "format": "date-time" }
      }
    },
    "PhaseError": {
      "type": "object",
      "additionalProperties": false,
      "required": ["code", "message", "retryable"],
      "properties": {
        "code": { "type": "string", "minLength": 1 },
        "message": { "type": "string", "minLength": 1 },
        "retryable": { "type": "boolean" },
        "details": {}
      }
    },
    "NormalizedRequest": {
      "type": "object",
      "additionalProperties": false,
      "required": ["goal", "constraints", "assumptions"],
      "properties": {
        "goal": { "type": "string", "minLength": 1 },
        "audience": { "type": "string" },
        "tone": { "type": "string" },
        "constraints": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "maxDurationSec": { "type": "number", "minimum": 1 },
            "mustFollowGlobalRules": { "type": "boolean", "const": true }
          }
        },
        "assumptions": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 }
        }
      }
    }
  }
}
```

### Failure conditions

- Input JSON fails schema validation.
- Unsupported `schemaVersion`.
- `text` is empty or not actionable (must error, not guess silently).

---

## Phase: `reason` (Gemini 3)

### Responsibility

- Produce a **structured draft** for the requested output (outline + candidate technical plan).
- Must not perform critique/refinement (that is for later phases).

### Input schema (`ReasonInput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ReasonInput",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "phase", "trace", "input"],
  "properties": {
    "schemaVersion": { "const": "1.0.0" },
    "phase": { "const": "reason" },
    "trace": { "$ref": "#/$defs/TraceContext" },
    "input": { "$ref": "#/$defs/NormalizedRequest" }
  },
  "$defs": {
    "TraceContext": {
      "type": "object",
      "additionalProperties": false,
      "required": ["runId", "traceId", "attempt", "startedAt"],
      "properties": {
        "runId": { "type": "string", "format": "uuid" },
        "traceId": { "type": "string", "format": "uuid" },
        "attempt": { "type": "integer", "minimum": 1 },
        "startedAt": { "type": "string", "format": "date-time" }
      }
    },
    "NormalizedRequest": {
      "type": "object",
      "additionalProperties": false,
      "required": ["goal", "constraints", "assumptions"],
      "properties": {
        "goal": { "type": "string", "minLength": 1 },
        "audience": { "type": "string" },
        "tone": { "type": "string" },
        "constraints": { "type": "object" },
        "assumptions": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

### Output schema (`ReasonOutput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ReasonOutput",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "phase", "trace", "status"],
  "properties": {
    "schemaVersion": { "const": "1.0.0" },
    "phase": { "const": "reason" },
    "trace": { "$ref": "#/$defs/TraceContext" },
    "status": { "enum": ["success", "error"] },
    "output": { "$ref": "#/$defs/ReasonDraft" },
    "error": { "$ref": "#/$defs/PhaseError" }
  },
  "allOf": [
    {
      "if": { "properties": { "status": { "const": "success" } } },
      "then": { "required": ["output"], "not": { "required": ["error"] } }
    },
    {
      "if": { "properties": { "status": { "const": "error" } } },
      "then": { "required": ["error"], "not": { "required": ["output"] } }
    }
  ],
  "$defs": {
    "TraceContext": {
      "type": "object",
      "additionalProperties": false,
      "required": ["runId", "traceId", "attempt", "startedAt"],
      "properties": {
        "runId": { "type": "string", "format": "uuid" },
        "traceId": { "type": "string", "format": "uuid" },
        "attempt": { "type": "integer", "minimum": 1 },
        "startedAt": { "type": "string", "format": "date-time" }
      }
    },
    "PhaseError": {
      "type": "object",
      "additionalProperties": false,
      "required": ["code", "message", "retryable"],
      "properties": {
        "code": { "type": "string", "minLength": 1 },
        "message": { "type": "string", "minLength": 1 },
        "retryable": { "type": "boolean" },
        "details": {}
      }
    },
    "ReasonDraft": {
      "type": "object",
      "additionalProperties": false,
      "required": ["outline", "scenes", "reasoningSummary", "assumptions"],
      "properties": {
        "outline": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 }
        },
        "scenes": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["id", "title", "intent"],
            "properties": {
              "id": { "type": "string", "minLength": 1 },
              "title": { "type": "string", "minLength": 1 },
              "intent": { "type": "string", "minLength": 1 },
              "mathNotes": { "type": "array", "items": { "type": "string" } }
            }
          }
        },
        "reasoningSummary": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "description": "High-level rationale bullets only (no hidden chain-of-thought)."
        },
        "assumptions": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 }
        }
      }
    }
  }
}
```

### Failure conditions

- Any non-Gemini model used for this phase.
- Model output is not valid JSON.
- Model output fails schema validation.

---

## Phase: `critique` (Gemini 3)

### Responsibility

- Identify gaps, contradictions, missing constraints, feasibility issues in `ReasonDraft`.
- Must not rewrite into a final spec (that is for `refine`).

### Input schema (`CritiqueInput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "vv://contracts/pipeline-contract.schema.json#/$defs/CritiqueInput"
}
```

### Output schema (`CritiqueOutput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "vv://contracts/pipeline-contract.schema.json#/$defs/CritiqueOutput"
}
```

### Failure conditions

- Any non-Gemini model used for this phase.
- Output lacks at least one `issue` when obvious constraints exist (treat as quality failure).
- Output JSON/schema invalid.

---

## Phase: `refine` (Gemini 3)

### Responsibility

- Produce the **final structured production spec** using the draft + critique.
- Must not generate storyboard imagery (Nano Banana only).

### Input schema (`RefineInput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "vv://contracts/pipeline-contract.schema.json#/$defs/RefineInput"
}
```

### Output schema (`RefineOutput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "vv://contracts/pipeline-contract.schema.json#/$defs/RefineOutput"
}
```

### Failure conditions

- Any non-Gemini model used for this phase.
- Spec violates global rules (e.g., tries to render with Python here).
- Output JSON/schema invalid.

---

## Phase: `storyboard_generate` (Nano Banana)

### Responsibility

- Generate storyboard frames (prompts and/or images) from the refined spec.
- Must not perform reasoning/critique/refinement.

### Input schema (`StoryboardGenerateInput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "vv://contracts/pipeline-contract.schema.json#/$defs/StoryboardGenerateInput"
}
```

### Output schema (`StoryboardGenerateOutput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "vv://contracts/pipeline-contract.schema.json#/$defs/StoryboardGenerateOutput"
}
```

### Failure conditions

- Any model other than Nano Banana used for this phase.
- Frames missing required timing/ordering fields.
- Output JSON/schema invalid.

---

## Phase: `manim_codegen` (TS)

### Responsibility

- Deterministically convert **RefinedSpec + Storyboard** into:
  - Manim python source code (as text)
  - Render plan/config
- Must not call Python or render.

### Input schema (`ManimCodegenInput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "vv://contracts/pipeline-contract.schema.json#/$defs/ManimCodegenInput"
}
```

### Output schema (`ManimCodegenOutput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "vv://contracts/pipeline-contract.schema.json#/$defs/ManimCodegenOutput"
}
```

### Failure conditions

- Missing referenced storyboard frames/assets.
- Generated script/config violates schema.

---

## Phase: `manim_render` (Python)

### Responsibility

- Execute Manim render given script/config.
- Produce artifact references (video, logs) and render metadata.

### Input schema (`ManimRenderInput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "vv://contracts/pipeline-contract.schema.json#/$defs/ManimRenderInput"
}
```

### Output schema (`ManimRenderOutput`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "vv://contracts/pipeline-contract.schema.json#/$defs/ManimRenderOutput"
}
```

### Failure conditions

- Manim process non-zero exit code.
- Output artifacts missing/unreadable.
- Produced metadata fails schema validation.
