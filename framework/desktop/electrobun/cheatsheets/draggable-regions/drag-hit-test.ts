/**
 * 演示内容：拖拽区域的命中判定——把 1.18.1 包内 preload
 * （dist/api/bun/preload/dragRegions.ts 的 isAppRegionDrag）的判定逻辑同构地
 * 搬到浏览器：从按下目标沿祖先链（等价 Element.closest）先找 no-drag（一票否决），
 * 再找 drag 标记（class 或内联 style 属性文本），命中即让示意窗口跟随指针，
 * 模拟 startWindowMove / stopWindowMove 两次内部 RPC。
 * 输入：标记方式（class 标记 / 内联 app-region / 仅样式表声明）决定标题栏的属性，
 * 控件排除（不排除 / no-drag class / no-drag 内联）决定控件容器的属性。
 * 操作：按住示意窗口任意位置拖动；在 Controls 中切换标记方式与控件排除。
 * 预期结果：命中 drag 标记时小窗口跟随指针、readout 显示 startWindowMove →
 * stopWindowMove；「仅样式表声明」时标题栏拖不动（判定不读样式表规则）；
 * 按住被排除的控件按钮时窗口不动（no-drag 先判，一票否决）。
 * 阅读主线：verdictAt() 是唯一判定逻辑；pointer 事件只负责命中测试与窗口跟随。
 */
