# 学习笔记：Tauri

## 偏好
- 手册针对 Tauri 2.x（当前稳定版）；`tester/` 里的 Tauri 1.x 旧工程仅作对照，课程一律以 2.x API、配置和权限体系为准。
- 课程示例前端使用 React + TypeScript；Tauri 与 React 的集成模式（hooks 封装 invoke、事件订阅、状态共享）属于课程内容本身。
- 桌面优先：路线主体覆盖 macOS/Windows/Linux 桌面开发，iOS/Android 作为靠后的进阶阶段；日常开发环境为 macOS（Apple Silicon）。
- Rust 够用即讲：课程内用到的 Rust 语法（命令、状态管理、错误处理、异步）随用随讲，不设系统性的 Rust 教学阶段。
- 范例媒介：正文概念演示优先在 Storybook 内用 Canvas / 模拟界面呈现；涉及真实 Tauri 运行时行为（窗口、IPC 往返、打包等）的概念，在对应课程目录附带最小可运行的 Tauri 示例工程用于本机验证。

## 工作笔记
- `tester/` 是 Tauri 1.x + React 18 的旧试验工程；1→2 的配置与 API 迁移可作课程素材。
