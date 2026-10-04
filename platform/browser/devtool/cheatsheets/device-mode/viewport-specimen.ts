/**
 * 范例介绍：「响应式标本」——一个只对自身容器宽度敏感的经典三栏页面。
 * 输入与前置：无网络依赖。Controls「标本宽度」把标本容器固定为指定 CSS 像素
 *   宽（0 = 自适应，跟随 Docs 页面流式排布）；真正改变整页视口的是读者在
 *   DevTools 里开启的 Device Mode。两条路都会在 readout 留下真实读数。
 * 主要操作：拖动 Controls 滑块或在 Device Mode 里拖视口宽度；切 Device Type
 *   后点触摸测试区；在 Sensors 面板选 Location 后点「获取定位」、拖动
 *   Orientation 模型。
 * 预期结果：readout 显示标本实际宽度、按容器宽判定的断点名、按视口判定的
 *   matchMedia('(min-width: 768px)') 结果、devicePixelRatio 与触摸能力；
 *   触摸测试区记录页面真实收到的事件序列；定位与朝向读数反映 Sensors 的
 *   覆盖值。标本不伪造「手机视角」——显示的就是页面真实收到的输入与读数。
 * 阅读主线：syncEnvironment() → render()；传感器证据走 geoButton →
 *   navigator.geolocation.getCurrentPosition 与 window 的 deviceorientation
 *   监听。
 */

/** 标本自身的响应断点：容器宽达到它塌缩/展开布局。与媒体查询读数共用同一个数值。 */
const BREAKPOINT_PX = 768;

/** 最近事件日志保留条数：足够覆盖一次完整点按的 pointer / touch / mouse / click 序列。 */
const EVENT_LOG_LIMIT = 6;

/** 环境能力（devicePixelRatio、触摸支持）没有对应事件，轮询刷新读数。 */
const POLL_INTERVAL_MS = 1000;

export interface ViewportSpecimenOptions {
  /** 0 = 自适应（跟随 Docs 容器流式排布）；大于 0 = 固定为该 CSS 像素宽。 */
  specimenWidth: number;
}

export interface ViewportSpecimenInstance {
  update(options: ViewportSpecimenOptions): void;
  dispose(): void;
}

/** GeolocationPositionError.code 的中文判读，与正文「常见问题」一一对应。 */
const GEO_ERROR_LABELS: Record<number, string> = {
  1: '权限被拒',
  2: '位置不可用',
  3: '超时',
};

const SPECIMEN_STYLES = `
.viewport-specimen {
  margin: 0 auto;
  padding: 14px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #f4f7fc;
  color: #334155;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.viewport-specimen__body {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.viewport-specimen__main {
  flex: 1 1 360px;
  min-width: 0;
  display: grid;
  gap: 10px;
  align-content: start;
}
.viewport-specimen__title {
  margin: 0;
  font-weight: 700;
  color: #172033;
}
.viewport-specimen__cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
/* 布局由 JS 按「测得的容器宽」切换 data-bp，读数与布局共用同一判定，不会漂移。 */
.viewport-specimen__cards[data-bp='mobile'] {
  grid-template-columns: 1fr;
}
.viewport-specimen__card {
  display: grid;
  place-items: center;
  min-height: 52px;
  padding: 12px 8px;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
}
.viewport-specimen__card[data-card='nav'] {
  background: #dbe7ff;
  color: #2b4a7a;
}
.viewport-specimen__card[data-card='content'] {
  border: 1px solid #dbe3f0;
  background: #ffffff;
  color: #334155;
}
.viewport-specimen__card[data-card='aside'] {
  background: #e7f0e4;
  color: #3f5c38;
}
/* touch-action: none 让触摸拖动留在测试区，不被 Docs 页面滚动接管。 */
.viewport-specimen__pad {
  padding: 16px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: #ffffff;
  color: #5d6f8a;
  font-size: 12px;
  text-align: center;
  cursor: pointer;
  user-select: none;
  touch-action: none;
}
.viewport-specimen__sensors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  color: #5d6f67;
  font-size: 12px;
}
.viewport-specimen__geo {
  padding: 4px 12px;
  border: 1px solid #b9c6e0;
  border-radius: 6px;
  background: #f6f8fb;
  color: #334155;
  font: 12px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.viewport-specimen__hint {
  margin: 10px 0 0;
  color: #5d6f67;
  font-size: 12px;
}
.viewport-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.viewport-specimen__readout {
  flex: 1 1 280px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-content: start;
  margin: 0;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.viewport-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.viewport-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
  word-break: break-all;
}
.viewport-specimen__readout dd[data-warn='true'] {
  color: #b45309;
}
`;

