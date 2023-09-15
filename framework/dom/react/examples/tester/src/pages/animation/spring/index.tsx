import { useSpring, animated } from "@react-spring/web";

function FirstAnimation() {
  const springs = useSpring({
    from: { x: 0 },
    to: { x: 100 },
  });

  return (
    <div>
      <h2>First Animation</h2>
      <animated.div
        style={{
          width: 80,
          height: 80,
          background: "#ff6d6d",
          borderRadius: 8,
          ...springs,
        }}
      />
    </div>
  );
}

function ReactingToEvents() {
  const [springs, api] = useSpring(() => ({
    from: { x: 0 },
  }));

  const handleClick = () => {
    api.start({
      from: {
        x: 0,
      },
      to: {
        x: 100,
      },
    });
  };
  return (
    <div>
      <h2>Reacting to events</h2>
      <animated.div
        onClick={handleClick}
        style={{
          width: 80,
          height: 80,
          background: "#ff6d6d",
          borderRadius: 8,
          ...springs,
        }}
      />
    </div>
  );
}

function LoopAnimation() {
  const [springs, api] = useSpring(() => ({
    from: { x: 0 },
  }));

  const handleClick = () => {
    api.start({
      loop: true,
      from: {
        x: 0,
      },
      to: {
        x: 100,
      },
    });
  };
  return (
    <div>
      <h2>Loop Animation</h2>
      <animated.div
        onClick={handleClick}
        style={{
          width: 80,
          height: 80,
          background: "#ff6d6d",
          borderRadius: 8,
          ...springs,
        }}
      />
    </div>
  );
}

function SpringTester() {
  return (
    <div>
      <FirstAnimation />
      <ReactingToEvents />
      <LoopAnimation />
    </div>
  );
}

export default SpringTester;
