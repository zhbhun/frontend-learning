import { CSSProperties, useEffect, useRef, useState } from "react";
import { CSSTransition, Transition } from "react-transition-group";
import "./index.css";

const duration = 3000;

const defaultStyle: CSSProperties = {
  transition: `opacity ${duration}ms ease-in-out`,
  opacity: 0,
};

const transitionStyles: Record<string, CSSProperties> = {
  entering: { opacity: 1 },
  entered: { opacity: 1 },
  exiting: { opacity: 0 },
  exited: { opacity: 0 },
};

function FadeByTransition() {
  const [open, setOpen] = useState(true);
  const nodeRef = useRef(null);
  return (
    <div>
      <button
        onClick={() => {
          setOpen((prevOpen) => !prevOpen);
        }}
      >
        Fade
      </button>
      <Transition
        nodeRef={nodeRef}
        in={open}
        appear
        mountOnEnter
        unmountOnExit
        timeout={duration}
      >
        {(state) => {
          console.log(">> transition", state, performance.now());
          return (
            <div
              ref={nodeRef}
              style={{
                ...defaultStyle,
                ...transitionStyles[state],
              }}
            >
              I'm a fade Transition!
            </div>
          );
        }}
      </Transition>
    </div>
  );
}

function FadeByCSSTransition() {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => {
          setOpen((prevOpen) => !prevOpen);
        }}
      >
        Fade
      </button>
      <CSSTransition
        classNames="transition-fade"
        in={open}
        appear
        mountOnEnter
        unmountOnExit
        timeout={duration}
      >
        {(state) => {
          console.log(">> css transition", state, performance.now());
          return <div>I'm a fade Transition!</div>;
        }}
      </CSSTransition>
    </div>
  );
}

function TransitionTester() {
  return (
    <ul>
      <li>
        <FadeByTransition />
      </li>
      <li>
        <FadeByCSSTransition />
      </li>
    </ul>
  );
}

export default TransitionTester;
