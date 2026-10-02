/**
 * 范例：content 的两种格式等价，未注册的标签在解析时被丢弃。
 * 前置状态：外壳 schema 只有 document > paragraph > text（对应官方 minimal setup）。
 * 操作：切换「content 预设」——HTML 字符串 / JSON 文档 / 含未注册标签。
 * 预期结果：前两种渲染出相同的两段文字；第三种只剩 <p> 段落，img、aside 被丢弃。
 * 阅读主线：对照上方 content 输入源码、编辑区渲染结果与读数「被丢弃」。
 */
import { EditorShell, parseContent, type DocJson } from './editor-shell';

export type ContentPreset = 'html' | 'json' | 'unknown';

export interface InitialContentArgs {
  preset: ContentPreset;
}

export interface InitialContentSnapshot {
  paragraphCount: number;
  dropped: string;
}

export interface InitialContentInstance {
  update(args: InitialContentArgs): void;
  dispose(): void;
}

const HTML_PRESET = '<p>用 HTML 字符串初始化</p><p>渲染结果直接可读</p>';

const JSON_PRESET: DocJson = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: '用 JSON 文档初始化' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '渲染结果与 HTML 相同' }] },
  ],
};

// img 与 aside 不在 document > paragraph > text 里，解析时被丢弃
const UNKNOWN_PRESET =
  '<p>已注册的段落保留</p><img src=""><aside>未注册的标签被丢弃</aside>';

const PRESETS: Record<ContentPreset, string | DocJson> = {
  html: HTML_PRESET,
  json: JSON_PRESET,
  unknown: UNKNOWN_PRESET,
};

export function createInitialContentDemo(
  stage: HTMLElement,
  emit: (snapshot: InitialContentSnapshot) => void,
): InitialContentInstance {
  const frame = document.createElement('div');
  frame.className = 'fe-frame';

  const sourceLabel = document.createElement('p');
  sourceLabel.className = 'fe-box-label';
  sourceLabel.textContent = 'content 输入';
  const source = document.createElement('pre');
  source.className = 'fe-source';

  const hostLabel = document.createElement('p');
  hostLabel.className = 'fe-box-label';
  hostLabel.textContent = '挂载元素 <div class="element"> 内的渲染结果';
  const host = document.createElement('div');
  host.className = 'fe-box';

  frame.append(sourceLabel, source, hostLabel, host);
  stage.append(frame);

  let shell: EditorShell | null = null;

  function snapshot(dropped: string[]): InitialContentSnapshot {
    return {
      paragraphCount: host.querySelectorAll('p').length,
      dropped: dropped.length > 0 ? dropped.join('、') : '无',
    };
  }

  // content 是构造选项：每次切换都重新 new Editor，验证解析只发生在创建时
  function applyPreset(preset: ContentPreset): void {
    shell?.destroy();
    host.replaceChildren();

    const content = PRESETS[preset];
    source.textContent =
      typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    const parsed = parseContent(content);
    shell = new EditorShell({ element: host, content });
    emit(snapshot(parsed.dropped));
  }

  return {
    update(args) {
      applyPreset(args.preset);
    },
    dispose() {
      shell?.destroy();
      frame.remove();
    },
  };
}
