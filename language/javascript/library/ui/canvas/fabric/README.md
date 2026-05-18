## Fabric

### Canvas

- 选择相关

  - selection	boolean	true	是否允许通过拖拽绘制选框一次性选中多个对象。
  - selectionColor	string	'rgba(100, 100, 255, 0.3)'	框选区域的填充颜色。
  - selectionBorderColor	string	'rgba(255, 255, 255, 0.3)'	框选边框颜色。
  - selectionLineWidth	number	1	框选边框宽度。
  - selectionDashArray	number[]	[]	框选边框虚线样式，例如 [5, 5]。
  - selectionFullyContained	boolean	false	true 时，只有完全被框选框包含的对象才会被选中。
  - selectionKey	`string	string[]`	null

-  对象交互

  - skipTargetFind	boolean	false	true 时鼠标事件不会检测点击了哪个对象（性能优化用）。
  - targetFindTolerance	number	0	鼠标点到对象的容差像素值。
  - perPixelTargetFind	boolean	false	true 时基于像素透明度进行命中检测，而不是包围盒。
  - preserveObjectStacking	boolean	false	true 时选中对象不会自动移到顶层。
  - stopContextMenu	boolean	false	阻止右键菜单弹出。
  - fireMiddleClick	boolean	false	启用鼠标中键事件。
  - fireRightClick	boolean	false	启用鼠标右键事件。

- 拖拽 & 平移

  - isDrawingMode	boolean	false	是否启用自由绘图模式。
  - freeDrawingBrush	fabric.BaseBrush	null	自由绘图使用的画笔对象。
  - moveCursor	string	'move'	拖动对象时鼠标样式。
  - hoverCursor	string	'move'	悬停在对象上时鼠标样式。
  - defaultCursor	string	'default'	默认鼠标样式。

- 缩放 & 视口

  - allowTouchScrolling	boolean	false	触摸设备上是否允许滚动页面（否则会拦截触摸事件）。
  - imageSmoothingEnabled	boolean	true	缩放位图时是否启用平滑。
  - enableRetinaScaling	boolean	true	是否针对 Retina 屏进行缩放。
  - backgroundVpt	boolean	true	背景图是否随视口变换。
  - overlayVpt	boolean	true	前景图是否随视口变换。

- 渲染相关

  - renderOnAddRemove	boolean	true	对象增删后是否立即重绘。
  - controlsAboveOverlay	boolean	false	控制点是否绘制在 overlayImage 之上。
  - skipOffscreen	boolean	false	画布外对象是否跳过渲染（性能优化）。

- 事件 & 性能

  - stopContextMenu	boolean	false	阻止右键菜单。
  - clipPath	fabric.Object	null	给整个画布添加裁剪路径。

### Object

属性

- 位置 & 尺寸

  - left	number	0	X 坐标（相对画布/父组）
  - top	number	0	Y 坐标
  - width	number	0	对象内容宽度（未缩放前）
  - height	number	0	对象内容高度（未缩放前）
  - scaleX	number	1	X 缩放比例
  - scaleY	number	1	Y 缩放比例
  - originX	`'left'	'center'	'right'`
  - originY	`'top'	'center'	'bottom'`

- 外观

  - fill	`string	fabric.Pattern	fabric.Gradient`
  - stroke	`string	null`	null
  - strokeWidth	number	1	描边宽度
  - strokeDashArray	number[]	null	虚线样式（例如 [5, 5]），数组里是交替的实线长度和空白长度。
  - strokeDashOffset	number	0	虚线的起始偏移量（像素）。
  - strokeLineCap	`'butt'	'round'	'square'` 线段端点样式（Path 或虚线末端的形状）。
  - strokeLineJoin	`'miter'	'round'	'bevel'` 两条线段交接处的拐角样式。
  - strokeUniform	boolean	false	缩放时描边是否保持宽度不变
  - strokeMiterLimit	number	4	斜接限制
  - backgroundColor	string	''	对象包围盒背景色
  - shadow	`string	fabric.Shadow`	null

- 透明度 & 显示控制

  - opacity	number	1	透明度（0~1）
  - visible	boolean	true	是否可见
  - globalCompositeOperation	string	source-over	Canvas 合成模式

- 交互性

  - selectable	boolean	true	是否可被选中
  - evented	boolean	true	是否响应鼠标事件
  - hoverCursor	string	null	悬停时鼠标样式
  - moveCursor	string	null	移动时鼠标样式
  - lockMovementX	boolean	false	锁定水平移动
  - lockMovementY	boolean	false	锁定垂直移动
  - lockRotation	boolean	false	锁定旋转
  - lockScalingX	boolean	false	锁定水平缩放
  - lockScalingY	boolean	false	锁定垂直缩放
  - lockSkewingX	boolean	false	锁定水平倾斜
  - lockSkewingY	boolean	false	锁定垂直倾斜
  - hasControls	boolean	true	是否显示控制点
  - hasBorders	boolean	true	是否显示边框
  - perPixelTargetFind	boolean	false	像素级命中检测
  - targetFindTolerance	number	0	命中检测容差像素值
  - hovered	boolean	false	是否处于鼠标悬停状态（内部用）

