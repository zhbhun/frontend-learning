import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import panelLifecycleSource from './panel-lifecycle.ts?raw';
import inspectedWindowEvalSource from './inspected-window-eval.ts?raw';
import debuggerSessionSource from './debugger-session.ts?raw';
import {
  createPanelLifecycleExample,
  type PanelLifecycleInstance,
  type PanelLifecycleOptions,
  type PanelLifecycleSnapshot,
} from './panel-lifecycle';
import {
  createInspectedWindowEvalExample,
  type InspectedWindowEvalInstance,
  type InspectedWindowEvalOptions,
  type InspectedWindowEvalSnapshot,
} from './inspected-window-eval';
import {
  createDebuggerSessionExample,
  type DebuggerSessionInstance,
  type DebuggerSessionOptions,
  type DebuggerSessionSnapshot,
} from './debugger-session';

interface PanelLifecycleArgs {
  devtoolsWindow: string;
  activePanel: string;
  heartbeat: boolean;
}

interface InspectedWindowEvalArgs {
  expression: string;
  frame: string;
  useContentScriptContext: boolean;
  contentScriptInjected: boolean;
  selectedElement: boolean;
}

interface DebuggerSessionArgs {
  target: string;
  stage: string;
  cause: string;
}

const WINDOW_BY_LABEL: Record<string, PanelLifecycleOptions['devtoolsWindow']> = {
  打开: 'open',
  关闭: 'closed',
};

const PANEL_BY_LABEL: Record<string, PanelLifecycleOptions['activePanel']> = {
  Elements: 'elements',
  Console: 'console',
  扩展面板: 'extension',
};

const EXPRESSION_BY_LABEL: Record<
  string,
  InspectedWindowEvalOptions['expression']
> = {
  'document.images.length': 'images',
  'location.href': 'href',
  '$0.tagName': 'selected',
  'document.body': 'body',
};

const FRAME_BY_LABEL: Record<string, InspectedWindowEvalOptions['frame']> = {
  主框架: 'top',
  'iframe（frameURL 匹配）': 'iframe',
};

const TARGET_BY_LABEL: Record<string, DebuggerSessionOptions['target']> = {
  'https://example.com/shop': 'https',
  'chrome://extensions': 'chrome',
};

const STAGE_BY_LABEL: Record<string, DebuggerSessionOptions['stage']> = {
  未附加: 'idle',
  '已附加（横幅出现）': 'attached',
  '已发送 Network.enable': 'sent',
  已分离: 'detached',
};

const CAUSE_BY_LABEL: Record<string, DebuggerSessionOptions['cause']> = {
  '未结束': 'none',
  '用户在目标标签页打开 DevTools': 'devtools',
  '目标标签页关闭': 'closed',
};

const renderPanelLifecycle = canvasStory({
  create: createPanelLifecycleExample,
  apply(instance: PanelLifecycleInstance, args: PanelLifecycleArgs) {
    const options: PanelLifecycleOptions = {
      devtoolsWindow: WINDOW_BY_LABEL[args.devtoolsWindow],
      activePanel: PANEL_BY_LABEL[args.activePanel],
      heartbeat: args.heartbeat,
    };
    instance.update(options);
  },
  readout(snapshot: PanelLifecycleSnapshot) {
    return [
      ['DevTools 窗口', snapshot.windowLabel],
      ['devtools 页面', snapshot.devtoolsPageLabel],
      ['扩展面板页面', snapshot.panelPageLabel],
      ['SW 端口', snapshot.portLabel],
      ['最近事件', snapshot.lastEvent],
    ];
  },
  captions: ['DevTools 扩展页面生命周期演算：面板页随显示创建与销毁', '端口需心跳维持'],
});

const renderInspectedWindowEval = canvasStory({
  create: createInspectedWindowEvalExample,
  apply(instance: InspectedWindowEvalInstance, args: InspectedWindowEvalArgs) {
    const options: InspectedWindowEvalOptions = {
      expression: EXPRESSION_BY_LABEL[args.expression],
      frame: FRAME_BY_LABEL[args.frame],
      useContentScriptContext: args.useContentScriptContext,
      contentScriptInjected: args.contentScriptInjected,
      selectedElement: args.selectedElement,
    };
    instance.update(options);
  },
  readout(snapshot: InspectedWindowEvalSnapshot) {
    return [
      ['执行框架', snapshot.frameLabel],
      ['执行上下文', snapshot.contextLabel],
      ['结果', snapshot.resultLabel],
      ['isException', snapshot.exceptionLabel],
    ];
  },
  captions: ['eval 在被检查页面内执行：左页面、中调用、右结果', '默认主框架；返回值须可 JSON 化'],
});

