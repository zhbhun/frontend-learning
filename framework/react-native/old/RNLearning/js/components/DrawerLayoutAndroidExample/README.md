
功能

- 抽屉打开方式：手势，API
- 抽屉关闭方式：手势，API，点击遮挡层

# 内容

- `renderNavigationView`：抽屉视图
- `childern`：主视图

**备注：抽屉视图和主视图的高度与所在的视图区域一致，不要误认为抽屉打开时高度与设备高度一致。**

# 样式

- `drawerLockMode`：设置抽屉的锁定模式，影响手势操作

    - `unlocked`：默认值，可以通过手势打开和关闭抽屉；
    - `locked-closed`：不可以使用手势打开，且自动关闭抽屉；
    - `locked-open`：不可以使用手势关闭，且自动打开抽屉；

    **备注：无论哪种锁定模式，都可以使用 `openDrawer` / `closeDrawer` 打开或关闭。**

- `drawerPosition`：抽屉从哪一边打开

    - `DrawerLayoutAndroid.positions.Left`：默认值，左侧
    - `DrawerLayoutAndroid.positions.Right`：右侧

    **疑问：在抽屉打开状态下更新位置，抽屉位置不会立刻变化，但会影响抽屉的关闭动画，并且在下次打开抽屉时起作用。**

- `drawerWidth`：抽屉宽度，**material design 推荐的宽度等于屏幕宽度减去 56dp**；
- `statusBarBackgroundColor`：**使抽屉打开时占据整个屏幕的高度（状态栏是透明的），在没有打开的时候 `statusBarBackgroundColor` 作为状态栏颜色使用且不透明，默认是没有设置的**；

    - 不是根视图下使用 DrawerLayoutAndroid 的 statusBarBackgroundColor，会导致 DrawerLayoutAndroid 出现一个状态栏高度的 View，其背景颜色正好是 statusBarBackgroundColor，注意避免在这种情况使用 statusBarBackgroundColor；
    - 利用 statusBarBackgroundColor 参照 material design 处理状态栏（抽屉未打开时，状态栏颜色为 statusBarBackgroundColor，打开后状态栏变成透明）；
    - 除了使用 statusBarBackgroundColor 外，可以使用 StatusBar 组件自定义状态栏；

- `drawerBackgroundColor`：抽屉背景色，默认白色，可以使用 rgba 设置透明色
- `keyboardDismissMode`：是否在拖动抽屉的时候隐藏键盘，默认为 `none`，表示不隐藏。如果设置为 `on-drag`，那么在开始拖动的时候就隐藏键盘。

# 事件
**有哪些事件？**

- `onDrawerClose`：抽屉关闭后触发
- `onDrawerOpen`：抽屉打开后触发
- `onDrawerSlide`：抽屉打开或关闭动画时重复触发
- `onDrawerStateChanged`：抽屉状态变化时触发

    - `Idle`：空闲，交互结束后触发的事件，即抽屉已打开或关闭
    - `dragging`：拖拽中，开始拖动抽屉时触发
    - `settling`：停靠中，开始打开或关闭抽屉时触发

    备注：在手势开闭时，dragging 和 settling 的触发顺序不一定。

**用户可能有那些行为**

- 点击导航菜单打开抽屉（API）
- 点击遮挡层关闭抽屉（API）
- 手势打开抽屉
- 手势关闭抽屉
- 准备手势打开抽屉后放弃
- 准备手势关闭抽屉后放弃

**交互时会触发那些事件和触发顺序？**

- 点击导航菜单打开抽屉（API）

    1. `onDrawerStateChanged` with Settling
    2. `onDrawerSlide`...
    3. `onDrawerOpen`
    4. `onDrawerStateChanged` with Idle

- 点击遮挡层关闭抽屉（API）

    1. `onDrawerStateChanged` with Settling
    2. `onDrawerSlide`...
    3. `onDrawerClose`
    4. `onDrawerStateChanged` with Idle

- 手势打开

    1. `onDrawerStateChanged` with Dragging
    2. `onDrawerSlide`...
    3. `onDrawerStateChanged` with Settling
    4. `onDrawerOpen`
    5. `onDrawerStateChanged` with Idle

- 手势关闭

    1. `onDrawerStateChanged` with Dragging
    2. `onDrawerSlide`...
    3. `onDrawerStateChanged` with Settling
    4. `onDrawerClose`
    5. `onDrawerStateChanged` with Idle

- 准备手势关闭抽屉后放弃 / 准备手势关闭抽屉后放弃

    1. `onDrawerStateChanged` with Dragging
    2. `onDrawerSlide`...
    3. `onDrawerStateChanged` with Settling
    4. `onDrawerStateChanged` with Idle

    


# API
- `openDrawer`
- `closeDrawer`

# 原理
```
AndroidDrawerLayout // 
    View
        StatusBar // 启用 statusBarBackgroundColor 时渲染：透明 + statusBarBackgroundColor
        View // 启用 statusBarBackgroundColor 时渲染：StatusBar.currentHeight + statusBarBackgroundColor
        this.props.children
    View // drawerWidth + drawerBackgroundColor
        this.props.renderNavigationView()
        View // 启用 statusBarBackgroundColor 时渲染：绝对定位顶部 +  StatusBar.currentHeight + 透明灰色
```

- 知道 AndroidDrawerLayout 是 View 类型的组件，默认 flex 等于 1，可以按照 View 来使用 AndroidDrawerLayout，例如调整 AndroidDrawerLayout 的大小样式，但一般没有必要；
- 知道 statusBarBackgroundColor 处理机制；
- ...

# 实际应用
TODO
