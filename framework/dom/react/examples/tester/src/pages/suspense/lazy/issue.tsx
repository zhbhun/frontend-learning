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
      <Suspense fallback={<div>Loading...</div>}>
        <section>
          {tab === "other" ? <OtherComponent /> : <AnotherComponent />}
        </section>
      </Suspense>
    </div>
  );
}

export default LazyTester;
