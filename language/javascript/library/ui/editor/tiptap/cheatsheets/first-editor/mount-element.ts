/**
 * 范例：element 的三种取值决定编辑器出现在哪里。
 * 前置状态：舞台左侧是页面中的挂载元素 <div class="element">，右侧示意构造函数自建的游离 div。
 * 操作：切换「element 取值」——传入元素 / element: null + mount() / 缺省不传。
 * 预期结果：前两种视图上屏、挂载元素子节点变为 1；缺省时左框保持为空，视图在游离 div 里。
 * 阅读主线：左框是否出现视图，读数「视图位置」如何变化。
 */
import { EditorShell } from './editor-shell';

export type ElementMode = 'provided' | 'null-mount' | 'default';

export interface MountElementArgs {
  elementMode: ElementMode;
}

export interface MountElementSnapshot {
  hostChildren: number;
  viewPlace: string;
  viewClass: string;
}

export interface MountElementInstance {
  update(args: MountElementArgs): void;
  dispose(): void;
}

const CONTENT = '<p>Hello World!</p>';

export function createMountElementDemo(
  stage: HTMLElement,
  emit: (snapshot: MountElementSnapshot) => void,
): MountElementInstance {
  const frame = document.createElement('div');
  frame.className = 'fe-frame fe-columns';

  // 页面中的挂载元素：本范例的观察对象
  const hostColumn = createColumn('挂载元素 <div class="element">');
  const host = document.createElement('div');
  host.className = 'fe-box';
  hostColumn.append(host);

  // 构造函数自建的游离 div：页面上不可见，这里只示意它存在
  const ghostColumn = createColumn('游离 div（页面上不可见）');
  const ghost = document.createElement('div');
  ghost.className = 'fe-box fe-box--ghost';
  ghost.textContent = '实例创建成功，但视图挂在游离 div 里';
  ghostColumn.append(ghost);

  frame.append(hostColumn, ghostColumn);
  stage.append(frame);

  let shell: EditorShell | null = null;

  function createColumn(label: string): HTMLElement {
    const column = document.createElement('div');
    column.className = 'fe-column';
    const title = document.createElement('p');
    title.className = 'fe-box-label';
    title.textContent = label;
    column.append(title);
    return column;
  }

  function snapshot(): MountElementSnapshot {
    const view = shell?.viewElement ?? null;
    const onScreen = view?.parentElement === host;
    return {
      hostChildren: host.childElementCount,
      viewPlace: !view
        ? '未挂载'
        : onScreen
          ? '已上屏（挂载元素内）'
          : '游离 div（页面上不可见）',
      viewClass: view ? view.className : '—',
    };
  }

  // 每次切换都按真实构造过程重建，对应读者重新执行一次 new Editor
  function mountFor(mode: ElementMode): void {
    shell?.destroy();
    host.replaceChildren();

    if (mode === 'provided') {
      // 常规：元素已在页面里，构造时立即挂载
      shell = new EditorShell({ element: host, content: CONTENT });
    } else if (mode === 'null-mount') {
      // 元素还没进 DOM：先创建实例，之后补挂
      shell = new EditorShell({ element: null, content: CONTENT });
      shell.mount(host);
    } else {
      // 缺省：实例挂进构造函数自建的游离 div，页面不可见
      shell = new EditorShell({ content: CONTENT });
    }

    ghost.classList.toggle('fe-box--active', mode === 'default');
    emit(snapshot());
  }

  return {
    update(args) {
      mountFor(args.elementMode);
    },
    dispose() {
      shell?.destroy();
      frame.remove();
    },
  };
}
