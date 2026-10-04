import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import bookmarkTreeSource from './bookmark-tree.ts?raw';
import historySearchSource from './history-search.ts?raw';
import downloadLifecycleSource from './download-lifecycle.ts?raw';
import browsingDataRemovalSource from './browsing-data-removal.ts?raw';
import { createBookmarkTree } from './bookmark-tree';
import type {
  BookmarkTreeInstance,
  NodeType,
  ParentFolder,
} from './bookmark-tree';
import { createHistorySearch } from './history-search';
import type {
  HistorySearchInstance,
  TimeWindow,
} from './history-search';
import { createDownloadLifecycle } from './download-lifecycle';
import type {
  DownloadLifecycleInstance,
  Scenario,
} from './download-lifecycle';
import { createBrowsingDataRemoval } from './browsing-data-removal';
import type {
  BrowsingDataInstance,
  ScopeKey,
  SinceKey,
} from './browsing-data-removal';

// 把 DOM 范例实例接到 Storybook args 上：实例只创建一次，后续参数变化只调用
// apply；实例自带的 snapshot 由左下角读数显示；离开当前 Docs 页（节点被移除）
// 时调用实例的 dispose。
function domStory<
  Args,
  T extends {
    element: HTMLElement;
    snapshot(): Array<[string, string]>;
    dispose(): void;
  },
>(options: {
  create: () => T;
  captions: string[];
  apply: (instance: T, args: Args) => void;
}): (args: Args) => HTMLElement {
  let instance: T | undefined;
  let readoutEl: HTMLDListElement | undefined;

  return (args: Args): HTMLElement => {
    let current = instance;
    if (!current) {
      current = options.create();
      instance = current;
      const created = current;
      const stage = created.element;

      const captions = document.createDocumentFragment();
      options.captions.forEach((text, index) => {
        const caption = document.createElement('p');
        caption.className =
          index === 0
            ? 'cs-caption cs-caption--left'
            : 'cs-caption cs-caption--right';
        caption.textContent = text;
        captions.append(caption);
      });
      stage.insertBefore(captions, stage.firstChild);

      readoutEl = document.createElement('dl');
      readoutEl.className = 'cs-readout';
      stage.append(readoutEl);

      requestAnimationFrame(() => {
        const parent = created.element.parentElement;
        if (!parent) {
          return;
        }
        const observer = new MutationObserver(() => {
          if (!created.element.isConnected) {
            observer.disconnect();
            created.dispose();
            if (instance === created) {
              instance = undefined;
              readoutEl = undefined;
            }
          }
        });
        observer.observe(parent, { childList: true });
      });
    }

    options.apply(current, args);
    paintReadout(readoutEl!, current.snapshot());
    return current.element;
  };
}

// 读数重绘：dt/dd 数量固定，只更新标签与取值
function paintReadout(
  root: HTMLDListElement,
  entries: Array<[string, string]>,
): void {
  if (root.childElementCount !== entries.length * 2) {
    root.replaceChildren();
    for (const [label] of entries) {
      const term = document.createElement('dt');
      term.textContent = label;
      root.append(term, document.createElement('dd'));
    }
  }

  const terms = root.querySelectorAll('dt');
  const values = root.querySelectorAll('dd');
  entries.forEach(([label, value], index) => {
    const term = terms[index];
    const cell = values[index];
    if (term && term.textContent !== label) {
      term.textContent = label;
    }
    if (cell && cell.textContent !== value) {
      cell.textContent = value;
    }
  });
}

interface BookmarkTreeArgs {
  parent: string;
  index: number;
  nodeType: string;
}

interface HistorySearchArgs {
  text: string;
  timeWindow: string;
  maxResults: number;
}

interface DownloadLifecycleArgs {
  scenario: string;
}

interface BrowsingDataRemovalArgs {
  since: string;
  scope: string;
  includeExtensionOrigins: boolean;
}

const PARENT_BY_LABEL: Record<string, ParentFolder> = {
  '书签栏 (folderType: "bookmarks-bar")': 'bar',
  '其他书签 (folderType: "other")': 'other',
};

const NODE_TYPE_BY_LABEL: Record<string, NodeType> = {
  '书签（带 url）': 'bookmark',
  '文件夹（无 url）': 'folder',
};

const TIME_WINDOW_BY_LABEL: Record<string, TimeWindow> = {
  '最近 24 小时（默认）': 'day',
  '最近 7 天': 'week',
  '全部时间（startTime: 0）': 'all',
};

const SCENARIO_BY_LABEL: Record<string, Scenario> = {
  正常完成: 'ok',
  '网络中断（NETWORK_FAILED）': 'network',
  '磁盘空间不足（FILE_NO_SPACE）': 'disk',
};

const SINCE_BY_LABEL: Record<string, SinceKey> = {
  '全部时间（省略 since）': 'all',
  过去一小时: 'hour',
  过去一天: 'day',
  过去一周: 'week',
};

const SCOPE_BY_LABEL: Record<string, ScopeKey> = {
  '所有源（省略 origins）': 'all',
  '仅 example.com（origins）': 'origins',
  '除 example.com 外（excludeOrigins）': 'exclude',
};

const renderBookmarkTree = domStory<BookmarkTreeArgs, BookmarkTreeInstance>({
  create: createBookmarkTree,
  captions: [
    '书签树与 parentId + index 定位（模拟）',
    '事件名与参数名和 chrome.bookmarks 一致',
  ],
  apply(instance: BookmarkTreeInstance, args: BookmarkTreeArgs) {
    instance.update({
      parent: PARENT_BY_LABEL[args.parent],
      index: args.index,
      nodeType: NODE_TYPE_BY_LABEL[args.nodeType],
    });
  },
});

