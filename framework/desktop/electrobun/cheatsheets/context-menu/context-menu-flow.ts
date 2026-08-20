/**
 * 演示内容：上下文菜单的视图侧联动全流程——把「视图 contextmenu → preventDefault →
 * rpc.send.showMenu 上报目标 → 主进程按目标构造菜单 → showContextMenu 在指针处弹出 →
 * 点击项 → action 项经 context-menu-clicked { action, data } 回主进程、再经 RPC 回视图
 * 生效；role 项由原生执行、不产生事件」同构地搬进浏览器示意。
 * 输入：右键示意窗口里的文本区 / 列表项 / 空白区决定目标与菜单内容；点击菜单项。
 * 操作：右键不同区域对比两份菜单；分别点 action 项与 role 项，看 readout 里回路在哪一步
 * 分岔；点击菜单外关闭（与原生菜单行为一致）。
 * 预期结果：点 action 项时 readout 显示 context-menu-clicked 与回传的 data，列表 / 备注
 * 随后变化；点 role 项时显示「无事件——原生执行」，选中文本进剪贴板示意；右键空白区
 * 不弹菜单（页面只给标记区域挂了 contextmenu 处理）。
 * 阅读主线：menuFor() 是主进程构造逻辑的同构（按 target 决定菜单、data 携带目标）；
 * 指针事件只负责命中测试与示意菜单的开合。
 */
