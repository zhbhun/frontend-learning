import { BrowserRouter, Routes, Route } from 'react-router'

import HomePage from './pages'

import VideoSampleSinkExample from './pages/sinks/video-sample-sink/sample'
import MultipleVideosPlayer from './pages/sinks/video-sample-sink/videos'
import VideoTrackReader from './pages/tracks/video'
import VideoCompressionExample from './pages/conversion/compression'
import AudioExtractionExample from './pages/output/audio'
import VideoMergerExample from './demos/merger'

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
        <Route
          path="conversion/compression"
          element={<VideoCompressionExample />}
        />
        <Route
          path="output/audio"
          element={<AudioExtractionExample />}
        />
        <Route
          path="demos/merger"
          element={<VideoMergerExample />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
