# Video Timeline Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a video timeline editor where users select multiple videos, preview frames, trim segments with drag handles, control zoom, and play back the assembled sequence.

**Architecture:** Zustand store manages all state (segments, currentTime, zoom, playback). Utility functions handle time/pixel conversion, zoom calculations, and tick mark generation. React components are composed with clear prop interfaces — TimelineEditor orchestrates VideoPreview, TimelineControls, TimelineTrack (containing TimelineRuler and VideoSegments), and ZoomControls.

**Tech Stack:** React 19, TypeScript, TailwindCSS 4, Zustand 5, mediabunny (VideoSampleSink, CanvasSource, Output for export)

---

## File Structure

```
src/pages/audio/timeline/
├── index.tsx                    # Page entry (route component) — delegates to TimelineEditor
├── types/
│   └── timeline.ts              # VideoSegment, TickMark interfaces
├── utils/
│   └── timeline.ts              # timeToPixel, pixelToTime, zoom calculations, tick generation
├── store/
│   └── timelineStore.ts         # Zustand store: segments, currentTime, zoom, playback, actions
└── components/
    ├── TimelineEditor.tsx       # Main container: file input, layout, orchestration
    ├── VideoPreview.tsx         # Canvas: displays current frame from current segment
    ├── TimelineControls.tsx     # Play/pause/reset buttons + time display
    ├── TimelineTrack.tsx        # Scrollable track: ruler + segments + playhead
    ├── TimelineRuler.tsx        # Tick marks with dynamic intervals
    ├── VideoSegment.tsx         # Single segment block: thumbnail, trim handles, drag feedback
    └── ZoomControls.tsx         # Slider + zoom in/out buttons
```

**Modified files:**
- `src/App.tsx` — add route
- `src/pages/index.tsx` — add navigation link

---

### Task 1: Type Definitions

**Files:**
- Create: `src/pages/audio/timeline/types/timeline.ts`

- [ ] **Step 1: Create type definition file**

```typescript
import type {
  Input,
  InputVideoTrack,
  InputAudioTrack,
  VideoSampleSink,
  AudioBufferSink,
} from 'mediabunny'

export interface VideoSegment {
  id: string
  file: File
  input: Input
  videoTrack: InputVideoTrack
  audioTrack: InputAudioTrack | null
  videoSink: VideoSampleSink
  audioSink: AudioBufferSink | null
  duration: number
  trimStart: number
  trimEnd: number
  width: number
  height: number
  frameRate: number
}

export interface TickMark {
  position: number
  time: number
  label: string
  isMajor: boolean
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/audio/timeline/types/timeline.ts
git commit -m "feat: add timeline type definitions

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```

---

### Task 2: Timeline Utility Functions

**Files:**
- Create: `src/pages/audio/timeline/utils/timeline.ts`

- [ ] **Step 1: Create utility functions file**

```typescript
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
    if (globalTime >= accumulatedTime && globalTime < accumulatedTime + segDuration) {
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/audio/timeline/utils/timeline.ts
git commit -m "feat: add timeline utility functions

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```

---

### Task 3: Zustand Store

**Files:**
- Create: `src/pages/audio/timeline/store/timelineStore.ts`

- [ ] **Step 1: Create Zustand store**

