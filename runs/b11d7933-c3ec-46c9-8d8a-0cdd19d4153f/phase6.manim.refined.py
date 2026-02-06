from manim import *

class StoryboardScene(Scene):
    def construct(self):
        # Frame 1: The Broken Straw Hook
        # Animation Intent: The pencil should clearly look 'severed' or disjointed at the water's surface (the interface). The camera slowly zooms in on the break point.
        # Voiceover: Have you ever noticed how a pencil or a straw looks completely broken when you put it in a glass of water? It looks like magic, but your eyes are playing tricks on you.
        title_1 = Text("The Broken Straw Hook", font_size=36).to_edge(UP)
        
        ost_1 = VGroup(
            Text("Is the pencil broken?", font_size=48, color=YELLOW)
        ).arrange(DOWN, center=True).shift(UP)
        
        glass = Rectangle(width=3.0, height=4.0, color=BLUE_A, fill_opacity=0.1).shift(DOWN)
        water = Rectangle(width=3.0, height=2.0, color=BLUE, fill_opacity=0.3).move_to(glass.get_bottom(), aligned_edge=DOWN)
        pencil_top = Line(start=glass.get_top() + LEFT*0.5, end=water.get_top(), color=YELLOW, stroke_width=8)
        pencil_bottom = Line(start=water.get_top() + RIGHT*0.2, end=water.get_bottom() + RIGHT*0.7, color=YELLOW, stroke_width=8)
        
        visuals_1 = VGroup(glass, water, pencil_top, pencil_bottom)
        
        self.fade_in_frame(title_1, ost_1, visuals_1)
        self.wait(6)
        self.fade_out_frame(title_1, ost_1, visuals_1)

        # Frame 2: Defining Refraction
        # Animation Intent: The laser beam draws straight, hits the water line, and abruptly kinks downward. The text 'REFRACTION' fades in large.
        # Voiceover: The pencil isn't actually bending; the light bouncing off it is. In physics, we define refraction as the bending of light.
        title_2 = Text("Defining Refraction", font_size=36).to_edge(UP)
        
        ost_2 = VGroup(
            Text("REFRACTION", font_size=48, color=YELLOW)
        ).arrange(DOWN, center=True).shift(UP)
        
        visuals_2 = VGroup(
            Text("Visual Elements:", font_size=24, color=BLUE),
            Text("- Schematic 2D side view of the air/water interface.", font_size=20),
            Text("- A single laser beam traveling from air into water.", font_size=20),
            Text("- Dotted line showing the 'straight' path vs the actual 'bent' path.", font_size=20)
        ).arrange(DOWN, aligned_edge=LEFT).to_edge(DOWN).to_edge(LEFT)
        
        self.fade_in_frame(title_2, ost_2, visuals_2)
        self.wait(8)
        self.fade_out_frame(title_2, ost_2, visuals_2)

        # Frame 3: Mechanism: Speed of Light
        # Animation Intent: The photon in the air zips across quickly. The photon in the water moves significantly slower, struggling through the density.
        # Voiceover: But why does it bend? To answer that, you need to understand that light travels at different speeds in different materials. It zips through air, but drags when moving through denser water.
        title_3 = Text("Mechanism: Speed of Light", font_size=36).to_edge(UP)
        
        ost_3 = VGroup(
            Text("Air: Fast", font_size=48, color=YELLOW),
            Text("Water: Slow", font_size=48, color=YELLOW)
        ).arrange(RIGHT, buff=2.0).shift(UP)
        
        visuals_3 = VGroup(
            Text("Visual Elements:", font_size=24, color=BLUE),
            Text("- Split screen comparison.", font_size=20),
            Text("- Left side: 'Air' (sparse particles). Right side: 'Water' (dense particles).", font_size=20),
            Text("- Two photons (glowing particles) racing across the screen.", font_size=20)
        ).arrange(DOWN, aligned_edge=LEFT).to_edge(DOWN).to_edge(LEFT)
        
        self.fade_in_frame(title_3, ost_3, visuals_3)
        self.wait(10)
        self.fade_out_frame(title_3, ost_3, visuals_3)

        # Frame 4: Analogy: The Car and The Grass
        # Animation Intent: The car rolls smoothly on the pavement. The camera tracks its movement towards the grass line.
        # Voiceover: Imagine a car rolling from smooth pavement onto thick, muddy grass at an angle.
        title_4 = Text("Analogy: The Car and The Grass", font_size=36).to_edge(UP)
        
        ost_4 = VGroup(
            Text("Pavement", font_size=48, color=YELLOW),
            Text("Thick Grass", font_size=48, color=YELLOW)
        ).arrange(DOWN, center=True).shift(UP)
        
        visuals_4 = VGroup(
            Text("Visual Elements:", font_size=24, color=BLUE),
            Text("- Top-down view of a toy car or shopping cart.", font_size=20),
            Text("- An angled boundary line separating smooth gray pavement from thick green grass.", font_size=20),
            Text("- Car approaching the grass at a 45-degree angle.", font_size=20)
        ).arrange(DOWN, aligned_edge=LEFT).to_edge(DOWN).to_edge(LEFT)
        
        self.fade_in_frame(title_4, ost_4, visuals_4)
        self.wait(5)
        self.fade_out_frame(title_4, ost_4, visuals_4)

        # Frame 5: Analogy: The Pivot
        # Animation Intent: Slow motion: The wheel hitting the grass slows down immediately. The other wheel keeps its speed. The car pivots/rotates into the grass as a result.
        # Voiceover: The wheel that hits the grass first gets bogged down and slows instantly. The other wheel is still moving fast on the pavement, causing the car to pivot.
        title_5 = Text("Analogy: The Pivot", font_size=36).to_edge(UP)
        
        ost_5 = VGroup(
            Text("Drag Force", font_size=48, color=RED)
        ).shift(UP)
        
        visuals_5 = VGroup(
            Text("Visual Elements:", font_size=24, color=BLUE),
            Text("- Top-down view continues.", font_size=20),
            Text("- Front-right wheel enters grass; Front-left wheel stays on pavement.", font_size=20),
            Text("- Force arrows indicating drag on the right wheel.", font_size=20)
        ).arrange(DOWN, aligned_edge=LEFT).to_edge(DOWN).to_edge(LEFT)
        
        self.fade_in_frame(title_5, ost_5, visuals_5)
        self.wait(8)
        self.fade_out_frame(title_5, ost_5, visuals_5)

        # Frame 6: Connecting Analogy to Reality
        # Animation Intent: Show the wavefronts hitting the water at an angle. The part that hits first slows down, dragging the rest of the wave around, exactly like the car.
        # Voiceover: Light behaves just like that car. This mechanical view allows us to explain how a change in speed causes a change in direction.
        title_6 = Text("Connecting Analogy to Reality", font_size=36).to_edge(UP)
        
        ost_6 = VGroup(
            Text("Speed Change = Direction Change", font_size=48, color=YELLOW)
        ).arrange(DOWN, center=True).shift(UP)
        
        visuals_6 = VGroup(
            Text("Visual Elements:", font_size=24, color=BLUE),
            Text("- Cross-fade from the car back to a thick beam of light entering water.", font_size=20),
            Text("- Draw lines across the light beam representing 'wavefronts' (like the car's axle).", font_size=20)
        ).arrange(DOWN, aligned_edge=LEFT).to_edge(DOWN).to_edge(LEFT)
        
        self.fade_in_frame(title_6, ost_6, visuals_6)
        self.wait(9)
        self.fade_out_frame(title_6, ost_6, visuals_6)

        # Frame 7: Summary and Conclusion
        # Animation Intent: The overlay fades out, leaving just the pencil. The 'broken' look now feels explained rather than magical.
        # Voiceover: So the next time you see a broken straw, remember: nothing is broken. The light is just changing speeds.
        # Define refraction as the bending of light.
        # Understand that light travels at different speeds in different materials.
        # Explain how a change in speed causes a change in direction.
        title_7 = Text("Summary and Conclusion", font_size=36).to_edge(UP)
        
        ost_7 = VGroup(
            Text("Refraction", font_size=48, color=YELLOW)
        ).arrange(DOWN, center=True).shift(UP)
        
        visuals_7 = VGroup(
            Text("Visual Elements:", font_size=24, color=BLUE),
            Text("- Return to the initial shot of the glass and pencil.", font_size=20),
            Text("- Overlay the light path diagram over the real footage.", font_size=20)
        ).arrange(DOWN, aligned_edge=LEFT).to_edge(DOWN).to_edge(LEFT)
        
        self.fade_in_frame(title_7, ost_7, visuals_7)
        self.wait(5)
        self.fade_out_frame(title_7, ost_7, visuals_7)

    def fade_in_frame(self, title, ost, visuals):
        self.add(title)
        self.add(ost)
        self.add(visuals)
        self.play(
            FadeIn(title),
            FadeIn(ost),
            FadeIn(visuals),
            run_time=0.5
        )

    def fade_out_frame(self, title, ost, visuals):
        self.play(
            FadeOut(title),
            FadeOut(ost),
            FadeOut(visuals),
            run_time=0.5
        )
        self.remove(title, ost, visuals)