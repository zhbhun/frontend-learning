/**
 * 范例介绍：用真实的 @hocuspocus/provider-react 组件与 hooks 搭一个迷你协同
 * 仪表盘，演示「两层 Context 注入 provider + hooks 把信号变成组件状态」。
 * 前置状态：传输层由 mock-server.ts 在页内扮演（无真实服务器）；共享的
 * HocuspocusProviderWebsocket 由 Storybook 适配器在组件树外创建后以 props 传入，
 * 因此 StrictMode 重挂载、切换文档名都不会重建 socket。
 * 操作：Controls 切「服务器可达」「文档名」「StrictMode」，或在「本地编辑内容」
 * 输入文本（每次变化写入一次 Y.Doc）。
 * 预期结果：链路/同步/在线三个指示灯分别来自 useHocuspocusConnectionStatus /
 * useHocuspocusSyncStatus / useHocuspocusAwareness；切换文档名时 provider 身份
 * （clientID）变化而链路指示灯不动；开发模式下开启 StrictMode 可见挂载 effect
 * 双轮执行、provider destroy 事件为零（延迟销毁被取消）；断开服务器时同步停在
 * syncing，恢复后补传归零。
 * 阅读主线：DemoApp 的组件树（WebsocketComponent → Room → Dashboard）→
 * Dashboard 里 4 个 hooks 的读法 → 本地编辑如何写入 provider.document →
 * TimelineView 用 useSyncExternalStore 渲染事件时间线。
 * 说明：本文件用 React.createElement（别名 h）书写 JSX 等价结构，以匹配工作区
 * 的 TypeScript 配置；语义与 JSX 完全一致。
 */