```typescript
import { create } from 'zustand'
import {
  Input,
  ALL_FORMATS,
  BlobSource,
  VideoSampleSink,
  AudioBufferSink,
} from 'mediabunny'
import type { VideoSegment } from '../types/timeline'
import {
  getTrimmedDuration,
  getTimelineDuration,
  calculateDefaultZoom,
  calculateMinZoom,
  calculateMaxZoom,
  findSegmentAtTime,
  clamp,
} from '../utils/timeline'

interface TimelineState {
  segments: VideoSegment[]
  currentTime: number
  isPlaying: boolean
  zoomLevel: number
  minZoom: number
  maxZoom: number
  selectedSegmentId: string | null
  isLoading: boolean
  error: string | null

  setSegments: (segments: VideoSegment[]) => void
  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  setZoomLevel: (level: number) => void
  setSelectedSegmentId: (id: string | null) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  addSegments: (files: File[]) => Promise<void>
  removeSegment: (id: string) => void
  updateTrim: (id: string, trimStart: number, trimEnd: number) => void

  getTimelineDuration: () => number
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  segments: [],
  currentTime: 0,
  isPlaying: false,
  zoomLevel: 100,
  minZoom: 10,
  maxZoom: 6000,
  selectedSegmentId: null,
  isLoading: false,
  error: null,

  setSegments: (segments) => set({ segments }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setSelectedSegmentId: (id) => set({ selectedSegmentId: id }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  setZoomLevel: (level) => {
    const { minZoom, maxZoom } = get()
    set({ zoomLevel: clamp(level, minZoom, maxZoom) })
  },

  addSegments: async (files: File[]) => {
    set({ isLoading: true, error: null })
    try {
      const newSegments: VideoSegment[] = []
      const existingCount = get().segments.length

      for (const file of files) {
        const input = new Input({
          formats: ALL_FORMATS,
          source: new BlobSource(file),
        })

        const videoTrack = await input.getPrimaryVideoTrack()
        if (!videoTrack) {
          throw new Error(`文件 ${file.name} 未找到视频轨道`)
        }

        const decodable = await videoTrack.canDecode()
        if (!decodable) {
          throw new Error(`文件 ${file.name} 无法解码`)
        }

        const duration = (await videoTrack.computeDuration()) || 0
        if (duration <= 0) {
          throw new Error(`文件 ${file.name} 未找到有效时长`)
        }

        const videoWidth = videoTrack.displayWidth || 640
        const videoHeight = videoTrack.displayHeight || 480
        const packetStats = await videoTrack.computePacketStats(50)
        const frameRate = packetStats.averagePacketRate || 30

        const videoSink = new VideoSampleSink(videoTrack)

        const audioTrack = await input.getPrimaryAudioTrack()
        let audioSink: AudioBufferSink | null = null
        if (audioTrack) {
          audioSink = new AudioBufferSink(audioTrack)
        }

        newSegments.push({
          id: `seg-${existingCount + newSegments.length}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          input,
          videoTrack,
          audioTrack,
          videoSink,
          audioSink,
          duration,
          trimStart: 0,
          trimEnd: duration,
          width: videoWidth,
          height: videoHeight,
          frameRate,
        })
      }

      const allSegments = [...get().segments, ...newSegments]
      set({ segments: allSegments, isLoading: false })

      // Auto-calculate zoom levels after adding files
      // We need timelineWidth, but store doesn't have it — calculated externally
      // For now just set a reasonable default
      set({ zoomLevel: 100 })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载视频失败',
        isLoading: false,
      })
    }
  },

  removeSegment: (id) => {
    set((state) => ({
      segments: state.segments.filter((s) => s.id !== id),
      selectedSegmentId:
        state.selectedSegmentId === id ? null : state.selectedSegmentId,
    }))
  },

  updateTrim: (id, trimStart, trimEnd) => {
    set((state) => ({
      segments: state.segments.map((seg) =>
        seg.id === id
          ? {
              ...seg,
              trimStart: clamp(trimStart, 0, trimEnd - 0.5),
              trimEnd: clamp(trimEnd, trimStart + 0.5, seg.duration),
            }
          : seg
      ),
    }))
  },

  getTimelineDuration: () => {
    return getTimelineDuration(get().segments)
  },
}))
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/audio/timeline/store/timelineStore.ts
git commit -m "feat: add timeline Zustand store

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```

---

### Task 4: ZoomControls Component

**Files:**
- Create: `src/pages/audio/timeline/components/ZoomControls.tsx`

- [ ] **Step 1: Create ZoomControls component**

```typescript
import { useTimelineStore } from '../store/timelineStore'

