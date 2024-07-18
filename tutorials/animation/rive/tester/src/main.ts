import page from "page";
import "./style.css";
import route from "./route";
import "./clean-the-car";
import "./eyes-tracking";
import "./skins";
import "./vehicles";

page(
  "/",
  route(() => {
    const app = document.getElementById("app") as HTMLDivElement;
    app.innerHTML = `
      <ul>
        <li><a href="/clean-the-car">Clean the car</a></li>
        <li><a href="/vehicles">Vehicles</a></li>
      </ul>
    `;
  })
);

page.start();
