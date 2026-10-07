/**
 * 范例介绍：模拟「点击深链」在不同平台、不同运行形态下，URL 用哪条路径进入你的代码
 * （真实 Electron 无法在浏览器运行，本模拟复现官方文档行为；真实环境的核对方式见正文快速上手）。
 *
 * 输入与前置状态：控件「平台」选择 macOS / Windows / Linux；「打包应用」与
 * 「注册带入口参数」对应 setAsDefaultProtocolClient 的两种调用形态；「已有实例
 * 持有单实例锁」决定唤起落到谁。
 * 主要操作：点击画布中的深链卡片（myapp://task/42），链路逐步展开。
 * 预期结果：macOS 走 open-url 事件；Windows / Linux 走 argv——有实例时经
 * second-instance 送达首实例；开发模式未生效时暴露「无反应 / 裸 Electron」两种失败。
 * 阅读主线：先在「打包 + 已有实例」上对照三平台差异，再切回开发模式看两个坑。
 */

export type WakePlatform = 'macOS' | 'Windows' | 'Linux';

export interface WakeSimOptions {
  platform: WakePlatform;
  packaged: boolean;
  entryArg: boolean;
  instanceRunning: boolean;
}

export interface WakeSimSnapshot {
  stateText: string;
  target: string;
  received: string;
  windowResult: string;
}

export interface WakeSimInstance {
  update(options: WakeSimOptions): void;
  dispose(): void;
}

interface WakeChain {
  steps: string[];
  target: string;
  received: string;
  windowResult: string;
}

const LINK_TEXT = 'myapp://task/42';
const INITIAL_HINT = '点击深链卡片，观察 URL 走哪条路径进入你的代码';

// 深链卡片与步骤区的布局常量
const CARD_TOP = 56;
const CARD_H = 84;
const STEPS_TOP = 172;
const LINE_H = 20;