export default function ZoomControls() {
  const zoomLevel = useTimelineStore((s) => s.zoomLevel)
  const minZoom = useTimelineStore((s) => s.minZoom)
  const maxZoom = useTimelineStore((s) => s.maxZoom)
  const setZoomLevel = useTimelineStore((s) => s.setZoomLevel)

  const handleZoomIn = () => {
    setZoomLevel(zoomLevel * 1.5)
  }

  const handleZoomOut = () => {
    setZoomLevel(zoomLevel / 1.5)
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <button
        onClick={handleZoomOut}
        disabled={zoomLevel <= minZoom}
        className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-40"
      >
        −
      </button>
      <input
        type="range"
        min={minZoom}
        max={maxZoom}
        step={1}
        value={zoomLevel}
        onChange={(e) => setZoomLevel(Number(e.target.value))}
        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <button
        onClick={handleZoomIn}
        disabled={zoomLevel >= maxZoom}
        className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-40"
      >
        +
      </button>
      <span className="text-xs text-gray-500 w-24 text-right">
        缩放: {zoomLevel.toFixed(0)} px/s
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/audio/timeline/components/ZoomControls.tsx
git commit -m "feat: add ZoomControls component

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```

---

### Task 5: TimelineControls Component

**Files:**
- Create: `src/pages/audio/timeline/components/TimelineControls.tsx`

- [ ] **Step 1: Create TimelineControls component**

```typescript
import { useTimelineStore } from '../store/timelineStore'
import { formatTime, getTimelineDuration } from '../utils/timeline'

export default function TimelineControls() {
  const isPlaying = useTimelineStore((s) => s.isPlaying)
  const currentTime = useTimelineStore((s) => s.currentTime)
  const segments = useTimelineStore((s) => s.segments)
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying)
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime)

  const totalDuration = getTimelineDuration(segments)

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying)
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/audio/timeline/components/TimelineControls.tsx
git commit -m "feat: add TimelineControls component

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```

---

### Task 6: VideoPreview Component

**Files:**
- Create: `src/pages/audio/timeline/components/VideoPreview.tsx`

- [ ] **Step 1: Create VideoPreview component**

```typescript
import { useEffect, useRef } from 'react'
import { useTimelineStore } from '../store/timelineStore'
import { findSegmentAtTime } from '../utils/timeline'

export default function VideoPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const segments = useTimelineStore((s) => s.segments)
  const currentTime = useTimelineStore((s) => s.currentTime)
  const prevFrameRef = useRef<{ segmentId: string; localTime: number } | null>(null)

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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/audio/timeline/components/VideoPreview.tsx
git commit -m "feat: add VideoPreview component

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```

---

### Task 7: TimelineRuler Component

**Files:**
- Create: `src/pages/audio/timeline/components/TimelineRuler.tsx`

- [ ] **Step 1: Create TimelineRuler component**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/audio/timeline/components/TimelineRuler.tsx
git commit -m "feat: add TimelineRuler component

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```

---

### Task 8: VideoSegment Component

**Files:**
- Create: `src/pages/audio/timeline/components/VideoSegment.tsx`

- [ ] **Step 1: Create VideoSegment component**

