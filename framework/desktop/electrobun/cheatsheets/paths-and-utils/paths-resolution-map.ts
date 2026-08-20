/**
 * 演示内容：Utils.paths 的十五个 getter 在三平台上的解析落点——同一个 getter 名，
 * macOS 落在 ~/Library/...，Windows 落在 AppData（%LOCALAPPDATA% / %APPDATA%），
 * Linux 落在 XDG 目录；userData / userCache / userLogs 再按 version.json 的
 * identifier + channel 拼出应用私有目录。映射关系对照 1.18.1 包内
 * dist/api/bun/core/Utils.ts 的 getAppDataDir / getConfigDir / getUserDir 等
 * switch 实现。这是浏览器里的映射示意，真实机器上的值以课程里的 utils-observer
 * 工程打印为准。
 * 输入：平台（macos / win / linux）、identifier、channel（Controls 提供）。
 * 操作：点击左侧 getter 分组里的名字，目录树中对应落点高亮，顶部显示该 getter
 * 的解析式与代入示例；在 Controls 里切换平台、修改 identifier / channel。
 * 预期结果：macOS 的 config 与 appData 同为 ~/Library/Application Support；
 * Windows 的 appData / cache / logs 都指向 %LOCALAPPDATA%；Linux 各目录走
 * XDG 环境变量；identifier / channel 置空时私有目录退化为上一层目录（包内对
 * 读不到 version.json 的兜底就是空串，path.join 会跳过空段）。
 * 阅读主线：rowsOf(platform) 生成目录树行，点击芯片只改选中 getter，
 * draw() 把状态画出来。
 */
import {
	createResizeObserver,
	readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type PathsPlatform = 'macos' | 'win' | 'linux';

export interface PathsResolutionArgs {
	platform: PathsPlatform;
	identifier: string;
	channel: string;
}

export interface PathsResolutionSnapshot {
	/** 当前选中的 getter */
	getter: string;
	/** 解析式（含环境变量注记与代入结果） */
	formula: string;
	/** identifier / channel 代入后的 userData / userCache / userLogs */
	scoped: string;
}

export interface PathsResolutionInstance {
	update(args: PathsResolutionArgs): void;
	dispose(): void;
}

interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface TreeRow {
	key: string;
	depth: number;
	label: string;
	/** 解析到这一行的 getter 名（不含 user* 私有目录） */
	getters: string[];
	note?: string;
	/** 注记换行画在标签下方（长行专用） */
	noteBelow?: boolean;
	/** 这一行本身就是 {identifier}/{channel} 拼出来的私有目录 */
	scopedGetter?: 'userData' | 'userCache' | 'userLogs';
}

const COLORS = {
	heading: '#172033',
	muted: '#475569',
	faint: '#94a3b8',
	panelFill: '#ffffff',
	panelBorder: '#94a3b8',
	chipFill: '#f1f5f9',
	chipBorder: '#c3ccdb',
	accent: '#4f7cff',
	accentSoft: 'rgba(79, 124, 255, 0.10)',
	scoped: '#0e7a5f',
};

const FONT_UI = 'ui-sans-serif, system-ui, sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const GETTER_GROUPS: Array<{ title: string; items: string[] }> = [
	{
		title: '系统目录',
		items: ['home', 'temp', 'appData', 'config', 'cache', 'logs'],
	},
	{
		title: '用户目录',
		items: [
			'documents',
			'downloads',
			'desktop',
			'pictures',
			'music',
			'videos',
		],
	},
	{
		title: '应用私有',
		items: ['userData', 'userCache', 'userLogs'],
	},
];

