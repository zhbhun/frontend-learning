/**
 * 范例介绍：模拟 service worker 里的一组消息监听器，演示「消息来源 ×
 * externally_connectable 声明」怎样决定消息到达哪个监听器、按什么校验、
 * 最终放行还是拒绝。
 * 前置状态：模拟环境已注册 runtime.onMessage 与 runtime.onMessageExternal
 * 两个监听器；白名单对端扩展 id 为 imafriendlyextensionhereisdatas，背书
 * 网页 origin 为 https://partner.example.com；action 白名单只登记
 * pick-text 与 save-selection 两个动作。
 * 主要操作：切换「消息来源」与「externally_connectable 声明」两组参数。
 * 预期结果：白名单外扩展在已声明时被挡在通道外，未声明时到达
 * onMessageExternal 并被 sender.id 拒绝；外部网页默认不到达；content script
 * 的消息 sender.id 校验无差别通过，只有 action 白名单能拦住被页面诱导的
 * 载荷。
 * 阅读主线：顶部是当前 manifest 声明，中部是「来源 → 通道 → 校验 → 结论」
 * 链路，底部读数列出到达的监听器、校验依据与结论。
 */

export type MessageSource =
  | 'content-script'
  | 'content-script-tainted'
  | 'extension-listed'
  | 'extension-unknown'
  | 'web-partner';

export type ExternallyConnectableMode = 'undeclared' | 'allowlist';

export interface SenderValidationOptions {
  source: MessageSource;
  externallyConnectable: ExternallyConnectableMode;
}

export interface SenderValidationInstance {
  element: HTMLElement;
  update(options: SenderValidationOptions): void;
  dispose(): void;
}

const TRUSTED_EXTENSION_ID = 'imafriendlyextensionhereisdatas';
const UNKNOWN_EXTENSION_ID = 'otheraaaabbbbccccddddeeeeffff';
const TRUSTED_WEB_ORIGIN = 'https://partner.example.com';
const ALLOWED_ACTIONS = ['pick-text', 'save-selection'];

type Outcome = 'pass' | 'reject' | 'blocked';

interface SourceDefinition {
  label: string;
  senderText: string;
  action: string;
  external: boolean;
}

const SOURCES: Record<MessageSource, SourceDefinition> = {
  'content-script': {
    label: '本扩展的 content script',
    senderText: 'sender.id = 本扩展 · sender.url = https://shop.example/item?id=7',
    action: 'pick-text',
    external: false,
  },
  'content-script-tainted': {
    label: 'content script 转帖页面可控内容',
    senderText: 'sender.id = 本扩展 · sender.url = https://shop.example/item?id=7',
    action: 'delete-browsing-data',
    external: false,
  },
  'extension-listed': {
    label: '白名单内的其他扩展',
    senderText: `sender.id = ${TRUSTED_EXTENSION_ID}`,
    action: 'sync-bookmarks',
    external: true,
  },
  'extension-unknown': {
    label: '白名单外的其他扩展',
    senderText: `sender.id = ${UNKNOWN_EXTENSION_ID}`,
    action: 'sync-bookmarks',
    external: true,
  },
  'web-partner': {
    label: 'matches 命中的外部网页',
    senderText: `sender.origin = ${TRUSTED_WEB_ORIGIN}`,
    action: 'sync-bookmarks',
    external: true,
  },
};

interface Verdict {
  reaches: string;
  check: string;
  outcome: Outcome;
  note: string;
}

function decide(
  source: MessageSource,
  mode: ExternallyConnectableMode,
): Verdict {
  const definition = SOURCES[source];

  if (!definition.external) {
    // 扩展内部消息：sender.id 一定是本扩展，能拦住被诱导载荷的只有内容校验
    const allowed = ALLOWED_ACTIONS.includes(definition.action);
    return {
      reaches: 'runtime.onMessage',
      check: `action 白名单：${ALLOWED_ACTIONS.join(' / ')}`,
      outcome: allowed ? 'pass' : 'reject',
      note: allowed
        ? 'sender.id 一定是本扩展，内部消息仍按 action 白名单放行。'
        : 'content script 与页面共享渲染进程，消息可能被页面诱导；sender.id 校验分辨不出，只认 action 白名单。',
    };
  }

  const allowlisted = source !== 'extension-unknown';

  if (mode === 'allowlist') {
    if (!allowlisted) {
      return {
        reaches: '不到达',
        check: '—',
        outcome: 'blocked',
        note: 'externally_connectable 的 ids / matches 白名单把陌生对端挡在通道外，监听器根本收不到。',
      };
    }
    return {
      reaches: 'runtime.onMessageExternal',
      check:
        source === 'web-partner'
          ? 'sender.origin 对 matches'
          : 'sender.id 对 ids 白名单',
      outcome: 'pass',
      note:
        source === 'web-partner'
          ? 'origin 命中 externally_connectable.matches，放行前再核对一次 sender.origin。'
          : '扩展 id 登记在 externally_connectable.ids，放行前再核对一次 sender.id。',
    };
  }

  // 未声明 externally_connectable：其他扩展都能连，网页都不能
  if (source === 'web-partner') {
    return {
      reaches: '不到达',
      check: '—',
      outcome: 'blocked',
      note: '未声明 externally_connectable 时网页默认不能连接扩展，消息不会到达任何监听器。',
    };
  }

  const listed = source === 'extension-listed';
  return {
    reaches: 'runtime.onMessageExternal',
    check: 'sender.id 白名单',
    outcome: listed ? 'pass' : 'reject',
    note: listed
      ? '默认对所有扩展开放，白名单内 id 放行；但未声明等于对所有扩展敞开，应显式收窄 ids。'
      : '默认对所有扩展开放，陌生 id 只能靠监听器里的白名单拒绝。',
  };
}