```typescript
import { useRef, useState, useCallback, useEffect } from 'react'
import type { VideoSegment as VideoSegmentType } from '../types/timeline'
import { getTrimmedDuration } from '../utils/timeline'

interface VideoSegmentProps {
  segment: VideoSegmentType
  offsetX: number
  zoomLevel: number
  isSelected: boolean
  onSelect: (id: string) => void
  onTrimChange: (id: string, trimStart: number, trimEnd: number) => void
}

export default function VideoSegment({
  segment,
  offsetX,
  zoomLevel,
  isSelected,
  onSelect,
  onTrimChange,
}: VideoSegmentProps) {
  const [dragHandle, setDragHandle] = useState<'left' | 'right' | null>(null)
  const [dragDisplayTime, setDragDisplayTime] = useState<number | null>(null)
  const startPosRef = useRef<{ clientX: number; trimStart: number; trimEnd: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const segmentWidth = getTrimmedDuration(segment) * zoomLevel
  const left = offsetX

  const handleMouseDown = useCallback(
    (handle: 'left' | 'right') => (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      startPosRef.current = {
        clientX: e.clientX,
        trimStart: segment.trimStart,
        trimEnd: segment.trimEnd,
      }
      setDragHandle(handle)
    },
    [segment.trimStart, segment.trimEnd]
  )

  useEffect(() => {
    if (!dragHandle) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!startPosRef.current) return
      const delta = (e.clientX - startPosRef.current.clientX) / zoomLevel

      if (dragHandle === 'left') {
        onTrimChange(segment.id, startPosRef.current.trimStart + delta, segment.trimEnd)
        setDragDisplayTime(startPosRef.current.trimStart + delta)
      } else {
        onTrimChange(segment.id, segment.trimStart, startPosRef.current.trimEnd + delta)
        setDragDisplayTime(startPosRef.current.trimEnd + delta)
      }
    }

    const handleMouseUp = () => {
      setDragHandle(null)
      setDragDisplayTime(null)
      startPosRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragHandle, zoomLevel, segment.id, segment.trimStart, segment.trimEnd, onTrimChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || segmentWidth < 10) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvasRef.current.clientWidth
    canvas.height = canvasRef.current.clientHeight

    segment.videoSink.getSample(segment.trimStart).then((sample) => {
      if (!sample) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      sample.drawWithFit(ctx, { fit: 'cover' })
      sample.close()
    })
  }, [segment, segmentWidth])

  return (
    <div
      className={`absolute top-0 h-full cursor-pointer group ${
        isSelected ? 'ring-2 ring-blue-500 z-10' : ''
      }`}
      style={{
        left: `${left}px`,
        width: `${segmentWidth}px`,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(segment.id)
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-sm bg-gray-800"
      />

      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 rounded-sm transition-colors" />

      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/60 rounded-b-sm">
        <span className="text-xs text-white truncate block">{segment.file.name}</span>
      </div>

      {/* Left trim handle */}
      <div
        className="absolute top-0 left-0 w-2 h-full bg-white/80 hover:bg-blue-400 cursor-col-resize rounded-l-sm flex items-center justify-center"
        onMouseDown={handleMouseDown('left')}
      >
        <div className="w-0.5 h-6 bg-gray-400 rounded" />
      </div>

      {/* Right trim handle */}
      <div
        className="absolute top-0 right-0 w-2 h-full bg-white/80 hover:bg-blue-400 cursor-col-resize rounded-r-sm flex items-center justify-center"
        onMouseDown={handleMouseDown('right')}
      >
        <div className="w-0.5 h-6 bg-gray-400 rounded" />
      </div>

      {/* Drag time tooltip */}
      {dragHandle && dragDisplayTime !== null && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
          {dragDisplayTime.toFixed(2)}s
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/audio/timeline/components/VideoSegment.tsx
git commit -m "feat: add VideoSegment component with trim handles

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```

---

### Task 9: TimelineTrack Component

**Files:**
- Create: `src/pages/audio/timeline/components/TimelineTrack.tsx`

- [ ] **Step 1: Create TimelineTrack component**

```typescript
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
          {/* Segments */}
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

          {/* Playhead */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/audio/timeline/components/TimelineTrack.tsx
git commit -m "feat: add TimelineTrack component

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```

---

### Task 10: TimelineEditor Main Container

**Files:**
- Create: `src/pages/audio/timeline/components/TimelineEditor.tsx`

- [ ] **Step 1: Create TimelineEditor component**

```typescript
import { useRef, useCallback } from 'react'
import { useTimelineStore } from '../store/timelineStore'
import VideoPreview from './VideoPreview'
import TimelineControls from './TimelineControls'
import TimelineTrack from './TimelineTrack'
import ZoomControls from './ZoomControls'
import {
  findSegmentAtTime,
  getTimelineDuration,
  timeToPixel,
} from '../utils/timeline'

export default function TimelineEditor() {
  const segments = useTimelineStore((s) => s.segments)
  const isPlaying = useTimelineStore((s) => s.isPlaying)
  const currentTime = useTimelineStore((s) => s.currentTime)
  const zoomLevel = useTimelineStore((s) => s.zoomLevel)
  const addSegments = useTimelineStore((s) => s.addSegments)
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying)
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime)
  const isLoading = useTimelineStore((s) => s.isLoading)
  const error = useTimelineStore((s) => s.error)

  const playbackTimerRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const currentTimeRef = useRef<number>(0)

  currentTimeRef.current = currentTime

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return
      await addSegments(files)
    },
    [addSegments]
  )

  const play = useCallback(() => {
    if (isPlaying || segments.length === 0) return
    setIsPlaying(true)
    lastFrameTimeRef.current = performance.now()

    const totalDuration = getTimelineDuration(segments)

    const tick = () => {
      const now = performance.now()
      const delta = (now - lastFrameTimeRef.current) / 1000
      lastFrameTimeRef.current = now

      const newTime = currentTimeRef.current + delta

      if (newTime >= totalDuration) {
        setCurrentTime(0)
        setIsPlaying(false)
        return
      }

      const result = findSegmentAtTime(segments, newTime)
      if (result) {
        setCurrentTime(newTime)
      } else {
        setCurrentTime(0)
        setIsPlaying(false)
        return
      }

      playbackTimerRef.current = requestAnimationFrame(tick)
    }

    playbackTimerRef.current = requestAnimationFrame(tick)
  }, [isPlaying, segments, setIsPlaying, setCurrentTime])

  const pause = useCallback(() => {
    setIsPlaying(false)
    if (playbackTimerRef.current !== null) {
      cancelAnimationFrame(playbackTimerRef.current)
      playbackTimerRef.current = null
    }
  }, [setIsPlaying])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, pause, play])

  const totalDuration = getTimelineDuration(segments)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">视频时间轴编辑器</h1>

      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          选择多个视频文件:
        </label>
        <input
          type="file"
          accept="video/*"
          multiple
          onChange={handleFileSelect}
          disabled={isLoading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
      </div>

      {isLoading && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded">
          加载视频中...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {segments.length > 0 && (
        <>
          <VideoPreview />

          <div className="flex gap-2">
            <TimelineControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              totalDuration={totalDuration}
              onPlayPause={handlePlayPause}
              onReset={() => {
                pause()
                setCurrentTime(0)
              }}
            />
          </div>

          <TimelineTrack />

          <ZoomControls />
        </>
      )}

      {segments.length === 0 && (
        <p className="text-gray-500 text-sm">
          请选择视频文件开始编辑
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/audio/timeline/components/TimelineEditor.tsx
git commit -m "feat: add TimelineEditor main container

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```

