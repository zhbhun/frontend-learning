/**
 * 范例介绍:本页只创建一个 WebrtcProvider(同名房间在单页内不允许有两个,
 * 源码会抛错),观察它真实运行中的对等发现与同步:房间名与密码都相同、且
 * 传输可达的其他端会出现在对等端列表里——同浏览器的标签页经 BroadcastChannel
 * 近路同步(默认 filterBcConns 让它们之间不再建立 WebRTC),其他浏览器 / 设备
 * 经信令服务器互找后建立 WebRTC DataChannel 直连。
 * 输入:Controls 的「文档内容」(text)、「房间名」(room)、「房间密码」(password)、
 * 「连接信令服务器」(signaling)、「加入房间」(connected)。
 * 预期:复制本标签页(同一浏览器)即出现 BC 对等端并互通——关掉信令、甚至
 * 离线也一样;密码不一致的端消息被静默丢弃、互不同步;connected 只表示
 * 「正在寻找对等端」,与是否真的连上对等端无关。
 * 阅读主线:createTabSync → rebuildProvider(房间 / 密码 / 信令变化时重建)→
 * 事件监听(status / synced / peers / awareness / doc update)→ draw。
 */
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface TabSyncOptions {
  text: string;
  room: string;
  password: string;
  signaling: boolean;
  connected: boolean;
}

export interface TabSyncSnapshot {
  connected: boolean;
  synced: boolean;
  signaling: string;
  selfPeer: string;
  webrtcPeers: number;
  bcPeers: number;
  online: number;
  localUpdates: number;
  received: number;
  maxConns: string;
  channel: string;
  lastEvent: string;
}

export interface TabSyncInstance {
  update(options: TabSyncOptions): void;
  dispose(): void;
}

/** lib0 WebsocketClient(y-webrtc 信令连接)对外可用的最小形状。 */
interface SignalingConnLike {
  url: string;
  connected: boolean;
  connecting: boolean;
  on(event: 'connect' | 'disconnect', f: () => void): void;
  off(event: 'connect' | 'disconnect', f: () => void): void;
}

const PEER_COLORS = ['#4f7cff', '#059669', '#d97706', '#dc2626', '#7c3aed'];

