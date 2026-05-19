import { useRef, useState, useEffect, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import {
  Input,
  ALL_FORMATS,
  BlobSource,
  Output,
  BufferTarget,
  Mp4OutputFormat,
  AudioBufferSource,
  AudioSampleSink,
  QUALITY_HIGH,
} from 'mediabunny'

// ─── Constants ──────────────────────────────────────────────────────────────

const VOLUME_PRESETS = [
  { label: '静音', db: -60 },
  { label: '微弱', db: -30 },
  { label: '原声', db: 0 },
  { label: '放大 50%', db: 6 },
  { label: '放大 100%', db: 12 },
  { label: '最大', db: 20 },
] as const

const WAVE_OPTIONS = {
  waveColor: '#6B7280',
  progressColor: '#3B82F6',
  cursorColor: '#10B981',
  barWidth: 3,
  barRadius: 2,
  barGap: 2,
  barAlign: 'bottom' as const,
  height: 128,
  normalize: false,
  backend: 'WebAudio' as const,
}

const GAIN_MIN = -60
const GAIN_MAX = 20
const GAIN_STEP = 0.5
const DEBOUNCE_MS = 300

// ─── Utilities ──────────────────────────────────────────────────────────────

const dbToLinear = (db: number) => Math.pow(10, db / 20)

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface DecodedAudio {
  channels: Float32Array[]
  sampleRate: number
  numberOfFrames: number
}

// ─── Audio Hooks ────────────────────────────────────────────────────────────

function useAudioDecoder() {
  const decodedRef = useRef<DecodedAudio | null>(null)

  const decode = useCallback(async (file: File) => {
    const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) })
    const audioTrack = await input.getPrimaryAudioTrack()
    if (!audioTrack) throw new Error('该文件没有音频轨道')

    const sink = new AudioSampleSink(audioTrack)
    const channelArrays: Float32Array[][] = []
    let numberOfChannels = 0
    let sampleRate = 0
    let totalFrames = 0

    for await (const sample of sink.samples()) {
      numberOfChannels = sample.numberOfChannels
      sampleRate = sample.sampleRate
      for (let ch = 0; ch < numberOfChannels; ch++) {
        if (!channelArrays[ch]) channelArrays[ch] = []
        const bytesNeeded = sample.allocationSize({ format: 'f32', planeIndex: ch })
        const data = new Float32Array(bytesNeeded / 4)
        sample.copyTo(data, { format: 'f32', planeIndex: ch })
        channelArrays[ch].push(data)
      }
      totalFrames += sample.numberOfFrames
    }

    const channels = channelArrays.map((arr) => {
      const result = new Float32Array(totalFrames)
      let offset = 0
      for (const chunk of arr) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      return result
    })

    decodedRef.current = { channels, sampleRate, numberOfFrames: totalFrames }
  }, [])

  const reset = useCallback(() => {
    decodedRef.current = null
  }, [])

  return { decodedRef, decode, reset }
}

function useAudioEncoder() {
  const encode = useCallback(async (decoded: DecodedAudio, gainDb: number): Promise<Blob> => {
    const { channels, sampleRate, numberOfFrames } = decoded
    const linearGain = dbToLinear(gainDb)
    const audioContext = new AudioContext({ sampleRate })
    const audioBuffer = audioContext.createBuffer(channels.length, numberOfFrames, sampleRate)

    for (let ch = 0; ch < channels.length; ch++) {
      const src = channels[ch]
      const processed = new Float32Array(numberOfFrames)
      for (let i = 0; i < numberOfFrames; i++) {
        processed[i] = Math.max(-1, Math.min(1, src[i] * linearGain))
      }
      audioBuffer.copyToChannel(processed, ch)
    }

    const target = new BufferTarget()
    const output = new Output({ target, format: new Mp4OutputFormat() })
    const audioSource = new AudioBufferSource({ codec: 'aac', bitrate: QUALITY_HIGH })
    output.addAudioTrack(audioSource)
    await output.start()
    await audioSource.add(audioBuffer)
    audioSource.close()
    await output.finalize()
    await audioContext.close()

    return new Blob([target.buffer!], { type: 'audio/mp4' })
  }, [])

  return { encode }
}

// ─── WaveSurfer Hook ────────────────────────────────────────────────────────

interface WaveFormState {
  isPlaying: boolean
  duration: number
  currentTime: number
}

