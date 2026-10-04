/**
 * 范例介绍：演示「调试任务 → 面板」的映射，并充当读者练习打开 DevTools 的标本页。
 * 输入或前置状态：Controls 里的「调试任务」下拉框；标本区自带按钮、表单、图片等有辨识度的元素。
 * 主要操作：切换下拉框查看面板映射；在标本区按 F12 或右键元素选 Inspect 打开 DevTools；
 *   用 Ctrl+Shift+J（macOS 为 Cmd+Option+J）打开 Console 后点按钮、提交表单。
 * 预期结果：readout 显示所选任务对应的面板名、所在位置、打开方式与官方一句话说明；
 *   标本区交互会在 Console 打印以 [练习标本] 开头的日志。
 * 阅读主线：面板按调试对象分工——先判断任务属于哪一类，再进对应面板。
 */

export interface PanelMapEntry {
  /** 调试任务，展示在 Controls 下拉框中。 */
  task: string;
  /** 对应面板名（官方英文名）。 */
  panel: string;
  /** 工具所在位置：主面板、抽屉 Drawer 或设备工具栏。 */
  area: string;
  /** 打开方式。 */
  open: string;
  /** 官方文档对该面板的一句话说明。 */
  desc: string;
}

/** 常用「任务 → 面板」映射，说明取自官方 DevTools overview 与 Open DevTools 文档。 */
export const PANEL_MAP: PanelMapEntry[] = [
  {
    task: '改样式 / 查 DOM',
    panel: 'Elements',
    area: '主面板',
    open: '右键元素选 Inspect；或 Ctrl+Shift+C（macOS 为 Cmd+Option+C）',
    desc: '查看和修改页面的 DOM 与 CSS。',
  },
  {
    task: '看日志 / 跑 JS',
    panel: 'Console',
    area: '主面板',
    open: 'Ctrl+Shift+J（macOS 为 Cmd+Option+J）',
    desc: '查看日志消息并直接运行 JavaScript。',
  },
  {
    task: '断点调试 JS',
    panel: 'Sources',
    area: '主面板',
    open: '打开 DevTools 后点顶部面板标签',
    desc: '断点单步调试 JavaScript，支持保存修改与复用代码片段。',
  },
  {
    task: '查看请求',
    panel: 'Network',
    area: '主面板',
    open: '打开 DevTools 后点顶部面板标签',
    desc: '查看和调试网络活动。',
  },
  {
    task: '性能录制',
    panel: 'Performance',
    area: '主面板',
    open: '打开 DevTools 后点顶部面板标签',
    desc: '录制并分析轨迹，找出加载与运行时性能的改进点。',
  },
  {
    task: '查内存泄漏',
    panel: 'Memory',
    area: '主面板',
    open: '打开 DevTools 后点顶部面板标签',
    desc: '排查影响页面性能的内存问题，例如内存泄漏。',
  },
  {
    task: '看存储 / Cookie',
    panel: 'Application',
    area: '主面板',
    open: '打开 DevTools 后点顶部面板标签',
    desc: '检查存储、Cookie、缓存、IndexedDB 等页面加载的全部资源。',
  },
  {
    task: '证书 / 混合内容',
    panel: 'Security',
    area: '主面板',
    open: '打开 DevTools 后点顶部面板标签',
    desc: '调试混合内容、证书问题等安全隐患。',
  },
  {
    task: '质量审计',
    panel: 'Lighthouse',
    area: '主面板',
    open: '打开 DevTools 后点顶部面板标签',
    desc: '运行性能、可访问性与 SEO 等质量审计。',
  },
  {
    task: '录制回放用户流',
    panel: 'Recorder',
    area: '主面板',
    open: '打开 DevTools 后点顶部面板标签',
    desc: '录制、回放和衡量用户操作流。',
  },
  {
    task: '模拟手机视口',
    panel: 'Device Mode',
    area: '设备工具栏',
    open: '点 DevTools 工具栏的设备图标；或 Ctrl+Shift+M（macOS 为 Cmd+Shift+M）',
    desc: '模拟移动设备的视口、触摸等条件。',
  },
  {
    task: '模拟传感器',
    panel: 'Sensors',
    area: '抽屉 Drawer',
    open: '按 Esc 打开抽屉 → More Tools → 勾选 Sensors',
    desc: '模拟地理位置、设备方向等传感器输入。',
  },
  {
    task: '找未使用 CSS',
    panel: 'Coverage',
    area: '抽屉 Drawer',
    open: '按 Esc 打开抽屉 → More Tools → 勾选 Coverage',
    desc: '找出页面未使用的 CSS 和 JavaScript。',
  },
];

export interface PanelFinderInstance {
  update(task: string): void;
  dispose(): void;
}

