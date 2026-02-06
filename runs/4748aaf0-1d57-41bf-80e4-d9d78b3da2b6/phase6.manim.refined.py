from manim import *

class StoryboardScene(Scene):
    def construct(self):
        # Helper function to create an array visualization
        def create_array_mobject(numbers, font_size=36, square_size=0.8):
            group = VGroup()
            for n in numbers:
                sq = Square(side_length=square_size)
                text = Text(str(n), font_size=font_size)
                sq_group = VGroup(sq, text)
                group.add(sq_group)
            group.arrange(RIGHT, buff=0)
            return group

        # Frame 1: Definition of Contiguous Subarray
        # Scene Title
        title_f1 = Text('Definition of Contiguous Subarray', font_size=40).to_edge(UP)
        self.play(Write(title_f1), run_time=1.0)

        # Visual Elements
        # A horizontal array of numbers: [3, -2, 5, -1]
        arr_f1 = create_array_mobject([3, -2, 5, -1])
        arr_f1.move_to(ORIGIN)
        self.play(FadeIn(arr_f1), run_time=1.0)

        # A bracket appearing above [3, -2] labeled 'Contiguous'
        brace1 = Brace(arr_f1[0:2], UP)
        # Stagger label1 higher to avoid overlap
        label1 = Text('Contiguous', font_size=24).next_to(brace1, UP, buff=0.5)
        
        # A bracket appearing above [5] labeled 'Contiguous'
        brace2 = Brace(arr_f1[2], UP)
        # Keep label2 closer
        label2 = Text('Contiguous', font_size=24).next_to(brace2, UP, buff=0.1)

        self.play(Create(brace1), Write(label1), Create(brace2), Write(label2), run_time=1.0)

        # A split bracket trying to group [3] and [5] while skipping -2, covered by a red 'X'
        # Simulating a connection skipping the middle
        skip_arc = CurvedArrow(arr_f1[0].get_top(), arr_f1[2].get_top(), angle=-TAU/4, color=YELLOW)
        skip_arc.shift(UP*0.5)
        cross = VGroup(
            Line(UR, DL, color=RED),
            Line(UL, DR, color=RED)
        ).scale(0.3).move_to(skip_arc.get_center())
        
        self.play(Create(skip_arc), FadeIn(cross), run_time=1.0)

        # On Screen Text
        ost_f1_1 = Text('Contiguous = Neighbors', font_size=32, color=YELLOW).to_edge(DOWN).shift(UP*0.5)
        ost_f1_2 = Text('No Gaps Allowed', font_size=32, color=RED).next_to(ost_f1_1, DOWN)
        self.play(Write(ost_f1_1), Write(ost_f1_2), run_time=1.0)

        # Animation Intent: Highlight valid groups in green and the invalid gap-bridging group in red.
        # Voiceover: To solve this problem, you first need to understand the definition of a contiguous subarray...

        self.wait(10)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.5)

        # Frame 2: The Problem Statement
        # Scene Title
        title_f2 = Text('The Problem Statement', font_size=40).to_edge(UP)
        self.play(Write(title_f2), run_time=1.0)

        # Visual Elements
        # The same array [3, -2, 5, -1]
        arr_f2 = create_array_mobject([3, -2, 5, -1])
        arr_f2.move_to(UP * 0.5)
        self.play(FadeIn(arr_f2), run_time=0.5)

        # Sliding window logic
        window_rect = Rectangle(width=arr_f2[0].width * 3, height=arr_f2[0].height, color=YELLOW)
        window_rect.move_to(arr_f2[0:3].get_center())
        
        sum_label = Text('Sum: 6', font_size=32).next_to(window_rect, DOWN, buff=0.5)
        
        self.play(Create(window_rect), Write(sum_label), run_time=0.5)
        self.wait(0.5)
        self.wait(12)

        # Move to single number [5]
        new_window_pos = arr_f2[2].get_center()
        self.play(
            window_rect.animate.become(Rectangle(width=arr_f2[2].width, height=arr_f2[2].height, color=YELLOW).move_to(new_window_pos)),
            Transform(sum_label, Text('Sum: 5', font_size=32).next_to(arr_f2, DOWN, buff=0.5)),
            run_time=1.0
        )

        # Move to full chunk
        full_window = Rectangle(width=arr_f2.width, height=arr_f2.height, color=YELLOW).move_to(arr_f2.get_center())
        self.play(
            window_rect.animate.become(full_window),
            Transform(sum_label, Text('Sum: 5', font_size=32).next_to(arr_f2, DOWN, buff=0.5)),
            run_time=1.0
        )

        # On Screen Text
        ost_f2 = Text('Goal: Find the Largest Sum', font_size=36, color=BLUE).to_edge(DOWN)
        self.play(Write(ost_f2), run_time=0.5)

        # Animation Intent: The sliding window should move quickly to show we are searching for the 'best' slice.
        # Voiceover: Once we know the rules, our goal is to recognize the Maximum Subarray Sum problem...

        # Adjusted wait time to account for animation duration (approx 5s animation, target ~12s total)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.5)

        # Frame 3: Naive Approach vs. Reality
        # Scene Title
        title_f3 = Text("Naive Approach vs. Reality", font_size=40).to_edge(UP)
        self.play(Write(title_f3), run_time=1.0)

        # Visual Elements
        # Array: [-2, 1, -3, 4, -1, 2, 1, -5, 4]
        nums_f3 = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
        arr_f3 = create_array_mobject(nums_f3, square_size=0.7)
        arr_f3.move_to(ORIGIN)
        self.play(FadeIn(arr_f3), run_time=0.5)

        # Identify positives indices: 1, 3, 5, 6, 8 (values: 1, 4, 2, 1, 4)
        positive_indices = [1, 3, 5, 6, 8]
        pos_group = VGroup(*[arr_f3[i] for i in positive_indices])
        
        # Pop out positives
        self.play(pos_group.animate.shift(UP * 0.5), run_time=1.0)

        # Dotted lines connecting them blocked by negatives
        # Draw dashed line from 1 to 4 (blocked by -3)
        dash1 = DashedLine(arr_f3[1].get_right(), arr_f3[3].get_left(), color=RED)
        cross1 = Text("X", color=RED, font_size=24).move_to(dash1.get_center())
        
        self.play(Create(dash1), Write(cross1), run_time=0.5)

        # On Screen Text
        ost_f3_1 = Text("Why not just add positives?", font_size=28).to_edge(DOWN).shift(UP*0.5)
        ost_f3_2 = Text("Gaps are forbidden!", font_size=32, color=RED).next_to(ost_f3_1, DOWN)
        self.play(Write(ost_f3_1), Write(ost_f3_2), run_time=1.0)

        # Animation Intent: Show the positive numbers trying to merge but bouncing off the negative numbers.
        # Voiceover: You might think, 'Why not just add all the positive numbers?'...

        self.wait(12)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.5)

        # Frame 4: Intuition: The Happiness Meter
        # Scene Title
        title_f4 = Text("Intuition: The Happiness Meter", font_size=40).to_edge(UP)
        self.play(Write(title_f4), run_time=0.5)

        # Visual Elements
        # Stick figure
        head = Circle(radius=0.3, color=WHITE).shift(UP)
        body = Line(head.get_bottom(), head.get_bottom() + DOWN*1.5, color=WHITE)
        arms = Line(body.get_top() + DOWN*0.5 + LEFT*0.5, body.get_top() + DOWN*0.5 + RIGHT*0.5, color=WHITE)
        legs = VGroup(
            Line(body.get_bottom(), body.get_bottom() + DOWN*0.8 + LEFT*0.4, color=WHITE),
            Line(body.get_bottom(), body.get_bottom() + DOWN*0.8 + RIGHT*0.4, color=WHITE)
        )
        stick_figure = VGroup(head, body, arms, legs).shift(LEFT * 3 + DOWN * 0.5)
        
        # Happiness Meter
        meter_frame = Rectangle(width=1, height=4, color=WHITE).next_to(stick_figure, RIGHT, buff=1)
        meter_fill = Rectangle(width=0.8, height=0.1, color=GREEN, fill_opacity=1).move_to(meter_frame.get_bottom() + UP*0.1)
        
        self.play(Create(stick_figure), Create(meter_frame), FadeIn(meter_fill), run_time=1.0)

        # Animate fill up (Positive)
        fill_high = Rectangle(width=0.8, height=3, color=GREEN, fill_opacity=1).move_to(meter_frame.get_bottom(), aligned_edge=DOWN).shift(UP*0.1)
        self.play(Transform(meter_fill, fill_high), run_time=1.0)
        
        # Animate fill down/red (Negative events)
        fill_neg = Rectangle(width=0.8, height=0.5, color=RED, fill_opacity=1).move_to(meter_frame.get_bottom(), aligned_edge=DOWN).shift(UP*0.1)
        self.play(Transform(meter_fill, fill_neg), run_time=1.0)
        
        # Reset visual
        flash = Star(color=YELLOW, fill_opacity=0.5).scale(2).move_to(meter_frame)
        self.play(FadeIn(flash), run_time=0.2)
        self.play(FadeOut(flash), meter_fill.animate.become(Rectangle(width=0.8, height=0.01, color=WHITE).move_to(meter_frame.get_bottom()).shift(UP*0.1)), run_time=0.5)

        # On Screen Text
        ost_f4_1 = Text("Don't carry the baggage", font_size=32).to_edge(RIGHT).shift(UP)
        ost_f4_2 = Text("Reset if < 0", font_size=32, color=YELLOW).next_to(ost_f4_1, DOWN)
        self.play(Write(ost_f4_1), Write(ost_f4_2), run_time=1.0)

        # Animation Intent: The bar should visually 'dump' the negative liquid out.
        # Voiceover: Imagine this like a happiness meter. If a bad streak drops your overall mood below zero...

        self.wait(15)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.5)

        # Frame 5: Core Logic: The Greedy Reset
        # Scene Title
        title_f5 = Text('Core Logic: The Greedy Reset', font_size=40).to_edge(UP)
        self.play(Write(title_f5), run_time=0.5)

        # Visual Elements
        # Buckets
        curr_bucket = VGroup(
            Line(UL, DL), Line(DL, DR), Line(DR, UR)
        ).scale(0.8).shift(LEFT * 2)
        curr_label = Text('Current Sum', font_size=24).next_to(curr_bucket, DOWN)

        max_bucket = VGroup(
            Line(UL, DL), Line(DL, DR), Line(DR, UR)
        ).scale(0.8).shift(RIGHT * 2)
        max_label = Text('Max Sum', font_size=24).next_to(max_bucket, DOWN)

        self.play(Create(curr_bucket), Write(curr_label), Create(max_bucket), Write(max_label), run_time=1.0)

        # Visualize stream logic
        # Negative fills current
        neg_num = Text('-2', font_size=24, color=RED).move_to(curr_bucket.get_top() + UP)
        self.play(neg_num.animate.move_to(curr_bucket.get_center()), run_time=0.5)
        self.play(FadeOut(neg_num), run_time=0.1)

        water_red = Rectangle(width=1.4, height=0.5, color=RED, fill_opacity=0.8, stroke_width=0).move_to(curr_bucket.get_bottom() + UP*0.35)
        self.play(FadeIn(water_red), run_time=0.5)

        # Reset animation (Emptying)
        reset_text = Text('RESET', color=RED, font_size=36).move_to(curr_bucket.get_center())
        self.play(Write(reset_text), run_time=0.5)
        self.play(FadeOut(water_red), FadeOut(reset_text), run_time=0.5)

        # Positive fills
        pos_num = Text('4', font_size=24, color=BLUE).move_to(curr_bucket.get_top() + UP)
        self.play(pos_num.animate.move_to(curr_bucket.get_center()), run_time=0.5)
        self.play(FadeOut(pos_num), run_time=0.1)

        water_blue = Rectangle(width=1.4, height=1.5, color=BLUE, fill_opacity=0.8, stroke_width=0).move_to(curr_bucket.get_bottom() + UP*0.85)
        max_water = Rectangle(width=1.4, height=1.5, color=GOLD, fill_opacity=0.8, stroke_width=0).move_to(max_bucket.get_bottom() + UP*0.85)
        
        self.play(FadeIn(water_blue), run_time=0.5)
        self.play(TransformFromCopy(water_blue, max_water), run_time=1.0)

        # On Screen Text
        ost_f5_1 = Text('If Current Sum < 0 -> Reset to 0', font_size=28, color=RED).to_edge(DOWN).shift(UP*0.5)
        ost_f5_2 = Text('Keep the best record in Max Sum', font_size=28, color=GOLD).next_to(ost_f5_1, DOWN)
        self.play(Write(ost_f5_1), Write(ost_f5_2), run_time=1.0)

        # Animation Intent: Emphasize the instant reset mechanism.
        # Voiceover: This is Kadane's Algorithm. You must grasp the 'greedy' logic...

        self.wait(14)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.5)

        # Frame 6: Manual Walkthrough - Part 1
        # Common elements for frames 6-9
        walk_array_vals = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
        walk_array = create_array_mobject(walk_array_vals, square_size=0.7).shift(UP)
        pointer = Arrow(start=DOWN, end=UP, color=YELLOW).next_to(walk_array[0], DOWN)
        
        curr_text = Text('Current Sum: 0', font_size=32).move_to(LEFT * 3 + DOWN * 1)
        max_text = Text('Max So Far: -Inf', font_size=32).move_to(RIGHT * 3 + DOWN * 1)

        # Scene Title
        title_f6 = Text('Manual Walkthrough', font_size=40).to_edge(UP)
        self.play(Write(title_f6), FadeIn(walk_array), Create(pointer), Write(curr_text), Write(max_text), run_time=1.0)

        # Step 0: Val -2
        # Current = -2
        self.play(Transform(curr_text, Text('Current Sum: -2', color=RED, font_size=32).move_to(curr_text.get_center())), run_time=0.5)
        self.play(Indicate(curr_text, color=RED), run_time=0.5)
        
        # Update Max before reset
        self.play(Transform(max_text, Text('Max So Far: -2', font_size=32).move_to(max_text.get_center())), run_time=0.5)

        # Reset
        self.play(Transform(curr_text, Text('Current Sum: 0', color=WHITE, font_size=32).move_to(curr_text.get_center())), run_time=0.5)

        # On Screen Text
        ost_f6 = Text('Current: -2 -> RESET -> 0', font_size=28).to_edge(DOWN)
        self.play(Write(ost_f6), run_time=0.5)

        # Animation Intent: Distinct movement. Highlight -2, sum drop, reset.
        # Voiceover: Let's calculate the maximum sum...

        self.wait(12)
        # We keep objects for next frame, just clear temporary text
        self.play(FadeOut(ost_f6), run_time=0.2)

        # Frame 7: Manual Walkthrough - Part 2
        # Pointer to 1
        self.play(pointer.animate.next_to(walk_array[1], DOWN), run_time=0.5)
        # Current = 1
        self.play(Transform(curr_text, Text("Current Sum: 1", font_size=32).move_to(curr_text.get_center())), run_time=0.5)
        # Max = 1
        self.play(Transform(max_text, Text("Max So Far: 1", font_size=32).move_to(max_text.get_center())), run_time=0.5)
        
        ost_f7_1 = Text("Index 1: Current = 1 (New Max!)", font_size=28).to_edge(DOWN).shift(UP*0.3)
        self.play(Write(ost_f7_1), run_time=0.5)

        # Pointer to -3
        self.play(pointer.animate.next_to(walk_array[2], DOWN), run_time=0.5)
        # Current = 1 + (-3) = -2
        self.play(Transform(curr_text, Text("Current Sum: -2", color=RED, font_size=32).move_to(curr_text.get_center())), run_time=0.5)
        # Reset
        self.play(Transform(curr_text, Text("Current Sum: 0", color=WHITE, font_size=32).move_to(curr_text.get_center())), run_time=0.5)
        
        ost_f7_2 = Text("Index 2: Current = -2 -> RESET", font_size=28, color=RED).next_to(ost_f7_1, DOWN)
        self.play(Write(ost_f7_2), run_time=0.5)

        # Voiceover: Next is 1... Then comes negative 3...

        self.wait(14)
        self.play(FadeOut(ost_f7_1), FadeOut(ost_f7_2), run_time=0.2)

        # Frame 8: Manual Walkthrough - Part 3 (The Peak)
        # Pointer moves through 4, -1, 2, 1
        # 4
        self.play(pointer.animate.next_to(walk_array[3], DOWN), run_time=0.5)
        self.play(
            Transform(curr_text, Text('Current Sum: 4', font_size=32).move_to(curr_text.get_center())),
            Transform(max_text, Text('Max So Far: 4', font_size=32).move_to(max_text.get_center())),
            run_time=1.0
        )
        # Removed long wait here to allow rapid progression

        # -1 -> Sum 3
        self.play(pointer.animate.next_to(walk_array[4], DOWN), run_time=0.5)
        self.play(Transform(curr_text, Text('Current Sum: 3', font_size=32).move_to(curr_text.get_center())), run_time=1.0)

        # 2 -> Sum 5
        self.play(pointer.animate.next_to(walk_array[5], DOWN), run_time=0.5)
        self.play(
            Transform(curr_text, Text('Current Sum: 5', font_size=32).move_to(curr_text.get_center())),
            Transform(max_text, Text('Max So Far: 5', font_size=32).move_to(max_text.get_center())),
            run_time=1.0
        )

        # 1 -> Sum 6
        self.play(pointer.animate.next_to(walk_array[6], DOWN), run_time=0.5)
        self.play(
            Transform(curr_text, Text('Current Sum: 6', font_size=32).move_to(curr_text.get_center())),
            Transform(max_text, Text('Max So Far: 6', font_size=32).move_to(max_text.get_center())),
            run_time=1.0
        )

        ost_f8 = Text('Building the streak... Max: 6', font_size=28, color=GREEN).to_edge(DOWN)
        self.play(Write(ost_f8), run_time=0.5)

        # Voiceover: Now the good part...

        self.play(FadeOut(ost_f8), run_time=0.2)
        self.wait(12)

        # Frame 9: Manual Walkthrough - Conclusion
        # Pointer to -5 (Sum -> 1)
        self.play(pointer.animate.next_to(walk_array[7], DOWN), run_time=0.3)
        self.play(Transform(curr_text, Text("Current Sum: 1", font_size=32).move_to(curr_text.get_center())), run_time=0.3)

        # Pointer to 4 (Sum -> 5)
        self.play(pointer.animate.next_to(walk_array[8], DOWN), run_time=0.3)
        self.play(Transform(curr_text, Text("Current Sum: 5", font_size=32).move_to(curr_text.get_center())), run_time=0.3)
        
        # Highlight winning subarray [4, -1, 2, 1] (Indices 3 to 6)
        winning_rect = SurroundingRectangle(walk_array[3:7], color=GOLD, buff=0.1)
        self.play(Create(winning_rect), run_time=1.0)

        # On Screen Text
        ost_f9_1 = Text("Final Result: 6", font_size=36, color=GOLD).to_edge(DOWN).shift(UP*0.5)
        ost_f9_2 = Text("Time Complexity: O(n)", font_size=32).next_to(ost_f9_1, DOWN)
        self.play(Write(ost_f9_1), Write(ost_f9_2), run_time=1.0)

        # Voiceover: Finally, the negative 5 drops us down...

        self.wait(12)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.5)