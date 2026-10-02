/**
 * 范例：setEditable 切换时，可编辑状态在 DOM 上的变化。
 * 前置状态：编辑器已挂载，初始可编辑，内容为一段提示文字。
 * 操作：切换「editable」，并在编辑区内点击、输入。
 * 预期结果：editable=false 后 contenteditable 变 "false"、tabindex 被移除、输入无效；
 *           重新切回 true 后已输入的内容仍在。
 * 阅读主线：读数三项（isEditable / contenteditable / tabindex）与实际输入体验。
 */
import { EditorShell } from './editor-shell';

export interface EditableToggleArgs {
  editable: boolean;
}

export interface EditableToggleSnapshot {
  isEditable: boolean;
  contenteditable: string;
  tabindex: string;
}

export interface EditableToggleInstance {
  update(args: EditableToggleArgs): void;
  dispose(): void;
}

const CONTENT = '<p>点击这里试着输入文字</p>';

export function createEditableToggleDemo(
  stage: HTMLElement,
  emit: (snapshot: EditableToggleSnapshot) => void,
): EditableToggleInstance {
  const frame = document.createElement('div');
  frame.className = 'fe-frame';

  const hostLabel = document.createElement('p');
  hostLabel.className = 'fe-box-label';
  hostLabel.textContent = '挂载元素 <div class="element"> 内的编辑区';
  const host = document.createElement('div');
  host.className = 'fe-box fe-box--tall';

  frame.append(hostLabel, host);
  stage.append(frame);

  // 构造时不传 editable，默认 true；切换走 setEditable，不重建实例
  const shell = new EditorShell({ element: host, content: CONTENT });

  function snapshot(): EditableToggleSnapshot {
    const view = shell.viewElement;
    return {
      isEditable: shell.isEditable,
      contenteditable: view ? `"${view.getAttribute('contenteditable')}"` : '—',
      tabindex: view?.hasAttribute('tabindex') ? '"0"' : '（无）',
    };
  }

  return {
    update(args) {
      // 运行期切换只调用 setEditable，已输入的内容不受影响
      shell.setEditable(args.editable);
      emit(snapshot());
    },
    dispose() {
      shell.destroy();
      frame.remove();
    },
  };
}
