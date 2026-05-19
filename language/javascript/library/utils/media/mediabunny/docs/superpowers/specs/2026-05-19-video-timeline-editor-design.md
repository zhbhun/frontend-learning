# Video Timeline Editor Design

## Overview

A video assembly tool that allows users to select multiple videos, arrange them on a timeline, trim each video segment using drag handles, and export a final merged video. Similar to CapCut's timeline editing interface.

## Features

- **Multi-video selection**: Users can select multiple video files
- **Video preview**: Canvas-based preview showing current frame
- **Timeline visualization**: Visual timeline with video segments, tick marks, and playhead
- **Trimming**: Drag handles on each segment to trim start/end points
- **Zoom control**: Adjustable timeline zoom level with constraints
- **Playback**: Play/pause controls with playhead indicator
- **Export**: Merge trimmed segments into a single video file

## Architecture

### Component Structure

```
src/pages/audio/timeline/
├── index.tsx                    # Main entry point (route)
├── components/
│   ├── TimelineEditor.tsx       # Main container component
│   ├── VideoPreview.tsx         # Canvas video preview
│   ├── TimelineTrack.tsx        # Timeline track container
│   ├── VideoSegment.tsx         # Individual video segment with trim handles
│   ├── TimelineRuler.tsx        # Time tick marks ruler
│   ├── TimelineControls.tsx     # Play/pause/reset buttons
│   └ ZoomControls.tsx           # Zoom slider and buttons
├── store/
│   └── timelineStore.ts         # Zustand state management
├── utils/
│   └── timeline.ts              # Timeline calculation utilities
└── types/
    └── timeline.ts              # TypeScript type definitions
```

### State Management (Zustand)

**Core State:**

```typescript
interface VideoSegment {
  id: string
  file: File
  input: Input
  videoTrack: InputVideoTrack
  audioTrack: InputAudioTrack | null
  videoSink: VideoSampleSink
  audioSink: AudioBufferSink | null
  duration: number        // Original video duration (seconds)
  trimStart: number       // Trim start point (seconds, default 0)
  trimEnd: number         // Trim end point (seconds, default = duration)
  width: number
  height: number
  frameRate: number
}

interface TimelineState {
  segments: VideoSegment[]
  currentTime: number
  isPlaying: boolean
  zoomLevel: number       // pixels per second
  minZoom: number
  maxZoom: number
  selectedSegmentId: string | null
  
  // Actions
  addSegments: (files: File[]) => Promise<void>
  removeSegment: (id: string) => void
  updateTrim: (id: string, trimStart: number, trimEnd: number) => void
  reorderSegments: (fromIndex: number, toIndex: number) => void
  setCurrentTime: (time: number) => void
  setZoomLevel: (level: number) => void
  play: () => void
  pause: () => void
  reset: () => void
  getTimelineDuration: () => number
  exportVideo: () => Promise<void>
}
```

### Utility Functions (timeline.ts)

**Position Calculations:**

```typescript
// Convert time to pixel position on timeline
function timeToPixel(time: number, zoomLevel: number): number {
  return time * zoomLevel
}

// Convert pixel position to time
function pixelToTime(pixel: number, zoomLevel: number): number {
  return pixel / zoomLevel
}
```

**Zoom Calculations:**

```typescript
// Default zoom: first video's end frame at 80% of timeline width
function calculateDefaultZoom(
  segments: VideoSegment[],
  timelineWidth: number
): number {
  if (segments.length === 0) return 100
  const firstSegmentDuration = segments[0].getTrimmedDuration()
  return (timelineWidth * 0.8) / firstSegmentDuration
}

// Minimum zoom: last video's end frame at 80% of timeline width
function calculateMinZoom(
  segments: VideoSegment[],
  timelineWidth: number
): number {
  const totalDuration = segments.reduce(
    (sum, seg) => sum + seg.getTrimmedDuration(), 0
  )
  return (timelineWidth * 0.8) / totalDuration
}

// Maximum zoom: one frame = 200px
function calculateMaxZoom(frameRate: number): number {
  return frameRate * 200
}

// Helper: get trimmed duration of a segment
function getTrimmedDuration(segment: VideoSegment): number {
  return segment.trimEnd - segment.trimStart
}
```

