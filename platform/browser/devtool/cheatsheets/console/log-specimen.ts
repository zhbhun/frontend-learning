/**
 * 范例介绍：「日志发生器」——Controls 选择并触发 console API，向浏览器真实的
 * Console 输出日志；readout 按 Verbose / Info / Warning / Error 四级统计已输出条数。
 * 前置状态：无需任何环境；读者自己打开 DevTools 的 Console 面板
 * （Command+Option+J）对照观察输出、练习级别与正则过滤、切换 Console 设置。
 * 主要操作：在 Controls 里切换「console API」、调整「连发次数」；每次参数变化触发一轮输出。
 * 预期结果：Console 出现对应方法的消息，颜色与级别对应；readout 的四级计数与
 *   「计数」「计时器」读数同步更新；连发 console.log 可观察 Group similar messages
 *   的折叠计数；console.assert 交替演示「失败才输出」。
 * 阅读主线：emitCall() 把 API 选择翻译成真实的 console.* 调用，级别统计与
 *   正文开场速查表的级别一致（分组内消息按各自级别计入）。
 */

/** 演示页下拉提供的 console API 成员。 */
export type LogApiId =
  | 'log'
  | 'info'
  | 'debug'
  | 'warn'
  | 'error'
  | 'table'
  | 'group'
  | 'count'
  | 'time'
  | 'assert'
  | 'trace';

/** 各方法在演示页「当前调用」区显示的说明，与正文开场速查表的级别一致。 */
export const API_HINTS: Record<LogApiId, string> = {
  log: '基础输出，Info 级',
  info: '与 log 相同，Info 级',
  debug: 'Verbose 级——级别过滤未勾 Verbose 时看不到',
  warn: 'Warning 级，黄色警告',
  error: 'Error 级，红色错误并自带调用堆栈',
  table: '把数组输出成表格，Info 级',
  group: '输出一个分组，内含两条 Info 日志',
  count: '按 label「请求」递增计数，Info 级',
  time: '计时器三连：启动（无输出）→ 读数 → 结束，每次触发走一步',
  assert: '交替断言：失败输出一条 Error，成功无输出',
  trace: '打印当前调用堆栈，Info 级',
};

export interface LogSpecimenOptions {
  api: LogApiId;
  /** 连发次数；console.time 是状态机，每次固定只走一步。 */
  times: number;
}

export interface LogSpecimenInstance {
  update(options: LogSpecimenOptions): void;
  dispose(): void;
}

type Level = 'verbose' | 'info' | 'warning' | 'error';

/* console.count / console.time 使用的 label，与 readout 读数一一对应。 */
const COUNT_LABEL = '请求';
const TIMER_LABEL = '导出';

/* console.table 的演示数据：三行同构对象，字段名即表头。 */
const REQUEST_LOG = [
  { 接口: '/api/user', 状态: 200, '耗时（ms）': 42 },
  { 接口: '/api/posts', 状态: 200, '耗时（ms）': 87 },
  { 接口: '/api/friends', 状态: 404, '耗时（ms）': 312 },
];

const SPECIMEN_STYLES = `
.log-specimen {
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
.log-specimen__main {
  flex: 1 1 300px;
  min-width: 0;
}
.log-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.log-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.log-specimen__call {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
}
.log-specimen__call-name {
  font: 600 13px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
}
.log-specimen__call-hint {
  font-size: 12px;
  color: #5d6f67;
}
.log-specimen__readout {
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
.log-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.log-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
}
`;