---

### Task 11: Page Entry Point and Route

**Files:**
- Create: `src/pages/audio/timeline/index.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/index.tsx`

- [ ] **Step 1: Create page entry point**

```typescript
import TimelineEditor from './components/TimelineEditor'

export default function TimelinePage() {
  return <TimelineEditor />
}
```

- [ ] **Step 2: Add route to App.tsx**

In `src/App.tsx`, add the import:
```typescript
import TimelinePage from './pages/audio/timeline'
```

Add the route inside the `<Routes>` element:
```typescript
<Route path="audio/timeline" element={<TimelinePage />} />
```

- [ ] **Step 3: Add navigation link to home page**

In `src/pages/index.tsx`, add under the audio section:
```typescript
<li>
  <Link to="/audio/timeline">视频时间轴编辑器</Link>
</li>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/audio/timeline/index.tsx src/App.tsx src/pages/index.tsx
git commit -m "feat: wire up timeline page route and navigation

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```

---

### Task 12: Fix TimelineEditor — TimelineControls Props

**Files:**
- Modify: `src/pages/audio/timeline/components/TimelineEditor.tsx`
- Modify: `src/pages/audio/timeline/components/TimelineControls.tsx`

- [ ] **Step 1: Note**

TimelineEditor passes props to TimelineControls, but TimelineControls was built to use the store directly. We need to reconcile — since TimelineControls already reads from the store, we can either pass props or use the store. For consistency, let's update TimelineControls to accept optional props, and keep its internal store reads as fallback. But the current design creates a conflict. Let's update TimelineEditor to not pass props to TimelineControls (since it reads from store), and also not pass them to ZoomControls. But we duplicate handlePlayPause.

Better approach: TimelineEditor calls store actions directly, and TimelineControls reads from store. The props passed are redundant. Let's update Task 10's TimelineEditor to not pass props, and update Task 5's TimelineControls to accept them as optional props or re-read from store.

Actually the cleanest approach: TimelineControls should work without props (read from store), and TimelineEditor should just use it as a standalone component. Same for ZoomControls.

Let's rebuild both properly.

- [ ] **Step 1: Rewrite TimelineControls.tsx to use store directly**

```typescript
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
```

- [ ] **Step 2: Update TimelineEditor.tsx to use TimelineControls without props**

Replace the entire placeholder section with:
```typescript
<TimelineControls />
```

Also remove the playback logic from TimelineEditor (play, pause, handlePlayPause, playbackTimerRef, lastFrameTimeRef, currentTimeRef, play/useCallback imports), since it's now in TimelineControls.

Update TimelineEditor imports — remove:
- `useCallback` → keep for handleFileSelect
- Remove `findSegmentAtTime`, `timeToPixel`, `useRef`