- 旋转 & 变形

  - angle	number	0	旋转角度（单位：度）
  - flipX	boolean	false	水平翻转
  - flipY	boolean	false	垂直翻转
  - skewX	number	0	X 轴倾斜角度
  - skewY	number	0	Y 轴倾斜角度

- 分组 & 层次

  - clipPath	`fabric.Object	null`	null
  - excludeFromExport	boolean	false	是否在导出 JSON/SVG 时跳过该对象
  - dirty	boolean	false	是否需要重新渲染（内部）
  - parent	fabric.Object	null	父组（Group）引用
  - canvas	fabric.Canvas	null	所属画布引用

- 动画 & 过渡

  - noScaleCache	boolean	false	缩放时不缓存位图（动画性能优化）
  - objectCaching	boolean	true	是否缓存渲染（提升性能）
  - statefullCache	boolean	false	状态变化时自动刷新缓存
  - dirty	boolean	false	是否标记重新渲染

- 数据绑定

  - id	string	''	开发者自定义 ID（不是 Fabric 内置 ID）
  - name	string	''	开发者自定义名称
  - data	any	undefined	存储任意用户数据
  - metadata	any	undefined	扩展用元数据

- 调试 & 内部状态

  - cacheKey	string	自动生成	缓存用唯一键
  - minScaleLimit	number	0.01	最小缩放限制
  - dirty	boolean	false	是否需要重绘

方法

- 渲染与绘制

  - render(): 在指定的上下文 (context) 上渲染对象。
  - drawObject(): 在指定上下文上执行对象的绘制操作。
  - transform(): 渲染对象时，对绘图上下文进行变换（移动、旋转、缩放）。
  - drawBorders(): 绘制对象边界框的边框。
  - strokeBorders(): 自定义控制框边框的绘制方式，例如圆角。
  - drawControls(): 绘制对象边界框的角（控制点）。
  - drawControlsConnectingLines(): 绘制从边界框到控制点的连接线。
  - drawSelectionBackground(): 在对象选择框内绘制一个彩色的背景层。
  - willDrawShadow(): 检查此对象是否会投射带偏移量的阴影。
  - hasFill(): 快速检查对象是否会绘制填充。
  - hasStroke(): 快速检查对象是否会绘制描边。

- 几何、位置与变换

  - setX(): 根据对象的 originX 设置在画布坐标系中的 x 坐标。
  - setY(): 根据对象的 originY 设置在画布坐标系中的 y 坐标。
  - setXY(): 将对象的位置设置到画布坐标系中的一个特定点。
  - getX(): 获取对象在画布坐标系中的 x 坐标。
  - getY(): 获取对象在画布坐标系中的 y 坐标。
  - getXY(): 获取对象在画布坐标系中的 (x, y) 点坐标。
  - setRelativeX(): 在其父容器的坐标系中设置 x 坐标。
  - setRelativeY(): 在其父容器的坐标系中设置 y 坐标。
  - setRelativeXY(): 在其父容器的坐标系中设置 (x, y) 坐标。
  - getRelativeX(): 获取对象相对于其父容器的 x 坐标。
  - getRelativeY(): 获取对象相对于其父容器的 y 坐标。
  - getRelativeXY(): 获取对象相对于其父容器的 (x, y) 点坐标。
  - rotate(): 以对象中心为轴点设置实例的旋转角度。
  - scale(): 等比缩放一个对象。
  - scaleToWidth(): 将对象缩放到指定的宽度（等比缩放）。
  - scaleToHeight(): 将对象缩放到指定的高度（等比缩放）。
  - getScaledWidth(): 获取对象应用变换后的边界框宽度。
  - getScaledHeight(): 获取对象应用变换后的边界框高度。
  - calcOwnMatrix(): 计算表示对象自身属性的变换矩阵（不包括其所在的组）。
  - calcTransformMatrix(): 计算表示对象当前所有变换的变换矩阵。
  - calcACoords(): 计算边界框四个角在画布中的绝对坐标。
  - getCoords(): 获取对象在场景平面中的四个角点坐标 [tl, tr, br, bl]。
  - getBoundingRect(): 获取对象与画布坐标轴对齐的边界矩形（left, top, width, height）。
  - getCenterPoint(): 获取对象相对于画布的中心点坐标。
  - getRelativeCenterPoint(): 获取对象相对于其父容器的中心点坐标。
  - getPointByOrigin(): 根据不同的原点设置，获取对象的位置。
  - setPositionByOrigin(): 考虑对象的原点来设置其位置。
  - translateToCenterPoint(): 将坐标从指定原点转换为中心点坐标。
  - translateToOriginPoint(): 将坐标从中心点转换为指定原点坐标。
  - translateToGivenOrigin(): 将坐标从一组原点设置转换为另一组原点设置。
  - getTotalAngle(): 获取对象相对于画布的总角度（包括组的旋转）。
  - getTotalObjectScaling(): 获取对象的总缩放因子（包括组、画布缩放和屏幕分辨率）。
  - getViewportTransform(): 获取画布的视口变换矩阵。
  - transformMatrixKey(): 生成一个表示当前变换状态的键。

