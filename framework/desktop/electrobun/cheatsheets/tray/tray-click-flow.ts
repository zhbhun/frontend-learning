/**
 * 演示内容：一次托盘交互的完整链路——点击示意菜单栏里的托盘项或菜单项，
 * 事件从原生回调进入 Bun，沿「全局通道 + 托盘级通道」分发到 handler，
 * handler 里按 action 是否为空串区分图标点击与菜单项点击，并用最新状态
 * 全量重建菜单（setMenu）。链路与载荷形态对照 1.18.1 包内实现
 * （dist/api/bun/core/Tray.ts 与 proc/native.ts 的 trayItemHandler）。
 * 输入：订阅方式决定事件命中哪条通道（tray.on / Electrobun.events.on / 两者），
 * 自动更新勾选状态决定菜单初始形态与 enabled 门控。
 * 操作：点击托盘图标弹出菜单；点击菜单项触发对应 action；点击右下
 * 「应用状态」盒模拟关闭/打开主窗口；在 Controls 中切换订阅方式与初始勾选。
 * 预期结果：图标点击的 action 为空串 ""，菜单项点击带该项 action 与 data；
 * 勾选「自动更新」后灰显项变为可点；窗口关闭后「显示主窗口」使重建计数 +1
 * （close 不可取消，常驻形态靠重建）；「退出」后整个演示停摆；
 * 每次托盘点击 setMenu 计数 +1（菜单是重建出来的，不是原地改的）。
 * 阅读主线：fireClick() 是唯一交互路由；draw() 只负责把状态画出来。
 */
