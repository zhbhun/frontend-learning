/**
 * 范例介绍:模拟四个系统交互插件的一次前端调用,观察「调用 → 命令 → 授权 → 系统界面」链路与返回值。
 * 输入:演示场景(插件 × 操作)、授权状态、用户动作。
 * 操作:切换场景,对比对话框 / 通知 / opener / 剪贴板的系统界面与返回值;切到未授权观察调用在 ACL 层被拒。
 * 预期结果:授权且用户确认时返回真实结果形态(路径 / 按钮值 / void);用户取消返回 null;未授权时不出现系统界面。
 * 阅读主线:SCENARIOS 表决定读数与界面,drawCallChain 画调用链,drawUi 分发各场景的系统界面模拟。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ScenarioId =
  | 'dialog-save'
  | 'dialog-open'
  | 'dialog-message'
  | 'notification-send'
  | 'opener-openurl'
  | 'opener-reveal'
  | 'clipboard-write'
  | 'clipboard-read';

export interface ExampleArgs {
  scenario: ScenarioId;
  granted: boolean;
  userAction: 'confirm' | 'cancel';
}

export interface ExampleSnapshot {
  call: string;
  auth: string;
  response: string;
  result: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

interface ScenarioSpec {
  plugin: string;
  call: string;
  command: string;
  /** 授权层说明:多数插件是 ACL 权限,通知还叠加系统通知权限 */
  authGranted: string;
  /** 授权通过时的系统界面类型 */
  ui: 'save' | 'open' | 'message' | 'notification' | 'browser' | 'finder' | 'clipboard';
  okResponse: string;
  cancelResponse: string;
  okResult: string;
  cancelResult: string;
}

/**
 * 场景规格:返回值形态与官方文档一致——
 * 文件对话框取消返回 null,message 返回按钮值,通知、opener 与剪贴板写入无返回数据(Promise<void>)。
 */
