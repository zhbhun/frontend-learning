import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";

const Home = lazy(() => import("./pages/home"));
const InputEventTester = lazy(() => import("./pages/event/input"));
const FormControlsTester = lazy(() => import("./pages/form/controls"));

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
      </Routes>
    </div>
  );
}

export default App;
