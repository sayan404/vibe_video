## Example: storyboard → Manim script mapping (Binary search)

### Input storyboard (Phase 2 output)

```json
[
  {
    "frameId": 1,
    "sceneTitle": "The problem: searching in a sorted list",
    "visualElements": [
      "A neat horizontal row of numbered boxes representing a sorted array"
    ],
    "onScreenText": ["Goal: find a value in a sorted list"],
    "animationIntent": "Pan across the sorted row, then pause on the target label.",
    "voiceoverScript": "We want to find a specific value inside a sorted list.",
    "durationSeconds": 8
  },
  {
    "frameId": 2,
    "sceneTitle": "Check the middle, then discard half",
    "visualElements": [
      "A marker on the middle box",
      "Shade the discarded half"
    ],
    "onScreenText": ["Look at the middle", "Discard half"],
    "animationIntent": "Zoom into the middle, fade out the discarded half.",
    "voiceoverScript": "Check the middle, then keep only the half that can contain the target.",
    "durationSeconds": 10
  }
]
```

### Output snippet (Phase 3 output)

```python
from manim import *

class StoryboardScene(Scene):
    def construct(self):
        # Frame 1: The problem: searching in a sorted list
        # animationIntent: Pan across the sorted row, then pause on the target label.
        # voiceoverScript: We want to find a specific value inside a sorted list.
        title = Text("The problem: searching in a sorted list").scale(0.7).to_edge(UP)
        on_screen = VGroup(Text("Goal: find a value in a sorted list").scale(0.55)).arrange(DOWN, aligned_edge=LEFT).next_to(title, DOWN, buff=0.5)
        visuals = VGroup(Text("A neat horizontal row of numbered boxes representing a sorted array").scale(0.45)).arrange(DOWN, aligned_edge=LEFT).to_edge(LEFT).shift(DOWN*0.5)
        self.play(FadeIn(title), run_time=0.6)
        self.play(FadeIn(on_screen), FadeIn(visuals), run_time=0.8)
        self.wait(8)
        self.play(FadeOut(title), FadeOut(on_screen), FadeOut(visuals), run_time=0.6)

        # Frame 2: Check the middle, then discard half
        # animationIntent: Zoom into the middle, fade out the discarded half.
        # voiceoverScript: Check the middle, then keep only the half that can contain the target.
        # ... frame content ...
        self.wait(10)
```
