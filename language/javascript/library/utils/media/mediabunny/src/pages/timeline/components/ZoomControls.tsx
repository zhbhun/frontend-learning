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
