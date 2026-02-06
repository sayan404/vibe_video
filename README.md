# VV Pipeline (Research → Storyboard → Manim → Render → Critique → Iterate → Export)

An automated educational video generation pipeline powered by **Gemini**. It transforms a topic string into a full Manim animation using a multi-agent workflow.

## Features

- **Research Agent**: Deconstructs topics into learning objectives.
- **Storyboard Agent**: Generates visual plans (frames, intent, voiceover).
- **Coding Agent**: Writes Manim (Python) code.
- **Render Engine**: Compiles code to video.
- **Critique & Repair Loop**:
  - **Critique Agent**: Watches the video to find visual/timing issues.
  - **Repair Agent**: Automatically fixes syntax/runtime errors during rendering.
  - **Iteration Agent**: Refines the animation code based on critique feedback.

## Prerequisites

1.  **Node.js** (v18+)
2.  **Python** (3.10+)
3.  **FFmpeg** (Required by Manim)
4.  **LaTeX** (Optional, but recommended for Manim text rendering)

## Setup

### 1. Install Dependencies

**Node.js:**
```bash
npm install
```

**Python:**
Create a virtual environment (recommended) and install Manim:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate
pip install manim google-genai

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
pip install manim google-genai
```

### 2. Configure Environment

Copy the example file and add your keys:
```bash
cp .env.example .env
```

Edit `.env`:
```env
GEMINI_API_KEY=your_api_key_here
# Optional: Override defaults
# GEMINI_MODEL=gemini-2.0-flash-exp
# PYTHON=python 
```
*Note: Ensure the `PYTHON` var in `.env` points to your virtualenv python if unrelated to your system path.*

## Running the App

### Start the Dashboard
```bash
npm run dev:web
```
Open [http://localhost:3000](http://localhost:3000).

### Generating a Video
1.  Go to the dashboard.
2.  Click **"New Run"**.
3.  Enter a topic (e.g., "Binary Search", "Photosynthesis").
4.  The pipeline will execute phases sequentially:
    - **Phase 1**: Research
    - **Phase 2**: Storyboard
    - **Phase 3**: CodeGen
    - **Phase 4**: Render (Self-Healing active)
    - **Phase 5**: Critique
    - **Phase 6**: Iteration (if needed)
    - **Phase 7**: Export

## Project Structure

- `apps/web`: Next.js frontend.
- `services/`: Core logic for each phase.
  - `gemini/`: Research & CodeGen agents.
  - `nanobanana/`: Storyboard agent.
  - `critique/`: Video analysis agent.
  - `iteration/`: Refinement & Repair agents.
  - `pipeline/`: Orchestratation logic (`export.ts`).
- `python/`: Manim renderer entrypoint.
- `runs/`: Output artifacts for every run.

## Troubleshooting

- **Manim Render Error**: The pipeline has a self-healing loop (Phase 4). Check `runs/<id>/phase4.repair.log` or the dashboard status.
- **FFmpeg not found**: Ensure `ffmpeg` is in your system PATH.
