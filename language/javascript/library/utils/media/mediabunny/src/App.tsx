import { BrowserRouter, Routes, Route } from 'react-router'

import HomePage from './pages'

import VideoSampleSinkExample from './pages/sinks/video-sample-sink/sample'
import MultipleVideosPlayer from './pages/sinks/video-sample-sink/videos'
import VideoTrackReader from './pages/tracks/video'
import VideoCompressionExample from './pages/conversion/compression'
import AudioExtractionExample from './pages/output/audio'
import AudioVolumeExample from './pages/audio/volume'
import VideoMergerExample from './demos/merger'
import TimelinePage from './pages/timeline'

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
          path="audio/volume"
          element={<AudioVolumeExample />}
        />
        <Route
          path="demos/merger"
          element={<VideoMergerExample />}
        />
        <Route
          path="audio/timeline"
          element={<TimelinePage />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