function useWaveSurfer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  originalUrl: string | null,
) {
  const [state, setState] = useState<WaveFormState>({
    isPlaying: false,
    duration: 0,
    currentTime: 0,
  })
  const wsRef = useRef<WaveSurfer | null>(null)

  useEffect(() => {
    if (!containerRef.current || !originalUrl) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      ...WAVE_OPTIONS,
      url: originalUrl,
    })
    wsRef.current = ws

    ws.on('ready', () => setState((s) => ({ ...s, duration: ws.getDuration() })))
    ws.on('audioprocess', () => setState((s) => ({ ...s, currentTime: ws.getCurrentTime() })))
    ws.on('seeking', () => setState((s) => ({ ...s, currentTime: ws.getCurrentTime() })))
    ws.on('play', () => setState((s) => ({ ...s, isPlaying: true })))
    ws.on('pause', () => setState((s) => ({ ...s, isPlaying: false })))
    ws.on('finish', () => setState((s) => ({ ...s, isPlaying: false })))

    return () => {
      ws.destroy()
      wsRef.current = null
    }
  }, [originalUrl, containerRef])

  const togglePlay = useCallback(() => wsRef.current?.playPause(), [])

  const seekTo = useCallback((progress: number) => wsRef.current?.seekTo(progress), [])

  const reload = useCallback(async (url: string) => {
    const ws = wsRef.current
    if (!ws) return
    const wasPlaying = ws.isPlaying()
    const time = ws.getCurrentTime()
    ws.pause()
    await ws.load(url)
    ws.setTime(time)
    if (wasPlaying) await ws.play()
  }, [])

  const resetTime = useCallback(() => {
    setState({ isPlaying: false, duration: 0, currentTime: 0 })
  }, [])

  return { ...state, togglePlay, seekTo, reload, resetTime }
}

// ─── Sub Components ─────────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  )
}

function VolumeIcon() {
  return (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5 9v6h4l5 5V4L9 9H5z" />
    </svg>
  )
}

