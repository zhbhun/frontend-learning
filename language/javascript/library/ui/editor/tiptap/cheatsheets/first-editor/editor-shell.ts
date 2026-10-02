/*
 * 编辑器外壳：用原生 DOM 复现 @tiptap/core 生命周期各步骤的可观察结果，
 * 让本课交互实例在未安装 @tiptap 依赖的工作区也能演示。
 *
 * 复现范围（依据官方文档与 @tiptap/core 源码核对）：
 * - 视图 DOM：挂载元素内出现 class 为 "tiptap ProseMirror" 的 div；
 * - contenteditable 与 tabindex 跟随 editable 状态；
 * - element 缺省时挂进构造函数自建的游离 div，element 为 null 时等 mount() 补挂；
 * - unmount() 移除视图但文档状态保留在实例上，mount() 可重新挂载；
 * - destroy() 是终态；
 * - 解析 content 时丢弃 schema 未注册的标签。本外壳的 schema 只有
 *   document > paragraph > text，与官方 minimal setup 的三个扩展一致。
 *
 * 与真实 Tiptap 的差距：没有命令、扩展与协作机制，段落被简化为纯文本，
 * 不能作为行为基准；真实运行效果以课程「快速上手」的代码为准。
 */

/** ProseMirror 文档 JSON 的最小子集，只覆盖 document > paragraph > text。 */
export interface DocJson {
  type: string;
  text?: string;
  content?: DocJson[];
}

export interface ShellOptions {
  /** 挂载元素；缺省时自建游离 div，显式传 null 时不挂载、等 mount() 补挂。 */
  element?: HTMLElement | null;
  /** 初始内容：HTML 字符串或 JSON 文档。 */
  content?: string | DocJson;
  /** 是否可编辑，默认 true。 */
  editable?: boolean;
}

export interface ParseResult {
  /** schema 接受的段落（纯文本）。 */
  paragraphs: string[];
  /** 被丢弃的标签名或节点类型。 */
  dropped: string[];
}

/** 真实视图由 Tiptap 加 "tiptap" 类，prosemirror-view 加 "ProseMirror" 类。 */
const VIEW_CLASS = 'tiptap ProseMirror';

export function parseContent(content: string | DocJson): ParseResult {
  return typeof content === 'string' ? parseHtml(content) : parseDocJson(content);
}

/**
 * 解析 HTML 字符串：只保留顶层 <p> 的文字内容，其余标签按 ProseMirror 的
 * 解析规则丢弃。真实 schema 还会保留加粗、链接等行内标记。
 */
function parseHtml(html: string): ParseResult {
  const template = document.createElement('template');
  template.innerHTML = html;
  const paragraphs: string[] = [];
  const dropped: string[] = [];

  template.content.querySelectorAll('p').forEach((p) => {
    paragraphs.push(p.textContent ?? '');
  });

  template.content.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName !== 'P') {
      dropped.push((node as Element).tagName.toLowerCase());
    }
  });

  return { paragraphs, dropped };
}

/** 解析 JSON 文档：只认 document > paragraph > text，其余节点类型丢弃。 */
function parseDocJson(doc: DocJson): ParseResult {
  const paragraphs: string[] = [];
  const dropped: string[] = [];

  if (doc.type !== 'doc') {
    dropped.push(doc.type);
    return { paragraphs, dropped };
  }

  (doc.content ?? []).forEach((block) => {
    if (block.type !== 'paragraph') {
      dropped.push(block.type);
      return;
    }

    let text = '';
    (block.content ?? []).forEach((inline) => {
      if (inline.type === 'text') {
        text += inline.text ?? '';
      } else {
        dropped.push(inline.type);
      }
    });
    paragraphs.push(text);
  });

  return { paragraphs, dropped };
}

export class EditorShell {
  private host: HTMLElement | null;
  private view: HTMLDivElement | null = null;
  private paragraphs: string[];
  private editableFlag: boolean;
  private destroyedFlag = false;

  constructor(options: ShellOptions = {}) {
    // 与 @tiptap/core 一致：缺省 element 时自建游离 div；显式传 null 时不挂载
    this.host =
      'element' in options ? (options.element ?? null) : document.createElement('div');
    this.editableFlag = options.editable ?? true;
    // content 只在创建时解析一次，之后运行期的修改不走这里
    this.paragraphs = parseContent(options.content ?? '').paragraphs;

    // 与 @tiptap/core 一致：element 存在（含自建游离 div）时构造即挂载
    if (this.host) {
      this.mount();
    }
  }

  get hostElement(): HTMLElement | null {
    return this.host;
  }

  get viewElement(): HTMLDivElement | null {
    return this.view;
  }

  get isEditable(): boolean {
    return this.editableFlag;
  }

  get isDestroyed(): boolean {
    return this.destroyedFlag;
  }

  /** 挂载视图；传入 target 可换一个宿主元素（对应编辑器搬家）。 */
  mount(target?: HTMLElement): void {
    if (this.destroyedFlag || this.view) {
      return;
    }
    if (target) {
      this.host = target;
    }
    if (!this.host) {
      return;
    }

    const view = document.createElement('div');
    view.className = VIEW_CLASS;
    this.applyEditableAttributes(view);
    this.paragraphs.forEach((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      view.append(p);
    });
    this.host.append(view);
    this.view = view;
  }

  /**
   * 摘下视图但保留文档状态：与 prosemirror-view 一致，
   * 之后 mount() 重新挂载时内容还在。
   */
  unmount(): void {
    if (!this.view) {
      return;
    }
    this.view.remove();
    this.view = null;
  }

  /** 真实签名是 setEditable(editable, emitUpdate = true)，本外壳不派发事件。 */
  setEditable(editable: boolean): void {
    this.editableFlag = editable;
    if (this.view) {
      this.applyEditableAttributes(this.view);
    }
  }

  /** 终态：真实实现还会解绑全部事件监听并弃用扩展管理器与 schema。 */
  destroy(): void {
    if (this.destroyedFlag) {
      return;
    }
    this.destroyedFlag = true;
    this.unmount();
  }

  /**
   * 与文档核对的可编辑属性：contenteditable 跟随 editable；
   * tabindex 默认只加在可编辑视图上（coreExtensionOptions.tabindex 可配置）。
   */
  private applyEditableAttributes(view: HTMLDivElement): void {
    view.setAttribute('contenteditable', String(this.editableFlag));
    if (this.editableFlag) {
      view.setAttribute('tabindex', '0');
    } else {
      view.removeAttribute('tabindex');
    }
  }
}
