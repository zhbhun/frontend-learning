let lastDestroy: (() => void) | undefined;

function route(render: () => (() => void) | void) {
  return () => {
    lastDestroy?.();
    lastDestroy = undefined;
    lastDestroy = render() ?? undefined;
  };
}

export default route;
