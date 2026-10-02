/**
 * 范例：unmount() 与 destroy() 的差异。
 * 前置状态：编辑器已挂载，含两段内容。
 * 操作：选择「拆卸方式」（unmount / destroy），再开关「mount() 重新挂载」。
 * 预期结果：unmount 后挂载元素为空但文档状态保留，重新挂载后内容恢复；
 *           destroy 后挂载元素为空、isDestroyed 为 true，重新挂载无效。
 * 阅读主线：读数 isDestroyed 与「文档状态」，以及空框里的提示。
 */
import { EditorShell } from './editor-shell';

export type TeardownMode = 'none' | 'unmount' | 'destroy';

export interface TeardownArgs {
  teardown: TeardownMode;
  remount: boolean;
}

export interface TeardownSnapshot {
  hostChildren: number;
  isDestroyed: boolean;
  docState: string;
}

export interface TeardownInstance {
  update(args: TeardownArgs): void;
  dispose(): void;
}

const CONTENT =
  '<p>第一段：unmount 之后还能恢复</p><p>第二段：destroy 之后只能重建</p>';

export function createTeardownDemo(
  stage: HTMLElement,
  emit: (snapshot: TeardownSnapshot) => void,
): TeardownInstance {
  const frame = document.createElement('div');
  frame.className = 'fe-frame';

  const hostLabel = document.createElement('p');
  hostLabel.className = 'fe-box-label';
  hostLabel.textContent = '挂载元素 <div class="element">';
  const host = document.createElement('div');
  host.className = 'fe-box fe-box--tall';

  frame.append(hostLabel, host);
  stage.append(frame);

  let shell: EditorShell | null = null;

  // 每次参数变化都从头重演一遍生命周期，步骤与读者真实调用顺序一致
  function render(args: TeardownArgs): void {
    shell?.destroy();
    host.replaceChildren();

    shell = new EditorShell({ element: host, content: CONTENT });
    if (args.teardown === 'unmount') {
      // 只摘视图，文档状态保留在实例上
      shell.unmount();
    } else if (args.teardown === 'destroy') {
      // 终态：视图移除、实例作废
      shell.destroy();
    }
    if (args.remount && args.teardown === 'unmount') {
      // 重新挂载：真实实现会从缓存状态恢复文档
      shell.mount();
    }

    emit({
      hostChildren: host.childElementCount,
      isDestroyed: shell.isDestroyed,
      docState: shell.isDestroyed
        ? '已销毁（恢复请 new Editor 重建）'
        : shell.viewElement
          ? '正常显示'
          : '保留在实例上（mount 可恢复）',
    });
  }

  return {
    update(args) {
      render(args);
    },
    dispose() {
      shell?.destroy();
      frame.remove();
    },
  };
}
