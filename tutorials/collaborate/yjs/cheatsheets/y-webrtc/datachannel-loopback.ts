/**
 * 范例介绍:同一页面里的两个 Y.Doc 各挂一条原生 RTCPeerConnection,手工完成
 * 一次「信令交换」——offer / answer / ICE 候选通过本页内的直接函数调用传递;
 * 在真实场景中,这些描述串就是 y-webrtc 经信令服务器转发的 signal 消息,
 * 信令服务器除此之外什么都不做。DataChannel 打开后,两端互发 SyncStep1 完成
 * 握手,此后逐条互发增量 update——与 y-webrtc 内部跑的是同一套 y-protocols
 * 消息,全程零网络、零服务器。
 * 输入:Controls 的「文档 A 内容」(textA)、「文档 B 内容」(textB)与
 * 「建立连接」(connected)。
 * 预期:connected 时 ICE 状态走到 connected / completed、通道 open,互发
 * SyncStep1 / SyncStep2 后两端收敛;断开期间的编辑在重新建连握手后按差量
 * 自动追平。
 * 阅读主线:createDataChannelLoopback → connect(手工传递描述串)→
 * bindChannel(SyncStep1 / readSyncMessage / writeUpdate)→ setText → draw。
 */
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface DataChannelLoopbackOptions {
  textA: string;
  textB: string;
  connected: boolean;
}

export interface DataChannelLoopbackSnapshot {
  connA: string;
  connB: string;
  iceA: string;
  iceB: string;
  channel: string;
  localUpdatesA: number;
  receivedA: number;
  localUpdatesB: number;
  receivedB: number;
  lenA: number;
  lenB: number;
  consistent: boolean;
}

export interface DataChannelLoopbackInstance {
  update(options: DataChannelLoopbackOptions): void;
  dispose(): void;
}

// 合入远端 update 时的固定 origin:y-webrtc 用 Room 实例,这里用常量,
// 作用相同——本地转发逻辑据此挡住回声。
const RTC_ORIGIN = 'rtc-loopback';

