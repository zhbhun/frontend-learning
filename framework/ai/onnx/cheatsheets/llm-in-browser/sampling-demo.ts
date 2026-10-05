/**
 * 范例：采样策略示意——同一份写死的示意打分（logits），不同策略选出不同的下一个 token。
 * 机制示意，不是真实大模型：5 个候选与分值写死（上文假设为「……一座灯塔」之后）；
 * 温度缩放 softmax、top-k 截断、top-p 核采样与抽样按定义真实计算（Math.random）。
 * 操作：Controls 切换策略（greedy / temperature / top-k / top-p）与参数；点击画布重新采样。
 * 预期结果：
 *  - greedy 永远选「。」——确定性输出，与官方 chat 示例的 argmax 基线一致；
 *  - temperature 调高后分布变平，低分候选也会被抽中；
 *  - top-k 只在前 k 名内抽、top-p 按累计概率截核；k=1 或 p 很小时都逼近 greedy；
 *  - 被截断的候选以灰条显示。
 * 阅读主线：sampleOnce()（温度缩放 → 截断 → 归一抽样）；画布与读数属于演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type SamplingStrategy = 'greedy' | 'temperature' | 'top-k' | 'top-p';

export const SAMPLING_STRATEGY_LABELS: Record<SamplingStrategy, string> = {
  greedy: 'greedy（argmax）',
  temperature: 'temperature 全局采样',
  'top-k': 'top-k 截断采样',
  'top-p': 'top-p 核采样',
};

export interface SamplingOptions {
  strategy: SamplingStrategy;
  temperature: number;
  topK: number;
  topP: number;
}

interface Candidate {
  label: string;
  score: number;
}

/** 写死的示意打分：上文「……一座灯塔」之后，5 个候选 token 与它们的 logits 分值。 */
const CANDIDATES: Candidate[] = [
  { label: '。', score: 3.4 },
  { label: '的', score: 2.1 },
  { label: '在', score: 1.6 },
  { label: '是', score: 1.2 },
  { label: '里', score: 0.5 },
];

export interface SamplingSnapshot {
  strategy: string;
  parameters: string;
  chosen: string;
  distribution: string;
}

export interface SamplingInstance {
  update(options: SamplingOptions): void;
  dispose(): void;
}

/** 温度缩放 softmax：logits ÷ T 后归一——T 越小分布越尖，越大越平。 */
function softmax(scores: number[], temperature: number): number[] {
  const scaled = scores.map((score) => score / temperature);
  const max = Math.max(...scaled);
  const exps = scaled.map((value) => Math.exp(value - max));
  const sum = exps.reduce((total, value) => total + value, 0);
  return exps.map((value) => value / sum);
}

/** 在允许的候选内按概率抽一个（随机性来自 Math.random）。 */
function drawIndex(probs: number[], allowed: boolean[]): number {
  const total = probs.reduce((sum, p, i) => sum + (allowed[i] ? p : 0), 0);
  let roll = Math.random() * total;
  let lastAllowed = 0;
  for (let i = 0; i < probs.length; ++i) {
    if (!allowed[i]) {
      continue;
    }
    lastAllowed = i;
    roll -= probs[i];
    if (roll <= 0) {
      return i;
    }
  }
  return lastAllowed;
}