- 交互与控件

  - setCoords(): 更新对象边框和控件的坐标，通常在修改位置或尺寸后调用。
  - calcOCoords(): 计算每个控制点中心及其角点的坐标。
  - forEachControl(): 遍历对象的每一个控制点并执行一个函数。
  - isControlVisible(): 检查指定的控制点是否可见。
  - setControlVisible(): 设置单个控制点的可见性。
  - setControlsVisibility(): 批量设置多个控制点的可见性。
  - getActiveControl(): 获取当前处于活动状态的控制点。
  - clearContextTop(): 清除顶层画布上与对象边界框对应的区域，用于实现闪烁光标等临时效果。
  - onSelect(): 对象被选中时触发的回调函数，可用于取消选择。
  - onDeselect(): 对象被取消选中时触发的回调函数，可用于取消操作。
  - shouldStartDragging(): 判断是否应该开始拖拽会话。
  - onDragStart(): 拖拽会话开始时触发的回调，用于自定义拖拽行为。
  - canDrop(): 自定义拖放行为，判断当前拖动的对象是否可以放置在目标上。
  - renderDragSourceEffect(): 自定义拖放行为，渲染拖动源对象的效果。
  - renderDropTargetEffect(): 自定义拖放行为，渲染放置目标对象上的效果。

- 缓存

  - shouldCache(): 决定对象是否应该被缓存。
  - needsItsOwnCache(): 强制对象拥有自己的缓存，即使它在组内。
  - isCacheDirty(): 检查缓存是否“脏”（需要刷新），如果是则会清除缓存。
  - renderCache(): 将对象渲染到其缓存画布上。
  - drawCacheOnCanvas(): 将缓存的对象副本绘制到目标画布上。
  - drawClipPathOnCache(): 在缓存画布上执行剪切路径的绘制操作。

- 序列化与导出

  - toObject(): 返回实例的对象表示形式（普通 JavaScript 对象）。
  - toJSON(): 返回实例的 JSON 表示形式。
  - toDatalessObject(): 返回实例的“无数据”对象表示形式（例如，Image 对象只保留 URL）。
  - toDataURL(): 将对象转换为 Data URL 字符串。
  - toBlob(): 将对象转换为 Blob 对象。
  - toCanvasElement(): 将对象转换为一个 HTML <canvas> 元素。
  - clone(): 克隆一个实例，返回一个 Promise。
  - cloneAsImage(): 将对象克隆为一个 FabricImage 实例。
  - toSVG(): 返回实例的 SVG 表示形式字符串。
  - toClipPathSVG(): 返回实例作为 SVG 剪切路径 (clipPath) 的表示形式。
  - getSvgCommons(): 返回 SVG 导出的通用属性（如 ID）。
  - getSvgFilter(): 返回用于 SVG 阴影的滤镜字符串。
  - getSvgStyles(): 返回用于 SVG 导出的样式字符串。
  - getSvgTransform(): 返回用于 SVG 导出的变换字符串。
  - addPaintOrder(): 为 SVG 导出添加 paint-order 属性。

- 状态与属性 

  - set(): 设置一个或多个属性的值。
  - get(): 获取指定属性的值。
  - toggle(): 切换布尔类型属性的值（true/false）。
  - getObjectOpacity(): 获取对象的总不透明度（包括其所在的组）。
  - getObjectScaling(): 获取对象的总缩放因子（包括其所在的组）。
  - isNotVisible(): 检查对象是否不可见。
  - isType(): 检查实例的类型是否与指定的类型之一相同。

- 事件

  - on(): 监听一个指定的事件。
  - once(): 监听一个只触发一次的事件。
  - off(): 取消监听一个或多个事件。
  - fire(): 触发一个自定义事件。

- 对象层级关系

  - getAncestors(): 获取对象的所有祖先（父级容器）。
  - findCommonAncestors(): 比较并找出与另一个对象的共同祖先。
  - hasCommonAncestors(): 检查是否与另一个对象有共同的祖先。
  - isDescendantOf(): 检查对象是否是另一个目标对象的后代。
  - isInFrontOf(): 检查此对象是否在另一个对象的前面（渲染顺序）。
  - setOnGroup(): 当父组的属性更改时，由父组调用的回调函数。

