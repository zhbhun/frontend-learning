import { useRef, useState } from 'react'
import {
  Input,
  ALL_FORMATS,
  BlobSource,
  Output,
  BufferTarget,
  Mp4OutputFormat,
  CanvasSource,
  VideoSampleSink,
  AudioBufferSink,
  AudioBufferSource,
  QUALITY_HIGH,
  InputAudioTrack,
  Conversion,
} from 'mediabunny'

interface VideoInfo {
  input: Input
  file: File
  sink: VideoSampleSink
  audioTrack: InputAudioTrack | null
  audioSink: AudioBufferSink | null
  duration: number
  width: number
  height: number
}

export default function VideoMergerExample() {
  const [videos, setVideos] = useState<File[]>([])
  const [videoInfos, setVideoInfos] = useState<VideoInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [fps, setFps] = useState(30)
  const [bitrate, setBitrate] = useState(5000000)

  const outputVideoRef = useRef<HTMLVideoElement>(null)

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setVideos(files)
    setError(null)
    setOutputUrl(null)

    await loadVideos(files)
  }

  const loadVideos = async (files: File[]) => {
    setIsLoading(true)
    setError(null)

    try {
      const infos: VideoInfo[] = []

      for (const file of files) {
        const input = new Input({
          formats: ALL_FORMATS,
          source: new BlobSource(file),
        })

        const videoTrack = await input.getPrimaryVideoTrack()
        if (!videoTrack) {
          throw new Error(`${file.name} 没有视频轨道`)
        }

        const decodable = await videoTrack.canDecode()
        if (!decodable) {
          throw new Error(`${file.name} 无法解码`)
        }

        const duration = (await videoTrack.computeDuration()) || 0
        const width = videoTrack.displayWidth || 640
        const height = videoTrack.displayHeight || 480

        const sink = new VideoSampleSink(videoTrack)

        // 尝试获取音频轨道
        const audioTrack = await input.getPrimaryAudioTrack()
        let audioSink: AudioBufferSink | null = null
        if (audioTrack) {
          audioSink = new AudioBufferSink(audioTrack)
        }

        infos.push({
          input,
          file,
          sink,
          audioTrack,
          audioSink,
          duration,
          width,
          height,
        })
      }

      setVideoInfos(infos)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载视频失败')
      console.error('加载视频失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index))
    setVideoInfos(videoInfos.filter((_, i) => i !== index))
  }

  const mergeVideos = async () => {
    if (videoInfos.length < 2) {
      setError('请至少选择两个视频文件')
      return
    }

    setIsProcessing(true)
    setError(null)
    setProgress(0)
    setCurrentVideoIndex(0)

    try {
      // 使用第一个视频的尺寸作为输出尺寸
      const outputWidth = videoInfos[0].width
      const outputHeight = videoInfos[0].height

      // 创建离屏 canvas
      const offscreenCanvas = new OffscreenCanvas(outputWidth, outputHeight)
      const ctx = offscreenCanvas.getContext('2d')
      if (!ctx) throw new Error('无法获取画布上下文')

      // 创建 CanvasSource
      const videoSource = new CanvasSource(offscreenCanvas, {
        codec: 'avc',
        bitrate: bitrate,
      })

      // 创建音频缓冲区源（用于合并所有视频的音频）
      const audioSource = new AudioBufferSource({
        codec: 'aac',
        bitrate: QUALITY_HIGH, // 128 kbps
      })

      // 创建输出
      const target = new BufferTarget()
      const output = new Output({
        target,
        format: new Mp4OutputFormat(),
      })

      // 添加视频轨道
      output.addVideoTrack(videoSource, { frameRate: fps })

      // 检查是否有任何视频包含音频，如果有则添加音频轨道
      const hasAudio = videoInfos.some((info) => info.audioSink !== null)
      if (hasAudio) {
        output.addAudioTrack(audioSource)
      }

      // 开始输出
      await output.start()

      const frameDuration = 1 / fps
      let totalTime = 0

      // 逐个处理视频
      for (let videoIndex = 0; videoIndex < videoInfos.length; videoIndex++) {
        setCurrentVideoIndex(videoIndex)
        const info = videoInfos[videoIndex]

        // 计算之前视频的总时长
        const previousVideosDuration = videoInfos
          .slice(0, videoIndex)
          .reduce((sum, v) => sum + v.duration, 0)

        // 如果当前视频有音频，处理音频
        if (info.audioSink && hasAudio && info.audioTrack) {
          // 使用 Conversion 将音频转换为统一的采样率和比特率
          const audioTarget = new BufferTarget()
          const audioOutput = new Output({
            target: audioTarget,
            format: new Mp4OutputFormat(),
          })

          // 创建转换
          const conversion = await Conversion.init({
            input: info.input,
            output: audioOutput,
            audio: {
              codec: 'aac',
              bitrate: QUALITY_HIGH, // 128 kbps
              sampleRate: 48000, // 统一采样率为 16 kHz
            },
          })

          // 检查转换是否有效
          if (!conversion.isValid) {
            const discardedTracks = conversion.discardedTracks
              .map((t) => `${t.track.type} (原因: ${t.reason})`)
              .join(', ')
            console.warn(`音频转换无效，丢弃的轨道: ${discardedTracks}`)
            // 如果转换无效，跳过此视频的音频
            continue
          }

          // 执行转换
          await conversion.execute()

          // 从转换后的输出中获取音频缓冲区
          // 需要重新创建 Input 来读取转换后的音频
          const convertedBuffer = audioTarget.buffer
          if (convertedBuffer) {
            const convertedInput = new Input({
              formats: ALL_FORMATS,
              source: new BlobSource(new Blob([convertedBuffer], { type: 'audio/mp4' })),
            })

            const convertedAudioTrack = await convertedInput.getPrimaryAudioTrack()
            if (convertedAudioTrack) {
              const convertedAudioSink = new AudioBufferSink(convertedAudioTrack)
              const convertedDuration = (await convertedAudioTrack.computeDuration()) || info.duration

              // 遍历转换后的音频缓冲区并添加到源
              // AudioBufferSource 会自动管理时间戳，按顺序添加的缓冲区会按顺序播放
              for await (const wrappedBuffer of convertedAudioSink.buffers(
                0,
                convertedDuration
              )) {
                await audioSource.add(wrappedBuffer.buffer)
              }
            }
          }
        }

        // 使用 samples 方法遍历当前视频的所有帧
        for await (const sample of info.sink.samples(0, info.duration)) {
          // 计算当前帧在合并视频中的总时间
          totalTime = previousVideosDuration + sample.timestamp

          // 清空画布
          ctx.clearRect(0, 0, outputWidth, outputHeight)

          // 使用 drawWithFit 的 contain 模式绘制，保持宽高比
          sample.drawWithFit(ctx, { fit: 'contain' })

          sample.close()

          // 告诉 CanvasSource 当前帧的时间和时长
          await videoSource.add(totalTime, frameDuration)

          // 更新进度
          const videoProgress = sample.timestamp / info.duration
          const overallProgress =
            ((videoIndex + videoProgress) / videoInfos.length) * 100
          setProgress(overallProgress)
        }
      }

      // 完成输出
      videoSource.close()
      if (hasAudio) {
        audioSource.close()
      }

      // 完成并finalize输出
      await output.finalize()

      // 获取输出数据
      const outputBuffer = target.buffer
      if (!outputBuffer) {
        throw new Error('输出缓冲区为空')
      }

      const outputBlob = new Blob([outputBuffer], { type: 'video/mp4' })
      const url = URL.createObjectURL(outputBlob)

      console.log('合并完成，输出大小:', outputBlob.size, 'bytes')
      console.log('输出 URL:', url)

      setOutputUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '合并失败')
      console.error('合并视频失败:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadMergedVideo = () => {
    if (!outputUrl) return

    const a = document.createElement('a')
    a.href = outputUrl
    a.download = 'merged_video.mp4'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const totalDuration = videoInfos.reduce((sum, info) => sum + info.duration, 0)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">视频串联合并示例</h1>
      <p className="text-gray-600 mb-6">
        使用 mediabunny 的 CanvasSource 将多个视频按顺序串联成一个视频文件
      </p>

      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium">
          选择多个视频文件:
        </label>
        <input
          type="file"
          accept="video/*"
          multiple
          onChange={handleFileSelect}
          disabled={isLoading || isProcessing}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        <p className="text-xs text-gray-500 mt-1">
          至少选择 2 个视频文件，视频将按选择顺序串联
        </p>
      </div>

      {videos.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            已选择 {videos.length} 个视频
            {totalDuration > 0 && (
              <span className="text-sm text-gray-600 ml-2">
                (总时长: {totalDuration.toFixed(2)}s)
              </span>
            )}
          </h3>
          <div className="space-y-2">
            {videos.map((video, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-sm font-bold text-gray-500 w-8">
                  #{index + 1}
                </span>
                <div className="flex-1">
                  <span className="text-sm font-medium">{video.name}</span>
                  {videoInfos[index] && (
                    <span className="text-xs text-gray-500 ml-3">
                      {videoInfos[index].width}x{videoInfos[index].height} •{' '}
                      {videoInfos[index].duration.toFixed(2)}s
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeVideo(index)}
                  disabled={isLoading || isProcessing}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {videoInfos.length >= 2 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold mb-3">导出配置</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium">
                帧率 (FPS):
              </label>
              <select
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                disabled={isLoading || isProcessing}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="24">24 fps</option>
                <option value="30">30 fps</option>
                <option value="60">60 fps</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                视频比特率:
              </label>
              <select
                value={bitrate}
                onChange={(e) => setBitrate(Number(e.target.value))}
                disabled={isLoading || isProcessing}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="2000000">2 Mbps (低质量)</option>
                <option value="5000000">5 Mbps (中等质量)</option>
                <option value="8000000">8 Mbps (高质量)</option>
                <option value="15000000">15 Mbps (超高质量)</option>
              </select>
            </div>
          </div>

          <button
            onClick={mergeVideos}
            disabled={isLoading || isProcessing}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isProcessing ? '合并中...' : '开始合并'}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded">
          加载视频中...
        </div>
      )}

      {isProcessing && (
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">
              正在处理第 {currentVideoIndex + 1}/{videoInfos.length} 个视频
            </span>
            <span className="text-sm font-medium">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          错误: {error}
        </div>
      )}

      {outputUrl && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">合并结果</h3>
          <video
            ref={outputVideoRef}
            src={outputUrl}
            controls
            className="w-full rounded-lg border border-gray-300 bg-black mb-4"
            style={{ maxHeight: '600px' }}
            onLoadedMetadata={(e) => {
              console.log('视频元数据已加载:', {
                duration: e.currentTarget.duration,
                videoWidth: e.currentTarget.videoWidth,
                videoHeight: e.currentTarget.videoHeight,
              })
            }}
            onError={(e) => {
              console.error('视频加载错误:', e)
            }}
          />
          <button
            onClick={downloadMergedVideo}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            下载合并后的视频
          </button>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">使用说明:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>选择多个视频文件后，它们会按照选择顺序串联播放</li>
          <li>使用 CanvasSource 逐帧渲染所有视频并合并</li>
          <li>输出尺寸以第一个视频为准，其他视频会被缩放</li>
          <li>输出格式为 MP4 (H.264 视频)</li>
        </ul>
      </div>
    </div>
  )
}
