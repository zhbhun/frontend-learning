import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";

const Home = lazy(() => import("./pages/home"));
const SpringTester = lazy(() => import("./pages/animation/spring"));
const TransitionTester = lazy(() => import("./pages/animation/transition"));
const InputEventTester = lazy(() => import("./pages/event/input"));
const FormControlsTester = lazy(() => import("./pages/form/controls"));
const LifecycleErrorTester = lazy(() => import("./pages/lifecycle/error"));
const ImperativeHandleTester = lazy(
  () => import("./pages/lifecycle/imperative-handle")
);
const LifecycleInsertionTester = lazy(
  () => import("./pages/lifecycle/insertion")
);
const LifecycleRefTester = lazy(() => import("./pages/lifecycle/ref"));
const RefForwardRefTester = lazy(() => import("./pages/ref/forward-ref"));
const RefTester = lazy(() => import("./pages/ref/index"));
const ElementChildrenTester = lazy(() => import("./pages/element/children"));
const SuspenseLazyIssueTester = lazy(
  () => import("./pages/suspense/lazy/issue")
);
const SuspenseLazyTransitionTester = lazy(
  () => import("./pages/suspense/lazy/transition")
);
const SuspenseTest = lazy(() => import("./pages/suspense/test/index"));

function App() {
  return (
    <div className="App">
      <Routes>
        <Route
          path="/"
          element={
            <Suspense>
              <Home />
            </Suspense>
          }
        />
        <Route
          path="/animation/spring"
          element={
            <Suspense>
              <SpringTester />
            </Suspense>
          }
        />
        <Route
          path="/animation/transition"
          element={
            <Suspense>
              <TransitionTester />
            </Suspense>
          }
        />
        <Route
          path="/event/input"
          element={
            <Suspense>
              <InputEventTester />
            </Suspense>
          }
        />
        <Route
          path="/form/controls"
          element={
            <Suspense>
              <FormControlsTester />
            </Suspense>
          }
        />
        <Route
          path="/lifecycle/error"
          element={
            <Suspense>
              <LifecycleErrorTester />
            </Suspense>
          }
        />
        <Route
          path="/lifecycle/imperative-handle"
          element={
            <Suspense>
              <ImperativeHandleTester />
            </Suspense>
          }
        />
        <Route
          path="/lifecycle/insertion"
          element={
            <Suspense>
              <LifecycleInsertionTester />
            </Suspense>
          }
        />
        <Route
          path="/lifecycle/ref"
          element={
            <Suspense>
              <LifecycleRefTester />
            </Suspense>
          }
        />
        <Route
          path="/ref"
          element={
            <Suspense>
              <RefTester />
            </Suspense>
          }
        />
        <Route
          path="/ref/forward-ref"
          element={
            <Suspense>
              <RefForwardRefTester />
            </Suspense>
          }
        />
        <Route
          path="/element/children"
          element={
            <Suspense>
              <ElementChildrenTester />
            </Suspense>
          }
        />
        <Route
          path="/suspense/lazy/issue"
          element={
            <Suspense>
              <SuspenseLazyIssueTester />
            </Suspense>
          }
        />
        <Route
          path="/suspense/lazy/transition"
          element={
            <Suspense>
              <SuspenseLazyTransitionTester />
            </Suspense>
          }
        />
        <Route
          path="/suspense/test/index"
          element={
            <Suspense>
              <SuspenseTest />
            </Suspense>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