/** 展示用的基础目录（带环境变量注记） */
const BASE_LABEL: Record<PathsPlatform, Record<string, string>> = {
	macos: {
		appData: '~/Library/Application Support',
		config: '~/Library/Application Support',
		cache: '~/Library/Caches',
		logs: '~/Library/Logs',
		documents: '~/Documents',
		downloads: '~/Downloads',
		desktop: '~/Desktop',
		pictures: '~/Pictures',
		music: '~/Music',
		videos: '~/Movies',
	},
	win: {
		appData: '~/AppData/Local（%LOCALAPPDATA%）',
		config: '~/AppData/Roaming（%APPDATA%）',
		cache: '~/AppData/Local（%LOCALAPPDATA%）',
		logs: '~/AppData/Local（%LOCALAPPDATA%）',
		documents: '~/Documents',
		downloads: '~/Downloads',
		desktop: '~/Desktop',
		pictures: '~/Pictures',
		music: '~/Music',
		videos: '~/Videos',
	},
	linux: {
		appData: '~/.local/share（$XDG_DATA_HOME）',
		config: '~/.config（$XDG_CONFIG_HOME）',
		cache: '~/.cache（$XDG_CACHE_HOME）',
		logs: '~/.local/state（$XDG_STATE_HOME）',
		documents: 'XDG_DOCUMENTS_DIR（缺失回落 ~/Documents）',
		downloads: 'XDG_DOWNLOAD_DIR（缺失回落 ~/Downloads）',
		desktop: 'XDG_DESKTOP_DIR（缺失回落 ~/Desktop）',
		pictures: 'XDG_PICTURES_DIR（缺失回落 ~/Pictures）',
		music: 'XDG_MUSIC_DIR（缺失回落 ~/Music）',
		videos: 'XDG_VIDEOS_DIR（缺失回落 ~/Videos）',
	},
};

/** 拼私有目录时用的干净基础目录（不带注记） */
const CLEAN_BASE: Record<PathsPlatform, Record<string, string>> = {
	macos: {
		appData: '~/Library/Application Support',
		cache: '~/Library/Caches',
		logs: '~/Library/Logs',
	},
	win: {
		appData: '~/AppData/Local',
		cache: '~/AppData/Local',
		logs: '~/AppData/Local',
	},
	linux: {
		appData: '~/.local/share',
		cache: '~/.cache',
		logs: '~/.local/state',
	},
};

const SCOPED_OF: Record<'userData' | 'userCache' | 'userLogs', string> = {
	userData: 'appData',
	userCache: 'cache',
	userLogs: 'logs',
};

// path.join 会跳过空字符串段：identifier / channel 为空时私有目录退化为上一层
function joinScopes(base: string, parts: Array<string | undefined>): string {
	return [base, ...parts.filter((part) => Boolean(part))].join('/');
}

function scopedLabel(
	identifier: string,
	channel: string,
): { text: string; degraded: boolean } {
	const parts = [identifier, channel].filter((part) => part.length > 0);
	if (parts.length === 2) {
		return { text: `${identifier}/${channel}`, degraded: false };
	}
	return {
		text: parts.length === 1 ? `${parts[0]}（另一段为空）` : '（两段均为空）',
		degraded: true,
	};
}

function userDirRow(platform: PathsPlatform): TreeRow {
	const note =
		platform === 'macos'
			? 'videos 的 macOS 目录名是 Movies'
			: platform === 'win'
				? '挂在 %USERPROFILE% 下'
				: '按 ~/.config/user-dirs.dirs 解析，缺失回落 ~/ 同名目录';
	return {
		key: 'user-dirs',
		depth: 1,
		label: 'Documents/ · Downloads/ · Desktop/ · Pictures/ · Music/',
		getters: ['documents', 'downloads', 'desktop', 'pictures', 'music', 'videos'],
		note:
			platform === 'macos'
				? `Movies/（videos）——${note}`
				: `Videos/（videos）——${note}`,
		noteBelow: true,
	};
}

