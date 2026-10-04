/**
 * 范例介绍：「配置驱动标本」——一个渲染数据全部来自网络 JSON 配置的页面。
 * 输入与前置：加载时 fetch 同目录的 app-config.json（Controls 可把请求路径切到
 *   app-config-beta.json）；两份配置体积都超过构建内联阈值，静态构建后仍是真实
 *   网络文件，能被 DevTools 节流、阻断与覆盖命中。请求带 cache: 'no-store'，
 *   保证每次「重新请求」都真实经过网络层（缓存命中的请求不会出现在 Network，
 *   也拦不住）。
 * 主要操作：Controls「重新请求」「请求路径」与标本上的「重新请求」按钮触发 fetch；
 *   读者在 Network 面板对这条请求做 Block request、Override content、Override
 *   headers 与 Throttling 练习。
 * 预期结果：readout 显示请求状态（成功 · 用时 / 失败 · 立即 / 超时 · 4000 ms 放弃）、
 *   生效配置来源（网络 / 内置降级）与渲染值；被阻断或超时都退回内置降级配置；
 *   「响应头 x-config-env」读数用 response.headers.get 读回，专门用来核对
 *   Override headers 的效果（静态服务器本没有这个头，加上了才显示）。
 * 阅读主线：requestConfig() → applyConfig() → render()。超时（AbortController）
 *   与降级（FALLBACK_CONFIG）是应用层自己的健壮性代码，不是 DevTools 提供的——
 *   页面并不知道自己的网络被调过。
 */
import betaConfigUrl from './app-config-beta.json?url';
import prodConfigUrl from './app-config.json?url';
import leafIconUrl from './icon-leaf.svg?url';
import rocketIconUrl from './icon-rocket.svg?url';

/** app-config.json 的形状；渲染只读 theme / flags / icon 三个字段。 */
export interface AppConfig {
  configVersion: string;
  theme: { headline: string; tagline: string; accent: string };
  flags: { showBadge: boolean; showPromo: boolean };
  icon: string;
  rolloutNotes: Array<{ version: string; note: string }>;
}

/** 请求结局：应用层主动放弃的超时与「立即失败」是两条不同的降级路径。 */
export type RequestStatus =
  | { kind: 'loading' }
  | { kind: 'ok'; ms: number }
  | { kind: 'failed'; ms: number }
  | { kind: 'timeout'; ms: number };

export interface ConfigSpecimenInstance {
  /** Controls 入口：refetch 拨到任意一侧触发重新请求；configPath 切换请求路径。 */
  update(options: { refetch: boolean; configPath: ConfigPathKey }): void;
  dispose(): void;
}

/** 请求路径只这两个 key；每条 URL 独立，阻断与覆盖互不干扰。 */
const CONFIG_PATHS = {
  production: { label: 'production', url: prodConfigUrl },
  beta: { label: 'beta', url: betaConfigUrl },
} as const;

export type ConfigPathKey = keyof typeof CONFIG_PATHS;

/** 应用层主动放弃的阈值：弱网下等不到响应就降级，而不是一直转圈。 */
const REQUEST_TIMEOUT_MS = 4000;

/** 兜底配置：配置拿不到时页面仍要能渲染——这就是降级路径要验证的东西。 */
const FALLBACK_CONFIG: AppConfig = {
  configVersion: 'builtin',
  theme: {
    headline: '内置降级配置',
    tagline: '网络配置不可用 · 这份兜底值打包在应用里',
    accent: '#8a8f98',
  },
  flags: { showBadge: false, showPromo: false },
  icon: 'none',
  rolloutNotes: [],
};

const ICON_URLS: Record<string, string> = {
  rocket: rocketIconUrl,
  leaf: leafIconUrl,
};

const SPECIMEN_STYLES = `
.config-specimen {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #f4f7fc;
  color: #334155;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.config-specimen__main {
  flex: 1 1 340px;
  min-width: 0;
  display: grid;
  gap: 12px;
}
.config-specimen__banner {
  display: grid;
  gap: 10px;
  justify-items: start;
  padding: 18px 20px;
  border: 1px solid var(--cs-accent, #8a8f98);
  border-left: 6px solid var(--cs-accent, #8a8f98);
  border-radius: 8px;
  background: #ffffff;
}
.config-specimen__badge {
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--cs-accent, #8a8f98);
  color: #ffffff;
  font-size: 12px;
  letter-spacing: 0.08em;
}
.config-specimen__headline {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #172033;
}
.config-specimen__tagline {
  margin: 0;
  font-size: 13px;
  color: #5d6f8a;
}
.config-specimen__promo {
  padding: 3px 12px;
  border: 1px dashed var(--cs-accent, #8a8f98);
  border-radius: 6px;
  color: var(--cs-accent, #8a8f98);
  font-size: 12px;
  font-weight: 600;
}
.config-specimen__icon-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.config-specimen__icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
}
.config-specimen__icon-placeholder {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px dashed #b9c6e0;
  border-radius: 8px;
  color: #8a94ad;
  font-size: 18px;
}
.config-specimen__request {
  padding: 5px 12px;
  border: 1px solid #b9c6e0;
  border-radius: 6px;
  background: #f6f8fb;
  color: #334155;
  font: 12px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.config-specimen__hint {
  margin: 0;
  font-size: 12px;
  color: #5d6f67;
}
.config-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.config-specimen__readout {
  flex: 1 1 250px;
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
.config-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.config-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
  word-break: break-all;
}
.config-specimen__readout dd[data-warn='true'] {
  color: #b45309;
}
`;