const renderHistorySearch = domStory<HistorySearchArgs, HistorySearchInstance>({
  create: createHistorySearch,
  captions: [
    'history.search 的过滤、聚合与统计（模拟）',
    '每页一条 HistoryItem，取最近访问',
  ],
  apply(instance: HistorySearchInstance, args: HistorySearchArgs) {
    instance.update({
      text: args.text,
      timeWindow: TIME_WINDOW_BY_LABEL[args.timeWindow],
      maxResults: args.maxResults,
    });
  },
});

const renderDownloadLifecycle = domStory<
  DownloadLifecycleArgs,
  DownloadLifecycleInstance
>({
  create: createDownloadLifecycle,
  captions: [
    'download / pause / resume / cancel 的调用序列（模拟）',
    '状态、读数与 onChanged 事件同步更新',
  ],
  apply(instance: DownloadLifecycleInstance, args: DownloadLifecycleArgs) {
    instance.update({ scenario: SCENARIO_BY_LABEL[args.scenario] });
  },
});

const renderBrowsingDataRemoval = domStory<
  BrowsingDataRemovalArgs,
  BrowsingDataInstance
>({
  create: createBrowsingDataRemoval,
  captions: [
    'remove(options, dataTypeSet) 的类别 × 时间 × 源范围（模拟）',
    '删除不可恢复：执行后只显示剩余存量',
  ],
  apply(instance: BrowsingDataInstance, args: BrowsingDataRemovalArgs) {
    instance.update({
      since: SINCE_BY_LABEL[args.since],
      scope: SCOPE_BY_LABEL[args.scope],
      includeExtensionOrigins: args.includeExtensionOrigins,
    });
  },
});

const meta = {
  id: 'browser-data',
  title: '网页与数据/浏览器数据',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const BookmarkTree: StoryObj<BookmarkTreeArgs> = {
  args: {
    parent: '书签栏 (folderType: "bookmarks-bar")',
    index: 0,
    nodeType: '书签（带 url）',
  },
  argTypes: {
    parent: {
      name: '父文件夹 parentId',
      description:
        'create 与 move 的目标父文件夹；省略 parentId 时 create 默认落在「其他书签」。',
      control: { type: 'select' },
      options: [
        '书签栏 (folderType: "bookmarks-bar")',
        '其他书签 (folderType: "other")',
      ],
    },
    index: {
      name: 'index',
      description:
        '新节点在父文件夹中的 0 基插入位置；指定 index 后原有节点顺移。',
      control: { type: 'range', min: 0, max: 4, step: 1 },
    },
    nodeType: {
      name: '节点类型',
      description: 'CreateDetails 不带 url 时创建的是文件夹，带 url 时是书签。',
      control: { type: 'select' },
      options: ['书签（带 url）', '文件夹（无 url）'],
    },
  },
  render: renderBookmarkTree,
  parameters: storySource(bookmarkTreeSource),
};

export const HistorySearch: StoryObj<HistorySearchArgs> = {
  args: {
    text: 'chrome',
    timeWindow: '最近 24 小时（默认）',
    maxResults: 10,
  },
  argTypes: {
    text: {
      name: 'text',
      description: '自由文本查询；空串返回全部页面。',
      control: { type: 'text' },
    },
    timeWindow: {
      name: 'startTime',
      description:
        '限定结果的时间起点：默认 24 小时前，0 表示不限（全部时间）。',
      control: { type: 'select' },
      options: ['最近 24 小时（默认）', '最近 7 天', '全部时间（startTime: 0）'],
    },
    maxResults: {
      name: 'maxResults',
      description: '返回条数上限，默认 100；本模拟数据集共 14 页。',
      control: { type: 'range', min: 1, max: 14, step: 1 },
    },
  },
  render: renderHistorySearch,
  parameters: storySource(historySearchSource),
};

export const DownloadLifecycle: StoryObj<DownloadLifecycleArgs> = {
  args: {
    scenario: '正常完成',
  },
  argTypes: {
    scenario: {
      name: '网络结局',
      description:
        '下载推进到约四成时是否失败以及失败原因；正常结局则走完到 complete。',
      control: { type: 'select' },
      options: [
        '正常完成',
        '网络中断（NETWORK_FAILED）',
        '磁盘空间不足（FILE_NO_SPACE）',
      ],
    },
  },
  render: renderDownloadLifecycle,
  parameters: storySource(downloadLifecycleSource),
};

export const BrowsingDataRemoval: StoryObj<BrowsingDataRemovalArgs> = {
  args: {
    since: '全部时间（省略 since）',
    scope: '所有源（省略 origins）',
    includeExtensionOrigins: false,
  },
  argTypes: {
    since: {
      name: '时间范围 since',
      description:
        '删除该时刻之后累积的数据；省略即 0，也就是全部历史时段。',
      control: { type: 'select' },
      options: ['全部时间（省略 since）', '过去一小时', '过去一天', '过去一周'],
    },
    scope: {
      name: '源范围 origins / excludeOrigins',
      description:
        'origins 与 excludeOrigins 互斥，只对 cookies、cache 与网站存储类生效；删 history 时不起作用。',
      control: { type: 'select' },
      options: [
        '所有源（省略 origins）',
        '仅 example.com（origins）',
        '除 example.com 外（excludeOrigins）',
      ],
    },
    includeExtensionOrigins: {
      name: 'originTypes.extension',
      description:
        '是否把 chrome-extension:// 源的存储数据纳入删除；文档要求对这个选项格外小心。',
      control: { type: 'boolean' },
    },
  },
  render: renderBrowsingDataRemoval,
  parameters: storySource(browsingDataRemovalSource),
};
