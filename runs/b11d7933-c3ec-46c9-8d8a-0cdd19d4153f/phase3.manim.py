from manim import *
import random
import numpy as np

class StoryboardScene(Scene):
    def construct(self):
        # Set seed for deterministic randomness
        random.seed(42)

        # Frame 1: The Broken Straw Hook
        # sceneTitle: "The Broken Straw Hook"
        # animationIntent: The pencil should clearly look 'severed' or disjointed at the water's surface... Camera zooms in.
        # voiceoverScript: "Have you ever noticed how a pencil or a straw looks completely broken..."
        
        title_1 = Text("The Broken Straw Hook", font_size=32).to_edge(UP)
        text_1 = Text("Is the pencil broken?", font_size=40).to_edge(DOWN)
        
        # Visuals: Glass, Water, Pencil
        glass = Rectangle(width=3.0, height=5.0, color=WHITE, stroke_width=4)
        water = Rectangle(width=3.0, height=2.5, color=BLUE, fill_opacity=0.3, stroke_width=0).align_to(glass, DOWN)
        
        # Pencil parts (broken effect)
        # Top part in Air
        pencil_top = Line(
            start=glass.get_top() + LEFT * 0.5, 
            end=water.get_top() + RIGHT * 0.2, 
            color=YELLOW, 
            stroke_width=10
        )
        # Bottom part in Water (shifted)
        pencil_bot = Line(
            start=water.get_top() - RIGHT * 0.2, 
            end=water.get_bottom() + LEFT * 0.5, 
            color=YELLOW, 
            stroke_width=10
        )
        
        f1_group = VGroup(glass, water, pencil_top, pencil_bot).move_to(ORIGIN)
        
        self.play(FadeIn(title_1), FadeIn(f1_group), Write(text_1))
        
        # Zoom camera to the "break" point
        self.play(
            self.camera.frame.animate.scale(0.6).move_to(water.get_top()),
            run_time=2.0
        )
        
        self.wait(6)

        # Transition Frame 1 -> 2
        self.play(
            FadeOut(f1_group), FadeOut(text_1), FadeOut(title_1),
            self.camera.frame.animate.scale(1/0.6).move_to(ORIGIN),
            run_time=1.0
        )

        # Frame 2: Defining Refraction
        # sceneTitle: "Defining Refraction"
        # animationIntent: Laser beam draws straight, hits water, kinks downward. Text fades in.
        # voiceoverScript: "The pencil isn't actually bending; the light bouncing off it is..."

        title_2 = Text("Defining Refraction", font_size=32).to_edge(UP)
        text_2 = Text("REFRACTION", font_size=60, color=YELLOW).to_edge(DOWN)
        
        boundary = Line(LEFT*6, RIGHT*6, color=WHITE)
        normal = DashedLine(UP*3, DOWN*3, color=GRAY)
        
        # Rays
        start_pt = LEFT*4 + UP*3
        hit_pt = ORIGIN
        end_pt = RIGHT*2 + DOWN*3
        
        incident_ray = Line(start_pt, hit_pt, color=RED, stroke_width=4)
        refracted_ray = Line(hit_pt, end_pt, color=RED, stroke_width=4)
        orig_path = DashedLine(hit_pt, RIGHT*4 + DOWN*3, color=RED, stroke_opacity=0.5)
        
        self.play(FadeIn(title_2), Create(boundary), Create(normal))
        self.play(Create(incident_ray), run_time=1.0)
        self.play(Create(refracted_ray), Create(orig_path), run_time=1.0)
        self.play(FadeIn(text_2))
        
        self.wait(8)

        # Transition Frame 2 -> 3
        self.play(
            FadeOut(title_2), FadeOut(text_2), FadeOut(boundary), FadeOut(normal), 
            FadeOut(incident_ray), FadeOut(refracted_ray), FadeOut(orig_path)
        )

        # Frame 3: Mechanism: Speed of Light
        # sceneTitle: "Mechanism: Speed of Light"
        # animationIntent: Photon in air zips, photon in water slows.
        # voiceoverScript: "But why does it bend? To answer that..."

        title_3 = Text("Mechanism: Speed of Light", font_size=32).to_edge(UP)
        
        # Split screen
        divider = Line(UP*3.5, DOWN*3.5, color=WHITE)
        label_air = Text("Air: Fast", font_size=30).move_to(UP*3 + LEFT*3)
        label_water = Text("Water: Slow", font_size=30).move_to(UP*3 + RIGHT*3)
        
        # Particles
        particles_air = VGroup(*[
            Dot(point=[random.uniform(-6, -0.5), random.uniform(-3, 2), 0], radius=0.05, color=GRAY)
            for _ in range(15)
        ])
        particles_water = VGroup(*[
            Dot(point=[random.uniform(0.5, 6), random.uniform(-3, 2), 0], radius=0.08, color=BLUE)
            for _ in range(60)
        ])
        
        # Photons
        p_air = Dot(radius=0.15, color=YELLOW).move_to(LEFT*6)
        p_water = Dot(radius=0.15, color=YELLOW).move_to(RIGHT*0.5)
        
        self.play(
            FadeIn(title_3), Create(divider), 
            FadeIn(label_air), FadeIn(label_water),
            FadeIn(particles_air), FadeIn(particles_water)
        )
        self.play(FadeIn(p_air), FadeIn(p_water))
        
        # Animation: Air moves far, Water moves little
        self.play(
            p_air.animate.shift(RIGHT*5.5), # Moves all the way to divider
            p_water.animate.shift(RIGHT*2.0), # Moves slowly
            run_time=3.0,
            rate_func=linear
        )
        
        self.wait(10)
        
        # Transition Frame 3 -> 4
        self.play(
            FadeOut(title_3), FadeOut(divider), FadeOut(label_air), FadeOut(label_water),
            FadeOut(particles_air), FadeOut(particles_water), FadeOut(p_air), FadeOut(p_water)
        )

        # Frame 4: Analogy: The Car and The Grass
        # sceneTitle: "Analogy: The Car and The Grass"
        # animationIntent: Car rolls smoothly on pavement towards grass line.
        # voiceoverScript: "Imagine a car rolling from smooth pavement onto thick, muddy grass..."

        title_4 = Text("Analogy: The Car and The Grass", font_size=32).to_edge(UP)
        
        # Top-down view
        pavement = Rectangle(width=6, height=7, color=GRAY, fill_opacity=0.6, stroke_width=0).move_to(LEFT*3)
        grass = Rectangle(width=6, height=7, color=GREEN, fill_opacity=0.6, stroke_width=0).move_to(RIGHT*3)
        line_div = Line(UP*3.5, DOWN*3.5, color=WHITE).move_to(ORIGIN)
        
        label_pav = Text("Pavement", font_size=24).move_to(LEFT*3 + UP*2)
        label_grass = Text("Thick Grass", font_size=24).move_to(RIGHT*3 + UP*2)
        
        # Car object
        car_body = Rectangle(width=0.8, height=1.2, color=RED, fill_opacity=1)
        w1 = Rectangle(width=0.15, height=0.3, color=BLACK, fill_opacity=1).move_to(car_body.get_corner(UL)+RIGHT*0.1+DOWN*0.1)
        w2 = Rectangle(width=0.15, height=0.3, color=BLACK, fill_opacity=1).move_to(car_body.get_corner(UR)+LEFT*0.1+DOWN*0.1)
        w3 = Rectangle(width=0.15, height=0.3, color=BLACK, fill_opacity=1).move_to(car_body.get_corner(DL)+RIGHT*0.1+UP*0.1)
        w4 = Rectangle(width=0.15, height=0.3, color=BLACK, fill_opacity=1).move_to(car_body.get_corner(DR)+LEFT*0.1+UP*0.1)
        car = VGroup(car_body, w1, w2, w3, w4)
        
        # Initial position: Angled at 45 deg, moving North-East
        start_pos = LEFT*3 + DOWN*3
        car.move_to(start_pos).rotate(-45*DEGREES)
        
        self.play(FadeIn(title_4), FadeIn(pavement), FadeIn(grass), Create(line_div), FadeIn(label_pav), FadeIn(label_grass))
        self.play(FadeIn(car))
        
        # Move to boundary
        self.play(car.animate.move_to(LEFT*0.5 + DOWN*0.5), run_time=2, rate_func=linear)
        
        self.wait(5)
        
        # Frame 5: Analogy: The Pivot
        # sceneTitle: "Analogy: The Pivot"
        # animationIntent: Slow motion pivot. Right wheel slows, car rotates.
        # voiceoverScript: "The wheel that hits the grass first gets bogged down..."

        title_5 = Text("Analogy: The Pivot", font_size=32).to_edge(UP)
        self.play(ReplacementTransform(title_4, title_5))
        
        # Force arrow on the right wheel (which hits grass first)
        force_arrow = Arrow(start=RIGHT*0.5, end=LEFT*0.5, color=YELLOW, buff=0).next_to(car, RIGHT, buff=0.1)
        
        self.play(FadeIn(force_arrow))
        
        # Pivot animation: Rotate and move slightly into grass
        self.play(
            Rotate(car, angle=-20*DEGREES), # Turns right (clockwise) because right wheel slows? 
            # If moving North-East and hits vertical boundary:
            # Right wheel hits -> Drag -> Car turns clockwise (towards normal).
            # Wait, normal is horizontal. Car direction becomes closer to normal.
            # Current angle -45. New angle should be closer to 0 (Horizontal is normal). 
            # So actually it rotates Counter-Clockwise?
            # Let's visualize: 
            # Car / 
            #      | Grass
            # Right wheel hits. Right wheel drags. Left wheel keeps going.
            # Car pivots AROUND right wheel. Front swings INTO grass.
            # Angle becomes STEEPER (closer to normal). 
            # Normal is Horizontal (X-axis). Car is -45 deg.
            # It should rotate towards 0 deg. So +angle (Counter-Clockwise).
            Rotate(car, angle=20*DEGREES), 
            car.animate.shift(RIGHT*1 + UP*0.5),
            FadeOut(force_arrow),
            run_time=3
        )
        
        self.wait(8)
        
        # Transition Frame 5 -> 6
        self.play(FadeOut(Group(title_5, pavement, grass, line_div, label_pav, label_grass, car, force_arrow)))

        # Frame 6: Connecting Analogy to Reality
        # sceneTitle: "Connecting Analogy to Reality"
        # animationIntent: Wavefronts hitting water, slowing down, dragging wave around.
        # voiceoverScript: "Light behaves just like that car..."

        title_6 = Text("Connecting Analogy to Reality", font_size=32).to_edge(UP)
        text_6 = Text("Speed Change = Direction Change", font_size=30).to_edge(DOWN)
        
        boundary_6 = Line(LEFT*5, RIGHT*5, color=WHITE)
        
        # Beam representation
        beam_air = Polygon(
            LEFT*4 + UP*3 + LEFT*0.3, LEFT*4 + UP*3 + RIGHT*0.3,
            ORIGIN + RIGHT*0.3, ORIGIN + LEFT*0.3,
            color=YELLOW, fill_opacity=0.4, stroke_width=0
        )
        beam_water = Polygon(
            ORIGIN + LEFT*0.3, ORIGIN + RIGHT*0.3,
            RIGHT*2 + DOWN*3 + RIGHT*0.3, RIGHT*2 + DOWN*3 + LEFT*0.3,
            color=YELLOW, fill_opacity=0.4, stroke_width=0
        )
        
        # Wavefronts (Air)
        wf_air = VGroup()
        for i in range(5):
            p = interpolate(LEFT*4+UP*3, ORIGIN, i/5.0)
            l = Line(LEFT*0.4, RIGHT*0.4, color=BLACK, stroke_width=2).rotate(-37*DEGREES).move_to(p)
            wf_air.add(l)
            
        # Wavefronts (Water) - More tilted
        wf_water = VGroup()
        for i in range(5):
            p = interpolate(ORIGIN, RIGHT*2+DOWN*3, i/5.0)
            l = Line(LEFT*0.4, RIGHT*0.4, color=BLACK, stroke_width=2).rotate(-10*DEGREES).move_to(p)
            wf_water.add(l)

        self.play(FadeIn(title_6), Create(boundary_6))
        self.play(FadeIn(beam_air), Create(wf_air))
        self.play(FadeIn(beam_water), Create(wf_water), Write(text_6))
        
        self.wait(9)
        
        # Transition Frame 6 -> 7
        self.play(FadeOut(Group(title_6, text_6, boundary_6, beam_air, beam_water, wf_air, wf_water)))

        # Frame 7: Summary and Conclusion
        # sceneTitle: "Summary and Conclusion"
        # animationIntent: Overlay diagram on glass.
        # voiceoverScript: "So the next time you see a broken straw..."

        title_7 = Text("Summary and Conclusion", font_size=32).to_edge(UP)
        text_final = Text("Refraction", font_size=48).to_edge(DOWN)
        
        # Recreate Frame 1 visuals
        f7_group = f1_group.copy().move_to(ORIGIN)
        
        # Diagram overlay
        diagram_overlay = VGroup(
            DashedLine(start=water.get_top()+RIGHT*0.2, end=glass.get_top()+RIGHT*2, color=RED), # Apparent path
            DashedLine(start=water.get_top()+RIGHT*0.2, end=water.get_bottom()+LEFT*0.5, color=RED) # Real path
        )
        
        self.play(FadeIn(title_7), FadeIn(f7_group))
        self.play(Create(diagram_overlay), Write(text_final))
        
        self.wait(5)