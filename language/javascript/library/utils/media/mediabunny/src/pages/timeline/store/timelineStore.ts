import { create } from 'zustand'
import {
  Input,
  ALL_FORMATS,
  BlobSource,
  VideoSampleSink,
  AudioBufferSink,
  CanvasSource,
  Output,
  BufferTarget,
  Mp4OutputFormat,
  AudioBufferSource,
  QUALITY_HIGH,
  Conversion,
} from 'mediabunny'
import type { VideoSegment } from '../types/timeline'
import {
  getTimelineDuration,
  clamp,
} from '../utils/timeline'

interface TimelineState {
  segments: VideoSegment[]
  currentTime: number
  isPlaying: boolean
  zoomLevel: number
  minZoom: number
  maxZoom: number
  selectedSegmentId: string | null
  isLoading: boolean
  error: string | null

  setSegments: (segments: VideoSegment[]) => void
  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  setZoomLevel: (level: number) => void
  setSelectedSegmentId: (id: string | null) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  addSegments: (files: File[]) => Promise<void>
  removeSegment: (id: string) => void
  updateTrim: (id: string, trimStart: number, trimEnd: number) => void

  getTimelineDuration: () => number

  exportProgress: number
  isExporting: boolean
  exportUrl: string | null
  exportVideo: (fps: number, bitrate: number) => Promise<void>
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  segments: [],
  currentTime: 0,
  isPlaying: false,
  zoomLevel: 100,
  minZoom: 10,
  maxZoom: 6000,
  selectedSegmentId: null,
  isLoading: false,
  error: null,
  exportProgress: 0,
  isExporting: false,
  exportUrl: null,

