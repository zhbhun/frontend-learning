/**
 * 演示内容：同一窗口里「主视图（窗口自动创建，autoResize: true）+ 一个附加子视图」的
 * frame 布局、y 坐标语义与层级关系。子视图 frame 相对窗口内容区左上角；原生按
 * adjustedY = 内容区高 - y - 高 翻转到 macOS 坐标；autoResize: true 时子视图铺满并
 * 盖住主视图（对应正文与常见问题的断言）。
 * 输入：窗口宽高、子视图 frame 四分量、子视图 autoResize 开关。
 * 操作：在 Controls 中修改子视图 x/y/宽/高，观察矩形移动与 adjustedY 反向变化；
 * 打开「子视图 autoResize」观察铺满遮挡；把子视图调出内容区观察被窗口裁剪。
 * 预期结果：主视图始终铺满第 1 层；autoResize: false 的子视图按 frame 固定在第 2 层
 * （置顶），超出内容区的部分不可见；autoResize: true 时 frame 输入被忽略，主视图被
 * 完全遮挡。
 * 阅读主线：resolveLayout() 是唯一的布局判定逻辑（对应原生 frame 应用规则），draw()
 * 只负责把结果画出来。
 */
import {
	createResizeObserver,
	readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ViewFrameLayoutOptions {
	windowWidth: number;
	windowHeight: number;
	childX: number;
	childY: number;
	childWidth: number;
	childHeight: number;
	childAutoResize: boolean;
}

export interface ViewFrameLayoutSnapshot {
	mainFrame: string;
	childFrame: string;
	adjustedY: string;
	childLayer: string;
	coverPercent: string;
}

export interface ViewFrameLayoutInstance {
	update(options: ViewFrameLayoutOptions): void;
	dispose(): void;
}

interface LayoutResult {
	contentWidth: number;
	contentHeight: number;
	childFrame: { x: number; y: number; width: number; height: number };
	childFills: boolean;
	adjustedY: number | null;
	coverPercent: number;
}

const COLORS = {
	heading: '#172033',
	muted: '#475569',
	windowBorder: '#172033',
	titleBar: '#e2e8f0',
	mainFill: '#f1f5f9',
	mainBorder: '#94a3b8',
	child: '#4f7cff',
	childGhost: '#d64545',
};

const TITLE_BAR = 28;

// 复刻原生 frame 应用规则：autoResize: true 铺满内容区并忽略 frame；
// false 时按输入 frame 放置，y 需翻转为 macOS 坐标（adjustedY）。
function resolveLayout(options: ViewFrameLayoutOptions): LayoutResult {
	const contentWidth = options.windowWidth;
	const contentHeight = options.windowHeight;

	let childFrame = {
		x: options.childX,
		y: options.childY,
		width: options.childWidth,
		height: options.childHeight,
	};
	const childFills = options.childAutoResize;
	if (childFills) {
		childFrame = { x: 0, y: 0, width: contentWidth, height: contentHeight };
	}

	const adjustedY = childFills
		? null
		: contentHeight - options.childY - options.childHeight;

	// 遮挡比例：子视图与内容区交集面积 / 内容区面积
	const overlapWidth = Math.max(
		0,
		Math.min(childFrame.x + childFrame.width, contentWidth) -
			Math.max(childFrame.x, 0),
	);
	const overlapHeight = Math.max(
		0,
		Math.min(childFrame.y + childFrame.height, contentHeight) -
			Math.max(childFrame.y, 0),
	);
	const coverPercent = Math.round(
		((overlapWidth * overlapHeight) / (contentWidth * contentHeight)) * 100,
	);

	return {
		contentWidth,
		contentHeight,
		childFrame,
		childFills,
		adjustedY,
		coverPercent,
	};
}

export function createViewFrameLayout(
	canvas: HTMLCanvasElement,
	emit: (snapshot: ViewFrameLayoutSnapshot) => void,
): ViewFrameLayoutInstance {
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('当前浏览器不支持 Canvas 2D。');
	}
	const drawingContext: CanvasRenderingContext2D = context;

	let current: ViewFrameLayoutOptions = {
		windowWidth: 960,
		windowHeight: 600,
		childX: 0,
		childY: 0,
		childWidth: 280,
		childHeight: 600,
		childAutoResize: false,
	};

	function draw() {
		const size = readCanvasSize(canvas);
		const width = Math.max(320, size.width);
		const height = Math.max(300, size.height);
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

		canvas.width = Math.round(width * pixelRatio);
		canvas.height = Math.round(height * pixelRatio);
		drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		drawingContext.clearRect(0, 0, width, height);

		const layout = resolveLayout(current);

		drawingContext.fillStyle = COLORS.heading;
		drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
		drawingContext.fillText('窗口内的视图布局与层级（俯视示意）', 24, 36);

		// 可用绘制区：标题下方、底部信息行上方
		const areaX = 24;
		const areaY = 56;
		const areaW = width - 48;
		const areaH = height - 56 - 104;
		const scale = Math.min(
			areaW / layout.contentWidth,
			areaH / (layout.contentHeight + TITLE_BAR),
			1,
		);
		const winW = layout.contentWidth * scale;
		const winH = (layout.contentHeight + TITLE_BAR) * scale;
		const winX = areaX + (areaW - winW) / 2;
		const winY = areaY + (areaH - winH) / 2;
		const contentY = winY + TITLE_BAR * scale;

		// 窗口外框 + 标题栏
		drawingContext.fillStyle = '#ffffff';
		drawingContext.strokeStyle = COLORS.windowBorder;
		drawingContext.lineWidth = 1.5;
		drawingContext.beginPath();
		drawingContext.roundRect(winX, winY, winW, winH, 6);
		drawingContext.fill();
		drawingContext.stroke();

		drawingContext.fillStyle = COLORS.titleBar;
		drawingContext.beginPath();
		drawingContext.roundRect(winX + 1, winY + 1, winW - 2, TITLE_BAR * scale - 4, 5);
		drawingContext.fill();
		drawingContext.fillStyle = COLORS.muted;
		drawingContext.font = '10px ui-sans-serif, system-ui, sans-serif';
		drawingContext.fillText('BrowserWindow', winX + 46, winY + TITLE_BAR * scale - 10);
		for (let dot = 0; dot < 3; dot += 1) {
			drawingContext.beginPath();
			drawingContext.arc(winX + 14 + dot * 12, winY + TITLE_BAR * scale / 2 - 2, 3, 0, Math.PI * 2);
			drawingContext.fillStyle = ['#d64545', '#e2b93b', '#4cae4f'][dot];
			drawingContext.fill();
		}

		// 内容区 = 主视图（autoResize: true，铺满并跟随窗口）
		const contentW = layout.contentWidth * scale;
		const contentH = layout.contentHeight * scale;
		drawingContext.fillStyle = COLORS.mainFill;
		drawingContext.strokeStyle = COLORS.mainBorder;
		drawingContext.lineWidth = 1;
		drawingContext.fillRect(winX, contentY, contentW, contentH);
		drawingContext.strokeRect(winX, contentY, contentW, contentH);
		drawingContext.fillStyle = COLORS.muted;
		drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
		if (layout.coverPercent >= 100) {
			drawingContext.fillStyle = COLORS.childGhost;
			drawingContext.fillText(
				'主视图 win.webview · 第 1 层（被完全遮挡）',
				winX + 10,
				contentY + contentH - 12,
			);
		} else {
			drawingContext.fillText(
				'主视图 win.webview · 第 1 层 · autoResize: true（铺满）',
				winX + 10,
				contentY + contentH - 12,
			);
		}

		// 子视图：先画完整 frame 的虚线轮廓（超出内容区的部分会被窗口裁剪）
		const child = layout.childFrame;
		const childX = winX + child.x * scale;
		const childYPos = contentY + child.y * scale;
		const childW = child.width * scale;
		const childH = child.height * scale;
		const outsideWindow =
			child.x < 0 ||
			child.y < 0 ||
			child.x + child.width > layout.contentWidth ||
			child.y + child.height > layout.contentHeight;

		if (outsideWindow && !layout.childFills) {
			drawingContext.strokeStyle = COLORS.childGhost;
			drawingContext.setLineDash([5, 4]);
			drawingContext.lineWidth = 1.2;
			drawingContext.strokeRect(childX, childYPos, childW, childH);
			drawingContext.setLineDash([]);
		}

		// 实际可见部分：裁剪到内容区
		drawingContext.save();
		drawingContext.beginPath();
		drawingContext.rect(winX, contentY, contentW, contentH);
		drawingContext.clip();
		drawingContext.fillStyle = 'rgba(79, 124, 255, 0.30)';
		drawingContext.fillRect(childX, childYPos, childW, childH);
		drawingContext.strokeStyle = COLORS.child;
		drawingContext.lineWidth = 1.5;
		drawingContext.strokeRect(childX, childYPos, childW, childH);
		drawingContext.restore();

		// 子视图标注（放不下时移到框外右上）
		const labelLines = [
			`子视图 · 第 2 层${layout.childFills ? ' · 铺满盖住主视图' : ' · 置顶'}`,
			`autoResize: ${layout.childFills ? 'true（frame 被忽略）' : 'false'}`,
		];
		drawingContext.fillStyle = COLORS.child;
		drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
		drawingContext.fillText(labelLines[0], childX + 8, childYPos + 18);
		drawingContext.fillStyle = COLORS.heading;
		drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
		drawingContext.fillText(labelLines[1], childX + 8, childYPos + 34);

		// 内容区原点标注：frame 的 x/y 从内容区左上角起算，y 向下
		drawingContext.strokeStyle = COLORS.muted;
		drawingContext.fillStyle = COLORS.muted;
		drawingContext.lineWidth = 1;
		drawingContext.beginPath();
		drawingContext.moveTo(winX, contentY);
		drawingContext.lineTo(winX + 40, contentY);
		drawingContext.stroke();
		drawingContext.beginPath();
		drawingContext.moveTo(winX, contentY);
		drawingContext.lineTo(winX, contentY + 40);
		drawingContext.stroke();
		drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
		drawingContext.fillText('x →', winX + 44, contentY + 4);
		drawingContext.fillText('y ↓', winX + 4, contentY + 54);

		// 底部信息：frame 数值、原生翻转计算、层级与遮挡
		const infoY = winY + winH + 24;
		drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
		drawingContext.fillStyle = COLORS.muted;
		drawingContext.fillText(
			`主视图 frame: 0, 0, ${layout.contentWidth}, ${layout.contentHeight}（铺满，frame 输入被忽略）`,
			24,
			infoY,
		);
		drawingContext.fillStyle = layout.childFills ? COLORS.childGhost : COLORS.heading;
		drawingContext.fillText(
			layout.childFills
				? `子视图 autoResize: true → 铺满 ${layout.contentWidth}×${layout.contentHeight}，主视图被完全遮挡`
				: `子视图 frame: ${child.x}, ${child.y}, ${child.width}, ${child.height} · adjustedY = ${layout.contentHeight} - ${child.y} - ${child.height} = ${layout.adjustedY}`,
			24,
			infoY + 20,
		);
		drawingContext.fillStyle = COLORS.muted;
		drawingContext.fillText(
			`层级: 主视图(第1层) < 子视图(第2层·置顶) · 遮挡主视图 ${layout.coverPercent}%${
				outsideWindow && !layout.childFills ? ' · 超出内容区的部分被窗口裁剪' : ''
			}`,
			24,
			infoY + 40,
		);

		emit({
			mainFrame: `0, 0, ${layout.contentWidth}, ${layout.contentHeight}`,
			childFrame: layout.childFills
				? `0, 0, ${layout.contentWidth}, ${layout.contentHeight}（忽略输入 frame）`
				: `${child.x}, ${child.y}, ${child.width}, ${child.height}`,
			adjustedY: layout.adjustedY === null ? '—' : String(layout.adjustedY),
			childLayer: layout.childFills ? '第 2 层 · 铺满盖住主视图' : '第 2 层 · 置顶',
			coverPercent: `${layout.coverPercent}%`,
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