Final TimelineEditor.tsx:

```typescript
import { useCallback } from 'react'
import { useTimelineStore } from '../store/timelineStore'
import VideoPreview from './VideoPreview'
import TimelineControls from './TimelineControls'
import TimelineTrack from './TimelineTrack'
import ZoomControls from './ZoomControls'

export default function TimelineEditor() {
  const segments = useTimelineStore((s) => s.segments)
  const addSegments = useTimelineStore((s) => s.addSegments)
  const isLoading = useTimelineStore((s) => s.isLoading)
  const error = useTimelineStore((s) => s.error)
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime)

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return
      await addSegments(files)
    },
    [addSegments]
  )

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">视频时间轴编辑器</h1>

      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          选择多个视频文件:
        </label>
        <input
          type="file"
          accept="video/*"
          multiple
          onChange={handleFileSelect}
          disabled={isLoading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
      </div>

      {isLoading && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded">
          加载视频中...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {segments.length > 0 && (
        <>
          <VideoPreview />
          <TimelineControls />
          <TimelineTrack />
          <ZoomControls />
        </>
      )}

      {segments.length === 0 && (
        <p className="text-gray-500 text-sm">
          请选择视频文件开始编辑
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify builds**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/audio/timeline/components/TimelineEditor.tsx src/pages/audio/timeline/components/TimelineControls.tsx
git commit -m "fix: consolidate playback logic into TimelineControls

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```

---

### Task 13: Auto-Zoom Calculation on Video Load

**Files:**
- Modify: `src/pages/audio/timeline/components/TimelineEditor.tsx`

- [ ] **Step 1: Add zoom auto-calculation after segments load**

This requires measuring the DOM element, so it must be done in the component layer. Update `TimelineEditor.tsx` to add a `useEffect` that calculates and sets zoom levels when segments change.

In `src/pages/audio/timeline/components/TimelineEditor.tsx`, add after the existing imports:

```typescript
import { useEffect, useRef, useCallback } from 'react'
import { useTimelineStore } from '../store/timelineStore'
import {
  calculateDefaultZoom,
  calculateMinZoom,
  calculateMaxZoom,
} from '../utils/timeline'
import VideoPreview from './VideoPreview'
import TimelineControls from './TimelineControls'
import TimelineTrack from './TimelineTrack'
import ZoomControls from './ZoomControls'

export default function TimelineEditor() {
  const segments = useTimelineStore((s) => s.segments)
  const addSegments = useTimelineStore((s) => s.addSegments)
  const isLoading = useTimelineStore((s) => s.isLoading)
  const error = useTimelineStore((s) => s.error)
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime)
  const setZoomLevel = useTimelineStore((s) => s.setZoomLevel)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (segments.length === 0) return
    const container = containerRef.current
    if (!container) return

    const timelineWidth = container.clientWidth

    const defaultZoom = calculateDefaultZoom(segments, timelineWidth)
    const minZoom = calculateMinZoom(segments, timelineWidth)
    const maxZoom = calculateMaxZoom(
      Math.max(...segments.map((s) => s.frameRate))
    )

    // Update the store's zoom constraints and default
    useTimelineStore.setState({ minZoom, maxZoom, zoomLevel: defaultZoom })
  }, [segments, setZoomLevel])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return
      await addSegments(files)
    },
    [addSegments]
  )

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-4" ref={containerRef}>
      <h1 className="text-3xl font-bold">视频时间轴编辑器</h1>

      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          选择多个视频文件:
        </label>
        <input
          type="file"
          accept="video/*"
          multiple
          onChange={handleFileSelect}
          disabled={isLoading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
      </div>

      {isLoading && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded">
          加载视频中...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {segments.length > 0 && (
        <>
          <VideoPreview />
          <TimelineControls />
          <TimelineTrack />
          <ZoomControls />
        </>
      )}

      {segments.length === 0 && (
        <p className="text-gray-500 text-sm">
          请选择视频文件开始编辑
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/audio/timeline/components/TimelineEditor.tsx
git commit -m "feat: add auto-zoom calculation on video load

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```

---

### Task 14: Export Functionality

**Files:**
- Modify: `src/pages/audio/timeline/store/timelineStore.ts`
- Modify: `src/pages/audio/timeline/components/TimelineEditor.tsx`

