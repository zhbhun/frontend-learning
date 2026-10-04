/**
 * 范例介绍：演示 manifest version 字段的校验与「逐位比较」规则。
 * 输入 / 前置状态：两串版本号文本——「线上版本」模拟商店当前已发布的
 * version，「候选版本」模拟准备提交的新 manifest 的 version。
 * 主要操作：修改任一侧文本，观察分段、逐位比较轨迹与结论。
 * 预期结果：格式规则为 1-4 段点分整数、每段 0-65535、非零段无前导零、
 * 不得全零；比较从左往右逐位进行、缺位按 0，第一个分出大小的位置定胜负；
 * 候选严格大于线上版本才可以提交，相同或更旧会被拒绝。
 * 阅读主线：上两行是版本分段，中间是逐位比较轨迹，底部是结论横幅。
 */
export interface VersionOptions {
  currentVersion: string;
  candidateVersion: string;
}

export interface VersionInstance {
  element: HTMLElement;
  update(options: VersionOptions): void;
  snapshot(): Array<[string, string]>;
  dispose(): void;
}

// manifest version 的段数与取值范围（与官方字段参考一致）
const MAX_SEGMENTS = 4;
const MAX_SEGMENT = 65535;

interface ParsedVersion {
  valid: boolean;
  reason: string;
  segments: number[];
}

// 解析 manifest version：返回是否合法、不合法的原因与分段值
function parseVersion(raw: string): ParsedVersion {
  const invalid = (reason: string): ParsedVersion => ({
    valid: false,
    reason,
    segments: [],
  });

  const text = raw.trim();
  if (text.length === 0) {
    return invalid('版本号为空');
  }

  const parts = text.split('.');
  if (parts.length > MAX_SEGMENTS) {
    return invalid(`共 ${parts.length} 段，超出 1-4 段`);
  }

  const segments: number[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const label = `第 ${index + 1} 段「${part}」`;
    if (!/^\d+$/.test(part)) {
      return invalid(`${label} 不是非负整数`);
    }
    if (part.length > 1 && part.startsWith('0')) {
      return invalid(`${label} 含前导零`);
    }
    const value = Number(part);
    if (value > MAX_SEGMENT) {
      return invalid(`${label} 超出 0-65535`);
    }
    segments.push(value);
  }

  if (segments.every((value) => value === 0)) {
    return invalid('各段不能全为 0');
  }

  return { valid: true, reason: '', segments };
}

type Order = 'newer' | 'same' | 'older';

interface Comparison {
  order: Order;
  lines: string[];
  decidedAt: number;
}

// 逐位比较：从左往右、缺位按 0，第一个分出大小的位置定胜负
function compareVersions(
  current: number[],
  candidate: number[],
): Comparison {
  const lines: string[] = [];
  let order: Order = 'same';
  let decidedAt = 0;

  for (let index = 0; index < MAX_SEGMENTS; index += 1) {
    const currentSegment: number | undefined = current[index];
    const candidateSegment: number | undefined = candidate[index];
    const currentValue = currentSegment ?? 0;
    const candidateValue = candidateSegment ?? 0;
    const missing =
      currentSegment === undefined || candidateSegment === undefined;
    const suffix = missing ? '（缺位按 0）' : '';

    if (currentValue === candidateValue) {
      lines.push(
        `第 ${index + 1} 段：${currentValue} = ${candidateValue}${suffix}`,
      );
      continue;
    }

    order = candidateValue > currentValue ? 'newer' : 'older';
    decidedAt = index + 1;
    lines.push(
      `第 ${index + 1} 段：${currentValue} vs ${candidateValue} → ${
        order === 'newer' ? '候选更大' : '候选更小'
      }，右侧不参与`,
    );
    break;
  }

  if (decidedAt === 0) {
    lines.push('四位全部相等（缺位按 0）→ 候选不构成更新');
  }

  return { order, lines, decidedAt };
}

interface Verdict {
  tone: 'ok' | 'bad' | 'warn';
  text: string;
}

interface DemoResult {
  current: ParsedVersion;
  candidate: ParsedVersion;
  comparison: Comparison;
  verdict: Verdict;
  traceLines: string[];
}

