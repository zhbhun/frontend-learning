/**
 * 演示内容：通知与对话框的视图侧联动——视图按钮经 RPC 请主进程代发：
 * 删除草稿走 rpc.request.confirmDelete（等响应）→ 主进程 await
 * showMessageBox 模态等待（同步 FFI，主进程 JS 停在这一行）→ resolve
 * { response: 索引 } 回视图生效；模拟下载完成走 rpc.send.notifyFinished（不等结果）
 * → showNotification 弹系统横幅，无返回、无回程。
 * 输入：画布内点击——草稿行的「删除」按钮、「模拟下载完成」按钮、模拟对话框的
 * 「删除 / 取消」按钮与遮罩（遮罩等同 Esc / 关闭对话框，走 cancelId 索引）。
 * 操作：点「删除」后分别点对话框按钮与遮罩，对比 response 的来源；对话框未关时
 * 再点窗口按钮，观察模态把视图与主进程一起「停」住；点「模拟下载完成」看通知
 * 横幅弹出且 readout 显示无回程。
 * 预期结果：对话框按钮点击 resolve 对应索引；遮罩关闭 resolve cancelId 指向的
 * 索引（与点「取消」相同）；草稿随 response === 0 移除；通知横幅约 3 秒收起，
 * 页面只有状态行变化，readout 全程「无返回」。
 * 阅读主线：openConfirm() 是主进程 handler 的同构（buttons / defaultId / cancelId
 * 在这里一次配好）；resolveResponse() 是索引回视图的唯一出口。
 */