function readUrlPath(url: string): string {
  try {
    return new URL(url, window.location.href).pathname;
  } catch {
    return url;
  }
}

function formatMs(ms: number): string {
  return ms >= 100 ? `${Math.round(ms)} ms` : `${ms.toFixed(1)} ms`;
}

export function createConfigSpecimen(root: HTMLElement): ConfigSpecimenInstance {
  root.classList.add('config-specimen');
  root.innerHTML = `
    <div class="config-specimen__main">
      <div class="config-specimen__banner">
        <span class="config-specimen__badge">…</span>
        <p class="config-specimen__headline">配置加载中…</p>
        <p class="config-specimen__tagline"></p>
        <div class="config-specimen__icon-row">
          <img class="config-specimen__icon" alt="配置指定的图标" hidden />
          <span class="config-specimen__icon-placeholder" hidden>◌</span>
        </div>
      </div>
      <button class="config-specimen__request" type="button">重新请求</button>
      <p class="config-specimen__hint">这个页面的一切渲染都来自网络配置：在 Network 面板右键配置请求可以做本课练习——<code>Block request</code> 看降级、<code>Override content</code> 改渲染、<code>Override headers</code> 加 <code>x-config-env</code> 头；Throttling 调慢后再「重新请求」看超时。</p>
    </div>
    <dl class="config-specimen__readout">
      <dt>请求路径</dt><dd data-cell="path">—</dd>
      <dt>请求状态</dt><dd data-cell="status">加载中…</dd>
      <dt>生效配置</dt><dd data-cell="source">—</dd>
      <dt>headline</dt><dd data-cell="headline">—</dd>
      <dt>showPromo</dt><dd data-cell="promo">—</dd>
      <dt>图标</dt><dd data-cell="icon">—</dd>
      <dt>响应头 x-config-env</dt><dd data-cell="env">—</dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const banner = root.querySelector('.config-specimen__banner') as HTMLElement;
  const badge = root.querySelector('.config-specimen__badge') as HTMLElement;
  const headlineEl = root.querySelector('.config-specimen__headline') as HTMLElement;
  const taglineEl = root.querySelector('.config-specimen__tagline') as HTMLElement;
  const promoEl = root.querySelector('.config-specimen__promo') as HTMLElement;
  const iconImg = root.querySelector('.config-specimen__icon') as HTMLImageElement;
  const iconPlaceholder = root.querySelector('.config-specimen__icon-placeholder') as HTMLElement;
  const cells = {
    path: root.querySelector('[data-cell="path"]') as HTMLElement,
    status: root.querySelector('[data-cell="status"]') as HTMLElement,
    source: root.querySelector('[data-cell="source"]') as HTMLElement,
    headline: root.querySelector('[data-cell="headline"]') as HTMLElement,
    promo: root.querySelector('[data-cell="promo"]') as HTMLElement,
    icon: root.querySelector('[data-cell="icon"]') as HTMLElement,
    env: root.querySelector('[data-cell="env"]') as HTMLElement,
  };

  let currentPathKey: ConfigPathKey = 'production';
  let effective: AppConfig | null = null;
  let status: RequestStatus = { kind: 'loading' };
  let envHeader: string | null = null;
  let iconMissing = false;
  let requestSeq = 0;
  let activeController: AbortController | null = null;
  let lastRefetch = false;

  function describeStatus(): string {
    switch (status.kind) {
      case 'loading':
        return '请求中…';
      case 'ok':
        return `成功 · ${formatMs(status.ms)}`;
      case 'timeout':
        return `超时 · 约 ${Math.round(status.ms)} ms 放弃`;
      case 'failed':
        return `失败 · ${formatMs(status.ms)}（请求没有到达服务器）`;
    }
  }

  function statusIsDegraded(): boolean {
    return status.kind === 'failed' || status.kind === 'timeout';
  }

  function renderStatus(): void {
    cells.status.textContent = describeStatus();
    cells.status.dataset.warn = statusIsDegraded() ? 'true' : 'false';
    cells.source.textContent = effective
      ? effective === FALLBACK_CONFIG
        ? '内置降级（builtin）'
        : `网络配置（v${effective.configVersion}）`
      : '—';
  }

  function renderIconReadout(): void {
    const key = effective ? effective.icon : '';
    cells.icon.textContent = iconMissing ? '缺失（降级）' : key in ICON_URLS ? key : `未知 key：${key}`;
    cells.icon.dataset.warn = iconMissing ? 'true' : 'false';
  }

  function render(): void {
    renderStatus();
    if (!effective) {
      return;
    }
    banner.style.setProperty('--cs-accent', effective.theme.accent);
    badge.textContent = effective === FALLBACK_CONFIG
      ? '降级 · 内置配置'
      : `${CONFIG_PATHS[currentPathKey].label} · v${effective.configVersion}`;
    headlineEl.textContent = effective.theme.headline;
    taglineEl.textContent = effective.theme.tagline;
    cells.headline.textContent = effective.theme.headline;
    cells.promo.textContent = effective.flags.showPromo ? '开（促销位显示）' : '关';
    if (effective.flags.showPromo) {
      promoEl.textContent = 'Beta 期间下单立减';
      promoEl.hidden = false;
    } else {
      promoEl.hidden = true;
    }
    renderIconReadout();
  }

  function showIcon(iconKey: string): void {
    iconMissing = false;
    const url = ICON_URLS[iconKey];
    if (!url) {
      iconMissing = true;
      iconImg.hidden = true;
      iconPlaceholder.hidden = false;
      return;
    }
    iconImg.hidden = false;
    iconPlaceholder.hidden = true;
    iconImg.src = url;
  }

  /* 图标请求被阻断（如 Block request 模式 *://…*.svg）时走 onerror 降级。 */
  iconImg.addEventListener('error', () => {
    iconMissing = true;
    iconImg.hidden = true;
    iconPlaceholder.hidden = false;
    renderIconReadout();
  });

  /* 校验 + 解析：Override content 把 JSON 改坏时在这里抛错，应用按「拿不到配置」降级。 */
  function parseConfig(text: string): AppConfig {
    const parsed = JSON.parse(text) as Partial<AppConfig>;
    if (
      typeof parsed.configVersion !== 'string'
      || typeof parsed.theme?.headline !== 'string'
      || typeof parsed.theme?.tagline !== 'string'
      || typeof parsed.theme?.accent !== 'string'
      || typeof parsed.flags?.showPromo !== 'boolean'
      || typeof parsed.flags?.showBadge !== 'boolean'
      || typeof parsed.icon !== 'string'
    ) {
      throw new Error('配置字段不完整');
    }
    return parsed as AppConfig;
  }

  /* 唯一的网络入口：超时（AbortController）与失败（被阻断 / 网络错误）都退回
     FALLBACK_CONFIG——页面感知不到 DevTools，只看到「网络不正常」。 */
  async function requestConfig(pathKey: ConfigPathKey): Promise<void> {
    const id = ++requestSeq;
    const target = CONFIG_PATHS[pathKey];
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;

    currentPathKey = pathKey;
    status = { kind: 'loading' };
    envHeader = null;
    cells.path.textContent = `${target.label} · ${readUrlPath(target.url)}`;
    render();

    const startedAt = performance.now();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(target.url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const headerEnv = response.headers.get('x-config-env');
      const config = parseConfig(await response.text());
      if (id !== requestSeq) {
        return;
      }
      effective = config;
      envHeader = headerEnv;
      status = { kind: 'ok', ms: performance.now() - startedAt };
      showIcon(config.icon);
    } catch (error) {
      if (id !== requestSeq) {
        return;
      }
      const timedOut = error instanceof DOMException && error.name === 'AbortError';
      status = timedOut
        ? { kind: 'timeout', ms: performance.now() - startedAt }
        : { kind: 'failed', ms: performance.now() - startedAt };
      effective = FALLBACK_CONFIG;
      showIcon(FALLBACK_CONFIG.icon);
      console.warn(
        '[标本] 配置没有拿回来，已退回内置降级配置：',
        error,
        '——到 Network 面板看这条请求的真实状态：(blocked:devtools) 表示被阻断；超时由标本的 4000 ms AbortController 主动放弃。',
      );
    } finally {
      clearTimeout(timer);
      if (id === requestSeq) {
        cells.env.textContent = envHeader ?? '(无)';
        cells.env.dataset.warn = envHeader ? 'true' : 'false';
        render();
      }
    }
  }

  root.querySelector('.config-specimen__request')?.addEventListener('click', () => {
    void requestConfig(currentPathKey);
  });

  return {
    update(options) {
      const pathChanged = options.configPath !== currentPathKey;
      const refetchToggled = options.refetch !== lastRefetch;
      lastRefetch = options.refetch;
      if (pathChanged || refetchToggled) {
        void requestConfig(options.configPath);
      }
    },
    dispose() {
      activeController?.abort();
      activeController = null;
    },
  };
}
