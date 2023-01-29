import { type Component, type JSX, createMemo, children } from 'solid-js';

function Demo(props: { children?: JSX.Element }) {
  const resolved = children(() => props.children);
  const content = createMemo(() => {
    return resolved.toArray().map((item) => <h2>{item}</h2>);
  });
  return <div>{content()}</div>;
}

export default (() => {
  return (
    <div>
      <Demo>
        <div data-id="1">1</div>
        <div data-id="2">2</div>
        <div data-id="3">3</div>
      </Demo>
    </div>
  );
}) as Component;
