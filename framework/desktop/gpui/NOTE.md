# 学习笔记：GPUI

## 偏好
- 手册主题是 GPUI（Zed 出品的 Rust GPU 加速 GUI 框架）本身；假定读者具备 Rust 基础（所有权、trait、async），不教 Rust 语言；不覆盖 Zed 编辑器中与 GPUI 无关的部分。
- 生态深入教学：gpui-kit（原 gpui-component）组件实践单独成阶段，覆盖主题系统、基础组件、数据表格、Dock 布局、编辑器与富内容；Zed 的 ui crate 作为源码阅读入口。
- 课程范例为纯代码讲解：正文以 Rust 代码片段和文字讲解为主，不维护运行截图；多数课程为 docs-only MDX，不为凑交互实例虚构 Web 演示。
- 运行环境以 macOS（Metal）为主；Windows 与 Linux（Wayland/X11）平台差异集中在系统集成课程说明。
- gpui 处于 pre-1.0（撰写时 0.2.x），API 随 Zed 演进变化快；课程基于编写时对应的 docs.rs 版本核对 API，不凭旧版记忆。

## 工作笔记
- 安装入口已演进为 `gpui` + `gpui_platform` 两个 crate，平台走 feature：macOS 需 font-kit 才有真实字形，Linux 需 wayland/x11，Windows 无需 feature；写安装课以官方 README 为准。
- 官方文档分三处：gpui.rs 站点（README、Crate 根文档、Contexts、Key Dispatch、精选示例）、仓库内 `crates/gpui/docs/`（contexts.md、key_dispatch.md）、docs.rs API；示例集中在 `crates/gpui/examples/`（40+ 个），路线能力点基本都有官方示例可对照。