/** 练习标本用的占位图：手绘 SVG，避免外链图片。 */
const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 88">' +
  '<rect width="132" height="88" fill="#bfdbfe"/>' +
  '<circle cx="102" cy="22" r="10" fill="#f59e0b"/>' +
  '<path d="M0 88 44 40 76 70 96 52 132 88Z" fill="#3b82f6"/>' +
  '</svg>';

const PF_STYLES = `
.pf-stage {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: stretch;
  padding: 14px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #172033;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.pf-specimen {
  flex: 1 1 280px;
  padding: 12px 14px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: #ffffff;
}
.pf-tag {
  margin: 0 0 8px;
  font-size: 12px;
  color: #5d6f67;
}
.pf-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}
.pf-button {
  padding: 5px 14px;
  border: 0;
  border-radius: 999px;
  background: #4f7cff;
  color: #ffffff;
  font: 600 13px/1.4 ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.pf-count {
  margin-left: 8px;
  font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #475569;
}
.pf-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 12px 0;
  padding: 10px;
  border: 1px solid #dbe3f0;
  border-radius: 6px;
  background: #f8fafc;
}
.pf-form label {
  font-size: 12px;
  color: #475569;
}
.pf-input {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font: inherit;
}
.pf-image {
  display: block;
  width: 132px;
  height: 88px;
  border-radius: 6px;
}
.pf-hints {
  margin: 12px 0 0;
  padding-left: 18px;
  font-size: 12px;
  color: #475569;
}
.pf-readout {
  flex: 1 1 300px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-content: start;
  margin: 0;
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.pf-readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.pf-readout dd {
  margin: 0;
  color: #172033;
}
`;

export function createPanelFinder(root: HTMLElement): PanelFinderInstance {
  const controller = new AbortController();
  const { signal } = controller;

  root.classList.add('pf-stage');
  root.innerHTML = `
    <div class="pf-specimen">
      <p class="pf-tag">练习标本：在这个区域按 F12，或右键元素选 Inspect（检查）</p>
      <p class="pf-title">演示按钮、表单与图片</p>
      <button type="button" class="pf-button">点我计数</button>
      <span class="pf-count">已点击 0 次</span>
      <form class="pf-form">
        <label for="pf-input">喜欢的颜色</label>
        <input id="pf-input" name="color" class="pf-input" value="teal" />
        <button type="submit" class="pf-submit">提交</button>
      </form>
      <img class="pf-image" alt="练习用占位图片" />
      <ul class="pf-hints">
        <li>右键上面任意元素选 Inspect，Elements（元素）面板会选中它。</li>
        <li>按 Ctrl+Shift+J（macOS 为 Cmd+Option+J）打开 Console（控制台），再点按钮或提交表单看日志。</li>
      </ul>
    </div>
    <dl class="pf-readout">
      <dt>调试任务</dt><dd class="pf-cell-task"></dd>
      <dt>对应面板</dt><dd class="pf-cell-panel"></dd>
      <dt>所在位置</dt><dd class="pf-cell-area"></dd>
      <dt>打开方式</dt><dd class="pf-cell-open"></dd>
      <dt>面板说明</dt><dd class="pf-cell-desc"></dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = PF_STYLES;
  root.append(styleEl);

  const image = root.querySelector('.pf-image') as HTMLImageElement;
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

  // 标本区交互会向 Console 输出日志，让读者在 Console 面板里看到第一条自己的日志。
  let clicks = 0;
  const countLabel = root.querySelector('.pf-count') as HTMLElement;
  root.querySelector('.pf-button')!.addEventListener(
    'click',
    () => {
      clicks += 1;
      countLabel.textContent = `已点击 ${clicks} 次`;
      console.log('[练习标本] .pf-button 被点击，当前计数：', clicks);
    },
    { signal },
  );

  root.querySelector('.pf-form')!.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      const input = root.querySelector('.pf-input') as HTMLInputElement;
      console.log('[练习标本] .pf-form 提交，color =', input.value);
    },
    { signal },
  );

  const cells = {
    task: root.querySelector('.pf-cell-task') as HTMLElement,
    panel: root.querySelector('.pf-cell-panel') as HTMLElement,
    area: root.querySelector('.pf-cell-area') as HTMLElement,
    open: root.querySelector('.pf-cell-open') as HTMLElement,
    desc: root.querySelector('.pf-cell-desc') as HTMLElement,
  };

  function renderEntry(task: string) {
    const entry =
      PANEL_MAP.find((candidate) => candidate.task === task) ?? PANEL_MAP[0];
    cells.task.textContent = entry.task;
    cells.panel.textContent = entry.panel;
    cells.area.textContent = entry.area;
    cells.open.textContent = entry.open;
    cells.desc.textContent = entry.desc;
  }

  renderEntry(PANEL_MAP[0].task);

  return {
    update: renderEntry,
    dispose() {
      controller.abort();
    },
  };
}
