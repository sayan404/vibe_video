import argparse
import json
import os
import re
import subprocess
import sys
import time
import shutil
from typing import Any, Dict, List, Optional, Tuple


def _read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _parse_storyboard_metadata_from_script(script_text: str) -> Dict[str, Any]:
    """
    Deterministically extracts:
    - frameCount
    - sceneDurations (per frame)
    - totalDuration

    Contract assumptions (enforced by generator):
    - Each frame has a comment: `# Frame N: Title`
    - Each frame contains one or more `self.wait(<durationSeconds>)` calls with numeric literals.
      If multiple waits appear within a frame, their durations are summed for metadata purposes.
    """
    frame_re = re.compile(r"^\s*#\s*Frame\s+(\d+)\s*:\s*(.+?)\s*$")
    # Allow optional trailing inline comments after the wait call.
    wait_re = re.compile(r"^\s*self\.wait\(\s*([0-9]+(?:\.[0-9]+)?)\s*\)\s*(?:#.*)?$")

    frames: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None

    for line in script_text.splitlines():
        m_frame = frame_re.match(line)
        if m_frame:
            if current is not None:
                frames.append(current)
            current = {
                "frameId": int(m_frame.group(1)),
                "sceneTitle": m_frame.group(2),
                "durationSeconds": 0.0,
            }
            continue

        if current is None:
            continue

        m_wait = wait_re.match(line)
        if m_wait:
            current["durationSeconds"] += float(m_wait.group(1))

    if current is not None:
        frames.append(current)

    if not frames:
        raise ValueError("No frames found in script (missing '# Frame N: ...' comments).")

    # Validate contiguous frame IDs and all durations present
    for i, f in enumerate(frames):
        expected = i + 1
        if f["frameId"] != expected:
            raise ValueError(
                f"Non-contiguous frameId sequence: expected {expected}, got {f['frameId']}"
            )
        if f["durationSeconds"] <= 0:
            raise ValueError(f"Non-positive durationSeconds for frameId={f['frameId']}")

    total = float(sum(f["durationSeconds"] for f in frames))

    return {
        "frameCount": len(frames),
        "sceneDurations": [
            {
                "frameId": f["frameId"],
                "sceneTitle": f["sceneTitle"],
                "durationSeconds": f["durationSeconds"],
            }
            for f in frames
        ],
        "totalDuration": total,
    }


def _run_manim(
    script_path: str,
    scene_name: str,
    quality: str,
    media_dir: Optional[str],
) -> Tuple[int, str, str, float]:
    """
    Runs Manim via CLI:
      python -m manim -q<qualityFlag> <script_path> <scene_name> [--media_dir <media_dir>]

    quality: "low" | "medium" | "high" | "ultra"
    """
    quality_map = {
        "low": "l",
        "medium": "m",
        "high": "h",
        "ultra": "k",
    }
    if quality not in quality_map:
        raise ValueError(f"Unsupported quality: {quality}")

    cmd = [sys.executable, "-m", "manim", f"-q{quality_map[quality]}", script_path, scene_name]
    if media_dir:
        cmd += ["--media_dir", media_dir]

    start = time.time()
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env={**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"},
    )
    elapsed = time.time() - start
    return proc.returncode, proc.stdout, proc.stderr, elapsed


def _try_ffmpeg_concat_fallback(media_dir: str, scene_name: str) -> Tuple[bool, str]:
    """
    Fallback for a known Manim/PyAV failure mode on Windows where combining partial movie files
    fails with an InvalidDataError referencing `partial_movie_file_list.txt`.

    If ffmpeg is available in PATH, we concatenate via:
      ffmpeg -f concat -safe 0 -i partial_movie_file_list.txt -c copy StoryboardScene.mp4
    """
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        # WinGet installs often land here even before PATH refresh.
        local_app_data = os.environ.get("LOCALAPPDATA")
        if local_app_data:
            winget_packages = os.path.join(local_app_data, "Microsoft", "WinGet", "Packages")
            if os.path.isdir(winget_packages):
                for root, _dirs, files in os.walk(winget_packages):
                    if "ffmpeg.exe" in files:
                        ffmpeg = os.path.join(root, "ffmpeg.exe")
                        break
    if not ffmpeg:
        return False, "ffmpeg not found in PATH (install ffmpeg to enable concat fallback)."

    # Find list file(s) created by Manim under the media_dir
    candidates: List[str] = []
    for root, _dirs, files in os.walk(media_dir):
        if "partial_movie_file_list.txt" in files and os.path.basename(root) == scene_name:
            candidates.append(os.path.join(root, "partial_movie_file_list.txt"))

    if not candidates:
        # Broader search: any partial_movie_file_list.txt
        for root, _dirs, files in os.walk(media_dir):
            if "partial_movie_file_list.txt" in files:
                candidates.append(os.path.join(root, "partial_movie_file_list.txt"))

    if not candidates:
        return False, "Could not locate partial_movie_file_list.txt under media_dir for ffmpeg fallback."

    # Choose the newest list file (best guess)
    list_path = max(candidates, key=lambda p: os.path.getmtime(p))

    # Output path is sibling folder: .../<quality>/<SceneName>.mp4
    # list_path: .../partial_movie_files/<SceneName>/partial_movie_file_list.txt
    quality_dir = os.path.dirname(os.path.dirname(os.path.dirname(list_path)))
    out_path = os.path.join(quality_dir, f"{scene_name}.mp4")

    cmd = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        list_path,
        "-c",
        "copy",
        out_path,
    ]

    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if proc.returncode != 0:
        msg = (proc.stderr or proc.stdout or "").strip()
        return False, f"ffmpeg concat failed: {msg}"

    return True, f"ffmpeg concat succeeded: {out_path}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", required=True, help="Path to python Manim script")
    ap.add_argument("--scene", required=True, help="Scene class name to render")
    ap.add_argument(
        "--quality",
        default="low",
        choices=["low", "medium", "high", "ultra"],
        help="Manim quality preset",
    )
    ap.add_argument(
        "--media_dir",
        default=None,
        help="Optional Manim media_dir override",
    )
    args = ap.parse_args()

    script_text = _read_text(args.script)
    metadata = _parse_storyboard_metadata_from_script(script_text)

    code, out, err, elapsed = _run_manim(
        script_path=args.script,
        scene_name=args.scene,
        quality=args.quality,
        media_dir=args.media_dir,
    )

    # If Manim fails while combining partial movies via PyAV, try ffmpeg concat fallback.
    if code != 0 and args.media_dir:
        err_text = err or ""
        # The error message often wraps paths mid-filename, so use a regex tolerant to whitespace.
        is_partial_list_error = bool(
            re.search(r"partial_movie_file_list\s*\.txt", err_text)
            or ("partial_movie_file_list" in err_text)
        )
        if is_partial_list_error and "InvalidDataError" in err_text:
            ok, note = _try_ffmpeg_concat_fallback(args.media_dir, args.scene)
            if ok:
                # Treat as success if we could produce the final mp4.
                code = 0
                out = (out or "") + f"\n[ffmpeg-fallback] {note}\n"
            else:
                err = (err or "") + f"\n[ffmpeg-fallback] {note}\n"

    payload: Dict[str, Any] = {
        "ok": code == 0,
        "exitCode": code,
        "elapsedSeconds": elapsed,
        "totalDuration": metadata["totalDuration"],
        "sceneDurations": metadata["sceneDurations"],
        "frameCount": metadata["frameCount"],
        "stdout": out,
        "stderr": err,
    }

    # Print a single JSON object (TS side parses this).
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()

    return 0 if code == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())