export function createSamplingDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SamplingSnapshot) => void,
): SamplingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let options: SamplingOptions = {
    strategy: 'greedy',
    temperature: 0.8,
    topK: 2,
    topP: 0.9,
  };
  let allowed: boolean[] = CANDIDATES.map(() => true);
  let chosenIndex = 0;
  let probs: number[] = [];
  let layout = { width: 620, height: 340 };

  /** 按当前策略与参数算一遍：允许集合 + 温度概率 + 抽样。 */
  function sampleOnce(): void {
    const { strategy, temperature, topK, topP } = options;
    probs = softmax(
      CANDIDATES.map((candidate) => candidate.score),
      temperature,
    );
    allowed = CANDIDATES.map(() => true);

    if (strategy === 'greedy') {
      // 与官方 chat 示例一致：取最大 logit，不看温度、不抽样。
      allowed = CANDIDATES.map(() => false);
      let best = 0;
      CANDIDATES.forEach((candidate, index) => {
        if (candidate.score > CANDIDATES[best].score) {
          best = index;
        }
      });
      allowed[best] = true;
    } else if (strategy === 'top-k') {
      // 只放行分数前 k 名。
      const order = CANDIDATES.map((_, index) => index).sort(
        (a, b) => CANDIDATES[b].score - CANDIDATES[a].score,
      );
      allowed = CANDIDATES.map(() => false);
      for (let i = 0; i < Math.min(topK, order.length); ++i) {
        allowed[order[i]] = true;
      }
    } else if (strategy === 'top-p') {
      // 按分数降序取最小前缀，使累计概率达到 p（至少保留 1 个）。
      const order = CANDIDATES.map((_, index) => index).sort(
        (a, b) => probs[b] - probs[a],
      );
      allowed = CANDIDATES.map(() => false);
      let cumulative = 0;
      for (const index of order) {
        allowed[index] = true;
        cumulative += probs[index];
        if (cumulative >= topP) {
          break;
        }
      }
    }

    chosenIndex = drawIndex(probs, allowed);
  }

  function parameterText(): string {
    const { strategy, temperature, topK, topP } = options;
    if (strategy === 'greedy') {
      return '确定性：直接取最大 logit';
    }
    if (strategy === 'temperature') {
      return `temperature=${temperature.toFixed(1)}（全部候选参选）`;
    }
    if (strategy === 'top-k') {
      return `k=${topK} · temperature=${temperature.toFixed(1)}`;
    }
    return `p=${topP.toFixed(2)} · temperature=${temperature.toFixed(1)}`;
  }

  function emitSnapshot(): void {
    const chosen = CANDIDATES[chosenIndex];
    const distribution = CANDIDATES.map(
      (candidate, index) =>
        `${candidate.label} ${(probs[index] * 100).toFixed(0)}%`,
    ).join(' · ');
    emit({
      strategy: SAMPLING_STRATEGY_LABELS[options.strategy],
      parameters: parameterText(),
      chosen: `「${chosen.label}」（${(probs[chosenIndex] * 100).toFixed(0)}%）`,
      distribution,
    });
  }

  function draw(): void {
    const { width, height } = layout;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('采样：从 logits 到下一个 token（示意打分）', 28, 32);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('候选与分值写死；softmax / 截断 / 抽样按定义真实计算——ort 只给 logits，选择在 JS 侧', 28, 54);

    // 上文与本次选中的 token。
    ctx.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('…… 一座灯塔', 28, 92);
    ctx.fillStyle = '#4f7cff';
    ctx.fillText(CANDIDATES[chosenIndex].label, 148, 92);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('↑ 本次选中的下一个 token（点击画布重新抽样）', 172, 92);

    // 候选条形：高度按温度缩放后的概率；被截断的候选灰显。
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('候选分布（温度缩放后的概率）', 28, 124);
    const barMax = 240;
    const maxProb = Math.max(...probs, 0.0001);
    CANDIDATES.forEach((candidate, index) => {
      const y = 142 + index * 32;
      const kept = allowed[index];
      ctx.fillStyle = kept ? '#172033' : '#94a3b8';
      ctx.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(candidate.label, 28, y + 15);
      ctx.fillStyle = kept ? '#e2e8f0' : '#eef1f5';
      ctx.beginPath();
      ctx.roundRect(56, y, barMax, 20, 4);
      ctx.fill();
      ctx.fillStyle = kept ? '#4f7cff' : '#c3cbd6';
      ctx.beginPath();
      ctx.roundRect(56, y, Math.max(3, barMax * (probs[index] / maxProb)), 20, 4);
      ctx.fill();
      ctx.fillStyle = kept ? '#172033' : '#94a3b8';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(`${(probs[index] * 100).toFixed(0)}%`, 306, y + 15);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(
        kept
          ? index === chosenIndex
            ? '← 选中'
            : `logit ${candidate.score.toFixed(1)}`
          : '已截断',
        356,
        y + 15,
      );
    });

    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      'k=1 或 p 很小时逼近 greedy；temperature 调大后低分候选也会被抽中',
      28,
      height - 12,
    );
  }

  function refresh(): void {
    sampleOnce();
    draw();
    emitSnapshot();
    emitSoon();
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    const size = readCanvasSize(canvas);
    layout = {
      width: Math.max(620, size.width),
      height: 340,
    };
    draw();
  });
  layout = { width: Math.max(620, readCanvasSize(canvas).width), height: 340 };
  canvas.addEventListener('pointerdown', refresh);

  // 共享外壳的读数有 100ms 节流：状态定格后补发一次，确保最终值被绘制。
  let emitTimer = 0;
  function emitSoon(): void {
    window.clearTimeout(emitTimer);
    emitTimer = window.setTimeout(() => {
      draw();
      emitSnapshot();
    }, 130);
  }

  refresh();

  return {
    update(next) {
      options = { ...options, ...next };
      refresh();
    },
    dispose() {
      window.clearTimeout(emitTimer);
      canvas.removeEventListener('pointerdown', refresh);
      resizeObserver.disconnect();
    },
  };
}
