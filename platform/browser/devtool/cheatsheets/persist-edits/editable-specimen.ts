/**
 * 范例介绍：「待修改标本」——一个配色呆板（出厂灰）、文案过时（还停留在 2019 年）的产品横幅页。
 * 输入与前置：加载时 fetch 同目录的 specimen-config.json（真实网络请求，Network 面板可见，
 *   因此可被 Local Overrides 覆盖）；Controls 的「重置」开关与标本上的「重置」按钮
 *   都只回到「本次加载到的配置」，不会移除 Overrides。
 * 主要操作：Console / Snippet 里调用 specimen API（setAccent、setTagline、applyPreset、
 *   state、reset）做临时修改；在 Network 面板对 specimen-config.json 做 Override content
 *   实现跨刷新持久。标本运行在 Storybook 的预览 iframe 里，为免切换执行上下文，
 *   API 同时挂到了顶层窗口（这就是正文说的「演示页替你接好的桥」）。
 * 预期结果：readout 显示当前生效状态——脚本修改刷新即失（相对本次加载 = 已修改）；
 *   Overrides 修改刷新仍在，且点「重置」也回不去，只有删除覆盖文件才恢复出厂样子。
 * 阅读主线：loadConfig() → applyConfig() → render()；几个脚本 API 只改运行中的状态，
 *   从不写回加载配置——这正是「临时改」与「覆盖加载内容」的分界线。
 */
import configUrl from './specimen-config.json?url';

/** 备选方案：一组可整体应用的配色与文案，来自配置文件的 presets 数组。 */
export interface SpecimenPreset {
  name: string;
  accent: string;
  tagline: string;
  note: string;
}

/** 当前生效状态：脚本 API 与 Overrides 改的都是这三项的来源。 */
export interface SpecimenState {
  presetName: string;
  accent: string;
  tagline: string;
}

/** specimen-config.json 的形状。 */
export interface SpecimenConfig {
  presetName: string;
  accent: string;
  tagline: string;
  presets: SpecimenPreset[];
}

export interface EditableSpecimenInstance {
  /** Controls 参数入口：reset 拨到任意一侧都触发一次重置。 */
  update(options: { reset: boolean }): void;
  dispose(): void;
}

const API_NAME = 'specimen';

const SPECIMEN_STYLES = `
.editable-specimen {
  --es-accent: #8a8f98;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #e9eef4;
  color: #334155;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.editable-specimen__main {
  flex: 1 1 320px;
  min-width: 0;
  display: grid;
  gap: 12px;
}
.editable-specimen__banner {
  display: grid;
  gap: 10px;
  justify-items: start;
  padding: 18px 20px;
  border: 1px solid var(--es-accent);
  border-left: 6px solid var(--es-accent);
  border-radius: 8px;
  background: #ffffff;
}
.editable-specimen__badge {
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--es-accent);
  color: #ffffff;
  font-size: 12px;
  letter-spacing: 0.08em;
}
.editable-specimen__tagline {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #172033;
}
.editable-specimen__cta {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: var(--es-accent);
  color: #ffffff;
  font: 600 13px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.editable-specimen__reset {
  justify-self: start;
  padding: 5px 12px;
  border: 1px solid #b9c6e0;
  border-radius: 6px;
  background: #f6f8fb;
  color: #334155;
  font: 12px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.editable-specimen__hint {
  margin: 0;
  font-size: 12px;
  color: #5d6f67;
}
.editable-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.editable-specimen__readout {
  flex: 1 1 230px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-content: start;
  margin: 0;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.editable-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.editable-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
  word-break: break-all;
}
.editable-specimen__readout dd[data-diff='changed'] {
  color: #b45309;
}
.editable-specimen__chip {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 6px;
  border: 1px solid rgb(0 0 0 / 20%);
  border-radius: 3px;
  vertical-align: -1px;
}
`;

function readConfigUrlPath(): string {
  try {
    return new URL(configUrl, window.location.href).pathname;
  } catch {
    return configUrl;
  }
}

function sameState(a: SpecimenState, b: SpecimenState): boolean {
  return a.accent === b.accent && a.tagline === b.tagline && a.presetName === b.presetName;
}

