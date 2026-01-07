import { useRef, useState } from 'react'
import {
  Input,
  ALL_FORMATS,
  BlobSource,
  Output,
  BufferTarget,
  Mp4OutputFormat,
  Conversion,
} from 'mediabunny'

export default function VideoCompressionExample() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [inputFile, setInputFile] = useState<File | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [inputSize, setInputSize] = useState<number | null>(null)
  const [outputSize, setOutputSize] = useState<number | null>(null)
  const [videoUrl, setVideoUrl] = useState('')

  // 压缩配置
  const [videoBitrate, setVideoBitrate] = useState(1000000) // 1 Mbps
  const [audioBitrate, setAudioBitrate] = useState(128000) // 128 kbps
  const [targetWidth, setTargetWidth] = useState<number | null>(null)
  const [targetHeight, setTargetHeight] = useState<number | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const compressedVideoRef = useRef<HTMLVideoElement>(null)

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setInputFile(file)
    setInputSize(file.size)
    setOutputUrl(null)
    setOutputSize(null)
    setError(null)

    // 预览原始视频
    const url = URL.createObjectURL(file)
    if (videoRef.current) {
      videoRef.current.src = url
    }
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
      setInputSize(file.size)
      setOutputUrl(null)
      setOutputSize(null)
      setError(null)

      // 预览原始视频
      const url = URL.createObjectURL(file)
      if (videoRef.current) {
        videoRef.current.src = url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载视频失败')
      console.error('加载在线视频失败:', err)
    }
  }

  const compressVideo = async () => {
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

      // 创建输出对象
      const target = new BufferTarget()
      const output = new Output({
        target,
        format: new Mp4OutputFormat(),
      })

      // 配置转换选项
      const conversion = await Conversion.init({
        input,
        output,
        video: {
          codec: 'avc',
          bitrate: videoBitrate,
          width: targetWidth || undefined,
          height: targetHeight || undefined,
        },
        audio: {
          codec: 'aac',
          bitrate: audioBitrate,
        },
      })

      // 检查是否有被丢弃的轨道
      if (!conversion.isValid) {
        const discardedTracks = conversion.discardedTracks
          .map((t) => `${t.track.type} (原因: ${t.reason})`)
          .join(', ')
        throw new Error(`转换无效，丢弃的轨道: ${discardedTracks}`)
      }

      // 监听进度
      conversion.onProgress = (p) => {
        setProgress(p * 100)
      }

      // 执行转换
      await conversion.execute()

      // 获取输出数据
      const outputBuffer = target.buffer
      if (!outputBuffer) {
        throw new Error('输出缓冲区为空')
      }
      const outputBlob = new Blob([outputBuffer], { type: 'video/mp4' })

      // 创建输出 URL
      const url = URL.createObjectURL(outputBlob)
      setOutputUrl(url)
      setOutputSize(outputBlob.size)

      // 预览压缩后的视频
      if (compressedVideoRef.current) {
        compressedVideoRef.current.src = url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '压缩失败')
      console.error('压缩视频失败:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadCompressedVideo = () => {
    if (!outputUrl) return

    const a = document.createElement('a')
    a.href = outputUrl
    a.download = `compressed_${inputFile?.name || 'video.mp4'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const compressionRatio =
    inputSize && outputSize
      ? ((1 - outputSize / inputSize) * 100).toFixed(2)
      : null

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">视频压缩示例</h1>

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

      {/* 压缩配置 */}
      {inputFile && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold mb-3">压缩配置</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium">
                视频比特率 (bps):
              </label>
              <input
                type="number"
                value={videoBitrate}
                onChange={(e) => setVideoBitrate(Number(e.target.value))}
                disabled={isProcessing}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                推荐: 500000-2000000 (0.5-2 Mbps)
              </p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                音频比特率 (bps):
              </label>
              <input
                type="number"
                value={audioBitrate}
                onChange={(e) => setAudioBitrate(Number(e.target.value))}
                disabled={isProcessing}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                推荐: 64000-192000 (64-192 kbps)
              </p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                目标宽度 (可选):
              </label>
              <input
                type="number"
                value={targetWidth || ''}
                onChange={(e) =>
                  setTargetWidth(e.target.value ? Number(e.target.value) : null)
                }
                placeholder="保持原始宽度"
                disabled={isProcessing}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                目标高度 (可选):
              </label>
              <input
                type="number"
                value={targetHeight || ''}
                onChange={(e) =>
                  setTargetHeight(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="保持原始高度"
                disabled={isProcessing}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>

          <button
            onClick={compressVideo}
            disabled={isProcessing || !inputFile}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isProcessing ? '压缩中...' : '开始压缩'}
          </button>
        </div>
      )}

      {/* 进度条 */}
      {isProcessing && (
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">压缩进度</span>
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

      {/* 文件大小对比 */}
      {inputSize && outputSize && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">压缩结果</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">原始大小</p>
              <p className="text-xl font-bold">{formatFileSize(inputSize)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">压缩后大小</p>
              <p className="text-xl font-bold">{formatFileSize(outputSize)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">压缩率</p>
              <p className="text-xl font-bold text-green-600">
                {compressionRatio}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 视频预览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 原始视频 */}
        <div>
          <h3 className="text-lg font-semibold mb-3">原始视频</h3>
          <video
            ref={videoRef}
            controls
            className="w-full rounded-lg border border-gray-300 bg-black"
            style={{ maxHeight: '400px' }}
          />
          {inputSize && (
            <p className="text-sm text-gray-600 mt-2">
              大小: {formatFileSize(inputSize)}
            </p>
          )}
        </div>

        {/* 压缩后视频 */}
        {outputUrl && (
          <div>
            <h3 className="text-lg font-semibold mb-3">压缩后视频</h3>
            <video
              ref={compressedVideoRef}
              controls
              className="w-full rounded-lg border border-gray-300 bg-black"
              style={{ maxHeight: '400px' }}
            />
            {outputSize && (
              <p className="text-sm text-gray-600 mt-2">
                大小: {formatFileSize(outputSize)}
              </p>
            )}
            <button
              onClick={downloadCompressedVideo}
              className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              下载压缩后的视频
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
