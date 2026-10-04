/**
 * 范例介绍：「问题定位指引」查询工具——Controls 选择手头的安全现象，readout
 * 给出该现象对应的检查面板、Issue 类别、修复方向，并如实标注能否在本页复现。
 * 前置状态：无需任何环境；本页跑在 http://localhost（浏览器把 localhost 视为
 * 可信来源），混合内容、证书错误、第三方 cookie 限制都需要特定 HTTP 环境才能
 * 复现，演示页不伪造这些读数——标注「否」的现象只给指引，不给假读数。
 * 主要操作：Controls 的「选择现象」切换指引；「触发演示 Issue」在本页执行一次
 *   主线程同步 XHR（向自身地址 GET 当前文档，响应读完即弃），关闭再打开可重复触发。
 * 预期结果：弃用警告是本页唯一可真实复现的 Issues 面板现象——Console 立即出现
 *   [Deprecation] 弃用警告，打开 DevTools 的 Issues 面板能看到对应条目（启用
 *   Group by kind 实验后归入 Breaking Changes 类）。
 * 阅读主线：SYMPTOMS 是「现象 → 指引」的静态数据表，其余 readout 行都是查表
 *   渲染；triggerDeprecation() 是唯一的动态行为，职责只有一个——让浏览器发出
 *   一条真实的弃用警告。
 */

/** 演示页收录的安全现象。 */
export type SymptomId =
  | 'mixed'
  | 'http'
  | 'cert'
  | 'cookie'
  | 'cors'
  | 'csp'
  | 'deprecation';

export interface SymptomGuide {
  /** 现象名（Controls 选项文案与 readout「现象」行）。 */
  label: string;
  /** 该现象先看哪里：面板 → 区域 → 按钮。 */
  entry: string;
  /** Issues 面板的类别；主源状态与证书问题不收录条目，用「—」说明。 */
  category: string;
  /** 关键修复方向。 */
  fix: string;
  /** 本页能否真实复现。 */
  reproducible: boolean;
  /** 复现结论的原因与替代路径。 */
  reproNote: string;
}

export const SYMPTOMS: Record<SymptomId, SymptomGuide> = {
  mixed: {
    label: 'Console 报 Mixed Content（混合内容）',
    entry:
      'Security 面板 > Overview（partially protected）＋ Issues 面板 > Mixed content；Security > Non-secure origins → View requests in Network panel',
    category: 'Mixed content',
    fix: '子资源 URL 升级为 https；无 https 版本则换源、自托管或移除；CSP upgrade-insecure-requests 兜底',
    reproducible: false,
    reproNote: '本页是 http://localhost：加载 http 资源不构成混合内容，需 HTTPS 主源（复现条件见正文）',
  },
  http: {
    label: '地址栏显示「不安全」（页面走 HTTP）',
    entry: 'Security 面板 > Overview：This page is not secure（Non-secure main origins）',
    category: '—（主源状态，Issues 面板不收录）',
    fix: '服务端启用 HTTPS 重定向；证书用 Let\'s Encrypt，或托管到支持 HTTPS 的 CDN',
    reproducible: false,
    reproNote: 'localhost 是浏览器的可信来源，地址栏不标记「不安全」；需线上 HTTP 站点',
  },
  cert: {
    label: '证书警告（页面打不开，NET::ERR_CERT_*）',
    entry:
      '加载前已被 Chrome 插页拦截；放行后 Security 面板 > Overview（broken HTTPS）＋ View certificate',
    category: '—（证书问题，非页面 Issue）',
    fix: '检查证书有效期、域名匹配与证书链；在签发与部署侧修复，本地开发配受信证书',
    reproducible: false,
    reproNote: '需一个证书无效的 HTTPS 服务（自签或过期证书）',
  },
  cookie: {
    label: 'Cookie 被拦截／标记（SameSite、第三方 cookie）',
    entry:
      'Issues 面板 > Cookie 条目＋ Privacy 面板 > Third-party cookies 表格（Allowed / Blocked 筛选）',
    category: 'Cookie',
    fix: '服务端 Set-Cookie 补齐 Secure / SameSite 属性；被限制的第三方 cookie 评估必需性，不依赖浏览器开关豁免',
    reproducible: false,
    reproNote: '本页 cookie 是第一方且来自可信的 localhost，不触发第三方限制',
  },
  cors: {
    label: 'Console 报 CORS 跨源错误',
    entry: 'Issues 面板 > CORS 错误；AFFECTED RESOURCES 链到 Network 面板的具体请求',
    category: 'CORS error',
    fix: '服务端补 Access-Control-Allow-Origin 等响应头；核对请求方法与 credentials 配置',
    reproducible: false,
    reproNote: '需跨源目标与外部网络，本页没有稳定的靶标',
  },
  csp: {
    label: 'Console 报 CSP 违规（Content-Security-Policy）',
    entry: 'Issues 面板 > Content Security Policy 条目；Console 同步显示违规',
    category: 'CSP violation',
    fix: '按违规调整 CSP 指令（放行来源或改写内联代码）；先用 Content-Security-Policy-Report-Only 观察',
    reproducible: false,
    reproNote: '本页未部署 CSP，无违规可产生',
  },
  deprecation: {
    label: 'Console 报 [Deprecation] 弃用警告',
    entry:
      'Issues 面板（启用 Group by kind 实验后归入 Breaking Changes）；Console 同步显示警告',
    category: 'Breaking Changes（弃用警告）',
    fix: '按警告指引换用新 API（本页示例：主线程同步 XHR → 改用 fetch 或异步 XHR）',
    reproducible: true,
    reproNote: '点「触发演示 Issue」：本页向自身地址发一次主线程同步 XHR，Console 与 Issues 面板立即可查',
  },
};