import * as React from 'react';
import type { CSSProperties } from 'react';
import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
  useHocuspocusAwareness,
  useHocuspocusConnectionStatus,
  useHocuspocusProvider,
  useHocuspocusSyncStatus,
} from '@hocuspocus/provider-react';
import type { HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import * as Y from 'yjs';

const h = React.createElement;

/** 事件时间线的共享槽：React 树内外（socket 层事件）都往里写。 */
export interface TimelineEntry {
  id: number;
  label: string;
  detail: string;
}

export class TimelineSink {
  private entries: TimelineEntry[] = [];

  private listeners = new Set<() => void>();

  private nextId = 1;

  push(label: string, detail = ''): void {
    const entry: TimelineEntry = { id: this.nextId, label, detail };
    this.nextId += 1;
    // 只留最近 30 条，时间线聚焦当前流程
    this.entries = [...this.entries, entry].slice(-30);
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  /** 传给 useSyncExternalStore 的订阅与快照：快照引用稳定，只在变化时替换。 */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): TimelineEntry[] => {
    return this.entries;
  };
}

export interface DemoAppProps {
  websocketProvider: HocuspocusProviderWebsocket;
  /** HocuspocusRoom 的文档名：变化时 provider 重建，socket 不动。 */
  docName: string;
  strictMode: boolean;
  /** 边缘触发：内容变化时向 Y.Doc 写入一次本地编辑。 */
  editSignal: string;
  timeline: TimelineSink;
  socketTag: string;
}

export function DemoApp(props: DemoAppProps): React.ReactElement {
  const dashboard = h(Dashboard, {
    editSignal: props.editSignal,
    timeline: props.timeline,
    socketTag: props.socketTag,
    docName: props.docName,
  });

  // 两层 Context 组件树：外层管共享 socket，内层按文档名托管 provider
  const tree = h(
    HocuspocusProviderWebsocketComponent,
    { websocketProvider: props.websocketProvider },
    h(
      HocuspocusRoom,
      {
        name: props.docName,
        onSynced: () => {
          props.timeline.push('synced 事件', '初始同步完成（文档层信号）');
        },
        onDestroy: () => {
          props.timeline.push('provider destroy', 'Provider 被销毁并清理监听');
        },
      },
      dashboard,
    ),
  );

  // StrictMode 只在 React 开发构建下做双重挂载；生产构建中是空壳
  if (props.strictMode) {
    return h(React.StrictMode, null, tree);
  }
  return tree;
}

interface DashboardProps {
  docName: string;
  editSignal: string;
  timeline: TimelineSink;
  socketTag: string;
}

function Dashboard(props: DashboardProps): React.ReactElement {
  // 四个 hooks 都要求在 HocuspocusRoom 内调用，内部从 HocuspocusRoomContext 取 provider
  const provider = useHocuspocusProvider();
  const connectionStatus = useHocuspocusConnectionStatus();
  const syncStatus = useHocuspocusSyncStatus();
  const users = useHocuspocusAwareness();

  // 挂载/清理日志：StrictMode 开发模式下会连跑「挂载→清理→挂载」两轮
  React.useEffect(() => {
    props.timeline.push('Dashboard effect 挂载', 'provider 取自 Context');
    return () => {
      props.timeline.push('Dashboard effect 清理', '');
    };
  }, [props.timeline]);

  // 注入本机 awareness 状态（真实项目里由登录用户信息填充）
  React.useEffect(() => {
    provider.setAwarenessField('name', '本机用户');
    provider.setAwarenessField('color', '#4f7cff');
  }, [provider]);

  // 边缘触发：把输入内容作为一次本地编辑写进 default 字段——与编辑器键入产生
  // update 等价，provider 会立即上行；离线时积压在本地，重连后补传。
  // isAttached 守卫：子组件的 effect 先于 HocuspocusRoom 的 attach effect 执行，
  // 首帧写入会因未 attach 被 provider.send 静默丢弃，这里直接跳过这类过早信号
  const lastEditSignal = React.useRef('');
  React.useEffect(() => {
    if (
      !props.editSignal ||
      lastEditSignal.current === props.editSignal ||
      !provider.isAttached
    ) {
      return;
    }
    lastEditSignal.current = props.editSignal;
    const fragment = provider.document.getXmlFragment('default');
    const paragraph = new Y.XmlText();
    paragraph.insert(0, props.editSignal);
    fragment.insert(fragment.length, [paragraph]);
    props.timeline.push('本地编辑', 'update 已写入 Y.Doc，等待服务器确认');
  }, [props.editSignal, provider, props.timeline]);

  // 内容块数随 hooks 触发的重渲染刷新（同步状态变化必然伴随一次渲染）
  const blockCount = provider.document.getXmlFragment('default').length;

  const chip = (label: string, value: string, tone: 'ok' | 'warn' | 'off') =>
    h(
      'span',
      { key: label, style: { ...styles.chip, ...styles.chipTone[tone] } },
      `${label} ${value}`,
    );

  return h(
    'div',
    { style: styles.root },
    h(
      'div',
      { style: styles.chips },
      chip(
        '链路',
        CONNECTION_LABELS[connectionStatus],
        connectionStatus === 'connected' ? 'ok' : connectionStatus === 'connecting' ? 'warn' : 'off',
      ),
      chip('同步', SYNC_LABELS[syncStatus], syncStatus === 'synced' ? 'ok' : 'warn'),
      chip('在线', `${users.length} 人`, 'ok'),
    ),
    h(
      'div',
      { style: styles.panels },
      h(
        'div',
        { style: styles.panel },
        h('p', { style: styles.panelTitle }, 'Provider 读数（useHocuspocusProvider）'),
        infoRow('文档名（Room 的 name prop）', props.docName),
        infoRow('Provider 身份（clientID）', `…${String(provider.document.clientID).slice(-6)}`),
        infoRow('socket 实例', props.socketTag),
        infoRow('default 字段内容块', `${blockCount} 块`),
        h(
          'div',
          { style: styles.userList },
          users.map((user) =>
            h(
              'span',
              { key: user.clientId, style: styles.userTag },
              h('i', {
                style: {
                  ...styles.userDot,
                  backgroundColor:
                    typeof user.color === 'string' ? user.color : '#cbd5e1',
                },
              }),
              typeof user.name === 'string' ? user.name : `客户端 ${user.clientId}`,
            ),
          ),
        ),
      ),
      h(TimelineView, { timeline: props.timeline }),
    ),
  );
}

const CONNECTION_LABELS: Record<string, string> = {
  connecting: '连接中',
  connected: '已连接',
  disconnected: '已断开',
};

const SYNC_LABELS: Record<string, string> = {
  synced: '已同步',
  syncing: '同步中…',
};

function infoRow(label: string, value: string): React.ReactElement {
  return h(
    'div',
    { key: label, style: styles.infoRow },
    h('span', { style: styles.infoLabel }, label),
    h('code', { style: styles.infoValue }, value),
  );
}

function TimelineView({ timeline }: { timeline: TimelineSink }): React.ReactElement {
  const entries = React.useSyncExternalStore(
    timeline.subscribe,
    timeline.getSnapshot,
    timeline.getSnapshot,
  );

  return h(
    'div',
    { style: styles.panel },
    h('p', { style: styles.panelTitle }, '事件时间线（新事件在最下）'),
    h(
      'ol',
      { style: styles.timeline },
      entries.map((entry) =>
        h(
          'li',
          { key: entry.id, style: styles.timelineItem },
          h('strong', null, entry.label),
          entry.detail ? h('span', null, ` — ${entry.detail}`) : null,
        ),
      ),
    ),
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    height: '100%',
    padding: 12,
    boxSizing: 'border-box',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: 12,
    lineHeight: 1.5,
    color: '#172033',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    padding: '2px 10px',
    borderRadius: 999,
    border: '1px solid #dbe3f0',
    background: '#fff',
    whiteSpace: 'nowrap',
  },
  chipTone: {
    ok: { borderColor: '#86efac', color: '#15803d' },
    warn: { borderColor: '#fbbf24', color: '#b45309' },
    off: { borderColor: '#e2e8f0', color: '#64748b' },
  },
  panels: {
    display: 'flex',
    gap: 8,
    flex: 1,
    minHeight: 0,
  },
  panel: {
    flex: 1,
    minWidth: 0,
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: 'rgb(255 255 255 / 88%)',
    overflow: 'hidden',
  },
  panelTitle: {
    margin: '0 0 6px',
    fontWeight: 600,
    color: '#475569',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  infoLabel: {
    color: '#5d6f67',
    whiteSpace: 'nowrap',
  },
  infoValue: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 11,
    textAlign: 'right',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  userTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '1px 8px',
    borderRadius: 999,
    border: '1px solid #e2e8f0',
    background: '#fff',
  },
  userDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
  },
  timeline: {
    margin: 0,
    padding: '0 0 0 18px',
    maxHeight: '100%',
    overflowY: 'auto',
  },
  timelineItem: {
    marginBottom: 2,
  },
};
