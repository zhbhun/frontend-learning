import { Link } from 'react-router'

export default function HomePage() {
  return (
    <div>
      <ul className="flex flex-col gap-4 list-disc pl-4">
        <li>
          <div>sinks</div>
          <ul className="flex flex-col gap-2 list-disc pl-4">
            <li>
              <Link to="/sinks/video-sample-sink/sample">VideoSampleSink</Link>
            </li>
            <li>
              <Link to="/sinks/video-sample-sink/videos">多视频连续播放</Link>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  )
}