import {
	createResizeObserver,
	readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface NotificationsDialogsFlowArgs {}

export interface NotificationsDialogsFlowSnapshot {
	/** 视图侧发起的调用（request / send） */
	viewCall: string;
	/** 主进程侧的 API 调用 */
	bunCall: string;
	/** 模态等待 / 系统横幅一侧的状态 */
	systemSide: string;
	/** 回到视图的结果 */
	viewBack: string;
	/** 页面侧的生效结果 */
	effect: string;
}

export interface NotificationsDialogsFlowInstance {
	dispose(): void;
}

const WIN = { x: 28, y: 72, w: 306, h: 344 };
const WIN_HEADER_H = 34;

const DOWNLOAD_BTN = { x: WIN.x + 16, y: WIN.y + 54, w: WIN.w - 32, h: 30 };
const STATUS_Y = DOWNLOAD_BTN.y + DOWNLOAD_BTN.h + 22;
const DRAFTS_LABEL_Y = STATUS_Y + 38;
const DRAFT_ROW = { x: WIN.x + 16, y: DRAFTS_LABEL_Y + 12, w: WIN.w - 32, h: 32 };
const DRAFT_ROW_GAP = 6;
const DELETE_BTN = { w: 56, h: 24 };

const BUN_PANEL = { x: 356, y: 72, w: 176, h: 132 };

const SYS_LABEL_Y = 250;
const BANNER = { x: 356, y: 262, w: 176, h: 88 };
const BANNER_MS = 3200;

const DIALOG = { w: 252, h: 196 };
const DIALOG_BTN = { w: 64, h: 26, gap: 8 };

// 与正文算例一致的按钮设计：删除在 0，安全项「取消」同时是 defaultId 与 cancelId
const DIALOG_BUTTONS = ['删除', '取消'];
const DEFAULT_ID = 1;
const CANCEL_ID = 1;

const INITIAL_DRAFTS = ['接口草稿', '发布说明', '性能笔记'];

const COLORS = {
	heading: '#172033',
	muted: '#475569',
	windowBorder: '#94a3b8',
	windowFill: '#f8fafc',
	windowHeader: '#e8edf5',
	accent: '#4f7cff',
	accentSoft: 'rgba(79, 124, 255, 0.12)',
	hover: 'rgba(79, 124, 255, 0.10)',
	divider: '#e2e8f0',
	panelBorder: '#94a3b8',
	panelFill: '#f1f5f9',
	dialogBorder: '#94a3b8',
	dialogFill: '#ffffff',
	buttonBorder: '#c4ccd8',
	scrim: 'rgba(15, 23, 42, 0.35)',
	closeBtn: '#ff5f57',
	minBtn: '#febc2e',
	maxBtn: '#28c840',
	danger: '#b91c1c',
	bannerBorder: '#94a3b8',
	bannerFill: '#ffffff',
};

interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

function inRect(
	point: { x: number; y: number },
	rect: Rect,
): boolean {
	return (
		point.x >= rect.x &&
		point.x <= rect.x + rect.w &&
		point.y >= rect.y &&
		point.y <= rect.y + rect.h
	);
}

function draftRowRect(index: number): Rect {
	return {
		x: DRAFT_ROW.x,
		y: DRAFT_ROW.y + index * (DRAFT_ROW.h + DRAFT_ROW_GAP),
		w: DRAFT_ROW.w,
		h: DRAFT_ROW.h,
	};
}

function deleteBtnRect(index: number): Rect {
	const row = draftRowRect(index);
	return {
		x: row.x + row.w - DELETE_BTN.w - 8,
		y: row.y + (row.h - DELETE_BTN.h) / 2,
		w: DELETE_BTN.w,
		h: DELETE_BTN.h,
	};
}

function dialogRect(): Rect {
	return {
		x: WIN.x + (WIN.w - DIALOG.w) / 2,
		y: 160,
		w: DIALOG.w,
		h: DIALOG.h,
	};
}

function dialogBtnRect(index: number): Rect {
	const d = dialogRect();
	const total = DIALOG_BUTTONS.length * DIALOG_BTN.w +
		(DIALOG_BUTTONS.length - 1) * DIALOG_BTN.gap;
	return {
		x: d.x + d.w - total - 14 + index * (DIALOG_BTN.w + DIALOG_BTN.gap),
		y: d.y + d.h - DIALOG_BTN.h - 12,
		w: DIALOG_BTN.w,
		h: DIALOG_BTN.h,
	};
}

export function createNotificationsDialogsFlow(
	canvas: HTMLCanvasElement,
	emit: (snapshot: NotificationsDialogsFlowSnapshot) => void,
): NotificationsDialogsFlowInstance {
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('当前浏览器不支持 Canvas 2D。');
	}
	const ctx: CanvasRenderingContext2D = context;

	let drafts = [...INITIAL_DRAFTS];
	let status = '空闲';
	// 模拟模态对话框：target 指向待删除的草稿索引
	let dialog: { target: number } | null = null;
	// 模拟系统通知横幅
	let banner = false;
	let bannerTimer: ReturnType<typeof setTimeout> | null = null;
	// 悬停高亮：对话框按钮 / 删除按钮 / 下载按钮
	let hover: { kind: string; index: number } | null = null;

	let snapshot: NotificationsDialogsFlowSnapshot = {
		viewCall: '点草稿行的「删除」或「模拟下载完成」开始',
		bunCall: '—',
		systemSide: '—',
		viewBack: '—',
		effect: '—',
	};

	function emitSnapshot() {
		emit({ ...snapshot });
	}

	function pointFromEvent(event: MouseEvent): { x: number; y: number } {
		const bounds = canvas.getBoundingClientRect();
		return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
	}

	function openConfirm(target: number) {
		dialog = { target };
		snapshot = {
			viewCall: `rpc.request.confirmDelete({ target: 'draft-${target}' })`,
			bunCall:
				"await Utils.showMessageBox({ type: 'question', buttons: ['删除','取消'], defaultId: 1, cancelId: 1 })",
			systemSide: '模态打开：同步 FFI，主进程 JS 停在 await 行',
			viewBack: '（等待用户点击…）',
			effect: '—',
		};
	}

	// 索引回视图的唯一出口：按钮点击与 Esc / 关闭都在这里汇合
	function resolveResponse(response: number, via: string) {
		// 先取 target 再关闭对话框
		const target = dialog?.target ?? -1;
		const label = drafts[target] ?? '';
		dialog = null;
		if (response === 0) {
			drafts = drafts.filter((_, i) => i !== target);
			snapshot = {
				...snapshot,
				systemSide: `${via} → resolve { response: 0 }`,
				viewBack: 'rpc.request 返回 { response: 0 } → 删除',
				effect: `草稿「${label}」已从页面移除`,
			};
		} else {
			snapshot = {
				...snapshot,
				systemSide: `${via} → resolve { response: 1 }`,
				viewBack: 'rpc.request 返回 { response: 1 } → 不动',
				effect: '草稿保留（安全分支）',
			};
		}
	}

	function fireNotify() {
		banner = true;
		status = `下载完成 · ${new Date().toLocaleTimeString()}`;
		if (bannerTimer) {
			clearTimeout(bannerTimer);
		}
		bannerTimer = setTimeout(() => {
			banner = false;
			bannerTimer = null;
			draw();
		}, BANNER_MS);
		snapshot = {
			viewCall: "rpc.send.notifyFinished({ file: 'electrobun.dmg' })",
			bunCall:
				"Utils.showNotification({ title: '下载完成', subtitle: '安装包', body: 'electrobun.dmg 已就绪' })",
			systemSide: '系统横幅弹出（约 3 秒收起；点击横幅无回程）',
			viewBack: '无返回——send 不等结果',
			effect: '页面状态行更新「下载完成」；通知本身在系统层展示',
		};
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0) {
			return;
		}
		event.preventDefault();
		const point = pointFromEvent(event);

		// 模态打开时：只响应对话框按钮；其余点击等同 Esc / 关闭（cancelId 路径）
		if (dialog) {
			for (let i = 0; i < DIALOG_BUTTONS.length; i += 1) {
				if (inRect(point, dialogBtnRect(i))) {
					resolveResponse(
						i,
						`点击「${DIALOG_BUTTONS[i]}」`,
					);
					emitSnapshot();
					draw();
					return;
				}
			}
			resolveResponse(CANCEL_ID, 'Esc / 关闭对话框（cancelId）');
			emitSnapshot();
			draw();
			return;
		}

		if (inRect(point, DOWNLOAD_BTN)) {
			fireNotify();
			emitSnapshot();
			draw();
			return;
		}
		for (let i = 0; i < drafts.length; i += 1) {
			if (inRect(point, deleteBtnRect(i))) {
				openConfirm(i);
				emitSnapshot();
				draw();
				return;
			}
		}
	}

	function onPointerMove(event: PointerEvent) {
		const point = pointFromEvent(event);
		let next: { kind: string; index: number } | null = null;
		if (dialog) {
			for (let i = 0; i < DIALOG_BUTTONS.length; i += 1) {
				if (inRect(point, dialogBtnRect(i))) {
					next = { kind: 'dialog-btn', index: i };
					break;
				}
			}
		} else {
			if (inRect(point, DOWNLOAD_BTN)) {
				next = { kind: 'download', index: -1 };
			}
			for (let i = 0; !next && i < drafts.length; i += 1) {
				if (inRect(point, deleteBtnRect(i))) {
					next = { kind: 'delete-btn', index: i };
					break;
				}
			}
		}
		const changed = JSON.stringify(next) !== JSON.stringify(hover);
		hover = next;
		canvas.style.cursor = next ? 'pointer' : 'default';
		if (changed) {
			draw();
		}
	}

	function drawButton(
		rect: Rect,
		label: string,
		focused: boolean,
		hovered: boolean,
		danger: boolean,
	) {
		if (focused) {
			ctx.fillStyle = COLORS.accentSoft;
			ctx.strokeStyle = COLORS.accent;
			ctx.lineWidth = 2;
		} else {
			ctx.fillStyle = hovered ? COLORS.hover : COLORS.dialogFill;
			ctx.strokeStyle = COLORS.buttonBorder;
			ctx.lineWidth = 1;
		}
		ctx.beginPath();
		ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 6);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = danger ? COLORS.danger : COLORS.heading;
		ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
		const metrics = ctx.measureText(label);
		ctx.fillText(
			label,
			rect.x + (rect.w - metrics.width) / 2,
			rect.y + rect.h / 2 + 4,
		);
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
		ctx.fillText('通知与对话框联动示意', 16, 28);
		ctx.fillStyle = COLORS.muted;
		ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText(
			'点「删除」弹模拟对话框（默认聚焦「取消」）；点「模拟下载完成」弹系统通知横幅',
			16,
			48,
		);

		// ---- 示意应用窗口（webview）----
		ctx.fillStyle = COLORS.windowFill;
		ctx.strokeStyle = COLORS.windowBorder;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(WIN.x, WIN.y, WIN.w, WIN.h, 10);
		ctx.fill();
		ctx.stroke();
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(WIN.x, WIN.y, WIN.w, WIN_HEADER_H, [10, 10, 0, 0]);
		ctx.clip();
		ctx.fillStyle = COLORS.windowHeader;
		ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN_HEADER_H);
		ctx.restore();
		const dots: Array<[string, number]> = [
			[COLORS.closeBtn, 0],
			[COLORS.minBtn, 1],
			[COLORS.maxBtn, 2],
		];
		for (const [color, offset] of dots) {
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(
				WIN.x + 18 + offset * 18,
				WIN.y + WIN_HEADER_H / 2,
				5,
				0,
				Math.PI * 2,
			);
			ctx.fill();
		}
		ctx.fillStyle = COLORS.muted;
		ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText('下载器（示意 webview 窗口）', WIN.x + 84, WIN.y + 22);

		drawButton(
			DOWNLOAD_BTN,
			'模拟下载完成（rpc.send）',
			false,
			hover?.kind === 'download',
			false,
		);
		ctx.fillStyle = COLORS.muted;
		ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText(`状态：${status}`, DOWNLOAD_BTN.x + 2, STATUS_Y);
		ctx.strokeStyle = COLORS.divider;
		ctx.beginPath();
		ctx.moveTo(WIN.x + 16, STATUS_Y + 12);
		ctx.lineTo(WIN.x + WIN.w - 16, STATUS_Y + 12);
		ctx.stroke();
		ctx.fillStyle = COLORS.muted;
		ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText('草稿', WIN.x + 18, DRAFTS_LABEL_Y);
		if (drafts.length === 0) {
			ctx.fillStyle = COLORS.muted;
			ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText('（草稿已清空）', WIN.x + 28, DRAFT_ROW.y + 20);
		}
		drafts.forEach((label, index) => {
			const row = draftRowRect(index);
			ctx.fillStyle = COLORS.panelFill;
			ctx.strokeStyle = COLORS.divider;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(row.x, row.y, row.w, row.h, 6);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = COLORS.heading;
			ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText(label, row.x + 12, row.y + 20);
			ctx.fillStyle = COLORS.muted;
			ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
			const tag = `draft-${index}`;
			ctx.fillText(
				tag,
				row.x + row.w - DELETE_BTN.w - 16 - ctx.measureText(tag).width,
				row.y + 20,
			);
			drawButton(
				deleteBtnRect(index),
				'删除',
				false,
				hover?.kind === 'delete-btn' && hover.index === index,
				true,
			);
		});

		// ---- bun 主进程面板：模态等待状态在这里可见 ----
		ctx.fillStyle = COLORS.panelFill;
		ctx.strokeStyle = COLORS.panelBorder;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(BUN_PANEL.x, BUN_PANEL.y, BUN_PANEL.w, BUN_PANEL.h, 10);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = COLORS.heading;
		ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText('bun 主进程（示意）', BUN_PANEL.x + 12, BUN_PANEL.y + 24);
		ctx.fillStyle = dialog ? COLORS.danger : COLORS.muted;
		ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
		if (dialog) {
			ctx.fillText('await showMessageBox…', BUN_PANEL.x + 12, BUN_PANEL.y + 52);
			ctx.fillText('主进程 JS 停在这一行', BUN_PANEL.x + 12, BUN_PANEL.y + 72);
			ctx.fillText('（同步 FFI，定时器 / RPC 都暂停）', BUN_PANEL.x + 12, BUN_PANEL.y + 92);
		} else if (banner) {
			ctx.fillText('showNotification 已返回（void）', BUN_PANEL.x + 12, BUN_PANEL.y + 52);
			ctx.fillText('发完即忘，不等任何结果', BUN_PANEL.x + 12, BUN_PANEL.y + 72);
		} else {
			ctx.fillText('空闲——等待视图的 RPC 调用', BUN_PANEL.x + 12, BUN_PANEL.y + 52);
		}

		// ---- 系统通知横幅 ----
		ctx.fillStyle = COLORS.muted;
		ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText('系统通知区（示意）', BANNER.x + 12, SYS_LABEL_Y);
		if (banner) {
			ctx.save();
			ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
			ctx.shadowBlur = 14;
			ctx.shadowOffsetY = 4;
			ctx.fillStyle = COLORS.bannerFill;
			ctx.beginPath();
			ctx.roundRect(BANNER.x, BANNER.y, BANNER.w, BANNER.h, 10);
			ctx.fill();
			ctx.restore();
			ctx.strokeStyle = COLORS.bannerBorder;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(BANNER.x, BANNER.y, BANNER.w, BANNER.h, 10);
			ctx.stroke();
			ctx.fillStyle = COLORS.muted;
			ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText('Electrobun 下载器 · 现在', BANNER.x + 12, BANNER.y + 18);
			ctx.fillStyle = COLORS.heading;
			ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText('下载完成', BANNER.x + 12, BANNER.y + 38);
			ctx.fillStyle = COLORS.muted;
			ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText('安装包（subtitle）', BANNER.x + 12, BANNER.y + 56);
			ctx.fillStyle = COLORS.heading;
			ctx.fillText('electrobun.dmg 已就绪', BANNER.x + 12, BANNER.y + 74);
		}

		// ---- 模拟模态对话框（最后画，盖在窗口上）----
		if (dialog) {
			ctx.fillStyle = COLORS.scrim;
			ctx.beginPath();
			ctx.roundRect(WIN.x, WIN.y, WIN.w, WIN.h, 10);
			ctx.fill();

			const d = dialogRect();
			ctx.save();
			ctx.shadowColor = 'rgba(15, 23, 42, 0.3)';
			ctx.shadowBlur = 18;
			ctx.shadowOffsetY = 6;
			ctx.fillStyle = COLORS.dialogFill;
			ctx.beginPath();
			ctx.roundRect(d.x, d.y, d.w, d.h, 10);
			ctx.fill();
			ctx.restore();
			ctx.strokeStyle = COLORS.dialogBorder;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(d.x, d.y, d.w, d.h, 10);
			ctx.stroke();

			// type: "question" 图标
			ctx.fillStyle = COLORS.accent;
			ctx.beginPath();
			ctx.arc(d.x + 26, d.y + 30, 11, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = '#ffffff';
			ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText('?', d.x + 22, d.y + 35);

			ctx.fillStyle = COLORS.heading;
			ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText('确认删除（title）', d.x + 46, d.y + 35);
			ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText('删除这份草稿吗？（message）', d.x + 20, d.y + 72);
			ctx.fillStyle = COLORS.muted;
			ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText('删除后不可恢复。（detail）', d.x + 20, d.y + 92);

			DIALOG_BUTTONS.forEach((label, index) => {
				drawButton(
					dialogBtnRect(index),
					label,
					index === DEFAULT_ID,
					hover?.kind === 'dialog-btn' && hover.index === index,
					index === 0,
				);
			});
			ctx.fillStyle = COLORS.muted;
			ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText(
				'defaultId: 1 聚焦「取消」；点遮罩 = Esc / 关闭 → cancelId: 1',
				d.x + 20,
				d.y + 130,
			);
		}
	}

	const pointerDown = (event: PointerEvent) => onPointerDown(event);
	const pointerMove = (event: PointerEvent) => onPointerMove(event);

	canvas.style.touchAction = 'none';
	canvas.addEventListener('pointerdown', pointerDown);
	canvas.addEventListener('pointermove', pointerMove);

	const resizeObserver = createResizeObserver(canvas, draw);
	draw();
	emitSnapshot();

	return {
		dispose() {
			canvas.removeEventListener('pointerdown', pointerDown);
			canvas.removeEventListener('pointermove', pointerMove);
			if (bannerTimer) {
				clearTimeout(bannerTimer);
			}
			resizeObserver.disconnect();
		},
	};
}
