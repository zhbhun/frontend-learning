import { debounce } from "lodash-es";

export function setupCounter(element: HTMLButtonElement) {
  let counter = 0;
  const setCounter = debounce((count: number) => {
    counter = count;
    element.innerHTML = `count is ${counter}`;
  }, 1000);
  element.addEventListener("click", () => setCounter(counter + 1));
  setCounter(0);
}
