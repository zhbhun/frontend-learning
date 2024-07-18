import page from "page";
import * as rive from "@rive-app/canvas";
import route from "../route";
import VEHICLES from "./vehicles.riv";

page(
  "/vehicles",
  route(() => {
    const app = document.getElementById("app") as HTMLDivElement;
    app.innerHTML = `
    <canvas
      style="
        position: absolute;
        height: 100%;
        width: 100%;
        background-color: black;
      "
      id="rive-canvas"
    ></canvas>
  `;

    const layout = new rive.Layout({
      fit: rive.Fit.FitWidth, // Change to: rive.Fit.Contain, or Cover
      alignment: rive.Alignment.Center,
    });

    const riveCanvas = document.getElementById(
      "rive-canvas"
    ) as HTMLCanvasElement;

    const instance = new rive.Rive({
      // Load a local riv `clean_the_car.riv` or upload your own!
      src: VEHICLES,
      // // Be sure to specify the correct state machine (or animation) name
      stateMachines: "bumpy",
      canvas: riveCanvas,
      layout: layout, // This is optional. Provides additional layout control.
      autoplay: true,
      onLoad: () => {
        // Prevent a blurry canvas by using the device pixel ratio
        instance.resizeDrawingSurfaceToCanvas();
      },
    });

    const handleResize = () => {
      instance.resizeDrawingSurfaceToCanvas?.();
    };
    window.addEventListener("resize", handleResize, false);

    return () => {
      instance.cleanup();
      window.removeEventListener("resize", handleResize, false);
    };
  })
);
