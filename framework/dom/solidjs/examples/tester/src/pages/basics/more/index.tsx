import {
  type Component,
  type JSX,
  createMemo,
  createSignal,
  children,
} from 'solid-js';

function Demo(props: { children?: JSX.Element }) {
  console.log(props.children);
  const resolved = children(() => props.children);
  const content = createMemo(() => {
    console.log('>>', props.children);
    return resolved.toArray().map((item) => <h2>{item}</h2>);
  });
  return (
    <div>
      {props.children}
      <hr />
      <div>{content()}</div>
    </div>
  );
}

export default (() => {
  const [status, setStatus] = createSignal(0);
  const handleClick = () => {
    setStatus((currStatus) => (currStatus === 0 ? 1 : 0));
  };
  return (
    <div onClick={handleClick}>
      <Demo>{status()}</Demo>
    </div>
  );
}) as Component;