**Tick Mark Generation:**

```typescript
interface TickMark {
  position: number  // pixel position
  time: number      // time in seconds
  label: string     // display label (e.g., "00:05")
  isMajor: boolean  // major vs minor tick
}

function generateTickMarks(
  startTime: number,
  endTime: number,
  zoomLevel: number,
  timelineWidth: number
): TickMark[] {
  // Calculate appropriate tick interval based on zoom level
  // Higher zoom → smaller intervals (show seconds)
  // Lower zoom → larger intervals (show minutes)
  
  const pixelsPerSecond = zoomLevel
  let interval: number  // seconds between ticks
  
  if (pixelsPerSecond >= 6000) {
    interval = 0.1  // 100ms intervals at max zoom
  } else if (pixelsPerSecond >= 3000) {
    interval = 0.5  // 500ms intervals
  } else if (pixelsPerSecond >= 1000) {
    interval = 1    // 1 second intervals
  } else if (pixelsPerSecond >= 500) {
    interval = 5    // 5 second intervals
  } else if (pixelsPerSecond >= 100) {
    interval = 10   // 10 second intervals
  } else {
    interval = 30   // 30 second intervals
  }
  
  // Generate tick marks
  const ticks: TickMark[] = []
  for (let time = startTime; time <= endTime; time += interval) {
    const position = timeToPixel(time, zoomLevel)
    if (position <= timelineWidth) {
      ticks.push({
        position,
        time,
        label: formatTime(time),
        isMajor: time % (interval * 5) === 0
      })
    }
  }
  return ticks
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
```

## Component Details

### TimelineEditor.tsx

**Responsibilities:**
- File input for video selection
- Layout orchestration (preview + timeline + controls)
- Initialize Zustand store
- Handle export action

**Layout:**
```
[File Input]
[VideoPreview Canvas]
[TimelineControls]
[TimelineTrack with TimelineRuler]
[ZoomControls]
[Export Button]
```

### VideoPreview.tsx

**Props:**
- `currentTime: number`
- `segments: VideoSegment[]`

**Behavior:**
- Canvas-based rendering using mediabunny's VideoSampleSink
- Find segment at currentTime
- Display frame at corresponding local time
- Center video with aspect ratio preservation
- Update frame when currentTime changes

### TimelineTrack.tsx

**Props:**
- `segments: VideoSegment[]`
- `currentTime: number`
- `zoomLevel: number`
- `onTimeClick: (time: number) => void`

**Behavior:**
- Clickable track for playhead positioning
- Render all VideoSegment components
- Render playhead indicator (vertical line at currentTime)
- Handle segment selection

**Visual:**
- Background: dark gray track
- Segments: colored blocks with thumbnails
- Playhead: red vertical line with handle

### VideoSegment.tsx

**Props:**
- `segment: VideoSegment`
- `zoomLevel: number`
- `isSelected: boolean`
- `onTrimChange: (trimStart: number, trimEnd: number) => void`
- `onSelect: () => void`

**Behavior:**
- Display segment as colored block
- Show thumbnail preview (first frame)
- Left/right drag handles for trimming
- Drag handle updates trimStart/trimEnd
- Constraints: trimStart ≥ 0, trimEnd ≤ duration, minimum segment length 0.5s

**Visual:**
- Block with video thumbnail
- Trimmed areas shown as semi-transparent overlay
- Drag handles: 8px wide, highlighted on hover
- Selected state: blue border

### TimelineRuler.tsx

**Props:**
- `zoomLevel: number`
- `timelineWidth: number`
- `totalDuration: number`

**Behavior:**
- Generate and render tick marks
- Dynamic intervals based on zoom level

**Visual:**
- Major ticks: longer lines with labels
- Minor ticks: shorter lines without labels
- Labels: time format (00:00, 00:05, etc.)

### TimelineControls.tsx

**Props:**
- `isPlaying: boolean`
- `currentTime: number`
- `totalDuration: number`
- `onPlay: () => void`
- `onPause: () => void`
- `onReset: () => void`

