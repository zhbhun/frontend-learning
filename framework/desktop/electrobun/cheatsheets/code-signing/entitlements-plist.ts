/**
 * 演示内容：build.mac.entitlements 如何先与 CLI 默认三条逐键合并成 entitlements.plist，
 * 再把其中的隐私类键自动映射成 Info.plist 的用途说明（NS*UsageDescription）。
 * 输入：是否新增 camera / microphone 隐私键（camera 的字符串值即用途文案）、
 *   是否把默认的 allow-jit 显式覆盖为 false。
 * 操作：在 Controls 中勾选隐私键、修改 camera 文案、切换 allow-jit 覆盖。
 * 预期结果：默认状态只有三条 cs.* 键、右侧 Info.plist 为空（cs.* 无隐私映射）；
 *   勾选 camera 后左侧多出 <string> 条目、右侧自动出现 NSCameraUsageDescription；
 *   文案留空则回落到 CLI 的通用默认描述；覆盖 allow-jit 后左侧变 <false/>，
 *   并给出「Bun JIT 运行时需要它」的警告。
 * 阅读主线：DEFAULTS + buildMerged() 复现 CLI 的逐键合并（{...defaults, ...user}），
 *   buildEntitlementsXml() 与 buildUsageEntries() 按 CLI 的
 *   buildEntitlementsFile / generateUsageDescriptions 规则生成两侧 XML。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface EntitlementsOptions {
  addCamera: boolean;
  cameraText: string;
  addMic: boolean;
  overrideJitOff: boolean;
}

export interface EntitlementsSnapshot {
  mergedCount: string;
  usageKeys: string;
  allowJit: string;
  warning: string;
}

export interface EntitlementsInstance {
  update(options: EntitlementsOptions): void;
  dispose(): void;
}

// CLI 默认三条（src/cli/index.ts defaultConfig），注释为源码原意
const DEFAULTS: Array<{ key: string; note: string }> = [
  {
    key: 'com.apple.security.cs.allow-jit',
    note: 'hardened runtime 下运行 Electrobun 应用必需',
  },
  {
    key: 'com.apple.security.cs.allow-unsigned-executable-memory',
    note: 'Bun 运行时动态代码执行与 JIT 编译必需',
  },
  {
    key: 'com.apple.security.cs.disable-library-validation',
    note: '允许加载非同团队签名的动态库',
  },
];

// 隐私类 entitlement → Info.plist 用途说明键（CLI ENTITLEMENT_TO_PLIST_KEY 的本演示子集）
const PRIVACY_MAP: Record<string, string> = {
  'com.apple.security.device.camera': 'NSCameraUsageDescription',
  'com.apple.security.device.microphone': 'NSMicrophoneUsageDescription',
};

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  faint: '#94a3b8',
  plainBorder: '#94a3b8',
  ok: '#4f7cff',
  warn: '#b45309',
  bad: '#d64545',
  boxFill: '#ffffff',
  added: '#166534',
};

type EntitlementValue = boolean | string;

function buildMerged(
  options: EntitlementsOptions,
): Array<{ key: string; value: EntitlementValue; fromDefaults: boolean }> {
  // 与 CLI 的合并语义一致：{ ...defaults, ...user }，逐键覆盖、无法删除默认键
  const merged = new Map<string, { value: EntitlementValue; fromDefaults: boolean }>();
  for (const item of DEFAULTS) {
    merged.set(item.key, { value: true, fromDefaults: true });
  }

  if (options.overrideJitOff) {
    merged.set('com.apple.security.cs.allow-jit', {
      value: false,
      fromDefaults: false,
    });
  }

  if (options.addCamera) {
    const text = options.cameraText.trim();
    merged.set('com.apple.security.device.camera', {
      value: text === '' ? true : text,
      fromDefaults: false,
    });
  }

  if (options.addMic) {
    merged.set('com.apple.security.device.microphone', {
      value: true,
      fromDefaults: false,
    });
  }

  return [...merged.entries()].map(([key, entry]) => ({
    key,
    value: entry.value,
    fromDefaults: entry.fromDefaults,
  }));
}

// 对应 CLI getEntitlementValue：boolean → <true/> / <false/>，string → <string>…</string>
function entitlementValueXml(value: EntitlementValue): string {
  if (typeof value === 'boolean') {
    return `<${value.toString()}/>`;
  }
  return `<string>${value}</string>`;
}

// 对应 CLI generateUsageDescriptions：字符串值即文案；布尔 true 用通用默认文案
function buildUsageEntries(
  merged: Array<{ key: string; value: EntitlementValue }>,
): Array<{ plistKey: string; description: string; sourceKey: string }> {
  const entries: Array<{ plistKey: string; description: string; sourceKey: string }> =
    [];

  for (const item of merged) {
    const plistKey = PRIVACY_MAP[item.key];

    if (plistKey && item.value) {
      const description =
        typeof item.value === 'string'
          ? item.value
          : `This app requires access for ${item.key.split('.').pop()?.replace('-', ' ')}`;
      entries.push({ plistKey, description, sourceKey: item.key });
    }
  }

  return entries;
}

function wrapText(
  text: string,
  maxWidth: number,
  context: CanvasRenderingContext2D,
): string[] {
  if (context.measureText(text).width <= maxWidth) {
    return [text];
  }

  const tokens = text.split(/(?<=\/)|(?<= )/).filter((token) => token !== '');
  const lines: string[] = [];
  let line = '';

  for (const token of tokens) {
    const candidate = line + token;

    if (line && context.measureText(candidate.trimEnd()).width > maxWidth) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line = candidate;
    }
  }

  if (line) {
    lines.push(line.trimEnd());
  }

  return lines;
}

export function createEntitlementsPlist(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EntitlementsSnapshot) => void,
): EntitlementsInstance {
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  const drawingContext: CanvasRenderingContext2D = context;

  let current: EntitlementsOptions = {
    addCamera: true,
    cameraText: '扫描文档并拍摄照片',
    addMic: false,
    overrideJitOff: false,
  };

  function drawPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    borderColor: string,
  ) {
    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = borderColor;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, height, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(title, x + 12, y + 22);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(430, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const merged = buildMerged(current);
    const usageEntries = buildUsageEntries(merged);
    const allowJitOff = current.overrideJitOff;

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('entitlements：合并 → 两个 plist', 24, 38);

    const margin = 24;
    const top = 74;
    const gap = Math.max(20, Math.min(32, width * 0.04));
    const leftWidth = (width - margin * 2 - gap) * 0.56;
    const rightWidth = width - margin * 2 - gap - leftWidth;
    const boxHeight = 280;

    // 左面板：合并后的 entitlements.plist（绿色 = 本次新增/覆盖的键）
    drawPanel(
      margin,
      top,
      leftWidth,
      boxHeight,
      'entitlements.plist（默认三条 + 你的键）',
      COLORS.plainBorder,
    );
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    let leftY = top + 46;
    const leftLine = (text: string, color: string) => {
      drawingContext.fillStyle = color;
      wrapText(text, leftWidth - 24, drawingContext).forEach((wrapped) => {
        drawingContext.fillText(wrapped, margin + 12, leftY);
        leftY += 15;
      });
    };

    leftY += 4;
    leftLine('<dict>', COLORS.faint);
    for (const item of merged) {
      const color = item.fromDefaults ? COLORS.muted : COLORS.added;
      leftLine(`    <key>${item.key}</key>`, color);
      leftLine(`    ${entitlementValueXml(item.value)}`, color);
    }
    leftY += 2;
    leftLine('</dict>', COLORS.faint);

    // 右面板：Info.plist 自动生成的用途说明
    const rightX = margin + leftWidth + gap;
    drawPanel(
      rightX,
      top,
      rightWidth,
      boxHeight,
      'Info.plist 用途说明（自动生成）',
      usageEntries.length > 0 ? COLORS.ok : COLORS.plainBorder,
    );
    let rightY = top + 48;
    const rightLine = (text: string, color: string) => {
      drawingContext.fillStyle = color;
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(text, rightWidth - 24, drawingContext).forEach((wrapped) => {
        drawingContext.fillText(wrapped, rightX + 12, rightY);
        rightY += 15;
      });
    };

    if (usageEntries.length === 0) {
      drawingContext.fillStyle = COLORS.faint;
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        '（cs.* 三条无隐私映射，不进 Info.plist）',
        rightX + 12,
        rightY,
      );
      rightY += 26;
    } else {
      rightY += 4;
      for (const entry of usageEntries) {
        rightLine(`<key>${entry.plistKey}</key>`, COLORS.ok);
        rightLine(`    <string>${entry.description}</string>`, COLORS.ok);
        rightY += 4;
      }
      rightY += 2;
    }
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '用途说明写清「为什么用」，审核与用户体验都受益',
      rightX + 12,
      Math.min(rightY + 6, top + boxHeight - 14),
    );

    // 底部：默认三条的用途注释与 allow-jit 警告
    const bottomY = top + boxHeight + 30;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '默认三条不可删除，只能逐键改值：allow-jit（hardened runtime 运行必需）· allow-unsigned-executable-memory（Bun JIT 必需）· disable-library-validation（加载非同团队 dylib）',
      margin,
      bottomY,
    );

    if (allowJitOff) {
      drawingContext.fillStyle = COLORS.bad;
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        '警告：allow-jit 被覆盖为 false——公证要求的 hardened runtime 下，Bun 运行时的 JIT 将无法工作，签名后的应用无法启动。',
        margin,
        bottomY + 20,
      );
    }

    const usageKeys = usageEntries.map((entry) => entry.plistKey).join('、');
    emit({
      mergedCount: `${merged.length} 条`,
      usageKeys: usageKeys || '无',
      allowJit: allowJitOff ? 'false（已覆盖）' : 'true（默认）',
      warning: allowJitOff
        ? 'allow-jit=false 会破坏 Bun JIT 运行时'
        : '无',
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