export interface LocatorOptions {
  symptom: SymptomId;
  trigger: boolean;
}

export interface LocatorInstance {
  update(options: LocatorOptions): void;
  dispose(): void;
}

const LOCATOR_STYLES = `
.issue-locator {
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
.issue-locator__main {
  flex: 1 1 280px;
  min-width: 0;
}
.issue-locator__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.issue-locator__verdict {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
}
.issue-locator__verdict-label {
  font: 600 13px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
  white-space: nowrap;
}
.issue-locator__verdict-note {
  font-size: 12px;
  color: #5d6f67;
}
.issue-locator__readout {
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
.issue-locator__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.issue-locator__readout dd {
  margin: 0;
  color: #172033;
  overflow-wrap: anywhere;
}
.issue-locator__readout dd.issue-locator__cell-no {
  color: #9a3412;
}
.issue-locator__readout dd.issue-locator__cell-yes {
  color: #166534;
}
`;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * 本页唯一的动态行为：主线程同步 XHR（open 第三参为 false）触发浏览器弃用警告。
 * 请求目标是本页文档自身，响应读完即弃——它只负责让 [Deprecation] 警告发生。
 */
function triggerDeprecation(): string {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', window.location.href, false);
    xhr.send();
    return '已发送（主线程同步 XHR）';
  } catch (error) {
    const name = error instanceof DOMException ? error.name : 'Error';
    return `触发失败：${name}`;
  }
}

export function createIssueLocator(root: HTMLElement): LocatorInstance {
  root.classList.add('issue-locator');
  root.innerHTML = `
    <div class="issue-locator__main">
      <p class="issue-locator__hint">问题定位指引：在下方 Controls 选择手头现象，readout 给出对应的检查面板、Issue 类别与修复方向，并<b>如实标注</b>该现象能否在本页复现——标注「否」的只给指引，不伪造安全读数。唯一标注「是」的是弃用警告：打开「触发演示 Issue」，本页执行一次主线程同步 XHR，Console 出现 [Deprecation] 警告，Issues 面板出现对应条目。</p>
      <div class="issue-locator__verdict">
        <span class="issue-locator__verdict-label"></span>
        <span class="issue-locator__verdict-note"></span>
      </div>
    </div>
    <dl class="issue-locator__readout">
      <dt>现象</dt><dd class="issue-locator__cell-label"></dd>
      <dt>检查入口</dt><dd class="issue-locator__cell-entry"></dd>
      <dt>Issue 类别</dt><dd class="issue-locator__cell-category"></dd>
      <dt>修复方向</dt><dd class="issue-locator__cell-fix"></dd>
      <dt>本页复现</dt><dd class="issue-locator__cell-repro"></dd>
      <dt>最近触发</dt><dd class="issue-locator__cell-trigger">—（打开「触发演示 Issue」执行一次）</dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = LOCATOR_STYLES;
  root.append(styleEl);

  const verdictLabel = root.querySelector(
    '.issue-locator__verdict-label',
  ) as HTMLElement;
  const verdictNote = root.querySelector(
    '.issue-locator__verdict-note',
  ) as HTMLElement;
  const cellLabel = root.querySelector(
    '.issue-locator__cell-label',
  ) as HTMLElement;
  const cellEntry = root.querySelector(
    '.issue-locator__cell-entry',
  ) as HTMLElement;
  const cellCategory = root.querySelector(
    '.issue-locator__cell-category',
  ) as HTMLElement;
  const cellFix = root.querySelector('.issue-locator__cell-fix') as HTMLElement;
  const cellRepro = root.querySelector(
    '.issue-locator__cell-repro',
  ) as HTMLElement;
  const cellTrigger = root.querySelector(
    '.issue-locator__cell-trigger',
  ) as HTMLElement;

  let disposed = false;

  function paintGuide(options: LocatorOptions): void {
    const guide = SYMPTOMS[options.symptom];
    verdictLabel.textContent = guide.label;
    verdictNote.textContent = `本页复现：${guide.reproducible ? '是' : '否'}`;
    cellLabel.textContent = guide.label;
    cellEntry.textContent = guide.entry;
    cellCategory.textContent = guide.category;
    cellFix.textContent = guide.fix;
    cellRepro.textContent = `${guide.reproducible ? '是' : '否'}（${guide.reproNote}）`;
    cellRepro.classList.toggle('issue-locator__cell-yes', guide.reproducible);
    cellRepro.classList.toggle('issue-locator__cell-no', !guide.reproducible);
  }

  return {
    update(options) {
      if (disposed) {
        return;
      }
      paintGuide(options);
      if (options.trigger) {
        cellTrigger.textContent = truncate(triggerDeprecation(), 96);
      }
    },
    dispose() {
      disposed = true;
    },
  };
}