// 一次完整判断：先各自校验格式，都合法才进入逐位比较
function evaluate(currentText: string, candidateText: string): DemoResult {
  const current = parseVersion(currentText);
  const candidate = parseVersion(candidateText);
  const tooInvalid: Comparison = { order: 'same', lines: [], decidedAt: 0 };

  if (!current.valid) {
    return {
      current,
      candidate,
      comparison: tooInvalid,
      verdict: {
        tone: 'warn',
        text: `无法比较：线上版本不合法（${current.reason}）`,
      },
      traceLines: ['版本号不合法，不进入逐位比较'],
    };
  }
  if (!candidate.valid) {
    return {
      current,
      candidate,
      comparison: tooInvalid,
      verdict: {
        tone: 'warn',
        text: `无法提交：候选版本不合法（${candidate.reason}）`,
      },
      traceLines: ['版本号不合法，不进入逐位比较'],
    };
  }

  const comparison = compareVersions(current.segments, candidate.segments);
  let verdict: Verdict;
  if (comparison.order === 'newer') {
    verdict = { tone: 'ok', text: '可以提交：候选严格大于线上版本' };
  } else if (comparison.order === 'older') {
    verdict = { tone: 'bad', text: '会被拒绝：候选早于线上版本' };
  } else {
    verdict = {
      tone: 'bad',
      text: '会被拒绝：与线上版本相同（缺位按 0）',
    };
  }

  return { current, candidate, comparison, verdict, traceLines: comparison.lines };
}

const STYLE_ID = 'version-check-style';

