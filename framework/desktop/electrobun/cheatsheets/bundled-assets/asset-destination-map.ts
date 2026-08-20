/**
 * 演示内容：electrobun.config.ts 里一条 build.copy 映射，把源文件放进应用包的
 * 哪个位置、得到什么访问地址——目标路径以 views/ 开头时，包内落点在
 * Resources/app/views/ 下，自动获得 views:// 地址（视图层与主进程都能访问）；
 * 目标不在 views/ 下时文件同样进包，但没有视图层地址，只剩主进程经文件系统
 * 读取。判定链对照 1.18.1 包内 CLI 源码（src/cli/index.ts）：copy 目标 join 到
 * Resources/app 后用 cpSync(recursive) 原样复制；views:// 根是
 * Resources/app/views（dist/api/bun/core/Paths.ts 的 VIEWS_FOLDER）。这是
 * 浏览器里的映射示意，真实装配结果以构建输出目录为准。
 * 输入：映射源、映射目标、源是目录（Controls 提供）。
 * 操作：把「映射目标」改出 views/ 前缀再改回来，观察地址与可达性的变化；
 * 开关「源是目录」，观察复制形态与 --watch 监听目录的推导（目录取自身，
 * 文件取所在目录）。
 * 预期结果：目标 views/mainview/assets → 落点 Resources/app/views/mainview/assets，
 * 地址 views://mainview/assets/，视图层可加载；目标 assets/data.json → 落点
 * Resources/app/assets/data.json，无 views:// 地址，仅主进程可达；两种情况下
 * 监听目录都随源的形态变化。
 * 阅读主线：normalize() 规整路径，resolveDestination() 从目标推导落点与地址，
 * rowsOf() 生成目录树行，draw() 把状态画出来。
 */
