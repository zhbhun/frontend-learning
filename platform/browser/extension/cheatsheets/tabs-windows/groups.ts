/**
 * 范例介绍：标签分组成员从哪来、tabGroups.update 能改什么，以及分组在窗口条上的样子。
 * 前置状态：模拟窗口 1 有 6 个标签页——T402 + T403 在分组 7（灰色、标题「文档」），
 * T405 在分组 8（蓝色、标题「issue」）；其余未分组（groupId 为 TAB_GROUP_ID_NONE = -1）。
 * 主要操作：把 T404 + T406 新建分组（tabs.group）、给分组 7 设置颜色 / 标题 / 折叠
 * （tabGroups.update）、切换分组 7 的折叠、把 T402 + T403 移出分组（tabs.ungroup）。
 * 预期结果：新建分组默认灰色无标题且成员会被排成相邻；颜色 / 标题 / 折叠只影响外观，
 * 折叠后 query 仍能查到这些标签页；tabGroups.query 的结果随之变化。
 * 阅读主线：上排是窗口条（分组用彩色外框标出，折叠时合并为一个格子），下排是
 * tabGroups.query 的结果。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type GroupAction = 'group-new' | 'set-appearance' | 'toggle-collapsed' | 'ungroup';

export type GroupColor =
  | 'grey'
  | 'blue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'pink'
  | 'purple'
  | 'cyan'
  | 'orange';

export interface GroupsOptions {
  action: GroupAction;
  color: GroupColor;
  title: string;
  collapsed: boolean;
}

export interface GroupsSnapshot {
  tabCount: string;
  groupCount: string;
  group7: string;
  note: string;
}

export interface GroupsInstance {
  update(options: GroupsOptions): void;
  dispose(): void;
}

interface GroupTab {
  id: number;
  index: number;
  title: string;
  groupId: number;
}

interface SimGroup {
  id: number;
  color: GroupColor;
  title: string;
  collapsed: boolean;
}

const GROUP_HEX: Record<GroupColor, string> = {
  grey: '#64748b',
  blue: '#2563eb',
  red: '#dc2626',
  yellow: '#ca8a04',
  green: '#16a34a',
  pink: '#db2777',
  purple: '#9333ea',
  cyan: '#0891b2',
  orange: '#ea580c',
};

const TAB_GROUP_ID_NONE = -1;

interface SimState {
  tabs: GroupTab[];
  groups: SimGroup[];
}

function initialState(): SimState {
  return {
    tabs: [
      { id: 401, index: 0, title: 'tabs API 参考', groupId: TAB_GROUP_ID_NONE },
      { id: 402, index: 1, title: 'windows API 参考', groupId: 7 },
      { id: 403, index: 2, title: '消息通信', groupId: 7 },
      { id: 404, index: 3, title: 'alarms API 参考', groupId: TAB_GROUP_ID_NONE },
      { id: 405, index: 4, title: 'issue #128', groupId: 8 },
      { id: 406, index: 5, title: '调试指南', groupId: TAB_GROUP_ID_NONE },
    ],
    groups: [
      { id: 7, color: 'grey', title: '文档', collapsed: false },
      { id: 8, color: 'blue', title: 'issue', collapsed: false },
    ],
  };
}

// 归一化 index，并把同一分组的成员排成相邻（Chrome 的分组行为）
function normalize(state: SimState): void {
  const ordered: GroupTab[] = [];
  const emitted = new Set<number>();
  for (const tab of state.tabs) {
    if (emitted.has(tab.id)) continue;
    ordered.push(tab);
    emitted.add(tab.id);
    const groupId = tab.groupId;
    if (groupId !== TAB_GROUP_ID_NONE) {
      for (const member of state.tabs) {
        if (member.id !== tab.id && member.groupId === groupId && !emitted.has(member.id)) {
          ordered.push(member);
          emitted.add(member.id);
        }
      }
    }
  }
  ordered.forEach((tab, index) => {
    tab.index = index;
  });
  state.tabs = ordered;
}

function applyAction(state: SimState, options: GroupsOptions): string {
  switch (options.action) {
    case 'group-new': {
      if (state.tabs.some((tab) => tab.id === 404 && tab.groupId === 9)) {
        return 'T404 + T406 已在新分组 9 中';
      }
      const newGroup: SimGroup = { id: 9, color: 'grey', title: '', collapsed: false };
      for (const tab of state.tabs) {
        if (tab.id === 404 || tab.id === 406) tab.groupId = 9;
      }
      state.groups.push(newGroup);
      normalize(state);
      return 'tabs.group({ tabIds: [404, 406] }) → 分组 9（默认灰色、无标题），成员被排成相邻';
    }
    case 'set-appearance': {
      const group = state.groups.find((item) => item.id === 7);
      if (!group) return '分组 7 已不存在，先取消 ungroup 之外的动作无目标';
      group.color = options.color;
      group.title = options.title;
      group.collapsed = options.collapsed;
      return `tabGroups.update(7, { color: "${options.color}", title: "${options.title}", collapsed: ${options.collapsed} })`;
    }
    case 'toggle-collapsed': {
      const group = state.groups.find((item) => item.id === 7);
      if (!group) return '分组 7 已不存在';
      group.collapsed = !group.collapsed;
      return `tabGroups.update(7, { collapsed: ${group.collapsed} })：折叠只影响显示，query 仍返回全部成员`;
    }
    case 'ungroup': {
      if (!state.tabs.some((tab) => tab.groupId === 7)) {
        return 'T402 + T403 已不在分组 7 中';
      }
      for (const tab of state.tabs) {
        if (tab.groupId === 7) tab.groupId = TAB_GROUP_ID_NONE;
      }
      state.groups = state.groups.filter((group) => group.id !== 7);
      normalize(state);
      return 'tabs.ungroup([402, 403])：成员回到 TAB_GROUP_ID_NONE，分组 7 消失';
    }
  }
}

export function createGroupsExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GroupsSnapshot) => void,
): GroupsInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: GroupsOptions = {
    action: 'set-appearance',
    color: 'blue',
    title: 'API 文档',
    collapsed: false,
  };

  function text(
    content: string,
    x: number,
    y: number,
    options: { color?: string; font?: string; align?: CanvasTextAlign } = {},
  ) {
    drawingContext.fillStyle = options.color ?? '#172033';
    drawingContext.font =
      options.font ?? '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = options.align ?? 'left';
    drawingContext.fillText(content, x, y);
    drawingContext.textAlign = 'left';
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(760, size.width);
    const height = 400;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const state = initialState();
    const effect = applyAction(state, current);

    const left = 40;
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('chrome.tabs.group 与 chrome.tabGroups（模拟）', left, 28);
    text(`操作：${effect}`, left, 52, {
      color: '#1d4ed8',
      font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
    });

    // 窗口条
    const boxTop = 66;
    drawingContext.fillStyle = '#f8fafc';
    drawingContext.fillRect(left, boxTop, width - 80, 168);
    drawingContext.strokeStyle = '#cbd5e1';
    drawingContext.strokeRect(left, boxTop, width - 80, 168);
    text(`窗口 1 · ${state.tabs.length} 个标签页`, left + 12, boxTop + 18, {
      color: '#475569',
      font: '600 13px ui-sans-serif, system-ui, sans-serif',
    });

    // 组装可见格子：折叠分组合并为一个格子
    interface Cell {
      tab?: GroupTab;
      group?: SimGroup;
      collapsedMembers?: number;
    }
    const cells: Cell[] = [];
    for (const tab of state.tabs) {
      if (tab.groupId === TAB_GROUP_ID_NONE) {
        cells.push({ tab });
        continue;
      }
      const group = state.groups.find((item) => item.id === tab.groupId);
      if (!group) {
        cells.push({ tab });
        continue;
      }
      if (group.collapsed) {
        const last = cells[cells.length - 1];
        if (last && last.group?.id === group.id) {
          last.collapsedMembers = (last.collapsedMembers ?? 1) + 1;
        } else {
          cells.push({ group, collapsedMembers: 1 });
        }
      } else {
        cells.push({ tab, group });
      }
    }

    const stripTop = boxTop + 28;
    const cellWidth = Math.max(84, Math.min(140, (width - 104) / cells.length));

    // 先画格子本体，分组外的彩色顶条与 groupId
    cells.forEach((cell, i) => {
      const x = left + 12 + i * (cellWidth + 6);
      const group = cell.group;
      const hex = group ? GROUP_HEX[group.color] : undefined;
      if (group && hex) {
        drawingContext.fillStyle = hex;
        drawingContext.fillRect(x + 6, stripTop + 22, cellWidth - 12, 4);
      }
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(x + 6, stripTop + 26, cellWidth - 12, 58);
      if (cell.collapsedMembers) {
        text(`+${cell.collapsedMembers} 折叠`, x + 12, stripTop + 44, {
          color: hex ?? '#475569',
          font: '600 12px ui-sans-serif, system-ui, sans-serif',
        });
        text(`groupId ${group?.id}`, x + 12, stripTop + 66, {
          color: hex ?? '#94a3b8',
          font: '11px ui-monospace, SFMono-Regular, Menlo, monospace',
        });
        return;
      }
      const tab = cell.tab;
      if (!tab) return;
      text(`idx${tab.index}`, x + 12, stripTop + 44, {
        color: '#475569',
        font: '11px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
      const title = tab.title.length > 6 ? `${tab.title.slice(0, 6)}…` : tab.title;
      text(`T${tab.id} ${title}`, x + 12, stripTop + 62, {
        color: '#172033',
        font: '600 12px ui-sans-serif, system-ui, sans-serif',
      });
      text(`groupId ${tab.groupId}`, x + 12, stripTop + 78, {
        color: hex ?? '#94a3b8',
        font: '11px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
    });

    // 再画分组外框：一组相邻同组标签页（或一个折叠格）共用一个外框
    const drawnGroups = new Set<number>();
    cells.forEach((cell, i) => {
      const group = cell.group;
      const hex = group ? GROUP_HEX[group.color] : undefined;
      if (!group || !hex || drawnGroups.has(group.id)) return;
      drawnGroups.add(group.id);
      let end = i;
      while (
        end + 1 < cells.length &&
        cells[end + 1].group?.id === group.id &&
        cells[end + 1].tab
      ) {
        end += 1;
      }
      const x = left + 12 + i * (cellWidth + 6);
      const boxW = (end - i + 1) * (cellWidth + 6) - 6;
      drawingContext.strokeStyle = hex;
      drawingContext.lineWidth = 2;
      drawingContext.beginPath();
      drawingContext.roundRect(x + 3, stripTop + 18, boxW - 6, 70, 10);
      drawingContext.stroke();
      drawingContext.lineWidth = 1;
      const title = group.title === '' ? '（无标题）' : group.title;
      text(title, x + 8, stripTop + 12, {
        color: hex,
        font: '600 12px ui-sans-serif, system-ui, sans-serif',
      });
    });

    // tabGroups.query 结果
    const queryTop = 260;
    text(`tabGroups.query({ windowId: 1 }) → ${state.groups.length} 个分组`, left, queryTop, {
      color: '#475569',
      font: '600 13px ui-sans-serif, system-ui, sans-serif',
    });
    state.groups.forEach((group, row) => {
      const hex = GROUP_HEX[group.color];
      const y = queryTop + 22 + row * 22;
      drawingContext.fillStyle = hex;
      drawingContext.fillRect(left, y - 11, 12, 12);
      text(
        `id ${group.id} · 颜色 ${group.color} · 标题 ${group.title === '' ? '（无）' : group.title} · ${group.collapsed ? '已折叠' : '展开'}`,
        left + 20,
        y,
        { font: '12px ui-monospace, SFMono-Regular, Menlo, monospace' },
      );
      text(`  ← ${hex}`, left + 470, y, {
        color: '#94a3b8',
        font: '11px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
    });
    if (state.groups.length === 0) {
      text('（该窗口没有分组）', left + 20, queryTop + 22, {
        color: '#94a3b8',
        font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
    }

    text(
      `未分组标签页的 groupId 为 TAB_GROUP_ID_NONE = ${TAB_GROUP_ID_NONE}；颜色共 9 种`,
      left,
      height - 32,
      { color: '#475569', font: '12px ui-sans-serif, system-ui, sans-serif' },
    );
    text(
      '「把标签页移出 / 移入分组」用 tabs.group 与 tabs.ungroup；本课其余操作用例见「操作标签页」',
      left,
      height - 12,
      { color: '#94a3b8', font: '11px ui-sans-serif, system-ui, sans-serif' },
    );

    const group7 = state.groups.find((group) => group.id === 7);
    emit({
      tabCount: String(state.tabs.length),
      groupCount: String(state.groups.length),
      group7: group7
        ? `颜色 ${group7.color} · 标题 ${group7.title || '（无）'} · ${group7.collapsed ? '已折叠' : '展开'}`
        : '已解散',
      note: effect,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
