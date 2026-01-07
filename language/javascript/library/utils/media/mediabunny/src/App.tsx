import { BrowserRouter, Routes, Route } from 'react-router'

import HomePage from './pages'

import VideoSampleSinkExample from './pages/sinks/video-sample-sink/sample'
import MultipleVideosPlayer from './pages/sinks/video-sample-sink/videos'
import VideoTrackReader from './pages/tracks/video'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<HomePage />} />
        <Route
          path="sinks/video-sample-sink/sample"
          element={<VideoSampleSinkExample />}
        />
        <Route
          path="sinks/video-sample-sink/videos"
          element={<MultipleVideosPlayer />}
        />
        <Route
          path="tracks/video"
          element={<VideoTrackReader />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
