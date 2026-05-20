import { useEffect, useRef } from 'react'
import { useTimelineStore } from '../store/timelineStore'
import { findSegmentAtTime } from '../utils/timeline'

export default function VideoPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const segments = useTimelineStore((s) => s.segments)
  const currentTime = useTimelineStore((s) => s.currentTime)
  const isPlaying = useTimelineStore((s) => s.isPlaying)

  const currentTimeRef = useRef(currentTime)
  const isPlayingRef = useRef(isPlaying)
  const segmentsRef = useRef(segments)
  const rafIdRef = useRef<number | null>(null)
  const lastRenderedRef = useRef<{
    segmentId: string
    localTime: number
  } | null>(null)

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    segmentsRef.current = segments
  }, [segments])

  const maxWidth = segments.reduce((max, s) => Math.max(max, s.width), 0)
  const maxHeight = segments.reduce((max, s) => Math.max(max, s.height), 0)
  const canvasWidth = maxWidth || 640
  const canvasHeight = maxHeight || 480

  useEffect(() => {
    if (segments.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvasWidth
    canvas.height = canvasHeight

    let pendingGetSample = false

    const renderFrame = () => {
      if (!isPlayingRef.current) {
        rafIdRef.current = requestAnimationFrame(renderFrame)
        return
      }

      const segs = segmentsRef.current
      const time = currentTimeRef.current

      const result = findSegmentAtTime(segs, time)
      if (!result) {
        rafIdRef.current = requestAnimationFrame(renderFrame)
        return
      }

      const { segment, localTime } = result

      if (
        lastRenderedRef.current?.segmentId === segment.id &&
        Math.abs(lastRenderedRef.current.localTime - localTime) < 0.016
      ) {
        rafIdRef.current = requestAnimationFrame(renderFrame)
        return
      }

      if (pendingGetSample) {
        rafIdRef.current = requestAnimationFrame(renderFrame)
        return
      }

      pendingGetSample = true
      lastRenderedRef.current = { segmentId: segment.id, localTime }

      segment.videoSink.getSample(localTime).then((sample) => {
        if (!sample) {
          pendingGetSample = false
          return
        }
        const currentCtx = canvas.getContext('2d')
        if (!currentCtx) {
          sample.close()
          pendingGetSample = false
          return
        }
        currentCtx.clearRect(0, 0, canvas.width, canvas.height)
        const offsetX = (canvas.width - segment.width) / 2
        const offsetY = (canvas.height - segment.height) / 2
        sample.draw(currentCtx, offsetX, offsetY)
        sample.close()
        pendingGetSample = false
      })

      rafIdRef.current = requestAnimationFrame(renderFrame)
    }

    rafIdRef.current = requestAnimationFrame(renderFrame)

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [segments, canvasWidth, canvasHeight])

  useEffect(() => {
    if (isPlaying) return
    if (segments.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const result = findSegmentAtTime(segments, currentTime)
    if (!result) return

    const { segment, localTime } = result
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvasWidth
    canvas.height = canvasHeight

    segment.videoSink.getSample(localTime).then((sample) => {
      if (!sample) return
      const currentCtx = canvas.getContext('2d')
      if (!currentCtx) {
        sample.close()
        return
      }
      currentCtx.clearRect(0, 0, canvas.width, canvas.height)
      const offsetX = (canvas.width - segment.width) / 2
      const offsetY = (canvas.height - segment.height) / 2
      sample.draw(currentCtx, offsetX, offsetY)
      sample.close()
    })
  }, [currentTime, segments, isPlaying, canvasWidth, canvasHeight])

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
