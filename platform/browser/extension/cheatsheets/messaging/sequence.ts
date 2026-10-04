/* 时序图绘制的支撑外壳：泳道、生命线、通道激活条、箭头与标注框，本课两个范例共用。 */

export const SEQ_TONE = {
  ink: '#172033',
  muted: '#475569',
  accent: '#4f7cff',
  ok: '#15803d',
  error: '#b91c1c',
  line: '#94a3b8',
} as const;

export type SeqTone = keyof typeof SEQ_TONE;

export type SeqRow =
  | {
      kind: 'arrow';
      from: 'left' | 'right';
      label: string;
      sub?: string;
      dashed?: boolean;
      tone?: SeqTone;
      inChannel?: boolean;
    }
  | {
      kind: 'note';
      lane: 'left' | 'right';
      lines: string[];
      tone?: SeqTone;
      inChannel?: boolean;
    };

const HEAD_H = 66;
const FOOT_H = 100;

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

function rowHeight(row: SeqRow) {
  if (row.kind === 'note') {
    return 18 + row.lines.length * 16;
  }
  return row.sub ? 34 : 20;
}

export function drawSequence(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  lanes: [string[], string[]],
  rows: SeqRow[],
): void {
  const leftX = Math.max(96, Math.min(170, width * 0.2));
  const rightX = width - leftX;

  context.clearRect(0, 0, width, height);

  const laneWidth = Math.min(178, width - leftX - 24);
  drawLaneBox(context, leftX, laneWidth, lanes[0]);
  drawLaneBox(context, rightX, laneWidth, lanes[1]);

  const natural = rows.reduce((sum, row) => sum + rowHeight(row), 0);
  const available = Math.max(80, height - HEAD_H - FOOT_H);
  const scale = Math.min(1, available / natural);

  const positions: number[] = [];
  let cursor = HEAD_H + 10;
  for (const row of rows) {
    const span = rowHeight(row) * scale;
    positions.push(cursor + span / 2);
    cursor += span;
  }
  const lifelineBottom = cursor + 8;

  context.save();
  context.strokeStyle = SEQ_TONE.line;
  context.lineWidth = 1;
  context.setLineDash([5, 4]);
  for (const laneX of [leftX, rightX]) {
    context.beginPath();
    context.moveTo(laneX, HEAD_H - 10);
    context.lineTo(laneX, lifelineBottom);
    context.stroke();
  }
  context.restore();

  // 连续 inChannel 的行对应通道存活区间：在两条生命线上画半透明激活条
  let runStart = -1;
  for (let index = 0; index <= rows.length; index++) {
    const active = index < rows.length && rows[index].inChannel === true;
    if (active && runStart < 0) {
      runStart = index;
    }
    if (!active && runStart >= 0) {
      const top = positions[runStart] - (rowHeight(rows[runStart]) * scale) / 2;
      const bottom =
        positions[index - 1] + (rowHeight(rows[index - 1]) * scale) / 2;
      for (const laneX of [leftX, rightX]) {
        context.fillStyle = 'rgba(79, 124, 255, 0.16)';
        context.strokeStyle = 'rgba(79, 124, 255, 0.4)';
        roundedRect(context, laneX - 4, top, 8, bottom - top, 3);
        context.fill();
        context.stroke();
      }
      runStart = -1;
    }
  }

  rows.forEach((row, index) => {
    const y = positions[index];
    if (row.kind === 'arrow') {
      drawArrowRow(context, row, y, leftX, rightX, scale);
    } else {
      drawNote(context, row, y, row.lane === 'left' ? leftX : rightX, width, scale);
    }
  });
}

function drawLaneBox(
  context: CanvasRenderingContext2D,
  centerX: number,
  laneWidth: number,
  lines: string[],
) {
  const boxWidth = laneWidth;
  const boxHeight = 40;
  const x = centerX - boxWidth / 2;
  const y = 10;

  context.save();
  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.strokeStyle = '#dbe3f0';
  roundedRect(context, x, y, boxWidth, boxHeight, 6);
  context.fill();
  context.stroke();

  context.textAlign = 'center';
  context.fillStyle = SEQ_TONE.ink;
  context.font = '600 12px ui-sans-serif, system-ui, sans-serif';
  context.fillText(lines[0], centerX, y + 17);
  context.fillStyle = SEQ_TONE.muted;
  context.font = '10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillText(lines[1] ?? '', centerX, y + 32);
  context.restore();
}

function drawArrowRow(
  context: CanvasRenderingContext2D,
  row: Extract<SeqRow, { kind: 'arrow' }>,
  y: number,
  leftX: number,
  rightX: number,
  scale: number,
) {
  const fromX = row.from === 'left' ? leftX + 7 : rightX - 7;
  const toX = row.from === 'left' ? rightX - 8 : leftX + 8;
  const tone = SEQ_TONE[row.tone ?? 'accent'];

  context.save();
  context.strokeStyle = tone;
  context.fillStyle = tone;
  context.lineWidth = 1.4;
  if (row.dashed) {
    context.setLineDash([5, 4]);
  }
  context.beginPath();
  context.moveTo(fromX, y);
  context.lineTo(toX, y);
  context.stroke();
  context.setLineDash([]);

  const direction = toX > fromX ? 1 : -1;
  context.beginPath();
  context.moveTo(toX, y);
  context.lineTo(toX - direction * 8, y - 4);
  context.lineTo(toX - direction * 8, y + 4);
  context.closePath();
  context.fill();

  const label = row.label;
  context.font =
    label.length > 34
      ? '11px ui-sans-serif, system-ui, sans-serif'
      : '600 11.5px ui-sans-serif, system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillStyle = SEQ_TONE[row.tone ?? 'ink'];
  context.fillText(label, (leftX + rightX) / 2, y - 6 - (scale < 0.8 ? 0 : 1));

  if (row.sub) {
    context.fillStyle = SEQ_TONE.muted;
    context.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillText(row.sub, (leftX + rightX) / 2, y + 14);
  }
  context.restore();
}

function drawNote(
  context: CanvasRenderingContext2D,
  row: Extract<SeqRow, { kind: 'note' }>,
  y: number,
  laneX: number,
  width: number,
  scale: number,
) {
  const lineHeight = 15;
  const paddingX = 10;
  const fontSize = scale < 0.8 ? 10.5 : 11.5;

  context.save();
  context.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  const textWidth = Math.max(
    ...row.lines.map((line) => context.measureText(line).width),
  );
  const boxWidth = Math.min(340, textWidth + paddingX * 2);
  const boxHeight = row.lines.length * lineHeight + 12;
  // 标注框以泳道为中心，左缘不够时整体右移，避免被画布裁剪
  const x = Math.max(8, Math.min(laneX - boxWidth / 2, width - boxWidth - 8));
  const centerX = x + boxWidth / 2;
  const boxY = y - boxHeight / 2;

  context.fillStyle = 'rgba(255, 255, 255, 0.92)';
  context.strokeStyle = SEQ_TONE[row.tone ?? 'line'];
  if (!row.tone) {
    context.strokeStyle = '#dbe3f0';
  }
  roundedRect(context, x, boxY, boxWidth, boxHeight, 5);
  context.fill();
  context.stroke();

  context.textAlign = 'center';
  context.fillStyle = SEQ_TONE[row.tone ?? 'ink'];
  row.lines.forEach((line, lineIndex) => {
    context.fillText(line, centerX, boxY + 16 + lineIndex * lineHeight);
  });
  context.restore();
}