const OUTCOME_LABEL: Record<Outcome, string> = {
  pass: '放行执行',
  reject: '拒绝',
  blocked: '不到达',
};

// 共享样式（assets/story-canvas.css）只提供 .cs-stage 外壳，本课范例的
// .sv-* 样式随范例文件注入，不修改共享基础设施
const STYLE_ID = 'sender-validation-style';

const STYLE = `
.cs-stage.sv-stage {
  aspect-ratio: auto;
  min-height: 300px;
  padding: 38px 14px 96px;
  background: #f8fafc;
}
.sv-manifest {
  padding: 7px 10px;
  border: 1px solid #dbe3f0;
  border-radius: 7px;
  background: #ffffff;
  color: #475569;
  font: 11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.sv-chain {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 6px;
  margin-top: 12px;
}
.sv-arrow {
  align-self: center;
  color: #94a3b8;
  font-size: 13px;
}
.sv-box {
  flex: 1 1 118px;
  padding: 8px 9px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
  font-size: 11px;
  line-height: 1.6;
}
.sv-box-title {
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.sv-box-body { color: #172033; white-space: pre-line; word-break: break-all; }
.sv-box--muted { border-style: dashed; color: #94a3b8; }
.sv-box--pass { border-color: #a6f4c5; background: #f6fef9; }
.sv-box--reject { border-color: #fda29b; background: #fffbfa; }
.sv-note {
  margin-top: 12px;
  padding: 8px 10px;
  border: 1px solid #dbe3f0;
  border-radius: 7px;
  background: #ffffff;
  color: #344054;
  font-size: 12px;
  line-height: 1.6;
}
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = el('style', undefined, STYLE);
  style.id = STYLE_ID;
  document.head.append(style);
}

export function createSenderValidation(
  emit: (entries: Array<[string, string]>) => void,
): SenderValidationInstance {
  ensureStyles();
  const root = el('div', 'cs-stage sv-stage');

  const manifest = el('div', 'sv-manifest');
  const chain = el('div', 'sv-chain');
  const note = el('div', 'sv-note');

  root.append(manifest, chain, note);

  let options: SenderValidationOptions = {
    source: 'content-script',
    externallyConnectable: 'undeclared',
  };

  function box(
    title: string,
    body: string,
    modifier?: string,
  ): HTMLElement {
    const node = el('div', `sv-box${modifier ? ` sv-box--${modifier}` : ''}`);
    node.append(el('div', 'sv-box-title', title), el('div', 'sv-box-body', body));
    return node;
  }

  function paint(): void {
    const definition = SOURCES[options.source];
    const verdict = decide(options.source, options.externallyConnectable);

    manifest.textContent =
      options.externallyConnectable === 'allowlist'
        ? `manifest: "externally_connectable": { "ids": ["${TRUSTED_EXTENSION_ID}"], "matches": ["${TRUSTED_WEB_ORIGIN}/*"] }`
        : 'manifest：未声明 externally_connectable（默认其他扩展都能连、网页都不能）';

    chain.replaceChildren();
    chain.append(box('消息来源', `${definition.label}\n${definition.senderText}`));

    if (verdict.reaches === '不到达') {
      chain.append(
        el('span', 'sv-arrow', '→'),
        box('通道', 'externally_connectable 挡下，监听器收不到', 'muted'),
        el('span', 'sv-arrow', '→'),
        box('结论', OUTCOME_LABEL[verdict.outcome], 'muted'),
      );
    } else {
      chain.append(
        el('span', 'sv-arrow', '→'),
        box('到达的监听器', verdict.reaches),
        el('span', 'sv-arrow', '→'),
        box('校验依据', verdict.check),
        el('span', 'sv-arrow', '→'),
        box('结论', OUTCOME_LABEL[verdict.outcome], verdict.outcome),
      );
    }

    note.textContent = verdict.note;

    emit([
      ['消息到达', verdict.reaches],
      ['校验依据', verdict.check],
      ['结论', OUTCOME_LABEL[verdict.outcome]],
    ]);
  }

  return {
    element: root,
    update(next: SenderValidationOptions) {
      options = next;
      paint();
    },
    dispose() {
      // 没有定时器或全局监听，节点移除后随 DOM 一起回收
    },
  };
}
