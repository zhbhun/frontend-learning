import { forwardRef, useEffect, useRef } from "react";

const FancyButton = forwardRef((props: any, ref: any) => {
  return (
    <button ref={props.ref1} className="FancyButton">
      {props.children}
    </button>
  );
});

const FowardRefTester = () => {
  const ref = useRef();
  const ref1 = useRef();
  useEffect(() => {
    console.log(ref.current);
    console.log(ref1.current);
  }, []);
  return (
    <FancyButton ref={ref} ref1={ref1}>
      123
    </FancyButton>
  );
};

export default FowardRefTester;
