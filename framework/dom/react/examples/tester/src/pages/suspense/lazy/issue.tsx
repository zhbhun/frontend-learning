import { Suspense, lazy, useState } from "react";

const OtherComponent = lazy(() => import("./components/OtherComponent"));
const AnotherComponent = lazy(() => import("./components/AnotherComponent"));

function LazyTester() {
  const [tab, setTab] = useState("other");
  function handleTabSelect(tab: string) {
    setTab(tab);
  }

  return (
    <div>
      <div>
        <button onClick={() => handleTabSelect("other")}>switch</button>
        <button onClick={() => handleTabSelect("another")}>switch</button>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <section>
          {tab === "other" ? <OtherComponent /> : <AnotherComponent />}
        </section>
      </Suspense>
    </div>
  );
}

export default LazyTester;