const SCENARIOS: Record<ScenarioId, ScenarioSpec> = {
  'dialog-save': {
    plugin: 'dialog',
    call: 'save({ title: "导出报告", filters: [{ name: "PDF", extensions: ["pdf"] }] })',
    command: 'plugin:dialog|save',
    authGranted: 'dialog:default(含 allow-save)',
    ui: 'save',
    okResponse: '弹出系统保存面板,用户点「保存」',
    cancelResponse: '弹出系统保存面板,用户点「取消」',
    okResult: '"/Users/me/Documents/report.pdf"',
    cancelResult: 'null(取消不是错误,但路径不可用)',
  },
  'dialog-open': {
    plugin: 'dialog',
    call: 'open({ multiple: false, filters: [{ name: "文本", extensions: ["txt"] }] })',
    command: 'plugin:dialog|open',
    authGranted: 'dialog:default(含 allow-open)',
    ui: 'open',
    okResponse: '弹出系统文件选择面板,用户选中文件',
    cancelResponse: '弹出系统文件选择面板,用户点「取消」',
    okResult: '"/Users/me/Downloads/notes.txt"(multiple 时为数组)',
    cancelResult: 'null',
  },
  'dialog-message': {
    plugin: 'dialog',
    call: 'message("要保存更改吗?", { title: "编辑器", kind: "warning", buttons: "OkCancel" })',
    command: 'plugin:dialog|message',
    authGranted: 'dialog:default(含 allow-message)',
    ui: 'message',
    okResponse: '弹出系统消息框,用户点「确定」',
    cancelResponse: '弹出系统消息框,用户点「取消」',
    okResult: '"Ok"(MessageDialogResult,按钮标签)',
    cancelResult: '"Cancel"',
  },
  'notification-send': {
    plugin: 'notification',
    call: 'sendNotification({ title: "下载完成", body: "report.pdf 已保存到下载目录" })',
    command: 'plugin:notification|notify',
    authGranted: 'notification:default(ACL)+ 系统通知权限已授予',
    ui: 'notification',
    okResponse: '系统横幅展示通知(无用户决策,返回无数据)',
    cancelResponse: '系统横幅展示通知(无用户决策,返回无数据)',
    okResult: 'Promise<void>(无返回值)',
    cancelResult: 'Promise<void>(无返回值)',
  },
  'opener-openurl': {
    plugin: 'opener',
    call: 'openUrl("https://tauri.app")',
    command: 'plugin:opener|open_url',
    authGranted: 'opener:default(含 allow-open-url)',
    ui: 'browser',
    okResponse: '交给系统默认浏览器打开(opener:default 已覆盖常用 URL)',
    cancelResponse: '交给系统默认浏览器打开(无用户决策)',
    okResult: 'Promise<void>(无返回值)',
    cancelResult: 'Promise<void>(无返回值)',
  },
  'opener-reveal': {
    plugin: 'opener',
    call: 'revealItemInDir("/Users/me/Documents/report.pdf")',
    command: 'plugin:opener|reveal_item_in_dir',
    authGranted: 'opener:default(含 allow-reveal-item-in-dir)',
    ui: 'finder',
    okResponse: '系统文件管理器打开并定位该文件',
    cancelResponse: '系统文件管理器打开并定位该文件(无用户决策)',
    okResult: 'Promise<void>(无返回值)',
    cancelResult: 'Promise<void>(无返回值)',
  },
  'clipboard-write': {
    plugin: 'clipboard',
    call: 'writeText("Tauri is awesome!")',
    command: 'plugin:clipboard-manager|write_text',
    authGranted: 'clipboard-manager:default 是空集,需已声明 allow-write-text',
    ui: 'clipboard',
    okResponse: '系统剪贴板被写入,无界面、无用户决策',
    cancelResponse: '系统剪贴板被写入,无界面、无用户决策',
    okResult: 'Promise<void>(无返回值)',
    cancelResult: 'Promise<void>(无返回值)',
  },
  'clipboard-read': {
    plugin: 'clipboard',
    call: 'readText()',
    command: 'plugin:clipboard-manager|read_text',
    authGranted: 'clipboard-manager:default 是空集,需已声明 allow-read-text',
    ui: 'clipboard',
    okResponse: '读出系统剪贴板当前文本,无界面、无用户决策',
    cancelResponse: '读出系统剪贴板当前文本,无界面、无用户决策',
    okResult: '"Tauri is awesome!"',
    cancelResult: '"Tauri is awesome!"',
  },
};

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ExampleArgs = {
    scenario: 'dialog-save',
    granted: true,
    userAction: 'confirm',
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(430, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const spec = SCENARIOS[current.scenario];
    const confirmed = current.userAction === 'confirm';
    // 授权是调用前置:未授权时调用在 ACL 层直接 reject,系统界面根本不会出现。
    // notification 场景的 granted 表示系统通知权限(ACL 已由 notification:default 覆盖)。
    const denied = !current.granted && current.scenario !== 'notification-send';
    const needSystemPermission =
      !current.granted && current.scenario === 'notification-send';

    drawHeader(spec);
    drawCallChain(spec, denied, needSystemPermission);

    if (denied) {
      drawDenied(spec);
    } else if (needSystemPermission) {
      drawPermissionFlow();
    } else {
      drawUi(spec.ui, confirmed);
    }

    emit({
      call: `${spec.plugin} · ${spec.call}`,
      auth: current.granted ? spec.authGranted : '未授权',
      response: denied
        ? 'ACL 拒绝,系统界面未出现(调用直接 reject)'
        : needSystemPermission
          ? '系统通知权限未授予:isPermissionGranted() 返回 false,先走 requestPermission()'
          : confirmed
            ? spec.okResponse
            : spec.cancelResponse,
      result: denied
        ? 'Promise rejected:… not allowed. Permissions associated with this command: …'
        : confirmed
          ? spec.okResult
          : spec.cancelResult,
    });
  }

  function drawHeader(spec: ScenarioSpec) {
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 17px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'left';
    drawingContext.fillText(`模拟调用:${spec.plugin} 插件`, 28, 36);
  }

  /** 链路条:前端函数 → 插件命令 → 授权 → 系统界面;未授权时链条在「授权」节点断开 */
  function drawCallChain(
    spec: ScenarioSpec,
    denied: boolean,
    needSystemPermission: boolean,
  ) {
    const nodes = [
      { label: '前端函数', detail: '官方 npm 包' },
      { label: '插件命令', detail: spec.command },
      {
        label: denied ? '授权 ✗' : needSystemPermission ? '授权 ⚠' : '授权 ✓',
        detail: denied ? 'ACL 拒绝' : needSystemPermission ? '系统权限未授予' : '已授权',
      },
      { label: '系统界面', detail: denied ? '不会出现' : '见下方模拟' },
    ];

    const canvasWidth = Math.max(560, readCanvasSize(canvas).width);
    const boxWidth = 118;
    const gap = Math.max(18, (canvasWidth - 56 - boxWidth * 4) / 3);
    const y = 66;

    nodes.forEach((node, index) => {
      const x = 28 + index * (boxWidth + gap);
      const failing =
        (index === 2 && (denied || needSystemPermission)) ||
        (index === 3 && denied);

      drawingContext.fillStyle = failing ? '#fdecec' : '#eef2fb';
      drawingContext.strokeStyle = failing ? '#d64545' : '#c3cde3';
      roundRect(x, y, boxWidth, 52, 8);
      drawingContext.fill();
      drawingContext.stroke();

      drawingContext.fillStyle = failing ? '#b3352f' : '#1d2b4f';
      drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.textAlign = 'center';
      drawingContext.fillText(node.label, x + boxWidth / 2, y + 21);

      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillStyle = failing ? '#b3352f' : '#5a6a8c';
      const detail =
        node.detail.length > 20 ? `${node.detail.slice(0, 19)}…` : node.detail;
      drawingContext.fillText(detail, x + boxWidth / 2, y + 39);

      if (index < nodes.length - 1) {
        drawingContext.strokeStyle = '#94a3c4';
        drawingContext.beginPath();
        drawingContext.moveTo(x + boxWidth + 3, y + 26);
        drawingContext.lineTo(x + boxWidth + gap - 3, y + 26);
        drawingContext.stroke();
      }
    });
    drawingContext.textAlign = 'left';
  }

  /** 未授权态:模拟 dev 构建下的 ACL 拒绝报错,强调「系统界面未出现」 */
  function drawDenied(spec: ScenarioSpec) {
    const x = 28;
    const y = 152;
    const w = Math.max(560, readCanvasSize(canvas).width) - 56;
    const h = 236;

    drawingContext.fillStyle = '#fff8f7';
    drawingContext.strokeStyle = '#e2b4ae';
    roundRect(x, y, w, h, 10);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = '#b3352f';
    drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('调用被 ACL 拒绝(dev 构建报错形态)', x + 20, y + 30);

    drawingContext.fillStyle = '#8a2b26';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    const command = spec.command.split('|')[1];
    const lines = [
      `${spec.plugin}.${command} not allowed. Permissions associated`,
      'with this command: …',
    ];
    lines.forEach((line, index) => {
      drawingContext.fillText(line, x + 20, y + 58 + index * 20);
    });

    drawingContext.fillStyle = '#5a6a8c';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '拒绝发生在授权层:系统面板、通知横幅等界面不会出现。',
      x + 20,
      y + h - 24,
    );
  }

  /** 系统通知权限未授予:模拟官方推荐的三步权限流程 */
  function drawPermissionFlow() {
    const x = 28;
    const y = 152;
    const w = Math.max(560, readCanvasSize(canvas).width) - 56;
    const h = 236;

    drawingContext.fillStyle = '#fffbf0';
    drawingContext.strokeStyle = '#e3cd93';
    roundRect(x, y, w, h, 10);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = '#8a6d1f';
    drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '系统通知权限未授予(notification 插件的两层授权)',
      x + 20,
      y + 30,
    );

    const steps = [
      '1. isPermissionGranted() → false',
      '2. requestPermission() → 系统弹授权询问',
      '3. 授权后再 sendNotification(…)',
    ];
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillStyle = '#6b5315';
    steps.forEach((line, index) => {
      drawingContext.fillText(line, x + 20, y + 62 + index * 24);
    });

    drawingContext.fillStyle = '#5a6a8c';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      'ACL(notification:default)与系统通知权限是两层:前者管 invoke 放行,后者由系统管。',
      x + 20,
      y + h - 24,
    );
  }

  /** 授权通过:绘制各场景的系统界面模拟 */
  function drawUi(ui: ScenarioSpec['ui'], confirmed: boolean) {
    const x = 28;
    const y = 152;
    const w = Math.max(560, readCanvasSize(canvas).width) - 56;
    const h = 236;

    drawingContext.fillStyle = '#f4f6fb';
    drawingContext.strokeStyle = '#c3cde3';
    roundRect(x, y, w, h, 10);
    drawingContext.fill();
    drawingContext.stroke();

    switch (ui) {
      case 'save':
        drawSavePanel(x + 60, y + 26, w - 220, confirmed);
        break;
      case 'open':
        drawOpenPanel(x + 60, y + 26, w - 220, confirmed);
        break;
      case 'message':
        drawMessageBox(x + 90, y + 56, w - 260, confirmed);
        break;
      case 'notification':
        drawNotification(x + w - 316, y + 24, confirmed);
        break;
      case 'browser':
        drawBrowser(x + 50, y + 30, w - 100, h - 70);
        break;
      case 'finder':
        drawFinder(x + 60, y + 30, w - 120, h - 70);
        break;
      case 'clipboard':
        drawClipboard(x + 50, y + 30, w - 100);
        break;
    }
  }

  function drawSavePanel(x: number, y: number, w: number, confirmed: boolean) {
    windowFrame(x, y, w, 172, '导出报告', confirmed);
    drawingContext.fillStyle = '#43506e';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('存储为:', x + 20, y + 62);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.strokeStyle = '#aab6d0';
    roundRect(x + 78, y + 46, w - 120, 26, 5);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.fillStyle = '#1d2b4f';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText('report.pdf', x + 88, y + 63);

    drawingContext.fillStyle = '#5a6a8c';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('文件类型:PDF(来自 filters 选项)', x + 20, y + 96);

    button(x + w - 190, y + 118, 74, 28, '取消', !confirmed);
    button(x + w - 106, y + 118, 86, 28, '保存', confirmed);
  }

  function drawOpenPanel(x: number, y: number, w: number, confirmed: boolean) {
    windowFrame(x, y, w, 172, '选择文件', confirmed);
    const files = [
      { name: 'notes.txt', picked: true },
      { name: 'report.pdf', picked: false },
      { name: '照片.jpg', picked: false },
    ];
    files.forEach((file, index) => {
      const rowY = y + 44 + index * 26;
      if (file.picked) {
        drawingContext.fillStyle = '#dbe6ff';
        roundRect(x + 14, rowY - 14, w - 28, 22, 4);
        drawingContext.fill();
      }
      drawingContext.fillStyle = file.picked ? '#1d3fbf' : '#43506e';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(file.name, x + 24, rowY);
    });

    button(x + w - 190, y + 126, 74, 28, '取消', !confirmed);
    button(x + w - 106, y + 126, 86, 28, '打开', confirmed);
  }

  function drawMessageBox(x: number, y: number, w: number, confirmed: boolean) {
    windowFrame(x, y, w, 148, '编辑器', confirmed);

    drawingContext.fillStyle = '#e6a23c';
    drawingContext.font = '700 22px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('!', x + 24, y + 64);

    drawingContext.fillStyle = '#1d2b4f';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('要保存更改吗?', x + 48, y + 60);

    button(x + w - 200, y + 96, 74, 28, '取消', !confirmed);
    button(x + w - 116, y + 96, 96, 28, '确定', confirmed);
  }

  function drawNotification(x: number, y: number, confirmed: boolean) {
    const w = 288;
    const h = 76;

    drawingContext.fillStyle = 'rgba(28, 33, 48, 0.94)';
    roundRect(x, y, w, h, 12);
    drawingContext.fill();

    drawingContext.fillStyle = '#4f7cff';
    roundRect(x + 14, y + 16, 44, 44, 10);
    drawingContext.fill();

    drawingContext.fillStyle = '#ffffff';
    drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('下载完成', x + 72, y + 32);
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillStyle = '#c9d1e4';
    drawingContext.fillText('report.pdf 已保存到下载目录', x + 72, y + 52);

    drawingContext.fillStyle = '#8792ad';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      confirmed ? '用户可点击横幅(结果仍为 void)' : '通知只是展示,不承载用户决策',
      x,
      y + h + 24,
    );
  }

  function drawBrowser(x: number, y: number, w: number, h: number) {
    windowFrame(x, y, w, h, '默认浏览器', true);

    drawingContext.fillStyle = '#ffffff';
    drawingContext.strokeStyle = '#aab6d0';
    roundRect(x + 16, y + 44, w - 32, 28, 14);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.fillStyle = '#1d2b4f';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText('https://tauri.app', x + 30, y + 62);

    drawingContext.fillStyle = '#eef2fb';
    roundRect(x + 16, y + 84, w - 32, h - 104, 8);
    drawingContext.fill();
    drawingContext.fillStyle = '#5a6a8c';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '页面内容由默认浏览器加载——应用进程只负责「交给系统」',
      x + 28,
      y + 104,
    );
  }

  function drawFinder(x: number, y: number, w: number, h: number) {
    windowFrame(x, y, w, h, '文件管理器', true);

    const rows = ['项目', '照片', 'report.pdf'];
    rows.forEach((row, index) => {
      const rowY = y + 52 + index * 30;
      if (row === 'report.pdf') {
        drawingContext.fillStyle = '#dbe6ff';
        roundRect(x + 14, rowY - 16, w - 28, 24, 4);
        drawingContext.fill();
        drawingContext.fillStyle = '#1d3fbf';
      } else {
        drawingContext.fillStyle = '#43506e';
      }
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(row, x + 26, rowY);
    });

    drawingContext.fillStyle = '#5a6a8c';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('revealItemInDir:打开目录并高亮目标文件', x + 16, y + h - 40);
  }

  function drawClipboard(x: number, y: number, w: number) {
    drawingContext.fillStyle = '#ffffff';
    drawingContext.strokeStyle = '#aab6d0';
    roundRect(x, y, w, 96, 10);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = '#43506e';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('系统剪贴板(无界面,直接生效)', x + 18, y + 28);

    drawingContext.fillStyle = '#eef2fb';
    roundRect(x + 16, y + 42, w - 32, 34, 6);
    drawingContext.fill();
    drawingContext.fillStyle = '#1d2b4f';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText('Tauri is awesome!', x + 28, y + 63);
  }

  /** 系统窗口模拟框:标题栏 + 红黄绿点;用户确认时加一层高亮描边 */
  function windowFrame(
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    confirmed: boolean,
  ) {
    drawingContext.fillStyle = '#ffffff';
    drawingContext.strokeStyle = '#aab6d0';
    roundRect(x, y, w, h, 10);
    drawingContext.fill();
    drawingContext.stroke();

    ['#ff5f57', '#febc2e', '#28c840'].forEach((color, index) => {
      drawingContext.fillStyle = color;
      drawingContext.beginPath();
      drawingContext.arc(x + 18 + index * 16, y + 16, 5, 0, Math.PI * 2);
      drawingContext.fill();
    });

    drawingContext.fillStyle = '#43506e';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'center';
    drawingContext.fillText(title, x + w / 2, y + 20);
    drawingContext.textAlign = 'left';

    if (confirmed) {
      drawingContext.strokeStyle = '#4f7cff';
      drawingContext.lineWidth = 1.5;
      roundRect(x, y, w, h, 10);
      drawingContext.stroke();
      drawingContext.lineWidth = 1;
    }
  }

  function button(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    active: boolean,
  ) {
    drawingContext.fillStyle = active ? '#4f7cff' : '#eef1f8';
    drawingContext.strokeStyle = active ? '#3a63d8' : '#c3cde3';
    roundRect(x, y, w, h, 6);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = active ? '#ffffff' : '#43506e';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'center';
    drawingContext.fillText(label, x + w / 2, y + h / 2 + 4);
    drawingContext.textAlign = 'left';
  }

  function roundRect(x: number, y: number, w: number, h: number, radius: number) {
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, radius);
    drawingContext.arcTo(x + w, y + h, x, y + h, radius);
    drawingContext.arcTo(x, y + h, x, y, radius);
    drawingContext.arcTo(x, y, x + w, y, radius);
    drawingContext.closePath();
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
