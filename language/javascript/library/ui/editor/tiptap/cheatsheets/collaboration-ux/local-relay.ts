/**
 * provider 空实现：把两份 Y.Doc 直连起来，演示真实 provider 的最小职责。
 *
 * 一个协作 provider 只需要做三件事：
 * 1. 文档内容：把本地 Y.Doc 的二进制更新转发给房间里的其他人；
 * 2. 在线状态：把 awareness 的二进制更新转发出去（CollaborationCaret 的光标走这条通道）；
 * 3. 初始同步：新成员加入时先拉一次全量状态。
 *
 * 这里用 30ms 延迟投递模拟真实网络的异步往返：两端的并发修改在发出时互不知晓，
 * 到达对方后才由 CRDT 合并——这正是并发合并范例想要观察的时序。
 */
import * as Y from 'yjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness';

/** 转发出去的更新都带这个 origin，回程时据此跳过，避免死循环 */
const RELAY_ORIGIN = 'collab-ux-relay';

/** 模拟网络的单程延迟；两端的并发插入在这段窗口内互不可见 */
const RELAY_LATENCY_MS = 30;

interface AwarenessChange {
  added: number[];
  updated: number[];
  removed: number[];
}

export interface RelayPeer {
  doc: Y.Doc;
  awareness: Awareness;
}

export function createPeer(): RelayPeer {
  const doc = new Y.Doc();
  // Awareness 挂在自己的 Y.Doc 上：clientID 取自 doc，两位“用户”的 ID 天然不同
  return { doc, awareness: new Awareness(doc) };
}

function deliver(job: () => void, receiver: RelayPeer): void {
  window.setTimeout(() => {
    if (!receiver.doc.isDestroyed) {
      job();
    }
  }, RELAY_LATENCY_MS);
}

export function connectPeers(a: RelayPeer, b: RelayPeer): void {
  // 握手：各拉一次对方的全量文档状态（此时 awareness 大多为空，双向同步一次兜底）
  Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc), RELAY_ORIGIN);
  Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc), RELAY_ORIGIN);

  // —— 文档内容通道 ——
  const forwardDoc = (from: RelayPeer, to: RelayPeer): void => {
    from.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === RELAY_ORIGIN) {
        return; // 这是对方同步过来的远端变更，不能再转发回去
      }
      deliver(() => Y.applyUpdate(to.doc, update, RELAY_ORIGIN), to);
    });
  };
  forwardDoc(a, b);
  forwardDoc(b, a);

  // —— 在线状态（awareness）通道 ——
  const forwardAwareness = (from: RelayPeer, to: RelayPeer): void => {
    from.awareness.on(
      'update',
      (change: AwarenessChange, origin: unknown) => {
        if (origin === RELAY_ORIGIN) {
          return;
        }
        const clients = [...change.added, ...change.updated, ...change.removed];
        deliver(() => {
          // 已下线成员的 state 会被编码为 null，对方收到后将其移出名单
          applyAwarenessUpdate(
            to.awareness,
            encodeAwarenessUpdate(from.awareness, clients),
            RELAY_ORIGIN,
          );
        }, to);
      },
    );
  };
  forwardAwareness(a, b);
  forwardAwareness(b, a);
}

export function destroyPeer(peer: RelayPeer): void {
  // doc.destroy() 会连带 destroy awareness：本地状态置 null 并广播“我下线了”
  peer.doc.destroy();
}
