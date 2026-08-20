# Phaser

- 1. 上手
  - [1.1 安装](cheatsheets/installation/README.mdx)
    用 npm、CDN 或 Phaser Launcher 安装 Phaser 4，搭建 TypeScript + Vite 项目并启动本地开发服务。
  - [1.2 创建游戏](cheatsheets/game-config/README.mdx)
    用 Game config 配置尺寸、父容器、渲染器与背景，理解 Scale Manager 的缩放适配模式。
  - [1.3 场景生命周期](cheatsheets/scene-lifecycle/README.mdx)
    编写 Scene 类，掌握 preload、create、update 的职责与执行顺序，以及场景的启动、切换与销毁。
  - [1.4 事件与场景通信](cheatsheets/events/README.mdx)
    用 EventEmitter 处理场景与游戏事件，用 data 和 registry 在场景间传递数据。
  - [1.5 第一个小游戏](cheatsheets/first-game/README.mdx)
    综合运用加载、精灵、输入、物理与得分文本，完成一个最小完整可玩的游戏。

- 2. 资源与显示
  - 2.1 资源加载
    - [2.1.1 资源加载器](cheatsheets/asset-loader/README.mdx)
      加载图片、图集、音频与字体，监听加载进度事件，并从缓存读取已加载资源。
    - [2.1.2 纹理图集](cheatsheets/texture-atlas/README.mdx)
      区分单张纹理与纹理图集，掌握图集的制作、加载与帧引用方式。
  - 2.2 显示对象
    - [2.2.1 精灵与图像](cheatsheets/sprites/README.mdx)
      创建 Sprite 与 Image，设置位置、原点、翻转与尺寸，理解两者取舍。
    - [2.2.2 图形绘制](cheatsheets/graphics/README.mdx)
      用 Graphics 与 Shape 对象绘制矩形、圆形、路径等几何图形并设置样式。
    - [2.2.3 文本](cheatsheets/text/README.mdx)
      创建 Text 并配置样式，掌握位图字体与文本的动态更新。
    - [2.2.4 容器与分组](cheatsheets/containers-groups/README.mdx)
      用 Container 与 Group 组织对象层级，理解两者职责差异。
    - [2.2.5 深度与视觉状态](cheatsheets/depth/README.mdx)
      控制深度排序，设置 tint、alpha 与混合模式等视觉状态。
  - 2.3 动画与时间
    - [2.3.1 帧动画](cheatsheets/frame-animations/README.mdx)
      用帧序列创建精灵动画，控制播放、暂停与全局动画管理。
    - [2.3.2 补间](cheatsheets/tweens/README.mdx)
      用 tween 对位置、透明度等属性做插值动画，掌握链式与并发补间。
    - [2.3.3 缓动](cheatsheets/easing/README.mdx)
      选择缓动函数控制补间的速度曲线，理解各曲线的视觉差异。
    - [2.3.4 时钟与计时器](cheatsheets/timers/README.mdx)
      用 Clock 与 Timer Events 定时执行逻辑，处理暂停与时间缩放。
  - 2.4 输入
    - [2.4.1 键盘](cheatsheets/keyboard-input/README.mdx)
      读取按键按下状态与键盘事件，用光标键和 WASD 驱动角色移动。
    - [2.4.2 指针与交互](cheatsheets/pointer-input/README.mdx)
      处理鼠标与触摸指针，为对象设置交互区、拖拽与点击事件。
    - [2.4.3 游戏手柄](cheatsheets/gamepad-input/README.mdx)
      连接手柄，读取按钮、轴与振动反馈。
  - 2.5 摄像机
    - [2.5.1 摄像机控制](cheatsheets/camera-control/README.mdx)
      设置摄像机视口、边界与滚动，让摄像机跟随目标。
    - [2.5.2 摄像机效果](cheatsheets/camera-effects/README.mdx)
      播放 shake、flash、fade 效果，用多摄像机实现分屏与 UI 层。

- 3. 物理与碰撞
  - [3.1 Arcade 物理](cheatsheets/arcade-physics/README.mdx)
    启用 Arcade 物理，用速度、加速度、重力与世界边界驱动刚体运动。
  - [3.2 Arcade 碰撞](cheatsheets/arcade-collision/README.mdx)
    用 collider 与 overlap 处理碰撞检测、分组碰撞回调与调试渲染。
  - [3.3 Matter 物理](cheatsheets/matter-physics/README.mdx)
    启用 Matter 物理引擎，创建刚体、约束与复合体，理解与 Arcade 的取舍。

- 4. 音频与粒子
  - [4.1 音频](cheatsheets/audio/README.mdx)
    加载与播放音频，控制音量、循环与播放标记，处理移动端音频解锁。
  - [4.2 粒子](cheatsheets/particles/README.mdx)
    配置粒子发射器的数量、速度、寿命与纹理，制作爆炸、尾迹等效果。

- 5. 瓦片地图
  - [5.1 瓦片地图](cheatsheets/tilemap/README.mdx)
    用 Tiled 编辑地图并导出 JSON，在 Phaser 中加载图层与图块渲染关卡。
  - [5.2 地图碰撞与交互](cheatsheets/tilemap-collision/README.mdx)
    为图块设置碰撞，解析对象层生成实体，运行时增删图块。

- 6. 进阶
  - 6.1 性能与发布
    - [6.1.1 性能优化](cheatsheets/performance/README.mdx)
      用对象池、纹理预算与渲染批处理控制内存与帧率，测量并定位性能瓶颈。
    - [6.1.2 生产构建](cheatsheets/production-build/README.mdx)
      用 Vite 打包生产版本，优化资源体积与首屏加载策略。
    - [6.1.3 原生打包](cheatsheets/native-packaging/README.mdx)
      用 Capacitor 将 Phaser 游戏打包为移动应用，并了解桌面端方案。
  - 6.2 官方工具
    - [6.2.1 Phaser Launcher](cheatsheets/phaser-launcher/README.mdx)
      用免费官方应用创建项目、使用模板与媒体浏览器管理素材。
    - [6.2.2 Phaser Editor](cheatsheets/phaser-editor/README.mdx)
      用官方可视化编辑器搭建场景、管理资源管线与 AI 辅助工作流。
  - 6.3 渲染进阶
    - [6.3.1 渲染管线](cheatsheets/render-pipelines/README.mdx)
      理解 Phaser 4 新 WebGL 渲染器与管线机制，应用内置特效与自定义 shader。