function rowsOf(
	platform: PathsPlatform,
	identifier: string,
	channel: string,
): TreeRow[] {
	const scoped = scopedLabel(identifier, channel);
	const scopedRow = (
		key: string,
		depth: number,
		getter: 'userData' | 'userCache' | 'userLogs',
	): TreeRow => ({
		key,
		depth,
		label: scoped.text,
		getters: [],
		note: scoped.degraded
			? '空串被 path.join 跳过 → 退化为上一层'
			: `join(${SCOPED_OF[getter]}, identifier, channel)`,
		scopedGetter: getter,
	});

	if (platform === 'macos') {
		return [
			{ key: 'root', depth: 0, label: '~（home）', getters: ['home'] },
			{ key: 'library', depth: 1, label: 'Library/', getters: [] },
			{
				key: 'app-support',
				depth: 2,
				label: 'Application Support/',
				getters: ['appData', 'config'],
				note: 'config 与 appData 同目录',
			},
			scopedRow('scoped-user-data', 3, 'userData'),
			{ key: 'caches', depth: 2, label: 'Caches/', getters: ['cache'] },
			scopedRow('scoped-user-cache', 3, 'userCache'),
			{ key: 'logs', depth: 2, label: 'Logs/', getters: ['logs'] },
			scopedRow('scoped-user-logs', 3, 'userLogs'),
			userDirRow(platform),
		];
	}
	if (platform === 'win') {
		return [
			{
				key: 'root',
				depth: 0,
				label: '~（home = %USERPROFILE% 兜底源）',
				getters: ['home'],
			},
			{ key: 'appdata', depth: 1, label: 'AppData/', getters: [] },
			{
				key: 'local',
				depth: 2,
				label: 'Local/',
				getters: ['appData', 'cache', 'logs'],
				note: '读 %LOCALAPPDATA%，未设置回落 ~/AppData/Local',
			},
			scopedRow('scoped-user-data', 3, 'userData'),
			scopedRow('scoped-user-cache', 3, 'userCache'),
			scopedRow('scoped-user-logs', 3, 'userLogs'),
			{
				key: 'roaming',
				depth: 2,
				label: 'Roaming/',
				getters: ['config'],
				note: '读 %APPDATA%，未设置回落 ~/AppData/Roaming',
			},
			userDirRow(platform),
		];
	}
	return [
		{ key: 'root', depth: 0, label: '~（home）', getters: ['home'] },
		{ key: 'local-dir', depth: 1, label: '.local/', getters: [] },
		{
			key: 'share',
			depth: 2,
			label: 'share/',
			getters: ['appData'],
			note: '$XDG_DATA_HOME 优先',
		},
		scopedRow('scoped-user-data', 3, 'userData'),
		{
			key: 'state',
			depth: 2,
			label: 'state/',
			getters: ['logs'],
			note: '$XDG_STATE_HOME 优先',
		},
		scopedRow('scoped-user-logs', 3, 'userLogs'),
		{
			key: 'cache-dir',
			depth: 1,
			label: '.cache/',
			getters: ['cache'],
			note: '$XDG_CACHE_HOME 优先',
		},
		scopedRow('scoped-user-cache', 2, 'userCache'),
		{
			key: 'config-dir',
			depth: 1,
			label: '.config/',
			getters: ['config'],
			note: '$XDG_CONFIG_HOME 优先；user-dirs.dirs 也在这里',
		},
		userDirRow(platform),
	];
}

/** 解析式（推导写法）与代入示例（干净路径） */
function derivationOf(
	platform: PathsPlatform,
	getter: string,
	identifier: string,
	channel: string,
): { expr: string; example: string } {
	if (getter === 'home') {
		return {
			expr:
				platform === 'win'
					? 'os.homedir()（用户目录拼 %USERPROFILE%，未设置再用 home）'
					: 'os.homedir()',
			example: '~',
		};
	}
	if (getter === 'temp') {
		return { expr: 'os.tmpdir()（系统临时目录，三平台同源）', example: 'tmp' };
	}
	if (getter === 'userData' || getter === 'userCache' || getter === 'userLogs') {
		const base = SCOPED_OF[getter];
		return {
			expr: `join(${base} = ${BASE_LABEL[platform][base]}, identifier, channel)`,
			example: joinScopes(CLEAN_BASE[platform][base] ?? '', [identifier, channel]),
		};
	}
	const label = BASE_LABEL[platform][getter] ?? '';
	return { expr: label, example: label.split('（')[0] ?? label };
}