function FileSelector({ onFileSelect, isProcessing }: {
  onFileSelect: (file: File) => void
  isProcessing: boolean
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
  }

  return (
    <div className="mb-6">
      <label className="block mb-2 text-sm font-medium text-gray-700">选择音频文件:</label>
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="audio/*"
          onChange={handleChange}
          disabled={isProcessing}
          className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        <div className="min-w-[120px] text-right">
          {isProcessing && (
            <span className="inline-flex items-center gap-2 text-sm text-blue-600">
              <SpinnerIcon />
              处理中...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function PlaybackBar({ currentTime, duration, onSeek }: {
  currentTime: number
  duration: number
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void
}) {
  return (
    <div className="h-3 bg-gray-200 rounded-full mt-2 cursor-pointer" onClick={onSeek}>
      <div
        className="h-full bg-blue-600 rounded-full transition-all pointer-events-none"
        style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
      />
    </div>
  )
}

function PlayButton({ isPlaying, disabled, onToggle }: {
  isPlaying: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPlaying ? <PauseIcon /> : <PlayIcon />}
    </button>
  )
}

function VolumeSlider({ volumeDb, onChange, disabled }: {
  volumeDb: number
  onChange: (db: number) => void
  disabled: boolean
}) {
  const zeroPct = ((0 - GAIN_MIN) / (GAIN_MAX - GAIN_MIN)) * 100

  return (
    <div className="flex-1 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <VolumeIcon />
        <span className="text-sm text-gray-600 min-w-[32px]">音量</span>
      </div>

      <div className="flex-1 relative">
        <input
          type="range"
          min={GAIN_MIN}
          max={GAIN_MAX}
          step={GAIN_STEP}
          value={volumeDb}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer slider-thumb disabled:opacity-50"
        />
        <div className="text-xs text-gray-400 mt-1 relative h-4">
          <span className="absolute -translate-x-1/2">-60dB</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${zeroPct}%` }}>0dB</span>
          <span className="absolute right-0 translate-x-1/2">+20dB</span>
        </div>
      </div>

      <div className="min-w-[70px] text-right">
        <span className={`text-lg font-bold ${
          volumeDb > 0 ? 'text-green-600' :
          volumeDb < -20 ? 'text-red-500' :
          'text-gray-700'
        }`}>
          {volumeDb > 0 ? '+' : ''}{volumeDb.toFixed(1)}dB
        </span>
      </div>
    </div>
  )
}

function VolumePresets({ currentDb, onSelect, disabled }: {
  currentDb: number
  onSelect: (db: number) => void
  disabled: boolean
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="text-sm font-medium text-gray-700 mb-3">音量预设</div>
      <div className="flex flex-wrap gap-2">
        {VOLUME_PRESETS.map((preset) => (
          <button
            key={preset.db}
            onClick={() => onSelect(preset.db)}
            disabled={disabled}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
              currentDb === preset.db
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            {preset.label} ({preset.db > 0 ? '+' : ''}{preset.db}dB)
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AudioVolumeExample() {
  const [volumeDb, setVolumeDb] = useState(0)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const processedUrlRef = useRef<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { decodedRef, decode, reset: resetDecoded } = useAudioDecoder()
  const { encode } = useAudioEncoder()
  const ws = useWaveSurfer(containerRef, originalUrl)

  const cleanupProcessed = useCallback(() => {
    if (processedUrlRef.current) {
      URL.revokeObjectURL(processedUrlRef.current)
      processedUrlRef.current = null
    }
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    if (originalUrl) URL.revokeObjectURL(originalUrl)
    cleanupProcessed()
    resetDecoded()

    setIsProcessing(true)
    setOriginalUrl(URL.createObjectURL(file))
    setAudioFile(file)
    setVolumeDb(0)
    ws.resetTime()
  }, [originalUrl, cleanupProcessed, resetDecoded, ws])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ws.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    ws.seekTo((e.clientX - rect.left) / rect.width)
  }, [ws])

  const handleVolumeChange = useCallback((db: number) => {
    if (!audioFile) return
    setIsProcessing(true)
    setVolumeDb(db)
  }, [audioFile])

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl)
      if (processedUrlRef.current) URL.revokeObjectURL(processedUrlRef.current)
    }
  }, [originalUrl])

  useEffect(() => {
    if (!audioFile) return

    decode(audioFile)
      .then(async () => {
        const blob = await encode(decodedRef.current!, volumeDb)
        cleanupProcessed()
        processedUrlRef.current = URL.createObjectURL(blob)
        await ws.reload(processedUrlRef.current)
      })
      .finally(() => setIsProcessing(false))
  }, [audioFile, decode, encode, decodedRef, cleanupProcessed, ws]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!audioFile || !decodedRef.current) return

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    debounceTimerRef.current = setTimeout(async () => {
      const blob = await encode(decodedRef.current!, volumeDb)
      cleanupProcessed()
      processedUrlRef.current = URL.createObjectURL(blob)
      await ws.reload(processedUrlRef.current)
      setIsProcessing(false)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [volumeDb]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">音频音量调节示例</h1>
      <p className="text-gray-600 mb-6">
        使用 mediabunny 解码音频并应用增益，使用 wavesurfer.js 实时显示波形
      </p>

      <FileSelector onFileSelect={handleFileSelect} isProcessing={isProcessing} />

      {audioFile && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div ref={containerRef} className="cursor-pointer" />
            <PlaybackBar currentTime={ws.currentTime} duration={ws.duration} onSeek={handleSeek} />
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-6">
            <PlayButton isPlaying={ws.isPlaying} disabled={isProcessing} onToggle={ws.togglePlay} />
            <span className="text-sm text-gray-600 font-mono min-w-[100px]">
              {formatTime(ws.currentTime)} / {formatTime(ws.duration)}
            </span>
            <VolumeSlider
              volumeDb={volumeDb}
              onChange={handleVolumeChange}
              disabled={isProcessing}
            />
          </div>

          <VolumePresets
            currentDb={volumeDb}
            onSelect={handleVolumeChange}
            disabled={isProcessing}
          />

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">使用说明:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>使用 mediabunny 解码音频为 PCM 数据</li>
              <li>通过相对音量增益（Gain）方式调节声音，范围 -60dB 至 +20dB</li>
              <li>增益后重新编码为 AAC 并更新波形显示</li>
              <li>0dB 为原始音量，正值表示增益放大，负值表示衰减</li>
            </ul>
          </div>
        </div>
      )}

      {!audioFile && (
        <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          请选择音频文件以开始调节音量
        </div>
      )}

      <style>{`
        .slider-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #3B82F6;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider-thumb::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #3B82F6;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}
