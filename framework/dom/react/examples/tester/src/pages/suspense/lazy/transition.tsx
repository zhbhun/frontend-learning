import { Suspense, lazy, useState, useDeferredValue ,useTransition } from "react";

const OtherComponent = lazy(() => import("./components/OtherComponent"));
const AnotherComponent = lazy(() => import("./components/AnotherComponent"));

function Temp() {
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
      <Suspense fallback={<div>Loading...</div>}>
        <section>{tab === "other" ? <OtherComponent /> : <Temp />}</section>
      </Suspense>
    </div>
  );
}

export default LazyTester;
