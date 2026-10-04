/**
 * 范例介绍：「请求发生器」——Controls 选择请求场景并真实发出 fetch；
 * readout 统计已发出请求数与各状态码条数。证据在读者自己打开的 DevTools
 * Network 面板里：先开面板，再切场景。
 * 前置状态：无需环境；Network 只记录面板打开期间的请求。
 * 主要操作：在 Controls 里切换「请求场景」；每次变化真实发出一批请求。
 * 预期结果：Network 列表新增对应请求行（orders-response.json 返回 200，
 *   missing-orders.json 返回 404）；readout 的「已发出」与 200 / 404 / 其他
 *   计数同步更新；慢速场景并发 12 个请求，在本地开发服务器的 HTTP/1.1
 *   连接上限下，后发的请求会先排队——Timing 页签的 Queueing 阶段可见。
 * 阅读主线：emitScenario() 把场景选择翻译成 fetch 调用；每个请求带递增的
 *   ?req= 查询参数，保证每次都是新 URL（不走缓存），也方便在 Payload 页签
 *   看查询字符串参数；状态计数取自真实 response.status，不是预设值。
 */
import ordersUrl from './orders-response.json?url';

/** 演示页下拉提供的请求场景。 */
export type ScenarioId = 'success' | 'not-found' | 'slow' | 'batch';

/** 「当前场景」区显示的中文名，与正文 Controls 的选项一致。 */
export const SCENARIO_LABELS: Record<ScenarioId, string> = {
  success: '成功 JSON',
  'not-found': '404',
  slow: '慢速',
  batch: '混合一批',
};

/** 各场景在演示页「当前场景」区显示的说明，与正文快速上手一一对应。 */
export const SCENARIO_HINTS: Record<ScenarioId, string> = {
  success: '单个 GET：同目录 JSON 返回 200，适合练习详情页签',
  'not-found': '请求不存在的路径：Status 404，Console 同时收到失败消息',
  slow: '并发 12 个相同请求：HTTP/1.1 同源连接上限让后发的排队，Timing 页签看 Queueing',
  batch: '一次 6 个请求（4 成功 + 2 失败），适合练习过滤、排序与导出 HAR',
};

export interface RequestSpecimenOptions {
  scenario: ScenarioId;
}

export interface RequestSpecimenInstance {
  update(options: RequestSpecimenOptions): void;
  dispose(): void;
}

/* 404 场景的目标路径：相对当前 iframe 文档解析，任何部署形态下都不存在。 */
const MISSING_ORDERS_PATH = './missing-orders.json';
/* 慢速场景的并发数：超过 HTTP/1.1 同源六连接上限，制造真实排队。 */
const SLOW_BATCH_SIZE = 12;
/* 混合批次的构成：4 个成功请求 + 2 个 404。 */
const BATCH_SUCCESS = 4;
const BATCH_MISSING = 2;

const SPECIMEN_STYLES = `
.fetch-specimen {
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
.fetch-specimen__main {
  flex: 1 1 300px;
  min-width: 0;
}
.fetch-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.fetch-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.fetch-specimen__call {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
}
.fetch-specimen__call-name {
  font: 600 13px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
}
.fetch-specimen__call-hint {
  font-size: 12px;
  color: #5d6f67;
}
.fetch-specimen__readout {
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
.fetch-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.fetch-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
}
`;

export function createRequestSpecimen(
  root: HTMLElement,
): RequestSpecimenInstance {
  root.classList.add('fetch-specimen');
  root.innerHTML = `
    <div class="fetch-specimen__main">
      <p class="fetch-specimen__hint">请求发生器：在下方 Controls 选择「请求场景」，每次切换都<b>真实发出</b>一批请求。按 <code>Command+Option+J</code>（macOS）或 <code>Control+Shift+J</code>（Windows、Linux）打开 DevTools 并切到 <b>Network</b> 面板对照观察——面板只记录打开期间的请求，先开面板再切场景。</p>
      <div class="fetch-specimen__call">
        <span>当前场景</span>
        <code class="fetch-specimen__call-name"></code>
        <span class="fetch-specimen__call-hint"></span>
      </div>
    </div>
    <dl class="fetch-specimen__readout">
      <dt>已发出</dt><dd class="fetch-specimen__cell-sent"></dd>
      <dt>200 成功</dt><dd class="fetch-specimen__cell-ok"></dd>
      <dt>404 失败</dt><dd class="fetch-specimen__cell-missing"></dd>
      <dt>其他状态</dt><dd class="fetch-specimen__cell-other"></dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const scenarioName = root.querySelector(
    '.fetch-specimen__call-name',
  ) as HTMLElement;
  const scenarioHint = root.querySelector(
    '.fetch-specimen__call-hint',
  ) as HTMLElement;
  const cells = {
    sent: root.querySelector('.fetch-specimen__cell-sent') as HTMLElement,
    ok: root.querySelector('.fetch-specimen__cell-ok') as HTMLElement,
    missing: root.querySelector('.fetch-specimen__cell-missing') as HTMLElement,
    other: root.querySelector('.fetch-specimen__cell-other') as HTMLElement,
  };

  let requestSeq = 0;
  let sent = 0;
  let ok200 = 0;
  let notFound404 = 0;
  let other = 0;
  let currentScenario: ScenarioId = 'success';

  function paint() {
    scenarioName.textContent = SCENARIO_LABELS[currentScenario];
    scenarioHint.textContent = SCENARIO_HINTS[currentScenario];
    cells.sent.textContent = String(sent);
    cells.ok.textContent = String(ok200);
    cells.missing.textContent = String(notFound404);
    cells.other.textContent = String(other);
  }

  /* 200 / 404 各占一格，其余状态码（304、500 等）与网络层错误都进「其他」。 */
  function recordStatus(status: number) {
    if (status === 200) {
      ok200 += 1;
    } else if (status === 404) {
      notFound404 += 1;
    } else {
      other += 1;
    }
    paint();
  }

  function emitRequest(url: string) {
    requestSeq += 1;
    sent += 1;
    fetch(`${url}?req=${requestSeq}`)
      .then((response) => recordStatus(response.status))
      .catch(() => recordStatus(-1));
    paint();
  }

  /* 把一次场景选择翻译成真实 fetch：成功与失败各有专属路径。 */
  function emitScenario(scenario: ScenarioId) {
    switch (scenario) {
      case 'success':
        emitRequest(ordersUrl);
        break;
      case 'not-found':
        emitRequest(MISSING_ORDERS_PATH);
        break;
      case 'slow':
        for (let index = 0; index < SLOW_BATCH_SIZE; index += 1) {
          emitRequest(ordersUrl);
        }
        break;
      case 'batch':
        for (let index = 0; index < BATCH_SUCCESS; index += 1) {
          emitRequest(ordersUrl);
        }
        for (let index = 0; index < BATCH_MISSING; index += 1) {
          emitRequest(MISSING_ORDERS_PATH);
        }
        break;
    }
  }

  paint();

  return {
    update(options) {
      currentScenario = options.scenario;
      emitScenario(options.scenario);
      paint();
    },
    dispose() {
      /* 无持续资源需要释放；在途请求会自然完成，属于真实网络记录的一部分。 */
    },
  };
}
