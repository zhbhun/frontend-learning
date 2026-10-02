/**
 * 范例介绍：扩展集合的随行成本——StarterKit 全量、精简、最小四件三档的
 * 扩展数、插件数、schema 规模与创建耗时对比。
 * 前置状态：同一份单段内容；计时创建进独立宿主元素，用 performance.now 测量，
 *   预热 1 次后创建 7 次取中位数（绝对值因机器而异，看三档的相对差）。
 * 操作：切换「扩展预设」，对比三档读数。
 * 预期结果：全量档扩展数 22、插件与 schema 成员最多、创建耗时最高；
 *   最小档扩展数 4、各档读数最低。
 * 阅读主线：每个扩展都往 schema、插件、输入规则和快捷键里加东西——
 *   启动时构建一次，之后每个事务都随行执行。
 */
import { Editor, type Extensions } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { StarterKit } from '@tiptap/starter-kit';

export type ExtensionPreset = 'starter-kit' | 'trimmed' | 'minimal';

export interface ExtensionTrimmingArgs {
  preset: ExtensionPreset;
}

export interface ExtensionTrimmingSnapshot {
  extensionCount: number;
  pluginCount: number;
  nodeTypeCount: number;
  markTypeCount: number;
  createCost: number;
}

export interface ExtensionTrimmingInstance {
  update(args: ExtensionTrimmingArgs): void;
  dispose(): void;
}

const CONTENT = '<p>扩展越少，启动越快，每个事务的随行钩子也越少。</p>';

// StarterKit 全量 22 个；关掉当前产品用不到的成员，保留 11 个
const TRIMMED_STARTER_KIT = StarterKit.configure({
  blockquote: false,
  code: false,
  codeBlock: false,
  dropcursor: false,
  gapcursor: false,
  horizontalRule: false,
  link: false,
  listKeymap: false,
  strike: false,
  trailingNode: false,
  underline: false,
});

const PRESETS: Record<ExtensionPreset, Extensions> = {
  'starter-kit': [StarterKit],
  trimmed: [TRIMMED_STARTER_KIT],
  minimal: [Document, Paragraph, Text, Bold],
};

// 预热 1 次排除首次加载噪声，再创建 runs 次取中位数
function measureCreateCost(extensions: Extensions, host: HTMLElement): number {
  createOnce(extensions, host).destroy();
  const samples: number[] = [];
  for (let i = 0; i < 7; i += 1) {
    const start = performance.now();
    const instance = createOnce(extensions, host);
    samples.push(performance.now() - start);
    instance.destroy();
  }
  samples.sort((a, b) => a - b);
  return samples[3];
}

function createOnce(extensions: Extensions, host: HTMLElement): Editor {
  return new Editor({ element: host, extensions, content: CONTENT });
}

export function createExtensionTrimmingDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExtensionTrimmingSnapshot) => void,
): ExtensionTrimmingInstance {
  const frame = document.createElement('div');
  frame.className = 'perf-frame';
  canvas.replaceWith(frame);

  const hostLabel = document.createElement('p');
  hostLabel.className = 'perf-box-label';
  hostLabel.textContent = '编辑器（切换预设后重新测量创建耗时）';
  const host = document.createElement('div');
  host.className = 'perf-editor perf-editor--readonly';

  frame.append(hostLabel, host);

  // 计时专用的独立宿主，不进入页面布局
  const benchHost = document.createElement('div');

  let editor: Editor | null = null;
  let lastPreset: ExtensionPreset | null = null;

  function applyPreset(preset: ExtensionPreset): void {
    // 预设未变时（如同页其他控件触发重渲染）复用上次测量结果
    if (preset === lastPreset && editor) {
      return;
    }
    lastPreset = preset;
    const extensions = PRESETS[preset];

    editor?.destroy();
    host.replaceChildren();
    editor = createOnce(extensions, host);

    const createCost = measureCreateCost(extensions, benchHost);

    emit({
      extensionCount: editor.extensionManager.extensions.length,
      pluginCount: editor.state.plugins.length,
      nodeTypeCount: Object.keys(editor.schema.nodes).length,
      markTypeCount: Object.keys(editor.schema.marks).length,
      createCost,
    });
  }

  applyPreset('starter-kit');

  return {
    update(args) {
      applyPreset(args.preset);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