export function createWakeSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: WakeSimSnapshot) => void,
): WakeSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let platform: WakePlatform = 'macOS';
  let packaged = true;
  let entryArg = false;
  let instanceRunning = true;
  let chain: WakeChain | null = null;
  let hovered = false;

  // 依据官方文档行为给出链路：注册是否生效、URL 走哪个事件 / 参数、窗口如何响应
  function buildChain(): WakeChain {
    if (!packaged) {
      // 开发模式：注册指向 node_modules 里的 Electron，平台约束分两种
      if (platform === 'macOS') {
        return {
          steps: [
            '注册调用无效：macOS 只能登记 Info.plist 里 CFBundleURLTypes 声明过的协议',
            '开发模式跑的 Electron.app 没有你的 scheme，系统里没有处理程序',
            '浏览器查找 myapp:// 的处理程序：一无所获',
          ],
          target: '无处理程序（注册未生效）',
          received: '否',
          windowResult: '无反应',
        };
      }
      if (!entryArg) {
        const register = platform === 'Windows'
          ? '默认注册把 process.execPath —— node_modules 里的 electron.exe —— 写进注册表'
          : '默认注册把 process.execPath —— node_modules 里的 electron 启动脚本 —— 写进 .desktop';
        return {
          steps: [
            register,
            '深链启动这个可执行文件时不带任何应用参数',
            '跑起来的是裸 Electron 默认应用，你的代码全程没参与',
          ],
          target: '裸 Electron 默认应用',
          received: '否',
          windowResult: '出现裸 Electron 窗口',
        };
      }
      if (instanceRunning) {
        return {
          steps: [
            '注册带入口参数：electron + 入口脚本，新进程运行你的代码',
            'requestSingleInstanceLock() 返回 false：锁已被首实例持有',
            '参数经消息送达首实例，第二进程随即退出',
            '首实例触发 second-instance，argv 里按 scheme 前缀找到 URL',
            'restore + focus 窗口，URL 路由给渲染端',
          ],
          target: '首实例的 second-instance 事件',
          received: '是（argv）',
          windowResult: '聚焦已有窗口并路由',
        };
      }
      return {
        steps: [
          '注册带入口参数：electron + 入口脚本，新进程运行你的代码',
          '进程拿到锁成为首实例，不会有 second-instance',
          'ready 后扫描 process.argv：深链 URL 就在里面',
          '创建窗口后把 argv 里的 URL 路由给渲染端',
        ],
        target: '冷启动 process.argv',
        received: '是（argv）',
        windowResult: '新建窗口并路由',
      };
    }
    // 打包应用：注册在安装 / 打包期完成，运行时注册默认可用
    if (platform === 'macOS') {
      if (instanceRunning) {
        return {
          steps: [
            'macOS 发现应用已在运行：不再启动新进程',
            '系统直接激活已有实例（与点 Dock 图标同一路径）',
            '已有实例触发 open-url 事件，参数就是完整 URL',
            'restore + focus 窗口，webContents.send 路由给渲染端',
          ],
          target: 'open-url 事件（已有实例）',
          received: '是（url 参数）',
          windowResult: '聚焦已有窗口并路由',
        };
      }
      return {
        steps: [
          '系统按 Info.plist 的 CFBundleURLTypes 找到应用并启动它',
          'open-url 事件在启动早期送达（监听必须注册在 ready 之前）',
          '窗口还不存在：先暂存 URL，ready 后创建窗口',
          '窗口加载完成，webContents.send 把 URL 交给渲染端',
        ],
        target: 'open-url 事件（冷启动）',
        received: '是（url 参数）',
        windowResult: '新建窗口并路由',
      };
    }
    if (instanceRunning) {
      return {
        steps: [
          platform === 'Windows'
            ? '注册表指向安装后的可执行文件，系统带 URL 启动新进程'
            : '.desktop 登记指向安装后的可执行文件，系统带 URL 启动新进程',
          'requestSingleInstanceLock() 返回 false：锁已被首实例持有',
          '参数送达首实例，第二进程退出',
          '首实例 second-instance 触发，argv 里找到 URL',
          'restore + focus 窗口，URL 路由给渲染端',
        ],
        target: '首实例的 second-instance 事件',
        received: '是（argv）',
        windowResult: '聚焦已有窗口并路由',
      };
    }
    return {
      steps: [
        platform === 'Windows'
          ? '注册表指向安装后的可执行文件，系统带 URL 启动应用'
          : '.desktop 登记指向安装后的可执行文件，系统带 URL 启动应用',
        '进程拿到锁成为首实例',
        'ready 后扫描 process.argv 找到深链 URL',
        '创建窗口后把 URL 路由给渲染端',
      ],
      target: '冷启动 process.argv',
      received: '是（argv）',
      windowResult: '新建窗口并路由',
    };
  }

  function stateText(): string {
    const parts = [platform, packaged ? '打包应用' : '开发模式'];
    if (!packaged && entryArg) {
      parts.push('注册带入口参数');
    }
    parts.push(instanceRunning ? '已有实例' : '无实例');
    return parts.join(' · ');
  }

  function snapshot(): WakeSimSnapshot {
    return {
      stateText: stateText(),
      target: chain ? chain.target : '—',
      received: chain ? chain.received : '—',
      windowResult: chain ? chain.windowResult : '—',
    };
  }

  function refresh(): void {
    emit(snapshot());
    draw();
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
  }

  function linkRect(width: number): { x: number; y: number; w: number; h: number } {
    const cardW = Math.min(560, width - 120);
    const cardX = (width - cardW) / 2;
    // 卡片内的地址条：仿浏览器窗口，深链文字放在里面
    return { x: cardX + 24, y: CARD_TOP + 44, w: cardW - 48, h: 26 };
  }

  function drawCard(width: number): void {
    const cardW = Math.min(560, width - 120);
    const cardX = (width - cardW) / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cardX, CARD_TOP, cardW, CARD_H, 10);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#dbe3f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, CARD_TOP, cardW, CARD_H, 10);
    ctx.stroke();

    // 浏览器窗口的三个圆点
    ['#f87171', '#fbbf24', '#34d399'].forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cardX + 18 + index * 16, CARD_TOP + 18, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 地址条 + 深链文字（可点击）
    const rect = linkRect(width);
    ctx.fillStyle = hovered ? '#eef3ff' : '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.strokeStyle = hovered ? '#4f7cff' : '#dbe3f0';
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 6);
    ctx.stroke();

    ctx.fillStyle = hovered ? '#3b63e0' : '#4f7cff';
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(LINK_TEXT, rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('浏览器窗口', cardX + cardW / 2, CARD_TOP + CARD_H - 8);
    ctx.textAlign = 'left';
  }

  function drawSteps(width: number): void {
    if (!chain) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(INITIAL_HINT, width / 2, STEPS_TOP + 18);
      ctx.textAlign = 'left';
      return;
    }

    const maxWidth = width - 150;
    let y = STEPS_TOP + 6;
    chain.steps.forEach((step, index) => {
      // 步骤序号
      ctx.fillStyle = '#4f7cff';
      ctx.beginPath();
      ctx.arc(30, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(index + 1), 30, y);
      ctx.textAlign = 'left';

      const lines = wrapText(step, maxWidth - 60);
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      lines.forEach((line, lineIndex) => {
        ctx.fillStyle = index === chain!.steps.length - 1 ? '#172033' : '#334155';
        ctx.fillText(line, 50, y + lineIndex * LINE_H);
      });
      y += lines.length * LINE_H + 12;
    });
  }

  function draw(): void {
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 430;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    ctx.textBaseline = 'middle';

    // 顶部状态行：当前场景组合
    ctx.textAlign = 'left';
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('唤起场景', 20, 28);
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#172033';
    ctx.fillText(stateText(), 90, 28);

    drawCard(width);
    drawSteps(width);

    // 操作提示：右下角（避开左下角读数区）
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('点击深链卡片 = 在浏览器点开一条 myapp:// 链接', width - 20, height - 20);
    ctx.textAlign = 'left';
  }

  function canvasPoint(event: MouseEvent): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function inLinkRect(x: number, y: number): boolean {
    const rect = linkRect(canvas.clientWidth || 640);
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  function onClick(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    if (!inLinkRect(x, y)) {
      return;
    }
    chain = buildChain();
    refresh();
  }

  function onMouseMove(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    const over = inLinkRect(x, y);
    if (over !== hovered) {
      hovered = over;
      draw();
    }
    canvas.style.cursor = over ? 'pointer' : 'default';
  }

  function onMouseLeave(): void {
    if (hovered) {
      hovered = false;
      draw();
    }
    canvas.style.cursor = 'default';
  }

  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  return {
    update(options) {
      platform = options.platform;
      packaged = options.packaged;
      entryArg = options.entryArg;
      instanceRunning = options.instanceRunning;
      // 场景变了，上一条链路不再成立：回到待触发状态
      chain = null;
      hovered = false;
      refresh();
    },
    dispose() {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    },
  };
}
