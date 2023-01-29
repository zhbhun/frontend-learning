import { type Component, lazy } from 'solid-js';
import { Routes, Route } from '@solidjs/router';

const App: Component = () => {
  return (
    <Routes>
      <Route
        path="/basics/reactivity"
        component={lazy(() => import('./pages/basics/reactivity'))}
      />
      <Route
        path="/basics/components/children"
        component={lazy(() => import('./pages/basics/components/children'))}
      />
      <Route
        path="/basics/control-flow/show"
        component={lazy(() => import('./pages/basics/control-flow/show'))}
      />
      <Route
        path="/basics/props"
        component={lazy(() => import('./pages/basics/props'))}
      />
      <Route
        path="/basics/more"
        component={lazy(() => import('./pages/basics/more'))}
      />
    </Routes>
  );
};

export default App;