export function createEditableSpecimen(root: HTMLElement): EditableSpecimenInstance {
  root.classList.add('editable-specimen');
  root.innerHTML = `
    <div class="editable-specimen__main">
      <div class="editable-specimen__banner">
        <span class="editable-specimen__badge">…</span>
        <p class="editable-specimen__tagline">配置加载中…</p>
        <button class="editable-specimen__cta" type="button">立即体验</button>
      </div>
      <button class="editable-specimen__reset" type="button">重置到本次加载状态</button>
      <p class="editable-specimen__hint">这个横幅页等你来改：在 Console 或 Snippet 里调用 <code>specimen.setAccent('#0f766e')</code>、<code>specimen.applyPreset()</code> 是临时改；在 Network 面板右键 <code>specimen-config.json</code> 选 Override content 则能跨刷新。重置救不回覆盖，只清掉临时改。</p>
    </div>
    <dl class="editable-specimen__readout">
      <dt>加载状态</dt><dd data-cell="load">加载中…</dd>
      <dt>主题色</dt><dd data-cell="accent"><i class="editable-specimen__chip"></i><code data-cell="accent-code"></code></dd>
      <dt>标语</dt><dd data-cell="tagline"></dd>
      <dt>当前方案</dt><dd data-cell="preset"></dd>
      <dt>相对本次加载</dt><dd data-cell="diff" data-diff="same">—</dd>
      <dt>脚本调用</dt><dd data-cell="calls">0 次</dd>
      <dt>配置请求</dt><dd data-cell="url"></dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const badge = root.querySelector('.editable-specimen__badge') as HTMLElement;
  const taglineEl = root.querySelector('.editable-specimen__tagline') as HTMLElement;
  const chip = root.querySelector('.editable-specimen__chip') as HTMLElement;
  const cells = {
    load: root.querySelector('[data-cell="load"]') as HTMLElement,
    accentCode: root.querySelector('[data-cell="accent-code"]') as HTMLElement,
    tagline: root.querySelector('[data-cell="tagline"]') as HTMLElement,
    preset: root.querySelector('[data-cell="preset"]') as HTMLElement,
    diff: root.querySelector('[data-cell="diff"]') as HTMLElement,
    calls: root.querySelector('[data-cell="calls"]') as HTMLElement,
    url: root.querySelector('[data-cell="url"]') as HTMLElement,
  };
  cells.url.textContent = readConfigUrlPath();

  let loaded: SpecimenConfig | null = null;
  let current: SpecimenState | null = null;
  let loadFailed = false;
  let scriptCalls = 0;
  let cycleIndex = -1;
  let lastResetArg = false;

  function render(): void {
    if (!current) {
      cells.load.textContent = loadFailed
        ? '加载失败：配置 JSON 不合法（Console 有警告）'
        : '加载中…';
      return;
    }
    cells.load.textContent = '已加载';
    badge.textContent = current.presetName;
    taglineEl.textContent = current.tagline;
    root.style.setProperty('--es-accent', current.accent);
    chip.style.background = current.accent;
    cells.accentCode.textContent = current.accent;
    cells.tagline.textContent = current.tagline;
    cells.preset.textContent = current.presetName;
    const pristine = loaded !== null
      && sameState(current, { presetName: loaded.presetName, accent: loaded.accent, tagline: loaded.tagline });
    cells.diff.textContent = pristine ? '原样' : '已修改（脚本改动，刷新即失）';
    cells.diff.dataset.diff = pristine ? 'same' : 'changed';
    cells.calls.textContent = `${scriptCalls} 次`;
  }

  /* 加载配置：唯一的网络来源，也是「本次加载状态」的基准。
     覆盖（Local Overrides）生效后，这个响应本身就是被改过的副本。 */
  async function loadConfig(): Promise<void> {
    try {
      const response = await fetch(configUrl);
      const parsed = JSON.parse(await response.text()) as SpecimenConfig;
      if (
        typeof parsed.accent !== 'string'
        || typeof parsed.tagline !== 'string'
        || typeof parsed.presetName !== 'string'
        || !Array.isArray(parsed.presets)
      ) {
        throw new Error('配置字段不完整');
      }
      loaded = parsed;
      applyConfig(parsed.presetName, parsed.accent, parsed.tagline);
    } catch (error) {
      loadFailed = true;
      console.warn(
        '[标本] 配置加载失败：',
        error,
        '——如果你刚编辑过 specimen-config.json 的覆盖副本，检查 JSON 是否合法；或到 Sources → Overrides 删除该覆盖文件。',
      );
    } finally {
      render();
    }
  }

  function applyConfig(presetName: string, accent: string, tagline: string): void {
    current = { presetName, accent, tagline };
  }

  function requireLoaded(action: string): boolean {
    if (!loaded || !current) {
      console.warn(`[标本] 配置还没加载完成，${action} 暂不可用，稍后再试。`);
      return false;
    }
    return true;
  }

  function countCall(): void {
    scriptCalls += 1;
  }

  /* ---- 脚本 API：挂在顶层窗口的 specimen。只改运行中的状态，从不写回加载配置。 ---- */
  const api = {
    /** 临时改主题色，例如 specimen.setAccent('#0f766e')。 */
    setAccent(color: string): void {
      if (!requireLoaded('setAccent')) return;
      applyConfig(current!.presetName, color, current!.tagline);
      countCall();
      render();
    },
    /** 临时改标语，例如 specimen.setTagline('2026，重新出发')。 */
    setTagline(text: string): void {
      if (!requireLoaded('setTagline')) return;
      applyConfig(current!.presetName, current!.accent, text);
      countCall();
      render();
    },
    /** 应用备选方案；不传名字时按 presets 顺序循环切换。名字打错会在 Console 列出可用项。 */
    applyPreset(name?: string): void {
      if (!requireLoaded('applyPreset')) return;
      const presets = loaded!.presets;
      if (presets.length === 0) {
        console.warn('[标本] 当前配置里没有备选方案可用。');
        return;
      }
      let target: SpecimenPreset | undefined;
      if (name === undefined) {
        cycleIndex = (cycleIndex + 1) % presets.length;
        target = presets[cycleIndex];
      } else {
        target = presets.find((preset) => preset.name === name);
        if (!target) {
          console.warn(
            `[标本] 没有叫「${name}」的备选方案。可用：${presets.map((preset) => preset.name).join('、')}`,
          );
          return;
        }
      }
      applyConfig(target.name, target.accent, target.tagline);
      countCall();
      render();
    },
    /** 读取当前生效状态，适合在 Snippet 里打印对照。 */
    state(): SpecimenState & { scriptCalls: number } {
      return { ...(current ?? { presetName: '', accent: '', tagline: '' }), scriptCalls };
    },
    /** 回到本次加载到的配置。清得掉临时改，清不掉 Overrides。 */
    reset(): void {
      if (!loaded) {
        console.warn('[标本] 配置还没加载完成，暂无可重置的状态。');
        return;
      }
      applyConfig(loaded.presetName, loaded.accent, loaded.tagline);
      render();
    },
  };

  /* 桥接：标本运行在预览 iframe 里，把 API 同时挂到顶层窗口，
     Console 与 Snippets 的默认 top 上下文就能直接使用。 */
  const ownScope = window as unknown as Record<string, unknown>;
  ownScope[API_NAME] = api;
  let topScope: Record<string, unknown> | null = null;
  try {
    topScope = window.top as unknown as Record<string, unknown> | null;
  } catch {
    topScope = null;
  }
  if (topScope && topScope !== ownScope) {
    topScope[API_NAME] = api;
  }

  /* 预览 iframe 被销毁时 MutationObserver 不会触发（观察者随文档一起消亡），
     靠 pagehide 把顶层窗口上的桥接一并摘掉，避免别的页面留下失效引用。 */
  function unbridge(): void {
    delete ownScope[API_NAME];
    if (topScope && topScope !== ownScope) {
      delete topScope[API_NAME];
    }
  }
  window.addEventListener('pagehide', unbridge, { once: true });

  root.querySelector('.editable-specimen__reset')?.addEventListener('click', () => {
    api.reset();
  });
  root.querySelector('.editable-specimen__cta')?.addEventListener('click', () => {
    console.info('[标本] 「立即体验」被点击：演示按钮没有真实行为，它在这里只为了让配色有一个落点。');
  });

  void loadConfig();

  return {
    update(options) {
      if (options.reset !== lastResetArg) {
        lastResetArg = options.reset;
        api.reset();
      }
    },
    dispose() {
      window.removeEventListener('pagehide', unbridge);
      unbridge();
    },
  };
}
