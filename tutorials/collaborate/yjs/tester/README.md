# 协同 Todo List

一个基于 Yjs 实现的实时协同 Todo List 应用。

## 功能特性

✨ **实时协同编辑**
- 多用户同时编辑，实时同步
- 显示在线用户数
- 连接状态指示

📝 **Todo 功能**
- 添加新任务
- 标记完成/未完成
- 删除任务
- 实时统计

🎨 **现代化界面**
- Tailwind CSS 样式
- 响应式设计
- 流畅动画效果

## 技术栈

- React 19
- TypeScript
- Yjs - CRDT 协同编辑框架
- y-websocket - WebSocket Provider
- Tailwind CSS
- Vite

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 Yjs WebSocket 服务器（端口 5174）

在 `demo-server` 目录下运行：

```bash
cd ../demo-server
node demo-server.js
```

服务器将在 `ws://localhost:5174` 启动。

### 3. 启动前端应用

回到 todo 目录：

```bash
cd ../todo
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 4. 测试协同功能

打开多个浏览器窗口或标签页，访问 `http://localhost:5173`：
- 在任意窗口添加、修改或删除 todo
- 所有窗口将实时同步更新
- 查看右上角的在线用户数

## 项目结构

```
todo/
├── src/
│   ├── App.tsx          # 主应用组件（集成 Yjs）
│   ├── main.tsx         # 入口文件
│   └── index.css        # 全局样式
├── package.json
└── vite.config.ts
```

## Yjs 集成说明

### 核心概念

1. **Y.Doc**: Yjs 文档，存储共享数据
2. **Y.Array**: 共享数组类型，用于存储 todo 列表
3. **WebsocketProvider**: 通过 WebSocket 同步数据
4. **Awareness**: 追踪在线用户状态

### 关键实现

```typescript
// 创建 Yjs 文档
const ydoc = new Y.Doc()

// 连接 WebSocket 服务器
const provider = new WebsocketProvider(
  'ws://localhost:5174',
  'todo-list',
  ydoc
)

// 获取共享数组
const ytodos = ydoc.getArray('todos')

// 监听数据变化
ytodos.observe(() => {
  // 更新 React 状态
})
```

## 开发说明

- 所有数据操作都通过 Yjs 的 Y.Array 进行
- 不要直接修改 React state，而是修改 Yjs 数据结构
- Yjs 会自动处理冲突解决和数据同步

## 故障排除

### 连接失败

- 确保 WebSocket 服务器在 5174 端口运行
- 检查浏览器控制台是否有错误信息
- 确认防火墙没有阻止 WebSocket 连接

### 数据不同步

- 刷新页面重新连接
- 检查所有客户端是否连接到同一个服务器
- 查看服务器日志确认连接状态

## License

MIT
