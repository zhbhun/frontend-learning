/**
 * 范例介绍：可切换 Flex/Grid 的布局标本，供读者用 DevTools 的 badge、overlay、
 * Layout 面板与盒模型图完成一次布局排查练习。
 * 输入或前置状态：Controls 的「布局模式」（flex / grid）与「问题场景」
 *   （正常排布 / 制造溢出 / 允许换行）。
 * 主要操作：切换 Controls；按 F12 打开本页 DevTools，右键容器选 Inspect（检查），
 *   点击容器旁的 grid / flex badge 开启 overlay；在 Elements 的 Layout 标签勾选
 *   Show track sizes；制造溢出时观察外层滚动容器的 scroll badge 与盒模型图，
 *   再在 Styles 里改 min-width 或轨道值验证修复。
 * 预期结果：readout 实时显示容器宽度、水平溢出量与行列读数；制造溢出时溢出量 > 0，
 *   允许换行时行数增加；overlay 的轨道尺寸标签与 readout 数值一致。
 * 阅读主线：先把布局计算结果变成看得见的证据，再决定改哪条 CSS。
 */

export type LayoutMode = 'flex' | 'grid';
export type LayoutProblem = 'normal' | 'overflow' | 'wrap';

export interface LayoutArgs {
  mode: LayoutMode;
  problem: LayoutProblem;
}

/** 问题场景的中文标签，同时用作 Controls 选项与 readout 读数。 */
export const PROBLEM_LABELS: Record<LayoutProblem, string> = {
  normal: '正常排布',
  overflow: '制造溢出',
  wrap: '允许换行',
};

export interface LayoutInstance {
  update(args: LayoutArgs): void;
  dispose(): void;
}

const STYLES = `
.ls-stage {
  color: #172033;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.ls-hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.ls-viewport {
  overflow: auto;
  width: min(100%, 620px);
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #f8fafc;
}
.ls-container {
  position: relative;
  display: flex;
  gap: 12px;
  width: 100%;
  min-height: 130px;
  box-sizing: border-box;
  outline: 1px dashed #b9c6e0;
  outline-offset: -1px;
  background: #eef2fb;
}
.ls-item {
  flex: 1 1 0px;
  min-width: 0;
  min-height: 106px;
  padding: 10px 12px;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  font: 600 13px/1.5 ui-sans-serif, system-ui, sans-serif;
}
.ls-readout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  align-content: start;
  width: min(100%, 620px);
  margin: 12px 0 0;
  padding: 10px 12px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ls-readout dt {
  color: #5d6f67;
}
.ls-readout dd {
  margin: 0;
  color: #172033;
}
`;

export function createLayoutSpecimen(stage: HTMLElement): LayoutInstance {
  stage.classList.add('ls-stage');
  stage.innerHTML = `
    <p class="ls-hint">练习标本：按 F12 打开本页 DevTools，右键容器选 Inspect（检查），点容器旁的 grid / flex badge 开启 overlay。</p>
    <div class="ls-viewport">
      <div class="ls-container">
        <div class="ls-item">子项 A</div>
        <div class="ls-item">子项 B</div>
        <div class="ls-item">子项 C</div>
      </div>
    </div>
    <dl class="ls-readout">
      <dt>布局模式</dt><dd class="ls-cell-mode"></dd>
      <dt>问题场景</dt><dd class="ls-cell-problem"></dd>
      <dt>容器宽度</dt><dd class="ls-cell-width"></dd>
      <dt>水平溢出量</dt><dd class="ls-cell-overflow"></dd>
      <dt>排布</dt><dd class="ls-cell-rows"></dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  stage.append(styleEl);

  const viewport = stage.querySelector('.ls-viewport') as HTMLElement;
  const container = stage.querySelector('.ls-container') as HTMLElement;
  const items = [...stage.querySelectorAll<HTMLElement>('.ls-item')];
  const cells = {
    mode: stage.querySelector('.ls-cell-mode') as HTMLElement,
    problem: stage.querySelector('.ls-cell-problem') as HTMLElement,
    width: stage.querySelector('.ls-cell-width') as HTMLElement,
    overflow: stage.querySelector('.ls-cell-overflow') as HTMLElement,
    rows: stage.querySelector('.ls-cell-rows') as HTMLElement,
  };

  function setText(cell: HTMLElement, text: string) {
    if (cell.textContent !== text) {
      cell.textContent = text;
    }
  }

  /*
    读数全部来自真实布局测量：容器 clientWidth、滚动容器 scrollWidth 与
    clientWidth 的差值、子项 offsetTop / offsetLeft 去重后的行列计数。
  */
  function measure() {
    const overflow = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const rows = new Set(items.map((item) => Math.round(item.offsetTop))).size;
    const cols = new Set(items.map((item) => Math.round(item.offsetLeft))).size;
    setText(cells.width, `${container.clientWidth}px`);
    setText(
      cells.overflow,
      overflow > 0 ? `${overflow}px（出现横向滚动条）` : '0px（无溢出）',
    );
    setText(cells.rows, `${rows} 行 × ${cols} 列`);
  }

  function update(args: LayoutArgs) {
    setText(cells.mode, args.mode);
    setText(cells.problem, PROBLEM_LABELS[args.problem]);

    if (args.mode === 'flex') {
      container.style.gridTemplateColumns = '';
      container.style.flexWrap = args.problem === 'wrap' ? 'wrap' : 'nowrap';
      for (const item of items) {
        // 溢出场景用显式 min-width 复现 flex 子项拒绝收缩的默认行为（min-width: auto）。
        item.style.flex = args.problem === 'wrap' ? '1 1 220px' : '1 1 0px';
        item.style.minWidth = args.problem === 'overflow' ? '240px' : '0px';
      }
    } else {
      container.style.flexWrap = '';
      for (const item of items) {
        item.style.flex = '';
        item.style.minWidth = '';
      }
      // 溢出场景用固定轨道复现「轨道总宽超过容器」；换行场景用 auto-fill 随宽度增减列数。
      container.style.gridTemplateColumns =
        args.problem === 'overflow'
          ? 'repeat(3, 260px)'
          : args.problem === 'wrap'
            ? 'repeat(auto-fill, minmax(220px, 1fr))'
            : 'repeat(3, 1fr)';
    }
    measure();
  }

  // 读者在 Styles 里改声明不会触发重渲染，用低频轮询让读数反映实时布局。
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(viewport);
  const timer = window.setInterval(measure, 400);

  update({ mode: 'flex', problem: 'normal' });

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      window.clearInterval(timer);
    },
  };
}
