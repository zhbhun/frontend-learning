import { type FC, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function RouteElement(Comp: FC) {
  return (
    <Suspense fallback={null}>
      <Comp />
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/default"
          element={RouteElement(lazy(() => import("./pages/default")))}
        />
        <Route
          path="/navigation"
          element={RouteElement(lazy(() => import("./pages/navigation")))}
        />
        <Route
          path="/pagination"
          element={RouteElement(lazy(() => import("./pages/pagination")))}
        />
        <Route
          path="/space"
          element={RouteElement(lazy(() => import("./pages/space")))}
        />
        <Route
          path="/slides-per-view"
          element={RouteElement(lazy(() => import("./pages/slides-per-view")))}
        />
        <Route
          path="/slides-per-view-auto"
          element={RouteElement(lazy(() => import("./pages/slides-per-view-auto")))}
        />
        <Route
          path="/autoplay"
          element={RouteElement(lazy(() => import("./pages/autoplay")))}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
