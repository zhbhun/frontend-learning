import { delay } from "lodash-es";

export function setupCounter(element: HTMLButtonElement) {
  let counter = 0;
  const setCounter = (count: number) => {
    counter = count;
    element.innerHTML = `count is ${counter}`;
  };
  element.addEventListener("click", () =>
    delay(() => setCounter(counter + 1), 1000)
  );
  setCounter(0);
}
