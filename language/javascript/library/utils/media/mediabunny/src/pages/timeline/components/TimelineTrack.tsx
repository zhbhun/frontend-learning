import { useRef, useMemo } from 'react'
import { useTimelineStore } from '../store/timelineStore'
import {
  timeToPixel,
  getTimelineDuration,
  getTrimmedDuration,
} from '../utils/timeline'
import TimelineRuler from './TimelineRuler'
import VideoSegment from './VideoSegment'

export default function TimelineTrack() {
  const trackRef = useRef<HTMLDivElement>(null)
  const segments = useTimelineStore((s) => s.segments)
  const currentTime = useTimelineStore((s) => s.currentTime)
  const zoomLevel = useTimelineStore((s) => s.zoomLevel)
  const selectedSegmentId = useTimelineStore((s) => s.selectedSegmentId)
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime)
  const setSelectedSegmentId = useTimelineStore((s) => s.setSelectedSegmentId)
  const updateTrim = useTimelineStore((s) => s.updateTrim)

  const totalDuration = useMemo(
    () => getTimelineDuration(segments),
    [segments]
  )

  const timelineWidth = useMemo(
    () => totalDuration * zoomLevel,
    [totalDuration, zoomLevel]
  )

  const playheadX = useMemo(
    () => timeToPixel(currentTime, zoomLevel),
    [currentTime, zoomLevel]
  )

  const handleTrackClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left + (trackRef.current?.scrollLeft || 0)
    const time = clickX / zoomLevel
    setCurrentTime(Math.max(0, Math.min(totalDuration, time)))
  }

  const segmentOffsets = useMemo(() => {
    const offsets: number[] = []
    let accumulated = 0
    for (const seg of segments) {
      offsets.push(accumulated)
      accumulated += getTrimmedDuration(seg) * zoomLevel
    }
    return offsets
  }, [segments, zoomLevel])

  return (
    <div className="flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
      <div
        ref={trackRef}
        className="flex-1 overflow-x-auto"
        style={{ minHeight: '80px' }}
        onClick={handleTrackClick}
      >
        <TimelineRuler />

        <div
          className="relative"
          style={{
            width: `${Math.max(timelineWidth, 100)}px`,
            height: '70px',
          }}
        >
          {segments.map((seg, index) => (
            <VideoSegment
              key={seg.id}
              segment={seg}
              offsetX={segmentOffsets[index]}
              zoomLevel={zoomLevel}
              isSelected={selectedSegmentId === seg.id}
              onSelect={setSelectedSegmentId}
              onTrimChange={updateTrim}
            />
          ))}

          <div
            className="absolute top-0 w-0.5 bg-red-500 z-20 pointer-events-none"
            style={{
              left: `${playheadX}px`,
              height: '100%',
            }}
          >
            <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-1.5" />
          </div>
        </div>
      </div>
    </div>
  )
}
