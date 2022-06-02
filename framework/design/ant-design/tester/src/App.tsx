import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const TableBasicDemo = lazy(() => import("./table/basic"));
const TableSorterControlledDemo = lazy(
  () => import("./table/sorter-controlled")
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/table/basic"
          element={
            <Suspense>
              <TableBasicDemo />
            </Suspense>
          }
        />
        <Route
          path="/table/sorter-controlled"
          element={
            <Suspense>
              <TableSorterControlledDemo />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