- [ ] **Step 1: Add export action to Zustand store**

Add to `src/pages/audio/timeline/store/timelineStore.ts` after the existing imports:

```typescript
import {
  CanvasSource,
  Output,
  BufferTarget,
  Mp4OutputFormat,
  AudioBufferSource,
  QUALITY_HIGH,
  Input as MediaBunnyInput,
  ALL_FORMATS,
  Conversion,
} from 'mediabunny'
```

Add these to the store interface (inside the `create` callback's return type):

```typescript
exportProgress: number
isExporting: boolean
exportUrl: string | null

exportVideo: (fps: number, bitrate: number) => Promise<void>
```

Add these to the initial state within `create`:

```typescript
exportProgress: 0,
isExporting: false,
exportUrl: null,
```

Add the `exportVideo` action:

```typescript
exportVideo: async (fps, bitrate) => {
  const { segments } = get()
  if (segments.length === 0) return

  set({ isExporting: true, exportProgress: 0, error: null })

  try {
    const outputWidth = segments[0].width
    const outputHeight = segments[0].height

    const offscreenCanvas = new OffscreenCanvas(outputWidth, outputHeight)
    const ctx = offscreenCanvas.getContext('2d')
    if (!ctx) throw new Error('无法获取画布上下文')

    const videoSource = new CanvasSource(offscreenCanvas, {
      codec: 'avc',
      bitrate,
    })

    const audioSource = new AudioBufferSource({
      codec: 'aac',
      bitrate: QUALITY_HIGH,
    })

    const target = new BufferTarget()
    const output = new Output({
      target,
      format: new Mp4OutputFormat(),
    })

    output.addVideoTrack(videoSource, { frameRate: fps })

    const hasAudio = segments.some((seg) => seg.audioSink !== null)
    if (hasAudio) {
      output.addAudioTrack(audioSource)
    }

    await output.start()

    const frameDuration = 1 / fps
    let totalTime = 0
    let totalFrames = 0

    const totalDuration = segments.reduce(
      (sum, seg) => sum + (seg.trimEnd - seg.trimStart),
      0
    )
    const estimatedTotalFrames = Math.ceil(totalDuration * fps)

    for (let segIndex = 0; segIndex < segments.length; segIndex++) {
      const seg = segments[segIndex]

      // Handle audio for this segment
      if (seg.audioSink && hasAudio && seg.audioTrack) {
        const audioTarget = new BufferTarget()
        const audioOutput = new Output({
          target: audioTarget,
          format: new Mp4OutputFormat(),
        })

        const conversion = await Conversion.init({
          input: seg.input,
          output: audioOutput,
          audio: {
            codec: 'aac',
            bitrate: QUALITY_HIGH,
            sampleRate: 48000,
          },
        })

        if (conversion.isValid) {
          await conversion.execute()
          const convertedBuffer = audioTarget.buffer
          if (convertedBuffer) {
            const convertedInput = new MediaBunnyInput({
              formats: ALL_FORMATS,
              source: new BlobSource(
                new Blob([convertedBuffer], { type: 'audio/mp4' })
              ),
            })

            const convertedAudioTrack =
              await convertedInput.getPrimaryAudioTrack()
            if (convertedAudioTrack) {
              const convertedAudioSink = new AudioBufferSink(convertedAudioTrack)
              for await (const wrappedBuffer of convertedAudioSink.buffers(
                seg.trimStart,
                seg.trimEnd
              )) {
                await audioSource.add(wrappedBuffer.buffer)
              }
            }
          }
        }
      }

      // Process video frames
      for await (const sample of seg.videoSink.samples(
        seg.trimStart,
        seg.trimEnd
      )) {
        const previousSegmentsDuration = segments
          .slice(0, segIndex)
          .reduce((sum, s) => sum + (s.trimEnd - s.trimStart), 0)

        totalTime = previousSegmentsDuration + (sample.timestamp - seg.trimStart)

        ctx.clearRect(0, 0, outputWidth, outputHeight)
        sample.drawWithFit(ctx, { fit: 'contain' })
        sample.close()

        await videoSource.add(totalTime, frameDuration)

        totalFrames++
        set({
          exportProgress: Math.min(
            (totalFrames / estimatedTotalFrames) * 100,
            99
          ),
        })
      }
    }

    videoSource.close()
    if (hasAudio) {
      audioSource.close()
    }

    await output.finalize()

    const outputBuffer = target.buffer
    if (!outputBuffer) {
      throw new Error('输出缓冲区为空')
    }

    const outputBlob = new Blob([outputBuffer], { type: 'video/mp4' })
    const url = URL.createObjectURL(outputBlob)

    set({
      isExporting: false,
      exportProgress: 100,
      exportUrl: url,
    })
  } catch (err) {
    set({
      error: err instanceof Error ? err.message : '导出失败',
      isExporting: false,
    })
  }
},
```

- [ ] **Step 2: Add export UI to TimelineEditor**

In `src/pages/audio/timeline/components/TimelineEditor.tsx`, add after the `ZoomControls` section, before the closing `</>`:

Add these store selectors:
```typescript
const isExporting = useTimelineStore((s) => (s as any).isExporting)
const exportProgress = useTimelineStore((s) => (s as any).exportProgress)
const exportUrl = useTimelineStore((s) => (s as any).exportUrl)
const exportVideo = useTimelineStore((s) => (s as any).exportVideo)
```

Wait — accessing store properties via `(s as any)` is bad practice. Instead, let's add these selectors properly. After step 1, the store will have the new state. In step 2, we import them properly:

Add these to the destructured selectors:
```typescript
const isExporting = useTimelineStore((s) => s.isExporting ?? false)
const exportProgress = useTimelineStore((s) => s.exportProgress ?? 0)
const exportUrl = useTimelineStore((s) => s.exportUrl ?? null)
const exportVideo = useTimelineStore((s) => s.exportVideo ?? (() => {}))
```

Add this UI block after `<ZoomControls />` but inside `{segments.length > 0 && (<>`:

```typescript
{/* Export section */}
<div className="p-4 bg-gray-50 rounded-lg space-y-3">
  <h2 className="text-lg font-semibold">导出视频</h2>
  <div className="flex items-center gap-4">
    <select
      defaultValue={30}
      id="export-fps"
      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
    >
      <option value="24">24 fps</option>
      <option value="30">30 fps</option>
      <option value="60">60 fps</option>
    </select>
    <select
      defaultValue={5000000}
      id="export-bitrate"
      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
    >
      <option value="2000000">2 Mbps</option>
      <option value="5000000">5 Mbps</option>
      <option value="8000000">8 Mbps</option>
    </select>
    <button
      onClick={() => {
        const fps = Number(
          (document.getElementById('export-fps') as HTMLSelectElement).value
        )
        const bitrate = Number(
          (document.getElementById('export-bitrate') as HTMLSelectElement).value
        )
        exportVideo(fps, bitrate)
      }}
      disabled={isExporting}
      className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
    >
      {isExporting ? '导出中...' : '导出'}
    </button>
  </div>

  {isExporting && (
    <div>
      <div className="flex justify-between mb-1 text-sm text-gray-600">
        <span>导出进度</span>
        <span>{exportProgress.toFixed(0)}%</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-600 transition-all duration-300"
          style={{ width: `${exportProgress}%` }}
        />
      </div>
    </div>
  )}

  {exportUrl && (
    <div className="flex items-center gap-3">
      <a
        href={exportUrl}
        download="timeline_export.mp4"
        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
      >
        下载导出视频
      </a>
    </div>
  )}
</div>
```

- [ ] **Step 3: Add types for new store properties**

In `src/pages/audio/timeline/store/timelineStore.ts`, add to the `TimelineState` interface (already covered in step 1 since we use `create` without explicit interface — the type is inferred). Make sure `BlobSource` is imported:

```typescript
import {
  Input,
  ALL_FORMATS,
  BlobSource,
  VideoSampleSink,
  AudioBufferSink,
  CanvasSource,
  Output,
  BufferTarget,
  Mp4OutputFormat,
  AudioBufferSource,
  QUALITY_HIGH,
  Conversion,
} from 'mediabunny'
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/audio/timeline/store/timelineStore.ts src/pages/audio/timeline/components/TimelineEditor.tsx
git commit -m "feat: add export functionality to timeline editor

AI-Co-Authored-By: opencode <opencode@anomaly.ai>"
```
