from manim import *
import numpy as np

class StoryboardScene(Scene):
    def construct(self):
        # Frame 1: The Linear Struggle
        # animationIntent: Demonstrate the inefficiency of checking elements sequentially to create contrast with the efficient method coming next.
        # voiceoverScript: Imagine trying to find a specific number in a massive, jumbled list. Checking every single item one by one is slow and inefficient. We need a better strategy.
        frame1_title = Text("The Linear Struggle").to_edge(UP)
        
        # Visual Elements
        # A long horizontal array of 16 unsorted numbered boxes.
        array_values = [15, 3, 8, 1, 10, 5, 12, 2, 14, 7, 9, 4, 16, 6, 13, 11]
        boxes = VGroup(*[
            Rectangle(width=0.8, height=0.8, color=BLUE_B).add(Text(str(val), font_size=30)).set_x(i * 0.9 - (len(array_values)-1)*0.9/2)
            for i, val in enumerate(array_values)
        ]).arrange(RIGHT, buff=0.1).shift(DOWN*0.5)
        
        # An arrow labeled 'Linear Search' moves painstakingly from left to right, checking every single box.
        search_arrow = Arrow(start=boxes[0].get_top() + UP*0.5, end=boxes[0].get_top(), color=YELLOW_A) # Adjusted arrow start/end
        search_label = Text("Linear Search", font_size=25).next_to(search_arrow, UP) # Adjusted label positioning
        search_vgroup = VGroup(search_arrow, search_label)
        
        # A clock icon spins rapidly to indicate wasted time.
        # (Deterministic, no external SVG dependency.)
        clock_face = Circle(radius=0.4, color=WHITE).to_edge(RIGHT).shift(UP * 0.5)
        clock_hand = Line(clock_face.get_center(), clock_face.get_center() + UP * 0.22, color=YELLOW)
        clock = VGroup(clock_face, clock_hand)
        
        self.play(FadeIn(frame1_title), FadeIn(boxes), FadeIn(search_vgroup), FadeIn(clock), run_time=0.5) # Reduced initial FadeIn run_time
        
        # Use an updater for the clock hand to spin continuously during the linear search loop
        total_linear_search_run_time = 8.0 # Total time for the checking loop
        rotation_rate = (2*PI*5) / total_linear_search_run_time # Total angle / total time
        clock_hand.add_updater(lambda mobj, dt: mobj.rotate(rotation_rate * dt, about_point=clock_face.get_center()))

        # Move arrow across boxes and highlight each
        run_time_per_move = 0.1
        run_time_per_highlight = 0.2
        run_time_per_unhighlight = 0.2

        for i, box in enumerate(boxes):
            self.play(
                search_vgroup.animate.next_to(box, UP), 
                run_time=run_time_per_move,
                rate_func=linear
            )
            self.play(
                box.animate.set_color(YELLOW_A),
                run_time=run_time_per_highlight
            )
            self.play(
                box.animate.set_color(BLUE_B),
                run_time=run_time_per_unhighlight
            )
        
        clock_hand.clear_updaters() # Stop the clock rotation

        # On-Screen Text
        frame1_text1 = Text("Linear Search: O(n)", font_size=36, color=RED).to_edge(DR).shift(LEFT)
        frame1_text2 = Text("Slow on large datasets", font_size=30).next_to(frame1_text1, DOWN, buff=0.3)
        
        self.play(FadeIn(frame1_text1), FadeIn(frame1_text2), run_time=0.5) # Reduced FadeIn run_time
        
        self.wait(1.0) # Adjusted wait time (0.5 initial + 8s loop + 0.5 text + 1s wait = 10s total)
        self.play(FadeOut(frame1_title), FadeOut(boxes), FadeOut(search_vgroup), FadeOut(clock), FadeOut(frame1_text1), FadeOut(frame1_text2))

        # Frame 2: The Prerequisite: Order
        # animationIntent: Visually enforce structure. The satisfying 'snap' to order emphasizes that the algorithm fails without this state.
        # voiceoverScript: Before we can optimize, we must recognize the critical requirement of sorted input data. Without a sorted list, the logic we are about to use simply falls apart.
        frame2_title = Text("The Prerequisite: Order").to_edge(UP)
        
        # Visual Elements
        # Create jumbled boxes (the 'from' state, reusing array_values from Frame 1)
        array_values_unsorted = [15, 3, 8, 1, 10, 5, 12, 2, 14, 7, 9, 4, 16, 6, 13, 11]
        current_boxes_display = VGroup(*[
            Rectangle(width=0.8, height=0.8, color=BLUE_B).add(Text(str(val), font_size=30))
            for val in array_values_unsorted
        ]).arrange(RIGHT, buff=0.1).shift(DOWN*0.5)

        self.play(FadeIn(frame2_title), FadeIn(current_boxes_display), run_time=0.5) # Fade in unsorted boxes
        
        # Create a temporary VGroup to derive target sorted positions
        temp_sorted_boxes = VGroup(*[
            Rectangle(width=0.8, height=0.8, color=BLUE_B).add(Text(str(val), font_size=30))
            for val in sorted(array_values_unsorted)
        ]).arrange(RIGHT, buff=0.1).shift(DOWN*0.5)

        # Create a mapping from box value to its Mobject in current_boxes_display
        value_to_mobject_map = {int(mobj[1].text): mobj for mobj in current_boxes_display}

        # Create a list of animations to move each box to its new, sorted position
        transform_animations = []
        for i, val in enumerate(sorted(array_values_unsorted)): # Iterate through sorted values
            mobj_to_move = value_to_mobject_map[val]
            target_position = temp_sorted_boxes[i].get_center()
            transform_animations.append(mobj_to_move.animate.move_to(target_position))
        
        # Play the transformation animation to sort the boxes
        self.play(*transform_animations, run_time=2.0) # Transform animation to sort boxes

        # A red warning icon pulses briefly if the array tries to shuffle back, then locks into sorted state.
        warning_icon = Triangle(color=RED, fill_opacity=1).scale(0.3).next_to(current_boxes_display, UP)
        warning_label = Text("UNSORTED!", font_size=20, color=RED).next_to(warning_icon, UP)
        warning_group = VGroup(warning_icon, warning_label)
        
        # Simulate trying to shuffle back
        self.play(
            FadeIn(warning_group, run_time=0.5), # Reduced FadeIn run_time
            current_boxes_display.animate.shift(LEFT*0.5).set_color(RED), # briefly indicate shuffle attempt
            run_time=1.0 # Kept for visual impact
        )
        self.play(
            FadeOut(warning_group, run_time=0.5), # Reduced FadeOut run_time
            current_boxes_display.animate.shift(RIGHT*0.5).set_color(BLUE_B), # snap back to sorted
            run_time=1.0 # Kept for visual impact
        )
        
        # Text highlights the word 'SORTED'.
        sorted_text_highlight = Text("SORTED", font_size=50, color=GREEN_B).next_to(current_boxes_display, DOWN, buff=1)
        
        # On-Screen Text
        frame2_text = Text("CRITICAL: Sorted Input Only", font_size=36, color=YELLOW_E).to_edge(DR).shift(LEFT)
        
        self.play(Write(sorted_text_highlight, run_time=0.5), FadeIn(frame2_text, run_time=0.5)) # Reduced Write/FadeIn run_time
        
        self.wait(7.0) # Adjusted wait time (0.5 initial + 2s sort + 1s warning in + 1s warning out + 0.5 text + 7s wait = 12s total)
        self.play(FadeOut(frame2_title), FadeOut(current_boxes_display), FadeOut(sorted_text_highlight), FadeOut(frame2_text))

        # Frame 3: Divide and Conquer Logic
        # animationIntent: Show the aggressive reduction of the search space. The 'fading out' of half the array should feel impactful and swift.
        # voiceoverScript: Now, we check the middle element. Since our target is higher, we ignore the entire lower half. By repeatedly splitting the search space, you can understand the divide-and-conquer principle applied in binary search.
        frame3_title = Text("Divide and Conquer Logic").to_edge(UP)
        
        # Visual Elements
        # A sorted array of 16 numbers (indices 0-15). Target is 14.
        array_values_3 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] # Using 0-15 for simplicity
        boxes_3 = VGroup(*[
            Rectangle(width=0.7, height=0.7, color=BLUE_B).add(Text(str(val), font_size=24))
            for val in array_values_3
        ]).arrange(RIGHT, buff=0.1).shift(DOWN*0.5)
        
        target_value = 14
        target_text = Text(f"Target: {target_value}", font_size=36, color=YELLOW_E).to_edge(UL).shift(RIGHT)
        
        self.play(FadeIn(frame3_title, run_time=0.5), FadeIn(boxes_3, run_time=0.5), FadeIn(target_text, run_time=0.5)) # Reduced FadeIn run_time
        
        # A bracket highlights the whole array. An arrow points to the middle element (index 7).
        low_idx, high_idx = 0, len(array_values_3) - 1
        
        def create_bracket(boxes_group, low, high):
            if low > high: # Handle empty range for bracket
                return VGroup() # Return empty VGroup or similar to avoid error
            first_box = boxes_group[low]
            last_box = boxes_group[high]
            bracket = Brace(VGroup(first_box, last_box), direction=UP, buff=0.1)
            return bracket

        current_bracket = create_bracket(boxes_3, low_idx, high_idx)
        self.play(GrowFromCenter(current_bracket, run_time=0.5)) # Reduced GrowFromCenter run_time

        # On-Screen Text
        step1_text = Text("Step 1: Compare Middle", font_size=30, color=WHITE).to_edge(DR).shift(LEFT)
        step2_text = Text("Step 2: Discard Half", font_size=30, color=WHITE).next_to(step1_text, DOWN, buff=0.3)
        self.play(FadeIn(step1_text, run_time=0.5)) # Reduced FadeIn run_time
        
        # Binary search simulation
        while low_idx <= high_idx:
            mid_idx = (low_idx + high_idx) // 2
            mid_box = boxes_3[mid_idx]
            
            middle_arrow = Arrow(start=mid_box.get_center() + UP*0.5, end=mid_box.get_center(), color=RED)
            middle_label = Text("Middle", font_size=25, color=RED).next_to(middle_arrow, UP)
            
            self.play(FadeIn(middle_arrow, run_time=0.5), FadeIn(middle_label, run_time=0.5)) # Reduced FadeIn run_time
            
            if array_values_3[mid_idx] == target_value:
                self.play(mid_box.animate.set_color(GREEN_B).scale(1.2), FadeOut(middle_arrow, middle_label, run_time=0.5)) # Reduced FadeOut run_time
                break # Found
            elif array_values_3[mid_idx] < target_value:
                # Target > middle, discard left half
                self.play(FadeOut(middle_arrow, middle_label, run_time=0.5)) # Reduced FadeOut run_time
                self.play(FadeIn(step2_text, run_time=0.5)) # Reduced FadeIn run_time

                # Collect boxes to discard into a VGroup
                to_discard_vgroup = VGroup()
                for i in range(low_idx, mid_idx + 1):
                    if boxes_3[i] in self.mobjects: # Ensure it's still on screen before attempting to add
                        to_discard_vgroup.add(boxes_3[i])

                discard_run_time = 1.5 if len(to_discard_vgroup) > 4 else (1.0 if len(to_discard_vgroup) > 1 else 0.75)
                self.play(FadeOut(to_discard_vgroup, run_time=discard_run_time)) # Replaced individual animation with single FadeOut

                low_idx = mid_idx + 1
                new_bracket = create_bracket(boxes_3, low_idx, high_idx)
                self.play(Transform(current_bracket, new_bracket, run_time=0.5), FadeOut(step2_text, run_time=0.5)) # Reduced Transform/FadeOut run_time
            else:
                # Target < middle, discard right half
                self.play(FadeOut(middle_arrow, middle_label, run_time=0.5)) # Reduced FadeOut run_time
                self.play(FadeIn(step2_text, run_time=0.5)) # Reduced FadeIn run_time

                # Collect boxes to discard into a VGroup
                to_discard_vgroup = VGroup()
                for i in range(mid_idx, high_idx + 1):
                    if boxes_3[i] in self.mobjects: # Ensure it's still on screen before attempting to add
                        to_discard_vgroup.add(boxes_3[i])
                
                discard_run_time = 1.5 if len(to_discard_vgroup) > 4 else (1.0 if len(to_discard_vgroup) > 1 else 0.75)
                self.play(FadeOut(to_discard_vgroup, run_time=discard_run_time)) # Replaced individual animation with single FadeOut

                high_idx = mid_idx - 1
                new_bracket = create_bracket(boxes_3, low_idx, high_idx)
                self.play(Transform(current_bracket, new_bracket, run_time=0.5), FadeOut(step2_text, run_time=0.5)) # Reduced Transform/FadeOut run_time
            # (No per-iteration waits; total frame timing controlled by the final self.wait below.)
        
        # Adjusted wait time (1.5 initial + 10.25 search steps + 6.25s wait = 18s total)
        self.wait(6.25)
        self.play(FadeOut(frame3_title), FadeOut(boxes_3), FadeOut(target_text), FadeOut(current_bracket), FadeOut(step1_text), FadeOut(step2_text))

        # Frame 4: The Logarithmic Advantage
        # animationIntent: Use data visualization to prove scalability. The massive gap between the two lines visually proves the power of the algorithm.
        # voiceoverScript: For a million items, linear search might take a million steps. Binary search takes about twenty. This comparison helps you appreciate its O(log n) time complexity advantage over linear search.
        frame4_title = Text("The Logarithmic Advantage").to_edge(UP)
        
        # Split screen comparison.
        # Left side: A line graph with a steep slope labeled 'Linear O(n)'.
        # Right side: A graph with a very shallow curve labeled 'Binary O(log n)'.
        axes = Axes(
            x_range=[0, 10, 1],
            y_range=[0, 1000000, 200000],
            x_length=6,
            y_length=4,
            axis_config={"color": GRAY, "stroke_width": 2},
            x_axis_config={"numbers_to_exclude": [0]},
            y_axis_config={"numbers_to_exclude": [0]},
        ).to_edge(LEFT).shift(RIGHT*1.5)
        
        x_label = axes.get_x_axis_label(Text("N (Input Size)", font_size=20), edge=DOWN, buff=0.3)
        y_label = axes.get_y_axis_label(Text("Steps", font_size=20), edge=LEFT, buff=0.3)
        
        linear_label = Text("Linear O(n)", font_size=28, color=RED).next_to(axes.get_corner(UR), UP)
        binary_label = Text("Binary O(log n)", font_size=28, color=GREEN).next_to(axes.get_corner(DR), DOWN)
        
        # Define functions for the graphs
        def func_linear(x):
            return x * 100000 # Scaling for visualization on y_range up to 1M
        
        def func_binary(x):
            return 20 # Roughly log(1M) is 20 (base 2)
            
        # Manim v0.19 uses Axes.plot() (get_graph is not available in some builds).
        linear_graph = axes.plot(func_linear, x_range=[0, 10], color=RED)
        binary_graph = axes.plot(func_binary, x_range=[0, 10], color=GREEN)
        
        self.play(FadeIn(frame4_title, run_time=0.5), Create(axes, run_time=0.5), Write(x_label, run_time=0.5), Write(y_label, run_time=0.5)) # Reduced FadeIn/Create/Write run_time
        
        self.play(
            Create(linear_graph, run_time=3),
            Create(binary_graph, run_time=3)
        )
        self.play(FadeIn(linear_label, run_time=0.5), FadeIn(binary_label, run_time=0.5)) # Reduced FadeIn run_time
        
        # Animation shows N increasing to 1,000,000.
        # For Manim, we can animate a point moving along the graph or just show values changing.
        # Let's show values changing and highlight points on the graph.
        
        n_val = ValueTracker(1) # n_val represents the scaled x-axis value (1 to 10)
        linear_steps_text = Text("Linear: 0 steps", font_size=30, color=RED).to_edge(UR).shift(LEFT)
        binary_steps_text = Text("Binary: 0 steps", font_size=30, color=GREEN).next_to(linear_steps_text, DOWN, buff=0.3)
        
        def update_linear_steps(mobj):
            current_x_scaled = n_val.get_value()
            actual_n = current_x_scaled * 100000 # Map x_scaled (1-10) to actual N (100k-1M)
            # Linear steps directly scale with N
            steps = int(actual_n)
            mobj.become(Text(f"Linear: {steps:,} steps", font_size=30, color=RED).to_edge(UR).shift(LEFT))
        
        def update_binary_steps(mobj):
            current_x_scaled = n_val.get_value()
            actual_n = current_x_scaled * 100000 # Map x_scaled (1-10) to actual N (100k-1M)
            
            if actual_n < 1: # Handle N < 1 gracefully
                steps = 0
            else:
                steps = max(1, int(np.log2(actual_n))) # Binary search steps are log2(N), minimum 1
            mobj.become(Text(f"Binary: {steps} steps", font_size=30, color=GREEN).next_to(linear_steps_text, DOWN, buff=0.3))
        
        linear_steps_text.add_updater(update_linear_steps)
        binary_steps_text.add_updater(update_binary_steps)
        
        self.play(FadeIn(linear_steps_text, run_time=0.5), FadeIn(binary_steps_text, run_time=0.5)) # Reduced FadeIn run_time
        
        # Animate N increasing by changing n_val.
        self.play(n_val.animate.set_value(10), run_time=10, rate_func=linear) # Animate for 10 seconds
        
        # Final text overlay: 'Efficiency'.
        efficiency_text = Text("O(log n) Efficiency", font_size=48, color=BLUE_C).to_edge(DR).shift(LEFT)
        
        self.play(FadeIn(efficiency_text, run_time=0.5)) # Reduced FadeIn run_time
        
        self.wait(5.0) # Adjusted wait time (0.5 initial + 3s graph + 0.5 labels + 0.5 text + 10s n_val animation + 0.5 efficiency + 5s wait = 20s total)
        self.play(
            FadeOut(frame4_title), 
            FadeOut(axes), FadeOut(x_label), FadeOut(y_label), 
            FadeOut(linear_graph), FadeOut(binary_graph), 
            FadeOut(linear_label), FadeOut(binary_label), 
            FadeOut(linear_steps_text), FadeOut(binary_steps_text), 
            FadeOut(efficiency_text)
        )