export function createViewportSpecimen(
  root: HTMLElement,
): ViewportSpecimenInstance {
  root.classList.add('viewport-specimen');
  root.innerHTML = `
    <div class="viewport-specimen__body">
      <div class="viewport-specimen__main">
        <p class="viewport-specimen__title">响应式标本 · 导航 / 内容 / 侧栏</p>
        <div class="viewport-specimen__cards" data-bp="desktop">
          <div class="viewport-specimen__card" data-card="nav">导航</div>
          <div class="viewport-specimen__card" data-card="content">内容</div>
          <div class="viewport-specimen__card" data-card="aside">侧栏</div>
        </div>
        <div class="viewport-specimen__pad" role="button" tabindex="0">
          触摸测试区 · 在这里点按或拖动
        </div>
        <div class="viewport-specimen__sensors">
          <button class="viewport-specimen__geo" type="button">获取定位</button>
          <span data-cell="geo">（未获取）</span>
          <span data-cell="orient">（未收到 deviceorientation 事件）</span>
        </div>
        <p class="viewport-specimen__hint">
          在本页打开 DevTools：顶栏 <code>Toggle device toolbar</code> 拖动视口宽度对照断点；
          <code>More tools → Sensors</code> 改位置与朝向后，再点「获取定位」；
          <code>Network conditions</code> 改 User agent。readout 的「断点（容器）」与
          「媒体查询（视口）」是两把不同的尺。
        </p>
      </div>
      <dl class="viewport-specimen__readout">
        <dt>标本宽度</dt><dd data-cell="width">—</dd>
        <dt>断点（容器）</dt><dd data-cell="bp">—</dd>
        <dt>媒体查询（视口）</dt><dd data-cell="mq">—</dd>
        <dt>devicePixelRatio</dt><dd data-cell="dpr">—</dd>
        <dt>触摸支持</dt><dd data-cell="touch">—</dd>
        <dt>最近事件</dt><dd data-cell="events">—</dd>
      </dl>
    </div>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const cards = root.querySelector('.viewport-specimen__cards') as HTMLElement;
  const cells = {
    width: root.querySelector('[data-cell="width"]') as HTMLElement,
    bp: root.querySelector('[data-cell="bp"]') as HTMLElement,
    mq: root.querySelector('[data-cell="mq"]') as HTMLElement,
    dpr: root.querySelector('[data-cell="dpr"]') as HTMLElement,
    touch: root.querySelector('[data-cell="touch"]') as HTMLElement,
    events: root.querySelector('[data-cell="events"]') as HTMLElement,
    geo: root.querySelector('[data-cell="geo"]') as HTMLElement,
    orient: root.querySelector('[data-cell="orient"]') as HTMLElement,
  };

  /** 只在值变化时写 DOM；轮询与高频事件都靠它降噪。 */
  function setText(cell: HTMLElement, text: string, warn = false): void {
    if (cell.textContent !== text) {
      cell.textContent = text;
    }
    const nextWarn = warn ? 'true' : 'false';
    if (cell.dataset.warn !== nextWarn) {
      cell.dataset.warn = nextWarn;
    }
  }

  function touchSupportText(): string {
    const points = navigator.maxTouchPoints || 0;
    const hasOntouchstart =
      'ontouchstart' in window || 'ontouchstart' in document.documentElement;
    return `maxTouchPoints ${points} · ${hasOntouchstart ? '有 ontouchstart' : '无 ontouchstart'}`;
  }

  /** 环境读数：宽度与断点按容器（ResizeObserver 驱动），其余按真实能力轮询。 */
  function syncEnvironment(): void {
    const width = Math.round(root.clientWidth);

    setText(cells.width, `${width} px`);
    setText(
      cells.bp,
      width >= BREAKPOINT_PX
        ? `desktop（≥ ${BREAKPOINT_PX}）· 三栏`
        : `mobile（< ${BREAKPOINT_PX}）· 单栏`,
    );

    const query = window.matchMedia(`(min-width: ${BREAKPOINT_PX}px)`);
    setText(
      cells.mq,
      query.matches
        ? `命中 · 视口 ≥ ${BREAKPOINT_PX}px`
        : `未命中 · 视口 < ${BREAKPOINT_PX}px`,
    );
    setText(cells.dpr, String(window.devicePixelRatio));
    setText(cells.touch, touchSupportText());
  }

  function render(): void {
    const width = Math.round(root.clientWidth);
    cards.dataset.bp = width >= BREAKPOINT_PX ? 'desktop' : 'mobile';
  }

  function sync(): void {
    render();
    syncEnvironment();
  }

  /* —— 容器宽度证据链：ResizeObserver 驱动布局与读数 —— */
  const resizeObserver = new ResizeObserver(sync);
  resizeObserver.observe(root);

  /* —— 视口证据链：媒体查询翻转时立即刷新（拖 Device Mode 视口时走这里） —— */
  const mediaQuery = window.matchMedia(`(min-width: ${BREAKPOINT_PX}px)`);
  mediaQuery.addEventListener('change', sync);

  /* —— 触摸证据链：记录页面真实收到的事件类型（新 → 旧），不用模拟值 —— */
  const eventLog: string[] = [];
  const pad = root.querySelector('.viewport-specimen__pad') as HTMLElement;
  for (const type of [
    'pointerdown',
    'touchstart',
    'touchend',
    'mousedown',
    'mouseup',
    'click',
  ] as const) {
    pad.addEventListener(type, () => {
      eventLog.unshift(type);
      if (eventLog.length > EVENT_LOG_LIMIT) {
        eventLog.length = EVENT_LOG_LIMIT;
      }
      setText(cells.events, eventLog.join(' › '));
      /* 能力可能随 Device Type 切换变化，事件到来时顺带重查。 */
      syncEnvironment();
    });
  }

  /* —— 定位证据链：显示 Sensors 覆盖值（未开覆盖时是真实位置） —— */
  const geoButton = root.querySelector('.viewport-specimen__geo') as HTMLElement;
  geoButton.addEventListener('click', () => {
    if (!('geolocation' in navigator)) {
      setText(cells.geo, '当前环境不支持 Geolocation', true);
      return;
    }
    setText(cells.geo, '获取中…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setText(
          cells.geo,
          `纬 ${latitude.toFixed(4)} · 经 ${longitude.toFixed(4)}（±${Math.round(accuracy)} m）`,
        );
      },
      (error) => {
        const label = GEO_ERROR_LABELS[error.code] ?? `code ${error.code}`;
        setText(cells.geo, `错误 ${error.code} · ${label}`, true);
      },
      { timeout: 10_000, maximumAge: 0 },
    );
  });

  /* —— 朝向证据链：Sensors 面板覆盖 Orientation 后 deviceorientation 事件到货 —— */
  let orientationRaf = 0;
  function paintOrientation(event: DeviceOrientationEvent): void {
    const alpha = event.alpha === null ? 'null' : event.alpha.toFixed(0);
    const beta = event.beta === null ? 'null' : event.beta.toFixed(0);
    const gamma = event.gamma === null ? 'null' : event.gamma.toFixed(0);
    setText(cells.orient, `朝向 α ${alpha} · β ${beta} · γ ${gamma}`);
  }
  function onDeviceOrientation(event: DeviceOrientationEvent): void {
    if (orientationRaf) {
      return;
    }
    orientationRaf = requestAnimationFrame(() => {
      orientationRaf = 0;
      paintOrientation(event);
    });
  }
  window.addEventListener('deviceorientation', onDeviceOrientation);

  /* —— 能力轮询：devicePixelRatio 与触摸支持没有对应事件 —— */
  const pollId = window.setInterval(syncEnvironment, POLL_INTERVAL_MS);

  return {
    update(options) {
      /* Controls 只改标本自己的容器宽；整页视口归读者开启的 Device Mode 管。 */
      root.style.maxWidth =
        options.specimenWidth > 0 ? `${options.specimenWidth}px` : '';
      sync();
    },
    dispose() {
      resizeObserver.disconnect();
      mediaQuery.removeEventListener('change', sync);
      window.removeEventListener('deviceorientation', onDeviceOrientation);
      window.clearInterval(pollId);
      if (orientationRaf) {
        cancelAnimationFrame(orientationRaf);
        orientationRaf = 0;
      }
    },
  };
}