export function createLogSpecimen(root: HTMLElement): LogSpecimenInstance {
  root.classList.add('log-specimen');
  root.innerHTML = `
    <div class="log-specimen__main">
      <p class="log-specimen__hint">日志发生器：在下方 Controls 选择要触发的 console API，或再次调整参数——每次变化都向浏览器<b>真实的 Console</b> 输出日志。按 <code>Command+Option+J</code>（macOS）或 <code>Control+Shift+J</code>（Windows、Linux）打开 Console 对照观察。</p>
      <div class="log-specimen__call">
        <code class="log-specimen__call-name"></code>
        <span class="log-specimen__call-hint"></span>
      </div>
    </div>
    <dl class="log-specimen__readout">
      <dt>Verbose</dt><dd class="log-specimen__cell-verbose"></dd>
      <dt>Info</dt><dd class="log-specimen__cell-info"></dd>
      <dt>Warning</dt><dd class="log-specimen__cell-warning"></dd>
      <dt>Error</dt><dd class="log-specimen__cell-error"></dd>
      <dt>总计</dt><dd class="log-specimen__cell-total"></dd>
      <dt>计数「请求」</dt><dd class="log-specimen__cell-count"></dd>
      <dt>计时器「导出」</dt><dd class="log-specimen__cell-timer"></dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const callName = root.querySelector(
    '.log-specimen__call-name',
  ) as HTMLElement;
  const callHint = root.querySelector(
    '.log-specimen__call-hint',
  ) as HTMLElement;
  const cells = {
    verbose: root.querySelector('.log-specimen__cell-verbose') as HTMLElement,
    info: root.querySelector('.log-specimen__cell-info') as HTMLElement,
    warning: root.querySelector('.log-specimen__cell-warning') as HTMLElement,
    error: root.querySelector('.log-specimen__cell-error') as HTMLElement,
    total: root.querySelector('.log-specimen__cell-total') as HTMLElement,
    count: root.querySelector('.log-specimen__cell-count') as HTMLElement,
    timer: root.querySelector('.log-specimen__cell-timer') as HTMLElement,
  };

  const counts: Record<Level, number> = {
    verbose: 0,
    info: 0,
    warning: 0,
    error: 0,
  };
  let total = 0;
  let countValue = 0;
  let timerState = '空闲';
  let timeStep = 0;
  let assertPass = true;
  let lastCall = '—';

  function bump(level: Level) {
    counts[level] += 1;
    total += 1;
  }

  function paint() {
    cells.verbose.textContent = String(counts.verbose);
    cells.info.textContent = String(counts.info);
    cells.warning.textContent = String(counts.warning);
    cells.error.textContent = String(counts.error);
    cells.total.textContent = String(total);
    cells.count.textContent = `${COUNT_LABEL}: ${countValue}`;
    cells.timer.textContent = timerState;
  }

  /*
    把一次 API 选择翻译成真实的 console.* 调用。分组标签、time 启动本身不产生
    消息，不计级别；组内 log 按各自级别计入 Info。
  */
  function emitCall(api: LogApiId) {
    lastCall = `console.${api}`;

    switch (api) {
      case 'log':
        console.log('页面就绪', { 页面: '日志发生器', 模块: 'specimen' });
        bump('info');
        break;
      case 'info':
        console.info('缓存已更新到 v1.4.0');
        bump('info');
        break;
      case 'debug':
        console.debug('第 %d 帧渲染耗时 3.2 ms', 42);
        bump('verbose');
        break;
      case 'warn':
        console.warn('fetchUser() 已弃用，请改用 fetchProfile()');
        bump('warning');
        break;
      case 'error':
        console.error(
          'GET /api/profile 失败：500',
          new Error('Internal Server Error'),
        );
        bump('error');
        break;
      case 'table':
        console.table(REQUEST_LOG);
        bump('info');
        break;
      case 'group':
        console.group('初始化');
        console.log('读取配置完成');
        console.log('建立 WebSocket 连接');
        console.groupEnd();
        bump('info');
        bump('info');
        break;
      case 'count':
        countValue += 1;
        console.count(COUNT_LABEL);
        bump('info');
        break;
      case 'time':
        if (timeStep === 0) {
          console.time(TIMER_LABEL);
          timerState = '计时中';
        } else if (timeStep === 1) {
          console.timeLog(TIMER_LABEL);
          timerState = '已打印读数';
          bump('info');
        } else {
          console.timeEnd(TIMER_LABEL);
          timerState = '空闲';
          bump('info');
        }
        timeStep = (timeStep + 1) % 3;
        break;
      case 'assert':
        /* 交替翻转：失败那一次输出 Error 并计数，成功那一次无任何输出。 */
        assertPass = !assertPass;
        if (assertPass) {
          console.assert(true, '条件为真，这条永远不会输出');
        } else {
          console.assert(false, '余额不足，无法支付');
          bump('error');
        }
        break;
      case 'trace':
        console.trace('到达 collect()');
        bump('info');
        break;
    }
  }

  callName.textContent = lastCall;
  callHint.textContent = '切换 Controls 后开始输出';
  paint();

  return {
    update(options) {
      const times =
        options.api === 'time'
          ? 1
          : Math.max(1, Math.min(5, Math.round(options.times)));
      for (let index = 0; index < times; index += 1) {
        emitCall(options.api);
      }
      callName.textContent = lastCall;
      callHint.textContent = API_HINTS[options.api];
      paint();
    },
    dispose() {
      /* 无持续资源需要释放；未关闭的计时器只存在于浏览器 Console 中，无碍。 */
    },
  };
}
