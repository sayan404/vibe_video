from manim import *

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
        search_arrow = Arrow(start=boxes[0].get_left() + LEFT*0.5, end=boxes[0].get_left(), color=YELLOW_A)
        search_label = Text("Linear Search", font_size=25).next_to(search_arrow, UP)
        search_vgroup = VGroup(search_arrow, search_label)
        
        # A clock icon spins rapidly to indicate wasted time.
        # (Deterministic, no external SVG dependency.)
        clock_face = Circle(radius=0.4, color=WHITE).to_edge(RIGHT).shift(UP * 0.5)
        clock_hand = Line(clock_face.get_center(), clock_face.get_center() + UP * 0.22, color=YELLOW)
        clock = VGroup(clock_face, clock_hand)
        
        self.play(FadeIn(frame1_title), FadeIn(boxes), FadeIn(search_vgroup))
        
        # Move arrow across boxes
        self.play(
            search_arrow.animate.shift(RIGHT * (boxes[0].width + 0.1) * (len(boxes) - 1)),
            Rotate(clock_hand, angle=2*PI*5, run_time=10, rate_func=linear) # Spin clock hand
        )
        
        # On-Screen Text
        frame1_text1 = Text("Linear Search: O(n)", font_size=36, color=RED).to_edge(DR).shift(LEFT)
        frame1_text2 = Text("Slow on large datasets", font_size=30).next_to(frame1_text1, DOWN, buff=0.3)
        
        self.play(FadeIn(frame1_text1), FadeIn(frame1_text2))
        
        self.wait(10)
        self.play(FadeOut(frame1_title), FadeOut(boxes), FadeOut(search_vgroup), FadeOut(clock), FadeOut(frame1_text1), FadeOut(frame1_text2))

        # Frame 2: The Prerequisite: Order
        # animationIntent: Visually enforce structure. The satisfying 'snap' to order emphasizes that the algorithm fails without this state.
        # voiceoverScript: Before we can optimize, we must recognize the critical requirement of sorted input data. Without a sorted list, the logic we are about to use simply falls apart.
        frame2_title = Text("The Prerequisite: Order").to_edge(UP)
        
        # Visual Elements
        # The jumbled array from Frame 1 vividly snaps into perfect ascending order.
        sorted_array_values = sorted(array_values)
        sorted_boxes = VGroup(*[
            Rectangle(width=0.8, height=0.8, color=BLUE_B).add(Text(str(val), font_size=30)).set_x(i * 0.9 - (len(sorted_array_values)-1)*0.9/2)
            for i, val in enumerate(sorted_array_values)
        ]).arrange(RIGHT, buff=0.1).shift(DOWN*0.5)
        
        # A red warning icon pulses briefly if the array tries to shuffle back, then locks into sorted state.
        warning_icon = Triangle(color=RED, fill_opacity=1).scale(0.3).next_to(sorted_boxes, UP)
        warning_label = Text("UNSORTED!", font_size=20, color=RED).next_to(warning_icon, UP)
        warning_group = VGroup(warning_icon, warning_label)
        
        self.play(FadeIn(frame2_title), FadeIn(sorted_boxes))
        
        # Simulate trying to shuffle back
        self.play(
            FadeIn(warning_group),
            sorted_boxes.animate.shift(LEFT*0.5).set_color(RED), # briefly indicate shuffle attempt
            run_time=1
        )
        self.play(
            FadeOut(warning_group),
            sorted_boxes.animate.shift(RIGHT*0.5).set_color(BLUE_B), # snap back to sorted
            run_time=1
        )
        
        # Text highlights the word 'SORTED'.
        sorted_text_highlight = Text("SORTED", font_size=50, color=GREEN_B).next_to(sorted_boxes, DOWN, buff=1)
        
        # On-Screen Text
        frame2_text = Text("CRITICAL: Sorted Input Only", font_size=36, color=YELLOW_E).to_edge(DR).shift(LEFT)
        
        self.play(Write(sorted_text_highlight), FadeIn(frame2_text))
        
        self.wait(12)
        self.play(FadeOut(frame2_title), FadeOut(sorted_boxes), FadeOut(sorted_text_highlight), FadeOut(frame2_text))

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
        
        self.play(FadeIn(frame3_title), FadeIn(boxes_3), FadeIn(target_text))
        
        # A bracket highlights the whole array. An arrow points to the middle element (index 7).
        low_idx, high_idx = 0, len(array_values_3) - 1
        
        def create_bracket(boxes_group, low, high):
            first_box = boxes_group[low]
            last_box = boxes_group[high]
            bracket = Brace(VGroup(first_box, last_box), direction=UP, buff=0.1)
            return bracket

        current_bracket = create_bracket(boxes_3, low_idx, high_idx)
        self.play(GrowFromCenter(current_bracket))

        # On-Screen Text
        step1_text = Text("Step 1: Compare Middle", font_size=30, color=WHITE).to_edge(DR).shift(LEFT)
        step2_text = Text("Step 2: Discard Half", font_size=30, color=WHITE).next_to(step1_text, DOWN, buff=0.3)
        self.play(FadeIn(step1_text))
        
        # Binary search simulation
        while low_idx <= high_idx:
            mid_idx = (low_idx + high_idx) // 2
            mid_box = boxes_3[mid_idx]
            
            middle_arrow = Arrow(start=mid_box.get_center() + UP*0.5, end=mid_box.get_center(), color=RED)
            middle_label = Text("Middle", font_size=25, color=RED).next_to(middle_arrow, UP)
            
            self.play(FadeIn(middle_arrow), FadeIn(middle_label))
            
            if array_values_3[mid_idx] == target_value:
                self.play(mid_box.animate.set_color(GREEN_B).scale(1.2), FadeOut(middle_arrow, middle_label))
                break # Found
            elif array_values_3[mid_idx] < target_value:
                # Target > middle, discard left half
                self.play(FadeOut(middle_arrow, middle_label))
                self.play(FadeIn(step2_text))
                for i in range(low_idx, mid_idx + 1): # mid_idx included in discarded part
                    self.play(boxes_3[i].animate.set_color(GRAY).set_opacity(0.3), run_time=0.2)
                low_idx = mid_idx + 1
                new_bracket = create_bracket(boxes_3, low_idx, high_idx)
                self.play(Transform(current_bracket, new_bracket), FadeOut(step2_text))
            else:
                # Target < middle, discard right half
                self.play(FadeOut(middle_arrow, middle_label))
                self.play(FadeIn(step2_text))
                for i in range(mid_idx, high_idx + 1): # mid_idx included in discarded part
                    self.play(boxes_3[i].animate.set_color(GRAY).set_opacity(0.3), run_time=0.2)
                high_idx = mid_idx - 1
                new_bracket = create_bracket(boxes_3, low_idx, high_idx)
                self.play(Transform(current_bracket, new_bracket), FadeOut(step2_text))
            # (No per-iteration waits; total frame timing controlled by the final self.wait below.)
        
        self.wait(18)
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
        
        self.play(FadeIn(frame4_title), Create(axes), Write(x_label), Write(y_label))
        
        self.play(
            Create(linear_graph, run_time=3),
            Create(binary_graph, run_time=3)
        )
        self.play(FadeIn(linear_label), FadeIn(binary_label))
        
        # Animation shows N increasing to 1,000,000.
        # For Manim, we can animate a point moving along the graph or just show values changing.
        # Let's show values changing and highlight points on the graph.
        
        n_val = ValueTracker(1)
        linear_steps_text = Text("Linear: 0 steps", font_size=30, color=RED).to_edge(UR).shift(LEFT)
        binary_steps_text = Text("Binary: 0 steps", font_size=30, color=GREEN).next_to(linear_steps_text, DOWN, buff=0.3)
        
        def update_linear_steps(mobj):
            n = n_val.get_value()
            mobj.become(Text(f"Linear: {int(func_linear(n)/100000 * 100000):,} steps", font_size=30, color=RED).to_edge(UR).shift(LEFT))
        
        def update_binary_steps(mobj):
            n = n_val.get_value()
            mobj.become(Text(f"Binary: {int(func_binary(n)/100000 * 20)} steps", font_size=30, color=GREEN).next_to(linear_steps_text, DOWN, buff=0.3))
        
        linear_steps_text.add_updater(update_linear_steps)
        binary_steps_text.add_updater(update_binary_steps)
        
        self.play(FadeIn(linear_steps_text), FadeIn(binary_steps_text))
        
        # Animate N increasing by changing n_val.
        # We'll use a scaled N on the graph for visual clarity (0 to 10 for x_range),
        # but the text will show the actual numbers for 1,000,000.
        # Max N for graph is x_range=10, so N=1M corresponds to x=10 (func_linear(10) = 1M)
        self.play(n_val.animate.set_value(10), run_time=10, rate_func=linear) # Animate for 10 seconds
        
        # Final text overlay: 'Efficiency'.
        efficiency_text = Text("O(log n) Efficiency", font_size=48, color=BLUE_C).to_edge(DR).shift(LEFT)
        
        self.play(FadeIn(efficiency_text))
        
        self.wait(20)
        self.play(
            FadeOut(frame4_title), 
            FadeOut(axes), FadeOut(x_label), FadeOut(y_label), 
            FadeOut(linear_graph), FadeOut(binary_graph), 
            FadeOut(linear_label), FadeOut(binary_label), 
            FadeOut(linear_steps_text), FadeOut(binary_steps_text), 
            FadeOut(efficiency_text)
        )