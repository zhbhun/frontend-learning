import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as fabric from 'fabric'

const ResizeControlDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null)

    // 自定义的 resize 处理函数 - 改变 width/height 而不是缩放
  const createResizeHandler = useCallback((corner: string) => {
    return (eventData: fabric.TPointerEvent, transform: fabric.Transform) => {
      const target = transform.target
      const pointer = target.canvas!.getPointer(eventData as any)

      // 获取对象当前的边界框
      const currentWidth = target.width!
      const currentHeight = target.height!
      const currentLeft = target.left!
      const currentTop = target.top!

      // 注：新算法不再需要计算角点，直接使用中心点和投影

      let newWidth = currentWidth
      let newHeight = currentHeight
      let newLeft = currentLeft
      let newTop = currentTop

            // 根据不同的控制点计算新的尺寸和位置
      switch (corner) {
        case 'mr': { // 右边中点 - 只改变宽度，固定左边（右下角区域）
          const center = target.getCenterPoint()
          const deltaX = pointer.x - center.x
          const deltaY = pointer.y - center.y

          const angle = target.angle || 0
          const radians = fabric.util.degreesToRadians(angle)
          const cos = Math.cos(radians)
          const sin = Math.sin(radians)

          // 投影到宽度方向
          const projectedDistance = deltaX * cos + deltaY * sin
          newWidth = Math.max(10, Math.abs(projectedDistance) * 2)
          break
        }
                case 'ml': { // 左边中点 - 改变宽度和位置，固定右边（左上角区域）
          const angle = target.angle || 0
          const radians = fabric.util.degreesToRadians(angle)
          const cos = Math.cos(radians)
          const sin = Math.sin(radians)

          // 计算当前左边中点在世界坐标中的位置
          const currentMLX = currentLeft - (currentWidth / 2) * cos
          const currentMLY = currentTop - (currentWidth / 2) * sin

          // 计算鼠标位置与当前左边中点的偏移
          const deltaX = pointer.x - currentMLX
          const deltaY = pointer.y - currentMLY

          // 将偏移量投影到宽度方向
          const localDeltaX = deltaX * cos + deltaY * sin

          // 调整宽度：左边移动时，宽度相应变化
          newWidth = Math.max(10, currentWidth - localDeltaX)

          // 调整位置：移动对象使新的左边中点位置跟随鼠标
          const widthChange = newWidth - currentWidth
          newLeft = currentLeft + (widthChange / 2) * cos
          newTop = currentTop + (widthChange / 2) * sin
          break
        }
                case 'mt': { // 上边中点 - 改变高度和位置，固定下边（左上角区域）
          const angle = target.angle || 0
          const radians = fabric.util.degreesToRadians(angle)
          const cos = Math.cos(radians)
          const sin = Math.sin(radians)

          // 计算当前上边中点在世界坐标中的位置
          const currentMTX = currentLeft + (currentHeight / 2) * sin
          const currentMTY = currentTop - (currentHeight / 2) * cos

          // 计算鼠标位置与当前上边中点的偏移
          const deltaX = pointer.x - currentMTX
          const deltaY = pointer.y - currentMTY

          // 将偏移量投影到高度方向
          const localDeltaY = -deltaX * sin + deltaY * cos

          // 调整高度：上边移动时，高度相应变化
          newHeight = Math.max(10, currentHeight - localDeltaY)

          // 调整位置：移动对象使新的上边中点位置跟随鼠标
          const heightChange = newHeight - currentHeight
          newLeft = currentLeft - (heightChange / 2) * sin
          newTop = currentTop + (heightChange / 2) * cos
          break
        }
        case 'mb': { // 下边中点 - 只改变高度，固定上边（右下角区域）
          const center = target.getCenterPoint()
          const deltaX = pointer.x - center.x
          const deltaY = pointer.y - center.y

          const angle = target.angle || 0
          const radians = fabric.util.degreesToRadians(angle)
          const cos = Math.cos(radians)
          const sin = Math.sin(radians)

          // 投影到高度方向
          const projectedDistance = -deltaX * sin + deltaY * cos
          newHeight = Math.max(10, Math.abs(projectedDistance) * 2)
          break
        }
                        case 'br': { // 右下角 - 只改变大小，不调整位置（右下角区域）
          const center = target.getCenterPoint()
          const deltaX = pointer.x - center.x
          const deltaY = pointer.y - center.y

          const angle = target.angle || 0
          const radians = fabric.util.degreesToRadians(angle)
          const cos = Math.cos(radians)
          const sin = Math.sin(radians)

          // 投影到宽度和高度方向
          const projectedWidth = deltaX * cos + deltaY * sin
          const projectedHeight = -deltaX * sin + deltaY * cos

          newWidth = Math.max(10, Math.abs(projectedWidth) * 2)
          newHeight = Math.max(10, Math.abs(projectedHeight) * 2)
          break
        }
                case 'tl': { // 左上角 - 让左上角跟随鼠标，右下角固定
          // 计算右下角的固定位置
          const angle = target.angle || 0
          const radians = fabric.util.degreesToRadians(angle)
          const cos = Math.cos(radians)
          const sin = Math.sin(radians)

          // 右下角在世界坐标中的位置（固定不变）
          const fixedBRX = currentLeft + (currentWidth / 2) * cos - (currentHeight / 2) * sin
          const fixedBRY = currentTop + (currentWidth / 2) * sin + (currentHeight / 2) * cos

          // 新的左上角就是鼠标位置
          const newTLX = pointer.x
          const newTLY = pointer.y

          // 计算新的尺寸（基于左上角和右下角的距离）
          const deltaX = fixedBRX - newTLX
          const deltaY = fixedBRY - newTLY

          // 转换到本地坐标系得到新的宽度和高度
          const localWidth = deltaX * cos + deltaY * sin
          const localHeight = -deltaX * sin + deltaY * cos

          newWidth = Math.max(10, localWidth)
          newHeight = Math.max(10, localHeight)

          // 新的中心点（左上角和右下角的中点）
          newLeft = (newTLX + fixedBRX) / 2
          newTop = (newTLY + fixedBRY) / 2
          break
        }
        case 'tr': { // 右上角 - 部分调整位置（混合区域）
          const center = target.getCenterPoint()
          const deltaX = pointer.x - center.x
          const deltaY = pointer.y - center.y

          const angle = target.angle || 0
          const radians = fabric.util.degreesToRadians(angle)
          const cos = Math.cos(radians)
          const sin = Math.sin(radians)

          // 投影到宽度和高度方向
          const projectedWidth = deltaX * cos + deltaY * sin
          const projectedHeight = -deltaX * sin + deltaY * cos

          // 宽度：向右扩展，向左缩小（不移动位置）
          newWidth = Math.max(10, currentWidth + projectedWidth)

          // 高度：向上拖拽时扩展并移动位置，向下拖拽时扩展不移动位置
          if (projectedHeight < 0) {
            newHeight = Math.max(10, currentHeight - projectedHeight)
            // 向上拖拽时调整位置
            const heightChange = newHeight - currentHeight
            newLeft = currentLeft + (heightChange / 2) * sin
            newTop = currentTop - (heightChange / 2) * cos
          } else {
            newHeight = Math.max(10, currentHeight + projectedHeight)
          }
          break
        }
        case 'bl': { // 左下角 - 部分调整位置（混合区域）
          const center = target.getCenterPoint()
          const deltaX = pointer.x - center.x
          const deltaY = pointer.y - center.y

          const angle = target.angle || 0
          const radians = fabric.util.degreesToRadians(angle)
          const cos = Math.cos(radians)
          const sin = Math.sin(radians)

          // 投影到宽度和高度方向
          const projectedWidth = deltaX * cos + deltaY * sin
          const projectedHeight = -deltaX * sin + deltaY * cos

          // 宽度：向左拖拽时扩展并移动位置，向右拖拽时缩小不移动位置
          if (projectedWidth < 0) {
            newWidth = Math.max(10, currentWidth - projectedWidth)
            // 向左拖拽时调整位置
            const widthChange = newWidth - currentWidth
            newLeft = currentLeft - (widthChange / 2) * cos
            newTop = currentTop - (widthChange / 2) * sin
          } else {
            newWidth = Math.max(10, currentWidth - projectedWidth)
          }

          // 高度：向下扩展，向上缩小（不移动位置）
          newHeight = Math.max(10, currentHeight + projectedHeight)
          break
        }
      }

      // 设置新的尺寸和位置，保持缩放为1
      target.set({
        width: newWidth,
        height: newHeight,
        left: newLeft,
        top: newTop,
        scaleX: 1,
        scaleY: 1,
      })

      return true
    }
  }, [])

  // 创建自定义的 resize 控制点
  const createResizeControls = useCallback(() => {
    const controls: Record<string, fabric.Control> = {}

    // 右边中间 - 水平缩放
    controls.mr = new fabric.Control({
      x: 0.5,
      y: 0,
      actionHandler: createResizeHandler('mr'),
      cursorStyleHandler: () => 'e-resize',
      actionName: 'resizing',
    })

    // 左边中间 - 水平缩放
    controls.ml = new fabric.Control({
      x: -0.5,
      y: 0,
      actionHandler: createResizeHandler('ml'),
      cursorStyleHandler: () => 'w-resize',
      actionName: 'resizing',
    })

    // 上边中间 - 垂直缩放
    controls.mt = new fabric.Control({
      x: 0,
      y: -0.5,
      actionHandler: createResizeHandler('mt'),
      cursorStyleHandler: () => 'n-resize',
      actionName: 'resizing',
    })

    // 下边中间 - 垂直缩放
    controls.mb = new fabric.Control({
      x: 0,
      y: 0.5,
      actionHandler: createResizeHandler('mb'),
      cursorStyleHandler: () => 's-resize',
      actionName: 'resizing',
    })

    // 右下角 - 双向缩放
    controls.br = new fabric.Control({
      x: 0.5,
      y: 0.5,
      actionHandler: createResizeHandler('br'),
      cursorStyleHandler: () => 'se-resize',
      actionName: 'resizing',
    })

    // 左上角 - 双向缩放
    controls.tl = new fabric.Control({
      x: -0.5,
      y: -0.5,
      actionHandler: createResizeHandler('tl'),
      cursorStyleHandler: () => 'nw-resize',
      actionName: 'resizing',
    })

    // 右上角 - 双向缩放
    controls.tr = new fabric.Control({
      x: 0.5,
      y: -0.5,
      actionHandler: createResizeHandler('tr'),
      cursorStyleHandler: () => 'ne-resize',
      actionName: 'resizing',
    })

    // 左下角 - 双向缩放
    controls.bl = new fabric.Control({
      x: -0.5,
      y: 0.5,
      actionHandler: createResizeHandler('bl'),
      cursorStyleHandler: () => 'sw-resize',
      actionName: 'resizing',
    })

    // 保留旋转控制点
    controls.mtr = new fabric.Control({
      x: 0,
      y: -0.5,
      offsetY: -40,
      actionHandler: fabric.controlsUtils.rotationWithSnapping,
      cursorStyleHandler: fabric.controlsUtils.rotationStyleHandler,
      actionName: 'rotate',
    })

    return controls
  }, [createResizeHandler])

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f8f9fa',
    })

    fabricCanvasRef.current = canvas

    // 创建测试对象并应用自定义 resize 控制点
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 150,
      height: 100,
      fill: '#4CAF50',
      stroke: '#2E7D32',
      strokeWidth: 2,
      rx: 10,
      ry: 10,
      controls: createResizeControls(),
    })

    const circle = new fabric.Circle({
      left: 350,
      top: 100,
      radius: 60,
      fill: '#2196F3',
      stroke: '#1976D2',
      strokeWidth: 2,
      controls: createResizeControls(),
    })

    const triangle = new fabric.Triangle({
      left: 550,
      top: 100,
      width: 120,
      height: 100,
      fill: '#FF9800',
      stroke: '#F57C00',
      strokeWidth: 2,
      controls: createResizeControls(),
    })

    const text = new fabric.FabricText('Resize Demo', {
      left: 200,
      top: 300,
      fontSize: 24,
      fill: '#9C27B0',
      fontFamily: 'Arial',
      controls: createResizeControls(),
    })

    // 添加对象到画布
    canvas.add(rect, circle, triangle, text)

    // 监听选择事件
    canvas.on('selection:created', (e: { selected?: fabric.Object[] }) => {
      const obj = e.selected?.[0]
      setSelectedObject(obj || null)
    })

    canvas.on('selection:updated', (e: { selected?: fabric.Object[] }) => {
      const obj = e.selected?.[0]
      setSelectedObject(obj || null)
    })

    canvas.on('selection:cleared', () => {
      setSelectedObject(null)
    })

    // 监听对象修改事件，用于实时更新显示
    canvas.on('object:modified', () => {
      setSelectedObject(canvas.getActiveObject() || null)
    })

    // 清理函数
    return () => {
      canvas.dispose()
    }
  }, [createResizeControls])

  // 添加新矩形
  const addNewRect = () => {
    if (!fabricCanvasRef.current) return

    const newRect = new fabric.Rect({
      left: Math.random() * 400 + 50,
      top: Math.random() * 300 + 50,
      width: 100,
      height: 80,
      fill: '#' + Math.floor(Math.random() * 16777215).toString(16),
      stroke: '#333',
      strokeWidth: 2,
      rx: 5,
      ry: 5,
      controls: createResizeControls(),
    })

    fabricCanvasRef.current.add(newRect)
    fabricCanvasRef.current.setActiveObject(newRect)
    fabricCanvasRef.current.renderAll()
  }

  // 添加新圆形
  const addNewCircle = () => {
    if (!fabricCanvasRef.current) return

    const newCircle = new fabric.Circle({
      left: Math.random() * 400 + 50,
      top: Math.random() * 300 + 50,
      radius: 40,
      fill: '#' + Math.floor(Math.random() * 16777215).toString(16),
      stroke: '#333',
      strokeWidth: 2,
      controls: createResizeControls(),
    })

    fabricCanvasRef.current.add(newCircle)
    fabricCanvasRef.current.setActiveObject(newCircle)
    fabricCanvasRef.current.renderAll()
  }

  // 添加新文本
  const addNewText = () => {
    if (!fabricCanvasRef.current) return

    const newText = new fabric.FabricText('New Text', {
      left: Math.random() * 400 + 50,
      top: Math.random() * 300 + 50,
      fontSize: 20,
      fill: '#' + Math.floor(Math.random() * 16777215).toString(16),
      fontFamily: 'Arial',
      controls: createResizeControls(),
    })

    fabricCanvasRef.current.add(newText)
    fabricCanvasRef.current.setActiveObject(newText)
    fabricCanvasRef.current.renderAll()
  }

  // 清空画布
  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return
    fabricCanvasRef.current.clear()
    fabricCanvasRef.current.backgroundColor = '#f8f9fa'
    fabricCanvasRef.current.renderAll()
    setSelectedObject(null)
  }

  // 重置选中对象的缩放
  const resetScale = () => {
    if (!selectedObject || !fabricCanvasRef.current) return

    selectedObject.set({
      scaleX: 1,
      scaleY: 1,
    })
    fabricCanvasRef.current.renderAll()
    setSelectedObject(selectedObject) // 触发重新渲染
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">
        Resize 控制点演示 - 改变 Width/Height
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 画布区域 */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold">画布</h2>
            <div className="overflow-hidden rounded-lg border-2 border-gray-300">
              <canvas ref={canvasRef} className="mx-auto block" />
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>• 选择对象后拖拽控制点可改变 width 和 height</p>
              <p>• <strong>左上角区域：</strong>tl, ml, mt - 调整尺寸+位置</p>
              <p>• <strong>右下角区域：</strong>br, mr, mb - 只调整尺寸</p>
              <p>• <strong>混合区域：</strong>tr, bl - 部分调整位置</p>
              <p>• <strong>旋转控制点：</strong>旋转对象（保持原有功能）</p>
              <p>• <strong>智能响应：</strong>根据拖拽方向决定是否移动对象</p>
              <p>• <strong>支持旋转：</strong>即使对象旋转也能正确调整尺寸</p>
              <p>• <strong>注意：</strong>不改变 scaleX/scaleY，直接修改 width/height</p>
            </div>
          </div>
        </div>

        {/* 控制面板 */}
        <div className="space-y-6">
          {/* 当前选中对象信息 */}
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold">选中对象属性</h3>
            {selectedObject ? (
              <div className="space-y-2 text-sm">
                <p><strong>类型:</strong> {selectedObject.type}</p>
                <p><strong>位置:</strong> ({Math.round(selectedObject.left || 0)}, {Math.round(selectedObject.top || 0)})</p>
                <p><strong>尺寸 (width × height):</strong> {Math.round(selectedObject.width || 0)} × {Math.round(selectedObject.height || 0)}</p>
                <p><strong>缩放 (scaleX × scaleY):</strong> {(selectedObject.scaleX || 1).toFixed(2)} × {(selectedObject.scaleY || 1).toFixed(2)}</p>
                <p><strong>实际显示尺寸:</strong> {Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1))} × {Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1))}</p>
                <p><strong>旋转角度:</strong> {Math.round(selectedObject.angle || 0)}°</p>
                {selectedObject.type === 'circle' && (
                  <p><strong>半径:</strong> {Math.round((selectedObject as fabric.Circle).radius || 0)}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">未选中任何对象</p>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold">操作</h3>
            <div className="space-y-3">
              <button
                onClick={addNewRect}
                className="w-full rounded bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
              >
                添加矩形
              </button>
              <button
                onClick={addNewCircle}
                className="w-full rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              >
                添加圆形
              </button>
              <button
                onClick={addNewText}
                className="w-full rounded bg-purple-500 px-4 py-2 text-white transition-colors hover:bg-purple-600"
              >
                添加文本
              </button>
              {selectedObject && (
                <button
                  onClick={resetScale}
                  className="w-full rounded bg-orange-500 px-4 py-2 text-white transition-colors hover:bg-orange-600"
                >
                  重置缩放为 1
                </button>
              )}
              <button
                onClick={clearCanvas}
                className="w-full rounded bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
              >
                清空画布
              </button>
            </div>
          </div>

          {/* 实现说明 */}
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold">实现原理</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>关键技术点：</strong></p>
              <p>• 使用自定义 `actionHandler` 替代默认的缩放行为</p>
              <p>• 通过 `canvas.getPointer()` 获取实时鼠标位置</p>
              <p>• 使用 `calcTransformMatrix()` 计算对象变换矩阵</p>
              <p>• 通过 `fabric.util.transformPoint()` 获取角点坐标</p>
              <p>• <strong>向量投影算法：</strong>将鼠标位置投影到对象本地坐标系</p>
              <p>• <strong>固定点算法：</strong>基于固定角点重新计算对象中心</p>
              <p>• 同时调整 `width`、`height`、`left`、`top` 属性</p>
              <p>• 保持 `scaleX` 和 `scaleY` 为 1，避免缩放变形</p>
              <p>• 完美支持任意角度旋转的对象</p>
              <p>• 设置最小尺寸限制防止对象过小</p>
            </div>
          </div>

          {/* 控制点说明 */}
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold">控制点说明</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>左上角区域（固定点跟随）：</strong></p>
              <p>• tl: 左上角 - 控制点位置直接跟随鼠标，调整宽高和中心</p>
              <p>• ml: 左边中点 - 左边位置跟随鼠标，调整宽度和中心</p>
              <p>• mt: 上边中点 - 上边位置跟随鼠标，调整高度和中心</p>
              <p><strong>右下角区域（中心点缩放）：</strong></p>
              <p>• br: 右下角 - 基于中心点的距离缩放，位置不变</p>
              <p>• mr: 右边中点 - 基于中心点的水平距离缩放</p>
              <p>• mb: 下边中点 - 基于中心点的垂直距离缩放</p>
              <p><strong>混合区域（混合算法）：</strong></p>
              <p>• tr: 右上角 - 水平用缩放，垂直用固定点</p>
              <p>• bl: 左下角 - 水平用固定点，垂直用缩放</p>
              <p><strong>旋转控制点：</strong></p>
              <p>• mtr: 旋转对象（保持原有功能）</p>
            </div>
          </div>

          {/* 算法原理 */}
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold">核心算法原理</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <p><strong>1. 左上角区域算法：</strong></p>
                <p className="ml-4">• 计算控制点在世界坐标中的当前位置</p>
                <p className="ml-4">• 鼠标偏移量直接决定控制点的新位置</p>
                <p className="ml-4">• 根据控制点移动量相应调整宽度和高度</p>
                <p className="ml-4">• 重新计算对象中心以匹配新的尺寸</p>
              </div>
              <div>
                <p><strong>2. 右下角区域算法：</strong></p>
                <p className="ml-4">• 基于对象中心点的距离缩放</p>
                <p className="ml-4">• newSize = |mouseDistance| × 2</p>
                <p className="ml-4">• 对象位置保持不变</p>
              </div>
              <div>
                <p><strong>3. 混合区域算法：</strong></p>
                <p className="ml-4">• 结合两种算法的优点</p>
                <p className="ml-4">• 在特定方向使用固定点算法</p>
                <p className="ml-4">• 在其他方向使用中心点算法</p>
              </div>
            </div>
          </div>

          {/* 与默认行为对比 */}
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold">与默认缩放的区别</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>默认行为：</strong></p>
              <p>• 修改 scaleX/scaleY 属性</p>
              <p>• 保持原始 width/height 不变</p>
              <p>• 可能导致描边等样式变形</p>
              <p><strong>自定义行为：</strong></p>
              <p>• 直接修改 width/height 属性</p>
              <p>• 保持 scaleX/scaleY 为 1</p>
              <p>• 避免样式变形，更适合精确设计</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResizeControlDemo
