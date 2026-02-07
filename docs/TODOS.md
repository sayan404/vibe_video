# 🚀 Gemini 3 Hackathon: VibeVideo Enhancement Plan

This document outlines the strategy, priorities, and implementation details for the 2-day coding sprint.

## 📅 Timeline Strategy

| Phase | Focus | Timeframe |
| :--- | :--- | :--- |
| **Phase 1** | **Core Product Value & Polish** (Export, Editor, UI) | Day 1 |
| **Phase 2** | **AI Optimizations** (Sketch Style, Intermediate Animation) | Day 1.5 - 2 |
| **Phase 3** | **Infrastructure** (Persistence, Hosting) | Day 2 (If time permits) |

---

## 🎯 Phase 1: Core Product Value & Polish (Day 1)

**Goal:** Ensure the tool is usable end-to-end and produces a shareable "final" output.

### 1. Video Compilation & Export (🔥 High Priority)
- **Objective:** Bundle all artifacts and upload to S3 for scalable access.
- **Why:** Local file serving is fragile; S3 ensures the editor can always stream the video.

- [ ] **Implementation:** [Shivam]
    - **Target File:** `services/pipeline/export.ts`
    - **Action:** Update `phase7_export`.
    - **Details:**
        - Define output path: `runs/<runId>/dist/`.
        - Copy critical files (`.py`, `.mp4`, `.txt`, assets).
        - **NEW: Upload to S3**
            - Upload `dist/` contents to S3 bucket.
            - Generate **public URL** for the video.
            - Store `s3VideoUrl` in run state.

### 2. Basic Video Editor (🔥 High Priority) [Shivam]
**Objective:** Allow users to view the result and make code-level adjustments directly in the app.

- [ ] **Implementation:**
    - **Frontend:** `apps/web/app/editor/[runId]/page.tsx`
        - Create new route.
        - **Layout:** Split screen (Code Editor vs Video Player).
        - **Layout:** Split screen (Code Editor vs Video Player).
        - **Video Source:** Stream directly from `s3VideoUrl` (fallback to local if needed).
        - **State:** Load `phase6.manim.refined.py` on mount.
    - **Backend:** `apps/web/app/api/runs/[runId]/rerender/route.ts`
        - Create endpoint `POST /api/runs/[runId]/rerender`.
        - **Logic:**
            1. Receive new Python code.
            2. Overwrite `phase6.manim.refined.py`.
            3. Trigger re-render (Phase 4).
            4. Return updated status.

### 3. UI Beautification (✨ Medium Priority) [Shivam]
**Objective:** Make the tool look "Hackathon Ready" and premium.

- [ ] **Implementation:**
    - **Theme:** Dark mode, "Vibe" colors (deep purple/blue), or "Sketchy" aesthetic.
    - **Components:**
        - **Run List:** Card layout with thumbnails.
        - **Progress:** Visual stepper for the 7 phases (Pending/Running/Success icons).

---

## 🚀 Phase 2: Optimizations & AI Quality (Day 1.5 - 2) [Sayan]

**Goal:** Improve the "Magic" factor of the generated content.

### 4. NanoBanana Sketches (✏️ Medium Priority)
**Objective:** Generate "hand-drawn" looking images to match Manim's whiteboard aesthetic.

- [ ] **Implementation:**
    - **Target File:** `services/nanobanana/prompts/storyboard.ts`
    - **Prompt Engineering:**
        - Add style instruction: *"Style requirement: Simple, hand-drawn whiteboard sketch. Black strokes on white background. Minimalist. Red accents only."*
        - Add annotation instruction: *"Include small handwritten labels or arrows where appropriate."*

### 5. Intermediate Animation Phase (Phase 3.5)
**Objective:** Handle complex scenes by breaking them down before main generation.

- [ ] **Implementation:**
    - **Target File:** `services/pipeline/export.ts`
    - **New Phase:** `phase3_5_complex_anim`
    - **Logic:**
        - Identify "Complex" scenes in storyboard.
        - Generate standalone Manim snippets for these scenes.
        - Pass snippets as context to Phase 3 generator.

---

## 🛠 Phase 3: Infrastructure (Stretch / Day 2 🏃)

**Goal:** Robustness and Persistence.

### 6. Persistence & Hosting
**Objective:** Move away from local JSON files to a scalable backend.

- [ ] **Database (PostgreSQL):**
    - Replace `state.json` logic in `services/pipeline/export.ts` with SQL.
    - Table: `runs (id, created_at, input, state_json)`.

---

## ✅ Success Metrics
- **Functional:** User generates video -> watches it -> edits code -> sees updates.
- **Visual:** UI is polished, consistent, and premium.
- **Quality:** "Sketchy" images blend seamlessly with Manim animations.
