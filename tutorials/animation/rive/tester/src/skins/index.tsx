import page from "page";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  useRive,
  useStateMachineInput,
  Layout,
  Fit,
  Alignment,
} from "@rive-app/react-canvas";
import route from "../route";
import SKINS from "./skins.riv";

const stateMachineName = "Motion";
const stateMachineInputName = "Skin";
const skinMapping: any = {
  Skin_0: "Plain",
  Skin_1: "Summer",
  Skin_2: "Elvis",
  Skin_3: "Superhero",
  Skin_4: "Astronaut",
};

function App() {
  const [skinText, setSkinText] = useState(skinMapping["Skin_0"]);
  const { rive, RiveComponent } = useRive({
    src: SKINS,
    stateMachines: stateMachineName,
    // TODO: Set stateMachines
    autoplay: true,
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
    onStateChange: (event: any) => {
      const skinName = event.data.filter(
        (data: any) => data.indexOf("Skin_") > -1
      );
      const skinTextDisplay = skinMapping[skinName];
      if (skinTextDisplay) {
        setSkinText(skinTextDisplay);
      }
    },
  });

  // State machine - "Motion"
  // Trigger input - "Skin"
  // TODO: Get a reference to the state machine input
  const skinInput = useStateMachineInput(
    rive,
    stateMachineName,
    stateMachineInputName
  );
  const onClick = () => {
    if (skinInput) {
      skinInput.fire();
    }
  };
  return (
    <div className="App">
      <h1>Choose an Avatar</h1>
      <button className="skin-btn" onClick={onClick}>
        Swap Skin
      </button>
      <div className="container">
        <RiveComponent />
      </div>
      <div className="skin-container">Skin: {skinText}</div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body {
              background-color: #a87def;
            }

            .App {
              font-family: sans-serif;
              text-align: center;
              font-size: 24px;
              color: #efcb7d;
            }

            h1 {
              margin-bottom: 0;
            }

            .container {
              height: 40vh;
              width: 100%;
            }

            .skin-container {
              width: 100%;
              display: flex;
              justify-content: center;
              font-weight: 600;
              padding: 16px;
              box-sizing: border-box;
            }

            .skin-btn {
              text-decoration: none;
              border: none;
              background: #7d99ef;
              border-radius: 15%;
              height: 32px;
              margin-top: 20px;
              padding: 8px 14px;
              font-weight: 500;
              color: #ffffff;
              font-size: 16px;
              cursor: pointer;
              margin-bottom: 16px;
            }
          `,
        }}
      />
    </div>
  );
}

page(
  "/skins",
  route(() => {
    const rootElement = document.getElementById("app") as HTMLElement;
    const root = createRoot(rootElement);
    root.render(<App />);
    return () => {
      root.unmount();
    };
  })
);
