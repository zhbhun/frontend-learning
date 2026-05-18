import { useRef, useEffect, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import {
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  CursorArrowRaysIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline'

export interface RectTesterProps {
  className?: string
}

export function RectTester({ className = '' }: RectTesterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [selectedRect, setSelectedRect] = useState<fabric.Rect | null>(null)
  const [rectColor, setRectColor] = useState('#3b82f6')
  const [rectFill, setRectFill] = useState('#dbeafe')
  const [rectWidth, setRectWidth] = useState(100)
  const [rectHeight, setRectHeight] = useState(80)
  const [rectStrokeWidth, setRectStrokeWidth] = useState(2)
  const [rectOpacity, setRectOpacity] = useState(1)
  const [rectRx, setRectRx] = useState(0)
  const [rectRy, setRectRy] = useState(0)
  const [rectRotation, setRectRotation] = useState(0)
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const currentShapeRef = useRef<fabric.Rect | null>(null)

  // 初始化 Fabric.js 画布
  useEffect(() => {
    const { current: canvasEl } = canvasRef
    const { current: canvasWrapperEle } = canvasWrapperRef
    if (canvasEl && canvasWrapperEle) {
      const canvas = new fabric.Canvas(canvasEl, {
        width: canvasWrapperEle.clientWidth,
        height: canvasWrapperEle.clientHeight,
        selection: true,
        preserveObjectStacking: true,
        backgroundColor: '#f8fafc',
        isDrawingMode: false,
      })

      fabricCanvasRef.current = canvas

      // 添加画布事件监听器
      canvas.on('selection:created', handleSelectionChange)
      canvas.on('selection:updated', handleSelectionChange)
      canvas.on('selection:cleared', handleSelectionCleared)
      canvas.on('object:modified', handleObjectModified)

      const resizeObserver = new ResizeObserver(() => {
        canvas.setDimensions({
          width: canvasWrapperEle.clientWidth,
          height: canvasWrapperEle.clientHeight,
        })
      })
      resizeObserver.observe(canvasWrapperEle)

      return () => {
        canvas.off('selection:created', handleSelectionChange)
        canvas.off('selection:updated', handleSelectionChange)
        canvas.off('selection:cleared', handleSelectionCleared)
        canvas.off('object:modified', handleObjectModified)

        // 清理绘制模式的事件监听器
        canvas.off('mouse:down', handleMouseDown)
        canvas.off('mouse:move', handleMouseMove)
        canvas.off('mouse:up', handleMouseUp)

        canvas.dispose()
        resizeObserver.unobserve(canvasWrapperEle)
        resizeObserver.disconnect()
      }
    }
  }, [])



  // 处理选择变化
  const handleSelectionChange = useCallback((e: { selected?: fabric.Object[] }) => {
    const activeObject = e.selected?.[0]
    if (activeObject && activeObject.type === 'rect') {
      const rect = activeObject as fabric.Rect
      setSelectedRect(rect)
      // 同步属性面板
      setRectColor(typeof rect.stroke === 'string' ? rect.stroke : '#3b82f6')
      setRectFill(typeof rect.fill === 'string' ? rect.fill : '#dbeafe')
      setRectWidth(rect.width || 100)
      setRectHeight(rect.height || 80)
      setRectStrokeWidth(rect.strokeWidth || 2)
      setRectOpacity(rect.opacity || 1)
      setRectRx(rect.rx || 0)
      setRectRy(rect.ry || 0)
      setRectRotation(rect.angle || 0)
    }
  }, [])

  // 处理选择清除
  const handleSelectionCleared = useCallback(() => {
    setSelectedRect(null)
  }, [])

  // 处理对象修改
  const handleObjectModified = useCallback(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.renderAll()
    }
  }, [])

    // 鼠标事件处理函数
  const handleMouseDown = useCallback((e: fabric.TEvent) => {
    if (!isDrawingMode || !fabricCanvasRef.current) return

    const pointer = fabricCanvasRef.current.getPointer(e.e)
    startPointRef.current = { x: pointer.x, y: pointer.y }
    console.log('Mouse down - Start point set:', startPointRef.current)
  }, [isDrawingMode])

  const handleMouseMove = useCallback((e: fabric.TEvent) => {
    if (!isDrawingMode || !fabricCanvasRef.current) return

    // 如果没有起始点，不处理移动事件
    if (!startPointRef.current) {
      return
    }

    const canvas = fabricCanvasRef.current
    const pointer = canvas.getPointer(e.e)

    // 移除之前的临时形状
    if (currentShapeRef.current) {
      canvas.remove(currentShapeRef.current)
    }

    // 创建预览矩形
    const rect = new fabric.Rect({
      left: Math.min(startPointRef.current.x, pointer.x),
      top: Math.min(startPointRef.current.y, pointer.y),
      width: Math.abs(pointer.x - startPointRef.current.x),
      height: Math.abs(pointer.y - startPointRef.current.y),
      fill: 'transparent',
      stroke: rectColor,
      strokeWidth: rectStrokeWidth,
      selectable: false,
      evented: false,
    })

    // 添加到画布并保存引用
    canvas.add(rect)
    currentShapeRef.current = rect
    canvas.renderAll()

    console.log('Preview rect added to canvas:', rect)
  }, [isDrawingMode, rectColor, rectStrokeWidth])

  const handleMouseUp = useCallback(() => {
    if (!isDrawingMode || !fabricCanvasRef.current) return

    console.log('Mouse up - Finalizing rect:', currentShapeRef.current)

    // 将临时形状设为可选择
    if (currentShapeRef.current) {
      currentShapeRef.current.set('selectable', true)
      currentShapeRef.current.set('fill', rectFill)
      currentShapeRef.current.set('opacity', rectOpacity)
      currentShapeRef.current.set('rx', rectRx)
      currentShapeRef.current.set('ry', rectRy)

      fabricCanvasRef.current.renderAll()
      console.log('Rect finalized and made selectable')
    }

    // 无论是否有临时形状，都要重置状态
    startPointRef.current = null
    currentShapeRef.current = null
    console.log('Mouse up - States reset')
  }, [isDrawingMode, rectFill, rectOpacity, rectRx, rectRy])

  // 切换绘制模式
  const toggleDrawingMode = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const newMode = !isDrawingMode
    setIsDrawingMode(newMode)

    if (newMode) {
      // 启用绘制模式：禁用选择
      fabricCanvasRef.current.selection = false
      fabricCanvasRef.current.defaultCursor = 'crosshair'
      console.log('Drawing mode enabled')
    } else {
      // 禁用绘制模式：启用选择
      fabricCanvasRef.current.selection = true
      fabricCanvasRef.current.defaultCursor = 'default'
      console.log('Drawing mode disabled')

      // 清除可能残留的临时形状
      if (currentShapeRef.current && fabricCanvasRef.current) {
        fabricCanvasRef.current.remove(currentShapeRef.current)
        currentShapeRef.current = null
      }
    }
  }, [isDrawingMode])

  // 更新选中矩形的属性
  const updateSelectedRect = useCallback((property: string, value: string | number) => {
    if (!selectedRect || !fabricCanvasRef.current) return

    selectedRect.set(property, value)
    fabricCanvasRef.current.renderAll()
  }, [selectedRect])

  // 添加事件监听器
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)

    // 添加全局鼠标释放事件监听器，确保状态正确重置
    const handleGlobalMouseUp = () => {
      if (isDrawingMode && startPointRef.current) {
        console.log('Global mouse up - cleaning up states')
        startPointRef.current = null
        currentShapeRef.current = null
      }
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, isDrawingMode])

  // 同步绘制模式的属性
  useEffect(() => {
    if (fabricCanvasRef.current && isDrawingMode) {
      // 当绘制模式激活时，确保画布设置正确
      fabricCanvasRef.current.selection = false
      fabricCanvasRef.current.defaultCursor = 'crosshair'
    } else if (fabricCanvasRef.current && !isDrawingMode) {
      // 当绘制模式禁用时，确保画布设置正确
      fabricCanvasRef.current.selection = true
      fabricCanvasRef.current.defaultCursor = 'default'

      // 清理可能残留的状态
      startPointRef.current = null
      currentShapeRef.current = null
    }
  }, [isDrawingMode])

  // 添加预定义的矩形示例
  const addRectExample = useCallback((type: string) => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    let rect: fabric.Rect

    switch (type) {
      case 'square':
        rect = new fabric.Rect({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: rectFill,
          stroke: rectColor,
          strokeWidth: rectStrokeWidth,
          opacity: rectOpacity,
        })
        break

      case 'rounded':
        rect = new fabric.Rect({
          left: 250,
          top: 100,
          width: 120,
          height: 80,
          fill: rectFill,
          stroke: rectColor,
          strokeWidth: rectStrokeWidth,
          opacity: rectOpacity,
          rx: 20,
          ry: 20,
        })
        break

      case 'wide':
        rect = new fabric.Rect({
          left: 100,
          top: 250,
          width: 200,
          height: 60,
          fill: rectFill,
          stroke: rectColor,
          strokeWidth: rectStrokeWidth,
          opacity: rectOpacity,
        })
        break

      case 'tall':
        rect = new fabric.Rect({
          left: 350,
          top: 100,
          width: 60,
          height: 200,
          fill: rectFill,
          stroke: rectColor,
          strokeWidth: rectStrokeWidth,
          opacity: rectOpacity,
        })
        break

      case 'rotated':
        rect = new fabric.Rect({
          left: 100,
          top: 400,
          width: 100,
          height: 80,
          fill: rectFill,
          stroke: rectColor,
          strokeWidth: rectStrokeWidth,
          opacity: rectOpacity,
          angle: 45,
        })
        break

      case 'transparent':
        rect = new fabric.Rect({
          left: 250,
          top: 400,
          width: 100,
          height: 80,
          fill: 'transparent',
          stroke: rectColor,
          strokeWidth: rectStrokeWidth,
          opacity: 0.5,
        })
        break

      default:
        return
    }

    canvas.add(rect)
    canvas.setActiveObject(rect)
    canvas.renderAll()
  }, [rectColor, rectFill, rectStrokeWidth, rectOpacity])

  // 添加自定义矩形
  const addCustomRect = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const rect = new fabric.Rect({
      left: 100 + Math.random() * 200,
      top: 100 + Math.random() * 200,
      width: rectWidth,
      height: rectHeight,
      fill: rectFill,
      stroke: rectColor,
      strokeWidth: rectStrokeWidth,
      opacity: rectOpacity,
      rx: rectRx,
      ry: rectRy,
      angle: rectRotation,
    })

    canvas.add(rect)
    canvas.setActiveObject(rect)
    canvas.renderAll()
  }, [rectColor, rectFill, rectWidth, rectHeight, rectStrokeWidth, rectOpacity, rectRx, rectRy, rectRotation])

  // 删除选中的矩形
  const deleteSelectedRect = useCallback(() => {
    if (!selectedRect || !fabricCanvasRef.current) return

    fabricCanvasRef.current.remove(selectedRect)
    setSelectedRect(null)
    fabricCanvasRef.current.renderAll()
  }, [selectedRect])

  // 清空画布
  const clearCanvas = useCallback(() => {
    if (!fabricCanvasRef.current) return

    fabricCanvasRef.current.clear()
  }, [])

  // 导出画布
  const exportCanvas = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    })
    const link = document.createElement('a')
    link.download = 'rect-tester.png'
    link.href = dataURL
    link.click()
  }, [])



  return (
    <div className={`flex flex-col w-screen h-screen ${className}`}>
      {/* 工具栏 */}
      <div className="border-b border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center space-x-4">
          {/* 工具选择 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (fabricCanvasRef.current && isDrawingMode) {
                  // 如果当前是绘制模式，切换到选择模式
                  fabricCanvasRef.current.selection = true
                  fabricCanvasRef.current.defaultCursor = 'default'
                  setIsDrawingMode(false)

                  // 移除鼠标事件监听器
                  fabricCanvasRef.current.off('mouse:down', handleMouseDown)
                  fabricCanvasRef.current.off('mouse:move', handleMouseMove)
                  fabricCanvasRef.current.off('mouse:up', handleMouseUp)

                  // 清除可能残留的临时形状
                  if (currentShapeRef.current && fabricCanvasRef.current) {
                    fabricCanvasRef.current.remove(currentShapeRef.current)
                    currentShapeRef.current = null
                  }
                }
              }}
              className={`rounded-lg p-2 transition-colors ${
                !isDrawingMode
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
              title="选择工具"
            >
              <CursorArrowRaysIcon className="h-5 w-5" />
            </button>
            <button
              onClick={toggleDrawingMode}
              className={`rounded-lg p-2 transition-colors ${
                isDrawingMode
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
              title="绘制模式"
            >
              <RectangleStackIcon className="h-5 w-5" />
            </button>
          </div>



          {/* 分隔线 */}
          <div className="h-6 w-px bg-gray-300" />

          {/* 操作按钮 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={clearCanvas}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              title="清空画布"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <button
              onClick={deleteSelectedRect}
              disabled={!selectedRect}
              className={`rounded-lg p-2 transition-colors ${
                !selectedRect
                  ? 'cursor-not-allowed text-gray-400'
                  : 'hover:bg-gray-100'
              }`}
              title="删除选中矩形"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>

          {/* 导出按钮 */}
          <button
            onClick={exportCanvas}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            导出
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧控制面板 */}
        <div className="w-80 border-r border-gray-200 bg-white p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* 矩形示例 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">矩形示例</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addRectExample('square')}
                  className="rounded-lg bg-blue-100 px-3 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-200"
                >
                  正方形
                </button>
                <button
                  onClick={() => addRectExample('rounded')}
                  className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700 transition-colors hover:bg-green-200"
                >
                  圆角矩形
                </button>
                <button
                  onClick={() => addRectExample('wide')}
                  className="rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-700 transition-colors hover:bg-yellow-200"
                >
                  宽矩形
                </button>
                <button
                  onClick={() => addRectExample('tall')}
                  className="rounded-lg bg-purple-100 px-3 py-2 text-sm text-purple-700 transition-colors hover:bg-purple-200"
                >
                  高矩形
                </button>
                <button
                  onClick={() => addRectExample('rotated')}
                  className="rounded-lg bg-indigo-100 px-3 py-2 text-sm text-indigo-700 transition-colors hover:bg-indigo-200"
                >
                  旋转矩形
                </button>
                <button
                  onClick={() => addRectExample('transparent')}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
                >
                  透明矩形
                </button>
              </div>
            </div>

            {/* 自定义矩形 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">自定义矩形</h3>
              <button
                onClick={addCustomRect}
                className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
              >
                <PlusIcon className="h-4 w-4 inline mr-2" />
                添加自定义矩形
              </button>
            </div>

            {/* 矩形属性控制 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">矩形属性</h3>
              <div className="space-y-4">
                {/* 宽度 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    宽度
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    value={rectWidth}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setRectWidth(value)
                      if (selectedRect) {
                        updateSelectedRect('width', value)
                      }
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{rectWidth}</span>
                </div>

                {/* 高度 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    高度
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    value={rectHeight}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setRectHeight(value)
                      if (selectedRect) {
                        updateSelectedRect('height', value)
                      }
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{rectHeight}</span>
                </div>

                {/* 描边颜色 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描边颜色
                  </label>
                  <input
                    type="color"
                    value={rectColor}
                    onChange={(e) => {
                      setRectColor(e.target.value)
                      if (selectedRect) {
                        updateSelectedRect('stroke', e.target.value)
                      }
                    }}
                    className="h-10 w-full cursor-pointer rounded border border-gray-300"
                  />
                </div>

                {/* 描边宽度 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描边宽度
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={rectStrokeWidth}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setRectStrokeWidth(value)
                      if (selectedRect) {
                        updateSelectedRect('strokeWidth', value)
                      }
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{rectStrokeWidth}</span>
                </div>

                {/* 填充颜色 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    填充颜色
                  </label>
                  <input
                    type="color"
                    value={rectFill === 'transparent' ? '#ffffff' : rectFill}
                    onChange={(e) => {
                      const value = e.target.value === '#ffffff' ? 'transparent' : e.target.value
                      setRectFill(value)
                      if (selectedRect) {
                        updateSelectedRect('fill', value)
                      }
                    }}
                    className="h-10 w-full cursor-pointer rounded border border-gray-300"
                  />
                  <button
                    onClick={() => {
                      setRectFill('transparent')
                      if (selectedRect) {
                        updateSelectedRect('fill', 'transparent')
                      }
                    }}
                    className="mt-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    设为透明
                  </button>
                </div>

                {/* 透明度 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    透明度
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={rectOpacity}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setRectOpacity(value)
                      if (selectedRect) {
                        updateSelectedRect('opacity', value)
                      }
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{rectOpacity}</span>
                </div>

                {/* 圆角 X */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    圆角 X
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={rectRx}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setRectRx(value)
                      if (selectedRect) {
                        updateSelectedRect('rx', value)
                      }
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{rectRx}</span>
                </div>

                {/* 圆角 Y */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    圆角 Y
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={rectRy}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setRectRy(value)
                      if (selectedRect) {
                        updateSelectedRect('ry', value)
                      }
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{rectRy}</span>
                </div>

                {/* 旋转角度 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    旋转角度
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={rectRotation}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setRectRotation(value)
                      if (selectedRect) {
                        updateSelectedRect('angle', value)
                      }
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{rectRotation}°</span>
                </div>
              </div>
            </div>

            {/* 使用说明 */}
            <div className="text-sm text-gray-600 space-y-2">
              <h4 className="font-medium text-gray-900">使用说明：</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>点击矩形示例按钮添加预定义矩形</li>
                <li>使用绘制模式拖拽创建矩形</li>
                <li>选择矩形后可在左侧面板调整属性</li>
                <li>拖拽矩形可改变位置</li>
                <li>拖拽控制点可调整大小</li>
                <li>拖拽旋转控制点可调整角度</li>
                <li>双击矩形可进入编辑模式</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 右侧画布区域 */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="mb-2 text-center text-sm text-gray-600">
            {isDrawingMode ? '绘制模式：拖拽创建矩形' : '选择模式：点击选择矩形，拖拽移动位置'}
          </div>
          <div
            ref={canvasWrapperRef}
            className="h-full w-full overflow-hidden rounded-lg bg-white shadow-lg"
          >
            <canvas
              ref={canvasRef}
              className="block h-full w-full"
              style={{ cursor: isDrawingMode ? 'crosshair' : 'default' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default RectTester
