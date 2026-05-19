import type {
  Input,
  InputVideoTrack,
  InputAudioTrack,
  VideoSampleSink,
  AudioBufferSink,
} from 'mediabunny'

export interface VideoSegment {
  id: string
  file: File
  input: Input
  videoTrack: InputVideoTrack
  audioTrack: InputAudioTrack | null
  videoSink: VideoSampleSink
  audioSink: AudioBufferSink | null
  duration: number
  trimStart: number
  trimEnd: number
  width: number
  height: number
  frameRate: number
}

export interface TickMark {
  position: number
  time: number
  label: string
  isMajor: boolean
}
