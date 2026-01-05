import { useEffect, useRef, useState } from 'react'
import { Input, ALL_FORMATS, BlobSource, VideoSampleSink } from 'mediabunny'

export default function VideoSampleSinkExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [frameRate, setFrameRate] = useState<number | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoSize, setVideoSize] = useState<{
    width: number
    height: number
  } | null>(null)
  const sinkRef = useRef<VideoSampleSink | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const isPlayingRef = useRef<boolean>(false)
  const pausedTimeRef = useRef<number>(0)

  // 清理函数
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
      isPlayingRef.current = false
    }
  }, [])

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setVideoSize(null)
    pausedTimeRef.current = 0

    try {
      // 创建输入对象
      const input = new Input({
        formats: ALL_FORMATS,
        source: new BlobSource(file),
      })

      // 获取视频轨道
      const videoTrack = await input.getPrimaryVideoTrack()

      if (!videoTrack) {
        throw new Error('未找到视频轨道')
      }

      const packetStats = await videoTrack.computePacketStats(50)
      setFrameRate(packetStats.averagePacketRate)

      // 检查是否可以解码
      const decodable = await videoTrack.canDecode()

      if (!decodable) {
        throw new Error('无法解码此视频格式')
      }

      // 获取视频时长和尺寸
      const duration = await videoTrack.computeDuration()
      if (duration !== null && duration !== undefined) {
        setDuration(duration)
      }

      // 获取视频尺寸
      const videoWidth = videoTrack.displayWidth || 640
      const videoHeight = videoTrack.displayHeight || 480
      // 保存视频尺寸到状态
      setVideoSize({ width: videoWidth, height: videoHeight })

      // 创建 VideoSampleSink
      const sink = new VideoSampleSink(videoTrack)
      sinkRef.current = sink

      // 初始化 Canvas
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('无法获取 Canvas 上下文')
      }

      // 获取第一帧
      const firstSample = await sink.getSample(0)
      if (!firstSample) {
        throw new Error('无法获取视频第一帧')
      }

      // 设置 Canvas 的实际尺寸（像素）- 必须与视频尺寸完全匹配
      // 注意：Canvas 的 width 和 height 属性是像素尺寸，不是 CSS 尺寸
      canvas.width = videoWidth
      canvas.height = videoHeight

      // 绘制第一帧
      firstSample.draw(ctx, 0, 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
      console.error('加载视频失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const playVideo = async () => {
    if (!sinkRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsPlaying(true)
    isPlayingRef.current = true
    const startTime = pausedTimeRef.current
    const endTime = duration || 30 // 如果没有时长，默认播放30秒

    try {
      let lastIterationTime = performance.now()
      let lastSampleTimestamp = startTime

      // 使用 samples 方法循环播放视频帧
      for await (const sample of sinkRef.current.samples(startTime, endTime)) {
        if (isPlayingRef.current) {
          const sampleTimestamp = sample.timestamp * 1000
          const sampleElapsedTime = Math.max(
            0,
            performance.now() - lastIterationTime
          )

          // 等待适当的时间以匹配视频帧率
          const timeDiff =
            sampleTimestamp - lastSampleTimestamp - sampleElapsedTime
          if (timeDiff > 0) {
            await new Promise((resolve) => {
              timeoutRef.current = window.setTimeout(resolve, timeDiff)
            })
          }

          // 更新状态
          setCurrentTime(sample.timestamp)
          lastSampleTimestamp = sampleTimestamp

          // 清空画布并绘制新帧
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          try {
            sample.draw(ctx, 0, 0)
          } catch (drawError) {
            console.error('绘制帧失败:', drawError)
          }
          lastIterationTime = performance.now()

          sample.close()
        } else {
          sample.close()
          break
        }
      }

      // 播放完成
      setIsPlaying(false)
      isPlayingRef.current = false
      pausedTimeRef.current = 0
      setCurrentTime(0)
    } catch (err) {
      console.error('播放视频失败:', err)
      setError(err instanceof Error ? err.message : '播放失败')
      setIsPlaying(false)
      isPlayingRef.current = false
    }
  }

  const pauseVideo = () => {
    setIsPlaying(false)
    isPlayingRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    pausedTimeRef.current = currentTime
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseVideo()
    } else {
      playVideo()
    }
  }

  const resetVideo = () => {
    pauseVideo()
    setCurrentTime(0)
    pausedTimeRef.current = 0
    if (canvasRef.current && sinkRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        sinkRef.current.getSample(0).then((sample) => {
          if (sample) {
            ctx.clearRect(
              0,
              0,
              canvasRef.current!.width,
              canvasRef.current!.height
            )
            sample.draw(ctx, 0, 0)
          }
        })
      }
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">VideoSampleSink 示例</h1>

      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium">选择视频文件:</label>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={isLoading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
      </div>

      {isLoading && <div className="mb-4 text-blue-600">加载中...</div>}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          错误: {error}
        </div>
      )}

      <div className="mb-4 flex justify-center">
        <canvas
          ref={canvasRef}
          className="border border-gray-300 rounded-lg bg-black"
          style={{
            maxWidth: '100%',
            maxHeight: '600px',
            width: videoSize ? 'auto' : 'auto',
            height: videoSize ? 'auto' : 'auto',
            aspectRatio: videoSize
              ? `${videoSize.width} / ${videoSize.height}`
              : undefined,
            display: 'block',
          }}
        />
      </div>

      {sinkRef.current && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlaying ? '暂停' : '播放'}
            </button>
            <button
              onClick={resetVideo}
              disabled={isLoading || isPlaying}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              重置
            </button>
          </div>

          {duration !== null && (
            <div className="text-sm text-gray-600">
              <div>帧率: {frameRate?.toFixed(2)}</div>
              <div>
                进度: {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