export function createPathsResolutionMap(
	canvas: HTMLCanvasElement,
	emit: (snapshot: PathsResolutionSnapshot) => void,
): PathsResolutionInstance {
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('当前浏览器不支持 Canvas 2D。');
	}
	const g: CanvasRenderingContext2D = context;

	const state: PathsResolutionArgs & { selected: string; hover: string | null } = {
		platform: 'macos',
		identifier: 'dev.learn.utils',
		channel: 'dev',
		selected: 'userData',
		hover: null,
	};

	const chipRects = new Map<string, Rect>();

	// ---- 布局：左侧 getter 双列分组，右侧目录树，顶部解析式 ----

	const LAYOUT = {
		margin: 24,
		formulaTop: 46,
		formulaH: 46,
		panelsTop: 108,
		chipW: 86,
		chipH: 24,
		chipGapX: 4,
		chipGapY: 4,
		groupTitleH: 24,
		rowH: 26,
		tallRowExtra: 16,
		treeIndent: 22,
		treeLeft: 24 + 176 + 28,
	};

	function onClick(event: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		for (const [getter, box] of chipRects) {
			if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
				state.selected = getter;
				draw();
				return;
			}
		}
	}

	function onPointerMove(event: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		let hit: string | null = null;
		for (const [getter, box] of chipRects) {
			if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
				hit = getter;
				break;
			}
		}
		state.hover = hit;
		canvas.style.cursor = hit ? 'pointer' : 'default';
	}

	// ---- 绘制 ----

	function roundBox(box: Rect, border: string, fill: string) {
		g.fillStyle = fill;
		g.strokeStyle = border;
		g.lineWidth = 1.5;
		g.beginPath();
		g.roundRect(box.x, box.y, box.w, box.h, 6);
		g.fill();
		g.stroke();
	}

	function drawFormulaBar(width: number) {
		const { expr, example } = derivationOf(
			state.platform,
			state.selected,
			state.identifier,
			state.channel,
		);
		roundBox(
			{
				x: LAYOUT.margin,
				y: LAYOUT.formulaTop,
				w: width - LAYOUT.margin * 2,
				h: LAYOUT.formulaH,
			},
			COLORS.panelBorder,
			COLORS.panelFill,
		);
		g.fillStyle = COLORS.heading;
		g.font = `600 12px ${FONT_MONO}`;
		g.fillText(`Utils.paths.${state.selected}`, LAYOUT.margin + 12, LAYOUT.formulaTop + 18);
		g.fillStyle = COLORS.muted;
		g.font = `12px ${FONT_MONO}`;
		g.fillText(`→ ${expr}`, LAYOUT.margin + 160, LAYOUT.formulaTop + 18);
		g.fillStyle = COLORS.scoped;
		g.font = `11px ${FONT_MONO}`;
		g.fillText(
			`代入当前 identifier / channel → ${example}`,
			LAYOUT.margin + 12,
			LAYOUT.formulaTop + 36,
		);
	}

	function drawGetterPanel(): number {
		// 双列芯片；返回面板底部 y
		let y = LAYOUT.panelsTop;
		for (const group of GETTER_GROUPS) {
			g.fillStyle = COLORS.muted;
			g.font = `600 12px ${FONT_UI}`;
			g.fillText(group.title, LAYOUT.margin, y + 15);
			y += LAYOUT.groupTitleH;
			group.items.forEach((getter, index) => {
				const col = index % 2;
				const row = Math.floor(index / 2);
				const box: Rect = {
					x: LAYOUT.margin + col * (LAYOUT.chipW + LAYOUT.chipGapX),
					y: y + row * (LAYOUT.chipH + LAYOUT.chipGapY),
					w: LAYOUT.chipW,
					h: LAYOUT.chipH,
				};
				chipRects.set(getter, box);
				const isSelected = state.selected === getter;
				const isHover = state.hover === getter;
				roundBox(
					box,
					isSelected || isHover ? COLORS.accent : COLORS.chipBorder,
					isSelected ? COLORS.accentSoft : COLORS.chipFill,
				);
				g.fillStyle = isSelected ? COLORS.accent : COLORS.muted;
				g.font = `${isSelected ? 600 : 400} 11px ${FONT_MONO}`;
				g.fillText(getter, box.x + 8, box.y + 16);
			});
			const rows = Math.ceil(group.items.length / 2);
			y += rows * (LAYOUT.chipH + LAYOUT.chipGapY) + 8;
		}
		return y;
	}

	function drawTree(width: number): number {
		const rows = rowsOf(state.platform, state.identifier, state.channel);
		const rowW = width - LAYOUT.margin - LAYOUT.treeLeft;
		let y = LAYOUT.panelsTop;
		g.fillStyle = COLORS.muted;
		g.font = `600 12px ${FONT_UI}`;
		const titles: Record<PathsPlatform, string> = {
			macos: 'macOS 目录树',
			win: 'Windows 目录树',
			linux: 'Linux 目录树',
		};
		g.fillText(titles[state.platform], LAYOUT.treeLeft, y + 15);
		y += LAYOUT.groupTitleH;

		for (const row of rows) {
			// 先量文本：注记放不下右侧就换行到标签下方（行高随之加高）
			const x = LAYOUT.treeLeft + row.depth * LAYOUT.treeIndent;
			g.font = `12px ${FONT_MONO}`;
			const labelWidth = g.measureText(row.label).width;
			const badges = row.scopedGetter ? [row.scopedGetter] : row.getters;
			g.font = `11px ${FONT_MONO}`;
			const badgeText = badges.length > 0 ? `← ${badges.join('、')}` : '';
			const badgeWidth = badgeText ? g.measureText(badgeText).width + 10 : 0;
			const endX = x + labelWidth + badgeWidth;
			let rightNoteX = Number.POSITIVE_INFINITY;
			if (row.note) {
				g.font = `10.5px ${FONT_UI}`;
				rightNoteX = width - LAYOUT.margin - g.measureText(row.note).width;
			}
			const noteInline = Boolean(row.note) && !row.noteBelow && rightNoteX >= endX + 12;
			const rowH =
				LAYOUT.rowH + (row.note && !noteInline ? LAYOUT.tallRowExtra : 0);

			const hit =
				row.getters.includes(state.selected) || row.scopedGetter === state.selected;
			if (hit) {
				g.fillStyle = COLORS.accentSoft;
				g.beginPath();
				g.roundRect(LAYOUT.treeLeft - 6, y, rowW, rowH, 6);
				g.fill();
				g.strokeStyle = COLORS.accent;
				g.lineWidth = 1;
				g.stroke();
			}
			g.font = `12px ${FONT_MONO}`;
			g.fillStyle = row.scopedGetter ? COLORS.scoped : COLORS.heading;
			g.fillText(row.label, x, y + 17);
			// getter 徽标画在标签右侧：解析到这一行的名字
			if (badgeText) {
				g.font = `11px ${FONT_MONO}`;
				g.fillStyle = hit ? COLORS.accent : COLORS.faint;
				g.fillText(badgeText, x + labelWidth + 10, y + 17);
			}
			if (row.note) {
				g.font = `10.5px ${FONT_UI}`;
				g.fillStyle = COLORS.faint;
				if (noteInline) {
					g.fillText(row.note, rightNoteX, y + 16);
				} else {
					g.fillText(row.note, x + 12, y + 17 + 14);
				}
			}
			y += rowH;
		}
		return y;
	}

	function draw() {
		chipRects.clear();
		const size = readCanvasSize(canvas);
		const width = Math.max(640, size.width);
		const height = Math.max(360, size.height);
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

		canvas.width = Math.round(width * pixelRatio);
		canvas.height = Math.round(height * pixelRatio);
		g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		g.clearRect(0, 0, width, height);

		// 标题与提示
		g.fillStyle = COLORS.heading;
		g.font = `600 16px ${FONT_UI}`;
		g.fillText('paths 解析示意：同名 getter 在三平台的落点', LAYOUT.margin, 32);
		g.fillStyle = COLORS.muted;
		g.font = `12px ${FONT_UI}`;
		const hint = '点左侧 getter 看落点；平台 / identifier / channel 在 Controls 里调';
		g.fillText(hint, width - LAYOUT.margin - g.measureText(hint).width, 32);

		drawFormulaBar(width);
		const panelBottom = drawGetterPanel();
		const treeBottom = drawTree(width);
		const contentBottom = Math.max(panelBottom, treeBottom) + 6;

		// 底部注记：home / temp 的来源与「不建目录」的边界
		g.font = `11px ${FONT_UI}`;
		g.fillStyle = COLORS.faint;
		g.fillText(
			'home → os.homedir()；temp → os.tmpdir()。getter 只返回字符串，不创建目录。',
			LAYOUT.margin,
			Math.max(contentBottom + 18, height - 14),
		);

		const { expr, example } = derivationOf(
			state.platform,
			state.selected,
			state.identifier,
			state.channel,
		);
		emit({
			getter: `Utils.paths.${state.selected}`,
			formula: example ? `${expr} = ${example}` : expr,
			scoped: (['userData', 'userCache', 'userLogs'] as const)
				.map(
					(getter) =>
						`${getter}=${joinScopes(CLEAN_BASE[state.platform][SCOPED_OF[getter]] ?? '', [
							state.identifier,
							state.channel,
						])}`,
				)
				.join('  '),
		});
	}

	canvas.addEventListener('click', onClick);
	canvas.addEventListener('pointermove', onPointerMove);
	const resizeObserver = createResizeObserver(canvas, draw);

	return {
		update(args: PathsResolutionArgs) {
			state.platform = args.platform;
			state.identifier = args.identifier;
			state.channel = args.channel;
			draw();
		},
		dispose() {
			canvas.removeEventListener('click', onClick);
			canvas.removeEventListener('pointermove', onPointerMove);
			resizeObserver.disconnect();
		},
	};
}
