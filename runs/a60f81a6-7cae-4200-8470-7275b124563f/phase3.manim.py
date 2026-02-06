from manim import *

class StoryboardScene(Scene):
    def construct(self):
        # Frame 1: The Bookshelf Intuition
        # Animation Intent: Lefty and Righty pick up books simultaneously, communicate, and swap them across the shelf without moving their feet much. The shelf becomes organized quickly.
        # Voiceover: "Imagine organizing a messy bookshelf with a friend. Instead of one person running back and forth, one stands at the left end, and the other at the right. You work simultaneously to swap books into place."
        
        frame1_title = Text("The Bookshelf Intuition", font_size=48).to_edge(UP)
        
        frame1_text_content = [
            "The Two Pointers Intuition"
        ]
        frame1_text_group = VGroup(*[Text(t, font_size=36, color=YELLOW) for t in frame1_text_content]).arrange(DOWN, aligned_edge=LEFT)
        
        # Visuals: Shelf, books, stick figures
        shelf = Line(start=LEFT*3, end=RIGHT*3, color=WHITE, stroke_width=5)
        books = VGroup(*[Rectangle(height=1 + (i%3)*0.2, width=0.4, fill_opacity=0.8, color=c) 
                         for i, c in enumerate([RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE])])
        books.arrange(RIGHT, buff=0.1).move_to(shelf.get_center() + UP*0.7)
        
        def create_figure(color):
            head = Circle(radius=0.3, color=color)
            body = Line(head.get_bottom(), head.get_bottom() + DOWN*1, color=color)
            arms = Line(body.get_top() + DOWN*0.3 + LEFT*0.4, body.get_top() + DOWN*0.3 + RIGHT*0.4, color=color)
            legs = VGroup(Line(body.get_bottom(), body.get_bottom() + DOWN*0.5 + LEFT*0.3, color=color),
                          Line(body.get_bottom(), body.get_bottom() + DOWN*0.5 + RIGHT*0.3, color=color))
            return VGroup(head, body, arms, legs)

        lefty = create_figure(BLUE).move_to(shelf.get_left() + LEFT*1)
        righty = create_figure(GREEN).move_to(shelf.get_right() + RIGHT*1)
        
        frame1_visuals_group = VGroup(shelf, books, lefty, righty)
        
        frame1_content = VGroup(frame1_text_group, frame1_visuals_group).arrange(DOWN, buff=1.0)
        
        self.play(FadeIn(frame1_title), FadeIn(frame1_content), run_time=0.5)
        
        # Animation: Swap books
        book_left = books[0]
        book_right = books[-1]
        self.play(
            book_left.animate.move_to(book_right.get_center()),
            book_right.animate.move_to(book_left.get_center()),
            run_time=2
        )
        
        self.wait(8)
        self.play(FadeOut(frame1_title), FadeOut(frame1_content), run_time=0.5)

        # Frame 2: The Brute Force Bottleneck
        # Animation Intent: Show the 'j' arrow iterating exhaustively and wastefully. The clock spins faster as the data set grows larger, indicating a bottleneck.
        # Voiceover: "In programming, the naive approach often involves nested loops—checking every pair against every other pair. This brute force method creates quadratic time complexity, which becomes painfully slow as data grows."
        
        frame2_title = Text("The Brute Force Bottleneck", font_size=48).to_edge(UP)
        
        frame2_text_content = [
            "Nested Loops = O(N²)",
            "Inefficient"
        ]
        frame2_text_group = VGroup(*[Text(t, font_size=36, color=YELLOW) for t in frame2_text_content]).arrange(DOWN, aligned_edge=LEFT)
        
        # Visuals: Number line, arrows, clock
        line = NumberLine(x_range=[0, 10, 1], length=6, color=WHITE, include_numbers=True)
        arrow_i = Arrow(start=UP, end=DOWN, color=BLUE).next_to(line.n2p(0), UP)
        label_i = Text("i", font_size=24, color=BLUE).next_to(arrow_i, UP)
        group_i = VGroup(arrow_i, label_i)
        
        arrow_j = Arrow(start=UP, end=DOWN, color=RED).next_to(line.n2p(1), UP)
        label_j = Text("j", font_size=24, color=RED).next_to(arrow_j, UP)
        group_j = VGroup(arrow_j, label_j)
        
        clock_circle = Circle(radius=0.5, color=WHITE)
        clock_hand = Line(clock_circle.get_center(), clock_circle.get_top(), color=RED)
        clock = VGroup(clock_circle, clock_hand).next_to(line, RIGHT, buff=1)
        
        frame2_visuals_group = VGroup(line, group_i, group_j, clock)
        
        frame2_content = VGroup(frame2_text_group, frame2_visuals_group).arrange(DOWN, buff=1.0)
        
        self.play(FadeIn(frame2_title), FadeIn(frame2_content), run_time=0.5)
        
        # Animation: Nested loop simulation
        for i_pos in range(0, 2):
            self.play(group_i.animate.next_to(line.n2p(i_pos), UP), run_time=0.5)
            for j_pos in range(i_pos + 1, 5):
                self.play(
                    group_j.animate.next_to(line.n2p(j_pos), UP), 
                    Rotate(clock_hand, angle=-PI, about_point=clock_circle.get_center()),
                    run_time=0.2
                )
            group_j.move_to(group_i.get_center())

        self.wait(10)
        self.play(FadeOut(frame2_title), FadeOut(frame2_content), run_time=0.5)

        # Frame 3: Introducing Two Pointers
        # Animation Intent: The two arrows glide smoothly along a data bar. The red O(N^2) curve flattens into a linear green O(N) line.
        # Voiceover: "To fix this, we use two distinct reference points simultaneously. This technique allows you to identify problems suitable for two pointer optimization over nested loops, turning sluggish code into efficient solutions."
        
        frame3_title = Text("Introducing Two Pointers", font_size=48).to_edge(UP)
        
        frame3_text_content = [
            "Optimization Strategy",
            "O(N) Potential"
        ]
        frame3_text_group = VGroup(*[Text(t, font_size=36, color=YELLOW) for t in frame3_text_content]).arrange(DOWN, aligned_edge=LEFT)
        
        # Visuals: Smooth linear scan
        line_opt = NumberLine(x_range=[0, 10, 1], length=6, color=WHITE)
        ptr_left = Triangle(color=BLUE, fill_opacity=1).scale(0.2).next_to(line_opt.n2p(0), DOWN)
        ptr_right = Triangle(color=GREEN, fill_opacity=1).scale(0.2).next_to(line_opt.n2p(1), DOWN)
        
        frame3_visuals_group = VGroup(line_opt, ptr_left, ptr_right)
        
        frame3_content = VGroup(frame3_text_group, frame3_visuals_group).arrange(DOWN, buff=1.0)
        
        self.play(FadeIn(frame3_title), FadeIn(frame3_content), run_time=0.5)
        
        # Animation: Independent smooth glide
        self.play(
            ptr_left.animate.next_to(line_opt.n2p(4), DOWN),
            ptr_right.animate.next_to(line_opt.n2p(6), DOWN),
            run_time=4,
            rate_func=linear
        )
        
        self.wait(10)
        self.play(FadeOut(frame3_title), FadeOut(frame3_content), run_time=0.5)

        # Frame 4: Pattern 1: Opposite-Directional
        # Animation Intent: Pointers step inward towards the center. When they find the pair, they pulse/highlight. This mimics the bookshelf example.
        # Voiceover: "The first common pattern is 'Opposite-Directional'. One pointer starts at the beginning, the other at the end. They move toward each other to meet specific conditions, like finding a target sum in a sorted array."
        
        frame4_title = Text("Pattern 1: Opposite-Directional", font_size=48).to_edge(UP)
        
        frame4_text_content = [
            "Opposite-Directional",
            "Collision Course"
        ]
        frame4_text_group = VGroup(*[Text(t, font_size=36, color=YELLOW) for t in frame4_text_content]).arrange(DOWN, aligned_edge=LEFT)
        
        # Visuals: Array and pointers at ends
        nums = [1, 3, 5, 8, 11, 15]
        squares = VGroup(*[Square(side_length=0.8, color=WHITE).add(Text(str(n), font_size=24)) for n in nums])
        squares.arrange(RIGHT, buff=0)
        
        p_start = Arrow(start=UP, end=DOWN, color=BLUE).next_to(squares[0], UP)
        p_end = Arrow(start=UP, end=DOWN, color=GREEN).next_to(squares[-1], UP)
        
        frame4_visuals_group = VGroup(squares, p_start, p_end)
        
        frame4_content = VGroup(frame4_text_group, frame4_visuals_group).arrange(DOWN, buff=1.0)
        
        self.play(FadeIn(frame4_title), FadeIn(frame4_content), run_time=0.5)
        
        # Animation: Converge inward
        self.play(p_start.animate.next_to(squares[1], UP), run_time=1)
        self.play(p_end.animate.next_to(squares[-2], UP), run_time=1)
        self.play(p_start.animate.next_to(squares[2], UP), run_time=1)
        
        self.wait(12)
        self.play(FadeOut(frame4_title), FadeOut(frame4_content), run_time=0.5)

        # Frame 5: Pattern 2: Equi-Directional (Fast & Slow)
        # Animation Intent: The Hare moves two steps for every one step the Tortoise takes. The Hare eventually laps the Tortoise, catching it from behind.
        # Voiceover: "Alternatively, both pointers can start at the beginning, with one moving faster than the other. To master this technique, you must distinguish between opposite-directional (collision) and equi-directional (fast/slow) pointer patterns."
        
        frame5_title = Text("Pattern 2: Equi-Directional (Fast & Slow)", font_size=48).to_edge(UP)
        
        frame5_text_content = [
            "Equi-Directional",
            "Fast & Slow Pointers"
        ]
        frame5_text_group = VGroup(*[Text(t, font_size=36, color=YELLOW) for t in frame5_text_content]).arrange(DOWN, aligned_edge=LEFT)
        
        # Visuals: Circular track, tortoise and hare
        track = Circle(radius=2, color=WHITE)
        dot_slow = Dot(color=BLUE, radius=0.15).move_to(track.point_at_angle(PI/2))
        dot_fast = Dot(color=RED, radius=0.15).move_to(track.point_at_angle(PI/2))
        
        frame5_visuals_group = VGroup(track, dot_slow, dot_fast)
        
        frame5_content = VGroup(frame5_text_group, frame5_visuals_group).arrange(DOWN, buff=1.0)
        
        self.play(FadeIn(frame5_title), FadeIn(frame5_content), run_time=0.5)
        
        # Animation: Rotation (Fast 2x speed of Slow)
        self.play(
            Rotate(dot_slow, angle=-2*PI, about_point=track.get_center(), rate_func=linear),
            Rotate(dot_fast, angle=-4*PI, about_point=track.get_center(), rate_func=linear),
            run_time=6
        )
        
        self.wait(12)
        self.play(FadeOut(frame5_title), FadeOut(frame5_content), run_time=0.5)

        # Frame 6: Complexity & In-Place Benefits
        # Animation Intent: Highlight the empty space on the right side. Show elements simply trading places without needing a second container.
        # Voiceover: "A major advantage is memory usage. By using pointers to swap data directly in the existing structure, we can analyze the time and space complexity benefits of in-place pointer manipulation, often keeping space complexity at a constant O(1)."
        
        frame6_title = Text("Complexity & In-Place Benefits", font_size=48).to_edge(UP)
        
        frame6_text_content = [
            "O(1) Space Complexity",
            "In-Place Swapping"
        ]
        frame6_text_group = VGroup(*[Text(t, font_size=36, color=YELLOW) for t in frame6_text_content]).arrange(DOWN, aligned_edge=LEFT)
        
        # Visuals: Split screen (Copy vs In-Place)
        box_orig = Rectangle(width=2, height=0.5, color=WHITE)
        box_copy = Rectangle(width=2, height=0.5, color=RED).next_to(box_orig, DOWN)
        label_bad = Text("O(N) Space", font_size=20, color=RED).next_to(box_copy, DOWN)
        group_bad = VGroup(box_orig, box_copy, label_bad)
        
        box_inplace = Rectangle(width=2, height=0.5, color=GREEN)
        label_good = Text("O(1) Space", font_size=20, color=GREEN).next_to(box_inplace, DOWN)
        group_good = VGroup(box_inplace, label_good)
        
        frame6_visuals_group = VGroup(group_bad, group_good).arrange(RIGHT, buff=2)
        
        frame6_content = VGroup(frame6_text_group, frame6_visuals_group).arrange(DOWN, buff=1.0)
        
        self.play(FadeIn(frame6_title), FadeIn(frame6_content), run_time=0.5)
        
        # Animation: Fill memory vs activate inplace
        self.play(
            box_copy.animate.set_fill(RED, opacity=0.5),
            box_inplace.animate.set_fill(GREEN, opacity=0.5),
            run_time=2
        )
        
        self.wait(12)
        self.play(FadeOut(frame6_title), FadeOut(frame6_content), run_time=0.5)

        # Frame 7: Summary & Misconception Check
        # Animation Intent: The 'Sorted Only?' label gets a checkmark for Binary Search tasks but a cross for Partitioning/Cycle tasks to clear the misconception.
        # Voiceover: "Remember: while sorting helps some patterns, logic like cycle detection works on unsorted data too. Two pointers offer a powerful way to reduce runtime from quadratic to linear while saving memory. Identify problems suitable for two pointer optimization over nested loops. Distinguish between opposite-directional (collision) and equi-directional (fast/slow) pointer patterns. Analyze the time and space complexity benefits of in-place pointer manipulation"
        
        frame7_title = Text("Summary & Misconception Check", font_size=48).to_edge(UP)
        
        frame7_text_content = [
            "Review",
            "Linear Time",
            "Constant Space"
        ]
        frame7_text_group = VGroup(*[Text(t, font_size=36, color=YELLOW) for t in frame7_text_content]).arrange(DOWN, aligned_edge=LEFT)
        
        # Visuals: Icons
        icon_time = VGroup(Axes(x_range=[0,5], y_range=[0,5], x_length=1, y_length=1), Line(start=LEFT+DOWN, end=RIGHT+UP, color=GREEN).scale(0.5))
        icon_space = Circle(radius=0.5, color=BLUE).add(Text("1", font_size=36))
        
        sorted_text = Text("Sorted?", font_size=24, color=RED)
        icon_misc = VGroup(sorted_text, Cross(scale_factor=0.2).next_to(sorted_text, RIGHT))
        
        frame7_visuals_group = VGroup(icon_time, icon_space, icon_misc).arrange(RIGHT, buff=1)
        
        frame7_content = VGroup(frame7_text_group, frame7_visuals_group).arrange(DOWN, buff=1.0)
        
        self.play(FadeIn(frame7_title), FadeIn(frame7_content), run_time=0.5)
        self.wait(10)
        self.play(FadeOut(frame7_title), FadeOut(frame7_content), run_time=0.5)