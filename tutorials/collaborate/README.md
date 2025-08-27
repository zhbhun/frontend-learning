## CRDT / 无冲突复制数据类型

每个操作都是 幂等的、可交换的、可合并的，即使乱序传播也不会产生冲突。所有副本只要接收到相同的操作集，最终状态必然一致。

原理：

1. 数据结构本身保证 并发安全。
2. 常见 CRDT 类型：

  - G-Counter / PN-Counter（计数器）
  - OR-Set（集合）
  - RGA / LSEQ / Logoot / YATA（序列结构，解决协同编辑）

特点：

- 去中心化：不需要服务器做 transform，本地即可应用操作，之后再异步同步。
- 算法天然保证收敛性（Strong Eventual Consistency）。
- 缺点是元数据开销较大（例如每个字符要带唯一 ID），性能在极大规模下可能有压力。

实现：

- [yjs](https://github.com/yjs/yjs) / https://github.com/yjs/y-webrtc - Shared data types for building collaborative software
- [automerge](https://github.com/automerge/automerge) - A JSON-like data structure (a CRDT) that can be modified concurrently by different users, and merged again automatically.
- [FluidFramework](https://github.com/microsoft/FluidFramework) - Library for building distributed, real-time collaborative web applications
- [SyncedStore](https://github.com/yousefed/SyncedStore) - SyncedStore CRDT is an easy-to-use library for building live, collaborative applications that sync automatically.


## OT / 操作变换

用户在本地生成操作（例如插入、删除），如果远端也有操作并发发生，就需要通过 操作变换函数 (transform) 来调整本地/远端操作的作用位置，保证不同应用顺序最终能收敛到同样的文档状态。

原理：

1. 用户 A 在文档第 3 个位置插入 a，同时用户 B 在第 2 个位置删除了 b。
2. 当 A 收到 B 的删除操作时，需要先“变换”自己的插入位置（因为删除可能影响索引位置），才能保证最终结果正确。
3. 这种变换需要定义 一系列 transform 函数，对所有操作对进行适配。

特点

1. 需要 中心服务器 或强同步机制（因为要保证操作按顺序广播，并进行 transform）。
2. 算法设计复杂：要定义 transform 表，保证 可收敛性 (convergence)、因果性 (causality)、意图保持 (intention preservation)。
3. 在 Google Docs、Etherpad 早期版本等广泛使用。

实现：

- [sharedb](https://github.com/share/sharedb) - Realtime database backend based on Operational Transformation (OT)

## 其他

- [replicache](https://github.com/rocicorp/replicache) - Realtime Sync for Any Backend Stack
- [gun](https://github.com/amark/gun) - An open source cybersecurity protocol for syncing decentralized graph data.
- [OrbitDB](https://github.com/orbitdb/orbitdb) - Peer-to-Peer Databases for the Decentralized Web
