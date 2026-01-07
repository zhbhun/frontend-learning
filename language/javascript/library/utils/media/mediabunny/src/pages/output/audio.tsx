import { useRef, useState } from 'react'
import {
  Input,
  ALL_FORMATS,
  BlobSource,
  Output,
  BufferTarget,
  Mp4OutputFormat,
  AudioBufferSink,
  AudioBufferSource,
  QUALITY_HIGH,
} from 'mediabunny'

export default function AudioExtractionExample() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [inputFile, setInputFile] = useState<File | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [audioInfo, setAudioInfo] = useState<{
    codec?: string
    sampleRate?: number
    channels?: number
    duration?: number
  } | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setInputFile(file)
    setOutputUrl(null)
    setError(null)
    setAudioInfo(null)

    // 预览原始视频
    const url = URL.createObjectURL(file)
    if (videoRef.current) {
      videoRef.current.src = url
    }

    // 分析音频信息
    await analyzeAudio(file)
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
      const file = new File([blob], 'video.mp4', { type: blob.type })

      setInputFile(file)
      setOutputUrl(null)
      setError(null)
      setAudioInfo(null)

      // 预览原始视频
      const url = URL.createObjectURL(file)
      if (videoRef.current) {
        videoRef.current.src = url
      }

      // 分析音频信息
      await analyzeAudio(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载视频失败')
      console.error('加载在线视频失败:', err)
    }
  }

  const analyzeAudio = async (file: File) => {
    try {
      const input = new Input({
        formats: ALL_FORMATS,
        source: new BlobSource(file),
      })

      const audioTrack = await input.getPrimaryAudioTrack()
      if (!audioTrack) {
        setError('该视频没有音频轨道')
        return
      }

      const duration = await audioTrack.computeDuration()

      setAudioInfo({
        codec: audioTrack.codec ?? undefined,
        sampleRate: audioTrack.sampleRate ?? undefined,
        duration: duration ?? undefined,
      })
    } catch (err) {
      console.error('分析音频失败:', err)
    }
  }

  const extractAudio = async () => {
    if (!inputFile) {
      setError('请先选择视频文件')
      return
    }

    setIsProcessing(true)
    setError(null)
    setProgress(0)

    try {
      // 创建输入对象
      const input = new Input({
        formats: ALL_FORMATS,
        source: new BlobSource(inputFile),
      })

      // 获取音频轨道
      const audioTrack = await input.getPrimaryAudioTrack()
      if (!audioTrack) {
        throw new Error('该视频没有音频轨道')
      }

      // 获取音频时长
      const duration = (await audioTrack.computeDuration()) || 0

      // 创建音频缓冲区接收器
      const audioBufferSink = new AudioBufferSink(audioTrack)

      // 创建音频缓冲区源（使用音频编码配置）
      const audioSource = new AudioBufferSource({
        codec: 'aac',
        bitrate: QUALITY_HIGH, // 128 kbps
      })

      // 创建输出对象
      const target = new BufferTarget()
      const output = new Output({
        target,
        format: new Mp4OutputFormat(),
      })

      // 添加音频轨道到输出
      output.addAudioTrack(audioSource)

      // 开始输出
      await output.start()

      // 遍历音频缓冲区并添加到源
      let processedTime = 0
      for await (const wrappedBuffer of audioBufferSink.buffers(0, duration)) {
        // 添加缓冲区到音频源
        await audioSource.add(wrappedBuffer.buffer)

        processedTime = wrappedBuffer.timestamp + wrappedBuffer.duration

        // 更新进度
        const progress = (processedTime / duration) * 100
        setProgress(Math.min(progress, 99))
      }

      // 关闭音频源
      audioSource.close()

      // 完成输出
      await output.finalize()

      setProgress(100)

      // 获取输出数据
      const outputBuffer = target.buffer
      if (!outputBuffer) {
        throw new Error('输出缓冲区为空')
      }

      // 创建音频 Blob（使用 audio/mp4 或 audio/mpeg）
      const outputBlob = new Blob([outputBuffer], { type: 'audio/mp4' })

      // 创建输出 URL
      const url = URL.createObjectURL(outputBlob)
      setOutputUrl(url)

      // 预览提取的音频
      if (audioRef.current) {
        audioRef.current.src = url
      }

      console.log('音频提取完成，输出大小:', outputBlob.size, 'bytes')
    } catch (err) {
      setError(err instanceof Error ? err.message : '提取音频失败')
      console.error('提取音频失败:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadAudio = () => {
    if (!outputUrl) return

    const a = document.createElement('a')
    a.href = outputUrl
    a.download = `audio_${inputFile?.name.replace(/\.[^/.]+$/, '')}.m4a`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">音频提取示例</h1>
      <p className="text-gray-600 mb-6">
        使用 mediabunny 的 Output.addAudioTrack() 从视频中提取音频
      </p>

      {/* 文件选择 */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block mb-2 text-sm font-medium">
            选择视频文件:
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium">
            或输入在线视频地址:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleUrlLoad}
              disabled={isProcessing || !videoUrl.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              加载
            </button>
          </div>
        </div>
      </div>

      {/* 音频信息 */}
      {audioInfo && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-900">
            音频轨道信息
          </h3>
          <div className="space-y-2 text-sm">
            {audioInfo.codec && (
              <div className="flex justify-between">
                <span className="text-blue-700 font-medium">编解码器:</span>
                <span className="text-blue-900">{audioInfo.codec}</span>
              </div>
            )}
            {audioInfo.sampleRate && (
              <div className="flex justify-between">
                <span className="text-blue-700 font-medium">采样率:</span>
                <span className="text-blue-900">{audioInfo.sampleRate} Hz</span>
              </div>
            )}
            {audioInfo.channels && (
              <div className="flex justify-between">
                <span className="text-blue-700 font-medium">声道数:</span>
                <span className="text-blue-900">
                  {audioInfo.channels} ({audioInfo.channels === 1 ? '单声道' : audioInfo.channels === 2 ? '立体声' : `${audioInfo.channels} 声道`})
                </span>
              </div>
            )}
            {audioInfo.duration && (
              <div className="flex justify-between">
                <span className="text-blue-700 font-medium">时长:</span>
                <span className="text-blue-900">
                  {audioInfo.duration.toFixed(2)} 秒
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 提取按钮 */}
      {inputFile && audioInfo && (
        <div className="mb-6">
          <button
            onClick={extractAudio}
            disabled={isProcessing}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isProcessing ? '提取中...' : '提取音频'}
          </button>
        </div>
      )}

      {/* 进度条 */}
      {isProcessing && (
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">提取进度</span>
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

      {/* 错误信息 */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          错误: {error}
        </div>
      )}

      {/* 预览区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 提取的音频 */}
        {outputUrl && (
          <div>
            <h3 className="text-lg font-semibold mb-3">提取的音频</h3>
            <div className="p-6 bg-gray-100 rounded-lg border border-gray-300">
              <audio
                ref={audioRef}
                src={outputUrl}
                controls
                className="w-full mb-4"
              />
              <button
                onClick={downloadAudio}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                下载音频文件
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 使用说明 */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">使用说明:</h4>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>选择包含音频的视频文件</li>
          <li>系统会自动检测并显示音频轨道信息</li>
          <li>点击"提取音频"按钮开始提取</li>
          <li>使用 Output.addAudioTrack() 方法将音频轨道添加到输出</li>
          <li>提取完成后可以播放和下载音频文件</li>
          <li>输出格式为 M4A (AAC 音频)</li>
        </ul>
      </div>
    </div>
  )
}
