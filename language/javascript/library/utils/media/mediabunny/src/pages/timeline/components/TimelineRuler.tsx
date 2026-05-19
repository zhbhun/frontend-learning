import { useMemo } from 'react'
import { useTimelineStore } from '../store/timelineStore'
import { generateTickMarks, getTimelineDuration } from '../utils/timeline'

export default function TimelineRuler() {
  const zoomLevel = useTimelineStore((s) => s.zoomLevel)
  const segments = useTimelineStore((s) => s.segments)

  const totalDuration = useMemo(
    () => getTimelineDuration(segments),
    [segments]
  )

  const timelineWidth = useMemo(
    () => totalDuration * zoomLevel,
    [totalDuration, zoomLevel]
  )

  const ticks = useMemo(
    () => generateTickMarks(totalDuration, zoomLevel, timelineWidth),
    [totalDuration, zoomLevel, timelineWidth]
  )

  return (
    <div
      className="relative h-8 border-b border-gray-300 bg-gray-100 overflow-hidden"
      style={{ width: `${timelineWidth}px` }}
    >
      {ticks.map((tick, index) => (
        <div
          key={index}
          className="absolute bottom-0"
          style={{ left: `${tick.position}px` }}
        >
          {tick.isMajor ? (
            <>
              <div className="w-px h-4 bg-gray-500" />
              <span className="absolute top-0 left-1 text-xs text-gray-600 whitespace-nowrap">
                {tick.label}
              </span>
            </>
          ) : (
            <div className="w-px h-2 bg-gray-300" />
          )}
        </div>
      ))}
    </div>
  )
}