- 碰撞与检测

  - containsPoint(): 检查一个点是否在对象内部。
  - intersectsWithObject(): 检查对象是否与另一个对象相交。
  - intersectsWithRect(): 检查对象是否与一个矩形区域相交。
  - isContainedWithinObject(): 检查对象是否完全被包含在另一个对象区域内。
  - isContainedWithinRect(): 检查对象是否完全被包含在一个矩形区域内。
  - isOnScreen(): 检查对象是否在画布的可见区域内。
  - isPartiallyOnScreen(): 检查对象是否部分在画布的可见区域内。
  - isOverlapping(): intersectsWithObject 的别名，检查是否重叠。

- 动画

  - animate(): 对对象的属性进行动画处理。
  - dispose(): 取消实例正在运行的动画。

- 静态方法

  - fromObject(): 从一个普通对象或 JSON 创建一个 FabricObject 实例。
  - createControls(): 创建默认的控件对象。
  - getDefaults(): 获取该类对象的默认属性。

- 其他工具方法

  - complexity(): 返回实例的复杂度（默认为 1）。
  - toString(): 返回实例的字符串表示形式。
  - getCanvasRetinaScaling(): 获取画布的 Retina 缩放比例。

### Control

control 是用来定义对象交互的 控制点，例如：拖动、缩放、旋转等。每个对象都可以有多个控制点（例如角点、边点等）。通过 control 配置，开发者可以自定义这些控制点的行为和样式。

- 显示样式

  - hasControls：是否显示控制点。可以设置为 false 来隐藏对象的控制点，通常用于在某些状态下禁用对象的缩放/旋转等交互。
  - padding：为对象设置的内边距，影响对象的选择框尺寸。当调整对象时，控制点的边距也会根据此值变化。
  - cornerStyle：控制点的形状和样式，Fabric 提供了 circle 和 square 两种类型。
  - cornerColor：控制点的颜色。可以自定义每个控制点的颜色，默认颜色是黑色。
  - cornerSize：控制点的大小，单位为像素。可以控制控制点的缩放/拖动区域的大小。
  - cornerDashArray：控制点的虚线边框
  - cornerStrokeColor：控制点边框颜色
  - transparentCorners：当为 true 时，控制点的背景会变得透明，这样就不会遮挡住对象的边缘。默认值为 true。
  - lockMovementX/lockMovementY：锁定对象在 X 轴和 Y 轴的移动。结合 controls 可以创建更加复杂的交互行为。
  - lockScalingX/lockScalingY：锁定对象的水平和垂直缩放。
  - lockRotation：锁定对象的旋转。禁用旋转操作。
  - rotatingPointOffset：旋转控制点的偏移量，控制旋转点的位置。默认是对象的中心，改变它可以让旋转点偏移至其他位置。
  - touchCornerSize

- 显示与隐藏

  ```js
  object.setControlsVisibility({
    mt: true,  // 上中
    mb: true,  // 下中
    ml: true,  // 左中
    mr: true,  // 右中
    tl: true,  // 左上
    tr: true,  // 右上
    bl: true,  // 左下
    br: true,  // 右下
    mtr: true, // 旋转控制点
  });
  ```

- 自定义控制点

  - x, y	number	控制点位置，归一化坐标，-0.5 ~ 0.5，相对于对象中心
  - offsetX, offsetY	number	控制点的像素偏移，微调位置
  - cursorStyle	string	鼠标悬停样式，如 'pointer', 'crosshair'
  - actionHandler	function	控制点操作函数，接收 (eventData, transform, x, y) 参数，返回 true/false
  - actionName	string	可选，给动作命名，便于区分
  - render	function	自定义控制点绘制方法，参数 (ctx, left, top, styleOverride, fabricObject)
  - visible	boolean	控制点是否显示
  - withConnection	boolean	控制点是否显示连接线到对象中心（默认 true）
  - cornerSize	number	控制点大小（可选，覆盖对象默认 cornerSize）

### Border

- borderColor：对象边框颜色（选中时显示）。
- padding：为对象设置的内边距，影响对象的选择框尺寸。当调整对象时，控制点的边距也会根据此值变化。
- borderDashArray：边框虚线样式。例如 [5, 5] 表示 5px 实线 + 5px 空白。
- borderOpacityWhenMoving：对象拖动时，边框的透明度。
- borderScaleFactor：边框的缩放比例，缩放对象时边框是否同步缩放。
- hasBorders：是否显示对象的边框。

### Issue

- 调整控制点的 padding，控制点的位置不会刷新，需要删除重绘