export function createTabSync(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TabSyncSnapshot) => void,
): TabSyncInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  const doc = new Y.Doc();
  const text = doc.getText('shared');

  let provider: WebrtcProvider | null = null;
  let providerKey = '';
  // WebrtcProvider 构造即 connect;appliedConnected 记录当前实际应用的开关,
  // 避免重复调用 connect()(它会给 signalingConns 数组追加重复项)。
  let appliedConnected = true;
  let desiredConnected = true;
  let connected = false;
  let synced = false;
  let localUpdates = 0;
  let received = 0;
  let lastEvent = '尚未加入房间';
  let signalingConns: SignalingConnLike[] = [];
  // 重建串行化:旧 Provider 的密钥派生与 destroy 清房间注册都是异步的,
  // 连续改动(如逐字输入密码)时等旧房间注销再建新的,避免 openRoom 撞名;
  // createToken 让排队的旧配置失效,只有最新一份会落地。
  let destroyChain: PromiseLike<unknown> = Promise.resolve();
  let createToken = 0;
  // 本端 awareness 身份:对等端靠它出现在彼此的在线列表里。
  const selfName = `读者-${Math.random().toString(36).slice(2, 6)}`;
  const selfColor =
    PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];

  const onSignalingChange = () => {
    draw();
  };

  function attachSignaling(p: WebrtcProvider) {
    signalingConns.forEach((conn) => {
      conn.off('connect', onSignalingChange);
      conn.off('disconnect', onSignalingChange);
    });
    signalingConns = p.signalingConns as unknown as SignalingConnLike[];
    signalingConns.forEach((conn) => {
      conn.on('connect', onSignalingChange);
      conn.on('disconnect', onSignalingChange);
    });
  }

  function detachSignaling() {
    signalingConns.forEach((conn) => {
      conn.off('connect', onSignalingChange);
      conn.off('disconnect', onSignalingChange);
    });
    signalingConns = [];
  }

  function create(room: string, password: string, signalingOn: boolean) {
    // signaling 不传 = 默认公共信令地址;传 [] = 不连任何信令服务器,
    // 只剩 BroadcastChannel 近路(同源标签页之间照常同步)。
    const p = new WebrtcProvider(room, doc, {
      ...(signalingOn ? {} : { signaling: [] }),
      ...(password !== '' ? { password } : {}),
    });
    provider = p;
    connected = false;
    synced = false;
    lastEvent = '已创建 Provider';
    p.on('status', ({ connected: next }) => {
      connected = next;
      lastEvent = next
        ? 'status:connected=true(正在寻找对等端)'
        : 'status:connected=false(已离开)';
      attachSignaling(p);
      draw();
    });
    p.on('synced', ({ synced: next }) => {
      synced = next;
      lastEvent = next
        ? 'synced=true(与全部 WebRTC 对等端完成握手)'
        : 'synced=false';
      draw();
    });
    p.on('peers', ({ added, removed, webrtcPeers, bcPeers }) => {
      lastEvent = `peers:+${added.length} -${removed.length}(WebRTC ${webrtcPeers.length} / BC ${bcPeers.length})`;
      draw();
    });
    p.awareness.on('update', () => {
      draw();
    });
    p.awareness.setLocalStateField('user', {
      name: selfName,
      color: selfColor,
    });
    appliedConnected = true;
    if (!desiredConnected) {
      // 「加入房间」未勾选:构造即 connect,立即断开。
      p.disconnect();
      appliedConnected = false;
    }
    attachSignaling(p);
    draw();
  }

  function rebuild(room: string, password: string, signalingOn: boolean) {
    const key = `${room} ${password} ${signalingOn}`;
    if (provider !== null && key === providerKey) {
      return;
    }
    providerKey = key;
    const old = provider;
    provider = null;
    detachSignaling();
    if (old !== null) {
      old.destroy();
      // destroy 内部等 key 落定后才注销房间;排在其后,新房间才不会撞名。
      destroyChain = old.key.then(
        () => undefined,
        () => undefined,
      );
    }
    const myToken = ++createToken;
    void destroyChain.then(() => {
      if (myToken === createToken) {
        create(room, password, signalingOn);
      }
    });
  }

  function setConnected(next: boolean) {
    desiredConnected = next;
    if (provider === null || appliedConnected === next) {
      return;
    }
    appliedConnected = next;
    if (next) {
      provider.connect();
    } else {
      provider.disconnect();
    }
    attachSignaling(provider);
    draw();
  }

  function setText(value: string) {
    if (text.toString() === value) {
      return;
    }
    doc.transact(() => {
      text.delete(0, text.length);
      if (value.length > 0) {
        text.insert(0, value);
      }
    });
    draw();
  }

  doc.on('update', (_update: Uint8Array, origin: unknown) => {
    // y-webrtc 合入远端 update 时 origin 是 Room 实例(BC 与 WebRTC 通道相同)。
    if (origin !== null && origin === provider?.room) {
      received += 1;
    } else {
      localUpdates += 1;
    }
    draw();
  });

  function shortId(id: string): string {
    return id.slice(0, 4);
  }

  function signalingSummary(): string {
    if (signalingConns.length === 0) {
      return '未配置(仅 BroadcastChannel)';
    }
    // disconnect → connect 后数组里可能残留旧连接,按 url 去重、保留最新。
    const byUrl = new Map<string, SignalingConnLike>();
    signalingConns.forEach((conn) => {
      byUrl.set(conn.url, conn);
    });
    return Array.from(byUrl.values())
      .map(
        (conn) =>
          `${conn.url.replace('wss://', '')} ${
            conn.connected ? '已连接' : conn.connecting ? '连接中' : '已断开'
          }`,
      )
      .join(' / ');
  }

  function snapshot(): TabSyncSnapshot {
    const room = provider?.room ?? null;
    return {
      connected,
      synced,
      signaling: signalingSummary(),
      selfPeer: room ? shortId(room.peerId) : '…',
      webrtcPeers: room?.webrtcConns.size ?? 0,
      bcPeers: room?.bcConns.size ?? 0,
      online: provider?.awareness.getStates().size ?? 0,
      localUpdates,
      received,
      maxConns: provider ? String(provider.maxConns) : '…',
      channel: provider?.roomName ?? '…',
      lastEvent,
    };
  }

  function roundRectPath(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function drawChip(
    x: number,
    y: number,
    label: string,
    color: string,
  ): number {
    g.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    const w = g.measureText(label).width + 20;
    g.fillStyle = '#ffffff';
    g.strokeStyle = color;
    roundRectPath(x, y, w, 22, 11);
    g.fill();
    g.stroke();
    g.fillStyle = color;
    g.beginPath();
    g.arc(x + 10, y + 11, 3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#172033';
    g.fillText(label, x + 17, y + 15);
    return w;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    const snap = snapshot();
    const cx = width / 2;

    // 顶部:信令服务器行——只是「介绍人」,不搬运文档内容。
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.textAlign = 'center';
    const signalingOn = signalingConns.length > 0;
    const anyUp = signalingConns.some((conn) => conn.connected);
    g.fillStyle = signalingOn ? (anyUp ? '#059669' : '#d97706') : '#94a3b8';
    g.fillText(`信令:${snap.signaling}`, cx, 22);
    g.textAlign = 'left';

    // 左侧:本标签页面板。
    const panelTop = 40;
    const panelBottom = height - 66;
    const leftWidth = Math.min(width * 0.42, 320);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#cbd5e1';
    g.beginPath();
    g.rect(16, panelTop, leftWidth, panelBottom - panelTop);
    g.fill();
    g.stroke();
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText(
      `本标签页 · peerId ${snap.selfPeer} · maxConns ${snap.maxConns}`,
      28,
      panelTop + 20,
    );
    g.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#172033';
    const preview = text.toString();
    let previewLine = '';
    let py = panelTop + 46;
    let overflow = false;
    for (const ch of preview) {
      if (
        g.measureText(previewLine + ch).width > leftWidth - 28 &&
        previewLine !== ''
      ) {
        g.fillText(previewLine, 28, py);
        py += 20;
        previewLine = ch;
        if (py > panelBottom - 24) {
          overflow = true;
          break;
        }
      } else {
        previewLine += ch;
      }
    }
    if (overflow) {
      g.fillText('…', 28, py);
    } else {
      g.fillText(previewLine === '' ? '(空)' : previewLine, 28, py);
    }

    // 右侧:对等端列表。BC 对等端(绿)与 WebRTC 对等端(蓝)分开画——
    // 同浏览器标签页出现在绿色区,其他浏览器 / 设备出现在蓝色区。
    const listX = 16 + leftWidth + 20;
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText(
      `对等端:WebRTC ${snap.webrtcPeers} / BC ${snap.bcPeers} · 在线 ${snap.online} 端`,
      listX,
      panelTop + 20,
    );
    const room = provider?.room ?? null;
    let chipY = panelTop + 34;
    const chipRows: Array<[string, string]> = [];
    room?.bcConns.forEach((id) => {
      chipRows.push([`BC · ${shortId(id)}`, '#059669']);
    });
    room?.webrtcConns.forEach((_conn, id) => {
      chipRows.push([`RTC · ${shortId(id)}`, '#4f7cff']);
    });
    let chipX = listX;
    chipRows.forEach(([label, color]) => {
      const w = drawChip(chipX, chipY, label, color);
      chipX += w + 8;
      if (chipX > width - 90) {
        chipX = listX;
        chipY += 30;
      }
    });
    if (chipRows.length === 0) {
      g.fillStyle = '#94a3b8';
      g.fillText('还没有对等端。', listX, chipY + 16);
      g.fillText('复制本标签页(同一浏览器),', listX, chipY + 36);
      g.fillText('或在其他浏览器打开相同房间名。', listX, chipY + 56);
    }

    // 底部:状态与 BC 通道名(= 房间名,不拼信令地址)。
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = snap.connected ? '#059669' : '#94a3b8';
    g.textAlign = 'center';
    g.fillText(
      snap.connected
        ? `connected=true(正在寻找对等端)· synced=${snap.synced}`
        : '已离开房间',
      cx,
      height - 40,
    );
    g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#94a3b8';
    g.fillText(
      `BC 通道:${snap.channel}(同源标签页直达,不经过网络)`,
      cx,
      height - 18,
    );
    g.textAlign = 'left';

    emit(snap);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      rebuild(options.room, options.password, options.signaling);
      setConnected(options.connected);
      setText(options.text);
    },
    dispose() {
      resizeObserver.disconnect();
      createToken += 1;
      detachSignaling();
      provider?.destroy();
      doc.destroy();
    },
  };
}