**Visual:**
- Play/Pause button
- Reset button
- Current time / Total duration display

### ZoomControls.tsx

**Props:**
- `zoomLevel: number`
- `minZoom: number`
- `maxZoom: number`
- `onZoomChange: (level: number) => void`

**Visual:**
- Zoom slider (range input)
- Zoom in/out buttons
- Current zoom level indicator

## Zoom Behavior

**Definition:** `zoomLevel = pixels per second`

**Constraints:**
- **Default:** First video's trimmed end position at 80% of timeline width
- **Minimum:** Last video's trimmed end position at 80% of timeline width (shows entire timeline)
- **Maximum:** One frame duration = 200px (maximum detail)

**Example calculations (30fps video):**
- Max zoom: 30 fps × 200px = 6000 px/s (1 second = 6000px wide)
- Default zoom (10s video, 800px timeline): (800 × 0.8) / 10 = 64 px/s
- Min zoom (60s total, 800px timeline): (800 × 0.8) / 60 = 10.7 px/s

## Trim Interaction

**Drag Handle Behavior:**

1. **Left handle (trim start):**
   - Drag right → increase trimStart (cut more from beginning)
   - Drag left → decrease trimStart (include more from beginning)
   - Constraint: trimStart ≥ 0

2. **Right handle (trim end):**
   - Drag left → decrease trimEnd (cut more from end)
   - Drag right → increase trimEnd (include more from end)
   - Constraint: trimEnd ≤ original duration

3. **Minimum segment length:**
   - trimEnd - trimStart ≥ 0.5 seconds (prevent zero-length segments)

4. **Visual feedback during drag:**
   - Show current trim time as tooltip
   - Highlight drag handle
   - Update segment visual immediately

## Playback Logic

**Playback Flow:**

1. Start from `currentTime`
2. Iterate through segments in order
3. For each segment, play from its trimStart to trimEnd
4. Update `currentTime` during playback
5. Stop when reaching total duration

**Seeking Logic:**

1. Click on timeline → calculate target time
2. Find which segment contains that time
3. Calculate local time within segment
4. Display corresponding frame
5. Update `currentTime`

**Segment Time Mapping:**

```typescript
// Global time to segment and local time
function findSegmentAtTime(
  segments: VideoSegment[],
  globalTime: number
): { segment: VideoSegment, localTime: number } | null {
  let accumulatedTime = 0
  for (const segment of segments) {
    const segmentDuration = getTrimmedDuration(segment)
    if (globalTime >= accumulatedTime && globalTime < accumulatedTime + segmentDuration) {
      const localTime = segment.trimStart + (globalTime - accumulatedTime)
      return { segment, localTime }
    }
    accumulatedTime += segmentDuration
  }
  return null
}
```

## Export Logic

**Export Process:**

1. Create OffscreenCanvas with first segment's dimensions
2. Create CanvasSource and AudioBufferSource
3. Create Output with Mp4OutputFormat
4. Iterate through segments in order
5. For each segment, iterate frames from trimStart to trimEnd
6. Draw each frame to canvas
7. Add to CanvasSource with correct timestamp
8. Handle audio similarly (trimStart to trimEnd)
9. Finalize and create downloadable blob

**Based on existing merger.tsx pattern, adapted for trimmed segments.**

## Error Handling

- **File loading errors:** Display error message, allow retry
- **Unsupported formats:** Check with `canDecode()`, show warning
- **Trim constraints:** Prevent invalid trim values, show feedback
- **Export errors:** Show progress, handle failures gracefully

## Testing Considerations

- Test with various video formats and sizes
- Test trim interactions at different zoom levels
- Test playback across multiple segments
- Test export with trimmed segments
- Test zoom constraints and boundaries

## Dependencies

- `mediabunny`: Video processing (Input, VideoSampleSink, CanvasSource, Output)
- `zustand`: State management
- `react`: UI framework
- `tailwindcss`: Styling

## Implementation Notes

- Follow existing code patterns from `videos.tsx` and `merger.tsx`
- Use TypeScript strict mode
- Keep components focused and testable
- Extract reusable logic to utility functions
- Use Zustand for complex state to avoid prop drilling