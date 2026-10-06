/**
 * 范例：语音合成的最小闭环——加载 TTS 管线、文本合成、波形渲染与 <audio> 播放。
 *
 * - 前置状态：首次运行需从 Hugging Face Hub 下载 q8 量化模型（Xenova/mms-tts-eng，约 36.6 MB），
 *   完成后写入浏览器 Cache；再次加载显著变快。
 * - 输入：Controls 中的「示例文本」（三条英文预置值；该模型族暂无中文模型）。
 * - 操作：等待「状态」从 加载中 变为 就绪，切换示例文本重新合成；点击右下角音频控件播放。
 * - 预期结果：画布渲染合成音频的波形；读数给出 sampling_rate、音频时长与推理用时。
 * - 阅读主线：loadPipeline（加载与 progress_callback）→ synthesize（推理与 RawAudio 输出）→
 *   drawWaveform（波形渲染）→ playWithAudioElement（toBlob → <audio> 播放）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，这里按官方 README 的 CDN 用法加载浏览器构建；
// npm 项目请改用：import { pipeline } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：MMS-TTS 英语（VITS 架构，单说话人），q8 权重约 36.6 MB，采样率 16000。
// 不需要 speaker_embeddings，也没有额外 vocoder——是 v4.3.0 注册表内体积最小的语音模型。
const MODEL_ID = 'Xenova/mms-tts-eng';

export type TtsStatus = 'loading' | 'running' | 'ready' | 'error';

export interface TtsPipelineOptions {
  text: string;
}

export interface TtsSnapshot {
  status: TtsStatus;
  message: string;
  samplingRate: number | null;
  durationSeconds: string | null;
  inferSeconds: string | null;
}

export interface TtsInstance {
  update(options: TtsPipelineOptions): void;
  dispose(): void;
}

/** text-to-audio 管线的输出：RawAudio 实例（v4 起），字段加一个 toBlob 便捷方法 */
interface RawAudioLike {
  audio: Float32Array;
  sampling_rate: number;
  toBlob(): Blob;
}

/** 管线推理函数的最小形态：传一段文本，Promise 返回 RawAudio */
type TtsPipe = (text: string) => Promise<RawAudioLike>;

