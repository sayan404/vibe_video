from manim import *

print("Polyline in manim:", "Polyline" in globals())
print("Line in manim:", "Line" in globals())

# List some common mobjects
import manim.mobject.geometry as geom
print("Geometry members:", [x for x in dir(geom) if "Line" in x])

class Test(Scene):
    def construct(self):
        try:
            p = Polyline([0,0,0], [1,1,0], [2,0,0])
            print("Polyline usage successful")
        except NameError as e:
            print(f"Polyline usage failed: {e}")

if __name__ == "__main__":
    t = Test()
    try:
        t.construct()
    except:
        pass
