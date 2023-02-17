import { useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import PlainText from './pages/plaintext';
import HoveringToolbar from './pages/hovering-toolbar';

const router = createBrowserRouter([
  {
    path: '/plaintext',
    element: <PlainText />,
  },
  {
    path: '/hovering-toolbar',
    element: <HoveringToolbar />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
