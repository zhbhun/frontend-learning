/**
 * 范例介绍：层叠顺序标本，复现「子元素 z-index 很大却压不过别人」的经典问题。
 * 输入或前置状态：Controls 的「祖先层叠上下文」开关（默认开启）；z-index: 1000
 *   的卡片 A 包在 wrapper 里，z-index: 1 的卡片 B 是 wrapper 的邻居。
 * 主要操作：切换开关给 wrapper 加 / 去 transform；按 F12 打开本页 DevTools，
 *   在 Elements 里对比两张卡片的 position 与 z-index，并在 Styles 里划掉
 *   wrapper 的 transform 验证因果。
 * 预期结果：开关开启时 wrapper 创建层叠上下文，卡片 A 被卡片 B 盖住；关闭后
 *   卡片 A 回到最上层。readout 用重叠区采样实时报告最上层是哪张卡片。
 * 阅读主线：z-index 只在同一个层叠上下文内比较，祖先的上下文会把后代的
 *   z-index 关在里面。
 */

export interface StackArgs {
  /** 开启后给 wrapper 加 transform，使其创建层叠上下文。 */
  trapped: boolean;
}

export interface StackInstance {
  update(args: StackArgs): void;
  dispose(): void;
}

const STYLES = `
.ss-stage {
  color: #172033;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.ss-hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.ss-scene {
  position: relative;
  height: 248px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #f8fafc;
}
.ss-wrapper {
  position: relative;
  width: 250px;
  height: 178px;
  margin: 34px 0 0 20px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
}
.ss-wrapper-tag {
  position: absolute;
  top: -22px;
  left: 0;
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #5d6f67;
}
.ss-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  width: 184px;
  height: 118px;
  padding: 12px;
  box-sizing: border-box;
  border-radius: 6px;
  font: 600 14px/1.5 ui-sans-serif, system-ui, sans-serif;
}
.ss-card small {
  font: 400 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ss-card-a {
  top: 26px;
  left: 26px;
  z-index: 1000;
  border: 2px solid #3b82f6;
  background: #dbeafe;
  color: #172033;
}
.ss-card-b {
  top: 118px;
  left: 158px;
  z-index: 1;
  border: 2px solid #d97706;
  background: #fef3c7;
  color: #172033;
}
.ss-readout {
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
.ss-readout dt {
  color: #5d6f67;
}
.ss-readout dd {
  margin: 0;
  color: #172033;
}
`;

export function createStackSpecimen(stage: HTMLElement): StackInstance {
  stage.classList.add('ss-stage');
  stage.innerHTML = `
    <p class="ss-hint">练习标本：切换下方开关，或按 F12 在 Styles 里划掉 wrapper 的 transform，看卡片 A 能否压过卡片 B。</p>
    <div class="ss-scene">
      <div class="ss-wrapper">
        <span class="ss-wrapper-tag">祖先 wrapper</span>
        <div class="ss-card ss-card-a">卡片 A<small>z-index: 1000</small></div>
      </div>
      <div class="ss-card ss-card-b">卡片 B<small>z-index: 1</small></div>
    </div>
    <dl class="ss-readout">
      <dt>祖先层叠上下文</dt><dd class="ss-cell-context"></dd>
      <dt>重叠区最上层</dt><dd class="ss-cell-top"></dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  stage.append(styleEl);

  const wrapper = stage.querySelector('.ss-wrapper') as HTMLElement;
  const cardA = stage.querySelector('.ss-card-a') as HTMLElement;
  const cardB = stage.querySelector('.ss-card-b') as HTMLElement;
  const cells = {
    context: stage.querySelector('.ss-cell-context') as HTMLElement,
    top: stage.querySelector('.ss-cell-top') as HTMLElement,
  };

  function setText(cell: HTMLElement, text: string) {
    if (cell.textContent !== text) {
      cell.textContent = text;
    }
  }

  /*
    在两张卡片重叠区的中心采样：elementFromPoint 返回该点的最上层元素，
    由此得到与视觉一致的可核对读数。
  */
  function sampleTop(): 'a' | 'b' | null {
    const rectA = cardA.getBoundingClientRect();
    const rectB = cardB.getBoundingClientRect();
    const left = Math.max(rectA.left, rectB.left);
    const top = Math.max(rectA.top, rectB.top);
    const right = Math.min(rectA.right, rectB.right);
    const bottom = Math.min(rectA.bottom, rectB.bottom);
    if (right <= left || bottom <= top) {
      return null;
    }
    const probe = document.elementFromPoint(
      (left + right) / 2,
      (top + bottom) / 2,
    );
    if (!probe) {
      return null;
    }
    if (cardA.contains(probe)) {
      return 'a';
    }
    if (cardB.contains(probe)) {
      return 'b';
    }
    return null;
  }

  function update(args: StackArgs) {
    // 任何非 none 的 transform 都会创建层叠上下文；translate(0, 0) 不改变位置，只改变层级归属。
    wrapper.style.transform = args.trapped ? 'translate(0px, 0px)' : '';
    setText(cells.context, args.trapped ? '是（transform 创建）' : '否');

    const top = sampleTop();
    setText(
      cells.top,
      top === 'a'
        ? '卡片 A（z-index: 1000 生效）'
        : top === 'b'
          ? '卡片 B（A 被祖先上下文困住）'
          : '—（重叠区不在视口内）',
    );
  }

  update({ trapped: true });

  return {
    update,
    dispose() {},
  };
}