import {
	createResizeObserver,
	readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type TraySubscribe = 'tray-on' | 'global' | 'both';

export interface TrayClickFlowArgs {
	subscribe: TraySubscribe;
	autoUpdate: boolean;
}

export interface TrayClickFlowSnapshot {
	/** 最近一次 tray-clicked 的载荷 */
	lastEvent: string;
	/** 命中的订阅通道 */
	channels: string;
	/** 菜单状态（勾选与门控的来源） */
	menuState: string;
	/** setMenu 次数与窗口重建计数 */
	counters: string;
}

export interface TrayClickFlowInstance {
	update(args: TrayClickFlowArgs): void;
	dispose(): void;
}

interface DemoState {
	subscribe: TraySubscribe;
	autoUpdate: boolean;
	menuOpen: boolean;
	setMenuCount: number;
	windowOpen: boolean;
	windowRebuilt: number;
	appRunning: boolean;
	lastEvent: { action: string; data?: unknown } | null;
	hover: string | null;
}

interface MenuItemView {
	id: string;
	label: string;
	checkbox: boolean;
	checked: boolean;
	enabled: boolean;
	divider: boolean;
	data?: unknown;
}

const COLORS = {
	heading: '#172033',
	muted: '#475569',
	barFill: '#e9edf4',
	barBorder: '#c3ccdb',
	panelFill: '#ffffff',
	panelBorder: '#94a3b8',
	accent: '#4f7cff',
	accentSoft: 'rgba(79, 124, 255, 0.10)',
	ok: '#4f7cff',
	disabled: '#94a3b8',
	skipped: '#b6c0cf',
	arrow: '#64748b',
	quit: '#b45309',
};

const FONT_UI = 'ui-sans-serif, system-ui, sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// 菜单永远从状态重建：勾选、门控都由 DemoState 推导（同 tray-observer 工程）
function menuItemsOf(state: DemoState): MenuItemView[] {
	return [
		{
			id: 'auto-update',
			label: '自动更新',
			checkbox: true,
			checked: state.autoUpdate,
			enabled: true,
			divider: false,
		},
		{
			id: 'advanced',
			label: '自动更新开启后可用',
			checkbox: false,
			checked: false,
			enabled: state.autoUpdate,
			divider: false,
		},
		{ id: '', label: '', checkbox: false, checked: false, enabled: true, divider: true },
		{
			id: 'show-main',
			label: '显示主窗口',
			checkbox: false,
			checked: false,
			enabled: true,
			divider: false,
			data: { window: 'main' },
		},
		{
			id: 'quit',
			label: '退出',
			checkbox: false,
			checked: false,
			enabled: true,
			divider: false,
		},
	];
}

function dataText(data: unknown): string {
	return data === undefined ? 'undefined' : JSON.stringify(data);
}

export function createTrayClickFlow(
	canvas: HTMLCanvasElement,
	emit: (snapshot: TrayClickFlowSnapshot) => void,
): TrayClickFlowInstance {
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('当前浏览器不支持 Canvas 2D。');
	}
	const g: CanvasRenderingContext2D = context;

	const state: DemoState = {
		subscribe: 'tray-on',
		autoUpdate: false,
		menuOpen: false,
		setMenuCount: 1, // 与 tray-observer 一致：启动时先建一次菜单
		windowOpen: true,
		windowRebuilt: 0,
		appRunning: true,
		lastEvent: null,
		hover: null,
	};

	// ---- 布局：菜单栏在顶部，菜单面板靠右，链路盒子占左侧，右下是应用状态 ----

	function layout(width: number) {
		const margin = 24;
		const panelWidth = 216;
		const panelX = width - margin - panelWidth;
		const boxWidth = Math.max(240, panelX - margin - 24);
		return {
			margin,
			barY: 46,
			barH: 30,
			panelWidth,
			panelX,
			boxWidth,
			boxX: margin,
		};
	}

	function trayRect(width: number) {
		const { panelX } = layout(width);
		// 托盘区在菜单栏最右端：图标 + 标题
		return { x: panelX - 4, y: 46, w: 190, h: 30 };
	}

	function menuRect(width: number) {
		const { panelX } = layout(width);
		const items = menuItemsOf(state);
		const rowH = 26;
		const dividerH = 9;
		const contentH = items.reduce(
			(sum, item) => sum + (item.divider ? dividerH : rowH),
			0,
		);
		return { x: panelX, y: 82, w: 216, h: contentH + 12 };
	}

	function itemRect(width: number, index: number) {
		const menu = menuRect(width);
		const items = menuItemsOf(state);
		let y = menu.y + 6;
		for (let i = 0; i < index; i += 1) {
			y += items[i]!.divider ? 9 : 26;
		}
		return { x: menu.x + 6, y, w: menu.w - 12, h: 26 };
	}

	// ---- 交互路由：点击唯一入口 ----

	function fireClick(id: string) {
		if (!state.appRunning) {
			return;
		}
		if (id === 'tray') {
			// 图标点击：action 为空串，handler 里重建菜单
			state.lastEvent = { action: '' };
			state.setMenuCount += 1;
			state.menuOpen = true;
		} else if (id.startsWith('item:')) {
			const item = menuItemsOf(state).find(
				(candidate) => candidate.id === id.slice(5),
			);
			if (!item || !item.enabled) {
				return;
			}
			state.lastEvent = { action: item.id, data: item.data };
			switch (item.id) {
				case 'auto-update':
					state.autoUpdate = !state.autoUpdate;
					break;
				case 'show-main':
					if (!state.windowOpen) {
						state.windowOpen = true;
						state.windowRebuilt += 1;
					}
					break;
				case 'quit':
					state.appRunning = false;
					state.menuOpen = false;
					break;
				default:
					break;
			}
			// 菜单项点击同样以重建菜单收尾
			state.setMenuCount += 1;
			state.menuOpen = false;
		} else if (id === 'window-box') {
			// 模拟主窗口关闭（或重新打开）：不触发 tray-clicked，只改应用状态
			state.windowOpen = !state.windowOpen;
		} else if (id === 'outside') {
			state.menuOpen = false;
		}
		draw();
	}

	function hitTest(event: MouseEvent): string | null {
		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		const width = Math.max(560, rect.width);
		const scale = rect.width / width;
		const px = x / scale;
		const py = y / scale;
		if (!state.appRunning) {
			return null;
		}
		const tray = trayRect(width);
		if (px >= tray.x && px <= tray.x + tray.w && py >= tray.y && py <= tray.y + tray.h) {
			return 'tray';
		}
		if (state.menuOpen) {
			const items = menuItemsOf(state);
			for (let i = 0; i < items.length; i += 1) {
				if (items[i]!.divider) {
					continue;
				}
				const box = itemRect(width, i);
				if (px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h) {
					return `item:${items[i]!.id}`;
				}
			}
		}
		// 应用状态盒：点击模拟用户关闭/打开主窗口（窗口事件，不产生 tray-clicked）
		// 盒子在菜单关闭时才显示，命中判定与显示条件一致
		if (
			!state.menuOpen &&
			px >= width - 24 - 216 &&
			px <= width - 24 &&
			py >= 250 &&
			py <= 308
		) {
			return 'window-box';
		}
		return 'outside';
	}

	function onClick(event: MouseEvent) {
		const hit = hitTest(event);
		if (hit) {
			fireClick(hit);
		}
	}

	function onPointerMove(event: MouseEvent) {
		const hit = hitTest(event);
		let clickable = Boolean(hit) && hit !== 'outside';
		if (clickable && hit!.startsWith('item:')) {
			// 灰显（enabled: false）的菜单项不可点，指针保持默认
			const item = menuItemsOf(state).find(
				(candidate) => candidate.id === hit!.slice(5),
			);
			clickable = Boolean(item?.enabled);
		}
		state.hover = hit && hit !== 'outside' ? hit : null;
		canvas.style.cursor = clickable ? 'pointer' : 'default';
	}

	// ---- 绘制 ----

	function roundBox(
		x: number,
		y: number,
		w: number,
		h: number,
		border: string,
		fill = COLORS.panelFill,
	) {
		g.fillStyle = fill;
		g.strokeStyle = border;
		g.lineWidth = 1.5;
		g.beginPath();
		g.roundRect(x, y, w, h, 8);
		g.fill();
		g.stroke();
	}

	function drawArrow(fromY: number, toY: number, centerX: number) {
		g.strokeStyle = COLORS.arrow;
		g.fillStyle = COLORS.arrow;
		g.lineWidth = 1.5;
		g.beginPath();
		g.moveTo(centerX, fromY);
		g.lineTo(centerX, toY - 6);
		g.stroke();
		g.beginPath();
		g.moveTo(centerX, toY);
		g.lineTo(centerX - 4.5, toY - 9);
		g.lineTo(centerX + 4.5, toY - 9);
		g.closePath();
		g.fill();
	}

	function drawMenuBar(width: number) {
		const { margin, barY, barH } = layout(width);
		g.fillStyle = COLORS.barFill;
		g.strokeStyle = COLORS.barBorder;
		g.lineWidth = 1;
		g.beginPath();
		g.roundRect(margin, barY, width - margin * 2, barH, 7);
		g.fill();
		g.stroke();

		g.fillStyle = COLORS.muted;
		g.font = `600 12px ${FONT_UI}`;
		g.fillText('系统菜单栏（示意）', margin + 12, barY + 20);

		if (!state.appRunning) {
			return;
		}
		// 托盘区：模板图标（黑色圆形，同 tray-icon-16-template.png）+ 标题
		const tray = trayRect(width);
		const iconX = tray.x + tray.w - 18;
		const hovered = state.hover === 'tray';
		g.fillStyle = COLORS.heading;
		g.font = `12px ${FONT_UI}`;
		g.fillText('托盘观察台', iconX - 72, tray.y + 20);
		g.beginPath();
		g.arc(iconX + 8, tray.y + 15, 6.5, 0, Math.PI * 2);
		g.fillStyle = COLORS.heading;
		g.fill();
		if (hovered) {
			g.strokeStyle = COLORS.accent;
			g.lineWidth = 1.5;
			g.beginPath();
			g.roundRect(tray.x, tray.y, tray.w, tray.h, 6);
			g.stroke();
		}
	}

	function drawMenuPanel(width: number) {
		if (!state.menuOpen || !state.appRunning) {
			return;
		}
		const menu = menuRect(width);
		roundBox(menu.x, menu.y, menu.w, menu.h, COLORS.panelBorder);
		const items = menuItemsOf(state);
		items.forEach((item, index) => {
			const box = itemRect(width, index);
			if (item.divider) {
				g.strokeStyle = '#dbe3f0';
				g.lineWidth = 1;
				g.beginPath();
				g.moveTo(box.x + 4, box.y + 4);
				g.lineTo(box.x + box.w - 4, box.y + 4);
				g.stroke();
				return;
			}
			const hovered = state.hover === `item:${item.id}`;
			if (hovered && item.enabled) {
				g.fillStyle = COLORS.accentSoft;
				g.beginPath();
				g.roundRect(box.x, box.y, box.w, box.h, 5);
				g.fill();
			}
			g.fillStyle = item.enabled ? COLORS.heading : COLORS.disabled;
			g.font = `12px ${FONT_UI}`;
			g.fillText(item.label, box.x + 26, box.y + 17);
			if (item.checkbox) {
				g.strokeStyle = item.enabled ? COLORS.accent : COLORS.disabled;
				g.lineWidth = 1.4;
				g.beginPath();
				g.roundRect(box.x + 5, box.y + 6, 13, 13, 3);
				g.stroke();
				if (item.checked) {
					g.fillStyle = item.enabled ? COLORS.accent : COLORS.disabled;
					g.beginPath();
					g.roundRect(box.x + 8, box.y + 9, 7, 7, 2);
					g.fill();
				}
			}
		});
	}

	function drawFlow(width: number, height: number) {
		const { boxX, boxWidth, barY, barH } = layout(width);
		const centerX = boxX + boxWidth / 2;
		const left = boxX;
		let y = barY + barH + 8;

		// 盒 1：原生回调 → 事件对象（载荷跟随最近一次点击）
		const payload = state.lastEvent
			? `id:1 action:${JSON.stringify(state.lastEvent.action)} data:${dataText(state.lastEvent.data)}`
			: '等待第一次点击';
		roundBox(left, y, boxWidth, 46, COLORS.panelBorder);
		g.fillStyle = COLORS.muted;
		g.font = `600 12px ${FONT_UI}`;
		g.fillText('原生回调 → ElectrobunEvent', left + 12, y + 19);
		g.fillStyle = state.lastEvent ? COLORS.heading : COLORS.disabled;
		g.font = `11px ${FONT_MONO}`;
		g.fillText(
			state.lastEvent ? `{ name: "tray-clicked", data: ${payload} }` : payload,
			left + 12,
			y + 36,
		);
		drawArrow(y + 46, y + 62, centerX);
		y += 62;

		// 盒 2：通道分发——全局通道先于托盘级通道
		const useGlobal = state.subscribe === 'global' || state.subscribe === 'both';
		const useTray = state.subscribe === 'tray-on' || state.subscribe === 'both';
		roundBox(left, y, boxWidth, 56, COLORS.panelBorder);
		g.fillStyle = COLORS.muted;
		g.font = `600 12px ${FONT_UI}`;
		g.fillText('通道分发（全局先于托盘级）', left + 12, y + 19);
		g.font = `11px ${FONT_MONO}`;
		g.fillStyle = useGlobal ? COLORS.ok : COLORS.skipped;
		g.fillText(
			`${useGlobal ? '→' : '×'} 全局 "tray-clicked"      Electrobun.events.on(...)`,
			left + 12,
			y + 36,
		);
		g.fillStyle = useTray ? COLORS.ok : COLORS.skipped;
		g.fillText(
			`${useTray ? '→' : '×'} 托盘级 "tray-clicked-1"  tray.on("tray-clicked", ...)`,
			left + 12,
			y + 50,
		);
		drawArrow(y + 56, y + 72, centerX);
		y += 72;

		// 盒 3：handler 分支——action 是否为空串
		const emptyAction = !state.lastEvent || state.lastEvent.action === '';
		roundBox(left, y, boxWidth, 56, COLORS.panelBorder);
		g.fillStyle = COLORS.muted;
		g.font = `600 12px ${FONT_UI}`;
		g.fillText('handler 分支（tray.on 的回调里）', left + 12, y + 19);
		g.font = `11px ${FONT_MONO}`;
		g.fillStyle = emptyAction ? COLORS.ok : COLORS.skipped;
		g.fillText(
			'action === ""  → 图标点击：setMenu(最新状态重建)',
			left + 12,
			y + 36,
		);
		g.fillStyle = !emptyAction ? COLORS.ok : COLORS.skipped;
		g.fillText(
			'action === "x" → 菜单项点击：改状态后重建',
			left + 12,
			y + 50,
		);

		// 退出后的整体遮罩提示
		if (!state.appRunning) {
			g.fillStyle = 'rgba(248, 250, 252, 0.72)';
			g.fillRect(0, 0, width, height);
			g.fillStyle = COLORS.quit;
			g.font = `600 14px ${FONT_UI}`;
			g.fillText(
				'app.quit() 已调用——应用退出，托盘随之消失；刷新页面重置演示',
				width / 2 - 170,
				height / 2,
			);
		}
	}

	function drawAppStatus(width: number) {
		if (!state.appRunning) {
			return;
		}
		const { panelX, panelWidth } = layout(width);
		const y = 250;
		if (!state.menuOpen) {
			const hovered = state.hover === 'window-box';
			roundBox(panelX, y, panelWidth, 58, hovered ? COLORS.accent : COLORS.panelBorder);
			g.fillStyle = COLORS.muted;
			g.font = `600 12px ${FONT_UI}`;
			g.fillText('应用状态（点击切换窗口）', panelX + 12, y + 20);
			g.font = `11px ${FONT_MONO}`;
			g.fillStyle = COLORS.heading;
			g.fillText(
				`窗口: ${state.windowOpen ? '已打开' : '已关闭（可重建）'}`,
				panelX + 12,
				y + 36,
			);
			g.fillText(`窗口重建: ${state.windowRebuilt} 次`, panelX + 12, y + 51);
		}
	}

	function draw() {
		const size = readCanvasSize(canvas);
		const width = Math.max(560, size.width);
		const height = Math.max(360, size.height);
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

		canvas.width = Math.round(width * pixelRatio);
		canvas.height = Math.round(height * pixelRatio);
		g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		g.clearRect(0, 0, width, height);

		g.fillStyle = COLORS.heading;
		g.font = `600 16px ${FONT_UI}`;
		g.fillText('托盘交互链路：点击托盘图标或菜单项', 24, 32);
		g.fillStyle = COLORS.muted;
		g.font = `12px ${FONT_UI}`;
		const hint = state.lastEvent
			? state.lastEvent.action === ''
				? '最近：图标点击（action 为空串）'
				: `最近：菜单项点击（action: ${state.lastEvent.action}）`
			: '先点击菜单栏最右的托盘项';
		g.fillText(hint, width - 24 - g.measureText(hint).width, 32);

		drawMenuBar(width);
		drawMenuPanel(width);
		drawAppStatus(width);
		drawFlow(width, height);

		emit({
			lastEvent: state.lastEvent
				? `action=${JSON.stringify(state.lastEvent.action)} data=${dataText(state.lastEvent.data)}`
				: '尚未点击',
			channels:
				state.subscribe === 'both'
					? '"tray-clicked" 与 "tray-clicked-1"'
					: state.subscribe === 'global'
						? '"tray-clicked"（全局）'
						: '"tray-clicked-1"（tray.on）',
			menuState: `自动更新=${state.autoUpdate ? '开' : '关'}，应用=${
				state.appRunning ? '运行中' : '已退出'
			}`,
			counters: `setMenu x${state.setMenuCount}，窗口重建 x${state.windowRebuilt}`,
		});
	}

	canvas.addEventListener('click', onClick);
	canvas.addEventListener('pointermove', onPointerMove);
	const resizeObserver = createResizeObserver(canvas, draw);

	return {
		update(args: TrayClickFlowArgs) {
			state.subscribe = args.subscribe;
			state.autoUpdate = args.autoUpdate;
			// 菜单形态由状态推导：真实托盘里等价于用新状态再调一次 setMenu
			draw();
		},
		dispose() {
			canvas.removeEventListener('click', onClick);
			canvas.removeEventListener('pointermove', onPointerMove);
			resizeObserver.disconnect();
		},
	};
}