import {
	createResizeObserver,
	readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ContextMenuFlowArgs {}

export interface ContextMenuFlowSnapshot {
	/** 最近右键的目标区域 */
	target: string;
	/** 视图 → 主进程的一次上报 */
	viewToBun: string;
	/** 主进程侧的动作 */
	bunSide: string;
	/** 最近点击的菜单项 */
	clicked: string;
	/** action 项的事件回传 / role 项的说明 */
	eventBack: string;
	/** 页面侧的生效结果 */
	effect: string;
}

export interface ContextMenuFlowInstance {
	dispose(): void;
}

interface SimMenuItem {
	kind: 'action' | 'role' | 'separator';
	label: string;
	/** 显示在菜单项右侧的小标签，如 action: delete-item */
	tag: string;
	action?: string;
	role?: string;
	data?: { target: string };
}

interface SimMenu {
	items: SimMenuItem[];
	x: number;
	y: number;
	target: string;
	targetLabel: string;
}

const WINDOW = { x: 48, y: 92, w: 400, h: 312 };
const WIN_HEADER_H = 34;
const NOTE = { x: WINDOW.x + 16, y: WINDOW.y + 54, w: WINDOW.w - 32, h: 46 };
const LIST_X = WINDOW.x + 16;
const LIST_W = WINDOW.w - 32;
const LIST_Y = WINDOW.y + 124;
const ROW_H = 38;

const MENU_W = 200;
const ITEM_H = 28;
const SEP_H = 12;
const MENU_PAD = 6;

const COLORS = {
	heading: '#172033',
	muted: '#475569',
	windowBorder: '#94a3b8',
	windowFill: '#f8fafc',
	windowHeader: '#e8edf5',
	regionBorder: '#4f7cff',
	regionHint: '#64748b',
	selectedFill: 'rgba(79, 124, 255, 0.18)',
	actionTag: '#4f7cff',
	roleTag: '#b45309',
	menuBorder: '#94a3b8',
	menuFill: '#ffffff',
	menuHover: 'rgba(79, 124, 255, 0.10)',
	separator: '#e2e8f0',
	closeBtn: '#ff5f57',
	minBtn: '#febc2e',
	maxBtn: '#28c840',
	clipboardBg: '#eef2f7',
};

const INITIAL_LIST = ['买牛奶', '写周报', '还书'];
const INITIAL_NOTE_WORDS = ['electrobun', '桌面', '开发'];

function menuFor(target: string): SimMenuItem[] {
	if (target === 'note') {
		return [
			{ kind: 'role', label: '剪切', tag: 'role: cut', role: 'cut' },
			{ kind: 'role', label: '拷贝', tag: 'role: copy', role: 'copy' },
			{ kind: 'role', label: '粘贴', tag: 'role: paste', role: 'paste' },
			{ kind: 'separator', label: '', tag: '' },
			{
				kind: 'action',
				label: '插入今日日期',
				tag: 'action: insert-date',
				action: 'insert-date',
				data: { target: 'note' },
			},
		];
	}
	return [
		{
			kind: 'action',
			label: '置顶',
			tag: 'action: pin-item',
			action: 'pin-item',
			data: { target },
		},
		{
			kind: 'action',
			label: '删除',
			tag: 'action: delete-item',
			action: 'delete-item',
			data: { target },
		},
		{ kind: 'separator', label: '', tag: '' },
		{
			kind: 'action',
			label: '清空列表',
			tag: 'action: clear-all',
			action: 'clear-all',
		},
	];
}

function menuSummary(items: SimMenuItem[]): string {
	const count = items.filter((item) => item.kind !== 'separator').length;
	const seps = items.filter((item) => item.kind === 'separator').length;
	return `按目标构造 → showContextMenu（${count} 项 + ${seps} 分隔线）`;
}

function menuHeight(items: SimMenuItem[]): number {
	return (
		MENU_PAD * 2 +
		items.reduce(
			(sum, item) => sum + (item.kind === 'separator' ? SEP_H : ITEM_H),
			0,
		)
	);
}

function itemRect(
	menu: SimMenu,
	index: number,
): { x: number; y: number; w: number; h: number } {
	let y = menu.y + MENU_PAD;
	for (let i = 0; i < index; i += 1) {
		y += menu.items[i]!.kind === 'separator' ? SEP_H : ITEM_H;
	}
	return {
		x: menu.x + MENU_PAD,
		y,
		w: MENU_W - MENU_PAD * 2,
		h: menu.items[index]!.kind === 'separator' ? SEP_H : ITEM_H,
	};
}

function formatData(data: { target: string } | undefined): string {
	return data ? `{ target: '${data.target}' }` : 'undefined';
}

export function createContextMenuFlow(
	canvas: HTMLCanvasElement,
	emit: (snapshot: ContextMenuFlowSnapshot) => void,
): ContextMenuFlowInstance {
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('当前浏览器不支持 Canvas 2D。');
	}
	const ctx: CanvasRenderingContext2D = context;

	let noteWords = [...INITIAL_NOTE_WORDS];
	let selectedWord = 0;
	let listItems = [...INITIAL_LIST];
	let clipboard: string | null = null;
	let menu: SimMenu | null = null;
	let hoverIndex = -1;

	let snapshot: ContextMenuFlowSnapshot = {
		target: '尚未右键',
		viewToBun: '等待右键示意窗口里的文本区 / 列表项',
		bunSide: '—',
		clicked: '—',
		eventBack: '—',
		effect: '—',
	};

	function emitSnapshot() {
		emit({ ...snapshot });
	}

	function pointFromEvent(event: MouseEvent): { x: number; y: number } {
		const bounds = canvas.getBoundingClientRect();
		return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
	}

	function inRect(
		point: { x: number; y: number },
		rect: { x: number; y: number; w: number; h: number },
	): boolean {
		return (
			point.x >= rect.x &&
			point.x <= rect.x + rect.w &&
			point.y >= rect.y &&
			point.y <= rect.y + rect.h
		);
	}

	function listRowRect(index: number) {
		return { x: LIST_X, y: LIST_Y + index * ROW_H, w: LIST_W, h: ROW_H };
	}

	// 命中测试：返回 'note' / 'list-item-<i>' / 'blank'（窗口内空白）/ null（窗口外）
	function regionAt(
		point: { x: number; y: number },
	): { kind: string; index: number } | null {
		if (!inRect(point, WINDOW)) {
			return null;
		}
		if (inRect(point, NOTE)) {
			return { kind: 'note', index: -1 };
		}
		for (let i = 0; i < listItems.length; i += 1) {
			if (inRect(point, listRowRect(i))) {
				return { kind: 'list-item', index: i };
			}
		}
		return { kind: 'blank', index: -1 };
	}

	function applySimAction(item: SimMenuItem): string {
		if (!item.action) {
			return '—';
		}
		switch (item.action) {
			case 'pin-item': {
				const target = item.data?.target ?? '';
				const index = Number(target.split('-').pop());
				const label = listItems[index];
				if (label !== undefined) {
					listItems = [label, ...listItems.filter((_, i) => i !== index)];
					return `menuAction 回视图 → 「${label}」已置顶`;
				}
				return '目标不存在';
			}
			case 'delete-item': {
				const target = item.data?.target ?? '';
				const index = Number(target.split('-').pop());
				const label = listItems[index];
				if (label !== undefined) {
					listItems = listItems.filter((_, i) => i !== index);
					return `menuAction 回视图 → 「${label}」已删除`;
				}
				return '目标不存在';
			}
			case 'clear-all':
				listItems = [];
				return 'menuAction 回视图 → 列表已清空';
			case 'insert-date': {
				const today = new Date().toISOString().slice(0, 10);
				const dateWord = `· ${today}`;
				// 已有日期词就更新它，避免反复插入把示意文本撑出文本区
				noteWords = noteWords.some((word) => word.startsWith('·'))
					? noteWords.map((word) => (word.startsWith('·') ? dateWord : word))
					: [...noteWords, dateWord];
				return `menuAction 回视图 → 备注写入日期「${dateWord}」`;
			}
			default:
				return '—';
		}
	}

	function applyNativeRole(item: SimMenuItem): string {
		const word = noteWords[selectedWord] ?? '';
		switch (item.role) {
			case 'cut':
				if (word !== '') {
					clipboard = word;
					noteWords = noteWords.filter((_, i) => i !== selectedWord);
					selectedWord = Math.min(selectedWord, noteWords.length - 1);
					return `选区「${word}」移入剪贴板，备注已更新（原生执行）`;
				}
				return '选区为空，无变化（原生执行）';
			case 'copy':
				if (word !== '') {
					clipboard = word;
					return `剪贴板 ← 「${word}」（原生执行）`;
				}
				return '选区为空，无变化（原生执行）';
			case 'paste':
				if (clipboard === null) {
					return '剪贴板为空，无变化（原生执行）';
				}
				if (noteWords.length === 0) {
					noteWords = [clipboard];
					selectedWord = 0;
					return `「${clipboard}」已粘贴进空的备注（原生执行）`;
				}
				noteWords = noteWords.map((w, i) => (i === selectedWord ? clipboard! : w));
				return `选区替换为「${clipboard}」（原生执行）`;
			default:
				return '原生执行';
		}
	}

	function onContextMenu(event: MouseEvent) {
		// 与真实模式一致：阻止浏览器默认菜单，改弹主进程构造的原生菜单
		event.preventDefault();
		const point = pointFromEvent(event);
		const region = regionAt(point);
		if (!region || region.kind === 'blank') {
			menu = null;
			if (region?.kind === 'blank') {
				snapshot = {
					target: '窗口空白区（未标记 data-context）',
					viewToBun: '没有上报——页面只给标记区域挂了 contextmenu 处理',
					bunSide: '—',
					clicked: '—',
					eventBack: '—',
					effect: '没有菜单弹出',
				};
			}
			emitSnapshot();
			draw();
			return;
		}

		const target =
			region.kind === 'note' ? 'note' : `list-item-${region.index}`;
		const items = menuFor(target);
		const size = readCanvasSize(canvas);
		const width = Math.max(560, size.width);
		const height = Math.max(500, size.height);
		menu = {
			items,
			x: Math.min(point.x, width - MENU_W - 8),
			y: Math.min(point.y, height - menuHeight(items) - 8),
			target,
			targetLabel:
				region.kind === 'note'
					? '文本区「备注」'
					: `列表项「${listItems[region.index] ?? ''}」`,
		};
		hoverIndex = -1;
		snapshot = {
			target: `${menu.targetLabel}（target: '${target}'）`,
			viewToBun: `contextmenu → preventDefault → rpc.send.showMenu({ target: '${target}' })`,
			bunSide: menuSummary(items),
			clicked: '（等待点击菜单项）',
			eventBack: '—',
			effect: '—',
		};
		emitSnapshot();
		draw();
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0 || !menu) {
			return;
		}
		event.preventDefault();
		const point = pointFromEvent(event);
		for (let i = 0; i < menu.items.length; i += 1) {
			if (inRect(point, itemRect(menu, i))) {
				const item = menu.items[i]!;
				if (item.kind === 'separator') {
					return;
				}
				menu = null;
				hoverIndex = -1;
				if (item.kind === 'action') {
					snapshot = {
						...snapshot,
						clicked: `${item.label}（${item.tag}）`,
						eventBack: `context-menu-clicked { action: '${item.action}', data: ${formatData(item.data)} }`,
						effect: applySimAction(item),
					};
				} else {
					snapshot = {
						...snapshot,
						clicked: `${item.label}（${item.tag}）`,
						eventBack: '无事件——role 项由原生执行，不经过 context-menu-clicked',
						effect: applyNativeRole(item),
					};
				}
				emitSnapshot();
				draw();
				return;
			}
		}
		// 点击菜单外：关闭菜单（与原生行为一致），不触发任何动作
		menu = null;
		hoverIndex = -1;
		snapshot = {
			...snapshot,
			clicked: '菜单已关闭（点击菜单外）',
			eventBack: '—',
			effect: '—',
		};
		emitSnapshot();
		draw();
	}

	function onPointerMove(event: PointerEvent) {
		const point = pointFromEvent(event);
		if (menu) {
			let next = -1;
			for (let i = 0; i < menu.items.length; i += 1) {
				if (
					menu.items[i]!.kind !== 'separator' &&
					inRect(point, itemRect(menu, i))
				) {
					next = i;
					break;
				}
			}
			if (next !== hoverIndex) {
				hoverIndex = next;
				draw();
			}
			canvas.style.cursor = next >= 0 ? 'pointer' : 'default';
			return;
		}
		const region = regionAt(point);
		canvas.style.cursor =
			region && (region.kind === 'note' || region.kind === 'list-item')
				? 'context-menu'
				: 'default';
	}

	function draw() {
		const size = readCanvasSize(canvas);
		const width = Math.max(560, size.width);
		const height = Math.max(500, size.height);
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

		canvas.width = Math.round(width * pixelRatio);
		canvas.height = Math.round(height * pixelRatio);
		ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		ctx.clearRect(0, 0, width, height);

		ctx.fillStyle = COLORS.heading;
		ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText('右键联动示意：右键示意窗口里的不同区域', 16, 28);
		ctx.fillStyle = COLORS.muted;
		ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText(
			'右键文本区 / 列表项弹菜单；点 action 项与 role 项对比 readout 里的回路分岔；点菜单外关闭',
			16,
			48,
		);

		// ---- 示意窗口 ----
		ctx.fillStyle = COLORS.windowFill;
		ctx.strokeStyle = COLORS.windowBorder;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h, 10);
		ctx.fill();
		ctx.stroke();

		// 窗口标题栏
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(WINDOW.x, WINDOW.y, WINDOW.w, WIN_HEADER_H, [10, 10, 0, 0]);
		ctx.clip();
		ctx.fillStyle = COLORS.windowHeader;
		ctx.fillRect(WINDOW.x, WINDOW.y, WINDOW.w, WIN_HEADER_H);
		ctx.restore();
		const dots: Array<[string, number]> = [
			[COLORS.closeBtn, 0],
			[COLORS.minBtn, 1],
			[COLORS.maxBtn, 2],
		];
		for (const [color, offset] of dots) {
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(WINDOW.x + 18 + offset * 18, WINDOW.y + WIN_HEADER_H / 2, 5, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = COLORS.muted;
		ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText('便签（示意 webview 窗口）', WINDOW.x + 84, WINDOW.y + 22);

		// ---- 文本区：标记 data-context="note"，选中词高亮 ----
		ctx.setLineDash([4, 3]);
		ctx.strokeStyle = COLORS.regionBorder;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(NOTE.x, NOTE.y, NOTE.w, NOTE.h, 6);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.fillStyle = COLORS.regionHint;
		ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
		ctx.fillText('data-context="note"', NOTE.x, NOTE.y - 6);
		ctx.fillStyle = COLORS.heading;
		ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText('备注：', NOTE.x + 10, NOTE.y + 28);
		let wordX = NOTE.x + 56;
		noteWords.forEach((word, index) => {
			const metrics = ctx.measureText(word);
			if (index === selectedWord) {
				ctx.fillStyle = COLORS.selectedFill;
				ctx.beginPath();
				ctx.roundRect(wordX - 2, NOTE.y + 14, metrics.width + 6, 20, 3);
				ctx.fill();
			}
			ctx.fillStyle = COLORS.heading;
			ctx.fillText(word, wordX, NOTE.y + 28);
			wordX += metrics.width + 10;
		});

		// ---- 列表：每行标记 data-context="list-item-<i>" ----
		if (listItems.length === 0) {
			ctx.fillStyle = COLORS.regionHint;
			ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText('（列表已空）', LIST_X + 12, LIST_Y + 24);
		}
		listItems.forEach((label, index) => {
			const rect = listRowRect(index);
			ctx.strokeStyle = COLORS.regionBorder;
			ctx.setLineDash([4, 3]);
			ctx.beginPath();
			ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 6);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = COLORS.heading;
			ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText(label, rect.x + 12, rect.y + 24);
			ctx.fillStyle = COLORS.regionHint;
			ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
			ctx.fillText(
				`list-item-${index}`,
				rect.x + rect.w - 12 - ctx.measureText(`list-item-${index}`).width,
				rect.y + 23,
			);
		});

		// ---- 剪贴板示意（role 项的原生效果落点）----
		const clipY = WINDOW.y + WINDOW.h - 34;
		ctx.fillStyle = COLORS.clipboardBg;
		ctx.beginPath();
		ctx.roundRect(WINDOW.x + 16, clipY, WINDOW.w - 32, 24, 6);
		ctx.fill();
		ctx.fillStyle = COLORS.muted;
		ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText(
			clipboard === null
				? '剪贴板：空（点 role 项 拷贝/剪切 试试）'
				: `剪贴板：「${clipboard}」`,
			WINDOW.x + 26,
			clipY + 16,
		);

		// ---- 示意原生菜单 ----
		if (menu) {
			const mh = menuHeight(menu.items);
			ctx.save();
			ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
			ctx.shadowBlur = 14;
			ctx.shadowOffsetY = 4;
			ctx.fillStyle = COLORS.menuFill;
			ctx.beginPath();
			ctx.roundRect(menu.x, menu.y, MENU_W, mh, 8);
			ctx.fill();
			ctx.restore();
			ctx.strokeStyle = COLORS.menuBorder;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(menu.x, menu.y, MENU_W, mh, 8);
			ctx.stroke();

			menu.items.forEach((item, index) => {
				const rect = itemRect(menu!, index);
				if (item.kind === 'separator') {
					ctx.strokeStyle = COLORS.separator;
					ctx.beginPath();
					ctx.moveTo(rect.x + 6, rect.y + SEP_H / 2);
					ctx.lineTo(rect.x + rect.w - 6, rect.y + SEP_H / 2);
					ctx.stroke();
					return;
				}
				if (index === hoverIndex) {
					ctx.fillStyle = COLORS.menuHover;
					ctx.beginPath();
					ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 6);
					ctx.fill();
				}
				ctx.fillStyle = COLORS.heading;
				ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
				ctx.fillText(item.label, rect.x + 12, rect.y + 19);
				ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
				ctx.fillStyle =
					item.kind === 'action' ? COLORS.actionTag : COLORS.roleTag;
				ctx.fillText(
					item.tag,
					rect.x + rect.w - 10 - ctx.measureText(item.tag).width,
					rect.y + 19,
				);
			});
		}
	}

	const contextMenu = (event: MouseEvent) => onContextMenu(event);
	const pointerDown = (event: PointerEvent) => onPointerDown(event);
	const pointerMove = (event: PointerEvent) => onPointerMove(event);

	canvas.style.touchAction = 'none';
	canvas.addEventListener('contextmenu', contextMenu);
	canvas.addEventListener('pointerdown', pointerDown);
	canvas.addEventListener('pointermove', pointerMove);

	const resizeObserver = createResizeObserver(canvas, draw);
	draw();
	emitSnapshot();

	return {
		dispose() {
			canvas.removeEventListener('contextmenu', contextMenu);
			canvas.removeEventListener('pointerdown', pointerDown);
			canvas.removeEventListener('pointermove', pointerMove);
			resizeObserver.disconnect();
		},
	};
}
