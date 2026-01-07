import { useEffect, useRef, useState } from 'react'
import {
  Input,
  ALL_FORMATS,
  BlobSource,
  VideoSampleSink,
  AudioBufferSink,
  InputAudioTrack,
} from 'mediabunny'

const audioContext = new AudioContext()

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
  const [videoUrl, setVideoUrl] = useState('')
  const audioTrackRef = useRef<InputAudioTrack | null>(null)
  const autdoSinkRef = useRef<AudioBufferSink | null>(null)
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([])
  const videoSinkRef = useRef<VideoSampleSink | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const isPlayingRef = useRef<boolean>(false)
  const pausedTimeRef = useRef<number>(0)

  // 初始化：读取 URL 参数
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const videoParam = params.get('video')
    if (videoParam) {
      setVideoUrl(videoParam)
      // 自动加载视频
      const loadFromUrl = async () => {
        try {
          const response = await fetch(videoParam)
          if (!response.ok) {
            throw new Error(`无法加载视频: ${response.statusText}`)
          }
          const blob = await response.blob()
          await loadVideo(new BlobSource(blob))
        } catch (err) {
          setError(err instanceof Error ? err.message : '加载视频失败')
          console.error('加载在线视频失败:', err)
        }
      }
      loadFromUrl()
    }
  }, [])

  // 清理函数
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
      if (audioSourcesRef.current) {
        audioSourcesRef.current.forEach((source) => {
          source.stop()
        })
        audioSourcesRef.current = []
      }
      isPlayingRef.current = false
    }
  }, [])

  const loadVideo = async (source: BlobSource) => {
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
        source,
      })

      // 获取视频轨道
      const videoTrack = await input.getPrimaryVideoTrack()
      if (!videoTrack) {
        throw new Error('未找到视频轨道')
      }
      const audioTrack = await input.getPrimaryAudioTrack()
      if (audioTrack) {
        audioTrackRef.current = audioTrack
        const sink = new AudioBufferSink(audioTrack)
        autdoSinkRef.current = sink
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
      videoSinkRef.current = sink

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

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    await loadVideo(new BlobSource(file))
  }

  const handleUrlLoad = async () => {
    if (!videoUrl.trim()) {
      setError('请输入视频地址')
      return
    }

    try {
      const response = await fetch(videoUrl)
      if (!response.ok) {
        throw new Error(`无法加载视频: ${response.statusText}`)
      }
      const blob = await response.blob()
      await loadVideo(new BlobSource(blob))
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载视频失败')
      console.error('加载在线视频失败:', err)
    }
  }

  const playVideo = async () => {
    const videoSink = videoSinkRef.current
    if (!videoSink || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsPlaying(true)
    isPlayingRef.current = true
    const startTime = pausedTimeRef.current
    const endTime = duration || 30 // 如果没有时长，默认播放30秒

    try {
      await Promise.all([
        // 使用 samples 方法循环播放视频帧
        (async () => {
          let lastIterationTime = performance.now()
          let lastSampleTimestamp = startTime * 1000
          for await (const sample of videoSink.samples(startTime, endTime)) {
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
        })(),
        // 使用 buffers 方法循环播放音频帧
        (async () => {
          const audioTrack = audioTrackRef.current
          if (!audioTrack) return
          const audioSink = autdoSinkRef.current
          if (!audioSink) return
          const sampleTimeOffset = await audioTrack.getFirstTimestamp()
          const sources: AudioBufferSourceNode[] = []
          audioSourcesRef.current = sources
          for await (const sample of audioSink.buffers(startTime, endTime)) {
            if (!isPlayingRef.current) break
            const source = audioContext.createBufferSource()
            source.buffer = sample.buffer
            source.connect(audioContext.destination)
            source.start(
              Math.max(
                0,
                audioContext.currentTime +
                  (sample.timestamp - startTime) +
                  sampleTimeOffset
              )
            )
            source.onended = () => {
              source.disconnect()
            }
            sources.push(source)
          }
        })(),
      ])

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
    pausedTimeRef.current = currentTime
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (audioSourcesRef.current) {
      audioSourcesRef.current.forEach((source) => {
        source.disconnect()
        source.stop()
      })
      audioSourcesRef.current = []
    }
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
    if (canvasRef.current && videoSinkRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        videoSinkRef.current.getSample(0).then((sample) => {
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

  const handleProgressClick = async (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!duration || !videoSinkRef.current || !canvasRef.current) return

    const rect = event.currentTarget.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration

    // 暂停当前播放
    const wasPlaying = isPlaying
    if (wasPlaying) {
      pauseVideo()
    }

    // 跳转到新位置
    setCurrentTime(newTime)
    pausedTimeRef.current = newTime

    // 渲染新位置的帧
    const ctx = canvasRef.current.getContext('2d')
    if (ctx) {
      try {
        const sample = await videoSinkRef.current.getSample(newTime)
        if (sample) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          sample.draw(ctx, 0, 0)
          sample.close()
        }
      } catch (err) {
        console.error('跳转失败:', err)
      }
    }

    // 如果之前在播放，继续播放
    if (wasPlaying) {
      playVideo()
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

      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium">或输入在线视频地址:</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://example.com/video.mp4"
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleUrlLoad}
            disabled={isLoading || !videoUrl.trim()}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            加载
          </button>
        </div>
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

      {videoSinkRef.current && (
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
            <div className="space-y-2">
              {/* 进度条 */}
              <div
                className="relative w-full h-2 bg-gray-300 rounded-full cursor-pointer hover:h-3 transition-all"
                onClick={handleProgressClick}
              >
                <div
                  className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all"
                  style={{
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  }}
                />
              </div>

              {/* 时间和帧率信息 */}
              <div className="flex justify-between text-sm text-gray-600">
                <div>
                  {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
                </div>
                <div>帧率: {frameRate?.toFixed(2)} fps</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