import {
	createResizeObserver,
	readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface AssetDestinationArgs {
	source: string;
	destination: string;
	sourceIsDir: boolean;
}

export interface AssetDestinationSnapshot {
	/** 配置文件里的那一行 copy 映射 */
	copyEntry: string;
	/** 包内落点（Resources/app 起算） */
	bundlePath: string;
	/** views:// 地址；目标不在 views/ 下时无地址 */
	viewsUrl: string;
	/** dev --watch 默认监听的目录 */
	watchDir: string;
}

export interface AssetDestinationInstance {
	update(args: AssetDestinationArgs): void;
	dispose(): void;
}

interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface TreeRow {
	label: string;
	depth: number;
	kind: 'plain' | 'muted' | 'root' | 'target';
	note?: string;
}

const COLORS = {
	heading: '#172033',
	muted: '#475569',
	faint: '#94a3b8',
	panelFill: '#ffffff',
	panelBorder: '#94a3b8',
	accent: '#4f7cff',
	accentSoft: 'rgba(79, 124, 255, 0.10)',
	rootFill: 'rgba(79, 124, 255, 0.16)',
	warn: '#b45309',
	warnFill: 'rgba(180, 83, 9, 0.10)',
};

const FONT_UI = 'ui-sans-serif, system-ui, sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const ROW_HEIGHT = 22;

/** 规整读者输入的路径：去掉首尾空白、./、/ 与多余分隔 */
function normalize(input: string): string[] {
	return input
		.trim()
		.replace(/^\.?\//, '')
		.replace(/\/+$/, '')
		.split('/')
		.filter((segment) => segment.length > 0 && segment !== '.');
}

function dirnameOf(segments: string[]): string {
	if (segments.length <= 1) {
		return '.';
	}
	return segments.slice(0, -1).join('/');
}

interface Resolved {
	/** 目标路径段（Resources/app 之后） */
	segments: string[];
	/** 是否落在 views/ 下 */
	underViews: boolean;
	/** views:// 地址（目录带尾斜杠）；无地址时为 null */
	viewsUrl: string | null;
	/** 包内完整落点 */
	bundlePath: string;
}

function resolveDestination(args: AssetDestinationArgs): Resolved {
	const segments = normalize(args.destination);
	const underViews = segments[0] === 'views';
	const rest = underViews ? segments.slice(1) : segments;
	const viewsUrl = underViews
		? `views://${rest.join('/')}${args.sourceIsDir ? '/' : ''}`
		: null;

	return {
		segments,
		underViews,
		viewsUrl,
		bundlePath: `Resources/app/${segments.join('/')}`,
	};
}

function rowsOf(resolved: Resolved): TreeRow[] {
	const rows: TreeRow[] = [
		{ label: 'Contents/Resources/', depth: 0, kind: 'plain' },
		{
			label: 'app/',
			depth: 1,
			kind: 'plain',
			note: 'copy 目标与 bun、views 同级',
		},
		{ label: 'bun/', depth: 2, kind: 'muted', note: '主进程 bundle' },
		{ label: 'views/', depth: 2, kind: 'root', note: '← views:// 根' },
	];

	if (resolved.underViews) {
		const rest = resolved.segments.slice(1);
		rest.forEach((segment, index) => {
			rows.push({
				label:
					index === rest.length - 1 && !segment.endsWith('/')
						? segment
						: `${segment}/`,
				depth: 3 + index,
				kind: 'target',
			});
		});
	} else {
		resolved.segments.forEach((segment, index) => {
			rows.push({
				label:
					index === resolved.segments.length - 1 && !segment.endsWith('/')
						? segment
						: `${segment}/`,
				depth: 2 + index,
				kind: 'target',
				note:
					index === resolved.segments.length - 1
						? '不在 views/ 下 → 无视图层地址'
						: undefined,
			});
		});
	}

	rows.push({ label: 'version.json / build.json', depth: 1, kind: 'muted' });
	return rows;
}

export function createAssetDestinationMap(
	canvas: HTMLCanvasElement,
	emit: (snapshot: AssetDestinationSnapshot) => void,
): AssetDestinationInstance {
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('当前浏览器不支持 Canvas 2D。');
	}
	const drawingContext: CanvasRenderingContext2D = context;

	let current: AssetDestinationArgs = {
		source: 'src/assets',
		destination: 'views/mainview/assets',
		sourceIsDir: true,
	};

	function draw() {
		const size = readCanvasSize(canvas);
		const twoColumn = size.width >= 620;
		const width = Math.max(320, size.width);
		const height = Math.max(twoColumn ? 330 : 540, size.height);
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

		canvas.width = Math.round(width * pixelRatio);
		canvas.height = Math.round(height * pixelRatio);
		drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		drawingContext.clearRect(0, 0, width, height);

		const resolved = resolveDestination(current);
		const rows = rowsOf(resolved);
		const margin = 20;
		const gap = 14;
		const panelW = width - margin * 2;

		// 标题
		drawingContext.fillStyle = COLORS.heading;
		drawingContext.font = `600 16px ${FONT_UI}`;
		drawingContext.fillText('一条 build.copy 映射的落点与地址', margin, 28);

		const treeH = 34 + rows.length * ROW_HEIGHT + 10;
		let configPanel: Rect;
		let treePanel: Rect;
		let resultPanel: Rect;

		if (twoColumn) {
			const leftW = Math.round(panelW * 0.5);
			const rightX = margin + leftW + gap;
			const rightW = panelW - leftW - gap;
			configPanel = { x: margin, y: 44, w: leftW, h: 104 };
			resultPanel = { x: margin, y: 44 + 104 + gap, w: leftW, h: 132 };
			treePanel = { x: rightX, y: 44, w: rightW, h: treeH };
		} else {
			configPanel = { x: margin, y: 44, w: panelW, h: 96 };
			treePanel = { x: margin, y: 44 + 96 + gap, w: panelW, h: treeH };
			resultPanel = {
				x: margin,
				y: 44 + 96 + gap + treeH + gap,
				w: panelW,
				h: 120,
			};
		}

		drawConfigPanel(configPanel);
		drawTreePanel(treePanel, resolved, rows);
		drawResultPanel(resultPanel, resolved);

		const sourceSegments = normalize(current.source);
		emit({
			copyEntry: `"${current.source.trim()}": "${current.destination.trim()}"`,
			bundlePath: resolved.bundlePath,
			viewsUrl: resolved.viewsUrl ?? '无（目标不在 views/ 下）',
			watchDir: current.sourceIsDir
				? sourceSegments.join('/') || '.'
				: dirnameOf(sourceSegments),
		});
	}

	function drawConfigPanel(panel: Rect) {
		drawPanel(panel);
		const pad = 12;

		drawingContext.fillStyle = COLORS.muted;
		drawingContext.font = `12px ${FONT_UI}`;
		drawingContext.fillText(
			'electrobun.config.ts → build.copy',
			panel.x + pad,
			panel.y + 20,
		);

		drawingContext.fillStyle = COLORS.heading;
		drawingContext.font = `13px ${FONT_MONO}`;
		const copyLine = `"${current.source.trim() || '…'}": "${current.destination.trim() || '…'}"`;
		wrapMono(
			copyLine,
			panel.x + pad,
			panel.y + 42,
			panel.w - pad * 2,
			18,
		);

		drawingContext.fillStyle = COLORS.muted;
		drawingContext.font = `12px ${FONT_UI}`;
		const channelText = current.sourceIsDir
			? 'cpSync(recursive) 整目录原样复制'
			: 'cpSync 单文件原样复制（不转译、不改名）';
		drawingContext.fillText(channelText, panel.x + pad, panel.y + panel.h - 12);
	}

	function drawTreePanel(
		panel: Rect,
		resolved: Resolved,
		rows: TreeRow[],
	) {
		drawPanel(panel);
		const pad = 12;

		drawingContext.fillStyle = COLORS.muted;
		drawingContext.font = `11px ${FONT_UI}`;
		drawingContext.fillText(
			'构建输出的应用包（dev：build/dev-<os>-<arch>/<name>-dev.app）',
			panel.x + pad,
			panel.y + 18,
		);

		rows.forEach((row, index) => {
			const rowY = panel.y + 36 + index * ROW_HEIGHT;
			const boxX = panel.x + pad + row.depth * 16;
			const label = `${row.depth > 0 ? '└ ' : ''}${row.label}`;

			// 先定字体再测量，保证高亮框宽度和文字一致
			drawingContext.font = `12px ${FONT_MONO}`;

			if (row.kind === 'target' || row.kind === 'root') {
				const text = drawingContext.measureText(label).width;
				drawingContext.fillStyle =
					row.kind === 'root'
						? COLORS.rootFill
						: resolved.underViews
							? COLORS.accentSoft
							: COLORS.warnFill;
				drawingContext.fillRect(boxX - 5, rowY - 12, text + 16, 18);
			}

			drawingContext.fillStyle =
				row.kind === 'muted'
					? COLORS.faint
					: row.kind === 'target' && !resolved.underViews
						? COLORS.warn
						: row.kind === 'target' || row.kind === 'root'
							? COLORS.accent
							: COLORS.heading;
			drawingContext.fillText(label, boxX, rowY);

			if (row.note) {
				drawingContext.fillStyle = COLORS.faint;
				drawingContext.font = `10px ${FONT_UI}`;
				const labelWidth = drawingContext.measureText(label).width;
				drawingContext.fillText(row.note, boxX + labelWidth + 10, rowY);
			}
		});
	}

	function drawResultPanel(panel: Rect, resolved: Resolved) {
		drawPanel(panel);
		const pad = 12;
		const lineHeight = 20;

		drawingContext.font = `13px ${FONT_MONO}`;
		drawingContext.fillStyle = COLORS.muted;
		drawingContext.fillText('包内落点', panel.x + pad, panel.y + 22);
		drawingContext.fillStyle = COLORS.heading;
		wrapMono(
			resolved.bundlePath,
			panel.x + pad,
			panel.y + 22 + lineHeight,
			panel.w - pad * 2,
			lineHeight,
		);

		const urlY = panel.y + 22 + lineHeight * 2 + 8;
		drawingContext.fillStyle = COLORS.muted;
		drawingContext.fillText('views:// 地址', panel.x + pad, urlY);
		drawingContext.fillStyle = resolved.viewsUrl ? COLORS.accent : COLORS.warn;
		drawingContext.fillText(
			resolved.viewsUrl ?? '无——目标不在 views/ 下',
			panel.x + pad,
			urlY + lineHeight,
		);

		drawingContext.fillStyle = COLORS.muted;
		drawingContext.font = `11px ${FONT_UI}`;
		const reach = resolved.viewsUrl
			? '视图层（窗口 url / html 引用）与主进程都可访问'
			: '仅主进程可达：PATHS.RESOURCES_FOLDER + fs 读取';
		drawingContext.fillText(
			reach,
			panel.x + pad,
			panel.y + panel.h - 12,
		);
	}

	function drawPanel(panel: Rect) {
		drawingContext.fillStyle = COLORS.panelFill;
		drawingContext.strokeStyle = COLORS.panelBorder;
		drawingContext.lineWidth = 1;
		drawingContext.beginPath();
		drawingContext.roundRect(panel.x, panel.y, panel.w, panel.h, 8);
		drawingContext.fill();
		drawingContext.stroke();
	}

	/** 等宽字体按最大列数折行绘制，返回占用的行数 */
	function wrapMono(
		text: string,
		x: number,
		y: number,
		maxWidth: number,
		lineHeight: number,
	) {
		const perLine = Math.max(10, Math.floor(maxWidth / 7.4));
		let line = 0;
		for (let offset = 0; offset < text.length; offset += perLine) {
			drawingContext.fillText(text.slice(offset, offset + perLine), x, y + line * lineHeight);
			line += 1;
		}
		return line;
	}

	const resizeObserver = createResizeObserver(canvas, draw);

	return {
		update(args: AssetDestinationArgs) {
			current = args;
			draw();
		},
		dispose() {
			resizeObserver.disconnect();
		},
	};
}