import {
	createResizeObserver,
	readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type DragMarking = 'class' | 'inline' | 'stylesheet';
export type DragExclude = 'none' | 'class' | 'inline';

export interface DragHitTestArgs {
	marking: DragMarking;
	exclude: DragExclude;
}

export interface DragHitTestSnapshot {
	/** 最近按下的元素与祖先链 */
	pressed: string;
	/** 判定结果 */
	verdict: string;
	/** 命中的选择器 */
	selector: string;
	/** 对应的内部 RPC */
	rpc: string;
}

export interface DragHitTestInstance {
	update(args: DragHitTestArgs): void;
	dispose(): void;
}

// 与 preload 一致的两个 class 名；style 路线靠属性文本包含判断
const DRAG_CLASS = 'electrobun-webkit-app-region-drag';
const NO_DRAG_CLASS = 'electrobun-webkit-app-region-no-drag';

const WINDOW_W = 300;
const WINDOW_H = 190;
const TITLEBAR_H = 36;

const COLORS = {
	heading: '#172033',
	muted: '#475569',
	windowBorder: '#94a3b8',
	windowFill: '#f8fafc',
	titlebarFill: '#e8edf5',
	dragTint: 'rgba(79, 124, 255, 0.12)',
	dragBorder: '#4f7cff',
	vetoTint: 'rgba(217, 119, 6, 0.12)',
	vetoBorder: '#b45309',
	plainBorder: '#cbd5e1',
	closeBtn: '#ff5f57',
	minBtn: '#febc2e',
	maxBtn: '#28c840',
	inspectorBg: '#f1f5f9',
};

interface SchemeNode {
	id: string;
	parent: string | null;
	/** readout 与祖先链里显示的元素名 */
	label: string;
	/** 相对示意窗口左上角的矩形 */
	rect: { x: number; y: number; w: number; h: number };
	classes: string[];
	styleAttr: string | null;
}

type VerdictKind = 'drag' | 'veto' | 'miss';

interface Verdict {
	kind: VerdictKind;
	/** 命中的选择器（drag / veto 时有值，miss 为「无」） */
	selector: string;
}

// 命中优先级：子节点在前（更深的先命中），与真实 DOM 事件目标一致
function buildNodes(args: DragHitTestArgs): SchemeNode[] {
	const titlebarClasses =
		args.marking === 'class' ? [DRAG_CLASS] : [] as string[];
	const titlebarStyle = args.marking === 'inline' ? 'app-region: drag' : null;
	const controlsClasses =
		args.exclude === 'class' ? [NO_DRAG_CLASS] : [] as string[];
	const controlsStyle =
		args.exclude === 'inline' ? 'app-region: no-drag' : null;

	const nodes: SchemeNode[] = [
		{
			id: 'titlebar',
			parent: null,
			label: '标题栏容器',
			rect: { x: 0, y: 0, w: WINDOW_W, h: TITLEBAR_H },
			classes: titlebarClasses,
			styleAttr: titlebarStyle,
		},
		{
			id: 'title-text',
			parent: 'titlebar',
			label: '标题文字',
			rect: { x: 12, y: 10, w: 120, h: 16 },
			classes: [],
			styleAttr: null,
		},
		{
			id: 'controls',
			parent: 'titlebar',
			label: '控件容器',
			rect: { x: 216, y: 12, w: 72, h: 12 },
			classes: controlsClasses,
			styleAttr: controlsStyle,
		},
		{
			id: 'btn-close',
			parent: 'controls',
			label: '关闭按钮',
			rect: { x: 216, y: 12, w: 12, h: 12 },
			classes: [],
			styleAttr: null,
		},
		{
			id: 'btn-min',
			parent: 'controls',
			label: '最小化按钮',
			rect: { x: 244, y: 12, w: 12, h: 12 },
			classes: [],
			styleAttr: null,
		},
		{
			id: 'btn-max',
			parent: 'controls',
			label: '最大化按钮',
			rect: { x: 272, y: 12, w: 12, h: 12 },
			classes: [],
			styleAttr: null,
		},
		{
			id: 'content',
			parent: null,
			label: '内容区',
			rect: { x: 0, y: TITLEBAR_H, w: WINDOW_W, h: WINDOW_H - TITLEBAR_H },
			classes: [],
			styleAttr: null,
		},
	];
	return nodes;
}

function nodeDepth(nodes: SchemeNode[], node: SchemeNode): number {
	let depth = 0;
	let current: SchemeNode | undefined = node;
	while (current?.parent) {
		depth += 1;
		current = nodes.find((n) => n.id === current?.parent);
	}
	return depth;
}

function ancestorChain(nodes: SchemeNode[], node: SchemeNode): SchemeNode[] {
	const chain: SchemeNode[] = [];
	let current: SchemeNode | undefined = node;
	while (current) {
		chain.push(current);
		current = nodes.find((n) => n.id === current?.parent);
	}
	return chain;
}

// 与 preload 的 isAppRegionDrag 同构的判定：no-drag 先判（一票否决）；
// drag 认 class 名或 style 属性文本里同时含 "app-region" 与 "drag"。
// 样式表规则不写入 class / style 属性，因此永远不参与判定。
function verdictAt(nodes: SchemeNode[], target: SchemeNode): Verdict {
	const byId = new Map(nodes.map((n) => [n.id, n]));
	const closest = (
		start: SchemeNode,
		pred: (node: SchemeNode) => boolean,
	): SchemeNode | null => {
		let current: SchemeNode | undefined = start;
		while (current) {
			if (pred(current)) {
				return current;
			}
			current = current.parent
				? byId.get(current.parent)
				: undefined;
		}
		return null;
	};

	const veto = closest(
		target,
		(n) =>
			n.classes.includes(NO_DRAG_CLASS) ||
			!!(n.styleAttr?.includes('app-region') && n.styleAttr.includes('no-drag')),
	);
	if (veto) {
		return {
			kind: 'veto',
			selector: veto.classes.includes(NO_DRAG_CLASS)
				? `.${NO_DRAG_CLASS}`
				: '[style*="app-region"]（no-drag）',
		};
	}

	const hit = closest(
		target,
		(n) =>
			n.classes.includes(DRAG_CLASS) ||
			!!(n.styleAttr?.includes('app-region') && n.styleAttr.includes('drag')),
	);
	if (hit) {
		return {
			kind: 'drag',
			selector: hit.classes.includes(DRAG_CLASS)
				? `.${DRAG_CLASS}`
				: '[style*="app-region"]（drag）',
		};
	}

	return { kind: 'miss', selector: '无' };
}

function hitTest(
	nodes: SchemeNode[],
	origin: { x: number; y: number },
	point: { x: number; y: number },
): SchemeNode | null {
	const ordered = [...nodes].sort(
		(a, b) => nodeDepth(nodes, b) - nodeDepth(nodes, a),
	);
	for (const node of ordered) {
		const { rect } = node;
		const x = origin.x + rect.x;
		const y = origin.y + rect.y;
		if (
			point.x >= x &&
			point.x <= x + rect.w &&
			point.y >= y &&
			point.y <= y + rect.h
		) {
			return node;
		}
	}
	return null;
}

export function createDragHitTest(
	canvas: HTMLCanvasElement,
	emit: (snapshot: DragHitTestSnapshot) => void,
): DragHitTestInstance {
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('当前浏览器不支持 Canvas 2D。');
	}
	const ctx: CanvasRenderingContext2D = context;

	let args: DragHitTestArgs = { marking: 'class', exclude: 'class' };
	let origin = { x: 48, y: 76 };
	let dragging = false;
	let grabOffset = { x: 0, y: 0 };
	let lastPress: { label: string; verdict: Verdict } | null = null;
	let lastRpc = '尚未按下';

	function emitSnapshot() {
		if (!lastPress) {
			emit({
				pressed: '尚未按下',
				verdict: '等待读者按住示意窗口任意位置',
				selector: '无',
				rpc: lastRpc,
			});
			return;
		}
		const { label, verdict } = lastPress;
		const verdictText =
			verdict.kind === 'drag'
				? '命中 drag 标记，可拖拽'
				: verdict.kind === 'veto'
					? '被 no-drag 否决，不可拖拽'
					: '未命中任何标记';
		emit({
			pressed: label,
			verdict: verdictText,
			selector: verdict.selector,
			rpc: lastRpc,
		});
	}

	function pointFromEvent(event: PointerEvent): { x: number; y: number } {
		const bounds = canvas.getBoundingClientRect();
		return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
	}

	function onPointerDown(event: PointerEvent) {
		event.preventDefault();
		const nodes = buildNodes(args);
		const target = hitTest(nodes, origin, pointFromEvent(event));
		if (!target) {
			return;
		}
		const chain = ancestorChain(nodes, target)
			.map((n) => n.label)
			.join(' → ');
		lastPress = { label: chain, verdict: verdictAt(nodes, target) };

		if (lastPress.verdict.kind === 'drag') {
			dragging = true;
			canvas.setPointerCapture(event.pointerId);
			const point = pointFromEvent(event);
			grabOffset = { x: point.x - origin.x, y: point.y - origin.y };
			lastRpc = 'startWindowMove（按住中）';
			canvas.style.cursor = 'grabbing';
		} else {
			lastRpc = '无（判定未通过）';
		}
		emitSnapshot();
		draw();
	}

	function onPointerMove(event: PointerEvent) {
		const nodes = buildNodes(args);
		const point = pointFromEvent(event);
		if (dragging) {
			const size = readCanvasSize(canvas);
			const maxX = Math.max(8, size.width - WINDOW_W - 8);
			const maxY = Math.max(76, size.height - WINDOW_H - 130);
			origin = {
				x: Math.min(Math.max(8, point.x - grabOffset.x), maxX),
				y: Math.min(Math.max(76, point.y - grabOffset.y), maxY),
			};
			draw();
			return;
		}
		// 未按住时用同一判定决定光标：可拖拽处 grab，其余 default
		const target = hitTest(nodes, origin, point);
		const verdict = target ? verdictAt(nodes, target) : null;
		canvas.style.cursor =
			verdict?.kind === 'drag' ? 'grab' : 'default';
	}

	function onPointerUp(event: PointerEvent) {
		if (!dragging) {
			return;
		}
		dragging = false;
		canvas.style.cursor = 'default';
		if (canvas.hasPointerCapture(event.pointerId)) {
			canvas.releasePointerCapture(event.pointerId);
		}
		lastRpc = 'startWindowMove → stopWindowMove';
		emitSnapshot();
		draw();
	}

	function inspectorLines(): string[] {
		const titlebarAttr =
			args.marking === 'class'
				? ` class="titlebar ${DRAG_CLASS}"`
				: ' class="titlebar"';
		const titlebarStyle =
			args.marking === 'inline' ? ' style="app-region: drag"' : '';
		const controlsAttr =
			args.exclude === 'class'
				? ` class="${NO_DRAG_CLASS}"`
				: ' class="controls"';
		const controlsStyle =
			args.exclude === 'inline' ? ' style="app-region: no-drag"' : '';
		const lines = [
			`<div${titlebarAttr}${titlebarStyle}>`,
			'  <span>标题</span>',
			`  <div${controlsAttr}${controlsStyle}>…按钮…</div>`,
			'</div>',
		];
		if (args.marking === 'stylesheet') {
			lines.push('', '/* 样式表：*/ .titlebar { app-region: drag }');
		}
		return lines;
	}

	function draw() {
		const size = readCanvasSize(canvas);
		const width = Math.max(480, size.width);
		const height = Math.max(440, size.height);
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

		canvas.width = Math.round(width * pixelRatio);
		canvas.height = Math.round(height * pixelRatio);
		ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		ctx.clearRect(0, 0, width, height);

		const nodes = buildNodes(args);
		const controls = nodes.find((n) => n.id === 'controls')!;

		ctx.fillStyle = COLORS.heading;
		ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText('命中判定示意：按住小窗口任意位置拖动', 16, 28);
		ctx.fillStyle = COLORS.muted;
		ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText(
			'命中 drag 标记才会「startWindowMove」；no-drag 先判、一票否决；判定只读 class 与 style 属性',
			16,
			48,
		);

		// ---- 示意窗口 ----
		const { x: wx, y: wy } = origin;

		// 窗口主体
		ctx.fillStyle = COLORS.windowFill;
		ctx.strokeStyle = COLORS.windowBorder;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(wx, wy, WINDOW_W, WINDOW_H, 10);
		ctx.fill();
		ctx.stroke();

		// 标题栏：按当前标记方式着色
		const titlebarMarked = args.marking !== 'stylesheet';
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(wx, wy, WINDOW_W, TITLEBAR_H, [10, 10, 0, 0]);
		ctx.clip();
		ctx.fillStyle = COLORS.titlebarFill;
		ctx.fillRect(wx, wy, WINDOW_W, TITLEBAR_H);
		if (titlebarMarked) {
			ctx.fillStyle = COLORS.dragTint;
			ctx.fillRect(wx, wy, WINDOW_W, TITLEBAR_H);
		}
		ctx.restore();
		ctx.strokeStyle = titlebarMarked
			? COLORS.dragBorder
			: COLORS.plainBorder;
		ctx.lineWidth = titlebarMarked ? 1.5 : 1;
		ctx.setLineDash(args.marking === 'stylesheet' ? [4, 3] : []);
		ctx.beginPath();
		ctx.roundRect(wx + 0.5, wy + 0.5, WINDOW_W - 1, TITLEBAR_H - 1, [10, 10, 0, 0]);
		ctx.stroke();
		ctx.setLineDash([]);

		// 标题文字（子元素——同样参与判定）
		ctx.fillStyle = COLORS.heading;
		ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText('按住这里拖动窗口', wx + 12, wy + 22);

		// 控件容器 + 三个按钮
		const excluded = args.exclude !== 'none';
		if (excluded) {
			ctx.fillStyle = COLORS.vetoTint;
			ctx.fillRect(wx + controls.rect.x - 6, wy + controls.rect.y - 6, controls.rect.w + 12, controls.rect.h + 12);
			ctx.strokeStyle = COLORS.vetoBorder;
			ctx.lineWidth = 1;
			ctx.setLineDash([3, 2]);
			ctx.strokeRect(wx + controls.rect.x - 6, wy + controls.rect.y - 6, controls.rect.w + 12, controls.rect.h + 12);
			ctx.setLineDash([]);
		}
		const buttons: Array<[string, string]> = [
			['btn-close', COLORS.closeBtn],
			['btn-min', COLORS.minBtn],
			['btn-max', COLORS.maxBtn],
		];
		for (const [id, color] of buttons) {
			const node = nodes.find((n) => n.id === id)!;
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(
				wx + node.rect.x + node.rect.w / 2,
				wy + node.rect.y + node.rect.h / 2,
				6,
				0,
				Math.PI * 2,
			);
			ctx.fill();
		}

		// 内容区
		ctx.fillStyle = COLORS.muted;
		ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText('页面内容区（无标记，永远拖不动）', wx + 14, wy + TITLEBAR_H + 30);

		// 拖拽中的状态徽标：对应 startWindowMove 生效期间（固定在右上角，不跟窗口走）
		if (dragging) {
			const badgeText = 'startWindowMove 已发送——窗口跟随指针';
			ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
			const metrics = ctx.measureText(badgeText);
			const bx = Math.max(16, width - metrics.width - 32);
			ctx.fillStyle = COLORS.dragBorder;
			ctx.beginPath();
			ctx.roundRect(bx, 14, metrics.width + 16, 22, 6);
			ctx.fill();
			ctx.fillStyle = '#ffffff';
			ctx.fillText(badgeText, bx + 8, 29);
		} else if (args.marking === 'stylesheet') {
			// 固定在提示行下方，避免与可拖动的窗口重叠
			ctx.fillStyle = COLORS.vetoBorder;
			ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText(
				'当前为「仅样式表声明」：标题栏没有 class / style 属性，样式表规则不进入判定',
				16,
				66,
			);
		}

		// ---- 底部 inspector：当前标记的等价 HTML ----
		const panelY = height - 118;
		ctx.fillStyle = COLORS.inspectorBg;
		ctx.strokeStyle = COLORS.plainBorder;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(16, panelY, width - 32, 102, 8);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = COLORS.muted;
		ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText('当前标记（等价 HTML）', 30, panelY + 20);
		ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
		ctx.fillStyle = COLORS.heading;
		inspectorLines().forEach((line, index) => {
			ctx.fillText(line, 30, panelY + 40 + index * 15);
		});
	}

	const pointerDown = (event: PointerEvent) => onPointerDown(event);
	const pointerMove = (event: PointerEvent) => onPointerMove(event);
	const pointerUp = (event: PointerEvent) => onPointerUp(event);

	canvas.style.touchAction = 'none';
	canvas.addEventListener('pointerdown', pointerDown);
	canvas.addEventListener('pointermove', pointerMove);
	canvas.addEventListener('pointerup', pointerUp);
	canvas.addEventListener('pointercancel', pointerUp);

	const resizeObserver = createResizeObserver(canvas, draw);
	draw();
	emitSnapshot();

	return {
		update(next: DragHitTestArgs) {
			args = { marking: next.marking, exclude: next.exclude };
			draw();
		},
		dispose() {
			canvas.removeEventListener('pointerdown', pointerDown);
			canvas.removeEventListener('pointermove', pointerMove);
			canvas.removeEventListener('pointerup', pointerUp);
			canvas.removeEventListener('pointercancel', pointerUp);
			resizeObserver.disconnect();
		},
	};
}