export function createTtsPipeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TtsSnapshot) => void,
): TtsInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  // 播放控件挂在共享舞台右下角；<audio controls> 由用户点击播放，不受自动播放策略限制
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.setAttribute('aria-label', '合成结果播放');
  audio.style.position = 'absolute';
  audio.style.right = '12px';
  audio.style.bottom = '12px';
  audio.style.width = '52%';
  audio.style.maxWidth = '340px';
  audio.style.display = 'none';
  canvas.insertAdjacentElement('afterend', audio);

  let currentText = 'Hello, my dog is cute.';
  let status: TtsStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型…';
  let downloadProgress = 0;
  let lastPercent = -1;
  let samples: Float32Array | null = null;
  let samplingRate: number | null = null;
  let durationSeconds: string | null = null;
  let inferSeconds: string | null = null;
  let loadSeconds: string | null = null;
  let pipe: TtsPipe | null = null;
  let loading = false;
  let disposed = false;
  let runToken = 0;
  let audioUrl: string | null = null;

  function snapshot(): TtsSnapshot {
    return { status, message, samplingRate, durationSeconds, inferSeconds };
  }

  // canvas 只画图形状态；readout 表依赖 emit 送出的快照，必须与重绘同步派发
  function draw() {
    render();
    emit(snapshot());
  }

  function render() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('text-to-speech：文本 → 波形 → 播放', 48, 58);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`输入：${truncate(currentText, width - 96)}`, 48, 96);

    if (status === 'loading') {
      // 首次运行的主要等待就是这段下载；不传 progress_callback 时它是完全静默的
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, 128, width - 96, 18);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        128,
        ((width - 96) * Math.min(100, downloadProgress)) / 100,
        18,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, width - 96).forEach((line, index) => {
        drawingContext.fillText(line, 48, 178 + index * 20);
      });
      return;
    }

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, width - 96).forEach((line, index) => {
        drawingContext.fillText(line, 48, 136 + index * 20);
      });
      return;
    }

    if (status === 'running' || samples === null) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, 150);
      return;
    }

    drawWaveform(samples);
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    // 就绪后的提示限制在左半幅，避免与右下角的播放控件重叠
    wrapText(message, width * 0.52).forEach((line, index) => {
      drawingContext.fillText(line, 48, 218 + index * 20);
    });
  }

  /** 波形包络：把样本按列聚合出 min/max，画在画布中部 */
  function drawWaveform(data: Float32Array) {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const bandTop = 122;
    const bandHeight = 76;
    const midY = bandTop + bandHeight / 2;
    const half = bandHeight / 2 - 4;
    const contentWidth = width - 96;

    drawingContext.fillStyle = '#e2e8f0';
    drawingContext.fillRect(48, bandTop, contentWidth, bandHeight);
    drawingContext.fillStyle = '#cbd5e1';
    drawingContext.fillRect(48, midY - 1, contentWidth, 2);

    drawingContext.fillStyle = '#4f7cff';
    const columnCount = Math.floor(contentWidth / 3);
    const perColumn = data.length / columnCount;
    for (let c = 0; c < columnCount; ++c) {
      const start = Math.floor(c * perColumn);
      const end = Math.min(data.length, Math.floor((c + 1) * perColumn));
      let min = 1;
      let max = -1;
      for (let i = start; i < end; ++i) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (min > max) {
        min = 0;
        max = 0;
      }
      const y1 = midY - max * half;
      const y2 = midY - min * half;
      drawingContext.fillRect(48 + c * 3, y1, 2, Math.max(2, y2 - y1));
    }
  }

  async function loadPipeline() {
    if (pipe || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
      const { pipeline } = mod;

      // 实例只创建一次：任务名 'text-to-speech' 是 'text-to-audio' 的别名；
      // 不传 dtype/device 时按环境默认——浏览器 WASM 下即 q8 档位
      pipe = await pipeline('text-to-speech', MODEL_ID, {
        progress_callback: (info: {
          status: string;
          progress?: number;
        }) => {
          if (disposed) {
            return;
          }
          // 事件流：initiate → download → progress（单文件）→ done；
          // v4 另有聚合所有文件的 progress_total；全部就绪后触发一次 ready
          if (info.status === 'progress' || info.status === 'progress_total') {
            const percent = Math.round(info.progress ?? 0);
            if (percent !== lastPercent) {
              lastPercent = percent;
              downloadProgress = percent;
              message = `正在下载模型（q8 约 36.6 MB，仅首次）：${percent}%`;
              draw();
            }
          }
        },
      });
      if (disposed) {
        return;
      }
      status = 'ready';
      loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；刷新页面将命中浏览器缓存`;
      draw();
      void synthesize();
    } catch (error) {
      if (disposed) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `模型加载失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；恢复网络后切换「示例文本」即可重试。`;
      draw();
    } finally {
      loading = false;
    }
  }

  async function synthesize() {
    if (!pipe || disposed) {
      return;
    }
    const runId = ++runToken;
    status = 'running';
    message = '合成中…';
    draw();
    try {
      const startedAt = performance.now();
      // 输出 RawAudio：audio 是 [-1, 1] 的单声道 Float32Array，sampling_rate 决定播放速度
      const out = await pipe(currentText);
      if (disposed || runId !== runToken) {
        return;
      }
      inferSeconds = ((performance.now() - startedAt) / 1000).toFixed(2);
      samples = out.audio;
      samplingRate = out.sampling_rate;
      durationSeconds = (samples.length / out.sampling_rate).toFixed(2);
      playWithAudioElement(out);
      status = 'ready';
      message = `合成完成：点击右下角控件播放，或切换文本重新合成`;
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `合成失败：${detail}`;
      draw();
    }
  }

  /** 播放方案 A：toBlob() 给出 32 位浮点 PCM 的 WAV Blob，交给 <audio> 播放 */
  function playWithAudioElement(out: RawAudioLike) {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    audioUrl = URL.createObjectURL(out.toBlob());
    audio.src = audioUrl;
    audio.style.display = 'block';
  }

  function truncate(text: string, maxWidth: number): string {
    if (drawingContext.measureText(text).width <= maxWidth) {
      return text;
    }
    let cut = text;
    while (cut.length > 0 && drawingContext.measureText(`${cut}…`).width > maxWidth) {
      cut = cut.slice(0, -1);
    }
    return `${cut}…`;
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      const candidate = line + char;
      if (line && drawingContext.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = candidate;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  void loadPipeline();

  return {
    update(options) {
      const textChanged = options.text !== currentText;
      currentText = options.text;
      if (disposed) {
        return;
      }
      if (pipe) {
        // 换文本只触发推理，不重建实例
        if (textChanged) {
          void synthesize();
        } else {
          draw();
        }
      } else if (status === 'error' && textChanged && !loading) {
        // 加载失败后，换文本给一次重试机会
        void loadPipeline();
      } else {
        draw();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        audioUrl = null;
      }
      audio.remove();
      pipe = null;
    },
  };
}
