/**
 * 文字编辑器范例。
 *
 * 演示内容：@leafer-in/text-editor 的双击内联文字编辑——选中文字后双击进入编辑，
 * 画布上出现覆盖在文字上的 contentEditable 输入框；输入实时回写到 Text.text；
 * 按 Esc 或点击输入框外部结束编辑，最终文字保留。Controls 提供编程式进入 / 结束
 * 与「全选模式」开关，readout 读出编辑状态、内部编辑器 tag、文字内容与 textEditing 标志。
 *
 * 输入 / 前置：canvasStory 注入的 <canvas>；App 以 view 传入该 canvas。
 * 必须先引入 @leafer-in/editor（注册编辑器并把 Text.editInner 默认设为 'TextEditor'），
 * 再引入 @leafer-in/text-editor（注册 TextEditor 内部编辑器类）。
 *
 * 主要操作：
 * - editState：'open' 时先 select(text) 再 editor.openInnerEditor() 进入编辑（与双击流程一致）；
 *   'close' 时 editor.closeInnerEditor() 结束编辑。
 * - selectAll：进入编辑前设置 TextEditor.config.selectAll，决定打开时是否全选文字。
 *
 * 预期结果：进入编辑时画布上出现覆盖在文字上的输入框（position:fixed 的 contentEditable div），
 * readout「内联编辑」变「进行中」、「内部编辑器」变「TextEditor」、「textEditing 标志」变 true；
 * 在输入框里打字，「文字内容」读数实时同步；结束编辑后输入框消失、标志复位，最终文字保留。
 * 也可直接在画布上双击文字进入编辑（默认 openInner: 'double'），读数跟随交互更新。
 *
 * 阅读主线：createTextEditorDemo 建场景与编辑器 → 监听 InnerEditorEvent 同步读数 →
 * update 应用 editState / selectAll → dispose 关闭编辑并销毁 App。
 */
import { App, Text } from 'leafer-ui';
import { Editor, InnerEditorEvent } from '@leafer-in/editor';
// 命名导入触发模块求值：既注册 TextEditor 内部编辑器类，又执行 Plugin.add('text-editor','editor')。
import { TextEditor } from '@leafer-in/text-editor';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

void TextEditor; // 表明该导入为启用文字编辑的副作用，避免被当作未使用绑定处理。

export interface TextEditorDemoOptions {
  editState: 'open' | 'close';
  selectAll: boolean;
}

export interface TextEditorDemoSnapshot {
  editing: boolean;
  innerEditorTag: string;
  textContent: string;
  textEditingFlag: boolean;
}

export interface TextEditorDemoInstance {
  update(options: TextEditorDemoOptions): void;
  dispose(): void;
}

export function createTextEditorDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TextEditorDemoSnapshot) => void,
): TextEditorDemoInstance {
  // 启用编辑器：import @leafer-in/editor 后 Text.editInner 默认为 'TextEditor'。
  // view 传 HTMLCanvasElement 时，TextEditor 的输入框会以 position:fixed 挂到 document.body
  // （源码 inBody 分支），用 app.clientBounds 对齐到文字在世界坐标的位置。
  const app = new App({
    view: canvas,
    fill: '#ffffff',
    editor: {},
  });

  const textNode = new Text({
    editable: true,
    text: '双击进入编辑',
    fontSize: 44,
    fontWeight: 700,
    fill: '#1e293b',
  });

  app.tree.add(textNode);

  const editor = app.editor as unknown as Editor;

  let current: TextEditorDemoOptions = { editState: 'close', selectAll: true };
  let pollId: ReturnType<typeof setInterval> | null = null;

  function layout() {
    const { width: W, height: H } = readCanvasSize(canvas);
    const safeW = Math.max(W, 320);
    const safeH = Math.max(H, 200);
    // 文字默认左上对齐，这里粗略居中放置，给编辑输入框留出可见空间。
    textNode.set({
      x: Math.round(safeW * 0.5) - 160,
      y: Math.round(safeH * 0.5) - 28,
    });
  }

  function snapshot() {
    // 用 innerEditing 作为权威标志：closeInnerEditor 先把 innerEditing 置 false、
    // 再在 CLOSE 事件之后才把 innerEditor 引用置空，因此仅 innerEditing 为真时读 tag，
    // 避免关闭瞬间读到残留的 TextEditor 引用。
    const editing = !!editor.innerEditing;
    emit({
      editing,
      innerEditorTag: editing ? editor.innerEditor?.tag ?? '无' : '无',
      textContent: String(textNode.text ?? ''),
      textEditingFlag: !!textNode.textEditing,
    });
  }

  // TextEditor.config.selectAll 只在进入编辑（onLoad）时读取，
  // 因此在 openInnerEditor 之前设置即可生效。getInnerEditor 惰性创建并缓存实例，
  // 提前设置后 openInnerEditor 会复用同一实例。
  function applySelectAll(value: boolean) {
    const inner = editor.getInnerEditor(
      'TextEditor',
    ) as unknown as TextEditor;
    if (inner?.config) inner.config.selectAll = value;
  }

  function enterEdit() {
    if (editor.innerEditing) return;
    applySelectAll(current.selectAll);
    // 与双击流程一致：先选中文字让编辑框以它为目标，再 openInnerEditor()。
    editor.select(textNode);
    editor.openInnerEditor();
  }

  function exitEdit() {
    if (!editor.innerEditing) return;
    editor.closeInnerEditor();
  }

  // 用户双击进入、点击外部或按 Esc 退出时，编辑器派发 InnerEditorEvent；
  // 监听 OPEN / CLOSE 让读数跟随交互更新，而不只由 Controls 驱动。
  editor.on(InnerEditorEvent.OPEN, () => {
    // 编辑期间定时回传文字内容，使「文字内容」读数跟随输入框打字实时变化
    // （onInput 直接写 text.text，但不单独派发事件，故用轮询拾取）。
    if (pollId === null) {
      pollId = setInterval(snapshot, 200);
    }
    snapshot();
  });
  editor.on(InnerEditorEvent.CLOSE, () => {
    if (pollId !== null) {
      clearInterval(pollId);
      pollId = null;
    }
    snapshot();
  });

  function refresh() {
    layout();
    snapshot();
  }

  const resizeObserver = createResizeObserver(canvas, refresh);
  refresh();

  return {
    update(options) {
      current = options;
      applySelectAll(options.selectAll);
      if (options.editState === 'open') {
        enterEdit();
      } else {
        exitEdit();
      }
      snapshot();
    },
    dispose() {
      if (pollId !== null) {
        clearInterval(pollId);
        pollId = null;
      }
      if (editor.innerEditing) editor.closeInnerEditor();
      resizeObserver.disconnect();
      app.destroy();
    },
  };
}
