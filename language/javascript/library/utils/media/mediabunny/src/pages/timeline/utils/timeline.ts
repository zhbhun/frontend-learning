import type { VideoSegment, TickMark } from '../types/timeline'

export function timeToPixel(time: number, zoomLevel: number): number {
  return time * zoomLevel
}

export function pixelToTime(pixel: number, zoomLevel: number): number {
  return pixel / zoomLevel
}

export function getTrimmedDuration(segment: VideoSegment): number {
  return segment.trimEnd - segment.trimStart
}

export function getTimelineDuration(segments: VideoSegment[]): number {
  return segments.reduce((sum, seg) => sum + getTrimmedDuration(seg), 0)
}

export function calculateDefaultZoom(
  segments: VideoSegment[],
  timelineWidth: number
): number {
  if (segments.length === 0) return 100
  const firstDuration = getTrimmedDuration(segments[0])
  if (firstDuration <= 0) return 100
  return (timelineWidth * 0.8) / firstDuration
}

export function calculateMinZoom(
  segments: VideoSegment[],
  timelineWidth: number
): number {
  if (segments.length === 0) return 100
  const totalDuration = getTimelineDuration(segments)
  if (totalDuration <= 0) return 100
  return (timelineWidth * 0.8) / totalDuration
}

export function calculateMaxZoom(frameRate: number): number {
  return frameRate * 200
}

export function findSegmentAtTime(
  segments: VideoSegment[],
  globalTime: number
): { segment: VideoSegment; localTime: number } | null {
  let accumulatedTime = 0
  for (const segment of segments) {
    const segDuration = getTrimmedDuration(segment)
    if (
      globalTime >= accumulatedTime &&
      globalTime < accumulatedTime + segDuration
    ) {
      const localTime = segment.trimStart + (globalTime - accumulatedTime)
      return { segment, localTime }
    }
    accumulatedTime += segDuration
  }
  return null
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function generateTickMarks(
  totalDuration: number,
  zoomLevel: number,
  timelineWidth: number
): TickMark[] {
  const pixelsPerSecond = zoomLevel
  let interval: number

  if (pixelsPerSecond >= 6000) {
    interval = 0.1
  } else if (pixelsPerSecond >= 3000) {
    interval = 0.5
  } else if (pixelsPerSecond >= 1000) {
    interval = 1
  } else if (pixelsPerSecond >= 500) {
    interval = 5
  } else if (pixelsPerSecond >= 100) {
    interval = 10
  } else {
    interval = 30
  }

  const ticks: TickMark[] = []
  for (let time = 0; time <= totalDuration; time += interval) {
    const position = timeToPixel(time, zoomLevel)
    if (position <= timelineWidth) {
      ticks.push({
        position,
        time,
        label: formatTime(time),
        isMajor: time % (interval * 5) === 0,
      })
    }
  }
  return ticks
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
