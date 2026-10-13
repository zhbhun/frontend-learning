import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import dualEditorSource from './dual-editor-sync.ts?raw';
import undoCompareSource from './undo-history-compare.ts?raw';
import {
  createDualEditorSync,
  type DualEditorInstance,
  type DualEditorOptions,
  type DualEditorSnapshot,
} from './dual-editor-sync';
import {
  createUndoCompare,
  type UndoCompareEngine,
  type UndoCompareInstance,
  type UndoCompareOptions,
  type UndoCompareSnapshot,
} from './undo-history-compare';

/** 两个范例的控件集合;每个 story 只取自己需要的字段。 */
interface YCodemirrorArgs {
  relay?: boolean;
  engine?: UndoCompareEngine;
}

const READOUT_INTERVAL = 100;

/* 本课范例以真实 CodeMirror 编辑器做舞台(canvasStory 的 canvas 舞台不适用),
   这里按 canvas-runtime.js 的等价生命周期挂载 DOM 实例:舞台与实例只创建一次,
   参数变化只调用 apply;离开当前 Docs 页时经 MutationObserver 调用 dispose。 */
interface MountRuntime<Instance> {
  stage: HTMLDivElement;
  instance: Instance;
  readoutEl: HTMLDListElement;
}

function mountStory<Args, Snapshot, Instance extends { dispose(): void }>({
  create,
  apply,
  readout,
}: {
  create: (mount: HTMLElement, emit: (snapshot: Snapshot) => void) => Instance;
  apply: (instance: Instance, args: Args) => void;
  readout: (snapshot: Snapshot) => Array<[string, unknown]>;
}) {
  let runtime: MountRuntime<Instance> | undefined;
  let lastPaint = 0;

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

  return (args: Args): HTMLDivElement => {
    ensureStageStyles();

    if (!runtime) {
      const stage = document.createElement('div');
      stage.className = 'cs-stage ycm-stage';

      const mount = document.createElement('div');
      mount.className = 'ycm-mount';
      stage.append(mount);

      const readoutEl = document.createElement('dl');
      readoutEl.className = 'cs-readout ycm-readout';
      stage.append(readoutEl);

      const instance = create(mount, (snapshot) => {
        const now = performance.now();
        if (now - lastPaint < READOUT_INTERVAL) {
          return;
        }
        lastPaint = now;
        paint(readoutEl, readout(snapshot));
      });

      runtime = { stage, instance, readoutEl };

      const observed = runtime;
      requestAnimationFrame(() => {
        const parent = observed.stage.parentElement;
        if (!parent) {
          return;
        }
        const observer = new MutationObserver(() => {
          if (!observed.stage.isConnected) {
            observer.disconnect();
            observed.instance.dispose();
            if (runtime === observed) {
              runtime = undefined;
              lastPaint = 0;
            }
          }
        });
        observer.observe(parent, { childList: true });
      });
    }

    lastPaint = 0;
    apply(runtime.instance, args);
    return runtime.stage;
  };
}

/** 舞台样式:两个真实编辑器并排 + 下方读数;只注入一次。 */
function ensureStageStyles() {
  if (document.getElementById('ycm-story-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'ycm-story-styles';
  style.textContent = `
.ycm-stage {
  display: flex;
  flex-direction: column;
  aspect-ratio: auto;
  gap: 10px;
  padding: 12px;
}
.ycm-panes {
  display: flex;
  gap: 12px;
}
.ycm-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ycm-pane-label {
  margin: 0;
  font: 600 12px/1.4 ui-sans-serif, system-ui, sans-serif;
  color: #46584f;
}
.ycm-editor {
  border: 1px solid #dbe3f0;
  border-radius: 6px;
  background: #ffffff;
  overflow: hidden;
}
.ycm-editor .cm-editor {
  height: 132px;
  font-size: 13px;
  background: #ffffff;
}
.ycm-editor .cm-editor.cm-focused {
  outline: 2px solid rgb(79 124 255 / 35%);
}
.ycm-editor .cm-scroller {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ycm-readout {
  position: static;
  align-self: flex-start;
  max-width: 100%;
  pointer-events: auto;
}
`;
  document.head.append(style);
}

const renderDualEditor = mountStory({
  create: createDualEditorSync,
  apply(instance: DualEditorInstance, args: YCodemirrorArgs) {
    instance.update({ relay: args.relay ?? true });
  },
  readout(snapshot: DualEditorSnapshot) {
    return [
      ['A 端文本', snapshot.textA],
      ['B 端文本', snapshot.textB],
      ['两端一致', snapshot.converged],
      ['B 收到的最近 delta', snapshot.deltaOnB],
      ['B 的光标在 A 端视图', snapshot.cursorBInA],
      ['A 的光标在 B 端视图', snapshot.cursorAInB],
      ['中继连接', snapshot.relayState],
    ];
  },
});

const renderUndoCompare = mountStory({
  create: createUndoCompare,
  apply(instance: UndoCompareInstance, args: YCodemirrorArgs) {
    instance.update({ engine: args.engine ?? 'yjs' });
  },
  readout(snapshot: UndoCompareSnapshot) {
    return [
      ['撤销引擎', snapshot.engineLabel],
      ['重放状态', snapshot.status],
      ['A 撤销后文本', snapshot.textAfterA],
      ['B 撤销后文本', snapshot.textAfterB],
      ['这次撤销删掉的字', snapshot.removedByUndo],
      ['A 的 Yjs 撤销栈', snapshot.yjsStackDepth],
    ];
  },
});

const meta = {
  id: 'y-codemirror',
  title: '编辑器绑定/CodeMirror',
  tags: ['!dev'],
} satisfies Meta<YCodemirrorArgs>;

export default meta;

type Story = StoryObj<YCodemirrorArgs>;

export const DualEditor: Story = {
  name: '双编辑器互同步',
  args: {
    relay: true,
  },
  argTypes: {
    relay: {
      name: '中继连接',
      description:
        '关闭时模拟断网:编辑只在本地 Y.Text 生效;重新开启时全量对答,把离线改动补齐给对端。',
      control: { type: 'boolean' },
    },
  },
  render: renderDualEditor,
  parameters: storySource(dualEditorSource),
};

export const UndoCompare: Story = {
  name: '撤销对照:Yjs 与 CM history',
  args: {
    engine: 'yjs',
  },
  argTypes: {
    engine: {
      name: '撤销引擎',
      description:
        'yCollab 走 Yjs UndoManager,只回滚自己的输入;CM history 把远端同步进来的改动也记进栈,撤销会删掉别人的字。',
      control: { type: 'radio' },
      options: ['yjs', 'cm-history'],
      labels: {
        yjs: 'yCollab(Yjs UndoManager)',
        'cm-history': 'basicSetup 的 history(误用)',
      },
    },
  },
  render: renderUndoCompare,
  parameters: storySource(undoCompareSource),
};
