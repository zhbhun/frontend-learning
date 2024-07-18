import page from "page";
import * as rive from "@rive-app/canvas";
import route from "../route";
// import BASKETBALL from "./basketball.riv";
import EYES_TRACKING from "./eyes_tracking.riv";

page(
  "/eyes-tracking",
  route(() => {
    const disposes: (() => void)[] = [];
    const app = document.getElementById("app") as HTMLDivElement;
    app.innerHTML = `
    <canvas
      style="
        height: 500px;
        width: 500px;
      "
      id="rive-canvas"
    ></canvas>
  `;

    const riveCanvas = document.getElementById(
      "rive-canvas"
    ) as HTMLCanvasElement;

    const instance = new rive.Rive({
      // Load a local riv `clean_the_car.riv` or upload your own!
      src: EYES_TRACKING,
      // // Be sure to specify the correct state machine (or animation) name
      stateMachines: ["LookAround"],
      canvas: riveCanvas,
      autoplay: true,
      artboard: "New Artboard",
      onLoad: () => {
        instance.resizeDrawingSurfaceToCanvas();
        // Replace LookAround with the name of your state machine
        const inputs = instance.stateMachineInputs("LookAround");

        // Replace xAxis with the name of your x input
        const xInput = inputs.find((input) => {
          return input.name === "xAxis";
        });

        // Replace yAxis with the name of your y input
        const yInput = inputs.find((input) => {
          return input.name === "yAxis";
        });

        // This assumes your blend state for x and y axis goes from 0-100
        const handleMouseMove = (e: MouseEvent) => {
          if (xInput && yInput) {
            const maxWidth = window.innerWidth;
            const maxHeight = window.innerHeight;
            xInput.value = (e.x / maxWidth) * 100;
            yInput.value = 100 - (e.y / maxHeight) * 100;
          }
        };

        window.addEventListener("mousemove", handleMouseMove);

        disposes.push(() => {
          window.removeEventListener("mousemove", handleMouseMove);
        });
      },
    });

    return () => {
      instance.cleanup();
      disposes.forEach((dispose) => dispose());
    };
  })
);
