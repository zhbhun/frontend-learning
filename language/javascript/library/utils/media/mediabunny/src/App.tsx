import { BrowserRouter, Routes, Route } from 'react-router'

import HomePage from './pages'

import VideoSampleSinkExample from './pages/sinks/video-sample-sink/sample'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<HomePage />} />
        <Route
          path="sinks/video-sample-sink/sample"
          element={<VideoSampleSinkExample />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