const STYLE = `
.vc-stage {
  aspect-ratio: auto;
  min-height: 460px;
  padding: 34px 16px 104px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.vc-head {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}
.vc-row {
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
  padding: 12px 14px;
}
.vc-row-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.vc-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}
.vc-raw {
  font: 13px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
}
.vc-badge {
  margin-left: auto;
  padding: 1px 8px;
  border-radius: 999px;
  font: 10px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.vc-badge--ok { background: #dcfce7; color: #166534; }
.vc-badge--bad { background: #fee2e2; color: #b91c1c; }
.vc-reason {
  margin-top: 2px;
  font: 11px/1.6 ui-sans-serif, system-ui, sans-serif;
  color: #b91c1c;
}
.vc-segments {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.vc-segment {
  min-width: 34px;
  text-align: center;
  padding: 4px 8px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #f1f5f9;
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
}
.vc-segment--decided {
  border-color: #4f7cff;
  background: #e0e9ff;
  color: #1d4ed8;
  font-weight: 700;
}
.vc-segment--missing {
  color: #94a3b8;
  background: #ffffff;
  border-style: dashed;
}
.vc-trace {
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.vc-trace-line {
  font: 12px/1.8 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #334155;
  white-space: pre-wrap;
}
.vc-trace-line--decided {
  color: #1d4ed8;
  font-weight: 700;
}
.vc-verdict {
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 700;
}
.vc-verdict--ok { background: #dcfce7; color: #166534; }
.vc-verdict--bad { background: #fee2e2; color: #b91c1c; }
.vc-verdict--warn { background: #fef3c7; color: #92400e; }
.vc-note {
  color: #64748b;
  font-size: 12px;
}
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = el('style', undefined, STYLE);
  style.id = STYLE_ID;
  document.head.append(style);
}

export function createVersionCheck(): VersionInstance {
  ensureStyles();

  const root = el('div', 'vc-stage');

  // 线上版本一行：原文、合法性徽标、分段
  const currentRow = el('div', 'vc-row');
  const currentTitle = el('div', 'vc-row-title');
  const currentLabel = el('span', 'vc-label', '线上版本（已发布）');
  const currentRaw = el('span', 'vc-raw', '1.2.0');
  const currentBadge = el('span', 'vc-badge vc-badge--ok', '合法');
  const currentReason = el('div', 'vc-reason');
  const currentSegments = el('div', 'vc-segments');
  currentTitle.append(currentLabel, currentRaw, currentBadge);
  currentRow.append(currentTitle, currentReason, currentSegments);

  // 候选版本一行
  const candidateRow = el('div', 'vc-row');
  const candidateTitle = el('div', 'vc-row-title');
  const candidateLabel = el('span', 'vc-label', '候选版本（准备提交）');
  const candidateRaw = el('span', 'vc-raw', '1.1.9.9999');
  const candidateBadge = el('span', 'vc-badge vc-badge--ok', '合法');
  const candidateReason = el('div', 'vc-reason');
  const candidateSegments = el('div', 'vc-segments');
  candidateTitle.append(candidateLabel, candidateRaw, candidateBadge);
  candidateRow.append(candidateTitle, candidateReason, candidateSegments);

  // 逐位比较轨迹
  const trace = el('div', 'vc-trace');
  const traceTitle = el('div', 'vc-head', '逐位比较（从左往右，缺位按 0）');
  trace.append(traceTitle);

  // 结论横幅
  const verdict = el('div', 'vc-verdict vc-verdict--ok', '可以提交');
  const note = el(
    'div',
    'vc-note',
    '规则与 manifest version 字段参考一致：1-4 段点分整数，每段 0-65535，非零段无前导零，不得全零。',
  );

  root.append(currentRow, candidateRow, trace, verdict, note);

  let options: VersionOptions = {
    currentVersion: '1.2.0',
    candidateVersion: '1.1.9.9999',
  };

  // 分段渲染：合法版本逐段成 chip、缺位显示占位，分出胜负的段位高亮；
  // 不合法时直接展示输入的各段，让读者看到错的是哪一段
  function renderSegments(
    host: HTMLElement,
    parsed: ParsedVersion,
    rawText: string,
    decidedAt: number,
  ): void {
    host.replaceChildren();

    if (!parsed.valid) {
      const parts = rawText.split('.');
      if (parts.length > MAX_SEGMENTS) {
        host.append(
          el(
            'span',
            'vc-segment vc-segment--missing',
            `${parts.length} 段，超出上限`,
          ),
        );
        return;
      }
      parts.forEach((part) => {
        host.append(
          el(
            'span',
            'vc-segment vc-segment--missing',
            part.trim() === '' ? '空段' : part,
          ),
        );
      });
      return;
    }

    parsed.segments.forEach((value, index) => {
      host.append(
        el(
          'span',
          decidedAt === index + 1
            ? 'vc-segment vc-segment--decided'
            : 'vc-segment',
          String(value),
        ),
      );
    });
    for (let index = parsed.segments.length; index < MAX_SEGMENTS; index += 1) {
      host.append(
        el(
          'span',
          decidedAt === index + 1
            ? 'vc-segment vc-segment--decided'
            : 'vc-segment vc-segment--missing',
          '缺位',
        ),
      );
    }
  }

  function render(): void {
    const result = evaluate(options.currentVersion, options.candidateVersion);

    currentRaw.textContent = options.currentVersion.trim() || '（空）';
    candidateRaw.textContent = options.candidateVersion.trim() || '（空）';

    currentBadge.textContent = result.current.valid ? '合法' : '不合法';
    currentBadge.className = `vc-badge vc-badge--${
      result.current.valid ? 'ok' : 'bad'
    }`;
    currentReason.textContent = result.current.valid
      ? ''
      : result.current.reason;

    candidateBadge.textContent = result.candidate.valid ? '合法' : '不合法';
    candidateBadge.className = `vc-badge vc-badge--${
      result.candidate.valid ? 'ok' : 'bad'
    }`;
    candidateReason.textContent = result.candidate.valid
      ? ''
      : result.candidate.reason;

    renderSegments(
      currentSegments,
      result.current,
      options.currentVersion.trim(),
      result.comparison.decidedAt,
    );
    renderSegments(
      candidateSegments,
      result.candidate,
      options.candidateVersion.trim(),
      result.comparison.decidedAt,
    );

    // 轨迹：比较在分出胜负处截断，最后一行即分出胜负的那一段
    trace.replaceChildren();
    trace.append(traceTitle);
    result.traceLines.forEach((line, index) => {
      const isLast = index === result.traceLines.length - 1;
      const isDecided = isLast && result.comparison.decidedAt > 0;
      trace.append(
        el(
          'div',
          isDecided ? 'vc-trace-line vc-trace-line--decided' : 'vc-trace-line',
          line,
        ),
      );
    });

    verdict.textContent = result.verdict.text;
    verdict.className = `vc-verdict vc-verdict--${result.verdict.tone}`;
  }

  render();

  return {
    element: root,
    update(next: VersionOptions) {
      options = next;
      render();
    },
    snapshot(): Array<[string, string]> {
      const result = evaluate(options.currentVersion, options.candidateVersion);
      return [
        [
          '线上版本',
          `${options.currentVersion.trim()}（${
            result.current.valid
              ? '合法'
              : `不合法：${result.current.reason}`
          }）`,
        ],
        [
          '候选版本',
          `${options.candidateVersion.trim()}（${
            result.candidate.valid
              ? '合法'
              : `不合法：${result.candidate.reason}`
          }）`,
        ],
        ['逐位比较', result.traceLines[result.traceLines.length - 1] ?? ''],
        ['结论', result.verdict.text],
      ];
    },
    dispose() {
      // 没有定时器或全局监听，节点移除后随 DOM 一起回收
    },
  };
}