export function createDataChannelLoopback(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DataChannelLoopbackSnapshot) => void,
): DataChannelLoopbackInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  const docA = new Y.Doc();
  const docB = new Y.Doc();
  const textA = docA.getText('shared');
  const textB = docB.getText('shared');

  let pcA: RTCPeerConnection | null = null;
  let pcB: RTCPeerConnection | null = null;
  let channelAB: RTCDataChannel | null = null;
  let channelBA: RTCDataChannel | null = null;
  let localUpdatesA = 0;
  let localUpdatesB = 0;
  let receivedA = 0;
  let receivedB = 0;
  let wantConnected = false;

  function sendUpdate(channel: RTCDataChannel | null, update: Uint8Array) {
    if (channel === null || channel.readyState !== 'open') {
      return;
    }
    const encoder = encoding.createEncoder();
    syncProtocol.writeUpdate(encoder, update);
    channel.send(encoding.toUint8Array(encoder));
  }

  docA.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === RTC_ORIGIN) {
      receivedA += 1;
    } else {
      localUpdatesA += 1;
      sendUpdate(channelAB, update);
    }
    draw();
  });
  docB.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === RTC_ORIGIN) {
      receivedB += 1;
    } else {
      localUpdatesB += 1;
      sendUpdate(channelBA, update);
    }
    draw();
  });

  // 通道上的消息协议与 y-webrtc 完全一致:通道一开就发 SyncStep1(双方都发),
  // 收到 SyncStep1 回 SyncStep2,收到 SyncStep2 / Update 直接合入。
  function bindChannel(channel: RTCDataChannel, doc: Y.Doc) {
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => {
      const encoder = encoding.createEncoder();
      syncProtocol.writeSyncStep1(encoder, doc);
      channel.send(encoding.toUint8Array(encoder));
      draw();
    };
    channel.onmessage = (event: MessageEvent) => {
      const decoder = decoding.createDecoder(
        new Uint8Array(event.data as ArrayBuffer),
      );
      const encoder = encoding.createEncoder();
      // readSyncMessage:SyncStep1 的回复(SyncStep2)写进 encoder,其余只合入。
      syncProtocol.readSyncMessage(decoder, encoder, doc, RTC_ORIGIN);
      if (encoding.hasContent(encoder)) {
        channel.send(encoding.toUint8Array(encoder));
      }
      draw();
    };
    channel.onclose = () => draw();
  }

  async function negotiate(a: RTCPeerConnection, b: RTCPeerConnection) {
    // 真实场景中,localDescription 与 ICE candidate 经信令服务器转发给对端;
    // 这里同页直传,效果等同。setLocalDescription() 无参调用 = createOffer/
    // createAnswer + 开始 ICE 收集。
    await a.setLocalDescription();
    if (pcA !== a) {
      return;
    }
    await b.setRemoteDescription(a.localDescription as RTCSessionDescriptionInit);
    await b.setLocalDescription();
    if (pcB !== b) {
      return;
    }
    await a.setRemoteDescription(b.localDescription as RTCSessionDescriptionInit);
  }

  function connect() {
    if (pcA !== null) {
      return;
    }
    const a = new RTCPeerConnection();
    const b = new RTCPeerConnection();
    pcA = a;
    pcB = b;
    // ICE 候选同样「手递手」交给对端——对应 signal 消息里的 candidate 载荷。
    a.onicecandidate = (event) => {
      if (event.candidate && pcB === b) {
        void b.addIceCandidate(event.candidate);
      }
    };
    b.onicecandidate = (event) => {
      if (event.candidate && pcA === a) {
        void a.addIceCandidate(event.candidate);
      }
    };
    a.onconnectionstatechange = () => draw();
    b.onconnectionstatechange = () => draw();
    a.oniceconnectionstatechange = () => draw();
    b.oniceconnectionstatechange = () => draw();

    channelAB = a.createDataChannel('yjs-sync');
    bindChannel(channelAB, docA);
    b.ondatachannel = (event) => {
      channelBA = event.channel;
      bindChannel(event.channel, docB);
    };
    void negotiate(a, b);
    draw();
  }

  function disconnect() {
    channelAB?.close();
    channelBA?.close();
    pcA?.close();
    pcB?.close();
    channelAB = null;
    channelBA = null;
    pcA = null;
    pcB = null;
    draw();
  }

  function setConnected(next: boolean) {
    if (next === wantConnected) {
      return;
    }
    wantConnected = next;
    if (next) {
      connect();
    } else {
      disconnect();
    }
  }

  function setText(
    doc: Y.Doc,
    text: Y.Text,
    value: string,
  ) {
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

  function snapshot(): DataChannelLoopbackSnapshot {
    return {
      connA: pcA?.connectionState ?? 'closed',
      connB: pcB?.connectionState ?? 'closed',
      iceA: pcA?.iceConnectionState ?? 'closed',
      iceB: pcB?.iceConnectionState ?? 'closed',
      channel: channelAB?.readyState ?? 'closed',
      localUpdatesA,
      receivedA,
      localUpdatesB,
      receivedB,
      lenA: textA.length,
      lenB: textB.length,
      consistent: textA.toString() === textB.toString(),
    };
  }

  function drawWrappedText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
  ) {
    g.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#172033';
    let line = '';
    let cy = y;
    let drawn = 0;
    const flush = (content: string) => {
      g.fillText(content, x, cy);
      cy += lineHeight;
      drawn += 1;
    };
    for (const ch of text) {
      if (g.measureText(line + ch).width > maxWidth && line !== '') {
        if (drawn === maxLines - 1) {
          flush(`${line} …`);
          return;
        }
        flush(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line !== '' || drawn === 0) {
      flush(line === '' ? '(空)' : line);
    }
  }

  function drawPanel(
    x: number,
    top: number,
    width: number,
    bottom: number,
    text: string,
    label: string,
  ) {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#cbd5e1';
    g.beginPath();
    g.rect(x, top, width, bottom - top);
    g.fill();
    g.stroke();

    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText(label, x + 12, top + 18);

    const maxLines = Math.max(1, Math.floor((bottom - top - 66) / 20));
    drawWrappedText(text, x + 12, top + 44, width - 24, 20, maxLines);

    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText(`${text.length} 字符`, x + 12, bottom - 14);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(260, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    const { connA, connB, channel } = snapshot();

    // 顶部:DataChannel 直连链路,颜色跟随通道状态。
    const open = channel === 'open';
    const cx = width / 2;
    g.strokeStyle = open ? '#4f7cff' : '#cbd5e1';
    g.lineWidth = 2;
    g.setLineDash(open ? [] : [5, 4]);
    g.beginPath();
    g.moveTo(56, 40);
    g.lineTo(width - 56, 40);
    g.stroke();
    g.setLineDash([]);
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = open ? '#4f7cff' : '#94a3b8';
    g.textAlign = 'center';
    g.fillText(`DataChannel:${channel}`, cx, 30);
    g.fillStyle = '#94a3b8';
    g.fillText(
      'offer / answer / ICE 候选由本页直传(真实场景经信令服务器转发)',
      cx,
      58,
    );
    g.textAlign = 'left';

    const panelTop = 76;
    const panelBottom = height - 66;
    const panelWidth = width / 2 - 16 - 30;
    drawPanel(16, panelTop, panelWidth, panelBottom, textA.toString(), '文档 A');
    drawPanel(
      width / 2 + 30,
      panelTop,
      panelWidth,
      panelBottom,
      textB.toString(),
      '文档 B',
    );

    // 两面板之间的连接状态标注。
    const midY = (panelTop + panelBottom) / 2;
    g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#64748b';
    g.textAlign = 'center';
    g.fillText(`${connA} / ${connB}`, cx, midY - 6);
    g.textAlign = 'left';

    const { consistent } = snapshot();
    g.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = consistent ? '#059669' : '#d97706';
    g.textAlign = 'center';
    g.fillText(
      consistent
        ? '两端一致(WebRTC 直连,未经过任何服务器)'
        : '已分叉 —— 打开「建立连接」后握手自动追平',
      cx,
      height - 40,
    );

    g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#94a3b8';
    g.fillText(
      '通道消息:SyncStep1 → SyncStep2 → Update(y-protocols,与 y-webrtc 相同)',
      cx,
      height - 18,
    );
    g.textAlign = 'left';

    emit(snapshot());
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      setConnected(options.connected);
      setText(docA, textA, options.textA);
      setText(docB, textB, options.textB);
    },
    dispose() {
      resizeObserver.disconnect();
      disconnect();
      docA.destroy();
      docB.destroy();
    },
  };
}