const renderDebuggerSession = canvasStory({
  create: createDebuggerSessionExample,
  apply(instance: DebuggerSessionInstance, args: DebuggerSessionArgs) {
    const options: DebuggerSessionOptions = {
      target: TARGET_BY_LABEL[args.target],
      stage: STAGE_BY_LABEL[args.stage],
      cause: CAUSE_BY_LABEL[args.cause],
    };
    instance.update(options);
  },
  readout(snapshot: DebuggerSessionSnapshot) {
    return [
      ['会话状态', snapshot.sessionLabel],
      ['最后命令', snapshot.commandLabel],
      ['最后事件', snapshot.eventLabel],
      ['onDetach reason', snapshot.detachLabel],
    ];
  },
  captions: ['CDP 会话演算：横幅在附加期间常驻', '每标签页同时只能有一个调试器'],
});

const meta = {
  id: 'devtools-extension',
  title: '进阶能力/DevTools 扩展',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const PanelLifecycle: StoryObj<PanelLifecycleArgs> = {
  args: {
    devtoolsWindow: '打开',
    activePanel: '扩展面板',
    heartbeat: true,
  },
  argTypes: {
    devtoolsWindow: {
      name: 'DevTools 窗口',
      description: '窗口打开时才创建 devtools.html；关闭即销毁整条链路。',
      control: { type: 'select' },
      options: ['打开', '关闭'],
    },
    activePanel: {
      name: '当前激活面板',
      description:
        '切到扩展面板时 panel.html 创建并触发 onShown；切走即销毁并触发 onHidden。',
      control: { type: 'select' },
      options: ['Elements', 'Console', '扩展面板'],
    },
    heartbeat: {
      name: '端口心跳',
      description:
        'runtime.connect 建立的端口不会自动保持 service worker 活跃；停止心跳后 SW 休眠、端口断开、onDisconnect 触发。',
      control: { type: 'boolean' },
    },
  },
  render: renderPanelLifecycle,
  parameters: storySource(panelLifecycleSource),
};

export const InspectedWindowEval: StoryObj<InspectedWindowEvalArgs> = {
  args: {
    expression: 'document.images.length',
    frame: '主框架',
    useContentScriptContext: false,
    contentScriptInjected: true,
    selectedElement: true,
  },
  argTypes: {
    expression: {
      name: '表达式',
      description:
        '在被检查页面内求值的表达式；返回不可 JSON 化的值（如 document.body）会以异常结束。',
      control: { type: 'select' },
      options: ['document.images.length', 'location.href', '$0.tagName', 'document.body'],
    },
    frame: {
      name: '执行框架',
      description:
        '默认在主框架执行；frameURL 指定后改到 URL 匹配的 iframe（iframe 内只有 1 张 img）。',
      control: { type: 'select' },
      options: ['主框架', 'iframe（frameURL 匹配）'],
    },
    useContentScriptContext: {
      name: 'useContentScriptContext',
      description:
        'true 时在本扩展 content script 的上下文执行；依赖该 content script 已注入。',
      control: { type: 'boolean' },
    },
    contentScriptInjected: {
      name: 'content script 已注入',
      description: '关闭后 useContentScriptContext 会以 E_NOTFOUND 异常结束。',
      control: { type: 'boolean' },
    },
    selectedElement: {
      name: '已选中元素',
      description: '关闭后 $0 未定义，$0.tagName 抛 ReferenceError。',
      control: { type: 'boolean' },
    },
  },
  render: renderInspectedWindowEval,
  parameters: storySource(inspectedWindowEvalSource),
};

export const DebuggerSession: StoryObj<DebuggerSessionArgs> = {
  args: {
    target: 'https://example.com/shop',
    stage: '已发送 Network.enable',
    cause: '未结束',
  },
  argTypes: {
    target: {
      name: '目标标签页',
      description: '只能附加 HTTP/HTTPS 页面；chrome:// 页面 attach 失败、横幅不出现。',
      control: { type: 'select' },
      options: ['https://example.com/shop', 'chrome://extensions'],
    },
    stage: {
      name: '会话阶段',
      description:
        'attach 成功出现调试横幅；发送 Network.enable 后 onEvent 持续到达；分离后横幅消失。',
      control: { type: 'select' },
      options: ['未附加', '已附加（横幅出现）', '已发送 Network.enable', '已分离'],
    },
    cause: {
      name: '结束方式',
      description:
        '阶段为「已分离」时生效：DevTools 被打开 reason 为 canceled_by_user，标签页关闭为 target_closed。',
      control: { type: 'select' },
      options: ['未结束', '用户在目标标签页打开 DevTools', '目标标签页关闭'],
    },
  },
  render: renderDebuggerSession,
  parameters: storySource(debuggerSessionSource),
};
