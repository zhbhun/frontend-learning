import { useEffect, useRef } from 'react'
import { useTimelineStore } from '../store/timelineStore'
import { findSegmentAtTime } from '../utils/timeline'

export default function VideoPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const segments = useTimelineStore((s) => s.segments)
  const currentTime = useTimelineStore((s) => s.currentTime)
  const prevFrameRef = useRef<{
    segmentId: string
    localTime: number
  } | null>(null)

  const maxWidth = segments.reduce((max, s) => Math.max(max, s.width), 0)
  const maxHeight = segments.reduce((max, s) => Math.max(max, s.height), 0)
  const canvasWidth = maxWidth || 640
  const canvasHeight = maxHeight || 480

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || segments.length === 0) return

    const result = findSegmentAtTime(segments, currentTime)
    if (!result) return

    const { segment, localTime } = result

    if (
      prevFrameRef.current?.segmentId === segment.id &&
      Math.abs(prevFrameRef.current.localTime - localTime) < 0.001
    ) {
      return
    }

    prevFrameRef.current = { segmentId: segment.id, localTime }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvasWidth
    canvas.height = canvasHeight

    segment.videoSink.getSample(localTime).then((sample) => {
      if (!sample) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const offsetX = (canvas.width - segment.width) / 2
      const offsetY = (canvas.height - segment.height) / 2
      sample.draw(ctx, offsetX, offsetY)
      sample.close()
    })
  }, [currentTime, segments, canvasWidth, canvasHeight])

  if (segments.length === 0) return null

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded-lg bg-black"
        style={{
          maxWidth: '100%',
          maxHeight: '500px',
          aspectRatio: `${canvasWidth} / ${canvasHeight}`,
        }}
      />
    </div>
  )
}
