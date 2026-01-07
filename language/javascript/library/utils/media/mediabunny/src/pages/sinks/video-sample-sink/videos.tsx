import { useEffect, useRef, useState } from 'react'
import {
  Input,
  ALL_FORMATS,
  BlobSource,
  VideoSampleSink,
  AudioBufferSink,
  InputAudioTrack,
  InputVideoTrack,
  VideoSample,
} from 'mediabunny'

const audioContext = new AudioContext()

interface VideoInfo {
  file: File
  input: Input
  videoTrack: InputVideoTrack
  audioTrack: InputAudioTrack | null
  videoSink: VideoSampleSink
  audioSink: AudioBufferSink | null
  duration: number
  startTime: number // 在整个播放序列中的开始时间
  endTime: number // 在整个播放序列中的结束时间
  width: number
  height: number
  frameRate: number | null
}

export default function MultipleVideosPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState<number>(0)
  const [videoInfos, setVideoInfos] = useState<VideoInfo[]>([])
  const [videoSize, setVideoSize] = useState<{
    width: number
    height: number
  } | null>(null)
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([])
  const timeoutRef = useRef<number | null>(null)
  const isPlayingRef = useRef<boolean>(false)
  const pausedTimeRef = useRef<number>(0)

  // 清理函数
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
      if (audioSourcesRef.current) {
        audioSourcesRef.current.forEach((source) => {
          source.stop()
          source.disconnect()
        })
        audioSourcesRef.current = []
      }
      isPlayingRef.current = false
    }
  }, [videoInfos])

  // 根据全局时间找到对应的视频信息
  const findVideoInfo = (globalTime: number): VideoInfo | null => {
    return (
      videoInfos.find(
        (info) => globalTime >= info.startTime && globalTime < info.endTime
      ) || null
    )
  }

  // 将全局时间转换为视频内的相对时间
  const getLocalTime = (globalTime: number, videoInfo: VideoInfo): number => {
    return Math.max(0, globalTime - videoInfo.startTime)
  }

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setIsLoading(true)
    setError(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setVideoSize(null)
    pausedTimeRef.current = 0

    try {
      const newVideoInfos: VideoInfo[] = []
      let cumulativeTime = 0
      let maxWidth = 0
      let maxHeight = 0

      // 处理每个视频文件
      for (const file of files) {
        // 创建输入对象
        const input = new Input({
          formats: ALL_FORMATS,
          source: new BlobSource(file),
        })

        // 获取视频轨道
        const videoTrack = await input.getPrimaryVideoTrack()
        if (!videoTrack) {
          throw new Error(`文件 ${file.name} 未找到视频轨道`)
        }

        // 获取音频轨道
        const audioTrack = await input.getPrimaryAudioTrack()

        // 检查是否可以解码
        const decodable = await videoTrack.canDecode()
        if (!decodable) {
          throw new Error(`文件 ${file.name} 无法解码此视频格式`)
        }

        // 获取视频时长
        const duration = await videoTrack.computeDuration()
        if (duration === null || duration === undefined) {
          throw new Error(`文件 ${file.name} 无法获取视频时长`)
        }

        // 获取视频尺寸
        const videoWidth = videoTrack.displayWidth || 640
        const videoHeight = videoTrack.displayHeight || 480
        maxWidth = Math.max(maxWidth, videoWidth)
        maxHeight = Math.max(maxHeight, videoHeight)

        // 获取帧率
        const packetStats = await videoTrack.computePacketStats(50)
        const frameRate = packetStats.averagePacketRate

        // 创建 VideoSampleSink
        const videoSink = new VideoSampleSink(videoTrack)

        // 创建 AudioBufferSink（如果有音频）
        let audioSink: AudioBufferSink | null = null
        if (audioTrack) {
          audioSink = new AudioBufferSink(audioTrack)
        }

        const videoInfo: VideoInfo = {
          file,
          input,
          videoTrack,
          audioTrack,
          videoSink,
          audioSink,
          duration,
          startTime: cumulativeTime,
          endTime: cumulativeTime + duration,
          width: videoWidth,
          height: videoHeight,
          frameRate,
        }

        newVideoInfos.push(videoInfo)
        cumulativeTime += duration
      }

      setVideoInfos(newVideoInfos)
      setTotalDuration(cumulativeTime)
      setVideoSize({ width: maxWidth, height: maxHeight })

      // 初始化 Canvas
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('无法获取 Canvas 上下文')
      }

      // 设置 Canvas 尺寸为最大视频尺寸
      canvas.width = maxWidth
      canvas.height = maxHeight

      // 获取第一个视频的第一帧
      if (newVideoInfos.length > 0) {
        const firstVideo = newVideoInfos[0]
        const firstSample = await firstVideo.videoSink.getSample(0)
        if (firstSample) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          firstSample.draw(ctx, 0, 0)
          firstSample.close()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
      console.error('加载视频失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const playVideo = async () => {
    if (videoInfos.length === 0 || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsPlaying(true)
    isPlayingRef.current = true
    const startTime = pausedTimeRef.current
    const endTime = totalDuration

    try {
      await Promise.all([
        // 播放视频帧
        (async () => {
          let lastIterationTime = performance.now()
          let lastSampleTimestamp = startTime * 1000
          let currentVideoIndex = 0
          let currentVideoInfo: VideoInfo | null = null
          let currentVideoIterator: AsyncIterableIterator<VideoSample> | null = null
          let currentGlobalTimeRef = startTime

          // 找到起始视频
          for (let i = 0; i < videoInfos.length; i++) {
            if (startTime < videoInfos[i].endTime) {
              currentVideoIndex = i
              currentVideoInfo = videoInfos[i]
              const localStartTime = getLocalTime(startTime, currentVideoInfo)
              currentVideoIterator = currentVideoInfo.videoSink.samples(
                localStartTime,
                currentVideoInfo.duration
              )
              break
            }
          }

          if (!currentVideoInfo || !currentVideoIterator) return

          while (isPlayingRef.current && currentGlobalTimeRef < endTime) {
            if (!currentVideoInfo || !currentVideoIterator) break

            // 获取下一帧
            const result = await currentVideoIterator.next()
            if (result.done) {
              // 当前视频播放完毕，切换到下一个
              if (currentVideoIndex < videoInfos.length - 1) {
                currentVideoIndex++
                currentVideoInfo = videoInfos[currentVideoIndex]
                currentVideoIterator = currentVideoInfo.videoSink.samples(
                  0,
                  currentVideoInfo.duration
                )
                lastSampleTimestamp = currentVideoInfo.startTime * 1000
                // 重置迭代时间，确保下一个视频的时间计算正确
                lastIterationTime = performance.now()
                continue
              } else {
                // 所有视频播放完毕
                break
              }
            }

            const sample = result.value
            if (!isPlayingRef.current) {
              sample.close()
              break
            }

            const globalTimestamp = (sample.timestamp + currentVideoInfo.startTime) * 1000
            const sampleElapsedTime = Math.max(
              0,
              performance.now() - lastIterationTime
            )

            // 等待适当的时间以匹配视频帧率
            const timeDiff =
              globalTimestamp - lastSampleTimestamp - sampleElapsedTime
            if (timeDiff > 0) {
              await new Promise((resolve) => {
                timeoutRef.current = window.setTimeout(resolve, timeDiff)
              })
            }

            // 更新状态
            currentGlobalTimeRef = sample.timestamp + currentVideoInfo.startTime
            setCurrentTime(currentGlobalTimeRef)
            lastSampleTimestamp = globalTimestamp

            // 清空画布并绘制新帧
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            try {
              // 居中绘制视频帧（如果视频尺寸小于画布）
              const offsetX = (canvas.width - currentVideoInfo.width) / 2
              const offsetY = (canvas.height - currentVideoInfo.height) / 2
              sample.draw(ctx, offsetX, offsetY)
            } catch (drawError) {
              console.error('绘制帧失败:', drawError)
            }
            lastIterationTime = performance.now()

            sample.close()
          }
        })(),
        // 播放音频
        (async () => {
          const audioSources: AudioBufferSourceNode[] = []
          audioSourcesRef.current = audioSources

          // 记录播放开始时的音频上下文时间作为基准
          const audioStartTime = audioContext.currentTime

          for (let i = 0; i < videoInfos.length; i++) {
            const videoInfo = videoInfos[i]
            if (!videoInfo.audioSink || !videoInfo.audioTrack) continue

            // 计算该视频在全局时间轴上的播放范围
            const videoGlobalStartTime = Math.max(videoInfo.startTime, startTime)
            const videoGlobalEndTime = Math.min(videoInfo.endTime, endTime)

            // 如果该视频不在播放范围内，跳过
            if (videoGlobalStartTime >= videoGlobalEndTime) continue

            // 转换为视频内的本地时间
            const localStartTime = getLocalTime(videoGlobalStartTime, videoInfo)
            const localEndTime = getLocalTime(videoGlobalEndTime, videoInfo)

            const sampleTimeOffset = await videoInfo.audioTrack.getFirstTimestamp()

            for await (const sample of videoInfo.audioSink.buffers(
              localStartTime,
              localEndTime
            )) {
              if (!isPlayingRef.current) break

              const source = audioContext.createBufferSource()
              source.buffer = sample.buffer
              source.connect(audioContext.destination)

              // 计算样本在全局时间轴上的时间
              // sample.timestamp 是样本在视频内的本地时间
              // 需要转换为全局时间：videoInfo.startTime + sample.timestamp
              const sampleGlobalTime = videoInfo.startTime + sample.timestamp

              // 计算音频应该开始播放的时间
              // 基准时间 + (样本的全局时间 - 播放起始时间) + 音频时间偏移
              const audioPlayTime =
                audioStartTime +
                (sampleGlobalTime - startTime) +
                sampleTimeOffset

              source.start(Math.max(audioContext.currentTime, audioPlayTime))
              source.onended = () => {
                source.disconnect()
              }
              audioSources.push(source)
            }
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
    if (canvasRef.current && videoInfos.length > 0) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        const firstVideo = videoInfos[0]
        firstVideo.videoSink.getSample(0).then((sample) => {
          if (sample) {
            ctx.clearRect(
              0,
              0,
              canvasRef.current!.width,
              canvasRef.current!.height
            )
            const offsetX = (canvasRef.current!.width - firstVideo.width) / 2
            const offsetY = (canvasRef.current!.height - firstVideo.height) / 2
            sample.draw(ctx, offsetX, offsetY)
            sample.close()
          }
        })
      }
    }
  }

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (totalDuration === 0 || videoInfos.length === 0) return

    const progressBar = event.currentTarget
    const rect = progressBar.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const percentage = clickX / rect.width
    const targetTime = Math.max(0, Math.min(totalDuration, percentage * totalDuration))

    // 暂停当前播放
    pauseVideo()

    // 设置新的时间位置
    pausedTimeRef.current = targetTime
    setCurrentTime(targetTime)

    // 找到目标视频并显示对应帧
    const targetVideo = findVideoInfo(targetTime)
    if (targetVideo && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        const localTime = getLocalTime(targetTime, targetVideo)
        targetVideo.videoSink.getSample(localTime).then((sample) => {
          if (sample) {
            ctx.clearRect(
              0,
              0,
              canvasRef.current!.width,
              canvasRef.current!.height
            )
            const offsetX = (canvasRef.current!.width - targetVideo.width) / 2
            const offsetY = (canvasRef.current!.height - targetVideo.height) / 2
            sample.draw(ctx, offsetX, offsetY)
            sample.close()
          }
        })
      }
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">多视频连续播放示例</h1>

      <div className="mb-6">
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
        {videoInfos.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            <div>已选择 {videoInfos.length} 个视频文件:</div>
            <ul className="list-disc pl-5 mt-1">
              {videoInfos.map((info, index) => (
                <li key={index}>
                  {info.file.name} ({info.duration.toFixed(2)}s)
                </li>
              ))}
            </ul>
          </div>
        )}
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

      {videoInfos.length > 0 && totalDuration > 0 && (
        <div className="mb-4">
          <div
            className="relative w-full h-2 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition-colors"
            onClick={handleProgressClick}
          >
            {/* 进度条背景 */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              {/* 显示每个视频的片段 */}
              {videoInfos.map((info, index) => {
                const left = (info.startTime / totalDuration) * 100
                const width = (info.duration / totalDuration) * 100
                return (
                  <div
                    key={index}
                    className="absolute h-full bg-blue-200"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                  />
                )
              })}
            </div>
            {/* 当前播放进度 */}
            <div
              className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all duration-100"
              style={{
                width: `${(currentTime / totalDuration) * 100}%`,
              }}
            />
            {/* 进度条拖拽点 */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full shadow-md hover:bg-blue-700 transition-colors"
              style={{
                left: `calc(${(currentTime / totalDuration) * 100}% - 8px)`,
              }}
            />
          </div>
          {/* 时间标签 */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{currentTime.toFixed(1)}s</span>
            <span>{totalDuration.toFixed(1)}s</span>
          </div>
        </div>
      )}

      {videoInfos.length > 0 && (
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

          {totalDuration > 0 && (
            <div className="text-sm text-gray-600">
              <div>
                进度: {currentTime.toFixed(2)}s / {totalDuration.toFixed(2)}s
              </div>
              <div className="mt-1">
                当前视频:{' '}
                {(() => {
                  const currentVideo = findVideoInfo(currentTime)
                  return currentVideo
                    ? `${videoInfos.indexOf(currentVideo) + 1}/${videoInfos.length} - ${currentVideo.file.name}`
                    : '-'
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
