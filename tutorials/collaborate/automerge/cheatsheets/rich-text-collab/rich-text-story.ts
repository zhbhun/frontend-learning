/*
 * rich-text-story：把 ProseMirror 实验台接进课程画布的胶水（不含任何 automerge 逻辑）。
 *
 * assets/story-canvas.js 的舞台是 <canvas>，ProseMirror 要挂 DOM，所以本助手做与
 * react-bindings/react-story.ts 同构的事情：舞台 div（.cs-stage）只建一次，内部一个
 * 挂载点交给实验台；args 变化只调 instance.update；读数（.cs-readout）100ms 节流且
 * 保证最后一个快照一定落到画面；舞台离开文档时由实验台的 dispose 释放编辑器与仓库。
 */

const READOUT_INTERVAL = 100;

/** 每个实验台实例的最小接口：响应参数变化，并能在离开页面时释放资源。 */
export interface DomLabInstance<Args> {
  update(args: Args): void;
  dispose(): void;
}

export interface RichTextStoryOptions<
  Args,
  Snapshot,
  Instance extends DomLabInstance<Args>,
> {
  /** 创建实验台：拿到挂载点与读数发射器，返回实例。 */
  create: (host: HTMLElement, emit: (snapshot: Snapshot) => void) => Instance;
  /** args 变化时驱动实例。 */
  apply: (instance: Instance, args: Args) => void;
  /** 把快照映射成读数行。 */
  readout?: (snapshot: Snapshot) => Array<[string, unknown]>;
  /** 舞台左上 / 右上角的说明字幕。 */
  captions?: string[];
}

export function richTextStory<
  Args,
  Snapshot,
  Instance extends DomLabInstance<Args>,
>(
  options: RichTextStoryOptions<Args, Snapshot, Instance>,
): (args: Args) => HTMLElement {
  let stage: HTMLDivElement | undefined;
  let instance: Instance | undefined;
  let readoutEl: HTMLDListElement | undefined;
  let trailingTimer: number | undefined;

  return (args: Args) => {
    if (!stage) {
      stage = document.createElement('div');
      stage.className = 'cs-stage';

      const host = document.createElement('div');
      Object.assign(host.style, {
        position: 'absolute',
        inset: '0',
        overflow: 'auto',
      });
      stage.append(host);

      options.captions?.forEach((text, index) => {
        const caption = document.createElement('p');
        caption.className =
          index === 0
            ? 'cs-caption cs-caption--left'
            : 'cs-caption cs-caption--right';
        caption.textContent = text;
        stage!.append(caption);
      });

      if (options.readout) {
        readoutEl = document.createElement('dl');
        readoutEl.className = 'cs-readout';
        stage.append(readoutEl);
      }

      let latest: Snapshot | undefined;
      let lastPaint = 0;
      const readoutFn = options.readout;
      const emit = (snapshot: Snapshot) => {
        latest = snapshot;
        if (!readoutEl || !readoutFn) {
          return;
        }
        const now = performance.now();
        if (trailingTimer !== undefined) {
          return; // 窗口期内已有一次尾沿排程
        }
        if (now - lastPaint < READOUT_INTERVAL) {
          // 前沿被节流掉，也排一次尾沿，保证最终状态一定上屏
          trailingTimer = window.setTimeout(() => {
            trailingTimer = undefined;
            lastPaint = performance.now();
            if (readoutEl && latest !== undefined) {
              paint(readoutEl, readoutFn(latest));
            }
          }, READOUT_INTERVAL);
          return;
        }
        lastPaint = now;
        paint(readoutEl, readoutFn(snapshot));
      };

      instance = options.create(host, emit);

      const observedStage = stage;
      const observedInstance = instance;
      requestAnimationFrame(() => {
        const parent = observedStage.parentElement;
        if (!parent) {
          return;
        }

        const observer = new MutationObserver(() => {
          if (!observedStage.isConnected) {
            observer.disconnect();
            if (trailingTimer !== undefined) {
              window.clearTimeout(trailingTimer);
              trailingTimer = undefined;
            }
            observedInstance.dispose();

            if (stage === observedStage) {
              stage = undefined;
              instance = undefined;
              readoutEl = undefined;
            }
          }
        });
        observer.observe(parent, { childList: true });
      });
    }

    const current = instance;
    if (current) {
      options.apply(current, args);
    }
    return stage;
  };
}

/** 与 assets/story-canvas.js 相同的读数渲染：只改变化的格子。 */
function paint(root: HTMLDListElement, entries: Array<[string, unknown]>) {
  if (root.childElementCount !== entries.length * 2) {
    root.replaceChildren();

    for (const [label] of entries) {
      const term = document.createElement('dt');
      term.textContent = label;
      root.append(term, document.createElement('dd'));
    }
  }

  const terms = root.querySelectorAll('dt');
  const values = root.querySelectorAll('dd');

  entries.forEach(([label, value], index) => {
    const text = String(value);

    if (terms[index].textContent !== label) {
      terms[index].textContent = label;
    }

    if (values[index].textContent !== text) {
      values[index].textContent = text;
    }
  });
}
