import {
  Suspense,
  lazy,
  useState,
  useTransition,
  useEffect,
  useMemo,
} from "react";

const OtherComponent = lazy(() => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, 1000);
  }).then(() => {
    return import("./components/OtherComponent");
  });
});
const AnotherComponent = lazy(() => import("./components/AnotherComponent"));

function Loader() {
  console.log(">> loader", 0, performance.now());
  useEffect(() => {
    console.log(">> loader", 1, performance.now());
    return () => {
      console.log(">> loader", 2, performance.now());
    };
  }, []);
  return <div>Loading...</div>;
}

function Child() {
  console.log(">> child", 0, performance.now());
  useEffect(() => {
    console.log(">> child", 1, performance.now());
    return () => {
      console.log(">> child", 2, performance.now());
    };
  }, []);
  return <div>child...</div>;
}

function AnotherComponentWrapper() {
  console.log("xxx");
  return <AnotherComponent />;
}

function LazyTester() {
  const [tab, setTab] = useState("other");
  const [isPending, startTransition] = useTransition();
  // const xuseDeferredValue(1)
  function handleTabSelect(tab: string) {
    startTransition(() => {
      setTab(tab);
    });
    // setTab(tab);
  }
  console.log(">> demo", 0, performance.now(), isPending);
  useEffect(() => {
    console.log(">> demo", 1, performance.now());
    return () => {
      console.log(">> demo", 2, performance.now());
    };
  }, []);

  const loader = useMemo(() => {
    return <Loader />;
  }, []);

  const child = useMemo(() => {
    return <Child />;
  }, []);

  return (
    <div>
      <div>
        <button
          style={{ backgroundColor: tab === "other" ? "blue" : "grey" }}
          onClick={() => handleTabSelect("other")}
        >
          other
        </button>
        <button
          style={{ backgroundColor: tab === "another" ? "blue" : "grey" }}
          onClick={() => handleTabSelect("another")}
        >
          another
        </button>
      </div>
      <div>{isPending ? "loading" : null}</div>
      <Suspense fallback={loader}>
        {child}
        <section>
          {tab === "other" ? <OtherComponent /> : <AnotherComponentWrapper />}
        </section>
      </Suspense>
    </div>
  );
}

export default LazyTester;
