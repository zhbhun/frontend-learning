import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";

const Home = lazy(() => import("./pages/home"));
const InputEventTester = lazy(() => import("./pages/event/input"));
const FormControlsTester = lazy(() => import("./pages/form/controls"));
const LifecycleErrorTester = lazy(() => import("./pages/lifecycle/error"));
const RefForwardRefTester = lazy(() => import("./pages/ref/forward-ref"));

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
          path="/ref/forward-ref"
          element={
            <Suspense>
              <RefForwardRefTester />
            </Suspense>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
