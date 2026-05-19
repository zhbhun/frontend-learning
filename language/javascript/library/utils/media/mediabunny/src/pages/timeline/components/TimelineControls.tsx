import { useCallback, useRef, useEffect } from 'react'
import { useTimelineStore } from '../store/timelineStore'
import { formatTime, getTimelineDuration, findSegmentAtTime } from '../utils/timeline'

export default function TimelineControls() {
  const isPlaying = useTimelineStore((s) => s.isPlaying)
  const currentTime = useTimelineStore((s) => s.currentTime)
  const segments = useTimelineStore((s) => s.segments)
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying)
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime)

  const playbackTimerRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const currentTimeRef = useRef<number>(0)

  const totalDuration = getTimelineDuration(segments)

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  const pause = useCallback(() => {
    setIsPlaying(false)
    if (playbackTimerRef.current !== null) {
      cancelAnimationFrame(playbackTimerRef.current)
      playbackTimerRef.current = null
    }
  }, [setIsPlaying])

  const play = useCallback(() => {
    if (segments.length === 0) return
    setIsPlaying(true)
    lastFrameTimeRef.current = performance.now()

    const total = getTimelineDuration(segments)

    const tick = () => {
      const now = performance.now()
      const delta = (now - lastFrameTimeRef.current) / 1000
      lastFrameTimeRef.current = now

      const newTime = currentTimeRef.current + delta

      if (newTime >= total) {
        setCurrentTime(0)
        setIsPlaying(false)
        return
      }

      const result = findSegmentAtTime(segments, newTime)
      if (!result) {
        setCurrentTime(0)
        setIsPlaying(false)
        return
      }

      setCurrentTime(newTime)
      playbackTimerRef.current = requestAnimationFrame(tick)
    }

    playbackTimerRef.current = requestAnimationFrame(tick)
  }, [segments, setIsPlaying, setCurrentTime])

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, pause, play])

  const handleReset = () => {
    pause()
    setCurrentTime(0)
  }

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
      <button
        onClick={handleTogglePlay}
        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
      >
        {isPlaying ? '⏸ 暂停' : '▶ 播放'}
      </button>
      <button
        onClick={handleReset}
        className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
      >
        ⏮ 重置
      </button>
      <span className="text-sm text-gray-600 ml-auto">
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </span>
    </div>
  )
}
