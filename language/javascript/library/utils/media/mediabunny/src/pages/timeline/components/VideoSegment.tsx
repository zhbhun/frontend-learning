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
  const startPosRef = useRef<{
    clientX: number
    trimStart: number
    trimEnd: number
  } | null>(null)
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
        onTrimChange(
          segment.id,
          startPosRef.current.trimStart + delta,
          segment.trimEnd
        )
        setDragDisplayTime(startPosRef.current.trimStart + delta)
      } else {
        onTrimChange(
          segment.id,
          segment.trimStart,
          startPosRef.current.trimEnd + delta
        )
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
        <span className="text-xs text-white truncate block">
          {segment.file.name}
        </span>
      </div>

      <div
        className="absolute top-0 left-0 w-2 h-full bg-white/80 hover:bg-blue-400 cursor-col-resize rounded-l-sm flex items-center justify-center"
        onMouseDown={handleMouseDown('left')}
      >
        <div className="w-0.5 h-6 bg-gray-400 rounded" />
      </div>

      <div
        className="absolute top-0 right-0 w-2 h-full bg-white/80 hover:bg-blue-400 cursor-col-resize rounded-r-sm flex items-center justify-center"
        onMouseDown={handleMouseDown('right')}
      >
        <div className="w-0.5 h-6 bg-gray-400 rounded" />
      </div>

      {dragHandle && dragDisplayTime !== null && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
          {dragDisplayTime.toFixed(2)}s
        </div>
      )}
    </div>
  )
}