  setSegments: (segments) => set({ segments }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setSelectedSegmentId: (id) => set({ selectedSegmentId: id }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  setZoomLevel: (level) => {
    const { minZoom, maxZoom } = get()
    set({ zoomLevel: clamp(level, minZoom, maxZoom) })
  },

  addSegments: async (files: File[]) => {
    set({ isLoading: true, error: null })
    try {
      const newSegments: VideoSegment[] = []
      const existingCount = get().segments.length

      for (const file of files) {
        const input = new Input({
          formats: ALL_FORMATS,
          source: new BlobSource(file),
        })

        const videoTrack = await input.getPrimaryVideoTrack()
        if (!videoTrack) {
          throw new Error(`文件 ${file.name} 未找到视频轨道`)
        }

        const decodable = await videoTrack.canDecode()
        if (!decodable) {
          throw new Error(`文件 ${file.name} 无法解码`)
        }

        const duration = (await videoTrack.computeDuration()) || 0
        if (duration <= 0) {
          throw new Error(`文件 ${file.name} 未找到有效时长`)
        }

        const videoWidth = videoTrack.displayWidth || 640
        const videoHeight = videoTrack.displayHeight || 480
        const packetStats = await videoTrack.computePacketStats(50)
        const frameRate = packetStats.averagePacketRate || 30

        const videoSink = new VideoSampleSink(videoTrack)

        const audioTrack = await input.getPrimaryAudioTrack()
        let audioSink: AudioBufferSink | null = null
        if (audioTrack) {
          audioSink = new AudioBufferSink(audioTrack)
        }

        newSegments.push({
          id: `seg-${existingCount + newSegments.length}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          input,
          videoTrack,
          audioTrack,
          videoSink,
          audioSink,
          duration,
          trimStart: 0,
          trimEnd: duration,
          width: videoWidth,
          height: videoHeight,
          frameRate,
        })
      }

      set({
        segments: [...get().segments, ...newSegments],
        isLoading: false,
        zoomLevel: 100,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载视频失败',
        isLoading: false,
      })
    }
  },

  removeSegment: (id) => {
    set((state) => ({
      segments: state.segments.filter((s) => s.id !== id),
      selectedSegmentId:
        state.selectedSegmentId === id ? null : state.selectedSegmentId,
    }))
  },

  updateTrim: (id, trimStart, trimEnd) => {
    set((state) => ({
      segments: state.segments.map((seg) =>
        seg.id === id
          ? {
              ...seg,
              trimStart: clamp(trimStart, 0, trimEnd - 0.5),
              trimEnd: clamp(trimEnd, trimStart + 0.5, seg.duration),
            }
          : seg
      ),
    }))
  },

  getTimelineDuration: () => {
    return getTimelineDuration(get().segments)
  },

  exportVideo: async (fps, bitrate) => {
    const { segments } = get()
    if (segments.length === 0) return

    set({ isExporting: true, exportProgress: 0, error: null })

    try {
      const outputWidth = segments[0].width
      const outputHeight = segments[0].height

      const offscreenCanvas = new OffscreenCanvas(outputWidth, outputHeight)
      const ctx = offscreenCanvas.getContext('2d')
      if (!ctx) throw new Error('无法获取画布上下文')

      const videoSource = new CanvasSource(offscreenCanvas, {
        codec: 'avc',
        bitrate,
      })

      const audioSource = new AudioBufferSource({
        codec: 'aac',
        bitrate: QUALITY_HIGH,
      })

      const target = new BufferTarget()
      const output = new Output({
        target,
        format: new Mp4OutputFormat(),
      })

      output.addVideoTrack(videoSource, { frameRate: fps })

      const hasAudio = segments.some((seg) => seg.audioSink !== null)
      if (hasAudio) {
        output.addAudioTrack(audioSource)
      }

      await output.start()

      const frameDuration = 1 / fps
      let totalFrames = 0

      const totalDuration = segments.reduce(
        (sum, seg) => sum + (seg.trimEnd - seg.trimStart),
        0
      )
      const estimatedTotalFrames = Math.ceil(totalDuration * fps)

      for (let segIndex = 0; segIndex < segments.length; segIndex++) {
        const seg = segments[segIndex]

        if (seg.audioSink && hasAudio && seg.audioTrack) {
          const audioTarget = new BufferTarget()
          const audioOutput = new Output({
            target: audioTarget,
            format: new Mp4OutputFormat(),
          })

          const conversion = await Conversion.init({
            input: seg.input,
            output: audioOutput,
            audio: {
              codec: 'aac',
              bitrate: QUALITY_HIGH,
              sampleRate: 48000,
            },
          })

          if (conversion.isValid) {
            await conversion.execute()
            const convertedBuffer = audioTarget.buffer
            if (convertedBuffer) {
              const convertedInput = new Input({
                formats: ALL_FORMATS,
                source: new BlobSource(
                  new Blob([convertedBuffer], { type: 'audio/mp4' })
                ),
              })

              const convertedAudioTrack =
                await convertedInput.getPrimaryAudioTrack()
              if (convertedAudioTrack) {
                const convertedAudioSink = new AudioBufferSink(
                  convertedAudioTrack
                )
                for await (const wrappedBuffer of convertedAudioSink.buffers(
                  seg.trimStart,
                  seg.trimEnd
                )) {
                  await audioSource.add(wrappedBuffer.buffer)
                }
              }
            }
          }
        }

        for await (const sample of seg.videoSink.samples(
          seg.trimStart,
          seg.trimEnd
        )) {
          const previousSegmentsDuration = segments
            .slice(0, segIndex)
            .reduce((sum, s) => sum + (s.trimEnd - s.trimStart), 0)

          const totalTime =
            previousSegmentsDuration + (sample.timestamp - seg.trimStart)

          ctx.clearRect(0, 0, outputWidth, outputHeight)
          sample.drawWithFit(ctx, { fit: 'contain' })
          sample.close()

          await videoSource.add(totalTime, frameDuration)

          totalFrames++
          set({
            exportProgress: Math.min(
              (totalFrames / estimatedTotalFrames) * 100,
              99
            ),
          })
        }
      }

      videoSource.close()
      if (hasAudio) {
        audioSource.close()
      }

      await output.finalize()

      const outputBuffer = target.buffer
      if (!outputBuffer) {
        throw new Error('输出缓冲区为空')
      }

      const outputBlob = new Blob([outputBuffer], { type: 'video/mp4' })
      const url = URL.createObjectURL(outputBlob)

      set({
        isExporting: false,
        exportProgress: 100,
        exportUrl: url,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '导出失败',
        isExporting: false,
      })
    }
  },
}))
