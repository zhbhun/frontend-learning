/* 时间轴绘制的支撑外壳：场景块、泳道、存活条、到点标记、特殊时刻标记与时间刻度，本课两个范例共用。 */

export const TL_TONE = {
  ink: '#172033',
  muted: '#475569',
  accent: '#4f7cff',
  ok: '#15803d',
  warn: '#b45309',
  error: '#b91c1c',
  line: '#94a3b8',
  track: '#e8edf5',
} as const;

export type TimelineTone = keyof typeof TL_TONE;

export interface TimelineBar {
  from: number;
  to: number;
  tone?: TimelineTone;
}

export interface TimelineMark {
  at: number;
  tone?: TimelineTone;
  shape?: 'diamond' | 'circle';
  hollow?: boolean;
  size?: number;
  label?: string;
}

export interface TimelineMarker {
  at: number;
  label: string;
  tone?: TimelineTone;
}

export interface TimelineLane {
  label: string;
  bars?: TimelineBar[];
  marks?: TimelineMark[];
}

export interface TimelineBlock {
  title: string;
  lanes: TimelineLane[];
  markers?: TimelineMarker[];
}

export interface TimelineOptions {
  horizon: number;
  top?: number;
  tickStep: number;
  formatTick?: (seconds: number) => string;
  blocks: TimelineBlock[];
}

const PAD_LEFT = 92;
const PAD_RIGHT = 18;
const TITLE_H = 20;
const LANE_H = 34;
const AXIS_H = 24;
const BLOCK_GAP = 12;

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export function drawTimeline(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: TimelineOptions,
): void {
  const { horizon, tickStep, blocks } = options;
  const top = Math.min(options.top ?? 40, Math.max(0, height - 120));
  const formatTick = options.formatTick ?? ((seconds: number) => `${seconds}s`);
  const trackFrom = PAD_LEFT;
  const trackTo = Math.max(trackFrom + 60, width - PAD_RIGHT);
  const trackWidth = trackTo - trackFrom;
  const x = (seconds: number) =>
    trackFrom +
    (Math.min(Math.max(seconds, 0), horizon) / horizon) * trackWidth;

  context.clearRect(0, 0, width, height);

  let cursor = top;

  for (const block of blocks) {
    context.fillStyle = TL_TONE.ink;
    context.font = '600 12.5px ui-sans-serif, system-ui, sans-serif';
    context.textAlign = 'left';
    context.fillText(block.title, trackFrom, cursor + 14);
    cursor += TITLE_H;

    const lanesBottom = cursor + block.lanes.length * LANE_H;

    for (const marker of block.markers ?? []) {
      const markerX = x(marker.at);
      const tone = TL_TONE[marker.tone ?? 'warn'];
      context.save();
      context.strokeStyle = tone;
      context.lineWidth = 1;
      context.setLineDash([4, 4]);
      context.beginPath();
      context.moveTo(markerX, cursor + 4);
      context.lineTo(markerX, lanesBottom + AXIS_H - 8);
      context.stroke();
      context.restore();

      context.fillStyle = tone;
      context.font = '600 10.5px ui-sans-serif, system-ui, sans-serif';
      const labelWidth = context.measureText(marker.label).width;
      const labelX = Math.min(
        Math.max(markerX + 6, trackFrom),
        trackTo - labelWidth,
      );
      context.fillText(marker.label, labelX, cursor + 30);
    }

    block.lanes.forEach((lane, laneIndex) => {
      const laneTop = cursor + laneIndex * LANE_H;
      const trackY = laneTop + 13;
      const centerY = trackY + 5;

      context.fillStyle = TL_TONE.muted;
      context.font = '11.5px ui-sans-serif, system-ui, sans-serif';
      context.textAlign = 'right';
      context.fillText(lane.label, PAD_LEFT - 10, centerY + 4);

      context.fillStyle = TL_TONE.track;
      roundedRect(context, trackFrom, trackY, trackWidth, 10, 5);
      context.fill();

      for (const bar of lane.bars ?? []) {
        const barX = x(bar.from);
        const barWidth = Math.max(2, x(bar.to) - barX);
        context.fillStyle = TL_TONE[bar.tone ?? 'accent'];
        roundedRect(context, barX, trackY, barWidth, 10, 4);
        context.fill();
      }

      for (const mark of lane.marks ?? []) {
        const markX = x(mark.at);
        const tone = TL_TONE[mark.tone ?? 'accent'];
        const size = mark.size ?? 5;

        context.save();
        if (mark.shape === 'circle') {
          context.beginPath();
          context.arc(markX, centerY, size, 0, Math.PI * 2);
        } else {
          context.beginPath();
          context.moveTo(markX, centerY - size);
          context.lineTo(markX + size, centerY);
          context.lineTo(markX, centerY + size);
          context.lineTo(markX - size, centerY);
          context.closePath();
        }
        if (mark.hollow) {
          context.fillStyle = 'rgba(255, 255, 255, 0.9)';
          context.fill();
          context.strokeStyle = tone;
          context.lineWidth = 1.4;
          context.stroke();
        } else {
          context.fillStyle = tone;
          context.fill();
        }
        context.restore();

        if (mark.label) {
          context.fillStyle = tone;
          context.font = '600 10.5px ui-sans-serif, system-ui, sans-serif';
          const labelWidth = context.measureText(mark.label).width;
          const labelX = Math.min(
            Math.max(markX - labelWidth / 2, trackFrom),
            trackTo - labelWidth,
          );
          context.textAlign = 'left';
          context.fillText(mark.label, labelX, laneTop + 8);
        }
      }
    });

    cursor += block.lanes.length * LANE_H;

    const axisY = cursor + 4;
    context.strokeStyle = TL_TONE.line;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(trackFrom, axisY);
    context.lineTo(trackTo, axisY);
    context.stroke();

    context.fillStyle = TL_TONE.muted;
    context.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.textAlign = 'center';
    for (let t = 0; t <= horizon + 1e-6; t += tickStep) {
      const tickX = x(t);
      context.beginPath();
      context.moveTo(tickX, axisY);
      context.lineTo(tickX, axisY + 4);
      context.stroke();
      context.fillText(formatTick(t), tickX, axisY + 15);
    }

    cursor += AXIS_H + BLOCK_GAP;
  }
}
