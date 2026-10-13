# 学习笔记：Lottie（Web 动画）

## 偏好
- 主题为 Lottie 在 Web 端的完整能力地图：lottie-web 运行时、播放控制与交互、素材与性能工程化、制作流程一门课（bodymovin 导出、AE 特性支持、设计协作注意点，不深入 AE 操作本身）、JSON 格式概览一门课（读懂顶层结构，为调试排错服务，不深入手改关键帧数据）、LottieFiles 生态（lottie-player、lottie-interactivity、dotLottie）。
- 其他动画方案（Rive、SVGA、Motion One、GSAP 等）不单独开课，最多在对比性内容中提及。
- 课程范例统一用原生 HTML/JS + lottie-web（CDN 或 npm 引入），与工作区现有 `examples/` 一致；运行环境为现代浏览器。
- 教程正文、标题、说明、示例界面文案和代码注释使用中文；路径、命令、包名、API 名称和代码标识符保留英文；可接受英文资源，优先官方文档和一手资料。

## 工作笔记
- 根目录 `README.md` 是用户自行维护的资源收藏，不作为手册产物修改。
- 工作区已有 `examples/hello`（lottie-web SVG 渲染器加载 data.json）和 `examples/player`（lottie-player）两个原生 HTML 演示，可作课程素材参考。
- Storybook 学习工作区已初始化：npm + `@storybook/html-vite` 10.5.6，验证用示例课在 `cheatsheets/sample-course/`。
