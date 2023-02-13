## 算法

- OT(Operational Transformation)

    - easysync：是一种基于操作转换（Operation Transformation，简称 OT）的算法。它将每个用户的操作转换为一个有序的操作序列，并通过协作算法来保证每个用户看到的文档内容是相同的。如果多个用户同时编辑同一个文档，则 easysync 将这些操作转换并进行合并，以确保最终的文档内容是正确的。
    - ot-json：是一种基于 JSON 数据格式的 OT 算法。它将 JSON 数据的修改转换为操作，并通过 OT 算法来保证多个用户对同一个 JSON 数据进行的修改不会发生冲突。ot-json 支持多种类型的 JSON 数据操作，如新增、删除、替换等。

        easysync 更为通用，可以用于各种数据类型的协同，而 ot-json 则更适合于处理 JSON 数据的协同。

    - OTCD(Operational Transformation with Conflict Detection)：OTCD 是一种 OT 算法，它增加了冲突检测的能力。OTCD 在操作转换之前，先检测操作之间的冲突，并对冲突进行解决。通过增加冲突检测能力，OTCD 能够更加精确地处理冲突问题。

- CRDT（Conflict-free Replicated Data Type）：CRDT 是一种通过副本来实现数据同步和复制的数据类型。它通过实现一些特殊的操作（如 LWW-Element-Set 和 OR-Set 等）来确保在分布式系统中的数据同步和复制不会发生冲突。
- DS(Differential Synchronization)：Differential Synchronization 是一种通过比较修改前后的文本差异来实现协同编辑的算法。它将文档分成两个版本（本地版本和远程版本），并在两个版本之间进行文本差异比较和同步，以保证最终的文档内容是一致的。

## 实现

存储

- [yjs](https://github.com/yjs/yjs): Shared data types for building collaborative software
- [ShareJS](https://github.com/josephg/ShareJS)：ShareJS 是一个实时协同编辑库，它结合了 OT 和 CRDT 算法来解决协同编辑中的冲突问题。ShareJS 支持多种数据类型的协同编辑，如文本、JSON、Rich Text 等。
- [ShareDB](https://github.com/share/sharedb): Realtime database backend based on Operational Transformation (OT)
- [togetherjs](https://github.com/jsfiddle/togetherjs) - A service for your website that makes it surprisingly easy to collaborate in real-time.

编辑器

- [etherpad-lite](https://github.com/ether/etherpad-lite)
- [firepad](https://github.com/FirebaseExtended/firepad) - Collaborative Text Editor Powered by Firebase
- [derby](https://github.com/derbyjs/derby): MVC framework making it easy to write realtime, collaborative applications that run in both Node.js and browsers
- [quill-cursors](https://github.com/reedsy/quill-cursors) - A multi cursor module for Quill text editor.

## 参考文献

- [开发在线文档时，这个技术难点你解决了吗？](https://zhuanlan.zhihu.com/p/394302974)
- [揭开在线协作的神秘面纱 – OT 算法](http://www.alloyteam.com/2019/07/13659/)
- [在线文档 - 为什么需要OT算法](https://zhuanlan.zhihu.com/p/377481761)
- [飞书文档前端使用了什么技术呢?](https://www.zhihu.com/question/548405585/answer/2661848985?utm_oi=35897751896064&utm_source=pocket_mylist)
- [Operational-Transformation/ot.js](https://github.com/Operational-Transformation/ot.js)
