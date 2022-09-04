import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const FieldSwitch = lazy(() => import("./pages/fields/switch"));
const FormSwitch = lazy(() => import("./pages/form/switch"));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/field/switch"
          element={
            <Suspense>
              <FieldSwitch />
            </Suspense>
          }
        />
        <Route
          path="/form/switch"
          element={
            <Suspense>
              <FormSwitch />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
