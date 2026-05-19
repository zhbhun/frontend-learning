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
  const isExporting = useTimelineStore((s) => s.isExporting)
  const exportProgress = useTimelineStore((s) => s.exportProgress)
  const exportUrl = useTimelineStore((s) => s.exportUrl)
  const exportVideo = useTimelineStore((s) => s.exportVideo)

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

    useTimelineStore.setState({ minZoom, maxZoom, zoomLevel: defaultZoom })
  }, [segments])

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
                    (document.getElementById('export-fps') as HTMLSelectElement)
                      .value
                  )
                  const bitrate = Number(
                    (
                      document.getElementById(
                        'export-bitrate'
                      ) as HTMLSelectElement
                    ).value
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
